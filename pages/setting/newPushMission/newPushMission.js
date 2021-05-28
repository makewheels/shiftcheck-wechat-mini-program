const AV = require('../../../libs/av-weapp-min.js');
var mta = require('../../../libs/mta_analysis.js')

Page({
  data: {
    ruleName: "未选择",
    ruleJson: null,
    ruleId: 0,
    banzuName: "未选择",
    banzuId: 0,
    banAndTime: [],
    banSwitch: [],
    inputName: ""
  },

  onLoad: function () {
    mta.Page.init()
    wx.showShareMenu()
  },

  selectRuleFromPublic: function () {
    wx.showToast({
      title: '请稍候',
      icon: 'loading',
      duration: 20000
    });
    var that = this
    var openid = AV.User.current().toJSON().authData.lc_weapp.openid
    var query = new AV.Query('Rule');
    query.equalTo('isPublic', true);
    query.find().then(function (rules) {
      wx.hideToast()
      if (rules.length == 0) {
        wx.showModal({
          title: '错误',
          content: '未找到公共规则！',
          showCancel: false
        })
        return
      }
      //把从服务器获取到的公共规则列表，解析到ActionSheet中显示
      var ruleNames = new Array(rules.length)
      for (var i = 0; i < rules.length; i++) {
        var ruleJson = JSON.parse(rules[i].get('json'))
        ruleNames[i] = ruleJson.showName
      }
      wx.showActionSheet({
        itemList: ruleNames,
        success: function (res) {
          var index = res.tapIndex
          //所选规则的json对象
          var ruleJson = JSON.parse(rules[index].get('json'))
          that.setData({
            ruleJson: ruleJson,
            ruleId: rules[index].get('ruleId'),
            ruleName: ruleJson.showName
          })
          that.updateBanAndTime()
          wx.showToast({
            title: ruleNames[index]
          })
        }
      })
    });
  },

  //使用DIY规则
  useDiyRule: function () {
    wx.showToast({
      title: '请稍候',
      icon: 'loading',
      duration: 20000
    });
    var that = this
    var openid = AV.User.current().toJSON().authData.lc_weapp.openid
    var query = new AV.Query('UserRule')
    query.equalTo('openid', openid)
    query.find().then(function (userRules) {
      //如果没有DIY规则
      if (userRules.length == 0) {
        wx.hideToast()
        wx.showModal({
          title: '错误',
          content: '您没有导入DIY规则！',
          showCancel: false
        })
        return
      }
      //有DIY规则
      var userRule = userRules[0]
      var ruleId = userRule.get('ruleId')
      var queryRule = new AV.Query('Rule')
      queryRule.equalTo('ruleId', ruleId)
      queryRule.find().then(function (rules) {
        if (rules.length == 1) {
          var rule = rules[0]
          var ruleJson = JSON.parse(rule.get('json'))
          that.setData({
            ruleJson: ruleJson,
            ruleName: ruleJson.showName
          })
          that.updateBanAndTime()
          wx.hideToast()
          wx.showToast({
            title: ruleJson.showName
          })
        }
      })
    })
  },

  //更新页面中的组件，班和推送时间
  updateBanAndTime: function () {
    //换了新的规则，先把下面的班组，和推送时间列表清空
    this.setData({
      banzuName: "未选择",
      banzuId: 0,
      inputName: ""
    })
    //更新下面的班和推送时间的列表
    var ruleJson = this.data.ruleJson
    var banList = ruleJson.banList
    var workerPushTime = ruleJson.workerPushTime
    var banAndTimeList = new Array(banList.length)
    for (var i = 0; i < banList.length; i++) {
      var pushTime = workerPushTime[i]
      banAndTimeList[i] = { "ban": banList[i], "day": pushTime.day, "hour": pushTime.hour }
    }
    var banSwitch = new Array(banList.length)
    for (var i = 0; i < banList.length; i++) {
      banSwitch[i] = true
    }
    this.setData({
      banAndTime: banAndTimeList,
      banSwitch: banSwitch
    })
  },

  selectBanzu: function () {
    var that = this
    if (this.data.ruleJson == null) {
      wx.showModal({
        title: '错误',
        content: '请先选择规则！',
        showCancel: false
      })
      return
    }
    var banzuList = this.data.ruleJson.banzuList
    wx.showActionSheet({
      itemList: banzuList,
      success: function (res) {
        var index = res.tapIndex
        that.setData({
          banzuName: banzuList[index],
          banzuId: index + 1,
        })
        if (that.data.inputName == "") {
          that.setData({
            inputName: that.data.ruleName + "：" + that.data.banzuName
          })
        }
        wx.showToast({
          title: banzuList[index]
        })
      }
    })
  },

  bindNameInput: function (e) {
    this.setData({
      inputName: e.detail.value
    })
  },

  pushTimeIntroduce: function () {
    wx.showModal({
      title: '说明',
      content: '1、按照班的种类划分，通过开关选择您要订阅的班\r\n2、可编辑推送时间，提前几天，并在那一天中的，几点推送，时间采用24小时制。提前0天表示当天',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  //每个班的开关
  bindSwitchChange: function (e) {
    var value = e.detail.value
    var index = e.currentTarget.dataset.index
    var banSwitch = this.data.banSwitch
    banSwitch[index - 1] = value
    this.setData({
      banSwitch: banSwitch
    })
  },

  //提前几天
  bindInputDay: function (e) {
    var value = e.detail.value
    var index = e.currentTarget.dataset.index
    var banAndTime = this.data.banAndTime
    banAndTime[index - 1].day = value
    this.setData({
      banAndTime: banAndTime
    })
  },

  //提前多长时间
  bindInputHour: function (e) {
    var value = e.detail.value
    var index = e.currentTarget.dataset.index
    var banAndTime = this.data.banAndTime
    banAndTime[index - 1].hour = value
    this.setData({
      banAndTime: banAndTime
    })
  },

  //向服务器保存一条推送任务
  addPush: function () {
    wx.showToast({
      title: '请稍候',
      icon: 'loading',
      duration: 20000
    })
    var that = this
    //检查是否选了规则
    if (that.data.ruleJson == null) {
      wx.hideToast()
      wx.showModal({
        title: '错误',
        content: '请选择规则！',
        showCancel: false
      })
      return
    }
    //检查是否选了班组
    if (that.data.banzuId == 0) {
      wx.hideToast()
      wx.showModal({
        title: '错误',
        content: '请选择班组！',
        showCancel: false
      })
      return
    }
    //检查三个开关，最少要有一个开的
    var banSwitch = that.data.banSwitch
    var hasTrue = false
    for (var i = 0; i < banSwitch.length; i++) {
      if (banSwitch[i] == true) {
        hasTrue = true
        break
      }
    }
    if (hasTrue == false) {
      wx.hideToast()
      wx.showModal({
        title: '错误',
        content: banSwitch.length + '个班的开关最少要开一个！',
        showCancel: false
      })
      return
    }
    //检查提前天数和时间的点数，天数是0和正整数，时间是0到23之间的整数
    var banAndTime = that.data.banAndTime
    for (var i = 0; i < banAndTime.length; i++) {
      var day = banAndTime[i].day
      if (day < 0) {
        wx.hideToast()
        wx.showModal({
          title: '错误',
          content: '请检查' + banAndTime[i].ban + '的提前天数！',
          showCancel: false
        })
        return
      }
      var hour = banAndTime[i].hour
      if (hour < 0 || hour > 24) {
        wx.hideToast()
        wx.showModal({
          title: '错误',
          content: '请检查' + banAndTime[i].ban + '的推送时间！',
          showCancel: false
        })
        return
      }
    }
    //检查名字不能为空
    if (that.data.inputName == "") {
      wx.hideToast()
      wx.showModal({
        title: '错误',
        content: '请给推送任务起个名字！',
        showCancel: false
      })
      return
    }
    //到这里，就认为配置没问题，准备要上传的数据
    var ruleId = that.data.ruleId
    var banzuId = that.data.banzuId
    var banConfigList = new Array(banAndTime.length)
    for (var i = 0; i < banAndTime.length; i++) {
      var aheadDays = banAndTime[i].day
      var hour = banAndTime[i].hour
      var banConfig = { "enable": banSwitch[i], "aheadDays": aheadDays, "hour": hour }
      banConfigList[i] = banConfig
    }
    var config = { "ruleId": ruleId, "banzu": banzuId, "ban": banConfigList }
    //向服务器保存数据
    var openid = AV.User.current().toJSON().authData.lc_weapp.openid
    var PushMission = AV.Object.extend('PushMission');
    var pushMission = new PushMission();
    pushMission.set('openid', openid);
    pushMission.set('config', JSON.stringify(config));
    pushMission.save().then(function (obj) {
      wx.hideToast()
      wx.navigateBack({})
      wx.showModal({
        title: '提示',
        content: '推送任务已保存！',
        showCancel: false
      })
    }, function (error) {
      wx.hideToast()
      wx.navigateBack({})
      wx.showModal({
        title: '错误',
        content: '抱歉，保存时发生错误！',
        showCancel: false
      })
    });
  }

})