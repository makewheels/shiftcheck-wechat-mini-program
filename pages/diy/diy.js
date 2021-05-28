const AV = require('../../libs/av-weapp-min.js');
var mta = require('../../libs/mta_analysis.js')

Page({
  data: {
    currentRuleName: "loading...",
    json: null,
    //记录最上面一行的年月日
    year: 0,
    month: 0,
    day: 0,
    r0: "loading...",
    //七行数据
    r1: "loading...",
    r2: "loading...",
    r3: "loading...",
    r4: "loading...",
    r5: "loading...",
    r6: "loading...",
    r7: "loading..."
  },

  onLoad: function() {
    mta.Page.init()
    wx.showShareMenu()
  },

  //加载json进来
  onShow: function(options) {
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
            var jsonObj = JSON.parse(jsonStr)
            that.setData({
              currentRuleName: jsonObj.showName,
              json: jsonObj
            })
            that.loadData()
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
    });
  },

  //解析json
  loadData: function() {
    var that = this
    var date = new Date()
    this.setData({
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      r0: this.data.json.banList
    })
    this.setText()
    wx.hideToast()
  },

  /**
   * 返回主页
   */
  close: function() {
    wx.navigateBack({})
  },

  /**
   * 改data中的日期
   */
  changeDate: function(changeDays) {
    var date = new Date(this.data.year, this.data.month, this.data.day)
    date.setDate(date.getDate() + changeDays)
    this.setData({
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate()
    })
  },

  /**
   * 上一天按钮
   */
  backDay: function() {
    this.changeDate(-1)
    this.setText()
  },

  /**
   * 后一天按钮
   */
  nextDay: function() {
    this.changeDate(1)
    this.setText()
  },

  /**
   * 上一周按钮
   */
  backWeek: function() {
    this.changeDate(-7)
    this.setText()
  },

  /**
   * 下一周按钮
   */
  nextWeek: function() {
    this.changeDate(7)
    this.setText()
  },

  /**
   * 返回今天按钮
   */
  toToday: function() {
    //初始化时间
    var date = new Date()
    this.setData({
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate()
    })
    this.setText()
  },

  /**
   * 设置7行文字
   */
  setText: function() {
    this.setData({
      r1: this.getRow()
    })
    this.changeDate(1)
    this.setData({
      r2: this.getRow()
    })
    this.changeDate(1)
    this.setData({
      r3: this.getRow()
    })
    this.changeDate(1)
    this.setData({
      r4: this.getRow()
    })
    this.changeDate(1)
    this.setData({
      r5: this.getRow()
    })
    this.changeDate(1)
    this.setData({
      r6: this.getRow()
    })
    this.changeDate(1)
    this.setData({
      r7: this.getRow()
    })
    this.changeDate(-6)
  },

  /**
   * 获得一行内容
   */
  getRow: function() {
    var dateStr = this.getDateString()
    var banzuList = this.data.json.banzuList
    var periodList = this.data.json.periodList
    var restName = this.data.json.restName
    var remainder = this.getTotalDays() % periodList.length
    //一天的班组索引，例如：4,0,0
    var banzuIndex = periodList[remainder]
    var banzuIndexArr = banzuIndex.split(",")
    var rowStr = ""
    for (var i = 0; i < banzuIndexArr.length; i++) {
      if (banzuIndexArr[i] == 0) {
        rowStr = rowStr + restName
      } else {
        rowStr = rowStr + banzuList[banzuIndexArr[i]]
      }
      if (i != banzuIndexArr.length - 1) {
        rowStr = rowStr + "、"
      }
    }
    return dateStr + rowStr
  },

  /**
   * 两个日期间相差天数
   */
  getTotalDays: function() {
    var that = this
    var json = that.data.json
    var startDateArr = json.startDate.split("-")
    var year = parseInt(startDateArr[0])
    var month = parseInt(startDateArr[1]) - 1
    var day = parseInt(startDateArr[2])
    var date1 = new Date(year, month, day);
    var date2 = new Date(this.data.year, this.data.month, this.data.day)
    var daysBetween = parseInt(Math.abs(date2 - date1) / 1000 / 60 / 60 / 24)
    // console.log(this.data.day + "day")
    // console.log("daysBetween" + daysBetween)
    return daysBetween
  },

  /**
   * 返回日期的string
   */
  getDateString: function() {
    var date = new Date(this.data.year, this.data.month, this.data.day)
    var week = ""
    var weekNum = date.getDay()
    if (weekNum == 1) {
      week = "周一"
    } else if (weekNum == 2) {
      week = "周二"
    } else if (weekNum == 3) {
      week = "周三"
    } else if (weekNum == 4) {
      week = "周四"
    } else if (weekNum == 5) {
      week = "周五"
    } else if (weekNum == 6) {
      week = "周六"
    } else if (weekNum == 0) {
      week = "周天"
    }
    return week + (date.getMonth() + 1) + "月" + date.getDate() + "日："
  }
})