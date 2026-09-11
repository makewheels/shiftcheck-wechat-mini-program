/**
 * 月日历视图的公共逻辑
 *
 * 每个倒班页只需要：
 *   1. data 里加 viewMode: 'list'、cal: null
 *   2. 实现 getDayCell(year, month, day)，返回 { text: 格子文字, work: true/false/null }
 *   3. setText() 末尾调用 calendar.refresh(this)
 *   4. 把 toggleView / backMonth / nextMonth / onCalendarDayTap 转给本模块
 */

var shift = require('./shift.js')
var holiday = require('./holiday.js')

//周一作为一周的起点
var WEEKDAY_HEADERS = ['一', '二', '三', '四', '五', '六', '日']
var FIRST_WEEKDAY = 1

/**
 * 构建一个月的渲染数据
 * @param {Number} year
 * @param {Number} month 0-11
 * @param {Function} getDayCell (year, month, day) => { text, work }
 */
function buildMonth(year, month, getDayCell) {
  var today = new Date()
  var daysTotal = shift.daysInMonth(year, month)
  //本月 1 号前面要空几格
  var lead = shift.mod(new Date(year, month, 1).getDay() - FIRST_WEEKDAY, 7)

  var cells = []
  var i
  for (i = 0; i < lead; i++) {
    cells.push({ key: 'b' + i, blank: true })
  }
  for (i = 1; i <= daysTotal; i++) {
    var dayInfo = getDayCell(year, month, i) || {}
    var mark = holiday.info(year, month, i)
    cells.push({
      key: 'd' + i,
      blank: false,
      day: i,
      text: dayInfo.text || '',
      //null 表示不区分上班/休息（总览页每天都有班）
      work: dayInfo.work === undefined ? null : dayInfo.work,
      holidayType: mark.type,
      holidayName: mark.name,
      isToday: year === today.getFullYear() && month === today.getMonth() && i === today.getDate()
    })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: 'b' + cells.length, blank: true })
  }

  var weeks = []
  for (i = 0; i < cells.length; i += 7) {
    weeks.push({ key: 'w' + i, cells: cells.slice(i, i + 7) })
  }

  return {
    title: year + '年' + (month + 1) + '月',
    year: year,
    month: month,
    weekdays: WEEKDAY_HEADERS,
    weeks: weeks,
    hasHolidayData: holiday.hasData(year)
  }
}

/**
 * 日历模式下刷新日历数据；列表模式下什么都不做
 */
function refresh(page) {
  if (page.data.viewMode !== 'calendar') {
    return
  }
  page.setData({
    cal: buildMonth(page.data.year, page.data.month, function(year, month, day) {
      return page.getDayCell(year, month, day)
    })
  })
}

/**
 * 临时把页面的日期换成指定的一天，执行 fn 之后原样还原
 *
 * 页面里已有的班次算法都是直接读 this.data 的年月日，用它可以原样复用那些算法，
 * 不必把日期参数一路传进每个 getter。整个过程是同步的，中间不调 setData，不会触发渲染。
 */
function onDate(page, year, month, day, fn) {
  var savedYear = page.data.year
  var savedMonth = page.data.month
  var savedDay = page.data.day
  page.data.year = year
  page.data.month = month
  page.data.day = day
  try {
    return fn(page)
  } finally {
    page.data.year = savedYear
    page.data.month = savedMonth
    page.data.day = savedDay
  }
}

/**
 * 列表 / 日历 切换
 */
function toggleView(page) {
  page.setData({
    viewMode: page.data.viewMode === 'calendar' ? 'list' : 'calendar'
  })
  refresh(page)
}

/**
 * 换月，日期超出目标月天数时收敛到月末
 */
function changeMonth(page, delta) {
  var target = new Date(page.data.year, page.data.month + delta, 1)
  var maxDay = shift.daysInMonth(target.getFullYear(), target.getMonth())
  page.setData({
    year: target.getFullYear(),
    month: target.getMonth(),
    day: page.data.day > maxDay ? maxDay : page.data.day
  })
  page.setText()
}

/**
 * 点日历里的某一天：跳到列表模式，并从这一天开始显示 7 天
 * detail 由日历组件抛出，形如 { year, month, day }
 */
function dayTap(page, detail) {
  var day = detail && detail.day
  if (!day) {
    return
  }
  page.setData({
    day: day,
    viewMode: 'list'
  })
  page.setText()
}

module.exports = {
  buildMonth: buildMonth,
  refresh: refresh,
  onDate: onDate,
  toggleView: toggleView,
  changeMonth: changeMonth,
  dayTap: dayTap
}
