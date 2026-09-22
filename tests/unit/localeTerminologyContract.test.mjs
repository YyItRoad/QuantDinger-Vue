import test from 'node:test'
import assert from 'node:assert/strict'

import generatedLocaleOverrides from '../../src/locales/generated-locale-overrides.js'
import strategyLiveRiskMessages from '../../src/locales/lang/strategy-live-risk.js'

const translatedLocales = [
  'ar-SA',
  'de-DE',
  'fr-FR',
  'ja-JP',
  'ko-KR',
  'ru-RU',
  'th-TH',
  'vi-VN'
]

test('exchange brands, symbols, currencies and timeframe tokens stay canonical', () => {
  for (const localeName of translatedLocales) {
    const messages = generatedLocaleOverrides[localeName]
    const accountHint = messages['brokerAccounts.accountNameHint']
    const watchlistHint = messages['marketContext.exchangeProductWatchlistHint']
    const robotError = messages['strategyV2.equityRobotUnsupported']
    const timeframes = messages['strategyV2.bitgetRealityTimeframeUnsupported']
    const quoteDifference = messages['strategyCenter.positionOwnership.quoteDifference']

    assert.match(accountHint, /Alpaca/, localeName)
    assert.match(watchlistHint, /AAPL/, localeName)
    assert.match(watchlistHint, /00700/, localeName)
    assert.match(watchlistHint, /Gate/, localeName)
    assert.match(robotError, /Gate/, localeName)
    assert.match(robotError, /Strategy API/, localeName)
    assert.equal(quoteDifference, '{value} USD', localeName)

    for (const timeframe of ['1m', '5m', '15m', '1h', '4h', '1d']) {
      assert.ok(timeframes.includes(timeframe), `${localeName}:${timeframe}`)
    }
  }
})

test('Discord and Webhook remain canonical technical names in every supported locale', () => {
  for (const [localeName, messages] of Object.entries(strategyLiveRiskMessages)) {
    assert.equal(messages['trading-assistant.notify.discord'], 'Discord', localeName)
    assert.equal(messages['trading-assistant.notify.webhook'], 'Webhook', localeName)
  }
})
