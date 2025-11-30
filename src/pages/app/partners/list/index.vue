<script setup>
import { useI18n } from 'vue-i18n'
import PartnerAddDialog from '../add.vue'

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
const sortBy = ref('merchant_name') // Default sort by merchant_name
const sortOrder = ref('asc') // Default order: asc
const selectedRows = ref([])
const isLoading = ref(false)
const isAddPartnerDialogOpen = ref(false)
const partnerToEdit = ref(null)
const isDeleteDialogOpen = ref(false)
const partnerToDelete = ref(null)

// Helper function to normalize page value to a number
const normalizePage = (val) => {
  try {
    // Handle refs - check if it's a ref object
    let actualVal = val
    if (val && typeof val === 'object' && 'value' in val) {
      actualVal = val.value
    }
    
    // Handle arrays
    if (Array.isArray(actualVal)) {
      const first = actualVal[0]
      const num = Number(first)
      return isNaN(num) || num < 1 ? 1 : num
    }
    
    // Handle primitives
    const num = Number(actualVal)
    if (isNaN(num) || num < 1) {
      return 1
    }
    
    return num
  } catch (error) {
    console.error('Error in normalizePage:', error, 'Value:', val)
    return 1 // Default to page 1 on error
  }
}

// Computed property for normalized page value
const normalizedPage = computed(() => normalizePage(page.value))

// Pagination metadata from API
const paginationMeta = ref({
  total: 0,
  per_page: 15,
  current_page: 1,
  last_page: 1,
  from: 0,
  to: 0,
})

// Pagination links from API
const paginationLinks = ref({
  first: null,
  last: null,
  prev: null,
  next: null,
})

// Sort options
const sortOptions = [
  { title: t('Merchant Name'), value: 'merchant_name' },
  { title: t('Created At'), value: 'created_at' },
  { title: t('Prospection Date'), value: 'prospection_date' },
  { title: t('Phone'), value: 'phone' },
  { title: t('Activity Sector'), value: 'activity_sector' },
]

// Sort order options
const sortOrderOptions = [
  { title: t('Ascending (A-Z)'), value: 'asc' },
  { title: t('Descending (Z-A)'), value: 'desc' },
]

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
  // Update sort from table options if available
  if (options.sortBy && options.sortBy.length > 0) {
    const tableSortKey = options.sortBy[0]?.key
    const tableSortOrder = options.sortBy[0]?.order
    
    // Map table sort keys to API sort keys
    const sortKeyMap = {
      'merchant_name': 'merchant_name',
      'prospection_date': 'prospection_date',
      'phone': 'phone',
      'activity_sector': 'activity_sector',
      'created_at': 'created_at',
    }
    
    if (tableSortKey && sortKeyMap[tableSortKey]) {
      sortBy.value = sortKeyMap[tableSortKey]
      sortOrder.value = tableSortOrder === 'desc' ? 'desc' : 'asc'
    }
  }
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
    const queryParams = {
      per_page: itemsPerPage.value,
      page: page.value,
    }

    // Add sort parameters if available
    if (sortBy.value) {
      queryParams.sort_by = sortBy.value
    }

    if (sortOrder.value) {
      queryParams.sort_order = sortOrder.value
    }

    if (searchQuery.value) {
      queryParams.search = searchQuery.value
    }

    if (selectedStatus.value) {
      queryParams.status = selectedStatus.value
    }

    if (selectedBusinessSector.value) {
      queryParams.activity_sector = selectedBusinessSector.value
    }

    // Build query string
    const queryString = new URLSearchParams(queryParams).toString()
    const url = `/merchants${queryString ? `?${queryString}` : ''}`

    console.log('=== Calling /merchants API ===')
    console.log('Endpoint URL:', url)
    console.log('Query params:', queryParams)
    console.log('===============================')

    const response = await $api(url, {
      method: 'GET',
    })

    console.log('=== Response from /merchants API ===')
    console.log('Full response:', response)
      console.log('Response data:', response?.data)
      console.log('Response meta:', response?.meta)
      console.log('Response links:', response?.links)
    console.log('===============================')

    // Handle API response with pagination structure: { data: [...], meta: {...}, links: {...} }
    if (response) {
      if (response.data && Array.isArray(response.data)) {
        // Standard pagination structure
        partners.value = response.data
        
        // Update pagination metadata
        if (response.meta) {
          // Helper function to extract number from array or return the value itself
          const extractNumber = (value) => {
            if (Array.isArray(value)) {
              return value.length > 0 ? Number(value[0]) : 0
            }
            return Number(value) || 0
          }
          
          const total = extractNumber(response.meta.total)
          const perPage = extractNumber(response.meta.per_page) || itemsPerPage.value
          const currentPage = extractNumber(response.meta.current_page) || page.value
          const lastPage = extractNumber(response.meta.last_page)
          const from = extractNumber(response.meta.from)
          const to = extractNumber(response.meta.to)
          
          const calculatedLastPage = total > 0 ? Math.ceil(total / perPage) : 1
          const finalLastPage = lastPage || calculatedLastPage
          
          paginationMeta.value = {
            total: total,
            per_page: perPage,
            current_page: currentPage,
            last_page: finalLastPage,
            from: from,
            to: to,
          }
          
          // Update totalPartners for VDataTableServer
          totalPartners.value = total
          
          console.log('=== Pagination Meta Updated ===')
          console.log('Total:', total)
          console.log('Per page:', perPage)
          console.log('Last page from API:', lastPage)
          console.log('Calculated last page:', calculatedLastPage)
          console.log('Using last page:', finalLastPage)
          console.log('Current page:', currentPage)
          console.log('================================')
          
          // Sync page with API response (but don't trigger watch if same value)
          const normalizedCurrentPage = normalizePage(currentPage)
          if (normalizedCurrentPage !== normalizePage(page.value)) {
            console.log('Syncing page from API:', normalizedCurrentPage, 'current:', page.value)
            // Directly update without triggering watch (we're already in fetchPartners)
            page.value = normalizedCurrentPage
          }
        } else {
          // Fallback if no meta
          totalPartners.value = response.data.length
          const calculatedLastPage = response.data.length > 0 ? Math.ceil(response.data.length / itemsPerPage.value) : 1
          paginationMeta.value = {
            total: response.data.length,
            per_page: itemsPerPage.value,
            current_page: 1,
            last_page: calculatedLastPage,
            from: 1,
            to: response.data.length,
          }
        }
        
        // Update pagination links
        if (response.links) {
          paginationLinks.value = {
            first: response.links.first || null,
            last: response.links.last || null,
            prev: response.links.prev || null,
            next: response.links.next || null,
          }
        }
      } else if (Array.isArray(response)) {
        // Response is directly an array (fallback for old API format)
        partners.value = response
        totalPartners.value = response.length
        paginationMeta.value = {
          total: response.length,
          per_page: itemsPerPage.value,
          current_page: 1,
          last_page: 1,
          from: 1,
          to: response.length,
        }
      } else {
        partners.value = []
        totalPartners.value = 0
        paginationMeta.value = {
          total: 0,
          per_page: itemsPerPage.value,
          current_page: 1,
          last_page: 1,
          from: 0,
          to: 0,
        }
      }
    } else {
      partners.value = []
      totalPartners.value = 0
    }

    console.log('=== Final partners data ===')
    console.log('Partners count:', partners.value.length)
    console.log('Total partners:', totalPartners.value)
    console.log('Pagination meta:', paginationMeta.value)
    console.log('Last page:', paginationMeta.value.last_page)
    console.log('Current page:', page.value)
    console.log('Items per page:', itemsPerPage.value)
    console.log('Calculated pages:', Math.ceil(totalPartners.value / itemsPerPage.value))
    console.log('===========================')
  } catch (error) {
    console.error('Error fetching partners:', error)
    partners.value = []
    totalPartners.value = 0
    paginationMeta.value = {
      total: 0,
      per_page: itemsPerPage.value,
      current_page: 1,
      last_page: 1,
      from: 0,
      to: 0,
    }
  } finally {
    isLoading.value = false
  }
}

// Watch for changes and refetch
watch([searchQuery, selectedStatus, selectedBusinessSector, itemsPerPage, sortBy, sortOrder], () => {
  page.value = 1 // Reset to first page when filters change
  fetchPartners()
})

// Function to handle page change from pagination
const handlePageChange = (val) => {
  console.log('=== handlePageChange called ===')
  console.log('New page value:', val, 'Type:', typeof val)
  console.log('Current page.value:', page.value, 'Type:', typeof page.value)
  
  // Normalize the incoming value
  const pageNum = normalizePage(val)
  console.log('Normalized page number:', pageNum)
  
  // Get current normalized page
  const currentPageNum = normalizePage(page.value)
  console.log('Current normalized page:', currentPageNum)
  
  // Only update if different
  if (pageNum !== currentPageNum && !isNaN(pageNum) && pageNum > 0) {
    console.log('Updating page from', currentPageNum, 'to', pageNum)
    page.value = pageNum
  } else {
    console.log('Page unchanged or invalid, skipping update')
  }
}

watch(page, (newPage, oldPage) => {
  // Only fetch if page actually changed (avoid infinite loops)
  const normalizedNewPage = normalizePage(newPage)
  const normalizedOldPage = oldPage !== undefined ? normalizePage(oldPage) : undefined
  
  console.log('=== Page changed ===')
  console.log('New page:', normalizedNewPage)
  console.log('Old page:', normalizedOldPage)
  console.log('====================')
  
  if (normalizedNewPage !== normalizedOldPage && normalizedOldPage !== undefined) {
    console.log('Fetching partners for page:', normalizedNewPage)
    fetchPartners()
  } else {
    console.log('Skipping fetch (no real change)')
  }
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
      <VCardItem class="pb-2">
        <VCardTitle class="d-flex align-center justify-space-between">
          <span>{{ $t('Partners') }}</span>
          <div class="d-flex align-center gap-2">
            <span class="text-body-2 text-medium-emphasis">{{ $t('Show') }}</span>
            <AppSelect
              :model-value="itemsPerPage"
              :items="[
                { value: 15, title: '15' },
                { value: 30, title: '30' },
                { value: 50, title: '50' },
              ]"
              style="inline-size: 7rem;"
              density="compact"
              @update:model-value="itemsPerPage = parseInt($event, 10)"
            />
            <VBtn
              prepend-icon="tabler-plus"
              color="primary"
              density="compact"
              @click="isAddPartnerDialogOpen = true"
            >
              {{ $t('Add Partner') }}
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
            md="2"
          >
            <AppSelect
              v-model="selectedStatus"
              :placeholder="$t('Filter by status')"
              :items="statusOptions"
              :loading="isLoadingStatuses"
              clearable
              clear-icon="tabler-x"
              density="compact"
            />
          </VCol>

          <!-- 👉 Select Activity Sector -->
          <VCol
            cols="12"
            md="2"
          >
            <AppSelect
              v-model="selectedBusinessSector"
              :placeholder="$t('Filter by activity sector')"
              :items="businessSectors"
              clearable
              clear-icon="tabler-x"
              density="compact"
            />
          </VCol>

          <!-- 👉 Sort by field -->
          <VCol
            cols="12"
            md="2"
          >
            <AppSelect
              v-model="sortBy"
              :items="sortOptions"
              :placeholder="$t('Sort by')"
              density="compact"
            />
          </VCol>

          <!-- 👉 Sort order -->
          <VCol
            cols="12"
            md="2"
          >
            <AppSelect
              v-model="sortOrder"
              :items="sortOrderOptions"
              :placeholder="$t('Order')"
              density="compact"
            />
          </VCol>

          <!-- 👉 Search  -->
          <VCol
            cols="12"
            md="2"
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
        :page="normalizedPage"
        @update:page="handlePageChange"
        :items="partners"
        :loading="isLoading"
        item-value="id"
        :items-length="Number(totalPartners) || 0"
        :headers="headers"
        :items-per-page-options="[
          { value: 15, title: '15' },
          { value: 30, title: '30' },
          { value: 50, title: '50' },
        ]"
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
          <div class="d-flex align-center justify-space-between flex-wrap gap-4 pa-4">
            <div class="text-body-2 text-medium-emphasis">
              {{ $t('Showing') }} {{ paginationMeta.from || 0 }} {{ $t('to') }} {{ paginationMeta.to || 0 }} 
              {{ $t('of') }} {{ paginationMeta.total || 0 }} {{ $t('entries') }}
            </div>
            <div class="d-flex align-center gap-3">
              <VPagination
                :model-value="normalizedPage"
                :length="Math.max(Number(paginationMeta.last_page) || Math.ceil(Number(totalPartners) / Number(itemsPerPage)) || 1, 1)"
                :total-visible="$vuetify.display.xs ? 3 : 7"
                active-color="primary"
                @update:model-value="handlePageChange"
              />
            </div>
          </div>
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
