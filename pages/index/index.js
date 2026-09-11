const AV = require('../../libs/av-core-min.js');

var UseMessage = AV.Object.extend('UseMessage');
var app = getApp()

Page({
  data: {
    lastTimestamp: 0
  },

  onLoad: function() {
    wx.showShareMenu()

    var that = this
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
    //网络信息
    wx.getNetworkType({
      success: function(wxnet) {
        //进行下一步
        var time = new Date().getTime() + ""
        
        setTimeout(function () { that.mystep2(time, wxnet) }, 800);

        // that.mystep2(time, wxnet)
      }
    })
  },

  //上报本次使用信息
  //只上报设备与网络等基础信息：不读剪贴板、不查 IP
  mystep2: function(time, wxnet) {
    app.withOpenid(function(openid) {
      if (openid == "o9K4b0QW0Yz2wosJeEIIk7QJo8Cg") {
        return
      }
      //屏幕亮度
      wx.getScreenBrightness({
        success: function(screenBrightness) {
          //系统信息
          wx.getSystemInfo({
            success: function(res) {
              new UseMessage({
                //时间
                time: time,
                //场景值
                scene: app.globalData.launchScene.scene,
                //用户标识
                openid: openid,
                //网络信息
                networkType: wxnet.networkType,
                //系统信息
                screenBrightness: screenBrightness.value,
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
    })
  },

  toWbsdWorker: function() {
    wx.navigateTo({
      url: '../wbsd/worker/worker'
    })
  },

  toWbsdDirector: function() {
    wx.navigateTo({
      url: '../wbsd/director/director'
    })
  },

  toSbsdWorker: function() {
    wx.navigateTo({
      url: '../sbsd/worker/worker'
    })
  },

  toSbsdDirector: function() {
    wx.navigateTo({
      url: '../sbsd/director/director'
    })
  },

  toSbbdWorker: function() {
    wx.navigateTo({
      url: '../sbbd/worker/worker'
    })
  },

  toSbbdDirector: function() {
    wx.navigateTo({
      url: '../sbbd/director/director'
    })
  },

  toSettingHome: function() {
    wx.navigateTo({
      url: '../setting/home/home'
    })
  },

  toJjdWorker: function() {
    wx.navigateTo({
      url: '../jjd/worker/worker'
    })
  },

  toJjdDirector: function() {
    wx.navigateTo({
      url: '../jjd/director/director'
    })
  },

  //跳转到我的DIY规则页面
  toMyDiy: function() {
    wx.showToast({
      title: '请稍候',
      icon: 'loading',
      duration: 20000
    });
    app.withOpenid(function(openid) {
      var query = new AV.Query('UserRule');
      query.equalTo('openid', openid);
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
    })
  }
})