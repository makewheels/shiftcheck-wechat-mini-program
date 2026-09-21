/**
 * 转发与分享到朋友圈的公共实现
 *
 * 微信规则：页面必须实现 onShareAppMessage，右上角菜单的「转发」才是可点的；
 * 此前 11 个页面只调了 wx.showShareMenu()、一处 onShareAppMessage 都没实现，
 * 转发入口一直是灰的。分享到朋友圈（仅 Android 客户端，好友点开是单页模式）
 * 还要求页面实现 onShareTimeline。
 *
 * 页面接法（三行）：
 *   var share = require('../../utils/share.js')   //按页面深度调整相对路径
 *   onLoad 里调 share.setup()（替代原来的 wx.showShareMenu()）
 *   Page 配置里加两行：onShareAppMessage: share.appMessage, onShareTimeline: share.timeline
 *
 * 转发卡片标题与各页面 json 的 navigationBarTitleText 一一对应（首页例外），
 * test/share.test.js 有测试钉着这层对应，改标题两边要一起动。
 */

//转发卡片标题：首页直接叫「查班神器」，其余页面是「查班神器：<页面标题>」
var TITLES = {
  'pages/index/index': '查班神器',
  'pages/wbsd/worker/worker': '查班神器：五班三倒 · 个人',
  'pages/wbsd/director/director': '查班神器：五班三倒 · 总览',
  'pages/jjd/worker/worker': '查班神器：经警队 · 个人',
  'pages/jjd/director/director': '查班神器：经警队 · 总览',
  'pages/sbsd/worker/worker': '查班神器：四班四倒 · 个人',
  'pages/sbsd/director/director': '查班神器：四班四倒 · 总览',
  'pages/sbbd/worker/worker': '查班神器：三班半倒 · 个人',
  'pages/sbbd/director/director': '查班神器：三班半倒 · 总览',
  'pages/setting/home/home': '查班神器：设置',
  'pages/setting/workerDefaultBanzu/workerDefaultBanzu': '查班神器：默认班组'
}

/**
 * 当前页面路径，如 '/pages/wbsd/worker/worker'。
 * 转发卡片的 path 用它：好友点卡片直达同一个倒班页（页面不需要任何参数）；
 * 取不到页面栈时退回首页
 */
function currentPagePath() {
  var pages = getCurrentPages()
  if (pages.length === 0) {
    return '/pages/index/index'
  }
  return '/' + pages[pages.length - 1].route
}

/**
 * 转发给朋友。页面接法：onShareAppMessage: share.appMessage
 */
function appMessage() {
  var path = currentPagePath()
  return {
    title: TITLES[path.slice(1)] || '查班神器',
    path: path
  }
}

/**
 * 分享到朋友圈。页面接法：onShareTimeline: share.timeline
 */
function timeline() {
  var path = currentPagePath()
  return {
    title: TITLES[path.slice(1)] || '查班神器'
  }
}

/**
 * 页面 onLoad 里调用：share.setup(wx)，替代原来的 wx.showShareMenu()。
 * wx 由调用方传进来 —— 与 calendar.refresh(this) 同一个道理：公共模块不直接闭包全局，
 * 测试沙箱里页面 js 是被包了一层函数才看得到 wx 的，直接引用全局 wx 的模块在沙箱里跑不起来。
 * menus 让右上角菜单同时亮出「转发」与「分享到朋友圈」
 * （menus 参数需基础库 2.11.3+，更低版本只是被忽略，不影响「转发」本身）
 */
function setup(wxEnv) {
  wxEnv.showShareMenu({
    menus: ['shareAppMessage', 'shareTimeline']
  })
}

module.exports = {
  TITLES: TITLES,
  appMessage: appMessage,
  timeline: timeline,
  setup: setup
}
