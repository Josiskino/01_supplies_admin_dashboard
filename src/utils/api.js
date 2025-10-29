import { ofetch } from 'ofetch'

export const $api = ofetch.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  async onRequest({ options }) {
    const accessToken = useCookie('accessToken').value
    if (accessToken) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      }
    }
  },
  async onResponseError({ response }) {
    // Handle authentication errors (401 Unauthorized, 403 Forbidden)
    if (response.status === 401 || response.status === 403) {
      console.warn('Authentication error detected. Clearing invalid tokens...')
      
      // Clear invalid tokens
      useCookie('accessToken').value = null
      useCookie('userData').value = null
      useCookie('userAbilityRules').value = null
      
      // Redirect to login page if we're not already there
      const router = useRouter()
      const currentRoute = router.currentRoute.value
      if (currentRoute.name !== 'auth-login' && currentRoute.name !== 'template-login') {
        router.push({
          name: 'auth-login',
          query: { to: currentRoute.fullPath !== '/' ? currentRoute.path : undefined },
        })
      }
    }
  },
})
