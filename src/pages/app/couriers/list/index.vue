<script setup>
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

const updateOptions = options => {
  sortBy.value = options.sortBy[0]?.key
  orderBy.value = options.sortBy[0]?.order
}

// Headers for drivers table
const headers = [
  {
    title: 'Livreur',
    key: 'driver',
  },
  {
    title: 'Téléphone',
    key: 'phone',
  },
  {
    title: 'Type de véhicule',
    key: 'vehicle_type',
  },
  {
    title: 'Plaque',
    key: 'plate_number',
  },
  {
    title: 'Quartier',
    key: 'neighborhood',
  },
  {
    title: 'Statut',
    key: 'status',
  },
  {
    title: 'Livraisons',
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
    console.log('Response type:', typeof response)
    console.log('Is Array:', Array.isArray(response))
    console.log('Response length:', Array.isArray(response) ? response.length : 'N/A')
    
    // Check if response is wrapped or direct array
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      console.log('Response data:', response?.data)
      console.log('Response meta:', response?.meta)
      console.log('Response links:', response?.links)
      console.log('Response keys:', Object.keys(response))
    } else if (Array.isArray(response)) {
      console.log('Response is directly an array with', response.length, 'items')
      console.log('First item:', response[0])
    } else {
      console.log('Unexpected response format')
    }
    console.log('===============================')

    // Handle different response structures
    if (response) {
      if (Array.isArray(response)) {
        // Response is directly an array
        drivers.value = response
        totalDrivers.value = response.length
      } else if (response.data && Array.isArray(response.data)) {
        // Response has { data: [...], meta: {...} } structure
        drivers.value = response.data
        totalDrivers.value = response.meta?.total || response.data.length
      } else {
        drivers.value = []
        totalDrivers.value = 0
      }
    } else {
      drivers.value = []
      totalDrivers.value = 0
    }
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
const statusOptions = [
  {
    title: 'Libre',
    value: 'Libre',
  },
  {
    title: 'Occupé',
    value: 'Occupé',
  },
  {
    title: 'Indisponible',
    value: 'Indisponible',
  },
]

const vehicleTypes = [
  {
    title: 'Moto',
    value: 'moto',
  },
  {
    title: 'Voiture',
    value: 'voiture',
  },
  {
    title: 'Vélo',
    value: 'velo',
  },
]

const resolveStatusVariant = statusName => {
  const status = statusName?.toLowerCase() || ''
  if (status === 'libre')
    return 'success'
  if (status === 'occupé')
    return 'warning'
  if (status === 'ocar' || status === 'indisponible')
    return 'error'
  
  return 'secondary'
}

const resolveVehicleTypeIcon = vehicleType => {
  const type = vehicleType?.toLowerCase() || ''
  if (type === 'moto')
    return 'tabler-motorbike'
  if (type === 'voiture' || type === 'car')
    return 'tabler-car'
  if (type === 'velo' || type === 'bike')
    return 'tabler-bike'
  
  return 'tabler-truck'
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
        <VCardTitle>Livreurs</VCardTitle>
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
              placeholder="Filtrer par statut"
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
              placeholder="Filtrer par type de véhicule"
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
              placeholder="Rechercher par nom ou téléphone"
              clearable
            />
          </div>

          <!-- 👉 Export button -->
          <VBtn
            variant="tonal"
            color="secondary"
            prepend-icon="tabler-upload"
          >
            Exporter
          </VBtn>

          <!-- 👉 Add driver button -->
          <VBtn prepend-icon="tabler-plus">
            Ajouter un livreur
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
                {{ item.user?.name || 'N/A' }}
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
            {{ item.user?.phone || 'N/A' }}
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
            :color="resolveStatusVariant(item.current_status?.status_name)"
            size="small"
            label
            class="text-capitalize"
          >
            {{ item.current_status?.status_name || 'N/A' }}
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
                  <VListItemTitle>Voir</VListItemTitle>
                </VListItem>

                <VListItem link>
                  <template #prepend>
                    <VIcon icon="tabler-pencil" />
                  </template>
                  <VListItemTitle>Modifier</VListItemTitle>
                </VListItem>

                <VListItem @click="deleteDriver(item.id)">
                  <template #prepend>
                    <VIcon icon="tabler-trash" />
                  </template>
                  <VListItemTitle>Supprimer</VListItemTitle>
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
  </section>
</template>
