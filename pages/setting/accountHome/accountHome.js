const AV = require('../../../libs/av-weapp-min.js');
var mta = require('../../../libs/mta_analysis.js')

Page({
  data: {
    mail: "loading...",
    phone: "loading...",
    setOrUpdateMail: "设置",
    setOrUpdatePhone: "设置"
  },

  onLoad: function () {
    mta.Page.init()
    wx.showShareMenu()
  },

  onShow: function (options) {
    wx.showToast({
      title: '请稍候',
      icon: 'loading',
      duration: 20000
    });
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
          that.setData({
            setOrUpdateMail: "设置"
          })
        } else {
          //设置邮箱不全显示
          //先找到@索引位置
          var atIndex = mail.indexOf("@")
          mail = mail.substring(0, 1) + "***" + mail.substring(atIndex - 1, atIndex) + mail.substring(atIndex, mail.length)
          that.setData({
            setOrUpdateMail: "修改"
          })
        }
        var phone = user.get('phone')
        if (phone == undefined || phone == "") {
          phone = "未设置"
          that.setData({
            setOrUpdatePhone: "设置"
          })
        } else {
          //手机省去位处理
          if (phone.length == 11) {
            phone = phone.substring(0, 3) + "****" + phone.substring(7, 11)
          }
          that.setData({
            setOrUpdatePhone: "修改"
          })
        }
        that.setData({
          mail: mail,
          phone: phone
        })
      } else {
        //如果没有WechatUser，新增
        var WechatUser = AV.Object.extend('WechatUser');
        var user = new WechatUser();
        user.set('openid', openid);
        user.set('mailPushTimes', 5)
        user.set('smsPushTimes', 5)
        user.save().then(function (user) {
          // wx.showModal({
          //   title: '提示',
          //   content: '新用户享5次免费邮件短信推送',
          //   showCancel:false
          // })
          that.setData({
            mail: "未设置",
            phone: "未设置",
            setOrUpdateMail: "设置",
            setOrUpdatePhone: "设置"
          })
        });
      }
      wx.hideToast()
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
    //先判断是否设置过邮箱
    //如果已经设置过邮箱，可以设置手机
    //如果没设过邮箱，必须先设置邮箱
    var that = this
    var openid = AV.User.current().toJSON().authData.lc_weapp.openid
    var query = new AV.Query('WechatUser');
    query.equalTo('openid', openid);
    query.find().then(function (users) {
      var user = users[0]
      var mail = user.get("mail")
      if (mail == undefined || mail == "") {
        wx.showModal({
          title: '提示',
          content: '请先设置邮箱！',
          showCancel: false
        })
      } else {
        var param = ""
        if (that.data.phone == "未设置") {
          param = "设置"
        } else {
          param = "修改"
        }
        wx.navigateTo({
          url: '../updatePhone/updatePhone?setOrUpdate=' + param
        })
      }
    });
  }
})