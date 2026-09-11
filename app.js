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
    appVersion: "2.5.0",
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
   * 确保已经登录，拿到 openid 之后执行 cb(openid)
   * 登录不上就提示用户，不执行 cb，避免页面拿着 null 去查数据
   */
  withOpenid: function(cb) {
    var that = this
    var openid = this.getOpenid()
    if (openid) {
      cb(openid)
      return
    }
    AV.User.loginWithMiniApp().then(function(user) {
      that.globalData.user = user
      var openidAfterLogin = that.getOpenid()
      if (openidAfterLogin) {
        cb(openidAfterLogin)
      } else {
        that.loginFailTip()
      }
    }, function() {
      that.loginFailTip()
    })
  },

  loginFailTip: function() {
    wx.hideToast()
    wx.showModal({
      title: '提示',
      content: '登录没成功，请检查网络后重新打开小程序',
      showCancel: false
    })
  },

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
