//
const cached = {}

//
function read(options) {
  options = Object.assign({ cwd: process.cwd(), cache: true }, options)
  const { cwd, cache } = options
  const readPkg = require('read-pkg')
  if (!cache) {
    return readPkg.sync(options)
  }
  if (!cached[cwd]) {
    cached[cwd] = readPkg.sync(options)
  }
  return Object.assign({}, cached[cwd])
}

//
function write(data, options) {
  options = Object.assign(
    { cwd: process.cwd(), normalize: false, overwrite: false },
    options
  )
  const { cwd, normalize, overwrite } = options
  const pkg = read(Object.assign({}, options, { cache: false }))

  const writePkg = require('write-pkg')
  const lodashMerge = require('lodash/merge')
  const lodashMergeWith = require('lodash/mergeWith')

  data = Object.assign({}, data)

  const updated = overwrite
    ? lodashMerge(pkg, data)
    : // 保持属性顺序
      lodashMergeWith(pkg, data, (objValue, srcValue, key, object) => {
        if (objValue !== null) {
          if (typeof objValue === 'object') {
            if (!srcValue || typeof srcValue !== 'object') {
              return objValue
            }
            if (Array.isArray(objValue)) {
              if (!Array.isArray(srcValue)) {
                return objValue
              }
              const newObjValue = [].concat(objValue)
              for (const val of srcValue) {
                if (!newObjValue.includes(val)) {
                  newObjValue.push(val)
                }
              }
              return newObjValue
            }

            // obj为对象，src为数组，不合并
            if (Array.isArray(srcValue)) {
              return objValue
            }

            return Object.keys(srcValue).reduce((obj, key) => {
              if (!obj.hasOwnProperty(key)) {
                obj[key] = srcValue[key]
              }
              return obj
            }, objValue)
          }
        }
        if (object.hasOwnProperty(key)) {
          return objValue
        }
      })

  try {
    writePkg.sync(cwd, updated, { normalize })
    delete cached[cwd]
  } catch (e) {
    console.error(e.message)
  }

  return updated
}

module.exports = exports = read
exports.write = write
exports.read = read
