<template>
  <div class="instrument-fields">
    <a-form-item :label="field('market')">
      <a-select
        :disabled="disabled"
        :dropdown-class-name="dropdownClassName"
        :value="value.market"
        @change="changeContext('market', $event)"
      >
        <a-select-option v-for="market in marketOptions" :key="market.value" :value="market.value">
          {{ marketLabel(market) }}
        </a-select-option>
      </a-select>
    </a-form-item>
    <a-form-item :label="field('market_type')">
      <a-select
        :disabled="disabled"
        :dropdown-class-name="dropdownClassName"
        :value="value.market_type"
        @change="changeContext('market_type', $event)"
      >
        <a-select-option v-for="kind in productTypes" :key="kind" :value="kind">
          {{ $t('tradePlans.value.' + kind) }}
        </a-select-option>
      </a-select>
    </a-form-item>
    <a-form-item v-if="value.market === 'Crypto'" :label="field('exchange_id')">
      <a-select
        :disabled="disabled"
        :dropdown-class-name="dropdownClassName"
        :value="value.exchange_id || undefined"
        allow-clear
        :placeholder="$t('tradePlans.exchangeOptional')"
        @change="changeContext('exchange_id', $event || '')"
      >
        <a-select-option v-for="exchange in exchanges" :key="exchange" :value="exchange">
          {{ exchange.toUpperCase() }}
        </a-select-option>
        <a-select-option v-if="value.exchange_id && !exchanges.includes(value.exchange_id)" :value="value.exchange_id">
          {{ value.exchange_id }}
        </a-select-option>
      </a-select>
    </a-form-item>
    <a-form-item :label="field('symbol')">
      <a-select
        :disabled="disabled"
        :dropdown-class-name="dropdownClassName"
        :value="selectedKey"
        show-search
        allow-clear
        :filter-option="false"
        :loading="searching"
        :placeholder="$t('tradePlans.searchSymbol')"
        :not-found-content="$t('tradePlans.typeToSearch')"
        option-label-prop="title"
        @search="queueSearch"
        @change="selectSymbol"
      >
        <a-select-option v-for="item in choices" :key="keyOf(item)" :value="keyOf(item)" :title="item.symbol">
          <strong>{{ item.symbol }}</strong>
          <span v-if="item.manual">· {{ $t('tradePlans.manualSymbol') }}</span>
          <span v-else-if="item.name">· {{ item.name }}</span>
        </a-select-option>
      </a-select>
      <p class="instrument-hint">{{ $t(disabled ? 'tradePlans.instrumentLocked' : 'tradePlans.symbolSearchHelp') }}</p>
      <a-alert v-if="searchError" type="warning" show-icon :message="$t('tradePlans.symbolSearchFailed')" />
    </a-form-item>
  </div>
</template>
<script>
import { searchSymbols } from '@/api/market'
import { loadEnabledMarketOptions } from '@/utils/marketModules'
import { CRYPTO_EXCHANGE_IDS, marketContextKey } from '@/utils/marketContext'
export default {
  name: 'TradePlanInstrumentFields',
  props: { value: { type: Object, required: true }, disabled: { type: Boolean, default: false }, dropdownClassName: { type: String, default: '' } },
  data() {
    return {
      markets: [],
      exchanges: CRYPTO_EXCHANGE_IDS,
      results: [],
      query: '',
      searching: false,
      searchError: false,
      searchTimer: null,
      searchSequence: 0
    }
  },
  computed: {
    marketOptions() {
      return this.markets.some((item) => item.value === this.value.market) || !this.value.market
        ? this.markets
        : [...this.markets, { value: this.value.market, label: this.value.market }]
    },
    productTypes() {
      return ['spot', 'swap', 'stock', 'futures', 'option']
    },
    selectedKey() {
      return this.value.symbol ? this.keyOf(this.value) : undefined
    },
    contextKey() {
      return [this.value.market, this.value.market_type, this.value.exchange_id].join('|')
    },
    choices() {
      const items = [...this.results]
      if (this.value.symbol && !items.some((item) => this.keyOf(item) === this.selectedKey)) { items.unshift({ ...this.value }) }
      const symbol = this.query.toUpperCase()
      if (symbol && !items.some((item) => item.symbol === symbol)) {
 items.push({
          market: this.value.market,
          market_type: this.value.market_type,
          exchange_id: this.value.exchange_id || '',
          symbol,
          manual: true
        })
}
      return items
    }
  },
  watch: {
    contextKey() {
      this.resetSearch()
    }
  },
  async created() {
    this.markets = await loadEnabledMarketOptions({ includeFeatures: ['research'] })
  },
  beforeDestroy() {
    this.resetSearch()
  },
  methods: {
    keyOf: marketContextKey,
    field(key) {
      return this.$t('tradePlans.field.' + key)
    },
    marketLabel(market) {
      return market.i18nKey && this.$te(market.i18nKey) ? this.$t(market.i18nKey) : market.label
    },
    resetSearch() {
      clearTimeout(this.searchTimer)
      this.searchSequence++
      this.results = []
      this.query = ''
      this.searching = false
      this.searchError = false
    },
    changeContext(key, value) {
      if (this.disabled) return
      this.resetSearch()
      const next = { ...this.value, [key]: value, symbol: '', instrument_id: '', settlement_ccy: '' }
      if (key === 'market') {
        next.market_type = 'spot'
        next.exchange_id = ''
      }
      this.$emit('input', next)
    },
    queueSearch(keyword) {
      if (this.disabled) return
      clearTimeout(this.searchTimer)
      const sequence = ++this.searchSequence
      this.query = keyword.trim()
      this.results = []
      this.searchError = false
      this.searching = !!this.query
      if (this.query) this.searchTimer = setTimeout(() => this.fetchSymbols(this.query, sequence), 300)
    },
    async fetchSymbols(keyword, sequence) {
      if (this.disabled) return
      const context = { ...this.value }
      try {
        // Other products remain valid text research; the crypto catalog handles spot/swap only.
        if (context.market === 'Crypto' && !['spot', 'swap'].includes(context.market_type)) {
          this.results = []
          return
        }
        const response = await searchSymbols({
          market: context.market,
          keyword,
          limit: 20,
          exchange_id: context.market === 'Crypto' ? context.exchange_id || undefined : undefined,
          market_type: context.market === 'Crypto' ? context.market_type : undefined
        })
        if (sequence !== this.searchSequence) return
        if (response.code !== 1 || !Array.isArray(response.data)) throw new Error('symbol_search_failed')
        this.results = response.data
          .filter((item) => item.symbol)
          .map((item) => ({
            ...item,
            market: item.market || context.market,
            market_type: item.market_type || context.market_type
          }))
      } catch (_) {
        if (sequence === this.searchSequence) this.searchError = true
      } finally {
        if (sequence === this.searchSequence) this.searching = false
      }
    },
    selectSymbol(key) {
      if (this.disabled) return
      if (!key) {
        this.resetSearch()
        this.$emit('input', { ...this.value, symbol: '', instrument_id: '', settlement_ccy: '' })
        return
      }
      const selected = this.choices.find((item) => this.keyOf(item) === key)
      if (!selected) return
      this.$emit('input', {
        ...this.value,
        market: selected.market,
        symbol: selected.symbol,
        market_type: selected.market_type || this.value.market_type,
        exchange_id: selected.exchange_id || '',
        instrument_id: selected.instrument_id || '',
        settlement_ccy: selected.settle_currency || selected.settlement_ccy || ''
      })
      this.resetSearch()
    }
  }
}
</script>
<style scoped>
.instrument-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0 18px;
}
.instrument-hint {
  color: var(--qd-text-secondary);
  font-size: 12px;
  margin: 4px 0 0;
  line-height: 1.5;
}
@media (max-width: 680px) {
  .instrument-fields {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
