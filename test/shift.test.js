'use strict'
/**
 * utils/shift.js 单元测试
 * 这几个函数是所有倒班页算班次的地基，尤其 mod() 对负数的行为
 * （锚点日之前的日期全靠它，写错就整页错班）
 */
const test = require('node:test')
const assert = require('node:assert')
const shift = require('../utils/shift.js')

test('mod：负数也落在 [0, m)', function () {
  assert.strictEqual(shift.mod(5, 4), 1)
  assert.strictEqual(shift.mod(4, 4), 0)
  assert.strictEqual(shift.mod(-1, 4), 3, 'mod(-1,4) 必须是 3，否则锚点前一天会算成第 2 个班')
  assert.strictEqual(shift.mod(-4, 4), 0)
  assert.strictEqual(shift.mod(-5, 4), 3)
  assert.strictEqual(shift.mod(-11, 4), 1)
  assert.strictEqual(shift.mod(-617, 4), 3)
  assert.strictEqual(shift.mod(0, 21), 0)
  assert.strictEqual(shift.mod(-1, 21), 20)
})

test('daysBetween：有符号，前后方向不能对称', function () {
  const anchor = new Date(2026, 8, 10)
  assert.strictEqual(shift.daysBetween(anchor, new Date(2026, 8, 10)), 0)
  assert.strictEqual(shift.daysBetween(anchor, new Date(2026, 8, 11)), 1)
  assert.strictEqual(shift.daysBetween(anchor, new Date(2026, 8, 9)), -1, '锚点前一天必须是 -1，不能是 1')
  assert.strictEqual(shift.daysBetween(new Date(2016, 6, 7), new Date(2026, 8, 11)), 3718)
  // 跨月跨年
  assert.strictEqual(shift.daysBetween(new Date(2026, 0, 1), new Date(2026, 8, 10)), 252)
  assert.strictEqual(shift.daysBetween(new Date(2025, 0, 1), new Date(2026, 8, 10)), 617)
})

test('dateKey：补零且能被反解回同一天', function () {
  assert.strictEqual(shift.dateKey(2026, 8, 11), '2026-09-11')
  assert.strictEqual(shift.dateKey(2026, 0, 1), '2026-01-01')
  assert.strictEqual(shift.dateKey(2026, 11, 31), '2026-12-31')
  for (let m = 0; m < 12; m++) {
    for (let d = 1; d <= shift.daysInMonth(2026, m); d++) {
      const parts = shift.dateKey(2026, m, d).split('-')
      assert.strictEqual(+parts[0], 2026)
      assert.strictEqual(+parts[1], m + 1)
      assert.strictEqual(+parts[2], d)
    }
  }
})

test('weekName：与各页 getDateString 用词一致（周天不是周日）', function () {
  assert.strictEqual(shift.weekName(new Date(2026, 8, 11)), '周五')
  assert.strictEqual(shift.weekName(new Date(2026, 8, 13)), '周天')
  assert.strictEqual(shift.weekName(new Date(2026, 8, 14)), '周一')
})

test('daysInMonth：闰年与大小月', function () {
  assert.strictEqual(shift.daysInMonth(2026, 1), 28)
  assert.strictEqual(shift.daysInMonth(2024, 1), 29, '2024 是闰年')
  assert.strictEqual(shift.daysInMonth(2000, 1), 29, '2000 是闰年')
  assert.strictEqual(shift.daysInMonth(1900, 1), 28, '1900 不是闰年')
  assert.strictEqual(shift.daysInMonth(2026, 8), 30)
  assert.strictEqual(shift.daysInMonth(2026, 9), 31)
})
