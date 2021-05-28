const AV = require('./libs/av-weapp-min.js');

AV.init({
  appId: 'WgCaIMjje5tVez7TD63Wfain-gzGzoHsz',
  appKey: 'RghzMpMGmyv5zyDVoecjyS4T',
});

App({
  globalData: {
    userInfo: null,
    workerModeName: "个人",
    directorModeName: "总览",
    scene: 0
  },

  getUserInfo: function (cb) {
    var that = this
    if (this.globalData.userInfo) {
      typeof cb == "function" && cb(this.globalData.userInfo)
    } else {
      //调用登录接口
      wx.login({
        success: function () {
          wx.getUserInfo({
            success: function (res) {
              that.globalData.userInfo = res.userInfo
              typeof cb == "function" && cb(that.globalData.userInfo)
            }
          })
        }
      })
    }
  },

  onLaunch: function (scene) {
    //调用API从本地缓存中获取数据
    var logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
    this.globalData = scene
    //leancloud登录
    AV.User.loginWithWeapp();
  }
})