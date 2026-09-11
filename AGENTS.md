# AGENTS.md

给 AI agent / 新协作者看的仓库须知。**改动流程与变更记录规范以 `doc/README.md` 为准**，这里只写"怎么不把事情搞坏"。

## 这是什么项目

微信小程序「查班神器」：倒班/排班查询。原生小程序（**无框架、无构建步骤、无 npm 依赖**），
后端是 LeanCloud（`libs/av-core-min.js` + `libs/leancloud-adapters-weapp.js`，专有域名 `api.leancloud.mp.shiftcheck.work`）。
appid `wx46b9f529e9244893`。全部功能在小程序端，`doc/README.md` 里提到的 shiftcheck-server 后端仓库已不再使用。

## 跑测试

```bash
node --test test/*.test.js
```

- 用 Node 内置的 `node:test` + `node:assert`，**零第三方依赖**，不要为此新建 `package.json` 或装东西
  （仓库里出现 `package.json` 会让微信开发者工具的「构建 npm」介入，没必要添这个变量）
- 需要 Node 18+。**注意 `node --test test/`（给目录）在部分版本会被当成模块路径而报错，
  要写通配 `test/*.test.js`**
- 测试是纯 Node 的：用假的 `Page()` / `Component()` / `wx` / `getApp()` / LeanCloud SDK
  沙箱加载页面 js 后直接调方法断言，**不启动模拟器**。加载器在 `test/helpers/miniprogram.js`
- 六个测试文件：`shift`（日期与取模）、`holiday`（节假日数据自检）、`calendar`（月历几何与交互）、
  **`shift-pages`（最要紧：锚点守卫、周期性不变量、经警队实测班表、金标准快照、列表==日历）**、
  `structure`（页面注册/跳转目标/组件/wxml 处理函数齐全性）、`hygiene`（废弃 API、隐私接口位置、
  硬编码凭据、死代码复活、版本号与 README 一致、变更记录文件名规范）
- `test/fixtures/golden-rows.json` 是金标准快照，锁定各页已校准的班次输出。
  **只有真实班表被重新校准后**才该更新：`GOLDEN_UPDATE=1 node --test test/shift-pages.test.js`
- **写测试时不要用 `t.test()` 子测试**，一律展开成顶层 `test()`。
  同步父测试里建的子测试在 Node 22 上会因为「父测试先结束」被取消（Node 24 不会）——
  这个坑真实踩过，本地绿、CI 红一片

## CI 门禁

- `.github/workflows/ci.yml`，job `test`，**Node 24 单版本**（与本机开发版本一致 ——
  本地与 CI 同版本，才不会出「本地绿、CI 红」的纯版本噪音），触发：PR(base=master)、push(master)、手动
- 必需检查是 **`test`**（`master` 分支保护里 `required_status_checks.contexts = ["test"]`），
  绿了才合得进去；`enforce_admins=true`，管理员也不例外
- **改 job 名或加减矩阵时，必须同步改分支保护里的 context 名**，否则 PR 会永远等不到旧 context
  上报而卡死合并。步骤与命令见 `doc/changes/2026-09-11-223516-ci-single-node.md`
- 被 CI 挡住时的正确做法是**往 PR 分支推修复让它重跑**，不要去摘必需检查。
  真要临时摘（例如 workflow 本身坏了导致死锁），命令写在
  `doc/changes/2026-09-11-222319-required-checks.md` 里，摘完记得加回来
- CI 里**跑不了小程序模拟器**（开发者工具没有 Linux 版，自动化还要求开服务端口并扫码登录），
  所以界面层（渲染、换行、点击手感）永远需要人工过一遍。别把「CI 绿了」说成「界面没问题」

## 硬约定（不遵守会被 PR 卡住）

1. 所有改动走分支 + PR，**禁止直推 `master`**（已开分支保护、enforce admins，管理员也推不上去）
2. 分支名不用斜杠：`feature-xxx` / `fix-xxx` / `docs-xxx` / `chore-xxx`
3. 每次变更在 `doc/changes/` 新增一份 markdown 记录，命名 `YYYY-MM-DD-HHMMSS-简短说明.md`
   （**一天会有多次提交，所以必须带时分秒**），内容含：背景/目的、改动清单、验证方式、待确认项、回滚方式
4. 一次 PR 只做一件事。体量大的功能拆成"公共模块 + 首批接入"与"推广到其余页面"两次
5. 多个 PR 并行时按"合并一个再开下一个"推进，让每个 PR 的 base 都是当时的 master，diff 只含自己那层
6. 提交信息只描述程序改动。**不要**出现：第三方工具/模型署名（`Co-Authored-By` 之类）、
   作者雇主与开发环境信息（企业代理、内网证书、公司网络状况）、企业邮箱
   —— 这是公开仓库，提交身份统一用 `makewheels <makewheels@github.com>`

## 改排班逻辑前必读（最容易搞坏的地方）

- 每个倒班页 `getTotalDays()` 里的日期是**排班基准日（锚点）**。改错一个数字，整页显示错班，
  而且肉眼看不出来。`test/shift-pages.test.js` 里有锚点守卫测试，动了就会被测出来
- 天数差与取模**必须**用 `utils/shift.js` 的 `daysBetween()`（有符号）和 `mod()`（负数也落在 `[0, N)`）。
  写 `Math.abs()` 或裸 `%` 会让**锚点日之前**的日期算错班 —— 这个 bug 真实存在过，
  经警队锚点是 2026-09-10，用户往前翻一天就错
- 各页的班组循环表（`loopBody`、`names`）是校准过的实测数据，不要"顺手优化"或重排
- 校验排班改动的正确姿势：先记下改动前的输出，改完对同一段日期逐日比对。
  `test/shift-pages.test.js` 用两条不变量兜底：① 周期性 `班次(d) === 班次(d + N)`；
  ② 日历格子文字 === 列表模式同一天的文字（列表走的是老代码路径）

## 改页面时

- 取 openid **只能**用 `app.getOpenid()`（同步、未登录返回 `null`）或 `app.withOpenid(cb)`（未登录先补登录，
  失败则提示且不执行 cb）。**不要**写 `AV.User.current().toJSON()`：未登录时 `current()` 是 `null`，
  直接 `.toJSON()` 就 TypeError 白屏。这个坑踩过两次（README 2.3.3 记过一次，2.4.0 又统一收了 21 处）
- 查询结果取 `[0]` 前先判空（LeanCloud 查不到就是空数组）
- 新增倒班页要接月日历的话：`data` 加 `viewMode`/`cal`，实现一个 `getDayCell(year, month, day)`，
  加 4 个一行转发方法（`toggleView`/`backMonth`/`nextMonth`/`onCalendarDayTap`），
  `setText()` 末尾加 `calendar.refresh(this)`，`.json` 注册 `shift-calendar` 组件。
  班次算法通过 `calendar.onDate()` 原样复用，**不要写第二套**
- `components/shift-calendar/` 是自定义组件，样式隔离：`app.wxss` 的全局样式（如 `text { font-size: 40rpx }`）
  进不去，组件内的样式也出不来。改样式别指望继承
- 页面 `.json` 里声明的 `usingComponents` 路径、`.wxml` 里 `bind*` 绑定的处理函数、
  `app.json` 的页面注册与实际文件，都由 `test/structure.test.js` 校验；少一个就红

## 节假日数据

`utils/holiday.js` 内置法定节假日与调休补班日，数据来自国务院办公厅通知（文件头有原文 URL）。

- **每年 11 月下一年安排公布后要手工补进 `DATA`**，否则那年日历上没有假期标注（组件会提示"数据尚未内置"）
- 目前只有 2025、2026 两年，都按 gov.cn 原文逐条核对过
- **不要凭记忆或让模型"推算"节假日日期**。2027 年的通知在本仓库最后更新时还没发布，
  曾两次收到编造的 2027 数据 + 伪造的 gov.cn 链接，靠"通知发布日期在未来"才识破。
  没有官方来源就宁可不写

## 隐私与合规（发布相关，动之前先看 `doc/发布前检查单.md`）

- **不要**加回任何静默采集。历史上有过：首页启动后静默读剪贴板、请求 ip138 查 IP、连同设备信息入库，
  2.4.0 已移除。剪贴板与 IP 都属于微信"用户隐私接口"，必须在后台《用户隐私保护指引》声明并处理授权弹窗
- 现存唯一的隐私接口调用是 `pages/setting/importRuleByKey/importRuleByKey.js` 的 `wx.getClipboardData`，
  由用户点「一键粘贴」主动触发，属正当用法，但**依赖后台已声明"剪贴板"**
- 不要把任何 token / key / secret 写进代码。历史上硬编码过两个 ip138 token，随公开仓库泄露，只能作废重置
- 已废弃 API 不要再用：`wx.getSystemInfoSync`（用 `wx.getSystemInfo`）、`wx.getUserInfo`、`wx.getUserProfile`
  （都只返回匿名数据）。要头像昵称用官方的"头像昵称填写能力"：
  `<button open-type="chooseAvatar">` + `<input type="nickname">`
- `hygiene.test.js` 会把上面这些禁用写法直接测红

## 本机验证的边界

微信开发者工具装在 `/Applications/wechatwebdevtools.app`，但 **CLI 服务端口默认是关闭的**
（工具 → 设置 → 安全设置 → 服务端口），所以 `cli` 的编译 / 预览 / 上传 / 自动化都用不了。
因此：

- 逻辑层验证靠 `node --test test/*.test.js`（排班算法、日历、结构、隐私卫生），本地与 CI 跑的是同一套
- **界面层（渲染、换行、点击手感）测不了，必须人工在模拟器或真机看** —— 交付时要说清哪些没验过，
  不要把"测试通过"说成"界面没问题"
- 想用命令行编译/上传，需要用户先开启服务端口并登录工具；开启后 `cli preview` / `cli upload` /
  `cli auto`（配 `miniprogram-automator`）才可用，那时才谈得上真正的界面级 E2E

## 目录

```
app.js / app.json / app.wxss   全局逻辑、页面注册、全局样式
pages/                         页面（index 首页、4 种倒班 × worker/director、diy、setting/*）
components/shift-calendar/     月日历自定义组件
utils/shift.js                 日期与取模（有符号天数差、负数取模）
utils/calendar.js              月日历渲染数据与交互
utils/holiday.js               内置法定节假日数据（每年 11 月要手工补下一年）
libs/                          LeanCloud SDK（第三方，不要改）
test/                          node:test 测试套件 + 沙箱加载器 + 金标准 fixture
.github/workflows/ci.yml       CI 门禁（Node 24，必需检查名 test）
doc/                           变更规范、待办、发布检查单、每次变更的记录
```
