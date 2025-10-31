<script setup>
import { useStatusManagement } from '@/composables/useStatusManagement'
import PartnerAddDialog from '../add.vue'

const { getStatusOptions, getStatusColor, getStatusLabel } = useStatusManagement()

const searchQuery = ref('')
const statusOptions = computed(() => getStatusOptions('partners'))
const selectedStatus = ref()
const selectedBusinessSector = ref()

// Data table options
const itemsPerPage = ref(15)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()
const selectedRows = ref([])
const isLoading = ref(false)
const isAddPartnerDialogOpen = ref(false)

const isSuccessSnackVisible = ref(false)
const successSnackText = ref('Partner created successfully')

const updateOptions = options => {
  sortBy.value = options.sortBy[0]?.key
  orderBy.value = options.sortBy[0]?.order
}

// Headers for partners table
const headers = [
  {
    title: 'Prospection Date',
    key: 'prospection_date',
  },
  {
    title: 'Company Name',
    key: 'company_name',
  },
  {
    title: 'Contact',
    key: 'contact',
  },
  {
    title: 'Business Sector',
    key: 'business_sector',
  },
  {
    title: 'Zone',
    key: 'zone',
  },
  {
    title: 'Address',
    key: 'address',
  },
  {
    title: 'Interest Level',
    key: 'interest_level',
  },
  {
    title: 'Status',
    key: 'status',
  },
  {
    title: 'Actions',
    key: 'actions',
    sortable: false,
  },
]

// Partners data
const partners = ref([])
const totalPartners = ref(0)

// 👉 Fetch Partners
const fetchPartners = async () => {
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

    if (selectedBusinessSector.value) {
      // eslint-disable-next-line camelcase
      queryParams.business_sector = selectedBusinessSector.value
    }

    // Build query string
    const queryString = new URLSearchParams(queryParams).toString()
    const url = `/partners${queryString ? `?${queryString}` : ''}`

    console.log('=== Calling /partners API ===')
    console.log('URL:', url)
    console.log('Query params:', queryParams)
    console.log('===============================')

    const response = await $api(url, {
      method: 'GET',
    })

    console.log('=== Response from /partners API ===')
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
        partners.value = response
        totalPartners.value = response.length
      } else if (response.data && Array.isArray(response.data)) {
        // Response has { data: [...], meta: {...} } structure
        partners.value = response.data
        totalPartners.value = response.meta?.total || response.data.length
      } else {
        partners.value = []
        totalPartners.value = 0
      }
    } else {
      partners.value = []
      totalPartners.value = 0
    }
  } catch (error) {
    console.error('Error fetching partners:', error)
    partners.value = []
    totalPartners.value = 0
  } finally {
    isLoading.value = false
  }
}

// Watch for changes and refetch
watch([searchQuery, selectedStatus, selectedBusinessSector, itemsPerPage], () => {
  page.value = 1
  fetchPartners()
})

watch(page, () => {
  fetchPartners()
})

// Call on mount
onMounted(() => {
  fetchPartners()
})

const businessSectors = [
  {
    title: 'Restaurant',
    value: 'restaurant',
  },
  {
    title: 'Retail',
    value: 'retail',
  },
  {
    title: 'E-commerce',
    value: 'ecommerce',
  },
  {
    title: 'Healthcare',
    value: 'healthcare',
  },
  {
    title: 'Technology',
    value: 'technology',
  },
  {
    title: 'Services',
    value: 'services',
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

const resolveBusinessSectorIcon = businessSector => {
  const sector = businessSector?.toLowerCase() || ''
  if (sector === 'restaurant')
    return 'tabler-tools-kitchen-2'
  if (sector === 'retail')
    return 'tabler-shopping-bag'
  if (sector === 'ecommerce')
    return 'tabler-shopping-cart'
  if (sector === 'healthcare')
    return 'tabler-heart'
  if (sector === 'technology')
    return 'tabler-device-laptop'
  if (sector === 'services')
    return 'tabler-briefcase'
  
  return 'tabler-building'
}

const addNewPartner = async () => {
  // Refresh partners list after adding
  fetchPartners() // This should be renamed to fetchPartners
  successSnackText.value = 'Partner created successfully'
  isSuccessSnackVisible.value = true
}

const deletePartner = async id => {
  try {
    await $api(`/partners/${id}`, { method: 'DELETE' })

    // Delete from selectedRows
    const index = selectedRows.value.findIndex(row => row === id)
    if (index !== -1)
      selectedRows.value.splice(index, 1)

    // Refetch partners
    fetchPartners()
  } catch (error) {
    console.error('Error deleting partner:', error)
  }
}
</script>

<template>
  <section>
    <VCard class="mb-6">
      <VCardItem class="pb-4">
        <VCardTitle>Partners</VCardTitle>
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
          <!-- 👉 Select Business Sector -->
          <VCol
            cols="12"
            sm="4"
          >
            <AppSelect
              v-model="selectedBusinessSector"
              placeholder="Filter by business sector"
              :items="businessSectors"
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

          <!-- 👉 Add partner button -->
          <VBtn
            prepend-icon="tabler-plus"
            @click="isAddPartnerDialogOpen = true"
          >
            Add Partner
          </VBtn>
        </div>
      </VCardText>

      <VDivider />

      <!-- SECTION datatable -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:model-value="selectedRows"
        v-model:page="page"
        :items="partners"
        :loading="isLoading"
        item-value="id"
        :items-length="totalPartners"
        :headers="headers"
        class="text-no-wrap"
        show-select
        @update:options="updateOptions"
      >
        <!-- Company Name -->
        <template #item.company_name="{ item }">
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

        <!-- Business Sector -->
        <template #item.business_sector="{ item }">
          <div class="d-flex align-center gap-x-2">
            <VIcon
              :icon="resolveBusinessSectorIcon(item.business_sector)"
              size="20"
              color="primary"
            />
            <div class="text-body-1 text-capitalize">
              {{ item.business_sector || 'N/A' }}
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
          <IconBtn @click="deletePartner(item.id)">
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

                <VListItem @click="deletePartner(item.id)">
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
            :total-items="totalPartners"
          />
        </template>
      </VDataTableServer>
      <!-- SECTION -->
    </VCard>

    <PartnerAddDialog
      v-model:is-dialog-visible="isAddPartnerDialogOpen"
      @partner-added="addNewPartner"
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
