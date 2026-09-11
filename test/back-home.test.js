'use strict'
/**
 * 「返回主页」按钮在深链场景下的行为
 *
 * 8 个倒班页在 sitemap 白名单里，可以被搜一搜 / 扫码 / 分享卡片直接打开；
 * 此时页面栈深度只有 1，无条件 `wx.navigateBack({})` 会**静默失败**（它连 fail 回调都没写）——
 * 用户点「返回主页」毫无反应，看起来就像按钮坏了。
 *
 * 修法：栈深 <= 1 时改用 `wx.reLaunch({ url: '/pages/index/index' })`。
 * 这里用沙箱控制 `getCurrentPages()` 返回的栈深度，把两条分支都测到。
 */
const test = require('node:test')
const assert = require('node:assert')
const mp = require('./helpers/miniprogram.js')
const pg = require('./helpers/pages.js')

const HOME = '/pages/index/index'

// 点一次「返回主页」，返回这次点击调用过的 wx API 日志
function tapClose(meta, stackDepth) {
  const apiLog = []
  const stack = []
  for (let i = 0; i < stackDepth; i++) stack.push({})
  const page = mp.load(meta.rel, pg.extraDataFor(meta), { apiLog: apiLog, pageStack: stack })
  assert.strictEqual(typeof page.close, 'function', meta.rel + ' 应有 close()（「返回主页」按钮的处理函数）')
  page.close()
  return apiLog
}

function namesOf(log) {
  return log.map(function (x) { return x.name })
}

pg.PAGES.forEach(function (meta) {
  test('深链进入（栈深 1）时「返回主页」走 reLaunch 回首页：' + meta.name, function () {
    const log = tapClose(meta, 1)
    const names = namesOf(log)
    assert.ok(names.includes('reLaunch'),
      meta.rel + ' 栈深 1 时应改用 reLaunch，实际调用了：' + (names.join(', ') || '（什么都没调）'))
    assert.ok(!names.includes('navigateBack'),
      meta.rel + ' 栈深 1 时不该再 navigateBack —— 它会静默失败，按钮等于没反应')
    const reLaunch = log.filter(function (x) { return x.name === 'reLaunch' })[0]
    assert.ok(reLaunch.arg && reLaunch.arg.url === HOME,
      'reLaunch 应回到首页 ' + HOME + '，实际 url=' + JSON.stringify(reLaunch.arg))
  })

  test('正常进入（栈深 2）时「返回主页」仍走 navigateBack：' + meta.name, function () {
    const log = tapClose(meta, 2)
    const names = namesOf(log)
    assert.ok(names.includes('navigateBack'),
      meta.rel + ' 栈深 >1 时应保留原来的 navigateBack，实际调用了：' + (names.join(', ') || '（什么都没调）'))
    assert.ok(!names.includes('reLaunch'),
      meta.rel + ' 栈深 >1 时不该 reLaunch —— 那会丢掉整个页面栈，用户返回后丢失上下文')
  })
})

test('栈深 3 也走 navigateBack（守卫只针对 <=1）', function () {
  const meta = pg.PAGES.filter(function (p) { return p.rel.includes('jjd/worker') })[0]
  assert.ok(meta, '没找到经警队个人页')
  assert.ok(!namesOf(tapClose(meta, 3)).includes('reLaunch'), '栈深 3 不该 reLaunch')
  assert.ok(namesOf(tapClose(meta, 3)).includes('navigateBack'), '栈深 3 应走 navigateBack')
})
