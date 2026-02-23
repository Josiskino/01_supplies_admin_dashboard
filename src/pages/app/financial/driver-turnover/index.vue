<script setup>
import { useDriverTurnover } from '@/composables/useDriverTurnover'
import { exportToExcel } from '@/utils/export'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const {
  filter,
  dateFrom,
  dateTo,
  isLoading,
  report,
  period,
  totalGlobalTurnover,
  totalGlobalCommission,
  totalGlobalDeliveries,
  fetchDriverTurnover,
} = useDriverTurnover()

// Filter options
const filterOptions = computed(() => [
  { title: t('Today'), value: 'day' },
  { title: t('This Week'), value: 'week' },
  { title: t('This Month'), value: 'month' },
  { title: t('Custom Range'), value: 'custom' },
])

// Table headers
const tableHeaders = [
  { title: t('Driver'), key: 'driver_name' },
  { title: t('Deliveries Count'), key: 'deliveries_count', align: 'center' },
  { title: t('Settlements Count'), key: 'settlements_count', align: 'center' },
  { title: t('Total Global Turnover'), key: 'total_turnover', align: 'end' },
  { title: t('Commission (30%)'), key: 'commission_amount', align: 'end' },
]

// Format price helper
const formatPrice = value => {
  if (value == null) return '—'
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0,
    }).format(Number(value))
  } catch {
    return String(value)
  }
}

// Export to Excel
const isExportingExcel = ref(false)

const exportToExcelReport = () => {
  isExportingExcel.value = true
  try {
    const headerMap = {
      'driver_name': t('Driver'),
      'deliveries_count': t('Deliveries Count'),
      'settlements_count': t('Settlements Count'),
      'total_turnover': t('Total Global Turnover'),
      'commission_amount': t('Commission (30%)'),
    }

    exportToExcel(report.value, 'Driver_Turnover_Report', headerMap)
  } catch (error) {
    console.error('Error exporting to excel:', error)
  } finally {
    isExportingExcel.value = false
  }
}

// Watch filters
watch(filter, newFilter => {
  if (newFilter !== 'custom') {
    dateFrom.value = null
    dateTo.value = null
    fetchDriverTurnover()
  }
})

watch([dateFrom, dateTo], () => {
  if (filter.value === 'custom' && dateFrom.value && dateTo.value) {
    fetchDriverTurnover()
  }
})

// Load on mount
onMounted(() => {
  fetchDriverTurnover()
})
</script>

<template>
  <section>
    <!-- Header Section -->
    <VCard class="mb-6">
      <VCardItem class="pb-4">
        <div class="d-flex justify-space-between align-center flex-wrap">
          <div>
            <VCardTitle>{{ $t('Driver Turnover') }}</VCardTitle>
            <VCardSubtitle>
              {{ $t('Monthly revenue and commission report for drivers') }}
            </VCardSubtitle>
          </div>
          <div class="d-flex gap-2">
            <VBtn
              color="secondary"
              variant="tonal"
              prepend-icon="tabler-file-spreadsheet"
              @click="exportToExcelReport"
              :loading="isExportingExcel"
              :disabled="!report.length"
            >
              {{ $t('Excel') }}
            </VBtn>
          </div>
        </div>
      </VCardItem>

      <VCardText>
        <VRow>
          <VCol
            cols="12"
            md="4"
          >
            <AppSelect
              v-model="filter"
              :items="filterOptions"
              :label="$t('Period')"
              :placeholder="$t('Select period')"
            />
          </VCol>

          <template v-if="filter === 'custom'">
            <VCol
              cols="12"
              md="4"
            >
              <AppDateTimePicker
                v-model="dateFrom"
                :label="$t('Date From')"
                :placeholder="$t('Select start date')"
                :config="{ dateFormat: 'Y-m-d' }"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <AppDateTimePicker
                v-model="dateTo"
                :label="$t('Date To')"
                :placeholder="$t('Select end date')"
                :config="{ dateFormat: 'Y-m-d' }"
              />
            </VCol>
          </template>
        </VRow>
      </VCardText>
    </VCard>

    <!-- Summary Cards -->
    <VRow class="match-height mb-6">
      <VCol
        cols="12"
        sm="6"
        md="4"
      >
        <VCard>
          <VCardText class="d-flex align-center justify-space-between">
            <div>
              <div class="text-sm text-medium-emphasis">
                {{ $t('Total Global Turnover') }}
              </div>
              <div class="text-h4 font-weight-medium mt-1 text-primary">
                {{ formatPrice(totalGlobalTurnover) }}
              </div>
              <div class="text-xs text-medium-emphasis mt-1">
                {{ $t('Period') }}: {{ period.from }} - {{ period.to }}
              </div>
            </div>
            <VAvatar
              color="primary"
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

      <VCol
        cols="12"
        sm="6"
        md="4"
      >
        <VCard>
          <VCardText class="d-flex align-center justify-space-between">
            <div>
              <div class="text-sm text-medium-emphasis">
                {{ $t('Total Global Commission') }}
              </div>
              <div class="text-h4 font-weight-medium mt-1 text-success">
                {{ formatPrice(totalGlobalCommission) }}
              </div>
              <div class="text-xs text-success mt-1">
                <VIcon
                  icon="tabler-trending-up"
                  size="14"
                />
                {{ $t('Commission (30%)') }}
              </div>
            </div>
            <VAvatar
              color="success"
              variant="tonal"
              size="56"
            >
              <VIcon
                icon="tabler-percentage"
                size="28"
              />
            </VAvatar>
          </VCardText>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        sm="6"
        md="4"
      >
        <VCard>
          <VCardText class="d-flex align-center justify-space-between">
            <div>
              <div class="text-sm text-medium-emphasis">
                {{ $t('Total Global Deliveries') }}
              </div>
              <div class="text-h4 font-weight-medium mt-1 text-info">
                {{ totalGlobalDeliveries }}
              </div>
              <div class="text-xs text-info mt-1">
                <VIcon
                  icon="tabler-truck-delivery"
                  size="14"
                />
                {{ $t('Deliveries') }}
              </div>
            </div>
            <VAvatar
              color="info"
              variant="tonal"
              size="56"
            >
              <VIcon
                icon="tabler-truck"
                size="28"
              />
            </VAvatar>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Data Table -->
    <VCard>
      <VDataTable
        :headers="tableHeaders"
        :items="report"
        :loading="isLoading"
        class="text-no-wrap"
      >
        <!-- Driver Column -->
        <template #item.driver_name="{ item }">
          <div class="d-flex align-center gap-2">
            <VAvatar
              size="32"
              variant="tonal"
              color="primary"
            >
              <VIcon icon="tabler-user" />
            </VAvatar>
            <span class="text-body-1 font-weight-medium">{{ item.driver_name }}</span>
          </div>
        </template>

        <!-- Deliveries Column -->
        <template #item.deliveries_count="{ item }">
          <VChip
            color="info"
            variant="tonal"
            size="small"
            class="font-weight-bold"
          >
            {{ item.deliveries_count }}
          </VChip>
        </template>

        <!-- Settlements Column -->
        <template #item.settlements_count="{ item }">
          <VChip
            color="warning"
            variant="tonal"
            size="small"
            class="font-weight-bold"
          >
            {{ item.settlements_count }}
          </VChip>
        </template>

        <!-- Turnover Column -->
        <template #item.total_turnover="{ item }">
          <span class="text-body-1 font-weight-medium">{{ formatPrice(item.total_turnover) }}</span>
        </template>

        <!-- Commission Column -->
        <template #item.commission_amount="{ item }">
          <VChip
            color="success"
            variant="tonal"
            size="small"
            class="font-weight-bold"
          >
            {{ formatPrice(item.commission_amount) }}
          </VChip>
        </template>

        <!-- No Data -->
        <template #no-data>
          <div class="text-center py-8">
            <VIcon
              icon="tabler-inbox"
              size="48"
              color="secondary"
              class="mb-4"
            />
            <h6 class="text-h6 mb-2">
              {{ $t('No data available') }}
            </h6>
          </div>
        </template>
      </VDataTable>
    </VCard>
  </section>
</template>
