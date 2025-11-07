<script setup>
import { ofetch } from 'ofetch'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'

const router = useRouter()
const ability = useAbility()

// TODO: Get type from backend
const userData = useCookie('userData')

const logout = async () => {
  try {
    // Reset ability first to avoid reactive issues
    ability.update([])
    
    // Clear all cookies immediately
    const accessTokenCookie = useCookie('accessToken')
    const userDataCookie = useCookie('userData')
    const userAbilityRulesCookie = useCookie('userAbilityRules')
    
    // Store token before clearing (for logout API call)
    const token = accessTokenCookie.value
    
    // Clear cookies immediately
    accessTokenCookie.value = null
    userDataCookie.value = null
    userAbilityRulesCookie.value = null
    
    // Call logout endpoint to invalidate the token on the server (optional)
    if (token) {
      try {
        // Use ofetch directly to avoid the automatic token injection
        await ofetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      } catch (apiError) {
        // Ignore errors - token might already be invalid
        console.warn('Logout API call failed (this is OK):', apiError)
      }
    }

    // Use nextTick to ensure reactive updates complete
    await nextTick()
    
    // Force redirect to login page
    await router.replace({ name: 'auth-login' })
  } catch (error) {
    console.error('Logout error:', error)

    // Force clear cookies even if there's an error
    useCookie('accessToken').value = null
    useCookie('userData').value = null
    useCookie('userAbilityRules').value = null

    // Force redirect
    try {
      await router.replace({ name: 'auth-login' })
    } catch {
      window.location.href = '/app/auth/login'
    }
  }
}

const userProfileList = [
  { type: 'divider' },
  {
    type: 'navItem',
    icon: 'tabler-user',
    title: 'Profile',
    to: {
      name: 'auth-profile',
    },
  },
  {
    type: 'navItem',
    icon: 'tabler-settings',
    title: 'Settings',
    to: {
      name: 'template-pages-account-settings-tab',
      params: { tab: 'account' },
    },
  },
]
</script>

<template>
  <VBadge
    v-if="userData"
    dot
    bordered
    location="bottom right"
    offset-x="1"
    offset-y="2"
    color="success"
  >
    <VAvatar
      size="38"
      class="cursor-pointer"
      :color="!(userData && userData.avatar) ? 'primary' : undefined"
      :variant="!(userData && userData.avatar) ? 'tonal' : undefined"
    >
      <VImg
        v-if="userData && userData.avatar"
        :src="userData.avatar"
      />
      <VIcon
        v-else
        icon="tabler-user"
      />

      <!-- SECTION Menu -->
      <VMenu
        activator="parent"
        width="240"
        location="bottom end"
        offset="12px"
      >
        <VList>
          <VListItem>
            <div class="d-flex gap-2 align-center">
              <VListItemAction>
                <VBadge
                  dot
                  location="bottom right"
                  offset-x="3"
                  offset-y="3"
                  color="success"
                  bordered
                >
                  <VAvatar
                    :color="!(userData && userData.avatar) ? 'primary' : undefined"
                    :variant="!(userData && userData.avatar) ? 'tonal' : undefined"
                  >
                    <VImg
                      v-if="userData && userData.avatar"
                      :src="userData.avatar"
                    />
                    <VIcon
                      v-else
                      icon="tabler-user"
                    />
                  </VAvatar>
                </VBadge>
              </VListItemAction>

              <div>
                <h6 class="text-h6 font-weight-medium">
                  {{ userData.name || userData.fullName || userData.username }}
                </h6>
                <VListItemSubtitle class="text-disabled">
                  {{ userData.email }}
                </VListItemSubtitle>
              </div>
            </div>
          </VListItem>

          <PerfectScrollbar :options="{ wheelPropagation: false }">
            <template
              v-for="item in userProfileList"
              :key="item.title"
            >
              <VListItem
                v-if="item.type === 'navItem'"
                :to="item.to"
              >
                <template #prepend>
                  <VIcon
                    :icon="item.icon"
                    size="22"
                  />
                </template>

                <VListItemTitle>{{ item.title }}</VListItemTitle>

                <template
                  v-if="item.badgeProps"
                  #append
                >
                  <VBadge
                    rounded="sm"
                    class="me-3"
                    v-bind="item.badgeProps"
                  />
                </template>
              </VListItem>

              <VDivider
                v-else
                class="my-2"
              />
            </template>

            <div class="px-4 py-2">
              <VBtn
                block
                size="small"
                color="error"
                append-icon="tabler-logout"
                @click="logout"
              >
                Logout
              </VBtn>
            </div>
          </PerfectScrollbar>
        </VList>
      </VMenu>
      <!-- !SECTION -->
    </VAvatar>
  </VBadge>
</template>
