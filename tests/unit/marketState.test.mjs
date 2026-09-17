import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function component (apis = {}) {
  const source = fs.readFileSync(new URL('../../src/views/market-state/index.vue', import.meta.url), 'utf8')
    .split('<script>')[1].split('</script>')[0].replace(/^import .*$/gm, '').replace('export default', 'component =')
  const sandbox = { NewAnalysis: {}, ...apis }
  vm.runInNewContext(source, sandbox)
  const definition = sandbox.component
  const context = { ...definition.data(), $message: { error: () => {} } }
  for (const [key, fn] of Object.entries(definition.methods)) context[key] = fn.bind(context)
  Object.defineProperty(context, 'current', { get: () => definition.computed.current.call(context) })
  return context
}
const response = symbol => ({ code: 1, mode: 'demo', data: { items: [{ symbol }], symbols: [symbol], total: 1, page: 1 } })

test('旧请求不能覆盖新筛选结果', async () => {
  const pending = []
  const page = component({ listAnalysisRecords: () => new Promise(resolve => pending.push(resolve)) })
  const first = page.load()
  const second = page.load()
  pending[1](response('SOL/USDT'))
  await second
  pending[0](response('BTC/USDT'))
  await first
  assert.equal(page.current.items[0].symbol, 'SOL/USDT')
  assert.equal(page.loading, false)
})

test('筛选和改变每页条数回到第一页，页签状态独立', () => {
  const page = component()
  page.load = () => {}
  page.current.page = 3
  page.filterChanged()
  assert.equal(page.current.page, 1)
  page.pageChanged({ current: 2, pageSize: 20 })
  assert.equal(page.current.page, 1)
  assert.equal(page.current.pageSize, 20)
  page.changeTab('tasks')
  assert.equal(page.current.pageSize, 10)
})

test('失败清除旧列表并展示错误，不能创建任务', async () => {
  const page = component({ listAnalysisRecords: async () => { throw new Error('演示模式未开启') } })
  page.current.items = [{ id: 1 }]
  await page.load()
  assert.equal(page.current.items.length, 0)
  assert.equal(page.dataReady, false)
  assert.equal(page.error, '演示模式未开启')
})

test('详情关闭后不接收迟到结果', async () => {
  let resolve
  const page = component({ getAnalysisRecord: () => new Promise(done => { resolve = done }) })
  const pending = page.openDetail(1)
  page.closeDetail()
  resolve({ code: 1, data: { id: 1 } })
  await pending
  assert.equal(page.detail, null)
  assert.equal(page.detailVisible, false)
})

test('新增成功跳转任务页并清除旧筛选', () => {
  const page = component()
  page.load = () => {}
  page.lists.tasks.symbol = 'BTC/USDT'
  page.creating = true
  page.createdTask()
  assert.equal(page.tab, 'tasks')
  assert.equal(page.current.symbol, '')
  assert.equal(page.creating, false)
})

test('正式数据库模式允许新增且不标成演示数据', async () => {
  const page = component({ listAnalysisRecords: async () => ({ ...response('BTC/USDT'), mode: 'database' }) })
  await page.load()
  assert.equal(page.dataReady, true)
  assert.equal(page.dataMode, 'database')
})

test('真实分析的全部五维状态都有中文映射', () => {
  const page = component()
  const states = 'STRONG_UP UP TURNING_UP SIDEWAYS TURNING_DOWN DOWN STRONG_DOWN NEUTRAL RANGE BREAKOUT BREAKDOWN RETEST PULLBACK REBOUND CONTINUATION REVERSAL FAILED_BREAKOUT FAILED_BREAKDOWN UNCLEAR BEAR_ALIGNED BEAR_CONVERGING BOTTOMING BULL_TRANSITION BULL_ALIGNED BULL_CONVERGING BEAR_TRANSITION MIXED LOW MID HIGH'.split(' ')
  for (const state of states) assert.match(page.stateLabel(state), /[\u4e00-\u9fff]/u, state)
  assert.equal(page.stateLabel('FUTURE_STATE'), 'FUTURE_STATE')
})
