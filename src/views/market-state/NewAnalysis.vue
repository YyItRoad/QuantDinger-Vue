<template>
  <a-modal
    title="新增分析"
    wrap-class-name="analysis-create"
    centered
    :body-style="{ maxHeight: '60vh', overflowY: 'auto' }"
    :visible="visible"
    :confirm-loading="saving"
    :ok-button-props="{ props: { disabled: !selected || saving } }"
    @ok="submit"
    @cancel="$emit('close')">
    <a-form layout="vertical">
      <a-form-item label="市场">
        <a-select v-model="form.market" :disabled="saving" @change="resetSymbol">
          <a-select-option v-for="m in markets" :key="m.value" :value="m.value">{{ marketLabel(m) }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-row v-if="form.market === 'Crypto'" :gutter="16">
        <a-col :span="12"><a-form-item label="交易所">
          <a-select v-model="form.exchange_id" :disabled="saving" @change="resetSymbol">
            <a-select-option v-for="exchange in exchanges" :key="exchange" :value="exchange">{{ exchange.toUpperCase() }}</a-select-option>
          </a-select>
        </a-form-item></a-col>
        <a-col :span="12"><a-form-item label="品种类型">
          <a-select v-model="form.market_type" :disabled="saving" @change="resetSymbol">
            <a-select-option value="swap">合约</a-select-option><a-select-option value="spot">现货</a-select-option>
          </a-select>
        </a-form-item></a-col>
      </a-row>
      <a-form-item label="品种">
        <a-select
          :value="selectedKey"
          show-search
          :filter-option="false"
          :loading="searching"
          :disabled="saving"
          placeholder="输入代码搜索并选择品种"
          :not-found-content="searching ? '搜索中…' : '暂无结果'"
          @search="search"
          @change="selectSymbol"
        >
          <a-select-option v-for="(item, index) in symbols" :key="String(index)" :value="String(index)">{{ item.symbol }} {{ item.name || '' }}</a-select-option>
        </a-select>
        <div v-if="searchError" role="alert">{{ searchError }}</div>
      </a-form-item>
      <a-form-item label="分析周期">
        <a-select v-model="form.timeframe" :disabled="saving">
          <a-select-option value="1h">1 小时</a-select-option><a-select-option value="4h">4 小时</a-select-option><a-select-option value="1d">日线</a-select-option>
        </a-select>
      </a-form-item>
      <p class="analysis-note">{{ demo ? '当前为演示模式，保存后不会执行真实分析。' : '任务将保存到数据库；分析执行功能尚未接入，暂不会自动产生结果。' }}</p>
    </a-form>
  </a-modal>
</template>

<script>
import { searchSymbols } from '@/api/market'
import { CRYPTO_EXCHANGE_IDS } from '@/utils/marketContext'
import { loadEnabledMarketOptions, firstMarketValue } from '@/utils/marketModules'
import { createAnalysisTask } from '@/api/market-state'

export default {
  props: { visible: Boolean, demo: Boolean },
  data () {
    return {
      markets: [],
      exchanges: CRYPTO_EXCHANGE_IDS,
      symbols: [],
      selected: null,
      selectedKey: undefined,
      searching: false,
      searchError: '',
      saving: false,
      searchSequence: 0,
      searchTimer: null,
      form: { market: 'Crypto', exchange_id: 'binance', market_type: 'swap', timeframe: '4h' }
    }
  },
  async created () {
    this.markets = await loadEnabledMarketOptions({ includeFeatures: ['research'] })
    this.form.market = firstMarketValue(this.markets)
  },
  beforeDestroy () {
    clearTimeout(this.searchTimer)
    this.searchSequence++
  },
  methods: {
    marketLabel (market) {
      const text = this.$t(market.i18nKey)
      return text === market.i18nKey ? market.label : text
    },
    resetSymbol () {
      clearTimeout(this.searchTimer)
      this.searchSequence++
      this.symbols = []
      this.selected = null
      this.selectedKey = undefined
      this.searching = false
      this.searchError = ''
    },
    search (keyword) {
      this.resetSymbol()
      if (!keyword.trim()) return
      const sequence = this.searchSequence
      this.searching = true
      this.searchTimer = setTimeout(async () => {
        try {
          const response = await searchSymbols({
            market: this.form.market,
            keyword: keyword.trim(),
            limit: 20,
            exchange_id: this.form.market === 'Crypto' ? this.form.exchange_id : undefined,
            market_type: this.form.market === 'Crypto' ? this.form.market_type : undefined
          })
          if (sequence !== this.searchSequence) return
          if (response.code !== 1) throw new Error(response.msg || '品种搜索失败')
          this.symbols = (Array.isArray(response.data) ? response.data : []).filter(item => item.symbol)
        } catch (error) {
          if (sequence === this.searchSequence) this.searchError = error.backendMessage || error.message || '品种搜索失败'
        } finally {
          if (sequence === this.searchSequence) this.searching = false
        }
      }, 300)
    },
    selectSymbol (key) {
      this.selectedKey = key
      this.selected = this.symbols[Number(key)]
    },
    async submit () {
      if (!this.selected || this.saving) return
      this.saving = true
      try {
        const response = await createAnalysisTask({
          ...this.form, symbol: this.selected.symbol, instrument_id: this.selected.instrument_id || ''
        })
        if (response.code !== 1) throw new Error(response.msg || '保存失败')
        this.$message.success(this.demo ? '分析任务已保存（演示）' : '分析任务已保存')
        this.$emit('saved')
      } catch (error) {
        this.$message.error(error.backendMessage || error.message || '保存失败')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>
