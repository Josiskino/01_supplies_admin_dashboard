<script setup>
/* eslint-disable camelcase */
import { useI18n } from 'vue-i18n'
import SettlementAddDialog from './settlement-add.vue'

const { t } = useI18n()

const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['update:isDialogVisible', 'settlementCreated'])

const dialogVisible = computed({
  get: () => props.isDialogVisible,
  set: val => emit('update:isDialogVisible', val),
})

const selectedDate = ref(new Date().toISOString().slice(0, 10))
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
  { title: t('Driver') || 'Livreur', key: 'driver', sortable: false },
  { title: t('Deliveries Count') || 'Nombre de livraisons', key: 'count', sortable: true },
  { title: t('Total Amount') || 'Montant total', key: 'total_amount', sortable: true },
  { title: t('Actions') || 'Actions', key: 'actions', sortable: false },
])

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

// Fetch drivers to settle
const fetchDriversToSettle = async () => {
  if (!selectedDate.value) {
    return
  }

  isLoading.value = true
  try {
    const response = await $api(`/driver-payments/drivers-to-settle?date=${selectedDate.value}`, {
      method: 'GET',
    })

    if (response?.success && response?.data) {
      driversToSettle.value = response.data.drivers || []
      totalDrivers.value = response.data.total_drivers || 0
      totalAmount.value = response.data.total_amount || 0
    } else if (response?.data) {
      driversToSettle.value = response.data.drivers || response.data || []
      totalDrivers.value = driversToSettle.value.length
      totalAmount.value = driversToSettle.value.reduce((sum, driver) => sum + (parseFloat(driver.total_amount || driver.unpaid_deliveries_count) || 0), 0)
    } else if (Array.isArray(response)) {
      driversToSettle.value = response
      totalDrivers.value = response.length
      totalAmount.value = response.reduce((sum, driver) => sum + (parseFloat(driver.total_amount) || 0), 0)
    } else {
      driversToSettle.value = []
      totalDrivers.value = 0
      totalAmount.value = 0
    }
  } catch (error) {
    console.error('Error fetching drivers to settle:', error)
    driversToSettle.value = []
    totalDrivers.value = 0
    totalAmount.value = 0
  } finally {
    isLoading.value = false
  }
}

// Open settlement dialog for a driver
const openSettlementDialog = driverData => {
  // Normalize driverData structure for settlement-add component
  // Convert { driver_id, driver_name, ... } to { driver: { id, ... } }
  if (driverData.driver_id && !driverData.driver) {
    selectedDriverForSettlement.value = {
      driver: {
        id: driverData.driver_id,
        name: driverData.driver_name,
        phone: driverData.driver_phone,
      },
      driver_id: driverData.driver_id,
      driver_name: driverData.driver_name,
      driver_phone: driverData.driver_phone,
      unpaid_deliveries_count: driverData.unpaid_deliveries_count,
      total_amount: driverData.total_amount,
    }
  } else {
    selectedDriverForSettlement.value = driverData
  }
  isSettlementDialogOpen.value = true
}

// Watch for date changes
watch([selectedDate], () => {
  if (dialogVisible.value) {
    fetchDriversToSettle()
  }
})

// Watch for dialog open - reset date to today and fetch data
watch(dialogVisible, newVal => {
  if (newVal) {
    // Reset date to today's date
    selectedDate.value = new Date().toISOString().slice(0, 10)
    // Fetch drivers to settle with today's date
    fetchDriversToSettle()
  }
})

// Watch for settlement created
watch(isSettlementDialogOpen, newVal => {
  if (!newVal) {
    selectedDriverForSettlement.value = null
    fetchDriversToSettle()
    emit('settlementCreated')
  }
})
</script>

<template>
  <VDialog
    :width="$vuetify.display.smAndDown ? 'auto' : 1000"
    :model-value="dialogVisible"
    @update:model-value="val => dialogVisible = val"
    scrollable
  >
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="dialogVisible = false" />

    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>{{ $t('Drivers to Settle') || 'Livreurs à régler' }}</span>
      </VCardTitle>

      <VDivider />

      <VCardText>
        <!-- Date Selection -->
        <VRow class="mb-4">
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

          <VCol
            cols="12"
            md="4"
          >
            <VCard
              color="info"
              variant="tonal"
            >
              <VCardText>
                <div class="text-sm text-medium-emphasis">
                  {{ $t('Total Drivers') }}
                </div>
                <div class="text-h5 font-weight-medium">
                  {{ totalDrivers }}
                </div>
              </VCardText>
            </VCard>
          </VCol>

          <VCol
            cols="12"
            md="4"
          >
            <VCard
              color="success"
              variant="tonal"
            >
              <VCardText>
                <div class="text-sm text-medium-emphasis">
                  {{ $t('Total Amount to Settle') }}
                </div>
                <div class="text-h5 font-weight-medium">
                  {{ formatPrice(totalAmount) }}
                </div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>

        <!-- Drivers Table -->
        <VDataTable
          :headers="headers"
          :items="driversToSettle"
          :loading="isLoading"
          item-value="driver_id"
          class="text-no-wrap"
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
                size="32"
                variant="tonal"
                color="primary"
              >
                <VIcon icon="tabler-user" />
              </VAvatar>
              <div>
                <div class="text-body-1 font-weight-medium">
                  {{ item.driver_name || item.driver?.user?.name || item.driver?.name || $t('Unknown') || 'Inconnu' }}
                </div>
                <div
                  v-if="item.driver_phone || item.driver?.phone || item.driver?.user?.phone"
                  class="text-sm text-medium-emphasis"
                >
                  {{ item.driver_phone || item.driver?.phone || item.driver?.user?.phone }}
                </div>
              </div>
            </div>
          </template>

          <!-- Deliveries Count -->
          <template #item.count="{ item }">
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
              {{ item.unpaid_deliveries_count || item.count || item.deliveries?.length || 0 }} {{ $t('deliveries') || 'livraisons' }}
            </VChip>
          </template>

          <!-- Total Amount -->
          <template #item.total_amount="{ item }">
            <span class="text-body-1 font-weight-bold text-success">
              {{ formatPrice(item.total_amount) }}
            </span>
          </template>

          <!-- Actions -->
          <template #item.actions="{ item }">
            <VBtn
              size="small"
              color="success"
              prepend-icon="tabler-cash"
              @click="openSettlementDialog(item)"
            >
              {{ $t('Create Settlement') }}
            </VBtn>
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

    <!-- Settlement Add Dialog -->
    <SettlementAddDialog
      v-model:is-dialog-visible="isSettlementDialogOpen"
      :driver-data="selectedDriverForSettlement"
      :payment-date="selectedDate"
      @settlement-created="() => { emit('settlementCreated'); dialogVisible = false }"
    />
  </VDialog>
</template>

