const { join, dirname } = require("node:path")

module.exports = (request, options) => {
  try {
    return options.defaultResolver(request, options)
  } catch {
    const match = request.match(/^(@[^/]+\/[^/]+)(.*)$/)
    if (!match) throw new Error(`Cannot resolve ${request}`)

    const [, pkgName, subpath] = match
    const pkgJsonPath = join(options.rootDir, "node_modules", pkgName, "package.json")
    const pkgDir = dirname(pkgJsonPath)

    if (subpath) {
      const file = subpath.endsWith(".js") ? subpath : `${subpath}.js`
      return join(pkgDir, file)
    }

    const pkg = require(pkgJsonPath)
    const entry = pkg.exports?.["."]?.import ?? pkg.main ?? "index.js"
    return join(pkgDir, entry)
  }
}
