<script setup>
import { useStatusManagement } from '@/composables/useStatusManagement'
import CouriersAddDrawer from '@/pages/app/couriers/add/index.vue'

const { getStatusOptions, getStatusColor, getStatusLabel } = useStatusManagement()

const searchQuery = ref('')
const selectedStatus = ref()
const selectedVehicleType = ref()

// Data table options
const itemsPerPage = ref(15)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()
const selectedRows = ref([])
const isLoading = ref(false)
const isAddDriverDrawerOpen = ref(false)

const isSuccessSnackVisible = ref(false)
const successSnackText = ref('Driver created successfully')

const updateOptions = options => {
  sortBy.value = options.sortBy[0]?.key
  orderBy.value = options.sortBy[0]?.order
}

// Headers for drivers table
const headers = [
  {
    title: 'Driver',
    key: 'driver',
  },
  {
    title: 'Phone',
    key: 'phone',
  },
  {
    title: 'Vehicle Type',
    key: 'vehicle_type',
  },
  {
    title: 'Plate',
    key: 'plate_number',
  },
  {
    title: 'Neighborhood',
    key: 'neighborhood',
  },
  {
    title: 'Status',
    key: 'status',
  },
  {
    title: 'Deliveries',
    key: 'deliveries_count',
  },
  {
    title: 'Actions',
    key: 'actions',
    sortable: false,
  },
]

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
})

// 👉 search filters
const statusOptions = computed(() => getStatusOptions('drivers'))

const vehicleTypes = [
  {
    title: 'Moto',
    value: 'Moto',
  },
  {
    title: 'Car',
    value: 'Car',
  },
  {
    title: 'Bicycle',
    value: 'Bicycle',
  },
]

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
    successSnackText.value = 'Driver created successfully'
    isSuccessSnackVisible.value = true
    fetchDrivers()
  } catch (error) {
    console.error('Error creating driver:', error)
    // Show error to user
    isSuccessSnackVisible.value = true
    successSnackText.value = error.data?.message || 'Error creating driver. Check console for details.'
    // Don't close drawer on error
  }
}

const deleteDriver = async id => {
  try {
    await $api(`/drivers/${id}`, { method: 'DELETE' })

    // Delete from selectedRows
    const index = selectedRows.value.findIndex(row => row === id)
    if (index !== -1)
      selectedRows.value.splice(index, 1)

    // Refetch drivers
    fetchDrivers()
  } catch (error) {
    console.error('Error deleting driver:', error)
  }
}
</script>

<template>
  <section>
    <VCard class="mb-6">
      <VCardItem class="pb-4">
        <VCardTitle>Drivers</VCardTitle>
      </VCardItem>

      <VCardText>
        <VRow>
          <!-- 👉 Select Status -->
          <VCol
            cols="12"
            sm="4"
          >
            <AppSelect
              v-model="selectedStatus"
              placeholder="Filter by status"
              :items="statusOptions"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>
          <!-- 👉 Select Vehicle Type -->
          <VCol
            cols="12"
            sm="4"
          >
            <AppSelect
              v-model="selectedVehicleType"
              placeholder="Filter by vehicle type"
              :items="vehicleTypes"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>
        </VRow>
      </VCardText>

      <VDivider />

      <VCardText class="d-flex flex-wrap gap-4">
        <div class="me-3 d-flex gap-3">
          <AppSelect
            :model-value="itemsPerPage"
            :items="[
              { value: 15, title: '15' },
              { value: 25, title: '25' },
              { value: 50, title: '50' },
              { value: 100, title: '100' },
            ]"
            style="inline-size: 6.25rem;"
            @update:model-value="itemsPerPage = parseInt($event, 10)"
          />
        </div>
        <VSpacer />

        <div class="app-user-search-filter d-flex align-center flex-wrap gap-4">
          <!-- 👉 Search  -->
          <div style="inline-size: 15.625rem;">
            <AppTextField
              v-model="searchQuery"
              placeholder="Search by name or phone"
              clearable
            />
          </div>

          <!-- 👉 Export button -->
          <VBtn
            variant="tonal"
            color="secondary"
            prepend-icon="tabler-upload"
          >
            Export
          </VBtn>

          <!-- 👉 Add driver button -->
          <VBtn
            prepend-icon="tabler-plus"
            @click="isAddDriverDrawerOpen = true"
          >
            Add Driver
          </VBtn>
        </div>
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
                {{ item.user?.name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'N/A' }}
              </h6>
              <div class="text-sm text-disabled">
                {{ item.user?.email || 'N/A' }}
              </div>
            </div>
          </div>
        </template>

        <!-- Phone -->
        <template #item.phone="{ item }">
          <div class="text-body-1">
            {{ item.phone || item.user?.phone || 'N/A' }}
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
              {{ item.vehicle_type || 'N/A' }}
            </div>
          </div>
        </template>

        <!-- Plate Number -->
        <template #item.plate_number="{ item }">
          <div class="text-body-1 font-weight-medium">
            {{ item.plate_number || 'N/A' }}
          </div>
        </template>

        <!-- Neighborhood -->
        <template #item.neighborhood="{ item }">
          <div class="text-body-1">
            {{ item.neighborhood || 'N/A' }}
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
            {{ item.current_status?.name || 'N/A' }}
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
          <IconBtn @click="deleteDriver(item.id)">
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
                <VListItem>
                  <template #prepend>
                    <VIcon icon="tabler-eye" />
                  </template>
                  <VListItemTitle>View</VListItemTitle>
                </VListItem>

                <VListItem link>
                  <template #prepend>
                    <VIcon icon="tabler-pencil" />
                  </template>
                  <VListItemTitle>Edit</VListItemTitle>
                </VListItem>

                <VListItem @click="deleteDriver(item.id)">
                  <template #prepend>
                    <VIcon icon="tabler-trash" />
                  </template>
                  <VListItemTitle>Delete</VListItemTitle>
                </VListItem>
              </VList>
            </VMenu>
          </VBtn>
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
      @submit="addNewDriver"
    />
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
