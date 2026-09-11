'use strict'
/**
 * 9 个倒班页的排班逻辑测试 —— 本仓库最要紧的测试
 *
 * 班次是「与锚点相差几天，再对循环长度取模」算出来的，改错一个常量就整页错班，
 * 而且肉眼看不出来。这里用五条互相独立的约束把它钉住：
 *
 *   1. 锚点守卫     —— 各页 getTotalDays() 在锚点当天必须是 0，前一天必须是 -1
 *   2. 周期性不变量 —— 倒班是纯循环，任意 d 都满足 班次(d) === 班次(d + N)
 *                      这条能抓住 Math.abs() 那类「锚点之前算反」的 bug
 *   3. 实测班表     —— 经警队的班表跟真实排班核对过，逐日写死断言
 *   4. 金标准快照   —— 锁定 21 组已校准输出，班组循环表被误改立刻红
 *   5. 列表 == 日历 —— 日历格子必须与列表模式同一天显示同样的班次（不允许有第二套算法）
 *
 * 金标准只在真实班表被重新校准后才该更新：
 *   GOLDEN_UPDATE=1 node --test test/shift-pages.test.js
 *
 * 注意：这里刻意**不用 t.test() 子测试**，而是把每个页面/班组展开成顶层 test()。
 * 同步父测试里建的子测试，在部分 Node 版本（实测 22）上会因为「父测试先结束」被取消，
 * 换个 Node 版本就红一片。顶层测试没有这个问题。
 */
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const mp = require('./helpers/miniprogram.js')
const pg = require('./helpers/pages.js')
const shift = require('../utils/shift.js')
const holiday = require('../utils/holiday.js')
const calendar = require('../utils/calendar.js')

const GOLDEN_FILE = path.join(__dirname, 'fixtures', 'golden-rows.json')
const UPDATE_GOLDEN = process.env.GOLDEN_UPDATE === '1'
const GOLDEN_DAY = [2026, 8, 11] // 2026-09-11，与 fixture 里记的日期一致
const NAMES4 = ['一班', '二班', '三班', '四班']

// 日历格子窄，五班三倒个人页的长文案在格子里用简称（列表里仍是全称）
function calendarTextOf(meta, listText) {
  if (meta.rel.indexOf('wbsd/worker') === 0 && listText === '后夜(零点)') return '后夜'
  return listText
}

function atDate(page, y, m, d) {
  page.setData({ year: y, month: m, day: d })
  page.setText()
}

function dayLabel(y, m, d) {
  return y + '-' + (m + 1) + '-' + d
}

// 每个页面要测的班组组合：个人页有 setBanzu1..N，总览页与 diy 页没有
function groupsOf(meta) {
  const probe = mp.load(meta.rel, pg.extraDataFor(meta))
  const setters = pg.banzuSetters(probe)
  return setters.length ? setters : [null]
}

function labelOf(meta, setter) {
  return meta.name + (setter ? ' ' + setter.replace('setBanzu', '') + '班' : '')
}

/* ---------------- 1. 锚点守卫 ---------------- */

pg.PAGES.forEach(function (meta) {
  test('锚点守卫：' + meta.name, function () {
    const page = mp.load(meta.rel, pg.extraDataFor(meta))
    const firstSetter = pg.banzuSetters(page)[0]
    if (firstSetter) page[firstSetter]()
    const y = meta.anchor[0]
    const m = meta.anchor[1]
    const d = meta.anchor[2]

    page.setData({ year: y, month: m, day: d })
    assert.strictEqual(page.getTotalDays(), 0,
      meta.rel + ' 的锚点应是 ' + dayLabel(y, m, d) +
      '；确实要改锚点的话，请同步改 test/helpers/pages.js 里的 anchor')

    page.setData({ year: y, month: m, day: d + 1 })
    assert.strictEqual(page.getTotalDays(), 1, '锚点后一天应是 +1')

    page.setData({ year: y, month: m, day: d - 1 })
    assert.strictEqual(page.getTotalDays(), -1, '锚点前一天应是 -1，不能取绝对值')
  })
})

/* ---------------- 2. 周期性不变量 ---------------- */

pg.PAGES.forEach(function (meta) {
  groupsOf(meta).forEach(function (setter) {
    test('周期性 班次(d)===班次(d+N)：' + labelOf(meta, setter), function () {
      const page = mp.load(meta.rel, pg.extraDataFor(meta))
      if (setter) page[setter]()
      const memo = {}
      for (let off = -60; off <= 60; off++) {
        const d = new Date(meta.anchor[0], meta.anchor[1], meta.anchor[2] + off)
        page.setData({ year: d.getFullYear(), month: d.getMonth(), day: d.getDate() })
        page.setText()
        memo[off] = pg.stripDate(page.data.r1)
      }
      for (let off = -60; off + meta.period <= 60; off++) {
        assert.strictEqual(memo[off], memo[off + meta.period],
          '偏移 ' + off + ' 与偏移 ' + (off + meta.period) + ' 应同班：「' +
          memo[off] + '」vs「' + memo[off + meta.period] + '」')
      }
    })
  })
})

/* ---------------- 3. 经警队实测班表 ---------------- */

// 已确认：2026-09-10 一班上班，之后二班、三班、四班循环；往前按 4 天循环回推
const CONFIRMED = [
  [2026, 8, 6, '一班'], [2026, 8, 7, '二班'], [2026, 8, 8, '三班'], [2026, 8, 9, '四班'],
  [2026, 8, 10, '一班'], [2026, 8, 11, '二班'], [2026, 8, 12, '三班'], [2026, 8, 13, '四班'],
  [2026, 8, 14, '一班'],
  [2026, 7, 30, '二班'], [2026, 0, 1, '一班'], [2025, 0, 1, '四班']
]

test('经警队总览页：与真实排班核对过的 12 个日期逐日正确', function () {
  const director = mp.load('pages/jjd/director/director.js')
  CONFIRMED.forEach(function (c) {
    director.setData({ year: c[0], month: c[1], day: c[2] })
    const row = pg.stripDate(director.getRow())
    assert.strictEqual(row, c[3] + '上班',
      '总览页 ' + dayLabel(c[0], c[1], c[2]) + ' 应为「' + c[3] + '上班」，实得「' + row + '」')
  })
})

test('经警队个人页：锚点前后各 200 天，每天恰好 1 个班上班且与总览页一致', function () {
  const worker = mp.load('pages/jjd/worker/worker.js')
  const director = mp.load('pages/jjd/director/director.js')
  for (let off = -200; off <= 200; off++) {
    const base = new Date(2026, 8, 10 + off)
    const y = base.getFullYear()
    const m = base.getMonth()
    const d = base.getDate()
    let onDuty = 0
    let who = -1
    for (let b = 1; b <= 4; b++) {
      worker.setData({ year: y, month: m, day: d })
      worker['setBanzu' + b]()
      if (worker.getWork() === '上班') {
        onDuty++
        who = b - 1
      }
    }
    assert.strictEqual(onDuty, 1, dayLabel(y, m, d) + ' 应恰好 1 个班上班，实为 ' + onDuty)
    director.setData({ year: y, month: m, day: d })
    assert.strictEqual(pg.stripDate(director.getRow()), NAMES4[who] + '上班',
      dayLabel(y, m, d) + ' 总览页与个人页不一致')
  }
})

test('经警队个人页：切到一班后 7 天列表是「上1休3」', function () {
  const worker = mp.load('pages/jjd/worker/worker.js')
  worker.setData({ year: 2026, month: 8, day: 10 })
  worker.setBanzu1()
  worker.setText()
  assert.deepStrictEqual(pg.rows(worker).map(pg.stripDate),
    ['上班', '休息', '休息', '休息', '上班', '休息', '休息'])
})

/* ---------------- 4. 金标准快照 ---------------- */

function currentGolden() {
  const out = {}
  pg.PAGES.forEach(function (meta) {
    groupsOf(meta).forEach(function (setter) {
      const page = mp.load(meta.rel, pg.extraDataFor(meta))
      if (setter) page[setter]()
      atDate(page, GOLDEN_DAY[0], GOLDEN_DAY[1], GOLDEN_DAY[2])
      out[meta.rel + (setter ? '#' + setter : '')] = pg.rows(page)
    })
  })
  return out
}

test('金标准快照：锁定 2026-09-11 起 7 天的已校准输出', function () {
  const current = currentGolden()

  if (UPDATE_GOLDEN) {
    fs.writeFileSync(GOLDEN_FILE, JSON.stringify({
      _说明: '各倒班页在 2026-09-11 起 7 天的列表输出快照，用来锁定已校准的班次。' +
        '只有在真实班表被重新校准后才该更新：GOLDEN_UPDATE=1 node --test test/shift-pages.test.js',
      _日期: '2026-09-11',
      rows: current
    }, null, 2) + '\n')
    console.log('GOLDEN_UPDATE=1：已重写 ' + path.relative(mp.REPO, GOLDEN_FILE))
    return
  }

  assert.ok(fs.existsSync(GOLDEN_FILE), '缺少 test/fixtures/golden-rows.json')
  const golden = JSON.parse(fs.readFileSync(GOLDEN_FILE, 'utf8'))
  assert.strictEqual(golden._日期, '2026-09-11', 'fixture 记录的日期要与测试用的日期一致')
  assert.deepStrictEqual(Object.keys(current).sort(), Object.keys(golden.rows).sort(),
    '快照覆盖的页面/班组组合与 fixture 不一致（增删倒班页要同步更新 fixture）')
  assert.ok(Object.keys(current).length >= 20, '快照组数不对，应覆盖 9 个页面的全部班组')

  const diffs = []
  Object.keys(current).sort().forEach(function (key) {
    if (JSON.stringify(current[key]) !== JSON.stringify(golden.rows[key])) {
      diffs.push(key + '\n      现在: ' + JSON.stringify(current[key]) +
        '\n      基线: ' + JSON.stringify(golden.rows[key]))
    }
  })
  assert.deepStrictEqual(diffs, [],
    '班次输出与金标准不一致（若确实重新校准过班表，用 GOLDEN_UPDATE=1 重跑更新基线）：\n  ' + diffs.join('\n  '))
})

/* ---------------- 5. 列表 == 日历 ---------------- */

// 2026-09 含中秋国庆、2026-02 春节、2025-10 旧数据年、2024-02 闰年且无内置数据
const MONTHS = [[2026, 8], [2026, 1], [2025, 9], [2024, 1]]

pg.PAGES.forEach(function (meta) {
  groupsOf(meta).forEach(function (setter) {
    test('日历格子与列表一致：' + labelOf(meta, setter), function () {
      const page = mp.load(meta.rel, pg.extraDataFor(meta))
      if (setter) page[setter]()

      MONTHS.forEach(function (ym) {
        const Y = ym[0]
        const M = ym[1]
        // 真值：列表模式逐日取 r1
        const truth = {}
        for (let d = 1; d <= shift.daysInMonth(Y, M); d++) {
          page.setData({ year: Y, month: M, day: d, viewMode: 'list' })
          page.setText()
          truth[d] = pg.stripDate(page.data.r1)
        }

        // 日历模式
        page.setData({ year: Y, month: M, day: 15, viewMode: 'calendar' })
        page.setText()
        const cal = page.data.cal
        assert.ok(cal, Y + '-' + (M + 1) + ' 的日历数据不该为空')
        assert.strictEqual(cal.title, Y + '年' + (M + 1) + '月')
        assert.strictEqual(cal.hasHolidayData, holiday.hasData(Y))

        let days = 0
        cal.weeks.forEach(function (w) {
          assert.strictEqual(w.cells.length, 7, '每行必须 7 格')
          w.cells.forEach(function (c) {
            if (c.blank) return
            days++
            assert.strictEqual(c.text, calendarTextOf(meta, truth[c.day]),
              dayLabel(Y, M, c.day) + ' 日历「' + c.text + '」与列表「' + truth[c.day] + '」不一致')
            const info = holiday.info(Y, M, c.day)
            assert.strictEqual(c.holidayType, info.type, dayLabel(Y, M, c.day) + ' 节假日标注类型')
            assert.strictEqual(c.holidayName, info.name, dayLabel(Y, M, c.day) + ' 节假日名称')
          })
        })
        assert.strictEqual(days, shift.daysInMonth(Y, M), '格子天数应等于当月天数')
      })
    })
  })
})

/* ---------------- 6. 页面接入完整性 ---------------- */

pg.PAGES.forEach(function (meta) {
  test('月日历接入完整：' + meta.name, function () {
    const page = mp.load(meta.rel, pg.extraDataFor(meta))
    assert.strictEqual(page.data.viewMode, 'list', '默认应是列表模式')
    assert.strictEqual(page.data.cal, null, '日历数据初始应为 null')
    ;['getDayCell', 'toggleView', 'backMonth', 'nextMonth', 'onCalendarDayTap', 'setText'].forEach(function (fn) {
      assert.strictEqual(typeof page[fn], 'function', meta.rel + ' 缺少 ' + fn + '()')
    })

    // 列表模式下不该构建日历数据
    atDate(page, 2026, 8, 15)
    assert.strictEqual(page.data.cal, null, '列表模式不该构建日历数据')

    // 切到日历要有数据，切回来要还原
    page.toggleView()
    assert.strictEqual(page.data.viewMode, 'calendar')
    assert.ok(page.data.cal, '切换后应构建日历数据')
    page.toggleView()
    assert.strictEqual(page.data.viewMode, 'list')

    // 换月要收敛月末日期，不能溢出到下个月
    page.setData({ year: 2026, month: 0, day: 31, viewMode: 'calendar' })
    page.setText()
    calendar.changeMonth(page, 1)
    assert.strictEqual(page.data.month, 1, '1 月的下一月应是 2 月')
    assert.strictEqual(page.data.day, 28, '1 月 31 日换到 2026 年 2 月应收敛到 28 日')
    page.backMonth()
    assert.strictEqual(page.data.month, 0, '上一月应回到 1 月')

    // 个人页复用 getWork()，总览页与 diy 页有 getDayText()
    const src = fs.readFileSync(path.join(mp.REPO, meta.rel), 'utf8')
    if (meta.kind === 'worker') {
      assert.match(src, /getWork\s*\(/, meta.rel + ' 应通过 getWork() 出班次')
    } else {
      assert.strictEqual(typeof page.getDayText, 'function', meta.rel + ' 应有 getDayText()')
    }

    // 日历模式下点某一天要回到列表并从该天开始
    const banzuId = page.data.banzuId
    page.setData({ viewMode: 'calendar', year: 2026, month: 8, day: 1 })
    page.setText()
    page.onCalendarDayTap({ detail: { year: 2026, month: 8, day: 20 } })
    assert.strictEqual(page.data.viewMode, 'list', '点日历某天后应回到列表模式')
    assert.strictEqual(page.data.day, 20)

    // r1 应等于「从 9/20 开始的列表」的第一行
    const fresh = mp.load(meta.rel, pg.extraDataFor(meta))
    if (banzuId) fresh['setBanzu' + banzuId]()
    atDate(fresh, 2026, 8, 20)
    assert.strictEqual(pg.stripDate(page.data.r1), pg.stripDate(fresh.data.r1),
      '点日历 9/20 后 r1 应是 9/20 的班次')
  })
})
