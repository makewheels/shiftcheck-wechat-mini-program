const AV = require('../../libs/av-weapp-min.js');
var mta = require('../../libs/mta_analysis.js')

let rewardedVideoAd = null

Page({

  /**
   * 页面的初始数据
   */
  data: {
    mailPushTimes: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    mta.Page.init()
    wx.showShareMenu()

    var that = this
    // 创建激励视频广告实例
    if (wx.createRewardedVideoAd) {
      rewardedVideoAd = wx.createRewardedVideoAd({
        adUnitId: 'adunit-79ec0f8be5efc0f1'
      })
      rewardedVideoAd.onLoad(() => {
        console.log('rewardedVideoAd onLoad')
      })
      rewardedVideoAd.onError((err) => {
        console.log('rewardedVideoAd onError', err)
        wx.showToast({
          title: '暂时没有合适的视频哦',
          icon: 'none'
        })
      })
      rewardedVideoAd.onClose((res) => {
        console.log('onClose event emit, isEnded = ', res.isEnded)
        if (res.isEnded == false) {
          //视频没播完，不发奖励
          console.log("视频没播完，不发奖励")
        } else {
          //视频播放完成
          that.addPushTime()
        }
      })
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {
    //拉取并更新剩余推送次数
    this.updateRestPushTimes()
  },

  /**
   * 更新剩余推送次数
   */
  updateRestPushTimes: function() {
    var that = this
    var openid = AV.User.current().toJSON().authData.lc_weapp.openid
    var query = new AV.Query('WechatUser');
    query.equalTo('openid', openid);
    query.find().then(function(users) {
      if (users.length == 1) {
        var user = users[0]
        that.setData({
          mailPushTimes: user.get('mailPushTimes')
        })
      }
    });
  },

  //后台增加推送次数，前台更新显示数据
  addPushTime: function() {
    var that = this
    //更新后台数据
    var openid = AV.User.current().toJSON().authData.lc_weapp.openid
    var query = new AV.Query('WechatUser');
    query.equalTo('openid', openid);
    query.find().then(function(users) {
      var id = users[0].id
      var user = AV.Object.createWithoutData('WechatUser', id);
      user.set('mailPushTimes', that.data.mailPushTimes + 1)
      user.save()
    })
    //更新前台显示
    that.setData({
      mailPushTimes: that.data.mailPushTimes + 1
    })
  },

  /**
   * 看视频，加次数 按钮
   */
  watchVideo: function() {
    //如果激励视频组件已经准备好了
    if (rewardedVideoAd) {
      console.log("看视频，加次数 按钮 点击事件")
      //播放激励视频广告
      rewardedVideoAd.show()
        .catch(() => {
          rewardedVideoAd.load()
            .then(() => rewardedVideoAd.show())
            .catch(err => {
              console.log('激励视频 广告显示失败')
            })
        })
    } else {
      //如果激励视频组件还没准备好
      wx.showToast({
        title: '别急',
        icon: 'none'
      })
    }
  }
})