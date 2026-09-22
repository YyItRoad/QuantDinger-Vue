import { timestampMillisecondsUtc } from './utcInstant.js'

const TIMEFRAME_ALIASES = {
  '1m': '1m',
  '3m': '3m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1H',
  '4h': '4H',
  '1d': '1D',
  '1w': '1W'
}

const TIMEFRAME_MILLISECONDS = {
  '1m': 60 * 1000,
  '3m': 3 * 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1H': 60 * 60 * 1000,
  '4H': 4 * 60 * 60 * 1000,
  '1D': 24 * 60 * 60 * 1000,
  '1W': 7 * 24 * 60 * 60 * 1000
}

const REVIEW_TIMEFRAMES = ['1m', '3m', '5m', '15m', '30m', '1H', '4H', '1D', '1W']

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value))

export const normalizeReviewTimeframe = (value) => {
  const normalized = String(value || '1d').trim().toLowerCase()
  return TIMEFRAME_ALIASES[normalized] || normalized
}

export const calculateTradeValueUsd = (trade = {}) => {
  const explicitValue = Number(trade.value_usd ?? trade.entry_notional ?? trade.notional)
  if (Number.isFinite(explicitValue)) return Math.abs(explicitValue)

  const quantity = Number(trade.quantity)
  const entryPrice = Number(trade.entry_price)
  if (!Number.isFinite(quantity) || !Number.isFinite(entryPrice)) return null
  return Math.abs(quantity * entryPrice)
}

export const normalizeTradeReviewSymbol = (value) => {
  return String(value || '').trim().replace(/::(?:long|short)$/i, '')
}

const executionMarkerLegs = (execution = {}) => {
  const type = String(execution.type || '').trim().toLowerCase()
  const positionSide = String(execution.position_side || '').trim().toLowerCase()
  if (['open_long', 'add_long'].includes(type)) return [{ kind: 'entry', positionSide: 'long' }]
  if (['open_short', 'add_short'].includes(type)) return [{ kind: 'entry', positionSide: 'short' }]
  if (['close_long', 'reduce_long'].includes(type)) return [{ kind: 'exit', positionSide: 'long' }]
  if (['close_short', 'reduce_short'].includes(type)) return [{ kind: 'exit', positionSide: 'short' }]
  if (type === 'reverse_to_long') {
    return [{ kind: 'exit', positionSide: 'short' }, { kind: 'entry', positionSide: 'long' }]
  }
  if (type === 'reverse_to_short') {
    return [{ kind: 'exit', positionSide: 'long' }, { kind: 'entry', positionSide: 'short' }]
  }

  // Older saved results may not contain `type`, but grid executions have a
  // stable entry/exit identity in their client order id and reason.
  const identity = `${execution.client_order_id || ''} ${execution.reason || ''}`.toLowerCase()
  if (/(?:^|[-_\s])entry(?:$|[-_\s])/.test(identity) || identity.includes('grid_initial')) {
    return [{ kind: 'entry', positionSide: positionSide === 'short' ? 'short' : 'long' }]
  }
  if (/(?:^|[-_\s])exit(?:$|[-_\s])/.test(identity) || /(take_profit|hard_stop|liquidation)/.test(identity)) {
    return [{ kind: 'exit', positionSide: positionSide === 'short' ? 'short' : 'long' }]
  }
  return []
}

const containingReviewBarTimestamp = (rows, timestamp) => {
  if (!rows.length) return timestamp
  let low = 0
  let high = rows.length - 1
  let match = 0
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    if (rows[middle] <= timestamp) {
      match = middle
      low = middle + 1
    } else {
      high = middle - 1
    }
  }
  return rows[match]
}

const markerSide = (kind, positionSide) => {
  if (kind === 'entry') return positionSide === 'short' ? 'sell' : 'buy'
  return positionSide === 'short' ? 'buy' : 'sell'
}

const evenlySampleMarkers = (markers, limit) => {
  if (markers.length <= limit) return markers
  const sampled = []
  const lastIndex = markers.length - 1
  for (let index = 0; index < limit; index += 1) {
    sampled.push(markers[Math.round(index * lastIndex / Math.max(1, limit - 1))])
  }
  return sampled.filter((marker, index) => index === 0 || marker !== sampled[index - 1])
}

/**
 * Build uncluttered review markers from actual fills. Executions are preferred
 * because a seeded grid position can be split into many closed trades, causing
 * the same opening marker to be repeated for every later exit.
 */
export const buildTradeReviewMarkers = ({
  executions = [],
  trades = [],
  symbol = '',
  candleRows = [],
  maxMarkers = 500
} = {}) => {
  const normalizedSymbol = normalizeTradeReviewSymbol(symbol)
  const bars = [...new Set((Array.isArray(candleRows) ? candleRows : [])
    .map(row => timestampMillisecondsUtc(row && (row.timestamp ?? row.time)))
    .filter(Number.isFinite))].sort((left, right) => left - right)
  const events = []

  ;(Array.isArray(executions) ? executions : []).forEach(execution => {
    if (normalizeTradeReviewSymbol(execution && execution.symbol) !== normalizedSymbol) return
    const timestamp = timestampMillisecondsUtc(execution && execution.time)
    const price = Number(execution && execution.price)
    if (!Number.isFinite(timestamp) || !Number.isFinite(price)) return
    executionMarkerLegs(execution).forEach(leg => {
      events.push({
        ...leg,
        timestamp,
        price,
        quantity: Math.abs(Number(execution.quantity) || 0)
      })
    })
  })

  if (!events.length) {
    ;(Array.isArray(trades) ? trades : []).forEach(trade => {
      if (normalizeTradeReviewSymbol(trade && trade.symbol) !== normalizedSymbol) return
      const positionSide = String(trade.side || '').toLowerCase() === 'short' ? 'short' : 'long'
      const quantity = Math.abs(Number(trade.quantity ?? trade.amount) || 0)
      const entryTimestamp = timestampMillisecondsUtc(trade.entry_time)
      const exitTimestamp = timestampMillisecondsUtc(trade.exit_time)
      const entryPrice = Number(trade.entry_price)
      const exitPrice = Number(trade.exit_price)
      if (Number.isFinite(entryTimestamp) && Number.isFinite(entryPrice)) {
        events.push({ kind: 'entry', positionSide, timestamp: entryTimestamp, price: entryPrice, quantity })
      }
      if (Number.isFinite(exitTimestamp) && Number.isFinite(exitPrice)) {
        events.push({ kind: 'exit', positionSide, timestamp: exitTimestamp, price: exitPrice, quantity })
      }
    })
  }

  const grouped = new Map()
  events.forEach(event => {
    const timestamp = containingReviewBarTimestamp(bars, event.timestamp)
    const side = markerSide(event.kind, event.positionSide)
    const key = `${timestamp}|${event.kind}|${side}`
    const current = grouped.get(key) || {
      timestamp,
      kind: event.kind,
      side,
      count: 0,
      quantity: 0,
      weightedPrice: 0,
      plainPriceTotal: 0
    }
    current.count += 1
    current.quantity += event.quantity
    current.weightedPrice += event.price * event.quantity
    current.plainPriceTotal += event.price
    grouped.set(key, current)
  })

  const lanes = new Map()
  const markers = [...grouped.values()]
    .sort((left, right) => left.timestamp - right.timestamp || (left.kind === 'entry' ? -1 : 1))
    .map(group => {
      const laneKey = `${group.timestamp}|${group.side}`
      const lane = lanes.get(laneKey) || 0
      lanes.set(laneKey, lane + 1)
      return {
        timestamp: group.timestamp,
        kind: group.kind,
        side: group.side,
        count: group.count,
        lane: Math.min(3, lane),
        price: group.quantity > 0
          ? group.weightedPrice / group.quantity
          : group.plainPriceTotal / group.count
      }
    })

  return evenlySampleMarkers(markers, Math.max(2, Number(maxMarkers) || 500))
}

export const resolveTradeReviewTimeframe = (trade = {}, timeframeValue = '1D', maxBars = 1000) => {
  const requested = normalizeReviewTimeframe(timeframeValue)
  const startIndex = REVIEW_TIMEFRAMES.indexOf(requested)
  const normalized = startIndex >= 0 ? requested : '1D'
  const entryTime = timestampMillisecondsUtc(trade.entry_time)
  const exitTime = timestampMillisecondsUtc(trade.exit_time)
  if (entryTime === null || exitTime === null) return normalized

  const duration = Math.abs(exitTime - entryTime)
  const limit = Math.max(180, Number(maxBars) || 1000)
  const candidates = REVIEW_TIMEFRAMES.slice(Math.max(0, REVIEW_TIMEFRAMES.indexOf(normalized)))
  for (const timeframe of candidates) {
    const interval = TIMEFRAME_MILLISECONDS[timeframe]
    const tradeBars = Math.max(1, Math.ceil(duration / interval) + 1)
    const paddingBars = clamp(Math.ceil(tradeBars * 0.75), 60, 180)
    if (tradeBars + paddingBars * 2 <= limit) return timeframe
  }
  return REVIEW_TIMEFRAMES[REVIEW_TIMEFRAMES.length - 1]
}

export const buildTradeReviewWindow = (trade = {}, timeframeValue = '1D') => {
  const timeframe = normalizeReviewTimeframe(timeframeValue)
  const interval = TIMEFRAME_MILLISECONDS[timeframe] || TIMEFRAME_MILLISECONDS['1D']
  const entryTime = timestampMillisecondsUtc(trade.entry_time)
  const exitTime = timestampMillisecondsUtc(trade.exit_time)
  if (entryTime === null || exitTime === null) {
    return { beforeTime: null, limit: 480, entryTime, exitTime }
  }

  const start = Math.min(entryTime, exitTime)
  const end = Math.max(entryTime, exitTime)
  const tradeBars = Math.max(1, Math.ceil((end - start) / interval) + 1)
  const paddingBars = clamp(Math.ceil(tradeBars * 0.75), 60, 180)
  const limit = clamp(tradeBars + paddingBars * 2, 180, 1000)
  const now = Date.now()
  const latestWindowStart = now - limit * interval
  const latestWindowEnd = now + interval
  // Recent reviews can reuse the normal "latest candles" cache. Supplying a
  // historical cursor here creates a one-off cache key and needlessly forces a
  // slower exchange request even though the requested range is already covered.
  const isCoveredByLatestWindow = start >= latestWindowStart && end <= latestWindowEnd
  const beforeTime = isCoveredByLatestWindow
    ? null
    : Math.floor((end + paddingBars * interval) / 1000)

  return { beforeTime, limit, entryTime, exitTime }
}

export const buildAggregateTradeReview = (trades = [], timeframeValue = '1D', maxBars = 1000) => {
  const validTrades = (Array.isArray(trades) ? trades : []).filter(trade => {
    return timestampMillisecondsUtc(trade && trade.entry_time) !== null &&
      timestampMillisecondsUtc(trade && trade.exit_time) !== null
  })
  if (!validTrades.length) {
    const timeframe = normalizeReviewTimeframe(timeframeValue)
    return { rangeTrade: {}, timeframe, window: buildTradeReviewWindow({}, timeframe) }
  }

  const entryTime = Math.min(...validTrades.map(trade => timestampMillisecondsUtc(trade.entry_time)))
  const exitTime = Math.max(...validTrades.map(trade => timestampMillisecondsUtc(trade.exit_time)))
  const rangeTrade = {
    entry_time: new Date(entryTime).toISOString(),
    exit_time: new Date(exitTime).toISOString()
  }
  const timeframe = resolveTradeReviewTimeframe(rangeTrade, timeframeValue, maxBars)
  return { rangeTrade, timeframe, window: buildTradeReviewWindow(rangeTrade, timeframe) }
}

export const findNearestBarIndex = (rows, targetTimestamp) => {
  if (!Array.isArray(rows) || !rows.length || !Number.isFinite(targetTimestamp)) return -1
  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY
  rows.forEach((row, index) => {
    const distance = Math.abs(Number(row.timestamp) - targetTimestamp)
    if (Number.isFinite(distance) && distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  })
  return bestIndex
}
