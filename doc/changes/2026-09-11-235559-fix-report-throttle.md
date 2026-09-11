# 2026-09-11 23:55 修首页那个从来没生效过的「5 分钟内不重复上报」节流

## 背景/目的

`pages/index/index.js` 的 `onLoad` 原本这样写：

```js
data: { lastTimestamp: 0 },

onLoad: function() {
  var that = this
  //如果刚刚已经开过了
  if (this.data.lastTimestamp != 0) {
    var diffTimestamp = new Date().getTime() - this.data.lastTimestamp
    if (diffTimestamp < (5 * 60 * 1000)) {
      return;
    }
  }
  //新开的，或开了不久的
  this.setData({ lastTimestamp: new Date().getTime() })
  ...上报...
}
```

**这段节流一次都没生效过**，原因是小程序的页面生命周期：

- `data` 是**每个页面实例各自一份**，首页实例创建时 `lastTimestamp` 就是初值 `0`
- `onLoad` **每个实例只跑一次**
- 所以进到 `onLoad` 时 `this.data.lastTimestamp` 必然是 `0` → `!= 0` 恒为 false →
  那个 `return` **永远走不到**

净效果：每次冷启动都完整跑一遍上报（`UseMessage` 每次启动写一条）。
"5 分钟内不重复"只是注释里的愿望。要跨实例记住状态，必须用 `wx.setStorage`，不能用 `data`。

## 改动清单

- `pages/index/index.js`
  - 节流改用 storage：`wx.getStorageSync('lastReportTimestamp')` 读、`wx.setStorageSync(...)` 写
  - 命中节流时**直接 return，不刷新时间戳**（否则会变成"只要一直开着就永远不再上报"）
  - `data` 里删掉 `lastTimestamp`（`data` 变成 `{}`），并在注释里写清旧写法为什么必然失效，
    免得以后有人"顺手改回去"
- `test/helpers/miniprogram.js`（测试沙箱，非产品代码）
  - `wx` 替身支持传入一个**共享 storage 对象**，并记录页面访问过哪些 wx API（`calls`），
    这样才能断言"上报分支到底走没走到"
  - 补上 `getNetworkType` / `getScreenBrightness` 的 success 回调（原来只是 no-op，走不进上报链）
  - LeanCloud 桩的 `Object.extend()` 改成返回带 `save/set/get/destroy` 的构造器 ——
    上报发生在 `setTimeout(..., 800)` 里，会在测试结束之后才触发，桩不完整就抛未捕获异常、整个测试文件判失败
- 新增 `test/index-page.test.js`：6 条测试覆盖首次上报、5 分钟内第二次冷启动不上报、
  超时恢复上报、临界值（正好 5 分钟 / 差 1 分钟）、storage 脏数据（`''`/`null`/`undefined`/`'abc'`/`0`）
  不崩且按"没上报过"处理、以及"`data` 里不许再出现 `lastTimestamp`"

## 验证方式

- `node --test test/*.test.js`：**116 项全部通过**（比之前多 6 项）
- **变异验证（关键）**：把 `index.js` 还原成旧的假节流写法后跑 `test/index-page.test.js`，
  **6 条新测试全部变红**；换回修复版后 116 项全绿。证明这组测试真能抓住这个 bug，不是空转
- 复现方式说明：测试用**两个页面实例共享同一份 storage** 来等价模拟"用户两次冷启动"，
  这正是旧实现失效的场景（单实例内测不出来）
- 测试沙箱改动不影响产品代码；`node --check` 通过

## 待确认项

- 上报内容本身在上一个变更里已经精简过（不读剪贴板、不查 IP），所以这个 bug 的实际影响
  是"`UseMessage` 表里每次冷启动多一条记录"，不是隐私问题。修完后 5 分钟内多次启动只记一条
- storage key 用了 `lastReportTimestamp`。老用户本地不会有这个键，首次启动按"没上报过"处理，符合预期
- 5 分钟这个窗口沿用原注释里的意图，没有改；要调只改 `index.js` 里那个常量

## 回滚方式

- revert 本提交即回到"每次冷启动都上报"的行为（`test/index-page.test.js` 会同时被删掉，
  否则会红）
