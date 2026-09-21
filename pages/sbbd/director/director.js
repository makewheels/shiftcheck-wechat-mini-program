var shift = require('../../../utils/shift.js')
var calendar = require('../../../utils/calendar.js')
var share = require('../../../utils/share.js')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    //模式名
    modeName: "总览",
    //记录最上面一行的年月日
    year: 0,
    month: 0,
    day: 0,
    //视图：list 一周列表 / calendar 月日历
    viewMode: "list",
    //月日历的渲染数据
    cal: null,
    //七行数据
    r1: "loading...",
    r2: "loading...",
    r3: "loading...",
    r4: "loading...",
    r5: "loading...",
    r6: "loading...",
    r7: "loading...",
  },

  onLoad: function() {
    share.setup(wx)
    var date = new Date()
    this.setData({
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate()
    })
    this.setText()
  },

  /**
   * 返回主页
   */
  close: function() {
    //深链进入（分享卡片 / 扫码 / 搜一搜）时页面栈只有 1 层，
    //这时 navigateBack 会静默失败、「返回主页」点了没反应，所以改用 reLaunch 回首页
    if (getCurrentPages().length <= 1) {
      wx.reLaunch({
        url: '/pages/index/index'
      })
      return
    }
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
    calendar.refresh(this)
  },

  /**
   * 获得一行内容
   */
  getRow: function() {
    return this.getDateString() + this.getDayText()
  },

  /**
   * 一行里除日期之外的内容（月日历格子复用同一套班次算法）
   */
  getDayText: function() {
    return this.getBaiban() + "、" + this.getYeban()
  },

  /**
   * 两个日期间相差天数
   */
  getTotalDays: function() {
    var date1 = new Date(2017, 0, 1);
    var date2 = new Date(this.data.year, this.data.month, this.data.day)
    var days = shift.daysBetween(date1, date2)
    return days
  },

  /**
   * 返回日期的string
   */
  getDateString: function() {
    var date = new Date(this.data.year, this.data.month, this.data.day)
    var week
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
  },

  /**
   * 指定日期白班是哪个班组
   */
  getBaiban: function() {
    var total = this.getTotalDays()
    var remainder = shift.mod(total, 21)
    if (remainder == 6) {
      return "一班"
    } else if (remainder == 7) {
      return "二班"
    } else if (remainder == 13) {
      return "二班"
    } else if (remainder == 14) {
      return "三班"
    } else if (remainder == 20) {
      return "三班"
    } else if (remainder == 0) {
      return "一班"
    } else {
      return "休息"
    }
  },

  /**
   * 指定日期夜班是哪个班组
   */
  getYeban: function() {
    var total = this.getTotalDays()
    var remainder = shift.mod(total, 3)
    if (remainder == 0) {
      return "三班"
    } else if (remainder == 1) {
      return "一班"
    } else {
      return "二班"
    }
  },

  /**
   * 日期选择
   */
  bindDateChange: function(e) {
    var dateArr = e.detail.value.split("-")
    var year = parseInt(dateArr[0])
    var month = parseInt(dateArr[1])
    var day = parseInt(dateArr[2])
    this.setData({
      year: year,
      month: month - 1,
      day: day
    })
    this.setText()
    wx.showToast({
      title: year + "-" + month + "-" + day
    })
  },

  /**
   * 月日历里一格的内容（总览页每天都有班，不区分上班/休息）
   */
  getDayCell: function(year, month, day) {
    var self = this
    return calendar.onDate(this, year, month, day, function() {
      return { text: self.getDayText(), work: null }
    })
  },

  /**
   * 一周列表 / 月日历 切换
   */
  toggleView: function() {
    calendar.toggleView(this)
  },

  /**
   * 上一月按钮（月日历）
   */
  backMonth: function() {
    calendar.changeMonth(this, -1)
  },

  /**
   * 下一月按钮（月日历）
   */
  nextMonth: function() {
    calendar.changeMonth(this, 1)
  },

  /**
   * 点月日历里的某一天：回到列表，并从这天开始显示 7 天
   */
  onCalendarDayTap: function(e) {
    calendar.dayTap(this, e.detail)
  },

  //转发给朋友 / 分享到朋友圈
  onShareAppMessage: share.appMessage,
  onShareTimeline: share.timeline,
})
