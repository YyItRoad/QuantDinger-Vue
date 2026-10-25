<template>
  <div class="trade-plans qd-workspace-page qd-page-frame" :class="{ 'theme-dark': darkTheme }">
    <div class="page-heading">
      <div>
        <h1>{{ t('title') }}</h1>
        <p>{{ t('subtitle') }}</p>
      </div>
      <a-button v-if="canWrite" :disabled="writeBlocked" type="primary" @click="newPlan">{{ t('new') }}</a-button>
    </div>
    <a-alert :message="t('boundary')" type="info" show-icon class="notice" />
    <a-alert v-if="pending" :message="t('pendingHelp')" type="warning" show-icon class="notice">
      <template slot="description">
        <a-button :loading="saving" @click="resolvePending">{{ t('resolvePending') }}</a-button>
      </template>
    </a-alert>
    <a-alert
      v-if="sourceContext"
      type="info"
      show-icon
      closable
      class="notice"
      :message="$t('tradePlans.fromTrade', {symbol: sourceContext.symbol})"
      :description="t('fromTradeHelp')"
      @close="clearSourceContext" />
    <a-card>
      <div class="filters">
        <a-input v-model="filters.q" :placeholder="t('search')" @pressEnter="search" />
        <a-select :dropdown-class-name="selectClass" v-model="filters.lifecycle" @change="search">
          <a-select-option value="">{{ t('allStates') }}</a-select-option>
          <a-select-option v-for="state in states" :key="state" :value="state">{{ label(state) }}</a-select-option>
        </a-select>
        <a-select :dropdown-class-name="selectClass" v-model="filters.direction" @change="search">
          <a-select-option value="">{{ t('allDirections') }}</a-select-option>
          <a-select-option v-for="side in directions" :key="side" :value="side">{{ label(side) }}</a-select-option>
        </a-select>
        <a-input v-model="filters.primary_strategy" :placeholder="field('primary_strategy')" @pressEnter="search" />
        <a-select :dropdown-class-name="selectClass" v-model="filters.retrospective" @change="search">
          <a-select-option value="">{{ t('allRecords') }}</a-select-option>
          <a-select-option value="true">{{ t('retrospective') }}</a-select-option>
          <a-select-option value="false">{{ t('original') }}</a-select-option>
        </a-select>
        <a-button :loading="loading" @click="search">{{ t('refresh') }}</a-button>
      </div>
      <a-alert v-if="error" :message="error" type="error" show-icon class="notice" />
      <a-table
        :columns="columns"
        :data-source="items"
        row-key="id"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 950 }"
        @change="pageChanged"
      >
        <template slot="planTitle" slot-scope="text, row">
          <a-button type="link" class="plan-title" @click="open(row.id)">{{ row.snapshot.title }}</a-button>
          <div>{{ row.snapshot.instrument.symbol || '—' }} · {{ row.snapshot.primary_strategy || '—' }}</div>
          <a-tag v-if="row.snapshot.retrospective">{{ t('retrospective') }}</a-tag>
        </template>
        <template slot="state" slot-scope="text, row">
          <a-tag>{{ label(row.effective_lifecycle) }}</a-tag>
        </template>
        <template slot="card" slot-scope="text, row">
          {{ label(row.checks.card_status) }} / {{ label(row.checks.risk_status) }}
          <small v-if="row.checks.missing_fields.length">
            {{ t('missingCount') }}: {{ row.checks.missing_fields.length }}
          </small>
        </template>
        <template slot="signal" slot-scope="text, row">{{ label(row.signal_status) }}</template>
        <template slot="version" slot-scope="text, row">
          v{{ row.version_no }}
          <div>{{ time(row.updated_at) }}</div>
        </template>
      </a-table>
    </a-card>
    <a-modal
      :wrap-class-name="modalClass"
      :body-style="modalBodyStyle"
      :z-index="1000"
      :visible="!!selected"
      :title="selected ? selected.snapshot.title : ''"
      :footer="null"
      width="1050px"
      @cancel="closeDetail"
    >
      <template v-if="selected">
        <a-button v-if="pending" :loading="saving" @click="resolvePending">{{ t('resolvePending') }}</a-button>
        <div class="actions">
          <a-tag>{{ label(selected.effective_lifecycle) }}</a-tag>
          <span>v{{ selected.version_no }}</span>
          <a-button v-if="canWrite && !isTerminal" :disabled="writeBlocked" @click="edit">{{ t('revise') }}</a-button>
          <a-button v-if="canWrite" :disabled="writeBlocked" @click="writeAction('copy')">{{ t('copy') }}</a-button>
          <a-button v-if="canWrite && !isTerminal" :disabled="writeBlocked" @click="showState('cancelled')">
            {{ t('cancelPlan') }}
          </a-button>
        </div>
        <a-tabs v-model="detailTab">
          <a-tab-pane key="card" :tab="t('card')">
            <a-alert
              v-if="selected.snapshot.retrospective"
              :message="t('retrospectiveNotice')"
              type="warning"
              show-icon
              class="notice"
            />
            <p>
              {{ t('recordedAt') }}: {{ time(selected.version_created_at) }} · {{ t('expires') }}:
              {{ selected.snapshot.expires_at ? time(selected.snapshot.expires_at) : t('noExpiry') }}
            </p>
            <a-descriptions bordered :column="{ xs: 1, sm: 2 }" size="small">
              <a-descriptions-item v-for="key in summaryFields" :key="key" :label="field(key)">
                <span class="text">{{ display(selected.snapshot[key], key) }}</span>
              </a-descriptions-item>
            </a-descriptions>
            <h3>{{ t('risk') }}</h3>
            <a-descriptions bordered :column="{ xs: 1, sm: 2 }" size="small">
              <a-descriptions-item v-for="(value, key) in selected.snapshot.risk_inputs" :key="key" :label="field(key)">
                {{ display(value, key) }}
              </a-descriptions-item>
            </a-descriptions>
            <a-alert :message="t('costNotice')" type="info" class="notice" />
            <p>
              {{ t('card') }}: {{ label(selected.checks.card_status) }} · {{ t('risk') }}:
              {{ label(selected.checks.risk_status) }} · {{ t('signal') }}: {{ label(selected.signal_status) }} ·
              {{ t('oneR') }}: {{ selected.checks.one_r || '—' }} {{ selected.checks.risk_currency || '' }} ·
              {{ t('rewardRisk') }}:
              {{ selected.checks.target_reward_risk || '—' }}
            </p>
            <p v-if="selected.checks.risk_status === 'calculable'">
              {{ t('referenceQuantity') }}: {{ selected.checks.quantity }}
              <span v-if="selected.checks.equity_risk_ratio">
                · {{ t('equityRiskRatio') }}: {{ selected.checks.equity_risk_ratio }}
              </span>
            </p>
            <p v-if="selected.checks.missing_fields.length">
              {{ t('missing') }}: {{ selected.checks.missing_fields.map(field).join('、') }}
            </p>
            <p v-if="selected.checks.risk_missing_fields.length">
              {{ t('riskMissing') }}: {{ selected.checks.risk_missing_fields.map(field).join('、') }}
            </p>
            <p v-if="selected.checks.risk_error">{{ label(selected.checks.risk_error) }}</p>
            <h3>{{ t('research') }}</h3>
            <a-empty v-if="!selected.snapshot.research_refs.length" :description="t('noResearch')" />
            <div v-for="(ref, i) in selected.snapshot.research_refs" :key="i">
              <p>{{ ref.summary }} {{ ref.url || '' }}</p>
              <small>{{ ref.data_as_of ? time(ref.data_as_of) : '' }} {{ label(ref.type) }} {{ ref.id || '' }}</small>
            </div>
            <div class="actions">
              <a-button
                v-if="canWrite && selected.effective_lifecycle === 'draft'"
                :disabled="writeBlocked"
                @click="showState('observing')"
              >
                {{ t('observe') }}
              </a-button>
              <template v-if="canWrite && selected.effective_lifecycle === 'observing'">
                <a-button :disabled="writeBlocked" @click="showState('draft')">{{ t('withdrawObservation') }}</a-button>
                <a-button :disabled="writeBlocked" @click="showState('completed')">{{ t('completePlan') }}</a-button>
                <a-button :disabled="writeBlocked" @click="showDecision">{{ t('recordSignal') }}</a-button>
              </template>
            </div>
          </a-tab-pane>
          <a-tab-pane key="versions" :tab="t('versions')">
            <a-collapse v-model="versionExpanded" accordion :destroy-inactive-panel="true">
              <a-collapse-panel
                v-for="version in versions"
                :key="version.id"
                :header="'v' + version.version_no + ' · ' + time(version.created_at) + ' · ' + label(version.source)"
              >
                <p>
                  {{
                    version.version_no === 1 && ['initial', 'copied'].includes(version.change_reason)
                      ? t(version.change_reason === 'initial' ? 'initialVersion' : 'copiedVersion')
                      : version.change_reason
                  }}
                </p>
                <a-descriptions bordered :column="1" size="small">
                  <a-descriptions-item v-for="(value, key) in versionContent(version)" :key="key" :label="field(key)">
                    <span class="text">{{ display(value, key) }}</span>
                  </a-descriptions-item>
                </a-descriptions>
              </a-collapse-panel>
            </a-collapse>
          </a-tab-pane>
          <a-tab-pane key="events" :tab="t('events')">
            <a-timeline>
              <a-timeline-item v-for="event in selected.events" :key="event.id">
                <b>{{ label(event.event_type) }}</b>
                · v{{ versions.find((version) => version.id === event.plan_version_id)?.version_no || '—' }} ·
                {{ time(event.recorded_at) }} · {{ label(event.source) }}
                <p v-if="event.payload.from && event.payload.to">
                  {{ label(event.payload.from) }} → {{ label(event.payload.to) }}
                </p>
                <p>{{ event.payload.reason || '' }}</p>
                <p v-if="event.payload.status">
                  {{ label(event.payload.status) }} · {{ label(event.payload.assessment_author) }} ·
                  {{ time(event.occurred_at) }}
                </p>
              </a-timeline-item>
            </a-timeline>
          </a-tab-pane>
          <a-tab-pane key="records" :tab="t('records.tab')">
            <records-panel
              ref="recordsPanel"
              :plan="selected"
              :versions="versions"
              :source-context="sourceContext"
              :can-write="canWrite"
              :blocked="writeBlocked"
              :pending="!!pending"
              :saving="saving"
              :resolve="resolvePending"
              :save="writeAction"
              :time="time"
              :field="field"
              :display="display"
              :modal-class="modalClass"
              :select-class="selectClass"
              :body-style="modalBodyStyle"
            />
          </a-tab-pane>
        </a-tabs>
      </template>
    </a-modal>
    <a-modal
      :wrap-class-name="modalClass"
      :body-style="modalBodyStyle"
      :z-index="1100"
      :visible="editorOpen"
      :destroy-on-close="true"
      :title="editingId ? t('revise') : t('new')"
      width="950px"
      @cancel="closeEditor"
    >
      <a-form ref="editorForm" layout="vertical">
        <a-form-item :label="field('title')" required><a-input v-model="draft.title" :max-length="120" /></a-form-item>
        <a-collapse v-model="cardExpanded">
          <a-collapse-panel key="card" :header="t('cardBeforeObservation')">
            <instrument-fields v-model="draft.instrument" :disabled="!!(editingId && baseSnapshot.instrument && baseSnapshot.instrument.symbol)" :dropdown-class-name="selectClass" />
            <div class="form-grid">
              <a-form-item :label="field('direction')">
                <a-select :dropdown-class-name="selectClass" v-model="draft.direction">
                  <a-select-option v-for="side in directions" :key="side" :value="side">
                    {{ label(side) }}
                  </a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item :label="field('primary_strategy')">
                <a-input v-model="draft.primary_strategy" :max-length="120" />
              </a-form-item>
              <a-form-item v-for="key in ['analysis_timeframe', 'decision_timeframe']" :key="key" :label="field(key)">
                <a-select :dropdown-class-name="selectClass" v-model="draft[key]" allow-clear>
                  <a-select-option v-for="frame in timeframes" :key="frame" :value="frame">{{ frame }}</a-select-option>
                </a-select>
              </a-form-item>
            </div>
            <a-form-item v-for="key in textFields" :key="key" :label="field(key)">
              <a-textarea
                v-model="draft[key]"
                :max-length="key.includes('evidence') ? 4000 : 2000"
                :auto-size="{ minRows: 2, maxRows: 6 }"
              />
            </a-form-item>
          </a-collapse-panel>
        </a-collapse>
        <div class="form-grid">
          <a-form-item :label="t('expiresInput')">
            <a-date-picker
              v-model="expiryLocal"
              value-format="YYYY-MM-DD[T]HH:mm"
              format="YYYY-MM-DD HH:mm"
              :show-time="{ format: 'HH:mm' }"
              :dropdown-class-name="calendarClass"
              :placeholder="t('noExpiry')"
              allow-clear
              style="width: 100%"
            />
          </a-form-item>
          <a-form-item>
            <a-checkbox v-model="draft.retrospective">{{ t('retrospective') }}</a-checkbox>
          </a-form-item>
        </div>
        <a-collapse>
          <a-collapse-panel key="risk" :header="t('riskOptional')">
            <a-radio-group :value="riskBasis" @change="setRiskBasis($event.target.value)">
              <a-radio-button value="quantity">{{ field('quantity') }}</a-radio-button>
              <a-radio-button value="risk_budget">{{ field('risk_budget') }}</a-radio-button>
            </a-radio-group>
            <a-form-item :label="field(riskBasis)"><a-input v-model="draft.risk_inputs[riskBasis]" /></a-form-item>
            <div class="form-grid">
              <a-form-item
                v-for="key in riskFields"
                :key="key"
                :label="key === 'equity_at' ? t('equityAtInput') : field(key)"
              >
                <a-select :dropdown-class-name="selectClass" v-if="key === 'model'" v-model="draft.risk_inputs.model">
                  <a-select-option value="linear">{{ t('linearModel') }}</a-select-option>
                  <a-select-option value="inverse">{{ t('unsupportedModel') }}</a-select-option>
                </a-select>
                <a-date-picker
                  v-else-if="key === 'equity_at'"
                  v-model="draft.risk_inputs.equity_at"
                  value-format="YYYY-MM-DD[T]HH:mm:ssZ"
                  format="YYYY-MM-DD HH:mm"
                  :show-time="{ format: 'HH:mm' }"
                  :dropdown-class-name="calendarClass"
                  allow-clear
                  style="width: 100%"
                />
                <a-input v-else v-model="draft.risk_inputs[key]" />
              </a-form-item>
            </div>
            <p>{{ t('riskHelp') }}</p>
          </a-collapse-panel>
          <a-collapse-panel key="research" :header="t('research')">
            <a-form-item :label="field('counter_evidence')">
              <a-textarea v-model="draft.counter_evidence" :max-length="4000" />
            </a-form-item>
            <div class="form-grid">
              <a-form-item v-for="key in ['instrument_id', 'settlement_ccy']" :key="key" :label="field(key)">
                <a-input v-model="draft.instrument[key]" :disabled="!!(editingId && baseSnapshot.instrument && baseSnapshot.instrument.symbol)" :max-length="100" />
              </a-form-item>
            </div>
            <section v-for="(ref, index) in draft.research_refs" :key="index" class="reference-row">
              <a-select :dropdown-class-name="selectClass" v-model="ref.type">
                <a-select-option value="note">{{ t('sourceNote') }}</a-select-option>
                <a-select-option value="url">{{ t('sourceUrl') }}</a-select-option>
                <a-select-option value="market_state_result">{{ t('sourceAnalysis') }}</a-select-option>
              </a-select>
              <a-input v-if="ref.type === 'url'" v-model="ref.url" :placeholder="t('sourceUrl')" />
              <template v-if="ref.type === 'market_state_result'">
                <a-select
                  :dropdown-class-name="selectClass"
                  v-model="ref.id"
                  show-search
                  option-filter-prop="children"
                  :loading="researchLoading"
                  :placeholder="t('sourceAnalysis')"
                  @focus="loadResearch(false)"
                  @change="selectResearch(ref)"
                >
                  <a-select-option v-for="record in researchRecords" :key="record.id" :value="record.id">
                    #{{ record.id }} {{ record.symbol }} {{ record.timeframe }} · {{ time(record.bar_close_at) }}
                  </a-select-option>
                </a-select>
                <a-button v-if="researchHasMore" :loading="researchLoading" @click="loadResearch(true)">
                  {{ t('moreResearch') }}
                </a-button>
                <a-alert v-if="researchError" :message="researchError" type="error" />
              </template>
              <a-textarea
                v-model="ref.summary"
                :disabled="ref.type === 'market_state_result'"
                :max-length="4000"
                :placeholder="field('evidence')"
              />
              <a-button @click="draft.research_refs.splice(index, 1)">{{ t('removeSource') }}</a-button>
            </section>
            <a-button @click="draft.research_refs.push({ type: 'note', summary: '' })">{{ t('addSource') }}</a-button>
          </a-collapse-panel>
        </a-collapse>
        <template v-if="editingId">
          <h3>{{ t('changedFields') }}</h3>
          <p v-if="!changes.length">—</p>
          <section v-for="key in changes" :key="key" class="conflict-field">
            <b>{{ field(key) }}</b>
            <p>{{ t('previousValue') }}: {{ display(baseSnapshot[key], key) }}</p>
            <p>{{ t('localValue') }}: {{ display(draft[key], key) }}</p>
          </section>
          <a-form-item :label="t('changeReason')" required>
            <a-textarea v-model="changeReason" :max-length="500" />
          </a-form-item>
        </template>
        <a-alert
          ref="conflictNotice"
          v-if="conflict"
          :message="t('conflict')"
          type="warning"
          show-icon
          class="notice">
          <template slot="description">
            <p>{{ conflict.snapshot.title }} · v{{ conflict.version_no }}</p>
            <p>{{ t('changedFields') }}: {{ planDiff(baseSnapshot, conflict.snapshot).map(field).join('、') }}</p>
            <section v-for="key in planDiff(baseSnapshot, conflict.snapshot)" :key="key" class="conflict-field">
              <b>{{ field(key) }}</b>
              <p>{{ t('serverValue') }}: {{ display(conflict.snapshot[key], key) }}</p>
              <p>{{ t('localValue') }}: {{ display(draft[key], key) }}</p>
              <a-radio-group v-if="conflictKeys.includes(key)" v-model="conflictChoices[key]">
                <a-radio value="local">{{ t('keepLocal') }}</a-radio>
                <a-radio value="server">{{ t('useServer') }}</a-radio>
              </a-radio-group>
            </section>
            <a-button @click="acceptMerge">{{ t('merge') }}</a-button>
          </template>
        </a-alert>
        <a-alert
          ref="editorErrorNotice"
          v-if="editorError"
          :message="editorError"
          type="error"
          show-icon
          class="notice"
        />
      </a-form>
      <template slot="footer">
        <div class="editor-actions">
          <a-button v-if="pending" :loading="saving" @click="resolvePending">{{ t('resolvePending') }}</a-button>
          <a-button :disabled="saving || !!pending" @click="closeEditor">{{ t('close') }}</a-button>
          <a-button type="primary" :loading="saving" :disabled="!!conflict" @click="save">{{ t('save') }}</a-button>
        </div>
      </template>
    </a-modal>
    <a-modal
      :wrap-class-name="modalClass"
      :body-style="modalBodyStyle"
      :z-index="1200"
      :visible="!!stateTarget"
      :title="label(stateTarget)"
      :confirm-loading="saving"
      @ok="commitState"
      @cancel="stateTarget = ''"
    >
      <a-button v-if="pending" :loading="saving" @click="resolvePending">{{ t('resolvePending') }}</a-button>
      <a-form-item :label="t('reason')" required><a-textarea :disabled="writeBlocked" v-model="actionReason" :max-length="500" /></a-form-item>
      <p>{{ t('boundary') }}</p>
    </a-modal>
    <a-modal
      :wrap-class-name="modalClass"
      :body-style="modalBodyStyle"
      :z-index="1200"
      :visible="decisionOpen"
      :title="t('recordSignal')"
      :confirm-loading="saving"
      @ok="commitDecision"
      @cancel="decisionOpen = false"
    >
      <a-button v-if="pending" :loading="saving" @click="resolvePending">{{ t('resolvePending') }}</a-button>
      <a-form layout="vertical">
        <a-form-item :label="t('signal')">
          <a-select :disabled="writeBlocked" :dropdown-class-name="selectClass" v-model="decision.status">
            <a-select-option v-for="value in ['unconfirmed', 'confirmed', 'withdrawn']" :key="value" :value="value">
              {{ label(value) }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="t('reason')" required>
          <a-textarea :disabled="writeBlocked" v-model="decision.reason" :max-length="2000" />
        </a-form-item>
        <a-form-item :label="t('observedAt')">
          <a-date-picker
            :disabled="writeBlocked"
            v-model="decision.observedLocal"
            value-format="YYYY-MM-DD[T]HH:mm"
            format="YYYY-MM-DD HH:mm"
            :show-time="{ format: 'HH:mm' }"
            :dropdown-class-name="calendarClass"
            :allow-clear="false"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
<script>
import {
  listTradePlans,
  getTradePlan,
  listTradePlanVersions,
  saveTradePlan,
  getTradePlanRequest,
  listResearchRecords
} from './api'
import RecordsPanel from './RecordsPanel.vue'
import { parseTradePlanSource, draftFromSource } from './navigation'
import { Timeline } from 'ant-design-vue'
import InstrumentFields from './InstrumentFields.vue'
import { formatUserDateTime } from '@/utils/userTime'
import {
  emptyPlan,
  editablePlan,
  clonePlan,
  planDiff,
  newRequestId,
  terminalPlan,
  mergePlanChanges,
  conflictingFields,
  mutationSnapshot
} from './model'
const localTime = (value) => {
  const d = new Date(value)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
export default {
  name: 'TradePlans',
  components: { RecordsPanel, InstrumentFields, 'a-timeline': Timeline, 'a-timeline-item': Timeline.Item },
  data() {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      loading: false,
      listSequence: 0,
      openSourceOnce: true,
      detailSequence: 0,
      error: '',
      filters: { q: '', lifecycle: '', direction: '', primary_strategy: '', retrospective: '' },
      selected: null,
      versions: [],
      versionExpanded: undefined,
      detailTab: 'card',
      editorOpen: false,
      editingId: null,
      editingRevision: null,
      draft: emptyPlan(),
      baseSnapshot: {},
      expiryLocal: '',
      changeReason: '',
      editorError: '',
      conflict: null,
      saving: false,
      pending: null,
      riskBasis: 'quantity',
      cardExpanded: [],
      conflictChoices: {},
      researchRecords: [],
      researchPage: 0,
      researchHasMore: false,
      researchLoading: false,
      researchError: '',
      stateTarget: '',
      actionReason: '',
      decisionOpen: false,
      decision: { status: 'unconfirmed', reason: '', observedLocal: localTime(Date.now()) },
      states: ['draft', 'observing', 'cancelled', 'expired', 'completed'],
      directions: ['long', 'short', 'watch'],
      timeframes: ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'],
      textFields: ['hypothesis', 'entry_trigger', 'invalidation', 'exit_rules', 'wait_conditions', 'evidence'],
      riskFields: [
        'entry_price',
        'stop_price',
        'target_price',
        'currency',
        'equity',
        'equity_currency',
        'equity_at',
        'model'
      ],
      summaryFields: [
        'instrument',
        'direction',
        'primary_strategy',
        'analysis_timeframe',
        'decision_timeframe',
        'hypothesis',
        'entry_trigger',
        'invalidation',
        'exit_rules',
        'wait_conditions',
        'evidence',
        'counter_evidence'
      ]
    }
  },
  computed: {
    sourceContext() { return parseTradePlanSource(this.$route?.query || {}) },
    darkTheme() {
      return ['dark', 'realdark'].includes(this.$store?.getters?.theme)
    },
    modalBodyStyle() {
      return { maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }
    },
    selectClass() {
      return 'qd-workspace-page trade-plan-select' + (this.darkTheme ? ' theme-dark' : '')
    },
    isDirty() {
      return (
        planDiff(this.baseSnapshot, this.draft).length > 0 ||
        this.expiryLocal !== (this.baseSnapshot.expires_at ? localTime(this.baseSnapshot.expires_at) : '') ||
        !!this.changeReason
      )
    },
    writeBlocked() {
      return this.saving || !!this.pending
    },
    calendarClass() {
      return 'qd-workspace-page trade-plan-calendar' + (this.darkTheme ? ' theme-dark' : '')
    },
    modalClass() {
      return 'qd-workspace-page trade-plan-modal' + (this.darkTheme ? ' theme-dark' : '')
    },
    canWrite() {
      const roles = this.$store?.getters?.roles || []
      return !roles.some((role) => (typeof role === 'string' ? role : role.id) === 'viewer')
    },
    conflictKeys() {
      return this.conflict ? conflictingFields(this.baseSnapshot, this.draft, editablePlan(this.conflict.snapshot)) : []
    },
    columns() {
      return ['title', 'state', 'card', 'signal', 'version'].map((key) => ({
        title: this.t(key),
        key,
        scopedSlots: { customRender: key === 'title' ? 'planTitle' : key }
      }))
    },
    pagination() {
      return { current: this.page, pageSize: this.pageSize, total: this.total, showSizeChanger: true }
    },
    isTerminal() {
      return terminalPlan(this.selected)
    },
    changes() {
      return planDiff(this.baseSnapshot, this.draft)
    }
  },
  created() {
    if (this.sourceContext?.symbol) this.filters.q = this.sourceContext.symbol
    this.load()
  },
  watch: {
    '$route.query'() {
      this.detailSequence++
      this.selected = null
      this.openSourceOnce = true
      if (this.sourceContext?.symbol) this.filters.q = this.sourceContext.symbol
      this.page = 1
      this.load()
    }
  },
  mounted() {
    window.addEventListener('beforeunload', this.beforeUnload)
  },
  beforeDestroy() {
    this.listSequence++
    this.detailSequence++
    window.removeEventListener('beforeunload', this.beforeUnload)
  },
  beforeRouteLeave(to, from, next) { this.guardNavigation(next) },
  beforeRouteUpdate(to, from, next) { this.guardNavigation(next) },
  methods: {
    guardNavigation(next) {
      if (this.pending) {
        this.$message.error(this.t('pendingHelp'))
        next(false)
        return
      }
      if (this.$refs.recordsPanel?.hasUnsaved) {
        this.$refs.recordsPanel.guardClose(
          () => next(),
          () => next(false)
        )
        return
      }
      if (!this.editorOpen || !this.isDirty) {
        next()
        return
      }
      this.confirmDiscard(
        () => next(),
        () => next(false)
      )
    },
    planDiff,
    clearSourceContext() {
      const query = { ...this.$route.query }
      Object.keys(query).filter(key => key.startsWith('from_')).forEach(key => delete query[key])
      this.$router.replace({ query })
    },
    closeDetail() {
      if (this.pending || this.saving) return
      const close = () => {
        this.detailSequence++
        this.selected = null
      }
      if (this.$refs.recordsPanel) this.$refs.recordsPanel.guardClose(close)
      else close()
    },
    showEditorFeedback() {
      this.$nextTick(() => {
        const notice = this.$refs.conflictNotice || this.$refs.editorErrorNotice
        notice?.$el?.scrollIntoView({ block: 'nearest' })
      })
    },
    versionContent(version) {
      const content = { ...version.snapshot }
      delete content.schema_version
      return content
    },
    confirmDiscard(onOk, onCancel) {
      this.$confirm({
        title: this.t('discard'),
        class: this.modalClass,
        zIndex: 1400,
        okText: this.t('discardConfirm'),
        cancelText: this.t('keepEditing'),
        autoFocusButton: 'cancel',
        onOk,
        onCancel
      })
    },
    showDecision() {
      this.decision = { status: 'unconfirmed', reason: '', observedLocal: localTime(Date.now()) }
      this.decisionOpen = true
    },
    beforeUnload(event) {
      if (this.editorOpen || this.pending || this.$refs.recordsPanel?.hasUnsaved) {
        event.preventDefault()
        event.returnValue = ''
      }
    },
    t(key) {
      return this.$t('tradePlans.' + key)
    },
    field(key) {
      const name = String(key).replace(/^(instrument|risk_inputs)\./, '')
      const k = 'tradePlans.field.' + name
      return this.$te(k) ? this.$t(k) : name
    },
    label(key) {
      const k = 'tradePlans.value.' + key
      return this.$te(k) ? this.$t(k) : key
    },
    time(value) {
      return formatUserDateTime(value, { locale: this.$i18n.locale, fallback: '—' })
    },
    display(value, key) {
      if (key === 'market' && this.$te('dashboard.analysis.market.' + value)) {
        return this.$t('dashboard.analysis.market.' + value)
      }
      if (value && ['expires_at', 'equity_at', 'data_as_of', 'bar_close_at', 'recorded_at'].includes(key)) {
        return this.time(value)
      }
      if (key === 'direction' || key === 'model' || key === 'market_type') return this.label(value)
      if (Array.isArray(value)) return value.map((ref) => ref.summary || ref.url || ref.id || '—').join(' / ')
      if (value && typeof value === 'object') {
        return Object.entries(value)
          .filter(([, item]) => item !== '' && item !== null)
          .map(([name, item]) => this.field(name) + ': ' + this.display(item, name))
          .join(' / ')
      }
      if (typeof value === 'boolean') return this.t(value ? 'yes' : 'no')
      return value === '' || value == null ? '—' : String(value)
    },
    unwrap(response) {
      if (!response || response.code !== 1) throw new Error((response && response.msg) || 'request_failed')
      return response.data
    },
    errorText(error) {
      const code = error.response?.data?.msg || error.message || 'request_failed'
      const k = 'tradePlans.error.' + code
      const message = this.$te(k) ? this.$t(k) : this.t('requestFailed')
      const details = error.response?.data?.data?.details
      const fields = Array.isArray(details) ? details : details?.fields || []
      return message + (fields.length ? ' (' + fields.map(this.field).join('、') + ')' : '')
    },
    async load() {
      const sequence = ++this.listSequence
      this.loading = true
      try {
        const params = { ...this.filters, page: this.page, page_size: this.pageSize }
        let data
        let linked = false
        if (this.sourceContext) {
          data = this.unwrap(await listTradePlans({ ...params, q: '', source_kind: this.sourceContext.kind, source_id: this.sourceContext.id }))
          if (sequence !== this.listSequence) return
          linked = data.total > 0
        }
        if (!linked) data = this.unwrap(await listTradePlans(params))
        if (sequence !== this.listSequence) return
        this.items = data.items
        this.total = data.total
        this.error = ''
        if (this.openSourceOnce) {
          this.openSourceOnce = false
          if (linked && data.total === 1 && data.items.length === 1) {
            await this.open(data.items[0].id, sequence)
            if (sequence === this.listSequence) this.detailTab = 'records'
          }
        }
      } catch (error) {
        if (sequence === this.listSequence) this.error = this.errorText(error)
      } finally {
        if (sequence === this.listSequence) this.loading = false
      }
    },
    search() {
      this.page = 1
      this.load()
    },
    pageChanged(pagination) {
      this.page = pagination.current
      this.pageSize = pagination.pageSize
      this.load()
    },
    async open(id, listSequence = null) {
      const sequence = ++this.detailSequence
      const current = () => sequence === this.detailSequence && (listSequence === null || listSequence === this.listSequence)
      try {
        const row = this.unwrap(await getTradePlan(id))
        if (!current()) return
        const versions = this.unwrap(await listTradePlanVersions(id))
        if (!current()) return
        if (!this.selected || this.selected.id !== id) this.detailTab = 'card'
        this.selected = row
        this.versions = versions.items
        this.versionExpanded = versions.items[0]?.id
        this.error = ''
      } catch (error) {
        if (current()) this.error = this.errorText(error)
      }
    },
    newPlan() {
      if (this.pending) {
        this.$message.error(this.t('pendingHelp'))
        return
      }
      this.editingId = null
      this.draft = draftFromSource(emptyPlan(), this.sourceContext)
      if (this.sourceContext?.symbol) this.draft.title = this.$t('tradePlans.sourceDraftTitle', { symbol: this.sourceContext.symbol })
      this.startEditor()
      if (this.sourceContext) this.cardExpanded = ['card']
    },
    edit() {
      this.editingId = this.selected.id
      this.editingRevision = this.selected.row_revision
      this.draft = editablePlan(this.selected.snapshot)
      this.researchRecords = this.draft.research_refs
        .filter((ref) => ref.type === 'market_state_result')
        .map((ref) => ({ id: ref.id, symbol: ref.summary }))
      this.researchPage = 0
      this.startEditor()
    },
    startEditor() {
      this.baseSnapshot = clonePlan(this.draft)
      this.expiryLocal = this.draft.expires_at ? localTime(this.draft.expires_at) : ''
      this.changeReason = ''
      this.editorError = ''
      this.conflict = null
      this.conflictChoices = {}
      this.cardExpanded = this.editingId ? ['card'] : []
      this.riskBasis = this.draft.risk_inputs.risk_budget ? 'risk_budget' : 'quantity'
      this.editorOpen = true
      this.$nextTick(() => {
        const body = this.$refs.editorForm?.$el?.parentElement
        if (body) body.scrollTop = 0
      })
    },
    closeEditor() {
      if (this.pending) {
        this.editorError = this.t('pendingHelp')
        return
      }
      if (this.saving) return
      const close = () => {
        this.editorOpen = false
        this.conflict = null
      }
      if (this.isDirty) this.confirmDiscard(close)
      else close()
    },
    setRiskBasis(value) {
      this.riskBasis = value
      this.$delete(this.draft.risk_inputs, value === 'quantity' ? 'risk_budget' : 'quantity')
    },
    selectResearch(ref) {
      ref.summary = this.researchRecords.find((record) => record.id === ref.id)?.summary || ''
    },
    async loadResearch(more = false) {
      if (this.researchLoading || (!more && this.researchPage)) return
      this.researchLoading = true
      this.researchError = ''
      try {
        const page = more ? this.researchPage + 1 : 1
        const data = this.unwrap(await listResearchRecords({ page, page_size: 20 }))
        this.researchRecords = Array.from(
          new Map([...this.researchRecords, ...data.items].map((record) => [record.id, record])).values()
        )
        this.researchPage = page
        this.researchHasMore = page * data.page_size < data.total
      } catch (error) {
        this.researchError = this.errorText(error)
      } finally {
        this.researchLoading = false
      }
    },
    async resolvePending() {
      if (!this.pending || this.saving) return
      this.saving = true
      const unresolved = this.pending
      const original = JSON.parse(unresolved.signature)
      let result
      try {
        try {
          result = this.unwrap(await getTradePlanRequest(this.pending.requestId)).response
        } catch (lookup) {
          if (lookup.response?.status !== 404) throw lookup
          result = await this.send(original.id, original.action, original.data)
        }
        const latest = this.unwrap(await getTradePlan(result.id))
        this.pending = null
        if (this.editorOpen) {
          // Retain edits made while the original request was unresolved.
          this.editingId = latest.id
          this.editingRevision = latest.row_revision
          const base = original.data.snapshot || this.baseSnapshot
          const remote = editablePlan(latest.snapshot)
          if (conflictingFields(base, this.draft, remote).length) {
            this.baseSnapshot = base
            this.conflict = latest
            this.conflictChoices = {}
          } else {
            this.draft = mergePlanChanges(base, this.draft, remote)
            this.baseSnapshot = remote
          }
          this.expiryLocal = this.draft.expires_at ? localTime(this.draft.expires_at) : ''
          this.riskBasis = this.draft.risk_inputs?.risk_budget ? 'risk_budget' : 'quantity'
          this.editorError = ''
          this.$message.success(this.t('previousSaved'))
        } else {
          await this.open(result.id)
          if (original.action === 'state') this.stateTarget = ''
          if (original.action === 'events') this.decisionOpen = false
        }
        await this.load()
      } catch (error) {
        this.pending = unresolved
        this.editorError = this.t('pendingHelp')
      } finally {
        this.saving = false
      }
    },
    async send(id, action, data) {
      const signature = JSON.stringify({ id, action, data })
      if (this.pending && this.pending.signature !== signature) throw new Error('pending_request_changed')
      if (!this.pending) this.pending = { signature, requestId: newRequestId() }
      const key = this.pending.requestId
      try {
        const row = this.unwrap(await saveTradePlan(id, action, { ...data, request_id: key }))
        this.pending = null
        return row
      } catch (error) {
        if (error.response && error.response.status < 500) {
          this.pending = null
          throw error
        }
        try {
          const previous = this.unwrap(await getTradePlanRequest(key))
          this.pending = null
          return previous.response
        } catch (lookup) {
          throw error
        }
      }
    },
    async save() {
      this.saving = true
      this.editorError = ''
      try {
        this.draft.expires_at = this.expiryLocal ? new Date(this.expiryLocal).toISOString() : null
        this.draft.analysis_timeframe = this.draft.analysis_timeframe || ''
        this.draft.decision_timeframe = this.draft.decision_timeframe || ''
        const data = { snapshot: mutationSnapshot(this.draft, this.riskBasis) }
        if (this.editingId) {
          Object.assign(data, { expected_revision: this.editingRevision, change_reason: this.changeReason })
        }
        const result = await this.send(this.editingId, 'versions', data)
        this.editorOpen = false
        await this.open(result.id)
        await this.load()
      } catch (error) {
        this.editorError = this.errorText(error)
        if (error.response?.data?.msg === 'revision_conflict') {
          this.conflict = this.unwrap(await getTradePlan(this.editingId))
          this.conflictChoices = {}
        }
        this.showEditorFeedback()
      } finally {
        this.saving = false
      }
    },
    acceptMerge() {
      if (this.conflictKeys.some((key) => !this.conflictChoices[key])) {
        this.$message.error(this.t('resolveAllConflicts'))
        return
      }
      this.draft = mergePlanChanges(
        this.baseSnapshot,
        this.draft,
        editablePlan(this.conflict.snapshot),
        this.conflictChoices
      )
      this.expiryLocal = this.draft.expires_at ? localTime(this.draft.expires_at) : ''
      this.riskBasis = this.draft.risk_inputs.risk_budget ? 'risk_budget' : 'quantity'
      this.editingRevision = this.conflict.row_revision
      this.baseSnapshot = editablePlan(this.conflict.snapshot)
      this.conflict = null
      this.editorError = ''
    },
    showState(value) {
      this.stateTarget = value
      this.actionReason = ''
    },
    async writeAction(action, data = {}) {
      if (this.saving) return false
      this.saving = true
      try {
        const result = await this.send(this.selected.id, action, {
          ...data,
          expected_revision: this.selected.row_revision
        })
        await this.open(result.id)
        await this.load()
        return true
      } catch (error) {
        this.$message.error(this.errorText(error))
        if (error.response?.status === 409) await this.open(this.selected.id)
        return false
      } finally {
        this.saving = false
      }
    },
    async commitState() {
      if (await this.writeAction('state', { lifecycle: this.stateTarget, reason: this.actionReason })) {
        this.stateTarget = ''
      }
    },
    async commitDecision() {
      try {
        if (
          await this.writeAction('events', {
            status: this.decision.status,
            reason: this.decision.reason,
            observed_at: new Date(this.decision.observedLocal).toISOString(),
            assessment_author: 'human'
          })
        ) {
          this.decisionOpen = false
          this.decision.reason = ''
        }
      } catch (error) {
        this.$message.error(this.errorText(error))
      }
    }
  }
}
</script>
<style scoped>
.trade-plans {
  padding: 20px;
}
.page-heading,
.actions,
.filters {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.page-heading {
  justify-content: space-between;
  margin-bottom: 18px;
}
.notice,
.actions,
.filters {
  margin: 16px 0;
}
.filters > * {
  width: 170px;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 18px;
}
.text,
.conflict-field {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.conflict-field {
  margin: 12px 0;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.reference-row {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 360px;
  overflow: auto;
  background: rgba(127, 127, 127, 0.08);
  padding: 12px;
}
.version-item {
  width: 100%;
}

@media (max-width: 680px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .trade-plans {
    padding: 8px;
  }
}
</style>

<style lang="less">
// Modal content is rendered under body; scope these theme fixes to this feature.
.trade-plan-modal {
  .ant-modal-content,
  .ant-modal-header,
  .ant-modal-footer,
  .ant-modal-body,
  .ant-collapse,
  .ant-collapse-content {
    background: var(--qd-surface);
    color: var(--qd-text);
  }
  .ant-modal-header,
  .ant-modal-footer,
  .ant-collapse,
  .ant-collapse-item,
  .ant-collapse-content,
  .ant-descriptions-bordered .ant-descriptions-view,
  .ant-descriptions-bordered .ant-descriptions-row,
  .ant-descriptions-bordered .ant-descriptions-item-label,
  .ant-descriptions-bordered .ant-descriptions-item-content {
    border-color: var(--qd-border);
  }
  .ant-modal-confirm-title,
  .ant-modal-confirm-content,
  .ant-modal-title,
  .ant-modal-close,
  .ant-collapse > .ant-collapse-item > .ant-collapse-header,
  .ant-form-item-label > label,
  .ant-radio-wrapper,
  .ant-checkbox-wrapper,
  .ant-descriptions-item-content {
    color: var(--qd-text);
  }
  .ant-collapse > .ant-collapse-item > .ant-collapse-header,
  .ant-descriptions-item-label {
    background: var(--qd-surface-subtle);
    color: var(--qd-text);
  }
  .ant-collapse {
    margin-bottom: 16px;
    border-radius: 6px;
  }
  .ant-collapse-content > .ant-collapse-content-box {
    padding: 18px 16px 2px;
  }
  .ant-form-item {
    margin-bottom: 16px;
  }
  .ant-form-item-label {
    padding-bottom: 4px;
  }
  .ant-select {
    width: 100%;
  }
  .ant-input,
  .ant-select-selection,
  .ant-radio-button-wrapper {
    background: var(--qd-surface-subtle);
    border-color: var(--qd-border);
    color: var(--qd-text);
  }
  .ant-input::placeholder {
    color: var(--qd-text-muted);
  }
  .ant-calendar-picker-icon,
  .ant-calendar-picker-clear,
  .ant-select-arrow,
  .ant-select-selection__placeholder {
    color: var(--qd-text-secondary);
  }
  .conflict-field {
    border-color: var(--qd-border);
  }
}

.trade-plan-calendar {
  z-index: 1300 !important;
  .ant-calendar,
  .ant-calendar-input-wrap,
  .ant-calendar-time-picker-inner,
  .ant-calendar-time-picker-select,
  .ant-calendar-month-panel,
  .ant-calendar-year-panel,
  .ant-calendar-decade-panel {
    background: var(--qd-surface);
    color: var(--qd-text);
    border-color: var(--qd-border);
  }
  .ant-calendar-input {
    background: var(--qd-surface);
    color: var(--qd-text);
  }
  .ant-calendar-header,
  .ant-calendar-footer {
    border-color: var(--qd-border);
  }
  .ant-calendar-date,
  .ant-calendar-column-header,
  .ant-calendar-header a,
  .ant-calendar-time-picker-select li,
  .ant-calendar-month-panel-month,
  .ant-calendar-year-panel-year,
  .ant-calendar-decade-panel-decade {
    color: var(--qd-text);
  }
  .ant-calendar-next-month-btn-day .ant-calendar-date,
  .ant-calendar-last-month-cell .ant-calendar-date {
    color: var(--qd-text-muted);
  }
  .ant-calendar-date:hover,
  .ant-calendar-time-picker-select li:hover,
  li.ant-calendar-time-picker-select-option-selected {
    background: var(--qd-surface-subtle);
  }
  .ant-calendar-selected-day .ant-calendar-date,
  .ant-calendar-selected-date .ant-calendar-date {
    background: var(--primary-color, #52c41a);
    color: #fff;
  }
}

.trade-plans {
  .page-heading p {
    color: var(--qd-text-secondary);
  }
  .ant-select-selection,
  .ant-input,
  .ant-btn-default {
    background: var(--qd-surface);
    color: var(--qd-text);
    border-color: var(--qd-border);
  }
  .ant-table-tbody > tr > td {
    overflow-wrap: anywhere;
  }
}
.trade-plan-modal {
  .ant-modal {
    max-width: calc(100vw - 24px);
  }
  .ant-modal-title {
    overflow-wrap: anywhere;
  }
  .ant-descriptions-view table {
    table-layout: fixed;
  }
  .ant-descriptions-item-content,
  .ant-descriptions-item-label,
  p,
  small {
    overflow-wrap: anywhere;
  }
  .ant-descriptions-item-label {
    width: 150px;
  }
  .ant-timeline-item-content,
  .ant-tabs {
    color: var(--qd-text);
  }
  .ant-btn-default {
    color: var(--qd-text);
    background: var(--qd-surface);
    border-color: var(--qd-border);
  }
  .ant-radio-button-wrapper-checked {
    color: var(--primary-color, #52c41a);
    border-color: var(--primary-color, #52c41a);
  }
  .editor-actions {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px;
  }
}
.trade-plan-select {
  z-index: 1300 !important;
  background: var(--qd-surface);
  color: var(--qd-text);
  .ant-select-dropdown-menu-item {
    color: var(--qd-text);
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .ant-select-dropdown-menu-item-active,
  .ant-select-dropdown-menu-item:hover {
    background: var(--qd-surface-subtle);
  }
  .ant-select-dropdown-menu-item-selected {
    background: var(--qd-surface-subtle);
    color: var(--primary-color, #52c41a);
  }
}
@media (max-width: 680px) {
  .trade-plans .filters > * {
    flex: 1 1 130px;
    min-width: 0;
    width: auto;
  }
  .trade-plan-modal {
    .ant-modal {
      top: 12px;
      max-width: calc(100vw - 16px);
      margin: 0 auto;
    }
    .ant-modal-body {
      padding: 14px;
    }
    .ant-descriptions-item-label {
      width: 105px;
    }
  }
}
.trade-plans,
.trade-plan-modal {
  .ant-btn:not(.ant-btn-primary):not(.ant-btn-danger):not(.ant-btn-link) {
    background: var(--qd-surface-subtle);
    border-color: var(--qd-border);
    color: var(--qd-text);
  }
  .ant-btn:not(.ant-btn-primary):not(.ant-btn-danger):not(.ant-btn-link):hover {
    color: var(--primary-color, #52c41a);
    border-color: var(--primary-color, #52c41a);
  }
  .ant-btn[disabled] {
    color: var(--qd-text-muted) !important;
  }
  .ant-tag {
    background: var(--qd-surface-subtle);
    color: var(--qd-text);
    border-color: var(--qd-border);
  }
}
.trade-plan-modal {
  .ant-form,
  .ant-form-item,
  .ant-form-item-control,
  .conflict-field {
    color: var(--qd-text);
  }
  .ant-input::placeholder {
    color: var(--qd-text-muted) !important;
    opacity: 1;
  }
}
.trade-plans,
.trade-plan-modal {
  .ant-alert {
    background: var(--qd-surface-subtle);
    border-color: var(--qd-border);
  }
  .ant-alert-message,
  .ant-alert-description {
    color: var(--qd-text);
  }
}
.trade-plans .plan-title.ant-btn-link {
  height: auto;
  min-height: 0;
  max-width: 100%;
  padding: 0;
  white-space: normal;
  text-align: left;
  line-height: 1.5;
}
.trade-plans,
.trade-plan-modal {
  .ant-input::placeholder,
  .ant-select-selection__placeholder {
    color: var(--qd-text-secondary) !important;
    opacity: 1;
  }
}

@media (max-width: 680px) {
  .trade-plans {
    .ant-table {
      min-width: 0;
      width: 100%;
      overflow: visible !important;
    }
    .ant-table-wrapper,
    .ant-table-content {
      overflow: visible !important;
    }
    .ant-table-body {
      max-width: 100%;
      overflow-x: auto !important;
    }
  }
}

@media (max-width: 680px) {
  .trade-plan-modal .ant-descriptions-view {
    table,
    tbody,
    .ant-descriptions-row {
      display: block;
      width: 100%;
      table-layout: auto;
    }
    .ant-descriptions-item-label,
    .ant-descriptions-item-content {
      display: block;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }
  }
}

</style>
