<script setup>
import { useI18n } from 'vue-i18n'
import { invalidateDistanceServiceCache, setDistanceService } from '@/utils/googleMaps'

const { t } = useI18n()

const billingMode = ref('express')
const isLoading = ref(false)
const activeTab = ref(0) // 0 = Pricing, 1 = Distance Calculation Service

// Distance calculation service
const distanceService = ref('google_maps') // 'google_maps', 'openstreetmap', 'haversine'

// Express mode pricing (existing)
const expressPricing = ref({
  range_0_1km: 375,
  range_1_5km: 500,
  range_5_6km: 600,
  additional_per_km: 100,
})

// Standard mode pricing (new)
const standardPricing = ref({
  range_1_10km: 500,
  range_10_1_15km: 700,
  range_over_15km: 1000,
})

// Load pricing settings from API or localStorage
const loadPricingSettings = async () => {
  isLoading.value = true
  try {
    // Try to load from API first
    try {
      const response = await $api('/settings/pricing', {
        method: 'GET',
      })

      if (response && response.mode) {
        billingMode.value = response.mode

        if (response.mode === 'express' && response.pricing) {
          Object.assign(expressPricing.value, response.pricing)
        } else if (response.mode === 'standard' && response.pricing) {
          Object.assign(standardPricing.value, response.pricing)
        }
        
        // Also save to localStorage for backup
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('pricing_settings', JSON.stringify({
              mode: response.mode,
              pricing: response.mode === 'express' ? expressPricing.value : standardPricing.value,
            }))
          }
        } catch (e) {
          // Ignore localStorage errors
        }
        
        // Load distance service setting from API response if available
        if (response && response.distance_service) {
          distanceService.value = response.distance_service
        }
        
        return // Successfully loaded from API
      }
    } catch (apiError) {
      // Silently ignore 404 errors (endpoint may not exist yet)
      const status = apiError?.response?.status || apiError?.status
      const is404 = status === 404 || apiError?.message?.includes('404')
      
      if (!is404) {
        console.warn('Could not load pricing settings from API, trying localStorage:', apiError)
      }
    }
    
    // Try to load from localStorage if API fails
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('pricing_settings')
        if (stored) {
          const pricingData = JSON.parse(stored)
          if (pricingData.mode) {
            billingMode.value = pricingData.mode
            if (pricingData.mode === 'express' && pricingData.pricing) {
              Object.assign(expressPricing.value, pricingData.pricing)
            } else if (pricingData.mode === 'standard' && pricingData.pricing) {
              Object.assign(standardPricing.value, pricingData.pricing)
            }
            console.log('Pricing settings loaded from localStorage')
            return
          }
        }
      }
    } catch (storageError) {
      console.warn('Error reading from localStorage:', storageError)
    }
    
    // Use defaults if nothing found
    console.log('Using default pricing settings')
  } catch (error) {
    console.warn('Error loading pricing settings:', error)
  } finally {
    isLoading.value = false
  }
}

// Load distance service settings from API or localStorage
const loadDistanceServiceSettings = async () => {
  try {
    const response = await $api('/settings/distance-service', {
      method: 'GET',
    })

    if (response && response.distance_service) {
      distanceService.value = response.distance_service
      // Also save to localStorage
      setDistanceService(response.distance_service)
      return
    }
  } catch (error) {
    // Silently ignore 404 errors (endpoint may not exist yet)
    const status = error?.response?.status || error?.status
    const is404 = status === 404 || error?.message?.includes('404')
    
    if (!is404) {
      console.warn('Could not load distance service settings from API, trying localStorage:', error)
    }
  }
  
  // Try to load from localStorage if API fails or returns no data
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedService = localStorage.getItem('distance_service_setting')
      if (storedService && ['google_maps', 'openstreetmap', 'haversine'].includes(storedService)) {
        distanceService.value = storedService
        console.log('Loaded distance service from localStorage:', storedService)
        return
      }
    }
  } catch (error) {
    console.warn('Error reading from localStorage:', error)
  }
  
  // Use default if nothing found
  distanceService.value = 'google_maps'
}

// Load settings on component mount
onMounted(() => {
  loadPricingSettings()
  loadDistanceServiceSettings()
})

const savePricingSettings = async () => {
  isLoading.value = true
  try {
    // Save to localStorage immediately (primary storage for now)
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const pricingData = {
          mode: billingMode.value,
          pricing: billingMode.value === 'express' ? expressPricing.value : standardPricing.value,
        }
        localStorage.setItem('pricing_settings', JSON.stringify(pricingData))
        console.log('Pricing settings saved to localStorage')
      }
    } catch (storageError) {
      console.warn('Error saving to localStorage:', storageError)
    }
    
    // Try to save to API if endpoint exists (optional)
    try {
      const payload = {
        mode: billingMode.value,
        pricing: billingMode.value === 'express' ? expressPricing.value : standardPricing.value,
      }

      await $api('/settings/pricing', {
        method: 'POST',
        body: payload,
      })

      console.log('Pricing settings saved to API successfully')
    } catch (apiError) {
      // Silently ignore 404 errors (endpoint may not exist yet)
      const status = apiError?.response?.status || apiError?.status
      const is404 = status === 404 || apiError?.message?.includes('404')
      
      if (!is404) {
        console.warn('Could not save pricing settings to API (using localStorage only):', apiError)
      } else {
        console.log('API endpoint not available, using localStorage only')
      }
    }

    // Show success message
    console.log('Pricing settings saved successfully (stored in localStorage)')
  } catch (error) {
    console.error('Error saving pricing settings:', error)
  } finally {
    isLoading.value = false
  }
}

const saveDistanceServiceSettings = async () => {
  isLoading.value = true
  try {
    // Save to localStorage immediately (primary storage for now)
    setDistanceService(distanceService.value)
    
    // Try to save to API if endpoint exists (optional)
    try {
      const payload = {
        distance_service: distanceService.value,
      }

      const response = await $api('/settings/distance-service', {
        method: 'POST',
        body: payload,
      })

      console.log('=== Distance Service Saved to API ===')
      console.log('Requested service:', distanceService.value)
      console.log('Response:', response)
      console.log('====================================')
    } catch (apiError) {
      // Silently ignore 404 errors (endpoint may not exist yet)
      const status = apiError?.response?.status || apiError?.status
      const is404 = status === 404 || apiError?.message?.includes('404')
      
      if (!is404) {
        console.warn('Could not save distance service to API (using localStorage only):', apiError)
      } else {
        console.log('API endpoint not available, using localStorage only')
      }
    }
    
    // Reload to verify it was saved correctly
    await loadDistanceServiceSettings()

    // Invalidate cache in googleMaps.js to force refresh
    invalidateDistanceServiceCache()

    // Show success message
    console.log('Distance service settings saved successfully (stored in localStorage)')
  } catch (error) {
    console.error('Error saving distance service settings:', error)
  } finally {
    isLoading.value = false
  }
}

// Computed property to get current pricing settings for examples
const currentPricing = computed(() => {
  return billingMode.value === 'express' ? expressPricing.value : standardPricing.value
})

// Calculate price examples based on mode
const calculateExamplePrice = (distance) => {
  if (billingMode.value === 'express') {
    const pricing = expressPricing.value
    if (distance <= 1) {
      return pricing.range_0_1km
    } else if (distance <= 5) {
      return pricing.range_1_5km
    } else if (distance <= 6) {
      return pricing.range_5_6km
    } else {
      const additionalKm = Math.ceil(distance - 6)
      return pricing.range_5_6km + (additionalKm * pricing.additional_per_km)
    }
  } else {
    // Standard mode
    const pricing = standardPricing.value
    if (distance <= 10) {
      return pricing.range_1_10km
    } else if (distance <= 15) {
      return pricing.range_10_1_15km
    } else {
      return pricing.range_over_15km
    }
  }
}
</script>

<template>
  <div>
    <VCard
      :title="$t('Distance-Based Pricing Configuration')"
      class="mb-6"
    >
      <VCardText>
        <!-- Tabs for Pricing and Distance Service -->
        <VTabs
          v-model="activeTab"
          class="mb-6"
        >
          <VTab>
            <VIcon icon="tabler-currency-dollar" class="me-2" />
            {{ $t('Pricing Configuration') }}
          </VTab>
          <VTab>
            <VIcon icon="tabler-route" class="me-2" />
            {{ $t('Distance Calculation Service') }}
          </VTab>
        </VTabs>

        <VWindow v-model="activeTab">
          <!-- Pricing Configuration Tab -->
          <VWindowItem>
        <VAlert
          type="info"
          variant="tonal"
          class="mb-6"
        >
          <VAlertTitle class="mb-2">
            {{ $t('Pricing Structure') }}
          </VAlertTitle>
          <p class="mb-0">
            {{ $t('Configure delivery prices based on distance ranges. Prices are automatically calculated based on the distance between pickup and delivery locations.') }}
          </p>
        </VAlert>

        <!-- Billing Mode Selector -->
        <VRow class="mb-6">
          <VCol cols="12">
            <AppSelect
              v-model="billingMode"
              :label="$t('Billing Mode')"
              :items="[
                { title: $t('Express Mode'), value: 'express' },
                { title: $t('Standard Mode'), value: 'standard' },
              ]"
            >
              <template #prepend-inner>
                <VIcon icon="tabler-settings" />
              </template>
            </AppSelect>
            <p class="text-sm text-medium-emphasis mt-1">
              {{ billingMode === 'express' 
                ? $t('Express mode: Detailed pricing with multiple distance ranges')
                : $t('Standard mode: Simplified pricing with three distance ranges') }}
            </p>
          </VCol>
        </VRow>

        <VDivider class="mb-6" />

        <!-- Express Mode Fields -->
        <VRow v-if="billingMode === 'express'">
          <!-- 0-1km Range -->
          <VCol
            cols="12"
            md="6"
          >
            <AppTextField
              v-model="expressPricing.range_0_1km"
              type="number"
              :label="$t('0 - 1 km')"
              placeholder="375"
              suffix="FCFA"
            >
              <template #prepend-inner>
                <VIcon icon="tabler-map-pin" />
              </template>
            </AppTextField>
            <p class="text-sm text-medium-emphasis mt-1">
              {{ $t('Price for deliveries from 0 to 1 kilometer') }}
            </p>
          </VCol>

          <!-- 1.1-5km Range -->
          <VCol
            cols="12"
            md="6"
          >
            <AppTextField
              v-model="expressPricing.range_1_5km"
              type="number"
              :label="$t('1.1 - 5 km')"
              placeholder="500"
              suffix="FCFA"
            >
              <template #prepend-inner>
                <VIcon icon="tabler-route" />
              </template>
            </AppTextField>
            <p class="text-sm text-medium-emphasis mt-1">
              {{ $t('Price for deliveries from 1.1 to 5 kilometers') }}
            </p>
          </VCol>

          <!-- 5.1-6km Range -->
          <VCol
            cols="12"
            md="6"
          >
            <AppTextField
              v-model="expressPricing.range_5_6km"
              type="number"
              :label="$t('5.1 - 6 km')"
              placeholder="600"
              suffix="FCFA"
            >
              <template #prepend-inner>
                <VIcon icon="tabler-map-2" />
              </template>
            </AppTextField>
            <p class="text-sm text-medium-emphasis mt-1">
              {{ $t('Price for deliveries from 5.1 to 6 kilometers') }}
            </p>
          </VCol>

          <!-- Additional per km -->
          <VCol
            cols="12"
            md="6"
          >
            <AppTextField
              v-model="expressPricing.additional_per_km"
              type="number"
              :label="$t('Additional per km (6.1+ km)')"
              placeholder="100"
              suffix="FCFA"
            >
              <template #prepend-inner>
                <VIcon icon="tabler-plus" />
              </template>
            </AppTextField>
            <p class="text-sm text-medium-emphasis mt-1">
              {{ $t('Additional price per kilometer beyond 6 km') }}
            </p>
          </VCol>
        </VRow>

        <!-- Standard Mode Fields -->
        <VRow v-else>
          <!-- 1-10km Range -->
          <VCol
            cols="12"
            md="4"
          >
            <AppTextField
              v-model="standardPricing.range_1_10km"
              type="number"
              :label="$t('1 - 10 km')"
              placeholder="500"
              suffix="FCFA"
            >
              <template #prepend-inner>
                <VIcon icon="tabler-map-pin" />
              </template>
            </AppTextField>
            <p class="text-sm text-medium-emphasis mt-1">
              {{ $t('Price for deliveries from 1 to 10 kilometers') }}
            </p>
          </VCol>

          <!-- 10.1-15km Range -->
          <VCol
            cols="12"
            md="4"
          >
            <AppTextField
              v-model="standardPricing.range_10_1_15km"
              type="number"
              :label="$t('10.1 - 15 km')"
              placeholder="700"
              suffix="FCFA"
            >
              <template #prepend-inner>
                <VIcon icon="tabler-route" />
              </template>
            </AppTextField>
            <p class="text-sm text-medium-emphasis mt-1">
              {{ $t('Price for deliveries from 10.1 to 15 kilometers') }}
            </p>
          </VCol>

          <!-- Over 15km Range -->
          <VCol
            cols="12"
            md="4"
          >
            <AppTextField
              v-model="standardPricing.range_over_15km"
              type="number"
              :label="$t('Over 15 km')"
              placeholder="1000"
              suffix="FCFA"
            >
              <template #prepend-inner>
                <VIcon icon="tabler-map-2" />
              </template>
            </AppTextField>
            <p class="text-sm text-medium-emphasis mt-1">
              {{ $t('Price for deliveries over 15 kilometers') }}
            </p>
          </VCol>
        </VRow>

        <VDivider class="my-6" />

        <!-- Pricing Example -->
        <VCard
          variant="tonal"
          color="primary"
          class="mb-6"
        >
          <VCardText>
            <h6 class="text-h6 mb-3">
              <VIcon icon="tabler-calculator" class="me-2" />
              {{ $t('Pricing Examples') }}
            </h6>
            <VRow>
              <template v-if="billingMode === 'express'">
                <VCol cols="12" sm="6" md="3">
                  <div class="text-center">
                    <p class="text-sm text-medium-emphasis mb-1">0.5 km</p>
                    <p class="text-h6 text-primary">{{ calculateExamplePrice(0.5) }} FCFA</p>
                  </div>
                </VCol>
                <VCol cols="12" sm="6" md="3">
                  <div class="text-center">
                    <p class="text-sm text-medium-emphasis mb-1">3 km</p>
                    <p class="text-h6 text-primary">{{ calculateExamplePrice(3) }} FCFA</p>
                  </div>
                </VCol>
                <VCol cols="12" sm="6" md="3">
                  <div class="text-center">
                    <p class="text-sm text-medium-emphasis mb-1">5.5 km</p>
                    <p class="text-h6 text-primary">{{ calculateExamplePrice(5.5) }} FCFA</p>
                  </div>
                </VCol>
                <VCol cols="12" sm="6" md="3">
                  <div class="text-center">
                    <p class="text-sm text-medium-emphasis mb-1">8 km</p>
                    <p class="text-h6 text-primary">{{ calculateExamplePrice(8) }} FCFA</p>
                  </div>
                </VCol>
              </template>
              <template v-else>
                <VCol cols="12" sm="6" md="4">
                  <div class="text-center">
                    <p class="text-sm text-medium-emphasis mb-1">5 km</p>
                    <p class="text-h6 text-primary">{{ calculateExamplePrice(5) }} FCFA</p>
                  </div>
                </VCol>
                <VCol cols="12" sm="6" md="4">
                  <div class="text-center">
                    <p class="text-sm text-medium-emphasis mb-1">12 km</p>
                    <p class="text-h6 text-primary">{{ calculateExamplePrice(12) }} FCFA</p>
                  </div>
                </VCol>
                <VCol cols="12" sm="6" md="4">
                  <div class="text-center">
                    <p class="text-sm text-medium-emphasis mb-1">20 km</p>
                    <p class="text-h6 text-primary">{{ calculateExamplePrice(20) }} FCFA</p>
                  </div>
                </VCol>
              </template>
            </VRow>
          </VCardText>
        </VCard>

            <!-- Save Button -->
            <div class="d-flex justify-end">
              <VBtn
                color="primary"
                :loading="isLoading"
                :disabled="isLoading"
                @click="savePricingSettings"
              >
                <VIcon icon="tabler-device-floppy" class="me-2" />
                {{ $t('Save Pricing Settings') }}
              </VBtn>
            </div>
          </VWindowItem>

          <!-- Distance Calculation Service Tab -->
          <VWindowItem>
            <VAlert
              type="info"
              variant="tonal"
              class="mb-6"
            >
              <VAlertTitle class="mb-2">
                {{ $t('Distance Calculation Service') }}
              </VAlertTitle>
              <p class="mb-0">
                {{ $t('Choose the service to use for calculating distances between pickup and dropoff locations.') }}
              </p>
            </VAlert>

            <VRow>
              <VCol cols="12">
                <AppSelect
                  v-model="distanceService"
                  :label="$t('Distance Calculation Service')"
                  :items="[
                    { title: $t('Google Maps'), value: 'google_maps', description: $t('Uses Google Maps Distance Matrix API for accurate road distances') },
                    { title: $t('OpenStreetMap'), value: 'openstreetmap', description: $t('Uses OpenStreetMap routing service (free alternative)') },
                    { title: $t('Haversine Formula'), value: 'haversine', description: $t('Calculates straight-line distance using Haversine formula (fastest, less accurate)') },
                  ]"
                >
                  <template #prepend-inner>
                    <VIcon icon="tabler-route" />
                  </template>
                </AppSelect>
              </VCol>
            </VRow>

            <VDivider class="my-6" />

            <!-- Service Information -->
            <VCard
              variant="tonal"
              :color="distanceService === 'google_maps' ? 'primary' : distanceService === 'openstreetmap' ? 'info' : 'secondary'"
              class="mb-6"
            >
              <VCardText>
                <h6 class="text-h6 mb-3">
                  <VIcon :icon="distanceService === 'google_maps' ? 'tabler-brand-google' : distanceService === 'openstreetmap' ? 'tabler-map' : 'tabler-calculator'" class="me-2" />
                  {{ distanceService === 'google_maps' ? $t('Google Maps') : distanceService === 'openstreetmap' ? $t('OpenStreetMap') : $t('Haversine Formula') }}
                </h6>
                <p v-if="distanceService === 'google_maps'" class="mb-0">
                  {{ $t('Google Maps provides the most accurate road distances and travel times. Requires API key and may have usage limits.') }}
                </p>
                <p v-else-if="distanceService === 'openstreetmap'" class="mb-0">
                  {{ $t('OpenStreetMap is a free alternative that provides good accuracy for road distances. No API key required.') }}
                </p>
                <p v-else class="mb-0">
                  {{ $t('Haversine formula calculates straight-line distance between two points. Fastest method but less accurate as it doesn\'t account for roads.') }}
                </p>
              </VCardText>
            </VCard>

            <!-- Save Button -->
            <div class="d-flex justify-end">
              <VBtn
                color="primary"
                :loading="isLoading"
                :disabled="isLoading"
                @click="saveDistanceServiceSettings"
              >
                <VIcon icon="tabler-device-floppy" class="me-2" />
                {{ $t('Save Distance Service Settings') }}
              </VBtn>
            </div>
          </VWindowItem>
        </VWindow>
      </VCardText>
    </VCard>
  </div>
</template>

