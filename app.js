const AV = require('./libs/av-weapp-min.js')
var mta = require('./libs/mta_analysis.js')

AV.init({
  appId: 'WgCaIMjje5tVez7TD63Wfain-gzGzoHsz',
  appKey: 'RghzMpMGmyv5zyDVoecjyS4T',
});

App({
  globalData: {
    //小程序版本号
    appVersion: "2.3.1",
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
    //调用API从本地缓存中获取数据
    var logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
    this.globalData.launchScene = launchScene
    //mta初始化
    mta.App.init({
      "appID": "500623733",
      "eventID": "500623763",
      "statPullDownFresh": true,
      "statShareApp": true,
      "statReachBottom": true,
      "lauchOpts": launchScene
    });
    //leancloud登录
    AV.User.loginWithWeapp();
    this.getUserInfo()
  }
})

/**
 * 版本更新日志
 * 
 * 2.3.0
 * 开通广告，给每个页面加入Banner广告
 * 查询ip的key更新，在ip138
 * 检查更新，如有更新，自动更新。强制更新
 * 给每个页面添加转发按钮
 * 
 * 2.3.1
 * 取消首页Banner广告
 * mta统计，首页的按钮，倒班规则选择。是哪个班组，个人还是总览
 * 
 */