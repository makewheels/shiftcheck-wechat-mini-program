Page({
  data: {
    currentMail: "loading...",
    currentSms: "loading...",
    mailChecked: false,
    smsChecked: false
  },

  onShow: function () {

  },

  mailSwitch: function (e) {
    console.log('switch1 发生 change 事件，携带值为', e.detail.value)
  },

  smsSwitch: function (e) {
    console.log('switch1 发生 change 事件，携带值为', e.detail.value)
  },

  toSetPush: function () {
    wx.showToast({
      title: '开发中',
    })
  }
})