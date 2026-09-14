# doc/releases/ —— 每个版本的发布说明

**这里的 markdown 文件是唯一事实源，GitHub Release 的正文从它同步过去。**

不要直接在 GitHub 网页上编辑 Release 正文 —— 那样仓库里这份就过期了，两边会漂，
而且网页上写的东西不能进 PR 评审、不能 diff、Release 一旦被删就彻底没了。

## 与 doc/changes/ 的分工

| | `doc/changes/` | `doc/releases/` |
| --- | --- | --- |
| 粒度 | **每次改动**一份 | **每个版本**一份 |
| 读者 | 协作者 / 未来的自己 | 用户 / 半年后想知道"这版干了啥"的人 |
| 命名 | `YYYY-MM-DD-HHMMSS-简短说明.md` | `<version>.md`（= tag `v<version>` 去掉 `v`） |
| 内容 | 背景、改动清单、验证方式、待确认项、回滚方式 | 新功能、修复（带影响）、隐私与清理、已知边界 |
| 数量关系 | 一个版本通常对应多份 changes | 一份 release 汇总它们 |

`README.md` 根目录那份「版本更新日志」是**给用户看的极简版**（每版几行）；
这里是**完整版**（带证据、带影响面、带已知边界）。两者都要有，用途不同。

## 发版时的顺序

```bash
# 1. 写 / 改这一版的发布说明
$EDITOR doc/releases/2.4.0.md

# 2. 走正常流程：分支 + PR + CI 绿 + 合并
#    （发布说明进 PR 才能被评审，这是把它放仓库里的主要理由）

# 3. 打 tag
git tag -a v2.4.0 <这一版最后一个提交> -m "查班神器 2.4.0：..."
git push origin v2.4.0

# 4. 从文件同步 Release 正文
gh release create v2.4.0 --title "<文件里的一级标题>" --notes-file doc/releases/2.4.0.md
# 已经建过的就改：
gh release edit   v2.4.0 --title "<文件里的一级标题>" --notes-file doc/releases/2.4.0.md
```

完整流程与踩过的坑见 `doc/发布前检查单.md` 第 8 节。

## 两条硬规矩（`test/hygiene.test.js` 有门禁守着）

1. **`app.js` 的 `appVersion` 必须有对应的 `doc/releases/<version>.md`**，且内容不能是空壳。
   这条门禁就是为了防止"版本发出去了、发布说明只写在 GitHub 网页上"
2. **文件里的链接一律指向 tag，不指向 `master`**（`/blob/v2.4.0/...` 而不是 `/blob/master/...`）。
   Release 是**某个版本的快照**，而 `master` 会一直往前走：指向 master 的链接将来要么 404，
   要么更糟 —— 点开看到的是**另一个版本**的内容，跟这条 Release 描述的东西对不上。
   指向 tag 就永远解析到打 tag 那一刻的文件树，哪怕那个文件以后从 master 上删了也照样能打开

## 标题约定

Release 标题（= 文件一级标题）以**版本号开头**，不带产品名前缀：

```
2.4.0：月日历视图、收敛成纯离线查班工具、一批发布前修复
```

产品名在仓库名里已经有了，标题里再写一遍是噪音；而且 releases 列表页扫过去时
版本号左对齐才好比较。2026-09-14 把 13 个 Release 统一成了这个格式。

改标题要**文件和 Release 一起改**：

```bash
gh release edit vX.Y.Z --title "<新的一级标题>" --notes-file doc/releases/X.Y.Z.md
```

只改一边，两边就漂了（这正是本目录要消灭的那类问题）。

## 文件头的引用块

每个文件开头有一段 `>` 引用块，写明它对应哪个 Release、以及怎么同步回去。
那段是给人看的提示，`gh release edit --notes-file` 会把它一起发上去 ——
这是有意的：Release 页面上也该写着"改这个请去改仓库里的文件"，
否则下一个人还是会在网页上直接编辑。
