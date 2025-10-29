import { createFetch } from '@vueuse/core'
import { destr } from 'destr'

export const useApi = createFetch({
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  fetchOptions: {
    headers: {
      Accept: 'application/json',
    },
  },
  options: {
    refetch: true,
    async beforeFetch({ options }) {
      const accessToken = useCookie('accessToken').value
      if (accessToken) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${accessToken}`,
        }
      }
      
      return { options }
    },
    afterFetch(ctx) {
      const { data, response } = ctx

      // Parse data if it's JSON
      let parsedData = null
      try {
        parsedData = destr(data)
      }
      catch (error) {
        console.error(error)
      }
      
      return { data: parsedData, response }
    },
    onFetchError(ctx) {
      const { response } = ctx
      
      // Handle authentication errors (401 Unauthorized, 403 Forbidden)
      if (response && (response.status === 401 || response.status === 403)) {
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
      
      return ctx
    },
  },
})
