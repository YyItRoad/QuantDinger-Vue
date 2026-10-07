import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import messages from '../../src/locales/settings-runtime-overrides.js'

const settingsSource = readFileSync(
  new URL('../../src/views/settings/index.vue', import.meta.url),
  'utf8'
)
const supportedLocales = [
  'ar-SA', 'de-DE', 'en-US', 'fr-FR', 'ja-JP', 'ko-KR',
  'ru-RU', 'th-TH', 'vi-VN', 'zh-CN', 'zh-TW'
]
const runtimeKeys = [
  'STRATEGY_MAX_ACTIVE',
  'STRATEGY_EVALUATOR_THREADS',
  'STRATEGY_EVALUATION_BATCH_SIZE',
  'STRATEGY_EVALUATOR_BATCH_WORKERS',
  'STRATEGY_EVALUATION_TIMEOUT_SEC',
  'BAR_CLOSE_EVENT_GRACE_SEC'
]

test('system runtime is part of the operations section', () => {
  assert.match(settingsSource, /keys: \['email', 'sms', 'network', 'security', 'strategy_runtime'\]/)
  assert.doesNotMatch(settingsSource, /keys: \['infrastructure', 'scalability', 'environment'\]/)
})

test('curated runtime copy exists in every supported locale', () => {
  for (const locale of supportedLocales) {
    assert.ok(messages[locale]?.['settings.group.strategy_runtime'])
    assert.ok(messages[locale]?.['settings.alreadyUpToDate'])
    for (const key of runtimeKeys) {
      assert.ok(messages[locale]?.[`settings.field.${key}`], `${locale}.field.${key}`)
      assert.ok(messages[locale]?.[`settings.desc.${key}`], `${locale}.desc.${key}`)
    }
  }
})
