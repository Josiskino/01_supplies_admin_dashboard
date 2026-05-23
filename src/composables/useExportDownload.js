import { useCookie } from '@core/composable/useCookie'
import { ref } from 'vue'

const getBaseURL = () => {
  let baseURL = import.meta.env.VITE_API_BASE_URL || 'https://adapi.01supplies.com/api'
  if (baseURL.startsWith('/') && typeof window !== 'undefined') {
    baseURL = `${window.location.origin}${baseURL}`
  }
  return baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
}

const buildQueryString = (params = {}) => {
  const cleaned = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
  const qs = new URLSearchParams(cleaned).toString()
  return qs ? `?${qs}` : ''
}

const triggerBlobDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

export const useExportDownload = () => {
  const isLoading = ref(false)
  const error = ref(null)

  const download = async ({ endpoint, params = {}, filename = 'export.xlsx', method = 'GET', body = null }) => {
    isLoading.value = true
    error.value = null

    try {
      const baseURL = getBaseURL()
      const accessToken = useCookie('accessToken').value

      const init = {
        method,
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : '',
          Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json',
        },
      }

      // baseURL already contains /v1 (cf. utils/api.js used by ofetch elsewhere),
      // so don't prepend it again or we end up with /api/v1/v1/...
      const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
      let url = `${baseURL}${normalizedEndpoint}`

      if (method === 'GET') {
        url += buildQueryString(params)
      } else {
        init.headers['Content-Type'] = 'application/json'
        init.body = JSON.stringify(body ?? params)
      }

      const response = await fetch(url, init)

      if (!response.ok) {
        let message = `Erreur ${response.status}`
        try {
          const errorBody = await response.json()
          message = errorBody?.message || message
        } catch {
          // ignore parse errors
        }
        throw new Error(message)
      }

      const blob = await response.blob()
      triggerBlobDownload(blob, filename)
      return true
    } catch (e) {
      error.value = e?.message || 'Échec du téléchargement'
      console.error('Export download error:', e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, error, download }
}
