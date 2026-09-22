import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import adminOrderMessages from '../../src/locales/admin-order-overrides.js'

const source = readFileSync(new URL('../../src/views/user-manage/index.vue', import.meta.url), 'utf8')

test('admin order list supports USDT, USDC and Stripe with server-side filters', () => {
  assert.match(source, /orderPaymentFilter/)
  assert.match(source, /payment_method: this\.orderPaymentFilter/)
  assert.match(source, /orderPlanFilter/)
  assert.match(source, /plan: this\.orderPlanFilter/)
  assert.match(source, /value="usdc"/)
  assert.match(source, /value="stripe"/)
  assert.match(source, /dataIndex: 'payment_reference'/)
})

test('manual confirmation remains limited to on-chain orders', () => {
  assert.match(source, /\['usdt', 'usdc'\]\.indexOf\(method\)/)
  assert.doesNotMatch(source, /canManualConfirm\(record\.status\)/)
})

test('admin order additions are translated for every desktop locale', () => {
  const locales = ['en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'ko-KR', 'de-DE', 'fr-FR', 'ru-RU', 'th-TH', 'vi-VN', 'ar-SA']
  const keys = Object.keys(adminOrderMessages['en-US'])
  for (const locale of locales) {
    assert.ok(adminOrderMessages[locale], `${locale} messages must exist`)
    for (const key of keys) {
      assert.equal(typeof adminOrderMessages[locale][key], 'string', `${locale} is missing ${key}`)
      assert.ok(adminOrderMessages[locale][key].trim(), `${locale}.${key} must not be empty`)
    }
  }
})

test('admin order loading failures use the localized message', () => {
  assert.match(source, /\$t\('adminOrders\.loadFailed'\)/)
  assert.doesNotMatch(source, /\$message\.error\('Failed to load orders'\)/)
})
