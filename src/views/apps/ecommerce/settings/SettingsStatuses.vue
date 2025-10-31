<script setup>
import { useStatusManagement } from '@/composables/useStatusManagement'

const { 
  statusCategories, 
  isLoading, 
  getStatusesByCategory, 
  addStatus, 
  updateStatus, 
  deleteStatus, 
  saveAllStatuses, 
} = useStatusManagement()

const selectedCategory = ref('deliveries')
const isAddStatusDialogOpen = ref(false)
const isEditStatusDialogOpen = ref(false)
const isDeleteConfirmDialogOpen = ref(false)
const editingStatus = ref(null)
const statusToDelete = ref(null)

const newStatus = ref({
  name: '',
  label: '',
  color: 'primary',
  icon: 'tabler-circle',
  description: '',
  category: 'deliveries',
})

const colorOptions = [
  { title: 'Primary', value: 'primary' },
  { title: 'Success', value: 'success' },
  { title: 'Info', value: 'info' },
  { title: 'Warning', value: 'warning' },
  { title: 'Error', value: 'error' },
  { title: 'Secondary', value: 'secondary' },
]

const iconOptions = [
  { title: 'Circle', value: 'tabler-circle' },
  { title: 'Clock', value: 'tabler-clock' },
  { title: 'User Check', value: 'tabler-user-check' },
  { title: 'Truck', value: 'tabler-truck' },
  { title: 'Check', value: 'tabler-check' },
  { title: 'X', value: 'tabler-x' },
  { title: 'Alert', value: 'tabler-alert-circle' },
  { title: 'Pause', value: 'tabler-player-pause' },
  { title: 'Play', value: 'tabler-player-play' },
  { title: 'User', value: 'tabler-user' },
  { title: 'Users', value: 'tabler-users' },
  { title: 'Building', value: 'tabler-building' },
  { title: 'Handshake', value: 'tabler-handshake' },
  { title: 'Star', value: 'tabler-star' },
  { title: 'Heart', value: 'tabler-heart' },
]

const categoryOptions = [
  { title: 'Deliveries', value: 'deliveries', icon: 'tabler-truck', description: 'Status for delivery requests' },
  { title: 'Drivers', value: 'drivers', icon: 'tabler-user', description: 'Status for drivers/couriers' },
  { title: 'Partners', value: 'partners', icon: 'tabler-building-store', description: 'Status for business partners' },
  { title: 'Clients', value: 'clients', icon: 'tabler-users', description: 'Status for clients' },
]

const currentStatuses = computed(() => getStatusesByCategory(selectedCategory.value))

const addNewStatus = async () => {
  const success = await addStatus(selectedCategory.value, newStatus.value)
  if (success) {
    resetNewStatus()
    isAddStatusDialogOpen.value = false
  }
}

const editStatus = status => {
  editingStatus.value = { ...status }
  isEditStatusDialogOpen.value = true
}

const updateExistingStatus = async () => {
  const success = await updateStatus(selectedCategory.value, editingStatus.value)
  if (success) {
    isEditStatusDialogOpen.value = false
    editingStatus.value = null
  }
}

const confirmDeleteStatus = status => {
  statusToDelete.value = status
  isDeleteConfirmDialogOpen.value = true
}

const deleteExistingStatus = async () => {
  if (!statusToDelete.value) return

  const success = await deleteStatus(selectedCategory.value, statusToDelete.value.id)
  if (success) {
    isDeleteConfirmDialogOpen.value = false
    statusToDelete.value = null
  } else {
    console.error('Failed to delete status')
  }
}

const cancelDelete = () => {
  isDeleteConfirmDialogOpen.value = false
  statusToDelete.value = null
}

const resetNewStatus = () => {
  newStatus.value = {
    name: '',
    label: '',
    color: 'primary',
    icon: 'tabler-circle',
    description: '',
    category: selectedCategory.value,
  }
}

const saveConfiguration = async () => {
  const success = await saveAllStatuses()
  if (success) {
    console.log('All statuses saved successfully')
  } else {
    console.error('Error saving statuses')
  }
}

// Update new status category when selected category changes
watch(selectedCategory, newCategory => {
  newStatus.value.category = newCategory
})

// Load statuses on component mount
onMounted(() => {
  // Status loading is handled by the composable
})
</script>

<template>
  <div>
    <VCard
      title="Status Management"
      class="mb-6"
    >
      <VCardText>
        <VAlert
          type="info"
          variant="tonal"
          class="mb-6"
        >
          <VAlertTitle class="mb-2">
            Application Status Configuration
          </VAlertTitle>
          <p class="mb-0">
            Manage all status types used throughout the application. Configure statuses for deliveries, drivers, partners, and clients with custom colors, icons, and descriptions.
          </p>
        </VAlert>

        <!-- Category Selection -->
        <div class="mb-6">
          <h6 class="text-h6 mb-3">
            Select Category
          </h6>
          <VRow>
            <VCol
              v-for="category in categoryOptions"
              :key="category.value"
              cols="12"
              sm="6"
              md="3"
            >
              <VCard
                :variant="selectedCategory === category.value ? 'elevated' : 'outlined'"
                :color="selectedCategory === category.value ? 'primary' : undefined"
                class="cursor-pointer h-100"
                @click="selectedCategory = category.value"
              >
                <VCardText class="text-center pa-4">
                  <VIcon
                    :icon="category.icon"
                    size="32"
                    :color="selectedCategory === category.value ? 'white' : 'primary'"
                    class="mb-2"
                  />
                  <h6 
                    class="text-h6 mb-1"
                    :class="selectedCategory === category.value ? 'text-white' : ''"
                  >
                    {{ category.title }}
                  </h6>
                  <p 
                    class="text-sm mb-0"
                    :class="selectedCategory === category.value ? 'text-white' : 'text-medium-emphasis'"
                  >
                    {{ category.description }}
                  </p>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>
        </div>

        <!-- Add New Status Button -->
        <div class="d-flex justify-space-between align-center mb-4">
          <h6 class="text-h6">
            {{ categoryOptions.find(c => c.value === selectedCategory)?.title }} Statuses
          </h6>
          <VBtn
            color="primary"
            prepend-icon="tabler-plus"
            @click="isAddStatusDialogOpen = true"
          >
            Add New Status
          </VBtn>
        </div>

        <!-- Status List for Selected Category -->
        <VRow>
          <VCol
            v-for="status in currentStatuses"
            :key="status.id"
            cols="12"
            md="6"
            lg="4"
          >
            <VCard
              variant="outlined"
              class="h-100"
              :class="[{ 'border-primary': !status.isDefault }]"
            >
              <VCardText class="d-flex flex-column h-100">
                <div class="d-flex align-center justify-space-between mb-3">
                  <div class="d-flex align-center gap-2 flex-grow-1 min-w-0">
                    <VChip
                      :color="status.color"
                      size="small"
                      label
                      class="text-truncate"
                    >
                      <VIcon
                        :icon="status.icon"
                        size="14"
                        class="me-1"
                      />
                      {{ status.label }}
                    </VChip>
                    <VChip
                      v-if="!status.isDefault"
                      size="x-small"
                      color="success"
                      variant="tonal"
                    >
                      Custom
                    </VChip>
                  </div>
                  
                  <div class="d-flex align-center ms-2">
                    <VBtn
                      icon
                      size="small"
                      variant="text"
                      color="medium-emphasis"
                    >
                      <VIcon icon="tabler-dots-vertical" />
                      <VMenu activator="parent">
                        <VList>
                          <VListItem
                            prepend-icon="tabler-edit"
                            title="Edit Status"
                            value="edit"
                            @click="editStatus(status)"
                          />
                          <VListItem
                            prepend-icon="tabler-trash"
                            :title="status.canEdit ? 'Delete Status' : 'Cannot Delete (Default)'"
                            :value="status.canEdit ? 'delete' : 'disabled'"
                            :disabled="!status.canEdit"
                            @click="status.canEdit && confirmDeleteStatus(status)"
                          />
                        </VList>
                      </VMenu>
                    </VBtn>
                  </div>
                </div>

                <div class="flex-grow-1">
                  <h6 class="text-h6 mb-2">
                    {{ status.name }}
                  </h6>
                  <p class="text-sm text-medium-emphasis mb-0">
                    {{ status.description }}
                  </p>
                </div>

                <div
                  v-if="status.isDefault"
                  class="mt-3"
                >
                  <VChip
                    size="x-small"
                    color="secondary"
                    variant="tonal"
                  >
                    Default Status
                  </VChip>
                </div>
              </VCardText>
            </VCard>
          </VCol>

          <!-- Empty State -->
          <VCol
            v-if="currentStatuses.length === 0"
            cols="12"
          >
            <VCard
              variant="outlined"
              class="text-center pa-8"
            >
              <VIcon
                icon="tabler-inbox"
                size="48"
                color="secondary"
                class="mb-4"
              />
              <h6 class="text-h6 mb-2">
                No statuses configured
              </h6>
              <p class="text-medium-emphasis mb-4">
                Add your first status for {{ categoryOptions.find(c => c.value === selectedCategory)?.title.toLowerCase() }}
              </p>
              <VBtn
                color="primary"
                prepend-icon="tabler-plus"
                @click="isAddStatusDialogOpen = true"
              >
                Add First Status
              </VBtn>
            </VCard>
          </VCol>
        </VRow>

        <!-- Save Button -->
        <VDivider class="my-6" />
        <div class="d-flex justify-end">
          <VBtn
            color="primary"
            :loading="isLoading"
            @click="saveConfiguration"
          >
            <VIcon
              icon="tabler-device-floppy"
              class="me-2"
            />
            Save All Configurations
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <!-- Add Status Dialog -->
    <VDialog
      v-model="isAddStatusDialogOpen"
      max-width="600"
    >
      <VCard>
        <VCardTitle>
          Add New {{ categoryOptions.find(c => c.value === selectedCategory)?.title.slice(0, -1) }} Status
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VForm @submit.prevent="addNewStatus">
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="newStatus.name"
                  label="Status Name"
                  placeholder="e.g., On Hold"
                  required
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="newStatus.label"
                  label="Display Label"
                  placeholder="e.g., En attente"
                  required
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppSelect
                  v-model="newStatus.color"
                  label="Color"
                  :items="colorOptions"
                  required
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppSelect
                  v-model="newStatus.icon"
                  label="Icon"
                  :items="iconOptions"
                  required
                />
              </VCol>
              <VCol cols="12">
                <AppTextarea
                  v-model="newStatus.description"
                  label="Description"
                  placeholder="Describe when this status should be used"
                  rows="3"
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VDivider />
        <VCardActions class="d-flex justify-end gap-3 pa-4">
          <VBtn
            color="secondary"
            variant="tonal"
            @click="isAddStatusDialogOpen = false; resetNewStatus()"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :disabled="!newStatus.name || !newStatus.label"
            @click="addNewStatus"
          >
            Add Status
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Edit Status Dialog -->
    <VDialog
      v-model="isEditStatusDialogOpen"
      max-width="600"
    >
      <VCard v-if="editingStatus">
        <VCardTitle>Edit Status</VCardTitle>
        <VDivider />
        <VCardText>
          <VForm @submit.prevent="updateExistingStatus">
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="editingStatus.name"
                  label="Status Name"
                  required
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="editingStatus.label"
                  label="Display Label"
                  required
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppSelect
                  v-model="editingStatus.color"
                  label="Color"
                  :items="colorOptions"
                  required
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppSelect
                  v-model="editingStatus.icon"
                  label="Icon"
                  :items="iconOptions"
                  required
                />
              </VCol>
              <VCol cols="12">
                <AppTextarea
                  v-model="editingStatus.description"
                  label="Description"
                  rows="3"
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VDivider />
        <VCardActions class="d-flex justify-end gap-3 pa-4">
          <VBtn
            color="secondary"
            variant="tonal"
            @click="isEditStatusDialogOpen = false; editingStatus = null"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            @click="updateExistingStatus"
          >
            Update Status
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Delete Confirmation Dialog -->
    <VDialog
      v-model="isDeleteConfirmDialogOpen"
      max-width="500"
    >
      <VCard v-if="statusToDelete">
        <VCardTitle class="d-flex align-center gap-2">
          <VIcon
            icon="tabler-alert-triangle"
            color="error"
            size="24"
          />
          Confirm Deletion
        </VCardTitle>
        <VDivider />
        <VCardText class="pt-4">
          <p class="text-body-1 mb-2">
            Are you sure you want to delete this status?
          </p>
          <VCard
            variant="tonal"
            color="error"
            class="mt-4"
          >
            <VCardText class="d-flex align-center gap-3">
              <VChip
                :color="statusToDelete.color"
                size="small"
                label
              >
                <VIcon
                  :icon="statusToDelete.icon"
                  size="14"
                  class="me-1"
                />
                {{ statusToDelete.label }}
              </VChip>
              <div>
                <h6 class="text-h6 mb-1">
                  {{ statusToDelete.name }}
                </h6>
                <p class="text-sm text-medium-emphasis mb-0">
                  {{ statusToDelete.description }}
                </p>
              </div>
            </VCardText>
          </VCard>
          <VAlert
            type="warning"
            variant="tonal"
            class="mt-4"
          >
            <VAlertTitle class="mb-1">
              Warning
            </VAlertTitle>
            This action cannot be undone. Any items using this status may be affected.
          </VAlert>
        </VCardText>
        <VDivider />
        <VCardActions class="d-flex justify-end gap-3 pa-4">
          <VBtn
            color="secondary"
            variant="tonal"
            @click="cancelDelete"
          >
            Cancel
          </VBtn>
          <VBtn
            color="error"
            @click="deleteExistingStatus"
          >
            <VIcon
              icon="tabler-trash"
              class="me-2"
            />
            Delete Status
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
