const AV = require('../../../libs/av-core-min.js');
var app = getApp()

Page({
  data: {},

  onLoad: function() {
    wx.showShareMenu()
    this.setData({
      appVersion: app.globalData.appVersion
    })
  },

  //打开页面先干掉加载框（其它页面可能还挂着 20 秒的 loading toast）
  onShow: function() {
    wx.hideToast()
  },

  //设置默认班组
  toWorkerDefaultBanzu: function() {
    wx.navigateTo({
      url: '../workerDefaultBanzu/workerDefaultBanzu',
    })
  },

  //我的DIY规则
  toMyRule: function() {
    wx.navigateTo({
      url: '../myRuleHome/myRuleHome'
    })
  },

  //订阅上班推送
  toPushHome: function() {
    wx.showToast({
      title: '请稍候',
      icon: 'loading',
      duration: 20000
    });
    var query = new AV.Query('WechatUser');
    query.equalTo('openid', AV.User.current().toJSON().authData.lc_weapp.openid);
    query.find().then(function(users) {
      if (users.length == 0 || users[0].get('mail') == undefined || users[0].get('mail') == "") {
        wx.hideToast()
        wx.navigateTo({
          url: '../accountHome/accountHome',
        })
        wx.showModal({
          title: '提示',
          content: '请先设置邮箱和手机！',
          showCancel: false
        })
      } else {
        wx.navigateTo({
          url: '../pushHome/pushHome'
        })
      }
    });
  },

  //用户反馈
  toFeedback: function() {
    wx.navigateTo({
      url: '../feedback/feedback',
    })
  },

  //我的账户
  toAccountHome: function() {
    wx.navigateTo({
      url: '../accountHome/accountHome',
    })
  }
})