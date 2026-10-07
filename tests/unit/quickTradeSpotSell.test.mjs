import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function options (file, mocks = {}) {
  let script = fs.readFileSync(new URL('../../src/' + file, import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]
  const scope = { ...mocks, console, setTimeout, clearTimeout }
  script = script.replace(/^import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"]\s*$/gm, (_, names) => {
    for (const item of names.replace(/[{}]/g, '').split(',')) {
      const name = item.trim().split(/\s+as\s+/).pop()
      if (!(name in scope)) scope[name] = () => ({})
    }
    return ''
  })
  vm.runInNewContext(script.replace('export default', 'result ='), scope)
  return scope.result
}

test('PC spot sell submits the exact base asset quantity', async () => {
  const calls = []
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', {
    placeQuickOrder: async payload => {
      calls.push(payload)
      return { code: 1, data: { id: 91 } }
    }
  })
  const state = {
    canSubmitBuy: true,
    canSubmitSell: true,
    isStockMarket: false,
    isCryptoMarket: true,
    isSwapMode: false,
    spotSellAvailable: 0.02,
    spotSellAvailableValue: 1600,
    spotSellInputMode: 'quantity',
    sellQuantity: 0.01234567,
    sellAmount: null,
    amount: 250,
    side: 'buy',
    submitting: false,
    submittingSide: '',
    embeddedDock: false,
    dockTpslEnabled: false,
    selectedCredentialId: 7,
    currentSymbol: 'BTC/USDT',
    orderType: 'market',
    limitPrice: 0,
    leverage: 1,
    effectiveMarketType: 'spot',
    marginMode: 'cross',
    tpPrice: null,
    slPrice: null,
    source: 'indicator',
    aiDecisionFilter: false,
    $emit: () => {},
    $t: key => key,
    $notification: { error: () => {}, warning: () => {} },
    loadBalance: async () => {},
    loadHistory: async () => {},
    loadPositionWithRetry: async () => {}
  }

  await component.methods.handleSubmit.call(state, 'sell')

  assert.equal(calls.length, 1)
  assert.equal(calls[0].amount, 0)
  assert.equal(calls[0].quantity, 0.01234567)
  assert.equal(calls[0].market_type, 'spot')
  assert.equal(calls[0].side, 'sell')
})

test('PC spot sell can submit a USDT value without a quantity field', async () => {
  const calls = []
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', {
    placeQuickOrder: async payload => {
      calls.push(payload)
      return { code: 1, data: { id: 92 } }
    }
  })
  const state = {
    canSubmitBuy: true,
    canSubmitSell: true,
    isStockMarket: false,
    isCryptoMarket: true,
    isSwapMode: false,
    spotSellAvailable: 1,
    spotSellAvailableValue: 83000,
    spotSellInputMode: 'amount',
    sellQuantity: null,
    sellAmount: 100,
    amount: 250,
    side: 'buy',
    submitting: false,
    submittingSide: '',
    embeddedDock: false,
    dockTpslEnabled: false,
    selectedCredentialId: 7,
    currentSymbol: 'BTC/USDT',
    orderType: 'market',
    limitPrice: 0,
    leverage: 1,
    effectiveMarketType: 'spot',
    marginMode: 'cross',
    tpPrice: null,
    slPrice: null,
    source: 'indicator',
    aiDecisionFilter: false,
    $emit: () => {},
    $t: key => key,
    $notification: { error: () => {}, warning: () => {} },
    loadBalance: async () => {},
    loadHistory: async () => {},
    loadPositionWithRetry: async () => {}
  }

  await component.methods.handleSubmit.call(state, 'sell')

  assert.equal(calls.length, 1)
  assert.equal(calls[0].amount, 100)
  assert.equal('quantity' in calls[0], false)
  assert.equal(calls[0].market_type, 'spot')
})

test('PC spot buy can submit an exact base asset quantity', async () => {
  const calls = []
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', {
    placeQuickOrder: async payload => {
      calls.push(payload)
      return { code: 1, data: { id: 93 } }
    }
  })
  const state = {
    canSubmitBuy: true,
    canSubmitSell: true,
    isStockMarket: false,
    isCryptoMarket: true,
    isSwapMode: false,
    spotBuyInputMode: 'quantity',
    spotSellInputMode: 'quantity',
    buyQuantity: 0.00123456,
    amount: 250,
    side: 'buy',
    submitting: false,
    submittingSide: '',
    embeddedDock: false,
    dockTpslEnabled: false,
    selectedCredentialId: 7,
    currentSymbol: 'BTC/USDT',
    orderType: 'market',
    limitPrice: 0,
    leverage: 1,
    effectiveMarketType: 'spot',
    marginMode: 'cross',
    tpPrice: null,
    slPrice: null,
    source: 'indicator',
    aiDecisionFilter: false,
    $emit: () => {},
    $t: key => key,
    $notification: { error: () => {}, warning: () => {} },
    loadBalance: async () => {},
    loadHistory: async () => {},
    loadPositionWithRetry: async () => {}
  }

  await component.methods.handleSubmit.call(state, 'buy')

  assert.equal(calls.length, 1)
  assert.equal(calls[0].amount, 0)
  assert.equal(calls[0].quantity, 0.00123456)
  assert.equal(calls[0].side, 'buy')
})

test('PC spot sell percentages use the base asset holding', () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue')
  const state = {
    isCryptoMarket: true,
    isSwapMode: false,
    spotSellAvailable: 0.015,
    spotSellAvailableValue: 1245,
    spotSellInputMode: 'quantity',
    activeBalanceAvailable: 500,
    sellQuantity: null,
    sellAmount: null,
    amount: 100
  }

  component.methods.setQuickAmountByPercent.call(state, 50, 'sell')
  assert.equal(state.sellQuantity, 0.0075)

  state.spotSellInputMode = 'amount'
  component.methods.setQuickAmountByPercent.call(state, 50, 'sell')
  assert.equal(state.sellAmount, 622.5)

  component.methods.setQuickAmountByPercent.call(state, 25, 'buy')
  assert.equal(state.amount, 125)
})

test('PC spot sell validates both quantity and USDT value against the holding', () => {
  const component = options('components/QuickTradePanel/QuickTradePanel.vue')
  const compute = ({ mode, sellQuantity, sellAmount }) => component.computed.canSubmitSell.call({
    submitContextReady: true,
    isCryptoMarket: true,
    isSwapMode: false,
    spotSellInputMode: mode,
    sellQuantity,
    sellAmount,
    spotSellAvailable: 0.01,
    spotSellAvailableValue: 830,
    spotSellReferencePrice: 83000,
    currentPositions: []
  })

  assert.equal(compute({ mode: 'quantity', sellQuantity: 0.01 }), true)
  assert.equal(compute({ mode: 'quantity', sellQuantity: 0.01000001 }), false)
  assert.equal(compute({ mode: 'amount', sellAmount: 100 }), true)
  assert.equal(compute({ mode: 'amount', sellAmount: 831 }), false)
})
