<template>
  <div class="bp-table-wrapper" :class="{ 'theme-dark': isDarkTheme }">
    <div class="bp-table-toolbar">
      <a-button size="small" :loading="loading" @click="load">
        <a-icon type="reload" /> {{ $t('brokerAccounts.refresh') }}
      </a-button>
      <span class="bp-table-count">
        {{ $t('brokerAccounts.orderHistoryCount', { count: rows.length }) }}
      </span>
    </div>
    <a-table
      :columns="columns"
      :data-source="rows"
      :pagination="false"
      :loading="loading"
      :row-key="rowKey"
      size="small"
      :scroll="{ x: 1530 }"
    >
      <template slot="side" slot-scope="text, record">
        <a-tag :color="(record.side || record.action || '').toLowerCase() === 'buy' ? 'green' : 'red'">
          {{ String(record.side || record.action || '--').toUpperCase() }}
        </a-tag>
      </template>
      <template slot="status" slot-scope="text, record">
        <a-tag :color="statusColor(record.status)">{{ record.status || '--' }}</a-tag>
      </template>
      <template slot="qty" slot-scope="text, record">
        {{ formatQuantity(firstValue(record.quantity, record.qty, record.size)) }}
      </template>
      <template slot="filledQty" slot-scope="text, record">{{ formatQuantity(firstValue(record.filled_qty, record.filled)) }}</template>
      <template slot="fillPrice" slot-scope="text, record">{{ formatMoney(firstValue(record.filled_avg_price, record.avgFillPrice)) }}</template>
      <template slot="submittedAt" slot-scope="text, record">{{ formatTime(firstValue(record.submitted_at, record.submittedAt, record.created_at)) }}</template>
      <template slot="filledAt" slot-scope="text, record">{{ formatTime(firstValue(record.filled_at, record.filledAt)) }}</template>
      <template slot="price" slot-scope="text, record">
        {{ formatMoney(record.limit_price || record.limitPrice || record.price) }}
      </template>
      <template slot="action" slot-scope="text, record">
        <a-popconfirm
          v-if="canCancel(record)"
          :title="$t('brokerAccounts.confirmCancel')"
          :ok-text="$t('brokerAccounts.confirm')"
          :cancel-text="$t('brokerAccounts.cancel')"
          @confirm="onCancel(record)"
        >
          <a-button size="small" type="link" :loading="cancellingId === record.id" :disabled="!!cancellingId">
            <a-icon type="close-circle" /> {{ $t('brokerAccounts.cancelOrder') }}
          </a-button>
        </a-popconfirm>
      </template>
    </a-table>
  </div>
</template>

<script>
import { broker } from '@/api/broker'
import { brokerOrderStatusColor, brokerOrderCanCancel } from '@/utils/brokerOrderStatus'
import { firstValue, brokerPrice, brokerQuantity, brokerTime } from '@/utils/brokerAccountDisplay'

export default {
  name: 'BrokerOrdersTable',
  props: {
    brokerId: { type: String, required: true },
    credentialId: { type: Number, default: null },
    isDarkTheme: { type: Boolean, default: false }
  },
  data () {
    return {
      rows: [],
      loading: false,
      cancellingId: null
    }
  },
  computed: {
    columns () {
      return [
        { title: this.$t('brokerAccounts.col.orderId'), dataIndex: 'id', key: 'id', width: 200, ellipsis: true },
        { title: this.$t('brokerAccounts.col.symbol'), dataIndex: 'symbol', key: 'symbol', width: 110 },
        { title: this.$t('brokerAccounts.col.side'), key: 'side', width: 90, scopedSlots: { customRender: 'side' } },
        { title: this.$t('brokerAccounts.col.qty'), key: 'qty', width: 90, scopedSlots: { customRender: 'qty' }, align: 'right' },
        { title: this.$t('brokerAccounts.col.filledQty'), key: 'filledQty', width: 110, scopedSlots: { customRender: 'filledQty' }, align: 'right' },
        { title: this.$t('brokerAccounts.col.fillPrice'), key: 'fillPrice', width: 120, scopedSlots: { customRender: 'fillPrice' }, align: 'right' },
        { title: this.$t('brokerAccounts.col.submittedAt'), key: 'submittedAt', width: 215, scopedSlots: { customRender: 'submittedAt' } },
        { title: this.$t('brokerAccounts.col.filledAt'), key: 'filledAt', width: 215, scopedSlots: { customRender: 'filledAt' } },
        { title: this.$t('brokerAccounts.col.limitPrice'), key: 'price', width: 110, scopedSlots: { customRender: 'price' }, align: 'right' },
        { title: this.$t('brokerAccounts.col.status'), key: 'status', width: 110, scopedSlots: { customRender: 'status' } },
        { title: this.$t('brokerAccounts.col.action'), key: 'action', width: 140, scopedSlots: { customRender: 'action' }, fixed: 'right' }
      ]
    }
  },
  mounted () {
    this.load()
  },
  methods: {
    firstValue,
    formatMoney: brokerPrice,
    formatQuantity: brokerQuantity,
    formatTime (value) { return brokerTime(value, this.$i18n.locale) },
    statusColor (s) {
      return brokerOrderStatusColor(s)
    },
    canCancel (record) {
      return brokerOrderCanCancel(record, this.brokerId)
    },
    rowKey (row) {
      return row.id || row.ticket || row.symbol || JSON.stringify(row).slice(0, 32)
    },
    async load () {
      this.loading = true
      try {
        const res = await broker[this.brokerId].orders(this.credentialId ? { credential_id: this.credentialId } : {})
        if (res && res.success === false) throw new Error('brokerAccounts.ordersLoadFailed')
        const payload = (res && (res.data || res)) || {}
        const list = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : (payload.orders || []))
        this.rows = list || []
      } catch (_) {
        this.rows = []
        this.$message.error(this.$t('brokerAccounts.ordersLoadFailed'))
      } finally {
        this.loading = false
      }
    },
    async onCancel (record) {
      if (!this.canCancel(record) || this.cancellingId) return
      this.cancellingId = record.id
      try {
        const res = await broker[this.brokerId].cancelOrder(record.id, this.credentialId ? { credential_id: this.credentialId } : {})
        if (!(res && (res.success || (res.data && res.data.success)))) throw new Error('brokerAccounts.cancelFailed')
        this.$message.success(this.$t('brokerAccounts.cancelRequested'))
      } catch (_) {
        this.$message.error(this.$t('brokerAccounts.cancelFailed'))
      } finally {
        await this.load()
        this.cancellingId = null
      }
    }
  }
}
</script>

<style lang="less" scoped>
.bp-table-wrapper { display: flex; flex-direction: column; gap: 10px; }
.bp-table-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.bp-table-count { font-size: 12px; color: #8c8c8c; }

.bp-table-wrapper.theme-dark {
  ::v-deep .ant-table-fixed-right,
  ::v-deep .ant-table-fixed-right .ant-table-header {
    background: #181818;
  }
  .bp-table-count { color: rgba(255, 255, 255, 0.48); }

  ::v-deep .ant-table {
    color: rgba(255, 255, 255, 0.82);
    background: #181818;
  }

  ::v-deep .ant-table-thead > tr > th {
    background: #0d0d0d;
    color: rgba(255, 255, 255, 0.78);
    border-bottom-color: #303030;
  }

  ::v-deep .ant-table-tbody > tr > td {
    background: #181818;
    color: rgba(255, 255, 255, 0.82);
    border-bottom-color: #2a2a2a;
  }

  ::v-deep .ant-table-tbody > tr:hover > td {
    background: #202020 !important;
  }

  ::v-deep .ant-table-placeholder {
    color: rgba(255, 255, 255, 0.45);
    background: #181818;
    border-color: #303030;
  }

  ::v-deep .ant-btn-link[disabled] {
    color: rgba(255, 255, 255, 0.25);
  }
}
</style>
