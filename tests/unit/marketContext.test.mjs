import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CRYPTO_EXCHANGE_IDS,
  marketContextKey,
  normalizeMarketContext,
  normalizeMarketType
} from '../../src/utils/marketContext.js'

test('exposes the six supported public kline venues', () => {
  assert.deepEqual(
    CRYPTO_EXCHANGE_IDS,
    ['binance', 'bitget', 'bybit', 'okx', 'gate', 'htx']
  )
})

test('normalizes perpetual aliases to swap', () => {
  assert.equal(normalizeMarketType('perpetual'), 'swap')
  assert.equal(normalizeMarketType('futures'), 'swap')
})

test('watchlist identity separates venues, market types, and native instruments', () => {
  const spot = normalizeMarketContext({
    market: 'Crypto',
    symbol: 'btc/usdt',
    exchange_id: 'binance',
    market_type: 'spot'
  })
  const swap = normalizeMarketContext({
    market: 'Crypto',
    symbol: 'btc/usdt',
    exchange_id: 'binance',
    market_type: 'swap'
  })
  const okxSwap = normalizeMarketContext({
    market: 'Crypto',
    symbol: 'btc/usdt',
    exchange_id: 'okx',
    market_type: 'swap'
  })

  assert.equal(spot.symbol, 'BTC/USDT')
  assert.equal(marketContextKey(spot), 'Crypto:BTC/USDT|binance|spot|')
  assert.notEqual(marketContextKey(spot), marketContextKey(swap))
  assert.notEqual(marketContextKey(swap), marketContextKey(okxSwap))
  assert.equal(okxSwap.exchange_id, 'okx')
  assert.equal(okxSwap.market_type, 'swap')
  assert.equal(marketContextKey({ market: 'Crypto', symbol: 'binance:spot::BTC/USDT' }), 'Crypto:BTC/USDT')
  assert.equal(marketContextKey({ market: 'Crypto', symbol: 'BTC/USDT:USDT' }), 'Crypto:BTC/USDT')
  assert.notEqual(
    marketContextKey({ ...spot, instrument_id: 'BTCUSDT' }),
    marketContextKey({ ...spot, instrument_id: 'BTC-USDT' })
  )
})

test('non-crypto identities do not retain an exchange venue', () => {
  const stock = normalizeMarketContext({
    market: 'USStock',
    symbol: 'msft',
    exchange_id: 'binance',
    market_type: 'swap'
  })

  assert.equal(stock.exchange_id, '')
  assert.equal(stock.market_type, 'spot')
})
