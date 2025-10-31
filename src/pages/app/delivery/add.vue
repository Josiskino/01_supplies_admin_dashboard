<script setup>
/* eslint-disable camelcase */
import { useDeliveryStatuses } from '@/composables/useStatusManagement'
import { calculateDeliveryPrice, calculateDistanceFromUrls } from '@/utils/googleMaps'

const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['update:isDialogVisible', 'deliveryAdded'])

const { getStatusOptions } = useDeliveryStatuses()

const dialogVisible = computed({
  get: () => props.isDialogVisible,
  set: val => emit('update:isDialogVisible', val),
})

// Form data
const form = ref({
  client_name: '',
  client_phone: '',
  recipient_name: '',
  recipient_phone: '',
  driver_id: null,
  pickup_location: '',
  dropoff_location: '',
  price: 0,
  status: 'pending',
})

// Loading states
const isSubmitting = ref(false)
const isLoadingClients = ref(false)
const isLoadingDrivers = ref(false)

// Options
const clientSuggestions = ref([])
const drivers = ref([])

const statusOptions = computed(() => getStatusOptions())

// Search clients dynamically
const searchClients = async searchTerm => {
  if (!searchTerm || searchTerm.length < 2) {
    clientSuggestions.value = []

    return
  }

  isLoadingClients.value = true
  try {
    const response = await $api(`/clients?search=${encodeURIComponent(searchTerm)}`, {
      method: 'GET',
    })

    if (Array.isArray(response)) {
      clientSuggestions.value = response.map(client => ({
        title: `${client.name} (${client.phone})`,
        value: client.name,
        phone: client.phone,
      }))
    } else if (response?.data) {
      clientSuggestions.value = response.data.map(client => ({
        title: `${client.name} (${client.phone})`,
        value: client.name,
        phone: client.phone,
      }))
    } else {
      clientSuggestions.value = []
    }
  } catch (error) {
    console.error('Error searching clients:', error)
    clientSuggestions.value = []
  } finally {
    isLoadingClients.value = false
  }
}

// Fetch available drivers
const fetchDrivers = async () => {
  isLoadingDrivers.value = true
  try {
    const response = await $api('/drivers?status=available', {
      method: 'GET',
    })

    if (Array.isArray(response)) {
      drivers.value = response.map(driver => ({
        title: `${driver.name} (${driver.vehicle_type})`,
        value: driver.id,
      }))
    } else if (response?.data) {
      drivers.value = response.data.map(driver => ({
        title: `${driver.name} (${driver.vehicle_type})`,
        value: driver.id,
      }))
    } else {
      drivers.value = []
    }
  } catch (error) {
    console.error('Error fetching drivers:', error)
    drivers.value = []
  } finally {
    isLoadingDrivers.value = false
  }
}

// Handle client selection
const onClientSelect = selectedClient => {
  const client = clientSuggestions.value.find(c => c.value === selectedClient)
  if (client) {
    form.value.client_name = client.value
    form.value.client_phone = client.phone
  }
}

// Loading state for price calculation
const isCalculatingPrice = ref(false)
const distanceInfo = ref(null)

// Calculate price based on real distance
const calculatePrice = async () => {
  if (!form.value.pickup_location || !form.value.dropoff_location) {
    form.value.price = 0
    distanceInfo.value = null

    return
  }

  isCalculatingPrice.value = true
  try {
    // Calculate distance using Google Maps API
    const result = await calculateDistanceFromUrls(
      form.value.pickup_location,
      form.value.dropoff_location,
    )
    
    // Calculate price based on distance
    const price = calculateDeliveryPrice(result.distance)
    
    form.value.price = price
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
    distanceInfo.value = null

    // Show error message to user
    alert('Erreur lors du calcul de la distance. Veuillez vérifier que les URLs Google Maps sont valides et contiennent des coordonnées.')
  } finally {
    isCalculatingPrice.value = false
  }
}

// Watch for location changes to recalculate price (with debounce)
let priceCalculationTimeout = null
watch([() => form.value.pickup_location, () => form.value.dropoff_location], () => {
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
    const payload = {
      client_name: form.value.client_name,
      client_phone: form.value.client_phone,
      recipient_name: form.value.recipient_name,
      recipient_phone: form.value.recipient_phone,
      driver_id: form.value.driver_id,
      pickup_location: form.value.pickup_location,
      dropoff_location: form.value.dropoff_location,
      price: form.value.price,
      status: form.value.status,
    }

    await $api('/deliveries', {
      method: 'POST',
      body: payload,
    })

    emit('deliveryAdded')
    resetForm()
    dialogVisible.value = false
  } catch (error) {
    console.error('Error creating delivery:', error)
  } finally {
    isSubmitting.value = false
  }
}

// Reset form
const resetForm = () => {
  form.value = {
    client_name: '',
    client_phone: '',
    recipient_name: '',
    recipient_phone: '',
    driver_id: null,
    pickup_location: '',
    dropoff_location: '',
    price: 0,
    status: 'pending',
  }
  clientSuggestions.value = []
}

// Close dialog
const onClose = () => {
  resetForm()
  dialogVisible.value = false
}

// Load drivers when dialog opens
watch(dialogVisible, newVal => {
  if (newVal) {
    fetchDrivers()
  }
})
</script>

<template>
  <VDialog
    :width="$vuetify.display.smAndDown ? 'auto' : 800"
    :model-value="dialogVisible"
    @update:model-value="val => dialogVisible = val"
  >
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="dialogVisible = false" />
    
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>Add New Delivery</span>
      </VCardTitle>

      <VDivider />

      <VCardText>
        <VForm @submit.prevent="onSubmit">
          <VRow>
            <!-- Client Name (with autocomplete) -->
            <VCol
              cols="12"
              md="6"
            >
              <VAutocomplete
                v-model="form.client_name"
                :items="clientSuggestions"
                :loading="isLoadingClients"
                label="Client Name"
                placeholder="Type client name..."
                clearable
                @update:search="searchClients"
                @update:model-value="onClientSelect"
              />
            </VCol>

            <!-- Client Phone -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.client_phone"
                placeholder="Client Phone"
              />
            </VCol>

            <!-- Recipient Name -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.recipient_name"
                label="Recipient Name"
                placeholder="Enter recipient name"
              />
            </VCol>

            <!-- Recipient Phone -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.recipient_phone"
                label="Recipient Phone"
                placeholder="Enter recipient phone"
              />
            </VCol>

            <!-- Driver Selection -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="form.driver_id"
                :items="drivers"
                :loading="isLoadingDrivers"
                label="Assign Driver"
                placeholder="Select a driver"
                clearable
              />
            </VCol>

            <!-- Status -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="form.status"
                :items="statusOptions"
                label="Status"
                placeholder="Select status"
              />
            </VCol>

            <!-- Pickup Location -->
            <VCol cols="12">
              <AppTextField
                v-model="form.pickup_location"
                label="Pickup Location"
                placeholder="Google Maps URL, DMS (6°11'37.0&quot;N 1°11'02.5&quot;E), or decimal (6.193611, 1.184028)"
              />
              <div class="text-xs text-medium-emphasis mt-1">
                <VIcon
                  icon="tabler-info-circle"
                  size="12"
                  class="me-1"
                />
                Supported formats: Google Maps URL, DMS coordinates, or decimal coordinates
              </div>
            </VCol>

            <!-- Dropoff Location -->
            <VCol cols="12">
              <AppTextField
                v-model="form.dropoff_location"
                label="Dropoff Location"
                placeholder="Google Maps URL, DMS (6°11'37.0&quot;N 1°11'02.5&quot;E), or decimal (6.193611, 1.184028)"
              />
              <div class="text-xs text-medium-emphasis mt-1">
                <VIcon
                  icon="tabler-info-circle"
                  size="12"
                  class="me-1"
                />
                Supported formats: Google Maps URL, DMS coordinates, or decimal coordinates
              </div>
            </VCol>

            <!-- Price (read-only) -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.price"
                label="Price (FCFA)"
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
                Distance: {{ distanceInfo.distanceText }} (~{{ distanceInfo.duration }})
                <VChip
                  v-if="distanceInfo.isEstimated"
                  size="x-small"
                  color="warning"
                  class="ms-2"
                >
                  Estimated
                </VChip>
              </div>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>

      <VDivider />

      <VCardActions class="d-flex justify-end gap-3 pa-4">
        <VBtn
          color="secondary"
          variant="tonal"
          @click="onClose"
        >
          Cancel
        </VBtn>
        <VBtn
          color="primary"
          :loading="isSubmitting"
          :disabled="!form.client_name || !form.pickup_location || !form.dropoff_location"
          @click="onSubmit"
        >
          Create Delivery
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
</style>
