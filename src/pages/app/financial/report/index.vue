<script setup>
/* eslint-disable camelcase */
import { useI18n } from 'vue-i18n'
import FinancialExpenseBreakdownChart from '@/components/charts/FinancialExpenseBreakdownChart.vue'
import FinancialRevenueVsExpensesChart from '@/components/charts/FinancialRevenueVsExpensesChart.vue'
import { useFinancialReports } from '@/composables/useFinancialReports'

const { t } = useI18n()

const {
  period,
  dateFrom,
  dateTo,
  financialSummary,
  driverStats,
  expenseBreakdown,
  revenueTrend,
  isLoading,
  fetchFinancialReport,
} = useFinancialReports()

// Period options
const periodOptions = computed(() => [
  { title: t('Today'), value: 'today' },
  { title: t('This Week'), value: 'week' },
  { title: t('This Month'), value: 'month' },
  { title: t('This Year'), value: 'year' },
  { title: t('Custom Range'), value: 'custom' },
])

// Table headers
const tableHeaders = computed(() => [
  { title: t('Driver'), key: 'driver' },
  { title: t('Deliveries'), key: 'deliveries' },
  { title: t('Revenue'), key: 'revenue' },
  { title: t('Expenses'), key: 'expenses' },
  { title: t('Net Profit'), key: 'profit' },
  { title: t('Profit Margin'), key: 'margin' },
])

// Format price helper
const formatPrice = value => {
  if (value == null) return '—'
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

// Export function
const exportReport = async () => {
  try {
    const queryParams = new URLSearchParams({
      period: period.value,
      ...(dateFrom.value && { date_from: dateFrom.value }),
      ...(dateTo.value && { date_to: dateTo.value }),
    })

    const response = await $api(`/financial/reports/export?${queryParams}`, {
      method: 'GET',
    })

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response]))
    const link = document.createElement('a')

    link.href = url
    link.setAttribute('download', `financial-report-${new Date().toISOString().slice(0, 10)}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    console.error('Error exporting report:', error)
  }
}

// Watch period changes
watch(period, newPeriod => {
  if (newPeriod !== 'custom') {
    dateFrom.value = null
    dateTo.value = null
  }
  fetchFinancialReport()
})

watch([dateFrom, dateTo], () => {
  if (period.value === 'custom') {
    fetchFinancialReport()
  }
})

// Load on mount
onMounted(() => {
  fetchFinancialReport()
})
</script>

<template>
  <section>
    <!-- Header Section -->
    <VCard class="mb-6">
      <VCardItem class="pb-4">
        <div class="d-flex justify-space-between align-center flex-wrap">
          <div>
            <VCardTitle>{{ $t('Financial Reports') }}</VCardTitle>
            <VCardSubtitle>
              {{ $t('Comprehensive financial analysis and reporting') }}
            </VCardSubtitle>
          </div>
          <VBtn
            color="primary"
            prepend-icon="tabler-download"
            @click="exportReport"
          >
            {{ $t('Export Report') }}
          </VBtn>
        </div>
      </VCardItem>

      <VCardText>
        <VRow>
          <!-- Period Selection -->
          <VCol
            cols="12"
            md="4"
          >
            <AppSelect
              v-model="period"
              :items="periodOptions"
              :label="$t('Period')"
              :placeholder="$t('Select period')"
            />
          </VCol>

          <!-- Custom Date Range -->
          <template v-if="period === 'custom'">
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

    <!-- Financial Summary Cards -->
    <VRow
      v-if="financialSummary"
      class="match-height mb-6"
    >
      <!-- Total Revenue -->
      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard>
          <VCardText class="d-flex align-center justify-space-between">
            <div>
              <div class="text-sm text-medium-emphasis">
                {{ $t('Total Revenue') }}
              </div>
              <div class="text-h4 font-weight-medium mt-1 text-success">
                {{ formatPrice(financialSummary.totalRevenue) }}
              </div>
              <div class="text-xs text-success mt-1">
                <VIcon
                  icon="tabler-trending-up"
                  size="14"
                />
                {{ $t('From deliveries') }}
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

      <!-- Total Expenses -->
      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard>
          <VCardText class="d-flex align-center justify-space-between">
            <div>
              <div class="text-sm text-medium-emphasis">
                {{ $t('Total Expenses') }}
              </div>
              <div class="text-h4 font-weight-medium mt-1 text-error">
                {{ formatPrice(financialSummary.totalExpenses) }}
              </div>
              <div class="text-xs text-error mt-1">
                <VIcon
                  icon="tabler-trending-down"
                  size="14"
                />
                {{ $t('Driver expenses') }}
              </div>
            </div>
            <VAvatar
              color="error"
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

      <!-- Net Profit -->
      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard>
          <VCardText class="d-flex align-center justify-space-between">
            <div>
              <div class="text-sm text-medium-emphasis">
                {{ $t('Net Profit') }}
              </div>
              <div
                class="text-h4 font-weight-medium mt-1"
                :class="financialSummary.netProfit >= 0 ? 'text-success' : 'text-error'"
              >
                {{ formatPrice(financialSummary.netProfit) }}
              </div>
              <div
                class="text-xs mt-1"
                :class="financialSummary.netProfit >= 0 ? 'text-success' : 'text-error'"
              >
                <VIcon
                  :icon="financialSummary.netProfit >= 0 ? 'tabler-trending-up' : 'tabler-trending-down'"
                  size="14"
                />
                {{ $t('Revenue - Expenses') }}
              </div>
            </div>
            <VAvatar
              :color="financialSummary.netProfit >= 0 ? 'success' : 'error'"
              variant="tonal"
              size="56"
            >
              <VIcon
                icon="tabler-chart-line"
                size="28"
              />
            </VAvatar>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Profit Margin -->
      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard>
          <VCardText class="d-flex align-center justify-space-between">
            <div>
              <div class="text-sm text-medium-emphasis">
                {{ $t('Profit Margin') }}
              </div>
              <div
                class="text-h4 font-weight-medium mt-1"
                :class="financialSummary.profitMargin >= 0 ? 'text-success' : 'text-error'"
              >
                {{ financialSummary.profitMargin.toFixed(1) }}%
              </div>
              <div class="text-xs text-medium-emphasis mt-1">
                {{ $t('Percentage') }}
              </div>
            </div>
            <VAvatar
              color="info"
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
    </VRow>

    <!-- Charts Row -->
    <VRow class="mb-6">
      <!-- Revenue vs Expenses Chart -->
      <VCol
        cols="12"
        md="6"
      >
        <VCard>
          <VCardItem>
            <VCardTitle>{{ $t('Revenue vs Expenses') }}</VCardTitle>
            <VCardSubtitle>
              {{ $t('Comparison over selected period') }}
            </VCardSubtitle>
          </VCardItem>
          <VCardText>
            <FinancialRevenueVsExpensesChart :data="revenueTrend" />
          </VCardText>
        </VCard>
      </VCol>

      <!-- Expense Breakdown Chart -->
      <VCol
        cols="12"
        md="6"
      >
        <VCard>
          <VCardItem>
            <VCardTitle>{{ $t('Expense Breakdown') }}</VCardTitle>
            <VCardSubtitle>
              {{ $t('Expenses by type') }}
            </VCardSubtitle>
          </VCardItem>
          <VCardText>
            <FinancialExpenseBreakdownChart :data="expenseBreakdown" />
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Driver Statistics -->
    <VCard class="mb-6">
      <VCardItem>
        <VCardTitle>{{ $t('Driver Performance') }}</VCardTitle>
        <VCardSubtitle>
          {{ $t('Revenue and expenses by driver') }}
        </VCardSubtitle>
      </VCardItem>
      <VCardText>
        <VDataTable
          :headers="tableHeaders"
          :items="driverStats"
          :loading="isLoading"
          class="text-no-wrap"
        >
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
                  {{ item.driver?.name || $t('Unknown') }}
                </div>
                <div class="text-sm text-medium-emphasis">
                  {{ item.driver?.vehicle_type || $t('N/A') }}
                </div>
              </div>
            </div>
          </template>

          <template #item.deliveries="{ item }">
            <span class="text-body-1 font-weight-medium">
              {{ item.deliveriesCount || 0 }}
            </span>
          </template>

          <template #item.revenue="{ item }">
            <span class="text-body-1 font-weight-medium text-success">
              {{ formatPrice(item.revenue) }}
            </span>
          </template>

          <template #item.expenses="{ item }">
            <span class="text-body-1 font-weight-medium text-error">
              {{ formatPrice(item.expenses) }}
            </span>
          </template>

          <template #item.profit="{ item }">
            <span
              class="text-body-1 font-weight-medium"
              :class="item.profit >= 0 ? 'text-success' : 'text-error'"
            >
              {{ formatPrice(item.profit) }}
            </span>
          </template>

          <template #item.margin="{ item }">
            <VChip
              size="small"
              :color="item.margin >= 0 ? 'success' : 'error'"
              variant="tonal"
            >
              {{ item.margin.toFixed(1) }}%
            </VChip>
          </template>

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
      </VCardText>
    </VCard>

    <!-- Detailed Breakdown -->
    <VRow>
      <!-- Revenue Details -->
      <VCol
        cols="12"
        md="6"
      >
        <VCard>
          <VCardItem>
            <VCardTitle>{{ $t('Revenue Details') }}</VCardTitle>
          </VCardItem>
          <VCardText>
            <div class="d-flex flex-column gap-4">
              <div class="d-flex justify-space-between align-center">
                <div>
                  <div class="text-body-1 font-weight-medium">
                    {{ $t('Completed Deliveries') }}
                  </div>
                  <div class="text-sm text-medium-emphasis">
                    {{ financialSummary?.completedDeliveries || 0 }} {{ $t('deliveries') }}
                  </div>
                </div>
                <span class="text-h6 text-success">
                  {{ formatPrice(financialSummary?.revenueFromDeliveries || 0) }}
                </span>
              </div>

              <VDivider />

              <div class="d-flex justify-space-between align-center">
                <div>
                  <div class="text-body-1 font-weight-medium">
                    {{ $t('Average per Delivery') }}
                  </div>
                  <div class="text-sm text-medium-emphasis">
                    {{ $t('Per completed delivery') }}
                  </div>
                </div>
                <span class="text-h6">
                  {{ formatPrice(financialSummary?.averageRevenuePerDelivery || 0) }}
                </span>
              </div>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Expense Details -->
      <VCol
        cols="12"
        md="6"
      >
        <VCard>
          <VCardItem>
            <VCardTitle>{{ $t('Expense Details') }}</VCardTitle>
          </VCardItem>
          <VCardText>
            <div class="d-flex flex-column gap-4">
              <div
                v-for="(expense, index) in expenseBreakdown"
                :key="index"
                class="d-flex justify-space-between align-center"
              >
                <div class="d-flex align-center gap-2">
                  <VChip
                    size="small"
                    :color="expense.color"
                    variant="tonal"
                  >
                    <VIcon
                      :icon="expense.icon"
                      size="14"
                      class="me-1"
                    />
                    {{ expense.type }}
                  </VChip>
                  <div class="text-sm text-medium-emphasis">
                    {{ expense.count }} {{ $t('transactions') }}
                  </div>
                </div>
                <span class="text-h6 text-error">
                  {{ formatPrice(expense.amount) }}
                </span>
              </div>

              <VDivider v-if="expenseBreakdown.length > 0" />

              <div class="d-flex justify-space-between align-center">
                <div>
                  <div class="text-body-1 font-weight-medium">
                    {{ $t('Average per Transaction') }}
                  </div>
                  <div class="text-sm text-medium-emphasis">
                    {{ $t('Per expense transaction') }}
                  </div>
                </div>
                <span class="text-h6">
                  {{ formatPrice(financialSummary?.averageExpensePerTransaction || 0) }}
                </span>
              </div>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </section>
</template>
