<script setup>
import CustomerAddDrawer from '@/pages/app/customer/add/index.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const searchQuery = ref('')

// Data table options
const itemsPerPage = ref(15)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()
const selectedRows = ref([])
const isLoading = ref(false)
const isAddCustomerDrawerOpen = ref(false)

const isSuccessSnackVisible = ref(false)
const successSnackText = ref('')
const snackbarColor = ref('success')

const updateOptions = options => {
  sortBy.value = options.sortBy[0]?.key
  orderBy.value = options.sortBy[0]?.order
}

// Headers for customers table
const headers = computed(() => [
  {
    title: t('Customer'),
    key: 'customer',
  },
  {
    title: t('Phone'),
    key: 'phone',
  },
  {
    title: t('Email'),
    key: 'email',
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
    title: t('Actions'),
    key: 'actions',
    sortable: false,
  },
])

// Customers data
const customers = ref([])
const totalCustomers = ref(0)

// 👉 Fetch Customers
const fetchCustomers = async () => {
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

    // Build query string
    const queryString = new URLSearchParams(queryParams).toString()
    const url = `/customers${queryString ? `?${queryString}` : ''}`

    console.log('=== Calling /customers API ===')
    console.log('URL:', url)
    console.log('Query params:', queryParams)
    console.log('===============================')

    const response = await $api(url, {
      method: 'GET',
    })

    console.log('=== Response from /customers API ===')
    console.log('Full response:', response)
    
    // Handle response structure: { data: [...], meta: {...}, links: {...} }
    if (response && response.data && Array.isArray(response.data)) {
      // Extract data array
      customers.value = response.data
      
      // Extract total from meta (meta.total is an array, get first element)
      const metaTotal = response.meta?.total
      if (Array.isArray(metaTotal) && metaTotal.length > 0) {
        totalCustomers.value = metaTotal[0]
      } else if (typeof metaTotal === 'number') {
        totalCustomers.value = metaTotal
      } else {
        totalCustomers.value = response.data.length
      }
      
      console.log('Customers loaded:', customers.value.length)
      console.log('Total customers:', totalCustomers.value)
      console.log('Meta:', response.meta)
    } else if (Array.isArray(response)) {
      // Fallback: response is directly an array
      customers.value = response
      totalCustomers.value = response.length
      console.log('Response is directly an array')
    } else {
      console.warn('Unexpected response format:', response)
      customers.value = []
      totalCustomers.value = 0
    }
    console.log('===============================')
  } catch (error) {
    console.error('Error fetching customers:', error)
    customers.value = []
    totalCustomers.value = 0
    
    // Show error to user
    successSnackText.value = error._data?.message || t('Error fetching customers. Please try again.')
    snackbarColor.value = 'error'
    isSuccessSnackVisible.value = true
  } finally {
    isLoading.value = false
  }
}

// Watch for changes and refetch
watch([searchQuery, itemsPerPage], () => {
  page.value = 1
  fetchCustomers()
})

watch(page, () => {
  fetchCustomers()
})

// Call on mount
onMounted(() => {
  fetchCustomers()
})

const addNewCustomer = async customerData => {
  try {
    console.log('=== Sending customer creation request ===')
    console.log('Customer data:', customerData)
    console.log('=========================================')
    
    const response = await $api('/customers', {
      method: 'POST',
      body: customerData,
      onResponseError({ response }) {
        console.error('=== Customer creation error ===')
        console.error('Status:', response.status)
        console.error('Error data:', response._data)
        console.error('Errors:', response._data?.errors || response._data?.message || response._data)
        console.error('==============================')
      },
    })
    
    console.log('Customer created successfully:', response)
    isAddCustomerDrawerOpen.value = false
    successSnackText.value = t('Customer created successfully')
    snackbarColor.value = 'success'
    isSuccessSnackVisible.value = true
    fetchCustomers()
  } catch (error) {
    console.error('Error creating customer:', error)

    // Show error to user
    isSuccessSnackVisible.value = true
    snackbarColor.value = 'error'
    successSnackText.value = error._data?.message || error.data?.message || t('Error creating customer. Check console for details.')

    // Don't close drawer on error
  }
}

const deleteCustomer = async id => {
  try {
    await $api(`/customers/${id}`, {
      method: 'DELETE',
      onResponseError({ response }) {
        console.error('=== Customer deletion error ===')
        console.error('Status:', response.status)
        console.error('Error data:', response._data)
        console.error('==============================')
      },
    })

    // Delete from selectedRows
    const index = selectedRows.value.findIndex(row => row === id)
    if (index !== -1)
      selectedRows.value.splice(index, 1)

    // Show success message
    successSnackText.value = t('Customer deleted successfully')
    snackbarColor.value = 'success'
    isSuccessSnackVisible.value = true

    // Refetch customers
    fetchCustomers()
  } catch (error) {
    console.error('Error deleting customer:', error)
    
    // Show error to user
    successSnackText.value = error._data?.message || error.data?.message || t('Error deleting customer. Please try again.')
    snackbarColor.value = 'error'
    isSuccessSnackVisible.value = true
  }
}
</script>

<template>
  <section>
    <VCard class="mb-6">
      <VCardItem class="pb-4">
        <VCardTitle>{{ $t('Customers') }}</VCardTitle>
      </VCardItem>

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
              :placeholder="$t('Search by name, phone or email')"
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

          <!-- 👉 Add customer button -->
          <VBtn
            prepend-icon="tabler-plus"
            @click="isAddCustomerDrawerOpen = true"
          >
            {{ $t('Add Customer') }}
          </VBtn>
        </div>
      </VCardText>

      <VDivider />

      <!-- SECTION datatable -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:model-value="selectedRows"
        v-model:page="page"
        :items="customers"
        :loading="isLoading"
        item-value="id"
        :items-length="totalCustomers"
        :headers="headers"
        class="text-no-wrap"
        show-select
        @update:options="updateOptions"
      >
        <!-- Customer Info -->
        <template #item.customer="{ item }">
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
                {{ item.full_name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || $t('N/A') }}
              </h6>
              <div class="text-sm text-disabled">
                {{ item.email || $t('N/A') }}
              </div>
            </div>
          </div>
        </template>

        <!-- Phone -->
        <template #item.phone="{ item }">
          <div class="text-body-1">
            {{ item.phone || $t('N/A') }}
          </div>
        </template>

        <!-- Email -->
        <template #item.email="{ item }">
          <div class="text-body-1">
            {{ item.email || $t('N/A') }}
          </div>
        </template>

        <!-- Address -->
        <template #item.address="{ item }">
          <div
            v-if="item.default_address"
            class="d-flex flex-column"
            style="max-inline-size: 250px;"
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
            style="max-inline-size: 250px;"
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
            style="max-inline-size: 200px;"
          >
            {{ item.default_address.location }}
          </div>
          <div
            v-else-if="item.addresses && item.addresses.length > 0 && item.addresses[0].location"
            class="text-body-2"
            style="max-inline-size: 200px;"
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

        <!-- Actions -->
        <template #item.actions="{ item }">
          <IconBtn @click="deleteCustomer(item.id)">
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
                  <VListItemTitle>{{ $t('View') }}</VListItemTitle>
                </VListItem>

                <VListItem link>
                  <template #prepend>
                    <VIcon icon="tabler-pencil" />
                  </template>
                  <VListItemTitle>{{ $t('Edit') }}</VListItemTitle>
                </VListItem>

                <VListItem @click="deleteCustomer(item.id)">
                  <template #prepend>
                    <VIcon icon="tabler-trash" />
                  </template>
                  <VListItemTitle>{{ $t('Delete') }}</VListItemTitle>
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
            :total-items="totalCustomers"
          />
        </template>
      </VDataTableServer>
      <!-- SECTION -->
    </VCard>

    <CustomerAddDrawer
      v-model:isDrawerOpen="isAddCustomerDrawerOpen"
      @submit="addNewCustomer"
    />
    <VSnackbar
      v-model="isSuccessSnackVisible"
      location="top right"
      timeout="3000"
      :color="snackbarColor"
      variant="elevated"
    >
      {{ successSnackText }}
    </VSnackbar>
  </section>
</template>
