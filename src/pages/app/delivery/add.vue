<script setup>
/* eslint-disable camelcase */
import { useI18n } from 'vue-i18n'
import { calculateDeliveryPrice, calculateDistanceFromUrls } from '@/utils/googleMaps'

const { t } = useI18n()

const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['update:isDialogVisible', 'deliveryAdded'])

const dialogVisible = computed({
  get: () => props.isDialogVisible,
  set: val => emit('update:isDialogVisible', val),
})

// Form modes: 'select' or 'create'
const partnerMode = ref('select') // 'select' or 'create'
const customerMode = ref('select') // 'select' or 'create'

// Form data - covers all possible cases
const form = ref({
  // Partner (if selecting existing)
  partner_id: null,
  // Partner (if creating new)
  partner_merchant_name: '',
  partner_phone: '',
  partner_contact_name: '',
  partner_location: '',
  partner_activity_sector: '',
  partner_engagement_type: '',
  // Customer (if selecting existing)
  customer_id: null,
  // Customer (if creating new)
  customer_phone: '',
  customer_first_name: '',
  customer_last_name: '',
  customer_email: '',
  customer_location: '',
  // Delivery fields
  driver_id: null,
  pickup_location: '',
  dropoff_location: '',
  distance_km: null,
  price: 0,
  status_id: null,
  start_at: '',
})

// Loading states
const isSubmitting = ref(false)
const isLoadingPartners = ref(false)
const isLoadingCustomers = ref(false)
const isLoadingDrivers = ref(false)
const isLoadingStatuses = ref(false)

// Options
const partners = ref([])
const customers = ref([])
const drivers = ref([])
const deliveryStatuses = ref([])

// 👉 Fetch Delivery Statuses
const fetchDeliveryStatuses = async () => {
  isLoadingStatuses.value = true
  try {
    const response = await $api('/status/delivery-statuses', {
      method: 'GET',
    })
    
    if (response && response.success && response.data && Array.isArray(response.data)) {
      deliveryStatuses.value = response.data
    } else {
      deliveryStatuses.value = []
    }
  } catch (error) {
    console.error('Error fetching delivery statuses:', error)
    deliveryStatuses.value = []
  } finally {
    isLoadingStatuses.value = false
  }
}

// Status options from API
const statusOptions = computed(() => {
  return deliveryStatuses.value.map(status => ({
    title: status.name,
    value: status.id,
  }))
})

// 👉 Fetch Partners
const fetchPartners = async () => {
  isLoadingPartners.value = true
  try {
    const queryParams = {
      per_page: 100,
      page: 1,
    }
    const queryString = new URLSearchParams(queryParams).toString()
    const url = `/merchants${queryString ? `?${queryString}` : ''}`

    const response = await $api(url, { method: 'GET' })

    let partnersList = []
    if (response && response.data && Array.isArray(response.data)) {
      partnersList = response.data
    } else if (Array.isArray(response)) {
      partnersList = response
    }

    partners.value = partnersList.map(partner => {
      // Extract location from default_address or addresses[0], same as in partners list
      const addressData = partner.default_address || 
                         (partner.addresses && partner.addresses.length > 0 ? partner.addresses[0] : null)
      
      return {
        title: partner.merchant_name || t('N/A'),
        value: partner.id,
        location: addressData?.location || partner.location || '',
        address: addressData?.address || partner.address || '',
      }
    })
  } catch (error) {
    console.error('Error fetching partners:', error)
    partners.value = []
  } finally {
    isLoadingPartners.value = false
  }
}

// 👉 Fetch Customers
const fetchCustomers = async () => {
  isLoadingCustomers.value = true
  try {
    const queryParams = {
      per_page: 100,
      page: 1,
    }
    const queryString = new URLSearchParams(queryParams).toString()
    const url = `/customers${queryString ? `?${queryString}` : ''}`

    const response = await $api(url, { method: 'GET' })

    let customersList = []
    if (response && response.data && Array.isArray(response.data)) {
      customersList = response.data
    } else if (Array.isArray(response)) {
      customersList = response
    }

    customers.value = customersList.map(customer => ({
      title: customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || t('N/A'),
      value: customer.id,
      location: customer.default_address?.location || customer.addresses?.[0]?.location || '',
      phone: customer.phone || '',
      email: customer.email || '',
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
    }))
  } catch (error) {
    console.error('Error fetching customers:', error)
    customers.value = []
  } finally {
    isLoadingCustomers.value = false
  }
}

// Handle partner selection - auto-fill location
const onPartnerSelect = partnerId => {
  console.log('=== Partner selected ===')
  console.log('Partner ID:', partnerId)
  
  if (partnerId) {
    const partner = partners.value.find(p => p.value === partnerId)
    console.log('Found partner:', partner)
    console.log('Partner location:', partner?.location)
    
    if (partner && partner.location) {
      form.value.pickup_location = partner.location
      console.log('Auto-filled pickup_location:', form.value.pickup_location)
    } else {
      console.warn('Partner location not found, cannot auto-fill')
    }
    
    // Clear new partner fields
    form.value.partner_merchant_name = ''
    form.value.partner_phone = ''
    form.value.partner_contact_name = ''
    form.value.partner_location = ''
    form.value.partner_activity_sector = ''
    form.value.partner_engagement_type = ''
  } else {
    // Partner deselected - clear pickup location
    form.value.pickup_location = ''
    console.log('Partner deselected, cleared pickup_location')
  }
  console.log('========================')
}

// Handle customer selection - auto-fill location
const onCustomerSelect = customerId => {
  console.log('=== Customer selected ===')
  console.log('Customer ID:', customerId)
  
  if (customerId) {
    const customer = customers.value.find(c => c.value === customerId)
    console.log('Found customer:', customer)
    console.log('Customer location:', customer?.location)
    
    if (customer && customer.location) {
      form.value.dropoff_location = customer.location
      console.log('Auto-filled dropoff_location:', form.value.dropoff_location)
    } else {
      console.warn('Customer location not found, cannot auto-fill')
    }
    
    // Clear new customer fields
    form.value.customer_phone = ''
    form.value.customer_first_name = ''
    form.value.customer_last_name = ''
    form.value.customer_email = ''
    form.value.customer_location = ''
  } else {
    // Customer deselected - clear dropoff location
    form.value.dropoff_location = ''
    console.log('Customer deselected, cleared dropoff_location')
  }
  console.log('=========================')
}

// Watch for partner selection changes (backup to ensure auto-fill works)
watch(() => form.value.partner_id, (newPartnerId, oldPartnerId) => {
  if (partnerMode.value === 'select' && newPartnerId && newPartnerId !== oldPartnerId) {
    // Only auto-fill if not already filled by onPartnerSelect
    if (!form.value.pickup_location) {
      const partner = partners.value.find(p => p.value === newPartnerId)
      if (partner && partner.location) {
        form.value.pickup_location = partner.location
        console.log('Watch: Auto-filled pickup_location from partner:', partner.location)
      }
    }
  } else if (!newPartnerId) {
    // Partner deselected
    form.value.pickup_location = ''
  }
})

// Watch for customer selection changes (backup to ensure auto-fill works)
watch(() => form.value.customer_id, (newCustomerId, oldCustomerId) => {
  if (customerMode.value === 'select' && newCustomerId && newCustomerId !== oldCustomerId) {
    // Only auto-fill if not already filled by onCustomerSelect
    if (!form.value.dropoff_location) {
      const customer = customers.value.find(c => c.value === newCustomerId)
      if (customer && customer.location) {
        form.value.dropoff_location = customer.location
        console.log('Watch: Auto-filled dropoff_location from customer:', customer.location)
      }
    }
  } else if (!newCustomerId) {
    // Customer deselected
    form.value.dropoff_location = ''
  }
})

// Watch for new partner location changes
watch(() => form.value.partner_location, newVal => {
  if (partnerMode.value === 'create' && newVal) {
    form.value.pickup_location = newVal
  }
})

// Watch for new customer location changes
watch(() => form.value.customer_location, newVal => {
  if (customerMode.value === 'create' && newVal) {
    form.value.dropoff_location = newVal
  }
})

// Fetch available drivers
const fetchDrivers = async () => {
  isLoadingDrivers.value = true
  try {
    // Build query parameters like in couriers list
    const queryParams = {
      // eslint-disable-next-line camelcase
      per_page: 100, // Get all available drivers
      page: 1,
    }
    
    // Don't filter by status - get all drivers
    // The user can select any driver
    
    // Build query string
    const queryString = new URLSearchParams(queryParams).toString()
    const url = `/drivers${queryString ? `?${queryString}` : ''}`

    console.log('=== Calling /drivers API for delivery form ===')
    console.log('URL:', url)
    console.log('Query params:', queryParams)
    
    const response = await $api(url, {
      method: 'GET',
    })

    console.log('=== Response from /drivers API ===')
    console.log('Full response:', response)
    
    let driversList = []
    
    // Handle response structure: { data: [...], meta: {...}, links: {...} }
    if (response && response.data && Array.isArray(response.data)) {
      driversList = response.data
      console.log('Extracted from response.data:', driversList.length, 'drivers')
    } else if (Array.isArray(response)) {
      driversList = response
      console.log('Response is directly an array:', driversList.length, 'drivers')
    } else {
      console.warn('Unexpected response format:', response)
      driversList = []
    }

    // Map drivers to select options with full name and plate number
    drivers.value = driversList.map(driver => {
      const driverName = driver.user?.name || `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || t('N/A')
      const plateNumber = driver.plate_number || ''
      const displayName = plateNumber ? `${driverName} (${plateNumber})` : driverName
      return {
        title: displayName,
        value: driver.id,
      }
    })
    
    console.log('=== Drivers loaded ===')
    console.log('Drivers list:', driversList)
    console.log('Drivers options:', drivers.value)
    console.log('Number of drivers:', drivers.value.length)
    console.log('====================')
  } catch (error) {
    console.error('Error fetching drivers:', error)
    drivers.value = []
  } finally {
    isLoadingDrivers.value = false
  }
}

// Activity sector options for new partners
const activitySectorOptions = computed(() => [
  { title: t('Restaurant'), value: 'Restaurant' },
  { title: t('Commerce'), value: 'Commerce' },
  { title: t('E-commerce'), value: 'E-commerce' },
  { title: t('Health'), value: 'Health' },
  { title: t('Education'), value: 'Education' },
  { title: t('Technology'), value: 'Technology' },
  { title: t('Manufacturing'), value: 'Manufacturing' },
  { title: t('Services'), value: 'Services' },
  { title: t('Other'), value: 'Other' },
])

const engagementTypeOptions = computed(() => [
  { title: t('Partner'), value: 'partner' },
  { title: t('Client'), value: 'client' },
  { title: t('Supplier'), value: 'supplier' },
  { title: t('Other'), value: 'other' },
])

// Loading state for price calculation
const isCalculatingPrice = ref(false)
const distanceInfo = ref(null)

// Calculate price based on real distance
const calculatePrice = async () => {
  const pickup = form.value.pickup_location || form.value.partner_location
  const dropoff = form.value.dropoff_location || form.value.customer_location

  if (!pickup || !dropoff) {
    form.value.price = 0
    form.value.distance_km = null
    distanceInfo.value = null

    return
  }

  isCalculatingPrice.value = true
  try {
    // Calculate distance using Google Maps API
    const result = await calculateDistanceFromUrls(pickup, dropoff)
    
    // Calculate price based on distance
    const price = calculateDeliveryPrice(result.distance)
    
    form.value.price = price
    form.value.distance_km = Number(result.distance.toFixed(2))
    distanceInfo.value = {
      distance: result.distance,
      distanceText: result.distanceText,
      duration: result.duration,
    }
    
    console.log('Distance calculation result:', {
      distance: result.distance + ' km',
      price: price + ' FCFA',
      duration: result.duration,
    })
  } catch (error) {
    console.error('Error calculating price:', error)

    // Fallback to 0 if calculation fails
    form.value.price = 0
    form.value.distance_km = null
    distanceInfo.value = null

    // Show error message to user
    alert(t('Error calculating distance. Please verify that the coordinates are valid.'))
  } finally {
    isCalculatingPrice.value = false
  }
}

// Watch for location changes to recalculate price (with debounce)
let priceCalculationTimeout = null
watch([
  () => form.value.pickup_location,
  () => form.value.dropoff_location,
  () => form.value.partner_location,
  () => form.value.customer_location,
], () => {
  // Clear previous timeout
  if (priceCalculationTimeout) {
    clearTimeout(priceCalculationTimeout)
  }
  
  // Debounce the calculation to avoid too many API calls
  priceCalculationTimeout = setTimeout(() => {
    calculatePrice()
  }, 1000) // Wait 1 second after user stops typing
})

// Submit form
const onSubmit = async () => {
  isSubmitting.value = true
  
  try {
    // Get pickup and dropoff locations
    const pickup = form.value.pickup_location || form.value.partner_location
    const dropoff = form.value.dropoff_location || form.value.customer_location
    
    // Validate required fields
    if (!pickup) {
      alert(t('Pickup location is required'))
      isSubmitting.value = false
      return
    }
    
    if (!dropoff) {
      alert(t('Dropoff location is required'))
      isSubmitting.value = false
      return
    }
    
    // Calculate distance if not already calculated
    if (!form.value.distance_km || form.value.distance_km === null) {
      console.log('Distance not calculated yet, calculating now...')
      await calculatePrice()
      
      // Check if calculation was successful
      if (!form.value.distance_km || form.value.distance_km === null) {
        alert(t('Unable to calculate distance. Please verify that the pickup and dropoff locations are valid coordinates.'))
        isSubmitting.value = false
        return
      }
    }
    
    const payload = {}
    
    // Partner handling
    if (partnerMode.value === 'select' && form.value.partner_id) {
      payload.partner_id = Number(form.value.partner_id)
    } else if (partnerMode.value === 'create') {
      payload.partner_merchant_name = form.value.partner_merchant_name || undefined
      payload.partner_phone = form.value.partner_phone || undefined
      payload.partner_contact_name = form.value.partner_contact_name || undefined
      payload.partner_location = form.value.partner_location || undefined
      payload.partner_activity_sector = form.value.partner_activity_sector || undefined
      payload.partner_engagement_type = form.value.partner_engagement_type || undefined
    }
    
    // Customer handling
    if (customerMode.value === 'select' && form.value.customer_id) {
      payload.customer_id = Number(form.value.customer_id)
    } else if (customerMode.value === 'create') {
      payload.customer_phone = form.value.customer_phone || undefined
      payload.customer_first_name = form.value.customer_first_name || undefined
      payload.customer_last_name = form.value.customer_last_name || undefined
      payload.customer_email = form.value.customer_email || undefined
      payload.customer_location = form.value.customer_location || undefined
    }
    
    // Delivery fields - ensure distance_km is always included
    payload.driver_id = form.value.driver_id ? Number(form.value.driver_id) : undefined
    payload.pickup_location = pickup
    payload.dropoff_location = dropoff
    payload.distance_km = Number(form.value.distance_km) // Always include, required by API
    payload.price = form.value.price ? Number(form.value.price) : undefined
    payload.status_id = form.value.status_id ? Number(form.value.status_id) : undefined
    
    // Start date/time
    if (form.value.start_at) {
      payload.start_at = form.value.start_at
    }
    
    // Remove undefined and empty string fields (but keep distance_km even if 0)
    Object.keys(payload).forEach(key => {
      if (key !== 'distance_km' && (payload[key] === undefined || payload[key] === '' || payload[key] === null)) {
        delete payload[key]
      }
    })

    console.log('=== Creating delivery payload ===')
    console.log('Payload:', payload)
    console.log('Partner mode:', partnerMode.value)
    console.log('Customer mode:', customerMode.value)
    console.log('Distance (km):', payload.distance_km)
    console.log('================================')

    await $api('/deliveries', {
      method: 'POST',
      body: payload,
      onResponseError({ response }) {
        console.error('=== Delivery creation error ===')
        console.error('Status:', response.status)
        console.error('Error data:', response._data)
        console.error('Errors:', response._data?.errors || response._data?.message || response._data)
        console.error('==============================')
        
        // Show error message to user
        const errorMessage = response._data?.message || t('Error creating delivery')
        const errorDetails = response._data?.errors ? Object.values(response._data.errors).flat().join(', ') : ''
        alert(`${errorMessage}${errorDetails ? `\n${errorDetails}` : ''}`)
      },
    })

    emit('deliveryAdded')
    resetForm()
    dialogVisible.value = false
  } catch (error) {
    console.error('Error creating delivery:', error)
    alert(t('Error creating delivery. Please try again.'))
  } finally {
    isSubmitting.value = false
  }
}

// Reset form
const resetForm = () => {
  partnerMode.value = 'select'
  customerMode.value = 'select'
  form.value = {
    partner_id: null,
    partner_merchant_name: '',
    partner_phone: '',
    partner_contact_name: '',
    partner_location: '',
    partner_activity_sector: '',
    partner_engagement_type: '',
    customer_id: null,
    customer_phone: '',
    customer_first_name: '',
    customer_last_name: '',
    customer_email: '',
    customer_location: '',
    driver_id: null,
    pickup_location: '',
    dropoff_location: '',
    distance_km: null,
    price: 0,
    status_id: null,
    start_at: '',
  }
  distanceInfo.value = null
}

// Close dialog
const onClose = () => {
  resetForm()
  dialogVisible.value = false
}

// Load data when dialog opens
watch(dialogVisible, newVal => {
  if (newVal) {
    fetchDrivers()
    fetchDeliveryStatuses()
    fetchPartners()
    fetchCustomers()
  }
})
</script>

<template>
  <VDialog
    :width="$vuetify.display.smAndDown ? 'auto' : 1200"
    :model-value="dialogVisible"
    @update:model-value="val => dialogVisible = val"
    scrollable
  >
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="dialogVisible = false" />
    
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>{{ $t('Add New Delivery') }}</span>
      </VCardTitle>

      <VDivider />

      <VCardText class="dialog-content">
        <VForm @submit.prevent="onSubmit">
          <!-- Partner Section -->
          <VCard
            variant="outlined"
            class="mb-6"
          >
            <VCardItem class="pb-2">
              <div class="d-flex align-center justify-space-between">
                <VCardTitle class="text-h6">
                  {{ $t('Partner (Pickup Location)') }}
                </VCardTitle>
                <VBtnToggle
                  v-model="partnerMode"
                  mandatory
                  density="compact"
                  variant="outlined"
                  color="primary"
                  class="partner-mode-toggle"
                >
                  <VBtn
                    value="select"
                    class="px-6"
                  >
                    {{ $t('Existing') }}
                  </VBtn>
                  <VBtn
                    value="create"
                    class="px-6"
                  >
                    {{ $t('New') }}
                  </VBtn>
                </VBtnToggle>
              </div>
            </VCardItem>

            <VDivider />

            <VCardText>
              <!-- Select Existing Partner -->
              <VRow v-if="partnerMode === 'select'">
                <VCol cols="12">
                  <AppSelect
                    v-model="form.partner_id"
                    :items="partners"
                    :loading="isLoadingPartners"
                    :label="$t('Select Partner')"
                    :placeholder="$t('Search and select a partner')"
                    item-title="title"
                    item-value="value"
                    clearable
                    @update:model-value="onPartnerSelect"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="form.pickup_location"
                    :label="$t('Pickup Location')"
                    placeholder="6°10'53.8&quot;N 1°12'35.7&quot;E"
                    :hint="$t('Location coordinates (auto-filled if partner selected)')"
                  />
                </VCol>
              </VRow>

              <!-- Create New Partner -->
              <VRow v-else>
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppTextField
                    v-model="form.partner_merchant_name"
                    :label="$t('Merchant Name')"
                    :placeholder="$t('Restaurant Le Gourmet')"
                    required
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppTextField
                    v-model="form.partner_phone"
                    :label="$t('Phone')"
                    placeholder="+228 90 12 34 56"
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppTextField
                    v-model="form.partner_contact_name"
                    :label="$t('Contact Name')"
                    :placeholder="$t('Jean Dupont')"
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppSelect
                    v-model="form.partner_activity_sector"
                    :items="activitySectorOptions"
                    :label="$t('Activity Sector')"
                    :placeholder="$t('Select activity sector')"
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppSelect
                    v-model="form.partner_engagement_type"
                    :items="engagementTypeOptions"
                    :label="$t('Engagement Type')"
                    :placeholder="$t('Select engagement type')"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="form.partner_location"
                    :label="$t('Partner Location')"
                    placeholder="6°10'53.8&quot;N 1°12'35.7&quot;E"
                    :hint="$t('Location coordinates')"
                  />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <!-- Customer Section -->
          <VCard
            variant="outlined"
            class="mb-6"
          >
            <VCardItem class="pb-2">
              <div class="d-flex align-center justify-space-between">
                <VCardTitle class="text-h6">
                  {{ $t('Customer (Dropoff Location)') }}
                </VCardTitle>
                <VBtnToggle
                  v-model="customerMode"
                  mandatory
                  density="compact"
                  variant="outlined"
                  color="primary"
                  class="customer-mode-toggle"
                >
                  <VBtn
                    value="select"
                    class="px-6"
                  >
                    {{ $t('Existing') }}
                  </VBtn>
                  <VBtn
                    value="create"
                    class="px-6"
                  >
                    {{ $t('New') }}
                  </VBtn>
                </VBtnToggle>
              </div>
            </VCardItem>

            <VDivider />

            <VCardText>
              <!-- Select Existing Customer -->
              <VRow v-if="customerMode === 'select'">
                <VCol cols="12">
                  <AppSelect
                    v-model="form.customer_id"
                    :items="customers"
                    :loading="isLoadingCustomers"
                    :label="$t('Select Customer')"
                    :placeholder="$t('Search and select a customer')"
                    item-title="title"
                    item-value="value"
                    clearable
                    @update:model-value="onCustomerSelect"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="form.dropoff_location"
                    :label="$t('Dropoff Location')"
                    placeholder="6°11'10.2&quot;N 1°13'20.5&quot;E"
                    :hint="$t('Location coordinates (auto-filled if customer selected)')"
                  />
                </VCol>
              </VRow>

              <!-- Create New Customer -->
              <VRow v-else>
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppTextField
                    v-model="form.customer_first_name"
                    :label="$t('First Name')"
                    :placeholder="$t('Marie')"
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppTextField
                    v-model="form.customer_last_name"
                    :label="$t('Last Name')"
                    :placeholder="$t('Agbodan')"
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppTextField
                    v-model="form.customer_phone"
                    :label="$t('Phone')"
                    placeholder="+228 92 34 56 78"
                    required
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppTextField
                    v-model="form.customer_email"
                    type="email"
                    :label="$t('Email')"
                    placeholder="marie.agbodan@example.com"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="form.customer_location"
                    :label="$t('Customer Location')"
                    placeholder="6°11'10.2&quot;N 1°13'20.5&quot;E"
                    :hint="$t('Location coordinates')"
                  />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <!-- Delivery Details -->
          <VCard
            variant="outlined"
            class="mb-4"
          >
            <VCardItem class="pb-2">
              <VCardTitle class="text-h6">
                {{ $t('Delivery Details') }}
              </VCardTitle>
            </VCardItem>

            <VDivider />

            <VCardText>
              <VRow>

              <!-- Driver Selection -->
              <VCol
                cols="12"
                md="6"
              >
                <AppSelect
                  v-model="form.driver_id"
                  :items="drivers"
                  :loading="isLoadingDrivers"
                  :label="$t('Assign Driver')"
                  :placeholder="$t('Select a driver')"
                  item-title="title"
                  item-value="value"
                  clearable
                />
              </VCol>

              <!-- Status -->
              <VCol
                cols="12"
                md="6"
              >
                <AppSelect
                  v-model="form.status_id"
                  :items="statusOptions"
                  :loading="isLoadingStatuses"
                  :label="$t('Status')"
                  :placeholder="$t('Select status')"
                  clearable
                />
              </VCol>

              <!-- Start Date/Time -->
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.start_at"
                  type="datetime-local"
                  :label="$t('Start Date/Time')"
                  :hint="$t('Optional: When the delivery should start')"
                />
              </VCol>

              <!-- Distance -->
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.distance_km"
                  :label="$t('Distance (km)')"
                  readonly
                  suffix="km"
                  :loading="isCalculatingPrice"
                >
                  <template #prepend-inner>
                    <VIcon 
                      :icon="isCalculatingPrice ? 'tabler-loader-2' : 'tabler-route'" 
                      :class="{ 'animate-spin': isCalculatingPrice }"
                    />
                  </template>
                </AppTextField>
              </VCol>

              <!-- Price -->
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.price"
                  :label="$t('Price (FCFA)')"
                  readonly
                  suffix="FCFA"
                  :loading="isCalculatingPrice"
                >
                  <template #prepend-inner>
                    <VIcon 
                      :icon="isCalculatingPrice ? 'tabler-loader-2' : 'tabler-currency-dollar'" 
                      :class="{ 'animate-spin': isCalculatingPrice }"
                    />
                  </template>
                </AppTextField>
                
                <!-- Distance info -->
                <div
                  v-if="distanceInfo"
                  class="text-sm text-medium-emphasis mt-1"
                >
                  <VIcon
                    :icon="distanceInfo.isEstimated ? 'tabler-map-pin-question' : 'tabler-route'"
                    size="14"
                    class="me-1"
                  />
                  {{ $t('Distance') }}: {{ distanceInfo.distanceText }} (~{{ distanceInfo.duration }})
                </div>
              </VCol>
              </VRow>
            </VCardText>
          </VCard>
        </VForm>
      </VCardText>

      <VDivider />

      <VCardActions class="d-flex justify-end gap-3 pa-4">
        <VBtn
          color="secondary"
          variant="tonal"
          @click="onClose"
        >
          {{ $t('Cancel') }}
        </VBtn>
        <VBtn
          color="primary"
          :loading="isSubmitting"
          :disabled="!form.pickup_location || !form.dropoff_location || (partnerMode === 'create' && !form.partner_merchant_name) || (customerMode === 'create' && !form.customer_phone)"
          @click="onSubmit"
        >
          {{ $t('Create Delivery') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.dialog-content {
  max-height: 70vh;
  overflow-y: auto;
}

.partner-mode-toggle,
.customer-mode-toggle {
  gap: 8px;
}

.partner-mode-toggle .v-btn,
.customer-mode-toggle .v-btn {
  min-width: 90px;
  padding-inline: 1rem;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
  border-radius: 4px !important;
}

.partner-mode-toggle .v-btn.v-btn--active,
.customer-mode-toggle .v-btn.v-btn--active {
  border-color: rgb(var(--v-theme-primary)) !important;
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
}

.partner-mode-toggle .v-btn:not(.v-btn--active),
.customer-mode-toggle .v-btn:not(.v-btn--active) {
  border-color: rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}
</style>
