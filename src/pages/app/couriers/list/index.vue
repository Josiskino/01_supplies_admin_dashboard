<script setup>
import { useStatusManagement } from '@/composables/useStatusManagement'
import CouriersAddDrawer from '@/pages/app/couriers/add/index.vue'
import { echo } from '@/plugins/echo'
import { exportToExcel } from '@/utils/export'
import { useI18n } from 'vue-i18n'

const { getStatusOptions, getStatusColor, getStatusLabel } = useStatusManagement()
const { t } = useI18n()

const searchQuery = ref('')
const selectedStatus = ref()
const selectedVehicleType = ref()

// Data table options
const itemsPerPage = ref(100)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()
const selectedRows = ref([])
const isLoading = ref(false)
const isAddDriverDrawerOpen = ref(false)
const driverToEdit = ref(null)
const isDeleteDialogOpen = ref(false)
const driverToDelete = ref(null)

const isSuccessSnackVisible = ref(false)
const successSnackText = ref(t('Driver created successfully'))

const updateOptions = options => {
  sortBy.value = options.sortBy[0]?.key
  orderBy.value = options.sortBy[0]?.order
}

// Headers for drivers table
const headers = computed(() => [
  {
    title: t('Driver'),
    key: 'driver',
  },
  {
    title: t('Phone'),
    key: 'phone',
  },
  {
    title: t('Vehicle Type'),
    key: 'vehicle_type',
  },
  {
    title: t('Plate'),
    key: 'plate_number',
  },
  {
    title: t('Neighborhood'),
    key: 'neighborhood',
  },
  {
    title: t('Status'),
    key: 'status',
  },
  {
    title: t('Deliveries'),
    key: 'deliveries_count',
  },
  {
    title: t('Actions'),
    key: 'actions',
    sortable: false,
  },
])

// Drivers data
const drivers = ref([])
const totalDrivers = ref(0)

// 👉 Fetch Drivers
const fetchDrivers = async () => {
  isLoading.value = true
  try {
    // Build query parameters
    // eslint-disable-next-line camelcase
    const queryParams = {
      // eslint-disable-next-line camelcase
      per_page: itemsPerPage.value,
      page: page.value,
    }

    if (searchQuery.value) {
      queryParams.search = searchQuery.value
    }

    if (selectedStatus.value) {
      queryParams.status = selectedStatus.value
    }

    if (selectedVehicleType.value) {
      // eslint-disable-next-line camelcase
      queryParams.vehicle_type = selectedVehicleType.value
    }

    // Build query string
    const queryString = new URLSearchParams(queryParams).toString()
    const url = `/drivers${queryString ? `?${queryString}` : ''}`

    console.log('=== Calling /drivers API ===')
    console.log('URL:', url)
    console.log('Query params:', queryParams)
    console.log('===============================')

    const response = await $api(url, {
      method: 'GET',
    })

    console.log('=== Response from /drivers API ===')
    console.log('Full response:', response)
    
    // Handle response structure: { data: [...], meta: {...}, links: {...} }
    if (response && response.data && Array.isArray(response.data)) {
      // Extract data array
      drivers.value = response.data
      
      // Extract total from meta (meta.total is an array, get first element)
      const metaTotal = response.meta?.total
      if (Array.isArray(metaTotal) && metaTotal.length > 0) {
        totalDrivers.value = metaTotal[0]
      } else if (typeof metaTotal === 'number') {
        totalDrivers.value = metaTotal
      } else {
        totalDrivers.value = response.data.length
      }
      
      console.log('Drivers loaded:', drivers.value.length)
      console.log('Total drivers:', totalDrivers.value)
      console.log('Meta:', response.meta)
    } else if (Array.isArray(response)) {
      // Fallback: response is directly an array
      drivers.value = response
      totalDrivers.value = response.length
      console.log('Response is directly an array')
    } else {
      console.warn('Unexpected response format:', response)
      drivers.value = []
      totalDrivers.value = 0
    }
    console.log('===============================')
  } catch (error) {
    console.error('Error fetching drivers:', error)
    drivers.value = []
    totalDrivers.value = 0
  } finally {
    isLoading.value = false
  }
}

// Watch for changes and refetch
watch([searchQuery, selectedStatus, selectedVehicleType, itemsPerPage], () => {
  page.value = 1
  fetchDrivers()
})

watch(page, () => {
  fetchDrivers()
})

// Call on mount
onMounted(() => {
  fetchDrivers()

  echo.channel('driver-turnover')
    .listen('.DriverTurnoverUpdated', (event) => {
      console.log('Driver turnover update (List):', event)
      if (drivers.value && event.driver_id) {
        const driverIndex = drivers.value.findIndex(d => d.id === event.driver_id)
        if (driverIndex !== -1 && event.data) {
          // Update deliveries count and potentially other data if added later
          if (event.data.deliveries_count !== undefined) {
            drivers.value[driverIndex].deliveries_count = event.data.deliveries_count
          }
        }
      }
    })
})

onUnmounted(() => {
  echo.leave('driver-turnover')
})

// 👉 search filters
const statusOptions = computed(() => getStatusOptions('drivers'))

const vehicleTypes = computed(() => [
  {
    title: t('Moto'),
    value: 'Moto',
  },
  {
    title: t('Car'),
    value: 'Car',
  },
  {
    title: t('Bicycle'),
    value: 'Bicycle',
  },
])

const resolveStatusVariant = statusName => {
  const status = statusName?.toLowerCase() || ''
  if (status === 'libre' || status === 'disponible' || status === 'available')
    return 'success'
  if (status === 'occupé' || status === 'busy')
    return 'warning'
  if (status === 'indisponible' || status === 'offline' || status === 'unavailable')
    return 'error'
  if (status === 'suspendu' || status === 'suspended')
    return 'error'
  
  return 'secondary'
}

const resolveVehicleTypeIcon = vehicleType => {
  const type = vehicleType?.toLowerCase() || ''
  if (type === 'moto' || type === 'motorcycle' || type === 'motorbike')
    return 'tabler-motorbike'
  if (type === 'voiture' || type === 'car' || type === 'auto')
    return 'tabler-car'
  if (type === 'velo' || type === 'bike' || type === 'bicycle' || type === 'vélo')
    return 'tabler-bike'
  
  return 'tabler-truck'
}

const addNewDriver = async driverData => {
  try {
    if (driverToEdit.value) {
      // This should not happen as the drawer handles updates itself
      console.warn('addNewDriver called during edit mode')

      return
    }

    console.log('=== Sending driver creation request ===')
    console.log('Driver data:', driverData)
    console.log('========================================')
    
    const response = await $api('/drivers', {
      method: 'POST',
      body: driverData,
      onResponseError({ response }) {
        console.error('=== Driver creation error ===')
        console.error('Status:', response.status)
        console.error('Error data:', response._data)
        console.error('Errors:', response._data?.errors || response._data?.message || response._data)
        console.error('============================')
      },
    })
    
    console.log('Driver created successfully:', response)
    isAddDriverDrawerOpen.value = false
    successSnackText.value = t('Driver created successfully')
    isSuccessSnackVisible.value = true
    fetchDrivers()
  } catch (error) {
    console.error('Error creating driver:', error)

    // Show error to user
    isSuccessSnackVisible.value = true
    successSnackText.value = error.data?.message || t('Error creating driver. Check console for details.')

    // Don't close drawer on error
  }
}

// Edit driver
const editDriver = driver => {
  console.log('=== Editing driver ===')
  console.log('Driver data:', driver)
  console.log('Driver ID:', driver?.id)

  if (!driver || !driver.id) {
    console.error('Invalid driver data:', driver)
    return
  }

  // Set driver data first
  driverToEdit.value = { ...driver }
  
  // Open drawer after setting driver data
  // Use nextTick to ensure driverToEdit is set before drawer opens
  nextTick(() => {
    isAddDriverDrawerOpen.value = true
    console.log('Drawer opened:', isAddDriverDrawerOpen.value)
    console.log('driverToEdit:', driverToEdit.value)
  })

  console.log('========================')
}

// Confirm delete driver
const confirmDeleteDriver = driver => {
  driverToDelete.value = driver
  isDeleteDialogOpen.value = true
}

// Delete driver
const deleteDriver = async () => {
  if (!driverToDelete.value) return

  try {
    await $api(`/drivers/${driverToDelete.value.id}`, {
      method: 'DELETE',
    })

    // Delete from selectedRows
    const index = selectedRows.value.findIndex(row => row === driverToDelete.value.id)
    if (index !== -1)
      selectedRows.value.splice(index, 1)

    successSnackText.value = t('Driver deleted successfully')
    isSuccessSnackVisible.value = true

    // Refetch drivers
    fetchDrivers()
    isDeleteDialogOpen.value = false
    driverToDelete.value = null
  } catch (error) {
    console.error('Error deleting driver:', error)
    successSnackText.value = t('Error deleting driver')
    isSuccessSnackVisible.value = true
    isDeleteDialogOpen.value = false
    driverToDelete.value = null
  }
}

const cancelDelete = () => {
  isDeleteDialogOpen.value = false
  driverToDelete.value = null
}

// Handle driver added/updated
const onDriverAdded = () => {
  driverToEdit.value = null
  successSnackText.value = t('Driver updated successfully')
  isSuccessSnackVisible.value = true
  fetchDrivers()
}

const isExporting = ref(false)

const exportCouriers = async () => {
  isExporting.value = true
  try {
    // Build query parameters for all data
    const queryParams = {
      per_page: 1000, // Fetch all
    }

    if (searchQuery.value) queryParams.search = searchQuery.value
    if (selectedStatus.value) queryParams.status = selectedStatus.value
    if (selectedVehicleType.value) queryParams.vehicle_type = selectedVehicleType.value

    const queryString = new URLSearchParams(queryParams).toString()
    const url = `/drivers${queryString ? `?${queryString}` : ''}`
    
    const response = await $api(url, { method: 'GET' })
    const allDrivers = response?.data || []

    const headerMap = {
      'user.name': t('Driver Name'),
      'phone': t('Phone'),
      'vehicle_type': t('Vehicle Type'),
      'plate_number': t('Plate Number'),
      'neighborhood': t('Neighborhood'),
      'current_status.name': t('Status'),
      'deliveries_count': t('Deliveries'),
      'created_at': t('Created At'),
    }

    exportToExcel(allDrivers, 'Drivers', headerMap)
  } catch (error) {
    console.error('Error exporting couriers:', error)
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <section>
    <VCard class="mb-6">
      <VCardItem class="pb-2">
        <VCardTitle class="d-flex align-center justify-space-between">
          <span>{{ $t('Drivers') }}</span>
          <div class="d-flex align-center gap-2">
            <span class="text-body-2 text-medium-emphasis">{{ $t('Show') }}</span>
            <AppSelect
              :model-value="itemsPerPage"
              :items="[
                { value: 100, title: '100' },
                { value: 150, title: '150' },
                { value: 200, title: '200' },
                { value: 300, title: '300' },
              ]"
              style="inline-size: 7rem;"
              density="compact"
              @update:model-value="itemsPerPage = parseInt($event, 10)"
            />
            <VBtn
              prepend-icon="tabler-plus"
              color="primary"
              density="compact"
              @click="isAddDriverDrawerOpen = true"
            >
              {{ $t('Add Driver') }}
            </VBtn>
          </div>
        </VCardTitle>
      </VCardItem>

      <VCardText class="pt-2">
        <!-- Filters Section with All Controls on One Line -->
        <VRow class="mb-2">
          <!-- 👉 Select Status -->
          <VCol
            cols="12"
            md="3"
          >
            <AppSelect
              v-model="selectedStatus"
              :placeholder="$t('Filter by status')"
              :items="statusOptions"
              clearable
              clear-icon="tabler-x"
              density="compact"
            />
          </VCol>

          <!-- 👉 Select Vehicle Type -->
          <VCol
            cols="12"
            md="3"
          >
            <AppSelect
              v-model="selectedVehicleType"
              :placeholder="$t('Filter by vehicle type')"
              :items="vehicleTypes"
              clearable
              clear-icon="tabler-x"
              density="compact"
            />
          </VCol>

          <!-- 👉 Search  -->
          <VCol
            cols="12"
            md="4"
          >
            <AppTextField
              v-model="searchQuery"
              :placeholder="$t('Search by name or phone')"
              clearable
              density="compact"
            />
          </VCol>

          <!-- 👉 Export button -->
          <VCol
            cols="12"
            md="2"
            class="d-flex align-end"
          >
            <VBtn
              variant="tonal"
              color="secondary"
              prepend-icon="tabler-upload"
              block
              density="compact"
              :loading="isExporting"
              @click="exportCouriers"
            >
              {{ $t('Export') }}
            </VBtn>
          </VCol>
        </VRow>
      </VCardText>

      <VDivider />

      <!-- SECTION datatable -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:model-value="selectedRows"
        v-model:page="page"
        :items="drivers"
        :loading="isLoading"
        item-value="id"
        :items-length="totalDrivers"
        :headers="headers"
        :items-per-page-options="[
          { value: 100, title: '100' },
          { value: 150, title: '150' },
          { value: 200, title: '200' },
          { value: 300, title: '300' },
        ]"
        class="text-no-wrap"
        show-select
        @update:options="updateOptions"
      >
        <!-- Driver Info -->
        <template #item.driver="{ item }">
          <div class="d-flex align-center gap-x-4">
            <VAvatar
              size="34"
              variant="tonal"
              color="primary"
            >
              <VIcon icon="tabler-user" />
            </VAvatar>
            <div class="d-flex flex-column">
              <h6 class="text-base font-weight-medium">
                {{ item.user?.name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || $t('N/A') }}
              </h6>
              <div class="text-sm text-disabled">
                {{ item.user?.email || $t('N/A') }}
              </div>
            </div>
          </div>
        </template>

        <!-- Phone -->
        <template #item.phone="{ item }">
          <div class="text-body-1">
            {{ item.phone || item.user?.phone || $t('N/A') }}
          </div>
        </template>

        <!-- Vehicle Type -->
        <template #item.vehicle_type="{ item }">
          <div class="d-flex align-center gap-x-2">
            <VIcon
              :icon="resolveVehicleTypeIcon(item.vehicle_type)"
              size="20"
              color="primary"
            />
            <div class="text-body-1 text-capitalize">
              {{ item.vehicle_type || $t('N/A') }}
            </div>
          </div>
        </template>

        <!-- Plate Number -->
        <template #item.plate_number="{ item }">
          <div class="text-body-1 font-weight-medium">
            {{ item.plate_number || $t('N/A') }}
          </div>
        </template>

        <!-- Neighborhood -->
        <template #item.neighborhood="{ item }">
          <div class="text-body-1">
            {{ item.neighborhood || $t('N/A') }}
          </div>
        </template>

        <!-- Status -->
        <template #item.status="{ item }">
          <VChip
            :color="resolveStatusVariant(item.current_status?.name)"
            size="small"
            label
            class="text-capitalize"
          >
            {{ item.current_status?.name || $t('N/A') }}
          </VChip>
        </template>

        <!-- Deliveries Count -->
        <template #item.deliveries_count="{ item }">
          <div class="text-body-1 font-weight-medium">
            {{ item.deliveries_count || 0 }}
          </div>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <IconBtn @click.stop="editDriver(item)">
            <VIcon icon="tabler-pencil" />
            <VTooltip activator="parent">
              {{ $t('Edit Driver') }}
            </VTooltip>
          </IconBtn>

          <IconBtn @click.stop="confirmDeleteDriver(item)">
            <VIcon icon="tabler-trash" />
            <VTooltip activator="parent">
              {{ $t('Delete Driver') }}
            </VTooltip>
          </IconBtn>
        </template>

        <!-- pagination -->
        <template #bottom>
          <TablePagination
            v-model:page="page"
            :items-per-page="itemsPerPage"
            :total-items="totalDrivers"
          />
        </template>
      </VDataTableServer>
      <!-- SECTION -->
    </VCard>

    <CouriersAddDrawer
      v-model:isDrawerOpen="isAddDriverDrawerOpen"
      :driver-to-edit="driverToEdit"
      @submit="addNewDriver"
      @driver-added="onDriverAdded"
      @reset-driver-to-edit="driverToEdit = null"
    />

    <!-- Delete Confirmation Dialog -->
    <VDialog
      v-model="isDeleteDialogOpen"
      max-width="500"
      persistent
    >
      <VCard>
        <VCardTitle class="text-h5">
          {{ $t('Confirm Deletion') }}
        </VCardTitle>
        <VCardText>
          {{ $t('Are you sure you want to delete the driver') }} 
          <strong>{{ driverToDelete?.first_name }} {{ driverToDelete?.last_name }} ({{ driverToDelete?.user?.name }})</strong>?
          <br>
          {{ $t('This action cannot be undone.') }}
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            color="secondary"
            variant="tonal"
            @click="cancelDelete"
          >
            {{ $t('Cancel') }}
          </VBtn>
          <VBtn
            color="error"
            @click="deleteDriver"
          >
            {{ $t('Delete') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
    <VSnackbar
      v-model="isSuccessSnackVisible"
      location="top right"
      timeout="3000"
      color="success"
      variant="elevated"
    >
      {{ successSnackText }}
    </VSnackbar>
  </section>
</template>
