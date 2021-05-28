const AV = require('../../../libs/av-weapp-min.js');

Page({
  data: {
  },

  /**
   * 检查是否授权用户信息
   * url:如果已经授权，直接跳转的路径
   * 如果没授权，前往授权页面授权
   * success:授权成功从授权页面跳转的路径
   * fail:授权失败从授权页面跳转的路径
   */
  checkAuthUserInfo: function (url, success, fail) {
    wx.getSetting({
      success: (res) => {
        var isAuth = res.authSetting['scope.userInfo']
        if (isAuth) {
          wx.navigateTo({
            url: url
          })
        } else {
          wx.navigateTo({
            url: '../authUserInfo/authUserInfo?success=' + success + '&fail=' + fail
          })
        }
      }
    })
  },

  //设置默认班组
  toWorkerDefaultBanzu: function () {
    wx.navigateTo({
      url: '../workerDefaultBanzu/workerDefaultBanzu',
    })
  },

  //我的DIY规则
  toMyRule: function () {
    var url = '../myRuleHome/myRuleHome'
    var success = '../myRuleHome/myRuleHome'
    var fail = '../home/home'
    this.checkAuthUserInfo(url, success, fail);
  },

  //订阅上班推送
  toPushHome: function () {
    var that = this
    var query = new AV.Query('WechatUser');
    query.equalTo('openid', AV.User.current().toJSON().authData.lc_weapp.openid);
    query.find().then(function (users) {
      if (users.length == 0 || users[0].get('mail') == undefined || users[0].get('mail') == "") {
        wx.navigateTo({
          url: '../accountHome/accountHome',
        })
        wx.showModal({
          title: '提示',
          content: '请先设置邮箱和手机！',
          showCancel: false
        })
      } else {
        var url = '../pushHome/pushHome'
        var success = '../pushHome/pushHome'
        var fail = '../home/home'
        that.checkAuthUserInfo(url, success, fail);
      }
    });
  },

  //用户反馈
  toFeedback: function () {
    wx.navigateTo({
      url: '../feedback/feedback',
    })
  },

  //我的账户
  toAccountHome: function () {
    wx.navigateTo({
      url: '../accountHome/accountHome',
    })
  }
})