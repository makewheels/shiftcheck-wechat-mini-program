Page({
  data: {

  },

  toWorkerDefaultBanzu: function () {
    wx.redirectTo({
      url: '../workerDefaultBanzu/workerDefaultBanzu',
    })
  },

  toMyRule: function () {
    wx.redirectTo({
      url: '../myRule/myRule',
    })
  }
})