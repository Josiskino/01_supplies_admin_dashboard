<script setup>
/* eslint-disable camelcase */
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  settlement: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:isDialogVisible'])

const dialogVisible = computed({
  get: () => props.isDialogVisible,
  set: val => emit('update:isDialogVisible', val),
})

const isLoading = ref(false)
const settlementDetails = ref(null)
const deliveriesWithDetails = ref([])
const isLoadingDeliveries = ref(false)

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

// Get deliveries amount from settlement
const getDeliveriesAmount = settlement => {
  if (settlement?.theoretical_amount) {
    return parseFloat(settlement.theoretical_amount)
  }
  if (settlement?.expected_amount) {
    return parseFloat(settlement.expected_amount)
  }
  if (settlement?.deliveries && Array.isArray(settlement.deliveries)) {
    return settlement.deliveries.reduce((sum, d) => sum + (parseFloat(d.price) || 0), 0)
  }
  if (settlement?.total_deliveries_amount) {
    return parseFloat(settlement.total_deliveries_amount)
  }

  return 0
}

// Get expenses amount from settlement
const getExpensesAmount = settlement => {
  if (settlement?.driver_expenses) {
    return parseFloat(settlement.driver_expenses)
  }
  if (settlement?.total_expenses_amount) {
    return parseFloat(settlement.total_expenses_amount)
  }

  return 0
}

// Fetch delivery details to get partner information
const fetchDeliveryDetails = async deliveryId => {
  try {
    const response = await $api(`/deliveries/${deliveryId}`, {
      method: 'GET',
    })

    if (response?.success && response?.data) {
      return response.data
    } else if (response?.data) {
      return response.data
    }

    return null
  } catch (error) {
    console.error(`Error fetching delivery ${deliveryId} details:`, error)
    return null
  }
}

// Fetch deliveries with full details (including partner)
const fetchDeliveriesWithDetails = async deliveries => {
  if (!deliveries || !Array.isArray(deliveries) || deliveries.length === 0) {
    deliveriesWithDetails.value = []
    return
  }

  isLoadingDeliveries.value = true
  try {
    // Fetch details for each delivery that doesn't have partner info
    const deliveriesPromises = deliveries.map(async delivery => {
      // If delivery already has partner info, return it as is
      if (delivery.partner?.name || delivery.partner?.merchant_name) {
        return delivery
      }

      // Otherwise, fetch full delivery details
      const fullDetails = await fetchDeliveryDetails(delivery.id)

      if (fullDetails) {
        return {
          ...delivery,
          partner: fullDetails.partner || delivery.partner,
          customer: fullDetails.customer || delivery.customer,
        }
      }

      return delivery
    })

    deliveriesWithDetails.value = await Promise.all(deliveriesPromises)
  } catch (error) {
    console.error('Error fetching deliveries details:', error)
    deliveriesWithDetails.value = deliveries
  } finally {
    isLoadingDeliveries.value = false
  }
}

// Fetch settlement details
const fetchSettlementDetails = async () => {
  if (!props.settlement?.id) {
    return
  }

  isLoading.value = true
  try {
    const response = await $api(`/driver-payments/${props.settlement.id}`, {
      method: 'GET',
    })

    if (response?.success && response?.data) {
      settlementDetails.value = response.data
      // Fetch full details for deliveries if they exist
      if (response.data.deliveries && Array.isArray(response.data.deliveries)) {
        await fetchDeliveriesWithDetails(response.data.deliveries)
      }
    } else if (response?.data) {
      settlementDetails.value = response.data
      if (response.data.deliveries && Array.isArray(response.data.deliveries)) {
        await fetchDeliveriesWithDetails(response.data.deliveries)
      }
    } else {
      settlementDetails.value = props.settlement
      if (props.settlement.deliveries && Array.isArray(props.settlement.deliveries)) {
        await fetchDeliveriesWithDetails(props.settlement.deliveries)
      }
    }
  } catch (error) {
    console.error('Error fetching settlement details:', error)
    settlementDetails.value = props.settlement
    if (props.settlement?.deliveries && Array.isArray(props.settlement.deliveries)) {
      deliveriesWithDetails.value = props.settlement.deliveries
    }
  } finally {
    isLoading.value = false
  }
}

// Watch for dialog open
watch(dialogVisible, newVal => {
  if (newVal && props.settlement) {
    fetchSettlementDetails()
  }
})

// Watch for settlement prop change
watch(() => props.settlement, () => {
  if (dialogVisible.value && props.settlement) {
    fetchSettlementDetails()
  }
}, { deep: true })
</script>

<template>
  <VDialog
    :width="$vuetify.display.smAndDown ? 'auto' : 900"
    :model-value="dialogVisible"
    @update:model-value="val => dialogVisible = val"
    scrollable
  >
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="dialogVisible = false" />

    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>{{ $t('Settlement Details') || 'Détails du règlement' }}</span>
      </VCardTitle>

      <VDivider />

      <VCardText>
        <div
          v-if="isLoading"
          class="text-center py-8"
        >
          <VProgressCircular
            indeterminate
            color="primary"
          />
        </div>

        <template v-else-if="settlementDetails">
          <!-- Driver Info -->
          <VCard
            variant="outlined"
            class="mb-4"
          >
            <VCardTitle class="text-sm">
              {{ $t('Driver Information') || 'Informations du livreur' }}
            </VCardTitle>
            <VCardText>
              <VRow>
                <VCol
                  cols="12"
                  md="6"
                >
                  <div class="text-sm text-medium-emphasis">
                    {{ $t('Name') || 'Nom' }}
                  </div>
                  <div class="text-body-1 font-weight-medium">
                    {{ settlementDetails.driver?.first_name && settlementDetails.driver?.last_name
                      ? `${settlementDetails.driver.first_name} ${settlementDetails.driver.last_name}`.trim()
                      : settlementDetails.driver?.user?.name || settlementDetails.driver?.name || $t('Unknown') || 'Inconnu' }}
                  </div>
                </VCol>
                <VCol
                  cols="12"
                  md="6"
                >
                  <div class="text-sm text-medium-emphasis">
                    {{ $t('Phone') }}
                  </div>
                  <div class="text-body-1">
                    {{ settlementDetails.driver?.phone || '—' }}
                  </div>
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <!-- Settlement Summary -->
          <VCard
            variant="outlined"
            class="mb-4"
          >
            <VCardTitle class="text-sm">
              {{ $t('Settlement Summary') || 'Résumé du règlement' }}
            </VCardTitle>
            <VCardText>
              <VRow>
                <VCol
                  cols="12"
                  md="3"
                >
                  <div class="text-sm text-medium-emphasis">
                    {{ $t('Settlement Date') || 'Date de règlement' }}
                  </div>
                  <div class="text-body-1 font-weight-medium">
                    {{ formatDate(settlementDetails.settlement_date || settlementDetails.payment_date) }}
                  </div>
                </VCol>
                <VCol
                  cols="12"
                  md="3"
                >
                  <div class="text-sm text-medium-emphasis">
                    {{ $t('Deliveries Amount') || 'Montant livraisons' }}
                  </div>
                  <div class="text-body-1 font-weight-medium text-info">
                    {{ formatPrice(getDeliveriesAmount(settlementDetails)) }}
                  </div>
                </VCol>
                <VCol
                  cols="12"
                  md="3"
                >
                  <div class="text-sm text-medium-emphasis">
                    {{ $t('Expenses Amount') || 'Montant dépenses' }}
                  </div>
                  <div class="text-body-1 font-weight-medium text-warning">
                    {{ formatPrice(getExpensesAmount(settlementDetails)) }}
                  </div>
                </VCol>
                <VCol
                  cols="12"
                  md="3"
                >
                  <div class="text-sm text-medium-emphasis">
                    {{ $t('Difference') || 'Différence' }}
                  </div>
                  <div
                    class="text-body-1 font-weight-bold"
                    :class="parseFloat(settlementDetails.difference) >= 0 ? 'text-success' : 'text-error'"
                  >
                    {{ formatPrice(settlementDetails.difference) }}
                  </div>
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <!-- Deliveries List -->
          <VCard
            v-if="(settlementDetails.deliveries && settlementDetails.deliveries.length > 0) || deliveriesWithDetails.length > 0"
            variant="outlined"
            class="mb-4"
          >
            <VCardTitle class="text-sm">
              {{ $t('Deliveries') || 'Livraisons' }} ({{ settlementDetails.deliveries_count || settlementDetails.deliveries?.length || deliveriesWithDetails.length }})
            </VCardTitle>
            <VCardText>
              <div
                v-if="isLoadingDeliveries"
                class="text-center py-4"
              >
                <VProgressCircular
                  indeterminate
                  size="24"
                  color="primary"
                />
                <span class="text-sm ms-2">{{ $t('Loading delivery details...') || 'Chargement des détails des livraisons...' }}</span>
              </div>
              <VList v-else>
                <VListItem
                  v-for="delivery in (deliveriesWithDetails.length > 0 ? deliveriesWithDetails : settlementDetails.deliveries)"
                  :key="delivery.id"
                  class="px-0"
                >
                  <VListItemTitle class="mb-2">
                    <div class="d-flex align-center gap-2">
                      <VIcon
                        icon="tabler-package"
                        size="20"
                        color="primary"
                      />
                      <span class="font-weight-medium">
                        {{ $t('Delivery') || 'Livraison' }} #{{ delivery.id }}
                      </span>
                    </div>
                  </VListItemTitle>
                  <VListItemSubtitle>
                    <div class="d-flex flex-wrap align-center gap-4 mt-2">
                      <div class="d-flex align-center gap-2">
                        <VIcon
                          icon="tabler-currency-dollar"
                          size="16"
                          color="info"
                        />
                        <span class="text-sm">
                          <strong>{{ $t('Price') || 'Prix' }}:</strong> {{ formatPrice(delivery.price) }}
                        </span>
                      </div>
                      <div
                        v-if="delivery.partner?.name || delivery.partner?.merchant_name"
                        class="d-flex align-center gap-2"
                      >
                        <VIcon
                          icon="tabler-building-store"
                          size="16"
                          color="primary"
                        />
                        <span class="text-sm">
                          <strong>{{ $t('Partner') || 'Partenaire' }}:</strong> {{ delivery.partner?.name || delivery.partner?.merchant_name }}
                        </span>
                      </div>
                      <div
                        v-else
                        class="d-flex align-center gap-2 text-medium-emphasis"
                      >
                        <VIcon
                          icon="tabler-building-store"
                          size="16"
                        />
                        <span class="text-sm">
                          <strong>{{ $t('Partner') || 'Partenaire' }}:</strong> {{ $t('Not available') || 'Non disponible' }}
                        </span>
                      </div>
                      <div
                        v-if="delivery.customer?.name || delivery.customer?.first_name || delivery.customer?.last_name"
                        class="d-flex align-center gap-2"
                      >
                        <VIcon
                          icon="tabler-user"
                          size="16"
                          color="success"
                        />
                        <span class="text-sm">
                          <strong>{{ $t('Customer') || 'Client' }}:</strong> {{ delivery.customer?.name || `${delivery.customer?.first_name || ''} ${delivery.customer?.last_name || ''}`.trim() || $t('Unknown') || 'Inconnu' }}
                        </span>
                      </div>
                      <div
                        v-if="delivery.distance_km"
                        class="d-flex align-center gap-2"
                      >
                        <VIcon
                          icon="tabler-route"
                          size="16"
                          color="warning"
                        />
                        <span class="text-sm">
                          <strong>{{ $t('Distance') || 'Distance' }}:</strong> {{ delivery.distance_km }} km
                        </span>
                      </div>
                    </div>
                  </VListItemSubtitle>
                </VListItem>
              </VList>
            </VCardText>
          </VCard>

          <!-- Expenses List -->
          <VCard
            v-if="settlementDetails.driver_expenses && settlementDetails.driver_expenses.length > 0"
            variant="outlined"
            class="mb-4"
          >
            <VCardTitle class="text-sm">
              {{ $t('Driver Expenses') || 'Dépenses du livreur' }} ({{ settlementDetails.expenses_count || settlementDetails.driver_expenses.length }})
            </VCardTitle>
            <VCardText>
              <VList>
                <VListItem
                  v-for="expense in settlementDetails.driver_expenses"
                  :key="expense.id"
                  class="px-0"
                >
                  <VListItemTitle>
                    {{ expense.title || expense.description || $t('Expense') || 'Dépense' }}
                  </VListItemTitle>
                  <VListItemSubtitle>
                    {{ formatPrice(expense.amount) }}
                    <span v-if="expense.category">
                      - {{ expense.category.name || expense.category.title }}
                    </span>
                  </VListItemSubtitle>
                </VListItem>
              </VList>
            </VCardText>
          </VCard>

          <!-- Notes -->
          <VCard
            v-if="settlementDetails.notes"
            variant="outlined"
            class="mb-4"
          >
            <VCardTitle class="text-sm">
              {{ $t('Notes') || 'Notes' }}
            </VCardTitle>
            <VCardText>
              {{ settlementDetails.notes }}
            </VCardText>
          </VCard>
        </template>
      </VCardText>

      <VDivider />

      <VCardActions class="d-flex justify-end pa-4">
        <VBtn
          color="secondary"
          variant="tonal"
          @click="dialogVisible = false"
        >
          {{ $t('Close') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

