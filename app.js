const AV = require('./libs/av-core-min.js');
const adapters = require('./libs/leancloud-adapters-weapp.js');

// const AV = require('./libs/av-weapp-min.js')
// var mta = require('./libs/mta_analysis.js')

AV.setAdapters(adapters);
AV.init({
  appId: 'WgCaIMjje5tVez7TD63Wfain-gzGzoHsz',
  appKey: 'RghzMpMGmyv5zyDVoecjyS4T',
  serverURLs: 'https://api.leancloud.mp.shiftcheck.work'
});

App({
  globalData: {
    //小程序版本号
    appVersion: "2.3.4",
    launchScene: {}
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

  onLaunch: function (launchScene) {
    let that=this
    this.globalData.launchScene = launchScene

    //升级检查要尽早注册，放在登录之前
    this.initUpdateManager()

    //leancloud登录
    AV.User.loginWithMiniApp().then(user => {
      that.globalData.user = user
    })
  }
})
