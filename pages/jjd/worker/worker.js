var shift = require('../../../utils/shift.js')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    //模式名
    modeName: "个人",
    //当前班组代号
    banzuId: 0,
    //当前班组名字
    banzuName: "",
    //记录最上面一行的年月日
    year: 0,
    month: 0,
    day: 0,
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
    wx.showShareMenu()
    //初始化班组
    this.setBanzu1()
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
   * 设置7行文字
   */
  setText: function() {
    this.setData({ r1: this.getDateString() + this.getWork() })
    this.changeDate(1)
    this.setData({ r2: this.getDateString() + this.getWork() })
    this.changeDate(1)
    this.setData({ r3: this.getDateString() + this.getWork() })
    this.changeDate(1)
    this.setData({ r4: this.getDateString() + this.getWork() })
    this.changeDate(1)
    this.setData({ r5: this.getDateString() + this.getWork() })
    this.changeDate(1)
    this.setData({ r6: this.getDateString() + this.getWork() })
    this.changeDate(1)
    this.setData({ r7: this.getDateString() + this.getWork() })
    this.changeDate(-6)
  },

  /**
   * 上什么班
   * 规则：上一天休三天 —— 4 个班循环，每天恰好一个班上班
   */
  getWork() {
    var banzu = this.data.banzuId
    var total = this.getTotalDays()
    // 0：一班上班，1：二班上班，2：三班上班，3：四班上班
    var onDuty = shift.mod(total, 4)
    if (banzu == onDuty + 1) {
      return "上班"
    }
    return "休息"
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
   * 两个日期间相差天数
   */
  getTotalDays: function() {
    // 排班基准日：2026-09-10 为「一班上班」日（2026-09-11 已与真实班次核对）
    var date1 = new Date(2026, 8, 10);
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
   * 设置班组按钮
   */
  setBanzu1: function() {
    this.setData({
      banzuId: 1,
      banzuName: "一班"
    })
    this.setText()
  },
  setBanzu2: function() {
    this.setData({
      banzuId: 2,
      banzuName: "二班"
    })
    this.setText()
  },
  setBanzu3: function() {
    this.setData({
      banzuId: 3,
      banzuName: "三班"
    })
    this.setText()
  },
  setBanzu4: function() {
    this.setData({
      banzuId: 4,
      banzuName: "四班"
    })
    this.setText()
  },

  /**
   * 返回主页
   */
  close: function() {
    wx.navigateBack({

    })
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
  }
})
