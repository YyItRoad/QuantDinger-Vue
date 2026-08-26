<template>
  <div class="position-manager-page">
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
          @change="syncPositions"
        >
          <a-select-option v-for="credential in binanceCredentials" :key="credential.id" :value="credential.id">
            {{ credentialLabel(credential) }}
          </a-select-option>
        </a-select>
        <a-button
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
      v-if="!binanceCredentials.length && !loadingCredentials"
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
      type="info"
      show-icon
      :message="$t('positionManager.pendingTitle')"
      :description="$t('positionManager.pendingDescription')"
      class="pm-alert"
    />

    <a-card :title="$t('positionManager.positionsTitle')" :loading="syncing" class="pm-card">
      <a-table
        :columns="columns"
        :data-source="positions"
        row-key="key"
        :pagination="false"
        :locale="{ emptyText: $t('positionManager.positionsEmpty') }"
        :scroll="{ x: 820 }"
      >
        <template slot="side" slot-scope="text">
          <a-tag :color="text === 'long' ? 'green' : 'red'">{{ sideText(text) }}</a-tag>
        </template>
        <template slot="decimal" slot-scope="text"><span class="pm-decimal">{{ text }}</span></template>
      </a-table>
      <div v-if="fetchedAt" class="pm-sync-time">
        {{ $t('positionManager.lastSynced') }}：{{ fetchedAt }}
      </div>
    </a-card>
  </div>
</template>

<script>
import { listExchangeCredentials } from '@/api/credentials'
import { getAccountSnapshot } from '@/api/strategy'
import { formatExchangeCredentialLabel } from '@/utils/exchangeCredential'
import { requireCompleteSwapSnapshot } from '@/utils/positionManager'

function responseData (response) {
  return response && response.data && typeof response.data === 'object' ? response.data : {}
}

export default {
  name: 'PositionManager',
  data () {
    return {
      credentials: [],
      selectedCredentialId: undefined,
      positions: [],
      loadingCredentials: false,
      syncing: false,
      errorMessage: '',
      fetchedAt: ''
    }
  },
  computed: {
    binanceCredentials () {
      return this.credentials.filter(item =>
        ['binance', 'binanceusdm', 'binancefutures'].includes(String(item.exchange_id || '').toLowerCase()))
    },
    columns () {
      return [
        { title: this.$t('positionManager.symbol'), dataIndex: 'symbol' },
        { title: this.$t('positionManager.side'), dataIndex: 'side', scopedSlots: { customRender: 'side' } },
        { title: this.$t('positionManager.quantity'), dataIndex: 'sizeDisplay', scopedSlots: { customRender: 'decimal' } },
        { title: this.$t('positionManager.entryPrice'), dataIndex: 'entryPriceDisplay', scopedSlots: { customRender: 'decimal' } },
        { title: this.$t('positionManager.markPrice'), dataIndex: 'markPriceDisplay', scopedSlots: { customRender: 'decimal' } },
        { title: this.$t('positionManager.leverage'), dataIndex: 'leverageDisplay' }
      ]
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
    notifyError (error, fallback) {
      this.errorMessage = (error && (error.backendMessage || error.message)) || fallback
    },
    async loadCredentials () {
      this.loadingCredentials = true
      try {
        const response = await listExchangeCredentials()
        if (!response || response.code !== 1) throw new Error((response && response.msg) || this.$t('positionManager.credentialsFailed'))
        this.credentials = responseData(response).items || []
        if (!this.selectedCredentialId && this.binanceCredentials.length) {
          this.selectedCredentialId = this.binanceCredentials[0].id
          await this.syncPositions()
        }
      } catch (error) {
        this.credentials = []
        this.notifyError(error, this.$t('positionManager.credentialsFailed'))
      } finally {
        this.loadingCredentials = false
      }
    },
    async syncPositions () {
      if (!this.selectedCredentialId) return
      this.syncing = true
      this.errorMessage = ''
      try {
        const response = await getAccountSnapshot({ credential_id: this.selectedCredentialId })
        if (!response || response.code !== 1) throw new Error((response && response.msg) || this.$t('positionManager.syncFailed'))
        const snapshot = responseData(response)
        this.positions = requireCompleteSwapSnapshot(snapshot)
        this.fetchedAt = snapshot.fetched_at ? new Date(snapshot.fetched_at * 1000).toLocaleString() : ''
        this.$message.success(this.positions.length ? this.$t('positionManager.syncSuccess') : this.$t('positionManager.syncEmpty'))
      } catch (error) {
        this.positions = []
        this.fetchedAt = ''
        this.notifyError(error, this.$t('positionManager.syncFailed'))
      } finally {
        this.syncing = false
      }
    }
  }
}
</script>

<style scoped>
.position-manager-page { min-height: calc(100vh - 64px); padding: 20px; background: #f4f6f8; }
.pm-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.pm-header h1 { margin: 0 0 6px; color: #1f2933; font-size: 24px; }
.pm-header p { max-width: 760px; margin: 0; color: #667085; }
.pm-header-actions { display: flex; align-items: center; gap: 8px; }
.pm-credential-select { min-width: 280px; }
.pm-alert, .pm-card { margin-bottom: 16px; }
.pm-decimal { font-family: SFMono-Regular, Consolas, 'Liberation Mono', monospace; font-variant-numeric: tabular-nums; }
.pm-sync-time { margin-top: 12px; color: #8c8c8c; font-size: 12px; text-align: right; }
@media (max-width: 900px) {
  .pm-header { flex-direction: column; }
  .pm-header-actions { width: 100%; flex-wrap: wrap; }
  .pm-credential-select { min-width: 0; flex: 1; }
}
</style>

<style>
body.dark .position-manager-page { background: #111827; }
body.dark .position-manager-page .pm-header h1 { color: #f3f4f6; }
body.dark .position-manager-page .pm-header p,
body.dark .position-manager-page .pm-sync-time { color: #9ca3af; }
body.dark .position-manager-page .ant-card { color: #e5e7eb; background: #1f2937; border-color: #374151; }
body.dark .position-manager-page .ant-card-head { color: #f3f4f6; border-color: #374151; }
body.dark .position-manager-page .ant-table { color: #e5e7eb; background: #1f2937; }
body.dark .position-manager-page .ant-table-thead > tr > th { color: #e5e7eb; background: #273449; border-color: #374151; }
body.dark .position-manager-page .ant-table-tbody > tr > td { border-color: #374151; }
body.dark .position-manager-page .ant-table-tbody > tr:hover > td { background: #273449; }
</style>
