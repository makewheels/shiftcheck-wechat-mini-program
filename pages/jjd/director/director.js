Page({
  data: {
    //模式名
    modeName: "总览",
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

  //页面初始化
  onLoad: function() {
    wx.showShareMenu()
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
    this.setData({ r1: this.getRow() })
    this.changeDate(1)
    this.setData({ r2: this.getRow() })
    this.changeDate(1)
    this.setData({ r3: this.getRow() })
    this.changeDate(1)
    this.setData({ r4: this.getRow() })
    this.changeDate(1)
    this.setData({ r5: this.getRow() })
    this.changeDate(1)
    this.setData({ r6: this.getRow() })
    this.changeDate(1)
    this.setData({ r7: this.getRow() })
    this.changeDate(-6)
  },

  /**
   * 获得一行内容
   */
  getRow: function() {
    return this.getDateString() + this.getOnDuty() + "上班"
  },

  /**
   * 指定日期哪个班上班
   * 规则：上一天休三天 —— 每天恰好一个班上班
   */
  getOnDuty: function() {
    var names = ["一班", "二班", "三班", "四班"]
    var total = this.getTotalDays()
    return names[total % 4]
  },

  /**
   * 两个日期间相差天数
   */
  getTotalDays: function() {
    // 排班基准日：2026-09-10 为「一班上班」日（2026-09-11 已与真实班次核对）
    var date1 = new Date(2026, 8, 10);
    var date2 = new Date(this.data.year, this.data.month, this.data.day)
    var days = parseInt(Math.abs(date2 - date1) / 1000 / 60 / 60 / 24)
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
