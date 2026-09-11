# 2026-09-11 23:29 修复 diyPush 页面被声明成自定义组件（跳过去打不开）

## 背景/目的

发布前复核时发现：`pages/diyPush/diyPush.json` 声明了 `"component": true`，
但 `pages/diyPush/diyPush.js` 用的是 `Page({...})`，而 `app.json` 把它注册为**页面**：

```json
// pages/diyPush/diyPush.json（改前）
{
  "component": true,
  "usingComponents": {}
}
```

```js
// pages/diyPush/diyPush.js:6
Page({ ... })
```

```json
// app.json:20
"pages/diyPush/diyPush"
```

一个路径在 `app.json` 里注册为页面、它的 json 却声明自己是自定义组件时，
编译器按组件处理，而文件里调的是 `Page()` 构造器 —— 结果就是这个页面注册不上，
跳过去白屏或报 "Component is not found in path"。

**这条路径是活的**，而且是变现路径：
`pages/diy/diy.wxml` 的「自定义规则提醒」按钮 → `diy.js` 的 `toDiyPush()` →
`wx.navigateTo({ url: '../diyPush/diyPush' })`，页面里有「看激励视频增加推送次数」
（`diyPush.js` 的 `wx.createRewardedVideoAd`）。

全项目 20 个注册页面里，**只有这一个**页面 json 带 `component` 字段（其余都是 `{}`
或只声明 `usingComponents`），所以是孤立的一处配置错误，不是某种约定。

## 改动清单

- `pages/diyPush/diyPush.json`：`{"component": true, "usingComponents": {}}` → **`{}`**
  （页面不需要声明 `usingComponents`，它没有用到任何自定义组件）
- `test/structure.test.js`：新增一条门禁 —— **`app.json` 里注册为页面的 json 不许声明
  `"component": true`**，逐个页面检查，命中即失败

## 验证方式

- `node --test test/*.test.js`：**108 项全部通过**（比之前多 1 项，即新增的门禁）
- **变异验证**：把 `"component": true` 放回 `diyPush.json` → 新门禁立刻变红
  （107 pass / 1 fail），改回 `{}` 后恢复全绿。证明这条门禁不是空转
- 全项目扫描确认：现在没有任何注册页面的 json 带 `component` 字段
- `node --check pages/diyPush/diyPush.js` 通过；`app.json` 解析通过
- **界面级验证待补**：本机开发者工具 CLI 服务端口未开启，无法命令行编译预览。
  合并后需要在模拟器/真机上走一遍：DIY 规则页 →「自定义规则提醒」→ 页面能正常打开、
  推送次数显示正常、「看视频加次数」能拉起激励视频

## 待确认项

- 这个错误从 v2.3.2 引入后一直没被发现，很可能**这条路径从未在真机上验证过**。
  除了本 PR 的配置修复，建议顺便确认激励视频广告位 `adunit-79ec0f8be5efc0f1`
  归属本小程序且已开通流量主，否则页面能打开但视频拉不起来
- `diyPush.js` 的 `rewardedVideoAd.onClose((res) => ...)` 直接读 `res.isEnded`；
  部分基础库版本下 `res` 可能是 `undefined`。建议改成 `if (res && res.isEnded)`（本次未改，
  属另一件事）

## 回滚方式

- revert 本提交；回滚后 diyPush 页会重新打不开
