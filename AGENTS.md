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
  硬编码凭据、死代码复活、单文件行数上限、版本号与 README 一致、发布说明文件存在且链接指向 tag、
  变更记录文件名规范）
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
6. 提交信息只描述程序改动。**不要**出现：第三方工具/模型署名（`Co-Authored-By` 之类）、<!-- hygiene-allow-line -->
   作者雇主与开发环境信息（企业代理、内网证书、公司网络状况）、企业邮箱
   —— 这是公开仓库，提交身份统一用 `makewheels <makewheels@github.com>`
   （上面那行末尾的 `hygiene-allow-line` 标记是必须的：`hygiene.test.js` 会扫全仓库找署名，
   而这条规则本身必须写出被禁的字样。豁免只允许用在文档里，用在代码文件会被测试拦下）
7. **发布说明先进仓库，再同步到 GitHub Release**：每个版本一份 `doc/releases/<version>.md`，
   Release 正文用 `gh release create/edit --notes-file doc/releases/<version>.md` 从它生成。
   **不要在 GitHub 网页上直接写或改 Release 正文** —— 仓库文件是唯一事实源，Release 只是它的投影；
   反过来做的话仓库里这份会过期、两边漂、而且网页上写的东西进不了 PR 评审也不能 diff。
   发布说明里的链接一律指向 tag（`/blob/vX.Y.Z/...`）而不是 `master`：Release 是版本快照，
   master 会一直往前走，指向 master 的链接将来要么 404、要么点开是另一个版本的内容。
   这三条都有门禁守着（`appVersion` 对应的文件必须存在、不能是空壳、不许出现 `/blob/master/`）

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

- 取 openid **只能**用 `app.getOpenid()`（同步、未登录返回 `null`），拿不到就由调用方自己静默跳过。
  **不要**写 `AV.User.current().toJSON()`：未登录时 `current()` 是 `null`，
  直接 `.toJSON()` 就 TypeError 白屏。这个坑踩过两次（README 2.3.3 记过一次，2.4.0 又统一收了 21 处）
- **后台行为失败不许弹框打扰用户。** `app.js` 里曾经有一对「取不到 openid 就补登录、
  补不上就弹阻塞式 `showModal`」的方法，唯一调用方是首页的使用统计上报 ——
  而首页 8 个倒班入口全是本地计算、根本不需要登录。结果网络不通或后端域名失效时，
  每个用户一打开首页就被拦一下。已整对删除，`hygiene.test.js` 有门禁守着不许复活。
  判断标准很简单：**这个调用失败了，用户会在意吗？** 不会就静默 return，别弹任何东西
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
- **2.4.0 之后全仓库没有任何微信隐私接口调用**（剪贴板随 DIY 激活码导入页删除、
  邮箱手机号随推送链路删除、从来没有定位）。这意味着后台《用户隐私保护指引》没有必须声明的接口项 ——
  这是个很值钱的性质，`hygiene.test.js` 用**零容忍**门禁守着：剪贴板 / 定位 / 收货地址一出现就红。
  要加任何隐私接口之前，先想清楚是不是真的需要，并且同步更新后台声明与 `doc/发布前检查单.md`
- 现在只有首页的使用统计上报还连 LeanCloud（`pages/index/index.js` 的 `mystep2()`）；
  **8 个倒班页与设置页都是纯本地计算，断网也能查班** —— 不要让它们开始依赖网络或登录态
- 不要把任何 token / key / secret 写进代码。历史上硬编码过两个 ip138 token，随公开仓库泄露，只能作废重置
- 已废弃 API 不要再用：`wx.getSystemInfoSync`（用 `wx.getSystemInfo`）、`wx.getUserInfo`、`wx.getUserProfile`
  （都只返回匿名数据）。要头像昵称用官方的"头像昵称填写能力"：
  `<button open-type="chooseAvatar">` + `<input type="nickname">`
- `hygiene.test.js` 会把上面这些禁用写法直接测红

## 本机验证的边界

- 逻辑层验证靠 `node --test test/*.test.js`（排班算法、日历、结构、隐私卫生），本地与 CI 跑的是同一套
- **界面层（渲染、换行、点击手感）测不了，必须人工在模拟器或真机看** —— 交付时要说清哪些没验过，
  不要把"测试通过"说成"界面没问题"
- CI 里跑不了模拟器（开发者工具没有 Linux 版），所以「CI 绿」永远不等于「界面没问题」

### 命令行上传（2026-09-14 实测跑通）

前提：工具 → 设置 → 安全设置 → **服务端口开启**，且已登录。

```bash
cli islogin        # 返回 {"login":true} 才算登录着
cli upload --project <仓库绝对路径> --version 2.4.0 --desc "本次改动摘要"
```

成功时长这样，`size` 是代码包体积：

```
✔ Using AppID: wx46b9f529e9244893
- Upload
│ TOTAL │ '260.9 KB' │ 267178 │
✔ upload
```

**两个真踩过的坑，共同点是报错文案会把人引到错误方向：**

1. **发网络请求的是 IDE 主进程，不是 CLI 进程。** `cli` 只是通过 `http://127.0.0.1:10182`
   把活派给已经在跑的工具（输出里那句 `IDE server has started` 是"连上了"，不是"我启动了"）。
   所以任何影响 TLS 的环境变量都必须在**启动工具的那个进程**上生效，
   给跑 `cli` 的 shell 设是无效的。工具是常驻进程，改完环境变量必须**整个退出再启动**：
   `cli quit` 之后要确认进程数归零，残留进程会继续占着 10182 端口应答，
   让你以为重启过了其实还在用旧进程。

2. **证书链验证失败会伪装成权限错误。** 症状链：
   `requestProjectAttr` 失败 → 工具拿不到项目属性 → 进度条打出
   `Fetching AppID () permissions`（**括号是空的，这是关键指纹**）→
   拿着空 appid 去问权限 → 弹「**登录用户不是小程序开发者**」。
   看到这句**先怀疑证书，别先去后台查成员权限**：appid 都没读到，权限校验问的是"空气"。
   如果本机出网要经过会重签 TLS 证书的代理，工具的 Node 侧就会报
   `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`，修法是给**工具主进程**配 `NODE_EXTRA_CA_CERTS`
   指向一份包含该根的 PEM（Electron 在 `ELECTRON_RUN_AS_NODE` 与 GUI 两种模式下都认这个变量，
   已实测）。判据：翻工具日志里 `issuer certificate` 的条数，修好后应为 0。
   日志目录在用户数据下的 `WeappLog\logs\`（Windows 是 `%LOCALAPPDATA%\微信开发者工具\User Data\<hash>\`）。
   ⚠ 同一份日志里会**一半请求成功一半失败**：走 Electron `net` 的（扫码登录、`devsync` 等 CGI）
   用系统证书库所以正常，走 Node `https` 的（上传、插件下载、基础库下载、`requestProjectAttr`）才失败。
   别据此判断成"网络时好时坏"。

## 目录

```
app.js / app.json / app.wxss   全局逻辑、页面注册、全局样式
pages/                         11 个页面：index 首页、4 种倒班 × worker/director、setting/home、setting/workerDefaultBanzu
components/shift-calendar/     月日历自定义组件
utils/shift.js                 日期与取模（有符号天数差、负数取模）
utils/calendar.js              月日历渲染数据与交互
utils/holiday.js               内置法定节假日数据（每年 11 月要手工补下一年）
libs/                          LeanCloud SDK（第三方，不要改）
test/                          node:test 测试套件 + 沙箱加载器 + 金标准 fixture
.github/workflows/ci.yml       CI 门禁（Node 24，必需检查名 test）
doc/README.md                  变更流程与测试规范
doc/changes/                   每次变更一份记录（YYYY-MM-DD-HHMMSS-简短说明.md）
doc/releases/                  每个版本一份发布说明（<version>.md）；GitHub Release 从它同步，别反过来
doc/TODO.md                    待办与已删除功能的备查记录
doc/发布前检查单.md             微信后台配置、上传提审、发版收尾顺序、真机自测清单
```
