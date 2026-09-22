import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mergeWatchlistSuggestions,
  sortCopilotMarkets,
  watchlistPresetsForMarket
} from '../../src/views/ai-analysis/components/copilotWatchlistPresets.mjs'

test('US stocks are the first market in the add-watch flow', () => {
  const sorted = sortCopilotMarkets([
    { value: 'Crypto' },
    { value: 'Forex' },
    { value: 'USStock' },
    { value: 'HKStock' }
  ])

  assert.deepEqual(sorted.map(item => item.value), ['USStock', 'Crypto', 'HKStock', 'Forex'])
})

test('crypto add-watch suggestions include common USDT pairs without an API response', () => {
  const presets = watchlistPresetsForMarket('Crypto')
  assert.deepEqual(presets.slice(0, 3).map(item => item.symbol), ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'])
  assert.ok(presets.every(item => item.market === 'Crypto'))
})

test('presets remain visible and duplicate live suggestions are removed', () => {
  const merged = mergeWatchlistSuggestions('Crypto', [
    { market: 'Crypto', symbol: 'BTC/USDT', name: 'Duplicate Bitcoin' },
    { market: 'Crypto', symbol: 'SUI/USDT', name: 'Sui' }
  ])

  assert.equal(merged.filter(item => item.symbol === 'BTC/USDT').length, 1)
  assert.equal(merged[0].name, 'Bitcoin')
  assert.ok(merged.some(item => item.symbol === 'SUI/USDT'))
})
