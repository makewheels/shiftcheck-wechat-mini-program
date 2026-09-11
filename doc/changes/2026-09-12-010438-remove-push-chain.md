# 2026-09-12 01:04 删除整条「上班推送」链路（5 个页面）

## 背景/目的

「订阅上班推送」这条链路**整体已经不可用**，但界面上完全看不出来 —— 用户能填真实邮箱、
真实手机号、拨邮件/短信开关、选天气预报城市、甚至看激励视频领推送次数，
然后**什么都收不到**。这比"按钮灰着"更伤信任，也是审核时最容易判「功能异常 / 欺骗用户」的形态。

### 判定它已死的证据（全部来自代码，可复核）

1. **创建推送任务的入口被硬编码堵死**：`pushHome.js` 的 `toNewPush()` 里
   `wx.showToast({title:'开发中'})` 之后紧跟一句裸 `return`，后面的 `navigateTo` 是死代码。
   全仓库没有任何其它入口能进 `newPushMission`
2. **`PushMission` 表全仓库零处读取**：只有 `newPushMission.js` 一处 `new AV.Object.extend('PushMission')`
   写入，没有任何 `new AV.Query('PushMission')`
3. **`WechatUser` 的 7 个推送字段全部只写不读**：`isMailPushEnable` / `isSmsPushEnable`
   只在 `pushHome` 里回显自己的开关；`mailPushTimes` 只增不减（全仓库无一处 `-1`/`decrement`）；
   `smsPushTimes` 初始化 5 之后**再无任何写入点**，界面永久显示「短信剩余 5 条」；
   `pushProvince` / `pushRegion` 纯写、零读取
4. **真正发信/发短信的定时任务必定在服务端**：客户端只写数据表。全仓库唯一的云函数调用是
   `sendWelcomeMail`（设置邮箱/手机后发欢迎邮件），**没有任何推送相关的云函数调用**。
   而 `doc/README.md` 明确写着「后端仓库 shiftcheck-server 已不再使用」

结论：这条链路的服务端已经停了，客户端所有推送相关的写入都是往黑洞里扔数据。

### 为什么选择删除而不是修复

修好它需要重建服务端定时任务（读 `PushMission` + 发邮件/短信）、补 `smsPushTimes` 的扣减与补充、
接通 `newPushMission`（而它依赖的 `Rule` 表同样没有任何写入方）。这已经是一个独立项目，
不是一个 PR 能收的事。而**核心查班功能是纯本地计算，完全不依赖这条链路** —— 删掉它，
小程序变成一个自足的离线工具，隐私面和维护面都大幅收窄。

## 改动清单

**删除 5 个页面（20 个文件）**

- `pages/setting/pushHome/` —— 订阅上班推送（邮件/短信开关、剩余次数、天气城市）
- `pages/setting/newPushMission/` —— 新增推送任务（334 行，入口自 2.2.x 起就被 `return` 堵死）
- `pages/setting/updateMail/` —— 设置邮箱
- `pages/setting/updatePhone/` —— 设置手机
- `pages/setting/accountHome/` —— 我的账户（只服务于上面这些：存邮箱/手机、初始化推送次数）

**入口与注册**

- `app.json`：注册页面 **20 → 15**
- `pages/setting/home/home.wxml`：删掉「我的账户」「订阅上班推送」两个按钮
- `pages/setting/home/home.js`：删掉 `toAccountHome()` 与 `toPushHome()`；
  同时删掉不再使用的 `const AV = require(...)`（这页现在纯本地，不连后端）
  和删除方法后残留的空注释

**顺带消掉的问题**（都属于被删页面，不再需要单独修）

- `updateMail.js` / `updatePhone.js` 的 `users[0].id` 未判空崩溃
- `accountHome.onShow` 在 `save()` 完成前就 `hideToast` 放行 UI 造成的竞态
- `pushHome` 三个开关的「乐观更新 + 静默失败」与卡 20 秒的 loading toast
- 5 处 `duration: 20000` 的 loading toast
- `sendWelcomeMail` 云函数调用（2 处）
- **邮箱与手机号的采集** —— 这两项是《用户隐私保护指引》里必须声明的敏感个人信息，
  现在不用声明了

## 验证方式

- `node --test test/*.test.js`：**136 项全部通过**，一项没少
  （被删页面本来就没有专属测试；`structure.test.js` 的四条门禁正好覆盖这类删除：
  注册页面文件齐全、磁盘上的页面目录都已注册、所有 `navigateTo` 目标已注册、
  wxml 绑定的处理函数在 js 中存在 —— 少删一处引用就会红）
- 全仓库检索 `pushHome` / `newPushMission` / `updateMail` / `updatePhone` / `accountHome`：
  **0 处残留**
- `node --check` 通过；`app.json` 解析通过，页面数 15
- `sitemap.json` 无需改动：它只 allow 首页与 8 个倒班页，被删的 5 个页面本来就在 disallow 兜底里
- 界面级验证待补：开发者工具 CLI 服务端口未开启。合并后需在模拟器里确认
  设置页只剩「我的DIY规则」与「个人模式默认班组」两个按钮、且都能点

## 待确认项

- LeanCloud 后台的 `WechatUser` / `PushMission` 表**本次没动**（数据保留，只是客户端不再读写）。
  确认不再需要后可以自行在后台删表
- `doc/发布前检查单.md` 里「隐私保护指引要声明邮箱/手机号」「广告位 3 个」等条目已过期，
  由后续单独的文档变更统一更正
- 如果哪天想重做推送，微信官方的**订阅消息**（`wx.requestSubscribeMessage` + 服务端下发）
  比自建邮件/短信链路更省事，也不涉及收集邮箱手机号

## 回滚方式

- revert 本提交即恢复 5 个页面、`app.json` 注册与设置页两个入口
  （但推送依然是不通的，因为服务端定时任务不在本仓库）
