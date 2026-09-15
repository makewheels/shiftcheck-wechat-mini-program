App({
  globalData: {
    //小程序版本号
    appVersion: "2.5.0",
    launchScene: {}
  },

  /**
   * LeanCloud 集成已于 2.5.0 整条删除：libs/ 两个文件、AV 初始化、登录、使用统计上报一起删。
   *
   * 原因：专有域名 shiftcheck.work 2026-08-09 到期未续费、现处赎回期 / 待删除，
   * api.leancloud.mp.shiftcheck.work 对**全球所有用户**都解析不到 —— 统计对所有人早已是死的，
   * 只剩下每次启动 3 个注定失败的请求（登录 + 2 次重试）和 console 里的报错。
   * 用户 2026-09-14 拍板：删集成、不赎回域名。
   *
   * **别加回来。** 若将来真要使用统计：先解决后端与域名（或换方案），见 doc/TODO.md；
   * hygiene.test.js 有门禁守着不许再引入 AV / LeanCloud。
   *
   * 8 个倒班页与设置页全是纯本地计算、不需要登录态，删除后功能零损失。
   * 更早的历史：2.4.0 曾修过「统计上报失败弹阻塞式模态框挡住用户」的发布级事故
   * （见 doc/changes/2026-09-14-142621-fix-login-fail-modal.md），本次是把整条链路连根删掉。
   */

  /**
   * 小程序强制升级
   *
   * 三个回调都要在 onLaunch 里尽早注册：
   * onUpdateReady 如果等到 onCheckForUpdate 的回调里再注册，冷启动时新版本可能已经下载完，
   * 事件错过就永远不会 applyUpdate，用户这一轮就停在旧版本上了。
   */
  initUpdateManager: function() {
    if (!wx.getUpdateManager) {
      return
    }
    var updateManager = wx.getUpdateManager()

    updateManager.onCheckForUpdate(function(res) {
      if (res.hasUpdate) {
        wx.showToast({
          title: '发现新版本，正在下载...',
          icon: 'none'
        })
      }
    })

    updateManager.onUpdateReady(function() {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经下载好，点确定重启到新版本',
        showCancel: false,
        success: function() {
          updateManager.applyUpdate()
        }
      })
    })

    updateManager.onUpdateFailed(function() {
      wx.showModal({
        title: '更新提示',
        content: '新版本下载失败，请检查网络后删除小程序，重新搜索打开',
        showCancel: false
      })
    })
  },

  onLaunch: function (launchScene) {
    this.globalData.launchScene = launchScene

    //升级检查要尽早注册
    this.initUpdateManager()
  }
})
