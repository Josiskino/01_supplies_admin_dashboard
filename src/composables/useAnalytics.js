import { $api } from '@/utils/api'
import { ref } from 'vue'

const cache = new Map()
const CACHE_TTL_MS = 60_000

const buildKey = (endpoint, params) => `${endpoint}?${new URLSearchParams(params || {}).toString()}`

const fromCache = key => {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return entry.value
}

const toCache = (key, value) => {
  cache.set(key, { at: Date.now(), value })
}

const callApi = async (endpoint, params = {}, { force = false } = {}) => {
  const key = buildKey(endpoint, params)
  if (!force) {
    const cached = fromCache(key)
    if (cached) return cached
  }

  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== ''),
  )
  const qs = new URLSearchParams(cleaned).toString()
  const url = qs ? `${endpoint}?${qs}` : endpoint

  const response = await $api(url, { method: 'GET' })
  const data = response?.data ?? response
  toCache(key, data)
  return data
}

export const useAnalytics = () => {
  const isLoading = ref(false)
  const error = ref(null)

  const wrap = fn => async (...args) => {
    isLoading.value = true
    error.value = null
    try {
      return await fn(...args)
    } catch (e) {
      error.value = e?.message || 'Erreur lors de la récupération des analytics'
      console.error('Analytics error:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    fetchGlobal:       wrap(params => callApi('/analytics/global', params)),
    fetchTopCustomers: wrap(params => callApi('/analytics/top-customers', params)),
    fetchTopPartners:  wrap(params => callApi('/analytics/top-partners', params)),
    fetchChurnedCustomers: wrap(params => callApi('/analytics/churned-customers', params)),
    fetchChurnedPartners:  wrap(params => callApi('/analytics/churned-partners', params)),
    fetchVariableCustomers: wrap(params => callApi('/analytics/variable-customers', params)),
    fetchVariablePartners:  wrap(params => callApi('/analytics/variable-partners', params)),
    fetchEntityTimeline: wrap(({ type, id, months = 12 }) => callApi(`/analytics/entity-timeline/${type}/${id}`, { months })),
    fetchSettings:       wrap(() => callApi('/analytics/settings', {}, { force: true })),
    updateSettings:      wrap(async settings => {
      const response = await $api('/analytics/settings', { method: 'PUT', body: settings })
      cache.clear()
      return response?.data ?? response
    }),
    invalidateCache: () => cache.clear(),
  }
}
