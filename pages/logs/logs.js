//logs.js
var util = require('../../utils/util.js')
var mta = require('../../libs/mta_analysis.js')

Page({
  data: {
    logs: []
  },

  onLoad: function () {
    mta.Page.init()
    this.setData({
      logs: (wx.getStorageSync('logs') || []).map(function (log) {
        return util.formatTime(new Date(log))
      })
    })
  }
})
