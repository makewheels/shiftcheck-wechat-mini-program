'use strict'
/**
 * 9 个倒班页的清单：锚点日期、循环长度、类型
 *
 * 锚点必须与各页 getTotalDays() 里的常量一致 —— test/shift-pages.test.js 会断言这一点，
 * 所以改了代码里的锚点却没改这里，测试会红（这正是想要的：锚点改错会整页错班）。
 */

// diy 页要有一份规则数据才能算班次，测试统一用这份假规则
const DIY_RULE = {
  showName: '测试规则',
  banList: '甲、乙、丙',
  banzuList: ['', '甲', '乙', '丙'],
  periodList: ['1,0', '2', '3', '0', '1,2'],
  restName: '休',
  startDate: '2026-01-01'
}

const PAGES = [
  { rel: 'pages/wbsd/worker/worker.js', name: '五班三倒-个人', kind: 'worker', anchor: [2016, 6, 7], period: 5 },
  { rel: 'pages/wbsd/director/director.js', name: '五班三倒-总览', kind: 'director', anchor: [2016, 6, 7], period: 5 },
  { rel: 'pages/sbsd/worker/worker.js', name: '四班四倒-个人', kind: 'worker', anchor: [2017, 0, 1], period: 4 },
  { rel: 'pages/sbsd/director/director.js', name: '四班四倒-总览', kind: 'director', anchor: [2017, 0, 1], period: 4 },
  { rel: 'pages/sbbd/worker/worker.js', name: '三班半倒-个人', kind: 'worker', anchor: [2017, 0, 2], period: 21 },
  { rel: 'pages/sbbd/director/director.js', name: '三班半倒-总览', kind: 'director', anchor: [2017, 0, 1], period: 21 },
  { rel: 'pages/jjd/worker/worker.js', name: '经警队-个人', kind: 'worker', anchor: [2026, 8, 10], period: 4 },
  { rel: 'pages/jjd/director/director.js', name: '经警队-总览', kind: 'director', anchor: [2026, 8, 10], period: 4 },
  { rel: 'pages/diy/diy.js', name: 'DIY 规则', kind: 'diy', anchor: [2026, 0, 1], period: 5 }
]

// 去掉列表行前面的「周X M月D日：」，只留班次部分
function stripDate(row) {
  const i = row.indexOf('：')
  return i < 0 ? row : row.slice(i + 1)
}

// 列表模式的 7 行
function rows(page) {
  return [page.data.r1, page.data.r2, page.data.r3, page.data.r4, page.data.r5, page.data.r6, page.data.r7]
}

// 某页所有 setBanzuN 方法名（总览页与 diy 页没有，返回空数组）
function banzuSetters(page) {
  return Object.keys(page).filter(function (k) { return /^setBanzu\d+$/.test(k) }).sort()
}

// diy 页需要额外喂规则数据
function extraDataFor(meta) {
  return meta.kind === 'diy' ? { json: DIY_RULE } : null
}

module.exports = {
  PAGES: PAGES,
  DIY_RULE: DIY_RULE,
  stripDate: stripDate,
  rows: rows,
  banzuSetters: banzuSetters,
  extraDataFor: extraDataFor
}
