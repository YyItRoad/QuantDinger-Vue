import request from '@/utils/request'
const base = '/api/trade-plans'
export const listTradePlans = (params) => request({ url: base, params })
export const getTradePlan = (id) => request({ url: `${base}/${id}` })
export const listTradePlanVersions = (id) => request({ url: `${base}/${id}/versions` })
export const getTradePlanRequest = (id) => request({ url: `${base}/requests/${id}` })
export const saveTradePlan = (id, action, data) =>
  request({ url: id ? `${base}/${id}/${action}` : base, method: 'post', data })

export { listAnalysisRecords as listResearchRecords } from '@/api/market-state'

export const listTradePlanAccounts = () => request({ url: base + '/accounts' })
export const listTradePlanSources = (id, params) => request({ url: `${base}/${id}/sources`, params })
