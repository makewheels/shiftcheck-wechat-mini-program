# 2026-09-12 00:05 修「返回主页」在深链进入时点了没反应（9 个页面）

## 背景/目的

8 个倒班页与 diy 页的「返回主页」按钮都是无条件 `wx.navigateBack({})`：

```js
close: function() {
  wx.navigateBack({})
},
```

问题在于**这些页面可以被直接打开**：`sitemap.json` 把首页与 8 个倒班页列为 allow
（上一个变更刚收紧过，倒班页是有意保留可被索引的），所以用户可以从**搜一搜结果、扫码、
别人转发的分享卡片**直接进入某个倒班页。此时页面栈深度只有 1，`navigateBack` 无处可退 ——
而它连 `fail` 回调都没写，于是**静默失败，按钮点了完全没反应**，看起来像坏了。

## 改动清单

- 9 个页面的 `close()` 统一加栈深守卫（8 个倒班页 worker/director + `pages/diy/diy.js`）：

  ```js
  close: function() {
    //深链进入（分享卡片 / 扫码 / 搜一搜）时页面栈只有 1 层，
    //这时 navigateBack 会静默失败、「返回主页」点了没反应，所以改用 reLaunch 回首页
    if (getCurrentPages().length <= 1) {
      wx.reLaunch({ url: '/pages/index/index' })
      return
    }
    wx.navigateBack({})
  }
  ```

  栈深 > 1 时**保留原来的 `navigateBack`**（不用 reLaunch，否则会丢掉整个页面栈、
  用户返回后丢失上下文）
- `test/helpers/miniprogram.js`（测试沙箱）：
  - 新增 `getCurrentPages` 替身，`opts.pageStack` 可控制栈深度
  - `wx` 替身支持 `opts.apiLog`，记录 no-op API 的**调用名与参数**（这样才能断言
    `reLaunch` 的 url 是不是首页，而不只是"调没调"）
- 新增 `test/back-home.test.js`：9 个页面 × 2 条分支 = 18 条行为测试，外加一条栈深 3 的边界
- `test/structure.test.js` 新增门禁：任何定义了 `close()` 且调用 `wx.navigateBack` 的页面 js，
  **必须**同时出现 `getCurrentPages()`，否则失败（防止以后新加倒班页时漏掉守卫）

## 验证方式

- `node --test test/*.test.js`：**136 项全部通过**（比之前多 20 项：19 条行为测试 + 1 条门禁）
- **行为级验证**（不是只看源码）：沙箱里把页面栈设成 1 层，点 `close()` →
  断言调用了 `reLaunch` 且 `url === '/pages/index/index'`、且**没有**调用 `navigateBack`；
  栈设成 2 层 → 断言走 `navigateBack` 且没有 `reLaunch`
- **变异验证**：把 `wbsd/director` 的守卫删掉 → 行为测试与 structure 门禁**两条同时变红**
  （27 pass / 2 fail）；恢复后 136 项全绿
- 9 处守卫齐全性用 grep 逐个文件复核（每个文件恰好 1 处 `getCurrentPages`）
- `node --check` 全部通过；排班金标准、日历、周期性等既有断言全部照旧通过（本 PR 不碰班次逻辑）

### 过程中的一个操作失误（已修正，记录备查）

做变异验证时用 `git checkout -- <file>` 还原，但那时改动**还没 `git add`**，
索引里是 master 的版本，于是把刚加的守卫一起冲掉了（随后 136 项里 2 项变红暴露了它）。
已用 codemod 重新加回并复核 9 处齐全。教训：**变异验证要用临时副本还原，别用 `git checkout --`**，
除非改动已经进索引。

## 待确认项

- `setting/*` 下还有 5 处 `wx.navigateBack`（`updateMail`、`updatePhone`、`importRuleByKey`、
  `newPushMission` ×2），它们是"保存成功后返回上一页"，只能从上级页面进入（且 sitemap 已 disallow），
  深链场景走不到，本次未改。如果以后把它们加进 sitemap 白名单，需要同样处理
- 守卫用的阈值是 `<= 1`。若哪天首页本身也支持深链并且允许"返回"到别处，需要重新审视
- 界面级验证待补：本机开发者工具 CLI 服务端口未开启，无法用"编译模式→自定义启动页面"
  模拟深链进入来实测按钮

## 回滚方式

- revert 本提交即恢复无条件 `navigateBack`（深链进入时按钮重新变成点了没反应）
