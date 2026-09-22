import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildAggregateTradeReview,
  buildTradeReviewMarkers,
  buildTradeReviewWindow,
  calculateTradeValueUsd,
  findNearestBarIndex,
  normalizeReviewTimeframe,
  normalizeTradeReviewSymbol,
  resolveTradeReviewTimeframe
} from '../../src/utils/tradeReview.js'

test('uses actual executions and aggregates review markers by candle', () => {
  const symbol = 'Crypto:DOGE/USDT@swap'
  const markers = buildTradeReviewMarkers({
    symbol,
    candleRows: [
      { time: '2026-08-03T08:00:00Z' },
      { time: '2026-08-03T09:00:00Z' }
    ],
    executions: [
      { symbol, time: '2026-08-03T08:02:00Z', price: 0.07, quantity: 10, type: 'open_long' },
      { symbol, time: '2026-08-03T08:20:00Z', price: 0.069, quantity: 20, type: 'add_long' },
      { symbol, time: '2026-08-03T09:05:00Z', price: 0.072, quantity: 15, type: 'reduce_long' }
    ],
    trades: [
      { symbol, entry_time: '2026-08-03T08:02:00Z', exit_time: '2026-08-03T09:05:00Z', entry_price: 0.07, exit_price: 0.072 }
    ]
  })

  assert.equal(markers.length, 2)
  assert.deepEqual(markers.map(marker => [marker.kind, marker.count]), [['entry', 2], ['exit', 1]])
  assert.ok(Math.abs(markers[0].price - ((0.07 * 10 + 0.069 * 20) / 30)) < 1e-12)
})

test('collapses duplicated seeded-grid entries when legacy executions are unavailable', () => {
  const symbol = 'Crypto:DOGE/USDT@swap'
  const markers = buildTradeReviewMarkers({
    symbol,
    candleRows: [{ time: '2026-08-03T08:00:00Z' }, { time: '2026-08-03T09:00:00Z' }],
    trades: [
      { symbol, side: 'long', entry_time: '2026-08-03T08:01:00Z', exit_time: '2026-08-03T09:01:00Z', entry_price: 0.07, exit_price: 0.071 },
      { symbol, side: 'long', entry_time: '2026-08-03T08:01:00Z', exit_time: '2026-08-03T09:20:00Z', entry_price: 0.07, exit_price: 0.072 }
    ]
  })

  assert.deepEqual(markers.map(marker => [marker.kind, marker.count]), [['entry', 2], ['exit', 2]])
})

test('normalizes minute periods without turning them into month periods', () => {
  assert.equal(normalizeReviewTimeframe('1m'), '1m')
  assert.equal(normalizeReviewTimeframe('30M'), '30m')
  assert.equal(normalizeReviewTimeframe('1h'), '1H')
  assert.equal(normalizeReviewTimeframe('1d'), '1D')
})

test('calculates opening USD value from quantity and entry price', () => {
  const value = calculateTradeValueUsd({ quantity: 0.1485, entry_price: 63951.96 })
  assert.ok(Math.abs(value - 9496.86606) < 0.000001)
  assert.equal(calculateTradeValueUsd({ quantity: -2, entry_price: 100 }), 200)
  assert.equal(calculateTradeValueUsd({ value_usd: 350, quantity: 2, entry_price: 100 }), 350)
})

test('maps hedged position legs back to the market-data instrument', () => {
  assert.equal(normalizeTradeReviewSymbol('Crypto:SOL/USDT@swap::long'), 'Crypto:SOL/USDT@swap')
  assert.equal(normalizeTradeReviewSymbol('Crypto:BTC/USDT@okx:swap::short'), 'Crypto:BTC/USDT@okx:swap')
  assert.equal(normalizeTradeReviewSymbol('Crypto:SOL/USDT@swap'), 'Crypto:SOL/USDT@swap')
})

test('builds a bounded historical window around the selected trade', () => {
  const trade = {
    entry_time: '2026-07-18T00:07:00Z',
    exit_time: '2026-07-18T00:28:00Z'
  }
  const result = buildTradeReviewWindow(trade, '1m')

  assert.equal(result.entryTime, Date.parse(trade.entry_time))
  assert.equal(result.exitTime, Date.parse(trade.exit_time))
  assert.ok(result.beforeTime > result.exitTime / 1000)
  assert.ok(result.limit >= 180)
  assert.ok(result.limit <= 1000)
})

test('reuses the latest candle window for a recent trade range', () => {
  const now = Date.now()
  const result = buildTradeReviewWindow({
    entry_time: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    exit_time: new Date(now - 24 * 60 * 60 * 1000).toISOString()
  }, '15m')

  assert.equal(result.beforeTime, null)
  assert.ok(result.limit <= 1000)
})

test('treats legacy timezone-less backtest times as UTC instants', () => {
  const result = buildTradeReviewWindow({
    entry_time: '2026-07-20 12:00:00',
    exit_time: '2026-07-20 14:00:00'
  }, '1H')

  assert.equal(result.entryTime, Date.parse('2026-07-20T12:00:00Z'))
  assert.equal(result.exitTime, Date.parse('2026-07-20T14:00:00Z'))
})

test('uses the finest timeframe that can include both trade markers', () => {
  const trade = {
    entry_time: '2026-07-03T21:15:00Z',
    exit_time: '2026-07-05T22:32:00Z'
  }

  assert.equal(resolveTradeReviewTimeframe(trade, '1m'), '5m')
  const result = buildTradeReviewWindow(trade, resolveTradeReviewTimeframe(trade, '1m'))
  assert.ok(result.limit <= 1000)
  assert.ok(result.beforeTime > result.exitTime / 1000)
})

test('finds the closest loaded candle for an execution timestamp', () => {
  const rows = [{ timestamp: 1000 }, { timestamp: 2000 }, { timestamp: 3000 }]
  assert.equal(findNearestBarIndex(rows, 2200), 1)
  assert.equal(findNearestBarIndex([], 2200), -1)
})

test('aggregates a month of minute trades into a bounded overview window', () => {
  const result = buildAggregateTradeReview([
    { entry_time: '2026-07-01T00:01:00Z', exit_time: '2026-07-01T00:12:00Z' },
    { entry_time: '2026-07-29T23:40:00Z', exit_time: '2026-07-29T23:58:00Z' }
  ], '1m')

  assert.equal(result.timeframe, '4H')
  assert.equal(result.window.entryTime, Date.parse('2026-07-01T00:01:00Z'))
  assert.equal(result.window.exitTime, Date.parse('2026-07-29T23:58:00Z'))
  assert.ok(result.window.limit <= 1000)
})
