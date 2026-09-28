import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('indicator workspace keeps account mode balances and records in the trading dock', () => {
  const source = read('src/components/QuickTradePanel/QuickTradePanel.vue')
  const workspace = read('src/views/indicator-ide/index.vue')

  assert.match(source, /v-if="embeddedDock" class="qt-dock-header"/)
  assert.match(workspace, /class="ide-quick-panel-head"[\s\S]*?@click="toggleQuickTradeDrawer"/)
  assert.doesNotMatch(workspace, /v-if="!quickTradeDrawerVisible"[\s\S]{0,120}class="ide-quick-panel-head"/)
  assert.doesNotMatch(source, /@click="\$emit\('collapse'\)"/)
  assert.match(source, /class="qt-dock-segmented"/)
  assert.match(source, /quickTrade\.spotAvailable/)
  assert.match(source, /quickTrade\.swapAvailable/)
  assert.match(source, /activeDockTab === 'positions'/)
  assert.match(source, /quickTrade\.openOrders/)
  assert.match(source, /quickTrade\.tradeRecords/)
  assert.match(source, /\['openOrders', 'tradeRecords'\]\.includes\(activeDockTab\)/)
  assert.match(source, /dockTpslEnabled: false/)
  assert.match(source, /class="qt-dock-trade-settings"/)
  assert.match(source, /class="qt-dock-segmented qt-dock-margin-segmented"/)
  assert.match(source, /overlay-class-name="qt-leverage-popover"/)
  assert.match(source, /leveragePresets: \[1, 3, 5, 10, 20, 50, 100\]/)
  assert.doesNotMatch(source, /quickAmountPcts/)
  assert.doesNotMatch(source, /setAmountByPercent/)
  assert.match(source, /v-if="!embeddedDock" class="qt-section-header"/)
  assert.match(source, /cancelQuickTradeOrder\(\{ trade_id: trade\.id \}\)/)
  assert.match(source, /broker\.alpaca\.cancelOrder\(trade\.id, \{ credential_id: this\.selectedCredentialId \}\)/)
  assert.match(source, /activeDockTab === 'openOrders' && canCancelTrade\(t\)/)
  assert.match(source, /class="qt-dock-header"[\s\S]*?class="qt-dock-trade-settings"[\s\S]*?class="qt-dock-balance"/)
  assert.match(source, /marketType \(\) \{[\s\S]*?syncTradeModeFromProps/)
  assert.match(source, /getQuickTradeHistory\(\{[\s\S]*?credential_id: credentialId,[\s\S]*?symbol,[\s\S]*?market_type: marketType/)
  assert.match(source, /this\.loadPosition\(\)[\s\S]*?this\.loadHistory\(\)/)
  assert.match(source, /grid-template-columns: minmax\(340px, 32%\) minmax\(0, 1fr\)/)
  assert.match(source, /v-model="dockTpslEnabled"/)
  assert.match(source, /v-show="!embeddedDock \|\| dockTpslEnabled"/)
  assert.match(source, /'is-tpsl-open': embeddedDock && dockTpslEnabled/)
  assert.match(source, /tp_price: useProtectionPrices \? \(this\.tpPrice \|\| 0\) : 0/)
  assert.match(source, /\.qt-risk-action-stack\s*\{[\s\S]*?position: sticky;[\s\S]*?bottom: 0;/)
  assert.match(source, /\.qt-risk-action-stack\.is-tpsl-open\s*\{[\s\S]*?position: relative;/)
  assert.match(source, /\.qt-risk-action-stack\.is-tpsl-open \.qt-tpsl-card\s*\{[\s\S]*?background: #f8fafc !important;/)
  assert.match(source, /body\.dark \.qt-leverage-popover/)
  assert.match(source, /background: var\(--primary-color, #52c41a\)/)
})

test('spot trading cannot submit a sell without a current holding', () => {
  const source = read('src/components/QuickTradePanel/QuickTradePanel.vue')

  assert.match(source, /:disabled="!canSubmit \|\| \(!isSwapMode && currentPositions\.length === 0\)"/)
})

test('exchange position values are not overwritten by the chart price source', () => {
  const source = read('src/components/QuickTradePanel/QuickTradePanel.vue')
  const applyPrice = source.slice(source.indexOf('applyNewPrice (price)'), source.indexOf('handleAddAccountClick', source.indexOf('applyNewPrice (price)')))

  assert.doesNotMatch(applyPrice, /refreshPositionMarks/)
  assert.match(source, /market_value/)
})

test('volume pane is represented by a toolbar toggle', () => {
  const source = read('src/views/indicator-analysis/components/KlineChart.vue')

  assert.match(source, /id: 'vol',[\s\S]*shortName: 'VOL'/)
  assert.match(source, /if \(indicatorId === 'vol'\) return volumeVisible\.value/)
  assert.match(source, /if \(indicator\.id === 'vol'\)[\s\S]*toggleVolumePane\(\)/)
  assert.match(source, /removeIndicator\(volPaneId, 'VOL'\)/)
})
