# 2026-09-11 21:24 移除首页静默采集（剪贴板 / IP）与硬编码 token，清理死代码

## 背景/目的

首页 `onLoad` 会在启动 800ms 后调 `mystep2()` 上报一条使用记录，其中包含两项**用户完全无感、
也与「查班」这个核心功能无关**的采集：

```js
wx.getClipboardData({                     // ← 读剪贴板
  success: function(clipboard) {
    wx.request({
      url: 'https://api.ip138.com/query/?&token=<硬编码的 token，此处已抹掉>',   // ← 查 IP，token 直接写在代码里
      success: function(ip) {
        var res = wx.getSystemInfoSync()
        new UseMessage({ …, ipjson: ip.data, clipboard: clipboard.data, … }).save()
      }
    })
  }
})
```

三个问题：

1. **读剪贴板**属于微信「用户隐私接口」，必须在小程序后台的《用户隐私保护指引》里声明，
   并处理隐私授权弹窗；后台静默读取用户剪贴板也是监管通报里的高频项。
2. **查 IP 并入库**：`ipjson` 里含 `ipInfo.owner`（线路/机构名），属于可关联到人的信息，同样要声明；
   而且它需要 `api.ip138.com` 进 request 合法域名白名单。
3. **ip138 的 token 硬编码在代码里**，而这是个公开仓库 —— 等于把付费接口的凭据公开了。

## 改动清单

- `pages/index/index.js`
  - `mystep2()` 重写：**不再读剪贴板、不再请求 ip138**，上报字段里去掉 `clipboard` 与 `ipjson`
  - 保留基础使用统计：时间、场景值、openid、网络类型、屏幕亮度、机型/系统/窗口等设备信息
  - `wx.getSystemInfoSync()`（已废弃）→ `wx.getSystemInfo()`（异步版，字段一致）
  - 整个上报包进 `app.withOpenid(...)`，未登录时不上报而不是崩
  - 删掉两个从未使用的变量：`var Avatar = AV.Object.extend('Avatar')`、`let videoAd = null`
- `app.js`：删掉 `// var mta = require('./libs/mta_analysis.js')` 这行注释（MTA 统计 2.3.3 就已经移除了）
- **删除 `libs/mta_analysis.js`**：全仓库唯一引用就是上面那行注释，属于死文件

## 保留未动的部分（说明理由）

- `pages/setting/importRuleByKey/importRuleByKey.js` 里的 `wx.getClipboardData` **保留**：
  它是用户主动点「一键粘贴」按钮才触发的，用来把规则激活码填进输入框，属于正当用法。
  但它仍然是隐私接口，**需要在《用户隐私保护指引》里声明「剪贴板」**（见 `doc/发布前检查单.md`）。
  如果不想声明，替代做法是去掉这个按钮，让用户自己长按输入框粘贴。
- `libs/av-weapp-min.js` 保留：它是 LeanCloud 的另一个打包版本，`app.js` 里有一行注释掉的 require，
  属于作者留的备选，不是死代码。`project.config.json` 的 `ignoreUploadUnusedFiles: true` 也不会把它打进包。

## 必须线下处理的一件事（代码改不了）

- **两个 ip138 token 都已经在公开仓库的 git 历史里**，本次只是从当前代码中移除，历史里仍然可见：
  - `12ff…8129`（`pages/index/index.js`，2.3.0 起）
  - `2da1…b1b72`（原 `pages/setting/authUserInfo/authUserInfo.js`，该页面已在前一个 PR 删除）
  请到 ip138 后台把这两个 token **作废/重置**，否则别人可以拿去用你的额度。

## 验证方式

- `node --check` 通过
- 全仓库检索：`ip138`、`getClipboardData` 只剩 `importRuleByKey.js` 一处（用户主动触发的那处）；
  `getSystemInfoSync` 0 处；`mta` 0 处
- LeanCloud `UseMessage` 表新增记录会少两个字段（`clipboard`、`ipjson`），
  旧记录不受影响；LeanCloud 是 schema-free 的，不需要改表结构
- 结构完整性检查、排班回归（0 差异）、日历 8179 项、周期性 2391 项断言均通过

## 回滚方式

- revert 本次提交即恢复原采集逻辑（但 token 已泄露，恢复前应先换新 token）
