<script setup>
import authV1BottomShape from '@images/svg/auth-v1-bottom-shape.svg?raw'
import authV1TopShape from '@images/svg/auth-v1-top-shape.svg?raw'
import { VNodeRenderer } from '@layouts/components/VNodeRenderer'
import { themeConfig } from '@themeConfig'
import { ofetch } from 'ofetch'

definePage({
  meta: {
    layout: 'blank',
    public: true,
  },
})

const form = ref({
  email: '',
  password: '',
  remember: false,
})

const isPasswordVisible = ref(false)
const isLoading = ref(false)

const errors = ref({
  email: undefined,
  password: undefined,
})

const router = useRouter()
const ability = useAbility()

const login = async () => {
  isLoading.value = true
  errors.value = {
    email: undefined,
    password: undefined,
  }
  
  // Clear any existing tokens before login
  useCookie('accessToken').value = null
  useCookie('userData').value = null
  useCookie('userAbilityRules').value = null
  
  try {
    // Build login URL - Use absolute URL for Firebase Hosting
    // VITE_API_BASE_URL should be something like: https://adapi.01supplies.com/api or https://adapi.01supplies.com/api/v1
    let baseURL = import.meta.env.VITE_API_BASE_URL
    
    // If not set, use the production API URL
    if (!baseURL) {
      baseURL = 'https://adapi.01supplies.com/api'
    }
    
    // Handle relative URLs (convert to absolute)
    if (baseURL.startsWith('/')) {
      // If relative, use current origin (for development)
      baseURL = `${window.location.origin}${baseURL}`
    }
    
    // Ensure baseURL doesn't end with /
    const cleanBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
    
    // Check if baseURL already contains /v1
    const hasV1 = cleanBaseURL.includes('/v1')
    
    // Build login path - only add /v1 if not already in baseURL
    const loginPath = hasV1 ? '/auth/login' : '/v1/auth/login'
    const loginUrl = `${cleanBaseURL}${loginPath}`
    
    console.log('=== Login Request ===')
    console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL)
    console.log('Base URL:', baseURL)
    console.log('Clean Base URL:', cleanBaseURL)
    console.log('Has /v1:', hasV1)
    console.log('Login Path:', loginPath)
    console.log('Login URL:', loginUrl)
    console.log('Email:', form.value.email)
    console.log('Password (plain text):', form.value.password || 'empty')
    console.log('Password length:', form.value.password ? form.value.password.length : 0)
    console.log('====================')
    
    // Prepare request body
    const requestBody = {
      email: form.value.email,
      password: form.value.password,
    }
    
    console.log('=== Request Body ===')
    console.log('Email:', requestBody.email)
    console.log('Password:', requestBody.password)
    console.log('Password char codes:', requestBody.password ? requestBody.password.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' ') : 'N/A')
    console.log('===================')
    
    // Serialize body to JSON string explicitly
    const jsonBody = JSON.stringify(requestBody)
    
    console.log('=== JSON Body String ===')
    console.log('JSON:', jsonBody)
    console.log('========================')
    
    // Use ofetch directly for login to avoid automatic token injection
    const res = await ofetch(loginUrl, {
      method: 'POST',
      body: jsonBody,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
    
    console.log('=== Login Response ===')
    console.log('Response:', res)
    console.log('=====================')

    // Check if response exists
    if (!res) {
      console.error('No response from server')
      errors.value = { email: ['Failed to connect to server'] }

      return
    }

    // Handle backend response format: { success, message, data: { token, user } }
    let accessToken, userData, userAbilityRules

    // Check if the response indicates an error
    if (!res.success) {
      // Handle error response
      const errorMessage = res.message || 'Login failed. Please try again.'
      if (res.errors) {
        errors.value = res.errors
      } else {
        errors.value = { email: [errorMessage] }
      }

      return
    }

    if (res.success && res.data) {
      // Your backend format
      accessToken = res.data.token
      userData = res.data.user

      // Convert permissions from backend format to CASL format
      // Backend: ['create-delivery', 'view-delivery']
      // CASL needs: [{ action: 'create', subject: 'delivery' }, ...]
      const permissions = userData?.permissions || []

      userAbilityRules = permissions.map(permission => {
        const [action, subject] = permission.split('-')

        return { action, subject }
      })
    } else if (res.accessToken) {
      // Old format (for backwards compatibility)
      accessToken = res.accessToken
      userData = res.userData
      userAbilityRules = res.userAbilityRules
    } else {
      console.error('Invalid response format:', res)
      errors.value = { email: ['Invalid server response'] }

      return
    }

    // Validate required data
    if (!accessToken || !userData) {
      console.error('Missing required data:', { accessToken, userData })
      errors.value = { email: ['Invalid server response'] }
      
      return
    }

    console.log('Parsed ability rules:', userAbilityRules)

    // Store data
    useCookie('userAbilityRules').value = userAbilityRules || []
    if (userAbilityRules && userAbilityRules.length > 0)
      ability.update(userAbilityRules)
    useCookie('userData').value = userData
    useCookie('accessToken').value = accessToken
    
    // Redirect to dashboard after login
    await nextTick(() => {
      router.replace({ name: 'dashboard' })
    })
  } catch (err) {
    console.error('Login error:', err)
    console.error('Error response:', err.response)
    console.error('Error data:', err.response?._data)
    console.error('Error status:', err.response?.status)

    // Handle error response from ofetch
    // ofetch stores response data in response._data
    if (err.response && err.response._data) {
      const errorData = err.response._data
      
      console.log('Processing error data:', errorData)
      console.log('errorData.errors:', errorData.errors)
      console.log('errorData.errors type:', typeof errorData.errors)
      console.log('errorData.message:', errorData.message)
      
      // Laravel validation errors format: { errors: { email: [...], password: [...] } }
      if (errorData.errors) {
        // Check if errors.email exists first (most common case)
        if (errorData.errors.email) {
          console.log('Found errors.email:', errorData.errors.email)
          errors.value = { 
            email: Array.isArray(errorData.errors.email) 
              ? errorData.errors.email 
              : [errorData.errors.email],
          }
        }

        // Check if errors is an object with email/password arrays (but email not directly accessible)
        else if (typeof errorData.errors === 'object' && !Array.isArray(errorData.errors)) {
          console.log('Found errors object:', errorData.errors)
          errors.value = errorData.errors
        }

        // If errors is an array, wrap it
        else if (Array.isArray(errorData.errors)) {
          console.log('Found errors array:', errorData.errors)
          errors.value = { email: errorData.errors }
        }

        // If errors has a message property
        else if (errorData.errors.message) {
          console.log('Found errors.message:', errorData.errors.message)
          errors.value = { email: [errorData.errors.message] }
        }

        // Fallback: use message if available
        else if (errorData.message) {
          console.log('Using message from errorData:', errorData.message)
          errors.value = { email: [errorData.message] }
        }
        else {
          console.log('No valid errors found, using fallback')
          errors.value = { email: ['Les identifiants fournis sont incorrects.'] }
        }
      }

      // Laravel error message format: { message: "..." }
      else if (errorData.message) {
        console.log('Found message:', errorData.message)
        errors.value = { email: [errorData.message] }
      } 
      else {
        console.log('No errors or message found, using fallback')
        errors.value = { email: ['Les identifiants fournis sont incorrects.'] }
      }
    } else if (err.message) {
      console.log('Using error message:', err.message)
      errors.value = { email: [err.message] }
    } else {
      console.log('No error data found, using default message')
      errors.value = { email: ['Les identifiants fournis sont incorrects.'] }
    }
    
    console.log('Final errors.value:', errors.value)
    console.log('errors.value.email:', errors.value.email)
    console.log('errors.value.email[0]:', errors.value.email?.[0])
  } finally {
    isLoading.value = false
  }
}

const onSubmit = () => {
  login()
}
</script>

<template>
  <div class="auth-wrapper d-flex align-center justify-center pa-4">
    <div class="position-relative my-sm-16">
      <!-- 👉 Top shape -->
      <VNodeRenderer
        :nodes="h('div', { innerHTML: authV1TopShape })"
        class="text-primary auth-v1-top-shape d-none d-sm-block"
      />

      <!-- 👉 Bottom shape -->
      <VNodeRenderer
        :nodes="h('div', { innerHTML: authV1BottomShape })"
        class="text-primary auth-v1-bottom-shape d-none d-sm-block"
      />

      <!-- 👉 Auth Card -->
      <VCard
        class="auth-card"
        max-width="460"
        :class="$vuetify.display.smAndUp ? 'pa-6' : 'pa-0'"
      >
        <VCardItem class="justify-center">
          <VCardTitle>
            <RouterLink to="/">
              <div class="app-logo">
                <VNodeRenderer :nodes="themeConfig.app.logo" />
              </div>
            </RouterLink>
          </VCardTitle>
        </VCardItem>

        <VCardText>
          <h4 class="text-h4 mb-1">
            Welcome to <span class="text-capitalize">{{ themeConfig.app.title }}</span>! 👋🏻
          </h4>
          <p class="mb-0">
            Please sign-in to your account and start the adventure
          </p>
        </VCardText>

        <VCardText>
          <VForm @submit.prevent="onSubmit">
            <VRow>
              <!-- Error message -->
              <VCol 
                v-if="errors && errors.email && Array.isArray(errors.email) && errors.email[0]" 
                cols="12"
              >
                <VAlert
                  type="error"
                  variant="tonal"
                >
                  {{ errors.email[0] }}
                </VAlert>
              </VCol>

              <!-- email -->
              <VCol cols="12">
                <AppTextField
                  v-model="form.email"
                  autofocus
                  label="Email or Username"
                  type="email"
                  placeholder="johndoe@email.com"
                  :error-messages="errors?.email || []"
                />
              </VCol>

              <!-- password -->
              <VCol cols="12">
                <AppTextField
                  v-model="form.password"
                  label="Password"
                  placeholder="············"
                  :type="isPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  :error-messages="errors?.password || []"
                  @click:append-inner="isPasswordVisible = !isPasswordVisible"
                />

                <!-- remember me checkbox -->
                <div class="d-flex align-center justify-space-between flex-wrap my-6">
                  <VCheckbox
                    v-model="form.remember"
                    label="Remember me"
                  />

                  <!-- Forgot Password link commented out -->
                </div>

                <!-- login button -->
                <VBtn
                  block
                  type="submit"
                  :loading="isLoading"
                  :disabled="isLoading"
                >
                  Login
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </div>
  </div>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth";
</style>
