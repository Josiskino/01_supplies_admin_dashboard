import { ofetch } from 'ofetch'

// Get base URL with fallback to production API
let baseURL = import.meta.env.VITE_API_BASE_URL

// If not set, use the production API URL
if (!baseURL) {
  baseURL = 'https://adapi.01supplies.com/api'
}

// Handle relative URLs (convert to absolute for production)
if (baseURL.startsWith('/')) {
  // If relative, use current origin (for development)
  if (typeof window !== 'undefined') {
    baseURL = `${window.location.origin}${baseURL}`
  } else {
    baseURL = '/api'
  }
}

// Ensure baseURL doesn't end with /
const cleanBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL

export const $api = ofetch.create({
  baseURL: cleanBaseURL,
  async onRequest({ options }) {
    const accessToken = useCookie('accessToken').value
    if (accessToken) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      }
    }
    // Always request JSON
    options.headers = {
      ...options.headers,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
  },
  async onResponse({ response }) {
    // Check if response is HTML instead of JSON (common error when API base URL is wrong)
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('text/html')) {
      console.error('❌ ERROR: API returned HTML instead of JSON!')
      console.error('Base URL:', cleanBaseURL)
      console.error('This usually means:')
      console.error('1. The API base URL is incorrect')
      console.error('2. The backend server is not running')
      console.error('3. The request is being routed to the frontend instead of the backend')
      throw new Error('API returned HTML instead of JSON. Please check API configuration.')
    }
  },
  async onResponseError({ response }) {
    // Check if error response is HTML
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('text/html')) {
      console.error('❌ ERROR: API error response is HTML instead of JSON!')
      console.error('Base URL:', cleanBaseURL)
      console.error('Status:', response.status)
      throw new Error('API error response is HTML. Please check API configuration and backend server.')
    }
    
    // Handle authentication errors (401 Unauthorized, 403 Forbidden)
    if (response.status === 401 || response.status === 403) {
      console.warn('Authentication error detected. Clearing invalid tokens...')

      // Clear invalid tokens
      useCookie('accessToken').value = null
      useCookie('userData').value = null
      useCookie('userAbilityRules').value = null

      // Redirect to login page if we're not already there
      try {
        const router = useRouter()
        const currentRoute = router.currentRoute.value
        if (currentRoute.name !== 'auth-login' && currentRoute.name !== 'template-login') {
          router.push({
            name: 'auth-login',
            query: { to: currentRoute.fullPath !== '/' ? currentRoute.path : undefined },
          })
        }
      } catch {
        // Fallback when called outside Vue component context
        if (!window.location.pathname.includes('login')) {
          window.location.href = '/login'
        }
      }
    }
  },
})
