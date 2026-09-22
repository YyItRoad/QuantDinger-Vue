import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const componentPath = fileURLToPath(
  new URL('../../src/views/indicator-community/components/IndicatorDetail.vue', import.meta.url)
)
const source = fs.readFileSync(componentPath, 'utf8')

test('strategy detail presents the source contract before backtest evidence', () => {
  const contractIndex = source.indexOf('strategy-contract-section')
  const evidenceIndex = source.indexOf('strategy-performance-section')
  assert.ok(contractIndex > -1)
  assert.ok(evidenceIndex > contractIndex)
})

test('strategy detail no longer presents historical coverage as applicability', () => {
  assert.doesNotMatch(source, /performance\.applicable_symbols/)
  assert.doesNotMatch(source, /performance\.applicable_timeframes/)
  assert.match(source, /performance\.marketplace_contract/)
})

test('strategy parameters expose defaults and ranges with progressive disclosure', () => {
  assert.match(source, /visibleStrategyParameters/)
  assert.match(source, /formatContractValue\(param\.default, param\.type\)/)
  assert.match(source, /formatParameterRange\(param\)/)
  assert.match(source, /showAllParameters = !showAllParameters/)
})

test('strategy contract uses an explicit empty dependency state and balanced layout', () => {
  assert.match(source, /community\.noExternalSignalDependencies/)
  assert.match(source, /community\.noDeclaredMarketData/)
  assert.match(source, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/)
  assert.match(source, /section-heading-actions/)
})

test('backtest sample and live evidence are contextual signals, not score tiles', () => {
  assert.match(source, /community\.backtestSamplesCount/)
  assert.match(source, /community\.noLiveEvidence/)
  assert.doesNotMatch(source, /perf-label[^\n]*community\.liveTrades/)
})
