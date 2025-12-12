<script setup>
/* eslint-disable camelcase */
import { useI18n } from 'vue-i18n'
import DriversToSettleDialog from './drivers-to-settle-dialog.vue'
import SettlementAddDialog from './settlement-add.vue'
import SettlementDetailsDialog from './settlement-details.vue'
import SettlementEditDialog from './settlement-edit.vue'

const { t } = useI18n()

// View mode: 'settlements' (list of settlements) or 'drivers-to-settle' (dashboard)
const viewMode = ref('settlements')

// Filters for settlements list
const selectedDriverId = ref(null)
const selectedStatus = ref(null)
const dateFrom = ref(null)
const dateTo = ref(null)
const settlementDate = ref(null)
const searchQuery = ref('')

// Data table options
const itemsPerPage = ref(15)
const page = ref(1)
const isLoading = ref(false)

// Settlements data
const settlements = ref([])
const totalSettlements = ref(0)

// Drivers list for filter
const drivers = ref([])
const isLoadingDrivers = ref(false)

// Dialog states
const isSettlementDialogOpen = ref(false)
const isSettlementDetailsDialogOpen = ref(false)
const isSettlementEditDialogOpen = ref(false)
const isDriversToSettleDialogOpen = ref(false)
const selectedSettlement = ref(null)
const selectedDriverForSettlement = ref(null)

// Status options
const statusOptions = computed(() => [
  { title: t('Pending') || 'En attente', value: 'En attente', color: 'warning' },
  { title: t('Validated') || 'Validée', value: 'Validée', color: 'success' },
])

// Headers for settlements table
const headers = computed(() => [
  { title: '#', key: 'index', sortable: false, width: '60px' },
  { title: t('Driver') || 'Livreur', key: 'driver', sortable: false, width: '200px' },
  { title: t('Settlement Date') || 'Date de règlement', key: 'settlement_date', sortable: true, width: '130px' },
  { title: t('Deliveries Amount') || 'Montant livraisons', key: 'total_deliveries_amount', sortable: true, width: '150px' },
  { title: t('Expenses Amount') || 'Montant dépenses', key: 'total_expenses_amount', sortable: true, width: '150px' },
  { title: t('Amount Paid') || 'Montant payé', key: 'amount_paid', sortable: true, width: '130px' },
  { title: t('Difference') || 'Différence', key: 'difference', sortable: true, width: '130px' },
  { title: t('Status') || 'Statut', key: 'status', sortable: true, width: '120px' },
  { title: t('Created At') || 'Créé le', key: 'created_at', sortable: true, width: '130px' },
  { title: t('Actions') || 'Actions', key: 'actions', sortable: false, width: '200px' },
])

// Statistics
const totalDeliveriesAmount = computed(() => {
  return settlements.value.reduce((sum, s) => sum + getDeliveriesAmount(s), 0)
})

const totalExpensesAmount = computed(() => {
  return settlements.value.reduce((sum, s) => {
    // Use driver_expenses (can be string or number) or total_expenses_amount
    const amount = parseFloat(s.driver_expenses) || parseFloat(s.total_expenses_amount) || 0

    return sum + amount
  }, 0)
})

const totalDifference = computed(() => {
  return settlements.value.reduce((sum, s) => sum + (parseFloat(s.difference) || 0), 0)
})

// Fetch drivers for filter
const fetchDrivers = async () => {
  isLoadingDrivers.value = true
  try {
    const url = '/drivers'
    
    // Log de la requête
    console.log('🔵 [TRANSACTIONS] Requête API (Drivers):', {
      method: 'GET',
      endpoint: url,
      fullUrl: `${import.meta.env.VITE_API_BASE_URL || ''}${url}`,
      timestamp: new Date().toISOString(),
    })

    const response = await $api(url, {
      method: 'GET',
    })

    // Log de la réponse
    console.log('✅ [TRANSACTIONS] Réponse API (Drivers):', {
      driversCount: Array.isArray(response) ? response.length : (response?.data?.length || 0),
      response: response,
      timestamp: new Date().toISOString(),
    })

    if (Array.isArray(response)) {
      drivers.value = response
    } else if (response?.data && Array.isArray(response.data)) {
      drivers.value = response.data
    } else {
      drivers.value = []
    }
  } catch (error) {
    console.error('❌ [TRANSACTIONS] Erreur lors de la récupération des drivers:', error)
    drivers.value = []
  } finally {
    isLoadingDrivers.value = false
  }
}

// Fetch settlements
const fetchSettlements = async () => {
  isLoading.value = true
  try {
    const queryParams = {
      per_page: itemsPerPage.value,
      page: page.value,
    }

    if (selectedDriverId.value) {
      queryParams.driver_id = selectedDriverId.value
    }

    if (selectedStatus.value) {
      queryParams.status = selectedStatus.value
    }

    if (dateFrom.value) {
      queryParams.date_from = dateFrom.value
    }

    if (dateTo.value) {
      queryParams.date_to = dateTo.value
    }

    if (settlementDate.value) {
      queryParams.settlement_date = settlementDate.value
    }

    if (searchQuery.value) {
      queryParams.search = searchQuery.value
    }

    const queryString = new URLSearchParams(queryParams).toString()
    const url = `/driver-payments${queryString ? `?${queryString}` : ''}`

    // Log de la requête
    console.log('🔵 [TRANSACTIONS] Requête API:', {
      method: 'GET',
      endpoint: url,
      fullUrl: `${import.meta.env.VITE_API_BASE_URL || ''}${url}`,
      queryParams,
      timestamp: new Date().toISOString(),
    })

    const response = await $api(url, {
      method: 'GET',
    })

    // Log de la réponse
    console.log('✅ [TRANSACTIONS] Réponse API:', {
      success: response?.success,
      dataLength: Array.isArray(response?.data) ? response?.data.length : (response?.data ? 1 : 0),
      total: response?.meta?.total || 'N/A',
      currentPage: response?.meta?.current_page || page.value,
      lastPage: response?.meta?.last_page || 'N/A',
      response: response,
      timestamp: new Date().toISOString(),
    })

    // Handle response structure
    if (response?.success && response?.data) {
      settlements.value = Array.isArray(response.data) ? response.data : []
      totalSettlements.value = response.meta?.total || (Array.isArray(response.data) ? response.data.length : 0)
    } else if (response?.data && Array.isArray(response.data)) {
      settlements.value = response.data
      totalSettlements.value = response.meta?.total || response.data.length
    } else if (Array.isArray(response)) {
      settlements.value = response
      totalSettlements.value = response.length
    } else {
      settlements.value = []
      totalSettlements.value = 0
    }

    // Log du résultat final
    console.log('📊 [TRANSACTIONS] Données chargées:', {
      settlementsCount: settlements.value.length,
      totalSettlements: totalSettlements.value,
      filters: {
        driver_id: selectedDriverId.value,
        status: selectedStatus.value,
        date_from: dateFrom.value,
        date_to: dateTo.value,
        settlement_date: settlementDate.value,
        search: searchQuery.value,
        page: page.value,
        per_page: itemsPerPage.value,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ [TRANSACTIONS] Erreur lors de la récupération des règlements:', {
      error,
      url,
      queryParams,
      timestamp: new Date().toISOString(),
    })
    settlements.value = []
    totalSettlements.value = 0
  } finally {
    isLoading.value = false
  }
}

// Open settlement dialog for a driver (from drivers-to-settle)
const openSettlementDialog = driverData => {
  selectedDriverForSettlement.value = driverData
  isSettlementDialogOpen.value = true
}

// Open drivers to settle dialog
const openDriversToSettleDialog = () => {
  isDriversToSettleDialogOpen.value = true
}

// View settlement details
const viewSettlementDetails = settlement => {
  selectedSettlement.value = settlement
  isSettlementDetailsDialogOpen.value = true
}

// Edit settlement
const editSettlement = settlement => {
  selectedSettlement.value = settlement
  isSettlementEditDialogOpen.value = true
}

// Delete settlement
const deleteSettlement = async settlement => {
  if (!confirm(t('Are you sure you want to delete this settlement?') || 'Êtes-vous sûr de vouloir supprimer ce règlement ?')) {
    return
  }

  try {
    await $api(`/driver-payments/${settlement.id}`, {
      method: 'DELETE',
    })
    fetchSettlements()
  } catch (error) {
    console.error('Error deleting settlement:', error)
  }
}

// Validate settlement
const validateSettlement = async settlement => {
  if (!confirm(t('Are you sure you want to validate this settlement?') || 'Êtes-vous sûr de vouloir valider ce règlement ?')) {
    return
  }

  try {
    await $api(`/driver-payments/${settlement.id}/validate`, {
      method: 'POST',
    })
    fetchSettlements()
  } catch (error) {
    console.error('Error validating settlement:', error)
  }
}

// Get status info
const getStatusInfo = status => {
  const statusName = status?.name || status

  return statusOptions.value.find(s => s.value === statusName) || { color: 'secondary', title: statusName }
}

// Get deliveries amount from settlement item
const getDeliveriesAmount = item => {
  if (item.theoretical_amount) {
    return parseFloat(item.theoretical_amount)
  }
  if (item.expected_amount) {
    return parseFloat(item.expected_amount)
  }
  if (item.deliveries && Array.isArray(item.deliveries)) {
    return item.deliveries.reduce((sum, d) => sum + (parseFloat(d.price) || 0), 0)
  }
  if (item.total_deliveries_amount) {
    return parseFloat(item.total_deliveries_amount)
  }

  return 0
}

// Format date
const formatDate = value => {
  if (!value) {
    return '—'
  }

  try {
    const date = new Date(value)

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
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

// Get difference type and info
const getDifferenceInfo = item => {
  const difference = parseFloat(item.difference) || 0
  const theoreticalAmount = parseFloat(item.theoretical_amount) || parseFloat(item.total_deliveries_amount) || 0
  const amountPaid = parseFloat(item.amount_paid) || 0
  
  if (Math.abs(difference) < 0.01) {
    // Conforme (difference ≈ 0)
    return {
      type: 'conform',
      color: 'success',
      icon: 'tabler-check',
      label: t('Conform') || 'Conforme',
      amount: 0,
    }
  } else if (difference > 0) {
    // Manquant (difference > 0, amount_paid < theoretical_amount)
    return {
      type: 'missing',
      color: 'error',
      icon: 'tabler-alert-triangle',
      label: t('Missing') || 'Manquant',
      amount: difference,
    }
  } else {
    // Excédent (difference < 0, amount_paid > theoretical_amount)
    return {
      type: 'excess',
      color: 'info',
      icon: 'tabler-arrow-up',
      label: t('Excess') || 'Excédent',
      amount: Math.abs(difference),
    }
  }
}


// Watch for filter changes and refetch
watch([selectedDriverId, selectedStatus, dateFrom, dateTo, settlementDate, searchQuery, itemsPerPage], () => {
  console.log('🔄 [TRANSACTIONS] Filtres modifiés, rechargement des données...', {
    selectedDriverId: selectedDriverId.value,
    selectedStatus: selectedStatus.value,
    dateFrom: dateFrom.value,
    dateTo: dateTo.value,
    settlementDate: settlementDate.value,
    searchQuery: searchQuery.value,
    itemsPerPage: itemsPerPage.value,
    timestamp: new Date().toISOString(),
  })
  page.value = 1
  if (viewMode.value === 'settlements') {
    fetchSettlements()
  }
})

watch(page, newPage => {
  console.log('📄 [TRANSACTIONS] Changement de page:', {
    newPage,
    timestamp: new Date().toISOString(),
  })
  if (viewMode.value === 'settlements') {
    fetchSettlements()
  }
})

// Watch for settlement dialog close
watch(isSettlementDialogOpen, newVal => {
  if (!newVal) {
    selectedDriverForSettlement.value = null
    if (viewMode.value === 'settlements') {
      fetchSettlements()
    }
  }
})

watch(isSettlementDetailsDialogOpen, newVal => {
  if (!newVal) {
    selectedSettlement.value = null
  }
})

watch(isSettlementEditDialogOpen, newVal => {
  if (!newVal) {
    selectedSettlement.value = null
    fetchSettlements()
  }
})

watch(isDriversToSettleDialogOpen, newVal => {
  if (!newVal) {
    fetchSettlements()
  }
})

// Load on mount
onMounted(() => {
  console.log('🚀 [TRANSACTIONS] Initialisation du screen Transactions', {
    timestamp: new Date().toISOString(),
  })
  fetchDrivers()
  fetchSettlements()
})
</script>

<template>
  <section>
    <!-- Header Section -->
    <VCard class="mb-6">
      <VCardItem class="pb-4">
        <div class="d-flex align-center justify-space-between">
          <div>
            <VCardTitle>{{ $t('Driver Payments - Settlements') }}</VCardTitle>
            <VCardSubtitle>
              {{ $t('Manage driver payment settlements') || 'Gérer les règlements des livreurs' }}
            </VCardSubtitle>
          </div>
          <VBtn
            color="primary"
            prepend-icon="tabler-users"
            @click="openDriversToSettleDialog"
          >
            {{ $t('Drivers to Settle') || 'Livreurs à régler' }}
          </VBtn>
        </div>
      </VCardItem>

      <VCardText>
        <VRow class="mb-4">
          <!-- Total Deliveries Amount -->
          <VCol
            cols="12"
            md="4"
          >
            <VCard
              color="info"
              variant="tonal"
            >
              <VCardText class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-sm text-medium-emphasis">
                    {{ $t('Total Deliveries Amount') || 'Total livraisons' }}
                  </div>
                  <div class="text-h4 font-weight-medium mt-1">
                    {{ formatPrice(totalDeliveriesAmount) }}
                  </div>
                </div>
                <VAvatar
                  color="info"
                  variant="tonal"
                  size="56"
                >
                  <VIcon
                    icon="tabler-package"
                    size="28"
                  />
                </VAvatar>
              </VCardText>
            </VCard>
          </VCol>

          <!-- Total Expenses Amount -->
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
                    {{ $t('Total Expenses Amount') || 'Total dépenses' }}
                  </div>
                  <div class="text-h4 font-weight-medium mt-1">
                    {{ formatPrice(totalExpensesAmount) }}
                  </div>
                </div>
                <VAvatar
                  color="warning"
                  variant="tonal"
                  size="56"
                >
                  <VIcon
                    icon="tabler-receipt"
                    size="28"
                  />
                </VAvatar>
              </VCardText>
            </VCard>
          </VCol>

          <!-- Total Difference -->
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
                    {{ $t('Total Difference') || 'Différence totale' }}
                  </div>
                  <div class="text-h4 font-weight-medium mt-1">
                    {{ formatPrice(totalDifference) }}
                  </div>
                </div>
                <VAvatar
                  color="success"
                  variant="tonal"
                  size="56"
                >
                  <VIcon
                    icon="tabler-currency-dollar"
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
            md="2"
          >
            <AppSelect
              v-model="selectedDriverId"
              :items="drivers.map(d => ({ title: `${d.first_name || ''} ${d.last_name || ''}`.trim() || d.user?.name || $t('Unknown'), value: d.id }))"
              :loading="isLoadingDrivers"
              :label="$t('Driver')"
              :placeholder="$t('Filter by driver')"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>

          <VCol
            cols="12"
            sm="6"
            md="2"
          >
            <AppSelect
              v-model="selectedStatus"
              :items="statusOptions"
              :label="$t('Status') || 'Statut'"
              :placeholder="$t('Select a status') || 'Sélectionner un statut'"
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
              v-model="settlementDate"
              :label="$t('Settlement Date') || 'Date de règlement'"
              :placeholder="$t('Select date')"
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
            md="2"
          >
            <AppTextField
              v-model="searchQuery"
              :label="$t('Search')"
              :placeholder="($t('Search...') || 'Rechercher...')"
              clearable
              prepend-inner-icon="tabler-search"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- Settlements Table -->
    <VCard>
      <VCardText>
        <VDataTableServer
          v-model:items-per-page="itemsPerPage"
          v-model:page="page"
          :headers="headers"
          :items="settlements"
          :items-length="totalSettlements"
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

          <!-- Driver -->
          <template #item.driver="{ item }">
            <div class="d-flex align-center gap-2">
              <VAvatar
                size="32"
                variant="tonal"
                color="primary"
              >
                <VIcon icon="tabler-user" />
              </VAvatar>
              <div>
                <div class="text-body-1 font-weight-medium">
                  {{ item.driver?.first_name && item.driver?.last_name 
                    ? `${item.driver.first_name} ${item.driver.last_name}`.trim()
                    : item.driver?.user?.name || item.driver?.name || $t('Unknown') || 'Inconnu' }}
                </div>
                <div
                  v-if="item.driver?.phone"
                  class="text-sm text-medium-emphasis"
                >
                  <VIcon
                    icon="tabler-phone"
                    size="12"
                    class="me-1"
                  />
                  {{ item.driver.phone }}
                </div>
              </div>
            </div>
          </template>

          <!-- Settlement Date -->
          <template #item.settlement_date="{ item }">
            <span class="text-high-emphasis">
              {{ formatDate(item.settlement_date || item.payment_date) }}
            </span>
          </template>

          <!-- Deliveries Amount -->
          <template #item.total_deliveries_amount="{ item }">
            <div class="d-flex flex-column">
              <span class="text-body-1 font-weight-medium text-info">
                {{ formatPrice(getDeliveriesAmount(item)) }}
              </span>
              <span
                v-if="item.deliveries_count"
                class="text-xs text-medium-emphasis"
              >
                {{ item.deliveries_count }} {{ $t('deliveries') || 'livraisons' }}
              </span>
            </div>
          </template>

          <!-- Expenses Amount -->
          <template #item.total_expenses_amount="{ item }">
            <div class="d-flex flex-column">
              <span class="text-body-1 font-weight-medium text-warning">
                {{ formatPrice(item.driver_expenses || item.total_expenses_amount || 0) }}
              </span>
              <span
                v-if="item.expenses_count"
                class="text-xs text-medium-emphasis"
              >
                {{ item.expenses_count }} {{ $t('expenses') || 'dépenses' }}
              </span>
            </div>
          </template>

          <!-- Amount Paid -->
          <template #item.amount_paid="{ item }">
            <span class="text-body-1 font-weight-medium text-success">
              {{ formatPrice(item.amount_paid) }}
            </span>
          </template>

          <!-- Difference -->
          <template #item.difference="{ item }">
            <div class="d-flex flex-column">
              <VChip
                size="small"
                :color="getDifferenceInfo(item).color"
                variant="tonal"
                class="mb-1"
              >
                <VIcon
                  :icon="getDifferenceInfo(item).icon"
                  size="14"
                  class="me-1"
                />
                {{ getDifferenceInfo(item).label }}
              </VChip>
              <span
                class="text-body-2 font-weight-medium"
                :class="`text-${getDifferenceInfo(item).color}`"
              >
                {{ getDifferenceInfo(item).type === 'excess' 
                  ? `+${formatPrice(getDifferenceInfo(item).amount)}`
                  : getDifferenceInfo(item).type === 'missing'
                    ? `-${formatPrice(getDifferenceInfo(item).amount)}`
                    : formatPrice(0) }}
              </span>
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
                :icon="item.status?.name === 'Validée' ? 'tabler-check' : 'tabler-clock'"
                size="14"
                class="me-1"
              />
              {{ getStatusInfo(item.status)?.title || item.status?.name || $t('Unknown') || 'Inconnu' }}
            </VChip>
          </template>

          <!-- Created At -->
          <template #item.created_at="{ item }">
            <div class="d-flex flex-column">
              <span class="text-sm text-high-emphasis">
                {{ formatDate(item.created_at) }}
              </span>
              <span
                v-if="item.created_by"
                class="text-xs text-medium-emphasis"
              >
                {{ $t('By') || 'Par' }}: {{ item.created_by.name }}
              </span>
            </div>
          </template>

          <!-- Actions -->
          <template #item.actions="{ item }">
            <div class="d-flex gap-1">
              <IconBtn
                color="primary"
                @click.stop="viewSettlementDetails(item)"
              >
                <VIcon icon="tabler-eye" />
                <VTooltip activator="parent">
                  {{ $t('View Details') }}
                </VTooltip>
              </IconBtn>

              <IconBtn
                v-if="item.status?.name !== 'Validée'"
                color="warning"
                @click.stop="editSettlement(item)"
              >
                <VIcon icon="tabler-pencil" />
                <VTooltip activator="parent">
                  {{ $t('Edit') }}
                </VTooltip>
              </IconBtn>

              <IconBtn
                v-if="item.status?.name !== 'Validée'"
                color="success"
                @click.stop="validateSettlement(item)"
              >
                <VIcon icon="tabler-check" />
                <VTooltip activator="parent">
                  {{ $t('Validate') || 'Valider' }}
                </VTooltip>
              </IconBtn>

              <IconBtn
                v-if="item.status?.name !== 'Validée'"
                color="error"
                @click.stop="deleteSettlement(item)"
              >
                <VIcon icon="tabler-trash" />
                <VTooltip activator="parent">
                  {{ $t('Delete') }}
                </VTooltip>
              </IconBtn>
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
                {{ $t('No settlements found') || 'Aucun règlement trouvé' }}
              </h6>
              <p class="text-medium-emphasis">
                {{ $t('No settlements match the selected filters.') || 'Aucun règlement ne correspond aux filtres sélectionnés.' }}
              </p>
            </div>
          </template>
        </VDataTableServer>
      </VCardText>
    </VCard>

    <!-- Settlement Add Dialog -->
    <SettlementAddDialog
      v-model:is-dialog-visible="isSettlementDialogOpen"
      :driver-data="selectedDriverForSettlement"
      :payment-date="settlementDate"
      @settlement-created="fetchSettlements"
    />

    <!-- Settlement Details Dialog -->
    <SettlementDetailsDialog
      v-model:is-dialog-visible="isSettlementDetailsDialogOpen"
      :settlement="selectedSettlement"
    />

    <!-- Settlement Edit Dialog -->
    <SettlementEditDialog
      v-model:is-dialog-visible="isSettlementEditDialogOpen"
      :settlement="selectedSettlement"
      @settlement-updated="fetchSettlements"
    />

    <!-- Drivers to Settle Dialog -->
    <DriversToSettleDialog
      v-model:is-dialog-visible="isDriversToSettleDialogOpen"
      @settlement-created="fetchSettlements"
    />
  </section>
</template>
