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
    userInfo: null,
    launchScene: {}
  },

  getUserInfo: function(cb) {
    var that = this
    if (this.globalData.userInfo) {
      typeof cb == "function" && cb(this.globalData.userInfo)
    } else {
      //调用登录接口
      wx.login({
        success: function() {
          wx.getUserInfo({
            success: function(res) {
              that.globalData.userInfo = res.userInfo
              typeof cb == "function" && cb(that.globalData.userInfo)
            }
          })
        }
      })
    }
  },

  //检查更新
  checkAppUpdate: function() {

  },

  onLaunch: function (launchScene) {
    let that=this
    this.globalData.launchScene = launchScene

    //leancloud登录
    AV.User.loginWithMiniApp().then(user => {
      that.globalData.user = user
    })
    this.getUserInfo()
  }
})
