function normalizedMarket (market) {
  return String(market || '').replace(/[\s_-]/g, '').toLowerCase()
}

function latestReferencePrice (data) {
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i] || {}
    const candidates = [row.close, row.open, row.high, row.low]
    for (let j = 0; j < candidates.length; j++) {
      const value = Number(candidates[j])
      if (Number.isFinite(value) && value > 0) return value
    }
  }
  return 0
}

export function inferMarketPricePrecision (data, market) {
  if (!Array.isArray(data) || data.length === 0) return 2

  // Provider values may arrive as float32-style numbers such as
  // 219.2400054932. The trailing digits are serialization noise rather than
  // the display precision of a US equity.
  const marketKey = normalizedMarket(market)
  if (marketKey === 'usstock' || marketKey === 'usequity') {
    const referencePrice = latestReferencePrice(data)
    return referencePrice > 0 && referencePrice < 1 ? 4 : 2
  }

  let maxDecimals = 0
  const sample = data.length > 50 ? data.slice(-50) : data
  for (let i = 0; i < sample.length; i++) {
    const vals = [sample[i].close, sample[i].open, sample[i].high, sample[i].low]
    for (let j = 0; j < vals.length; j++) {
      const value = Number(vals[j])
      if (!Number.isFinite(value)) continue
      const s = String(value)
      const dot = s.indexOf('.')
      if (dot >= 0) maxDecimals = Math.max(maxDecimals, s.length - dot - 1)
    }
  }

  let minSpread = Infinity
  for (let i = 0; i < sample.length; i++) {
    const spread = Number(sample[i].high) - Number(sample[i].low)
    if (spread > 0 && spread < minSpread) minSpread = spread
  }
  let spreadDecimals = 2
  if (minSpread < Infinity && minSpread > 0) {
    spreadDecimals = Math.ceil(-Math.log10(minSpread)) + 2
  }

  return Math.min(Math.max(maxDecimals, spreadDecimals, 2), 10)
}
