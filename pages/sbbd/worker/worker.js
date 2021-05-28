var mta = require('../../../libs/mta_analysis.js')

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
    r7: "loading...",
  },

  onLoad: function () {
    mta.Page.init()
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
  changeDate: function (changeDays) {
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
  setText: function () {
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
   */
  getWork() {
    var banzu = this.data.banzuId
    var loopBody = [2, 0, 0, 2, 0, 1, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 1];
    // 第一班组
    if (banzu == 1) {
      loopBody[0] = 2;
      loopBody[1] = 0;
      loopBody[2] = 0;
      loopBody[3] = 2;
      loopBody[4] = 0;
      loopBody[5] = 1;
      loopBody[6] = 2;
      loopBody[7] = 0;
      loopBody[8] = 0;
      loopBody[9] = 2;
      loopBody[10] = 0;
      loopBody[11] = 0;
      loopBody[12] = 2;
      loopBody[13] = 0;
      loopBody[14] = 0;
      loopBody[15] = 2;
      loopBody[16] = 0;
      loopBody[17] = 0;
      loopBody[18] = 2;
      loopBody[19] = 0;
      loopBody[20] = 1;
      // 第二班组
    } else if (banzu == 2) {
      loopBody[0] = 0;
      loopBody[1] = 2;
      loopBody[2] = 0;
      loopBody[3] = 0;
      loopBody[4] = 2;
      loopBody[5] = 0;
      loopBody[6] = 1;
      loopBody[7] = 2;
      loopBody[8] = 0;
      loopBody[9] = 0;
      loopBody[10] = 2;
      loopBody[11] = 0;
      loopBody[12] = 1;
      loopBody[13] = 2;
      loopBody[14] = 0;
      loopBody[15] = 0;
      loopBody[16] = 2;
      loopBody[17] = 0;
      loopBody[18] = 0;
      loopBody[19] = 2;
      loopBody[20] = 0;
      // 第三班组
    } else {
      loopBody[0] = 0;
      loopBody[1] = 0;
      loopBody[2] = 2;
      loopBody[3] = 0;
      loopBody[4] = 0;
      loopBody[5] = 2;
      loopBody[6] = 0;
      loopBody[7] = 0;
      loopBody[8] = 2;
      loopBody[9] = 0;
      loopBody[10] = 0;
      loopBody[11] = 2;
      loopBody[12] = 0;
      loopBody[13] = 1;
      loopBody[14] = 2;
      loopBody[15] = 0;
      loopBody[16] = 0;
      loopBody[17] = 2;
      loopBody[18] = 0;
      loopBody[19] = 1;
      loopBody[20] = 2;
    }
    // 拿到总天数
    var total = this.getTotalDays();
    // 根据求余结果翻译出什么值，并返回String
    // 翻译规则：0：休息，1：白班，2：夜班
    var remainder = loopBody[total % 21];
    if (remainder == 0) {
      return "休息";
    } else if (remainder == 1) {
      return "白班";
    } else {
      return "夜班";
    }
  },

  /**
   * 上一天按钮
   */
  backDay: function () {
    this.changeDate(-1)
    this.setText()
  },

  /**
   * 后一天按钮
   */
  nextDay: function () {
    this.changeDate(1)
    this.setText()
  },

  /**
   * 上一周按钮
   */
  backWeek: function () {
    this.changeDate(-7)
    this.setText()
  },

  /**
   * 下一周按钮
   */
  nextWeek: function () {
    this.changeDate(7)
    this.setText()
  },

  /**
   * 返回今天按钮
   */
  toToday: function () {
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
  getTotalDays: function () {
    var date1 = new Date(2017, 0, 2);
    var date2 = new Date(this.data.year, this.data.month, this.data.day)
    var days = parseInt(Math.abs(date2 - date1) / 1000 / 60 / 60 / 24)
    return days
  },

  /**
   * 返回日期的string
   */
  getDateString: function () {
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
  setBanzu1: function () {
    this.setData({
      banzuId: 1,
      banzuName: "一班"
    })
    this.setText()
  },
  setBanzu2: function () {
    this.setData({
      banzuId: 2,
      banzuName: "二班"
    })
    this.setText()
  },
  setBanzu3: function () {
    this.setData({
      banzuId: 3,
      banzuName: "三班"
    })
    this.setText()
  },

  /**
   * 返回主页
   */
  close: function () {
    wx.navigateBack({

    })
  },
})