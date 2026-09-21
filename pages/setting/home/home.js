var app = getApp()
var share = require('../../../utils/share.js')

Page({
  data: {},

  onLoad: function() {
    share.setup(wx)
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

  //转发给朋友 / 分享到朋友圈
  onShareAppMessage: share.appMessage,
  onShareTimeline: share.timeline,
})
