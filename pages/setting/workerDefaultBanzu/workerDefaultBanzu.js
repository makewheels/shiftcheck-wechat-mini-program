var mta = require('../../../libs/mta_analysis.js')

Page({
  data: {
    wbsdCurrent: "loading..."
  },

  //先加载已保存的设置中的内容
  onLoad: function () {
    mta.Page.init()
    var wbsdSaved = wx.getStorageSync('setting-wbsdDefault')
    if (wbsdSaved == undefined) {
      this.setData({
        wbsdCurrent: "未设置"
      })
      return
    }
    if (wbsdSaved == 1) {
      this.setData({
        wbsdCurrent: "一班"
      })
    } else if (wbsdSaved == 2) {
      this.setData({
        wbsdCurrent: "二班"
      })
    } else if (wbsdSaved == 3) {
      this.setData({
        wbsdCurrent: "三班"
      })
    } else if (wbsdSaved == 4) {
      this.setData({
        wbsdCurrent: "四班"
      })
    } else if (wbsdSaved == 5) {
      this.setData({
        wbsdCurrent: "五班"
      })
    } else {
      this.setData({
        wbsdCurrent: "未设置"
      })
    }
  },

  //点击修改五班三倒按钮
  wbsd: function () {
    var that = this
    wx.showActionSheet({
      itemList: ['一班', '二班', '三班', '四班', '五班'],
      success: function (res) {
        var index = res.tapIndex
        wx.setStorageSync('setting-wbsdDefault', index + 1)
        var banzuStr = ""
        if (index == 0) {
          banzuStr = "一班"
          that.setData({
            wbsdCurrent: "一班"
          })
        } else if (index == 1) {
          banzuStr = "二班"
          that.setData({
            wbsdCurrent: "二班"
          })
        } else if (index == 2) {
          banzuStr = "三班"
          that.setData({
            wbsdCurrent: "三班"
          })
        } else if (index == 3) {
          banzuStr = "四班"
          that.setData({
            wbsdCurrent: "四班"
          })
        } else {
          banzuStr = "五班"
          that.setData({
            wbsdCurrent: "五班"
          })
        }
        wx.showToast({
          title: '已设为' + banzuStr + "!"
        })
      }
    })
  }
})