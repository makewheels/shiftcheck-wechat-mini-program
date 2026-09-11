'use strict'
/**
 * utils/calendar.js 单元测试：月历网格几何 + 交互
 * 这里用一个假页面隔离测试公共模块，真实页面的接入在 shift-pages.test.js 里验
 */
const test = require('node:test')
const assert = require('node:assert')
const calendar = require('../utils/calendar.js')
const shift = require('../utils/shift.js')
const holiday = require('../utils/holiday.js')

const noop = function (y, m, d) { return { text: 'T' + d, work: d % 2 === 0 } }

// 最小可用的假页面
function fakePage(data) {
  const page = {
    data: Object.assign({ year: 2026, month: 8, day: 15, viewMode: 'list', cal: null }, data || {}),
    calls: [],
    setData: function (obj) { Object.assign(page.data, obj) },
    setText: function () { page.calls.push('setText') },
    getDayCell: function (y, m, d) { return { text: 'T' + d, work: d % 2 === 0 } }
  }
  return page
}

function allCells(cal) {
  const out = []
  cal.weeks.forEach(function (w) { w.cells.forEach(function (c) { out.push(c) }) })
  return out
}

test('buildMonth：标题、星期表、每行 7 格、格子数等于当月天数', function () {
  const cal = calendar.buildMonth(2026, 8, noop)
  assert.strictEqual(cal.title, '2026年9月')
  assert.strictEqual(cal.year, 2026)
  assert.strictEqual(cal.month, 8)
  assert.deepStrictEqual(cal.weekdays, ['一', '二', '三', '四', '五', '六', '日'], '周一起始')
  cal.weeks.forEach(function (w) {
    assert.strictEqual(w.cells.length, 7)
    assert.ok(w.key, '每行要有稳定的 wx:key')
  })
  const real = allCells(cal).filter(function (c) { return !c.blank })
  assert.strictEqual(real.length, 30, '2026 年 9 月有 30 天')
  assert.deepStrictEqual(real.map(function (c) { return c.day }), Array.from({ length: 30 }, function (_, i) { return i + 1 }))
})

test('buildMonth：前置空格按周一起始算对', function () {
  // 2026-09-01 是周二 -> 周一起始要空 1 格
  let cal = calendar.buildMonth(2026, 8, noop)
  assert.strictEqual(cal.weeks[0].cells[0].blank, true)
  assert.strictEqual(cal.weeks[0].cells[1].day, 1)
  assert.strictEqual(cal.weeks.length, 5)

  // 2026-02-01 是周日 -> 空 6 格；28 天 -> 34 格补到 35
  cal = calendar.buildMonth(2026, 1, noop)
  assert.strictEqual(new Date(2026, 1, 1).getDay(), 0, '前置条件：2026-02-01 是周日')
  assert.strictEqual(cal.weeks[0].cells.slice(0, 6).every(function (c) { return c.blank }), true)
  assert.strictEqual(cal.weeks[0].cells[6].day, 1)
  assert.strictEqual(allCells(cal).length, 35)

  // 2026-06-01 是周一 -> 不空格
  cal = calendar.buildMonth(2026, 5, noop)
  assert.strictEqual(new Date(2026, 5, 1).getDay(), 1, '前置条件：2026-06-01 是周一')
  assert.strictEqual(cal.weeks[0].cells[0].blank, false)
  assert.strictEqual(cal.weeks[0].cells[0].day, 1)
})

test('buildMonth：闰年 2 月 29 天', function () {
  const cal = calendar.buildMonth(2024, 1, noop)
  assert.strictEqual(allCells(cal).filter(function (c) { return !c.blank }).length, 29)
})

test('buildMonth：每格带 wx:key，日期格与空格区分开', function () {
  const cal = calendar.buildMonth(2026, 8, noop)
  const keys = new Set()
  allCells(cal).forEach(function (c) {
    assert.ok(c.key, '每格都要有 key')
    assert.ok(!keys.has(c.key), 'key 不能重复：' + c.key)
    keys.add(c.key)
    if (c.blank) {
      assert.strictEqual(c.day, undefined)
    } else {
      assert.ok(c.day >= 1)
      assert.strictEqual(c.text, 'T' + c.day, '格子文字来自页面给的 getDayCell')
    }
  })
})

test('buildMonth：节假日标注与今天标记', function () {
  const cal = calendar.buildMonth(2026, 8, noop)
  const byDay = {}
  allCells(cal).forEach(function (c) { if (!c.blank) byDay[c.day] = c })

  assert.strictEqual(byDay[25].holidayType, '休')
  assert.strictEqual(byDay[25].holidayName, '中秋节')
  assert.strictEqual(byDay[20].holidayType, '班', '2026-09-20 是国庆调休补班日')
  assert.strictEqual(byDay[21].holidayType, '', '普通日子不该有标注')

  assert.strictEqual(cal.hasHolidayData, true)
  assert.strictEqual(calendar.buildMonth(2027, 0, noop).hasHolidayData, false, '2027 未内置数据')

  // 今天标记：只有当天所在月份里恰好一格是今天
  const now = new Date()
  const thisMonth = calendar.buildMonth(now.getFullYear(), now.getMonth(), noop)
  const todays = allCells(thisMonth).filter(function (c) { return c.isToday })
  assert.strictEqual(todays.length, 1)
  assert.strictEqual(todays[0].day, now.getDate())
  assert.strictEqual(allCells(calendar.buildMonth(2026, 8, noop)).filter(function (c) { return c.isToday }).length,
    now.getFullYear() === 2026 && now.getMonth() === 8 ? 1 : 0, '别的月份不该标今天')
})

test('buildMonth：work 字段区分 上班/休息/不适用', function () {
  const cal = calendar.buildMonth(2026, 8, function (y, m, d) {
    if (d === 1) return { text: '休', work: false }
    if (d === 2) return { text: '一班', work: null }
    return { text: '白班', work: true }
  })
  const byDay = {}
  allCells(cal).forEach(function (c) { if (!c.blank) byDay[c.day] = c })
  assert.strictEqual(byDay[1].work, false)
  assert.strictEqual(byDay[2].work, null, '总览页传 null 表示不上色')
  assert.strictEqual(byDay[3].work, true)
})

test('buildMonth：getDayCell 返回空也不崩', function () {
  const cal = calendar.buildMonth(2026, 8, function () { return null })
  allCells(cal).forEach(function (c) {
    if (!c.blank) {
      assert.strictEqual(c.text, '')
      assert.strictEqual(c.work, null)
    }
  })
})

test('refresh：列表模式下什么都不做，日历模式下才建数据', function () {
  const page = fakePage({ viewMode: 'list' })
  calendar.refresh(page)
  assert.strictEqual(page.data.cal, null, '列表模式不该构建日历数据')

  page.setData({ viewMode: 'calendar' })
  calendar.refresh(page)
  assert.ok(page.data.cal, '日历模式要构建数据')
  assert.strictEqual(page.data.cal.title, '2026年9月')
})

test('toggleView：来回切换并刷新数据', function () {
  const page = fakePage()
  calendar.toggleView(page)
  assert.strictEqual(page.data.viewMode, 'calendar')
  assert.ok(page.data.cal)
  calendar.toggleView(page)
  assert.strictEqual(page.data.viewMode, 'list')
})

test('changeMonth：换月并触发 setText；月末日期要收敛不能溢出', function () {
  const page = fakePage({ year: 2026, month: 0, day: 31 })
  calendar.changeMonth(page, 1)
  assert.strictEqual(page.data.month, 1, '1 月的下一月是 2 月')
  assert.strictEqual(page.data.day, 28, '1 月 31 日换到 2 月要收敛到 28 日，不能溢出到 3 月')
  assert.deepStrictEqual(page.calls, ['setText'])

  calendar.changeMonth(page, -1)
  assert.strictEqual(page.data.month, 0)
  assert.strictEqual(page.data.day, 28)

  // 跨年
  const p2 = fakePage({ year: 2026, month: 11, day: 15 })
  calendar.changeMonth(p2, 1)
  assert.strictEqual(p2.data.year, 2027)
  assert.strictEqual(p2.data.month, 0)
  calendar.changeMonth(p2, -1)
  assert.strictEqual(p2.data.year, 2026)
  assert.strictEqual(p2.data.month, 11)

  // 闰年 2 月 29
  const p3 = fakePage({ year: 2024, month: 0, day: 31 })
  calendar.changeMonth(p3, 1)
  assert.strictEqual(p3.data.day, 29, '2024 年 2 月有 29 天')
})

test('dayTap：回到列表模式并从该天开始；空 detail 不改状态', function () {
  const page = fakePage({ viewMode: 'calendar', day: 1 })
  calendar.dayTap(page, { year: 2026, month: 8, day: 20 })
  assert.strictEqual(page.data.viewMode, 'list')
  assert.strictEqual(page.data.day, 20)
  assert.deepStrictEqual(page.calls, ['setText'])

  page.calls.length = 0
  calendar.dayTap(page, {})
  assert.strictEqual(page.data.day, 20, '空 detail 不该改日期')
  assert.strictEqual(page.calls.length, 0)
  calendar.dayTap(page, null)
  assert.strictEqual(page.data.day, 20)
})

test('onDate：临时换日期执行后必须原样还原，即使回调抛错', function () {
  const page = fakePage({ year: 2026, month: 8, day: 15 })
  const got = calendar.onDate(page, 2025, 0, 1, function (p) {
    assert.strictEqual(p.data.year, 2025)
    assert.strictEqual(p.data.month, 0)
    assert.strictEqual(p.data.day, 1)
    return 'ok'
  })
  assert.strictEqual(got, 'ok')
  assert.strictEqual(page.data.year, 2026)
  assert.strictEqual(page.data.month, 8)
  assert.strictEqual(page.data.day, 15)

  assert.throws(function () {
    calendar.onDate(page, 2020, 5, 5, function () { throw new Error('boom') })
  }, /boom/)
  assert.strictEqual(page.data.year, 2026, '抛错也要还原日期')
  assert.strictEqual(page.data.month, 8)
  assert.strictEqual(page.data.day, 15)
})

test('日历格子与 shift/holiday 模块的日期口径一致', function () {
  const cal = calendar.buildMonth(2026, 8, noop)
  allCells(cal).forEach(function (c) {
    if (c.blank) return
    const info = holiday.info(cal.year, cal.month, c.day)
    assert.strictEqual(c.holidayType, info.type)
    assert.strictEqual(c.holidayName, info.name)
    assert.ok(shift.dateKey(cal.year, cal.month, c.day))
  })
})
