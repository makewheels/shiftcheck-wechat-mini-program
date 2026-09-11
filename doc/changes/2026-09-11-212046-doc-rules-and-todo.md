# 2026-09-11 21:20 建立变更规范（doc）与经警队待办；master 开启分支保护

## 背景/目的

- 为仓库建立「必须经 PR 才能进 master + 每次变更留 markdown 记录」的规矩。
- 经警队排班需求信息不全（班组数、排班基准日期待确认），先记录为待办，确认后再实现。

## 改动清单

- 新增 `doc/README.md`：项目变更规范
- 新增 `doc/TODO.md`：待办（经警队 上一天休三天）
- 新增本文件：第一条变更记录
- `README.md`：补充变更规范入口
- GitHub 设置：`master` 开启分支保护（必须 PR、enforce admins、禁 force push / 禁删除；时间 2026-09-11；改动前：无保护）

## 验证方式

- `gh api repos/makewheels/shiftcheck-wechat-mini-program/branches/master/protection` 返回 need_pr=true、enforce_admins=true。
- 本 PR 即流程验证：对 master 的直接推送会被拒绝。

## 待确认项

- 经警队班组数、排班基准日期（见 `doc/TODO.md` 第 1 条）。
- 倒班页「一周列表 / 月日历」切换 + 法定假期显示（见 `doc/TODO.md` 第 2 条）。

## 回滚方式

- 文档改动：revert 本 PR。
- 分支保护：`gh api -X DELETE repos/makewheels/shiftcheck-wechat-mini-program/branches/master/protection`
