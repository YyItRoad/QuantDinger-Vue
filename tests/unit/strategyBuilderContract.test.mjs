import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  applyStrategyRuntimeConfigToCode,
  extractStrategyRuntimeConfigFromCode,
  extractStrategyRuntimeContractFromCode,
  formatStrategyInstrument,
  sanitizeRuntimeConfigForSource,
  strategyCodeOwnsExecutionConfig,
  strategyCodeUsesExplicitExchange
} from '../../src/views/strategy-ide/components/scriptTemplateCatalog.js'
import {
  strategyParameterDescription,
  strategyParameterLabel,
  strategyParameterOptions
} from '../../src/utils/strategyParameterPresentation.js'
import localeOverrides from '../../src/locales/strategy-builder-overrides.js'

const strategyEditorSource = readFileSync(new URL('../../src/views/strategy-ide/components/StrategyEditor.vue', import.meta.url), 'utf8')
const strategyIdeSource = readFileSync(new URL('../../src/views/strategy-ide/index.vue', import.meta.url), 'utf8')
const backtestSource = readFileSync(new URL('../../src/views/backtest-center/index.vue', import.meta.url), 'utf8')
const liveEditorSource = readFileSync(new URL('../../src/views/strategy-center/components/LiveStrategyEditor.vue', import.meta.url), 'utf8')

test('strategy builder formats crypto and non-crypto instruments', () => {
  assert.equal(formatStrategyInstrument({ market_category: 'Crypto', symbol: 'btc/usdt', market_type: 'swap' }), 'Crypto:BTC/USDT@swap')
  assert.equal(formatStrategyInstrument({ market_category: 'USStock', symbol: 'msft', market_type: 'spot' }), 'USStock:MSFT')
})

test('strategy builder updates the single-instrument source contract', () => {
  const source = `def initialize(context):
    g.symbol = "Crypto:BTC/USDT@spot"
    context.set_universe(["Crypto:BTC/USDT@spot"])
    context.set_benchmark("Crypto:BTC/USDT@spot")
    context.subscribe(frequency="1m", fields=["close"])

def handle_data(context, data):
    bars = get_history(62, "1m", "close", g.symbol)
`
  const updated = applyStrategyRuntimeConfigToCode(source, {
    market_category: 'Crypto',
    symbol: 'ETH/USDT',
    market_type: 'swap',
    timeframe: '4H'
  })
  assert.match(updated, /g\.symbol = "Crypto:ETH\/USDT@swap"/)
  assert.match(updated, /set_universe\(\["Crypto:ETH\/USDT@swap"\]\)/)
  assert.match(updated, /set_benchmark\("Crypto:ETH\/USDT@spot"\)/)
  assert.match(updated, /subscribe\(frequency="4H"/)
  assert.match(updated, /get_history\(62, "4H", "close"/)
})

test('strategy builder repairs an undeclared history timeframe left by an earlier runtime edit', () => {
  const source = `def initialize(context):
    context.subscribe(frequency="5m", fields=["close"])

def handle_data(context, data):
    bars = get_history(slow_period + 2, "1m", "close", g.symbol)
`
  const updated = applyStrategyRuntimeConfigToCode(source, { timeframe: '5m' })
  assert.match(updated, /subscribe\(frequency="5m"/)
  assert.match(updated, /get_history\(slow_period \+ 2, "5m", "close"/)
  assert.doesNotMatch(updated, /get_history\([^\n]+"1m"/)
})

test('strategy builder preserves explicitly subscribed secondary timeframes', () => {
  const source = `def initialize(context):
    context.subscribe(frequency="1h", fields=["close"])
    context.subscribe(frequency="1d", fields=["close"])

def handle_data(context, data):
    hourly = get_history(20, "1h", "close", g.symbol)
    daily = get_history(20, "1d", "close", g.symbol)
`
  const updated = applyStrategyRuntimeConfigToCode(source, { timeframe: '4h' })
  assert.match(updated, /get_history\(20, "4h", "close"/)
  assert.match(updated, /get_history\(20, "1d", "close"/)
})

test('strategy builder restores runtime controls from legacy source code', () => {
  const config = extractStrategyRuntimeConfigFromCode(`def initialize(context):
    g.symbol = 'Crypto:SOL/USDT@swap'
    context.subscribe(frequency='15m', fields=['close'])
`)
  assert.deepEqual(config, {
    market_category: 'Crypto',
    symbol: 'SOL/USDT',
    market_type: 'swap',
    timeframe: '15m'
  })
})

test('exchange control is shown only when the strategy explicitly owns exchange selection', () => {
  assert.equal(strategyCodeUsesExplicitExchange('g.symbol = "Crypto:BTC/USDT@spot"'), false)
  assert.equal(strategyCodeUsesExplicitExchange('g.exchange_id = "okx"'), true)
  assert.equal(strategyCodeUsesExplicitExchange('context.set_exchange("binance")'), true)
})

test('strategy setup capabilities come only from explicit source declarations', () => {
  assert.deepEqual(extractStrategyRuntimeContractFromCode('def initialize(context):\n    pass').hasControls, false)

  const instrumentOnly = extractStrategyRuntimeContractFromCode(`def initialize(context):
    g.symbol = "USStock:MSFT"
`)
  assert.equal(instrumentOnly.hasInstrument, true)
  assert.equal(instrumentOnly.hasProduct, false)
  assert.equal(instrumentOnly.hasTimeframe, false)

  const full = extractStrategyRuntimeContractFromCode(`def initialize(context):
    g.symbol = "Crypto:BTC/USDT@swap"
    g.exchange_id = "okx"
    g.trade_direction = "short"
    context.subscribe(frequency="15m", fields=["close"])
`)
  assert.equal(full.hasInstrument, true)
  assert.equal(full.hasProduct, true)
  assert.equal(full.hasTimeframe, true)
  assert.equal(full.hasExchange, true)
  assert.equal(full.hasDirection, true)
  assert.deepEqual(full.config, {
    market_category: 'Crypto',
    symbol: 'BTC/USDT',
    market_type: 'swap',
    timeframe: '15m',
    exchange_id: 'okx',
    trade_direction: 'short'
  })
})

test('strategy setup updates only runtime declarations that exist in source', () => {
  const source = `def initialize(context):
    g.exchange_id = "okx"
    context.subscribe(frequency="1m", fields=["close"])
`
  const updated = applyStrategyRuntimeConfigToCode(source, {
    market_category: 'Crypto',
    symbol: 'ETH/USDT',
    market_type: 'swap',
    timeframe: '4H',
    exchange_id: 'binance',
    trade_direction: 'short'
  })
  assert.doesNotMatch(updated, /g\.symbol/)
  assert.doesNotMatch(updated, /trade_direction/)
  assert.match(updated, /g\.exchange_id = "binance"/)
  assert.match(updated, /subscribe\(frequency="4H"/)
})

test('robot templates expose their instrument and timeframe constants as editable setup', () => {
  const source = `INSTRUMENT = 'Crypto:BTC/USDT@swap'
TIMEFRAME = '1m'

def initialize(context):
    context.set_universe([INSTRUMENT])
    context.subscribe(frequency=TIMEFRAME)
`
  const contract = extractStrategyRuntimeContractFromCode(source)
  assert.equal(contract.hasInstrument, true)
  assert.equal(contract.hasProduct, true)
  assert.equal(contract.hasTimeframe, true)
  assert.deepEqual(contract.config, {
    market_category: 'Crypto',
    symbol: 'BTC/USDT',
    market_type: 'swap',
    timeframe: '1m'
  })

  const updated = applyStrategyRuntimeConfigToCode(source, {
    market_category: 'Crypto',
    symbol: 'ETH/USDT',
    market_type: 'spot',
    timeframe: '4H'
  })
  assert.match(updated, /INSTRUMENT = "Crypto:ETH\/USDT@spot"/)
  assert.match(updated, /TIMEFRAME = "4H"/)
  assert.match(updated, /set_universe\(\[INSTRUMENT\]\)/)
  assert.match(updated, /subscribe\(frequency=TIMEFRAME\)/)
})

test('v7 grid source removes stale executor metadata while preserving deployment defaults', () => {
  const code = `INSTRUMENT = 'Crypto:ETH/USDT@spot'
GRID_TEMPLATE_VERSION = 7
CELL_LOWER = [0.9]
CELL_UPPER = [1.1]
`
  const previous = {
    initial_capital: 1000,
    exchange_id: 'binance',
    notification_channels: ['browser'],
    strategy_family: 'robot',
    executor_type: 'grid',
    executor_config: { grid_count: 100 },
    executor_preview: { grid_count: 100 },
    bot_type: 'grid',
    bot_params: { gridCount: 100, lowerPrice: 2000, upperPrice: 3000 }
  }

  assert.equal(strategyCodeOwnsExecutionConfig(code), true)
  assert.deepEqual(sanitizeRuntimeConfigForSource(previous, code), {
    initial_capital: 1000,
    exchange_id: 'binance',
    notification_channels: ['browser']
  })
  assert.deepEqual(sanitizeRuntimeConfigForSource(previous, 'GRID_TEMPLATE_VERSION = 6'), previous)
})

test('strategy setup spans primary controls and refreshes the watchlist when opened', () => {
  assert.match(strategyEditorSource, /grid-column-start:\s*1/)
  assert.match(strategyEditorSource, /grid-column-end:\s*-1/)
  assert.match(strategyEditorSource, /@dropdownVisibleChange="handleRuntimeSymbolDropdown"/)
  assert.match(strategyIdeSource, /@runtime-symbol-open="loadStrategyWatchlistOptions"/)
  assert.match(strategyIdeSource, /const res = await getWatchlist\(\)/)
})

test('parameter presentation accepts schema options and localized fallback copy', () => {
  const dictionary = {
    'strategyBuilder.params.target_pct.label': '目标仓位',
    'strategyBuilder.params.target_pct.description': '目标说明'
  }
  const translate = key => dictionary[key] || key
  assert.equal(strategyParameterLabel({ name: 'target_pct' }, translate), '目标仓位')
  assert.equal(strategyParameterDescription({ name: 'target_pct' }, translate, 'zh-CN'), '目标说明')
  assert.deepEqual(strategyParameterOptions({ values: ['fast', 'slow'] }), [
    { value: 'fast', label: 'fast' },
    { value: 'slow', label: 'slow' }
  ])
})

test('numeric strategy parameters remain directly editable when a range also provides options', () => {
  const numericBranch = /v-else-if="\['integer', 'number', 'percent'\]\.includes\((?:item|param)\.type\)"/
  const optionBranch = /v-else-if="parameterOptions\((?:item|param)\)\.length"/

  for (const source of [backtestSource, liveEditorSource]) {
    const numericIndex = source.search(numericBranch)
    const optionIndex = source.search(optionBranch)
    assert.ok(numericIndex >= 0)
    assert.ok(optionIndex >= 0)
    assert.ok(numericIndex < optionIndex)
  }
})

test('all supported locales include the strategy builder contract', () => {
  const locales = ['en-US', 'zh-CN', 'zh-TW', 'de-DE', 'fr-FR', 'ja-JP', 'ko-KR', 'ru-RU', 'th-TH', 'vi-VN', 'ar-SA']
  locales.forEach(locale => {
    const messages = localeOverrides[locale] && localeOverrides[locale].strategyBuilder
    assert.ok(messages)
    assert.ok(messages.setupTitle)
    assert.ok(messages.sourceContractHint)
    assert.ok(messages.params.target_pct.label)
    assert.ok(messages.params.allow_short.description)
  })
})
