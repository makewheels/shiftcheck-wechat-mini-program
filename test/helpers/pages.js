'use strict'
/**
 * 8 个倒班页的清单：锚点日期、循环长度、类型
 *
 * 锚点必须与各页 getTotalDays() 里的常量一致 —— test/shift-pages.test.js 会断言这一点，
 * 所以改了代码里的锚点却没改这里，测试会红（这正是想要的：锚点改错会整页错班）。
 *
 * 注：原来还有第 9 个 pages/diy/diy.js（DIY 自定义规则），2.5.0 随整条 DIY 链路删除。
 */

const PAGES = [
  { rel: 'pages/wbsd/worker/worker.js', name: '五班三倒-个人', kind: 'worker', anchor: [2016, 6, 7], period: 5 },
  { rel: 'pages/wbsd/director/director.js', name: '五班三倒-总览', kind: 'director', anchor: [2016, 6, 7], period: 5 },
  { rel: 'pages/sbsd/worker/worker.js', name: '四班四倒-个人', kind: 'worker', anchor: [2017, 0, 1], period: 4 },
  { rel: 'pages/sbsd/director/director.js', name: '四班四倒-总览', kind: 'director', anchor: [2017, 0, 1], period: 4 },
  { rel: 'pages/sbbd/worker/worker.js', name: '三班半倒-个人', kind: 'worker', anchor: [2017, 0, 2], period: 21 },
  { rel: 'pages/sbbd/director/director.js', name: '三班半倒-总览', kind: 'director', anchor: [2017, 0, 1], period: 21 },
  { rel: 'pages/jjd/worker/worker.js', name: '经警队-个人', kind: 'worker', anchor: [2026, 8, 10], period: 4 },
  { rel: 'pages/jjd/director/director.js', name: '经警队-总览', kind: 'director', anchor: [2026, 8, 10], period: 4 }
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

// 某页所有 setBanzuN 方法名（总览页没有，返回空数组）
function banzuSetters(page) {
  return Object.keys(page).filter(function (k) { return /^setBanzu\d+$/.test(k) }).sort()
}

// 页面加载时需要额外喂进 data 的东西。
// 现在恒为 null —— 原来只有 diy 页需要喂一份规则 json，该页已随 DIY 链路删除。
// 保留这个函数是为了调用方不用改，将来再有需要预置数据的页面可以直接用上。
function extraDataFor() {
  return null
}

module.exports = {
  PAGES: PAGES,
  stripDate: stripDate,
  rows: rows,
  banzuSetters: banzuSetters,
  extraDataFor: extraDataFor
}
