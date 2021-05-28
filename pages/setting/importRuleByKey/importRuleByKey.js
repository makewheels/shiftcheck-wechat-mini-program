const AV = require('../../../libs/av-weapp-min.js');
var mta = require('../../../libs/mta_analysis.js')

Page({
  data: {
    inputValue: "",
    pasteValue: ""
  },

  onLoad: function() {
    mta.Page.init()
  },
  
  bindKeyInput: function(e) {
    this.setData({
      inputValue: e.detail.value
    })
  },

  //扫描二维码
  scan: function() {
    var that = this
    wx.scanCode({
      success: function(res) {
        that.importRule(res.result)
      }
    })
  },

  //一键粘贴按钮
  paste: function() {
    var that = this
    wx.getClipboardData({
      success: function(clipboard) {
        that.setData({
          pasteValue: clipboard.data,
          inputValue: clipboard.data
        })
      }
    });
  },

  //激活按钮
  active: function() {
    this.importRule(this.data.inputValue)
  },

  //激活代码
  importRule: function(key) {
    wx.showToast({
      title: '请稍候',
      icon: 'loading',
      duration: 20000
    });
    //先查询此key
    var query = new AV.Query('RuleKey');
    query.equalTo('ruleKey', key);
    query.find().then(function(ruleKeys) {
      //如果没查到，说明激活码错误
      if (ruleKeys.length == 0) {
        wx.showModal({
          title: '提示',
          content: '激活码错误！',
          showCancel: false
        })
        wx.hideToast()
      } else {
        //激活码有效
        var ruleKey = ruleKeys[0]
        //如果已经用过了
        if (ruleKey.get('state') == 1) {
          wx.showModal({
            title: '提示',
            content: '该激活码已使用！',
            showCancel: false
          })
          wx.hideToast()
          return
        }
        //一次性使用，设置为，用过了
        //保存openid，记录是谁激活的
        //记录时间
        var openid = AV.User.current().toJSON().authData.lc_weapp.openid
        var obj = AV.Object.createWithoutData('RuleKey', ruleKey.id);
        obj.set('state', 1);
        obj.set('openid', openid)
        obj.set('time', new Date().getTime() + "")
        obj.save();
        //查询UserRule
        var queryUserRule = new AV.Query('UserRule');
        queryUserRule.equalTo('openid', openid);
        queryUserRule.find().then(function(userRules) {
          //如果这用户没用过diy规则
          if (userRules.length == 0) {
            var UserRule = AV.Object.extend('UserRule');
            var userRule = new UserRule();
            userRule.set('openid', openid);
            userRule.set('ruleId', ruleKey.get('ruleId'));
            userRule.save();
          } else {
            //如果之前已经保存过了
            var userRule = userRules[0]
            userRule.set('ruleId', ruleKey.get('ruleId'));
            userRule.save();
          }
          wx.showModal({
            title: '提示',
            content: '激活成功！',
            showCancel: false
          })
          wx.hideToast()
          //存储设置，默认打开自定义页
          wx.setStorage({
            key: 'homepage',
            data: 'diy'
          })
          wx.navigateBack({});
        });
      }
    }, function(error) {
      wx.showModal({
        title: '提示',
        content: '激活过程发生错误！',
        showCancel: false
      })
      wx.hideToast()
    });
  }
})