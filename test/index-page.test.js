'use strict'
/**
 * 首页行为测试
 *
 * 2.5.0 起 LeanCloud 集成整条删除（专有域名 2026-08-09 到期未续费、全球解析不到，
 * 统计对所有人早已是死的），首页 onLoad 不再发任何网络请求。本文件守住这个性质：
 * 首页是纯入口页，加载时只允许 showShareMenu。
 *
 * 历史：2.4.0 及之前这里测的是「5 分钟上报节流」与「上报失败不许弹框」两组性质；
 * 链路删除后那些测试失去对象，连同 mystep2 一起移除。
 * "不许复活"由 hygiene.test.js 的门禁守着（AV 调用点、libs/ require、弹框方法名）。
 */
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const mp = require('./helpers/miniprogram.js')

function launch() {
  const calls = []
  const apiLog = []
  const page = mp.load('pages/index/index.js', null, { calls: calls, apiLog: apiLog })
  page.onLoad()
  return { calls: calls, apiLog: apiLog, page: page }
}

test('首页 onLoad 不发任何网络请求（统计链路已删）', function () {
  const r = launch()
  assert.ok(!r.calls.includes('request'), '首页不该再发 wx.request')
  assert.ok(!r.calls.includes('login'), '首页不该再触发 wx.login')
  assert.ok(!r.calls.includes('getNetworkType'),
    '取网络类型只为上报服务；上报没了，它也不该再出现')
})

test('首页 onLoad 不弹任何提示', function () {
  const r = launch()
  const popups = r.apiLog.filter(function (x) {
    return x.name === 'showModal' || x.name === 'showToast'
  })
  assert.deepStrictEqual(popups, [],
    '首页加载不该弹框。2.4.0 的发布级事故就是这里弹了「登录没成功」挡住用户')
})

test('首页 onLoad 仍会开转发菜单', function () {
  assert.ok(launch().calls.includes('showShareMenu'), 'showShareMenu 要保留')
})

test('首页源码里不该再有 LeanCloud / 上报的痕迹', function () {
  const src = fs.readFileSync(path.join(mp.REPO, 'pages/index/index.js'), 'utf8')
  assert.ok(!/\bAV\b|UseMessage|mystep2|lastReportTimestamp/.test(src),
    '上报链路已删：AV / UseMessage / mystep2 / 节流时间戳都不要加回来')
})

test('app.js 里不该再有登录与 openid 相关方法', function () {
  const src = fs.readFileSync(path.join(mp.REPO, 'app.js'), 'utf8')
  ;['withOpenid', 'loginFailTip', 'getOpenid', 'login'].forEach(function (fn) {
    assert.ok(!new RegExp(fn + '\\s*:\\s*function').test(src),
      fn + ' 已随 LeanCloud 集成删除，别加回来')
  })
  assert.match(src, /initUpdateManager\s*:\s*function/, '强制升级要留着')
})

test('9 个入口跳转方法都还在', function () {
  const page = mp.load('pages/index/index.js')
  ;['toWbsdWorker', 'toWbsdDirector', 'toSbsdWorker', 'toSbsdDirector',
    'toSbbdWorker', 'toSbbdDirector', 'toSettingHome', 'toJjdWorker', 'toJjdDirector'
  ].forEach(function (fn) {
    assert.strictEqual(typeof page[fn], 'function', fn + ' 不能丢')
  })
})
