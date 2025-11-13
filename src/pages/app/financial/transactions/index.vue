<script setup>
/* eslint-disable camelcase */
import { useI18n } from 'vue-i18n'
import SettlementAddDialog from './settlement-add.vue'

const { t } = useI18n()

const selectedDate = ref(new Date().toISOString().slice(0, 10))

// Data table options
const isLoading = ref(false)
const isSettlementDialogOpen = ref(false)
const selectedDriverForSettlement = ref(null)

// Drivers to settle data
const driversToSettle = ref([])
const totalDrivers = ref(0)
const totalAmount = ref(0)

// Headers for drivers table
const headers = computed(() => [
  { title: '#', key: 'index', sortable: false, width: '60px' },
  { title: t('Driver') || 'Livreur', key: 'driver', sortable: false, width: '250px' },
  { title: t('Vehicle') || 'Véhicule', key: 'vehicle', sortable: false, width: '150px' },
  { title: t('Deliveries Count') || 'Nombre de livraisons', key: 'count', sortable: true, width: '180px' },
  { title: t('Total Amount') || 'Montant total', key: 'total_amount', sortable: true, width: '150px' },
  { title: t('Actions') || 'Actions', key: 'actions', sortable: false, width: '250px' },
])

// Statistics
const totalAmountFormatted = computed(() => {
  return formatPrice(totalAmount.value)
})

// Fetch drivers to settle
const fetchDriversToSettle = async () => {
  if (!selectedDate.value) {
    return
  }

  isLoading.value = true
  try {
    console.log('🔍 Fetching drivers to settle for date:', selectedDate.value)

    const response = await $api(`/driver-payments/drivers-to-settle?date=${selectedDate.value}`, {
      method: 'GET',
    })

    console.log('📦 API Response:', response)

    // Handle response structure
    if (response?.success && response?.data) {
      driversToSettle.value = response.data.drivers || []
      totalDrivers.value = response.data.total_drivers || 0
      totalAmount.value = response.data.total_amount || 0
      console.log('✅ Data loaded:', {
        drivers: driversToSettle.value.length,
        totalDrivers: totalDrivers.value,
        totalAmount: totalAmount.value,
      })
    } else if (response?.data) {
      // Fallback if response structure is different
      driversToSettle.value = response.data.drivers || response.data || []
      totalDrivers.value = driversToSettle.value.length
      totalAmount.value = driversToSettle.value.reduce((sum, driver) => sum + (parseFloat(driver.total_amount) || 0), 0)
      console.log('✅ Data loaded (fallback):', {
        drivers: driversToSettle.value.length,
        totalDrivers: totalDrivers.value,
        totalAmount: totalAmount.value,
      })
    } else if (Array.isArray(response)) {
      // Direct array response
      driversToSettle.value = response
      totalDrivers.value = response.length
      totalAmount.value = response.reduce((sum, driver) => sum + (parseFloat(driver.total_amount) || 0), 0)
      console.log('✅ Data loaded (array):', {
        drivers: driversToSettle.value.length,
        totalDrivers: totalDrivers.value,
        totalAmount: totalAmount.value,
      })
    } else {
      driversToSettle.value = []
      totalDrivers.value = 0
      totalAmount.value = 0
      console.warn('⚠️ No data found in response')
    }
  } catch (error) {
    console.error('❌ Error fetching drivers to settle:', error)
    driversToSettle.value = []
    totalDrivers.value = 0
    totalAmount.value = 0
  } finally {
    isLoading.value = false
  }
}

// Open settlement dialog for a driver
const openSettlementDialog = driverData => {
  selectedDriverForSettlement.value = driverData
  isSettlementDialogOpen.value = true
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


// Watch for date changes and refetch
watch([selectedDate], () => {
  fetchDriversToSettle()
})

// Watch for settlement dialog close
watch(isSettlementDialogOpen, newVal => {
  if (!newVal) {
    selectedDriverForSettlement.value = null

    // Refetch data after settlement is created
    fetchDriversToSettle()
  }
})

// Load on mount
onMounted(() => {
  fetchDriversToSettle()
})
</script>

<template>
  <section>
    <!-- Header Section -->
    <VCard class="mb-6">
      <VCardItem class="pb-4">
        <VCardTitle>{{ $t('Driver Payments - Settlements') }}</VCardTitle>
        <VCardSubtitle>
          {{ $t('View drivers who need to settle their deliveries for a specific date') }}
        </VCardSubtitle>
      </VCardItem>

      <VCardText>
        <VRow class="mb-4">
          <!-- Date Selection -->
          <VCol
            cols="12"
            md="4"
          >
            <AppDateTimePicker
              v-model="selectedDate"
              :label="$t('Select Date')"
              :placeholder="$t('Select date')"
              :config="{ dateFormat: 'Y-m-d' }"
            >
              <template #prepend-inner>
                <VIcon icon="tabler-calendar" />
              </template>
            </AppDateTimePicker>
          </VCol>

          <!-- Total Drivers Summary -->
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
                    {{ $t('Total Drivers') }}
                  </div>
                  <div class="text-h4 font-weight-medium mt-1">
                    {{ totalDrivers }}
                  </div>
                </div>
                <VAvatar
                  color="info"
                  variant="tonal"
                  size="56"
                >
                  <VIcon
                    icon="tabler-users"
                    size="28"
                  />
                </VAvatar>
              </VCardText>
            </VCard>
          </VCol>

          <!-- Total Amount Summary -->
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
                    {{ $t('Total Amount to Settle') }}
                  </div>
                  <div class="text-h4 font-weight-medium mt-1">
                    {{ totalAmountFormatted }}
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
      </VCardText>
    </VCard>

    <!-- Drivers to Settle Table -->
    <VCard>
      <VCardText>
        <!-- Debug info (remove in production) -->
        <VAlert
          v-if="driversToSettle.length === 0 && !isLoading"
          type="info"
          variant="tonal"
          class="mb-4"
        >
          <div>
            <strong>Debug Info:</strong>
            <div>Date sélectionnée: {{ selectedDate }}</div>
            <div>Nombre de livreurs: {{ driversToSettle.length }}</div>
            <div>Total drivers: {{ totalDrivers }}</div>
            <div>Total amount: {{ totalAmount }}</div>
          </div>
        </VAlert>

        <VDataTable
          :headers="headers"
          :items="driversToSettle"
          :loading="isLoading"
          item-value="driver.id"
          class="text-no-wrap"
          :items-per-page="10"
          :items-per-page-options="[10, 25, 50, 100]"
        >
          <!-- Index -->
          <template #item.index="{ index }">
            <span class="text-high-emphasis font-weight-medium">
              {{ index + 1 }}
            </span>
          </template>

          <!-- Driver -->
          <template #item.driver="{ item }">
            <div class="d-flex align-center gap-2">
              <VAvatar
                size="40"
                variant="tonal"
                color="primary"
              >
                <VIcon icon="tabler-user" />
              </VAvatar>
              <div>
                <div class="text-body-1 font-weight-medium text-high-emphasis">
                  {{ item.driver?.user?.name || item.driver?.name || $t('Unknown') || 'Inconnu' }}
                </div>
                <div
                  v-if="item.driver?.user?.phone"
                  class="text-sm text-medium-emphasis mt-1"
                >
                  <VIcon
                    icon="tabler-phone"
                    size="14"
                    class="me-1"
                  />
                  {{ item.driver.user.phone }}
                </div>
              </div>
            </div>
          </template>

          <!-- Vehicle -->
          <template #item.vehicle="{ item }">
            <div v-if="item.driver?.vehicle_type || item.driver?.plate_number">
              <VChip
                size="small"
                color="secondary"
                variant="tonal"
                class="mb-1"
              >
                <VIcon
                  icon="tabler-motorbike"
                  size="14"
                  class="me-1"
                />
                {{ item.driver.vehicle_type || 'N/A' }}
              </VChip>
              <div
                v-if="item.driver?.plate_number"
                class="text-sm text-medium-emphasis mt-1"
              >
                <VIcon
                  icon="tabler-barcode"
                  size="14"
                  class="me-1"
                />
                {{ item.driver.plate_number }}
              </div>
            </div>
            <span
              v-else
              class="text-medium-emphasis"
            >
              {{ $t('N/A') || 'N/A' }}
            </span>
          </template>

          <!-- Deliveries Count -->
          <template #item.count="{ item }">
            <div class="d-flex flex-column gap-1">
              <VChip
                size="small"
                color="info"
                variant="tonal"
              >
                <VIcon
                  icon="tabler-package"
                  size="14"
                  class="me-1"
                />
                {{ item.count || item.deliveries?.length || 0 }} {{ $t('deliveries') || 'livraisons' }}
              </VChip>
              <div
                v-if="item.deliveries && item.deliveries.length > 0"
                class="text-xs text-medium-emphasis"
              >
                {{ $t('Click to view details') || 'Cliquez pour voir les détails' }}
              </div>
            </div>
          </template>

          <!-- Total Amount -->
          <template #item.total_amount="{ item }">
            <div class="d-flex flex-column">
              <span class="text-body-1 font-weight-bold text-success">
                {{ formatPrice(item.total_amount) }}
              </span>
              <span
                v-if="item.deliveries && item.deliveries.length > 0"
                class="text-xs text-medium-emphasis"
              >
                {{ $t('Expected') || 'Attendu' }}
              </span>
            </div>
          </template>

          <!-- Actions -->
          <template #item.actions="{ item }">
            <div class="d-flex gap-2">
              <VBtn
                size="small"
                color="primary"
                variant="tonal"
                prepend-icon="tabler-eye"
                @click="openSettlementDialog(item)"
              >
                {{ $t('View Details') }}
              </VBtn>
              <VBtn
                size="small"
                color="success"
                prepend-icon="tabler-cash"
                @click="openSettlementDialog(item)"
              >
                {{ $t('Create Settlement') }}
              </VBtn>
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
                {{ $t('No drivers to settle') }}
              </h6>
              <p class="text-medium-emphasis">
                {{ $t('No drivers have deliveries to settle for the selected date.') }}
              </p>
            </div>
          </template>
        </VDataTable>
      </VCardText>
    </VCard>

    <!-- Settlement Dialog -->
    <SettlementAddDialog
      v-model:is-dialog-visible="isSettlementDialogOpen"
      :driver-data="selectedDriverForSettlement"
      :payment-date="selectedDate"
      @settlement-created="fetchDriversToSettle"
    />
  </section>
</template>
