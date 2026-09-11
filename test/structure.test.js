'use strict'
/**
 * 结构完整性门禁
 *
 * 小程序里这几类错误不会在编译期报出来，只会在用户点到那一刻炸：
 *   - app.json 注册了页面但文件缺失（或反过来，页面存在却没注册 -> 打包进去也进不去）
 *   - navigateTo 的目标没在 app.json 注册 -> 点击直接报错
 *   - usingComponents 路径写错 / 组件 json 少了 "component": true -> 组件不渲染
 *   - wxml 里 bind 的处理函数在 js 里不存在 -> 点击无反应
 * 所以全部用脚本钉住。
 */
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const mp = require('./helpers/miniprogram.js')

const appJson = JSON.parse(fs.readFileSync(path.join(mp.REPO, 'app.json'), 'utf8'))
const registered = new Set(appJson.pages)
const allFiles = mp.walk(mp.REPO)
const jsFiles = allFiles.filter(function (f) { return f.endsWith('.js') && !f.includes('/libs/') && !f.includes('/test/') })
const wxmlFiles = allFiles.filter(function (f) { return f.endsWith('.wxml') })
const jsonFiles = allFiles.filter(function (f) {
  return f.endsWith('.json') && !f.endsWith('package.json') && !f.includes('/test/')
})

test('app.json 注册的每个页面文件齐全且非空', function () {
  assert.ok(appJson.pages.length > 0, 'app.json 的 pages 不该为空')
  appJson.pages.forEach(function (p) {
    ;['js', 'json', 'wxml'].forEach(function (ext) {
      const f = path.join(mp.REPO, p + '.' + ext)
      assert.ok(fs.existsSync(f), '缺文件：' + p + '.' + ext)
      assert.ok(fs.statSync(f).size > 0, '文件是空的：' + p + '.' + ext)
    })
  })
  assert.ok(appJson.window && appJson.window.navigationBarTitleText, 'app.json 应有窗口标题')
  assert.ok(fs.existsSync(path.join(mp.REPO, appJson.sitemapLocation || 'sitemap.json')), 'sitemap 文件不存在')
})

test('磁盘上的页面目录都在 app.json 注册（不留进不去的死页面）', function () {
  const dirs = new Set()
  allFiles.forEach(function (f) {
    if (!/\.(js|wxml)$/.test(f) || !f.includes('/pages/')) return
    dirs.add(mp.rel(f).replace(/\.(js|wxml|json|wxss)$/, ''))
  })
  const unregistered = [...dirs].filter(function (d) { return !registered.has(d) })
  assert.deepStrictEqual(unregistered, [], '这些页面目录没在 app.json 注册：' + unregistered.join(', '))
})

test('代码里所有跳转目标都在 app.json 注册', function () {
  const NAV = /(navigateTo|redirectTo|reLaunch|switchTab)\s*\(\s*\{\s*url:\s*['"`]([^'"`]+)/g
  const missing = []
  jsFiles.forEach(function (f) {
    const src = fs.readFileSync(f, 'utf8')
    let m
    NAV.lastIndex = 0
    while ((m = NAV.exec(src)) !== null) {
      let url = m[2].split('?')[0]
      if (url.startsWith('/')) {
        url = url.slice(1)
      } else {
        url = path.posix.normalize(path.posix.join(path.posix.dirname(mp.rel(f)), url)).replace(/^\.\//, '')
      }
      if (!registered.has(url)) missing.push(mp.rel(f) + ' -> ' + url)
    }
  })
  assert.deepStrictEqual(missing, [], '跳转目标未注册：' + missing.join('; '))
})

test('usingComponents 声明的组件文件齐全且标了 component:true', function () {
  const problems = []
  let checked = 0
  jsonFiles.forEach(function (f) {
    let j
    try {
      j = JSON.parse(fs.readFileSync(f, 'utf8'))
    } catch (e) {
      problems.push(mp.rel(f) + ' JSON 解析失败：' + e.message)
      return
    }
    const uc = j.usingComponents || {}
    Object.keys(uc).forEach(function (name) {
      checked++
      const p = uc[name]
      const abs = p.startsWith('/') ? path.join(mp.REPO, p) : path.resolve(path.dirname(f), p)
      ;['js', 'json', 'wxml'].forEach(function (ext) {
        if (!fs.existsSync(abs + '.' + ext)) problems.push(mp.rel(f) + ' 的组件 ' + name + ' 缺 .' + ext)
      })
      if (fs.existsSync(abs + '.json')) {
        const cj = JSON.parse(fs.readFileSync(abs + '.json', 'utf8'))
        if (cj.component !== true) problems.push(abs + '.json 缺 "component": true')
      }
    })
  })
  assert.deepStrictEqual(problems, [], problems.join('; '))
  assert.ok(checked >= 9, '至少 9 个倒班页应声明 shift-calendar 组件，实际只有 ' + checked + ' 处')
})

test('wxml 里 bind/catch 绑定的处理函数在对应 js 中都存在', function () {
  const missing = []
  wxmlFiles.forEach(function (w) {
    const jsFile = w.replace(/\.wxml$/, '.js')
    if (!fs.existsSync(jsFile)) return
    const js = fs.readFileSync(jsFile, 'utf8')
    const wsrc = fs.readFileSync(w, 'utf8')
    const RE = /(?:capture-bind|capture-catch|bind|catch)(?::[a-zA-Z]+|[a-zA-Z]+)\s*=\s*"([A-Za-z_$][\w$]*)"/g
    let m
    RE.lastIndex = 0
    while ((m = RE.exec(wsrc)) !== null) {
      if (js.indexOf(m[1]) === -1) missing.push(mp.rel(w) + ' -> ' + m[1] + '()')
    }
  })
  assert.deepStrictEqual(missing, [], '这些事件处理函数在 js 里找不到：' + missing.join('; '))
})

test('project.config.json 用的是正式 appid，不是游客 appid', function () {
  const cfg = JSON.parse(fs.readFileSync(path.join(mp.REPO, 'project.config.json'), 'utf8'))
  assert.strictEqual(cfg.compileType, 'miniprogram')
  assert.ok(cfg.appid && cfg.appid !== 'touristappid', 'appid 不能是游客模式的 touristappid')
  assert.match(cfg.appid, /^wx[0-9a-f]{16}$/, 'appid 形态不对：' + cfg.appid)
})

test('所有 json 都能解析', function () {
  jsonFiles.forEach(function (f) {
    assert.doesNotThrow(function () { JSON.parse(fs.readFileSync(f, 'utf8')) }, mp.rel(f) + ' 解析失败')
  })
})
