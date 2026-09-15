Page({
  data: {},

  onLoad: function() {
    wx.showShareMenu()
  },

  toWbsdWorker: function() {
    wx.navigateTo({
      url: '../wbsd/worker/worker'
    })
  },

  toWbsdDirector: function() {
    wx.navigateTo({
      url: '../wbsd/director/director'
    })
  },

  toSbsdWorker: function() {
    wx.navigateTo({
      url: '../sbsd/worker/worker'
    })
  },

  toSbsdDirector: function() {
    wx.navigateTo({
      url: '../sbsd/director/director'
    })
  },

  toSbbdWorker: function() {
    wx.navigateTo({
      url: '../sbbd/worker/worker'
    })
  },

  toSbbdDirector: function() {
    wx.navigateTo({
      url: '../sbbd/director/director'
    })
  },

  toSettingHome: function() {
    wx.navigateTo({
      url: '../setting/home/home'
    })
  },

  toJjdWorker: function() {
    wx.navigateTo({
      url: '../jjd/worker/worker'
    })
  },

  toJjdDirector: function() {
    wx.navigateTo({
      url: '../jjd/director/director'
    })
  },
})
