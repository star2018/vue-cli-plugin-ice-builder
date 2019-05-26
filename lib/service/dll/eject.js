const jsonPretty = require('json-stringify-pretty-compact')
const logger = require('../../utils/logger')
const file = require('../../utils/file')

let infos = new Set()

// 输出文件
function write(path, data, isWebpack) {
  const mode =
    { production: 'prod', development: 'dev', test: 'test' }[process.env.NODE_ENV] || ''
  try {
    infos.add(
      `Your ${isWebpack ? 'webpack' : 'vue-cli'} configuration 🧾 ${file.writeFileSync(
        path && typeof path === 'string'
          ? path
          : `build/${
              isWebpack ? `webpack.config${mode ? `.${mode}` : ''}.js` : 'vue.config.json'
            }`,
        data
      )}`
    )
  } catch (e) {
    logger.error(e)
  }
}

// 执行生成任务
function execTask(config, options, projectOptions) {
  if (options === true) {
    options = ['webpack', true]
  }
  // 输出配置文件
  if (!Array.isArray(options)) {
    // 可支持生成多个文件
    options = [options]
  }
  for (let path of options) {
    if (typeof path === 'string') {
      path = path.trim()
    }
    if (path) {
      if (/^webpack/i.test(path)) {
        // 导出webpack配置
        write(
          path.replace(/^webpack(?::\/\/)?/i, ''),
          `module.exports = ${config.toString()}`,
          true
        )
      } else {
        // 导出vue-cli配置
        write(path, jsonPretty(projectOptions), false)
      }
    }
  }
}

// 输出配置文件
module.exports = ({ config, plugin }, options, projectOptions) => {
  if (options !== true && typeof options !== 'string') {
    return false
  }

  // 使用编译器事件插件，监听webpack的开始编译事件
  plugin.use(
    {
      pluginName: 'CompilerEvent',
      configName: 'eject-config',
    },
    () => [
      'EjectConfigWebpackPlugin',
      {
        entryOption: () => execTask(config, options, projectOptions),
        done: async () => {
          if (!infos) {
            return
          }
          console.log()
          logger.log(Array.from(infos).join('\n'))
          infos.clear()
          infos = null
        },
      },
    ]
  )
}
