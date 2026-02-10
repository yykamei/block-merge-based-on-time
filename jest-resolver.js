const path = require("path")

/**
 * Custom Jest resolver to work around ESM-only @actions/* packages.
 *
 * Several @actions/* packages (core, exec, io, http-client) ship with
 * "type": "module" and exports that only define an "import" condition.
 * Jest 30 on Node.js v22+ fails to resolve these in CJS mode.
 *
 * This resolver intercepts @actions/* requests and resolves them directly
 * to their "main" entry file, bypassing the "exports" field entirely.
 */
module.exports = (request, options) => {
  // Match @actions/<package> or @actions/<package>/lib/<subpath>
  const actionsMatch = request.match(/^@actions\/([^/]+)(\/(.+))?$/)
  if (actionsMatch) {
    const pkgName = actionsMatch[1]
    const subpath = actionsMatch[3]

    // Try to find the package in the requester's directory hierarchy
    // (handles nested node_modules, e.g. @actions/core/node_modules/@actions/http-client)
    const baseDirs = options.basedir ? [options.basedir] : [process.cwd()]

    for (const baseDir of baseDirs) {
      try {
        // Walk up to find the correct node_modules
        let dir = baseDir
        while (dir !== path.dirname(dir)) {
          const pkgJsonPath = path.join(dir, "node_modules", "@actions", pkgName, "package.json")
          try {
            const pkg = require(pkgJsonPath)
            const pkgDir = path.dirname(pkgJsonPath)

            if (subpath) {
              // e.g. @actions/http-client/lib/auth -> resolve subpath directly
              return path.join(pkgDir, subpath + (subpath.endsWith(".js") ? "" : ".js"))
            }
            // Use "main" field to get entry point
            const main = pkg.main || "index.js"
            return path.join(pkgDir, main)
          } catch {
            // package.json not found at this level, walk up
          }
          dir = path.dirname(dir)
        }
      } catch {
        // ignore
      }
    }
  }

  // For all other modules, use the default resolver
  return options.defaultResolver(request, options)
}
