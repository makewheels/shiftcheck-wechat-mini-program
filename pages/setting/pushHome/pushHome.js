const AV = require('../../../libs/av-weapp-min.js');

Page({
  data: {
    currentMail: "loading...",
    currentSms: "loading...",
    mailChecked: false,
    smsChecked: false,
    restMailTimes: 0,
    restSmsTimes: 0
  },

  onShow: function () {
    var that = this
    wx.showToast({
      title: '请稍候',
      icon: 'loading',
      duration: 20000
    });
    var openid = AV.User.current().toJSON().authData.lc_weapp.openid
    var query = new AV.Query('WechatUser');
    query.equalTo('openid', openid);
    query.find().then(function (users) {
      if (users.length == 1) {
        var user = users[0]
        var isMailPushEnable = user.get('isMailPushEnable')
        var isSmsPushEnable = user.get('isSmsPushEnable')
        that.setData({
          restMailTimes: user.get('mailPushTimes'),
          restSmsTimes: user.get('smsPushTimes'),
          mailChecked: isMailPushEnable,
          smsChecked: isSmsPushEnable
        })
        if (isMailPushEnable) {
          that.setData({
            currentMail: "已开启"
          })
        } else {
          that.setData({
            currentMail: "已关闭"
          })
        }
        if (isSmsPushEnable) {
          that.setData({
            currentSms: "已开启"
          })
        } else {
          that.setData({
            currentSms: "已关闭"
          })
        }
        wx.hideToast()
      }
    });
  },

  //邮件开关监听方法
  mailSwitch: function (e) {
    var that = this
    wx.showToast({
      title: '请稍候',
      icon: 'loading',
      duration: 20000
    });
    var openid = AV.User.current().toJSON().authData.lc_weapp.openid
    var query = new AV.Query('WechatUser');
    query.equalTo('openid', openid);
    query.find().then(function (users) {
      if (users.length == 1) {
        var user = users[0]
        var todo = AV.Object.createWithoutData('WechatUser', user.id);
        todo.set('isMailPushEnable', e.detail.value);
        todo.save();
        if (e.detail.value) {
          that.setData({
            currentMail: "已开启"
          })
        } else {
          that.setData({
            currentMail: "已关闭"
          })
        }
        wx.hideToast()
      }
    })
  },

  //短信开关监听方法
  smsSwitch: function (e) {
    var that = this
    wx.showToast({
      title: '请稍候',
      icon: 'loading',
      duration: 20000
    });
    var openid = AV.User.current().toJSON().authData.lc_weapp.openid
    var query = new AV.Query('WechatUser');
    query.equalTo('openid', openid);
    query.find().then(function (users) {
      if (users.length == 1) {
        var user = users[0]
        
        var todo = AV.Object.createWithoutData('WechatUser', user.id);
        todo.set('isSmsPushEnable', e.detail.value);
        todo.save();
        if (e.detail.value) {
          that.setData({
            currentSms: "已开启"
          })
        } else {
          that.setData({
            currentSms: "已关闭"
          })
        }
        wx.hideToast()
      }
    })
  },

  toNewPush: function () {
    wx.showToast({
      title: '开发中',
    })
  }
})