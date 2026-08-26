const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/

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
  const parts = decimalParts(value)
  return Boolean(parts && (parts.integer !== '0' || /[1-9]/.test(parts.fraction)))
}

/** Decimal 只作字符串展示，避免 JavaScript 浮点精度丢失。 */
export function formatDecimalDisplay (value) {
  const parts = decimalParts(value)
  if (!parts) return '--'
  const grouped = parts.integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = parts.negative && isNonZeroDecimal(value) ? '-' : ''
  return `${sign}${grouped}${parts.fraction ? `.${parts.fraction}` : ''}`
}

/** 将现有账户快照整理为持仓管理页需要的只读合约仓位。 */
export function normalizeAccountSnapshotPositions (snapshot = {}) {
  const rows = Array.isArray(snapshot.swap_positions) ? snapshot.swap_positions : []
  return rows
    .filter(row => row && typeof row === 'object')
    .map(row => {
      const symbol = String(row.symbol || row.inst_id || '').trim()
      const side = String(row.side || row.position_side || '').trim().toLowerCase()
      const size = decimalString(row.size != null ? row.size : row.contracts)
      const entryPrice = decimalString(row.entry_price)
      const markPrice = decimalString(row.mark_price)
      const leverage = decimalString(row.leverage)
      return {
        key: `${symbol}:${side}`,
        symbol,
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
