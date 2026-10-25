import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyPlan, editablePlan, planDiff, terminalPlan, mergePlanChanges } from '../../src/views/trade-plans/model.js'

test('blank drafts do not need accounts; editable snapshots retain source IDs, strip server evidence', () => {
  const draft = emptyPlan()
  assert.equal(draft.title, '')
  assert.equal('credential_id' in draft, false)
  const stored = { ...draft, research_refs: [{ type: 'market_state_result', id: 7, summary: 'source', evidence_snapshot: { summary: 'original' }, recorded_at: 'time' }] }
  const editable = editablePlan(stored)
  assert.deepEqual(editable.research_refs, [{ type: 'market_state_result', id: 7, summary: 'source' }])
  assert.equal(stored.research_refs[0].evidence_snapshot.summary, 'original')
})
test('merge keeps local input and adopts unrelated server updates', () => {
  const base = { title: 'initial', hypothesis: 'old', counter_evidence: 'old' }
  const local = { ...base, hypothesis: 'local unsaved input' }
  const latest = { ...base, counter_evidence: 'MCP update' }
  const result = mergePlanChanges(base, local, latest)
  assert.equal(result.hypothesis, 'local unsaved input')
  assert.equal(result.counter_evidence, 'MCP update')
  assert.deepEqual(planDiff(latest, result), ['hypothesis'])
})
test('server-time effective expiry is terminal even before maintenance', () => {
  assert.equal(terminalPlan({ lifecycle: 'observing', effective_lifecycle: 'expired' }), true)
  assert.equal(terminalPlan({ effective_lifecycle: 'observing' }), false)
})

// Exercise the actual component methods with transport failures, not a duplicate implementation.
import { readFileSync } from 'node:fs'
import * as helpers from '../../src/views/trade-plans/model.js'
import * as navigation from '../../src/views/trade-plans/navigation.js'
function component (api) {
  const source = readFileSync(new URL('../../src/views/trade-plans/index.vue', import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]
  const script = source.replace(/^import [\s\S]*? from ['"][^'"]+['"];?\n/gm, '').replace('export default', 'return')
  return new Function('api', 'helpers', `const {parseTradePlanSource, draftFromSource} = helpers; const InstrumentFields = {}; const RecordsPanel = {}; const Timeline = { Item: {} }; const { listTradePlans, getTradePlan, listTradePlanVersions, saveTradePlan, getTradePlanRequest, listResearchRecords } = api; const { emptyPlan, editablePlan, clonePlan, planDiff, newRequestId, terminalPlan, mergePlanChanges, conflictingFields, mutationSnapshot } = helpers; ${script}`)(api, { ...helpers, ...navigation, newRequestId: () => 'same-request-key' })
}
function vmFor (options) {
  const vm = { ...options.data(), $refs: {}, $message: { success () {}, error () {} }, $t: key => key, t: key => key, load: async () => {}, open: async () => {} }
  for (const [key, method] of Object.entries(options.methods)) vm[key] = method.bind(vm)
  vm.load = async () => {}; vm.open = async () => {}
  return vm
}
test('lost save response retries the original identifier without creating a second request', async () => {
  const keys = []; let first = true
  const vm = vmFor(component({
    saveTradePlan: async (id, action, body) => { keys.push(body.request_id); if (first) { first = false; throw new Error('timeout') }; return { code: 1, data: { id: 'plan', row_revision: 1 } } },
    getTradePlanRequest: async () => { throw { response: { status: 404 } } }
  }))
  await assert.rejects(() => vm.send(null, 'versions', { snapshot: { title: 'original' } }))
  assert.ok(vm.pending)
  const row = await vm.send(null, 'versions', { snapshot: { title: 'original' } })
  assert.equal(row.id, 'plan'); assert.deepEqual(keys, ['same-request-key', 'same-request-key']); assert.equal(vm.pending, null)
})
test('uncertain save cannot be retried under modified content', async () => {
  let calls = 0
  const vm = vmFor(component({ saveTradePlan: async () => { calls++; throw new Error('timeout') }, getTradePlanRequest: async () => { throw new Error('offline') } }))
  await assert.rejects(() => vm.send(null, 'versions', { snapshot: { title: 'original' } }))
  await assert.rejects(() => vm.send(null, 'versions', { snapshot: { title: 'changed' } }), /pending_request_changed/)
  assert.equal(calls, 1)
})
test('recovering a committed response preserves newer local edits', async () => {
  const stored = { id: 'plan', row_revision: 2, snapshot: { title: 'saved' } }
  const vm = vmFor(component({ getTradePlanRequest: async () => ({ code: 1, data: { response: { id: 'plan', row_revision: 2 } } }), getTradePlan: async () => ({ code: 1, data: stored }) }))
  vm.editorOpen = true; vm.draft = { title: 'new unsaved input' }
  vm.pending = { requestId: 'key', signature: JSON.stringify({ id: null, action: 'versions', data: { snapshot: { title: 'saved' } } }) }
  await vm.resolvePending()
  assert.equal(vm.draft.title, 'new unsaved input'); assert.equal(vm.editingId, 'plan'); assert.equal(vm.editingRevision, 2); assert.equal(vm.pending, null)
})


test('same-field conflicts cannot silently overwrite either side', () => {
  const base = { title: 'base' }; const local = { title: 'local' }; const latest = { title: 'remote' }
  assert.throws(() => mergePlanChanges(base, local, latest), /unresolved_conflicts/)
  assert.equal(mergePlanChanges(base, local, latest, { title: 'local' }).title, 'local')
  assert.equal(mergePlanChanges(base, local, latest, { title: 'server' }).title, 'remote')
})
test('saving one risk basis removes the inactive input without changing the editor', () => {
  const draft = emptyPlan(); draft.risk_inputs = { quantity: '2', risk_budget: '10' }
  assert.deepEqual(helpers.mutationSnapshot(draft, 'quantity').risk_inputs, { quantity: '2' })
  assert.deepEqual(helpers.mutationSnapshot(draft, 'risk_budget').risk_inputs, { risk_budget: '10' })
  assert.equal(draft.risk_inputs.quantity, '2')
})

import { marketContextKey, CRYPTO_EXCHANGE_IDS } from '../../src/utils/marketContext.js'
function instrumentComponent (searchSymbols) {
  const source = readFileSync(new URL('../../src/views/trade-plans/InstrumentFields.vue', import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]
  const script = source.replace(/^import [\s\S]*? from ['"][^'"]+['"];?\n/gm, '').replace('export default', 'return')
  return new Function('searchSymbols', 'marketContextKey', 'CRYPTO_EXCHANGE_IDS', script)(searchSymbols, marketContextKey, CRYPTO_EXCHANGE_IDS)
}
function instrumentVm (searchSymbols) {
  const options = instrumentComponent(searchSymbols)
  const vm = { ...options.data(), value: { market: 'Crypto', symbol: 'BTC/USDT', market_type: 'spot', exchange_id: 'binance', instrument_id: 'BTCUSDT', settlement_ccy: 'USDT' }, $emit: (event, value) => { vm.emitted = value } }
  Object.entries(options.methods).forEach(([name, fn]) => { vm[name] = fn.bind(vm) })
  Object.entries(options.computed).forEach(([name, fn]) => Object.defineProperty(vm, name, { get: fn.bind(vm) }))
  return vm
}
test('changing market or product clears stale identity and ignores an earlier search response', async () => {
  let respond
  const vm = instrumentVm(() => new Promise(resolve => { respond = resolve }))
  vm.searchSequence = 1; vm.searching = true
  const pending = vm.fetchSymbols('BTC', 1)
  vm.changeContext('market_type', 'swap')
  assert.equal(vm.emitted.symbol, '')
  assert.equal(vm.emitted.instrument_id, '')
  assert.equal(vm.emitted.settlement_ccy, '')
  assert.equal(vm.emitted.market_type, 'swap')
  respond({ code: 1, data: [{ symbol: 'BTC/USDT', market_type: 'spot' }] })
  await pending
  assert.deepEqual(vm.results, [])
  assert.equal(vm.searching, false)
})
test('selection preserves native identity and offers explicit manual research when search is unavailable', async () => {
  const vm = instrumentVm(async () => { throw new Error('offline') })
  vm.query = 'SOL/USDT'; vm.searchSequence = 1
  await vm.fetchSymbols(vm.query, 1)
  assert.equal(vm.searchError, true)
  const manual = vm.choices.find(item => item.manual)
  vm.selectSymbol(vm.keyOf(manual))
  assert.equal(vm.emitted.symbol, 'SOL/USDT')
  assert.equal(vm.emitted.instrument_id, '')
  vm.results = [{ market: 'Crypto', symbol: 'ETH/USDT', market_type: 'swap', exchange_id: 'okx', instrument_id: 'ETH-USDT-SWAP', settle_currency: 'USDT' }]
  vm.selectSymbol(vm.keyOf(vm.results[0]))
  assert.equal(vm.emitted.instrument_id, 'ETH-USDT-SWAP')
  assert.equal(vm.emitted.exchange_id, 'okx')
  assert.equal(vm.emitted.settlement_ccy, 'USDT')
})

test('uncertain saves block navigation and dirty editors use the existing confirmation dialog', () => {
  const options = component({})
  const vm = vmFor(options); const navigations = []
  vm.pending = { requestId: 'pending' }; vm.editorOpen = false
  options.beforeRouteLeave.call(vm, {}, {}, decision => navigations.push(decision))
  assert.deepEqual(navigations, [false])
  vm.pending = null; vm.editorOpen = true; vm.isDirty = true; vm.modalClass = 'trade-plan-modal theme-dark'
  let dialog
  vm.$confirm = config => { dialog = config }
  options.beforeRouteLeave.call(vm, {}, {}, decision => navigations.push(decision))
  assert.equal(dialog.class, vm.modalClass)
  assert.equal(dialog.autoFocusButton, 'cancel')
  assert.equal(navigations.length, 1)
  dialog.onCancel(); assert.equal(navigations[1], false)
  options.beforeRouteLeave.call(vm, {}, {}, decision => navigations.push(decision))
  dialog.onOk(); assert.equal(navigations[2], undefined)
})
test('changing only expiry is still an unsaved edit; clean editors close without a prompt', () => {
  const options = component({})
  const vm = vmFor(options)
  vm.baseSnapshot = emptyPlan(); vm.draft = emptyPlan(); vm.expiryLocal = '2026-10-26T14:30'
  assert.equal(options.computed.isDirty.call(vm), true)
  vm.expiryLocal = ''; vm.isDirty = false; vm.editorOpen = true
  vm.$confirm = () => { throw new Error('clean editor should not prompt') }
  vm.closeEditor(); assert.equal(vm.editorOpen, false)
})
test('each signal dialog starts with a fresh observation time and does not reuse an old reason', () => {
  const vm = vmFor(component({}))
  vm.decision = { observedLocal: '2000-01-01T00:00', reason: 'old reason', status: 'confirmed' }
  vm.showDecision()
  assert.equal(vm.decision.reason, '')
  assert.equal(vm.decision.status, 'unconfirmed')
  assert.ok(Math.abs(Date.now() - new Date(vm.decision.observedLocal).getTime()) < 61000)
})
test('late list responses cannot replace the current filter results', async () => {
  const resolves = []
  const options = component({ listTradePlans: () => new Promise(resolve => resolves.push(resolve)) })
  const vm = vmFor(options)
  const first = options.methods.load.call(vm)
  const latest = options.methods.load.call(vm)
  resolves[1]({ code: 1, data: { items: [{ id: 'latest' }], total: 1 } })
  await latest
  resolves[0]({ code: 1, data: { items: [{ id: 'old' }], total: 1 } })
  await first
  assert.equal(vm.items[0].id, 'latest')
  assert.equal(vm.loading, false)
})

function recordComponent (api = {}) {
  const source = readFileSync(new URL('../../src/views/trade-plans/RecordsPanel.vue', import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]
  const script = source.replace(/^import [\s\S]*? from ['"][^'"]+['"];?\n/gm, '').replace('export default', 'return')
  return new Function('api', 'navigation', `const {sourceMatchesPlan,sourceMatchesLink} = navigation; const formatExecutionNumber = value => String(value); const {listTradePlanAccounts,listTradePlanSources}=api;${script}`)(api, navigation)
}
function recordVm (api) {
  const options = recordComponent(api)
  const vm = { ...options.data(), plan: { id: 'plan', attempts: [{ id: 'attempt', plan_version_id: 'v1', account_snapshot: { credential_id: 1 } }] }, targetId: 'attempt', $set: (object, key, value) => { object[key] = value }, $te: () => false, $t: key => key }
  Object.entries(options.methods).forEach(([key, fn]) => { vm[key] = fn.bind(vm) })
  Object.entries(options.computed).forEach(([key, fn]) => Object.defineProperty(vm, key, { get: fn.bind(vm) }))
  return vm
}
test('record source searches ignore a response from an earlier type or closed dialog', async () => {
  const pending = []
  const vm = recordVm({ listTradePlanSources: () => new Promise(resolve => pending.push(resolve)) })
  vm.form = { source_kind: 'trade' }
  const first = vm.loadSources(false)
  vm.form.source_kind = 'history'
  const second = vm.loadSources(false)
  pending[1]({ code: 1, data: { items: [{ source_id: 2 }], page: 1, total: 1 } }); await second
  pending[0]({ code: 1, data: { items: [{ source_id: 1 }], page: 1, total: 1 } }); await first
  assert.deepEqual(vm.sources, [{ source_id: 2 }])
  const third = vm.loadSources(false); vm.close()
  pending[2]({ code: 1, data: { items: [{ source_id: 3 }], page: 1, total: 1 } }); await third
  assert.deepEqual(vm.sources, [{ source_id: 2 }])
})
test('record forms preserve inputs on write failure and send reference IDs without fabricated facts', async () => {
  const vm = recordVm({})
  vm.operation = 'link'; vm.form = { source_kind: 'trade', source_id: 7, attribution: 'pending', reason: 'ambiguous' }
  vm.sources = [{ source_id: 7, price: '100' }]
  let sent
  vm.save = async (action, data) => { sent = { action, data }; return false }
  await vm.commit()
  assert.equal(vm.operation, 'link'); assert.equal(vm.form.reason, 'ambiguous')
  assert.equal(sent.data.attempt_id, 'attempt'); assert.equal(sent.action, 'links')
  assert.equal('snapshot' in sent.data, false); assert.equal('price' in sent.data, false)
})
test('unsaved review close uses confirmation and pending writes block closing', () => {
  const vm = recordVm({}); let confirmed; let closed = 0; let cancelled = 0
  vm.operation = 'review'; vm.form = { change_reason: 'draft' }; vm.initial = '{}'; vm.$confirm = options => { confirmed = options }
  vm.guardClose(() => closed++, () => cancelled++)
  assert.equal(closed, 0); confirmed.onCancel(); assert.equal(cancelled, 1)
  confirmed.onOk(); assert.equal(closed, 1)
  vm.blocked = true; confirmed = null
  vm.guardClose(() => closed++, () => cancelled++)
  assert.equal(confirmed, null); assert.equal(closed, 1); assert.equal(cancelled, 2)
})

test('record recovery closes only after the original pending request is resolved', async () => {
  const vm = recordVm({}); vm.operation = 'link'; vm.pending = true
  vm.$nextTick = async () => {}
  let queries = 0
  vm.resolve = async () => { queries++ }
  await vm.recover(); assert.equal(vm.operation, 'link')
  vm.resolve = async () => { queries++; vm.pending = false }
  await vm.recover(); assert.equal(vm.operation, ''); assert.equal(queries, 2)
})
test('recovering a committed state write closes its old dialog without submitting another event', async () => {
  const vm = vmFor(component({ getTradePlanRequest: async () => ({ code: 1, data: { response: { id: 'plan' } } }), getTradePlan: async () => ({ code: 1, data: { id: 'plan' } }) }))
  vm.stateTarget = 'observing'; vm.editorOpen = false
  vm.pending = { requestId: 'key', signature: JSON.stringify({ id: 'plan', action: 'state', data: { lifecycle: 'observing', reason: 'original' } }) }
  await vm.resolvePending()
  assert.equal(vm.stateTarget, ''); assert.equal(vm.pending, null)
})

test('existing history navigation contains identities only, without private thoughts or trading instructions', () => {
  const route = navigation.tradePlanSourceRoute('history', { id: 7, source_trade_id: 21, credential_id: 4, symbol: 'BTC/USDT', market_category: 'Crypto', market_type: 'spot', position_side: 'long', entry_reason: 'private thought', encrypted_config: 'secret' })
  assert.equal(route.name, 'TradePlans')
  const source = navigation.parseTradePlanSource(route.query)
  assert.equal(source.credentialId, 4); assert.equal(source.id, 7); assert.equal(source.tradeId, 21)
  assert.equal(JSON.stringify(route).includes('private thought'), false)
  assert.equal(JSON.stringify(route).includes('secret'), false)
  for (const from_id of [true, ['7'], 'NaN', '-1', '1e5', '9007199254740993']) assert.equal(navigation.parseTradePlanSource({ from_kind: 'history', from_id }), null)
})
test('source navigation prefill keeps the original recording model and treats historical trades as backfills', () => {
  const source = navigation.parseTradePlanSource({ from_kind: 'history', from_id: '7', from_symbol: 'btc/usdt', from_market: 'Crypto', from_type: 'spot', from_direction: 'long' })
  const draft = navigation.draftFromSource(emptyPlan(), source)
  assert.equal(draft.instrument.symbol, 'BTC/USDT'); assert.equal(draft.retrospective, true)
  assert.equal(draft.hypothesis, ''); assert.equal(draft.evidence, '')
  assert.equal(navigation.sourceMatchesPlan(source, draft), true)
  assert.equal(navigation.sourceMatchesPlan(source, { instrument: { market: 'Crypto', symbol: 'ETH/USDT' } }), false)
})
test('active canonical trade and archive aliases focus the same attempt, while revoked links do not', () => {
  const source = { kind: 'history', id: 7, tradeId: 21 }
  assert.equal(navigation.sourceMatchesLink(source, { source_kind: 'trade', source_id: 21, trade_id: 21 }), true)
  assert.equal(navigation.sourceMatchesLink(source, { source_kind: 'history', source_id: 7, revoked: true }), false)
})
test('a unique existing association opens that plan without creating or changing a record', async () => {
  const calls = []
  const options = component({ listTradePlans: async params => { calls.push(params); return { code: 1, data: { items: [{ id: 'linked-plan' }], total: 1 } } } })
  const vm = vmFor(options); vm.sourceContext = { kind: 'history', id: 7 }; let opened
  vm.open = async id => { opened = id }
  await options.methods.load.call(vm)
  assert.equal(calls.length, 1); assert.equal(calls[0].source_id, 7); assert.equal(calls[0].q, '')
  assert.equal(opened, 'linked-plan'); assert.equal(vm.detailTab, 'records')
})
test('an unlinked source shows matching research rather than automatically attaching it', async () => {
  let count = 0
  const options = component({ listTradePlans: async params => ({ code: 1, data: ++count === 1 ? { total: 0, items: [] } : { total: 1, items: [{ id: 'candidate' }] } }) })
  const vm = vmFor(options); vm.sourceContext = { kind: 'quick_order', id: 7 }; let opened = false
  vm.open = async () => { opened = true }
  await options.methods.load.call(vm)
  assert.equal(count, 2); assert.equal(opened, false); assert.equal(vm.items[0].id, 'candidate')
})
test('record context selects a source only after the server returns it for the adopted account and version', async () => {
  let sent
  const vm = recordVm({ listTradePlanSources: async (planId, params) => { sent = params; return { code: 1, data: { page: 1, total: 1, items: [{ source_id: 7 }] } } } })
  vm.plan.attempts[0].plan_snapshot = { instrument: { market: 'Crypto', symbol: 'BTC/USDT', market_type: 'spot' } }
  vm.sourceContext = { kind: 'history', id: 7, credentialId: 1, market: 'Crypto', symbol: 'BTC/USDT', marketType: 'spot' }
  vm.form = { source_kind: 'history' }
  await vm.loadSources(false)
  assert.equal(sent.source_id, 7); assert.equal(vm.form.source_id, 7)
  vm.sourceContext.credentialId = 2; vm.form.source_id = undefined
  await vm.loadSources(false)
  assert.equal('source_id' in sent, false); assert.equal(vm.form.source_id, undefined)
})


test('late account loading does not overwrite ongoing edits or reopen a closed record form', async () => {
  let finish
  const vm = recordVm({ listTradePlanAccounts: () => new Promise(resolve => { finish = resolve }) })
  vm.plan.snapshot = { instrument: { market: 'Crypto', symbol: 'BTC/USDT' } }
  vm.sourceContext = { kind: 'history', id: 7, credentialId: 1, market: 'Crypto', symbol: 'BTC/USDT' }
  const pending = vm.begin('attempt')
  vm.form.note = 'typing while loading'
  finish({ data: { items: [{ credential_id: 1 }] } }); await pending
  assert.equal(vm.form.credential_id, undefined); assert.equal(vm.hasUnsaved, true)
  const closing = vm.begin('attempt'); vm.close()
  finish({ data: { items: [{ credential_id: 1 }] } }); await closing
  assert.equal(vm.operation, ''); assert.equal(vm.form.credential_id, undefined)
})

test('a slower earlier detail read cannot replace the latest selected plan', async () => {
  const waiting = {}
  const options = component({ getTradePlan: id => new Promise(resolve => { waiting[id] = resolve }), listTradePlanVersions: async id => ({ code: 1, data: { items: [{ id: id + '-v1' }] } }) })
  const vm = vmFor(options)
  const first = options.methods.open.call(vm, 'first')
  const second = options.methods.open.call(vm, 'second')
  waiting.second({ code: 1, data: { id: 'second' } }); await second
  waiting.first({ code: 1, data: { id: 'first' } }); await first
  assert.equal(vm.selected.id, 'second')
  assert.equal(vm.versions[0].id, 'second-v1')
})
test('closing a detail ignores any detail read that is still in flight', async () => {
  let finish
  const options = component({ getTradePlan: () => new Promise(resolve => { finish = resolve }), listTradePlanVersions: async () => ({ code: 1, data: { items: [] } }) })
  const vm = vmFor(options)
  const request = options.methods.open.call(vm, 'plan')
  vm.closeDetail()
  finish({ code: 1, data: { id: 'plan' } }); await request
  assert.equal(vm.selected, null)
})
test('a historical jump cannot open stale details after its list context changes', async () => {
  let finish
  const options = component({ getTradePlan: () => new Promise(resolve => { finish = resolve }), listTradePlanVersions: async () => ({ code: 1, data: { items: [] } }) })
  const vm = vmFor(options); vm.listSequence = 1
  const request = options.methods.open.call(vm, 'old-linked-plan', vm.listSequence)
  vm.listSequence++
  finish({ code: 1, data: { id: 'old-linked-plan' } }); await request
  assert.equal(vm.selected, null)
})
test('a late failed account request does not put an error into a different operation', async () => {
  let reject
  const vm = recordVm({ listTradePlanAccounts: () => new Promise((resolve, fail) => { reject = fail }) })
  const request = vm.begin('attempt'); vm.close(); vm.error = ''
  reject(new Error('offline')); await request
  assert.equal(vm.error, '')
})


test('locked instrument ignores selection, clearing, context changes, and search requests', async () => {
  let requests = 0
  const vm = instrumentVm(async () => { requests++; return { code: 1, data: [] } })
  vm.disabled = true
  const original = JSON.stringify(vm.value)
  vm.changeContext('market_type', 'swap')
  vm.selectSymbol(undefined)
  vm.queueSearch('ETH')
  await vm.fetchSymbols('ETH', vm.searchSequence)
  assert.equal(requests, 0)
  assert.equal(vm.emitted, undefined)
  assert.equal(JSON.stringify(vm.value), original)
})
