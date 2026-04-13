<script setup>
defineOptions({ inheritAttrs: false })

import { getFilteredNavigation } from '@/navigation/vertical/dashboard'
import { ability } from '@/plugins/casl/ability'
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

// ─── Permissions temps réel (Pusher) ───────────────────────────────────────

const userAbilityRulesCookie = useCookie('userAbilityRules')

const handlePermissionsUpdated = ({ permissions }) => {
  // Convertir les permissions backend en règles CASL
  // Ex: 'view-business-stats' → { action: 'view', subject: 'business-stats' }
  const newRules = (permissions || []).map(permission => {
    const firstDash = permission.indexOf('-')
    if (firstDash === -1) return { action: permission, subject: 'all' }

    return {
      action:  permission.substring(0, firstDash),
      subject: permission.substring(firstDash + 1),
    }
  })

  // Mettre à jour CASL → la navigation se recalcule automatiquement
  ability.update(newRules)
  userAbilityRulesCookie.value = newRules

  // Forcer le recalcul de la navigation
  navItemsKey.value++
}

onMounted(() => {
  echo.channel('notification-opt-outs')
    .listen('.notification-opt-out-changed', handleOptOutChange)

  // Écouter les changements de permissions sur le canal privé de l'utilisateur
  const userData = useCookie('userData').value
  if (userData?.id) {
    console.log('[Pusher] Subscribing to private channel:', `user.${userData.id}`)

    echo.private(`user.${userData.id}`)
      .listen('.UserPermissionsUpdated', (payload) => {
        console.log('[Pusher] UserPermissionsUpdated received:', payload)
        handlePermissionsUpdated(payload)
      })
      .error(err => {
        console.error('[Pusher] Private channel error:', err)
      })
  } else {
    console.warn('[Pusher] No userData.id found, skipping private channel subscription')
  }
})

onUnmounted(() => {
  echo.leave('notification-opt-outs')

  const userData = useCookie('userData').value
  if (userData?.id) {
    echo.leave(`user.${userData.id}`)
  }
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
