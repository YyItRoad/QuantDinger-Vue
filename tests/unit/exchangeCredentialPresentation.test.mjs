import test from 'node:test'
import assert from 'node:assert/strict'
import brokerAccountWorkspaceMessages from '../../src/locales/lang/broker-account-workspace.js'
import {
  credentialEnvironmentKey,
  credentialScopeKey,
  normalizeCredentialEnvironment,
  normalizeCredentialMarketScope
} from '../../src/utils/exchangeCredentialPresentation.js'

test('credential environments distinguish live, demo and Gate testnet accounts', () => {
  assert.equal(normalizeCredentialEnvironment({ exchange_id: 'binance', environment: 'live' }), 'live')
  assert.equal(normalizeCredentialEnvironment({ exchange_id: 'binance', environment: 'demo' }), 'demo')
  assert.equal(normalizeCredentialEnvironment({ exchange_id: 'gate', environment: 'testnet' }), 'testnet')
  assert.equal(normalizeCredentialEnvironment({ exchange_id: 'gate', enable_demo_trading: true }), 'testnet')
  assert.equal(credentialEnvironmentKey({ exchange_id: 'gate', enable_demo_trading: true }), 'brokerAccounts.cryptoSection.environment.testnet')
})

test('credential permission scope supports API values and legacy aliases', () => {
  assert.equal(normalizeCredentialMarketScope({ market_scope: 'spot' }), 'spot')
  assert.equal(normalizeCredentialMarketScope({ market_scope: 'swap' }), 'swap')
  assert.equal(normalizeCredentialMarketScope({ market_scope: 'future' }), 'swap')
  assert.equal(normalizeCredentialMarketScope({ marketScope: 'perpetual' }), 'swap')
  assert.equal(normalizeCredentialMarketScope({}), 'both')
  assert.equal(credentialScopeKey({ market_scope: 'both' }), 'brokerAccounts.cryptoSection.scope.both')
})

test('credential labels are localized for every supported language', () => {
  const localeNames = ['en-US', 'ar-SA', 'de-DE', 'fr-FR', 'ja-JP', 'ko-KR', 'ru-RU', 'th-TH', 'vi-VN', 'zh-CN', 'zh-TW']
  const keys = [
    'brokerAccounts.cryptoSection.environmentLabel',
    'brokerAccounts.cryptoSection.scopeLabel',
    'brokerAccounts.cryptoSection.environment.live',
    'brokerAccounts.cryptoSection.environment.demo',
    'brokerAccounts.cryptoSection.environment.testnet',
    'brokerAccounts.cryptoSection.scope.spot',
    'brokerAccounts.cryptoSection.scope.swap',
    'brokerAccounts.cryptoSection.scope.both'
  ]

  for (const localeName of localeNames) {
    const messages = brokerAccountWorkspaceMessages[localeName]
    for (const key of keys) {
      assert.equal(typeof messages[key], 'string', `${localeName}:${key}`)
      assert.ok(messages[key].trim(), `${localeName}:${key}`)
    }
  }
})
