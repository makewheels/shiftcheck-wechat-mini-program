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

/**
 * 仓库相对路径，一律归一成正斜杠。
 * Windows 上 mp.walk / mp.rel 给的是反斜杠，拿 '/libs/'、'/pages/' 这类字面量去 includes
 * 会一个都匹配不上：轻则把 libs/ 与 test/ 也算进扫描范围，重则整条门禁静默空跑
 * （例如「磁盘上的页面目录都在 app.json 注册」会因为 dirs 恒为空而永远绿）。
 * CI 跑在 Linux 上看不出这个差别，所以本地必须自己归一化。
 */
function relOf(f) {
  return mp.rel(f).replace(/\\/g, '/')
}

const jsFiles = allFiles.filter(function (f) {
  const rel = relOf(f)
  return f.endsWith('.js') && !rel.startsWith('libs/') && !rel.startsWith('test/')
})
const wxmlFiles = allFiles.filter(function (f) { return f.endsWith('.wxml') })
const jsonFiles = allFiles.filter(function (f) {
  return f.endsWith('.json') && !f.endsWith('package.json') && !relOf(f).startsWith('test/')
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

test('页面 json 不许声明 component:true（否则被当组件处理，页面注册不上、跳过去白屏）', function () {
  const bad = []
  appJson.pages.forEach(function (p) {
    const j = JSON.parse(fs.readFileSync(path.join(mp.REPO, p + '.json'), 'utf8'))
    if (j.component === true) bad.push(p + '.json')
  })
  assert.deepStrictEqual(bad, [],
    '这些在 app.json 里注册为页面的 json 声明了 "component": true，会导致页面打不开：' + bad.join(', '))
})

test('磁盘上的页面目录都在 app.json 注册（不留进不去的死页面）', function () {
  const dirs = new Set()
  allFiles.forEach(function (f) {
    if (!/\.(js|wxml)$/.test(f) || !f.includes('/pages/')) return
    dirs.add(relOf(f).replace(/\.(js|wxml|json|wxss)$/, ''))
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
        url = path.posix.normalize(path.posix.join(path.posix.dirname(relOf(f)), url)).replace(/^\.\//, '')
      }
      if (!registered.has(url)) missing.push(relOf(f) + ' -> ' + url)
    }
  })
  assert.deepStrictEqual(missing, [], '跳转目标未注册：' + missing.join('; '))
})

test('每个页面 json 都有 navigationBarTitleText（多级页面才分得出是哪页）', function () {
  const missing = []
  appJson.pages.forEach(function (p) {
    const j = JSON.parse(fs.readFileSync(path.join(mp.REPO, p + '.json'), 'utf8'))
    if (!j.navigationBarTitleText) missing.push(p + '.json')
  })
  assert.deepStrictEqual(missing, [],
    '这些页面缺 navigationBarTitleText，标题栏会退回全局的「查班神器」：' + missing.join(', '))
})

test('8 个倒班页都有「跳转到指定日期」（picker + bindDateChange）', function () {
  const shiftPages = appJson.pages.filter(function (p) { return /\/(worker|director)\//.test(p) })
  assert.strictEqual(shiftPages.length, 8, '倒班页应是 8 个，实际 ' + shiftPages.length)
  const missing = []
  shiftPages.forEach(function (p) {
    const wsrc = fs.readFileSync(path.join(mp.REPO, p + '.wxml'), 'utf8')
    if (wsrc.indexOf('<picker mode="date" bindchange="bindDateChange">') === -1) missing.push(p + '.wxml')
  })
  assert.deepStrictEqual(missing, [], '这些倒班页缺「跳转到指定日期」：' + missing.join(', '))
})

test('wxml 里不许用 HTML 标签（span/div 等，开发者工具会告警）', function () {
  const bad = []
  const HTML_TAGS = ['span', 'div', 'p>', 'a>', 'a ', 'h1', 'h2', 'h3', 'ul', 'li', 'table']
  wxmlFiles.forEach(function (w) {
    const wsrc = fs.readFileSync(w, 'utf8')
    HTML_TAGS.forEach(function (t) {
      if (wsrc.indexOf('<' + t) !== -1) bad.push(relOf(w) + ' 用了 <' + t.trim() + '>')
    })
  })
  assert.deepStrictEqual(bad, [], 'wxml 只认自己的标签（view/text/image/...）：' + bad.join(', '))
})

test('usingComponents 声明的组件文件齐全且标了 component:true', function () {
  const problems = []
  let checked = 0
  jsonFiles.forEach(function (f) {
    let j
    try {
      j = JSON.parse(fs.readFileSync(f, 'utf8'))
    } catch (e) {
      problems.push(relOf(f) + ' JSON 解析失败：' + e.message)
      return
    }
    const uc = j.usingComponents || {}
    Object.keys(uc).forEach(function (name) {
      checked++
      const p = uc[name]
      const abs = p.startsWith('/') ? path.join(mp.REPO, p) : path.resolve(path.dirname(f), p)
      ;['js', 'json', 'wxml'].forEach(function (ext) {
        if (!fs.existsSync(abs + '.' + ext)) problems.push(relOf(f) + ' 的组件 ' + name + ' 缺 .' + ext)
      })
      if (fs.existsSync(abs + '.json')) {
        const cj = JSON.parse(fs.readFileSync(abs + '.json', 'utf8'))
        if (cj.component !== true) problems.push(abs + '.json 缺 "component": true')
      }
    })
  })
  assert.deepStrictEqual(problems, [], problems.join('; '))
  assert.ok(checked >= 8, '至少 8 个倒班页应声明 shift-calendar 组件，实际只有 ' + checked + ' 处')
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
      if (js.indexOf(m[1]) === -1) missing.push(relOf(w) + ' -> ' + m[1] + '()')
    }
  })
  assert.deepStrictEqual(missing, [], '这些事件处理函数在 js 里找不到：' + missing.join('; '))
})

test('sitemap.json 规则合法：引用的页面都已注册，且最后一条是兜底 disallow', function () {
  const sitemap = JSON.parse(fs.readFileSync(path.join(mp.REPO, 'sitemap.json'), 'utf8'))
  assert.ok(Array.isArray(sitemap.rules) && sitemap.rules.length > 0, 'sitemap.json 应有 rules')
  sitemap.rules.forEach(function (r) {
    assert.ok(r.action === 'allow' || r.action === 'disallow', '未知的 action: ' + r.action)
    assert.ok(typeof r.page === 'string' && r.page.length > 0, '规则缺少 page')
    if (r.page !== '*') {
      assert.ok(registered.has(r.page), 'sitemap 里引用了未注册的页面：' + r.page)
    }
  })
  const last = sitemap.rules[sitemap.rules.length - 1]
  assert.strictEqual(last.action, 'disallow', '最后一条应是兜底 disallow，否则等于全开放')
  assert.strictEqual(last.page, '*', '兜底规则应作用于所有页面')
  // 只允许首页与 8 个倒班查询页被索引（它们纯本地计算、不依赖登录态，被搜到直接能用）
  const ALLOWED = new Set([
    'pages/index/index',
    'pages/wbsd/worker/worker', 'pages/wbsd/director/director',
    'pages/sbsd/worker/worker', 'pages/sbsd/director/director',
    'pages/sbbd/worker/worker', 'pages/sbbd/director/director',
    'pages/jjd/worker/worker', 'pages/jjd/director/director'
  ])
  const allowed = sitemap.rules.filter(function (r) { return r.action === 'allow' }).map(function (r) { return r.page })
  allowed.forEach(function (p) {
    assert.ok(ALLOWED.has(p), 'sitemap 只应开放首页与 8 个倒班查询页，多出了：' + p)
  })
  assert.strictEqual(allowed.length, ALLOWED.size,
    'sitemap 应恰好开放 ' + ALLOWED.size + ' 个页面，实际 ' + allowed.length + ' 个')
})

test('「返回主页」类处理函数必须处理页面栈只有 1 层的深链场景', function () {
  // 倒班页在 sitemap 白名单里，可被搜一搜/扫码/分享卡片直接打开，此时页面栈深度为 1，
  // 无条件 navigateBack 会静默失败（连 fail 回调都没有），按钮点了没反应
  const problems = []
  jsFiles.forEach(function (f) {
    const src = fs.readFileSync(f, 'utf8')
    if (!/close:\s*function\s*\(\)/.test(src)) return
    if (!/wx\.navigateBack/.test(src)) return
    if (!/getCurrentPages\(\)/.test(src)) {
      problems.push(relOf(f) + ' 的 close() 调了 navigateBack 却没判页面栈深度')
    }
  })
  assert.deepStrictEqual(problems, [],
    '深链进入时「返回主页」会失效，栈深 <=1 应改用 reLaunch：\n' + problems.join('\n'))
  assert.ok(jsFiles.some(function (f) { return /close:\s*function/.test(fs.readFileSync(f, 'utf8')) }),
    '一个 close() 都没扫到，检查范围可能写错了')
})

test('project.config.json 用的是正式 appid，不是游客 appid', function () {
  const cfg = JSON.parse(fs.readFileSync(path.join(mp.REPO, 'project.config.json'), 'utf8'))
  assert.strictEqual(cfg.compileType, 'miniprogram')
  assert.ok(cfg.appid && cfg.appid !== 'touristappid', 'appid 不能是游客模式的 touristappid')
  assert.match(cfg.appid, /^wx[0-9a-f]{16}$/, 'appid 形态不对：' + cfg.appid)
})

test('所有 json 都能解析', function () {
  jsonFiles.forEach(function (f) {
    assert.doesNotThrow(function () { JSON.parse(fs.readFileSync(f, 'utf8')) }, relOf(f) + ' 解析失败')
  })
})
