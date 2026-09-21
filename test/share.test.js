'use strict'
/**
 * 转发 / 分享到朋友圈的公共实现与页面接线
 *
 * 背景：此前 11 个页面只调 wx.showShareMenu()、一处 onShareAppMessage 都没实现，
 * 按微信规则右上角菜单的「转发」一直是灰的。本文件钉住三件事：
 *   1. 每个页面都接了 share（require + setup() + 两个分享钩子），
 *      且不再绕过 share.setup() 直接调 wx.showShareMenu（那样 menus 参数会丢）
 *   2. 转发标题 TITLES 与页面 json 的 navigationBarTitleText 一一对应
 *   3. share.appMessage() / share.timeline() 返回的标题与路径正确
 */
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const mp = require('./helpers/miniprogram.js')

const share = require(path.join(mp.REPO, 'utils/share.js'))
const appJson = JSON.parse(fs.readFileSync(path.join(mp.REPO, 'app.json'), 'utf8'))

test('每个页面都接了转发：require share + setup() + 两个分享钩子', function () {
  const problems = []
  appJson.pages.forEach(function (p) {
    const src = fs.readFileSync(path.join(mp.REPO, p + '.js'), 'utf8')
    if (src.indexOf('utils/share.js') === -1) problems.push(p + ' 没 require utils/share.js')
    if (src.indexOf('share.setup(wx)') === -1) problems.push(p + ' onLoad 没调 share.setup(wx)')
    if (src.indexOf('onShareAppMessage') === -1) problems.push(p + ' 缺 onShareAppMessage（转发菜单是灰的）')
    if (src.indexOf('onShareTimeline') === -1) problems.push(p + ' 缺 onShareTimeline（朋友圈分享出不来）')
    if (src.indexOf('wx.showShareMenu') !== -1) problems.push(p + ' 绕过 share.setup() 直接调了 wx.showShareMenu')
  })
  assert.deepStrictEqual(problems, [], problems.join('；'))
})

test('转发标题与页面 navigationBarTitleText 一一对应', function () {
  const problems = []
  appJson.pages.forEach(function (p) {
    const j = JSON.parse(fs.readFileSync(path.join(mp.REPO, p + '.json'), 'utf8'))
    const nav = j.navigationBarTitleText
    //首页例外：卡片直接叫「查班神器」，不叠加成「查班神器：查班神器」
    const expected = nav === '查班神器' ? '查班神器' : '查班神器：' + nav
    if (share.TITLES[p] !== expected) {
      problems.push(p + '：TITLES 是「' + share.TITLES[p] + '」，按页面标题应为「' + expected + '」')
    }
  })
  assert.deepStrictEqual(problems, [], problems.join('；'))
  //反向：页面删了或改名，TITLES 里的残留 key 也要跟着清
  assert.deepStrictEqual(Object.keys(share.TITLES).sort(), [...appJson.pages].sort(),
    'TITLES 的 key 必须恰好是 app.json 注册的全部页面')
})

//appMessage / timeline 依赖运行环境的 getCurrentPages()，测试里临时挂一个
function withPageStack(pages, fn) {
  const saved = global.getCurrentPages
  global.getCurrentPages = function () { return pages }
  try {
    fn()
  } finally {
    if (saved === undefined) delete global.getCurrentPages
    else global.getCurrentPages = saved
  }
}

test('appMessage：标题取当前页面、path 直达当前页', function () {
  withPageStack([{ route: 'pages/wbsd/worker/worker' }], function () {
    const card = share.appMessage()
    assert.strictEqual(card.title, '查班神器：五班三倒 · 个人')
    assert.strictEqual(card.path, '/pages/wbsd/worker/worker')
  })
})

test('timeline：标题与 appMessage 同源', function () {
  withPageStack([{ route: 'pages/jjd/director/director' }], function () {
    assert.strictEqual(share.timeline().title, '查班神器：经警队 · 总览')
  })
})

test('页面栈为空时 path 退回首页（分享时不会发生，纯兜底）', function () {
  withPageStack([], function () {
    assert.strictEqual(share.appMessage().path, '/pages/index/index')
  })
})

test('未知页面路径时标题兜底为「查班神器」', function () {
  withPageStack([{ route: 'pages/unknown/thing' }], function () {
    assert.strictEqual(share.appMessage().title, '查班神器')
  })
})

test('setup：showShareMenu 必须带 menus 参数（朋友圈入口才出得来）', function () {
  const calls = []
  share.setup({ showShareMenu: function (o) { calls.push(o) } })
  assert.deepStrictEqual(calls.length, 1)
  assert.deepStrictEqual(calls[0].menus, ['shareAppMessage', 'shareTimeline'])
})
