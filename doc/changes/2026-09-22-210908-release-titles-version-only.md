# 2026-09-22 21:09 Release 标题统一成纯版本号，去掉冒号后的描述

## 背景/目的

用户反馈：GitHub Release 列表里标题带描述太长，要求 title 只留版本号。
这是继 f0542a5（H1 去掉「查班神器」前缀）之后的第二次收敛。

按「仓库文件是唯一事实源，Release 是投影」的约定，两边必须同一次改：
H1 与 Release title 一直保持一致（gh release 的 title 历来从 H1 派生），
只改 GitHub 侧会造成投影与源漂移，下次同步又会漂回来。

## 改动清单

- `doc/releases/` 全部 14 份（2.0.0 ~ 2.5.0）：H1 `# X.Y.Z：描述` → `# X.Y.Z`
  （版本含义在正文「本版改动」/「包含」里本来就有，信息不丢）
- 合并后逐个 `gh release edit vX.Y.Z --title "X.Y.Z" --notes-file doc/releases/X.Y.Z.md`
  重新同步 14 个 Release（title 与正文一起，保持投影一致）
- 不改代码；`appVersion` 与发布说明文件的对应关系不变

## 验证方式

- `node --test test/*.test.js` 全绿（hygiene 对发布说明的门禁是
  文件存在/非空壳/链接指向 tag，与 H1 文案无关）

## 回滚方式

`git revert` + `gh release edit` 逐个改回（描述文案在 git 历史里）
