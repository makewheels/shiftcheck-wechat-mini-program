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
  }
})
