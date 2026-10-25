<template>
  <section class="plan-records">
    <p>{{ t('help') }}</p>
    <a-button v-if="canWrite" type="primary" :disabled="blocked" @click="begin('attempt')">{{ t('add') }}</a-button>
    <a-empty v-if="!plan.attempts.length" :description="t('empty')" />
    <a-collapse v-model="expanded" accordion>
      <a-collapse-panel
        v-for="attempt in plan.attempts"
        :key="attempt.id"
        :header="`${t('attempt')} #${attempt.attempt_no} · v${attempt.version_no} · ${t(attempt.summary.trade_status)}`"
      >
        <p>
          {{ attempt.account_snapshot.name }} · {{ attempt.account_snapshot.exchange_id }} ·
          {{ t(attempt.execution_mode) }} · {{ time(attempt.recorded_at) }}
        </p>
        <p>{{ attempt.note }}</p>
        <a-descriptions bordered :column="{ xs: 1, sm: 2 }" size="small">
          <a-descriptions-item :label="t('referenceR')">
            {{ number(attempt.risk_snapshot.one_r) }} {{ attempt.risk_snapshot.risk_currency }}
          </a-descriptions-item>
          <a-descriptions-item :label="t('pretrade')">{{ t(attempt.summary.pretrade_evidence) }}</a-descriptions-item>
          <a-descriptions-item :label="t('actualEntry')">
            {{ number(attempt.summary.actual_entry_price) }}
          </a-descriptions-item>
          <a-descriptions-item :label="t('actualExit')">
            {{ number(attempt.summary.actual_exit_price) }}
          </a-descriptions-item>
          <a-descriptions-item :label="t('opened')">{{ number(attempt.summary.opened_quantity) }}</a-descriptions-item>
          <a-descriptions-item :label="t('exited')">{{ number(attempt.summary.closed_quantity) }}</a-descriptions-item>
          <a-descriptions-item :label="t('netProfit')">
            {{
              attempt.summary.net_profit == null
                ? t('notEvaluable')
                : number(attempt.summary.net_profit) + ' ' + attempt.summary.currency
            }}
          </a-descriptions-item>
          <a-descriptions-item :label="t('netR')">
            {{ attempt.summary.net_r == null ? t('notEvaluable') : number(attempt.summary.net_r) }}
          </a-descriptions-item>
          <a-descriptions-item :label="t('exits')">
            {{ attempt.summary.exit_reasons.join(' / ') || '—' }}
          </a-descriptions-item>
        </a-descriptions>
        <p v-if="attempt.summary.gaps.length">{{ t('gaps') }}：{{ attempt.summary.gaps.map(t).join('；') }}</p>
        <a-collapse>
          <a-collapse-panel key="basis" :header="t('basis')">
            <a-descriptions :column="1" bordered size="small">
              <a-descriptions-item v-for="key in basisFields" :key="key" :label="field(key)">
                {{ display(attempt.plan_snapshot[key], key) }}
              </a-descriptions-item>
            </a-descriptions>
          </a-collapse-panel>
        </a-collapse>
        <div class="record-actions" v-if="canWrite">
          <a-button :disabled="blocked" @click="begin('link', attempt)">{{ t('link') }}</a-button>
          <a-button :disabled="blocked" @click="begin('review', attempt)">{{ t('review') }}</a-button>
        </div>
        <p>{{ t('orderHelp') }}</p>
        <a-empty v-if="!attempt.links.length" :description="t('noLinks')" />
        <article v-for="link in attempt.links" :key="link.id" class="record-link">
          <b>{{ t(link.source_kind) }} #{{ link.source_id }} · {{ t(link.snapshot.trade_type || link.snapshot.side || '') }}</b>
          · {{ link.snapshot.symbol }}
          <a-tag>{{ t(link.revoked ? 'revoked' : link.attribution) }}</a-tag>
          <p>
            {{ t('quantity') }}: {{ link.snapshot.quantity ?? link.snapshot.filled_amount ?? '—' }} ·
            {{ t('orderState') }}: {{ t(link.snapshot.status || (['trade', 'history'].includes(link.source_kind) ? 'recorded_fill' : 'unknown')) }} · {{ time(link.recorded_at) }}
          </p>
          <p v-if="!link.snapshot.available">{{ t('unavailable') }}</p>
          <p>{{ link.reason }}</p>
          <div class="record-actions" v-if="canWrite && !link.revoked">
            <a-button :disabled="blocked" @click="begin('refresh', attempt, link)">{{ t('refresh') }}</a-button>
            <a-button :disabled="blocked" @click="begin('revoke', attempt, link)">{{ t('revoke') }}</a-button>
          </div>
        </article>
        <h3>{{ t('reviewHistory') }}</h3>
        <a-empty v-if="!attempt.reviews.length" :description="t('noReviews')" />
        <a-collapse accordion :destroy-inactive-panel="true">
          <a-collapse-panel
            v-for="review in attempt.reviews"
            :key="review.id"
            :header="`v${review.review_no} · ${t(review.evidence_snapshot.summary.phase)} · ${time(
              review.recorded_at
            )}`"
          >
            <p>{{ review.change_reason }} · {{ t('adoptedVersion') }} v{{ review.evidence_snapshot.version_no }}</p>
            <a-descriptions :column="1" bordered size="small">
              <a-descriptions-item v-for="dimension in dimensions" :key="dimension" :label="t(dimension)">
                {{ t(review.assessment[dimension].value) }} · {{ review.assessment[dimension].reason }}
              </a-descriptions-item>
              <a-descriptions-item :label="t('improvement')">{{ review.assessment.improvement }}</a-descriptions-item>
              <a-descriptions-item :label="t('evidence')">
                {{ time(review.evidence_snapshot.data_as_of) }} · {{ t(review.evidence_snapshot.summary.trade_status) }}
              </a-descriptions-item>
              <a-descriptions-item :label="t('netR')">
                {{ review.evidence_snapshot.summary.net_r == null ? t('notEvaluable') : number(review.evidence_snapshot.summary.net_r) }}
              </a-descriptions-item>
            </a-descriptions>
            <a-collapse>
              <a-collapse-panel key="facts" :header="t('evidence')">
                <p>{{ t('basis') }}: v{{ review.evidence_snapshot.version_no }} · {{ field('entry_price') }} {{ review.evidence_snapshot.plan_snapshot.risk_inputs.entry_price || '—' }} · {{ field('stop_price') }} {{ review.evidence_snapshot.plan_snapshot.risk_inputs.stop_price || '—' }}</p>
                <p>{{ t('referenceR') }}: {{ number(review.evidence_snapshot.risk_snapshot.one_r) }} {{ review.evidence_snapshot.risk_snapshot.risk_currency }}</p>
                <p>{{ field('exit_rules') }}: {{ review.evidence_snapshot.plan_snapshot.exit_rules }}</p>
                <p>{{ t('actualEntry') }}: {{ number(review.evidence_snapshot.summary.actual_entry_price) }} · {{ t('actualExit') }}: {{ number(review.evidence_snapshot.summary.actual_exit_price) }}</p>
                <p>{{ t('gaps') }}: {{ review.evidence_snapshot.summary.gaps.map(t).join('；') || '—' }}</p>
                <article v-for="fact in review.evidence_snapshot.links" :key="fact.id" class="record-link">
                  {{ t(fact.source_kind) }} #{{ fact.source_id }} · {{ fact.snapshot.symbol }} · {{ t(fact.revoked ? 'revoked' : fact.attribution) }}
                  <p>{{ t('quantity') }}: {{ fact.snapshot.quantity ?? fact.snapshot.filled_amount ?? '—' }} · {{ t('price') }}: {{ fact.snapshot.price || '—' }} · {{ t('occurredAt') }}: {{ time(fact.snapshot.occurred_at) }}</p>
                </article>
              </a-collapse-panel>
            </a-collapse>
          </a-collapse-panel>
        </a-collapse>
      </a-collapse-panel>
    </a-collapse>
    <a-modal
      :visible="!!operation"
      :title="
        t(
          operation === 'attempt'
            ? 'add'
            : operation === 'link'
              ? 'link'
              : operation === 'review'
                ? 'review'
                : operation
        )
      "
      :wrap-class-name="modalClass"
      :body-style="bodyStyle"
      :z-index="1100"
      width="850px"
      :destroy-on-close="true"
      @cancel="guardClose(close)"
    >
      <a-alert v-if="error" :message="error" type="error" show-icon class="notice" />
      <a-alert v-if="pending" :message="$t('tradePlans.pendingHelp')" type="warning" show-icon class="notice" />
      <a-form layout="vertical">
        <template v-if="operation === 'attempt'">
          <p>{{ t('frozenHelp') }}</p>
          <a-form-item :label="t('version')" required>
            <a-select :disabled="blocked" v-model="form.version_id" :dropdown-class-name="selectClass">
              <a-select-option v-for="version in versions" :key="version.id" :value="version.id">
                v{{ version.version_no }} · {{ version.snapshot.title }} · {{ time(version.created_at) }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item :label="t('account')" required>
            <a-select :disabled="blocked" v-model="form.credential_id" :dropdown-class-name="selectClass">
              <a-select-option v-for="account in accounts" :key="account.credential_id" :value="account.credential_id">
                {{ account.name || '#' + account.credential_id }} · {{ account.exchange_id }}
              </a-select-option>
            </a-select>
            <p v-if="!accounts.length">{{ t('noAccounts') }}</p>
          </a-form-item>
          <a-form-item :label="t('environment')" required>
            <a-select :disabled="blocked" v-model="form.execution_mode" :dropdown-class-name="selectClass">
              <a-select-option value="live">{{ t('live') }}</a-select-option>
              <a-select-option value="paper">{{ t('paper') }}</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item :label="t('note')"><a-textarea :disabled="blocked" v-model="form.note" :max-length="2000" /></a-form-item>
        </template>
        <template v-if="operation === 'link'">
          <p>{{ t('orderHelp') }}</p>
          <a-form-item :label="t('sourceKind')">
            <a-select :disabled="blocked" v-model="form.source_kind" :dropdown-class-name="selectClass" @change="resetSources">
              <a-select-option v-for="kind in kinds" :key="kind" :value="kind">{{ t(kind) }}</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item :label="t('source')" required>
            <a-select
              v-model="form.source_id"
              show-search
              option-filter-prop="children"
              :loading="loading"
              :dropdown-class-name="selectClass"
            >
              <a-select-option v-for="fact in sources" :key="fact.source_id" :value="fact.source_id">
                #{{ fact.source_id }} {{ fact.symbol }} {{ t(fact.trade_type || fact.side || '') }} · {{ fact.quantity ?? fact.filled_amount ?? '—' }} ·
                {{ time(fact.occurred_at || fact.recorded_at) }}
              </a-select-option>
            </a-select>
            <a-button v-if="sourceFilter" :disabled="blocked" @click="showOtherSources">{{ t('otherRecords') }}</a-button>
            <a-button v-if="hasMore" :loading="loading" @click="loadSources(true)">{{ t('more') }}</a-button>
          </a-form-item>
          <template v-if="preview">
            <h3>{{ t('preview') }}</h3>
            <p>{{ t('tradeAction') }}: {{ t(preview.trade_type || preview.side || 'unknown') }}</p>
            <a-descriptions :column="1" bordered size="small">
              <a-descriptions-item :label="t('identity')">
                {{ preview.market || '—' }} / {{ preview.symbol }} / {{ preview.market_type }} /
                {{ preview.exchange_id || '—' }} / #{{ preview.credential_id }} / {{ preview.inst_id || '—' }} /
                {{ preview.execution_mode ? t(preview.execution_mode) : '—' }}
              </a-descriptions-item>
              <a-descriptions-item :label="t('price')">{{ preview.price || '—' }}</a-descriptions-item>
              <a-descriptions-item :label="t('quantity')">
                {{ preview.quantity ?? preview.filled_amount ?? '—' }}
              </a-descriptions-item>
              <a-descriptions-item :label="t('orderState')">{{ t(preview.status || (['trade', 'history'].includes(preview.source_kind) ? 'recorded_fill' : 'unknown')) }}</a-descriptions-item>
              <a-descriptions-item :label="t('occurredAt')">{{ time(preview.occurred_at) }}</a-descriptions-item>
              <a-descriptions-item :label="t('recordedAt')">{{ time(preview.recorded_at) }}</a-descriptions-item>
            </a-descriptions>
          </template>
        </template>
        <a-form-item v-if="['link', 'refresh'].includes(operation)" :label="t('attribution')" required>
          <a-select :disabled="blocked" v-model="form.attribution" :dropdown-class-name="selectClass">
            <a-select-option value="pending">{{ t('pending') }}</a-select-option>
            <a-select-option value="confirmed">{{ t('confirmed') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item v-if="['link', 'refresh', 'revoke'].includes(operation)" :label="t('reason')" required>
          <a-textarea :disabled="blocked" v-model="form.reason" :max-length="2000" />
        </a-form-item>
        <template v-if="operation === 'review'">
          <p>{{ t('reviewHelp') }}</p>
          <section v-for="dimension in dimensions" :key="dimension">
            <a-form-item :label="t(dimension)" required>
              <a-select :disabled="blocked" v-model="form.assessment[dimension].value" :dropdown-class-name="selectClass">
                <a-select-option v-for="value in choices[dimension]" :key="value" :value="value">
                  {{ t(value) }}
                </a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item :label="t('reason')" required>
              <a-textarea :disabled="blocked" v-model="form.assessment[dimension].reason" :max-length="2000" />
            </a-form-item>
          </section>
          <a-form-item :label="t('improvement')" required>
            <a-textarea :disabled="blocked" v-model="form.assessment.improvement" :max-length="2000" />
          </a-form-item>
          <a-form-item :label="t('changeReason')" required>
            <a-textarea :disabled="blocked" v-model="form.change_reason" :max-length="500" />
          </a-form-item>
        </template>
      </a-form>
      <template slot="footer">
        <a-button v-if="pending" :loading="saving" @click="recover">{{ $t('tradePlans.resolvePending') }}</a-button>
        <a-button :disabled="blocked" @click="guardClose(close)">{{ t('close') }}</a-button>
        <a-button type="primary" :loading="blocked" @click="commit">{{ t('save') }}</a-button>
      </template>
    </a-modal>
  </section>
</template>
<script>
import { sourceMatchesPlan, sourceMatchesLink } from './navigation'
import { formatExecutionNumber } from '@/utils/tradeExecution'
import { listTradePlanAccounts, listTradePlanSources } from './api'
export default {
  name: 'TradePlanRecordsPanel',
  props: {
    plan: { type: Object, required: true },
    versions: { type: Array, required: true },
    canWrite: Boolean,
    blocked: Boolean,
    sourceContext: { type: Object, default: null },
    pending: Boolean,
    saving: Boolean,
    resolve: { type: Function, required: true },
    save: { type: Function, required: true },
    time: { type: Function, required: true },
    field: { type: Function, required: true },
    display: { type: Function, required: true },
    modalClass: { type: String, required: true },
    selectClass: { type: String, required: true },
    bodyStyle: { type: Object, required: true }
  },
  data() {
    return {
      operation: '',
      useSourceContext: true,
      form: {},
      initial: '',
      targetId: '',
      expanded: undefined,
      accounts: [],
      sources: [],
      page: 0,
      total: 0,
      loading: false,
      sequence: 0,
      error: '',
      kinds: ['history', 'trade', 'order', 'quick_order', 'strategy'],
      dimensions: ['market_judgment', 'strategy_rules', 'execution'],
      choices: {
        market_judgment: ['matches', 'differs', 'not_evaluable'],
        strategy_rules: ['applicable', 'not_applicable', 'not_evaluable'],
        execution: ['followed', 'deviated', 'not_evaluable']
      },
      basisFields: [
        'instrument',
        'direction',
        'hypothesis',
        'entry_trigger',
        'invalidation',
        'exit_rules',
        'wait_conditions',
        'risk_inputs'
      ]
    }
  },
  computed: {
    hasUnsaved() {
      return !!this.operation && JSON.stringify(this.form) !== this.initial
    },
    target() {
      return this.plan.attempts.find((a) => a.id === this.targetId)
    },
    preview() {
      return this.sources.find((f) => f.source_id === this.form.source_id)
    },
    sourceFilter() {
      return this.useSourceContext && sourceMatchesPlan(this.sourceContext, this.target?.plan_snapshot) &&
        this.sourceContext.credentialId === this.target?.account_snapshot.credential_id &&
        this.sourceContext.kind === this.form.source_kind
? this.sourceContext.id
: null
    },
    hasMore() {
      return this.page * 20 < this.total
    }
  },
  watch: {
    plan: {
 immediate: true,
handler(plan) {
      if (this.operation || !this.sourceContext) return
      const linked = plan.attempts.find(attempt => attempt.links.some(link => sourceMatchesLink(this.sourceContext, link)))
      if (linked) this.expanded = linked.id
    }
}
  },
  beforeDestroy() {
    this.sequence++
  },
  methods: {
    number: formatExecutionNumber,
    async recover() {
      await this.resolve()
      await this.$nextTick()
      if (!this.pending) this.close()
    },
    t(key) {
      const k = 'tradePlans.records.' + key
      return this.$te(k) ? this.$t(k) : key
    },
    async begin(operation, attempt, link) {
      if (this.blocked) return
      this.operation = operation
      this.error = ''
      this.targetId = attempt?.id || ''
      this.expanded = attempt?.id
      if (operation === 'attempt') {
        this.form = {
          version_id: this.plan.current_version_id,
          credential_id: undefined,
          execution_mode: 'live',
          note: ''
        }
        this.initial = JSON.stringify(this.form)
        const initialForm = this.form
        try {
          const accounts = (await listTradePlanAccounts()).data.items
          if (this.operation !== 'attempt' || this.form !== initialForm) return
          this.accounts = accounts
          if (JSON.stringify(this.form) === this.initial && sourceMatchesPlan(this.sourceContext, this.plan.snapshot) && this.accounts.some(account => account.credential_id === this.sourceContext.credentialId)) {
            this.form.credential_id = this.sourceContext.credentialId
            this.initial = JSON.stringify(this.form)
          }
        } catch (_) {
          if (this.operation === 'attempt' && this.form === initialForm) this.error = this.t('loadFailed')
        }
      } else if (operation === 'link') {
        this.useSourceContext = true
        this.form = { source_kind: sourceMatchesPlan(this.sourceContext, attempt.plan_snapshot) ? this.sourceContext.kind : 'history', source_id: undefined, attribution: 'pending', reason: '' }
        this.resetSources()
      } else if (operation === 'review') {
        this.form = { change_reason: '', assessment: { improvement: '' } }
        this.dimensions.forEach((key) => {
          this.$set(this.form.assessment, key, { value: 'not_evaluable', reason: '' })
        })
      } else {
        this.form = { link_id: link.id, reason: '', attribution: link.attribution }
      }
      if (operation !== 'attempt') this.initial = JSON.stringify(this.form)
    },
    close() {
      this.operation = ''
      this.sequence++
    },
    guardClose(onOk, onCancel) {
      if (this.blocked) {
        onCancel?.()
        return
      }
      if (!this.hasUnsaved) {
        onOk()
        return
      }
      this.$confirm({
        title: this.t('discard'),
        class: this.modalClass,
        zIndex: 1400,
        okText: this.t('discardConfirm'),
        cancelText: this.t('keep'),
        autoFocusButton: 'cancel',
        onOk,
        onCancel
      })
    },
    showOtherSources() { this.useSourceContext = false; this.resetSources() },
    resetSources() {
      this.sequence++
      this.sources = []
      this.page = 0
      this.total = 0
      this.form.source_id = undefined
      this.loadSources(false)
    },
    async loadSources(more) {
      const sequence = ++this.sequence
      this.loading = true
      try {
        const result = await listTradePlanSources(this.plan.id, {
          credential_id: this.target.account_snapshot.credential_id,
          version_id: this.target.plan_version_id,
          source_kind: this.form.source_kind,
          ...(this.sourceFilter ? { source_id: this.sourceFilter } : {}),
          page: more ? this.page + 1 : 1,
          page_size: 20
        })
        if (sequence !== this.sequence) return
        if (result.code !== 1) throw new Error()
        this.sources = more ? [...this.sources, ...result.data.items] : result.data.items
        if (this.sourceFilter && this.sources.some(fact => fact.source_id === this.sourceFilter)) this.form.source_id = this.sourceFilter
        this.page = result.data.page
        this.total = result.data.total
        this.error = ''
      } catch (_) {
        if (sequence === this.sequence) this.error = this.t('loadFailed')
      } finally {
        if (sequence === this.sequence) this.loading = false
      }
    },
    async commit() {
      if (this.blocked) return
      this.error = ''
      const op = this.operation
      const data = JSON.parse(JSON.stringify(this.form))
      let action = ''
      if (op === 'attempt') {
        if (!data.version_id || !data.credential_id) {
          this.error = this.t('required')
          return
        }
        action = 'attempts'
      } else {
        data.attempt_id = this.targetId
        if (op === 'link') {
          if (!this.preview || !data.reason?.trim()) {
            this.error = this.t('required')
            return
          }
          action = 'links'
        } else if (op === 'review') {
          action = 'reviews'
        } else {
          action = op === 'refresh' ? 'links/refresh' : 'links/revoke'
          if (op === 'revoke') delete data.attribution
          if (!data.reason?.trim()) {
            this.error = this.t('required')
            return
          }
        }
      }
      if (await this.save(action, data)) {
        this.close()
        this.expanded = this.targetId || this.plan.attempts[this.plan.attempts.length - 1]?.id
      }
    }
  }
}
</script>
<style scoped>
.plan-records {
  overflow-wrap: anywhere;
}
.record-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}
.record-link {
  border: 1px solid var(--qd-border);
  border-radius: 6px;
  padding: 12px;
  margin: 12px 0;
}
</style>
