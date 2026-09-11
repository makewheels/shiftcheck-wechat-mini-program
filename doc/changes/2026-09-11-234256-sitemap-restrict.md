# 2026-09-11 23:42 收紧 sitemap：只开放首页与 8 个倒班查询页给微信索引

## 背景/目的

`sitemap.json` 原来是全开放：

```json
{ "rules": [{ "action": "allow", "page": "*" }] }
```

意思是 20 个注册页面全部允许被微信「搜一搜」索引，用户可以**直接从搜索结果/扫码/分享卡片
进入任意一个页面**（此时页面栈深度为 1）。这带来两个问题：

1. **含个人信息输入的页面被索引**：`accountHome`（我的账户）、`updateMail`（设置邮箱）、
   `updatePhone`（设置手机）这些页面本身就是让用户填手机号和邮箱的，没有理由出现在搜索结果里；
   `pushHome` / `newPushMission` / `importRuleByKey` / `myRuleHome` / `diyPush` 同理，
   都依赖登录态与已有数据，从外部直达时体验是"一片 loading 或空列表"
2. **深链进入会放大另一个已知缺陷**：8 个倒班页的「返回主页」都是无条件 `wx.navigateBack({})`，
   页面栈只有 1 层时它静默失败、按钮点了没反应（该项由后续单独一个变更修）

## 改动清单

- `sitemap.json`：改成**白名单 + 兜底拒绝**（微信的规则是第一条匹配生效，所以 allow 必须排在 disallow 前）
  - `allow`：首页 `pages/index/index` + 8 个倒班查询页
    （`wbsd` / `sbsd` / `sbbd` / `jjd` 各自的 `worker` 与 `director`）
    —— 这 9 个页面是自足的：不依赖登录态、不需要已有数据，被搜到直接就能用，
    也正是这个小程序真正对外有价值的部分
  - `disallow`：`*` 兜底，其余 11 个页面（`diy`、`diyPush`、`setting/*`）一律不索引
- `project.config.json`：`setting.checkSiteMap` `false` → **`true`**
  （原来关着，开发者工具不会校验 sitemap 配置，写错了也不报）
- `test/structure.test.js`：新增门禁，断言
  1. 每条规则的 `action` 合法、`page` 非空
  2. 规则里引用的页面**都已在 `app.json` 注册**（防止改名后 sitemap 变成死引用）
  3. **最后一条必须是 `disallow` + `*`**（防止有人图省事又改回全开放）
  4. 8 个敏感/依赖登录态的页面关键字**不得出现在任何 allow 规则里**

## 验证方式

- `node --test test/*.test.js`：**110 项全部通过**（新增 1 项 sitemap 门禁）
- `sitemap.json` 与 `project.config.json` 均通过 JSON 解析；
  `project.config.json` 的 diff 复核确认只有 `checkSiteMap` 一行变化（未被整体重排）
- 规则条数与 `app.json` 交叉核对：allow 的 9 个页面全部在注册列表里
- **界面级/线上效果待验证**：sitemap 的实际索引效果要在微信后台「搜一搜」或真机搜索里看，
  且索引更新有延迟；本机开发者工具 CLI 服务端口未开启，无法命令行编译预览

## 待确认项

- 是否希望 `diy`（我的 DIY 规则）也被索引？当前**不开放**，因为它依赖登录态与已导入的规则，
  外部直达只会看到空状态。如果你希望它可被搜到，需要先给它加"未登录/无规则"的空态引导
- 兜底 `disallow` 意味着**以后新增页面默认不被索引**。这是有意的（默认安全），
  新增页面若确实希望被搜到，要显式加一条 allow，门禁会保证它已注册

## 回滚方式

- revert 本提交即恢复 `allow *` 与 `checkSiteMap: false`
