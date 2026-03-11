<script setup>
import { getFilteredNavigation } from '@/navigation/vertical/dashboard'
import { echo } from '@/plugins/echo'
import { themeConfig } from '@themeConfig'

// Components
import Footer from '@/layouts/components/Footer.vue'
import NavBarNotifications from '@/layouts/components/NavBarNotifications.vue'
import NavSearchBar from '@/layouts/components/NavSearchBar.vue'
import NavbarShortcuts from '@/layouts/components/NavbarShortcuts.vue'
import NavbarThemeSwitcher from '@/layouts/components/NavbarThemeSwitcher.vue'
import UserProfile from '@/layouts/components/UserProfile.vue'
import NavBarI18n from '@core/components/I18n.vue'

// @layouts plugin
import { VerticalNavLayout } from '@layouts'

// ─── Navigation ────────────────────────────────────────────────────────────

const userDataCookie = useCookie('userData')
const navItemsKey    = ref(0)

watch(userDataCookie, () => { navItemsKey.value++ }, { deep: true })

const navItems = computed(() => {
  navItemsKey.value
  return getFilteredNavigation()
})

// ─── Toast global : opt-out notifications ──────────────────────────────────

const optOutToast        = ref(false)
const optOutToastText    = ref('')
const optOutToastColor   = ref('info')

const handleOptOutChange = ({ action, opt_out }) => {
  const phone = opt_out?.phone ?? ''

  if (action === 'added') {
    optOutToastText.value  = `🔕 ${phone} ne recevra plus de notifications WhatsApp`
    optOutToastColor.value = 'warning'
  } else if (action === 'updated') {
    optOutToastText.value  = `✏️ Exclusion mise à jour pour ${phone}`
    optOutToastColor.value = 'info'
  } else if (action === 'removed') {
    optOutToastText.value  = `🔔 ${phone} recevra de nouveau les notifications WhatsApp`
    optOutToastColor.value = 'success'
  }

  optOutToast.value = true
}

onMounted(() => {
  echo.channel('notification-opt-outs')
    .listen('.notification-opt-out-changed', handleOptOutChange)
})

onUnmounted(() => {
  echo.leave('notification-opt-outs')
})
</script>

<template>
  <VerticalNavLayout :nav-items="navItems">
    <!-- 👉 navbar -->
    <template #navbar="{ toggleVerticalOverlayNavActive }">
      <div class="d-flex h-100 align-center">
        <IconBtn
          id="vertical-nav-toggle-btn"
          class="ms-n3 d-lg-none"
          @click="toggleVerticalOverlayNavActive(true)"
        >
          <VIcon
            size="26"
            icon="tabler-menu-2"
          />
        </IconBtn>

        <NavSearchBar class="ms-lg-n3" />

        <VSpacer />

        <NavBarI18n
          v-if="themeConfig.app.i18n.enable && themeConfig.app.i18n.langConfig?.length"
          :languages="themeConfig.app.i18n.langConfig"
        />
        <NavbarThemeSwitcher />
        <NavbarShortcuts />
        <NavBarNotifications class="me-1" />
        <UserProfile />
      </div>
    </template>

    <!-- 👉 Pages -->
    <slot />

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>

    <!-- 👉 Customizer -->
    <TheCustomizer />
  </VerticalNavLayout>

  <!-- 👉 Toast global opt-out notifications -->
  <VSnackbar
    v-model="optOutToast"
    :color="optOutToastColor"
    :timeout="5000"
    location="bottom end"
    min-width="320"
  >
    {{ optOutToastText }}
  </VSnackbar>
</template>
