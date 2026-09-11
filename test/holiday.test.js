'use strict'
/**
 * utils/holiday.js 数据自检
 *
 * 节假日数据是手工抄进代码的，抄错一个日期用户就会在日历上看到错的"休/班"，
 * 所以这里把国务院办公厅通知里的关键数字全部钉死：
 *   2025 年：国办发明电〔2024〕12 号  https://www.gov.cn/zhengce/content/202411/content_6986382.htm
 *   2026 年：国办发明电〔2025〕7 号   https://www.gov.cn/zhengce/content/202511/content_7047090.htm
 * 通知每年 11 月发布下一年的安排，补数据时要同步更新这里的断言。
 */
const test = require('node:test')
const assert = require('node:assert')
const shift = require('../utils/shift.js')
const holiday = require('../utils/holiday.js')

// 通知里公布的放假日总天数与补班日总天数
const EXPECT_COUNTS = {
  2025: { holidays: 28, workdays: 5 },
  2026: { holidays: 33, workdays: 6 }
}

// 逐日扫描官方通知里的具体日期抽查（month 是 0-11）
const SPOT_CHECKS = [
  // 2026
  [2026, 0, 1, '休', '元旦'], [2026, 0, 3, '休', '元旦'], [2026, 0, 4, '班', '元旦调休'],
  [2026, 1, 14, '班', '春节调休'], [2026, 1, 15, '休', '春节'], [2026, 1, 17, '休', '春节'],
  [2026, 1, 23, '休', '春节'], [2026, 1, 24, '', ''], [2026, 1, 28, '班', '春节调休'],
  [2026, 3, 4, '休', '清明节'], [2026, 3, 6, '休', '清明节'],
  [2026, 4, 1, '休', '劳动节'], [2026, 4, 5, '休', '劳动节'], [2026, 4, 9, '班', '劳动节调休'],
  [2026, 5, 19, '休', '端午节'], [2026, 5, 21, '休', '端午节'],
  [2026, 8, 20, '班', '国庆节调休'], [2026, 8, 25, '休', '中秋节'], [2026, 8, 27, '休', '中秋节'],
  [2026, 9, 1, '休', '国庆节'], [2026, 9, 7, '休', '国庆节'], [2026, 9, 8, '', ''],
  [2026, 9, 10, '班', '国庆节调休'],
  // 2025
  [2025, 0, 1, '休', '元旦'], [2025, 0, 2, '', ''], [2025, 0, 26, '班', '春节调休'],
  [2025, 0, 28, '休', '春节'], [2025, 1, 4, '休', '春节'], [2025, 1, 8, '班', '春节调休'],
  [2025, 4, 1, '休', '劳动节'], [2025, 4, 31, '休', '端午节'],
  [2025, 9, 1, '休', '国庆节'], [2025, 9, 6, '休', '中秋节'], [2025, 9, 8, '休', '国庆节'],
  [2025, 9, 11, '班', '国庆节调休']
]

test('每年的放假日与补班日总天数与国务院通知一致', function () {
  Object.keys(EXPECT_COUNTS).forEach(function (year) {
    let h = 0
    let w = 0
    for (let m = 0; m < 12; m++) {
      for (let d = 1; d <= shift.daysInMonth(+year, m); d++) {
        const type = holiday.info(+year, m, d).type
        if (type === '休') h++
        else if (type === '班') w++
        else assert.strictEqual(type, '', `${year}-${m + 1}-${d} 返回了意外的 type: ${type}`)
      }
    }
    assert.strictEqual(h, EXPECT_COUNTS[year].holidays, `${year} 年放假日天数`)
    assert.strictEqual(w, EXPECT_COUNTS[year].workdays, `${year} 年补班日天数`)
  })
})

test('补班日必须落在周末（通知里的补班都是周六或周日）', function () {
  Object.keys(EXPECT_COUNTS).forEach(function (year) {
    for (let m = 0; m < 12; m++) {
      for (let d = 1; d <= shift.daysInMonth(+year, m); d++) {
        if (holiday.info(+year, m, d).type !== '班') continue
        const weekday = new Date(+year, m, d).getDay()
        assert.ok(weekday === 0 || weekday === 6,
          `${year}-${m + 1}-${d} 标成补班日却是星期 ${weekday}`)
      }
    }
  })
})

test('每个标注都要有名称，且同一天不会既是休又是班', function () {
  Object.keys(EXPECT_COUNTS).forEach(function (year) {
    for (let m = 0; m < 12; m++) {
      for (let d = 1; d <= shift.daysInMonth(+year, m); d++) {
        const info = holiday.info(+year, m, d)
        if (info.type === '') {
          assert.strictEqual(info.name, '', `${year}-${m + 1}-${d} 无标注却有名称`)
        } else {
          assert.ok(info.name && info.name.length > 0, `${year}-${m + 1}-${d} 有标注却没名称`)
          assert.ok(info.type === '休' || info.type === '班')
        }
      }
    }
  })
})

test('官方通知里的具体日期抽查', function () {
  SPOT_CHECKS.forEach(function (c) {
    const info = holiday.info(c[0], c[1], c[2])
    assert.strictEqual(info.type, c[3], `${c[0]}-${c[1] + 1}-${c[2]} 的标注类型`)
    assert.strictEqual(info.name, c[4], `${c[0]}-${c[1] + 1}-${c[2]} 的节日名`)
  })
})

test('未内置的年份返回空标注，不编造数据', function () {
  // 2027 年的通知在本仓库最后更新时还没发布（通知一般每年 11 月出）
  assert.strictEqual(holiday.hasData(2027), false, '2027 年通知未发布，不该有数据')
  assert.strictEqual(holiday.hasData(2024), false)
  assert.strictEqual(holiday.hasData(2030), false)
  assert.deepStrictEqual(holiday.info(2027, 9, 1), { type: '', name: '' })
  assert.deepStrictEqual(holiday.info(2027, 0, 1), { type: '', name: '' }, '元旦也不该凭空标出来')
  assert.strictEqual(holiday.hasData(2025), true)
  assert.strictEqual(holiday.hasData(2026), true)
})
