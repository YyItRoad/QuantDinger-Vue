const ACTIVE_ORDER_STATUSES = new Set([
  'accepted',
  'new',
  'partially_filled',
  'pending_new'
])

const NEUTRAL_FINAL_ORDER_STATUSES = new Set([
  'canceled',
  'cancelled',
  'done_for_day',
  'expired'
])

export function brokerOrderStatusColor (status) {
  const value = String(status || '').trim().toLowerCase()
  if (value === 'filled') return 'green'
  if (value === 'rejected') return 'red'
  if (ACTIVE_ORDER_STATUSES.has(value)) return 'blue'
  if (NEUTRAL_FINAL_ORDER_STATUSES.has(value)) return undefined
  return 'orange'
}

export function brokerOrderCanCancel (record, brokerId = 'alpaca') {
  if (!record || !record.id) return false
  const status = String(record.status || '').trim().toLowerCase()
  const statuses = brokerId === 'ibkr'
    ? ['submitted', 'presubmitted', 'pendingsubmit', 'pending_submit']
    : ['new', 'accepted', 'pending_new', 'partially_filled', 'accepted_for_bidding']
  return statuses.includes(status)
}
