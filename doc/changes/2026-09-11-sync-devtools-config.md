# 2026-09-11 同步开发者工具生成的项目配置；首次纳入 project.private.config.json

## 背景/目的

- 本机用微信开发者工具 2.02.2608070 打开项目后，工具自动改写了 `project.config.json`，产生了未提交的差异；同时本地一直存在未被跟踪的 `project.private.config.json`。
- 按要求把工作区所有未提交内容一并入库，避免本地长期带着脏工作区。

## 改动清单

- `project.config.json`（工具自动生成，非人工业务改动）：
  - `setting` 新增 `compileWorklet: false`、`localPlugins: false`、`condition: false`
  - 新增顶层 `packOptions: {ignore:[], include:[]}`、`editorSetting: {}`
  - 移除空的 `scripts` 块（`beforeCompile`/`beforePreview`/`beforeUpload` 三项原本都是空字符串）
  - **`appid` 保持 `wx46b9f529e9244893` 不变**：期间工具曾把它改成游客模式的 `touristappid`，本次提交前已改回正式 appid，故 diff 中不含 appid 变化
  - `libVersion` 仍为 `2.8.2`，未改
- `project.private.config.json`（**首次纳入版本控制**）：内容为本地开发设置，无任何密钥/凭据
  - `libVersion: "2.25.3"`、`projectname`、`condition: {}`
  - `setting`：`urlCheck: false`（本地关闭域名校验）、`compileHotReLoad: true`、`skylineRenderEnable: false`、`useLanDebug: false` 等

## 已知影响 / 注意事项

- 微信官方建议把 `project.private.config.json` 加入 `.gitignore`（它本就是"每个开发者本地私有"的配置）。本次按明确要求入库；若日后出现多人协作或本地设置互相覆盖，可改为忽略并各自保留本地副本。
- 该文件里的 `libVersion: "2.25.3"` 会覆盖 `project.config.json` 的 `2.8.2`。本机已离线预置 2.25.3 基础库，可正常编译；换到没有预置基础库且无法访问 `servicewechat.com` 的机器上，开发者工具会把它归一化到内置列表的最高版本并尝试联网下载。
- `urlCheck: false` 是本地放宽域名校验，**只影响开发者工具里的调试，不影响线上**（线上域名白名单由小程序后台配置决定）。

## 验证方式

- 两个 JSON 均通过 Node `require()` 解析，格式合法。
- `git diff` 复核：`project.config.json` 的差异中不含 `appid` 行，确认正式 appid 未被提交成游客 appid。
- 开发者工具在配置变更后自动重编译，`WeappLog` 无编译错误。

## 回滚方式

- revert 本次提交即可恢复原 `project.config.json`；`project.private.config.json` 会回到未跟踪状态（文件本身不会被删除）。
