<template>
  <div class="analysis-page">
    <section class="analysis-header"><h1><a-icon type="line-chart" /> 分析</h1><a-button type="primary" :disabled="!dataReady" @click="creating = true"><a-icon type="plus" /> 新增分析</a-button></section>
    <a-alert v-if="dataReady" class="analysis-alert" type="info" show-icon :message="dataMode === 'demo' ? '演示数据，仅用于界面验证，不会执行真实分析。' : '周期分析需后台开启调度；当前仅支持数字货币，其他市场暂不自动执行。'" />
    <a-alert v-if="error" class="analysis-alert" type="error" show-icon :message="error">
      <a-button slot="description" size="small" @click="load">重试</a-button>
    </a-alert>
    <a-tabs :active-key="tab" @change="changeTab">
      <a-tab-pane key="records" tab="分析记录" /><a-tab-pane key="tasks" tab="分析任务" />
    </a-tabs>
    <a-card>
      <div class="analysis-filters">
        <a-select v-model="current.symbol" aria-label="筛选币种" show-search option-filter-prop="children" @change="filterChanged">
          <a-select-option value="">全部币种</a-select-option>
          <a-select-option v-for="symbol in current.symbols" :key="symbol" :value="symbol">{{ symbol }}</a-select-option>
        </a-select>
        <a-select v-model="current.timeframe" aria-label="筛选周期" @change="filterChanged">
          <a-select-option value="">全部周期</a-select-option><a-select-option value="1h">1 小时</a-select-option><a-select-option value="4h">4 小时</a-select-option><a-select-option value="1d">日线</a-select-option>
        </a-select>
      </div>
      <a-table
        :columns="columns"
        :data-source="current.items"
        :loading="loading"
        row-key="id"
        :pagination="pagination"
        :scroll="{ x: tab === 'records' ? 850 : 540 }"
        @change="pageChanged">
        <template slot="instrument" slot-scope="text, row">
          <strong>{{ row.symbol }}</strong><div class="analysis-secondary">{{ context(row) }}</div>
        </template>
        <template slot="timeframe" slot-scope="text">{{ timeframeLabel(text) }}</template>
        <template slot="phase" slot-scope="text"><a-tag :color="phaseColor(text)">{{ phaseLabel(text) }}</a-tag></template>
        <template slot="date" slot-scope="text">{{ formatTime(text) }}</template>
        <template slot="action" slot-scope="text, row">
          <a-button v-if="tab === 'records'" type="link" size="small" @click="openDetail(row.id)">查看详情</a-button>
          <template v-else>
            <a-button type="link" size="small" :disabled="busyIds.includes(row.id)" @click="toggle(row)">{{ row.enabled ? '停止' : '启动' }}</a-button>
            <a-popconfirm overlay-class-name="analysis-confirm" title="删除此分析任务？已有分析记录将保留。" :disabled="busyIds.includes(row.id)" @confirm="remove(row)">
              <a-button type="link" size="small" :disabled="busyIds.includes(row.id)">删除</a-button>
            </a-popconfirm>
          </template>
        </template>
      </a-table>
    </a-card>
    <a-drawer
      class="analysis-detail"
      title="分析详情"
      :visible="detailVisible"
      destroy-on-close
      width="min(640px, 100vw)"
      @close="closeDetail">
      <a-spin :spinning="detailLoading">
        <a-alert v-if="detailError" type="error" :message="detailError" />
        <template v-if="detail">
          <h2>{{ detail.symbol }} · {{ timeframeLabel(detail.timeframe) }}</h2>
          <p class="analysis-secondary">{{ context(detail) }}</p>
          <p><a-tag :color="phaseColor(detail.phase)">{{ phaseLabel(detail.phase) }}</a-tag>置信度 {{ detail.confidence }}/5</p>
          <p>{{ detail.summary }}</p>
          <a-descriptions bordered :column="1" size="small">
            <a-descriptions-item v-for="dimension in dimensions" :key="dimension.key" :label="dimension.label">{{ stateLabel(detail[dimension.key]) }}</a-descriptions-item>
          </a-descriptions>
          <h3 class="analysis-section">主要依据</h3>
          <ul><li v-for="(item, i) in detail.details.evidence" :key="i">{{ item }}</li></ul>
          <h3 class="analysis-section">反向证据</h3>
          <ul><li v-for="(item, i) in detail.details.counter_evidence" :key="i">{{ item }}</li></ul>
          <p class="analysis-secondary">K 线收盘：{{ formatTime(detail.bar_close_at) }}<br>分析完成：{{ formatTime(detail.created_at) }}</p>
        </template>
      </a-spin>
    </a-drawer>
    <new-analysis v-if="creating" visible :demo="dataMode === 'demo'" @close="creating = false" @saved="createdTask" />
  </div>
</template>

<script>
import NewAnalysis from './NewAnalysis.vue'
import './style.less'
import { listAnalysisRecords, listAnalysisTasks, getAnalysisRecord, setAnalysisTaskEnabled, deleteAnalysisTask } from '@/api/market-state'

const listState = () => ({ items: [], symbols: [], symbol: '', timeframe: '', page: 1, pageSize: 10, total: 0 })
export default {
  name: 'MarketState',
  components: { NewAnalysis },
  data () {
    return {
      tab: 'records',
      lists: { records: listState(), tasks: listState() },
      loading: false,
      error: '',
      dataReady: false,
      dataMode: '',
      creating: false,
      busyIds: [],
      listSequence: 0,
      detailVisible: false,
      detail: null,
      detailError: '',
      detailLoading: false,
      detailSequence: 0,
      dimensions: [{ key: 'trend', label: '趋势' }, { key: 'structure', label: '结构' }, { key: 'ma_state', label: '均线状态' }, { key: 'position', label: '位置' }, { key: 'momentum', label: '动能' }]
    }
  },
  computed: {
    current () { return this.lists[this.tab] },
    columns () {
      const base = [
        { title: '品种', key: 'instrument', scopedSlots: { customRender: 'instrument' }, width: 180 },
        { title: '周期', dataIndex: 'timeframe', scopedSlots: { customRender: 'timeframe' }, width: 90 }
      ]
      if (this.tab === 'records') {
        base.push(
          { title: '阶段', dataIndex: 'phase', scopedSlots: { customRender: 'phase' }, width: 120 },
          { title: '分析结论', dataIndex: 'summary' },
          { title: '完成时间', dataIndex: 'created_at', scopedSlots: { customRender: 'date' }, width: 180 }
        )
      }
      return [...base, { title: '操作', key: 'action', scopedSlots: { customRender: 'action' }, width: 140 }]
    },
    pagination () {
      return { current: this.current.page, pageSize: this.current.pageSize, total: this.current.total, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'], hideOnSinglePage: false, showTotal: total => '共 ' + total + ' 条' }
    }
  },
  created () { this.load() },
  beforeDestroy () { this.listSequence++; this.detailSequence++ },
  methods: {
    timeframeLabel (value) { return { '1h': '1 小时', '4h': '4 小时', '1d': '日线' }[value] || value },
    phaseLabel (value) { return { BASE: '底部', TRANSITION_UP: '向上过渡', ADVANCE: '上涨', TOP: '顶部', TRANSITION_DOWN: '向下过渡', DECLINE: '下跌' }[value] || value },
    phaseColor (value) { return { ADVANCE: 'green', DECLINE: 'red', TRANSITION_UP: 'cyan', TRANSITION_DOWN: 'orange' }[value] || 'blue' },
    stateLabel (value) { return { UP: '向上', DOWN: '向下', PULLBACK: '回调', BULL_ALIGNED: '多头排列', HIGH: '高位' }[value] || value },
    context (row) { return [row.market, row.exchange_id && row.exchange_id.toUpperCase(), row.market_type === 'swap' ? '合约' : '现货'].filter(Boolean).join(' · ') },
    formatTime (value) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '--' },
    message (error) { return error.backendMessage || error.message || '请求失败，请重试' },
    async load () {
      const sequence = ++this.listSequence
      const state = this.current
      const fetch = this.tab === 'records' ? listAnalysisRecords : listAnalysisTasks
      this.loading = true
      this.error = ''
      try {
        const response = await fetch({ page: state.page, page_size: state.pageSize, symbol: state.symbol, timeframe: state.timeframe })
        if (sequence !== this.listSequence) return
        if (response.code !== 1) throw new Error(response.msg || '加载失败')
        Object.assign(state, { items: response.data.items, symbols: response.data.symbols, total: response.data.total, page: response.data.page })
        this.dataMode = response.mode
        this.dataReady = ['demo', 'database'].includes(response.mode)
      } catch (error) {
        if (sequence !== this.listSequence) return
        state.items = []
        state.total = 0
        this.dataReady = false
        this.error = this.message(error)
      } finally {
        if (sequence === this.listSequence) this.loading = false
      }
    },
    changeTab (tab) { this.tab = tab; this.load() },
    filterChanged () { this.current.page = 1; this.load() },
    pageChanged (page) {
      this.current.page = page.pageSize === this.current.pageSize ? page.current : 1
      this.current.pageSize = page.pageSize
      this.load()
    },
    async openDetail (id) {
      const sequence = ++this.detailSequence
      this.detailVisible = true
      this.detail = null
      this.detailError = ''
      this.detailLoading = true
      try {
        const response = await getAnalysisRecord(id)
        if (sequence !== this.detailSequence) return
        if (response.code !== 1) throw new Error(response.msg || '加载失败')
        this.detail = response.data
      } catch (error) {
        if (sequence === this.detailSequence) this.detailError = this.message(error)
      } finally {
        if (sequence === this.detailSequence) this.detailLoading = false
      }
    },
    closeDetail () { this.detailVisible = false; this.detailSequence++ },
    async mutate (row, operation) {
      if (this.busyIds.includes(row.id)) return
      this.busyIds.push(row.id)
      try {
        const response = await operation()
        if (response.code !== 1) throw new Error(response.msg || '操作失败')
        await this.load()
      } catch (error) { this.$message.error(this.message(error)) } finally {
        this.busyIds = this.busyIds.filter(id => id !== row.id)
      }
    },
    toggle (row) { return this.mutate(row, () => setAnalysisTaskEnabled(row.id, !row.enabled)) },
    remove (row) { return this.mutate(row, () => deleteAnalysisTask(row.id)) },
    createdTask () {
      this.creating = false
      this.tab = 'tasks'
      Object.assign(this.current, { symbol: '', timeframe: '', page: 1 })
      this.load()
    }
  }
}
</script>
