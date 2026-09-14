# 2026-09-14 14:26 修掉首页那个「登录没成功」阻塞弹窗（发布前最后一条阻塞项）

## 背景 / 目的

2.4.0 上传成开发版本后，一打开首页就弹「**登录没成功，请检查网络后重新打开小程序**」。

这不是新问题，`doc/TODO.md` 第 6 节里早就记着，还标了「优先级最高的一条」和
「**最坏的发布事故形态**：如果发布时漏配 request 域名白名单，所有用户一打开就看到这个弹窗」。
本次是它真的发生了，且发生在发版前，属于必须修掉才能上线的那一类。

### 为什么必错

首页 `mystep2()` 的使用统计上报走了 `app.withOpenid()`：取不到 openid 就补登录，
补不上就调 `loginFailTip()` 弹一个 `showCancel: false` 的阻塞式 `showModal`。

但**首页 8 个倒班入口全是纯本地计算，根本不需要登录**。用户只想看今天上什么班，
却因为一个后台统计请求失败被模态框拦住。统计上报对用户是完全无感的附带行为，
它失败的正确处理是静默跳过。

### 为什么这次一定会触发

排查时顺带发现 `api.leancloud.mp.shiftcheck.work` **DNS 解析失败**：

| 检查 | 结果 |
| --- | --- |
| 本机直接解析 | `gaierror [Errno 11001] getaddrinfo failed` |
| 经代理 CONNECT | `HTTP/1.0 502 Bad Gateway` |
| 对照：`oneclick.video`、`secrets.a4.fit` | 均正常解析（→ 不是公司 DNS 整类封个人域名） |
| 对照：`shiftcheck.work` 的 `mp` / `leancloud.mp` / `api.leancloud.mp` | 三级子域**全挂** |

`project.private.config.json` 里 `urlCheck = false`（覆盖 `project.config.json` 的 `true`），
所以模拟器里域名白名单校验是关掉的 —— **这不是白名单问题，是域名解析不了**。

⚠ 但公司网络按类别封了 DoH 服务（`dns.google` / `cloudflare-dns.com` 都返回
「Not allowed to browse DoH Services category」），**无法从内网确认全球解析状态**。
需要用手机流量或另一台机器验一次才能定论。已记入 `doc/TODO.md` 第 6 节。

**关键点：修法与这个结论无关。** 不管 LeanCloud 死没死，首页都不该为后台统计弹阻塞框。

## 改动清单

比 TODO 里原定的修法多做一步——不只是让首页不弹，而是把**能弹这个框的机制整个拆掉**：

- `pages/index/index.js`：`mystep2()` 改走静默路径 —— `var openid = app.getOpenid()`，
  取不到直接 `return`，不弹任何东西。取到时上报逻辑与字段一字未改
- `app.js`：**删除 `withOpenid()` 与 `loginFailTip()` 整对方法**。修完 `mystep2` 后它们零调用方，
  留着只是给未来一个"能弹框挡住用户"的现成入口。原位置留一段注释说明为什么删、别加回来
  （注释里刻意不写出这两个方法名，否则会被下面那条新门禁自己命中，
  而 `hygiene-allow-line` 豁免标记按仓库规矩不许用在代码文件里）
- `test/hygiene.test.js`：
  - 「app.js 必须提供登录与升级相关方法」的必需函数列表去掉 `withOpenid` / `loginFailTip`，
    保留 `getOpenid` / `initUpdateManager` / `login`
  - **新增门禁**「取不到 openid 就弹框挡住用户」那套不许复活：`codeHits(/\bwithOpenid\b|\bloginFailTip\b/)`
    必须为空。守的是**机制**而不是文案，换个提示措辞也一样会被拦下
- `test/helpers/miniprogram.js`：
  - `appStub()` 去掉那两个方法的替身
  - **`loadConfig()` 新增 `opts.app`**：传对象即可覆盖 `getApp()` 的替身。
    默认替身的 `getOpenid()` 永远返回一个 openid，不加这个口子，
    "取不到 openid" 那条分支在测试里根本走不到
- `test/index-page.test.js`：新增 5 条测试钉住"静默"这个性质
- `AGENTS.md`「改页面时」：原文还在推荐 `app.withOpenid(cb)`，已改成只有 `getOpenid()`；
  并补一条通用原则「**后台行为失败不许弹框打扰用户**」，判断标准是
  "这个调用失败了，用户会在意吗？不会就静默 return"
- `doc/TODO.md` 第 6 节：原「断网时首页会弹一次」标记为已修；
  新增 LeanCloud 域名疑似全球失效那条（含包体影响）

## 验证方式

1. **全量测试**：`node --test test/*.test.js` → `tests 137 / pass 137 / fail 0`（改前 131 项）
2. **新增的 5 条测试**：
   - 取不到 openid（`null`）→ `showModal` / `showToast` / `hideToast` 调用数为 0，且不继续走上报流程
   - openid 是 `undefined` / 空串 → 同样静默
   - 取得到 openid → 照常走 `getScreenBrightness` + `getSystemInfo`（**别把功能一起修没了**），且不弹提示
   - 作者自己的 openid → 跳过上报，且不弹提示
   - `app.js` 源码里不再有那两个方法的定义
3. **新门禁不是死测试**：写完后第一次跑就红了 —— 抓到的是**我自己在 `index.js` 注释里写的
   `app.withOpenid()` 字样**（`pages/index/index.js:41`）。改写注释后转绿。
   这次是意外的反向验证，但结论一样：这条门禁真的在扫
4. **没验的**：界面层一如既往没验。这次改动只涉及一个分支的提前 return，
   渲染层没动，但**"打开首页不再弹框"这件事本身需要在模拟器或真机上再确认一次**

## 待确认项

- **LeanCloud 到底死没死**（需要外网确认，见上）。这决定了两件后续事：
  使用统计是修域名还是整条删掉；以及 `libs/` 那 237.6 KB SDK 要不要留 ——
  它占 260.9 KB 上传包的 **91%**，后端确认弃用的话删掉能把包体降到 ~25 KB
  （注意 `app.js` 的 `getOpenid()` 也依赖 `AV.User.current()`，要一并处理）
- **本次修复要不要重新上传**：已传的开发版本是修复前的 `cbccc27`，**带着这个弹窗**。
  合并后需要重新 `cli upload` 一次覆盖，`v2.4.0` tag 也要再移一次
  （`doc/发布前检查单.md` 第 8 节写的就是这个顺序：还没对外发版就把 tag 移过去）
- 首页 `mystep2()` 里那个硬编码的作者 openid 仍未动（`doc/TODO.md` 里另有记录）

## 回滚方式

- 本次改动：`git revert` 这个提交即可，涉及 2 个源文件 + 3 个测试/文档文件
- 只想恢复弹窗行为的话，`git revert` 后 `test/hygiene.test.js` 的新门禁会红 ——
  这是故意的：要恢复就得先说服门禁，而说服的过程正好是把"用户会不会在意"想清楚的过程
- 已上传的开发版本：微信后台 → 版本管理 → 开发版本，可删除或用同版本号重新上传覆盖
