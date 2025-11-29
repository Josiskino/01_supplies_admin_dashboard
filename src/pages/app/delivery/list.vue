<script setup>
/* eslint-disable camelcase */
import { useDeliveryStatuses } from '@/composables/useStatusManagement'
import { useI18n } from 'vue-i18n'
import DeliveryAddDialog from './add.vue'
import PriceAdjustmentRequestDialog from './price-adjustment-request-dialog.vue'

const { t } = useI18n()
const { getStatusOptions, getStatusColor, getStatusLabel } = useDeliveryStatuses()

// Check if user is administrator
const isAdministrator = computed(() => {
  const userData = useCookie('userData').value
  if (!userData) {
    return false
  }

  // Check different possible role field names
  const role = userData.role?.name || userData.role || userData.roles?.[0]?.name || userData.roles?.[0]

  if (!role) {
    return false
  }

  // Normalize role for comparison (case-insensitive)
  const normalizedRole = role.toString().trim().toLowerCase()

  // Check for administrator variations
  return normalizedRole === 'administrator' ||
         normalizedRole === 'admin' ||
         normalizedRole === 'super admin' ||
         normalizedRole === 'superadmin' ||
         normalizedRole === 'super-admin'
})

const headers = computed(() => [
  { title: '#', key: 'index', sortable: false, width: '60px' },
  { title: t('Created At'), key: 'created_at' },
  { title: t('Customer'), key: 'customer' },
  { title: t('Partner'), key: 'partner' },
  { title: t('Driver'), key: 'driver' },
  { title: t('Distance'), key: 'distance_km' },
  { title: t('Price'), key: 'price' },
  { title: t('Status'), key: 'status' },
  { title: t('Start Time'), key: 'start_at' },
  { title: t('Delivered At'), key: 'delivered_at' },
  { title: t('Created By'), key: 'creator' },
  { title: t('Actions'), key: 'actions', sortable: false, width: '100px' },
])

const itemsPerPage = ref(15)
const page = ref(1)
const isLoading = ref(false)

// Global search filter
const searchQuery = ref('')

// Date filters
const dateFrom = ref(null)
const dateTo = ref(null)

const deliveries = ref([])
const total = ref(0)

// Add delivery dialog
const isAddDeliveryDialogOpen = ref(false)
const selectedDeliveryForEdit = ref(null)

// Price adjustment request dialog
const isPriceAdjustmentDialogOpen = ref(false)
const selectedDeliveryForPriceAdjustment = ref(null)

// Delete confirmation dialog
const isDeleteDialogOpen = ref(false)
const deliveryToDelete = ref(null)

// Delivery details dialog
const isDeliveryDetailsDialogOpen = ref(false)
const selectedDeliveryForView = ref(null)
const isLoadingDeliveryDetails = ref(false)
const deliveryDetails = ref(null)

// Success notifications
const isSuccessSnackVisible = ref(false)
const successSnackText = ref('')

const normalizeUrl = obj => {
  if (!obj) return null

  // Prefer explicit URL if provided
  if (obj.url) return obj.url

  // Build map link from lat/lng if available
  if (obj.lat && obj.lng)
    return `https://www.google.com/maps?q=${encodeURIComponent(obj.lat)},${encodeURIComponent(obj.lng)}`

  return null
}

const formatPrice = value => {
  if (value == null) return '—'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(Number(value))
  }
  catch {
    return String(value)
  }
}

const formatDate = value => {
  if (!value) return '—'
  try {
    const date = new Date(value)
    
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }
  catch {
    return '—'
  }
}

const formatDateTime = value => {
  if (!value) return '—'
  try {
    const date = new Date(value)
    
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  catch {
    return '—'
  }
}



const fetchDeliveries = async () => {
  isLoading.value = true
  try {
    // Build query parameters - global search + date filters
    const queryParams = {}

    if (searchQuery.value && searchQuery.value.trim()) {
      queryParams.search = searchQuery.value.trim()
    }

    if (dateFrom.value) {
      queryParams.date_from = dateFrom.value
    }

    if (dateTo.value) {
      queryParams.date_to = dateTo.value
    }

    // Add pagination
    queryParams.page = page.value
    queryParams.per_page = itemsPerPage.value

    const queryString = new URLSearchParams(queryParams).toString()
    const url = `/deliveries${queryString ? `?${queryString}` : ''}`

    const res = await $api(url, { method: 'GET' })

    console.log('=== Delivery list response ===')
    console.log('Response:', res)
    console.log('==============================')

    // Handle different response formats
    if (Array.isArray(res)) {
      // Response is directly an array
      deliveries.value = res
      total.value = res.length
    } else if (res && res.success && res.data) {
      // Response has { success: true, data: [...] } structure
      if (Array.isArray(res.data)) {
        deliveries.value = res.data

        // Handle pagination meta
        if (res.meta && res.meta.total) {
          const metaTotal = res.meta.total

          total.value = Array.isArray(metaTotal) && metaTotal.length > 0 ? metaTotal[0] : (typeof metaTotal === 'number' ? metaTotal : res.data.length)
        } else {
          total.value = res.data.length
        }
      } else if (res.data.data && Array.isArray(res.data.data)) {
        // Nested structure: { success: true, data: { data: [...], meta: {...} } }
        deliveries.value = res.data.data

        const metaTotal = res.data.meta?.total

        total.value = Array.isArray(metaTotal) && metaTotal.length > 0 ? metaTotal[0] : (typeof metaTotal === 'number' ? metaTotal : res.data.data.length)
      } else {
        deliveries.value = []
        total.value = 0
      }
    } else if (res && Array.isArray(res.data)) {
      // Response has { data: [...], meta: {...} } structure (without success)
      deliveries.value = res.data

      const metaTotal = res.meta?.total

      total.value = Array.isArray(metaTotal) && metaTotal.length > 0 ? metaTotal[0] : (typeof metaTotal === 'number' ? metaTotal : res.data.length)
    } else {
      deliveries.value = []
      total.value = 0
    }
    
    console.log('=== Processed deliveries ===')
    console.log('Deliveries count:', deliveries.value.length)
    console.log('Total:', total.value)
    if (deliveries.value.length > 0) {
      console.log('First delivery:', deliveries.value[0])
    }
    console.log('=============================')
  } catch (err) {
    console.error('Failed to fetch deliveries:', err)
    deliveries.value = []
    total.value = 0
  } finally {
    isLoading.value = false
  }
}

// Reset filters
const resetFilters = () => {
  searchQuery.value = ''
  dateFrom.value = null
  dateTo.value = null
  page.value = 1
  fetchDeliveries()
}

onMounted(() => {
  fetchDeliveries()
})

watch([searchQuery, dateFrom, dateTo, itemsPerPage], () => {
  page.value = 1
  fetchDeliveries()
})

watch(page, fetchDeliveries)

// Handle delivery added
const onDeliveryAdded = () => {
  successSnackText.value = t('Delivery created successfully') || 'Livraison créée avec succès'
  isSuccessSnackVisible.value = true
  fetchDeliveries()
  selectedDeliveryForEdit.value = null
}

// View delivery details
const viewDelivery = async delivery => {
  selectedDeliveryForView.value = delivery
  isDeliveryDetailsDialogOpen.value = true
  isLoadingDeliveryDetails.value = true
  deliveryDetails.value = null

  try {
    // Fetch full delivery details from API
    const response = await $api(`/deliveries/${delivery.id}`, {
      method: 'GET',
    })

    if (response?.success && response?.data) {
      deliveryDetails.value = response.data
    } else if (response?.data) {
      deliveryDetails.value = response.data
    } else if (response) {
      deliveryDetails.value = response
    } else {
      // Fallback to the delivery from the list
      deliveryDetails.value = delivery
    }
  } catch (error) {
    console.error('Error fetching delivery details:', error)

    // Fallback to the delivery from the list
    deliveryDetails.value = delivery
  } finally {
    isLoadingDeliveryDetails.value = false
  }
}

// Edit delivery
const editDelivery = delivery => {
  selectedDeliveryForEdit.value = delivery
  isAddDeliveryDialogOpen.value = true
}

// Handle delivery updated
const onDeliveryUpdated = () => {
  successSnackText.value = t('Delivery updated successfully') || 'Livraison mise à jour avec succès'
  isSuccessSnackVisible.value = true
  fetchDeliveries()
  selectedDeliveryForEdit.value = null
}


// Request price adjustment
const requestPriceAdjustment = delivery => {
  selectedDeliveryForPriceAdjustment.value = delivery
  isPriceAdjustmentDialogOpen.value = true
}

// Open WhatsApp for delivery

// Helper function to format location as Google Maps link
const formatLocationLink = location => {
  if (!location) {
    return null
  }

  // If it's already a URL, return it
  if (typeof location === 'string' && (location.startsWith('http://') || location.startsWith('https://'))) {
    return location
  }

  // If it's an object with url property
  if (typeof location === 'object' && location?.url) {
    return location.url
  }

  // If it's an object with lat/lng, create Google Maps link
  if (typeof location === 'object' && location?.lat && location?.lng) {
    return `https://www.google.com/maps?q=${encodeURIComponent(location.lat)},${encodeURIComponent(location.lng)}`
  }

  // If it's a string with coordinates, try to create a link
  if (typeof location === 'string') {
    // Try to extract coordinates from string (format: "lat, lng" or similar)
    const coordMatch = location.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/)
    if (coordMatch) {
      return `https://www.google.com/maps?q=${encodeURIComponent(coordMatch[1])},${encodeURIComponent(coordMatch[2])}`
    }

    // If no coordinates found, return as is (might be an address)
    return `https://www.google.com/maps/search/${encodeURIComponent(location)}`
  }

  return null
}

const openWhatsApp = delivery => {
  try {
    // Check if driver has a phone number
    if (!delivery?.driver?.phone) {
      alert(t('Driver phone number is not available') || 'Le numéro de téléphone du livreur n\'est pas disponible')

      return
    }

    // Get partner name
    const partnerName = delivery?.partner?.name || delivery?.partner?.merchant_name || t('Unknown Partner') || 'Partenaire inconnu'

    // Get customer name
    let customerName = '—'
    if (delivery?.customer) {
      if (delivery.customer.name) {
        customerName = delivery.customer.name
      } else if (delivery.customer.first_name || delivery.customer.last_name) {
        customerName = `${delivery.customer.first_name || ''} ${delivery.customer.last_name || ''}`.trim()
      } else {
        customerName = t('Unknown Customer') || 'Client inconnu'
      }
    }

    // Get locations and format as links
    const pickupLocation = formatLocationLink(delivery?.pickup_location)
    const dropoffLocation = formatLocationLink(delivery?.dropoff_location)

    // Get price
    const price = delivery?.price ? formatPrice(delivery.price) : t('Not specified') || 'Non spécifié'

    // Build WhatsApp message with emojis
    let message = `🚚 *Nouvelle livraison*\n\n`
    message += `📍 *Partenaire:* ${partnerName}\n`
    message += `👤 *Client:* ${customerName}\n\n`

    if (pickupLocation) {
      message += `📦 *Point de collecte:*\n${pickupLocation}\n\n`
    } else {
      message += `📦 *Point de collecte:* ${delivery?.pickup_location || t('Not specified') || 'Non spécifié'}\n\n`
    }

    if (dropoffLocation) {
      message += `🏠 *Point de livraison:*\n${dropoffLocation}\n\n`
    } else {
      message += `🏠 *Point de livraison:* ${delivery?.dropoff_location || t('Not specified') || 'Non spécifié'}\n\n`
    }

    message += `💰 *Prix:* ${price}\n`

    // Clean phone number (remove spaces, dashes, etc.)
    const phoneNumber = delivery.driver.phone.replace(/[\s\-()]/g, '')

    // Remove leading + if present, WhatsApp API needs number without +
    const cleanPhone = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message)

    // Build WhatsApp URL
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`

    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank')
  } catch (error) {
    console.error('Error opening WhatsApp:', error)
    alert(t('Error opening WhatsApp. Please try again.') || 'Erreur lors de l\'ouverture de WhatsApp. Veuillez réessayer.')
  }
}

// Handle price adjustment request created
const onPriceAdjustmentRequestCreated = () => {
  successSnackText.value = t('Price adjustment request created successfully') || 'Demande de rabais créée avec succès'
  isSuccessSnackVisible.value = true
  fetchDeliveries()
}

// Open delete confirmation dialog
const deleteDelivery = delivery => {
  deliveryToDelete.value = delivery
  isDeleteDialogOpen.value = true
}

// Confirm delete delivery
const confirmDelete = async () => {
  if (!deliveryToDelete.value) {
    return
  }

  try {
    await $api(`/deliveries/${deliveryToDelete.value.id}`, {
      method: 'DELETE',
    })

    successSnackText.value = t('Delivery deleted successfully') || 'Livraison supprimée avec succès'
    isSuccessSnackVisible.value = true

    // Refetch deliveries
    fetchDeliveries()
    isDeleteDialogOpen.value = false
    deliveryToDelete.value = null
  } catch (error) {
    console.error('Error deleting delivery:', error)
    successSnackText.value = t('Error deleting delivery. Please try again.') || 'Erreur lors de la suppression de la livraison. Veuillez réessayer.'
    isSuccessSnackVisible.value = true
    isDeleteDialogOpen.value = false
    deliveryToDelete.value = null
  }
}

// Cancel delete
const cancelDelete = () => {
  isDeleteDialogOpen.value = false
  deliveryToDelete.value = null
}
</script>

<template>
  <section>
    <VCard class="mb-6">
      <VCardItem class="pb-4">
        <VCardTitle>{{ $t('Ongoing Deliveries') }}</VCardTitle>
      </VCardItem>

      <VCardText>
        <!-- Add Delivery Button -->
        <div class="d-flex justify-end mb-4">
          <VBtn
            prepend-icon="tabler-plus"
            color="primary"
            @click="() => { selectedDeliveryForEdit = null; isAddDeliveryDialogOpen = true; }"
          >
            {{ $t('Add Delivery') }}
          </VBtn>
        </div>

        <!-- Items Per Page Selector (Top Left) -->
        <VRow class="mb-2">
          <VCol
            cols="12"
            md="auto"
          >
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
            </div>
          </VCol>
        </VRow>

        <!-- Filters Section -->
        <VRow class="mb-4">
          <!-- Date From -->
          <VCol
            cols="12"
            md="2"
          >
            <AppDateTimePicker
              v-model="dateFrom"
              :label="$t('Date From')"
              :placeholder="$t('Date from')"
              :config="{ dateFormat: 'Y-m-d' }"
              clearable
            />
          </VCol>

          <!-- Date To -->
          <VCol
            cols="12"
            md="2"
          >
            <AppDateTimePicker
              v-model="dateTo"
              :label="$t('Date To')"
              :placeholder="$t('Date to')"
              :config="{ dateFormat: 'Y-m-d' }"
              clearable
            />
          </VCol>

          <!-- Global Search -->
          <VCol
            cols="12"
            md="6"
          >
            <AppTextField
              v-model="searchQuery"
              :label="$t('Search')"
              :placeholder="$t('Search by customer, partner, driver, status, phone number, or any delivery information...')"
              clearable
              prepend-inner-icon="tabler-search"
            />
          </VCol>

          <!-- Reset Button -->
          <VCol
            cols="12"
            md="2"
            class="d-flex align-end"
          >
            <VBtn
              variant="outlined"
              color="secondary"
              prepend-icon="tabler-refresh"
              block
              @click="resetFilters"
            >
              {{ $t('Reset') }}
            </VBtn>
          </VCol>
        </VRow>

        <VDataTableServer
          v-model:items-per-page="itemsPerPage"
          v-model:page="page"
          :headers="headers"
          :items="deliveries"
          :items-length="total"
          :loading="isLoading"
          :items-per-page-options="[
            { value: 50, title: '50' },
            { value: 100, title: '100' },
            { value: 150, title: '150' },
            { value: 200, title: '200' },
            { value: 300, title: '300' },
          ]"
          item-value="id"
          class="text-no-wrap"
        >
          <!-- Index/Counter -->
          <template #item.index="{ index }">
            <span class="text-high-emphasis font-weight-medium">
              {{ (page - 1) * itemsPerPage + index + 1 }}
            </span>
          </template>

          <!-- Customer -->
          <template #item.customer="{ item }">
            <div
              v-if="item?.customer"
              class="d-flex flex-column"
            >
              <span class="text-high-emphasis font-weight-medium">
                {{ (item.customer.full_name || `${item.customer.first_name || ''} ${item.customer.last_name || ''}`.trim() || '—').toUpperCase() }}
              </span>
              <a
                v-if="item.customer.phone"
                :href="`tel:${item.customer.phone}`"
                class="text-xs text-primary text-decoration-none"
              >
                {{ item.customer.phone }}
              </a>
            </div>
            <span v-else>—</span>
          </template>

          <!-- Partner -->
          <template #item.partner="{ item }">
            <div
              v-if="item?.partner"
              class="d-flex flex-column"
            >
              <span class="text-high-emphasis font-weight-medium">
                {{ (item.partner.name || '—').toUpperCase() }}
              </span>
              <span
                v-if="item.partner.contact_name"
                class="text-xs text-disabled"
              >
                {{ item.partner.contact_name }}
              </span>
              <a
                v-if="item.partner.phone"
                :href="`tel:${item.partner.phone}`"
                class="text-xs text-primary text-decoration-none"
              >
                {{ item.partner.phone }}
              </a>
            </div>
            <span v-else>—</span>
          </template>

          <!-- Driver -->
          <template #item.driver="{ item }">
            <div
              v-if="item?.driver"
              class="d-flex flex-column"
            >
              <span class="text-high-emphasis font-weight-medium">
                {{ `${item.driver.first_name || ''} ${item.driver.last_name || ''}`.trim() || '—' }}
              </span>
              <span
                v-if="item.driver.plate_number"
                class="text-xs text-disabled"
              >
                {{ item.driver.plate_number }}
              </span>
              <a
                v-if="item.driver.phone"
                :href="`tel:${item.driver.phone}`"
                class="text-xs text-primary text-decoration-none"
              >
                {{ item.driver.phone }}
              </a>
            </div>
            <span v-else>—</span>
          </template>

          <!-- Distance -->
          <template #item.distance_km="{ item }">
            <span class="text-high-emphasis">
              {{ item?.distance_km ? `${item.distance_km} ${$t('km')}` : '—' }}
            </span>
          </template>

          <!-- Price -->
          <template #item.price="{ item }">
            {{ formatPrice(item?.price) }}
          </template>

          <!-- Status -->
          <template #item.status="{ item }">
            <VChip
              size="small"
              :color="getStatusColor(item?.status?.name || item?.status || '')"
              label
              class="text-capitalize"
            >
              {{ item?.status?.name || getStatusLabel(item?.status?.name || item?.status || '') || item?.status || $t('Unknown') }}
            </VChip>
          </template>

          <!-- Start Time -->
          <template #item.start_at="{ item }">
            <div class="d-flex flex-column">
              <span class="text-high-emphasis">
                {{ formatDateTime(item?.timestamps?.start_at || item?.start_at) }}
              </span>
            </div>
          </template>

          <!-- Delivered At -->
          <template #item.delivered_at="{ item }">
            <div class="d-flex flex-column">
              <span
                v-if="item?.timestamps?.delivered_at || item?.delivered_at"
                class="text-high-emphasis"
              >
                {{ formatDateTime(item?.timestamps?.delivered_at || item?.delivered_at) }}
              </span>
              <span
                v-else
                class="text-disabled"
              >
                —
              </span>
            </div>
          </template>

          <!-- Creator -->
          <template #item.creator="{ item }">
            <div
              v-if="item?.created_by"
              class="d-flex flex-column"
            >
              <span class="text-high-emphasis">
                {{ item.created_by.name || '—' }}
              </span>
            </div>
            <span v-else>—</span>
          </template>

          <!-- Created At -->
          <template #item.created_at="{ item }">
            <span class="text-high-emphasis">
              {{ formatDate(item?.timestamps?.created_at || item?.created_at) }}
            </span>
          </template>

          <!-- Actions -->
          <template #item.actions="{ item }">
            <div class="d-flex gap-2">
              <IconBtn @click.stop="viewDelivery(item)">
                <VIcon icon="tabler-eye" />
                <VTooltip activator="parent">
                  {{ $t('View Delivery') }}
                </VTooltip>
              </IconBtn>

              <IconBtn @click.stop="editDelivery(item)">
                <VIcon icon="tabler-pencil" />
                <VTooltip activator="parent">
                  {{ $t('Edit Delivery') }}
                </VTooltip>
              </IconBtn>

              <IconBtn
                color="warning"
                @click.stop="requestPriceAdjustment(item)"
              >
                <VIcon icon="tabler-discount" />
                <VTooltip activator="parent">
                  {{ $t('Request Price Adjustment') || 'Demander un rabais' }}
                </VTooltip>
              </IconBtn>

              <IconBtn
                color="success"
                @click.stop="openWhatsApp(item)"
              >
                <VIcon icon="tabler-brand-whatsapp" />
                <VTooltip activator="parent">
                  {{ $t('WhatsApp') || 'WhatsApp' }}
                </VTooltip>
              </IconBtn>

              <IconBtn
                v-if="isAdministrator"
                color="error"
                @click.stop="deleteDelivery(item)"
              >
                <VIcon icon="tabler-trash" />
                <VTooltip activator="parent">
                  {{ $t('Delete Delivery') || 'Supprimer la livraison' }}
                </VTooltip>
              </IconBtn>
            </div>
          </template>
        </VDataTableServer>
      </VCardText>
    </VCard>

    <!-- Add/Edit Delivery Dialog -->
    <DeliveryAddDialog
      v-model:is-dialog-visible="isAddDeliveryDialogOpen"
      :delivery="selectedDeliveryForEdit"
      @delivery-added="onDeliveryAdded"
      @delivery-updated="onDeliveryUpdated"
    />

    <!-- Price Adjustment Request Dialog -->
    <PriceAdjustmentRequestDialog
      v-model:is-dialog-visible="isPriceAdjustmentDialogOpen"
      :delivery="selectedDeliveryForPriceAdjustment"
      @request-created="onPriceAdjustmentRequestCreated"
    />

    <!-- Delete Confirmation Dialog -->
    <VDialog
      v-model="isDeleteDialogOpen"
      max-width="500"
    >
      <VCard>
        <VCardTitle class="d-flex align-center">
          <VIcon
            icon="tabler-alert-triangle"
            color="error"
            class="me-2"
          />
          {{ $t('Delete Delivery') || 'Supprimer la livraison' }}
        </VCardTitle>
        <VCardText>
          <p>{{ $t('Are you sure you want to delete this delivery?') || 'Êtes-vous sûr de vouloir supprimer cette livraison ?' }}</p>
          <p
            v-if="deliveryToDelete"
            class="text-sm text-medium-emphasis mt-2"
          >
            {{ $t('Delivery') || 'Livraison' }} #{{ deliveryToDelete.id }}
          </p>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="outlined"
            color="secondary"
            @click="cancelDelete"
          >
            {{ $t('Cancel') || 'Annuler' }}
          </VBtn>
          <VBtn
            color="error"
            @click="confirmDelete"
          >
            {{ $t('Delete') || 'Supprimer' }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Delivery Details Dialog -->
    <VDialog
      v-model="isDeliveryDetailsDialogOpen"
      max-width="900"
      scrollable
    >
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <VIcon
              icon="tabler-package"
              class="me-2"
            />
            {{ $t('Delivery Details') || 'Détails de la livraison' }} #{{ deliveryDetails?.id || selectedDeliveryForView?.id || 'N/A' }}
          </div>
          <IconBtn @click="isDeliveryDetailsDialogOpen = false">
            <VIcon icon="tabler-x" />
          </IconBtn>
        </VCardTitle>

        <VDivider />

        <VCardText>
          <div
            v-if="isLoadingDeliveryDetails"
            class="text-center py-8"
          >
            <VProgressCircular
              indeterminate
              color="primary"
            />
            <p class="mt-4">
              {{ $t('Loading delivery details...') || 'Chargement des détails de la livraison...' }}
            </p>
          </div>

          <div
            v-else-if="deliveryDetails || selectedDeliveryForView"
            class="delivery-details"
          >
            <VRow>
              <!-- Basic Information -->
              <VCol cols="12">
                <h3 class="mb-4">
                  {{ $t('Basic Information') || 'Informations de base' }}
                </h3>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Status') || 'Statut' }}:</span>
                  <VChip
                    :color="getStatusColor((deliveryDetails || selectedDeliveryForView)?.status?.name || (deliveryDetails || selectedDeliveryForView)?.status || '')"
                    size="small"
                    label
                    class="ms-2"
                  >
                    {{ (deliveryDetails || selectedDeliveryForView)?.status?.name || getStatusLabel((deliveryDetails || selectedDeliveryForView)?.status?.name || (deliveryDetails || selectedDeliveryForView)?.status || '') || (deliveryDetails || selectedDeliveryForView)?.status || $t('Unknown') || 'Inconnu' }}
                  </VChip>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Price') || 'Prix' }}:</span>
                  <span class="ms-2 font-weight-medium">
                    {{ formatPrice((deliveryDetails || selectedDeliveryForView)?.price) }}
                  </span>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Distance') || 'Distance' }}:</span>
                  <span class="ms-2">
                    {{ (deliveryDetails || selectedDeliveryForView)?.distance_km ? `${(deliveryDetails || selectedDeliveryForView).distance_km} km` : '—' }}
                  </span>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Created At') || 'Créé le' }}:</span>
                  <span class="ms-2">
                    {{ formatDateTime((deliveryDetails || selectedDeliveryForView)?.created_at) }}
                  </span>
                </div>
              </VCol>

              <!-- Partner Information -->
              <VCol cols="12">
                <VDivider class="my-4" />
                <h3 class="mb-4">
                  {{ $t('Partner (Pickup Location)') || 'Partenaire (Lieu de collecte)' }}
                </h3>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Partner Name') || 'Nom du partenaire' }}:</span>
                  <span class="ms-2 font-weight-medium">
                    {{ (deliveryDetails || selectedDeliveryForView)?.partner?.name || (deliveryDetails || selectedDeliveryForView)?.partner?.merchant_name || '—' }}
                  </span>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Contact Name') || 'Nom du contact' }}:</span>
                  <span class="ms-2">
                    {{ (deliveryDetails || selectedDeliveryForView)?.partner?.contact_name || '—' }}
                  </span>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Phone') || 'Téléphone' }}:</span>
                  <a
                    v-if="(deliveryDetails || selectedDeliveryForView)?.partner?.phone"
                    :href="`tel:${(deliveryDetails || selectedDeliveryForView).partner.phone}`"
                    class="ms-2 text-primary text-decoration-none"
                  >
                    {{ (deliveryDetails || selectedDeliveryForView).partner.phone }}
                  </a>
                  <span
                    v-else
                    class="ms-2"
                  >—</span>
                </div>
              </VCol>

              <VCol cols="12">
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Pickup Location') || 'Lieu de collecte' }}:</span>
                  <div class="mt-2">
                    <a
                      v-if="formatLocationLink((deliveryDetails || selectedDeliveryForView)?.pickup_location)"
                      :href="formatLocationLink((deliveryDetails || selectedDeliveryForView).pickup_location)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary text-decoration-none d-inline-flex align-center"
                    >
                      <VIcon
                        icon="tabler-map-pin"
                        size="16"
                        class="me-1"
                      />
                      {{ (deliveryDetails || selectedDeliveryForView)?.pickup_location || '—' }}
                      <VIcon
                        icon="tabler-external-link"
                        size="14"
                        class="ms-1"
                      />
                    </a>
                    <span
                      v-else
                      class="text-body-2"
                    >{{ (deliveryDetails || selectedDeliveryForView)?.pickup_location || '—' }}</span>
                  </div>
                </div>
              </VCol>

              <!-- Customer Information -->
              <VCol cols="12">
                <VDivider class="my-4" />
                <h3 class="mb-4">
                  {{ $t('Customer (Dropoff Location)') || 'Client (Lieu de livraison)' }}
                </h3>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Customer Name') || 'Nom du client' }}:</span>
                  <span class="ms-2 font-weight-medium">
                    {{ (deliveryDetails || selectedDeliveryForView)?.customer?.name || `${(deliveryDetails || selectedDeliveryForView)?.customer?.first_name || ''} ${(deliveryDetails || selectedDeliveryForView)?.customer?.last_name || ''}`.trim() || '—' }}
                  </span>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Phone') || 'Téléphone' }}:</span>
                  <a
                    v-if="(deliveryDetails || selectedDeliveryForView)?.customer?.phone"
                    :href="`tel:${(deliveryDetails || selectedDeliveryForView).customer.phone}`"
                    class="ms-2 text-primary text-decoration-none"
                  >
                    {{ (deliveryDetails || selectedDeliveryForView).customer.phone }}
                  </a>
                  <span
                    v-else
                    class="ms-2"
                  >—</span>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Email') || 'Email' }}:</span>
                  <a
                    v-if="(deliveryDetails || selectedDeliveryForView)?.customer?.email"
                    :href="`mailto:${(deliveryDetails || selectedDeliveryForView).customer.email}`"
                    class="ms-2 text-primary text-decoration-none"
                  >
                    {{ (deliveryDetails || selectedDeliveryForView).customer.email }}
                  </a>
                  <span
                    v-else
                    class="ms-2"
                  >—</span>
                </div>
              </VCol>

              <VCol cols="12">
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Dropoff Location') || 'Lieu de livraison' }}:</span>
                  <div class="mt-2">
                    <a
                      v-if="formatLocationLink((deliveryDetails || selectedDeliveryForView)?.dropoff_location)"
                      :href="formatLocationLink((deliveryDetails || selectedDeliveryForView).dropoff_location)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary text-decoration-none d-inline-flex align-center"
                    >
                      <VIcon
                        icon="tabler-map-pin"
                        size="16"
                        class="me-1"
                      />
                      {{ (deliveryDetails || selectedDeliveryForView)?.dropoff_location || '—' }}
                      <VIcon
                        icon="tabler-external-link"
                        size="14"
                        class="ms-1"
                      />
                    </a>
                    <span
                      v-else
                      class="text-body-2"
                    >{{ (deliveryDetails || selectedDeliveryForView)?.dropoff_location || '—' }}</span>
                  </div>
                </div>
              </VCol>

              <!-- Driver Information -->
              <VCol cols="12">
                <VDivider class="my-4" />
                <h3 class="mb-4">
                  {{ $t('Driver Information') || 'Informations du livreur' }}
                </h3>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Driver Name') || 'Nom du livreur' }}:</span>
                  <span class="ms-2 font-weight-medium">
                    {{ `${(deliveryDetails || selectedDeliveryForView)?.driver?.first_name || ''} ${(deliveryDetails || selectedDeliveryForView)?.driver?.last_name || ''}`.trim() || '—' }}
                  </span>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Phone') || 'Téléphone' }}:</span>
                  <a
                    v-if="(deliveryDetails || selectedDeliveryForView)?.driver?.phone"
                    :href="`tel:${(deliveryDetails || selectedDeliveryForView).driver.phone}`"
                    class="ms-2 text-primary text-decoration-none"
                  >
                    {{ (deliveryDetails || selectedDeliveryForView).driver.phone }}
                  </a>
                  <span
                    v-else
                    class="ms-2"
                  >—</span>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Plate Number') || 'Numéro de plaque' }}:</span>
                  <span class="ms-2">
                    {{ (deliveryDetails || selectedDeliveryForView)?.driver?.plate_number || '—' }}
                  </span>
                </div>
              </VCol>

              <!-- Timestamps -->
              <VCol cols="12">
                <VDivider class="my-4" />
                <h3 class="mb-4">
                  {{ $t('Timestamps') || 'Horodatage' }}
                </h3>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Start Time') || 'Heure de début' }}:</span>
                  <span class="ms-2">
                    {{ formatDateTime((deliveryDetails || selectedDeliveryForView)?.timestamps?.start_at || (deliveryDetails || selectedDeliveryForView)?.start_at) }}
                  </span>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Delivered At') || 'Livré le' }}:</span>
                  <span class="ms-2">
                    {{ formatDateTime((deliveryDetails || selectedDeliveryForView)?.timestamps?.delivered_at || (deliveryDetails || selectedDeliveryForView)?.delivered_at) }}
                  </span>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Created By') || 'Créé par' }}:</span>
                  <span class="ms-2">
                    {{ (deliveryDetails || selectedDeliveryForView)?.created_by?.name || '—' }}
                  </span>
                </div>
              </VCol>
            </VRow>
          </div>
        </VCardText>

        <VDivider />

        <VCardActions>
          <VSpacer />
          <VBtn
            variant="outlined"
            @click="isDeliveryDetailsDialogOpen = false"
          >
            {{ $t('Close') || 'Fermer' }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Success Notification -->
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
