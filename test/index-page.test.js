'use strict'
/**
 * 首页 onLoad 的行为测试
 *
 * 重点是那个**曾经从来没生效过**的「5 分钟内不重复上报」节流：
 * 原实现把时间戳存在页面 `data` 里，而 `data` 是每个页面实例各自一份、初值 0，
 * `onLoad` 又只在实例创建时跑一次，所以 `if (this.data.lastTimestamp != 0)` 恒为 false，
 * 那个 `return` 永远走不到 —— 每次冷启动都完整上报一条。
 *
 * 复现方式：加载**两个页面实例、共享同一份 storage**，等价于用户两次冷启动。
 * 用 `calls` 记录页面访问过哪些 wx API，以此判断上报分支有没有走到。
 */
const test = require('node:test')
const assert = require('node:assert')
const mp = require('./helpers/miniprogram.js')

const KEY = 'lastReportTimestamp'
const FIVE_MIN = 5 * 60 * 1000

// 启动一次首页，返回这次启动访问过的 wx API 列表
function launch(storage) {
  const calls = []
  const page = mp.load('pages/index/index.js', null, { storage: storage, calls: calls })
  page.onLoad()
  return calls
}

test('首次启动会上报，并把时间写进 storage（而不是页面 data）', function () {
  const storage = {}
  const calls = launch(storage)
  assert.ok(calls.includes('getNetworkType'), '首次启动应走进上报流程（取网络类型）')
  assert.ok(typeof storage[KEY] === 'number' && storage[KEY] > 0,
    '上报时间必须写进 storage，写在页面 data 里跨实例就丢了')
  assert.ok(Math.abs(storage[KEY] - Date.now()) < 5000, '写入的应是当前时间')
})

test('5 分钟内第二次冷启动不再上报（这条在旧实现下必红）', function () {
  const storage = {}
  launch(storage)
  const firstStamp = storage[KEY]
  assert.ok(firstStamp > 0, '前置条件：第一次已上报')

  const calls = launch(storage)
  assert.ok(!calls.includes('getNetworkType'),
    '5 分钟内的第二次冷启动不该再上报；旧实现把时间戳存在页面 data 里，每个实例都是 0，所以每次都会上报')
  assert.strictEqual(storage[KEY], firstStamp, '节流命中时不该刷新时间戳，否则永远节流下去')
})

test('超过 5 分钟后恢复上报并刷新时间戳', function () {
  const old = Date.now() - (FIVE_MIN + 60 * 1000)
  const storage = {}
  storage[KEY] = old
  const calls = launch(storage)
  assert.ok(calls.includes('getNetworkType'), '超过 5 分钟应重新上报')
  assert.ok(storage[KEY] > old, '时间戳应刷新')
  assert.ok(storage[KEY] > Date.now() - 5000, '刷新成的应是当前时间')
})

test('临界值：正好 5 分钟算过期，差 1 秒不算', function () {
  const justOver = {}
  justOver[KEY] = Date.now() - FIVE_MIN - 1000
  assert.ok(launch(justOver).includes('getNetworkType'), '超过 5 分钟应上报')

  const justUnder = {}
  justUnder[KEY] = Date.now() - FIVE_MIN + 60 * 1000
  assert.ok(!launch(justUnder).includes('getNetworkType'), '不足 5 分钟不该上报')
})

test('storage 里是脏数据时不该崩，按"没上报过"处理', function () {
  ;['', null, undefined, 'abc', 0].forEach(function (dirty) {
    const storage = {}
    if (dirty !== undefined) storage[KEY] = dirty
    const calls = launch(storage)
    assert.ok(calls.includes('getNetworkType'), 'storage 是脏数据时应照常上报，而不是崩或永久节流')
    assert.ok(typeof storage[KEY] === 'number', '上报后应写入合法时间戳')
  })
})

test('首页 data 里不该再留 lastTimestamp（它是假节流的根源）', function () {
  const page = mp.load('pages/index/index.js')
  assert.strictEqual(page.data.lastTimestamp, undefined,
    'lastTimestamp 存在页面 data 里正是节流失效的原因，已改用 storage，不要再加回来')
  const src = require('fs').readFileSync(require('path').join(mp.REPO, 'pages/index/index.js'), 'utf8')
  assert.match(src, /getStorageSync\(['"]lastReportTimestamp['"]\)/, '节流必须读 storage')
  assert.match(src, /setStorageSync\(['"]lastReportTimestamp['"]/, '节流必须写 storage')
})

/* ---------------- 统计上报不许打扰用户 ---------------- */

/**
 * 这一组守的是 2.4.0 的发布级 bug：使用统计上报原先走"取不到 openid 就补登录、
 * 补不上就弹阻塞式 showModal"的路径。而首页 8 个倒班入口全是纯本地计算、根本不需要登录，
 * 于是用户只想查今天上什么班，却因为一个后台统计请求失败被模态框拦住 ——
 * 网络不通或后端域名失效时，每个用户一打开首页必中。
 *
 * 修法是让上报走静默路径。这几条测试钉住"静默"这个性质：
 * 既不许弹框，也不许把上报功能本身修没了。
 */

// 直接调 mystep2（onLoad 里是 setTimeout 800ms 后才调，同步测试等不到）
function report(appOverrides) {
  const apiLog = []
  const calls = []
  const page = mp.load('pages/index/index.js', null, {
    storage: {}, calls: calls, apiLog: apiLog, app: appOverrides
  })
  page.mystep2(String(Date.now()), { networkType: 'wifi' })
  return { apiLog: apiLog, calls: calls }
}

function popups(apiLog) {
  return apiLog.filter(function (x) {
    return x.name === 'showModal' || x.name === 'showToast' || x.name === 'hideToast'
  })
}

test('取不到 openid 时静默跳过，一个提示都不许弹（这条在旧实现下必红）', function () {
  const r = report({ getOpenid: function () { return null } })
  assert.deepStrictEqual(popups(r.apiLog), [],
    '统计上报是纯后台行为，失败不该打扰用户。旧实现会在这里弹阻塞式 showModal')
  assert.ok(!r.calls.includes('getScreenBrightness'),
    '没有 openid 就该直接 return，不要继续走上报流程')
})

test('openid 是 undefined / 空串时同样静默', function () {
  ;[undefined, ''].forEach(function (bad) {
    const r = report({ getOpenid: function () { return bad } })
    assert.deepStrictEqual(popups(r.apiLog), [], 'openid = ' + JSON.stringify(bad) + ' 时不该弹提示')
    assert.ok(!r.calls.includes('getScreenBrightness'), 'openid = ' + JSON.stringify(bad) + ' 时不该上报')
  })
})

test('取得到 openid 时照常上报（别把功能一起修没了）', function () {
  const r = report(null)
  assert.ok(r.calls.includes('getScreenBrightness'), '应继续走上报流程：取屏幕亮度')
  assert.ok(r.calls.includes('getSystemInfo'), '应继续走上报流程：取系统信息')
  assert.deepStrictEqual(popups(r.apiLog), [], '正常上报路径也不该弹任何提示')
})

test('作者自己的 openid 跳过上报，且同样不弹提示', function () {
  const r = report({ getOpenid: function () { return 'o9K4b0QW0Yz2wosJeEIIk7QJo8Cg' } })
  assert.ok(!r.calls.includes('getScreenBrightness'), '作者自己不该被计入统计')
  assert.deepStrictEqual(popups(r.apiLog), [], '跳过时也不该弹提示')
})

test('app.js 里不该再有"补登录失败就弹框"的方法', function () {
  const src = require('fs').readFileSync(require('path').join(mp.REPO, 'app.js'), 'utf8')
  assert.ok(!/withOpenid\s*:\s*function/.test(src), 'withOpenid 已删除，别加回来')
  assert.ok(!/loginFailTip\s*:\s*function/.test(src), 'loginFailTip 已删除，别加回来')
  assert.match(src, /getOpenid\s*:\s*function/, 'getOpenid 要留着：同步、拿不到返回 null')
})
