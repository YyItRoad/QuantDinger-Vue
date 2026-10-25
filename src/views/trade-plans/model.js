import isEqual from 'lodash-es/isEqual.js'

export const emptyPlan = () => ({
  title: '',
  instrument: {
    market: 'Crypto',
    symbol: '',
    exchange_id: '',
    market_type: 'spot',
    instrument_id: '',
    settlement_ccy: ''
  },
  direction: 'long',
  primary_strategy: '',
  hypothesis: '',
  entry_trigger: '',
  invalidation: '',
  exit_rules: '',
  wait_conditions: '',
  evidence: '',
  counter_evidence: '',
  analysis_timeframe: '',
  decision_timeframe: '',
  expires_at: null,
  retrospective: false,
  research_refs: [],
  risk_inputs: { model: 'linear' }
})
export const clonePlan = (plan) => (plan === undefined ? undefined : JSON.parse(JSON.stringify(plan)))
export function editablePlan(snapshot) {
  const plan = clonePlan(snapshot)
  plan.research_refs = (plan.research_refs || []).map((ref) => {
    const value = { ...ref }
    delete value.evidence_snapshot
    delete value.recorded_at
    return value
  })
  return plan
}
export function planDiff(before, after) {
  return Object.keys({ ...before, ...after }).filter((key) => !isEqual(before[key], after[key]))
}
export function newRequestId() {
  return window.crypto.randomUUID()
}
export const terminalPlan = (row) => row && ['cancelled', 'expired', 'completed'].includes(row.effective_lifecycle)

// Conflicting fields require a deliberate choice; unrelated edits can be merged.
export function conflictingFields(base, local, latest) {
  const serverChanges = new Set(planDiff(base, latest))
  return planDiff(base, local).filter((key) => serverChanges.has(key) && !isEqual(local[key], latest[key]))
}
export function mergePlanChanges(base, local, latest, choices = {}) {
  if (conflictingFields(base, local, latest).some((key) => !['local', 'server'].includes(choices[key]))) { throw new Error('unresolved_conflicts') }
  const result = clonePlan(latest)
  for (const key of planDiff(base, local)) {
    if (choices[key] !== 'server') result[key] = clonePlan(local[key])
  }
  return result
}
export function mutationSnapshot(snapshot, riskBasis) {
  const result = editablePlan(snapshot)
  delete result.risk_inputs[riskBasis === 'quantity' ? 'risk_budget' : 'quantity']
  return result
}
