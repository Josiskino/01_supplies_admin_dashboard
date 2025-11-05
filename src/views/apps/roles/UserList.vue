<script setup>
import { useI18n } from 'vue-i18n'
import AddNewUserDrawer from '@/views/apps/user/list/AddNewUserDrawer.vue'

const { t } = useI18n()

// 👉 Store
const searchQuery = ref('')
const selectedRole = ref()
const selectedStatus = ref()

// Data table options
const itemsPerPage = ref(10)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()
const selectedRows = ref([])
const isLoading = ref(false)

const updateOptions = options => {
  sortBy.value = options.sortBy[0]?.key
  orderBy.value = options.sortBy[0]?.order
}

// Headers
const headers = computed(() => [
  {
    title: '#',
    key: 'index',
    sortable: false,
    width: '60px',
  },
  {
    title: t('User'),
    key: 'user',
  },
  {
    title: t('Role'),
    key: 'role',
  },
  {
    title: t('Email'),
    key: 'email',
  },
  {
    title: t('Status'),
    key: 'status',
  },
  {
    title: t('Actions'),
    key: 'actions',
    sortable: false,
  },
])

// Users data
const users = ref([])
const totalUsers = ref(0)

// Fetch users from API
const fetchUsers = async () => {
  isLoading.value = true
  try {
    const queryParams = {
      per_page: itemsPerPage.value,
      page: page.value,
    }

    if (searchQuery.value) {
      queryParams.search = searchQuery.value
    }
    if (selectedStatus.value) {
      queryParams.status = selectedStatus.value
    }
    if (selectedRole.value) {
      queryParams.role = selectedRole.value
    }

    const queryString = new URLSearchParams(queryParams).toString()
    const url = `/users${queryString ? `?${queryString}` : ''}`

    const response = await $api(url, {
      method: 'GET',
    })

    // Handle response structure
    if (response && response.data && Array.isArray(response.data)) {
      users.value = response.data
      const metaTotal = response.meta?.total
      if (Array.isArray(metaTotal) && metaTotal.length > 0) {
        totalUsers.value = metaTotal[0]
      } else if (typeof metaTotal === 'number') {
        totalUsers.value = metaTotal
      } else {
        totalUsers.value = response.data.length
      }
    } else if (Array.isArray(response)) {
      // Response is directly an array
      users.value = response
      totalUsers.value = response.length
    } else {
      users.value = []
      totalUsers.value = 0
    }
  } catch (error) {
    console.error('Error fetching users:', error)
    users.value = []
    totalUsers.value = 0
  } finally {
    isLoading.value = false
  }
}

// Fetch roles from API (for filter)
const roles = ref([])
const fetchRoles = async () => {
  try {
    const response = await $api('/roles', {
      method: 'GET',
    })
    
    if (response && response.data && Array.isArray(response.data)) {
      roles.value = response.data.map(role => ({
        title: role.name,
        value: role.id,
      }))
    } else if (Array.isArray(response)) {
      roles.value = response.map(role => ({
        title: role.name,
        value: role.id,
      }))
    }
  } catch (error) {
    console.error('Error fetching roles:', error)
    // Fallback to static roles
    roles.value = [
      { title: 'Admin', value: 'admin' },
      { title: 'Author', value: 'author' },
      { title: 'Editor', value: 'editor' },
      { title: 'Maintainer', value: 'maintainer' },
      { title: 'Subscriber', value: 'subscriber' },
    ]
  }
}

// Helper function to get initials from name
const avatarText = name => {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return name[0].toUpperCase()
}

// Watch for changes to trigger fetch
watch([searchQuery, selectedRole, selectedStatus, page, itemsPerPage], () => {
  fetchUsers()
})

// Load on mount
onMounted(() => {
  fetchUsers()
  fetchRoles()
})

// Helper to get role name from user
const getUserRole = user => {
  if (user.roles && user.roles.length > 0) {
    return user.roles[0].name
  }
  return t('No Role')
}

// Helper to get role variant based on role name
const resolveUserRoleVariant = roleName => {
  if (!roleName) {
    return {
      color: 'secondary',
      icon: 'tabler-user',
    }
  }
  
  const roleLowerCase = roleName.toLowerCase()
  if (roleLowerCase.includes('admin') || roleLowerCase.includes('super'))
    return {
      color: 'error',
      icon: 'tabler-device-laptop',
    }
  if (roleLowerCase.includes('author'))
    return {
      color: 'warning',
      icon: 'tabler-settings',
    }
  if (roleLowerCase.includes('maintainer'))
    return {
      color: 'success',
      icon: 'tabler-chart-donut',
    }
  if (roleLowerCase.includes('editor'))
    return {
      color: 'info',
      icon: 'tabler-pencil',
    }
  if (roleLowerCase.includes('subscriber'))
    return {
      color: 'primary',
      icon: 'tabler-user',
    }
  
  return {
    color: 'primary',
    icon: 'tabler-user',
  }
}

const resolveUserStatusVariant = status => {
  if (!status) return 'secondary'
  
  // Handle both string and object status
  const statusName = typeof status === 'string' ? status : status.name
  const statLowerCase = statusName?.toLowerCase() || ''
  
  if (statLowerCase.includes('pending') || statLowerCase.includes('en attente'))
    return 'warning'
  if (statLowerCase.includes('active') || statLowerCase.includes('actif'))
    return 'success'
  if (statLowerCase.includes('inactive') || statLowerCase.includes('inactif'))
    return 'secondary'
  
  return 'primary'
}

// Helper to get status name
const getStatusName = status => {
  if (!status) return t('Unknown')
  return typeof status === 'string' ? status : status.name || t('Unknown')
}

const isAddNewUserDrawerVisible = ref(false)

const addNewUser = async userData => {
  await $api('/users', {
    method: 'POST',
    body: userData,
  })

  // refetch User
  fetchUsers()
}

const deleteUser = async id => {
  await $api(`/users/${ id }`, { method: 'DELETE' })

  // Delete from selectedRows
  const index = selectedRows.value.findIndex(row => row === id)
  if (index !== -1)
    selectedRows.value.splice(index, 1)

  // refetch User
  fetchUsers()
}
</script>

<template>
  <section>
    <VCard>
      <VCardText class="d-flex flex-wrap gap-4">
        <div class="d-flex gap-2 align-center">
          <p class="text-body-1 mb-0">
            {{ $t('Show') }}
          </p>
          <AppSelect
            :model-value="itemsPerPage"
            :items="[
              { value: 10, title: '10' },
              { value: 25, title: '25' },
              { value: 50, title: '50' },
              { value: 100, title: '100' },
              { value: -1, title: $t('All') },
            ]"
            style="inline-size: 5.5rem;"
            @update:model-value="itemsPerPage = parseInt($event, 10)"
          />
        </div>

        <VSpacer />

        <div class="d-flex align-center flex-wrap gap-4">
          <!-- 👉 Search  -->
          <AppTextField
            v-model="searchQuery"
            :placeholder="$t('Search User')"
            style="inline-size: 15.625rem;"
          />

          <!-- 👉 Add user button -->
          <AppSelect
            v-model="selectedRole"
            :placeholder="$t('Select Role')"
            :items="roles"
            clearable
            clear-icon="tabler-x"
            style="inline-size: 10rem;"
          />
        </div>
      </VCardText>

      <VDivider />

      <!-- SECTION datatable -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:model-value="selectedRows"
        v-model:page="page"
        :items-per-page-options="[
          { value: 10, title: '10' },
          { value: 20, title: '20' },
          { value: 50, title: '50' },
          { value: -1, title: '$vuetify.dataFooter.itemsPerPageAll' },
        ]"
        :items="users"
        :items-length="totalUsers"
        :headers="headers"
        :loading="isLoading"
        class="text-no-wrap"
        show-select
        @update:options="updateOptions"
      >
        <!-- User -->
        <template #item.user="{ item }">
          <div class="d-flex align-center gap-x-4">
            <VAvatar
              size="34"
              variant="tonal"
              :color="resolveUserRoleVariant(getUserRole(item)).color"
            >
              <span>{{ avatarText(item.name) }}</span>
            </VAvatar>
            <div class="d-flex flex-column">
              <h6 class="text-base">
                <RouterLink
                  :to="{ name: 'template-apps-user-view-id', params: { id: item.id } }"
                  class="font-weight-medium text-link"
                >
                  {{ item.name || t('Unknown') }}
                </RouterLink>
              </h6>
              <div class="text-sm text-medium-emphasis">
                {{ item.email || t('N/A') }}
              </div>
              <div
                v-if="item.phone"
                class="text-xs text-medium-emphasis"
              >
                {{ item.phone }}
              </div>
            </div>
          </div>
        </template>

        <!-- 👉 Role -->
        <template #item.role="{ item }">
          <div class="d-flex align-center gap-x-2">
            <VIcon
              :size="22"
              :icon="resolveUserRoleVariant(getUserRole(item)).icon"
              :color="resolveUserRoleVariant(getUserRole(item)).color"
            />

            <div class="text-high-emphasis text-body-1">
              {{ getUserRole(item) }}
            </div>
          </div>
        </template>

        <!-- Index/Counter -->
        <template #item.index="{ index }">
          <span class="text-high-emphasis font-weight-medium">
            {{ (page - 1) * itemsPerPage + index + 1 }}
          </span>
        </template>

        <!-- Email -->
        <template #item.email="{ item }">
          <div class="text-body-1 text-high-emphasis">
            {{ item.email }}
          </div>
        </template>

        <!-- Status -->
        <template #item.status="{ item }">
          <VChip
            :color="resolveUserStatusVariant(item.status)"
            size="small"
            label
            class="text-capitalize"
          >
            {{ getStatusName(item.status) }}
          </VChip>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <IconBtn @click="deleteUser(item.id)">
            <VIcon icon="tabler-trash" />
          </IconBtn>

          <IconBtn>
            <VIcon icon="tabler-eye" />
          </IconBtn>

          <VBtn
            icon
            variant="text"
            color="medium-emphasis"
          >
            <VIcon icon="tabler-dots-vertical" />
            <VMenu activator="parent">
              <VList>
                <VListItem :to="{ name: 'template-apps-user-view-id', params: { id: item.id } }">
                  <template #prepend>
                    <VIcon icon="tabler-eye" />
                  </template>

                  <VListItemTitle>{{ $t('View') }}</VListItemTitle>
                </VListItem>

                <VListItem link>
                  <template #prepend>
                    <VIcon icon="tabler-pencil" />
                  </template>
                  <VListItemTitle>{{ $t('Edit') }}</VListItemTitle>
                </VListItem>

                <VListItem @click="deleteUser(item.id)">
                  <template #prepend>
                    <VIcon icon="tabler-trash" />
                  </template>
                  <VListItemTitle>{{ $t('Delete') }}</VListItemTitle>
                </VListItem>
              </VList>
            </VMenu>
          </VBtn>
        </template>

        <template #bottom>
          <TablePagination
            v-model:page="page"
            :items-per-page="itemsPerPage"
            :total-items="totalUsers"
          />
        </template>
      </VDataTableServer>
      <!-- SECTION -->
    </VCard>

    <!-- 👉 Add New User -->
    <AddNewUserDrawer
      v-model:isDrawerOpen="isAddNewUserDrawerVisible"
      @user-data="addNewUser"
    />
  </section>
</template>

<style lang="scss">
.text-capitalize {
  text-transform: capitalize;
}

.user-list-name:not(:hover) {
  color: rgba(var(--v-theme-on-background), var(--v-medium-emphasis-opacity));
}
</style>
