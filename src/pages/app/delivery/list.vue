<script setup>
/* eslint-disable camelcase */
import { useDeliveryStatuses } from '@/composables/useStatusManagement'
import { generateCombinedMapLink } from '@/utils/googleMaps'
import { notifyActorsOnAssignment } from '@/utils/whatsappNotification'
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

// Check if user is intern (stagiaire)
const isIntern = computed(() => {
  const userData = useCookie('userData').value
  if (!userData) {
    return false
  }

  const role = userData.role?.name || userData.role || userData.roles?.[0]?.name || userData.roles?.[0]
  if (!role) {
    return false
  }

  const normalizedRole = role.toString().trim().toLowerCase()
  return normalizedRole === 'stagiaire'
})

const isLogisticien = computed(() => {
  const userData = useCookie('userData').value
  if (!userData) {
    return false
  }

  const role = userData.role?.name || userData.role || userData.roles?.[0]?.name || userData.roles?.[0]
  if (!role) {
    return false
  }

  const normalizedRole = role.toString().trim().toLowerCase()
  return normalizedRole === 'logisticien'
})

const canEditDelivery = computed(() => !isIntern.value && !isLogisticien.value)

const headers = computed(() => [
  { title: '#', key: 'index', sortable: false, width: '60px' },
  { title: t('Num. Comm.'), key: 'order_number', sortable: false, width: '160px' },
  { title: t('Created At'), key: 'created_at' },
  { title: t('Requester'), key: 'requester' },
  { title: t('Recipient'), key: 'recipient' },
  { title: t('Driver'), key: 'driver' },
  { title: t('Distance'), key: 'distance_km' },
  { title: t('Price'), key: 'price' },
  { title: t('Route') || 'Itinéraire', key: 'route', sortable: false, width: '80px' },
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

// Summary statistics from backend
const summary = ref({
  today_total_deliveries: 0,
  today_total_amount: 0,
  today_delivery_rate: 0,
})

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

const formatTime = value => {
  if (!value) return '—'
  try {
    const date = new Date(value)
    
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
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
    console.log('Meta:', res?.meta)
    console.log('Summary:', res?.meta?.summary)
    console.log('==============================')

    // Helper function to extract summary from response
    const extractSummary = (meta) => {
      if (meta?.summary) {
        console.log('=== Extracting summary ===', JSON.stringify(meta.summary, null, 2))
        console.log('today_total_deliveries:', meta.summary.today_total_deliveries)
        console.log('today_total_amount:', meta.summary.today_total_amount)
        console.log('today_delivery_rate:', meta.summary.today_delivery_rate)
        
        summary.value = {
          today_total_deliveries: meta.summary.today_total_deliveries ?? meta.summary.total_deliveries ?? 0,
          today_total_amount: meta.summary.today_total_amount ?? meta.summary.total_amount ?? 0,
          today_delivery_rate: meta.summary.today_delivery_rate ?? meta.summary.delivery_rate ?? 0,
        }
        
        console.log('=== Summary value set ===', JSON.stringify(summary.value, null, 2))
      }
    }

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

        // Extract summary statistics
        extractSummary(res.meta)
      } else if (res.data.data && Array.isArray(res.data.data)) {
        // Nested structure: { success: true, data: { data: [...], meta: {...} } }
        deliveries.value = res.data.data

        const metaTotal = res.data.meta?.total

        total.value = Array.isArray(metaTotal) && metaTotal.length > 0 ? metaTotal[0] : (typeof metaTotal === 'number' ? metaTotal : res.data.data.length)
        
        // Extract summary from nested meta
        extractSummary(res.data.meta)
      } else {
        deliveries.value = []
        total.value = 0
      }
    } else if (res && Array.isArray(res.data)) {
      // Response has { data: [...], meta: {...} } structure (without success)
      deliveries.value = res.data

      const metaTotal = res.meta?.total

      total.value = Array.isArray(metaTotal) && metaTotal.length > 0 ? metaTotal[0] : (typeof metaTotal === 'number' ? metaTotal : res.data.length)
      
      // Extract summary statistics
      extractSummary(res.meta)
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


import { echo } from '@/plugins/echo'


const handleOrderUpdate = (updatedOrder, customMessage = null) => {
  if (!updatedOrder || !updatedOrder.id) return
  
  const index = deliveries.value.findIndex(o => o.id === updatedOrder.id)
  
  let statusKey = null
  
  if (updatedOrder.status) {
    if (typeof updatedOrder.status === 'object') {
      statusKey = updatedOrder.status.status_name || updatedOrder.status.name || updatedOrder.status.label
    } else {
      statusKey = updatedOrder.status
    }
  } else {
    statusKey = updatedOrder.delivery_status || updatedOrder.state
  }
  
  const resolvedLabel = statusKey ? getStatusLabel(statusKey) : null
  
  let finalMessage = customMessage

  if (index !== -1) {
    const currentOrder = deliveries.value[index]
    
    if (!finalMessage) {
       const oldAt = currentOrder.price_adjustment?.adjusted_at || currentOrder.price_adjusted_at
       const newAt = updatedOrder.price_adjustment?.adjusted_at || updatedOrder.price_adjusted_at
       
       if (newAt && newAt !== oldAt) {
          const formatCurrency = (value) => {
            if (!value) return '0 F CFA'
            return new Intl.NumberFormat('fr-FR', {
              style: 'decimal',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value) + ' F CFA'
          }

          const oldPrice = formatCurrency(currentOrder.price)
          const newPrice = formatCurrency(updatedOrder.price)
          
          finalMessage = `Prix de livraison ajusté : de ${oldPrice} à ${newPrice}`
       }
    }

    deliveries.value[index] = { ...deliveries.value[index], ...updatedOrder }
    
    const statusText = finalMessage || resolvedLabel || 'Mise à jour'
    successSnackText.value = `Livraison #${updatedOrder.numero || updatedOrder.id} : ${statusText}`
    isSuccessSnackVisible.value = true
  } else {
    deliveries.value.unshift(updatedOrder)
    total.value++
    
    summary.value.today_total_deliveries++
    
    const statusText = finalMessage || resolvedLabel || 'Reçue'
    successSnackText.value = `Nouvelle livraison #${updatedOrder.numero || updatedOrder.id} : ${statusText}`
    isSuccessSnackVisible.value = true
  }
}

onMounted(() => {
  fetchDeliveries()

  echo.channel('admin-orders')
    .listen('.new-order', (event) => {
      console.log('New order (List):', event)
      handleOrderUpdate(event.order, 'Nouvelle commande reçue')
    })

    .listen('.order-assigned', (event) => handleOrderUpdate(event.order, 'Livreur assigné'))
    .listen('.order-cancelled', (event) => handleOrderUpdate(event.order, 'Commande annulée'))
    .listen('.order-completed', (event) => handleOrderUpdate(event.order, 'Livraison terminée'))
    .listen('.order-registered', (event) => handleOrderUpdate(event.order, 'Commande enregistrée'))
    .listen('.order-started', (event) => handleOrderUpdate(event.order, 'Livraison démarrée'))
    .listen('.order-updated', (event) => handleOrderUpdate(event.order)) // Generic update

    .listen('.order-status-changed', (event) => {
      console.log('Order status update (List):', event)
      handleOrderUpdate(event.order)
    })
})


onUnmounted(() => {
  echo.leave('admin-orders')
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

// Action WhatsApp manuelle de secours (pour administrateurs)
const sendingWhatsAppId = ref(null)
const triggerManualWhatsApp = async (delivery) => {
  try {
    if (!delivery?.driver?.id) {
      alert(t('Driver is not assigned') || 'Aucun livreur n\'est assigné à cette livraison.')
      return
    }
    sendingWhatsAppId.value = delivery.id
    await notifyActorsOnAssignment(delivery, t)
    successSnackText.value = t('WhatsApp messages sent successfully') || 'Messages WhatsApp de secours envoyés !'
    isSuccessSnackVisible.value = true
  } catch (error) {
    console.error('Manual WhatsApp Error:', error)
    alert(t('Error sending WhatsApp messages.') || 'Erreur lors de l\'envoi manuel WhatsApp.')
  } finally {
    sendingWhatsAppId.value = null
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

// Copy to clipboard
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    successSnackText.value = t('Copied to clipboard') || 'Copié dans le presse-papier'
    isSuccessSnackVisible.value = true
  } catch (error) {
    console.error('Error copying to clipboard:', error)
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      successSnackText.value = t('Copied to clipboard') || 'Copié dans le presse-papier'
      isSuccessSnackVisible.value = true
    } catch (err) {
      console.error('Fallback copy failed:', err)
      alert(t('Failed to copy to clipboard') || 'Échec de la copie dans le presse-papier')
    }
    document.body.removeChild(textArea)
  }
}
const openRoute = (pickup, dropoff) => {
  const combinedLink = generateCombinedMapLink(pickup, dropoff)
  window.open(combinedLink, '_blank')
}
</script>

<template>
  <section>
    <!-- Mini Dashboard Statistics -->
    <VRow
      v-if="!isIntern"
      class="mb-6"
    >
      <!-- Total Deliveries Today -->
      <VCol
        cols="12"
        md="4"
      >
        <VCard>
          <VCardText class="d-flex align-center gap-4">
            <VAvatar
              color="primary"
              variant="tonal"
              size="52"
              rounded
            >
              <VIcon
                icon="tabler-truck-delivery"
                size="32"
              />
            </VAvatar>
            <div>
              <p class="text-body-1 mb-0 text-disabled">
                {{ $t('Total Deliveries Today') }}
              </p>
              <h4 class="text-h4">
                {{ summary.today_total_deliveries }}
              </h4>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Total Amount Today -->
      <VCol
        cols="12"
        md="4"
      >
        <VCard>
          <VCardText class="d-flex align-center gap-4">
            <VAvatar
              color="success"
              variant="tonal"
              size="52"
              rounded
            >
              <VIcon
                icon="tabler-currency-dollar"
                size="32"
              />
            </VAvatar>
            <div>
              <p class="text-body-1 mb-0 text-disabled">
                {{ $t('Total Amount Today') }}
              </p>
              <h4 class="text-h4">
                {{ formatPrice(summary.today_total_amount) }}
              </h4>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Delivery Rate Today -->
      <VCol
        cols="12"
        md="4"
      >
        <VCard>
          <VCardText class="d-flex align-center gap-4">
            <VAvatar
              color="warning"
              variant="tonal"
              size="52"
              rounded
            >
              <VIcon
                icon="tabler-percentage"
                size="32"
              />
            </VAvatar>
            <div>
              <p class="text-body-1 mb-0 text-disabled">
                {{ $t('Delivery Rate Today') }}
              </p>
              <h4 class="text-h4">
                {{ summary.today_delivery_rate }}%
              </h4>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
    <VCard class="mb-6">
      <VCardItem class="pb-2">
        <VCardTitle class="d-flex align-center justify-space-between">
          <span>{{ $t('Ongoing Deliveries') }}</span>
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
        </VCardTitle>
      </VCardItem>

      <VCardText class="pt-2">
        <!-- Filters Section with Add Delivery Button -->
        <VRow class="mb-2">
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
            md="4"
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

          <!-- Add Delivery Button -->
          <VCol
            cols="12"
            md="2"
            class="d-flex align-end"
          >
            <VBtn
              prepend-icon="tabler-plus"
              color="primary"
              block
              @click="() => { selectedDeliveryForEdit = null; isAddDeliveryDialogOpen = true; }"
            >
              {{ $t('Add Delivery') }}
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

          <!-- Order Number -->
          <template #item.order_number="{ item }">
            <span class="text-mono text-sm text-medium-emphasis">
              {{ item.order_number ?? '—' }}
            </span>
          </template>

          <!-- Requester -->
          <template #item.requester="{ item }">
            <div
              v-if="item?.requester"
              class="d-flex flex-column"
            >
              <span class="text-high-emphasis font-weight-medium">
                {{
                  (
                    item.requester_name ||
                    item.requester.full_name ||
                    item.requester.name ||
                    `${item.requester.first_name || ''} ${item.requester.last_name || ''}`.trim() ||
                    '—'
                  ).toUpperCase()
                }}
              </span>
              <a
                v-if="item.requester.phone"
                :href="`tel:${item.requester.phone}`"
                class="text-xs text-primary text-decoration-none"
              >
                {{ item.requester.phone }}
              </a>
            </div>

            <!-- Fallback ancienne structure : partner comme demandeur -->
            <div
              v-else-if="item?.partner"
              class="d-flex flex-column"
            >
              <span class="text-high-emphasis font-weight-medium">
                {{ (item.partner.name || item.partner.merchant_name || '—').toUpperCase() }}
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

          <!-- Recipient -->
          <template #item.recipient="{ item }">
            <div
              v-if="item?.recipient"
              class="d-flex flex-column"
            >
              <span class="text-high-emphasis font-weight-medium">
                {{
                  (
                    item.recipient_name ||
                    item.recipient.full_name ||
                    item.recipient.name ||
                    `${item.recipient.first_name || ''} ${item.recipient.last_name || ''}`.trim() ||
                    '—'
                  ).toUpperCase()
                }}
              </span>
              <a
                v-if="item.recipient.phone"
                :href="`tel:${item.recipient.phone}`"
                class="text-xs text-primary text-decoration-none"
              >
                {{ item.recipient.phone }}
              </a>
            </div>

            <!-- Fallback ancienne structure : customer comme destinataire -->
            <div
              v-else-if="item?.customer"
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

          <!-- Route Link -->
          <template #item.route="{ item }">
            <IconBtn
              color="info"
              variant="tonal"
              @click.stop="openRoute(item.pickup_location, item.dropoff_location)"
            >
              <VIcon icon="tabler-map-2" />
              <VTooltip activator="parent">
                {{ $t('View Route') || 'Voir l\'itinéraire complet' }}
              </VTooltip>
            </IconBtn>
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
            <div class="d-flex flex-column">
              <span class="text-high-emphasis">
                {{ formatDate(item?.timestamps?.created_at || item?.created_at) }}
              </span>
              <span class="text-xs text-disabled">
                {{ formatTime(item?.timestamps?.created_at || item?.created_at) }}
              </span>
            </div>
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

              <IconBtn
                v-if="canEditDelivery"
                @click.stop="editDelivery(item)"
              >
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
                  {{ $t('Request Price Adjustment') || 'Demander un ajustement de prix (rabais ou majoration)' }}
                </VTooltip>
              </IconBtn>

              <IconBtn
                v-if="isAdministrator"
                color="success"
                :loading="sendingWhatsAppId === item.id"
                @click.stop="triggerManualWhatsApp(item)"
              >
                <VIcon icon="tabler-brand-whatsapp" />
                <VTooltip activator="parent">
                  {{ $t('Send WhatsApp manually') || 'Notifications WhatsApp (Manuel)' }}
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
          <!-- En-tête avec les informations de base -->
          <VRow class="mb-6">
            <VCol
              cols="12"
              md="6"
            >
              <div class="d-flex align-center mb-2">
                <VIcon
                  icon="tabler-user"
                  size="20"
                  class="me-2 text-primary"
                />
                <div>
                  <div class="text-sm text-medium-emphasis">
                    {{ $t('Created By') || 'Créé par' }}
                  </div>
                  <div class="font-weight-medium">
                    {{ (deliveryDetails || selectedDeliveryForView)?.created_by?.name || '—' }}
                  </div>
                </div>
              </div>
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <div class="d-flex align-center mb-2">
                <VIcon
                  icon="tabler-clock"
                  size="20"
                  class="me-2 text-primary"
                />
                <div>
                  <div class="text-sm text-medium-emphasis">
                    {{ $t('Created At') || 'Créé le' }}
                  </div>
                  <div class="font-weight-medium">
                    {{ formatDateTime((deliveryDetails || selectedDeliveryForView)?.created_at) }}
                  </div>
                </div>
              </div>
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <div class="d-flex align-center mb-2">
                <VIcon
                  icon="tabler-clock-play"
                  size="20"
                  class="me-2 text-primary"
                />
                <div>
                  <div class="text-sm text-medium-emphasis">
                    {{ $t('Start Time') || 'Début de la livraison' }}
                  </div>
                  <div class="font-weight-medium">
                    {{ formatDateTime((deliveryDetails || selectedDeliveryForView)?.start_at) || '—' }}
                  </div>
                </div>
              </div>
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <div class="d-flex align-center mb-2">
                <VIcon
                  icon="tabler-clock-check"
                  size="20"
                  class="me-2 text-primary"
                />
                <div>
                  <div class="text-sm text-medium-emphasis">
                    {{ $t('Delivered At') || 'Livraison terminée' }}
                  </div>
                  <div class="font-weight-medium">
                    {{ formatDateTime((deliveryDetails || selectedDeliveryForView)?.delivered_at) || '—' }}
                  </div>
                </div>
              </div>
            </VCol>
          </VRow>

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

              <!-- Price Information Section -->
              <VCol cols="12">
                <VDivider class="my-4" />
                <h3 class="mb-4">
                  <VIcon
                    icon="tabler-currency-dollar"
                    class="me-2"
                  />
                  {{ $t('Price Information') || 'Informations de prix' }}
                </h3>
              </VCol>

              <!-- Current Price -->
              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Current Price') || 'Prix actuel' }}:</span>
                  <span class="ms-2 font-weight-bold text-h6">
                    {{ formatPrice((deliveryDetails || selectedDeliveryForView)?.price) }}
                  </span>
                  <VChip
                    v-if="(deliveryDetails || selectedDeliveryForView)?.price_adjusted"
                    size="x-small"
                    color="info"
                    variant="tonal"
                    class="ms-2"
                  >
                    {{ $t('Adjusted') || 'Ajusté' }}
                  </VChip>
                </div>
              </VCol>

              <!-- Initial Price (if adjusted) -->
              <VCol
                v-if="(deliveryDetails || selectedDeliveryForView)?.price_adjusted && (deliveryDetails || selectedDeliveryForView)?.initial_price"
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Initial Price') || 'Prix initial' }}:</span>
                  <span class="ms-2 text-decoration-line-through text-medium-emphasis">
                    {{ formatPrice((deliveryDetails || selectedDeliveryForView)?.initial_price) }}
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

              <!-- Price Adjustment Details -->
              <VCol
                v-if="(deliveryDetails || selectedDeliveryForView)?.price_adjusted && (deliveryDetails || selectedDeliveryForView)?.price_adjustment"
                cols="12"
              >
                <VAlert
                  color="info"
                  variant="tonal"
                  class="mt-2"
                >
                  <div class="d-flex flex-column gap-2">
                    <div class="d-flex align-center">
                      <VIcon
                        icon="tabler-discount"
                        size="20"
                        class="me-2"
                      />
                      <strong>{{ $t('Price Adjustment Details') || 'Détails de l\'ajustement' }}</strong>
                    </div>

                    <div v-if="(deliveryDetails || selectedDeliveryForView).price_adjustment.discount_amount">
                      <span class="text-sm text-medium-emphasis">{{ $t('Adjustment Amount') || 'Montant de l\'ajustement' }}:</span>
                      <span class="ms-2 font-weight-bold">
                        {{ formatPrice(Math.abs((deliveryDetails || selectedDeliveryForView).price_adjustment.discount_amount)) }}
                      </span>
                    </div>

                    <div v-if="(deliveryDetails || selectedDeliveryForView).price_adjustment.reason">
                      <span class="text-sm text-medium-emphasis">{{ $t('Reason') || 'Raison' }}:</span>
                      <span class="ms-2">
                        {{ (deliveryDetails || selectedDeliveryForView).price_adjustment.reason }}
                      </span>
                    </div>

                    <div v-if="(deliveryDetails || selectedDeliveryForView).price_adjustment.adjusted_by">
                      <span class="text-sm text-medium-emphasis">{{ $t('Adjusted By') || 'Ajusté par' }}:</span>
                      <span class="ms-2">
                        {{ (deliveryDetails || selectedDeliveryForView).price_adjustment.adjusted_by.name || '—' }}
                      </span>
                    </div>

                    <div v-if="(deliveryDetails || selectedDeliveryForView).price_adjustment.adjusted_at">
                      <span class="text-sm text-medium-emphasis">{{ $t('Adjusted At') || 'Ajusté le' }}:</span>
                      <span class="ms-2">
                        {{ formatDateTime((deliveryDetails || selectedDeliveryForView).price_adjustment.adjusted_at) }}
                      </span>
                    </div>
                  </div>
                </VAlert>
              </VCol>


              <!-- Route Information -->
              <VCol cols="12">
                <VDivider class="my-4" />
                <h3 class="mb-4">
                  <VIcon
                    icon="tabler-map-2"
                    class="me-2"
                  />
                  {{ $t('Route Information') || 'Informations d\'itinéraire' }}
                </h3>
              </VCol>

              <VCol
                cols="12"
              >
                <div class="mb-4">
                  <VBtn
                    color="info"
                    prepend-icon="tabler-map-2"
                    @click="openRoute(
                      (deliveryDetails || selectedDeliveryForView)?.pickup_location,
                      (deliveryDetails || selectedDeliveryForView)?.dropoff_location
                    )"
                  >
                    {{ $t('View Complete Route') || 'Voir l\'itinéraire complet' }}
                  </VBtn>
                  <p class="text-xs text-medium-emphasis mt-2">
                    {{ $t('Open Google Maps showing both pickup and dropoff points') || 'Ouvrir Google Maps montrant à la fois le point de collecte et le point de livraison' }}
                  </p>
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

              <!-- Start URL Section -->
              <VCol
                v-if="(deliveryDetails || selectedDeliveryForView)?.start_url"
                cols="12"
              >
                <VDivider class="my-4" />
                <h3 class="mb-4">
                  <VIcon
                    icon="tabler-link"
                    class="me-2"
                  />
                  {{ $t('Start URL') || 'Lien de démarrage' }}
                </h3>
                <div class="mb-4">
                  <span class="text-sm text-medium-emphasis">{{ $t('Start URL') || 'Lien de démarrage' }}:</span>
                  <div class="mt-2">
                    <VCard
                      variant="outlined"
                      class="pa-3"
                    >
                      <div class="d-flex align-center justify-space-between gap-2">
                        <div class="flex-grow-1 text-truncate">
                          <a
                            :href="(deliveryDetails || selectedDeliveryForView)?.start_url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-primary text-decoration-none d-inline-flex align-center"
                          >
                            <VIcon
                              icon="tabler-external-link"
                              size="16"
                              class="me-2"
                            />
                            <span class="text-truncate">
                              {{ (deliveryDetails || selectedDeliveryForView)?.start_url }}
                            </span>
                          </a>
                        </div>
                        <VBtn
                          icon
                          size="small"
                          variant="text"
                          color="primary"
                          @click="copyToClipboard((deliveryDetails || selectedDeliveryForView)?.start_url)"
                        >
                          <VIcon icon="tabler-copy" />
                          <VTooltip activator="parent">
                            {{ $t('Copy to clipboard') || 'Copier dans le presse-papier' }}
                          </VTooltip>
                        </VBtn>
                      </div>
                    </VCard>
                  </div>
                  <p class="text-xs text-medium-emphasis mt-2">
                    {{ $t('Use this link to start the delivery') || 'Utilisez ce lien pour démarrer la livraison' }}
                  </p>
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
      timeout="6000"
      color="success"
      variant="elevated"
    >
      {{ successSnackText }}
    </VSnackbar>
  </section>
</template>
