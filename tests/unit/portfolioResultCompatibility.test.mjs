import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const componentPath = fileURLToPath(
  new URL('../../src/views/backtest-center/PortfolioResult.vue', import.meta.url)
)
const source = fs.readFileSync(componentPath, 'utf8')

test('legacy history uses the equity curve when holding snapshots are empty', () => {
  assert.match(source, /snapshots\.length \? snapshots : \(this\.result\.equityCurve \|\| \[\]\)/)
})

test('missing legacy attribution is recovered from saved executions', () => {
  assert.match(source, /executions\.reduce\(\(sum, item\) => sum \+ Number\(item\.commission \|\| 0\), 0\)/)
  assert.match(source, /this\.initialCapital > 0 \? totalCommission \/ this\.initialCapital : 0/)
  assert.match(source, /counts\[status\] \+= 1/)
})

test('restored legacy details are disclosed in the result trust bar', () => {
  assert.match(source, /v-if="legacyBackfilled"/)
  assert.match(source, /strategyV2\.backtest\.legacyBackfillHint/)
})

test('completed-trade table exposes a prominent horizontal scrollbar', () => {
  assert.match(source, /class="completed-trades-table"/)
  assert.match(source, /\.completed-trades-table \/deep\/ \.ant-table-body::\-webkit-scrollbar \{ width: 14px; height: 14px; \}/)
  assert.match(source, /scrollbar-color: var\(--primary-color/)
})

test('portfolio chart separates directional exposure and hides ledger cash by default', () => {
  assert.match(source, /const longExposure = curve\.map/)
  assert.match(source, /const shortExposure = curve\.map/)
  assert.match(source, /step: 'end'/)
  assert.match(source, /selected: \{ \[cashName\]: false \}/)
  assert.match(source, /formatPercentagePointValue\(this\.result\.excessReturn\)/)
})
