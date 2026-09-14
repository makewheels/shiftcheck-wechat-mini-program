const AV = require('../../libs/av-core-min.js');

var UseMessage = AV.Object.extend('UseMessage');
var app = getApp()

Page({
  data: {},

  onLoad: function() {
    wx.showShareMenu()

    var that = this
    //5 分钟内不重复上报。
    //原来这个时间戳存在页面 data 里，而 data 是每个页面实例各自一份、初值 0，
    //onLoad 又只在实例创建时跑一次，所以那个 return 永远走不到 —— 等于每次冷启动都上报一条。
    //改成存 storage，跨实例才真的能节流。
    var now = new Date().getTime()
    var lastReport = wx.getStorageSync('lastReportTimestamp') || 0
    if (lastReport && now - lastReport < (5 * 60 * 1000)) {
      return
    }
    wx.setStorageSync('lastReportTimestamp', now)
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
  //
  //取不到 openid 就静默 return，不许弹任何提示。首页 8 个倒班入口全是本地计算，
  //用户不登录也能查班，统计上报只是附带的后台行为，失败了对用户毫无影响。
  //2.4.0 曾让这里走"取不到就补登录、补不上就弹框"的路径，弹阻塞式 showModal 挡住用户 ——
  //那是发布级事故：只要网络不通或后端域名失效，每个用户一打开首页就会被拦一下。
  mystep2: function(time, wxnet) {
    var openid = app.getOpenid()
    if (!openid) {
      return
    }
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
})
