'use strict'
/**
 * 「个人模式默认班组」：设置页与 4 个个人页的读写契约
 *
 * 背景：设置入口原来只对五班三倒生效（setting-wbsdDefault），
 * 经警队 / 四班四倒 / 三班半倒的个人页都是硬编码默认一班，入口文案却通用。
 * 2026-09-21 起四种倒班各自接上自己的 storage key；本文件钉住：
 *   1. 4 个个人页 onLoad：设了默认班组就用它，没设 / 值不合法就用各自兜底
 *   2. 设置页：四种倒班各显示一行当前值，修改后写 storage 并刷新
 */
const test = require('node:test')
const assert = require('node:assert')
const mp = require('./helpers/miniprogram.js')

//4 个个人页：storage key、班组数上限、未设置时的兜底班组名
const WORKERS = [
  { rel: 'pages/wbsd/worker/worker.js', name: '五班三倒', key: 'setting-wbsdDefault', max: 5, fallback: '三班' },
  { rel: 'pages/jjd/worker/worker.js', name: '经警队', key: 'setting-jjdDefault', max: 4, fallback: '一班' },
  { rel: 'pages/sbsd/worker/worker.js', name: '四班四倒', key: 'setting-sbsdDefault', max: 4, fallback: '一班' },
  { rel: 'pages/sbbd/worker/worker.js', name: '三班半倒', key: 'setting-sbbdDefault', max: 3, fallback: '一班' }
]

WORKERS.forEach(function (w) {
  test(w.name + '个人页：设置了默认班组时 onLoad 用它', function () {
    const storage = {}
    storage[w.key] = 2
    const page = mp.load(w.rel, null, { storage: storage })
    page.onLoad()
    assert.strictEqual(page.data.banzuId, 2)
    assert.strictEqual(page.data.banzuName, '二班')
  })

  test(w.name + '个人页：没设置过时用兜底默认（' + w.fallback + '）', function () {
    const page = mp.load(w.rel, null, { storage: {} })
    page.onLoad()
    assert.strictEqual(page.data.banzuName, w.fallback)
  })

  if (w.max !== 5) {
    //五班三倒的 onLoad 是历史代码（undefined/0→三班、其余→五班的旧链条），本 PR 没动它，
    //越界值的语义只对新接上的 3 页断言
    test(w.name + '个人页：存的值越界/是垃圾时用兜底默认', function () {
      for (const bad of [0, -1, w.max + 1, 99, 'x', '']) {
        const storage = {}
        storage[w.key] = bad
        const page = mp.load(w.rel, null, { storage: storage })
        page.onLoad()
        assert.strictEqual(page.data.banzuName, w.fallback,
          w.name + ' 存了 ' + JSON.stringify(bad) + ' 应落到兜底默认 ' + w.fallback)
      }
    })
  }
})

test('设置页：onLoad 显示四种倒班的当前默认班组', function () {
  const storage = { 'setting-wbsdDefault': 3, 'setting-sbbdDefault': 1 }
  const page = mp.load('pages/setting/workerDefaultBanzu/workerDefaultBanzu.js', null, { storage: storage })
  page.onLoad()
  assert.strictEqual(page.data.modes.length, 4, '四种倒班各一行')
  assert.deepStrictEqual(page.data.modes.map(function (m) { return m.name }), [
    '五班三倒', '经警队', '四班四倒', '三班半倒'
  ])
  assert.strictEqual(page.data.modes[0].current, '三班', '五班三倒设了 3')
  assert.strictEqual(page.data.modes[1].current, '未设置（默认一班）', '经警队没设过')
  assert.strictEqual(page.data.modes[2].current, '未设置（默认一班）', '四班四倒没设过')
  assert.strictEqual(page.data.modes[3].current, '一班', '三班半倒设了 1')
})

test('设置页：未设置时显示兜底值说明（五班三倒的兜底是三班）', function () {
  const page = mp.load('pages/setting/workerDefaultBanzu/workerDefaultBanzu.js', null, { storage: {} })
  page.onLoad()
  assert.strictEqual(page.data.modes[0].current, '未设置（默认三班）')
})

test('设置页：修改经警队默认班组 → 写 storage 并刷新显示', function () {
  const storage = {}
  const page = mp.load('pages/setting/workerDefaultBanzu/workerDefaultBanzu.js', null,
    { storage: storage, actionSheetTap: 1 }) //动作表选第 2 项（tapIndex 1 = 二班）
  page.onLoad()
  page.changeBanzu({ currentTarget: { dataset: { index: 1 } } }) //第 2 行是经警队
  assert.strictEqual(storage['setting-jjdDefault'], 2, '应把班组号 2 写进 jjd 的 key')
  assert.strictEqual(page.data.modes[1].current, '二班', '显示要跟着刷新')
  //其它倒班不受影响
  assert.strictEqual(storage['setting-wbsdDefault'], undefined)
})

test('设置页：修改五班三倒默认班组 → 写 wbsd 的 key', function () {
  const storage = {}
  const page = mp.load('pages/setting/workerDefaultBanzu/workerDefaultBanzu.js', null,
    { storage: storage, actionSheetTap: 4 }) //选第 5 项 = 五班
  page.onLoad()
  page.changeBanzu({ currentTarget: { dataset: { index: 0 } } }) //第 1 行是五班三倒
  assert.strictEqual(storage['setting-wbsdDefault'], 5)
  assert.strictEqual(page.data.modes[0].current, '五班')
})
