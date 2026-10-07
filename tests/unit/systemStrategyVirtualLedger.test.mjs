import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const viewSource = readFileSync(
  new URL('../../src/views/user-manage/index.vue', import.meta.url),
  'utf8'
)

test('system strategy overview renders signal virtual ledger metrics', () => {
  assert.match(viewSource, /record\.ledger_mode === 'virtual'/)
  assert.match(viewSource, /systemOverview\.virtualAccount/)
  assert.match(viewSource, /systemOverview\.virtualLedger/)
  assert.doesNotMatch(viewSource, /record\.execution_mode === 'live'[^\n]*formatNumber\(text\)/)
  assert.doesNotMatch(viewSource, /systemOverview\.signalOnlyNoPnl/)
})

