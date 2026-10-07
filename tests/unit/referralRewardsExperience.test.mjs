import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import messages from '../../src/locales/referral-reward-overrides.js'

const settingsSource = readFileSync(new URL('../../src/views/settings/index.vue', import.meta.url), 'utf8')
const profileSource = readFileSync(new URL('../../src/views/profile/index.vue', import.meta.url), 'utf8')
const userManageSource = readFileSync(new URL('../../src/views/user-manage/index.vue', import.meta.url), 'utf8')
const billingApiSource = readFileSync(new URL('../../src/api/billing.js', import.meta.url), 'utf8')

const supportedLocales = [
  'ar-SA',
  'de-DE',
  'en-US',
  'fr-FR',
  'ja-JP',
  'ko-KR',
  'ru-RU',
  'th-TH',
  'vi-VN',
  'zh-CN',
  'zh-TW'
]

test('referral rate settings expose and enforce the three-level limit', () => {
  assert.match(settingsSource, /settings\.referralActivity\.maxThreeLevels/)
  assert.match(settingsSource, /@input="limitReferralRewardRates"/)
  assert.match(settingsSource, /tokens\.filter\(Boolean\)\.slice\(0, 3\)/)
  assert.match(settingsSource, /tokens\.length > 3/)
  assert.match(settingsSource, /color: var\(--qd-text-muted, #6b7280\) !important/)
})

test('persisted membership plans use the delete endpoint', () => {
  assert.match(settingsSource, /deleteAdminMembershipPlan\(plan\.code\)/)
  assert.match(billingApiSource, /method: 'delete'/)
  assert.match(settingsSource, /cannot_delete_last_active_plan/)
})

test('profile referral records use three tabs and surface the membership reward', () => {
  assert.match(profileSource, /profile\.referralRewards\.membershipRewardHint/)
  assert.match(profileSource, /referralRecordTab/)
  assert.match(profileSource, /key="promotions"/)
  assert.match(profileSource, /key="rewards"/)
  assert.match(profileSource, /key="withdrawals"/)
  assert.match(profileSource, /withdrawalCurrencies/)
  assert.match(profileSource, /withdrawalChains/)
  assert.match(profileSource, /handleRewardWithdrawalCurrencyChange/)
})

test('withdrawal management exposes summary cards and referral copy covers every locale', () => {
  assert.match(userManageSource, /rewardWithdrawalSummary\.total_requests/)
  assert.match(userManageSource, /rewardWithdrawalSummary\.pending_amount/)
  assert.match(userManageSource, /rewardWithdrawalSummary\.processing_requests/)
  assert.match(userManageSource, /rewardWithdrawalSummary\.paid_amount/)

  for (const locale of supportedLocales) {
    assert.ok(messages[locale], `Missing locale: ${locale}`)
    assert.ok(messages[locale]['profile.referralRewards.membershipRewardHint'])
    assert.ok(messages[locale]['profile.referralRewards.promotionRecords'])
    assert.ok(messages[locale]['profile.referralRewards.rewardRecords'])
    assert.ok(messages[locale]['profile.referralRewards.withdrawalRecords'])
    assert.ok(messages[locale]['profile.referralRewards.currency'])
    assert.ok(messages[locale]['profile.referralRewards.network'])
  }
})
