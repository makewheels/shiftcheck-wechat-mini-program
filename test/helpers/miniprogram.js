'use strict'
/**
 * 小程序运行环境的极简替身
 *
 * 用假的 Page() / Component() / App() / wx / getApp() 加载页面 js，
 * 排班算法、日历渲染数据这些纯逻辑就能在 Node 里直接断言，不需要开发者工具，
 * 也因此可以在 GitHub Actions 的 Linux runner 上跑（微信开发者工具没有 Linux 版）。
 *
 * 只覆盖测试用得到的部分：页面里调用到的其它 wx API 一律是 no-op。
 */
const fs = require('fs')
const path = require('path')

const REPO = path.resolve(__dirname, '..', '..')

// LeanCloud SDK 替身：测试不连后端
// extend() 要返回一个"像样"的构造器：页面里会 new 出来再 .save()，
// 而且这些调用常常发生在 setTimeout 里（测试结束之后），桩不完整就会抛出未捕获异常
const AV_STUB = {
  Object: {
    extend: function () {
      return function (attrs) {
        Object.assign(this, attrs || {})
        this.save = function () { return Promise.resolve(this) }
        this.set = function () {}
        this.get = function () { return undefined }
        this.destroy = function () { return Promise.resolve(this) }
      }
    },
    createWithoutData: function () {
      return {
        set: function () {},
        save: function () { return Promise.resolve({}) },
        destroy: function () { return Promise.resolve({}) }
      }
    }
  },
  Query: function () {
    return {
      equalTo: function () { return this },
      find: function () { return Promise.resolve([]) }
    }
  },
  User: {
    current: function () { return null },
    loginWithMiniApp: function () { return Promise.resolve({}) }
  },
  File: function () {
    return { save: function () { return Promise.resolve({ url: function () { return '' } }) } }
  },
  Cloud: { run: function () { return Promise.resolve({}) } },
  init: function () {},
  setAdapters: function () {}
}

const UPDATE_MANAGER = {
  onCheckForUpdate: function () {},
  onUpdateReady: function () {},
  onUpdateFailed: function () {},
  applyUpdate: function () {}
}

// wx 替身：默认全是 no-op，几个需要返回值的单独给
// storage 传一个普通对象时，getStorageSync/setStorageSync 会读写它，
// 用来测「跨页面实例共享 storage」的行为（例如首页的上报节流）
// calls 传一个数组时，会记下页面访问过哪些 wx API，用来断言某条分支有没有走到
// apiLog 传一个数组时，会记下 no-op API 的调用名与参数（例如 reLaunch 的 url）
function makeWxStub(storage, calls, apiLog) {
  return new Proxy({}, {
    get: function (_target, prop) {
      if (calls && typeof prop === 'string') calls.push(prop)
      if (prop === 'getStorageSync') {
        return function (k) { return storage && storage[k] !== undefined ? storage[k] : '' }
      }
      if (prop === 'setStorageSync') {
        return function (k, v) { if (storage) storage[k] = v }
      }
      if (prop === 'setStorage') {
        return function (o) { if (storage && o && o.key !== undefined) storage[o.key] = o.data }
      }
      if (prop === 'getNetworkType') return function (o) { if (o && o.success) o.success({ networkType: 'wifi' }) }
      if (prop === 'getScreenBrightness') return function (o) { if (o && o.success) o.success({ value: 0.5 }) }
      if (prop === 'getSystemInfo') return function (o) { if (o && o.success) o.success({}) }
      if (prop === 'getSystemInfoSync') return function () { return {} }
      if (prop === 'getUpdateManager') return function () { return UPDATE_MANAGER }
      if (prop === 'canIUse') return function () { return true }
      return function (arg) {
        if (apiLog && typeof prop === 'string') apiLog.push({ name: prop, arg: arg })
      }
    }
  })
}

// 不带 storage 的默认替身（绝大多数测试用这个）
const WX_STUB = makeWxStub(null)

// getApp() 替身：页面里会用到 globalData 与 openid 相关方法
// 注：这里曾经还替身了 withOpenid / loginFailTip —— 那两个方法已从 app.js 删除
//（"取不到 openid 就弹框挡住用户"，是 2.4.0 的发布级 bug），hygiene.test.js 有门禁守着不许复活
function appStub(overrides) {
  return Object.assign({
    globalData: { appVersion: 'test', launchScene: { scene: 0 } },
    getOpenid: function () { return 'test-openid' }
  }, overrides || {})
}

function makeRequire(fromFile) {
  return function (id) {
    if (/av-core-min|leancloud-adapters/.test(id)) return AV_STUB
    if (id.charAt(0) === '.') return require(path.resolve(path.dirname(fromFile), id))
    return require(id)
  }
}

/** 加载一个 js 文件，返回它传给 Page() / Component() / App() 的配置对象 */
function loadConfig(file, opts) {
  let config = null
  const capture = function (cfg) { config = cfg }
  const code = fs.readFileSync(file, 'utf8')
  // opts.pageStack 控制 getCurrentPages() 返回的页面栈，用来测深链场景（栈深只有 1）
  const pageStack = (opts && opts.pageStack) || [{}, {}]
  // opts.app 传对象时覆盖 getApp() 的默认替身，用来测「取不到 openid」这类分支
  //（默认替身总是返回一个 openid，所以那条分支不加这个口子根本测不到）
  const getAppImpl = (opts && opts.app)
    ? function () { return appStub(opts.app) }
    : appStub
  new Function(
    'Page', 'Component', 'App', 'require', 'wx', 'getApp', 'getCurrentPages',
    'module', 'exports', '__dirname',
    code
  )(capture, capture, capture, makeRequire(file),
    makeWxStub(opts && opts.storage, opts && opts.calls, opts && opts.apiLog), getAppImpl,
    function () { return pageStack }, { exports: {} }, {}, path.dirname(file))
  if (!config) throw new Error('没能从 ' + file + ' 取到配置对象')
  return config
}

/**
 * 把配置对象变成可以调方法的实例
 * setData 直接合并进 data（不渲染），所以实例上的方法都能同步调用
 */
function instantiate(config, extraData) {
  const inst = { data: JSON.parse(JSON.stringify(config.data || {})) }
  if (extraData) Object.assign(inst.data, JSON.parse(JSON.stringify(extraData)))
  inst.setData = function (obj, cb) {
    Object.assign(inst.data, obj)
    if (cb) cb()
  }
  Object.keys(config).forEach(function (k) {
    if (typeof config[k] === 'function') inst[k] = config[k].bind(inst)
  })
  // 自定义组件：properties 进 data，methods 挂到实例上
  if (config.properties) {
    Object.keys(config.properties).forEach(function (k) {
      if (inst.data[k] === undefined) inst.data[k] = config.properties[k].value
    })
  }
  if (config.methods) {
    Object.keys(config.methods).forEach(function (k) {
      inst[k] = config.methods[k].bind(inst)
    })
  }
  return inst
}

/** 按仓库相对路径加载页面 / 组件实例；opts.storage 传对象可模拟跨实例共享的本地存储 */
function load(relPath, extraData, opts) {
  return instantiate(loadConfig(path.join(REPO, relPath), opts), extraData)
}

/** 递归列出目录下所有文件，跳过 .git 与 node_modules */
function walk(dir, out) {
  out = out || []
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    if (e.name === '.git' || e.name === 'node_modules') return
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, out)
    else out.push(full)
  })
  return out
}

/** 绝对路径 -> 仓库相对路径 */
function rel(file) {
  return path.relative(REPO, file)
}

module.exports = {
  REPO: REPO,
  AV_STUB: AV_STUB,
  WX_STUB: WX_STUB,
  makeWxStub: makeWxStub,
  appStub: appStub,
  loadConfig: loadConfig,
  instantiate: instantiate,
  load: load,
  walk: walk,
  rel: rel
}
