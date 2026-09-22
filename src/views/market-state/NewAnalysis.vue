<template>
  <a-modal
    title="新增分析"
    width="560px"
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
        <a-input-search
          v-model="keyword"
          :loading="searching"
          :disabled="saving"
          placeholder="输入代码搜索并选择品种"
          size="large"
          allow-clear
          @search="search(keyword, true)"
          @change="search(keyword)"
        />
        <a-spin :spinning="searching">
          <a-list v-if="symbols.length" size="small" :data-source="symbols" class="analysis-symbol-list">
            <a-list-item slot="renderItem" slot-scope="item">
              <a-button block :type="selected === item ? 'primary' : 'default'" :disabled="saving" @click="selected = item">
                <strong>{{ item.symbol }}</strong><span v-if="item.name"> · {{ item.name }}</span>
                <a-icon v-if="selected === item" type="check-circle" />
              </a-button>
            </a-list-item>
          </a-list>
          <p v-else-if="searched && !searching && !searchError" class="analysis-note">未找到品种，请检查交易所、品种类型或行情目录是否已同步。</p>
        </a-spin>
        <a-alert v-if="searchError" :message="searchError" type="error" show-icon />
      </a-form-item>
      <a-form-item label="分析周期">
        <a-select v-model="form.timeframe" :disabled="saving">
          <a-select-option value="1h">1 小时</a-select-option><a-select-option value="4h">4 小时</a-select-option><a-select-option value="1d">日线</a-select-option>
        </a-select>
      </a-form-item>
      <p class="analysis-note">任务将保存到数据库；数字货币任务在后台开启调度后按周期执行。</p>
    </a-form>
  </a-modal>
</template>

<script>
import { searchSymbols } from '@/api/market'
import { CRYPTO_EXCHANGE_IDS } from '@/utils/marketContext'
import { loadEnabledMarketOptions, firstMarketValue } from '@/utils/marketModules'
import { createAnalysisTask } from '@/api/market-state'

export default {
  props: { visible: Boolean },
  data () {
    return {
      markets: [],
      exchanges: CRYPTO_EXCHANGE_IDS,
      symbols: [],
      selected: null,
      keyword: '',
      searched: false,
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
  watch: {
    visible () {
      this.keyword = ''
      this.resetSymbol()
    }
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
      this.searched = false
      this.searching = false
      this.searchError = ''
      if (this.keyword.trim()) this.search(this.keyword)
    },
    search (keyword, immediate = false) {
      clearTimeout(this.searchTimer)
      this.searchSequence++
      this.symbols = []
      this.selected = null
      this.searched = false
      this.searchError = ''
      this.searching = false
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
          this.searched = true
        } catch (error) {
          if (sequence === this.searchSequence) this.searchError = error.backendMessage || error.message || '品种搜索失败'
        } finally {
          if (sequence === this.searchSequence) this.searching = false
        }
      }, immediate ? 0 : 400)
    },
    async submit () {
      if (!this.selected || this.saving) return
      this.saving = true
      try {
        const response = await createAnalysisTask({
          ...this.form, symbol: this.selected.symbol, instrument_id: this.selected.instrument_id || ''
        })
        if (response.code !== 1) throw new Error(response.msg || '保存失败')
        this.$message.success('分析任务已保存')
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
