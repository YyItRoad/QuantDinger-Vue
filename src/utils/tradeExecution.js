export function formatExecutionNumber (value) {
  if (value === null || value === undefined || value === '') return '--'
  const number = Number(value)
  if (!Number.isFinite(number)) return '--'
  return new Intl.NumberFormat('en-US', { maximumSignificantDigits: 15 }).format(number)
}

export function formatExecutionPrice (value) {
  if (value === null || value === undefined || value === '') return '--'
  const number = Number(value)
  if (!Number.isFinite(number)) return '--'
  const options = Math.abs(number) >= 1 || number === 0
    ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : { maximumSignificantDigits: 6 }
  return new Intl.NumberFormat('en-US', options).format(number)
}

export function formatPriceDeviation (value) {
  if (value === null || value === undefined || value === '') return '--'
  const number = Number(value)
  if (!Number.isFinite(number)) return '--'
  const sign = number > 0 ? '+' : number < 0 ? '-' : ''
  if (number !== 0 && Math.abs(number) < 0.0001) return `${sign}<0.0001%`
  return `${sign}${Math.abs(number).toFixed(4)}%`
}

export function formatTradeMoney (value, signed = false) {
  if (value === null || value === undefined || value === '') return '--'
  const number = Number(value)
  if (!Number.isFinite(number)) return '--'
  const absolute = Math.abs(number)
  const sign = signed && number !== 0 ? (number > 0 ? '+' : '-') : ''
  if (absolute > 0 && absolute < 0.000001) return `${sign}<$0.000001`
  const digits = absolute > 0 && absolute < 0.01 ? 6 : 2
  return `${sign}$${absolute.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: digits })}`
}
