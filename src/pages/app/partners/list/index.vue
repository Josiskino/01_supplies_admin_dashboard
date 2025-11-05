<script setup>
import { useI18n } from 'vue-i18n'
import PartnerAddDialog from '../add.vue'

definePage({
  meta: {
    action: 'view',
    subject: 'partners',
  },
})

const { t } = useI18n()

const searchQuery = ref('')

const partnerStatuses = ref([])

const statusOptions = computed(() => {
  return partnerStatuses.value.map(status => ({
    title: status.name,
    value: status.id, // On utilise l'ID comme valeur pour l'envoi
  }))
})

const selectedStatus = ref()
const selectedBusinessSector = ref()
const isLoadingStatuses = ref(false)

// 👉 Fetch Partner Statuses
const fetchPartnerStatuses = async () => {
  isLoadingStatuses.value = true
  try {
    const response = await $api('/status/partner-statuses', {
      method: 'GET',
    })

    console.log('=== Partner Statuses Response ===')
    console.log('Full response:', response)
    
    if (response && response.success && response.data && Array.isArray(response.data)) {
      partnerStatuses.value = response.data
      console.log('Loaded statuses:', partnerStatuses.value)
    } else {
      console.warn('Unexpected response format:', response)
      partnerStatuses.value = []
    }
    console.log('==================================')
  } catch (error) {
    console.error('Error fetching partner statuses:', error)
    partnerStatuses.value = []
  } finally {
    isLoadingStatuses.value = false
  }
}

// Data table options
const itemsPerPage = ref(15)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()
const selectedRows = ref([])
const isLoading = ref(false)
const isAddPartnerDialogOpen = ref(false)
const partnerToEdit = ref(null)
const isDeleteDialogOpen = ref(false)
const partnerToDelete = ref(null)

const isSuccessSnackVisible = ref(false)
const successSnackText = ref(t('Partner created successfully'))

// Handle partner added/updated
const onPartnerAdded = () => {
  if (partnerToEdit.value) {
    successSnackText.value = t('Partner updated successfully')
  } else {
    successSnackText.value = t('Partner created successfully')
  }
  isSuccessSnackVisible.value = true
  partnerToEdit.value = null
  fetchPartners()
}

const updateOptions = options => {
  sortBy.value = options.sortBy[0]?.key
  orderBy.value = options.sortBy[0]?.order
}

// Headers for partners table
const headers = computed(() => [
  {
    title: t('Prospection Date'),
    key: 'prospection_date',
  },
  {
    title: t('Merchant Name'),
    key: 'merchant_name',
  },
  {
    title: t('Contact'),
    key: 'contact',
  },
  {
    title: t('Activity Sector'),
    key: 'activity_sector',
  },
  {
    title: t('Engagement Type'),
    key: 'engagement_type',
  },
  {
    title: t('Interest Shown'),
    key: 'interest_shown',
  },
  {
    title: t('Address'),
    key: 'address',
  },
  {
    title: t('Location'),
    key: 'location',
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
      queryParams.activity_sector = selectedBusinessSector.value
    }

    // Build query string
    const queryString = new URLSearchParams(queryParams).toString()
    const url = `/merchants${queryString ? `?${queryString}` : ''}`

    console.log('=== Calling /merchants API ===')
    console.log('Base URL:', import.meta.env.VITE_API_BASE_URL || '/api')
    console.log('Endpoint URL:', url)
    console.log('Full URL will be:', `${import.meta.env.VITE_API_BASE_URL || '/api'}${url}`)
    console.log('Query params:', queryParams)
    console.log('===============================')

    const response = await $api(url, {
      method: 'GET',
    })

    console.log('=== Response from /merchants API ===')
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
      } else if (response.success && response.data) {
        // Response has { success: true, data: [...] } structure
        if (Array.isArray(response.data)) {
          partners.value = response.data
          totalPartners.value = response.meta?.total || response.data.length
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // Nested structure: { success: true, data: { data: [...], meta: {...} } }
          partners.value = response.data.data
          totalPartners.value = response.data.meta?.total || response.data.data.length
        } else {
          partners.value = []
          totalPartners.value = 0
        }
      } else if (response.data && Array.isArray(response.data)) {
        // Response has { data: [...], meta: {...} } structure (without success)
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

    // Debug: Log the final partners data structure
    console.log('=== Final partners data structure ===')
    console.log('Partners count:', partners.value.length)
    if (partners.value.length > 0) {
      console.log('First partner:', partners.value[0])
      console.log('First partner default_address:', partners.value[0]?.default_address)
      console.log('First partner addresses:', partners.value[0]?.addresses)
      console.log('Has default_address?:', !!partners.value[0]?.default_address)
      console.log('Has addresses?:', !!partners.value[0]?.addresses)
      if (partners.value[0]?.default_address) {
        console.log('default_address.address:', partners.value[0].default_address.address)
        console.log('default_address.location:', partners.value[0].default_address.location)
      }
    }
    console.log('====================================')
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
  fetchPartnerStatuses()
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
  if (status === 'actif' || status === 'active')
    return 'success'
  if (status === 'inactif' || status === 'inactive')
    return 'secondary'
  if (status === 'suspendu' || status === 'suspended')
    return 'error'
  if (status === 'prospection' || status === 'prospecting')
    return 'info'
  
  return 'secondary'
}

const resolveBusinessSectorIcon = activitySector => {
  const sector = activitySector?.toLowerCase() || ''
  if (sector.includes('restaurant') || sector.includes('restauration'))
    return 'tabler-tools-kitchen-2'
  if (sector.includes('retail') || sector.includes('commerce'))
    return 'tabler-shopping-bag'
  if (sector.includes('ecommerce') || sector.includes('e-commerce'))
    return 'tabler-shopping-cart'
  if (sector.includes('healthcare') || sector.includes('santé'))
    return 'tabler-heart'
  if (sector.includes('technology') || sector.includes('technologie'))
    return 'tabler-device-laptop'
  if (sector.includes('services'))
    return 'tabler-briefcase'
  
  return 'tabler-building'
}

const addNewPartner = async () => {
  // Refresh partners list after adding
  fetchPartners() // This should be renamed to fetchPartners
  successSnackText.value = 'Partner created successfully'
  isSuccessSnackVisible.value = true
}

// Edit partner
const editPartner = partner => {
  console.log('=== Editing partner ===')
  console.log('Partner data:', partner)
  console.log('Partner ID:', partner?.id)
  
  if (!partner || !partner.id) {
    console.error('Invalid partner data:', partner)

    return
  }
  
  // Set partner data and open dialog immediately
  partnerToEdit.value = { ...partner }
  
  // Force reactivity update
  nextTick(() => {
    isAddPartnerDialogOpen.value = true
    console.log('Dialog should be open:', isAddPartnerDialogOpen.value)
    console.log('partnerToEdit set:', partnerToEdit.value)
  })
  
  console.log('========================')
}

// Confirm delete partner
const confirmDeletePartner = partner => {
  partnerToDelete.value = partner
  isDeleteDialogOpen.value = true
}

// Delete partner
const deletePartner = async () => {
  if (!partnerToDelete.value) return
  
  try {
    await $api(`/merchants/${partnerToDelete.value.id}`, {
      method: 'DELETE',
    })

    // Delete from selectedRows
    const index = selectedRows.value.findIndex(row => row === partnerToDelete.value.id)
    if (index !== -1)
      selectedRows.value.splice(index, 1)

    successSnackText.value = t('Partner deleted successfully')
    isSuccessSnackVisible.value = true
    
    // Refetch partners
    fetchPartners()
    isDeleteDialogOpen.value = false
    partnerToDelete.value = null
  } catch (error) {
    console.error('Error deleting partner:', error)
    successSnackText.value = t('Error deleting partner')
    isSuccessSnackVisible.value = true
    isDeleteDialogOpen.value = false
    partnerToDelete.value = null
  }
}

const cancelDelete = () => {
  isDeleteDialogOpen.value = false
  partnerToDelete.value = null
}
</script>

<template>
  <section>
    <VCard class="mb-6">
      <VCardItem class="pb-4">
        <VCardTitle>{{ $t('Partners') }}</VCardTitle>
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
              :placeholder="$t('Filter by status')"
              :items="statusOptions"
              :loading="isLoadingStatuses"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>
          <!-- 👉 Select Activity Sector -->
          <VCol
            cols="12"
            sm="4"
          >
            <AppSelect
              v-model="selectedBusinessSector"
              :placeholder="$t('Filter by activity sector')"
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
              :placeholder="$t('Search by name or phone')"
              clearable
            />
          </div>

          <!-- 👉 Export button -->
          <VBtn
            variant="tonal"
            color="secondary"
            prepend-icon="tabler-upload"
          >
            {{ $t('Export') }}
          </VBtn>

          <!-- 👉 Add partner button -->
          <VBtn
            prepend-icon="tabler-plus"
            @click="isAddPartnerDialogOpen = true"
          >
            {{ $t('Add Partner') }}
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
        <!-- Prospection Date -->
        <template #item.prospection_date="{ item }">
          <div class="text-body-1">
            {{ item.prospection_date ? new Date(item.prospection_date).toLocaleDateString() : $t('N/A') }}
          </div>
        </template>

        <!-- Merchant Name -->
        <template #item.merchant_name="{ item }">
          <div class="d-flex align-center gap-x-4">
            <VAvatar
              size="34"
              variant="tonal"
              color="primary"
            >
              <VIcon icon="tabler-building-store" />
            </VAvatar>
            <div class="d-flex flex-column">
              <h6 class="text-base font-weight-medium">
                {{ (item.merchant_name || $t('N/A')).toUpperCase() }}
              </h6>
            </div>
          </div>
        </template>

        <!-- Contact -->
        <template #item.contact="{ item }">
          <div class="d-flex flex-column">
            <div
              v-if="item.contact_name"
              class="text-body-1 font-weight-medium"
            >
              {{ item.contact_name }}
            </div>
            <div
              v-if="item.phone"
              :class="item.contact_name ? 'text-sm text-disabled' : 'text-body-1 font-weight-medium'"
            >
              {{ item.phone }}
            </div>
            <div
              v-if="!item.contact_name && !item.phone"
              class="text-body-1 text-disabled"
            >
              {{ $t('N/A') }}
            </div>
          </div>
        </template>

        <!-- Activity Sector -->
        <template #item.activity_sector="{ item }">
          <div class="d-flex align-center gap-x-2">
            <VIcon
              :icon="resolveBusinessSectorIcon(item.activity_sector)"
              size="20"
              color="primary"
            />
            <div class="text-body-1">
              {{ item.activity_sector || $t('N/A') }}
            </div>
          </div>
        </template>

        <!-- Engagement Type -->
        <template #item.engagement_type="{ item }">
          <VChip
            color="info"
            size="small"
            variant="tonal"
            class="text-capitalize"
          >
            {{ item.engagement_type || $t('N/A') }}
          </VChip>
        </template>

        <!-- Interest Shown -->
        <template #item.interest_shown="{ item }">
          <div
            class="text-body-2"
            style="max-inline-size: 200px;"
          >
            {{ item.interest_shown || $t('N/A') }}
          </div>
        </template>

        <!-- Address -->
        <template #item.address="{ item }">
          <div
            v-if="item.default_address"
            class="d-flex flex-column"
            style="max-inline-size: 200px;"
          >
            <div
              v-if="item.default_address.label"
              class="text-xs text-disabled mb-1"
            >
              {{ item.default_address.label }}
            </div>
            <div class="text-body-2">
              {{ item.default_address.address || $t('N/A') }}
            </div>
          </div>
          <div
            v-else-if="item.addresses && item.addresses.length > 0"
            class="d-flex flex-column"
            style="max-inline-size: 200px;"
          >
            <div
              v-if="item.addresses[0].label"
              class="text-xs text-disabled mb-1"
            >
              {{ item.addresses[0].label }}
            </div>
            <div class="text-body-2">
              {{ item.addresses[0].address || $t('N/A') }}
            </div>
          </div>
          <div
            v-else
            class="text-body-2 text-disabled"
          >
            —
          </div>
        </template>

        <!-- Location -->
        <template #item.location="{ item }">
          <div
            v-if="item.default_address?.location"
            class="text-body-2"
            style="max-inline-size: 200px; word-break: break-word;"
          >
            {{ item.default_address.location }}
          </div>
          <div
            v-else-if="item.addresses?.length > 0 && item.addresses[0]?.location"
            class="text-body-2"
            style="max-inline-size: 200px; word-break: break-word;"
          >
            {{ item.addresses[0].location }}
          </div>
          <div
            v-else
            class="text-body-2 text-disabled"
          >
            —
          </div>
        </template>

        <!-- Status -->
        <template #item.status="{ item }">
          <VChip
            :color="resolveStatusVariant(item.status?.name)"
            size="small"
            label
            class="text-capitalize"
          >
            {{ item.status?.name || $t('N/A') }}
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
          <IconBtn @click.stop="editPartner(item)">
            <VIcon icon="tabler-pencil" />
            <VTooltip activator="parent">
              {{ $t('Edit Partner') }}
            </VTooltip>
          </IconBtn>

          <IconBtn @click.stop="confirmDeletePartner(item)">
            <VIcon icon="tabler-trash" />
            <VTooltip activator="parent">
              {{ $t('Delete Partner') }}
            </VTooltip>
          </IconBtn>
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
      :partner-to-edit="partnerToEdit"
      @partner-added="onPartnerAdded"
      @reset-partner-to-edit="partnerToEdit = null"
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
          {{ $t('Are you sure you want to delete the partner') }} 
          <strong>{{ partnerToDelete?.merchant_name?.toUpperCase() }}</strong>?
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
            @click="deletePartner"
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
