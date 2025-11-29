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
const customerToEdit = ref(null)

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
      
      // Extract total from meta
      // According to API docs: meta.total is a number
      const metaTotal = response.meta?.total
      if (typeof metaTotal === 'number') {
        totalCustomers.value = metaTotal
      } else if (Array.isArray(metaTotal) && metaTotal.length > 0) {
        // Fallback: if backend returns array (legacy), get first element
        totalCustomers.value = metaTotal[0]
      } else {
        // Fallback: use data length if meta.total is not available
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
  const isEditMode = !!customerToEdit.value?.id
  const customerId = customerToEdit.value?.id
  
  try {
    console.log('=== Sending customer request ===')
    console.log('Customer data (full):', customerData)
    console.log('isEditMode:', isEditMode)
    console.log('customerId:', customerId)
    console.log('=========================================')
    
    // According to API documentation:
    // - Create: POST /api/v1/customers
    // - Update: PUT/PATCH /api/v1/customers/{id}
    // For both create and update: if location is provided, address is created/updated automatically
    // The backend handles address creation/update via atomic transaction
    const url = isEditMode ? `/customers/${customerId}` : '/customers'
    const method = isEditMode ? 'PATCH' : 'POST'
    
    // Send all fields including address fields (location, address, address_label)
    // Backend will automatically create/update address if location is provided
    const customerPayload = { ...customerData }
    
    console.log('Customer payload (with address fields):', customerPayload)
    
    const response = await $api(url, {
      method,
      body: customerPayload,
      onResponseError({ response }) {
        console.error(`=== Customer ${isEditMode ? 'update' : 'creation'} error ===`)
        console.error('URL:', url)
        console.error('Method:', method)
        console.error('Status:', response.status)
        console.error('Error data:', response._data)
        console.error('Errors:', response._data?.errors || response._data?.message || response._data)
        console.error('==============================')
      },
    })
    
    console.log(`Customer ${isEditMode ? 'updated' : 'created'} successfully:`, response)
    console.log('Full response:', JSON.stringify(response, null, 2))
    console.log('Response includes address data:', {
      addresses: response?.data?.addresses,
      // eslint-disable-next-line camelcase
      default_address: response?.data?.default_address,
      location: response?.data?.location,
    })
    
    // Note: Address is automatically created/updated by backend if location is provided
    // Backend handles address creation/update via atomic transaction
    // No need for separate API call to /addresses endpoint
    
    // If creating, add the new customer to the list
    if (!isEditMode && response?.data) {
      console.log('Adding new customer to list:', response.data)
      console.log('Customer addresses:', response.data.addresses)
      console.log('Customer default_address:', response.data.default_address)
      
      // Add new customer at the beginning of the list with all data including addresses
      // The response.data already contains addresses and default_address from the API
      customers.value.unshift(response.data)
      totalCustomers.value += 1
      
      console.log('Customer added successfully with addresses')
    }
    
    // If editing, update the customer in the list directly
    if (isEditMode && customerId) {
      const customerIndex = customers.value.findIndex(c => c.id === customerId)
      if (customerIndex !== -1) {
        // Update the customer with the response data if available (response should include addresses)
        if (response && response.data) {
          // Merge response data with existing customer data
          // eslint-disable-next-line camelcase
          const defaultAddress = response.data.default_address || customers.value[customerIndex].default_address

          customers.value[customerIndex] = { 
            ...customers.value[customerIndex], 
            ...response.data,

            // Preserve addresses structure if not in response
            addresses: response.data.addresses || customers.value[customerIndex].addresses,
            // eslint-disable-next-line camelcase
            default_address: defaultAddress,
          }
          console.log('Customer updated from response:', customers.value[customerIndex])
        } else {
          // Otherwise, update with the form data we sent
          // Update basic fields
          // eslint-disable-next-line camelcase
          if (customerData.first_name) customers.value[customerIndex].first_name = customerData.first_name
          // eslint-disable-next-line camelcase
          if (customerData.last_name) customers.value[customerIndex].last_name = customerData.last_name
          if (customerData.phone) customers.value[customerIndex].phone = customerData.phone
          if (customerData.email) customers.value[customerIndex].email = customerData.email
          
          // Update address structure
          if (customerData.location || customerData.address || customerData.address_label) {
            // Ensure default_address exists
            // eslint-disable-next-line camelcase
            if (!customers.value[customerIndex].default_address) {
              // eslint-disable-next-line camelcase
              customers.value[customerIndex].default_address = {
                id: null,
                label: customerData.address_label || 'Adresse principale',
                address: customerData.address || '',
                location: customerData.location || '',
                // eslint-disable-next-line camelcase
                is_default: true,
              }
            } else {
              // Update existing default_address
              if (customerData.location) {
                customers.value[customerIndex].default_address.location = customerData.location
              }
              if (customerData.address) {
                customers.value[customerIndex].default_address.address = customerData.address
              }
              if (customerData.address_label) {
                customers.value[customerIndex].default_address.label = customerData.address_label
              }
            }
            
            // Also update addresses array if it exists
            if (customers.value[customerIndex].addresses && customers.value[customerIndex].addresses.length > 0) {
              const defaultAddressIndex = customers.value[customerIndex].addresses.findIndex(
                addr => addr.is_default === true,
              )

              if (defaultAddressIndex !== -1) {
                // Update the default address in the array
                if (customerData.location) {
                  customers.value[customerIndex].addresses[defaultAddressIndex].location = customerData.location
                }
                if (customerData.address) {
                  customers.value[customerIndex].addresses[defaultAddressIndex].address = customerData.address
                }
                if (customerData.address_label) {
                  customers.value[customerIndex].addresses[defaultAddressIndex].label = customerData.address_label
                }
              } else if (customers.value[customerIndex].addresses.length > 0) {
                // Update first address if no default found
                if (customerData.location) {
                  customers.value[customerIndex].addresses[0].location = customerData.location
                }
                if (customerData.address) {
                  customers.value[customerIndex].addresses[0].address = customerData.address
                }
                if (customerData.address_label) {
                  customers.value[customerIndex].addresses[0].label = customerData.address_label
                }
              }
            }
          }
          console.log('Customer updated from form data:', customers.value[customerIndex])
        }
      }
    }
    
    isAddCustomerDrawerOpen.value = false
    customerToEdit.value = null
    successSnackText.value = isEditMode ? t('Customer updated successfully') : t('Customer created successfully')
    snackbarColor.value = 'success'
    isSuccessSnackVisible.value = true
    
    // Refresh the customers list to get the latest data from server
    await fetchCustomers()
    
    console.log('Customers list refreshed after update')
    
    // Emit customerAdded event after successful creation/update
    // This will be handled by the parent component
  } catch (error) {
    console.error(`Error ${isEditMode ? 'updating' : 'creating'} customer:`, error)
    
    console.error('URL:', isEditMode ? `/customers/${customerId}` : '/customers')
    console.error('Method:', isEditMode ? 'PATCH' : 'POST')
    console.error('Customer ID:', customerId)

    // Show error to user
    isSuccessSnackVisible.value = true
    snackbarColor.value = 'error'
    successSnackText.value = error._data?.message || error.data?.message || t(`Error ${isEditMode ? 'updating' : 'creating'} customer. Check console for details.`)

    // Don't close drawer on error
  }
}

// Handle customer added event
const handleCustomerAdded = () => {
  console.log('Customer added/updated event received')
  
  // Reset customerToEdit
  customerToEdit.value = null
  
  // Refresh the list to get the latest data from server (including addresses)
  fetchCustomers()
}

// Edit customer
const editCustomer = customer => {
  console.log('=== Editing customer ===')
  console.log('Customer data:', customer)
  console.log('Customer ID:', customer?.id)
  console.log('User ID:', customer?.user_id)
  console.log('User object:', customer?.user)
  console.log('User ID from user object:', customer?.user?.id)
  console.log('Current isAddCustomerDrawerOpen:', isAddCustomerDrawerOpen.value)
  console.log('Current customerToEdit:', customerToEdit.value)

  if (!customer || !customer.id) {
    console.error('Invalid customer data:', customer)
    
    return
  }
  
  // Note: Customer update uses /api/v1/customers/{id} endpoint, not /users/{id}
  // So we don't need user_id for customer updates

  // Set customer data first
  customerToEdit.value = { ...customer }
  console.log('customerToEdit set to:', customerToEdit.value)
  
  // Open drawer immediately (don't wait for nextTick)
  isAddCustomerDrawerOpen.value = true
  console.log('Drawer opened (isAddCustomerDrawerOpen):', isAddCustomerDrawerOpen.value)
  
  // Force reactivity update
  nextTick(() => {
    console.log('After nextTick - Drawer state:', isAddCustomerDrawerOpen.value)
    console.log('After nextTick - customerToEdit:', customerToEdit.value)
  })

  console.log('========================')
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
          <!-- According to API docs: location is in default_address.location or addresses[0].location -->
          <div
            v-if="item.default_address?.location"
            class="text-body-2"
            style="max-inline-size: 200px; word-break: break-word;"
          >
            {{ item.default_address.location }}
          </div>
          <div
            v-else-if="item.addresses && item.addresses.length > 0 && item.addresses[0]?.location"
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

        <!-- Actions -->
        <template #item.actions="{ item }">
          <IconBtn 
            @click.stop="() => {
              console.log('IconBtn clicked for customer:', item)
              editCustomer(item)
            }"
          >
            <VIcon icon="tabler-pencil" />
            <VTooltip activator="parent">
              {{ $t('Edit Customer') }}
            </VTooltip>
          </IconBtn>

          <IconBtn @click="deleteCustomer(item.id)">
            <VIcon icon="tabler-trash" />
            <VTooltip activator="parent">
              {{ $t('Delete Customer') }}
            </VTooltip>
          </IconBtn>

          <IconBtn>
            <VIcon icon="tabler-eye" />
            <VTooltip activator="parent">
              {{ $t('View Customer') }}
            </VTooltip>
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

                <VListItem @click="editCustomer(item)">
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
      :customer-to-edit="customerToEdit"
      @submit="addNewCustomer"
      @customer-added="handleCustomerAdded"
      @reset-customer-to-edit="() => {
        console.log('Reset customer to edit event received')
        customerToEdit = null
      }"
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
