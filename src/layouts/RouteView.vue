<template>
  <div class="route-view-cache-host">
    <!--
      Keep this wrapper mounted even while visiting a non-cached route. If the
      keep-alive node itself is conditionally removed, Vue discards every page
      stored inside it and returning from Settings/Marketplace looks like a
      full refresh.
    -->
    <keep-alive ref="routeCache" :max="maxCachedPages">
      <router-view
        v-if="shouldKeepAlive"
        :key="cachedRouteKey"
      />
    </keep-alive>

    <router-view
      v-if="!shouldKeepAlive"
      :key="liveRouteKey"
    />
  </div>
</template>

<script>
import multiTabEvents from '@/components/MultiTab/events'
import { evictKeepAliveEntry, routeCacheKey, versionedRouteCacheKey } from '@/components/MultiTab/cacheControl.mjs'

export default {
  name: 'RouteView',
  props: {
    keepAlive: {
      type: Boolean,
      default: false
    },
    maxCachedPages: {
      type: Number,
      default: 12
    }
  },
  data () {
    return {
      pendingCacheEvictions: [],
      routeCacheVersions: Object.create(null)
    }
  },
  created () {
    multiTabEvents.$on('cache-evict', this.handleCacheEviction)
  },
  beforeDestroy () {
    multiTabEvents.$off('cache-evict', this.handleCacheEviction)
  },
  computed: {
    shouldKeepAlive () {
      const routeMeta = this.$route.meta || {}
      const multiTab = Boolean(this.$store && this.$store.getters && this.$store.getters.multiTab)
      return Boolean(this.keepAlive || multiTab || routeMeta.keepAlive)
    },
    // Query-string changes should update the existing page instead of wiping
    // its editor/chat/chart state. Different named pages still get their own
    // cache entries.
    cachedRouteKey () {
      const baseKey = this.cachedRouteBaseKey
      return versionedRouteCacheKey(baseKey, this.routeCacheVersions[baseKey])
    },
    cachedRouteBaseKey () {
      return routeCacheKey(this.$route)
    },
    // Non-cached routes retain the previous fullPath behaviour and are rebuilt
    // when their params/query change.
    liveRouteKey () {
      return this.$route.fullPath || this.$route.path
    }
  },
  watch: {
    $route () {
      this.$nextTick(this.flushPendingCacheEvictions)
    }
  },
  methods: {
    handleCacheEviction (route) {
      const key = routeCacheKey(route)
      if (!key) return

      // Vue must finish navigating away before the active cached instance can
      // be destroyed safely. Inactive tabs can be removed immediately.
      if (key === this.cachedRouteBaseKey) {
        if (!this.pendingCacheEvictions.includes(key)) this.pendingCacheEvictions.push(key)
        return
      }
      this.invalidateCacheKey(key)
    },
    invalidateCacheKey (baseKey) {
      const currentVersion = Number(this.routeCacheVersions[baseKey]) || 0
      const oldEntryKey = versionedRouteCacheKey(baseKey, currentVersion)

      // The versioned key guarantees a fresh component next time even if
      // Vue's private keep-alive cache representation changes.
      this.$set(this.routeCacheVersions, baseKey, currentVersion + 1)
      return evictKeepAliveEntry(this.$refs.routeCache, oldEntryKey)
    },
    flushPendingCacheEvictions () {
      const currentKey = this.cachedRouteBaseKey
      const ready = this.pendingCacheEvictions.filter(key => key !== currentKey)
      this.pendingCacheEvictions = this.pendingCacheEvictions.filter(key => key === currentKey)
      ready.forEach(this.invalidateCacheKey)
    }
  }
}
</script>

<style scoped>
.route-view-cache-host {
  width: 100%;
  min-width: 0;
}
</style>
