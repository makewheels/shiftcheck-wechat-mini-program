'use strict'
/**
 * 代码卫生门禁
 *
 * 这里的每一条都对应一次真实踩过的坑，写成测试是为了不让它再回来：
 *   - LeanCloud 集成 2.5.0 整条删除：域名失效、统计早已是死的，AV / libs 不许再回来
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

/**
 * 仓库相对路径，一律归一成正斜杠。
 * Windows 上 mp.walk / mp.rel 给的是反斜杠，拿 '/libs/'、'/test/' 这类字面量去 includes
 * 会一个都匹配不上，扫描范围就会悄悄多算 libs/ 与 test/（CI 跑在 Linux 上看不出来）。
 */
function relOf(f) {
  return mp.rel(f).replace(/\\/g, '/')
}

function collect(filter) {
  return mp.walk(mp.REPO).filter(function (f) {
    if (f === SELF) return false
    const rel = relOf(f)
    if (rel.startsWith('libs/')) return false // 防御性：将来若再放第三方压缩库，内部哈希形态字符串会误中凭据扫描
    if (rel.startsWith('.git/')) return false
    return filter(rel)
  })
}

const CODE = collect(function (rel) { return /\.(js|json|wxml|wxss)$/.test(rel) && !rel.startsWith('test/') })
const ALL = collect(function (rel) { return /\.(js|json|wxml|wxss|md)$/.test(rel) })

function hitsIn(files, re, includeMarkedLines) {
  const out = []
  files.forEach(function (f) {
    fs.readFileSync(f, 'utf8').split('\n').forEach(function (line, i) {
      // 显式豁免：规则条文本身有时必须写出被禁的字样（例如 AGENTS.md 里
      // 「不要写 Co-Authored-By 尾注」这条规则）。这种行加 <!-- hygiene-allow-line --> 标记，
      // 豁免是可见、可 grep 的，而不是把正则偷偷放宽。
      // 注意：检查「豁免标记本身有没有被滥用」时必须传 includeMarkedLines = true，
      // 否则那个检查会把自己要找的行也跳过，成为永远命中不了的死测试（这个坑真踩过）
      if (!includeMarkedLines && line.includes('hygiene-allow-line')) return
      if (re.test(line)) out.push(relOf(f) + ':' + (i + 1) + '  ' + line.trim().slice(0, 90))
    })
  })
  return out
}

const codeHits = function (re) { return hitsIn(CODE, re) }
const allHits = function (re) { return hitsIn(ALL, re) }

/* ---------------- LeanCloud（已整条删除，不许回来） ---------------- */

test('不许再引入 LeanCloud / AV（集成已随 2.5.0 整条删除）', function () {
  // 专有域名 shiftcheck.work 2026-08-09 到期未续费、全球解析不到，统计对所有人
  // 早已是死的，只剩每次启动 3 个注定失败的请求。集成、SDK、登录链路已连根删掉
  // （含 app.js 的 getOpenid / login 与首页 mystep2 上报）。
  // 代码文件里描述这段历史的注释不拦（如 app.js 文件头），但调用不许回来。
  // 旧坑备忘：AV.User.current() 未登录时是 null，直接 .toJSON() 白屏，历史上踩过两次。
  const avCalls = codeHits(/\bAV\.\w/)
  assert.deepStrictEqual(avCalls, [], 'AV 调用不许回来：\n' + avCalls.join('\n'))
  const libsReq = codeHits(/require\(\s*['"][^'"]*libs\//)
  assert.deepStrictEqual(libsReq, [], '不许 require libs/（SDK 已删除）：\n' + libsReq.join('\n'))
  assert.ok(!fs.existsSync(path.join(mp.REPO, 'libs/av-core-min.js')), 'LeanCloud 核心库已删除，别加回来')
  assert.ok(!fs.existsSync(path.join(mp.REPO, 'libs/leancloud-adapters-weapp.js')),
    'LeanCloud 小程序适配器已删除，别加回来')
})

test('app.js 必须提供升级相关方法，且升级回调注册方式正确', function () {
  const src = fs.readFileSync(path.join(mp.REPO, 'app.js'), 'utf8')
  ;['initUpdateManager', 'onLaunch'].forEach(function (fn) {
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

test('隐私接口一处都不许有（后台无需再声明任何隐私信息）', function () {
  // 曾经唯一合规的剪贴板用法在 importRuleByKey 的「一键粘贴」，该页随 DIY 链路一起删了。
  // 现在全仓库不应该再有任何微信隐私接口 —— 这意味着《用户隐私保护指引》里没有必须声明的接口项
  const clip = codeHits(/wx\.getClipboardData|wx\.setClipboardData/)
  assert.deepStrictEqual(clip, [],
    '不要引入剪贴板读写：它是微信隐私接口，必须在后台《用户隐私保护指引》声明，' +
    '未声明时基础库 2.32.3+ 会直接 fail：\n' + clip.join('\n'))
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

test('「取不到 openid 就弹框挡住用户」那套不许复活', function () {
  // app.js 里曾经有一对方法：拿不到 openid 就补登录，补不上就弹阻塞式 showModal。
  // 它们唯一的调用方是首页的使用统计上报（纯后台行为），而 8 个倒班页与设置页都是
  // 纯本地计算 —— 全仓库从来没有功能真的需要登录态。
  // 后果是发布级事故：用户只想查今天上什么班，却因为一个统计请求失败被模态框拦住，
  // 网络不通或后端域名失效时每个用户一打开首页必中（2.4.0 真实发生过）。
  // 2.5.0 起统计上报连同 LeanCloud 集成整条删除，这对方法也一起没了。
  // 这条门禁守的是"机制"而不是"文案"：换个提示措辞也应该被拦下。
  assert.deepStrictEqual(codeHits(/\bwithOpenid\b|\bloginFailTip\b/), [],
    '不要恢复这两个方法。全仓库已没有任何功能需要 openid / 登录态，' +
    '后台行为失败更不该打扰用户')
})

/* ---------------- 仓库卫生 ---------------- */

test('不要把位运算 & 当逻辑与 && 用', function () {
  // 形如 `if (a != null & b != undefined)`：靠 true&true===1 的巧合能跑，
  // 但失去短路求值，操作数一旦不是布尔值结果立刻错乱
  assert.deepStrictEqual(codeHits(/[!=]==?\s*[^&\s][^&\n]*\s&\s[^&]/), [],
    '疑似把 & 当 && 用；位运算请写明意图')
})

test('没有残留的合并冲突标记', function () {
  assert.deepStrictEqual(allHits(/^<{7}\s|^={7}$|^>{7}\s/), [], '有未解决的合并冲突标记')
})

/* ---------------- 文件体量 ---------------- */

/**
 * 单文件行数上限。
 *
 * 500 是留了余量的红线，不是照着现状卡出来的数：这一版最大的业务文件是
 * pages/wbsd/worker/worker.js（352 行）。libs/ 的排除是防御性的 —— LeanCloud
 * 适配器（1246 行）已随集成删除，但将来若真要引入第三方库，也不该被这条红线卡。
 *
 * 这条门禁拦的是「再往这个文件里塞一点」的惯性。8 个倒班页本来就高度雷同，
 * 任何一个继续长下去，通常都说明该往 utils/ 或 components/ 里抽公共实现了
 * （月日历就是这么抽出来的：utils/calendar.js + components/shift-calendar/）。
 */
const MAX_FILE_LINES = 500

test('任何单个文件不超过 ' + MAX_FILE_LINES + ' 行（libs/ 第三方 SDK 除外）', function () {
  const over = []
  mp.walk(mp.REPO).forEach(function (f) {
    const rel = relOf(f)
    if (rel.startsWith('libs/')) return
    if (!/\.(js|json|wxml|wxss|md)$/.test(rel)) return
    const lines = fs.readFileSync(f, 'utf8').split('\n').length
    if (lines > MAX_FILE_LINES) over.push(rel + '（' + lines + ' 行）')
  })
  over.sort()
  assert.deepStrictEqual(over, [],
    '这些文件超过 ' + MAX_FILE_LINES + ' 行，该拆了：倒班页的公共逻辑抽到 utils/ 或组件里，' +
    '长文档拆成多篇放 doc/：\n' + over.join('\n'))
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

test('hygiene-allow-line 豁免标记只许用在文档里，不许用来让代码蒙混过关', function () {
  // 这两次扫描必须带 includeMarkedLines=true，否则带标记的行会被跳过，检查等于没做
  const inCode = hitsIn(CODE, /hygiene-allow-line/, true)
  assert.deepStrictEqual(inCode, [],
    '代码文件里出现豁免标记 = 有人在掩盖真实违规；豁免只给「规则条文本身要写出被禁字样」的文档用')

  const marked = hitsIn(ALL, /hygiene-allow-line/, true)
  marked.forEach(function (h) {
    assert.ok(h.startsWith('AGENTS.md') || h.startsWith('doc/') || h.startsWith('README.md'),
      '豁免标记只允许出现在 AGENTS.md / README.md / doc/ 下：' + h)
  })
})

function cmpVersion(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  return (pa[0] - pb[0]) || (pa[1] - pb[1]) || (pa[2] - pb[2])
}

test('app.js 的版本号等于 doc/releases/ 里最新的版本', function () {
  // 更新日志 2026-09-14 起不在 README 里（README 只留指针），事实源是 doc/releases/。
  // 这条门禁双向咬合：bump 了 appVersion 就必须有同版本的发布说明文件；
  // 反过来新建了发布说明文件就必须 bump appVersion —— 必须同一次改动完成。
  // 还没到发版时两者都不动，门禁自然绿。
  const appSrc = fs.readFileSync(path.join(mp.REPO, 'app.js'), 'utf8')
  const m = appSrc.match(/appVersion:\s*["'](\d+\.\d+\.\d+)["']/)
  assert.ok(m, 'app.js 里找不到 appVersion')
  const files = fs.readdirSync(path.join(mp.REPO, 'doc', 'releases'))
    .map(function (f) { const x = f.match(/^(\d+\.\d+\.\d+)\.md$/); return x && x[1] })
    .filter(function (v) { return v })
  assert.ok(files.length > 0, 'doc/releases/ 里一份发布说明都没有')
  const latest = files.sort(cmpVersion).pop()
  assert.strictEqual(m[1], latest,
    'app.js 的 appVersion（' + m[1] + '）与 doc/releases/ 里最新版本（' + latest + '）不一致。\n' +
    '要发新版：bump appVersion + 新建 doc/releases/<新版本>.md，同一次改动；\n' +
    '还没到发版：两个都不要先动')
})

test('README 里不许再内联版本更新日志', function () {
  // 2026-09-14 移除：与 doc/releases/ 内容重复，两处维护必然漂移
  //（2.4.0 就出现过 README 比 tag 少 7 条，只能回头补 PR）。
  // README 只留指针表格；2.3.0~2.3.4 的原文保留在 doc/releases/ 对应文件里，没有丢。
  const readme = fs.readFileSync(path.join(mp.REPO, 'README.md'), 'utf8')
  const inline = [...readme.matchAll(/^##\s+(\d+\.\d+\.\d+)\s*$/gm)].map(function (x) { return x[1] })
  assert.deepStrictEqual(inline, [],
    'README 里又出现内联的版本更新日志了：删掉它，去改 doc/releases/<版本>.md')
  assert.ok(readme.includes('doc/releases/'), 'README 应该指向 doc/releases/')
})

test('当前版本必须有对应的发布说明 doc/releases/<version>.md', function () {
  // 发布说明要以仓库文件为唯一事实源，GitHub Release 用 --notes-file 从它同步。
  // 只写在 GitHub 网页上的后果：不能进 PR 评审、不能 diff、Release 被删就彻底没了。
  const appSrc = fs.readFileSync(path.join(mp.REPO, 'app.js'), 'utf8')
  const m = appSrc.match(/appVersion:\s*["'](\d+\.\d+\.\d+)["']/)
  assert.ok(m, 'app.js 里找不到 appVersion')
  const ver = m[1]
  const rel = path.join(mp.REPO, 'doc', 'releases', ver + '.md')
  assert.ok(fs.existsSync(rel),
    '缺少 doc/releases/' + ver + '.md。发布说明必须先进仓库再同步到 GitHub Release：\n' +
    '  gh release edit v' + ver + ' --notes-file doc/releases/' + ver + '.md\n' +
    '约定见 doc/releases/README.md')

  const txt = fs.readFileSync(rel, 'utf8')
  assert.ok(txt.trim().length > 200, 'doc/releases/' + ver + '.md 太短，不像一份发布说明')
  // Release 是某个版本的快照，而 master 会一直往前走：指向 master 的链接将来要么 404，
  // 要么更糟 —— 点开看到的是另一个版本的内容，跟这条 Release 描述的东西对不上。
  // 指向 tag 就永远解析到打 tag 那一刻的文件树，哪怕文件以后从 master 上删了也照样能打开。
  assert.ok(!txt.includes('/blob/master/') && !txt.includes('/tree/master/'),
    'doc/releases/' + ver + '.md 里有指向 master 的链接，要改成指向 tag v' + ver + '：\n' +
    txt.split('\n').filter(function (l) { return l.includes('/master/') }).join('\n'))
})

test('doc/releases/ 下的文件名一律是 <version>.md', function () {
  const dir = path.join(mp.REPO, 'doc', 'releases')
  assert.ok(fs.existsSync(dir), 'doc/releases/ 目录不存在')
  const files = fs.readdirSync(dir).filter(function (f) {
    return f.endsWith('.md') && f !== 'README.md'
  })
  assert.ok(files.length > 0, 'doc/releases/ 里一份发布说明都没有')
  const bad = files.filter(function (f) { return !/^\d+\.\d+\.\d+\.md$/.test(f) })
  assert.deepStrictEqual(bad, [],
    '文件名必须是 <version>.md（与 tag v<version> 去掉 v 对应）：' + bad.join(', '))
})

test('变更记录文件名一律是 YYYY-MM-DD-HHMMSS-简短说明.md', function () {
  const dir = path.join(mp.REPO, 'doc/changes')
  const files = fs.readdirSync(dir).filter(function (f) { return f.endsWith('.md') })
  assert.ok(files.length > 0, 'doc/changes/ 不该是空的')

  // 一天里会有多次提交，只写日期分不清先后，所以时分秒是必须的（不再有旧格式豁免）
  const FORMAT = /^\d{4}-\d{2}-\d{2}-\d{6}-[A-Za-z0-9.\u4e00-\u9fa5-]+\.md$/
  const bad = files.filter(function (f) { return !FORMAT.test(f) })
  assert.deepStrictEqual(bad, [], '变更记录文件名不合规范（必须带时分秒）：' + bad.join(', '))

  files.forEach(function (f) {
    const d = f.slice(0, 10).split('-').map(Number)
    const t = f.slice(11, 17)
    const hh = +t.slice(0, 2)
    const mi = +t.slice(2, 4)
    const ss = +t.slice(4, 6)
    assert.ok(d[0] >= 2020 && d[1] >= 1 && d[1] <= 12 && d[2] >= 1 && d[2] <= 31, '日期部分不合法：' + f)
    assert.ok(hh <= 23 && mi <= 59 && ss <= 59, '时间部分不合法：' + f)
  })

  // 时间戳必须两两不同，否则又分不清先后了
  const stamps = files.map(function (f) { return f.slice(0, 19) })
  const dup = stamps.filter(function (s, i) { return stamps.indexOf(s) !== i })
  assert.deepStrictEqual(dup, [], '有变更记录的时间戳重复：' + dup.join(', '))
})
