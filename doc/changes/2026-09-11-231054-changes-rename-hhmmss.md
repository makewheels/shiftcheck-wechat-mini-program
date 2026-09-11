# 2026-09-11 23:10 追溯重命名 12 份变更记录为时分秒格式，并把门禁收紧到不再放行旧格式

## 背景/目的

`2026-09-11-213822-change-record-naming.md` 那次只改了规范、没有追溯重命名，
理由是"改名会让已合并 PR 正文里的链接失效"。要求改成**所有记录都用时分秒格式**，
所以这次把剩下的 12 份补齐，并且把门禁收紧到不再放行旧格式（否则规范等于半截子）。

## 改动清单

**1. 重命名 12 份记录**（`git mv`，保留历史）

时间戳取**该记录随其变更落到 master 的提交时间**，而不是当初起草的时间 ——
这样文件名排序与 PR 合并顺序一致，不会出现"第 5 个 PR 的记录时间比第 1 个还早"：

| 旧名 | 新名 |
| --- | --- |
| `2026-09-11-doc-rules-and-todo.md` | `2026-09-11-212046-doc-rules-and-todo.md` |
| `2026-09-11-index-unit-rename.md` | `2026-09-11-212119-index-unit-rename.md` |
| `2026-09-11-jjd-shift.md` | `2026-09-11-212139-jjd-shift.md` |
| `2026-09-11-sync-devtools-config.md` | `2026-09-11-212158-sync-devtools-config.md` |
| `2026-09-11-reverse-date-fix.md` | `2026-09-11-212218-reverse-date-fix.md` |
| `2026-09-11-month-calendar.md` | `2026-09-11-212251-month-calendar.md` |
| `2026-09-11-month-calendar-rollout.md` | `2026-09-11-212312-month-calendar-rollout.md` |
| `2026-09-11-force-update-fix.md` | `2026-09-11-212331-force-update-fix.md` |
| `2026-09-11-auth-gate-removal.md` | `2026-09-11-212351-auth-gate-removal.md` |
| `2026-09-11-login-crash-hardening.md` | `2026-09-11-212421-login-crash-hardening.md` |
| `2026-09-11-privacy-and-dead-code.md` | `2026-09-11-212442-privacy-and-dead-code.md` |
| `2026-09-11-release-2.4.0.md` | `2026-09-11-212503-release-2.4.0.md` |

**2. 全量更新仓库内引用**：`doc/TODO.md`、`doc/README.md`、`AGENTS.md`、
`doc/发布前检查单.md` 以及各份记录之间的互相引用（脚本替换，按名字长度倒序避免
`month-calendar` 误命中 `month-calendar-rollout`）。

**3. 12 份记录的正文标题也补上时分秒**（`# 2026-09-11 新增…` → `# 2026-09-11 21:20 新增…`），
与文件名一致。

**4. 收紧门禁**：`test/hygiene.test.js` 里那条文件名检查原本放行"规范调整前的旧格式"，
现在**取消豁免**，并加强为三条断言：
- 文件名必须匹配 `^\d{4}-\d{2}-\d{2}-\d{6}-<说明>\.md$`
- 日期与时间部分必须是合法值（月 1-12、日 1-31、时 ≤23、分秒 ≤59）
- **时间戳两两不重复**（重复就又分不清先后了，正是要解决的问题）

**5. 修正两处已经过期的叙述**：`doc/README.md` 里"之前的记录保持原名"、
以及 `213822` 那份记录里"没有追溯重命名"的段落，都改成指向本次变更。

## 代价（说清楚）

- **12 个已合并 PR 的正文里，指向这些记录的链接现在指向旧文件名**，点开是 404。
  PR 正文是不可变的历史，改不了。要看当时那份记录，走 git 历史：
  `git log --diff-filter=R --follow -- doc/changes/<新名>` 或直接 `git show <PR 合并的 commit>:doc/changes/<旧名>`
- 仓库内部的引用已全部更新，`test/hygiene.test.js` 与 `test/structure.test.js`
  会继续兜住"文档引用了不存在的路径"这类问题

## 验证方式

- `node --test test/*.test.js`：**107 项全部通过**（测试条数不变，但文件名那条检查
  从 1 条断言加强到 3 条：格式、时间合法性、时间戳不重复）
- 全仓库检索旧文件名：除本记录里的对照表与 `213822` 记录中的历史叙述外，**0 处残留引用**
- `ls doc/changes/` 核对：21 份记录全部是 `YYYY-MM-DD-HHMMSS-` 格式，
  时间戳从 212046 到 231054 单调递增、`uniq -d` 无重复
- **门禁反向验证**：把其中一份记录改回旧格式名 → 文件名检查立刻变红（106 pass / 1 fail），改回新名后恢复全绿
- 提交后用 `git log --follow` 抽查，确认改名后历史仍可追溯（见下）

## 回滚方式

- revert 本提交即恢复 12 个旧文件名与旧引用；门禁会同时退回"放行旧格式"的版本
