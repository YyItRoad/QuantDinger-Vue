import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import messages from '../../src/locales/lang/position-manager.js'

function page (locale) {
  let script = fs.readFileSync(new URL('../../src/views/position-manager/index.vue', import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]
  const scope = { mapState: () => ({}) }
  script = script.replace(/^import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"]\s*$/gm, (_, names) => {
    for (const item of names.replace(/[{}]/g, '').split(',')) {
      const name = item.trim().split(/\s+as\s+/).pop()
      if (!(name in scope)) scope[name] = () => ({})
    }
    return ''
  })
  vm.runInNewContext(script.replace('export default', 'result ='), scope)
  return {
    ...scope.result.methods,
    $t: key => messages[locale][key] || key,
    formatNumber: value => String(value),
    selectedHistoryItem: { ext: { params: { fixed_stop_price: 0.325 } } },
    sections: scope.result.computed.historyDetailSections
  }
}

test('history details read the archived price and localize missing snapshots', () => {
  for (const locale of ['zh-CN', 'en-US']) {
    const state = page(locale)
    assert.ok(state.sections().some(section => section.fields.includes('fixed_stop_price')))
    assert.equal(state.historyDetailValue('fixed_stop_price'), '0.325')
    assert.equal(state.historyFieldLabel('fixed_stop_price'), messages[locale]['positionManager.historyFixedStopPrice'])
    for (const ext of [undefined, {}, { params: {} }, { params: { fixed_stop_price: 0 } }, { params: { fixed_stop_price: 'bad' } }]) {
      state.selectedHistoryItem = { ext, fixed_stop_price: 99 }
      assert.equal(state.historyDetailValue('fixed_stop_price'), messages[locale]['positionManager.historyNotRecorded'])
    }
  }
})
