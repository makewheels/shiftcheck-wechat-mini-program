# 2026-09-11 移除失效的 `scope.userInfo` 授权门禁，删除已失效的授权页

## 背景/目的

设置页的 `checkAuthUserInfo()` 把两个功能挡在授权门禁后面：

```js
wx.getSetting({
  success: (res) => {
    var isAuth = res.authSetting['scope.userInfo']
    if (isAuth) { wx.navigateTo({ url: url }) }
    else { wx.navigateTo({ url: '../authUserInfo/authUserInfo?success=…&fail=…' }) }
  }
})
```

问题是 **`scope.userInfo` 这个授权微信早就废掉了**：2021-04-28 起 `wx.getUserInfo` 不再弹授权框、
直接返回匿名数据（昵称「微信用户」、灰色默认头像），`wx.getSetting` 也不再下发 `scope.userInfo`。
于是对新用户来说 `isAuth` 永远是 `undefined`，流程必然是：

> 点「我的DIY规则」→ 跳到授权页 → 点「微信快捷登录」→ `getSetting` 里仍然没有 `scope.userInfo`
> → 走 else 分支 → 弹窗「授权失败，无法使用」→ 退回设置页

**受影响的两个入口**：设置页的「我的DIY规则」和「订阅上班推送」。等于这两个功能对所有新用户都是坏的。

## 改动清单

- `pages/setting/home/home.js`
  - 删除 `checkAuthUserInfo()`
  - `toMyRule()` / `toPushHome()` 改成直接 `wx.navigateTo` 到目标页，不再过门禁
  - `toPushHome()` 里不再需要 `var that = this`，一并去掉
  - `onShow` 上方那条「可能是从授权页，因为拒绝，回来的」注释已过期，改成说明真实用途
- **删除 `pages/setting/authUserInfo/`**（4 个文件）：门禁去掉后它没有任何入口，
  而且它依赖的 `wx.getUserInfo` / `open-type="getUserInfo"` 已失效，页面本身也是坏的
- `app.json`：移除 `pages/setting/authUserInfo/authUserInfo` 注册
- `app.js`：移除只为授权页服务的 `getUserInfo()`、`globalData.userInfo` 与 `onLaunch` 里的调用
  （它内部调的正是已废弃的 `wx.getUserInfo`）

顺带说明：授权页里还有一份与首页重复的使用信息上报（含读剪贴板、查 IP），
删掉这个页面也一起去掉了；首页那份上报由后续 PR 单独处理。

## 验证方式

- `node --check` home.js / app.js 通过；`app.json` 解析通过
- 全仓库检索：`authUserInfo`、`checkAuthUserInfo`、`scope.userInfo`、`getUserInfo` 均无残留
- 人工核对入口链路：设置页 →「我的DIY规则」→ `myRuleHome`；设置页 →「订阅上班推送」→
  有邮箱则 `pushHome`，无邮箱则 `accountHome` + 提示「请先设置邮箱和手机！」（这条逻辑未变）
- 界面级验证待补（本机开发者工具 CLI 服务端口未开启）

## 待确认项

- 以后若真的需要用户头像昵称（例如做个「我的」页），要用官方的**头像昵称填写能力**重做：
  `<button open-type="chooseAvatar" bindchooseavatar="…">` + `<input type="nickname">`，
  不要再回到 `wx.getUserInfo` / `getUserProfile`（后者 2022-10-25 起也只返回匿名数据）
- 删除的页面在 git 历史里，需要时可以取回

## 回滚方式

- revert 本次提交即可恢复授权页、`app.json` 注册与门禁逻辑（但门禁本身依然是坏的）
