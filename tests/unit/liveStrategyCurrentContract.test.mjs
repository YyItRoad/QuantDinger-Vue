import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const editorPath = fileURLToPath(
  new URL('../../src/views/strategy-center/components/LiveStrategyEditor.vue', import.meta.url)
)
const source = fs.readFileSync(editorPath, 'utf8')

test('live strategy creation validates with the current compiler', () => {
  assert.match(source, /compileScriptSource/)
  assert.match(source, /compiledManifest/)
  assert.match(source, /hasCurrentContract/)
  assert.doesNotMatch(source, /strategyManifest\.apiVersion/)
  assert.doesNotMatch(source, /Number\(config\.api_version/)
})

test('live strategy direction is contract-driven with a legacy fallback', () => {
  assert.match(source, /manifestDirectionMode/)
  assert.match(source, /directionModeDetectedHint/)
  assert.match(source, /requiresDirectionFallback/)
  assert.match(source, /directionMode: this\.requiresDirectionMode \? this\.effectiveDirectionMode/)
  assert.doesNotMatch(source, /v-model="model\.positionSide"/)
  assert.match(source, /value="one_way"/)
  assert.match(source, /new Set\(\['long_only', 'short_only', 'one_way', 'both', 'neutral'\]\)/)
})

test('live eligibility follows the manifest market instead of the strategy shape', () => {
  assert.match(source, /supportsLiveExecutionMode\(this\.strategyManifest\)/)
  assert.match(source, /credentialMatchesLiveStrategy\(this\.strategyManifest, credential\.exchange_id\)/)
  assert.doesNotMatch(source, /if \(this\.isPortfolioStrategy\) return exchange === 'alpaca'/)
})

test('source changes clear an incompatible saved credential before submission', () => {
  assert.match(source, /this\.compatibleCredentials\.some\(item => String\(item\.id\) === String\(this\.model\.credentialId\)\)/)
  assert.match(source, /this\.model\.credentialId = undefined/)
})

test('live capital exposes the source quote currency', () => {
  assert.match(source, /capitalCurrency \(\)/)
  assert.match(source, /strategyV2\.capitalCurrencyHint/)
  assert.match(source, /symbol\.split\('\/'\)\.pop\(\)/)
})

test('deployment setup edits only source-declared runtime fields and saves them back to source', () => {
  assert.match(source, /strategyV2\.deploymentContractTitle/)
  assert.match(source, /manifestInstruments \(\)/)
  assert.match(source, /manifestProductLabel \(\)/)
  assert.match(source, /manifestExchangeLabel \(\)/)
  assert.match(source, /item\.exchange_id/)
  assert.match(source, /extractStrategyRuntimeContractFromCode/)
  assert.match(source, /applyStrategyRuntimeConfigToCode/)
  assert.match(source, /sanitizeRuntimeConfigForSource/)
  assert.match(source, /updateScriptSource/)
  assert.match(source, /getWatchlist/)
  assert.match(source, /searchSymbols/)
  assert.match(source, /sourceRuntimeContract\.hasExchange/)
  assert.match(source, /runtimeDirty/)
  assert.match(source, /await this\.applySourceRuntimeConfig/)
  assert.doesNotMatch(source, /v-model="model\.(symbol|marketType|exchangeId|timeframe)"/)
})

test('new deployments default to live execution and show it first', () => {
  assert.match(source, /executionMode: 'live'/)
  assert.match(source, /value="live"[\s\S]*value="signal"/)
})

test('perpetual leverage is automatic without shared-account risk controls', () => {
  assert.match(source, /this\.model\.leverageEnabled = true/)
  assert.doesNotMatch(source, /v-model="model\.leverageEnabled"/)
  assert.match(source, /leverageAutoTitle/)
  assert.doesNotMatch(source, /accountRisk/)
})

test('final deployment step uses card-sized mode, safety, account, and notification controls', () => {
  assert.match(source, /class="execution-mode-grid"/)
  assert.match(source, /class="execution-mode-card"/)
  assert.match(source, /class="live-risk-card"/)
  assert.match(source, /class="live-connection-grid"/)
  assert.match(source, /class="notification-card"/)
  assert.match(source, /notificationIcon \(channel\)/)
  assert.match(source, /openBrokerAccounts \(\)/)
  assert.match(source, /this\.\$router\.push\(\{ name: 'BrokerAccounts' \}\)/)
  assert.match(source, /\.editor-steps \.ant-steps-item-finish[\s\S]*var\(--primary-color/)
  assert.match(source, /\.execution-mode-card[\s\S]*white-space: normal/)
  assert.match(source, /\.notification-card[\s\S]*white-space: normal/)
  assert.doesNotMatch(source, /<router-link :to="\{ path: '\/broker-accounts' \}">/)
  assert.doesNotMatch(source, /class="disclaimer-check"/)
})
