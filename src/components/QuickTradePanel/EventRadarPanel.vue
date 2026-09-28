<template>
  <section class="event-radar" :class="{ 'theme-dark': isDark }">
    <header class="event-radar__header">
      <div>
        <div class="event-radar__title"><a-icon type="radar-chart" /> {{ $t('eventRadar.title') }}</div>
        <p>{{ $t('eventRadar.referenceOnly') }}</p>
      </div>
      <a-switch v-model="locallyEnabled" size="small" @change="onToggle" />
    </header>

    <a-alert
      v-if="statusLoaded && !systemEnabled"
      type="warning"
      show-icon
      :message="$t('eventRadar.masterDisabled')"
      class="event-radar__alert"
    />
    <div v-else-if="!locallyEnabled" class="event-radar__empty">
      <a-icon type="pause-circle" />
      <span>{{ $t('eventRadar.localDisabled') }}</span>
    </div>
    <template v-else>
      <div class="event-radar__actionbar">
        <div class="event-radar__cost">
          <a-icon type="wallet" />
          <span>{{ $t(upgradeAvailable ? 'eventRadar.sourceUpgradeHint' : 'eventRadar.costHint', { cost: analysisCost }) }}</span>
        </div>
        <a-button
          type="primary"
          size="small"
          icon="radar-chart"
          :loading="analyzing"
          :disabled="!systemEnabled || !symbol"
          @click="analyze"
        >{{ result ? $t('eventRadar.rerun') : $t('eventRadar.run') }}</a-button>
      </div>

      <a-spin :spinning="loading || analyzing">
        <div v-if="result" class="event-radar__result">
          <div class="event-radar__verdict">
            <span class="event-radar__signal" :class="`is-${result.direction}`">
              {{ label(`eventRadar.direction.${result.direction}`) }}
            </span>
            <strong>{{ confidenceText }}</strong>
            <span>{{ $t('eventRadar.confidence') }}</span>
            <time>{{ formatTime(result.created_at) }}</time>
          </div>

          <div class="event-radar__metrics">
            <div><span>{{ $t('eventRadar.impact') }}</span><strong>{{ label(`eventRadar.level.${result.impact}`) }}</strong></div>
            <div><span>{{ $t('eventRadar.relevance') }}</span><strong>{{ label(`eventRadar.level.${result.relevance}`) }}</strong></div>
            <div><span>{{ $t('eventRadar.freshness') }}</span><strong>{{ label(`eventRadar.freshnessValue.${result.freshness}`) }}</strong></div>
          </div>

          <p class="event-radar__summary">{{ result.summary || generatedSummary }}</p>
          <div class="event-radar__model">
            <span>{{ result.provider || '-' }}</span>
            <span v-if="result.model">{{ result.model }}</span>
            <span>{{ result.latency_ms || 0 }} ms</span>
            <span v-if="chargedCredits > 0">{{ $t('eventRadar.charged', { cost: chargedCredits }) }}</span>
          </div>

          <div v-if="events.length" class="event-radar__events">
            <article v-for="(event, index) in events" :key="`${event.url || event.title}-${index}`" class="event-radar__event">
              <div class="event-radar__event-head">
                <a-tag :color="event.kind === 'macro' ? 'orange' : event.kind === 'filing' ? 'purple' : 'blue'">
                  {{ $t(event.kind === 'macro' ? 'eventRadar.macro' : event.kind === 'filing' ? 'eventRadar.filing' : 'eventRadar.news') }}
                </a-tag>
                <time>{{ event.published_at || '-' }}</time>
              </div>
              <strong>{{ displayEventTitle(event) }}</strong>
              <p v-if="displayEventSummary(event)">{{ displayEventSummary(event) }}</p>
              <div class="event-radar__event-foot">
                <span>{{ event.source || '-' }}</span>
                <a v-if="event.url" :href="event.url" target="_blank" rel="noopener noreferrer">
                  {{ $t('eventRadar.viewSource') }} <a-icon type="export" />
                </a>
              </div>
            </article>
          </div>
          <a-empty v-else :description="$t('eventRadar.noEvents')" />
        </div>
        <div v-else-if="statusLoaded" class="event-radar__empty">
          <a-icon type="radar-chart" />
          <span>{{ $t('eventRadar.noAnalysis') }}</span>
        </div>
      </a-spin>
    </template>
  </section>
</template>

<script>
import storage from 'store'
import { analyzeQuickTradeEventRadar, getQuickTradeEventRadar } from '@/api/quick-trade'

const STORAGE_KEY = 'quick-trade-event-radar-enabled'

export default {
  name: 'EventRadarPanel',
  props: {
    symbol: { type: String, default: '' },
    marketType: { type: String, default: '' },
    isDark: { type: Boolean, default: false },
    active: { type: Boolean, default: false }
  },
  data () {
    return {
      locallyEnabled: storage.get(STORAGE_KEY) !== false,
      systemEnabled: true,
      analysisCost: 5,
      billingEnabled: false,
      upgradeAvailable: false,
      statusLoaded: false,
      loading: false,
      analyzing: false,
      result: null,
      requestToken: 0
    }
  },
  computed: {
    events () {
      return Array.isArray(this.result && this.result.events) ? this.result.events : []
    },
    confidenceText () {
      return `${(Number(this.result && this.result.confidence || 0) * 100).toFixed(0)}%`
    },
    chargedCredits () {
      return Number(this.result && this.result.billing && this.result.billing.charged || 0)
    },
    generatedSummary () {
      if (!this.result) return ''
      return this.$t('eventRadar.generatedSummary', {
        direction: this.label(`eventRadar.direction.${this.result.direction}`),
        impact: this.label(`eventRadar.level.${this.result.impact}`),
        relevance: this.label(`eventRadar.level.${this.result.relevance}`)
      })
    },
    contentLocale () {
      return String(this.$i18n && this.$i18n.locale || this.$store && this.$store.state && this.$store.state.app && this.$store.state.app.lang || 'en-US')
    }
  },
  watch: {
    active: { immediate: true, handler (value) { if (value && this.locallyEnabled) this.loadStatus() } },
    symbol () { if (this.active && this.locallyEnabled) this.loadStatus() },
    marketType () { if (this.active && this.locallyEnabled) this.loadStatus() }
  },
  methods: {
    label (key) {
      const value = this.$t(key)
      return value === key ? '-' : value
    },
    isChineseLocale () {
      return this.contentLocale.toLowerCase().startsWith('zh')
    },
    hasCjkText (value) {
      return /[\u3400-\u9fff]/.test(String(value || ''))
    },
    displayEventTitle (event) {
      if (!event || event.kind !== 'macro' || this.isChineseLocale()) return event && event.title || '-'
      const englishTitle = String(event.title_en || '').trim()
      if (englishTitle && !this.hasCjkText(englishTitle)) return englishTitle
      const key = `eventRadar.macroType.${event.event_type || 'macro'}`
      const translated = this.$t(key)
      return translated === key ? (englishTitle || event.title || '-') : translated
    },
    displayEventSummary (event) {
      if (!event) return ''
      if (event.kind !== 'macro') return event.summary || ''
      const metricKeys = ['actual', 'forecast', 'previous']
      const metrics = metricKeys
        .filter(key => event[key] != null && event[key] !== '' && event[key] !== '-')
        .map(key => `${this.$t(`eventRadar.metric.${key}`)}=${event[key]}`)
      if (metrics.length) return metrics.join(', ')
      return this.isChineseLocale()
        ? (event.summary_zh || event.summary || '')
        : (event.summary_en || event.summary || '')
    },
    async loadStatus () {
      if (!this.symbol) return
      const token = ++this.requestToken
      this.loading = true
      try {
        const response = await getQuickTradeEventRadar({ symbol: this.symbol, market_type: this.marketType })
        if (token !== this.requestToken) return
        const data = response && response.data ? response.data : {}
        this.systemEnabled = data.enabled !== false
        this.analysisCost = Number(data.cost == null ? 5 : data.cost)
        this.billingEnabled = Boolean(data.billing_enabled)
        this.upgradeAvailable = Boolean(data.upgrade_available)
        this.result = data.latest || null
        this.statusLoaded = true
      } catch (error) {
        if (token === this.requestToken) this.statusLoaded = true
      } finally {
        if (token === this.requestToken) this.loading = false
      }
    },
    onToggle (enabled) {
      storage.set(STORAGE_KEY, Boolean(enabled))
      if (enabled) this.loadStatus()
    },
    async analyze () {
      if (!this.symbol || this.analyzing) return
      this.analyzing = true
      try {
        const response = await analyzeQuickTradeEventRadar({ symbol: this.symbol, market_type: this.marketType })
        this.result = response && response.data ? response.data : null
        this.upgradeAvailable = false
        this.$message.success(this.$t('eventRadar.completed'))
      } catch (error) {
        const code = error && error.response && error.response.data && error.response.data.msg
        const key = code === 'insufficient_credits' ? 'eventRadar.insufficientCredits' : 'eventRadar.failed'
        this.$message.error(this.$t(key))
      } finally {
        this.analyzing = false
      }
    },
    formatTime (value) {
      return value ? new Date(value).toLocaleString() : '-'
    }
  }
}
</script>

<style lang="less" scoped>
.event-radar { min-height: 100%; padding: 12px; color: #1f2937; }
.event-radar__header,
.event-radar__actionbar,
.event-radar__verdict,
.event-radar__event-head,
.event-radar__event-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.event-radar__header { padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; }
.event-radar__title { font-size: 13px; font-weight: 700; }
.event-radar__title .anticon { color: var(--primary-color, #52c41a); }
.event-radar__header p { margin: 3px 0 0; color: #94a3b8; font-size: 10px; line-height: 1.45; }
.event-radar__alert { margin-top: 10px; }
.event-radar__actionbar { padding: 10px 0; }
.event-radar__cost { display: flex; align-items: center; gap: 5px; color: #64748b; font-size: 11px; }
.event-radar__verdict { justify-content: flex-start; padding: 10px; border: 1px solid #e5e7eb; border-radius: 7px; background: #f8fafc; }
.event-radar__verdict time { margin-left: auto; color: #94a3b8; font-size: 10px; }
.event-radar__signal { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #e5e7eb; }
.event-radar__signal.is-bullish { color: #15803d; background: #dcfce7; }
.event-radar__signal.is-bearish { color: #b91c1c; background: #fee2e2; }
.event-radar__signal.is-mixed { color: #a16207; background: #fef3c7; }
.event-radar__metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 8px 0; }
.event-radar__metrics div { padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px; }
.event-radar__metrics span { display: block; color: #94a3b8; font-size: 10px; }
.event-radar__metrics strong { font-size: 12px; }
.event-radar__summary { margin: 8px 0; color: #475569; font-size: 11px; line-height: 1.55; }
.event-radar__model { display: flex; flex-wrap: wrap; gap: 8px; color: #94a3b8; font-size: 10px; }
.event-radar__events { display: grid; gap: 7px; margin-top: 10px; }
.event-radar__event { padding: 9px; border: 1px solid #e5e7eb; border-radius: 7px; background: transparent; }
.event-radar__event-head time,
.event-radar__event-foot { color: #94a3b8; font-size: 10px; }
.event-radar__event > strong { display: block; margin: 5px 0 3px; font-size: 11px; line-height: 1.45; }
.event-radar__event p { margin: 0 0 5px; color: #64748b; font-size: 10px; line-height: 1.45; }
.event-radar__event-foot a { color: var(--primary-color, #52c41a); }
.event-radar__empty { min-height: 150px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #94a3b8; font-size: 11px; }
.event-radar__empty .anticon { font-size: 24px; }
.theme-dark.event-radar { color: #e5e7eb; }
.theme-dark .event-radar__header,
.theme-dark .event-radar__verdict,
.theme-dark .event-radar__metrics div,
.theme-dark .event-radar__event { border-color: #2a2f35; }
.theme-dark .event-radar__verdict { background: #181b1f; }
.theme-dark .event-radar__summary { color: #aeb7c2; }
@media (max-width: 480px) { .event-radar__metrics { grid-template-columns: 1fr; } }
</style>
