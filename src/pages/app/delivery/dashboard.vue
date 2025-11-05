<script setup>
import LogisticsCardStatistics from '@/views/apps/logistics/LogisticsCardStatistics.vue'
import LogisticsDeliveryExpectations from '@/views/apps/logistics/LogisticsDeliveryExpectations.vue'
import LogisticsDeliveryPerformance from '@/views/apps/logistics/LogisticsDeliveryPerformance.vue'
import LogisticsOrderByCountries from '@/views/apps/logistics/LogisticsOrderByCountries.vue'
import LogisticsOverviewTable from '@/views/apps/logistics/LogisticsOverviewTable.vue'
import LogisticsShipmentStatistics from '@/views/apps/logistics/LogisticsShipmentStatistics.vue'
import LogisticsVehicleOverview from '@/views/apps/logistics/LogisticsVehicleOverview.vue'
import { useI18n } from 'vue-i18n'

definePage({
  meta: {
    action: 'view',
    subject: 'deliveries',
  },
})

const { t } = useI18n()

const kpis = computed(() => [
  { title: t('Available Drivers'), value: '0', icon: 'tabler-user-check', color: 'success' },
  { title: t('Busy Drivers'), value: '0', icon: 'tabler-user', color: 'warning' },
  { title: t('Requests Today'), value: '0', icon: 'tabler-message-2', color: 'primary' },
  { title: t('Avg. Assignment Time'), value: '0m 00s', icon: 'tabler-clock', color: 'info' },
])
</script>

<template>
  <VRow class="match-height">
    <!-- KPI cards -->
    <template
      v-for="(kpi, i) in kpis"
      :key="i"
    >
      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard>
          <VCardText class="d-flex align-center justify-space-between">
            <div>
              <div class="text-sm text-medium-emphasis">
                {{ kpi.title }}
              </div>
              <div class="text-h4 font-weight-medium mt-1">
                {{ kpi.value }}
              </div>
            </div>
            <VAvatar
              :color="kpi.color"
              variant="tonal"
            >
              <VIcon :icon="kpi.icon" />
            </VAvatar>
          </VCardText>
        </VCard>
      </VCol>
    </template>

    <!-- Status distribution / trends -->
    <VCol
      cols="12"
      md="6"
    >
      <VCard :title="$t('Assignments Trend')">
        <VCardText>
          <LogisticsShipmentStatistics />
        </VCardText>
      </VCard>
    </VCol>

    <VCol
      cols="12"
      md="6"
    >
      <VCard :title="$t('Drivers by Vehicle Type')">
        <VCardText>
          <LogisticsVehicleOverview />
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12">
      <LogisticsCardStatistics />
    </VCol>

    <VCol
      cols="12"
      md="4"
    >
      <LogisticsDeliveryPerformance />
    </VCol>

    <VCol
      cols="12"
      md="4"
    >
      <LogisticsDeliveryExpectations />
    </VCol>

    <VCol
      cols="12"
      md="4"
    >
      <LogisticsOrderByCountries />
    </VCol>

    <VCol cols="12">
      <LogisticsOverviewTable />
    </VCol>
  </VRow>
</template>
