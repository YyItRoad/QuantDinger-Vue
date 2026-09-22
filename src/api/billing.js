import request from '@/utils/request'

const billingApi = {
  Plans: '/api/billing/plans',
  CryptoChains: '/api/billing/crypto/chains',
  CryptoCreate: '/api/billing/crypto/create',
  CryptoOrder: (id) => `/api/billing/crypto/order/${id}`,
  StripeCreate: '/api/billing/stripe/create',
  AdminPlans: '/api/billing/admin/plans',
  UsdtChains: '/api/billing/usdt/chains',
  UsdtCreate: '/api/billing/usdt/create',
  UsdtOrder: (id) => `/api/billing/usdt/order/${id}`
}

export function listCryptoChains (currency) {
  return request({ url: billingApi.CryptoChains, method: 'get', params: { currency } })
}

export function createCryptoOrder (plan, chain, currency) {
  return request({ url: billingApi.CryptoCreate, method: 'post', data: { plan, chain, currency } })
}

export function getCryptoOrder (orderId, refresh = true) {
  return request({ url: billingApi.CryptoOrder(orderId), method: 'get', params: { refresh: refresh ? 1 : 0 } })
}

export function createStripeCheckout (plan) {
  return request({ url: billingApi.StripeCreate, method: 'post', data: { plan } })
}

export function getAdminMembershipPlans () {
  return request({ url: billingApi.AdminPlans, method: 'get' })
}

export function saveAdminMembershipPlans (plans) {
  return request({ url: billingApi.AdminPlans, method: 'put', data: { plans } })
}

export function getMembershipPlans () {
  return request({
    url: billingApi.Plans,
    method: 'get'
  })
}

// v3.0.6+ : list enabled USDT chains so the frontend can render the chain
// picker. Chains without a configured receiving address are hidden by the
// backend, so the response can be rendered verbatim.
export function listUsdtChains () {
  return request({
    url: billingApi.UsdtChains,
    method: 'get'
  })
}

export function createUsdtOrder (plan, chain) {
  const data = { plan }
  if (chain) data.chain = chain
  return request({
    url: billingApi.UsdtCreate,
    method: 'post',
    data
  })
}

export function getUsdtOrder (orderId, refresh = true) {
  return request({
    url: billingApi.UsdtOrder(orderId),
    method: 'get',
    params: { refresh: refresh ? 1 : 0 }
  })
}
