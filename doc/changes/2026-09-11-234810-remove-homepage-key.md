# 2026-09-11 23:48 清掉只写不读的 homepage 设置（"主页默认打开页面"是个空承诺）

## 背景/目的

`homepage` 这个 storage key **写了 3 处、读了 0 处**：

| 位置 | 行为 |
| --- | --- |
| `pages/setting/importRuleByKey/importRuleByKey.js` | 激活码导入成功后 `wx.setStorage({key:'homepage', data:'diy'})`，注释写着「存储设置，默认打开自定义页」 |
| `pages/setting/myRuleHome/myRuleHome.js` 的 `setHomepage()` | 弹 ActionSheet 让用户选「DIY规则 / 默认」，然后 `wx.setStorageSync('homepage', 'diy' | 'default')`，并 toast「已设为DIY！」 |

全仓库检索 `homepage`：**没有任何一处 `getStorage` / `getStorageSync` 读它**，
`app.js` 与 `pages/index/index.js` 也没有根据它决定首页行为。

也就是说：

- 激活码导入成功后，注释承诺的"默认打开自定义页"**并没有发生**
- `setHomepage()` 会给用户明确的反馈「已设为DIY！」，但**这个设置永远不会生效** —— 属于会骗人的 UI
- 而且 `setHomepage()` 唯一的入口 `myRuleHome.wxml` 里那个按钮是**注释掉的**，
  所以这个函数实际上也永远进不去（死代码套空承诺）

用户选了"清掉死键"而不是"把读取实现出来"，因为：现在的小程序首页就是倒班方式入口列表，
"默认打开某个页面"这个需求本身已经过时（DIY 规则有首页的「我的 DIY 规则」按钮直达）。

## 改动清单

- `pages/setting/importRuleByKey/importRuleByKey.js`：删掉激活成功后写 `homepage` 的
  `wx.setStorage` 调用与那句「存储设置，默认打开自定义页」注释（激活成功后的
  提示弹窗、`hideToast`、`navigateBack` 一律保留，行为不变）
- `pages/setting/myRuleHome/myRuleHome.js`：删掉整个 `setHomepage()` 方法
  （连带前一个方法的尾逗号一并处理，保持对象字面量合法）
- `pages/setting/myRuleHome/myRuleHome.wxml`：删掉那行注释掉的
  `<!-- <button bindtap="setHomepage">主页默认打开页面</button> -->`
  —— 必须与 js 同步删：`test/structure.test.js` 会扫 wxml 原文里 `bind*` 绑定的处理函数
  是否在 js 中存在（**注释里的也算**，因为扫的是原始文本），只删一边门禁就会红

## 验证方式

- 全仓库检索 `homepage` / `setHomepage`：**0 处残留**
- `node --check` 两个改动的 js 通过；`myRuleHome.js` 尾部结构人工核对（对象字面量正确闭合）
- `node --test test/*.test.js`：**110 项全部通过**，其中 `structure.test.js` 的
  "wxml 绑定的处理函数必须在 js 中存在"与"页面注册/跳转目标齐全"两条正好覆盖这类删除
- 行为影响面：激活码导入流程少了一次无人读取的 `setStorage`，其余完全不变；
  `myRuleHome` 页少了一个本来就进不去的函数

## 待确认项

- 如果以后真的要做"启动时默认打开某个页面"，正确做法是：在 `app.js` 或首页 `onShow` 里
  `wx.getStorageSync('homepage')` 读出来再决定跳转，并且**写入方与读取方必须同时存在** ——
  这次的教训就是只写了读的一侧从来没人做
- 用户之前如果点过那个（已被注释的）按钮，本地可能残留一个 `homepage` 键。
  它不会被读取，无害；要清可以在某次启动时 `wx.removeStorageSync('homepage')`，
  但为一个死键加代码不值得，本次不做

## 回滚方式

- revert 本提交即恢复三处代码（但功能仍然是空的，因为读取方从来没有过）
