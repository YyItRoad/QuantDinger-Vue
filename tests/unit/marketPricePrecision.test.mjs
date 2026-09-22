import assert from 'node:assert/strict'
import test from 'node:test'

import { inferMarketPricePrecision } from '../../src/utils/marketPricePrecision.mjs'

test('US equity float serialization noise does not become display precision', () => {
  const bars = [
    { open: 219.2400054932, high: 219.300003051, low: 219.1761016846, close: 219.2050018311 }
  ]
  assert.equal(inferMarketPricePrecision(bars, 'USStock'), 2)
})

test('sub-dollar US equities retain four display decimals', () => {
  const bars = [{ open: 0.1234567, high: 0.1245678, low: 0.12, close: 0.1234 }]
  assert.equal(inferMarketPricePrecision(bars, 'USStock'), 4)
})

test('non-US markets keep adaptive precision', () => {
  const bars = [{ open: 0.123456, high: 0.12349, low: 0.1234, close: 0.12345 }]
  assert.equal(inferMarketPricePrecision(bars, 'Crypto'), 7)
})
