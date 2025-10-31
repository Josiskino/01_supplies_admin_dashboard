<script setup>
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'

const router = useRouter()
const ability = useAbility()

// TODO: Get type from backend
const userData = useCookie('userData')

const logout = async () => {
  try {
    // Call logout endpoint first to invalidate the token on the server
    try {
      await $api('/auth/logout', {
        method: 'POST',
      })
    } catch (apiError) {
      // Continue with logout even if API call fails (e.g., network error, already logged out)
      console.warn('Logout API call failed, continuing with client-side logout:', apiError)
    }

    // Reset ability first to avoid reactive issues
    ability.update([])
    
    // Remove "userAbilities" from cookie
    useCookie('userAbilityRules').value = null

    // Remove "accessToken" from cookie
    useCookie('accessToken').value = null

    // Use nextTick to ensure reactive updates complete before navigation
    await nextTick()
    
    // Remove "userData" from cookie
    userData.value = null

    // Redirect to login page using replace to avoid history entry
    await nextTick()
    await router.replace({ name: 'auth-login' })
  } catch (error) {
    console.error('Logout error:', error)

    // Force redirect even if there's an error using route name
    try {
      await router.replace({ name: 'auth-login' })
    } catch {
      // If router fails, use window location as last resort
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
