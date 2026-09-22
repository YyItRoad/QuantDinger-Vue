export function tabKey (routeOrPath) {
  if (!routeOrPath) return ''

  if (typeof routeOrPath === 'object') {
    const path = String(routeOrPath.path || '')
    const fullPath = String(routeOrPath.fullPath || path)
    if (routeOrPath.meta && routeOrPath.meta.multiTabByFullPath === true) {
      return fullPath
    }
    return path || stripRouteQuery(fullPath)
  }

  return stripRouteQuery(String(routeOrPath))
}

function stripRouteQuery (value) {
  const normalized = value.startsWith('#') ? value.slice(1) : value
  const queryIndex = normalized.indexOf('?')
  const hashIndex = normalized.indexOf('#')
  const boundaries = [queryIndex, hashIndex].filter(index => index >= 0)
  const end = boundaries.length ? Math.min(...boundaries) : normalized.length
  return normalized.slice(0, end)
}
