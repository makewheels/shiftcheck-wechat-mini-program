# doc 目录说明 / 项目变更规范

## 变更流程（必须遵守）

1. 所有改动一律走分支 + Pull Request，**禁止直接 push 默认分支**。
2. 默认分支 `master` 已在 GitHub 开启分支保护（enforce admins）：即使管理员也必须经 PR 才能合并；禁止 force push 和删除分支。
3. 分支命名不使用斜杠 `/`（如 `feature-jjd`）。
4. PR 里写清楚：改了什么、怎么验证、风险与回滚方式。

## 变更记录

- 每次变更在 `doc/changes/` 下新增一个 markdown 文件，命名：`YYYY-MM-DD-HHMMSS-简短说明.md`。
  **一天里往往有多次提交，只写日期看不出先后也容易撞名，所以必须带时分秒**（24 小时制，取提交时的本地时间）。
- 内容至少包括：背景/目的、改动清单、验证方式、待确认项、回滚方式。
- 仓库设置类改动（分支保护、云服务配置等）也算一次变更，同样要记录。
- 参考：`doc/changes/2026-09-11-212046-doc-rules-and-todo.md`（最早的一份记录）。
  全部记录都已统一成带时分秒的格式；`test/hygiene.test.js` 会校验文件名格式、时间合法性与时间戳不重复

## 发版

- 每个版本都要**打 annotated tag + 建 GitHub Release**，顺序与命令见 `doc/发布前检查单.md` 第 8 节
- **发布说明以仓库文件为唯一事实源**：每个版本一份 `doc/releases/<version>.md`，
  GitHub Release 的正文用 `gh release create/edit --notes-file doc/releases/<version>.md` 从它同步过去。
  **不要在 GitHub 网页上直接写或改 Release 正文**，那样仓库里这份就过期了、两边会漂。
  约定与理由见 `doc/releases/README.md`
- 顺序是：写 `doc/releases/X.Y.Z.md` → 改 `app.js` 的 `appVersion`（**同一次改动**）
  → CI 绿并合并 → 打 tag → 从文件同步 Release → 上传微信。
  **还没到发版就两个都不要先动**（门禁会咬：appVersion 必须等于 `doc/releases/` 里最新版本）
- **README 不写更新日志**（2026-09-14 起只留一张指针表格）：事实源是 `doc/releases/`，
  两处维护必然漂移（2.4.0 就出现过 README 比 tag 少 7 条）
- `test/hygiene.test.js` 守四条：`app.js` 的 `appVersion` 必须等于 `doc/releases/` 里最新的版本号；
  README 里不许再内联版本更新日志；`doc/releases/<appVersion>.md` 必须存在且不是空壳；
  发布说明里的链接必须指向 tag 而不是 `master`
  （Release 是版本快照，master 会一直往前走，指向 master 的链接将来会 404 或指向另一个版本的内容）

## 待办

- 未完成事项记录在 `doc/TODO.md`，信息不全时先留空占位，确认后再实现。

## 测试

- 跑测试：`node --test test/*.test.js`（Node 18+，**零第三方依赖**；不要为此新建 `package.json`，
  仓库里出现 `package.json` 会让微信开发者工具的「构建 npm」介入，没必要添这个变量）
- 测试是纯 Node 的：用假的 `Page()` / `Component()` / `wx` / `getApp()` 沙箱加载页面 js 后直接调方法断言，
  **不启动模拟器**（也因此能在 GitHub Actions 的 Linux runner 上跑 —— 微信开发者工具没有 Linux 版）。
  沙箱在 `test/helpers/miniprogram.js`
- 十个测试文件的分工：
  - `shift.test.js` 日期与取模（负数取模是「锚点之前不算错班」的关键）
  - `holiday.test.js` 节假日数据自检（天数、补班日必为周末、官方通知日期抽查）
  - `calendar.test.js` 月历网格几何与交互（换月收敛、点日期回列表、`onDate` 还原）
  - `shift-pages.test.js` **最要紧**：锚点守卫、周期性不变量、经警队实测班表、金标准快照、列表 == 日历
  - `structure.test.js` 页面注册 / 跳转目标 / 组件声明 / wxml 事件处理函数是否齐全
  - `back-home.test.js` 深链进入（分享卡片 / 搜一搜）时页面栈只有 1 层，「返回主页」仍可用
  - `index-page.test.js` 首页是纯入口页：不发请求、不弹框（LeanCloud 链路不许回来）
  - `share.test.js` 转发接线齐全、转发卡片标题与页面标题一一对应
  - `default-banzu.test.js` 「个人模式默认班组」：设置页与 4 个个人页的读写契约
  - `hygiene.test.js` 已废弃 API、隐私接口位置、硬编码凭据、死代码复活、单文件行数上限、
    版本号与 README 一致、发布说明文件存在且链接指向 tag、变更记录文件名规范
- `test/fixtures/golden-rows.json` 是金标准快照，锁定各页已校准的班次输出。
  **只有真实班表被重新校准后**才该更新它：`GOLDEN_UPDATE=1 node --test test/shift-pages.test.js`
- 改排班相关代码：动手前跑一遍、改完再跑一遍。想知道测试是不是真能挡住问题，
  可以故意改坏一处（改锚点、把 `shift.mod` 换回 `%`）看它变红

## 本仓库速览

- 微信小程序「查班神器」，全部功能在小程序端；后端仓库 shiftcheck-server 已不再使用。
- **2.4.0 之后共 11 个页面**：首页、8 个倒班页（4 种倒班方式 × 个人 / 总览）、设置主页、个人模式默认班组。
  「上班推送」与「DIY 自定义规则」两条链路已整体删除（原因与证据见 `doc/TODO.md` 第 5 节）。
- **11 个页面全是纯本地计算，断网也能查班**（LeanCloud 使用统计已随 2.5.0 删除，全仓库零网络请求）。
  不要让任何页面开始依赖网络或登录态。
- 每个倒班页面（`pages/*/worker|director`）的 `getTotalDays()` 里的日期是**排班基准日（锚点）**，改错会导致整页显示错班，修改需谨慎。
- 天数差与取模一律用 `utils/shift.js` 的 `daysBetween()` / `mod()`：天数差是**有符号**的，
  `mod()` 对负数也返回 `[0, N)`。直接写 `Math.abs()` 或 `%` 会让锚点日之前的日期算错班。
- 首页 `pages/index/index.wxml` 按「单位 → 倒班方式 → 个人/总览」组织入口。
- **月日历视图**：`utils/calendar.js`（构建渲染数据、切换视图、换月、点日期回列表）
  + `components/shift-calendar/`（自定义组件，样式隔离）
  + `utils/holiday.js`（内置法定节假日，数据来自国务院办公厅通知，**每年 11 月下一年安排公布后要手工补**）。
  倒班页只需实现一个 `getDayCell(year, month, day)`；班次算法通过 `calendar.onDate()` 原样复用，不存在第二套逻辑。
- **全仓库没有任何功能需要 openid / 登录态** —— LeanCloud 集成（含 `app.getOpenid()`、登录、
  统计上报）已随 2.5.0 整条删除，`hygiene.test.js` 有门禁守着不许回来。
  **后台行为失败不许弹框打扰用户** —— `app.js` 里曾经有一对「取不到 openid 就补登录、
  补不上就弹阻塞式 `showModal`」的方法，唯一调用方是首页的使用统计上报，
  结果用户只想查今天上什么班却被模态框拦住。2.5.0 连同统计上报一起整条删除，门禁同样守着不许复活。
- 发布前要在微信后台做的事（域名白名单、隐私保护指引、广告位、上传提审）见 `doc/发布前检查单.md`。
