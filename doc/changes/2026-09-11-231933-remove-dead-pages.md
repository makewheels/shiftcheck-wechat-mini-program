# 2026-09-11 23:19 删除两个死页面：feedback（空占位）与 logs（模板默认、无入口）

## 背景/目的

发版前清掉两个"存在但永远走不到"的页面。它们不会崩，但会：

- 占注册位与包体（`app.json` 里注册的页面一定会被打包，`ignoreUploadUnusedFiles` 不会排除它们）
- 给审核员留死角：万一以后有人把入口按钮的注释放开，点进去就是一片空白
- 让后来人误以为"反馈功能已经有了"

**feedback**：`feedback.wxml` 全部内容只有一行占位文字「反馈：内容，联系方式」（30 字节，无换行），
`feedback.js` 是小程序模板的默认空壳（`onShareAppMessage` 返回空对象），
`home.wxml` 里的入口按钮是**注释掉的**：`<!-- <button bindtap="toFeedback">反 馈</button> -->`。
即：页面注册着、代码在仓库里，但没有任何用户能到达，且到达了也是空白页。

**logs**：小程序初始模板自带的示例页，内容还是模板默认（读 storage 里的 logs 拼列表）。
唯一"入口"是 `index.js` 的 `bindViewTap()`（`wx.navigateTo({ url: '../logs/logs' })`），
而 `index.wxml` 里**没有任何元素绑定 `bindViewTap`** —— 所以这个函数是死的，页面永远进不去。

## 改动清单

- 删除 `pages/setting/feedback/`（4 个文件）与 `pages/logs/`（4 个文件）
- `app.json`：移除这两个页面的注册（注册页面数 22 → 20）
- `pages/index/index.js`：删除 `bindViewTap()`（它唯一的作用就是跳 logs）
- `pages/setting/home/home.js`：删除 `toFeedback()`（它唯一的作用就是跳 feedback）
- `pages/setting/home/home.wxml`：删除那行注释掉的「反 馈」按钮
- `doc/TODO.md` 第 5 条：把这两项从待办划掉，指向本记录

## 验证方式

- 全仓库检索 `feedback` / `logs/logs` / `bindViewTap` / `toFeedback`：**0 处残留**
- `node --test test/*.test.js`：**107 项全部通过**。其中两条门禁正好覆盖这类问题：
  - `structure.test.js`：`app.json` 注册的页面必须文件齐全、代码里所有 `navigateTo` 目标必须已注册、
    wxml 里 `bind*` 绑定的处理函数必须在 js 中存在 —— 少删一处引用就会红
  - `structure.test.js` 还断言"磁盘上的页面目录必须都已注册"，反过来也不留死目录
- `node --check` app.js / index.js / home.js 通过；`app.json` 解析通过
- 界面级验证待补（本机开发者工具 CLI 服务端口未开启，命令行编译/预览用不了）：
  合并后需要在模拟器里点一遍设置页，确认「个人模式默认班组」「订阅上班推送」「我的账户」等按钮仍正常

## 待确认项

- **以后要不要真的做反馈入口？** 如果要，建议直接用微信官方的「意见反馈」能力
  （`button open-type="feedback"`）或小程序后台的反馈管理，比自己写一个页面 + LeanCloud 表省事，
  也不用处理联系方式的隐私声明
- 删掉的页面在 git 历史里，需要时 `git log --diff-filter=D -- pages/setting/feedback/` 可取回

## 回滚方式

- revert 本提交即恢复两个页面、`app.json` 注册与两个跳转函数（但反馈页仍然是空白的）
