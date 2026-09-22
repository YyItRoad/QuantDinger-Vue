import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const read = relativePath => fs.readFileSync(
  fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)),
  'utf8'
)

const positionPage = read('src/views/position-manager/index.vue')
const managedEditor = read('src/views/position-manager/components/ManagedStrategyEditor.vue')

test('持仓管理使用独立弹窗而不是官方 LiveStrategyEditor', () => {
  assert.match(positionPage, /import ManagedStrategyEditor from '.\/components\/ManagedStrategyEditor\.vue'/)
  assert.match(positionPage, /<managed-strategy-editor/)
  assert.doesNotMatch(positionPage, /strategy-center\/components\/LiveStrategyEditor/)
})

test('持仓管理弹窗保留周期覆盖和仓位锁定配置', () => {
  assert.match(managedEditor, /allowTimeframeOverride/)
  assert.match(managedEditor, /timeframeOptions/)
  assert.match(managedEditor, /positionManager\.executionTimeframe/)
  assert.match(managedEditor, /lockCredential/)
  assert.match(managedEditor, /lockLeverage/)
  assert.match(managedEditor, /applyLockedPositionConfig/)
  assert.match(managedEditor, /timeframe: this\.allowTimeframeOverride \? this\.model\.timeframe : undefined/)
})

test('持仓管理弹窗必须通过专用创建处理器提交', () => {
  assert.match(managedEditor, /createHandler: \{ type: Function, default: null \}/)
  assert.match(managedEditor, /this\.createHandler\s*\? await this\.createHandler\(payload\)/)
  assert.match(positionPage, /:create-handler="submitManagedStrategy"/)
  assert.match(positionPage, /createManagedAccountStrategy\(buildManagedStrategyRequest\(/)
})
