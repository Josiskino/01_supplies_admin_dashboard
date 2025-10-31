<script setup>
import LogisticsShipmentStatistics from '@/views/apps/logistics/LogisticsShipmentStatistics.vue'
import LogisticsVehicleOverview from '@/views/apps/logistics/LogisticsVehicleOverview.vue'

const kpis = [
  { title: 'Available Drivers', value: '0', icon: 'tabler-user-check', color: 'success' },
  { title: 'Busy Drivers', value: '0', icon: 'tabler-user', color: 'warning' },
  { title: 'Requests Today', value: '0', icon: 'tabler-message-2', color: 'primary' },
  { title: 'Avg. Assignment Time', value: '0m 00s', icon: 'tabler-clock', color: 'info' },
]
</script>

<template>
  <VRow class="match-height">
    <!-- KPI cards -->
    <template v-for="(kpi, i) in kpis" :key="i">
      <VCol cols="12" sm="6" md="3">
        <VCard>
          <VCardText class="d-flex align-center justify-space-between">
            <div>
              <div class="text-sm text-medium-emphasis">{{ kpi.title }}</div>
              <div class="text-h4 font-weight-medium mt-1">{{ kpi.value }}</div>
            </div>
            <VAvatar :color="kpi.color" variant="tonal">
              <VIcon :icon="kpi.icon" />
            </VAvatar>
          </VCardText>
        </VCard>
      </VCol>
    </template>

    <!-- Status distribution / trends -->
    <VCol cols="12" md="6">
      <VCard title="Assignments Trend">
        <VCardText>
          <LogisticsShipmentStatistics />
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12" md="6">
      <VCard title="Drivers by Vehicle Type">
        <VCardText>
          <LogisticsVehicleOverview />
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>
