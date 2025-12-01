<script setup>
import { VForm } from 'vuetify/components/VForm'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  rolePermissions: {
    type: Object,
    required: false,
    default: () => ({
      name: '',
      permissions: [],
    }),
  },
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits([
  'update:isDialogVisible',
  'update:rolePermissions',
])

// Roles data from API
const roles = ref([])
const isLoadingRoles = ref(false)
const selectedRoleId = ref(null)
const selectedRole = ref(null)

// Available permissions (will be extracted from all roles)
const allPermissions = ref([])

// Fetch roles from API
const fetchRoles = async () => {
  isLoadingRoles.value = true
  try {
    const response = await $api('/roles', {
      method: 'GET',
    })

    console.log('=== Roles API Response ===')
    console.log('Response:', response)
    console.log('==========================')

    // Handle response structure: { success: true, data: { roles: [...] } }
    if (response && response.success && response.data && response.data.roles) {
      roles.value = response.data.roles
      
      // Extract all unique permissions from all roles
      const permissionsSet = new Set()
      response.data.roles.forEach(role => {
        if (role.permissions && Array.isArray(role.permissions)) {
          role.permissions.forEach(permission => {
            permissionsSet.add(permission)
          })
        }
      })
      allPermissions.value = Array.from(permissionsSet).sort()
    } else if (response && response.data && Array.isArray(response.data)) {
      roles.value = response.data
      
      // Extract all unique permissions
      const permissionsSet = new Set()
      response.data.forEach(role => {
        if (role.permissions && Array.isArray(role.permissions)) {
          role.permissions.forEach(permission => {
            permissionsSet.add(permission)
          })
        }
      })
      allPermissions.value = Array.from(permissionsSet).sort()
    } else if (Array.isArray(response)) {
      roles.value = response
      
      // Extract all unique permissions
      const permissionsSet = new Set()
      response.forEach(role => {
        if (role.permissions && Array.isArray(role.permissions)) {
          role.permissions.forEach(permission => {
            permissionsSet.add(permission)
          })
        }
      })
      allPermissions.value = Array.from(permissionsSet).sort()
    } else {
      roles.value = []
      allPermissions.value = []
    }

    console.log('=== Processed Roles ===')
    console.log('Roles count:', roles.value.length)
    console.log('All permissions:', allPermissions.value)
    console.log('========================')
  } catch (error) {
    console.error('Error fetching roles:', error)
    roles.value = []
    allPermissions.value = []
  } finally {
    isLoadingRoles.value = false
  }
}

// Watch for role selection
watch(selectedRoleId, (newRoleId) => {
  if (newRoleId) {
    selectedRole.value = roles.value.find(role => role.id === newRoleId)
  } else {
    selectedRole.value = null
  }
})

// Group permissions by subject (e.g., "view-delivery" -> "delivery")
const groupPermissionsBySubject = (permissions) => {
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

// Check if role has permission
const roleHasPermission = (role, permission) => {
  if (!role || !role.permissions) return false
  return role.permissions.includes(permission)
}

// Load roles on mount
onMounted(() => {
  fetchRoles()
})

// Watch dialog visibility to reload roles when opened
watch(() => props.isDialogVisible, (isVisible) => {
  if (isVisible) {
    fetchRoles()
    selectedRoleId.value = null
    selectedRole.value = null
  }
})

const onReset = () => {
  emit('update:isDialogVisible', false)
  selectedRoleId.value = null
  selectedRole.value = null
}
</script>

<template>
  <VDialog
    :width="$vuetify.display.smAndDown ? 'auto' : 1000"
    :model-value="props.isDialogVisible"
    @update:model-value="onReset"
  >
    <!-- 👉 Dialog close btn -->
    <DialogCloseBtn @click="onReset" />

    <VCard class="pa-sm-10 pa-2">
      <VCardText>
        <!-- 👉 Title -->
        <h4 class="text-h4 text-center mb-2">
          {{ $t('Roles & Permissions') }}
        </h4>
        <p class="text-body-1 text-center mb-6">
          {{ $t('View existing roles and their permissions') }}
        </p>

        <!-- 👉 Loading State -->
        <div
          v-if="isLoadingRoles"
          class="text-center py-8"
        >
          <VProgressCircular
            indeterminate
            color="primary"
          />
          <p class="mt-4">
            {{ $t('Loading roles...') }}
          </p>
        </div>

        <!-- 👉 Roles List -->
        <div
          v-else
          class="mb-6"
        >
          <h5 class="text-h5 mb-4">
            {{ $t('Select a Role to View Permissions') }}
          </h5>
          
          <AppSelect
            v-model="selectedRoleId"
            :items="roles.map(role => ({ title: role.name, value: role.id }))"
            :placeholder="$t('Select a role')"
            clearable
            class="mb-6"
          >
            <template #prepend-inner>
              <VIcon icon="tabler-lock" />
            </template>
          </AppSelect>

          <!-- 👉 Selected Role Details -->
          <VCard
            v-if="selectedRole"
            variant="outlined"
            class="mt-4"
          >
            <VCardItem>
              <VCardTitle class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-shield-check"
                  color="primary"
                />
                {{ selectedRole.name }}
              </VCardTitle>
              <VCardSubtitle>
                {{ $t('Role ID') }}: {{ selectedRole.id }}
                <span
                  v-if="selectedRole.guard_name"
                  class="ms-2"
                >
                  • {{ $t('Guard') }}: {{ selectedRole.guard_name }}
                </span>
              </VCardSubtitle>
            </VCardItem>

            <VDivider />

            <VCardText>
              <div class="mb-4">
                <h6 class="text-h6 mb-3">
                  {{ $t('Permissions') }} ({{ selectedRole.permissions?.length || 0 }})
                </h6>

                <!-- Grouped Permissions -->
                <div
                  v-if="selectedRole.permissions && selectedRole.permissions.length > 0"
                  class="permissions-list"
                >
                  <div
                    v-for="(actions, subject) in groupPermissionsBySubject(selectedRole.permissions)"
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
                        color="primary"
                        variant="tonal"
                        class="text-capitalize"
                      >
                        {{ action }}
                      </VChip>
                    </div>
                  </div>
                </div>

                <!-- Empty State -->
                <VAlert
                  v-else
                  type="info"
                  variant="tonal"
                >
                  {{ $t('This role has no permissions assigned.') }}
                </VAlert>
              </div>

              <!-- All Permissions List -->
              <VDivider class="my-4" />
              
              <div>
                <h6 class="text-h6 mb-3">
                  {{ $t('All Permissions') }}
                </h6>
                <div class="d-flex flex-wrap gap-2">
                  <VChip
                    v-for="permission in allPermissions"
                    :key="permission"
                    size="small"
                    :color="roleHasPermission(selectedRole, permission) ? 'success' : 'secondary'"
                    :variant="roleHasPermission(selectedRole, permission) ? 'flat' : 'tonal'"
                    class="text-capitalize"
                  >
                    <VIcon
                      v-if="roleHasPermission(selectedRole, permission)"
                      icon="tabler-check"
                      size="16"
                      class="me-1"
                    />
                    {{ formatPermission(permission) }}
                  </VChip>
                </div>
              </div>
            </VCardText>
          </VCard>

          <!-- 👉 Empty State when no role selected -->
          <VAlert
            v-else-if="!selectedRoleId && roles.length > 0"
            type="info"
            variant="tonal"
            class="mt-4"
          >
            <template #prepend>
              <VIcon icon="tabler-info-circle" />
            </template>
            {{ $t('Please select a role from the dropdown above to view its permissions.') }}
          </VAlert>

          <!-- 👉 No Roles Available -->
          <VAlert
            v-else-if="roles.length === 0"
            type="warning"
            variant="tonal"
            class="mt-4"
          >
            <template #prepend>
              <VIcon icon="tabler-alert-triangle" />
            </template>
            {{ $t('No roles found. Please create roles first.') }}
          </VAlert>
        </div>

        <!-- 👉 Actions button -->
        <div class="d-flex align-center justify-center gap-4">
          <VBtn
            color="secondary"
            variant="tonal"
            @click="onReset"
          >
            {{ $t('Close') }}
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
.permissions-list {
  .permission-group {
    padding: 1rem;
    background-color: rgba(var(--v-theme-surface), 1);
    border-radius: 8px;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
}
</style>
