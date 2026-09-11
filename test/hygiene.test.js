'use strict'
/**
 * 代码卫生门禁
 *
 * 这里的每一条都对应一次真实踩过的坑，写成测试是为了不让它再回来：
 *   - AV.User.current().toJSON()：未登录时 current() 是 null，直接 .toJSON() 白屏（历史上 21 处）
 *   - Math.abs() 取天数差 / 裸 % 取模：锚点日之前的日期会算错班
 *   - 静默读剪贴板、查 IP、硬编码 token：隐私接口未声明会被拦，token 随公开仓库泄露
 *   - 已废弃 API：wx.getSystemInfoSync / wx.getUserInfo / wx.getUserProfile
 *
 * 扫描范围分两类：CODE 只看代码（js/json/wxml/wxss），ALL 连文档一起看。
 * 本文件自身不参与扫描，否则测试里写的关键词会自己命中自己。
 */
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const mp = require('./helpers/miniprogram.js')

const SELF = path.join(__dirname, 'hygiene.test.js')

function collect(filter) {
  return mp.walk(mp.REPO).filter(function (f) {
    if (f === SELF) return false
    if (f.includes('/libs/')) return false // 第三方压缩库，内部有哈希形态字符串
    if (f.includes('/.git/')) return false
    return filter(f)
  })
}

const CODE = collect(function (f) { return /\.(js|json|wxml|wxss)$/.test(f) && !f.includes('/test/') })
const ALL = collect(function (f) { return /\.(js|json|wxml|wxss|md)$/.test(f) })

function hitsIn(files, re) {
  const out = []
  files.forEach(function (f) {
    fs.readFileSync(f, 'utf8').split('\n').forEach(function (line, i) {
      if (re.test(line)) out.push(mp.rel(f) + ':' + (i + 1) + '  ' + line.trim().slice(0, 90))
    })
  })
  return out
}

const codeHits = function (re) { return hitsIn(CODE, re) }
const allHits = function (re) { return hitsIn(ALL, re) }

/* ---------------- 登录与 openid ---------------- */

test('页面里不许直接写 AV.User.current().toJSON()（未登录会崩）', function () {
  const bad = codeHits(/AV\.User\.current\(\)\s*\.\s*toJSON\(\)/).filter(function (h) {
    return !h.startsWith('app.js')
  })
  assert.deepStrictEqual(bad, [], '改用 app.getOpenid() / app.withOpenid(cb)：\n' + bad.join('\n'))
})

test('app.js 必须提供登录与升级相关方法，且升级回调注册方式正确', function () {
  const src = fs.readFileSync(path.join(mp.REPO, 'app.js'), 'utf8')
  ;['getOpenid', 'withOpenid', 'loginFailTip', 'initUpdateManager', 'login'].forEach(function (fn) {
    assert.match(src, new RegExp(fn + '\\s*:\\s*function'), 'app.js 缺少 ' + fn + '()')
  })
  assert.match(src, /onCheckForUpdate\(/)
  assert.match(src, /onUpdateReady\(/)
  assert.match(src, /onUpdateFailed\(/, '缺少新版本下载失败的兜底提示')
  assert.match(src, /this\.initUpdateManager\(\)/, 'onLaunch 里要调用 initUpdateManager()')
  // onUpdateReady 必须与 onCheckForUpdate 平级注册，不能嵌在它的回调里：
  // 冷启动时新版本可能已经下载完，嵌在里面会错过事件、永远不 applyUpdate。
  // 用括号配平算出每一处 onCheckForUpdate(...) 调用的闭合位置，再断言 onUpdateReady 不落在任何一个区间内
  const readyAt = src.indexOf('onUpdateReady(')
  assert.ok(readyAt > 0, '缺少 onUpdateReady 注册')
  const ranges = []
  let from = 0
  for (;;) {
    const at = src.indexOf('onCheckForUpdate(', from)
    if (at < 0) break
    let depth = 0
    for (let k = src.indexOf('(', at); k < src.length; k++) {
      if (src[k] === '(') depth++
      else if (src[k] === ')') {
        depth--
        if (depth === 0) { ranges.push([at, k]); break }
      }
    }
    from = at + 1
  }
  assert.ok(ranges.length > 0, '缺少 onCheckForUpdate 注册')
  ranges.forEach(function (r) {
    assert.ok(readyAt < r[0] || readyAt > r[1],
      'onUpdateReady 不能嵌套在 onCheckForUpdate 回调里，冷启动可能错过事件导致永不升级')
  })
})

/* ---------------- 排班算法 ---------------- */

test('天数差与取模必须走 utils/shift.js', function () {
  assert.deepStrictEqual(codeHits(/Math\.abs\(\s*date2\s*-\s*date1\s*\)/), [],
    '不要再用 Math.abs() 取天数差，锚点日之前会算错班；用 shift.daysBetween()')
  assert.deepStrictEqual(codeHits(/total\s*%\s*\d+/), [],
    '不要用裸 % 取模，负数会得到负结果；用 shift.mod()')
  const pages = CODE.filter(function (f) { return /pages\/(wbsd|sbsd|sbbd|jjd)\/|pages\/diy\//.test(f.replace(/\\/g, '/')) })
  assert.ok(pages.length >= 9, '倒班页数量不对，检查扫描范围')
})

/* ---------------- 已废弃 API 与隐私接口 ---------------- */

test('已废弃 API 不许再出现', function () {
  assert.deepStrictEqual(codeHits(/wx\.getSystemInfoSync/), [], '用 wx.getSystemInfo()（异步版未废弃）')
  assert.deepStrictEqual(codeHits(/wx\.getUserInfo|wx\.getUserProfile|open-type="getUserInfo"/), [],
    '这些只返回匿名数据；要头像昵称用 open-type="chooseAvatar" + input type="nickname"')
})

test('隐私接口只允许出现在已声明的位置', function () {
  // 剪贴板：只有「一键粘贴」激活码那一处是用户主动触发的正当用法
  const clip = codeHits(/wx\.getClipboardData/)
  assert.ok(clip.length <= 1, '剪贴板读取应只剩一处：\n' + clip.join('\n'))
  clip.forEach(function (h) {
    assert.ok(h.startsWith('pages/setting/importRuleByKey/'),
      '只有 importRuleByKey 允许读剪贴板（且后台隐私指引必须声明剪贴板）：' + h)
  })
  // 位置类隐私接口一个都不该有（后台没声明，加了会被拦）
  assert.deepStrictEqual(codeHits(/wx\.getLocation|wx\.chooseLocation|wx\.chooseAddress|wx\.getWeRunData/), [],
    '不要引入位置类隐私接口，后台《用户隐私保护指引》没有声明它们')
})

/* ---------------- 凭据 ---------------- */

test('代码里不许出现 ip138（查 IP 的采集已移除）', function () {
  assert.deepStrictEqual(codeHits(/ip138/), [], '不要再用 ip138 查 IP：token 会随公开仓库泄露')
})

test('任何文件里都不许出现明文凭据', function () {
  // 只拦"真的带十六进制 token"的写法；文档里引用打码后的地址（token=<已抹掉>）不算
  assert.deepStrictEqual(allHits(/ip138\.com[^'"\s]*token=[0-9a-f]{8}/), [], '带明文 token 的 ip138 请求地址')
  assert.deepStrictEqual(allHits(/\b[0-9a-f]{32}\b/), [], '疑似 32 位密钥/哈希；文档里引用要打码（如 12ff…8129）')
  assert.deepStrictEqual(allHits(/ghp_[A-Za-z0-9]|AKIA[0-9A-Z]{12}|\bsk-[A-Za-z0-9]{10}/), [], '疑似凭据')
  assert.deepStrictEqual(allHits(/(password|passwd|secret)\s*[:=]\s*['"][^'"]{4,}/i), [], '疑似明文口令')
})

/* ---------------- 死代码不许复活 ---------------- */

test('已删除的死代码不许回来', function () {
  assert.ok(!fs.existsSync(path.join(mp.REPO, 'libs/mta_analysis.js')), 'mta 统计早已下线，别把文件加回来')
  assert.deepStrictEqual(codeHits(/mta_analysis/), [], '不要引用已删除的 mta_analysis')
  assert.ok(!fs.existsSync(path.join(mp.REPO, 'pages/setting/authUserInfo')),
    'scope.userInfo 授权已失效，该页面已删除，别加回来')
  assert.deepStrictEqual(codeHits(/scope\.userInfo|checkAuthUserInfo/), [], '失效的授权门禁不要复活')
})

/* ---------------- 仓库卫生 ---------------- */

test('没有残留的合并冲突标记', function () {
  assert.deepStrictEqual(allHits(/^<{7}\s|^={7}$|^>{7}\s/), [], '有未解决的合并冲突标记')
})

test('公开仓库里不许出现雇主/开发环境信息与第三方工具署名', function () {
  const banned = [
    ['雇主或企业网络环境', /施耐德|schneider|zscaler|\bMITM\b/i],
    ['第三方工具署名', /co-authored-by|generated with|anthropic|\bclaude\b|\bcodex\b|\bqwen\b/i]
  ]
  banned.forEach(function (b) {
    assert.deepStrictEqual(allHits(b[1]), [], '公开仓库里出现「' + b[0] + '」')
  })
})

test('app.js 的版本号与 README 更新日志里最新的版本一致', function () {
  const appSrc = fs.readFileSync(path.join(mp.REPO, 'app.js'), 'utf8')
  const m = appSrc.match(/appVersion:\s*["'](\d+\.\d+\.\d+)["']/)
  assert.ok(m, 'app.js 里找不到 appVersion')
  const readme = fs.readFileSync(path.join(mp.REPO, 'README.md'), 'utf8')
  const versions = [...readme.matchAll(/^##\s+(\d+\.\d+\.\d+)\s*$/gm)].map(function (x) { return x[1] })
  assert.ok(versions.length > 0, 'README 里找不到版本更新日志条目')
  const latest = versions.sort(function (a, b) {
    const pa = a.split('.').map(Number)
    const pb = b.split('.').map(Number)
    return (pa[0] - pb[0]) || (pa[1] - pb[1]) || (pa[2] - pb[2])
  }).pop()
  assert.strictEqual(m[1], latest, 'app.js 的 appVersion 与 README 最新版本号不一致（发版要两边一起改）')
})

test('变更记录文件名符合规范：YYYY-MM-DD-HHMMSS-简短说明.md', function () {
  const dir = path.join(mp.REPO, 'doc/changes')
  const files = fs.readdirSync(dir).filter(function (f) { return f.endsWith('.md') })
  assert.ok(files.length > 0, 'doc/changes/ 不该是空的')
  const NEW_FORMAT = /^\d{4}-\d{2}-\d{2}-\d{6}-[A-Za-z0-9.\u4e00-\u9fa5-]+\.md$/
  const OLD_FORMAT = /^\d{4}-\d{2}-\d{2}-[A-Za-z0-9.\u4e00-\u9fa5-]+\.md$/
  // 规范在 2026-09-11 21:38:22 调整，之前的记录是「只有日期」的旧格式，保留原名不追溯改
  const CUTOVER = '20260911213822'
  let newCount = 0
  files.forEach(function (f) {
    const isNew = NEW_FORMAT.test(f)
    assert.ok(isNew || (OLD_FORMAT.test(f) && !isNew), '变更记录文件名不合规范：' + f)
    if (isNew) {
      newCount++
      const stamp = f.slice(0, 19).replace(/[^0-9]/g, '')
      assert.ok(stamp >= CUTOVER, '带时分秒的记录应不早于规范调整时间：' + f)
    }
  })
  assert.ok(newCount > 0, '至少应有一份按新规范（带时分秒）命名的变更记录')
})
