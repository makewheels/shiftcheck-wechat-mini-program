var share = require('../../../utils/share.js')

/**
 * 四种倒班的「个人模式默认班组」设置。
 * 每个个人页 onLoad 读自己的 storage key（存 1~N 的班组号），列表见 MODES。
 * 没设置过时各页有兜底默认：五班三倒是三班（历史如此，别改），
 * 经警队 / 四班四倒 / 三班半倒是一班（接上设置前的行为）。
 */
var MODES = [
  {
    key: 'setting-wbsdDefault',
    name: '五班三倒',
    banzus: ['一班', '二班', '三班', '四班', '五班'],
    fallback: '三班'
  },
  {
    key: 'setting-jjdDefault',
    name: '经警队',
    banzus: ['一班', '二班', '三班', '四班'],
    fallback: '一班'
  },
  {
    key: 'setting-sbsdDefault',
    name: '四班四倒',
    banzus: ['一班', '二班', '三班', '四班'],
    fallback: '一班'
  },
  {
    key: 'setting-sbbdDefault',
    name: '三班半倒',
    banzus: ['一班', '二班', '三班'],
    fallback: '一班'
  }
]

//读 storage 拼出渲染用的行；存了越界/垃圾值按未设置处理
function readModes() {
  return MODES.map(function (mode) {
    var saved = parseInt(wx.getStorageSync(mode.key), 10)
    var current = saved >= 1 && saved <= mode.banzus.length
      ? mode.banzus[saved - 1]
      : '未设置（默认' + mode.fallback + '）'
    return { name: mode.name, current: current }
  })
}

Page({
  data: {
    modes: []
  },

  //先加载已保存的设置中的内容
  onLoad: function () {
    share.setup(wx)
    this.setData({
      modes: readModes()
    })
  },

  //点击某一种倒班的「修改默认班组」按钮
  changeBanzu: function (e) {
    var that = this
    var index = e.currentTarget.dataset.index
    var mode = MODES[index]
    wx.showActionSheet({
      itemList: mode.banzus,
      success: function (res) {
        wx.setStorageSync(mode.key, res.tapIndex + 1)
        that.setData({
          modes: readModes()
        })
        wx.showToast({
          title: mode.name + '默认班组已设为' + mode.banzus[res.tapIndex] + '!'
        })
      }
    })
  },

  //转发给朋友 / 分享到朋友圈
  onShareAppMessage: share.appMessage,
  onShareTimeline: share.timeline,
})
