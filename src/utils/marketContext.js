export const CRYPTO_EXCHANGE_IDS = ['binance', 'bitget', 'bybit', 'okx', 'gate', 'htx']

export function normalizeMarketType (value, market = 'Crypto') {
  if (market !== 'Crypto') return 'spot'
  const raw = String(value || '').trim().toLowerCase()
  if (['future', 'futures', 'perp', 'perpetual'].includes(raw)) return 'swap'
  return raw === 'swap' ? 'swap' : 'spot'
}

export function normalizeExchangeId (value) {
  const raw = String(value || '').trim().toLowerCase()
  const aliases = {
    okex: 'okx',
    gateio: 'gate',
    huobi: 'htx',
    binanceusdm: 'binance'
  }
  return aliases[raw] || raw
}

export function marketContextKey (context = {}) {
  const rawSymbol = String(context.symbol || '')
  const symbol = rawSymbol.split(':').find(part => part.includes('/')) || rawSymbol
  const market = String(context.market || context.market_category || '')
  const base = [market, symbol].join(':')
  const exchangeId = normalizeExchangeId(context.exchange_id || context.exchangeId)
  const marketType = String(context.market_type || context.marketType || '').trim().toLowerCase()
  const instrumentId = String(context.instrument_id || context.instrumentId || '').trim()
  if (market !== 'Crypto' || (!exchangeId && !instrumentId)) return base
  return [base, exchangeId, normalizeMarketType(marketType, market), instrumentId].join('|')
}

export function normalizeMarketContext (context = {}, defaults = {}) {
  const market = String(context.market || context.market_category || defaults.market || 'Crypto')
  return {
    market,
    symbol: String(context.symbol || defaults.symbol || '').trim().toUpperCase(),
    exchange_id: market === 'Crypto'
      ? normalizeExchangeId(context.exchange_id || context.exchangeId || defaults.exchange_id || defaults.exchangeId || 'binance')
      : '',
    market_type: normalizeMarketType(
      context.market_type || context.marketType || defaults.market_type || defaults.marketType,
      market
    ),
    instrument_id: String(context.instrument_id || context.instrumentId || defaults.instrument_id || '').trim(),
    settle_currency: String(context.settle_currency || context.settleCurrency || defaults.settle_currency || '').trim().toUpperCase(),
    timeframe: String(context.timeframe || defaults.timeframe || '').trim()
  }
}
