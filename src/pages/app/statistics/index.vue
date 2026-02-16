<script setup>
/* eslint-disable camelcase */
import StatsTopZonesChart from '@/components/charts/StatsTopZonesChart.vue'
import { useBusinessDeveloperStats } from '@/composables/useBusinessDeveloperStats'
import { exportToExcel } from '@/utils/export'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const {
  filter,
  dateFrom,
  dateTo,
  driverId,
  isLoading,
  topConsumers,
  topZones,
  period,
  fetchStats,
} = useBusinessDeveloperStats()

// Drivers list for dropdown
const drivers = ref([])
const isLoadingDrivers = ref(false)

const fetchDrivers = async () => {
  isLoadingDrivers.value = true
  try {
    const response = await $api('/drivers?per_page=100', { method: 'GET' })
    const driversList = response?.data || response || []
    
    drivers.value = driversList.map(driver => ({
      title: driver.user?.name || `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || t('N/A'),
      value: driver.id,
    }))
  } catch (error) {
    console.error('Error fetching drivers:', error)
  } finally {
    isLoadingDrivers.value = false
  }
}

// Period options
const periodOptions = computed(() => [
  { title: t('Today'), value: 'day' },
  { title: t('This Week'), value: 'week' },
  { title: t('This Month'), value: 'month' },
  { title: t('Custom Range'), value: 'custom' },
])

// Table headers for Consumers
const consumerHeaders = computed(() => [
  { title: t('Type'), key: 'type' },
  { title: t('Name'), key: 'name' },
  { title: t('Total Orders'), key: 'total_orders' },
  { title: t('Total Revenue'), key: 'total_revenue' },
])

// Format price helper
const formatPrice = value => {
  if (value == null) return '—'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

const resolveConsumerType = type => {
  if (type === 'partner') return { label: t('Partner'), color: 'primary' }
  if (type === 'customer') return { label: t('Customer'), color: 'success' }
  return { label: type, color: 'secondary' }
}

onMounted(() => {
  fetchStats()
  fetchDrivers()
})

const isExporting = ref(false)

const exportStats = () => {
  isExporting.value = true
  try {
    const headerMap = {
      'type': t('Type'),
      'name': t('Name'),
      'total_orders': t('Total Orders'),
      'total_revenue': t('Total Revenue'),
    }

    exportToExcel(topConsumers.value, 'Top_Consumers_Stats', headerMap)
  } catch (error) {
    console.error('Error exporting stats:', error)
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <section>
    <!-- Header & Filters -->
    <VCard class="mb-6">
      <VCardItem class="pb-4">
        <VCardTitle>{{ $t('Business Developer Statistics') }}</VCardTitle>
        <VCardSubtitle v-if="period.from">
          {{ $t('Period') }}: {{ period.from }} {{ $t('to') }} {{ period.to }}
        </VCardSubtitle>
      </VCardItem>

      <VCardText>
        <VRow>
          <!-- Period Selector -->
          <VCol
            cols="12"
            md="3"
          >
            <AppSelect
              v-model="filter"
              :items="periodOptions"
              :label="$t('Period')"
              density="compact"
            />
          </VCol>

          <!-- Driver Selector -->
          <VCol
            cols="12"
            md="3"
          >
            <AppSelect
              v-model="driverId"
              :items="drivers"
              :label="$t('Driver')"
              :placeholder="$t('Select Driver')"
              :loading="isLoadingDrivers"
              clearable
              density="compact"
            />
          </VCol>

          <!-- Custom Dates -->
          <template v-if="filter === 'custom'">
            <VCol
              cols="12"
              md="3"
            >
              <AppDateTimePicker
                v-model="dateFrom"
                :label="$t('Date From')"
                :placeholder="$t('Select start date')"
                :config="{ dateFormat: 'Y-m-d' }"
                density="compact"
              />
            </VCol>
            <VCol
              cols="12"
              md="3"
            >
              <AppDateTimePicker
                v-model="dateTo"
                :label="$t('Date To')"
                :placeholder="$t('Select end date')"
                :config="{ dateFormat: 'Y-m-d' }"
                density="compact"
              />
            </VCol>
          </template>
        </VRow>
      </VCardText>
    </VCard>

    <VRow>
      <!-- Top Consumers Table -->
      <VCol
        cols="12"
        md="7"
      >
        <VCard>
          <VCardItem class="d-flex align-center flex-wrap gap-2">
            <VCardTitle>{{ $t('Top Consumers') }}</VCardTitle>
            <VSpacer />
            <VBtn
              variant="tonal"
              color="secondary"
              prepend-icon="tabler-file-spreadsheet"
              density="compact"
              :loading="isExporting"
              @click="exportStats"
            >
              {{ $t('Export Excel') }}
            </VBtn>
          </VCardItem>
          <VCardText>
            <VDataTable
              :headers="consumerHeaders"
              :items="topConsumers"
              :loading="isLoading"
              hide-default-footer
              class="text-no-wrap"
            >
              <template #item.type="{ item }">
                <VChip
                  size="small"
                  :color="resolveConsumerType(item.type).color"
                  variant="tonal"
                  label
                >
                  {{ resolveConsumerType(item.type).label }}
                </VChip>
              </template>
              <template #item.total_orders="{ item }">
                <span class="font-weight-medium">{{ item.total_orders }}</span>
              </template>
              <template #item.total_revenue="{ item }">
                <span class="text-success font-weight-medium">
                  {{ formatPrice(item.total_revenue) }}
                </span>
              </template>
              
              <template #no-data>
                <div class="text-center py-4">
                  {{ $t('No data available') }}
                </div>
              </template>
            </VDataTable>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Top Zones Chart -->
      <VCol
        cols="12"
        md="5"
      >
        <VCard>
          <VCardItem>
            <VCardTitle>{{ $t('Top Zones') }}</VCardTitle>
          </VCardItem>
          <VCardText>
            <StatsTopZonesChart
              v-if="topZones.length"
              :data="topZones"
            />
            <div
              v-else
              class="d-flex align-center justify-center py-12"
            >
              <div class="text-center">
                <VIcon
                  icon="tabler-chart-bar-off"
                  size="48"
                  color="disabled"
                  class="mb-2"
                />
                <div class="text-disabled">
                  {{ $t('No data available') }}
                </div>
              </div>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </section>
</template>
