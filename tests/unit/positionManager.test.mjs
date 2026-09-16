import test from 'node:test'
import assert from 'node:assert/strict'

import {
  accountPositionSnapshotCacheKey,
  buildManagedStrategyInitialConfig,
  buildManagedStrategyRequest,
  cacheableAccountPositionSnapshot,
  formatDecimalDisplay,
  mergeManagedPositionRows,
  normalizeAccountSnapshotPositions,
  requireCompleteAccountSnapshot,
  selectableSnapshotCredentials,
  formatTradeHistoryNumber,
  formatTradeHistoryTime
} from '../../src/utils/positionManager.js'
import positionManagerMessages from '../../src/locales/lang/position-manager.js'

test('持仓页面使用简短菜单名称，其他语言至少回退到英文', () => {
  assert.equal(positionManagerMessages['zh-CN']['positionManager.title'], '持仓')
  assert.equal(positionManagerMessages['en-US']['positionManager.title'], 'Positions')
  assert.equal(positionManagerMessages['de-DE']['positionManager.syncPositions'], 'Sync Positions')
})

test('交易所仓位缓存按用户和凭证隔离且不包含管理归属', () => {
  assert.equal(accountPositionSnapshotCacheKey(3, 7), 'position-manager:account-snapshot:3:7')
  assert.equal(accountPositionSnapshotCacheKey(4, 7), 'position-manager:account-snapshot:4:7')
  assert.equal(accountPositionSnapshotCacheKey(3, 0), '')

  assert.deepEqual(cacheableAccountPositionSnapshot({
    swap_positions: [{ symbol: 'BTC/USDT', side: 'long', size: '1' }],
    spot_positions: [],
    managed_positions: [{ strategy_id: 12 }],
    open_orders: [{ id: 'order-1' }],
    warnings: ['现货读取失败'],
    partial: true,
    fetched_at: 123
  }), {
    swap_positions: [{ symbol: 'BTC/USDT', side: 'long', size: '1' }],
    spot_positions: [],
    partial: true,
    error: '',
    warnings: ['现货读取失败'],
    fetched_at: 123
  })
})

test('持仓管理复用现有创建实盘表单并锁定当前凭证与杠杆', () => {
  const position = normalizeAccountSnapshotPositions({
    swap_positions: [{
      symbol: 'KAITO/USDC:USDC',
      side: 'long',
      size: '422.5',
      entry_price: '0.355',
      mark_price: '0.3397',
      leverage: '5',
      inst_id: 'KAITOUSDC'
    }]
  })[0]

  assert.deepEqual(buildManagedStrategyInitialConfig(position, 7), {
    name: '[持仓] KAITO/USDC',
    position_summary: 'KAITO/USDC · 多头 · 数量 422.5 · 开仓价 0.355 · 最新价 0.3397 · 杠杆 5x',
    execution_mode: 'live',
    credential_id: 7,
    leverage_enabled: true,
    leverage: 5,
    allow_timeframe_override: true,
    timeframe_options: ['15m', '1h', '4h', '1d'],
    lock_execution_mode: true,
    lock_credential: true,
    lock_leverage: true
  })
})

test('持仓管理创建请求只补充当前仓位引用并保留标准策略表单参数', () => {
  const position = {
    symbol: 'KAITO/USDC:USDC',
    side: 'long',
    marketType: 'swap',
    instId: 'KAITOUSDC',
    key: 'swap:KAITOUSDC:long'
  }
  const payload = {
    sourceId: 9,
    name: '[持仓] KAITO/USDC',
    initialCapital: 1000,
    params: { atr_period: 14 }
  }

  assert.deepEqual(buildManagedStrategyRequest(position, 7, payload), {
    position: {
      credential_id: 7,
      symbol: 'KAITO/USDC:USDC',
      side: 'long',
      market_type: 'swap',
      inst_id: 'KAITOUSDC'
    },
    strategy: payload
  })
})

test('交易所仓位只与现有策略仓位记录做只读匹配', () => {
  const positions = normalizeAccountSnapshotPositions({
    swap_positions: [
      { symbol: 'KAITO/USDC:USDC', side: 'long', size: '422.5' },
      { symbol: 'BTC/USDT', side: 'short', size: '0.1' }
    ]
  })
  const rows = mergeManagedPositionRows(positions, [{
    strategy_id: 12,
    strategy_name: 'ATR 趋势管理',
    strategy_status: 'running',
    execution_mode: 'live',
    symbol: 'KAITO/USDC',
    side: 'long',
    size: '422.5',
    market_type: 'swap'
  }])

  assert.equal(rows[0].managementState, 'managed')
  assert.deepEqual(rows[0].managingStrategies, [{
    id: 12,
    name: 'ATR 趋势管理',
    status: 'running',
    executionMode: 'live',
    size: '422.5'
  }])
  assert.equal(rows[1].managementState, 'unmanaged')
  assert.deepEqual(rows[1].managingStrategies, [])
})

test('同一仓位存在多个策略记录时显示冲突而不是未管理', () => {
  const positions = normalizeAccountSnapshotPositions({
    spot_positions: [{ symbol: 'ETH/USDT', side: 'long', size: '2' }]
  })
  const managedRows = [11, 12].map(id => ({
    strategy_id: id,
    strategy_name: `策略 ${id}`,
    symbol: 'ETH/USDT',
    side: 'long',
    size: '1',
    market_type: 'spot'
  }))

  const rows = mergeManagedPositionRows(positions, managedRows)

  assert.equal(rows[0].managementState, 'conflict')
  assert.deepEqual(rows[0].managingStrategies.map(item => item.id), [11, 12])
})

test('仓位同步凭证不按交易所进行前端过滤', () => {
  const credentials = selectableSnapshotCredentials([
    { id: 1, exchange_id: 'binance' },
    { id: 2, exchange_id: 'okx' },
    { id: 3, exchange_id: 'custom-exchange' },
    null
  ])

  assert.deepEqual(credentials.map(item => item.id), [1, 2, 3])
})

test('交易历史格式化函数处理数值、空值和 UTC 时间', () => {
  assert.equal(formatTradeHistoryNumber('31.444336', 2), '31.44')
  assert.equal(formatTradeHistoryNumber(null), '--')
  assert.equal(formatTradeHistoryNumber('invalid'), '--')
  assert.notEqual(formatTradeHistoryTime('2026-09-05T20:00:26Z'), '--')
  assert.equal(formatTradeHistoryTime('invalid'), '--')
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
      instId: '',
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
      instId: 'ETH-USDT',
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

test('部分账户快照仍展示成功返回的市场仓位', () => {
  const rows = requireCompleteAccountSnapshot({
    swap_positions: [],
    spot_positions: [{ symbol: 'USDC/USDT', side: 'long', size: 1 }],
    warnings: ['币安合约仓位读取失败'],
    partial: true,
    error: ''
  })

  assert.equal(rows.length, 1)
  assert.equal(rows[0].marketType, 'spot')
})

test('部分快照且没有可用仓位数据时仍然报错', () => {
  assert.throws(() => requireCompleteAccountSnapshot({
    swap_positions: [],
    spot_positions: [],
    warnings: ['币安合约仓位读取失败'],
    partial: true,
    error: ''
  }), /币安合约仓位读取失败/)
})
