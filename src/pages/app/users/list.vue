<script setup>
definePage({
  meta: {
    action: 'view',
    subject: 'user',
  },
})

// ─── State ───────────────────────────────────────────────────────────────────
const users         = ref([])
const roles         = ref([])
const totalUsers    = ref(0)
const isLoading     = ref(false)
const searchQuery   = ref('')
const selectedRole  = ref(null)
const page          = ref(1)
const itemsPerPage  = ref(15)

// ─── Modales ─────────────────────────────────────────────────────────────────
const isCreateDialogOpen = ref(false)
const isEditDialogOpen   = ref(false)
const isRoleDialogOpen   = ref(false)
const isSaving           = ref(false)
const selectedUser       = ref(null)
const formErrors         = ref({})

const createForm = reactive({
  name: '',
  email: '',
  phone: '',
  password: '',
  role: null,
})

const editForm = reactive({
  name: '',
  email: '',
  phone: '',
})

const assignRoleForm = reactive({
  role: null,
})

// ─── Headers table ───────────────────────────────────────────────────────────
const headers = [
  { title: '#',       key: 'index',  sortable: false, width: '60px' },
  { title: 'Nom',     key: 'name' },
  { title: 'Email',   key: 'email' },
  { title: 'Rôle',    key: 'role' },
  { title: 'Statut',  key: 'status' },
  { title: 'Actions', key: 'actions', sortable: false },
]

// ─── API ──────────────────────────────────────────────────────────────────────
const fetchUsers = async () => {
  isLoading.value = true
  try {
    const params = new URLSearchParams({ per_page: itemsPerPage.value, page: page.value })
    if (searchQuery.value) params.set('search', searchQuery.value)
    if (selectedRole.value) params.set('role', selectedRole.value)

    const res = await $api(`/users?${params}`, { method: 'GET' })
    users.value     = res?.data ?? []
    totalUsers.value = res?.meta?.total ?? users.value.length
  } catch (e) {
    console.error('fetchUsers:', e)
    users.value = []
  } finally {
    isLoading.value = false
  }
}

const fetchRoles = async () => {
  try {
    const res = await $api('/roles', { method: 'GET' })
    const raw = res?.data?.roles ?? res?.data ?? res
    roles.value = (Array.isArray(raw) ? raw : []).map(r => ({ title: r.name, value: r.id, name: r.name }))
  } catch (e) {
    console.error('fetchRoles:', e)
  }
}

onMounted(() => {
  fetchUsers()
  fetchRoles()
})

watch([searchQuery, selectedRole, page, itemsPerPage], fetchUsers)

// ─── Création utilisateur ─────────────────────────────────────────────────────
const openCreateDialog = () => {
  Object.assign(createForm, { name: '', email: '', phone: '', password: '', role: null })
  formErrors.value = {}
  isCreateDialogOpen.value = true
}

const createUser = async () => {
  isSaving.value = true
  formErrors.value = {}
  try {
    const body = { ...createForm }
    if (!body.role) delete body.role

    await $api('/users', { method: 'POST', body })
    isCreateDialogOpen.value = false
    await fetchUsers()
  } catch (e) {
    formErrors.value = e?.data?.errors ?? {}
  } finally {
    isSaving.value = false
  }
}

// ─── Edition utilisateur ──────────────────────────────────────────────────────
const openEditDialog = (user) => {
  selectedUser.value = user
  Object.assign(editForm, { name: user.name, email: user.email, phone: user.phone ?? '' })
  formErrors.value = {}
  isEditDialogOpen.value = true
}

const updateUser = async () => {
  isSaving.value = true
  formErrors.value = {}
  try {
    await $api(`/users/${selectedUser.value.id}`, { method: 'PUT', body: editForm })
    isEditDialogOpen.value = false
    await fetchUsers()
  } catch (e) {
    formErrors.value = e?.data?.errors ?? {}
  } finally {
    isSaving.value = false
  }
}

// ─── Assignation de rôle ──────────────────────────────────────────────────────
const openRoleDialog = (user) => {
  selectedUser.value  = user
  assignRoleForm.role = user.roles?.[0]?.id ?? null
  isRoleDialogOpen.value = true
}

const assignRole = async () => {
  if (!assignRoleForm.role) return
  isSaving.value = true
  try {
    const roleName = roles.value.find(r => r.value === assignRoleForm.role)?.name
    await $api(`/users/${selectedUser.value.id}/roles`, {
      method: 'POST',
      body: { role: roleName },
    })
    isRoleDialogOpen.value = false
    await fetchUsers()
  } catch (e) {
    console.error('assignRole:', e)
  } finally {
    isSaving.value = false
  }
}

// ─── Suppression ──────────────────────────────────────────────────────────────
const deleteUser = async (user) => {
  if (!confirm(`Supprimer l'utilisateur "${user.name}" ?`)) return
  try {
    await $api(`/users/${user.id}`, { method: 'DELETE' })
    await fetchUsers()
  } catch (e) {
    console.error('deleteUser:', e)
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const avatarText = name => {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? `${parts[0][0]}${parts.at(-1)[0]}`.toUpperCase()
    : name[0].toUpperCase()
}

const getUserRole = (user) =>
  user.roles?.[0]?.name ?? user.roles?.[0] ?? '—'

const getRoleColor = (roleName) => {
  const r = roleName?.toLowerCase() ?? ''
  if (r.includes('super') || r.includes('admin'))   return 'error'
  if (r.includes('superviseur') || r.includes('sup')) return 'warning'
  if (r.includes('comptable'))   return 'info'
  if (r.includes('commercial'))  return 'success'
  if (r.includes('driver'))      return 'secondary'
  return 'primary'
}

const getStatusColor = (status) => {
  const s = (typeof status === 'string' ? status : status?.name ?? '').toLowerCase()
  if (s.includes('actif') || s.includes('active'))     return 'success'
  if (s.includes('inactif') || s.includes('inactive')) return 'secondary'
  if (s.includes('attente') || s.includes('pending'))  return 'warning'
  return 'primary'
}

const getStatusLabel = (status) =>
  typeof status === 'string' ? status : status?.name ?? '—'
</script>

<template>
  <div>
    <!-- ── En-tête ──────────────────────────────────────────────────────────── -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h4 class="text-h4 mb-1">Gestion des Utilisateurs</h4>
        <p class="text-body-1 mb-0 text-medium-emphasis">
          Créez des comptes, assignez des rôles et gérez les accès.
        </p>
      </div>
      <VBtn
        color="primary"
        prepend-icon="tabler-user-plus"
        @click="openCreateDialog"
      >
        Nouvel utilisateur
      </VBtn>
    </div>

    <!-- ── Filtres ───────────────────────────────────────────────────────────── -->
    <VCard class="mb-4">
      <VCardText class="d-flex flex-wrap gap-4">
        <AppTextField
          v-model="searchQuery"
          placeholder="Rechercher…"
          prepend-inner-icon="tabler-search"
          style="min-inline-size: 240px;"
          clearable
        />
        <AppSelect
          v-model="selectedRole"
          :items="roles"
          placeholder="Tous les rôles"
          style="min-inline-size: 180px;"
          clearable
        />
        <VSpacer />
        <AppSelect
          :model-value="itemsPerPage"
          :items="[{ value: 10, title: '10' }, { value: 25, title: '25' }, { value: 50, title: '50' }]"
          style="inline-size: 90px;"
          @update:model-value="itemsPerPage = $event"
        />
      </VCardText>
    </VCard>

    <!-- ── Table ─────────────────────────────────────────────────────────────── -->
    <VCard>
      <VDataTableServer
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="users"
        :items-length="totalUsers"
        :loading="isLoading"
        class="text-no-wrap"
        @update:options="({ page: p, itemsPerPage: ipp }) => { page = p; itemsPerPage = ipp }"
      >
        <!-- Index -->
        <template #item.index="{ index }">
          <span class="text-medium-emphasis">{{ (page - 1) * itemsPerPage + index + 1 }}</span>
        </template>

        <!-- Nom -->
        <template #item.name="{ item }">
          <div class="d-flex align-center gap-3">
            <VAvatar
              size="34"
              :color="getRoleColor(getUserRole(item))"
              variant="tonal"
            >
              <span class="text-xs font-weight-medium">{{ avatarText(item.name) }}</span>
            </VAvatar>
            <div>
              <div class="font-weight-medium">{{ item.name }}</div>
              <div class="text-xs text-medium-emphasis">{{ item.email }}</div>
            </div>
          </div>
        </template>

        <!-- Email (masqué sur mobile) -->
        <template #item.email="{ item }">
          {{ item.email }}
        </template>

        <!-- Rôle -->
        <template #item.role="{ item }">
          <VChip
            :color="getRoleColor(getUserRole(item))"
            size="small"
            label
          >
            {{ getUserRole(item) }}
          </VChip>
        </template>

        <!-- Statut -->
        <template #item.status="{ item }">
          <VChip
            :color="getStatusColor(item.status)"
            size="small"
            label
          >
            {{ getStatusLabel(item.status) }}
          </VChip>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <div class="d-flex gap-1">
            <IconBtn size="small" @click="openEditDialog(item)">
              <VIcon icon="tabler-pencil" size="18" />
              <VTooltip activator="parent">Modifier</VTooltip>
            </IconBtn>
            <IconBtn size="small" @click="openRoleDialog(item)">
              <VIcon icon="tabler-shield-half" size="18" />
              <VTooltip activator="parent">Assigner un rôle</VTooltip>
            </IconBtn>
            <IconBtn
              size="small"
              color="error"
              @click="deleteUser(item)"
            >
              <VIcon icon="tabler-trash" size="18" />
              <VTooltip activator="parent">Supprimer</VTooltip>
            </IconBtn>
          </div>
        </template>

        <template #bottom>
          <TablePagination
            v-model:page="page"
            :items-per-page="itemsPerPage"
            :total-items="totalUsers"
          />
        </template>
      </VDataTableServer>
    </VCard>

    <!-- ── Dialog création ───────────────────────────────────────────────────── -->
    <VDialog v-model="isCreateDialogOpen" max-width="520">
      <VCard>
        <VCardTitle class="d-flex align-center pa-4">
          <VIcon icon="tabler-user-plus" class="me-2" />
          Nouvel utilisateur
        </VCardTitle>
        <VDivider />
        <VCardText class="pa-4">
          <VRow>
            <VCol cols="12">
              <AppTextField
                v-model="createForm.name"
                label="Nom complet *"
                :error-messages="formErrors.name"
              />
            </VCol>
            <VCol cols="12" sm="6">
              <AppTextField
                v-model="createForm.email"
                label="Email *"
                type="email"
                :error-messages="formErrors.email"
              />
            </VCol>
            <VCol cols="12" sm="6">
              <AppTextField
                v-model="createForm.phone"
                label="Téléphone"
                :error-messages="formErrors.phone"
              />
            </VCol>
            <VCol cols="12" sm="6">
              <AppTextField
                v-model="createForm.password"
                label="Mot de passe *"
                type="password"
                :error-messages="formErrors.password"
              />
            </VCol>
            <VCol cols="12" sm="6">
              <AppSelect
                v-model="createForm.role"
                :items="roles"
                label="Rôle"
                clearable
              />
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="outlined" @click="isCreateDialogOpen = false">Annuler</VBtn>
          <VBtn color="primary" :loading="isSaving" @click="createUser">Créer</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- ── Dialog édition ────────────────────────────────────────────────────── -->
    <VDialog v-model="isEditDialogOpen" max-width="480">
      <VCard>
        <VCardTitle class="d-flex align-center pa-4">
          <VIcon icon="tabler-user-edit" class="me-2" />
          Modifier — {{ selectedUser?.name }}
        </VCardTitle>
        <VDivider />
        <VCardText class="pa-4">
          <VRow>
            <VCol cols="12">
              <AppTextField
                v-model="editForm.name"
                label="Nom complet"
                :error-messages="formErrors.name"
              />
            </VCol>
            <VCol cols="12">
              <AppTextField
                v-model="editForm.email"
                label="Email"
                type="email"
                :error-messages="formErrors.email"
              />
            </VCol>
            <VCol cols="12">
              <AppTextField
                v-model="editForm.phone"
                label="Téléphone"
                :error-messages="formErrors.phone"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="outlined" @click="isEditDialogOpen = false">Annuler</VBtn>
          <VBtn color="primary" :loading="isSaving" @click="updateUser">Enregistrer</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- ── Dialog assignation rôle ───────────────────────────────────────────── -->
    <VDialog v-model="isRoleDialogOpen" max-width="400">
      <VCard>
        <VCardTitle class="d-flex align-center pa-4">
          <VIcon icon="tabler-shield-half" class="me-2" />
          Rôle — {{ selectedUser?.name }}
        </VCardTitle>
        <VDivider />
        <VCardText class="pa-4">
          <AppSelect
            v-model="assignRoleForm.role"
            :items="roles"
            label="Sélectionner un rôle"
          />
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="outlined" @click="isRoleDialogOpen = false">Annuler</VBtn>
          <VBtn color="primary" :loading="isSaving" @click="assignRole">Assigner</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
