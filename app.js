const AV = require('./libs/av-core-min.js');
const adapters = require('./libs/leancloud-adapters-weapp.js');

AV.setAdapters(adapters);
AV.init({
  appId: 'WgCaIMjje5tVez7TD63Wfain-gzGzoHsz',
  appKey: 'RghzMpMGmyv5zyDVoecjyS4T',
  serverURLs: 'https://api.leancloud.mp.shiftcheck.work'
});

App({
  globalData: {
    //小程序版本号
    appVersion: "2.4.0",
    launchScene: {}
  },

  /**
   * 当前登录用户的 openid，还没登录上时返回 null
   * 页面里不要再直接写 AV.User.current().toJSON()，冷启动首次登录还没回来时那样会崩
   */
  getOpenid: function() {
    var user = AV.User.current()
    if (!user) {
      return null
    }
    var json = user.toJSON()
    var authData = json && json.authData && json.authData.lc_weapp
    return authData ? authData.openid : null
  },

  /**
   * 这里曾经有一对「拿不到 openid 就补登录、补不上就弹阻塞式模态框」的方法，已删除，别加回来。
   *
   * 全仓库没有任何功能真的需要登录态：8 个倒班页与设置页都是纯本地计算，
   * 那对方法唯一的调用方是首页的使用统计上报（纯后台行为）。结果是用户只想查今天上什么班，
   * 却因为一个统计请求失败被模态框拦住 —— 网络不通或后端域名失效时，每个用户一打开首页必中。
   *
   * hygiene.test.js 有门禁守着不许复活；来龙去脉见 AGENTS.md「改页面时」与
   * doc/changes/ 里 2026-09-14 的那条记录。
   *
   * 要 openid 就用上面的 getOpenid()：同步、拿不到返回 null，由调用方自己决定静默跳过。
   */

  /**
   * 小程序强制升级
   *
   * 三个回调都要在 onLaunch 里尽早注册：
   * onUpdateReady 如果等到 onCheckForUpdate 的回调里再注册，冷启动时新版本可能已经下载完，
   * 事件错过就永远不会 applyUpdate，用户这一轮就停在旧版本上了。
   */
  initUpdateManager: function() {
    if (!wx.getUpdateManager) {
      return
    }
    var updateManager = wx.getUpdateManager()

    updateManager.onCheckForUpdate(function(res) {
      if (res.hasUpdate) {
        wx.showToast({
          title: '发现新版本，正在下载...',
          icon: 'none'
        })
      }
    })

    updateManager.onUpdateReady(function() {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经下载好，点确定重启到新版本',
        showCancel: false,
        success: function() {
          updateManager.applyUpdate()
        }
      })
    })

    updateManager.onUpdateFailed(function() {
      wx.showModal({
        title: '更新提示',
        content: '新版本下载失败，请检查网络后删除小程序，重新搜索打开',
        showCancel: false
      })
    })
  },

  /**
   * leancloud 登录，失败后重试
   */
  login: function(retryLeft) {
    var that = this
    var left = retryLeft === undefined ? 2 : retryLeft
    AV.User.loginWithMiniApp().then(function(user) {
      that.globalData.user = user
    }, function() {
      if (left > 0) {
        setTimeout(function() {
          that.login(left - 1)
        }, 2000)
      }
    })
  },

  onLaunch: function (launchScene) {
    this.globalData.launchScene = launchScene

    //升级检查要尽早注册，放在登录之前
    this.initUpdateManager()
    //leancloud登录
    this.login()
  }
})
