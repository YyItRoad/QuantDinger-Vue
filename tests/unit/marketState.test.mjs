import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function newAnalysis (searchSymbols) {
  const source = fs.readFileSync(new URL('../../src/views/market-state/NewAnalysis.vue', import.meta.url), 'utf8')
    .split('<script>')[1].split('</script>')[0].replace(/^import .*$/gm, '').replace('export default', 'component =')
  let pending
  const sandbox = { searchSymbols, CRYPTO_EXCHANGE_IDS: ['binance'], setTimeout: fn => { pending = fn }, clearTimeout: () => { pending = null } }
  vm.runInNewContext(source, sandbox)
  const definition = sandbox.component
  const context = { ...definition.data() }
  for (const [key, fn] of Object.entries(definition.methods)) context[key] = fn.bind(context)
  return { context, flush: () => pending(), definition }
}

test('新增分析复用搜索接口并携带交易所和合约类型，空结果不能直接提交', async () => {
  let args
  const { context, flush } = newAnalysis(async value => { args = value; return { code: 1, data: [] } })
  context.search(' BTC ', true)
  await flush()
  assert.equal(args.keyword, 'BTC')
  assert.equal(args.exchange_id, 'binance')
  assert.equal(args.market_type, 'swap')
  assert.equal(context.searched, true)
  assert.equal(context.selected, null)
})

test('切换行情源重新检索，旧结果不得覆盖新行情源', async () => {
  const requests = []
  const { context, flush } = newAnalysis(() => new Promise(resolve => requests.push(resolve)))
  context.keyword = 'BTC'
  context.search('BTC')
  const first = flush()
  context.form.market_type = 'spot'
  context.resetSymbol()
  const second = flush()
  requests[1]({ code: 1, data: [{ symbol: 'BTC/USDT', instrument_id: 'spot' }] })
  await second
  requests[0]({ code: 1, data: [{ symbol: 'BTC/USDT', instrument_id: 'swap' }] })
  await first
  assert.equal(context.symbols[0].instrument_id, 'spot')
})

test('关闭弹窗清除选择并忽略迟到请求，搜索异常可见', async () => {
  let resolve
  const { context, flush, definition } = newAnalysis(() => new Promise(done => { resolve = done }))
  context.keyword = 'BTC'
  context.search('BTC')
  const pending = flush()
  definition.watch.visible.call(context)
  resolve({ code: 1, data: [{ symbol: 'BTC/USDT' }] })
  await pending
  assert.equal(context.symbols.length, 0)
  assert.equal(context.selected, null)
  const failed = newAnalysis(async () => { throw new Error('搜索服务不可用') })
  failed.context.search('BTC')
  await failed.flush()
  assert.equal(failed.context.searchError, '搜索服务不可用')
  assert.equal(failed.context.searching, false)
})

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
const response = symbol => ({ code: 1, data: { items: [{ symbol }], symbols: [symbol], total: 1, page: 1 } })

test('立即分析只提交后台任务并切换到对应记录筛选', async () => {
  let resolve
  let calls = 0
  const page = component({ runAnalysisTask: () => { calls++; return new Promise(done => { resolve = done }) } })
  page.$message.success = () => {}
  page.load = async () => {}
  const row = { id: 5, market: 'Crypto', symbol: 'BTC/USDT', timeframe: '4h', enabled: false }
  const pending = page.runOnce(row)
  await page.runOnce(row)
  assert.equal(calls, 1)
  assert.equal(page.runningIds.includes(5), true)
  resolve({ code: 1, data: { task_id: 5, status: 'queued' } })
  await pending
  assert.equal(page.tab, 'records')
  assert.equal(page.lists.records.symbol, 'BTC/USDT')
  assert.equal(page.lists.records.timeframe, '4h')
  assert.equal(row.enabled, false)
  assert.equal(page.busyIds.length, 0)
})

test('立即分析失败不自动重试并释放按钮', async () => {
  let calls = 0
  const page = component({ runAnalysisTask: async () => { calls++; throw new Error('模型不可用') } })
  let message
  page.$message.error = text => { message = text }
  await page.runOnce({ id: 5, market: 'Crypto' })
  assert.equal(calls, 1)
  assert.equal(message, '模型不可用')
  assert.equal(page.busyIds.length, 0)
  assert.equal(page.runningIds.length, 0)
})

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

test('正式数据库响应成功后允许新增', async () => {
  const page = component({ listAnalysisRecords: async () => response('BTC/USDT') })
  await page.load()
  assert.equal(page.dataReady, true)
})

test('真实分析的全部五维状态都有中文映射', () => {
  const page = component()
  const states = 'STRONG_UP UP TURNING_UP SIDEWAYS TURNING_DOWN DOWN STRONG_DOWN NEUTRAL RANGE BREAKOUT BREAKDOWN RETEST PULLBACK REBOUND CONTINUATION REVERSAL FAILED_BREAKOUT FAILED_BREAKDOWN UNCLEAR BEAR_ALIGNED BEAR_CONVERGING BOTTOMING BULL_TRANSITION BULL_ALIGNED BULL_CONVERGING BEAR_TRANSITION MIXED LOW MID HIGH'.split(' ')
  for (const state of states) assert.match(page.stateLabel(state), /[\u4e00-\u9fff]/u, state)
  assert.equal(page.stateLabel('FUTURE_STATE'), 'FUTURE_STATE')
})
