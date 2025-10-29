<script setup>
import authV1BottomShape from '@images/svg/auth-v1-bottom-shape.svg?raw'
import authV1TopShape from '@images/svg/auth-v1-top-shape.svg?raw'
import { VNodeRenderer } from '@layouts/components/VNodeRenderer'
import { themeConfig } from '@themeConfig'

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
const errors = ref({
  email: undefined,
  password: undefined,
})
const router = useRouter()
const ability = useAbility()

const login = async () => {
  try {
    const res = await $api('/auth/login', {
      method: 'POST',
      body: {
        email: form.value.email,
        password: form.value.password,
      },
      onResponseError({ response }) {
        errors.value = response._data?.errors
      },
    })

    // Check if response exists
    if (!res) {
      console.error('No response from server')
      errors.value = { email: ['Failed to connect to server'] }
      return
    }

    console.log('Login response:', res)
    
    // Handle backend response format: { success, message, data: { token, user } }
    let accessToken, userData, userAbilityRules
    
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
    errors.value = { email: ['Login failed. Please try again.'] }
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
                <h1 class="app-logo-title">
                  {{ themeConfig.app.title }}
                </h1>
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
                v-if="errors.email && errors.email[0]" 
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
                  :error-messages="errors.email"
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
                  :error-messages="errors.password"
                  @click:append-inner="isPasswordVisible = !isPasswordVisible"
                />

                <!-- remember me checkbox -->
                <div class="d-flex align-center justify-space-between flex-wrap my-6">
                  <VCheckbox
                    v-model="form.remember"
                    label="Remember me"
                  />

                  <RouterLink
                    class="text-primary"
                    :to="{ name: 'auth-login-forgot-password' }"
                  >
                    Forgot Password?
                  </RouterLink>
                </div>

                <!-- login button -->
                <VBtn
                  block
                  type="submit"
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
