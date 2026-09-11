/**
 * 倒班日期计算的公共方法
 */

/**
 * 取模，负数也落在 [0, m) 区间
 * 锚点日之前的日期必须用它，直接用 % 会得到负数，班次会算反
 */
function mod(n, m) {
  return ((n % m) + m) % m
}

/**
 * date2 - date1 的有符号天数差（date2 在后为正）
 */
function daysBetween(date1, date2) {
  return Math.round((date2 - date1) / 1000 / 60 / 60 / 24)
}

/**
 * 把 year/month/day 补成 YYYY-MM-DD
 * month 是 0-11
 */
function dateKey(year, month, day) {
  var m = month + 1
  return year + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day)
}

var WEEK_NAMES = ['周天', '周一', '周二', '周三', '周四', '周五', '周六']

/**
 * 日期的中文星期
 */
function weekName(date) {
  return WEEK_NAMES[date.getDay()]
}

/**
 * 某年某月的天数，month 是 0-11
 */
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

module.exports = {
  mod: mod,
  daysBetween: daysBetween,
  dateKey: dateKey,
  weekName: weekName,
  daysInMonth: daysInMonth
}
