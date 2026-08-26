import test from 'node:test'
import assert from 'node:assert/strict'

import {
  formatDecimalDisplay,
  normalizeAccountSnapshotPositions,
  requireCompleteAccountSnapshot,
  selectableSnapshotCredentials
} from '../../src/utils/positionManager.js'

test('仓位同步凭证不按交易所进行前端过滤', () => {
  const credentials = selectableSnapshotCredentials([
    { id: 1, exchange_id: 'binance' },
    { id: 2, exchange_id: 'okx' },
    { id: 3, exchange_id: 'custom-exchange' },
    null
  ])

  assert.deepEqual(credentials.map(item => item.id), [1, 2, 3])
})

test('账户快照同时映射合约和现货仓位并标明市场类型', () => {
  const rows = normalizeAccountSnapshotPositions({
    swap_positions: [
      {
        symbol: 'KAITO/USDC:USDC',
        side: 'long',
        size: '422.5',
        entry_price: '0.355',
        mark_price: '0.3397',
        leverage: '5'
      },
      {
        symbol: 'BTC/USDT:USDT',
        side: 'short',
        size: '0'
      }
    ],
    spot_positions: [{
      symbol: 'ETH/USDT',
      side: 'long',
      size: '1.25',
      entry_price: '2055.12',
      market_type: 'spot',
      inst_id: 'ETH-USDT'
    }]
  })

  assert.deepEqual(rows, [
    {
      key: 'swap:KAITO/USDC:USDC:long',
      symbol: 'KAITO/USDC:USDC',
      marketType: 'swap',
      side: 'long',
      size: '422.5',
      sizeDisplay: '422.5',
      entryPrice: '0.355',
      entryPriceDisplay: '0.355',
      markPrice: '0.3397',
      markPriceDisplay: '0.3397',
      leverage: '5',
      leverageDisplay: '5x'
    },
    {
      key: 'spot:ETH-USDT:long',
      symbol: 'ETH/USDT',
      marketType: 'spot',
      side: 'long',
      size: '1.25',
      sizeDisplay: '1.25',
      entryPrice: '2055.12',
      entryPriceDisplay: '2,055.12',
      markPrice: '',
      markPriceDisplay: '--',
      leverage: '',
      leverageDisplay: '--'
    }
  ])
})

test('异常或缺失字段使用安全展示值，不进行浮点精度转换', () => {
  const rows = normalizeAccountSnapshotPositions({
    swap_positions: [{
      symbol: 'BTC/USDT:USDT',
      position_side: 'SHORT',
      contracts: '12345678901234567890.123456789012345678',
      entry_price: null,
      mark_price: 'invalid',
      leverage: null
    }]
  })

  assert.equal(rows[0].side, 'short')
  assert.equal(rows[0].size, '12345678901234567890.123456789012345678')
  assert.equal(rows[0].sizeDisplay, '12,345,678,901,234,567,890.123456789012345678')
  assert.equal(rows[0].entryPriceDisplay, '--')
  assert.equal(rows[0].markPriceDisplay, '--')
  assert.equal(rows[0].leverageDisplay, '--')
  assert.equal(formatDecimalDisplay('invalid'), '--')
})

test('科学计数法形式的非零数量不会被误删', () => {
  const rows = normalizeAccountSnapshotPositions({
    swap_positions: [{
      symbol: 'BTC/USDT:USDT',
      side: 'long',
      size: 1e-8,
      entry_price: 100000,
      mark_price: 100001,
      leverage: 2
    }]
  })

  assert.equal(rows.length, 1)
  assert.equal(rows[0].size, '1e-8')
  assert.equal(rows[0].sizeDisplay, '1e-8')
})

test('部分账户快照不能作为完整仓位同步结果', () => {
  assert.throws(() => requireCompleteAccountSnapshot({
    swap_positions: [],
    spot_positions: [{ symbol: 'USDC/USDT', size: 1 }],
    warnings: ['币安合约仓位读取失败'],
    partial: true,
    error: ''
  }), /币安合约仓位读取失败/)
})
