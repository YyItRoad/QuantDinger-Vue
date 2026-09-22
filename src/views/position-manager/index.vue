<template>
  <div class="position-manager-page" :class="{ 'theme-dark': isDarkTheme }">
    <section class="pm-header">
      <div>
        <h1><a-icon type="safety" /> {{ $t('positionManager.title') }}</h1>
        <p>{{ $t('positionManager.subtitle') }}</p>
      </div>
      <div class="pm-header-actions">
        <a-select
          v-model="selectedCredentialId"
          class="pm-credential-select"
          :loading="loadingCredentials"
          :disabled="syncing"
          :placeholder="$t('positionManager.credentialPlaceholder')"
          @change="handleCredentialChange"
        >
          <a-select-option v-for="credential in selectableCredentials" :key="credential.id" :value="credential.id">
            {{ credentialLabel(credential) }}
          </a-select-option>
        </a-select>
        <a-button
          v-if="activeTab === 'positions'"
          type="primary"
          class="pm-sync-button"
          :loading="syncing"
          :disabled="!selectedCredentialId"
          @click="syncPositions"
        >
          <a-icon type="reload" /> {{ $t('positionManager.syncPositions') }}
        </a-button>
      </div>
    </section>

    <a-alert
      v-if="!selectableCredentials.length && !loadingCredentials"
      type="warning"
      show-icon
      :message="$t('positionManager.credentialEmpty')"
      class="pm-alert"
    />
    <a-alert
      v-if="errorMessage"
      type="error"
      show-icon
      :message="errorMessage"
      class="pm-alert"
    />
    <a-alert
      v-if="warningMessage"
      type="warning"
      show-icon
      :message="warningMessage"
      class="pm-alert"
    />
    <a-tabs v-model="activeTab" class="pm-tabs" @change="handleTabChange">
      <a-tab-pane key="positions" :tab="$t('positionManager.currentPositionsTab')">
        <a-card :title="$t('positionManager.positionsTitle')" :loading="syncing" class="pm-card">
          <a-table
            :columns="columns"
            :data-source="positions"
            row-key="key"
            :pagination="false"
            :locale="{ emptyText: $t('positionManager.positionsEmpty') }"
            :scroll="{ x: 820 }"
          >
            <template slot="marketType" slot-scope="text">
              <span>{{ marketTypeText(text) }}</span>
            </template>
            <template slot="side" slot-scope="text">
              <a-tag :color="text === 'long' ? 'green' : 'red'">{{ sideText(text) }}</a-tag>
            </template>
            <template slot="decimal" slot-scope="text"><span class="pm-decimal">{{ text }}</span></template>
            <template slot="management" slot-scope="text, record">
              <a-button
                v-if="record.managementState === 'managed'"
                type="link"
                size="small"
                class="pm-strategy-link"
                @click="openStrategy(record.managingStrategies[0])"
              >
                {{ record.managingStrategies[0].name }}
              </a-button>
              <span v-else-if="record.managementState === 'conflict'" class="pm-conflict">
                {{ $t('positionManager.managementConflict', { count: record.managingStrategies.length }) }}
              </span>
              <a-button v-else type="link" size="small" class="pm-strategy-link" @click="openManagedStrategyEditor(record)">
                {{ $t('positionManager.createManagement') }}
              </a-button>
            </template>
          </a-table>
          <div v-if="fetchedAt" class="pm-sync-time">
            {{ $t('positionManager.lastSynced') }}：{{ fetchedAt }}
          </div>
        </a-card>
      </a-tab-pane>
      <a-tab-pane key="history" :tab="$t('positionManager.tradeHistoryTab')">
        <a-card :title="$t('positionManager.tradeHistoryTitle')" class="pm-card">
          <a-table
            :columns="historyColumns"
            :data-source="historyItems"
            row-key="id"
            :loading="historyLoading"
            :pagination="historyPagination"
            :locale="{ emptyText: $t('positionManager.tradeHistoryEmpty') }"
            :scroll="{ x: 1180 }"
            @change="handleHistoryTableChange"
          >
            <template slot="historySide" slot-scope="text">
              <a-tag :color="text === 'long' ? 'green' : 'red'">{{ sideText(text) }}</a-tag>
            </template>
            <template slot="historyLeverage" slot-scope="text, record">
              <span>{{ formatLeverageTimeframe(record) }}</span>
            </template>
            <template slot="historyPrice" slot-scope="text, record">
              <span class="pm-decimal">{{ formatNumber(record.entry_price) }} → {{ formatNumber(record.exit_price) }}</span>
            </template>
            <template slot="historyProfitRate" slot-scope="text">
              <span :class="profitClass(text)">{{ signedNumber(text, 2) }}%</span>
            </template>
            <template slot="historyProfit" slot-scope="text, record">
              <span :class="profitClass(text)" class="pm-decimal">{{ signedNumber(text, 2) }} {{ record.profit_ccy || '' }}</span>
            </template>
            <template slot="historyCloseReason" slot-scope="text">
              <span>{{ closeReasonText(text) }}</span>
            </template>
            <template slot="historyTime" slot-scope="text, record">
              <div class="pm-time-range">
                <div>{{ $t('positionManager.entryTimeShort') }}：{{ formatTime(record.entry_time) }}</div>
                <div>{{ $t('positionManager.exitTimeShort') }}：{{ formatTime(record.exit_time) }}</div>
              </div>
            </template>
            <template slot="historyAction" slot-scope="text, record">
              <a-button type="link" size="small" class="pm-strategy-link" @click="openHistoryDetail(record)">
                {{ $t('positionManager.viewDetails') }}
              </a-button>
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>
    </a-tabs>

    <a-modal
      v-model="historyDetailVisible"
      :title="$t('positionManager.tradeDetailTitle')"
      :footer="null"
      :wrap-class-name="isDarkTheme ? 'pm-history-modal pm-history-modal--dark' : 'pm-history-modal'"
      :body-style="{ maxHeight: '72vh', overflowY: 'auto' }"
      width="860px"
    >
      <div v-if="selectedHistoryItem" class="pm-history-detail">
        <section v-for="section in historyDetailSections" :key="section.title" class="pm-detail-section">
          <h3>{{ section.title }}</h3>
          <a-descriptions bordered size="small" :column="2">
            <a-descriptions-item v-for="field in section.fields" :key="field" :label="historyFieldLabel(field)">
              <span class="pm-detail-value">{{ historyDetailValue(field) }}</span>
            </a-descriptions-item>
          </a-descriptions>
        </section>
      </div>
    </a-modal>

    <managed-strategy-editor
      v-if="managedEditorOpen"
      :visible="managedEditorOpen"
      mode="create"
      :initial-config="managedEditorInitialConfig"
      :create-handler="submitManagedStrategy"
      @close="closeManagedStrategyEditor"
      @saved="handleManagedStrategySaved"
    />
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { listExchangeCredentials } from '@/api/credentials'
import { createManagedAccountStrategy, getManagedAccountPositions, getManagedPositionSnapshot, getPositionManagementTradeHistory } from '@/api/strategy'
import { formatExchangeCredentialLabel } from '@/utils/exchangeCredential'
import sessionCache from '@/utils/sessionCache'
import {
  accountPositionSnapshotCacheKey,
  buildManagedStrategyInitialConfig,
  buildManagedStrategyRequest,
  cacheableAccountPositionSnapshot,
  formatTradeHistoryNumber,
  formatTradeHistoryTime,
  mergeManagedPositionRows,
  requireCompleteAccountSnapshot,
  selectableSnapshotCredentials
} from '@/utils/positionManager'
import ManagedStrategyEditor from './components/ManagedStrategyEditor.vue'

const POSITION_SNAPSHOT_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const HISTORY_PAGE_SIZE = 20
const HISTORY_FIELD_LABELS_ZH = {
  id: '历史记录 ID',
  source_trade_id: '原交易 ID',
  source_strategy_id: '原策略 ID',
  user_id: '用户 ID',
  strategy_name: '策略名称',
  strategy_type: '策略类型',
  market_category: '市场分类',
  execution_mode: '执行模式',
  strategy_status: '策略状态',
  timeframe: '周期',
  leverage: '杠杆',
  entry_time: '开仓时间',
  strategy_run_id: '运行实例 ID',
  strategy_started_at: '策略启动时间',
  strategy_stopped_at: '策略停止时间',
  strategy_stop_reason: '策略停止原因',
  exchange_id: '交易所',
  credential_id: '账户凭证 ID',
  exchange_account_name: '交易所账户名称',
  market_type: '市场类型',
  inst_id: '交易所标的 ID',
  settlement_ccy: '结算币种',
  pending_order_id: '待处理订单 ID',
  order_intent_id: '订单意图 ID',
  order_type: '订单类型',
  order_status: '订单状态',
  requested_amount: '委托数量',
  filled_amount: '成交数量',
  exchange_order_id: '交易所订单 ID',
  client_order_id: '客户端订单 ID',
  signal_at: '信号时间',
  order_created_at: '订单创建时间',
  order_sent_at: '订单发送时间',
  exit_time: '平仓时间',
  symbol: '交易对',
  symbol_canonical: '标准交易对',
  trade_type: '交易动作',
  position_side: '持仓方向',
  entry_price: '开仓价格',
  exit_price: '平仓价格',
  trade_value: '成交金额',
  profit_rate: '盈利率',
  profit: '盈利',
  profit_ccy: '盈利币种',
  close_reason: '平仓原因',
  trade_recorded_at: '交易记录时间',
  fill_source: '成交来源',
  grid_order_id: '网格订单 ID',
  grid_matched_profit: '网格匹配盈利',
  execution_event_id: '执行事件 ID',
  exchange_fill_id: '交易所成交 ID',
  commission: '手续费',
  commission_ccy: '手续费币种',
  commission_quote: '折算手续费',
  fee_status: '手续费状态',
  fee_source: '手续费来源',
  funding_fee_total: '资金费合计',
  funding_fee_ccy: '资金费币种',
  archived_at: '归档时间'
}
const HISTORY_DETAIL_FIELDS = [
  { title: 'positionManager.detailStrategy', fields: ['id', 'source_trade_id', 'source_strategy_id', 'strategy_name', 'strategy_type', 'market_category', 'execution_mode', 'strategy_status', 'timeframe', 'leverage', 'entry_time', 'strategy_run_id', 'strategy_started_at', 'strategy_stopped_at', 'strategy_stop_reason'] },
  { title: 'positionManager.detailAccount', fields: ['user_id', 'exchange_id', 'credential_id', 'exchange_account_name', 'market_type', 'inst_id', 'settlement_ccy'] },
  { title: 'positionManager.detailTrade', fields: ['symbol', 'symbol_canonical', 'trade_type', 'position_side', 'entry_price', 'exit_price', 'filled_amount', 'trade_value', 'profit_rate', 'profit', 'profit_ccy', 'close_reason', 'trade_recorded_at'] },
  { title: 'positionManager.detailOrder', fields: ['pending_order_id', 'order_intent_id', 'order_type', 'order_status', 'requested_amount', 'exchange_order_id', 'client_order_id', 'signal_at', 'order_created_at', 'order_sent_at', 'exit_time', 'fill_source', 'execution_event_id', 'exchange_fill_id'] },
  { title: 'positionManager.detailFees', fields: ['commission', 'commission_ccy', 'commission_quote', 'fee_status', 'fee_source', 'funding_fee_total', 'funding_fee_ccy', 'grid_order_id', 'grid_matched_profit', 'archived_at'] }
]

function responseData (response) {
  return response && response.data && typeof response.data === 'object' ? response.data : {}
}

export default {
  name: 'PositionManager',
  components: { ManagedStrategyEditor },
  data () {
    return {
      credentials: [],
      selectedCredentialId: undefined,
      positions: [],
      loadingCredentials: false,
      syncing: false,
      errorMessage: '',
      warningMessage: '',
      fetchedAt: '',
      activeTab: 'positions',
      historyItems: [],
      historyLoading: false,
      historyLoadedCredentialId: 0,
      historyPage: 1,
      historyTotal: 0,
      historyDetailVisible: false,
      selectedHistoryItem: null,
      managedEditorOpen: false,
      managedEditorPosition: null
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme,
      currentUser: state => state.user.info
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    selectableCredentials () {
      return selectableSnapshotCredentials(this.credentials)
    },
    managedEditorInitialConfig () {
      if (!this.managedEditorPosition || !this.selectedCredentialId) return {}
      return buildManagedStrategyInitialConfig(this.managedEditorPosition, this.selectedCredentialId)
    },
    columns () {
      return [
        { title: this.$t('positionManager.symbol'), dataIndex: 'symbol' },
        { title: this.$t('positionManager.marketType'), dataIndex: 'marketType', scopedSlots: { customRender: 'marketType' } },
        { title: this.$t('positionManager.side'), dataIndex: 'side', scopedSlots: { customRender: 'side' } },
        { title: this.$t('positionManager.quantity'), dataIndex: 'sizeDisplay', scopedSlots: { customRender: 'decimal' } },
        { title: this.$t('positionManager.entryPrice'), dataIndex: 'entryPriceDisplay', scopedSlots: { customRender: 'decimal' } },
        { title: this.$t('positionManager.markPrice'), dataIndex: 'markPriceDisplay', scopedSlots: { customRender: 'decimal' } },
        { title: this.$t('positionManager.leverage'), dataIndex: 'leverageDisplay' },
        { title: this.$t('positionManager.management'), key: 'management', scopedSlots: { customRender: 'management' } }
      ]
    },
    historyColumns () {
      return [
        { title: this.$t('positionManager.entryExitTime'), key: 'entryExitTime', scopedSlots: { customRender: 'historyTime' }, width: 210 },
        { title: this.$t('positionManager.symbol'), dataIndex: 'symbol', width: 130 },
        { title: this.$t('positionManager.side'), dataIndex: 'position_side', scopedSlots: { customRender: 'historySide' }, width: 90 },
        { title: this.$t('positionManager.leverageTimeframe'), key: 'leverageTimeframe', scopedSlots: { customRender: 'historyLeverage' }, width: 100 },
        { title: this.$t('positionManager.entryExitPrice'), key: 'entryExitPrice', scopedSlots: { customRender: 'historyPrice' }, width: 210 },
        { title: this.$t('positionManager.profitRate'), dataIndex: 'profit_rate', scopedSlots: { customRender: 'historyProfitRate' }, width: 105 },
        { title: this.$t('positionManager.profit'), dataIndex: 'profit', scopedSlots: { customRender: 'historyProfit' }, width: 150 },
        { title: this.$t('positionManager.closeReason'), dataIndex: 'close_reason', scopedSlots: { customRender: 'historyCloseReason' }, width: 190 },
        { title: this.$t('positionManager.action'), key: 'action', scopedSlots: { customRender: 'historyAction' }, width: 80, fixed: 'right' }
      ]
    },
    historyPagination () {
      return {
        current: this.historyPage,
        pageSize: HISTORY_PAGE_SIZE,
        total: this.historyTotal,
        showSizeChanger: false,
        showTotal: total => this.$t('positionManager.totalRecords', { total })
      }
    },
    historyDetailSections () {
      return HISTORY_DETAIL_FIELDS.map(section => ({
        title: this.$t(section.title),
        fields: section.fields
      }))
    }
  },
  created () {
    this.loadCredentials()
  },
  methods: {
    credentialLabel (credential) {
      return formatExchangeCredentialLabel(credential, { unnamed: '未命名凭证' })
    },
    sideText (side) {
      if (side === 'long') return this.$t('positionManager.long')
      if (side === 'short') return this.$t('positionManager.short')
      return side || '--'
    },
    marketTypeText (marketType) {
      if (marketType === 'swap') return this.$t('positionManager.swap')
      if (marketType === 'spot') return this.$t('positionManager.spot')
      return marketType || '--'
    },
    formatNumber (value, digits = 8) {
      return formatTradeHistoryNumber(value, digits)
    },
    formatTime (value) {
      return formatTradeHistoryTime(value)
    },
    signedNumber (value, digits) {
      const number = Number(value)
      if (!Number.isFinite(number)) return '--'
      const formatted = this.formatNumber(number, digits)
      return number > 0 ? `+${formatted}` : formatted
    },
    profitClass (value) {
      const number = Number(value)
      return number > 0 ? 'pm-profit-positive' : number < 0 ? 'pm-profit-negative' : ''
    },
    formatLeverageTimeframe (record) {
      const leverage = this.formatNumber(record.leverage, 2)
      return `${leverage === '--' ? '--' : `${leverage}x`} · ${record.timeframe || '--'}`
    },
    historyFieldLabel (field) {
      const locale = String((this.$i18n && this.$i18n.locale) || '')
      if (locale.startsWith('zh')) return HISTORY_FIELD_LABELS_ZH[field] || field
      return field.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    },
    closeReasonText (reason) {
      const code = String(reason || '').trim()
      if (!code) return '--'
      const keys = [
        `positionManager.closeReason.${code}`,
        `trading-assistant.tradeReason.${code}`
      ]
      for (const key of keys) {
        const translated = this.$t(key)
        if (translated !== key) return translated
      }
      return code
    },
    historyDetailValue (field) {
      if (!this.selectedHistoryItem) return '--'
      const value = this.selectedHistoryItem[field]
      if (field.endsWith('_at') || field.endsWith('_time')) return this.formatTime(value)
      if (field === 'position_side') return this.sideText(value)
      if (field === 'market_type') return this.marketTypeText(value)
      if (value === null || value === undefined || value === '') return '--'
      if (field === 'profit') return this.formatNumber(value, 2)
      if (field === 'close_reason') {
        const translated = this.closeReasonText(value)
        return translated === String(value) ? translated : `${translated}（${value}）`
      }
      return String(value)
    },
    openHistoryDetail (record) {
      this.selectedHistoryItem = record
      this.historyDetailVisible = true
    },
    async handleTabChange (tab) {
      if (tab === 'history') await this.loadTradeHistory(false)
      if (tab === 'positions') await this.loadPositions()
    },
    async handleCredentialChange () {
      this.historyPage = 1
      this.historyItems = []
      this.historyTotal = 0
      this.historyLoadedCredentialId = 0
      if (this.activeTab === 'history') await this.loadTradeHistory(true)
      else await this.loadPositions()
    },
    handleHistoryTableChange (pagination) {
      this.historyPage = Number((pagination && pagination.current) || 1)
      this.loadTradeHistory(true)
    },
    async loadTradeHistory (force) {
      if (!this.selectedCredentialId) return
      if (!force && this.historyLoadedCredentialId === Number(this.selectedCredentialId)) return
      this.historyLoading = true
      this.errorMessage = ''
      try {
        const response = await getPositionManagementTradeHistory({
          credential_id: this.selectedCredentialId,
          page: this.historyPage,
          page_size: HISTORY_PAGE_SIZE
        })
        if (!response || response.code !== 1) throw new Error((response && response.msg) || this.$t('positionManager.tradeHistoryFailed'))
        const data = responseData(response)
        this.historyItems = Array.isArray(data.items) ? data.items : []
        this.historyTotal = Number(data.total || 0)
        this.historyPage = Number(data.page || 1)
        this.historyLoadedCredentialId = Number(this.selectedCredentialId)
      } catch (error) {
        this.historyItems = []
        this.historyTotal = 0
        this.notifyError(error, this.$t('positionManager.tradeHistoryFailed'))
      } finally {
        this.historyLoading = false
      }
    },
    notifyError (error, fallback) {
      this.errorMessage = (error && (error.backendMessage || error.message)) || fallback
    },
    openStrategy (strategy) {
      if (!strategy || !strategy.id) return
      this.$router.push({ path: '/strategy-center', query: { strategyId: strategy.id } }).catch(() => {})
    },
    openManagedStrategyEditor (position) {
      this.managedEditorPosition = position
      this.managedEditorOpen = true
    },
    closeManagedStrategyEditor () {
      this.managedEditorOpen = false
      this.managedEditorPosition = null
    },
    submitManagedStrategy (strategyPayload) {
      return createManagedAccountStrategy(buildManagedStrategyRequest(
        this.managedEditorPosition,
        this.selectedCredentialId,
        strategyPayload
      ))
    },
    async handleManagedStrategySaved () {
      this.closeManagedStrategyEditor()
      await this.syncPositions()
    },
    async loadCredentials () {
      this.loadingCredentials = true
      try {
        const response = await listExchangeCredentials()
        if (!response || response.code !== 1) throw new Error((response && response.msg) || this.$t('positionManager.credentialsFailed'))
        this.credentials = responseData(response).items || []
        if (!this.selectedCredentialId && this.selectableCredentials.length) {
          this.selectedCredentialId = this.selectableCredentials[0].id
          await this.loadPositions()
        }
      } catch (error) {
        this.credentials = []
        this.notifyError(error, this.$t('positionManager.credentialsFailed'))
      } finally {
        this.loadingCredentials = false
      }
    },
    snapshotCacheKey () {
      const user = this.currentUser || {}
      return accountPositionSnapshotCacheKey(
        user.id || user.userId,
        this.selectedCredentialId
      )
    },
    applyPositionData (snapshot, managedRows) {
      const positions = requireCompleteAccountSnapshot(snapshot)
      this.warningMessage = snapshot.partial === true
        ? (Array.isArray(snapshot.warnings) ? snapshot.warnings : []).filter(Boolean).join('；')
        : ''
      this.positions = mergeManagedPositionRows(positions, managedRows)
      this.fetchedAt = snapshot.fetched_at ? new Date(snapshot.fetched_at * 1000).toLocaleString() : ''
    },
    async loadPositions () {
      return this.loadPositionData(false)
    },
    async syncPositions () {
      return this.loadPositionData(true)
    },
    async loadPositionData (forceExchange) {
      if (!this.selectedCredentialId) return
      this.syncing = true
      this.errorMessage = ''
      this.warningMessage = ''
      try {
        const params = { credential_id: this.selectedCredentialId }
        const cacheKey = this.snapshotCacheKey()
        let snapshot = !forceExchange && cacheKey ? sessionCache.read(cacheKey) : null
        const requests = [getManagedAccountPositions(params)]
        if (!snapshot) requests.push(getManagedPositionSnapshot(params))
        const [managedResponse, snapshotResponse] = await Promise.all(requests)
        if (!managedResponse || managedResponse.code !== 1) {
          throw new Error((managedResponse && managedResponse.msg) || this.$t('positionManager.managementFailed'))
        }
        if (!snapshot) {
          if (!snapshotResponse || snapshotResponse.code !== 1) {
            throw new Error((snapshotResponse && snapshotResponse.msg) || this.$t('positionManager.syncFailed'))
          }
          snapshot = cacheableAccountPositionSnapshot(responseData(snapshotResponse))
          requireCompleteAccountSnapshot(snapshot)
          if (cacheKey) sessionCache.write(cacheKey, snapshot, POSITION_SNAPSHOT_CACHE_TTL_MS)
        }
        this.applyPositionData(snapshot, responseData(managedResponse).items || [])
        if (forceExchange || snapshotResponse) {
          this.$message.success(this.positions.length ? this.$t('positionManager.syncSuccess') : this.$t('positionManager.syncEmpty'))
        }
      } catch (error) {
        this.notifyError(error, this.$t('positionManager.syncFailed'))
      } finally {
        this.syncing = false
      }
    }
  }
}
</script>

<style scoped>
.position-manager-page {
  min-height: calc(100vh - 64px);
  padding: 18px 20px 24px !important;
  background: #f6f7f9;
  color: #18202c;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
}
.pm-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.pm-header h1 { margin: 0 0 6px; color: #1f2933; font-size: 24px; }
.pm-header p { max-width: 760px; margin: 0; color: #667085; }
.pm-header-actions { display: flex; align-items: center; gap: 8px; }
.pm-credential-select { min-width: 280px; }
.pm-alert, .pm-card { margin-bottom: 16px; }
.pm-tabs { margin-top: -4px; }
.pm-decimal { font-family: SFMono-Regular, Consolas, 'Liberation Mono', monospace; font-variant-numeric: tabular-nums; }
.pm-time-range { min-width: 185px; line-height: 1.8; white-space: nowrap; }
.pm-profit-positive { color: #389e0d; font-weight: 600; }
.pm-profit-negative { color: #cf1322; font-weight: 600; }
.pm-detail-section + .pm-detail-section { margin-top: 18px; }
.pm-detail-section h3 { margin-bottom: 10px; }
.pm-detail-value { word-break: break-all; }
.pm-strategy-link { height: auto; padding: 0; }
.pm-conflict { color: #d46b08; }
.pm-unmanaged { color: #8c8c8c; }
.pm-sync-time { margin-top: 12px; color: #8c8c8c; font-size: 12px; text-align: right; }
.position-manager-page.theme-dark { background: #080808; color: #e7e9ed; }
.theme-dark .pm-header h1 { color: #f3f4f6; }
.theme-dark .pm-header p,
.theme-dark .pm-sync-time,
.theme-dark .pm-unmanaged { color: #7f8793; }
.theme-dark .pm-conflict { color: #ffc53d; }
.theme-dark .pm-profit-positive { color: #73d13d; }
.theme-dark .pm-profit-negative { color: #ff7875; }
.theme-dark ::v-deep .ant-card { color: rgba(255, 255, 255, 0.82); background: #111; border-color: rgba(255, 255, 255, 0.1); }
.theme-dark ::v-deep .ant-card-head { color: #f3f4f6; border-color: rgba(255, 255, 255, 0.1); }
.theme-dark ::v-deep .ant-table { color: rgba(255, 255, 255, 0.72); background: #111; }
.theme-dark ::v-deep .ant-table-thead > tr > th { color: rgba(255, 255, 255, 0.68); background: #0d0d0d; border-color: rgba(255, 255, 255, 0.1); }
.theme-dark ::v-deep .ant-table-tbody > tr > td { color: rgba(255, 255, 255, 0.72); background: #111; border-color: rgba(255, 255, 255, 0.08); }
.theme-dark ::v-deep .ant-table-tbody > tr:hover > td { background: #181818 !important; }
.theme-dark ::v-deep .ant-table-placeholder { color: rgba(255, 255, 255, 0.45); background: #111; border-color: rgba(255, 255, 255, 0.1); }
@media (max-width: 900px) {
  .pm-header { flex-direction: column; }
  .pm-header-actions { width: 100%; flex-wrap: wrap; }
  .pm-credential-select { min-width: 0; flex: 1; }
}
</style>

<style>
.pm-history-modal .ant-modal-content {
  overflow: hidden;
  border-radius: 10px;
}
.pm-history-modal .ant-modal-header {
  padding: 16px 20px;
  background: #fff;
}
.pm-history-modal .ant-modal-body {
  padding: 20px;
  color: #18202c;
  background: #fff;
}
.pm-history-modal .pm-detail-section h3 {
  color: #1f2933;
}
.pm-history-modal .ant-descriptions-bordered .ant-descriptions-item-label {
  color: #475467;
  font-weight: 500;
  background: #f7f8fa;
}
.pm-history-modal .ant-descriptions-bordered .ant-descriptions-item-content {
  color: #18202c;
  background: #fff;
}
.pm-history-modal--dark .ant-modal-content,
.pm-history-modal--dark .ant-modal-header,
.pm-history-modal--dark .ant-modal-body {
  color: rgba(255, 255, 255, 0.82);
  background: #141414;
  border-color: rgba(255, 255, 255, 0.1);
}
.pm-history-modal--dark .ant-modal-title,
.pm-history-modal--dark .ant-modal-close,
.pm-history-modal--dark .pm-detail-section h3 {
  color: rgba(255, 255, 255, 0.9);
}
.pm-history-modal--dark .ant-descriptions-bordered .ant-descriptions-view,
.pm-history-modal--dark .ant-descriptions-bordered .ant-descriptions-row,
.pm-history-modal--dark .ant-descriptions-bordered .ant-descriptions-item-label,
.pm-history-modal--dark .ant-descriptions-bordered .ant-descriptions-item-content {
  border-color: rgba(255, 255, 255, 0.1);
}
.pm-history-modal--dark .ant-descriptions-bordered .ant-descriptions-item-label {
  color: rgba(255, 255, 255, 0.58);
  background: #1d1d1d;
}
.pm-history-modal--dark .ant-descriptions-bordered .ant-descriptions-item-content {
  color: rgba(255, 255, 255, 0.82);
  background: #141414;
}
body.dark .pm-history-modal .ant-modal-content,
body.dark .pm-history-modal .ant-modal-header,
body.dark .pm-history-modal .ant-modal-body,
body.realdark .pm-history-modal .ant-modal-content,
body.realdark .pm-history-modal .ant-modal-header,
body.realdark .pm-history-modal .ant-modal-body {
  color: rgba(255, 255, 255, 0.82) !important;
  background: #141414 !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
}
body.dark .pm-history-modal .ant-modal-title,
body.dark .pm-history-modal .ant-modal-close,
body.dark .pm-history-modal .pm-detail-section h3,
body.realdark .pm-history-modal .ant-modal-title,
body.realdark .pm-history-modal .ant-modal-close,
body.realdark .pm-history-modal .pm-detail-section h3 {
  color: rgba(255, 255, 255, 0.9) !important;
}
body.dark .pm-history-modal .ant-descriptions-bordered .ant-descriptions-view,
body.dark .pm-history-modal .ant-descriptions-bordered .ant-descriptions-row,
body.dark .pm-history-modal .ant-descriptions-bordered .ant-descriptions-item-label,
body.dark .pm-history-modal .ant-descriptions-bordered .ant-descriptions-item-content,
body.realdark .pm-history-modal .ant-descriptions-bordered .ant-descriptions-view,
body.realdark .pm-history-modal .ant-descriptions-bordered .ant-descriptions-row,
body.realdark .pm-history-modal .ant-descriptions-bordered .ant-descriptions-item-label,
body.realdark .pm-history-modal .ant-descriptions-bordered .ant-descriptions-item-content {
  border-color: rgba(255, 255, 255, 0.12) !important;
}
body.dark .pm-history-modal .ant-descriptions-bordered .ant-descriptions-item-label,
body.realdark .pm-history-modal .ant-descriptions-bordered .ant-descriptions-item-label {
  color: rgba(255, 255, 255, 0.62) !important;
  background: #1d1d1d !important;
}
body.dark .pm-history-modal .ant-descriptions-bordered .ant-descriptions-item-content,
body.realdark .pm-history-modal .ant-descriptions-bordered .ant-descriptions-item-content {
  color: rgba(255, 255, 255, 0.86) !important;
  background: #141414 !important;
}
</style>
