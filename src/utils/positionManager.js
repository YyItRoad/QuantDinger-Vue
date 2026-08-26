const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/

/** 账户快照能力以后端返回为准，前端不按交易所白名单过滤凭证。 */
export function selectableSnapshotCredentials (credentials) {
  return (Array.isArray(credentials) ? credentials : []).filter(item => item && typeof item === 'object')
}

function decimalString (value) {
  const candidate = String(value == null ? '' : value).trim()
  return DECIMAL_PATTERN.test(candidate) ? candidate : ''
}

function decimalParts (value) {
  const normalized = decimalString(value)
  if (!normalized) return null
  const negative = normalized.startsWith('-')
  const unsigned = normalized.replace(/^[+-]/, '')
  const [integerRaw, fraction = ''] = unsigned.split('.')
  const integer = (integerRaw || '0').replace(/^0+(?=\d)/, '') || '0'
  return { negative, integer, fraction }
}

function isNonZeroDecimal (value) {
  const normalized = decimalString(value)
  if (!normalized) return false
  if (/[eE]/.test(normalized)) {
    return /[1-9]/.test(normalized.split(/[eE]/)[0])
  }
  const parts = decimalParts(value)
  return Boolean(parts && (parts.integer !== '0' || /[1-9]/.test(parts.fraction)))
}

/** Decimal 只作字符串展示，避免 JavaScript 浮点精度丢失。 */
export function formatDecimalDisplay (value) {
  const normalized = decimalString(value)
  if (/[eE]/.test(normalized)) return normalized
  const parts = decimalParts(value)
  if (!parts) return '--'
  const grouped = parts.integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = parts.negative && isNonZeroDecimal(value) ? '-' : ''
  return `${sign}${grouped}${parts.fraction ? `.${parts.fraction}` : ''}`
}

function normalizePositionRows (rows, fallbackMarketType) {
  return rows
    .filter(row => row && typeof row === 'object')
    .map(row => {
      const symbol = String(row.symbol || row.inst_id || '').trim()
      const marketType = String(row.market_type || fallbackMarketType || '').trim().toLowerCase()
      const side = String(row.side || row.position_side || '').trim().toLowerCase()
      const size = decimalString(row.size != null ? row.size : row.contracts)
      const entryPrice = decimalString(row.entry_price)
      const markPrice = decimalString(row.mark_price)
      const leverage = decimalString(row.leverage)
      const identity = String(row.inst_id || symbol).trim()
      return {
        key: `${marketType}:${identity}:${side}`,
        symbol,
        marketType,
        side,
        size,
        sizeDisplay: formatDecimalDisplay(size),
        entryPrice,
        entryPriceDisplay: formatDecimalDisplay(entryPrice),
        markPrice,
        markPriceDisplay: formatDecimalDisplay(markPrice),
        leverage,
        leverageDisplay: leverage ? `${formatDecimalDisplay(leverage)}x` : '--'
      }
    })
    .filter(row => row.symbol && isNonZeroDecimal(row.size))
}

function canonicalPositionSymbol (value) {
  const raw = String(value || '').trim().toUpperCase().split(':')[0]
  if (!raw) return ''
  const separated = raw.replace(/-/g, '/')
  if (separated.includes('/')) return separated
  for (const quote of ['USDT', 'USDC', 'BUSD', 'USD', 'EUR']) {
    if (separated.endsWith(quote) && separated.length > quote.length) {
      return `${separated.slice(0, -quote.length)}/${quote}`
    }
  }
  return separated
}

function normalizedMarketType (value) {
  const marketType = String(value || '').trim().toLowerCase()
  return ['future', 'futures', 'perp', 'perpetual'].includes(marketType) ? 'swap' : marketType
}

/** 将现有账户快照整理为持仓管理页需要的只读仓位。 */
export function normalizeAccountSnapshotPositions (snapshot = {}) {
  const swapRows = Array.isArray(snapshot.swap_positions) ? snapshot.swap_positions : []
  const spotRows = Array.isArray(snapshot.spot_positions) ? snapshot.spot_positions : []
  return [
    ...normalizePositionRows(swapRows, 'swap'),
    ...normalizePositionRows(spotRows, 'spot')
  ]
}

/** 将交易所快照与现有策略仓位记录做只读匹配。 */
export function mergeManagedPositionRows (positions, managedRows) {
  const managed = Array.isArray(managedRows) ? managedRows : []
  return (Array.isArray(positions) ? positions : []).map(position => {
    const symbol = canonicalPositionSymbol(position.symbol)
    const side = String(position.side || '').trim().toLowerCase()
    const marketType = normalizedMarketType(position.marketType)
    const strategies = new Map()
    managed.forEach(row => {
      if (!row || typeof row !== 'object') return
      if (canonicalPositionSymbol(row.symbol) !== symbol) return
      if (String(row.side || '').trim().toLowerCase() !== side) return
      if (normalizedMarketType(row.market_type) !== marketType) return
      const id = Number(row.strategy_id || 0)
      if (!Number.isInteger(id) || id <= 0 || strategies.has(id)) return
      strategies.set(id, {
        id,
        name: String(row.strategy_name || '').trim() || `#${id}`,
        status: String(row.strategy_status || '').trim(),
        executionMode: String(row.execution_mode || '').trim(),
        size: decimalString(row.size)
      })
    })
    const managingStrategies = Array.from(strategies.values())
    return {
      ...position,
      managementState: managingStrategies.length > 1 ? 'conflict' : managingStrategies.length === 1 ? 'managed' : 'unmanaged',
      managingStrategies
    }
  })
}

/** partial 结果不得伪装成零仓位成功。 */
export function requireCompleteAccountSnapshot (snapshot = {}) {
  const warnings = Array.isArray(snapshot.warnings) ? snapshot.warnings.filter(Boolean) : []
  if (snapshot.partial === true || snapshot.error) {
    throw new Error(warnings[0] || String(snapshot.error || '') || '交易所账户快照不完整')
  }
  return normalizeAccountSnapshotPositions(snapshot)
}
