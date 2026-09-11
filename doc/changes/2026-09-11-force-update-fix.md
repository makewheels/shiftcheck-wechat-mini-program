# 2026-09-11 修复小程序强制升级的 3 处缺陷

## 背景/目的

`doc/TODO.md` 第 3 条记录了自动强制升级的三处缺陷。微信官方 API 是 `wx.getUpdateManager()`，
本仓库原本已经写了，但写在 `pages/index/index.js` 的 `checkAppUpdate()` 里、由首页 `onShow` 调用：

```js
checkAppUpdate: function() {
  wx.getUpdateManager().onCheckForUpdate(function(res) {
    if (res.hasUpdate) {
      wx.showToast({ title: '小程序更新，稍后将自动重启...', icon: 'none' })
      wx.getUpdateManager().onUpdateReady(function() {   // ← 嵌套在里面，且有条件
        wx.getUpdateManager().applyUpdate();
      })
    }
  })
}
```

三个问题：

1. **`onUpdateReady` 注册时机**：嵌套在 `onCheckForUpdate` 回调里、且只在 `hasUpdate === true` 时才注册。
   冷启动时如果新版本下载完成得比回调执行更快，`onUpdateReady` 事件已经错过 → 永远不会 `applyUpdate()`，
   用户这一轮就停在旧版本上。官方要求在 `onLaunch` 里尽早注册。
2. **没有 `onUpdateFailed` 兜底**：新版本下载失败（弱网 / 网络被拦）时静默无提示，用户长期用旧版且不知情。
3. **入口覆盖不全**：`app.js` 里的 `checkAppUpdate` 是**空函数**、`onLaunch` 也没调用；真正的检查只挂在首页 `onShow`。
   用户从分享卡片等入口直达某个倒班页（不经过首页），这一轮就不会检查更新。
   反过来，每次回到首页 `onShow` 都会**重复注册一遍**回调。

## 改动清单

- `app.js`：删掉空的 `checkAppUpdate`，新增 `initUpdateManager()`，并在 `onLaunch` 里**先于登录**调用
  - 三个回调（`onCheckForUpdate` / `onUpdateReady` / `onUpdateFailed`）一次性注册，不再嵌套、不再带条件
  - `onUpdateReady`：改成 `wx.showModal({ showCancel: false })`，用户点确定后 `applyUpdate()` 重启
    （原来是 toast 一闪就自动重启；现在是明确的阻塞式提示，仍然是强制升级 —— TODO 里那条「待定」按这个方向定了）
  - `onUpdateFailed`：弹窗告知「新版本下载失败，请检查网络后删除小程序，重新搜索打开」
  - 加了 `if (!wx.getUpdateManager) return` 的兜底，低版本基础库不会报错
- `pages/index/index.js`：删掉 `checkAppUpdate()` 与只为它存在的 `onShow`（避免同一事件被重复注册）
- `doc/TODO.md`：第 3 条状态改为「已完成（3 处缺陷已修）」，保留「端到端验证待补」

## 验证方式

- `node --check` app.js 与 index.js 通过
- 全仓库检索确认：`getUpdateManager` 只在 `app.js` 出现一处，`checkAppUpdate` 已无残留
- **端到端未验证**：要真跑一遍得先把新版本上传到微信后台。本机开发者工具的 CLI 服务端口是关闭状态
  （设置 → 安全设置 → 服务端口），命令行编译/上传用不了，所以「上传 → 检测到新版本 → 弹窗 → 重启」
  全链路尚未跑通，已记在 `doc/TODO.md`

## 待确认项

- 提示文案：「新版本已经下载好，点确定重启到新版本」是否合适；要不要顺带写上本次更新内容
- `applyUpdate()` 会立即重启小程序。现在触发点在 `onLaunch`，用户还没进入任何输入页面，
  不存在丢失未保存输入的问题；日后若把提示挪到别的时机要注意这点

## 回滚方式

- revert 本次提交，升级逻辑回到首页 `onShow` 那份实现
