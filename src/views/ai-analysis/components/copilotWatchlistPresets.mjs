const MARKET_PRIORITY = ['USStock', 'Crypto', 'HKStock', 'Forex', 'Futures', 'MOEX']

const PRESETS = {
  USStock: [
    { symbol: 'AAPL', name: 'Apple' },
    { symbol: 'MSFT', name: 'Microsoft' },
    { symbol: 'NVDA', name: 'NVIDIA' },
    { symbol: 'TSLA', name: 'Tesla' },
    { symbol: 'AMZN', name: 'Amazon' },
    { symbol: 'META', name: 'Meta' },
    { symbol: 'GOOGL', name: 'Alphabet' },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
    { symbol: 'QQQ', name: 'Invesco QQQ ETF' }
  ],
  Crypto: [
    { symbol: 'BTC/USDT', name: 'Bitcoin' },
    { symbol: 'ETH/USDT', name: 'Ethereum' },
    { symbol: 'SOL/USDT', name: 'Solana' },
    { symbol: 'BNB/USDT', name: 'BNB' },
    { symbol: 'XRP/USDT', name: 'XRP' },
    { symbol: 'DOGE/USDT', name: 'Dogecoin' },
    { symbol: 'ADA/USDT', name: 'Cardano' },
    { symbol: 'AVAX/USDT', name: 'Avalanche' },
    { symbol: 'LINK/USDT', name: 'Chainlink' }
  ]
}

export function sortCopilotMarkets (options = []) {
  return [...options].sort((left, right) => {
    const leftRank = MARKET_PRIORITY.indexOf(left && left.value)
    const rightRank = MARKET_PRIORITY.indexOf(right && right.value)
    const normalizedLeftRank = leftRank < 0 ? MARKET_PRIORITY.length : leftRank
    const normalizedRightRank = rightRank < 0 ? MARKET_PRIORITY.length : rightRank
    return normalizedLeftRank - normalizedRightRank
  })
}

export function watchlistPresetsForMarket (market) {
  return (PRESETS[market] || []).map(item => ({ ...item, market }))
}

export function mergeWatchlistSuggestions (market, liveSuggestions = [], limit = 10) {
  const merged = new Map()
  const suggestions = [
    ...watchlistPresetsForMarket(market),
    ...(Array.isArray(liveSuggestions) ? liveSuggestions : [])
  ]

  suggestions.forEach(item => {
    const symbol = String((item && item.symbol) || '').trim().toUpperCase()
    if (!symbol) return
    const key = `${market}:${symbol}`
    if (!merged.has(key)) merged.set(key, { ...item, market, symbol })
  })

  return Array.from(merged.values()).slice(0, limit)
}
