# 2026-09-21 15:18 修设置两个页面的 share require 路径（#55 引入的启动即崩）

## 背景 / 目的

PR #55（转发）给 11 个页面接 `utils/share.js` 时，**两个设置页的相对路径少写了一层**：
`pages/setting/home/home.js` 与 `pages/setting/workerDefaultBanzu/workerDefaultBanzu.js`
在仓库三层目录下，正确路径是 `../../../utils/share.js`，当时写成了 `../../utils/share.js`。

后果：真机上打开「设置」或「个人模式默认班组」页面时模块解析失败，**页面直接打不开**。
（首页与 8 个倒班页不受影响：它们分别是两层 / 三层且路径写对了。）

**为什么 CI 没拦住**：当时没有任何测试在沙箱里加载过这两个设置页 ——
`shift-pages` 只加载 8 个倒班页，`index-page` 只加载首页，设置页一次都没被 `mp.load()` 过，
require 路径错误这种「一加载就炸」的问题就这么漏过去了。

## 改动清单

- `pages/setting/home/home.js`、`pages/setting/workerDefaultBanzu/workerDefaultBanzu.js`：
  `../../utils/share.js` → `../../../utils/share.js`
- `test/structure.test.js` 新增门禁「每个注册页面都能在沙箱里加载」：
  对 app.json 注册的每个页面跑一次 `mp.load()`，顶层 require 路径错当场红。
  已按仓库惯例实测过有效性：把 home.js 的路径故意改回错的，该测试立刻红

## 验证方式

- `node --test test/*.test.js` 全绿（新增 1 条，共 154）
- 故意改坏路径 → 新门禁红（测完已还原）
- `git grep "utils/share" pages/` 复核 11 处路径：两层目录的首页 `../../`，
  其余九个三层目录页面 `../../../`

## 待确认项

- 该 bug 存在于 master 上的时间窗约 1 小时（#55 合并至今），未发过任何开发版本/线上版本，
  对外零影响

## 回滚方式

- `git revert` 本提交会重新引入 bug，不要回滚；真要撤请连同 #55 一起撤
