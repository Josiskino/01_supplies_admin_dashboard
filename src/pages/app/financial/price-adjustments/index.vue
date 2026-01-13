<script setup>
/* eslint-disable camelcase */
import { useI18n } from 'vue-i18n'
import ApproveDialog from './approve-dialog.vue'
import RejectDialog from './reject-dialog.vue'
import { echo } from '@/plugins/echo'

const { t } = useI18n()

// Filters
const selectedStatus = ref('pending')
const searchQuery = ref('')
const dateFrom = ref(null)
const dateTo = ref(null)

// Data table options
const itemsPerPage = ref(15)
const page = ref(1)
const isLoading = ref(false)

// Requests data
const requests = ref([])
const totalRequests = ref(0)

// Dialog states
const isApproveDialogOpen = ref(false)
const isRejectDialogOpen = ref(false)
const selectedRequest = ref(null)

// Success notifications
const isSuccessSnackVisible = ref(false)
const successSnackText = ref('')

// Status options
const statusOptions = computed(() => [
  { title: t('Pending') || 'En attente', value: 'pending', color: 'warning' },
  { title: t('Approved') || 'Approuvée', value: 'approved', color: 'success' },
  { title: t('Rejected') || 'Rejetée', value: 'rejected', color: 'error' },
])

// Headers for requests table
const headers = computed(() => [
  { title: '#', key: 'index', sortable: false, width: '60px' },
  { title: t('Delivery') || 'Livraison', key: 'delivery', sortable: false, width: '150px' },
  { title: t('Requester') || 'Demandeur', key: 'requester', sortable: false, width: '200px' },
  { title: t('Current Price') || 'Prix actuel', key: 'current_price', sortable: true, width: '130px' },
  { title: t('Requested Price') || 'Prix demandé', key: 'requested_price', sortable: true, width: '130px' },
  { title: t('Price Adjustment') || 'Ajustement de prix', key: 'adjustment', sortable: true, width: '150px' },
  { title: t('Reason') || 'Raison', key: 'reason', sortable: false, width: '200px' },
  { title: t('Requested By') || 'Demandé par', key: 'requested_by', sortable: false, width: '150px' },
  { title: t('Status') || 'Statut', key: 'status', sortable: true, width: '120px' },
  { title: t('Actions') || 'Actions', key: 'actions', sortable: false, width: '200px' },
])

// Statistics
const pendingCount = computed(() => {
  return requests.value.filter(r => r.status === 'pending').length
})

const approvedCount = computed(() => {
  return requests.value.filter(r => r.status === 'approved').length
})

const rejectedCount = computed(() => {
  return requests.value.filter(r => r.status === 'rejected').length
})

// Fetch price adjustment requests
const fetchRequests = async () => {
  isLoading.value = true
  try {
    const queryParams = {
      per_page: itemsPerPage.value,
      page: page.value,
    }

    if (selectedStatus.value) {
      queryParams.status = selectedStatus.value
    }

    if (searchQuery.value) {
      queryParams.search = searchQuery.value
    }

    if (dateFrom.value) {
      queryParams.date_from = dateFrom.value
    }

    if (dateTo.value) {
      queryParams.date_to = dateTo.value
    }

    const queryString = new URLSearchParams(queryParams).toString()
    const url = `/price-adjustment-requests${queryString ? `?${queryString}` : ''}`

    const response = await $api(url, {
      method: 'GET',
    })

    // Handle response structure
    let requestsData = []
    if (response?.success && response?.data) {
      requestsData = response.data
      totalRequests.value = response.meta?.total || response.data.length
    } else if (response?.data && Array.isArray(response.data)) {
      requestsData = response.data
      totalRequests.value = response.meta?.total || response.data.length
    } else if (Array.isArray(response)) {
      requestsData = response
      totalRequests.value = response.length
    } else {
      requests.value = []
      totalRequests.value = 0
      return
    }
    
    // Log first request for debugging
    if (requestsData.length > 0) {
      console.log('=== Price Adjustment Requests Debug ===')
      console.log('First request:', requestsData[0])
      console.log('Delivery object:', requestsData[0]?.delivery)
      console.log('Requester name:', requestsData[0]?.delivery?.requester_name)
      console.log('Requester object:', requestsData[0]?.delivery?.requester)
      console.log('========================================')
    }
    
    requests.value = requestsData
  } catch (error) {
    console.error('Error fetching price adjustment requests:', error)
    requests.value = []
    totalRequests.value = 0
  } finally {
    isLoading.value = false
  }
}

const handleRequestUpdate = (updatedRequest, customMessage = null) => {
  if (!updatedRequest || !updatedRequest.id) return
  
  const index = requests.value.findIndex(r => r.id === updatedRequest.id)
  
  if (index !== -1) {

    requests.value[index] = { ...requests.value[index], ...updatedRequest }
    
    const statusText = customMessage || getStatusInfo(updatedRequest.status)?.title || 'Mise à jour'
    successSnackText.value = `Demande #${updatedRequest.id} : ${statusText}`
    isSuccessSnackVisible.value = true
  } else {

    requests.value.unshift(updatedRequest)
    totalRequests.value++
    
    const statusText = customMessage || 'Nouvelle demande'
    successSnackText.value = `Nouvelle demande #${updatedRequest.id} : ${statusText}`
    isSuccessSnackVisible.value = true
  }
}

// Format price
const formatPrice = value => {
  if (value == null) {
    return '—'
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0,
    }).format(Number(value))
  } catch {
    return String(value)
  }
}

// Format date
const formatDate = value => {
  if (!value) {
    return '—'
  }

  try {
    const date = new Date(value)

    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

// Get status info
const getStatusInfo = status => {
  return statusOptions.value.find(s => s.value === status) || statusOptions.value[0]
}

// Calculate adjustment amount (difference between requested and current price)
const calculateAdjustmentAmount = item => {
  const currentPrice = Number(item.current_price) || 0
  const requestedPrice = Number(item.requested_price) || 0
  return requestedPrice - currentPrice
}

// Calculate adjustment percentage
const calculateAdjustmentPercentage = item => {
  const currentPrice = Number(item.current_price) || 0
  const adjustmentAmount = calculateAdjustmentAmount(item)
  
  if (currentPrice === 0) return 0
  return (adjustmentAmount / currentPrice) * 100
}

// Get adjustment color (red for discount, green for increase)
const getAdjustmentColor = item => {
  const adjustment = calculateAdjustmentAmount(item)
  if (adjustment < 0) {
    return 'text-error' // Discount (rabais)
  } else if (adjustment > 0) {
    return 'text-success' // Increase (majoration)
  }
  return 'text-medium-emphasis' // No change
}

// Get adjustment sign
const getAdjustmentSign = item => {
  const adjustment = calculateAdjustmentAmount(item)
  if (adjustment < 0) {
    return '-' // Discount (rabais)
  } else if (adjustment > 0) {
    return '+' // Increase (majoration)
  }
  return '' // No change
}

// Get requester name from various possible locations
const getRequesterName = item => {
  if (!item) {
    console.warn('getRequesterName: item is null or undefined')
    return t('Unknown Requester') || 'Demandeur inconnu'
  }
  
  // ⭐ PRIORITÉ 1: delivery.requester_name (nom simplifié fourni par l'API)
  if (item.delivery?.requester_name) {
    return item.delivery.requester_name
  }
  
  // ⭐ PRIORITÉ 2: delivery.requester.name (nom depuis l'objet requester)
  if (item.delivery?.requester?.name) {
    return item.delivery.requester.name
  }
  
  // ⭐ PRIORITÉ 3: delivery.requester.full_name (pour les clients)
  if (item.delivery?.requester?.full_name) {
    return item.delivery.requester.full_name
  }
  
  // ⭐ PRIORITÉ 4: Construire le nom depuis first_name et last_name
  if (item.delivery?.requester) {
    const requester = item.delivery.requester
    const constructedName = `${requester.first_name || ''} ${requester.last_name || ''}`.trim()
    if (constructedName) {
      return constructedName
    }
  }
  
  // Fallback: Ancienne structure delivery.partner
  if (item.delivery?.partner?.name) {
    return item.delivery.partner.name
  }
  if (item.delivery?.partner?.merchant_name) {
    return item.delivery.partner.merchant_name
  }
  
  // Fallback: Ancienne structure delivery.customer
  if (item.delivery?.customer?.full_name) {
    return item.delivery.customer.full_name
  }
  if (item.delivery?.customer) {
    const customerName = `${item.delivery.customer.first_name || ''} ${item.delivery.customer.last_name || ''}`.trim()
    if (customerName) return customerName
  }
  
  // Dernier recours - log pour déboguer seulement si vraiment rien n'est trouvé
  console.warn('getRequesterName: No name found', {
    hasDelivery: !!item.delivery,
    hasRequester: !!item.delivery?.requester,
    hasPartner: !!item.delivery?.partner,
    hasCustomer: !!item.delivery?.customer,
    deliveryKeys: item.delivery ? Object.keys(item.delivery) : [],
  })
  return t('Unknown Requester') || 'Demandeur inconnu'
}

// Get requester type (partner or customer)
const getRequesterType = item => {
  // ⭐ PRIORITÉ 1: delivery.requester.type (type depuis l'objet requester)
  if (item.delivery?.requester?.type) {
    return item.delivery.requester.type
  }
  
  // ⭐ PRIORITÉ 2: delivery.requester_type (type direct)
  if (item.delivery?.requester_type) {
    return item.delivery.requester_type
  }
  
  // Fallback: Inférer depuis la structure
  // Si delivery.partner existe, c'est un partenaire
  if (item.delivery?.partner) {
    return 'partner'
  }
  
  // Sinon, c'est probablement un client
  return 'customer'
}

// Get recipient name
const getRecipientName = item => {
  // ⭐ PRIORITÉ 1: delivery.recipient_name (nom simplifié fourni par l'API)
  if (item.delivery?.recipient_name) {
    return item.delivery.recipient_name
  }
  
  // ⭐ PRIORITÉ 2: delivery.recipient.name (nom depuis l'objet recipient)
  if (item.delivery?.recipient?.name) {
    return item.delivery.recipient.name
  }
  
  // ⭐ PRIORITÉ 3: delivery.recipient.full_name (pour les clients)
  if (item.delivery?.recipient?.full_name) {
    return item.delivery.recipient.full_name
  }
  
  // ⭐ PRIORITÉ 4: Construire le nom depuis first_name et last_name
  if (item.delivery?.recipient) {
    const recipient = item.delivery.recipient
    const constructedName = `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim()
    if (constructedName) return constructedName
  }
  
  // Fallback: Ancienne structure delivery.customer
  if (item.delivery?.customer?.full_name) {
    return item.delivery.customer.full_name
  }
  const customerName = item.delivery?.customer
    ? `${item.delivery.customer.first_name || ''} ${item.delivery.customer.last_name || ''}`.trim()
    : ''
  if (customerName) return customerName
  
  return null
}

// Open approve dialog
const openApproveDialog = request => {
  selectedRequest.value = request
  isApproveDialogOpen.value = true
}

// Open reject dialog
const openRejectDialog = request => {
  selectedRequest.value = request
  isRejectDialogOpen.value = true
}

// Watch for changes and refetch
watch([selectedStatus, searchQuery, dateFrom, dateTo, itemsPerPage], () => {
  page.value = 1
  fetchRequests()
})

watch(page, () => {
  fetchRequests()
})

// Watch for dialog close
watch(isApproveDialogOpen, newVal => {
  if (!newVal) {
    selectedRequest.value = null
    fetchRequests()
  }
})

watch(isRejectDialogOpen, newVal => {
  if (!newVal) {
    selectedRequest.value = null
    fetchRequests()
  }
})

// Load on mount
onMounted(() => {
  fetchRequests()
  
  echo.channel('admin-orders')
    .listen('.price-adjustment-request-created', (event) => {
      handleRequestUpdate(event.price_adjustment_request, 'Nouvelle demande d\'ajustement de prix')
    })
    .listen('.price-adjustment-request-approved', (event) => {
      handleRequestUpdate(event.price_adjustment_request, 'Demande approuvée')
    })
    .listen('.price-adjustment-request-rejected', (event) => {
      handleRequestUpdate(event.price_adjustment_request, 'Demande rejetée')
    })
})

onUnmounted(() => {
  echo.leave('admin-orders')
})
</script>

<template>
  <section>
    <!-- Header Section -->
    <VCard class="mb-6">
      <VCardItem class="pb-4">
        <VCardTitle>{{ $t('Price Adjustment Requests') || 'Demandes de rabais' }}</VCardTitle>
        <VCardSubtitle>
          {{ $t('Manage and review price adjustment requests for deliveries') || 'Gérer et examiner les demandes de rabais pour les livraisons' }}
        </VCardSubtitle>
      </VCardItem>

      <VCardText>
        <VRow class="mb-4">
          <!-- Pending Requests -->
          <VCol
            cols="12"
            md="4"
          >
            <VCard
              color="warning"
              variant="tonal"
            >
              <VCardText class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-sm text-medium-emphasis">
                    {{ $t('Pending Requests') || 'Demandes en attente' }}
                  </div>
                  <div class="text-h4 font-weight-medium mt-1">
                    {{ pendingCount }}
                  </div>
                </div>
                <VAvatar
                  color="warning"
                  variant="tonal"
                  size="56"
                >
                  <VIcon
                    icon="tabler-clock"
                    size="28"
                  />
                </VAvatar>
              </VCardText>
            </VCard>
          </VCol>

          <!-- Approved Requests -->
          <VCol
            cols="12"
            md="4"
          >
            <VCard
              color="success"
              variant="tonal"
            >
              <VCardText class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-sm text-medium-emphasis">
                    {{ $t('Approved Requests') || 'Demandes approuvées' }}
                  </div>
                  <div class="text-h4 font-weight-medium mt-1">
                    {{ approvedCount }}
                  </div>
                </div>
                <VAvatar
                  color="success"
                  variant="tonal"
                  size="56"
                >
                  <VIcon
                    icon="tabler-check"
                    size="28"
                  />
                </VAvatar>
              </VCardText>
            </VCard>
          </VCol>

          <!-- Rejected Requests -->
          <VCol
            cols="12"
            md="4"
          >
            <VCard
              color="error"
              variant="tonal"
            >
              <VCardText class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-sm text-medium-emphasis">
                    {{ $t('Rejected Requests') || 'Demandes rejetées' }}
                  </div>
                  <div class="text-h4 font-weight-medium mt-1">
                    {{ rejectedCount }}
                  </div>
                </div>
                <VAvatar
                  color="error"
                  variant="tonal"
                  size="56"
                >
                  <VIcon
                    icon="tabler-x"
                    size="28"
                  />
                </VAvatar>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>

        <!-- Filters -->
        <VRow>
          <VCol
            cols="12"
            sm="6"
            md="3"
          >
            <AppSelect
              v-model="selectedStatus"
              :items="statusOptions"
              :label="$t('Status')"
              :placeholder="$t('Filter by status')"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>

          <VCol
            cols="12"
            sm="6"
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

          <VCol
            cols="12"
            sm="6"
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

          <VCol
            cols="12"
            sm="12"
            md="5"
          >
            <AppTextField
              v-model="searchQuery"
              :label="$t('Search')"
              :placeholder="($t('Search by delivery number...') || 'Rechercher par numéro de livraison...')"
              clearable
              prepend-inner-icon="tabler-search"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- Requests Table -->
    <VCard>
      <VCardText>
        <VDataTableServer
          v-model:items-per-page="itemsPerPage"
          v-model:page="page"
          :headers="headers"
          :items="requests"
          :items-length="totalRequests"
          :loading="isLoading"
          item-value="id"
          class="text-no-wrap"
        >
          <!-- Index -->
          <template #item.index="{ index }">
            <span class="text-high-emphasis font-weight-medium">
              {{ (page - 1) * itemsPerPage + index + 1 }}
            </span>
          </template>

          <!-- Delivery -->
          <template #item.delivery="{ item }">
            <VChip
              size="small"
              color="primary"
              variant="tonal"
            >
              <VIcon
                icon="tabler-package"
                size="14"
                class="me-1"
              />
              #{{ item.delivery_id || item.delivery?.id || '—' }}
            </VChip>
          </template>

          <!-- Requester -->
          <template #item.requester="{ item }">
            <div class="d-flex align-center gap-2">
              <VAvatar
                size="32"
                variant="tonal"
                :color="getRequesterType(item) === 'partner' ? 'secondary' : 'primary'"
              >
                <VIcon :icon="getRequesterType(item) === 'partner' ? 'tabler-building-store' : 'tabler-user'" />
              </VAvatar>
              <div>
                <div class="text-body-1 font-weight-medium">
                  {{ getRequesterName(item) }}
                </div>
                <div
                  v-if="getRecipientName(item)"
                  class="text-sm text-medium-emphasis"
                >
                  {{ $t('Recipient') || 'Destinataire' }}: {{ getRecipientName(item) }}
                </div>
              </div>
            </div>
          </template>

          <!-- Current Price -->
          <template #item.current_price="{ item }">
            <span class="text-body-1 font-weight-medium">
              {{ formatPrice(item.current_price) }}
            </span>
          </template>

          <!-- Requested Price -->
          <template #item.requested_price="{ item }">
            <span class="text-body-1 font-weight-medium text-primary">
              {{ formatPrice(item.requested_price) }}
            </span>
          </template>

          <!-- Price Adjustment -->
          <template #item.adjustment="{ item }">
            <div class="d-flex flex-column">
              <span
                class="text-body-1 font-weight-bold"
                :class="getAdjustmentColor(item)"
              >
                {{ getAdjustmentSign(item) }}{{ formatPrice(Math.abs(calculateAdjustmentAmount(item))) }}
              </span>
              <span class="text-xs text-medium-emphasis">
                ({{ getAdjustmentSign(item) }}{{ Math.abs(calculateAdjustmentPercentage(item)).toFixed(2) }}%)
              </span>
            </div>
          </template>

          <!-- Reason -->
          <template #item.reason="{ item }">
            <div
              class="text-body-2"
              :title="item.reason"
            >
              {{ item.reason || $t('No reason provided') || 'Aucune raison fournie' }}
            </div>
          </template>

          <!-- Requested By -->
          <template #item.requested_by="{ item }">
            <div class="d-flex align-center gap-2">
              <VAvatar
                size="28"
                variant="tonal"
                color="info"
              >
                <VIcon icon="tabler-user" />
              </VAvatar>
              <div>
                <div class="text-sm font-weight-medium">
                  {{ item.requested_by?.name || $t('Unknown') || 'Inconnu' }}
                </div>
                <div class="text-xs text-medium-emphasis">
                  {{ formatDate(item.created_at) }}
                </div>
              </div>
            </div>
          </template>

          <!-- Status -->
          <template #item.status="{ item }">
            <VChip
              size="small"
              :color="getStatusInfo(item.status)?.color || 'secondary'"
              variant="tonal"
            >
              <VIcon
                :icon="item.status === 'pending' ? 'tabler-clock' : item.status === 'approved' ? 'tabler-check' : 'tabler-x'"
                size="14"
                class="me-1"
              />
              {{ getStatusInfo(item.status)?.title || item.status }}
            </VChip>
          </template>

          <!-- Actions -->
          <template #item.actions="{ item }">
            <div
              v-if="item.status === 'pending'"
              class="d-flex gap-2"
            >
              <VBtn
                size="small"
                color="success"
                variant="tonal"
                prepend-icon="tabler-check"
                @click="openApproveDialog(item)"
              >
                {{ $t('Approve') || 'Approuver' }}
              </VBtn>
              <VBtn
                size="small"
                color="error"
                variant="tonal"
                prepend-icon="tabler-x"
                @click="openRejectDialog(item)"
              >
                {{ $t('Reject') || 'Rejeter' }}
              </VBtn>
            </div>
            <div
              v-else
              class="text-medium-emphasis text-sm"
            >
              {{ item.reviewed_by ? $t('Reviewed by') || 'Examiné par' : '' }}
              <span v-if="item.reviewed_by">
                {{ item.reviewed_by.name }}
              </span>
              <span
                v-if="item.reviewed_at"
                class="d-block text-xs mt-1"
              >
                {{ formatDate(item.reviewed_at) }}
              </span>
            </div>
          </template>

          <!-- Empty State -->
          <template #no-data>
            <div class="text-center py-8">
              <VIcon
                icon="tabler-inbox"
                size="48"
                color="secondary"
                class="mb-4"
              />
              <h6 class="text-h6 mb-2">
                {{ $t('No requests found') || 'Aucune demande trouvée' }}
              </h6>
              <p class="text-medium-emphasis">
                {{ $t('No price adjustment requests match the selected filters.') || 'Aucune demande de rabais ne correspond aux filtres sélectionnés.' }}
              </p>
            </div>
          </template>
        </VDataTableServer>
      </VCardText>
    </VCard>

    <!-- Approve Dialog -->
    <ApproveDialog
      v-model:is-dialog-visible="isApproveDialogOpen"
      :request="selectedRequest"
      @request-approved="fetchRequests"
    />

    <!-- Reject Dialog -->
    <RejectDialog
      v-model:is-dialog-visible="isRejectDialogOpen"
      :request="selectedRequest"
      @request-rejected="fetchRequests"
    />

    <!-- Success Snackbar -->
    <VSnackbar
      v-model="isSuccessSnackVisible"
      location="top end"
      timeout="6000"
      variant="flat"
      color="success"
    >
      {{ successSnackText }}
    </VSnackbar>
  </section>
</template>

