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
- 参考：`doc/changes/2026-09-11-doc-rules-and-todo.md`（本次调整之前的记录保持原名，避免打断已合并 PR 里的链接）

## 待办

- 未完成事项记录在 `doc/TODO.md`，信息不全时先留空占位，确认后再实现。

## 测试

- 跑测试：`node --test test/*.test.js`（Node 18+，**零第三方依赖**；不要为此新建 `package.json`，
  仓库里出现 `package.json` 会让微信开发者工具的「构建 npm」介入，没必要添这个变量）
- 测试是纯 Node 的：用假的 `Page()` / `Component()` / `wx` / `getApp()` 沙箱加载页面 js 后直接调方法断言，
  **不启动模拟器**（也因此能在 GitHub Actions 的 Linux runner 上跑 —— 微信开发者工具没有 Linux 版）。
  沙箱在 `test/helpers/miniprogram.js`
- 六个测试文件的分工：
  - `shift.test.js` 日期与取模（负数取模是「锚点之前不算错班」的关键）
  - `holiday.test.js` 节假日数据自检（天数、补班日必为周末、官方通知日期抽查）
  - `calendar.test.js` 月历网格几何与交互（换月收敛、点日期回列表、`onDate` 还原）
  - `shift-pages.test.js` **最要紧**：锚点守卫、周期性不变量、经警队实测班表、金标准快照、列表 == 日历
  - `structure.test.js` 页面注册 / 跳转目标 / 组件声明 / wxml 事件处理函数是否齐全
  - `hygiene.test.js` 已废弃 API、隐私接口位置、硬编码凭据、死代码复活、版本号与 README 一致
- `test/fixtures/golden-rows.json` 是金标准快照，锁定各页已校准的班次输出。
  **只有真实班表被重新校准后**才该更新它：`GOLDEN_UPDATE=1 node --test test/shift-pages.test.js`
- 改排班相关代码：动手前跑一遍、改完再跑一遍。想知道测试是不是真能挡住问题，
  可以故意改坏一处（改锚点、把 `shift.mod` 换回 `%`）看它变红

## 本仓库速览

- 微信小程序「查班神器」，全部功能在小程序端；后端仓库 shiftcheck-server 已不再使用。
- 每个倒班页面（`pages/*/worker|director`）的 `getTotalDays()` 里的日期是**排班基准日（锚点）**，改错会导致整页显示错班，修改需谨慎。
- 天数差与取模一律用 `utils/shift.js` 的 `daysBetween()` / `mod()`：天数差是**有符号**的，
  `mod()` 对负数也返回 `[0, N)`。直接写 `Math.abs()` 或 `%` 会让锚点日之前的日期算错班。
- 首页 `pages/index/index.wxml` 按「单位 → 倒班方式 → 个人/总览」组织入口。
- **月日历视图**：`utils/calendar.js`（构建渲染数据、切换视图、换月、点日期回列表）
  + `components/shift-calendar/`（自定义组件，样式隔离）
  + `utils/holiday.js`（内置法定节假日，数据来自国务院办公厅通知，**每年 11 月下一年安排公布后要手工补**）。
  倒班页只需实现一个 `getDayCell(year, month, day)`；班次算法通过 `calendar.onDate()` 原样复用，不存在第二套逻辑。
- **取 openid 一律用 `app.getOpenid()`（同步、可能为 null）或 `app.withOpenid(cb)`（未登录先补登录）**，
  不要再写 `AV.User.current().toJSON()`：冷启动首次登录还没回来时那样会直接崩页。
- 发布前要在微信后台做的事（域名白名单、隐私保护指引、广告位、上传提审）见 `doc/发布前检查单.md`。
