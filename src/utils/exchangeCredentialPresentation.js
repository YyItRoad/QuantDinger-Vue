const DEMO_ENVIRONMENTS = new Set(['demo', 'paper', 'simulate', 'simulation', 'simulated'])
const TEST_ENVIRONMENTS = new Set(['test', 'testnet', 'sandbox'])

export function normalizeCredentialEnvironment (credential) {
  const item = credential || {}
  const exchangeId = String(item.exchange_id || '').trim().toLowerCase()
  const raw = String(item.environment || item.network || item.env || '').trim().toLowerCase()

  if (TEST_ENVIRONMENTS.has(raw)) return exchangeId === 'gate' ? 'testnet' : 'demo'
  if (DEMO_ENVIRONMENTS.has(raw)) return exchangeId === 'gate' ? 'testnet' : 'demo'
  if (raw === 'live') return 'live'
  if (item.enable_demo_trading === true || item.enable_demo_trading === 1 || item.enable_demo_trading === '1') {
    return exchangeId === 'gate' ? 'testnet' : 'demo'
  }
  return 'live'
}

export function normalizeCredentialMarketScope (credential) {
  const raw = String((credential && (credential.market_scope || credential.marketScope)) || 'both')
    .trim()
    .toLowerCase()
  if (['future', 'futures', 'perp', 'perpetual', 'contract', 'contracts'].includes(raw)) return 'swap'
  if (raw === 'spot' || raw === 'swap') return raw
  return 'both'
}

export function credentialEnvironmentKey (credential) {
  return `brokerAccounts.cryptoSection.environment.${normalizeCredentialEnvironment(credential)}`
}

export function credentialScopeKey (credential) {
  return `brokerAccounts.cryptoSection.scope.${normalizeCredentialMarketScope(credential)}`
}
