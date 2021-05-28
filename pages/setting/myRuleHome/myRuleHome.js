const AV = require('../../../libs/av-weapp-min.js');
var mta = require('../../../libs/mta_analysis.js')

Page({
  data: {
    currentRuleName: "loading..."
  },

  onLoad: function() {
    mta.Page.init()
    wx.showShareMenu()
  },

  //加载当前规则名
  onShow: function() {
    this.setData({
      currentRuleName: "loading..."
    })
    wx.showToast({
      title: '请稍候',
      icon: 'loading',
      duration: 20000
    });
    var that = this
    var openid = AV.User.current().toJSON().authData.lc_weapp.openid
    var queryUserRule = new AV.Query('UserRule');
    queryUserRule.equalTo('openid', openid);
    queryUserRule.find().then(function(userRules) {
      //如果能查到该用户的对应规则
      if (userRules.length == 1) {
        //多表联查，继续差规则表，看名字是什么
        var ruleId = userRules[0].get('ruleId')
        var queryRule = new AV.Query('Rule');
        queryRule.equalTo('ruleId', ruleId);
        queryRule.find().then(function(rules) {
          //如果查到了该规则
          if (rules.length == 1) {
            var jsonStr = rules[0].get('json')
            var jsonObj = JSON.parse(jsonStr);
            that.setData({
              currentRuleName: jsonObj.showName
            })
          } else {
            //如果没查到改规则
            that.setData({
              currentRuleName: "尚未导入规则"
            })
          }
        });
      } else {
        //如果查不到该用户的对应规则
        that.setData({
          currentRuleName: "尚未导入规则"
        })
      }
      wx.hideToast()
    });
  },

  toImportRuleByKey: function() {
    wx.navigateTo({
      url: '../importRuleByKey/importRuleByKey',
    })
  },

  //删除规则
  deleteRule: function() {
    wx.showToast({
      title: '请稍候',
      icon: 'loading',
      duration: 20000
    });
    var that = this
    var query = new AV.Query('UserRule');
    query.equalTo('openid', AV.User.current().toJSON().authData.lc_weapp.openid);
    query.find().then(function(userRules) {
      //如果没存过规则
      if (userRules.length == 0) {
        wx.showModal({
          title: '提示',
          content: '尚未导入规则！',
          showCancel: false
        })
        wx.hideToast()
      } else {
        wx.hideToast()
        //如果已存规则
        //先确认
        wx.showModal({
          title: '警告',
          content: '删除后不可恢复！',
          confirmText: '确认删除',
          success: function(res) {
            if (res.confirm) {
              wx.showToast({
                title: '请稍候',
                icon: 'loading',
                duration: 20000
              });
              var userRule = userRules[0]
              var obj = AV.Object.createWithoutData('UserRule', userRule.id);
              obj.destroy().then(function(success) {
                // 删除成功
                wx.hideToast()
                wx.showModal({
                  title: '提示',
                  content: '删除成功！',
                  showCancel: false
                })
                //刷新显示
                that.onShow()
              })
            }
          }
        })
      }
    });
  },

  //设置主页默认打开页面
  setHomepage: function() {
    wx.showActionSheet({
      itemList: ['DIY规则', '默认'],
      success: function(res) {
        var index = res.tapIndex
        if (index == 0) {
          wx.setStorageSync('homepage', 'diy')
          wx.showToast({
            title: '已设为DIY！'
          })
        } else {
          wx.setStorageSync('homepage', 'default')
          wx.showToast({
            title: '已设为默认！'
          })
        }
      }
    })
  }
})