import request from '@/utils/request'

const base = '/api/market-state'
export const listAnalysisRecords = params => request({ url: base + '/records', params })
export const getAnalysisRecord = id => request({ url: base + '/records/' + id })
export const listAnalysisTasks = params => request({ url: base + '/tasks', params })
export const createAnalysisTask = data => request({ url: base + '/tasks', method: 'post', data })
export const setAnalysisTaskEnabled = (id, enabled) => request({ url: base + '/tasks/' + id, method: 'patch', data: { enabled } })
export const deleteAnalysisTask = id => request({ url: base + '/tasks/' + id, method: 'delete' })
export const runAnalysisTask = id => request({ url: base + '/tasks/' + id + '/run', method: 'post' })
