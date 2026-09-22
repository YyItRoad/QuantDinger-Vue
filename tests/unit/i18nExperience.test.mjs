import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import reviewedUiOverrides, {
  verifiedSameUiMessages
} from '../../src/locales/reviewed-ui-overrides.js'
import billingPaymentMessages from '../../src/locales/billing-payment-overrides.js'

const translatedLocales = [
  'ar-SA',
  'de-DE',
  'fr-FR',
  'ja-JP',
  'ko-KR',
  'ru-RU',
  'th-TH',
  'vi-VN',
  'zh-CN',
  'zh-TW'
]

const criticalKeys = [
  'aiAssetAnalysis.copilot.exportPdf',
  'aiAssetAnalysis.copilot.askFollowup',
  'aiAssetAnalysis.copilot.askReportFollowup',
  'aiAssetAnalysis.copilot.diagnoseCommand',
  'aiAssetAnalysis.copilot.reportGenerateTitle',
  'aiAssetAnalysis.copilot.professionalReport',
  'aiAssetAnalysis.copilot.viewFullReport'
]

const financialKeys = [
  'fastAnalysis.cryptoVolume24h',
  'fastAnalysis.cryptoFundingRate',
  'fastAnalysis.cryptoOpenInterest',
  'fastAnalysis.cryptoLongShortRatio',
  'fastAnalysis.signalBullish',
  'fastAnalysis.signalBearish',
  'fastAnalysis.signalNeutral'
]

const backtestTradeMarkerKeys = [
  'strategyV2.backtest.entryMarker',
  'strategyV2.backtest.exitMarker'
]

const reviewedCopilotCoreKeys = [
  'aiAssetAnalysis.copilot.confidence',
  'aiAssetAnalysis.copilot.currentPrice',
  'aiAssetAnalysis.copilot.copyAnswer',
  'aiAssetAnalysis.copilot.savePrompt',
  'aiAssetAnalysis.copilot.riskRewardWarning',
  'aiAssetAnalysis.copilot.riskRewardUnavailable',
  'aiAssetAnalysis.copilot.followups.followup_levels.label',
  'aiAssetAnalysis.copilot.followups.followup_levels.prompt',
  'aiAssetAnalysis.copilot.followups.followup_monitor.label',
  'aiAssetAnalysis.copilot.followups.followup_monitor.prompt',
  'aiAssetAnalysis.copilot.followups.followup_news.label',
  'aiAssetAnalysis.copilot.followups.followup_news.prompt',
  'aiAssetAnalysis.copilot.followups.followup_plan.label',
  'aiAssetAnalysis.copilot.followups.followup_plan.prompt',
  'aiAssetAnalysis.copilot.followups.followup_scenarios.label',
  'aiAssetAnalysis.copilot.followups.followup_scenarios.prompt',
  'aiAssetAnalysis.copilot.researchModes.diagnosis',
  'aiAssetAnalysis.copilot.researchModes.macro',
  'aiAssetAnalysis.copilot.researchModes.news',
  'aiAssetAnalysis.copilot.researchModes.plan',
  'aiAssetAnalysis.copilot.researchModes.research',
  'aiAssetAnalysis.copilot.researchModes.technical',
  'aiAssetAnalysis.copilot.researchWelcomeTitle',
  'aiAssetAnalysis.copilot.researchWelcomeDesc',
  'aiAssetAnalysis.copilot.noSessionMemory',
  'aiAssetAnalysis.copilot.viewConversationMemory',
  'aiAssetAnalysis.copilot.savedPrompts',
  'aiAssetAnalysis.copilot.savedPromptsHint'
]

const placeholders = value => Array.from(value.matchAll(/\{([^}]+)\}/g), match => match[1]).sort()

test('billing and payment UI is translated for every desktop locale', () => {
  const locales = ['en-US', ...translatedLocales]
  const keys = Object.keys(billingPaymentMessages['en-US'])

  for (const locale of locales) {
    const messages = billingPaymentMessages[locale]
    assert.ok(messages, `${locale} must have billing and payment messages`)
    for (const key of keys) {
      assert.equal(typeof messages[key], 'string', `${locale} is missing ${key}`)
      assert.ok(messages[key].trim(), `${locale}.${key} must not be empty`)
      assert.deepEqual(placeholders(messages[key]), placeholders(billingPaymentMessages['en-US'][key]), `${locale}.${key} must preserve placeholders`)
    }
  }
})

test('Stripe checkout opens in a separate browser tab', () => {
  const source = readFileSync(new URL('../../src/views/billing/index.vue', import.meta.url), 'utf8')
  assert.match(source, /window\.open\('about:blank', '_blank'\)/)
  assert.match(source, /checkoutWindow\.location\.replace\(res\.data\.checkout_url\)/)
  assert.doesNotMatch(source, /window\.location\.assign\(res\.data\.checkout_url\)/)
})

test('high-traffic AI actions are reviewed for every translated locale', () => {
  for (const locale of translatedLocales) {
    const messages = reviewedUiOverrides[locale]
    assert.ok(messages, `${locale} must have reviewed UI messages`)

    for (const key of criticalKeys) {
      assert.equal(typeof messages[key], 'string', `${locale} is missing ${key}`)
      assert.ok(messages[key].trim(), `${locale}.${key} must not be empty`)
    }

    assert.deepEqual(placeholders(messages['aiAssetAnalysis.copilot.askReportFollowup']), ['label'])
    assert.deepEqual(placeholders(messages['aiAssetAnalysis.copilot.diagnoseCommand']), ['market', 'symbol'])
    assert.deepEqual(placeholders(messages['aiAssetAnalysis.copilot.reportGenerateTitle']), ['symbol'])
  }
})

test('financial labels use reviewed terminology in every non-Simplified-Chinese locale', () => {
  for (const locale of translatedLocales.filter(locale => locale !== 'zh-CN')) {
    const messages = reviewedUiOverrides[locale]
    for (const key of financialKeys) {
      assert.equal(typeof messages[key], 'string', `${locale} is missing ${key}`)
      assert.ok(messages[key].trim(), `${locale}.${key} must not be empty`)
    }
  }
})

test('backtest trade markers use reviewed trading terminology', () => {
  for (const locale of translatedLocales) {
    const messages = reviewedUiOverrides[locale]
    for (const key of backtestTradeMarkerKeys) {
      assert.equal(typeof messages[key], 'string', `${locale} is missing ${key}`)
      assert.ok(messages[key].trim(), `${locale}.${key} must not be empty`)
    }
  }

  assert.equal(reviewedUiOverrides['zh-CN']['strategyV2.backtest.entryMarker'], '开仓')
  assert.equal(reviewedUiOverrides['zh-CN']['strategyV2.backtest.exitMarker'], '平仓')
})

test('core report and follow-up terminology is reviewed for every secondary language', () => {
  for (const locale of translatedLocales.filter(locale => locale !== 'zh-CN')) {
    const messages = reviewedUiOverrides[locale]
    for (const key of reviewedCopilotCoreKeys) {
      assert.equal(typeof messages[key], 'string', `${locale} is missing ${key}`)
      assert.ok(messages[key].trim(), `${locale}.${key} must not be empty`)
    }

    for (const key of reviewedCopilotCoreKeys.filter(key => key.endsWith('.prompt'))) {
      assert.deepEqual(placeholders(messages[key]), ['symbol'], `${locale}.${key} must preserve {symbol}`)
    }
  }
})

test('reviewed values reject known machine-translation corruption markers', () => {
  const protectedKeys = [...criticalKeys, ...financialKeys, ...reviewedCopilotCoreKeys]
  const values = translatedLocales.flatMap(locale => protectedKeys
    .map(key => reviewedUiOverrides[locale][key])
    .filter(Boolean))
  const reviewedText = values.join('\n')

  assert.doesNotMatch(reviewedText, /[▁�]/u)
  assert.doesNotMatch(reviewedText, /胡說|小熊|뚱\s*베어|งุ่มง่าม|Je ne sais/iu)
})

test('broker trademarks keep their canonical names in every translated locale', () => {
  assert.deepEqual(verifiedSameUiMessages, [
    'brokerAccounts.alpaca.name',
    'brokerAccounts.ibkr.name'
  ])

  for (const locale of translatedLocales) {
    assert.equal(reviewedUiOverrides[locale]['brokerAccounts.alpaca.name'], 'Alpaca Markets')
    assert.equal(reviewedUiOverrides[locale]['brokerAccounts.ibkr.name'], 'Interactive Brokers')
  }
})
