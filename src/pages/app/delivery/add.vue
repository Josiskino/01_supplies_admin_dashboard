<script setup>
/* eslint-disable camelcase */
import { useI18n } from 'vue-i18n'
import { calculateDeliveryPrice, calculateDistanceFromUrls, invalidateDistanceServiceCache } from '@/utils/googleMaps'

const { t } = useI18n()

const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  delivery: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:isDialogVisible', 'deliveryAdded', 'deliveryUpdated'])

const dialogVisible = computed({
  get: () => props.isDialogVisible,
  set: val => emit('update:isDialogVisible', val),
})

// Billing mode for price calculation
const billingMode = ref('express') // 'express' or 'standard'

// Form data - new unified structure
const form = ref({
  // Unified requester and recipient (can be partner or customer)
  requester: null, // Format: "partner_5" or "customer_12"
  recipient: null, // Format: "partner_8" or "customer_15"
  // Delivery fields
  driver_id: null,
  pickup_location: '',
  dropoff_location: '',
  distance_km: null,
  price: 0,
})

// Loading states
const isSubmitting = ref(false)
const isLoadingRequester = ref(false)
const isLoadingRecipient = ref(false)
const isLoadingDrivers = ref(false)

// Unified entities (partners + customers)
const requesterEntities = ref([])
const recipientEntities = ref([])
const drivers = ref([])

// Search terms for debounced search
const requesterSearch = ref('')
const recipientSearch = ref('')

// Customer creation mode (when no results found) - Only for requester
const isCreatingRequesterCustomer = ref(false)

// Customer creation form data for requester
const requesterCustomerForm = ref({
  last_name: '',
  phone: '',
  location: '',
  address_label: '',
})

// Recipient form data (manual input form)
const recipientForm = ref({
  phone: '',
  address_label: '',
  address: '',
})

// Recipient search and creation
const isCreatingRecipientCustomer = ref(false)
const selectedRecipientEntity = ref(null)

// Snackbar for notifications
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

// Helper function to parse entity value (e.g., "partner_5" -> { type: 'partner', id: 5 })
const parseEntity = (value) => {
  if (!value) return { type: null, id: null }
  const [type, id] = value.split('_')
  return {
    type: type, // 'partner' or 'customer'
    id: parseInt(id),
  }
}

// Helper function to extract location from various possible structures
const extractLocation = (entity) => {
  if (!entity) return ''
  
  // Try direct location field
  if (entity.location) return entity.location
  
  // Try default_address.location
  if (entity.default_address?.location) return entity.default_address.location
  
  // Try addresses[0].location
  if (entity.addresses && Array.isArray(entity.addresses) && entity.addresses.length > 0) {
    // Try to find default address first
    const defaultAddr = entity.addresses.find(addr => addr.is_default === true)
    if (defaultAddr?.location) return defaultAddr.location
    // Fallback to first address
    if (entity.addresses[0].location) return entity.addresses[0].location
  }
  
  // Try default_address (if it's a string/URL)
  if (entity.default_address && typeof entity.default_address === 'string') {
    return entity.default_address
  }
  
  // Try address field (for customers)
  if (entity.address?.location) return entity.address.location
  
  // Try pickup_location or dropoff_location (for partners)
  if (entity.pickup_location) return entity.pickup_location
  if (entity.dropoff_location) return entity.dropoff_location
  
  // Return empty string if no location found
  return ''
}

// Helper function to format entity for display
const formatEntityForDisplay = (entity) => {
  const location = extractLocation(entity)
  
  if (entity.type === 'partner' || entity.type === undefined) {
    // Assume partner if type is not specified
    return {
      title: entity.display_name || entity.name || t('N/A'),
      value: entity.value || `partner_${entity.id}`,
      type: 'partner',
      id: entity.id,
      location: location,
      phone: entity.phone || '',
      contact_name: entity.contact_name || '',
      subtitle: `${entity.contact_name || ''} ${entity.phone || ''}`.trim(),
    }
  } else {
    return {
      title: entity.display_name || entity.full_name || `${entity.first_name || ''} ${entity.last_name || ''}`.trim() || t('N/A'),
      value: entity.value || `customer_${entity.id}`,
      type: 'customer',
      id: entity.id,
      location: location,
      phone: entity.phone || '',
      email: entity.email || '',
      first_name: entity.first_name || '',
      last_name: entity.last_name || '',
      subtitle: `${entity.phone || ''} ${entity.email || ''}`.trim(),
    }
  }
}

// 👉 Fetch Delivery Entities (Partners + Customers) - Unified endpoint
const fetchDeliveryEntities = async (searchTerm = '', target = 'requester') => {
  const isLoading = target === 'requester' ? isLoadingRequester : isLoadingRecipient
  const entities = target === 'requester' ? requesterEntities : recipientEntities
  const isCreating = target === 'requester' ? isCreatingRequesterCustomer : isCreatingRecipientCustomer
  
  isLoading.value = true
  try {
    const queryParams = {
      limit: 20, // Max 20 results per type
    }
    
    if (searchTerm && searchTerm.trim().length >= 2) {
      queryParams.search = searchTerm.trim()
    }
    
    const queryString = new URLSearchParams(queryParams).toString()
    const url = `/delivery-entities${queryString ? `?${queryString}` : ''}`

    console.log('=== Fetching delivery entities ===')
    console.log('URL:', url)
    console.log('Search term:', searchTerm)
    
    const response = await $api(url, { method: 'GET' })

    console.log('Response:', response)

    let partnersList = []
    let customersList = []
    
    if (response && response.data) {
      partnersList = response.data.partners || []
      customersList = response.data.customers || []
    }

    // Combine and format entities
    const allEntities = [
      ...partnersList.map(p => formatEntityForDisplay({ ...p, type: 'partner' })),
      ...customersList.map(c => formatEntityForDisplay({ ...c, type: 'customer' })),
    ]
    
    entities.value = allEntities
    
    // Check if we should enable customer creation mode
    // Enable if search term exists, has at least 2 characters, and:
    // - No results found, OR
    // - Results found but none match exactly (case-insensitive)
    if (searchTerm && searchTerm.trim().length >= 2) {
      const searchTermLower = searchTerm.trim().toLowerCase()
      
      // Check if any entity matches exactly (case-insensitive)
      const exactMatch = allEntities.some(entity => {
        const title = (entity.title || '').toLowerCase()
        const lastName = (entity.raw?.last_name || '').toLowerCase()
        const firstName = (entity.raw?.first_name || '').toLowerCase()
        const name = (entity.raw?.name || '').toLowerCase()
        const displayName = (entity.raw?.display_name || '').toLowerCase()
        
        return title === searchTermLower || 
               lastName === searchTermLower || 
               firstName === searchTermLower ||
               name === searchTermLower ||
               displayName === searchTermLower ||
               `${firstName} ${lastName}`.trim() === searchTermLower ||
               `${lastName} ${firstName}`.trim() === searchTermLower
      })
      
      // If no exact match, enable creation mode
      if (!exactMatch) {
        isCreating.value = true
        // Pre-fill the name in the form
        if (target === 'requester') {
          requesterCustomerForm.value.last_name = searchTerm.trim()
        } else {
          recipientCustomerForm.value.last_name = searchTerm.trim()
        }
      } else {
        // Exact match found, disable creation mode
        isCreating.value = false
      }
    } else if (!searchTerm || searchTerm.trim().length === 0) {
      // If search is cleared, disable creation mode
      isCreating.value = false
    }
    
    console.log('Loaded entities:', allEntities.length)
    console.log('Partners:', partnersList.length, 'Customers:', customersList.length)
    console.log('Creation mode enabled:', isCreating.value)
  } catch (error) {
    console.error('Error fetching delivery entities:', error)
    entities.value = []
    // On error, if we have a search term, enable creation mode
    if (searchTerm && searchTerm.trim().length >= 2) {
      isCreating.value = true
      if (target === 'requester') {
        requesterCustomerForm.value.last_name = searchTerm.trim()
      } else {
        recipientCustomerForm.value.last_name = searchTerm.trim()
      }
    }
  } finally {
    isLoading.value = false
  }
}

// Debounced search watchers
let requesterSearchTimeout = null
let recipientSearchTimeout = null

watch(requesterSearch, (searchTerm) => {
  if (requesterSearchTimeout) {
    clearTimeout(requesterSearchTimeout)
  }
  
  // Disable creation mode if search is cleared
  if (!searchTerm || searchTerm.trim().length === 0) {
    isCreatingRequesterCustomer.value = false
  }
  
  requesterSearchTimeout = setTimeout(() => {
    fetchDeliveryEntities(searchTerm, 'requester')
  }, 300)
})

watch(recipientSearch, (searchTerm) => {
  if (recipientSearchTimeout) {
    clearTimeout(recipientSearchTimeout)
  }
  
  // Disable creation mode if search is cleared
  if (!searchTerm || searchTerm.trim().length === 0) {
    isCreatingRecipientCustomer.value = false
  }
  
  recipientSearchTimeout = setTimeout(() => {
    fetchDeliveryEntities(searchTerm, 'recipient')
  }, 300)
})

// Handle recipient selection - auto-fill address and address label
const onRecipientSelect = async (value) => {
  console.log('=== Recipient selected ===')
  console.log('Value:', value)
  
  // Disable creation mode when a value is selected
  if (value) {
    isCreatingRecipientCustomer.value = false
  }
  
  if (value) {
    const parsed = parseEntity(value)
    
    console.log('Parsed:', parsed)
    
    // First, try to get data from already loaded entities
    const foundEntity = recipientEntities.value.find(
      e => e.value === value
    )
    
    if (foundEntity) {
      // Get address label if available
      if (foundEntity.raw?.default_address?.label) {
        recipientForm.value.address_label = foundEntity.raw.default_address.label
      } else if (foundEntity.raw?.addresses?.[0]?.label) {
        recipientForm.value.address_label = foundEntity.raw.addresses[0].label
      }
      
      // Get address if available (this goes to dropoff_location)
      if (foundEntity.raw?.default_address?.address) {
        form.value.dropoff_location = foundEntity.raw.default_address.address
      } else if (foundEntity.raw?.addresses?.[0]?.address) {
        form.value.dropoff_location = foundEntity.raw.addresses[0].address
      } else if (foundEntity.raw?.default_address?.location) {
        form.value.dropoff_location = foundEntity.raw.default_address.location
      } else if (foundEntity.raw?.addresses?.[0]?.location) {
        form.value.dropoff_location = foundEntity.raw.addresses[0].location
      } else if (foundEntity.location) {
        form.value.dropoff_location = foundEntity.location
      }
      
      // Get phone if available
      if (foundEntity.raw?.phone) {
        recipientForm.value.phone = foundEntity.raw.phone
      }
      
      console.log('Data found in loaded entities')
    }
    
    // Fallback: fetch entity details with addresses via API
    if (!form.value.dropoff_location) {
      console.log('Address not in loaded entities, fetching from API...')
      try {
        const entityDetails = await $api(`/delivery-entities/${parsed.type}/${parsed.id}`, { method: 'GET' })
        const entityData = entityDetails?.data || entityDetails
        
        if (entityData) {
          // Get address label if available
          if (entityData.default_address?.label) {
            recipientForm.value.address_label = entityData.default_address.label
          } else if (entityData.addresses?.[0]?.label) {
            recipientForm.value.address_label = entityData.addresses[0].label
          }
          
          // Get address if available (this goes to dropoff_location)
          if (entityData.default_address?.address) {
            form.value.dropoff_location = entityData.default_address.address
          } else if (entityData.addresses?.[0]?.address) {
            form.value.dropoff_location = entityData.addresses[0].address
          } else if (entityData.default_address?.location) {
            form.value.dropoff_location = entityData.default_address.location
          } else if (entityData.addresses?.[0]?.location) {
            form.value.dropoff_location = entityData.addresses[0].location
          }
          
          // Get phone if available
          if (entityData.phone) {
            recipientForm.value.phone = entityData.phone
          }
        }
      } catch (error) {
        console.error('Error fetching entity details:', error)
      }
    }
    
    console.log('Auto-filled dropoff_location (address):', form.value.dropoff_location)
  } else {
    // Recipient deselected - clear fields
    form.value.dropoff_location = ''
    recipientForm.value.address_label = ''
    recipientForm.value.phone = ''
    console.log('Recipient deselected, cleared fields')
  }
  console.log('=========================')
}

// Create customer function for requester
const createRequesterCustomer = async () => {
  const customerForm = requesterCustomerForm
  const isCreating = isCreatingRequesterCustomer
  
  // Validation
  if (!customerForm.value.last_name || !customerForm.value.last_name.trim()) {
    snackbarText.value = t('Name is required') || 'Le nom est requis'
    snackbarColor.value = 'error'
    snackbar.value = true
    return
  }
  
  if (!customerForm.value.phone || !customerForm.value.phone.trim()) {
    snackbarText.value = t('Phone is required') || 'Le téléphone est requis'
    snackbarColor.value = 'error'
    snackbar.value = true
    return
  }
  
  try {
    const payload = {
      last_name: customerForm.value.last_name.trim(),
      phone: customerForm.value.phone.trim(),
    }
    
    if (customerForm.value.location && customerForm.value.location.trim()) {
      payload.location = customerForm.value.location.trim()
    }
    
    if (customerForm.value.address_label && customerForm.value.address_label.trim()) {
      payload.address_label = customerForm.value.address_label.trim()
    }
    
    console.log('Creating requester customer:', payload)
    
    const response = await $api('/customers', {
      method: 'POST',
      body: payload,
    })
    
    console.log('Customer created:', response)
    
    // Show success notification
    snackbarText.value = t('Customer created successfully') || 'Client créé avec succès'
    snackbarColor.value = 'success'
    snackbar.value = true
    
    // Reset creation mode
    isCreating.value = false
    
    // Reset form
    customerForm.value = {
      last_name: '',
      phone: '',
      location: '',
      address_label: '',
    }
    
    // Extract customer data from response
    const customerData = response?.data || response
    const createdCustomerName = customerData?.last_name || customerData?.name || ''
    const createdCustomerId = customerData?.id
    
    // Clear search to reset autocomplete
    requesterSearch.value = ''
    form.value.requester = null
    
    // Reload entities silently (will include the new customer)
    await nextTick()
    await fetchDeliveryEntities('', 'requester')
    
    // Wait a bit for entities to load, then search for the newly created customer
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Try to find the newly created customer
    if (createdCustomerId) {
      // First try: search by the name
      if (createdCustomerName) {
        await fetchDeliveryEntities(createdCustomerName, 'requester')
        await nextTick()
      }
      
      // Find the customer in the loaded entities
      const newCustomer = requesterEntities.value.find(e => {
        // Try to match by ID first
        if (e.id === createdCustomerId || e.value === `customer_${createdCustomerId}`) {
          return true
        }
        // Fallback: match by name
        if (createdCustomerName) {
          const title = (e.title || '').toLowerCase()
          const searchName = createdCustomerName.toLowerCase()
          return title.includes(searchName) || searchName.includes(title)
        }
        return false
      })
      
      if (newCustomer) {
        const newCustomerValue = newCustomer.value || `customer_${createdCustomerId}`
        form.value.requester = newCustomerValue
        await onRequesterSelect(newCustomerValue)
      } else {
        // If not found, try to construct the value directly
        const newCustomerValue = `customer_${createdCustomerId}`
        form.value.requester = newCustomerValue
        await onRequesterSelect(newCustomerValue)
      }
    }
  } catch (error) {
    console.error('Error creating customer:', error)
    snackbarText.value = error.response?._data?.message || t('Error creating customer') || 'Erreur lors de la création du client'
    snackbarColor.value = 'error'
    snackbar.value = true
  }
}

// Customer creation form data for recipient
const recipientCustomerForm = ref({
  last_name: '',
  phone: '',
  location: '',
  address_label: '',
})

// Create customer function for recipient
const createRecipientCustomer = async () => {
  // Use recipientSearch if recipientCustomerForm.last_name is empty
  const customerName = recipientCustomerForm.value.last_name || recipientSearch.value || ''
  const customerPhone = recipientForm.value.phone || recipientCustomerForm.value.phone || ''
  
  // Validation
  if (!customerName || !customerName.trim()) {
    snackbarText.value = t('Name is required') || 'Le nom est requis'
    snackbarColor.value = 'error'
    snackbar.value = true
    return
  }
  
  if (!customerPhone || !customerPhone.trim()) {
    snackbarText.value = t('Phone is required') || 'Le téléphone est requis'
    snackbarColor.value = 'error'
    snackbar.value = true
    return
  }
  
  try {
    const payload = {
      last_name: customerName.trim(),
      phone: customerPhone.trim(),
    }
    
    // Note: address field is not sent (commented out in customer form)
    // Only location and address_label if provided
    if (recipientCustomerForm.value.location && recipientCustomerForm.value.location.trim()) {
      payload.location = recipientCustomerForm.value.location.trim()
    }
    
    if (recipientCustomerForm.value.address_label && recipientCustomerForm.value.address_label.trim()) {
      payload.address_label = recipientCustomerForm.value.address_label.trim()
    }
    
    console.log('Creating recipient customer:', payload)
    
    const response = await $api('/customers', {
      method: 'POST',
      body: payload,
    })
    
    console.log('Customer created:', response)
    
    // Show success notification
    snackbarText.value = t('Customer created successfully') || 'Client créé avec succès'
    snackbarColor.value = 'success'
    snackbar.value = true
    
    // Reset creation mode
    isCreatingRecipientCustomer.value = false
    
    // Reset form
    recipientCustomerForm.value = {
      last_name: '',
      phone: '',
      location: '',
      address_label: '',
    }
    
    // Extract customer data from response
    const customerData = response?.data || response
    const createdCustomerName = customerData?.last_name || customerData?.name || ''
    const createdCustomerId = customerData?.id
    
    // Clear search to reset autocomplete
    recipientSearch.value = ''
    form.value.recipient = null
    
    // Reload entities silently (will include the new customer)
    await nextTick()
    await fetchDeliveryEntities('', 'recipient')
    
    // Wait a bit for entities to load, then search for the newly created customer
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Try to find the newly created customer
    if (createdCustomerId) {
      // First try: search by the name
      if (createdCustomerName) {
        await fetchDeliveryEntities(createdCustomerName, 'recipient')
        await nextTick()
      }
      
      // Find the customer in the loaded entities
      const newCustomer = recipientEntities.value.find(e => {
        // Try to match by ID first
        if (e.id === createdCustomerId || e.value === `customer_${createdCustomerId}`) {
          return true
        }
        // Fallback: match by name
        if (createdCustomerName) {
          const title = (e.title || '').toLowerCase()
          const searchName = createdCustomerName.toLowerCase()
          return title.includes(searchName) || searchName.includes(title)
        }
        return false
      })
      
      if (newCustomer) {
        const newCustomerValue = newCustomer.value || `customer_${createdCustomerId}`
        form.value.recipient = newCustomerValue
        await onRecipientSelect(newCustomerValue)
      } else {
        // If not found, try to construct the value directly
        const newCustomerValue = `customer_${createdCustomerId}`
        form.value.recipient = newCustomerValue
        await onRecipientSelect(newCustomerValue)
      }
    }
  } catch (error) {
    console.error('Error creating customer:', error)
    snackbarText.value = error.response?._data?.message || t('Error creating customer') || 'Erreur lors de la création du client'
    snackbarColor.value = 'error'
    snackbar.value = true
  }
}

// Legacy function for backward compatibility
const createCustomer = async (target = 'requester') => {
  if (target === 'requester') {
    await createRequesterCustomer()
  } else {
    await createRecipientCustomer()
  }
}

// Cancel customer creation
const cancelRequesterCustomerCreation = () => {
  isCreatingRequesterCustomer.value = false
  requesterCustomerForm.value = {
    last_name: '',
    phone: '',
    location: '',
    address_label: '',
  }
  requesterSearch.value = ''
}

const cancelRecipientCustomerCreation = () => {
  isCreatingRecipientCustomer.value = false
  recipientCustomerForm.value = {
    last_name: '',
    phone: '',
    location: '',
    address_label: '',
  }
  recipientForm.value = {
    phone: '',
    address_label: '',
    address: '',
  }
  recipientSearch.value = ''
  selectedRecipientEntity.value = null
  form.value.recipient = null
  form.value.dropoff_location = ''
}

// Fetch entity details with addresses
const fetchEntityDetails = async (type, id) => {
  try {
    console.log(`=== Fetching ${type} details ===`)
    console.log('ID:', id)
    
    // Use the new delivery-entities endpoint
    const url = `/delivery-entities/${type}/${id}`
    const response = await $api(url, { method: 'GET' })
    
    console.log('Entity details response:', response)
    
    if (response && response.data) {
      const entity = response.data
      
      // Use the shared extractLocation helper
      const location = extractLocation(entity)
      
      console.log('Extracted location:', location)
      return location
    }
    
    return ''
  } catch (error) {
    console.error(`Error fetching ${type} details:`, error)
    return ''
  }
}

// Handle requester selection - auto-fill pickup location
const onRequesterSelect = async (value) => {
  console.log('=== Requester selected ===')
  console.log('Value:', value)
  
  // Disable creation mode when a value is selected
  if (value) {
    isCreatingRequesterCustomer.value = false
  }
  
  if (value) {
    const parsed = parseEntity(value)
    
    console.log('Parsed:', parsed)
    
    // First, try to get location from already loaded entities
    let location = ''
    const foundEntity = requesterEntities.value.find(
      e => e.type === parsed.type && e.id === parsed.id
    )
    
    if (foundEntity && foundEntity.location) {
      location = foundEntity.location
      console.log('Location found in loaded entities:', location)
    } else {
      // Fallback: fetch entity details with addresses via API
      console.log('Location not in loaded entities, fetching from API...')
      location = await fetchEntityDetails(parsed.type, parsed.id)
    }
    
    if (location) {
      form.value.pickup_location = location
      console.log('Auto-filled pickup_location:', form.value.pickup_location)
    } else {
      console.log('Location not available for this entity')
    }
  } else {
    // Requester deselected - clear pickup location
    form.value.pickup_location = ''
    console.log('Requester deselected, cleared pickup_location')
  }
  console.log('========================')
}

// Watch for requester selection changes (backup to ensure auto-fill works)
watch(() => form.value.requester, async (newValue, oldValue) => {
  if (newValue && newValue !== oldValue) {
    // Only auto-fill if not already filled by onRequesterSelect
    if (!form.value.pickup_location) {
      const parsed = parseEntity(newValue)
      
      // First, try to get location from already loaded entities
      let location = ''
      const foundEntity = requesterEntities.value.find(
        e => e.type === parsed.type && e.id === parsed.id
      )
      
      if (foundEntity && foundEntity.location) {
        location = foundEntity.location
      } else {
        // Fallback: fetch entity details via API
        location = await fetchEntityDetails(parsed.type, parsed.id)
      }
      
      if (location) {
        form.value.pickup_location = location
        console.log('Watch: Auto-filled pickup_location from requester:', location)
      }
    }
  } else if (!newValue) {
    // Requester deselected
    form.value.pickup_location = ''
  }
})

// Watch for recipient selection changes (backup to ensure auto-fill works)
watch(() => form.value.recipient, async (newValue, oldValue) => {
  if (newValue && newValue !== oldValue) {
    // Only auto-fill if not already filled
    if (!form.value.dropoff_location) {
      const parsed = parseEntity(newValue)
      
      // Fetch entity details via API
      const location = await fetchEntityDetails(parsed.type, parsed.id)
      
      if (location) {
        form.value.dropoff_location = location
        console.log('Watch: Auto-filled dropoff_location from recipient:', location)
      }
    }
  } else if (!newValue) {
    // Recipient deselected
    form.value.dropoff_location = ''
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
        first_name: driver.first_name || '',
        last_name: driver.last_name || '',
        phone: driver.phone || driver.user?.phone || '',
        plate_number: driver.plate_number || '',
        vehicle_type: driver.vehicle_type || '',
        subtitle: `${driver.plate_number || ''} ${driver.phone || driver.user?.phone || ''}`.trim(),
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
const distanceServiceUsed = ref(null) // Store which service was used for calculation

// Cache for distance service to avoid multiple API calls
const cachedDistanceService = ref(null)
const distanceServiceCacheTime = ref(null)
const CACHE_DURATION = 30 * 1000 // 30 seconds cache (short to ensure fresh data)

// Get distance service from settings - TEMPORARILY FIXED TO OPENSTREETMAP
// TODO: Remove this hardcoding when backend table is ready
const getDistanceService = async () => {
  // TEMPORARILY FIXED: Always return OpenStreetMap
  const FIXED_SERVICE = 'openstreetmap'
  console.log('Using fixed distance service:', FIXED_SERVICE)
  return FIXED_SERVICE
  
  /* COMMENTED OUT - Will be re-enabled when backend table is ready
  // Return cached value if still valid
  if (cachedDistanceService.value && distanceServiceCacheTime.value) {
    const cacheAge = Date.now() - distanceServiceCacheTime.value
    if (cacheAge < CACHE_DURATION) {
      console.log('Using cached distance service:', cachedDistanceService.value)
      return cachedDistanceService.value
    }
  }

  try {
    const response = await $api('/settings/distance-service', {
      method: 'GET',
    })
    const service = response?.distance_service || 'google_maps'
    
    // Cache the service
    cachedDistanceService.value = service
    distanceServiceCacheTime.value = Date.now()
    
    // Also save to localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('distance_service_setting', service)
      }
    } catch (e) {
      console.warn('Error saving to localStorage:', e)
    }
    
    console.log('=== Distance Service Retrieved ===')
    console.log('Service from API:', service)
    console.log('Full response:', response)
    console.log('Cached for 30 seconds')
    console.log('=================================')
    return service
  } catch (error) {
    // Silently ignore 404 errors (endpoint may not exist yet)
    const status = error?.response?.status || error?.status
    const is404 = status === 404 || error?.message?.includes('404')
    
    if (!is404) {
      console.warn('Could not load distance service from API, trying localStorage:', error)
    }
    
    // Try to get from localStorage if API fails
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedService = localStorage.getItem('distance_service_setting')
        if (storedService && ['google_maps', 'openstreetmap', 'haversine'].includes(storedService)) {
          console.log('Using distance service from localStorage:', storedService)
          cachedDistanceService.value = storedService
          distanceServiceCacheTime.value = Date.now()
          return storedService
        }
      }
    } catch (e) {
      console.warn('Error reading from localStorage:', e)
    }
    
    // Cache default value
    const defaultService = 'google_maps'
    cachedDistanceService.value = defaultService
    distanceServiceCacheTime.value = Date.now()
    
    return defaultService
  }
  */
}

// Force refresh distance service cache
const refreshDistanceService = async () => {
  cachedDistanceService.value = null
  distanceServiceCacheTime.value = null
  return await getDistanceService()
}

// Load distance service when dialog opens
watch(dialogVisible, async newVal => {
  if (newVal) {
    // Invalidate all caches to ensure fresh data
    invalidateDistanceServiceCache()
    cachedDistanceService.value = null
    distanceServiceCacheTime.value = null
    // Pre-load the distance service (force refresh to get latest)
    await refreshDistanceService()
  }
})

// Calculate price based on real distance
const calculatePrice = async () => {
  const pickup = form.value.pickup_location
  const dropoff = form.value.dropoff_location

  if (!pickup || !dropoff) {
    form.value.price = 0
    form.value.distance_km = null
    distanceInfo.value = null
    distanceServiceUsed.value = null

    return
  }

  isCalculatingPrice.value = true
  try {
    // Get the distance service being used
    const service = await getDistanceService()
    distanceServiceUsed.value = service
    
    console.log('=== calculatePrice ===')
    console.log('Service retrieved:', service)
    console.log('Will pass to calculateDistanceFromUrls')
    console.log('======================')
    
    // Calculate distance using the selected service (pass service explicitly)
    const result = await calculateDistanceFromUrls(pickup, dropoff, service)
    
    // Calculate price based on distance and billing mode
    const price = calculateDeliveryPrice(result.distance, billingMode.value)
    
    form.value.price = price
    form.value.distance_km = Number(result.distance.toFixed(2))
    distanceInfo.value = {
      distance: result.distance,
      distanceText: result.distanceText,
      duration: result.duration,
      service: service, // Store service in distanceInfo
    }
    
    console.log('Distance calculation result:', {
      distance: result.distance + ' km',
      price: price + ' FCFA',
      duration: result.duration,
      service: service,
    })
  } catch (error) {
    console.error('Error calculating price:', error)

    // Fallback to 0 if calculation fails
    form.value.price = 0
    form.value.distance_km = null
    distanceInfo.value = null
    distanceServiceUsed.value = null

    // Show error message to user
    alert(t('Error calculating distance. Please verify that the coordinates are valid.'))
  } finally {
    isCalculatingPrice.value = false
  }
}

// Watch for location changes and billing mode to recalculate price (with debounce)
let priceCalculationTimeout = null
watch([
  () => form.value.pickup_location,
  () => form.value.dropoff_location,
  () => form.value.partner_location,
  () => form.value.customer_location,
  () => billingMode.value,
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
    
    // Parse requester and recipient (new polymorphic structure)
    if (!form.value.requester) {
      alert(t('Requester is required') || 'Le demandeur est requis')
      isSubmitting.value = false
      return
    }
    
    // For recipient, check if we have either a selected entity or manual form data
    let recipient = null
    if (form.value.recipient) {
      // Entity was selected (from search)
      recipient = parseEntity(form.value.recipient)
    } else if (selectedRecipientEntity.value && selectedRecipientEntity.value.value) {
      // Entity was selected via searchRecipientByNameOrPhone
      recipient = parseEntity(selectedRecipientEntity.value.value)
    } else if (isCreatingRecipientCustomer.value && recipientForm.value.name && recipientForm.value.phone) {
      // Manual form data but customer creation is in progress
      alert(t('Recipient is required') || 'Le destinataire est requis. Veuillez créer le client ou sélectionner un destinataire existant.')
      isSubmitting.value = false
      return
    } else {
      alert(t('Recipient is required') || 'Le destinataire est requis')
      isSubmitting.value = false
      return
    }
    
    const requester = parseEntity(form.value.requester)
    
    payload.requester_type = requester.type
    payload.requester_id = requester.id
    payload.recipient_type = recipient.type
    payload.recipient_id = recipient.id
    
    // Delivery fields - ensure distance_km is always included
    payload.driver_id = form.value.driver_id ? Number(form.value.driver_id) : undefined
    payload.pickup_location = pickup
    payload.dropoff_location = dropoff
    payload.distance_km = Number(form.value.distance_km) // Always include, required by API
    payload.price = form.value.price ? Number(form.value.price) : undefined
    
    // Remove undefined and empty string fields (but keep distance_km even if 0)
    Object.keys(payload).forEach(key => {
      if (key !== 'distance_km' && (payload[key] === undefined || payload[key] === '' || payload[key] === null)) {
        delete payload[key]
      }
    })

    console.log('=== Creating/Updating delivery payload ===')
    console.log('Mode:', isEditMode.value ? 'EDIT' : 'CREATE')
    console.log('Payload:', payload)
    console.log('Requester:', requester)
    console.log('Recipient:', recipient)
    console.log('Distance (km):', payload.distance_km)
    console.log('==========================================')

    if (isEditMode.value) {
      // Update existing delivery
      await $api(`/deliveries/${props.delivery.id}`, {
        method: 'PATCH',
        body: payload,
        onResponseError({ response }) {
          console.error('=== Delivery update error ===')
          console.error('Status:', response.status)
          console.error('Error data:', response._data)
          console.error('Errors:', response._data?.errors || response._data?.message || response._data)
          console.error('============================')
          
          // Show error message to user
          const errorMessage = response._data?.message || t('Error updating delivery') || 'Erreur lors de la mise à jour de la livraison'
          const errorDetails = response._data?.errors ? Object.values(response._data.errors).flat().join(', ') : ''
          alert(`${errorMessage}${errorDetails ? `\n${errorDetails}` : ''}`)
        },
      })

      emit('deliveryUpdated')
    } else {
      // Create new delivery
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
    }

    resetForm()
    dialogVisible.value = false
  } catch (error) {
    console.error(`Error ${isEditMode.value ? 'updating' : 'creating'} delivery:`, error)
    alert(isEditMode.value 
      ? (t('Error updating delivery. Please try again.') || 'Erreur lors de la mise à jour de la livraison. Veuillez réessayer.')
      : t('Error creating delivery. Please try again.'))
  } finally {
    isSubmitting.value = false
  }
}

// Reset form
const resetForm = () => {
  billingMode.value = 'express'
  form.value = {
    requester: null,
    recipient: null,
    driver_id: null,
    pickup_location: '',
    dropoff_location: '',
    distance_km: null,
    price: 0,
  }
  requesterSearch.value = ''
  recipientSearch.value = ''
  distanceInfo.value = null
  distanceServiceUsed.value = null
  
  // Reset customer creation forms and modes
  isCreatingRequesterCustomer.value = false
  isCreatingRecipientCustomer.value = false
  requesterCustomerForm.value = {
    last_name: '',
    phone: '',
    location: '',
    address_label: '',
  }
  recipientCustomerForm.value = {
    last_name: '',
    phone: '',
    location: '',
    address_label: '',
  }
  recipientForm.value = {
    phone: '',
    address_label: '',
  }
  selectedRecipientEntity.value = null
}

// Close dialog
const onClose = () => {
  resetForm()
  dialogVisible.value = false
}

// Check if we're in edit mode
const isEditMode = computed(() => !!props.delivery?.id)

// Load delivery data for editing
const loadDeliveryData = () => {
  if (!props.delivery) {
    return
  }

  const delivery = props.delivery

  // Requester data (new polymorphic structure)
  if (delivery.requester) {
    const requesterType = delivery.requester_type || (delivery.requester.id ? 'partner' : 'customer')
    const requesterId = delivery.requester.id || delivery.requester_id
    form.value.requester = `${requesterType}_${requesterId}`
  } else if (delivery.partner?.id) {
    // Fallback for old structure
    form.value.requester = `partner_${delivery.partner.id}`
  } else if (delivery.customer?.id) {
    // Fallback for old structure
    form.value.requester = `customer_${delivery.customer.id}`
  }

  // Recipient data (new polymorphic structure)
  if (delivery.recipient) {
    const recipientType = delivery.recipient_type || (delivery.recipient.id ? 'customer' : 'partner')
    const recipientId = delivery.recipient.id || delivery.recipient_id
    form.value.recipient = `${recipientType}_${recipientId}`
    
    // Fill recipient form with data
    recipientForm.value.phone = delivery.recipient.phone || ''
    
    // Get address data
    const addressData = delivery.recipient.default_address || delivery.recipient.addresses?.[0]
    if (addressData) {
      recipientForm.value.address_label = addressData.label || ''
      form.value.dropoff_location = addressData.address || addressData.location || ''
    }
  } else if (delivery.customer?.id) {
    // Fallback for old structure
    form.value.recipient = `customer_${delivery.customer.id}`
    recipientForm.value.phone = delivery.customer.phone || ''
    
    // Get address data
    const addressData = delivery.customer.default_address || delivery.customer.addresses?.[0]
    if (addressData) {
      recipientForm.value.address_label = addressData.label || ''
      form.value.dropoff_location = addressData.address || addressData.location || ''
    }
  } else if (delivery.partner?.id) {
    // Fallback for old structure
    form.value.recipient = `partner_${delivery.partner.id}`
    recipientForm.value.phone = delivery.partner.phone || ''
    
    // Get address data
    const addressData = delivery.partner.default_address || delivery.partner.addresses?.[0]
    if (addressData) {
      recipientForm.value.address_label = addressData.label || ''
      form.value.dropoff_location = addressData.address || addressData.location || ''
    }
  }

  // Delivery fields
  form.value.driver_id = delivery.driver?.id || null
  form.value.pickup_location = normalizeUrl(delivery.pickup_location) || delivery.pickup_location || ''
  form.value.dropoff_location = normalizeUrl(delivery.dropoff_location) || delivery.dropoff_location || ''
  form.value.distance_km = delivery.distance_km ? parseFloat(delivery.distance_km) : null
  form.value.price = delivery.price ? parseFloat(delivery.price) : 0

  // Set distance info if available
  if (form.value.distance_km) {
    distanceInfo.value = {
      distance: form.value.distance_km,
      distanceText: `${form.value.distance_km} km`,
      duration: 'N/A',
    }
  }
}

// Helper function to normalize URL from location object
const normalizeUrl = obj => {
  if (!obj) return null

  // Prefer explicit URL if provided
  if (obj.url) return obj.url

  // Build map link from lat/lng if available
  if (obj.lat && obj.lng)
    return `https://www.google.com/maps?q=${encodeURIComponent(obj.lat)},${encodeURIComponent(obj.lng)}`

  return null
}

// Load data when dialog opens
watch(dialogVisible, newVal => {
  if (newVal) {
    fetchDrivers()
    fetchDeliveryEntities('', 'requester')
    fetchDeliveryEntities('', 'recipient')
    
    // Load delivery data if in edit mode
    if (isEditMode.value) {
      loadDeliveryData()
    } else {
      resetForm()
    }
  }
})

// Watch for delivery prop changes
watch(() => props.delivery, () => {
  if (dialogVisible.value && isEditMode.value) {
    loadDeliveryData()
  }
}, { deep: true })
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
        <span>{{ isEditMode ? ($t('Edit Delivery') || 'Modifier la livraison') : ($t('Add New Delivery') || 'Ajouter une livraison') }}</span>
      </VCardTitle>

      <VDivider />

      <VCardText class="dialog-content">
        <VForm @submit.prevent="onSubmit">
          <!-- Billing Mode Selection - Compact container aligned left -->
          <div class="mb-4 d-flex align-center">
            <VMenu>
              <template #activator="{ props: menuProps }">
                <VBtn
                  v-bind="menuProps"
                  variant="outlined"
                  color="primary"
                  class="text-capitalize"
                  prepend-icon="tabler-settings"
                >
                  {{ billingMode === 'express' ? $t('Express Mode') : $t('Standard Mode') }}
                  <VIcon
                    icon="tabler-chevron-down"
                    class="ms-2"
                  />
                </VBtn>
              </template>
              <VList>
                <VListItem
                  :value="'express'"
                  :active="billingMode === 'express'"
                  @click="billingMode = 'express'"
                >
                  <VListItemTitle>{{ $t('Express Mode') }}</VListItemTitle>
                  <VListItemSubtitle class="text-xs">
                    {{ $t('Express mode: Detailed pricing with multiple distance ranges') }}
                  </VListItemSubtitle>
                </VListItem>
                <VListItem
                  :value="'standard'"
                  :active="billingMode === 'standard'"
                  @click="billingMode = 'standard'"
                >
                  <VListItemTitle>{{ $t('Standard Mode') }}</VListItemTitle>
                  <VListItemSubtitle class="text-xs">
                    {{ $t('Standard mode: Simplified pricing with three distance ranges') }}
                  </VListItemSubtitle>
                </VListItem>
              </VList>
            </VMenu>
          </div>

          <!-- Requester and Recipient Sections - Unified (Partners + Customers) -->
          <VRow class="mb-4">
            <!-- Requester Section (Who requests the delivery) -->
            <VCol
              cols="12"
              md="6"
            >
              <VCard
                variant="outlined"
                class="mb-4"
              >
                <VCardItem class="pb-2">
                  <VCardTitle class="text-h6">
                    {{ $t('Requester') }} ({{ $t('Who requests') }})
                  </VCardTitle>
                  <VCardSubtitle>
                    {{ $t('Select partner or customer who requests the delivery') }}
                  </VCardSubtitle>
                </VCardItem>
                <VDivider />
                <VCardText>
                  <VRow>
                    <!-- Customer Creation Form (when no results found) -->
                    <template v-if="isCreatingRequesterCustomer">
                      <VCol cols="12">
                        <VAlert
                          type="info"
                          variant="tonal"
                          class="mb-4"
                        >
                          {{ $t('No results found. Create a new customer') || 'Aucun résultat trouvé. Créer un nouveau client' }}
                        </VAlert>
                      </VCol>
                      <VCol cols="12">
                        <AppTextField
                          v-model="requesterCustomerForm.last_name"
                          :label="$t('Full Name') || 'Nom complet'"
                          placeholder="Marie Agbodan"
                          dense
                          required
                        />
                      </VCol>
                      <VCol cols="12">
                        <AppTextField
                          v-model="requesterCustomerForm.phone"
                          :label="$t('Phone') || 'Téléphone'"
                          placeholder="+228 92 34 56 78"
                          dense
                          required
                        />
                      </VCol>
                      <VCol
                        cols="12"
                        md="6"
                      >
                        <AppTextField
                          v-model="requesterCustomerForm.address_label"
                          :label="$t('Address Label') || 'Libellé de l\'adresse'"
                          placeholder="Domicile"
                          dense
                          hint="Ex: Domicile, Bureau, etc."
                        />
                      </VCol>
                      <VCol
                        cols="12"
                        md="6"
                      >
                        <AppTextField
                          v-model="requesterCustomerForm.location"
                          :label="$t('GPS Coordinates') || 'Coordonnées GPS'"
                          placeholder="6°10'53.8&quot;N 1°12'35.7&quot;E"
                          dense
                          hint="Format: 6°10'53.8&quot;N 1°12'35.7&quot;E"
                        />
                      </VCol>
                      <VCol cols="12">
                        <div class="d-flex gap-2">
                          <VBtn
                            color="primary"
                            @click="createRequesterCustomer"
                          >
                            {{ $t('Validate') || 'Valider' }}
                          </VBtn>
                          <VBtn
                            color="secondary"
                            variant="tonal"
                            @click="cancelRequesterCustomerCreation"
                          >
                            {{ $t('Cancel') || 'Annuler' }}
                          </VBtn>
                        </div>
                      </VCol>
                    </template>

                    <!-- Normal Autocomplete (when results found or no search) -->
                    <template v-else>
                      <VCol cols="12">
                        <AppAutocomplete
                          v-model="form.requester"
                          v-model:search="requesterSearch"
                          :items="requesterEntities"
                          :loading="isLoadingRequester"
                          :label="$t('Requester')"
                          :placeholder="$t('Search and select a partner or customer')"
                          item-title="title"
                          item-value="value"
                          clearable
                          :custom-filter="(itemTitle, queryText, item) => {
                            const searchText = (queryText || '').toLowerCase()
                            const title = (itemTitle || '').toLowerCase()
                            const subtitle = (item.raw?.subtitle || '').toLowerCase()
                            const phone = (item.raw?.phone || '').toLowerCase()
                            const contactName = (item.raw?.contact_name || '').toLowerCase()
                            const email = (item.raw?.email || '').toLowerCase()
                            const firstName = (item.raw?.first_name || '').toLowerCase()
                            const lastName = (item.raw?.last_name || '').toLowerCase()
                            return title.includes(searchText) || 
                                   subtitle.includes(searchText) || 
                                   phone.includes(searchText) || 
                                   contactName.includes(searchText) ||
                                   email.includes(searchText) ||
                                   firstName.includes(searchText) ||
                                   lastName.includes(searchText)
                          }"
                          @update:model-value="onRequesterSelect"
                        />
                      </VCol>
                      <VCol cols="12">
                        <AppTextField
                          v-model="form.pickup_location"
                          :label="$t('Pickup Location')"
                          placeholder="6°10'53.8&quot;N 1°12'35.7&quot;E"
                          :hint="$t('Location coordinates (auto-filled if requester selected)')"
                        />
                      </VCol>
                    </template>
                  </VRow>
                </VCardText>
              </VCard>
            </VCol>

            <!-- Recipient Section (Who receives the delivery) -->
            <VCol
              cols="12"
              md="6"
            >
              <VCard
                variant="outlined"
                class="mb-4"
              >
                <VCardItem class="pb-2">
                  <VCardTitle class="text-h6">
                    {{ $t('Recipient') }} ({{ $t('Who receives') }})
                  </VCardTitle>
                  <VCardSubtitle>
                    {{ $t('Select partner or customer who receives the delivery') }}
                  </VCardSubtitle>
                </VCardItem>
                <VDivider />
                <VCardText>
                  <VRow>
                    <!-- Ligne 1: Nom (avec autocomplete) et Numéro -->
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <AppAutocomplete
                        v-model="form.recipient"
                        v-model:search="recipientSearch"
                        :items="recipientEntities"
                        :loading="isLoadingRecipient"
                        :label="$t('Full Name') || 'Nom complet'"
                        :placeholder="$t('Search and select a partner or customer')"
                        item-title="title"
                        item-value="value"
                        clearable
                        :custom-filter="(itemTitle, queryText, item) => {
                          const searchText = (queryText || '').toLowerCase()
                          const title = (itemTitle || '').toLowerCase()
                          const subtitle = (item.raw?.subtitle || '').toLowerCase()
                          const phone = (item.raw?.phone || '').toLowerCase()
                          const contactName = (item.raw?.contact_name || '').toLowerCase()
                          const email = (item.raw?.email || '').toLowerCase()
                          const firstName = (item.raw?.first_name || '').toLowerCase()
                          const lastName = (item.raw?.last_name || '').toLowerCase()
                          return title.includes(searchText) || 
                                 subtitle.includes(searchText) || 
                                 phone.includes(searchText) || 
                                 contactName.includes(searchText) ||
                                 email.includes(searchText) ||
                                 firstName.includes(searchText) ||
                                 lastName.includes(searchText)
                        }"
                        @update:model-value="onRecipientSelect"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <AppTextField
                        v-model="recipientForm.phone"
                        :label="$t('Phone') || 'Téléphone'"
                        placeholder="+228 92 34 56 78"
                        dense
                      />
                    </VCol>

                    <!-- Ligne 2: Libellé adresse et Location -->
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <AppTextField
                        v-model="recipientForm.address_label"
                        :label="$t('Address Label') || 'Libellé de l\'adresse'"
                        placeholder="Domicile"
                        dense
                        hint="Ex: Domicile, Bureau, etc."
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <AppTextField
                        v-model="form.dropoff_location"
                        :label="$t('Location') || 'Localisation'"
                        placeholder="6°11'10.2&quot;N 1°13'20.5&quot;E"
                        :hint="$t('Location coordinates (auto-filled if recipient selected)') || 'Coordonnées GPS (auto-rempli si destinataire sélectionné)'"
                        dense
                      />
                    </VCol>

                    <!-- Validate Button (shown when no exact match found) -->
                    <VCol
                      v-if="isCreatingRecipientCustomer && recipientSearch && recipientSearch.trim().length >= 2"
                      cols="12"
                    >
                      <VAlert
                        type="info"
                        variant="tonal"
                        class="mb-2"
                      >
                        {{ $t('No exact match found. Fill the fields below and click Validate to create a new customer') || 'Aucune correspondance exacte trouvée. Remplissez les champs ci-dessous et cliquez sur Valider pour créer un nouveau client' }}
                      </VAlert>
                      <div class="d-flex gap-2">
                        <VBtn
                          color="primary"
                          @click="createRecipientCustomer"
                        >
                          {{ $t('Validate') || 'Valider' }}
                        </VBtn>
                        <VBtn
                          color="secondary"
                          variant="tonal"
                          @click="cancelRecipientCustomerCreation"
                        >
                          {{ $t('Cancel') || 'Annuler' }}
                        </VBtn>
                      </div>
                    </VCol>
                  </VRow>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>

          <!-- Delivery Details - Always visible -->
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
                md="4"
              >
                <AppAutocomplete
                  v-model="form.driver_id"
                  :items="drivers"
                  :loading="isLoadingDrivers"
                  :label="$t('Assign Driver')"
                  :placeholder="$t('Select a driver')"
                  item-title="title"
                  item-value="value"
                  clearable
                  :custom-filter="(itemTitle, queryText, item) => {
                    const searchText = (queryText || '').toLowerCase()
                    const title = (itemTitle || '').toLowerCase()
                    const subtitle = (item.raw?.subtitle || '').toLowerCase()
                    const firstName = (item.raw?.first_name || '').toLowerCase()
                    const lastName = (item.raw?.last_name || '').toLowerCase()
                    const phone = (item.raw?.phone || '').toLowerCase()
                    const plateNumber = (item.raw?.plate_number || '').toLowerCase()
                    const vehicleType = (item.raw?.vehicle_type || '').toLowerCase()
                    return title.includes(searchText) || 
                           subtitle.includes(searchText) || 
                           firstName.includes(searchText) ||
                           lastName.includes(searchText) ||
                           phone.includes(searchText) ||
                           plateNumber.includes(searchText) ||
                           vehicleType.includes(searchText)
                  }"
                />
              </VCol>

              <!-- Distance -->
              <VCol
                cols="12"
                md="4"
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
                md="4"
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
              </VCol>

              <!-- Distance info with service indicator -->
              <VCol
                v-if="distanceInfo"
                cols="12"
              >
                <div class="text-sm text-medium-emphasis">
                  <VIcon
                    :icon="distanceInfo.isEstimated ? 'tabler-map-pin-question' : 'tabler-route'"
                    size="14"
                    class="me-1"
                  />
                  {{ $t('Distance') }}: {{ distanceInfo.distanceText }} (~{{ distanceInfo.duration }})
                  
                  <!-- Service indicator (subtle) -->
                  <VChip
                    v-if="distanceServiceUsed"
                    size="x-small"
                    variant="tonal"
                    :color="distanceServiceUsed === 'google_maps' ? 'primary' : distanceServiceUsed === 'openstreetmap' ? 'info' : 'secondary'"
                    class="ms-2"
                  >
                    <VIcon
                      :icon="distanceServiceUsed === 'google_maps' ? 'tabler-brand-google' : distanceServiceUsed === 'openstreetmap' ? 'tabler-map' : 'tabler-calculator'"
                      size="12"
                      class="me-1"
                    />
                    {{ distanceServiceUsed === 'google_maps' ? $t('Google Maps') : distanceServiceUsed === 'openstreetmap' ? $t('OpenStreetMap') : $t('Haversine') }}
                  </VChip>
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
          :disabled="!form.pickup_location || !form.dropoff_location || !form.requester || !form.recipient"
          @click="onSubmit"
        >
          {{ isEditMode ? ($t('Update Delivery') || 'Mettre à jour') : ($t('Create Delivery') || 'Créer la livraison') }}
        </VBtn>
      </VCardActions>
    </VCard>

    <!-- Snackbar for notifications -->
    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="3000"
      location="top"
    >
      {{ snackbarText }}
      <template #actions>
        <VBtn
          icon
          variant="text"
          @click="snackbar = false"
        >
          <VIcon icon="tabler-x" />
        </VBtn>
      </template>
    </VSnackbar>
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
  max-height: 80vh;
  overflow-y: auto;
  padding: 1rem;
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

