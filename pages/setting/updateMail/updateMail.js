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
    //判断输入是否正确
    var indexAt = input.indexOf("@")
    var indexPoint = input.indexOf(".")
    if (indexAt == -1 || indexPoint == -1 || input.length <= 4) {
      //输入有误
      wx.showModal({
        title: '提示',
        content: '请输入正确的邮箱！',
        showCancel: false
      })
    } else {
      //暂且认为输入正确
      var query = new AV.Query('WechatUser');
      query.equalTo('openid', openid);
      query.find().then(function (users) {
        var id = users[0].id
        var user = AV.Object.createWithoutData('WechatUser', id);
        user.set('mail', input);
        user.save();
        wx.navigateBack({})
        wx.showModal({
          title: '提示',
          content: '邮箱' + that.data.setOrUpdate + '成功！',
          showCancel: false
        })
        //给客户发送邮件
        AV.Cloud.run('sendWelcomeMail', {
          to: input
        });
      });
    }
  }
})