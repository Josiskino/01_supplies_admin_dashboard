<script setup>
// ─── Données ────────────────────────────────────────────────────────────────
const roles       = ref([])
const permissions = ref([])
const isLoading   = ref(false)

// ─── Modales ────────────────────────────────────────────────────────────────
const isCreateDialogOpen    = ref(false)
const isPermissionDialogOpen = ref(false)
const selectedRole           = ref(null)
const isSaving               = ref(false)

// Formulaire création
const newRoleName  = ref('')
const createErrors = ref({})

// Matrice de permissions : { 'delivery': { view: true, create: false, … } }
const permMatrix = ref({})

// ─── Groupes d'écrans pour la matrice ───────────────────────────────────────
// Format : subject CASL → libellé affiché
const SCREENS = [
  { subject: 'delivery',             label: 'Livraisons' },
  { subject: 'partner',              label: 'Partenaires' },
  { subject: 'driver',               label: 'Livreurs (Couriers)' },
  { subject: 'customer',             label: 'Clients' },
  { subject: 'financial',            label: 'Financier (accès section)' },
  { subject: 'payment',              label: 'Transactions / Paiements' },
  { subject: 'price-adjustment',     label: 'Ajustements de prix' },
  { subject: 'expense',              label: 'Dépenses' },
  { subject: 'business-stats',       label: 'Statistiques' },
  { subject: 'user',                 label: 'Utilisateurs' },
  { subject: 'notifications-admin',  label: 'Notifications (admin)' },
  { subject: 'activity-logs',        label: 'Journal d\'activité' },
  { subject: 'roles-permissions',    label: 'Rôles & Permissions' },
  { subject: 'settings',             label: 'Paramètres' },
]

const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'validate', 'assign']

// ─── API ─────────────────────────────────────────────────────────────────────
const fetchRoles = async () => {
  isLoading.value = true
  try {
    const res = await $api('/roles', { method: 'GET' })
    roles.value = res?.data ?? (Array.isArray(res) ? res : [])
  } catch (e) {
    console.error('Erreur chargement rôles', e)
  } finally {
    isLoading.value = false
  }
}

const fetchPermissions = async () => {
  try {
    const res = await $api('/permissions', { method: 'GET' })
    permissions.value = res?.data ?? (Array.isArray(res) ? res : [])
  } catch (e) {
    console.error('Erreur chargement permissions', e)
  }
}

onMounted(() => {
  fetchRoles()
  fetchPermissions()
})

// ─── Création d'un rôle ──────────────────────────────────────────────────────
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
    await $api('/roles', {
      method: 'POST',
      body: { name: newRoleName.value.trim() },
    })
    isCreateDialogOpen.value = false
    await fetchRoles()
  } catch (e) {
    createErrors.value = e?.data?.errors ?? { name: 'Erreur lors de la création' }
  } finally {
    isSaving.value = false
  }
}

const deleteRole = async (role) => {
  if (!confirm(`Supprimer le rôle "${role.name}" ?`)) return
  try {
    await $api(`/roles/${role.id}`, { method: 'DELETE' })
    await fetchRoles()
  } catch (e) {
    console.error('Erreur suppression rôle', e)
  }
}

// ─── Gestion des permissions ─────────────────────────────────────────────────
const openPermissionDialog = (role) => {
  selectedRole.value = role

  // Initialiser la matrice à partir des permissions actuelles du rôle
  const matrix = {}
  SCREENS.forEach(screen => {
    matrix[screen.subject] = {}
    ACTIONS.forEach(action => {
      const permName = `${action}-${screen.subject}`
      matrix[screen.subject][action] = role.permissions?.includes(permName) ?? false
    })
  })
  permMatrix.value = matrix
  isPermissionDialogOpen.value = true
}

// Vérifie si une permission existe dans la liste globale
const permissionExists = (action, subject) => {
  const name = `${action}-${subject}`
  return permissions.value.some(p => (p.name ?? p) === name)
}

// Sauvegarder les changements de la matrice
const savePermissions = async () => {
  isSaving.value = true
  try {
    const toAssign = []
    const toRevoke = []

    SCREENS.forEach(screen => {
      ACTIONS.forEach(action => {
        const permName = `${action}-${screen.subject}`
        if (!permissionExists(action, screen.subject)) return

        const hasNow    = permMatrix.value[screen.subject]?.[action] ?? false
        const hadBefore = selectedRole.value.permissions?.includes(permName) ?? false

        if (hasNow && !hadBefore) toAssign.push(permName)
        if (!hasNow && hadBefore) toRevoke.push(permName)
      })
    })

    if (toAssign.length > 0) {
      await $api(`/roles/${selectedRole.value.id}/permissions`, {
        method: 'POST',
        body: { permissions: toAssign },
      })
    }
    if (toRevoke.length > 0) {
      await $api(`/roles/${selectedRole.value.id}/permissions`, {
        method: 'DELETE',
        body: { permissions: toRevoke },
      })
    }

    isPermissionDialogOpen.value = false
    await fetchRoles()
  } catch (e) {
    console.error('Erreur sauvegarde permissions', e)
  } finally {
    isSaving.value = false
  }
}

// Tout cocher / décocher pour une ligne
const toggleRow = (subject) => {
  const anyChecked = ACTIONS.some(a => permissionExists(a, subject) && permMatrix.value[subject]?.[a])
  ACTIONS.forEach(a => {
    if (permissionExists(a, subject))
      permMatrix.value[subject][a] = !anyChecked
  })
}

// Tout cocher / décocher pour une colonne
const toggleColumn = (action) => {
  const anyChecked = SCREENS.some(s => permissionExists(action, s.subject) && permMatrix.value[s.subject]?.[action])
  SCREENS.forEach(s => {
    if (permissionExists(action, s.subject))
      permMatrix.value[s.subject][action] = !anyChecked
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const roleColors = ['primary', 'success', 'error', 'warning', 'info', 'secondary']
const getRoleColor = (index) => roleColors[index % roleColors.length]

const countPermissions = (role) => role.permissions?.length ?? 0
</script>

<template>
  <!-- ── Chargement ─────────────────────────────────────────────────────────── -->
  <div
    v-if="isLoading"
    class="text-center py-8"
  >
    <VProgressCircular indeterminate color="primary" />
  </div>

  <VRow v-else>
    <!-- ── Carte par rôle ──────────────────────────────────────────────────── -->
    <VCol
      v-for="(role, index) in roles"
      :key="role.id"
      cols="12"
      sm="6"
      lg="4"
    >
      <VCard class="h-100">
        <VCardText>
          <div class="d-flex align-center justify-space-between mb-3">
            <VChip
              :color="getRoleColor(index)"
              size="small"
              label
            >
              {{ role.name }}
            </VChip>
            <div class="d-flex gap-1">
              <IconBtn
                size="small"
                @click="openPermissionDialog(role)"
              >
                <VIcon icon="tabler-lock-cog" size="18" />
                <VTooltip activator="parent">Gérer les permissions</VTooltip>
              </IconBtn>
              <IconBtn
                v-if="role.name !== 'Super Admin'"
                size="small"
                color="error"
                @click="deleteRole(role)"
              >
                <VIcon icon="tabler-trash" size="18" />
                <VTooltip activator="parent">Supprimer le rôle</VTooltip>
              </IconBtn>
            </div>
          </div>

          <div class="text-body-2 text-medium-emphasis">
            <VIcon icon="tabler-shield-check" size="16" class="me-1" />
            {{ countPermissions(role) }} permission{{ countPermissions(role) !== 1 ? 's' : '' }}
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- ── Carte création ─────────────────────────────────────────────────── -->
    <VCol
      cols="12"
      sm="6"
      lg="4"
    >
      <VCard
        class="h-100 d-flex align-center justify-center cursor-pointer"
        style="min-height: 110px; border: 2px dashed rgba(var(--v-border-color), var(--v-border-opacity));"
        @click="openCreateDialog"
      >
        <VCardText class="text-center">
          <VIcon icon="tabler-plus" size="32" color="primary" class="mb-2" />
          <div class="text-body-1 text-primary font-weight-medium">Créer un nouveau rôle</div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <!-- ── Dialog création de rôle ──────────────────────────────────────────── -->
  <VDialog
    v-model="isCreateDialogOpen"
    max-width="480"
  >
    <VCard>
      <VCardTitle class="d-flex align-center pa-4">
        <VIcon icon="tabler-shield-plus" class="me-2" />
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
        <VBtn
          variant="outlined"
          @click="isCreateDialogOpen = false"
        >
          Annuler
        </VBtn>
        <VBtn
          color="primary"
          :loading="isSaving"
          @click="createRole"
        >
          Créer
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- ── Dialog matrice de permissions ────────────────────────────────────── -->
  <VDialog
    v-model="isPermissionDialogOpen"
    max-width="900"
    scrollable
  >
    <VCard v-if="selectedRole">
      <VCardTitle class="d-flex align-center pa-4">
        <VIcon icon="tabler-lock-cog" class="me-2" />
        Permissions — <strong class="ms-1">{{ selectedRole.name }}</strong>
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
                <th class="screen-col text-left pa-3">Écran / Module</th>
                <th
                  v-for="action in ACTIONS"
                  :key="action"
                  class="action-col text-center pa-2"
                >
                  <div class="text-capitalize text-body-2 font-weight-medium">
                    {{ action }}
                  </div>
                  <VBtn
                    size="x-small"
                    variant="text"
                    density="compact"
                    class="mt-1"
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
                  <div class="d-flex align-center gap-2">
                    <span class="text-body-1">{{ screen.label }}</span>
                    <VBtn
                      size="x-small"
                      variant="text"
                      density="compact"
                      @click="toggleRow(screen.subject)"
                    >
                      tout
                    </VBtn>
                  </div>
                </td>
                <td
                  v-for="action in ACTIONS"
                  :key="action"
                  class="action-col text-center pa-2"
                >
                  <VCheckbox
                    v-if="permissionExists(action, screen.subject)"
                    v-model="permMatrix[screen.subject][action]"
                    hide-details
                    density="compact"
                    class="d-flex justify-center"
                  />
                  <span
                    v-else
                    class="text-medium-emphasis"
                    title="Permission non définie"
                  >—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </VCardText>

      <VDivider />

      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn
          variant="outlined"
          @click="isPermissionDialogOpen = false"
        >
          Annuler
        </VBtn>
        <VBtn
          color="primary"
          :loading="isSaving"
          @click="savePermissions"
        >
          Enregistrer
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.permission-matrix {
  border-collapse: collapse;
}

.permission-matrix thead tr {
  background-color: rgba(var(--v-theme-surface-variant), 0.5);
  border-bottom: 2px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.permission-row:nth-child(even) {
  background-color: rgba(var(--v-theme-surface-variant), 0.2);
}

.permission-row:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.screen-col {
  min-width: 220px;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.action-col {
  min-width: 80px;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
