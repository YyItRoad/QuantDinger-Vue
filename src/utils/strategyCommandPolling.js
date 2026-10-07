const delay = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds))

export async function waitForStrategyCommand (
  fetchStatus,
  { timeoutMs = 60000, intervalMs = 1000, sleep = delay, now = () => Date.now() } = {}
) {
  const deadline = now() + timeoutMs
  while (now() < deadline) {
    const response = await fetchStatus()
    const data = (response && response.data) || {}
    if (String(data.status || '') !== 'stopping') return response
    await sleep(intervalMs)
  }
  return null
}
