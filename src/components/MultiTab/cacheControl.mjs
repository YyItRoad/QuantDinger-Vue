export function routeCacheKey (route) {
  if (!route) return ''
  if (typeof route === 'string') return route
  return String(route.name || route.path || '')
}

export function versionedRouteCacheKey (route, version = 0) {
  const key = routeCacheKey(route)
  return key ? `${key}::${Number(version) || 0}` : ''
}

/**
 * Remove one explicit router-view key from Vue 2's keep-alive LRU cache.
 * RouteView always supplies a stable key, so closing one workspace can destroy
 * just that component instance without resetting the other open tabs.
 */
export function evictKeepAliveEntry (keepAlive, routeKey) {
  if (!keepAlive || !keepAlive.cache || !routeKey) return false

  const key = Object.keys(keepAlive.cache).find(item => String(item) === String(routeKey))
  if (key === undefined) return false

  const cached = keepAlive.cache[key]
  const instance = cached && cached.componentInstance
  if (instance && !instance._isDestroyed && typeof instance.$destroy === 'function') {
    instance.$destroy()
  }
  keepAlive.cache[key] = null

  if (Array.isArray(keepAlive.keys)) {
    const index = keepAlive.keys.findIndex(item => String(item) === String(routeKey))
    if (index >= 0) keepAlive.keys.splice(index, 1)
  }
  return true
}
