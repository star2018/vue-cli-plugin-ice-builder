// 解析请求字节内容
module.exports = () => (req, res, next) => {
  let body = Buffer.from('')
  req.on('data', (chunk) => {
    body = Buffer.concat([body, chunk])
  })
  req.on('end', function() {
    req.rawBody = body
  })
  next()
}
