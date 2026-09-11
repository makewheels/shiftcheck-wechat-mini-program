# 2026-09-11 21:24 修掉「登录还没回来就取 openid」的崩溃点（21 处）+ 入口守卫

## 背景/目的

全仓库有 21 处这样取 openid：

```js
var openid = AV.User.current().toJSON().authData.lc_weapp.openid
```

`AV.User.current()` 在**尚未登录成功时返回 `null`**，后面直接 `.toJSON()` 就是
`TypeError: Cannot read property 'toJSON' of null` —— 页面白屏。触发条件：

- **首次冷启动**：登录是 `app.js` `onLaunch` 里异步发的，本地还没有缓存的用户；
  用户手快一点（首页 → 我的 DIY 规则 / 设置 → 我的账户）就会撞上。
  老用户不受影响，因为 LeanCloud 会把用户存在本地缓存里，`current()` 是同步返回的。
- **登录失败**：弱网、LeanCloud 不可用时，`current()` 一直是 `null`，
  之后每次进这些页面都崩，而且原来没有任何重试。

`README.md` 的 2.3.3 更新日志里写过「修复登录 onShow 函数显示过快报 toJSON 错误问题」，
说明这个坑以前就踩过，但当时只补了撞上的那一处，其余 20 处还在。这次统一收口。

## 改动清单

**`app.js` 新增三个方法 + 登录重试**

- `getOpenid()`：同步返回当前 openid，没登录上返回 `null`（不抛异常）
- `withOpenid(cb)`：已有 openid 就直接 `cb(openid)`；没有就补一次登录，成功再 `cb`，
  失败调 `loginFailTip()` 提示用户，**不执行 cb**，避免页面拿着 `null` 去查数据
- `loginFailTip()`：`hideToast` + 弹窗「登录没成功，请检查网络后重新打开小程序」
- `login(retryLeft)`：`onLaunch` 改调它，失败后间隔 2 秒重试，默认重试 2 次

**21 处调用点收口**（11 个文件）

- `diy` / `diyPush` / `index` / `home` / `accountHome` / `updateMail` / `updatePhone` /
  `myRuleHome` / `newPushMission` / `pushHome` / `importRuleByKey`：
  长表达式统一换成 `app.getOpenid()`，缺 `var app = getApp()` 的文件补上
- `index.js` 的 `mystep2`：去掉 `var user = AV.User.current().toJSON()`，
  未登录时直接不上报（原来这里必崩）

**4 个页面入口加登录守卫**（`diy` / `accountHome` / `pushHome` / `myRuleHome` 的 `onShow`）

```js
var openid = app.getOpenid()
//冷启动时 leancloud 登录可能还没回来，先等登录，别拿着 null 去查数据
if (!openid) {
  app.withOpenid(() => this.onShow())
  return
}
```

`index.js` 的 `toMyDiy` 与 `home.js` 的 `toPushHome` 同样改成 `app.withOpenid(...)` 包一层。

**顺手修掉两处「查询结果没判空就取 [0]」**

- `accountHome.toSetPhone`：`users[0].get("mail")` → 记录不存在时按「没设过邮箱」处理
  （原来新用户点「设置手机」会崩）
- `diyPush.addPushTime`：`users[0].id` → 记录不存在时提示先去「设置 - 我的账户」，
  并且**只在后台确实更新后才加前台次数**（原来无论成败都先把前台数字 +1，会显示假次数）

## 验证方式

- `node --check` 全部 js 通过
- 结构完整性检查通过（22 个注册页面文件齐全、跳转目标都已注册、组件文件齐全、wxml 事件处理函数都存在）
- 全仓库检索：`AV.User.current()` 只剩 `app.js` 内部实现里那一处（以及两条注释）
- 回归：与上一个 PR 逐日比对 9 个倒班页 × 全部班组 × 1541 天的 7 行输出，**0 处不一致**
- 日历 8179 项、周期性 2391 项断言全部通过（确认本 PR 没碰排班与日历逻辑）
- 界面级验证待补（本机开发者工具 CLI 服务端口未开启）；
  「登录失败 → 弹窗提示」这条路径需要断网或用真机弱网实测

## 待确认项

- `updateMail.js` / `updatePhone.js` 里保存时的 `users[0].id` 仍未判空。
  当前流程走不到（`accountHome.onShow` 会先把 `WechatUser` 记录建好），
  但记录创建失败时会崩，已记入 `doc/TODO.md`
- 登录重试次数（2 次）与间隔（2 秒）是否合适
- `index.js` 里那个跳过自身上报的 openid 硬编码（作者自己的 openid）保留未动

## 回滚方式

- revert 本次提交；`app.js` 的三个新方法与各页调用点是一一对应的，回滚后行为与之前一致
