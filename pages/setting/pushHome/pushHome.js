const AV = require('../../../libs/av-core-min.js');

Page({
  data: {
    currentMail: "loading...",
    currentSms: "loading...",
    mailChecked: false,
    smsChecked: false,
    restMailTimes: 0,
    restSmsTimes: 0,
    city: "loading..."
  },

  onLoad: function() {
    wx.showShareMenu()
  },

  onShow: function() {
    var that = this
    wx.showToast({
      title: '请稍候',
      icon: 'loading',
      duration: 20000
    });
    var openid = AV.User.current().toJSON().authData.lc_weapp.openid
    var query = new AV.Query('WechatUser');
    query.equalTo('openid', openid);
    query.find().then(function(users) {
      if (users.length == 1) {
        var user = users[0]
        //显示余额和开关
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
        //天气预报城市显示
        var city = user.get('pushCity')
        if (city != null & city != undefined && city != "") {
          that.setData({
            city: city
          })
        } else {
          that.setData({
            city: "未设置"
          })
        }
        wx.hideToast()
      }
    });
  },

  //邮件开关监听方法
  mailSwitch: function(e) {
    var that = this
    wx.showToast({
      title: '请稍候',
      icon: 'loading',
      duration: 20000
    });
    var openid = AV.User.current().toJSON().authData.lc_weapp.openid
    var query = new AV.Query('WechatUser');
    query.equalTo('openid', openid);
    query.find().then(function(users) {
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
  smsSwitch: function(e) {
    var that = this
    wx.showToast({
      title: '请稍候',
      icon: 'loading',
      duration: 20000
    });
    var openid = AV.User.current().toJSON().authData.lc_weapp.openid
    var query = new AV.Query('WechatUser');
    query.equalTo('openid', openid);
    query.find().then(function(users) {
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

  toNewPush: function() {
    wx.showToast({
      title: '开发中'
    })
    return
    wx.navigateTo({
      url: '../newPushMission/newPushMission'
    })
  },

  pushIntroduce: function() {
    wx.showModal({
      title: '说明',
      content: '在上班之前，通过在我的账户设置的，邮箱或手机短信的方式提醒您，还可以附带上班当天的天气预报',
      confirmText: '我知道了',
      showCancel: false
    })
  },

  //修改天气预报城市
  bindRegionChange: function(e) {
    wx.showToast({
      title: '请稍候',
      icon: 'loading',
      duration: 20000
    });
    var that = this
    var openid = AV.User.current().toJSON().authData.lc_weapp.openid
    var query = new AV.Query('WechatUser')
    query.equalTo('openid', openid);
    query.find().then(function(users) {
      if (users.length == 1) {
        var user = users[0]
        var user = AV.Object.createWithoutData('WechatUser', user.id)
        var province = e.detail.value[0]
        var city = e.detail.value[1]
        var region = e.detail.value[2]
        user.set('pushProvince', province)
        user.set('pushCity', city)
        user.set('pushRegion', region)
        user.save()
        that.setData({
          city: city
        })
        wx.hideToast()
        wx.showToast({
          title: city
        });
      }
    })
  }
})