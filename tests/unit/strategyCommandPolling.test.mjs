import assert from 'node:assert/strict'
import test from 'node:test'
import { waitForStrategyCommand } from '../../src/utils/strategyCommandPolling.js'

test('command polling resolves when the worker confirms the stop', async () => {
  const responses = [
    { code: 1, data: { status: 'stopping' } },
    { code: 1, data: { status: 'stopped', command_status: 'succeeded' } }
  ]
  let clock = 0
  const result = await waitForStrategyCommand(
    async () => responses.shift(),
    {
      timeoutMs: 1000,
      intervalMs: 10,
      now: () => clock,
      sleep: async milliseconds => { clock += milliseconds }
    }
  )

  assert.equal(result.data.status, 'stopped')
  assert.equal(result.data.command_status, 'succeeded')
})

test('command polling returns null instead of claiming completion on timeout', async () => {
  let clock = 0
  const result = await waitForStrategyCommand(
    async () => ({ code: 1, data: { status: 'stopping' } }),
    {
      timeoutMs: 20,
      intervalMs: 10,
      now: () => clock,
      sleep: async milliseconds => { clock += milliseconds }
    }
  )

  assert.equal(result, null)
})
