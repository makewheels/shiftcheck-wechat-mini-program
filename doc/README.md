# doc 目录说明 / 项目变更规范

## 变更流程（必须遵守）

1. 所有改动一律走分支 + Pull Request，**禁止直接 push 默认分支**。
2. 默认分支 `master` 已在 GitHub 开启分支保护（enforce admins）：即使管理员也必须经 PR 才能合并；禁止 force push 和删除分支。
3. 分支命名不使用斜杠 `/`（如 `feature-jjd`）。
4. PR 里写清楚：改了什么、怎么验证、风险与回滚方式。

## 变更记录

- 每次变更在 `doc/changes/` 下新增一个 markdown 文件，命名：`YYYY-MM-DD-简短说明.md`。
- 内容至少包括：背景/目的、改动清单、验证方式、待确认项、回滚方式。
- 仓库设置类改动（分支保护、云服务配置等）也算一次变更，同样要记录。
- 参考：`doc/changes/2026-09-11-doc-rules-and-todo.md`

## 待办

- 未完成事项记录在 `doc/TODO.md`，信息不全时先留空占位，确认后再实现。

## 本仓库速览

- 微信小程序「查班神器」，全部功能在小程序端；后端仓库 shiftcheck-server 已不再使用。
- 每个倒班页面（`pages/*/worker|director`）的 `getTotalDays()` 里的日期是**排班基准日（锚点）**，改错会导致整页显示错班，修改需谨慎。
- 首页 `pages/index/index.wxml` 按「单位 → 倒班方式 → 个人/总览」组织入口。
