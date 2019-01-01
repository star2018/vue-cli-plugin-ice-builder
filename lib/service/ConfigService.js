const merge = require('webpack-merge')
const env = require('../utils/env')
const console = require('../utils/console')
const file = require('../utils/file')
//
const Plugin = require('../plugin')
const CustomWebpackPlugin = require('../plugin/BuilderWebpackPlugin')

// 配置服务
// 用于通过配置形式使用插件服务
class ConfigService {
  //
  constructor(setup) {
    const { plugin, options } = setup
    this.plugin = plugin
    this.options = options
  }

  // 链式配置
  chainWebpack() {
    //  参数为 chainable webpack 实例
    this.plugin.chainWebpack((chainConfig) => {
      const api = this.plugin
      const projectOptions = this.options
      const { pluginOptions } = projectOptions
      const { service } = Object.assign({}, pluginOptions)
      if (service) {
        console.raw.log('')
        Object.keys(service).forEach((name) => {
          const serviceOptions = service[name]
          const serve = ConfigService.getService(name)
          if (serve) {
            // 执行服务
            serve(
              {
                api,
                plugin: new Plugin({
                  chainConfig,
                  projectOptions,
                  serviceOptions,
                }),
                config: chainConfig,
                isDev: process.env.NODE_ENV !== 'production',
                env: env(),
                merge,
              },
              serviceOptions,
              projectOptions
            )
          }
        })
        console.raw.log('')
      }
      // 应用于拦截的默认链式配置
      ConfigService.chainDefaultWebpack(chainConfig)
    })
  }

  // 简单配置
  configureWebpack() {
    // 参数为原始到webpack配置对象
    return this.plugin.configureWebpack((webpackConfig) => {
      // 返回的配置会被调用方合并
      return {
        plugins: [],
      }
    })
  }

  // 开发服务配置
  configureDevServer() {
    // 参数为 express app 实例
    this.plugin.configureDevServer((express, devServer) => {})
  }

  // 代理服务器配置
  configureProxyServer() {
    // 配置代理服务器
    new Plugin({
      projectOptions: this.options,
    }).configureProxyServer((context, config) => {
      const { onProxyRes, target } = config
      const proxyResHandler = (proxyRes, req, res) => {
        // 将远程转发地址加到响应头里
        proxyRes.headers['X-Proxy-Remote'] = target
        // 保存代理响应的内容
        let body = new Buffer('')
        proxyRes.on('data', function(chunk) {
          body = Buffer.concat([body, chunk])
        })
        proxyRes.on('end', function() {
          res.rawBody = body
        })
      }
      if (typeof onProxyRes === 'function') {
        config.onProxyRes = (...args) => {
          onProxyRes.apply(undefined, args)
          proxyResHandler.apply(this, args)
        }
      } else {
        config.onProxyRes = proxyResHandler
      }
    })
  }
}

// 使用自定义的babelLoader对代码进行额外处理
function useCustomBabelLoader(chainConfig) {
  chainConfig.module
    .rule('js')
    .use('babel-loader')
    .loader(file.joinPath(`${__dirname}`, '../plugin/babel/CustomBabelLoader'))
}

// 使用自定义的webpack插件
function useCustomWebpackPlugin(chainConfig) {
  chainConfig.plugin('ut-builder-webpack-plugin').use(CustomWebpackPlugin)
}

// 已注册的服务
ConfigService.services = {}

// 配置默认的chain操作
ConfigService.chainDefaultWebpack = function(chainConfig) {
  // useCustomBabelLoader(chainConfig)
  // useCustomWebpackPlugin(chainConfig)
}

// 注册服务
ConfigService.registerService = function(name, service) {
  if (typeof name !== 'string') {
    console.error(
      `[registerService] The type of name must be a string. (${name}`
    )
  }
  const services = ConfigService.services
  const hyphenName = name.replace(/([A-Z]+)/g, '-$1').toLowerCase()
  if (Object.prototype.hasOwnProperty.call(services, hyphenName)) {
    console.error(
      `[registerService] The service name of '${name}' already exists.`
    )
  }
  if (typeof service !== 'function') {
    console.error(`[registerService] Service must be a function. (${name}`)
  }
  services[hyphenName] = service
  console.log(`Register service 👉 '${name}'`)
}

// 获取服务
ConfigService.getService = function(name) {
  if (typeof name === 'string') {
    const services = ConfigService.services
    // 将驼峰名转换为连字符名称
    const hyphenName = name.replace(/([A-Z]+)/g, '-$1').toLowerCase()
    if (Object.prototype.hasOwnProperty.call(services, hyphenName)) {
      return services[hyphenName]
    }
    const dll = ConfigService.loadDLL(name)
    if (dll) {
      return dll
    }
  }
  console.warn(`[getService] Service load failed. (${name})`)
}

// 加载内部服务
ConfigService.loadDLL = function(name) {
  let service = null
  try {
    service = require(`./dll/${name}`)
    ConfigService.registerService(name, service)
  } catch (e) {}
  return service
}

// 加载所有内部服务
ConfigService.loadAllDLL = function() {
  for (const name of file.getFileName('dll/*.js', {
    noExt: true,
    cwd: __dirname,
  })) {
    ConfigService.registerService(name, require(`./dll/${name}`))
  }
}

//
module.exports = ConfigService
