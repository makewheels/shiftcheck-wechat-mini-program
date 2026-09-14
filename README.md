> 给 AI agent / 新协作者的仓库须知与陷阱清单见 [`AGENTS.md`](AGENTS.md)；变更流程与测试规范见 [`doc/README.md`](doc/README.md)。

## 版本与更新日志

当前版本以 [`app.js`](app.js) 的 `appVersion` 为准（有门禁守着它与发布说明一致）。

**更新日志不在本文件里**，分两层、各有独立文件：

| 想看什么 | 去哪 |
| --- | --- |
| 某个版本对外发布了什么（新功能 / 修复带影响 / 隐私与清理 / 已知边界） | [`doc/releases/<版本>.md`](doc/releases/)，它同时是 GitHub Release 正文的唯一事实源 |
| 某次改动为什么改、怎么验证、怎么回滚 | [`doc/changes/YYYY-MM-DD-HHMMSS-说明.md`](doc/changes/) |

本文件曾内联一份「版本更新日志」，2026-09-14 移除：它与 `doc/releases/` 内容重复，
两处维护必然漂移（2.4.0 就出现过 README 比 tag 少 7 条）。2.3.0 ~ 2.3.4 的原文
保留在对应的 `doc/releases/<版本>.md` 里，没有丢。

## 变更规范

- 所有改动必须走分支 + Pull Request（默认分支 `master` 已开启保护，禁止直接 push）。
- 每次变更在 `doc/changes/` 下留一份 markdown 记录；详细规范见 `doc/README.md`。
- 待办清单见 `doc/TODO.md`。