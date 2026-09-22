import assert from 'node:assert/strict'
import test from 'node:test'
import messages from '../../src/locales/lang/strategy-live-risk.js'
import { translateStrategyRuntimeMessage } from '../../src/utils/strategyLogs.js'

test('Gate stock account environment errors are readable in logs', () => {
  const key = 'strategyV2.gateStockTestnetUnsupported'
  for (const locale of ['en-US', 'zh-CN']) {
    assert.equal(translateStrategyRuntimeMessage(key, key => messages[locale][key]), messages[locale][key])
    assert.ok(messages[locale][key].length > 30)
  }
})

test('technical runtime lines remain intact', () => {
  const message = 'Strategy runtime ready: instruments=1, timeframe=1m, mode=live'
  assert.equal(translateStrategyRuntimeMessage(message, () => assert.fail('Unexpected translation')), message)
  assert.equal(translateStrategyRuntimeMessage('strategyRuntime.leaseLost', key => `translated:${key}`), 'translated:strategyRuntime.leaseLost')
})

test('spot sell failures are localized in runtime logs', () => {
  for (const suffix of ['spotBalanceUnavailable', 'spotBalanceInsufficient', 'spotCloseQuantityInvalid']) {
    const key = `strategyRuntime.${suffix}`
    for (const locale of Object.keys(messages)) {
      assert.ok(messages[locale][key])
      assert.equal(translateStrategyRuntimeMessage(key, value => messages[locale][value]), messages[locale][key])
    }
    assert.notEqual(messages['zh-CN'][key], messages['en-US'][key])
    assert.notEqual(messages['zh-TW'][key], messages['zh-CN'][key])
  }
})
