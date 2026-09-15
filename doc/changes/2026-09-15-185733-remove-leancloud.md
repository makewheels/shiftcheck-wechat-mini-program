# 2026-09-15 18:57 删除 LeanCloud 集成整条链路（域名已失效，统计早已是死的）

## 背景 / 目的

2026-09-14 经 RDAP 查实：专有域名 `shiftcheck.work` 2026-08-09 到期未续费，现处
redemption period / pending delete，权威 NS 已被换成注册商的过期停放服务器 ——
`api.leancloud.mp.shiftcheck.work` 对**全球所有用户**都解析不到。使用统计对所有用户
早已是死的，只剩每次启动 3 个注定失败的请求（登录 + 2 次重试）和 console 报错。

用户 2026-09-14 拍板：**不赎回域名、删除集成**。8 个倒班页与设置页全是纯本地计算，
删除后功能零损失；`libs/` 里的 SDK 占 260.6 KB 上传包的 91%，删掉包体能降到 ~25 KB。

## 改动清单

代码主体在上一提交（3f51354）已完成，本次补齐门禁、测试替身与全部文档收尾：

- `libs/av-core-min.js`、`libs/leancloud-adapters-weapp.js`：删除
- `app.js`：删 AV 初始化、`getOpenid()`、`login()`，只剩 `initUpdateManager()` 与 `onLaunch()`；
  原位置留注释说明为什么删、别加回来
- `pages/index/index.js`：删 `mystep2()` 统计上报与全部 AV 调用，首页变成纯入口页
- `test/index-page.test.js`：重写，钉住「首页纯入口」——不发任何请求、不弹任何提示
- `test/helpers/miniprogram.js`：删 LeanCloud SDK 替身、`makeRequire` 的 leancloud 分支；
  本次再删掉已无人用的 `appStub().getOpenid()` 死替身
- `test/hygiene.test.js`：
  - **新增门禁**「不许再引入 LeanCloud / AV」：代码里无 `AV.xxx` 调用、无对 `libs/` 的
    require、两个 SDK 文件不许加回来。取代原「不许写 `AV.User.current().toJSON()`」
    —— 它是新门禁的子集，历史坑（未登录白屏，踩过两次）写进注释
  - 「app.js 必须提供…」的必需函数列表 `[getOpenid, initUpdateManager, login]` →
    `[initUpdateManager, onLaunch]`
  - 「取不到 openid 就弹框」门禁保留，文案与注释按现状改写（全仓库已无功能需要 openid）
- 文档按删除后现状收敛：
  - `AGENTS.md`：项目描述改「无后端」；测试替身描述；测试文件清单六个 → 八个；
    openid 守则改历史备查；删「查询结果取 [0] 前判空（LeanCloud…）」条；`libs/` 目录行删除
  - `doc/README.md`：11 个页面全纯本地、零网络请求；openid 守则同步
  - `doc/TODO.md`：域名失效条目标已处理（不赎回）；第 4 节按零请求现状重写；
    第 5 节备查表加 2.5.0 行；随链路失效的条目收口（后台 ACL、统计口径、openid 硬编码）
  - `doc/发布前检查单.md`：域名白名单清空（残留域名可从后台移除）、
    「不再收集任何信息」、断网自测项更新为「首页不弹任何提示」
- 剔除误入库的 `.idea/`（5 个 IDE 配置文件，随 3f51354 混入），`.gitignore` 补 `.idea/`

## 验证方式

1. 全量测试：`node --test test/*.test.js` → **tests 135 / pass 135 / fail 0**
2. grep 全仓：代码里 `AV.` 调用零处、对 `libs/` 的 require 零处、`libs/` 目录不存在；
   文档中 LeanCloud 字样只出现在历史记录（changes / releases / 备查表）与「不许回来」的门禁语境
3. 新门禁不是死测试：正则真扫 CODE 范围（当前零命中；此前同类门禁曾真抓到过注释里的违规字样）
4. 没验的：界面层一如既往没验。冷启动少了 3 个注定失败的请求，模拟器/真机再确认一次
   首页无报错即可

## 待确认项

- 本批改动归入下一版（2.5.0 方向），**未动版本号、未打 tag、未发 Release** ——
  2.4.0 仍在微信审核中，发版时按 `doc/发布前检查单.md` 第 8 节流程走
- 微信后台 request 合法域名白名单里残留的 LeanCloud 域名，下次登录后台时顺手移除
  （已记入检查单第 1 节）
- LeanCloud 后台 5 张表的数据清理不急（已记入 TODO 第 5 节，客户端已零依赖）

## 回滚方式

- `git revert` 本 PR 的提交即可。注意恢复后 `hygiene.test.js` 的新门禁会红 ——
  这是故意的：要恢复集成得先说服门禁，说服的过程正好是把「统计对谁还有价值」想清楚的过程
- 只想查历史统计的话：LeanCloud 后台数据还在，git 历史里也有整条链路
