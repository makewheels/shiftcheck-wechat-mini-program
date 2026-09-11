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
const AV_STUB = {
  Object: {
    extend: function () { return function () {} },
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
const WX_STUB = new Proxy({}, {
  get: function (_target, prop) {
    if (prop === 'getStorageSync') return function () { return undefined }
    if (prop === 'getSystemInfo') return function (o) { if (o && o.success) o.success({}) }
    if (prop === 'getSystemInfoSync') return function () { return {} }
    if (prop === 'getUpdateManager') return function () { return UPDATE_MANAGER }
    if (prop === 'canIUse') return function () { return true }
    return function () {}
  }
})

// getApp() 替身：页面里会用到 globalData 与 openid 相关方法
function appStub(overrides) {
  return Object.assign({
    globalData: { appVersion: 'test', launchScene: { scene: 0 } },
    getOpenid: function () { return 'test-openid' },
    withOpenid: function (cb) { cb('test-openid') },
    loginFailTip: function () {}
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
function loadConfig(file) {
  let config = null
  const capture = function (cfg) { config = cfg }
  const code = fs.readFileSync(file, 'utf8')
  new Function(
    'Page', 'Component', 'App', 'require', 'wx', 'getApp', 'module', 'exports', '__dirname',
    code
  )(capture, capture, capture, makeRequire(file), WX_STUB, appStub, { exports: {} }, {}, path.dirname(file))
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

/** 按仓库相对路径加载页面 / 组件实例 */
function load(relPath, extraData) {
  return instantiate(loadConfig(path.join(REPO, relPath)), extraData)
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
  appStub: appStub,
  loadConfig: loadConfig,
  instantiate: instantiate,
  load: load,
  walk: walk,
  rel: rel
}
