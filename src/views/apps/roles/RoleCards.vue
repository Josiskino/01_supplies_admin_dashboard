<script setup>
// ─── Données ────────────────────────────────────────────────────────────────
const roles       = ref([])
const permissions = ref([])
const isLoading   = ref(false)

// ─── Modales ────────────────────────────────────────────────────────────────
const isCreateDialogOpen     = ref(false)
const isPermissionDialogOpen = ref(false)
const isDeleteDialogOpen     = ref(false)
const selectedRole           = ref(null)
const roleToDelete           = ref(null)
const isSaving               = ref(false)
const isDeleting             = ref(false)

const newRoleName  = ref('')
const createErrors = ref({})
const permMatrix   = ref({})

// ─── Écrans & actions pour la matrice ───────────────────────────────────────
const SCREENS = [
  { subject: 'delivery',            label: 'Livraisons' },
  { subject: 'partner',             label: 'Partenaires' },
  { subject: 'driver',              label: 'Livreurs' },
  { subject: 'customer',            label: 'Clients' },
  { subject: 'map',                 label: 'Carte' },
  { subject: 'financial',           label: 'Financier (accès section)' },
  { subject: 'payment',             label: 'Transactions / Paiements' },
  { subject: 'price-adjustment',    label: 'Ajustements de prix' },
  { subject: 'expense',             label: 'Dépenses' },
  { subject: 'driver-daily-ca',     label: 'CA Journalier (logistique)' },
  { subject: 'business-stats',      label: 'Statistiques' },
  { subject: 'analytics',           label: 'Analytics clients' },
  { subject: 'analytics-settings',  label: 'Paramètres Analytics' },
  { subject: 'data',                label: 'Export de données (Excel)' },
  { subject: 'user',                label: 'Utilisateurs' },
  { subject: 'notifications-admin', label: 'Notifications (admin)' },
  { subject: 'activity-logs',       label: 'Journal d\'activité' },
  { subject: 'roles-permissions',   label: 'Rôles & Permissions' },
  { subject: 'settings',            label: 'Paramètres' },
]

const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'validate', 'assign', 'manage', 'export']

const ACTION_LABELS = {
  view:     'Voir',
  create:   'Créer',
  edit:     'Modifier',
  delete:   'Supprimer',
  approve:  'Approuver',
  validate: 'Valider',
  assign:   'Assigner',
  manage:   'Gérer',
  export:   'Exporter',
}

const getRoleColor = () => 'primary'

// ─── Résumé des modules accessibles ─────────────────────────────────────────
const getModuleSummary = role => {
  const subjects = new Map()
  ;(role.permissions ?? []).forEach(perm => {
    const firstDash = perm.indexOf('-')
    if (firstDash === -1) return
    const subject = perm.substring(firstDash + 1)
    const screen  = SCREENS.find(s => s.subject === subject)
    if (!screen) return
    if (!subjects.has(subject)) subjects.set(subject, { label: screen.label, count: 0 })
    subjects.get(subject).count++
  })
  return [...subjects.values()]
}

// ─── API ──────────────────────────────────────────────────────────────────────
const fetchRoles = async () => {
  isLoading.value = true
  try {
    const res = await $api('/roles', { method: 'GET' })
    roles.value = res?.data?.roles ?? res?.data ?? (Array.isArray(res) ? res : [])
  } catch (e) {
    console.error('fetchRoles:', e)
  } finally {
    isLoading.value = false
  }
}

const fetchPermissions = async () => {
  try {
    const res = await $api('/permissions', { method: 'GET' })
    permissions.value = res?.data ?? (Array.isArray(res) ? res : [])
  } catch (e) {
    console.error('fetchPermissions:', e)
  }
}

onMounted(() => { fetchRoles(); fetchPermissions() })

// ─── Création ────────────────────────────────────────────────────────────────
const openCreateDialog = () => {
  newRoleName.value  = ''
  createErrors.value = {}
  isCreateDialogOpen.value = true
}

const createRole = async () => {
  if (!newRoleName.value.trim()) {
    createErrors.value = { name: 'Le nom du rôle est requis' }
    return
  }
  isSaving.value = true
  try {
    await $api('/roles', { method: 'POST', body: { name: newRoleName.value.trim() } })
    isCreateDialogOpen.value = false
    await fetchRoles()
  } catch (e) {
    createErrors.value = e?.data?.errors ?? { name: 'Erreur lors de la création' }
  } finally {
    isSaving.value = false
  }
}

// ─── Suppression ─────────────────────────────────────────────────────────────
const confirmDeleteRole = role => {
  roleToDelete.value    = role
  isDeleteDialogOpen.value = true
}

const deleteRole = async () => {
  if (!roleToDelete.value) return
  isDeleting.value = true
  try {
    await $api(`/roles/${roleToDelete.value.id}`, { method: 'DELETE' })
    isDeleteDialogOpen.value = false
    roleToDelete.value = null
    await fetchRoles()
  } catch (e) {
    console.error('deleteRole:', e)
  } finally {
    isDeleting.value = false
  }
}

// ─── Permissions ─────────────────────────────────────────────────────────────
const KNOWN_PERMISSIONS = new Set([
  'view-delivery', 'create-delivery', 'edit-delivery', 'delete-delivery', 'assign-delivery',
  'view-partner', 'create-partner', 'edit-partner', 'delete-partner',
  'view-driver', 'create-driver', 'edit-driver', 'delete-driver',
  'view-customer', 'create-customer', 'edit-customer', 'delete-customer',
  'view-financial', 'view-price-adjustment', 'approve-price-adjustment',
  'view-payment', 'create-payment', 'edit-payment', 'delete-payment', 'validate-payment',
  'view-expense', 'create-expense', 'edit-expense', 'delete-expense',
  'view-business-stats',
  'view-map',
  'view-driver-daily-ca',
  'view-analytics', 'manage-analytics-settings', 'export-data',
  'view-user', 'create-user', 'edit-user', 'delete-user', 'assign-roles',
  'view-notifications-admin', 'view-activity-logs', 'view-roles-permissions', 'view-settings',
])

const permissionExists = (action, subject) =>
  KNOWN_PERMISSIONS.has(`${action}-${subject}`)

const openPermissionDialog = role => {
  selectedRole.value = role
  const matrix = {}
  SCREENS.forEach(s => {
    matrix[s.subject] = {}
    ACTIONS.forEach(a => {
      matrix[s.subject][a] = role.permissions?.includes(`${a}-${s.subject}`) ?? false
    })
  })
  permMatrix.value = matrix
  isPermissionDialogOpen.value = true
}

const savePermissions = async () => {
  isSaving.value = true
  try {
    const toAssign = []
    const toRevoke = []
    SCREENS.forEach(s => {
      ACTIONS.forEach(a => {
        if (!permissionExists(a, s.subject)) return
        const perm      = `${a}-${s.subject}`
        const hasNow    = permMatrix.value[s.subject]?.[a] ?? false
        const hadBefore = selectedRole.value.permissions?.includes(perm) ?? false
        if (hasNow && !hadBefore) toAssign.push(perm)
        if (!hasNow && hadBefore) toRevoke.push(perm)
      })
    })
    if (toAssign.length)
      await $api(`/roles/${selectedRole.value.id}/permissions`, { method: 'POST', body: { permissions: toAssign } })
    if (toRevoke.length)
      await $api(`/roles/${selectedRole.value.id}/permissions`, { method: 'DELETE', body: { permissions: toRevoke } })
    isPermissionDialogOpen.value = false
    await fetchRoles()
  } catch (e) {
    console.error('savePermissions:', e)
  } finally {
    isSaving.value = false
  }
}

const toggleRow    = subject => { const any = ACTIONS.some(a => permissionExists(a, subject) && permMatrix.value[subject]?.[a]); ACTIONS.forEach(a => { if (permissionExists(a, subject)) permMatrix.value[subject][a] = !any }) }
const toggleColumn = action  => { const any = SCREENS.some(s => permissionExists(action, s.subject) && permMatrix.value[s.subject]?.[action]); SCREENS.forEach(s => { if (permissionExists(action, s.subject)) permMatrix.value[s.subject][action] = !any }) }
</script>

<template>
  <!-- ── Skeleton loading ───────────────────────────────────────────────────── -->
  <VRow v-if="isLoading">
    <VCol v-for="n in 4" :key="n" cols="12" sm="6" lg="4">
      <VSkeletonLoader type="card" />
    </VCol>
  </VRow>

  <VRow v-else>
    <!-- ── Carte par rôle ──────────────────────────────────────────────────── -->
    <VCol
      v-for="role in roles"
      :key="role.id"
      cols="12"
      sm="6"
      lg="4"
    >
      <VCard class="role-card h-100" elevation="1">
        <!-- En-tête -->
        <VCardText class="pb-3">
          <div class="d-flex align-center gap-3">
            <VAvatar
              :color="getRoleColor()"
              variant="tonal"
              size="42"
              rounded="lg"
            >
              <VIcon icon="tabler-shield-check" size="22" />
            </VAvatar>

            <div class="flex-grow-1 min-width-0">
              <div class="text-subtitle-1 font-weight-semibold text-capitalize text-truncate">
                {{ role.name }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ role.permissions?.length ?? 0 }}
                permission{{ (role.permissions?.length ?? 0) !== 1 ? 's' : '' }}
              </div>
            </div>

            <div class="d-flex gap-1 flex-shrink-0">
              <VBtn
                icon
                size="small"
                variant="text"
                :color="getRoleColor()"
                @click="openPermissionDialog(role)"
              >
                <VIcon icon="tabler-lock-cog" size="18" />
                <VTooltip activator="parent" location="top">Gérer les permissions</VTooltip>
              </VBtn>
              <VBtn
                v-if="role.name !== 'Super Admin'"
                icon
                size="small"
                variant="text"
                color="error"
                @click="confirmDeleteRole(role)"
              >
                <VIcon icon="tabler-trash" size="18" />
                <VTooltip activator="parent" location="top">Supprimer</VTooltip>
              </VBtn>
            </div>
          </div>
        </VCardText>

        <VDivider />

        <!-- Modules accessibles -->
        <VCardText class="pt-3">
          <div v-if="getModuleSummary(role).length > 0" class="d-flex flex-wrap gap-2">
            <VChip
              v-for="module in getModuleSummary(role).slice(0, 4)"
              :key="module.label"
              size="small"
              variant="tonal"
              color="default"
            >
              {{ module.label }}
            </VChip>
            <VChip
              v-if="getModuleSummary(role).length > 4"
              size="small"
              variant="outlined"
              color="default"
            >
              +{{ getModuleSummary(role).length - 4 }} modules
            </VChip>
          </div>
          <p
            v-else
            class="text-caption text-medium-emphasis mb-0"
          >
            Aucune permission assignée
          </p>
        </VCardText>
      </VCard>
    </VCol>

    <!-- ── Carte création ─────────────────────────────────────────────────── -->
    <VCol cols="12" sm="6" lg="4">
      <div
        class="create-role-card h-100 d-flex align-center justify-center cursor-pointer rounded"
        @click="openCreateDialog"
      >
        <div class="text-center py-8 px-4">
          <VAvatar color="primary" variant="tonal" size="48" class="mb-3">
            <VIcon icon="tabler-plus" size="24" />
          </VAvatar>
          <div class="text-body-1 font-weight-medium text-primary">Créer un nouveau rôle</div>
          <div class="text-caption text-medium-emphasis mt-1">Définissez un rôle personnalisé</div>
        </div>
      </div>
    </VCol>
  </VRow>

  <!-- ── Dialog création ───────────────────────────────────────────────────── -->
  <VDialog v-model="isCreateDialogOpen" max-width="480">
    <VCard>
      <VCardTitle class="d-flex align-center pa-4 gap-2">
        <VIcon icon="tabler-shield-plus" color="primary" />
        Nouveau rôle
      </VCardTitle>
      <VDivider />
      <VCardText class="pa-4">
        <AppTextField
          v-model="newRoleName"
          label="Nom du rôle"
          placeholder="Ex: responsable-terrain"
          :error-messages="createErrors.name"
          autofocus
          @keyup.enter="createRole"
        />
      </VCardText>
      <VDivider />
      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn variant="outlined" @click="isCreateDialogOpen = false">Annuler</VBtn>
        <VBtn color="primary" :loading="isSaving" @click="createRole">Créer</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- ── Dialog suppression ────────────────────────────────────────────────── -->
  <VDialog v-model="isDeleteDialogOpen" max-width="420">
    <VCard>
      <VCardText class="pa-6 text-center">
        <VAvatar color="error" variant="tonal" size="56" class="mb-4">
          <VIcon icon="tabler-trash" size="28" />
        </VAvatar>
        <h5 class="text-h5 mb-2">Supprimer le rôle</h5>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Êtes-vous sûr de vouloir supprimer le rôle
          <strong class="text-high-emphasis">{{ roleToDelete?.name }}</strong> ?
          Cette action est irréversible.
        </p>
      </VCardText>
      <VDivider />
      <VCardActions class="pa-4 gap-3">
        <VBtn variant="outlined" block @click="isDeleteDialogOpen = false; roleToDelete = null">
          Annuler
        </VBtn>
        <VBtn color="error" block :loading="isDeleting" @click="deleteRole">
          Supprimer
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- ── Dialog matrice de permissions ────────────────────────────────────── -->
  <VDialog v-model="isPermissionDialogOpen" max-width="940" scrollable>
    <VCard v-if="selectedRole">
      <VCardTitle class="d-flex align-center pa-4 gap-2">
        <VAvatar color="primary" variant="tonal" size="32" rounded="lg">
          <VIcon icon="tabler-lock-cog" size="16" />
        </VAvatar>
        <span>
          Permissions —
          <span class="text-primary text-capitalize">{{ selectedRole.name }}</span>
        </span>
        <VSpacer />
        <IconBtn @click="isPermissionDialogOpen = false">
          <VIcon icon="tabler-x" />
        </IconBtn>
      </VCardTitle>
      <VDivider />

      <VCardText class="pa-0">
        <div style="overflow-x: auto;">
          <table class="permission-matrix w-100">
            <thead>
              <tr>
                <th class="screen-col pa-3 text-left">
                  <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis tracking-wide">
                    Écran / Module
                  </span>
                </th>
                <th
                  v-for="action in ACTIONS"
                  :key="action"
                  class="action-col pa-2 text-center"
                >
                  <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                    {{ ACTION_LABELS[action] }}
                  </div>
                  <VBtn
                    size="x-small"
                    variant="text"
                    density="compact"
                    class="mt-1 text-xs"
                    @click="toggleColumn(action)"
                  >
                    tout
                  </VBtn>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="screen in SCREENS"
                :key="screen.subject"
                class="permission-row"
              >
                <td class="screen-col pa-3">
                  <div class="d-flex align-center justify-space-between gap-2">
                    <span class="text-body-2">{{ screen.label }}</span>
                    <VBtn
                      size="x-small"
                      variant="text"
                      density="compact"
                      class="text-xs flex-shrink-0"
                      @click="toggleRow(screen.subject)"
                    >
                      tout
                    </VBtn>
                  </div>
                </td>
                <td
                  v-for="action in ACTIONS"
                  :key="action"
                  class="action-col text-center pa-1"
                  :class="{ 'cell-disabled': !permissionExists(action, screen.subject) }"
                >
                  <VCheckbox
                    v-if="permissionExists(action, screen.subject)"
                    v-model="permMatrix[screen.subject][action]"
                    hide-details
                    density="compact"
                    class="d-flex justify-center"
                  />
                  <span v-else class="text-disabled">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </VCardText>

      <VDivider />
      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn variant="outlined" @click="isPermissionDialogOpen = false">Annuler</VBtn>
        <VBtn color="primary" :loading="isSaving" @click="savePermissions">
          <VIcon icon="tabler-device-floppy" size="18" class="me-1" />
          Enregistrer
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
/* ── Role cards ─────────────────────────────────────────────────────────────── */
.role-card {
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.role-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(var(--v-shadow-key-umbra-color), 0.12) !important;
}

/* ── Create card ─────────────────────────────────────────────────────────────── */
.create-role-card {
  min-height: 140px;
  border: 2px dashed rgba(var(--v-border-color), var(--v-border-opacity));
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.create-role-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
  background-color: rgba(var(--v-theme-primary), 0.04);
}

/* ── Permission matrix ───────────────────────────────────────────────────────── */
.permission-matrix {
  border-collapse: collapse;
}

.permission-matrix thead tr {
  background-color: rgba(var(--v-theme-surface-variant), 0.5);
  border-bottom: 2px solid rgba(var(--v-border-color), var(--v-border-opacity));
  position: sticky;
  top: 0;
  z-index: 1;
}

.permission-row:nth-child(even) {
  background-color: rgba(var(--v-theme-surface-variant), 0.2);
}

.permission-row:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.screen-col {
  min-width: 230px;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.action-col {
  min-width: 80px;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.cell-disabled {
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
}

.tracking-wide {
  letter-spacing: 0.08em;
}

.min-width-0 {
  min-width: 0;
}
</style>
