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
          @change="syncPositions"
        >
          <a-select-option v-for="credential in selectableCredentials" :key="credential.id" :value="credential.id">
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

    <live-strategy-editor
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
import { createManagedAccountStrategy, getAccountSnapshot, getManagedAccountPositions } from '@/api/strategy'
import { formatExchangeCredentialLabel } from '@/utils/exchangeCredential'
import {
  buildManagedStrategyInitialConfig,
  buildManagedStrategyRequest,
  mergeManagedPositionRows,
  requireCompleteAccountSnapshot,
  selectableSnapshotCredentials
} from '@/utils/positionManager'
import LiveStrategyEditor from '@/views/strategy-center/components/LiveStrategyEditor.vue'

function responseData (response) {
  return response && response.data && typeof response.data === 'object' ? response.data : {}
}

export default {
  name: 'PositionManager',
  components: { LiveStrategyEditor },
  data () {
    return {
      credentials: [],
      selectedCredentialId: undefined,
      positions: [],
      loadingCredentials: false,
      syncing: false,
      errorMessage: '',
      fetchedAt: '',
      managedEditorOpen: false,
      managedEditorPosition: null
    }
  },
  computed: {
    ...mapState({ navTheme: state => state.app.theme }),
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
        const params = { credential_id: this.selectedCredentialId }
        const [snapshotResponse, managedResponse] = await Promise.all([
          getAccountSnapshot(params),
          getManagedAccountPositions(params)
        ])
        if (!snapshotResponse || snapshotResponse.code !== 1) {
          throw new Error((snapshotResponse && snapshotResponse.msg) || this.$t('positionManager.syncFailed'))
        }
        if (!managedResponse || managedResponse.code !== 1) {
          throw new Error((managedResponse && managedResponse.msg) || this.$t('positionManager.managementFailed'))
        }
        const snapshot = responseData(snapshotResponse)
        const positions = requireCompleteAccountSnapshot(snapshot)
        this.positions = mergeManagedPositionRows(positions, responseData(managedResponse).items || [])
        this.fetchedAt = snapshot.fetched_at ? new Date(snapshot.fetched_at * 1000).toLocaleString() : ''
        this.$message.success(this.positions.length ? this.$t('positionManager.syncSuccess') : this.$t('positionManager.syncEmpty'))
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
.pm-decimal { font-family: SFMono-Regular, Consolas, 'Liberation Mono', monospace; font-variant-numeric: tabular-nums; }
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
