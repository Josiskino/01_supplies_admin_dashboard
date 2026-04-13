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
    const url = `/users/staff${queryString ? `?${queryString}` : ''}`

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
    
    const rolesArray = response?.data?.roles ?? response?.data ?? response
    if (Array.isArray(rolesArray)) {
      roles.value = rolesArray.map(role => ({
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

// Edit user dialog — onglets : Infos / Rôle / Permissions
const isEditDialogOpen = ref(false)
const editingUser      = ref(null)
const editTab          = ref('info')
const isSavingEdit     = ref(false)
const editErrors       = ref({})
const editForm         = reactive({ name: '', email: '', phone: '' })

// Rôle
const editSelectedRole = ref(null)

// Permissions individuelles (matrice)
const SCREENS = [
  { subject: 'delivery',            label: 'Livraisons' },
  { subject: 'partner',             label: 'Partenaires' },
  { subject: 'driver',              label: 'Livreurs' },
  { subject: 'customer',            label: 'Clients' },
  { subject: 'financial',           label: 'Financier (accès section)' },
  { subject: 'payment',             label: 'Transactions / Paiements' },
  { subject: 'price-adjustment',    label: 'Ajustements de prix' },
  { subject: 'expense',             label: 'Dépenses' },
  { subject: 'business-stats',      label: 'Statistiques' },
  { subject: 'user',                label: 'Utilisateurs' },
  { subject: 'notifications-admin', label: 'Notifications (admin)' },
  { subject: 'activity-logs',       label: 'Journal d\'activité' },
  { subject: 'roles-permissions',   label: 'Rôles & Permissions' },
  { subject: 'settings',            label: 'Paramètres' },
]
const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'validate', 'assign']

// Liste statique des permissions existantes (synchronisée avec RolePermissionSeeder)
const KNOWN_PERMISSIONS = new Set([
  'view-delivery', 'create-delivery', 'edit-delivery', 'delete-delivery', 'assign-delivery',
  'view-partner', 'create-partner', 'edit-partner', 'delete-partner',
  'view-driver', 'create-driver', 'edit-driver', 'delete-driver',
  'view-customer', 'create-customer', 'edit-customer', 'delete-customer',
  'view-financial', 'view-price-adjustment', 'approve-price-adjustment',
  'view-payment', 'create-payment', 'edit-payment', 'delete-payment', 'validate-payment',
  'view-expense', 'create-expense', 'edit-expense', 'delete-expense',
  'view-business-stats',
  'view-user', 'create-user', 'edit-user', 'delete-user', 'assign-roles',
  'view-notifications-admin', 'view-activity-logs', 'view-roles-permissions', 'view-settings',
])

const permissionExists = (action, subject) =>
  KNOWN_PERMISSIONS.has(`${action}-${subject}`)

// Matrice de permissions de l'utilisateur
const userPermMatrix        = ref({})
const initialUserPermMatrix = ref({})
const currentDirectPerms    = ref([])

const openEditDialog = async user => {
  editingUser.value    = user
  editTab.value        = 'info'
  editForm.name        = user.name ?? ''
  editForm.email       = user.email ?? ''
  editForm.phone       = user.phone ?? ''
  editErrors.value     = {}
  editSelectedRole.value = user.roles?.[0]?.id ?? user.roles?.[0] ?? null
  isEditDialogOpen.value = true

  // Récupérer les détails complets de l'user
  try {
    const res = await $api(`/users/${user.id}`, { method: 'GET' })
    const fullUser = res?.data ?? res

    // Initialiser depuis getAllPermissions (rôle + directs) = ce que l'user voit effectivement
    // Les cases cochées = accès effectif actuel
    const effectivePerms = (fullUser?.permissions ?? []).map(p => p?.name ?? p)

    // Stocker les permissions directes actuelles pour le diff à la sauvegarde
    currentDirectPerms.value = (fullUser?.direct_permissions ?? []).map(p => p?.name ?? p)

    const matrix = {}
    SCREENS.forEach(s => {
      matrix[s.subject] = {}
      ACTIONS.forEach(a => {
        matrix[s.subject][a] = effectivePerms.includes(`${a}-${s.subject}`)
      })
    })
    userPermMatrix.value        = matrix
    initialUserPermMatrix.value = JSON.parse(JSON.stringify(matrix))
  } catch (e) {
    const matrix = {}
    SCREENS.forEach(s => { matrix[s.subject] = {}; ACTIONS.forEach(a => { matrix[s.subject][a] = false }) })
    userPermMatrix.value        = matrix
    initialUserPermMatrix.value = JSON.parse(JSON.stringify(matrix))
    currentDirectPerms.value    = []
  }
}

const hasPermChanges = computed(() => {
  for (const s of SCREENS) {
    for (const a of ACTIONS) {
      if (!permissionExists(a, s.subject)) continue
      if ((userPermMatrix.value[s.subject]?.[a] ?? false) !== (initialUserPermMatrix.value[s.subject]?.[a] ?? false))
        return true
    }
  }
  return false
})

// Sauvegarde onglet Infos
const saveEdit = async () => {
  isSavingEdit.value = true
  editErrors.value = {}
  try {
    await $api(`/users/${editingUser.value.id}`, { method: 'PUT', body: { ...editForm } })
    isEditDialogOpen.value = false
    fetchUsers()
  } catch (e) {
    editErrors.value = e?.data?.errors ?? {}
  } finally {
    isSavingEdit.value = false
  }
}

// Sauvegarde onglet Rôle
const saveRole = async () => {
  if (!editSelectedRole.value) return
  isSavingEdit.value = true
  try {
    const roleName = roles.value.find(r => r.value === editSelectedRole.value)?.title
      ?? editSelectedRole.value
    await $api(`/users/${editingUser.value.id}/roles`, {
      method: 'POST',
      body: { role: roleName },
    })
    fetchUsers()
  } catch (e) { console.error('saveRole:', e) }
  finally { isSavingEdit.value = false }
}

// Sauvegarde onglet Permissions — sync complet des permissions directes
const saveUserPermissions = async () => {
  isSavingEdit.value = true
  try {
    // Liste des permissions cochées maintenant
    const checkedPerms = []
    SCREENS.forEach(s => {
      ACTIONS.forEach(a => {
        if (!permissionExists(a, s.subject)) return
        if (userPermMatrix.value[s.subject]?.[a]) checkedPerms.push(`${a}-${s.subject}`)
      })
    })

    // Diff par rapport aux permissions directes actuelles
    const toAssign = checkedPerms.filter(p => !currentDirectPerms.value.includes(p))
    const toRevoke = currentDirectPerms.value.filter(p => !checkedPerms.includes(p))

    // Permissions cochées mais non directes = à assigner (remplace la permission rôle par une directe)
    if (toAssign.length)
      await $api(`/users/${editingUser.value.id}/permissions`, { method: 'POST', body: { permissions: toAssign } })
    // Permissions directes décochées = à révoquer
    if (toRevoke.length)
      await $api(`/users/${editingUser.value.id}/permissions`, { method: 'DELETE', body: { permissions: toRevoke } })

    isEditDialogOpen.value = false
    fetchUsers()
  } catch (e) { console.error('saveUserPermissions:', e) }
  finally { isSavingEdit.value = false }
}

// User details dialog
const isUserDetailsDialogOpen = ref(false)
const selectedUser = ref(null)
const userDetails = ref(null)
const isLoadingUserDetails = ref(false)

// Fetch user details
const viewUserDetails = async (user) => {
  selectedUser.value = user
  isUserDetailsDialogOpen.value = true
  isLoadingUserDetails.value = true
  userDetails.value = null

  try {
    // Fetch full user details from API
    const response = await $api(`/users/${user.id}`, {
      method: 'GET',
    })

    console.log('=== User Details Response ===')
    console.log('Response:', response)
    console.log('=============================')

    if (response && response.success && response.data) {
      userDetails.value = response.data
    } else if (response && response.data) {
      userDetails.value = response.data
    } else if (response) {
      userDetails.value = response
    } else {
      // Fallback to the user from the list
      userDetails.value = user
    }
  } catch (error) {
    console.error('Error fetching user details:', error)
    // Fallback to the user from the list
    userDetails.value = user
  } finally {
    isLoadingUserDetails.value = false
  }
}

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

// Group permissions by subject
const groupPermissionsBySubject = (permissions) => {
  if (!permissions || !Array.isArray(permissions)) return {}
  
  const grouped = {}
  
  permissions.forEach(permission => {
    // Split permission like "view-delivery" into ["view", "delivery"]
    const parts = permission.split('-')
    if (parts.length >= 2) {
      const action = parts[0]
      const subject = parts.slice(1).join('-')
      
      if (!grouped[subject]) {
        grouped[subject] = []
      }
      grouped[subject].push(action)
    } else {
      // If permission doesn't follow action-subject format, put it in "other"
      if (!grouped['other']) {
        grouped['other'] = []
      }
      grouped['other'].push(permission)
    }
  })
  
  return grouped
}

// Format permission for display
const formatPermission = (permission) => {
  // Convert "view-delivery" to "View Delivery"
  const parts = permission.split('-')
  return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

// Get user permissions (from roles)
const getUserPermissions = (user) => {
  if (!user) return []
  
  // Get permissions from roles
  const permissions = new Set()
  
  if (user.roles && Array.isArray(user.roles)) {
    user.roles.forEach(role => {
      if (role.permissions && Array.isArray(role.permissions)) {
        role.permissions.forEach(permission => {
          permissions.add(permission)
        })
      }
    })
  }
  
  // Also check direct permissions if available
  if (user.permissions && Array.isArray(user.permissions)) {
    user.permissions.forEach(permission => {
      permissions.add(permission)
    })
  }
  
  return Array.from(permissions).sort()
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
          <IconBtn @click.stop="viewUserDetails(item)">
            <VIcon icon="tabler-eye" />
            <VTooltip activator="parent">
              {{ $t('View User Details') }}
            </VTooltip>
          </IconBtn>

          <IconBtn @click.stop="deleteUser(item.id)">
            <VIcon icon="tabler-trash" />
            <VTooltip activator="parent">
              {{ $t('Delete User') }}
            </VTooltip>
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

                <VListItem @click="openEditDialog(item)">
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

    <!-- 👉 User Details Dialog -->
    <VDialog
      v-model="isUserDetailsDialogOpen"
      max-width="900"
      scrollable
    >
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <VIcon
              icon="tabler-user"
              class="me-2"
            />
            {{ $t('User Details') }} - {{ userDetails?.name || selectedUser?.name || userDetails?.user?.name || 'N/A' }}
          </div>
          <IconBtn @click="isUserDetailsDialogOpen = false">
            <VIcon icon="tabler-x" />
          </IconBtn>
        </VCardTitle>

        <VDivider />

        <VCardText>
          <div
            v-if="isLoadingUserDetails"
            class="text-center py-8"
          >
            <VProgressCircular
              indeterminate
              color="primary"
            />
            <p class="mt-4">
              {{ $t('Loading user details...') }}
            </p>
          </div>

          <div
            v-else-if="userDetails || selectedUser"
            class="user-details"
          >
            <VRow>
              <!-- Basic Information -->
              <VCol cols="12">
                <h3 class="mb-4">
                  {{ $t('Basic Information') }}
                </h3>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Name') }}:</span>
                  <span class="ms-2 font-weight-medium">
                    {{ userDetails?.name || userDetails?.user?.name || selectedUser?.name || '—' }}
                  </span>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Email') }}:</span>
                  <span class="ms-2">
                    {{ userDetails?.email || userDetails?.user?.email || selectedUser?.email || '—' }}
                  </span>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Phone') }}:</span>
                  <span class="ms-2">
                    {{ userDetails?.phone || userDetails?.user?.phone || selectedUser?.phone || '—' }}
                  </span>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Status') }}:</span>
                  <VChip
                    :color="resolveUserStatusVariant(userDetails?.status || selectedUser?.status)"
                    size="small"
                    label
                    class="ms-2 text-capitalize"
                  >
                    {{ getStatusName(userDetails?.status || selectedUser?.status) }}
                  </VChip>
                </div>
              </VCol>

              <!-- Roles Information -->
              <VCol cols="12">
                <VDivider class="my-4" />
                <h3 class="mb-4">
                  {{ $t('Roles') }}
                </h3>
              </VCol>

              <VCol cols="12">
                <div
                  v-if="(userDetails?.roles || selectedUser?.roles) && (userDetails?.roles || selectedUser?.roles).length > 0"
                  class="d-flex flex-wrap gap-2"
                >
                  <VChip
                    v-for="role in (userDetails?.roles || selectedUser?.roles)"
                    :key="role.id || role.name"
                    size="small"
                    color="primary"
                    variant="tonal"
                    class="text-capitalize"
                  >
                    {{ role.name || role }}
                  </VChip>
                </div>
                <VAlert
                  v-else
                  type="info"
                  variant="tonal"
                >
                  {{ $t('No roles assigned to this user.') }}
                </VAlert>
              </VCol>

              <!-- Permissions Information -->
              <VCol cols="12">
                <VDivider class="my-4" />
                <h3 class="mb-4">
                  {{ $t('Permissions') }}
                </h3>
              </VCol>

              <VCol cols="12">
                <div
                  v-if="getUserPermissions(userDetails || selectedUser).length > 0"
                  class="permissions-list"
                >
                  <div
                    v-for="(actions, subject) in groupPermissionsBySubject(getUserPermissions(userDetails || selectedUser))"
                    :key="subject"
                    class="permission-group mb-4"
                  >
                    <h6 class="text-body-1 font-weight-medium mb-2 text-capitalize">
                      {{ subject === 'other' ? $t('Other') : formatPermission(subject) }}
                    </h6>
                    <div class="d-flex flex-wrap gap-2">
                      <VChip
                        v-for="action in actions"
                        :key="action"
                        size="small"
                        color="success"
                        variant="tonal"
                        class="text-capitalize"
                      >
                        {{ action }}
                      </VChip>
                    </div>
                  </div>
                </div>

                <VAlert
                  v-else
                  type="info"
                  variant="tonal"
                >
                  {{ $t('This user has no permissions assigned.') }}
                </VAlert>
              </VCol>
            </VRow>
          </div>
        </VCardText>

        <VDivider />

        <VCardActions>
          <VSpacer />
          <VBtn
            variant="outlined"
            @click="isUserDetailsDialogOpen = false"
          >
            {{ $t('Close') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- 👉 Edit User Dialog (3 onglets) -->
    <VDialog v-model="isEditDialogOpen" max-width="680" scrollable>
      <VCard>
        <VCardTitle class="d-flex align-center pa-4">
          <VIcon icon="tabler-user-edit" class="me-2" />
          Modifier — {{ editingUser?.name }}
          <VSpacer />
          <IconBtn @click="isEditDialogOpen = false"><VIcon icon="tabler-x" /></IconBtn>
        </VCardTitle>
        <VDivider />

        <!-- Onglets -->
        <VTabs v-model="editTab" grow>
          <VTab value="info">
            <VIcon icon="tabler-user" size="16" class="me-1" />
            Informations
          </VTab>
          <VTab value="role">
            <VIcon icon="tabler-shield-half" size="16" class="me-1" />
            Rôle
          </VTab>
          <VTab value="permissions">
            <VIcon icon="tabler-lock-cog" size="16" class="me-1" />
            Permissions
          </VTab>
        </VTabs>
        <VDivider />

        <VCardText class="pa-4" style="min-height: 260px;">
          <VWindow v-model="editTab">

            <!-- Onglet Infos -->
            <VWindowItem value="info">
              <VRow class="mt-1">
                <VCol cols="12">
                  <AppTextField v-model="editForm.name" label="Nom complet" :error-messages="editErrors.name" />
                </VCol>
                <VCol cols="12" sm="6">
                  <AppTextField v-model="editForm.email" label="Email" type="email" :error-messages="editErrors.email" />
                </VCol>
                <VCol cols="12" sm="6">
                  <AppTextField v-model="editForm.phone" label="Téléphone" :error-messages="editErrors.phone" />
                </VCol>
              </VRow>
            </VWindowItem>

            <!-- Onglet Rôle -->
            <VWindowItem value="role">
              <div class="mt-3">
                <p class="text-body-2 text-medium-emphasis mb-4">
                  Sélectionner le rôle de l'utilisateur. Cela lui accordera toutes les permissions associées à ce rôle.
                </p>
                <AppSelect
                  v-model="editSelectedRole"
                  :items="roles"
                  label="Rôle"
                  clearable
                />
                <div v-if="editingUser?.roles?.length" class="mt-3">
                  <span class="text-body-2 text-medium-emphasis">Rôle actuel : </span>
                  <VChip size="small" color="primary" class="ms-1">
                    {{ editingUser.roles[0]?.name ?? editingUser.roles[0] }}
                  </VChip>
                </div>
              </div>
            </VWindowItem>

            <!-- Onglet Permissions individuelles -->
            <VWindowItem value="permissions">
              <p class="text-body-2 text-medium-emphasis mt-2 mb-3">
                Permissions supplémentaires accordées directement à cet utilisateur, indépendamment de son rôle.
              </p>
              <div style="overflow-x: auto;">
                <table style="border-collapse: collapse; width: 100%;">
                  <thead>
                    <tr style="background: rgba(var(--v-theme-surface-variant), 0.4); border-bottom: 2px solid rgba(var(--v-border-color), var(--v-border-opacity));">
                      <th class="text-left pa-2 text-body-2 font-weight-bold" style="min-width: 180px;">Écran</th>
                      <th v-for="action in ACTIONS" :key="action" class="text-center pa-1 text-caption font-weight-medium text-capitalize" style="min-width: 60px;">
                        {{ action }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(screen, i) in SCREENS"
                      :key="screen.subject"
                      :style="i % 2 === 0 ? '' : 'background: rgba(var(--v-theme-surface-variant), 0.15)'"
                    >
                      <td class="pa-2 text-body-2">{{ screen.label }}</td>
                      <td v-for="action in ACTIONS" :key="action" class="text-center pa-1">
                        <VCheckbox
                          v-if="permissionExists(action, screen.subject)"
                          v-model="userPermMatrix[screen.subject][action]"
                          hide-details
                          density="compact"
                          class="d-flex justify-center"
                        />
                        <span v-else class="text-disabled text-xs">—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </VWindowItem>

          </VWindow>
        </VCardText>

        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="outlined" @click="isEditDialogOpen = false">Annuler</VBtn>
          <VBtn
            v-if="editTab === 'info'"
            color="primary"
            :loading="isSavingEdit"
            @click="saveEdit"
          >
            Enregistrer
          </VBtn>
          <VBtn
            v-else-if="editTab === 'role'"
            color="primary"
            :loading="isSavingEdit"
            @click="saveRole"
          >
            Assigner le rôle
          </VBtn>
          <VBtn
            v-else-if="editTab === 'permissions'"
            color="primary"
            :loading="isSavingEdit"
            :disabled="!hasPermChanges"
            @click="saveUserPermissions"
          >
            Sauvegarder permissions
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </section>
</template>

<style lang="scss">
.text-capitalize {
  text-transform: capitalize;
}

.user-list-name:not(:hover) {
  color: rgba(var(--v-theme-on-background), var(--v-medium-emphasis-opacity));
}

.permissions-list {
  .permission-group {
    padding: 1rem;
    background-color: rgba(var(--v-theme-surface), 1);
    border-radius: 8px;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
}
</style>
