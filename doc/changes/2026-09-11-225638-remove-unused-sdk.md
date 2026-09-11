# 2026-09-11 22:56 删除未使用的 LeanCloud 打包版 SDK（libs/av-weapp-min.js）

## 背景/目的

`libs/` 下原有三个文件，其中 `av-weapp-min.js`（165 KB）**全仓库没有任何真实引用**，
唯一的"引用"是 `app.js` 第 4 行一句注释掉的 require：

```js
const AV = require('./libs/av-core-min.js');
const adapters = require('./libs/leancloud-adapters-weapp.js');

// const AV = require('./libs/av-weapp-min.js')   ← 只有这一行提到它
```

LeanCloud 的小程序 SDK 有两种用法，**二选一**：

- `av-weapp-min.js`：打包版，内置适配器，`require` 进来直接 `AV.init()`
- `av-core-min.js` + `leancloud-adapters-weapp.js`：核心 + 独立适配器，需要先 `AV.setAdapters(adapters)`

本项目用的是后者（`app.js` 里就是 `AV.setAdapters(adapters)` 再 `AV.init(...)`），
所以打包版是历史遗留的另一条路，留着只会让后来人分不清"到底该用哪个"。

## 改动清单

- 删除 `libs/av-weapp-min.js`（165 KB）
- `app.js`：删掉那行注释掉的 require（以及它留下的多余空行）
- `test/helpers/miniprogram.js`：沙箱里拦截 SDK require 的正则去掉 `av-weapp-min` 一项
  （留着也不报错，但那是个指向已删除文件名的死模式）

`libs/` 现在只剩两个**都在用**的文件：`av-core-min.js`（203 KB，`app.js` + 11 个页面 require）、
`leancloud-adapters-weapp.js`（38 KB，`app.js` require）。

## 影响说明（避免误解）

- **上传到微信的包体积不变**：`project.config.json` 里 `ignoreUploadUnusedFiles: true`，
  未被引用的文件本来就不会被打进上传包。这次删掉的是**仓库重量**（165 KB）和认知负担，
  不是线上包体积
- 运行行为零变化：删掉的文件从来没有被加载过

## 验证方式

- 全仓库检索 `av-weapp-min`：除本变更记录的叙述外 **0 处残留**
- `node --test test/*.test.js`：**107 项全部通过**
- `node --check app.js` 通过；`app.js` 头部三行结构核对无误（两个 require + `AV.setAdapters`）
- `libs/` 目录核对：只剩 `av-core-min.js` 与 `leancloud-adapters-weapp.js`

## 待确认项

- 无。如果哪天要换成打包版 SDK，从 git 历史里取回即可（`git log --diff-filter=D -- libs/`）

## 回滚方式

- revert 本提交即恢复文件与那行注释
