<template>
  <div class="turnstile-container" v-if="enabled">
    <div ref="turnstileRef" :id="containerId"></div>
    <div v-if="error" class="turnstile-error" role="alert" aria-live="assertive">
      {{ error }}
      <a href="#" @click.prevent="$emit('retry')">{{ $t('user.security.retry') }}</a>
    </div>
  </div>
</template>

<script>
let turnstileScriptPromise = null

function hasTurnstileApi () {
  return Boolean(window.turnstile && typeof window.turnstile.render === 'function')
}

function loadTurnstileScript () {
  if (hasTurnstileApi()) return Promise.resolve()
  if (turnstileScriptPromise) return turnstileScriptPromise

  turnstileScriptPromise = new Promise((resolve, reject) => {
    let script = document.querySelector('script[data-quantdinger-turnstile]')
    let settled = false
    let pollTimer = null
    let timeout = null
    const clearTimers = () => {
      if (pollTimer) clearInterval(pollTimer)
      if (timeout) clearTimeout(timeout)
    }
    const finish = () => {
      if (settled || !hasTurnstileApi()) return
      settled = true
      clearTimers()
      resolve()
    }
    const fail = (code) => {
      if (settled) return
      settled = true
      clearTimers()
      if (script && typeof script.remove === 'function') script.remove()
      reject(new Error(code))
    }

    timeout = setTimeout(() => fail('turnstile_load_timeout'), 15000)
    pollTimer = setInterval(finish, 50)

    if (script) {
      script.addEventListener('load', finish, { once: true })
      script.addEventListener('error', () => fail('turnstile_script_load_failed'), { once: true })
      return
    }

    script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.dataset.quantdingerTurnstile = 'true'
    script.addEventListener('load', finish, { once: true })
    script.addEventListener('error', () => fail('turnstile_script_load_failed'), { once: true })
    document.head.appendChild(script)
  }).catch(error => {
    turnstileScriptPromise = null
    throw error
  })

  return turnstileScriptPromise
}

export default {
  name: 'Turnstile',

  props: {
    siteKey: {
      type: String,
      default: ''
    },
    enabled: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      default: 'auto' // 'light', 'dark', 'auto'
    },
    size: {
      type: String,
      default: 'normal' // 'normal', 'compact'
    },
    appearance: {
      type: String,
      default: 'always'
    },
    execution: {
      type: String,
      default: 'render'
    },
    executeTimeoutMs: {
      type: Number,
      default: 30000
    }
  },

  data () {
    return {
      widgetId: null,
      token: null,
      error: null,
      pendingResolve: null,
      pendingReject: null,
      pendingTimer: null,
      initPromise: null,
      destroyed: false,
      containerId: `turnstile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
  },

  mounted () {
    if (this.enabled && this.siteKey) {
      this.initTurnstile().catch(() => {})
    }
  },

  beforeDestroy () {
    this.destroyed = true
    if (this.pendingReject) {
      this.pendingReject(new Error('turnstile_destroyed'))
      this.clearPending()
    }
    this.cleanup()
  },

  watch: {
    siteKey (newVal) {
      if (newVal && this.enabled) {
        this.cleanup()
        this.initTurnstile().catch(() => {})
      }
    },
    enabled (newVal) {
      if (newVal && this.siteKey) {
        this.initTurnstile().catch(() => {})
      } else {
        this.cleanup()
      }
    }
  },

  methods: {
    initTurnstile () {
      if (!this.enabled || !this.siteKey) {
        return Promise.reject(new Error('turnstile_not_configured'))
      }
      if (this.widgetId !== null) return Promise.resolve(this.widgetId)
      if (this.initPromise) return this.initPromise

      this.initPromise = loadTurnstileScript()
        .then(() => this.$nextTick())
        .then(() => {
          if (this.destroyed) throw new Error('turnstile_destroyed')
          if (this.widgetId !== null) return this.widgetId
          return this.renderWidget()
        })
        .catch(error => {
          this.error = this.$t('user.security.loadFailed')
          console.error('Turnstile init error:', error)
          this.$emit('error', error)
          throw error
        })
        .finally(() => {
          this.initPromise = null
        })

      return this.initPromise
    },

    renderWidget () {
      if (!hasTurnstileApi()) throw new Error('turnstile_api_unavailable')
      if (!this.$refs.turnstileRef) throw new Error('turnstile_container_unavailable')

      this.widgetId = window.turnstile.render(this.$refs.turnstileRef, {
        sitekey: this.siteKey,
        theme: this.theme,
        size: this.size,
        appearance: this.appearance,
        execution: this.execution,
        callback: (token) => {
          this.token = token
          this.error = null
          if (this.pendingResolve) {
            this.pendingResolve(token)
            this.clearPending()
          }
          this.$emit('success', token)
        },
        'error-callback': (code) => {
          this.token = null
          this.error = this.$t('user.security.verificationFailed')
          if (this.pendingReject) {
            this.pendingReject(new Error(String(code || 'turnstile_verification_failed')))
            this.clearPending()
          }
          if (code) {
            console.warn('Turnstile verification error:', code)
          }
          this.$emit('error', code)
        },
        'unsupported-callback': () => {
          const error = new Error('turnstile_browser_unsupported')
          this.token = null
          this.error = this.$t('user.security.verificationFailed')
          if (this.pendingReject) {
            this.pendingReject(error)
            this.clearPending()
          }
          this.$emit('error', error)
        },
        'expired-callback': () => {
          this.token = null
          if (this.pendingReject) {
            this.pendingReject(new Error('expired'))
            this.clearPending()
          }
          this.$emit('expired')
        }
      })
      return this.widgetId
    },

    clearPending () {
      if (this.pendingTimer) {
        clearTimeout(this.pendingTimer)
        this.pendingTimer = null
      }
      this.pendingResolve = null
      this.pendingReject = null
    },

    async execute () {
      if (!this.enabled) {
        return Promise.resolve('')
      }
      if (this.pendingReject) {
        this.pendingReject(new Error('replaced'))
      }
      this.clearPending()
      this.token = null
      this.error = null
      await this.initTurnstile()
      if (!hasTurnstileApi() || this.widgetId === null) {
        throw new Error('turnstile_unavailable')
      }
      return new Promise((resolve, reject) => {
        this.pendingResolve = resolve
        this.pendingReject = reject
        this.pendingTimer = setTimeout(() => {
          const err = new Error('turnstile_timeout')
          this.error = this.$t('user.security.verificationFailed')
          this.clearPending()
          reject(err)
          this.$emit('error', err)
        }, Math.max(5000, this.executeTimeoutMs))
        try {
          if (this.execution === 'execute') {
            window.turnstile.execute(this.widgetId)
          } else if (this.token) {
            resolve(this.token)
            this.clearPending()
          }
        } catch (e) {
          this.error = this.$t('user.security.verificationFailed')
          this.clearPending()
          reject(e)
          this.$emit('error', e)
        }
      })
    },

    reset () {
      this.token = null
      this.error = null
      if (this.pendingReject) {
        this.pendingReject(new Error('reset'))
        this.clearPending()
      }
      if (window.turnstile && this.widgetId !== null) {
        window.turnstile.reset(this.widgetId)
      } else {
        this.renderWidget()
      }
    },

    getToken () {
      return this.token
    },

    cleanup () {
      if (window.turnstile && this.widgetId !== null) {
        try {
          window.turnstile.remove(this.widgetId)
        } catch (e) {
          // Ignore cleanup errors
        }
        this.widgetId = null
      }
    }
  }
}
</script>

<style lang="less" scoped>
.turnstile-container {
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  align-items: center;

  .turnstile-error {
    margin-top: 8px;
    color: #ff4d4f;
    font-size: 13px;

    a {
      margin-left: 8px;
      color: var(--primary-color, #1890ff);
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}
</style>
