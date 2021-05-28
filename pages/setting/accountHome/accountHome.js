const AV = require('../../../libs/av-weapp-min.js');

Page({
  data: {
    mail: "loading...",
    phone: "loading...",
    setOrUpdate: "设置"
  },

  onShow: function (options) {
    var that = this
    var openid = AV.User.current().toJSON().authData.lc_weapp.openid
    var query = new AV.Query('WechatUser');
    query.equalTo('openid', openid);
    query.find().then(function (users) {
      if (users.length == 1) {
        //如果有用户
        var user = users[0]
        var mail = user.get('mail')
        if (mail == undefined || mail == "") {
          mail = "未设置"
        }
        var phone = user.get('phone')
        if (phone == undefined || phone == "") {
          phone = "未设置"
        }
        that.setData({
          mail: mail,
          phone: phone,
          setOrUpdate: "修改"
        })
      } else {
        //如果没有WechatUser，新增
        var WechatUser = AV.Object.extend('WechatUser');
        var user = new WechatUser();
        user.set('openid', openid);
        user.save().then(function (user) {
          that.setData({
            mail: "未设置",
            phone: "未设置",
            setOrUpdate: "设置"
          })
        });
      }
    });
  },

  toSetMail: function () {
    var param = ""
    if (this.data.mail == "未设置") {
      param = "设置"
    } else {
      param = "修改"
    }
    wx.navigateTo({
      url: '../updateMail/updateMail?setOrUpdate=' + param
    })
  },

  toSetPhone: function () {
    var param = ""
    if (this.data.phone == "未设置") {
      param = "设置"
    } else {
      param = "修改"
    }
    wx.navigateTo({
      url: '../updatePhone/updatePhone?setOrUpdate=' + param
    })
  }
})