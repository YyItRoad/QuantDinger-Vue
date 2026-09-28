import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const panel = fs.readFileSync('src/components/QuickTradePanel/EventRadarPanel.vue', 'utf8')
const dock = fs.readFileSync('src/components/QuickTradePanel/QuickTradePanel.vue', 'utf8')
const api = fs.readFileSync('src/api/quick-trade.js', 'utf8')
const locale = fs.readFileSync('src/locales/lang/event-radar.js', 'utf8')

test('event radar is a separate reference-only quick trade tab', () => {
  assert.match(dock, /key: 'eventRadar'/)
  assert.match(dock, /<event-radar-panel/)
  assert.match(panel, /eventRadar\.referenceOnly/)
  assert.doesNotMatch(panel, /placeQuickOrder/)
})

test('event radar only charges on an explicit analysis request', () => {
  assert.match(api, /\/api\/quick-trade\/event-radar\/analyze/)
  assert.match(panel, /@click="analyze"/)
  assert.doesNotMatch(panel, /setInterval/)
  assert.doesNotMatch(panel, /analyze\(\).*mounted/s)
})

test('event radar has a local toggle and localized system settings', () => {
  assert.match(panel, /quick-trade-event-radar-enabled/)
  assert.match(panel, /<a-switch/)
  assert.match(panel, /eventRadar\.sourceUpgradeHint/)
  assert.match(locale, /settings\.field\.EVENT_RADAR_ENABLED/)
  assert.match(locale, /settings\.field\.EVENT_RADAR_CRYPTO_RSS_ENABLED/)
  assert.match(locale, /settings\.field\.EVENT_RADAR_YAHOO_FINANCE_RSS_ENABLED/)
  assert.match(locale, /settings\.field\.EVENT_RADAR_SEC_EDGAR_ENABLED/)
  assert.match(locale, /settings\.field\.SEC_EDGAR_USER_AGENT/)
  assert.match(locale, /settings\.field\.BILLING_COST_EVENT_RADAR/)
})

test('quick trade tabs expose an obvious horizontal scrollbar and keep the selected tab visible', () => {
  assert.match(dock, /scrollbar-color:\s*var\(--primary-color/)
  assert.match(dock, /&::-webkit-scrollbar\s*\{\s*height:\s*7px/)
  assert.match(dock, /selectDockTab \(key, event\)/)
  assert.match(dock, /scrollIntoView/)
})

test('event radar distinguishes news, macro events, and SEC filings', () => {
  assert.match(panel, /eventRadar\.filing/)
  assert.match(locale, /'eventRadar\.filing'/)
})

test('event radar localizes macro source content for the active interface language', () => {
  assert.match(panel, /contentLocale/)
  assert.match(panel, /displayEventTitle\(event\)/)
  assert.match(panel, /event\.title_en/)
  assert.match(panel, /eventRadar\.macroType/)
  assert.match(panel, /displayEventSummary\(event\)/)
  assert.match(locale, /eventRadar\.macroType\.jobs/)
  assert.match(locale, /eventRadar\.metric\.actual/)
})
