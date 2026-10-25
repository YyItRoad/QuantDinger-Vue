const kinds = ['strategy', 'order', 'quick_order', 'trade', 'history']
const value = input => typeof input === 'string' && input.length <= 100 ? input.trim() : ''
const id = input => {
  if (!['string', 'number'].includes(typeof input) || !/^[1-9]\d*$/.test(String(input))) return null
  return Number.isSafeInteger(Number(input)) ? Number(input) : null
}

export function parseTradePlanSource (query = {}) {
  const kind = value(query.from_kind)
  const sourceId = id(query.from_id)
  if (!kinds.includes(kind) || !sourceId) return null
  return {
    kind,
    id: sourceId,
    credentialId: id(query.from_credential),
    tradeId: id(query.from_trade),
    symbol: value(query.from_symbol).toUpperCase(),
    market: value(query.from_market),
    marketType: value(query.from_type),
    exchangeId: value(query.from_exchange),
    instrumentId: value(query.from_instrument),
    direction: ['long', 'short'].includes(query.from_direction) ? query.from_direction : ''
  }
}

export function tradePlanSourceRoute (kind, record, defaults = {}) {
  if (!record || !kinds.includes(kind) || !id(record.id)) return null
  const query = {
    from_kind: kind,
    from_id: String(id(record.id)),
    from_symbol: String(record.symbol || defaults.symbol || ''),
    from_credential: String(record.credential_id || defaults.credential_id || ''),
    from_market: String(record.market_category || defaults.market || ''),
    from_type: String(record.market_type || defaults.market_type || ''),
    from_exchange: String(record.exchange_id || defaults.exchange_id || ''),
    from_instrument: String(record.inst_id || ''),
    from_direction: String(record.position_side || ''),
    from_trade: String(record.source_trade_id || '')
  }
  const source = parseTradePlanSource(query)
  if (!source) return null
  Object.keys(query).forEach(key => { if (!query[key]) delete query[key] })
  return { name: 'TradePlans', query }
}

export function sourceMatchesPlan (source, snapshot) {
  const instrument = snapshot?.instrument || {}
  return !!source && !!source.symbol && source.symbol === String(instrument.symbol || '').toUpperCase() &&
    (!source.market || source.market === instrument.market) &&
    (!source.marketType || source.marketType === instrument.market_type)
}

export function sourceMatchesLink (source, link) {
  if (!source || link.revoked) return false
  if (source.kind === link.source_kind && source.id === Number(link.source_id)) return true
  const tradeId = source.kind === 'trade' ? source.id : source.tradeId
  return !!tradeId && tradeId === Number(link.trade_id)
}

export function draftFromSource (draft, source) {
  if (!source) return draft
  return {
    ...draft,
    direction: source.direction,
    retrospective: ['trade', 'history'].includes(source.kind),
    instrument: {
      ...draft.instrument,
      market: source.market || '',
      symbol: source.symbol,
      exchange_id: source.exchangeId,
      market_type: source.marketType || '',
      instrument_id: source.instrumentId
    }
  }
}
