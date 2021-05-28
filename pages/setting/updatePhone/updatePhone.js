const AV = require('../../../libs/av-weapp-min.js');

Page({
  data: {
    setOrUpdate: "设置",
    inputValue: ""
  },

  onLoad: function (options) {
    this.setData({
      setOrUpdate: options.setOrUpdate
    })
  },

  bindKeyInput: function (e) {
    this.setData({
      inputValue: e.detail.value
    })
  },

  //提交按钮
  input: function () {
    var that = this
    var input = this.data.inputValue
    var openid = AV.User.current().toJSON().authData.lc_weapp.openid
    if (input.length != 11) {
      wx.showModal({
        title: '提示',
        content: '请输入正确的手机号！',
        showCancel: false
      })
      return
    }
    wx.showToast({
      title: '请稍候',
      icon: 'loading',
      duration: 20000
    });
    var query = new AV.Query('WechatUser');
    query.equalTo('openid', openid);
    query.find().then(function (users) {
      var id = users[0].id
      var user = AV.Object.createWithoutData('WechatUser', id);
      user.set('phone', input);
      user.save();
      wx.navigateBack({})
      wx.showModal({
        title: '提示',
        content: '手机' + that.data.setOrUpdate + '成功！',
        showCancel: false
      })
      wx.hideToast()
      //给客户发送邮件
      AV.Cloud.run('sendWelcomeMail', {
        to: users[0].get('mail')
      });
    });
  }
})