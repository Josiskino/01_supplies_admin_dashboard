<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useTheme } from 'vuetify'
import { hexToRgb } from '@layouts/utils'
import PeriodFilter from '@/components/analytics/PeriodFilter.vue'
import KpiCard from '@/components/analytics/KpiCard.vue'
import TopCustomersTable from '@/components/analytics/TopCustomersTable.vue'
import TopPartnersTable from '@/components/analytics/TopPartnersTable.vue'
import ChurnList from '@/components/analytics/ChurnList.vue'
import VariabilityList from '@/components/analytics/VariabilityList.vue'
import DownloadButton from '@/components/common/DownloadButton.vue'
import { useAnalytics } from '@/composables/useAnalytics'
import VueApexCharts from 'vue3-apexcharts'

const vuetifyTheme = useTheme()

definePage({
  meta: {
    action: 'view',
    subject: 'analytics',
  },
})

const activeTab = ref('overview')

const periodValue = ref({ period: 'this_month', date_from: null, date_to: null })

const periodParams = computed(() => {
  const p = periodValue.value
  return {
    period: p.period,
    ...(p.date_from && { date_from: p.date_from }),
    ...(p.date_to && { date_to: p.date_to }),
  }
})

const {
  fetchGlobal,
  fetchTopCustomers,
  fetchTopPartners,
  fetchChurnedCustomers,
  fetchChurnedPartners,
  fetchVariableCustomers,
  fetchVariablePartners,
  invalidateCache,
} = useAnalytics()

const loading = ref({
  overview: false,
  top: false,
  churn: false,
  variability: false,
})

// Overview state
const globalKpis = ref(null)
const revenueSeries = ref([])

// Top state
const topSort = ref('revenue')
const topCustomers = ref([])
const topPartners = ref([])

// Churn state
const churnedCustomers = ref([])
const churnedPartners = ref([])
const churnSettings = ref({ churn_threshold_days: 60 })

// Variability state
const variableCustomers = ref([])
const variablePartners = ref([])
const variabilitySettings = ref({ variability_cv_threshold: 0.6 })

const loadOverview = async () => {
  loading.value.overview = true
  const data = await fetchGlobal(periodParams.value)
  if (data) {
    globalKpis.value = data.kpis
    revenueSeries.value = data.revenue_series || []
  }
  loading.value.overview = false
}

const loadTop = async () => {
  loading.value.top = true
  const [customers, partners] = await Promise.all([
    fetchTopCustomers({ ...periodParams.value, sort: topSort.value, limit: 10 }),
    fetchTopPartners({ ...periodParams.value, sort: topSort.value, limit: 10 }),
  ])
  topCustomers.value = customers?.items || []
  topPartners.value = partners?.items || []
  loading.value.top = false
}

const loadChurn = async () => {
  loading.value.churn = true
  const [customers, partners] = await Promise.all([
    fetchChurnedCustomers({}),
    fetchChurnedPartners({}),
  ])
  churnedCustomers.value = customers?.items || []
  churnedPartners.value = partners?.items || []
  churnSettings.value = customers?.settings || partners?.settings || churnSettings.value
  loading.value.churn = false
}

const loadVariability = async () => {
  loading.value.variability = true
  const [customers, partners] = await Promise.all([
    fetchVariableCustomers({}),
    fetchVariablePartners({}),
  ])
  variableCustomers.value = customers?.items || []
  variablePartners.value = partners?.items || []
  variabilitySettings.value = customers?.settings || partners?.settings || variabilitySettings.value
  loading.value.variability = false
}

const loadActiveTab = () => {
  if (activeTab.value === 'overview') return loadOverview()
  if (activeTab.value === 'top') return loadTop()
  if (activeTab.value === 'churn') return loadChurn()
  if (activeTab.value === 'variability') return loadVariability()
}

watch(activeTab, loadActiveTab)
watch(periodValue, () => {
  if (activeTab.value === 'overview' || activeTab.value === 'top') {
    loadActiveTab()
  }
}, { deep: true })

watch(topSort, () => {
  if (activeTab.value === 'top') loadTop()
})

const refresh = async () => {
  invalidateCache()
  await loadActiveTab()
}

onMounted(loadOverview)

// Revenue chart
const revenueChartSeries = computed(() => [{
  name: 'CA',
  data: revenueSeries.value.map(r => r.revenue),
}])

const revenueChartOptions = computed(() => {
  const currentTheme = vuetifyTheme.current.value.colors
  const variableTheme = vuetifyTheme.current.value.variables
  const isDark = vuetifyTheme.current.value.dark
  const labelColor = `rgba(${ hexToRgb(currentTheme['on-surface']) },${ variableTheme['disabled-opacity'] })`
  const borderColor = `rgba(${ hexToRgb(String(variableTheme['border-color'])) },${ variableTheme['border-opacity'] })`

  return {
    chart: {
      type: 'area',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
      foreColor: labelColor,
    },
    theme: { mode: isDark ? 'dark' : 'light' },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    grid: {
      borderColor,
      strokeDashArray: 4,
      padding: { left: 8, right: 8 },
    },
    xaxis: {
      categories: revenueSeries.value.map(r => r.bucket),
      axisBorder: { color: borderColor },
      axisTicks: { color: borderColor },
      labels: {
        style: { fontSize: '11px', colors: labelColor },
        rotate: -35,
        rotateAlways: false,
      },
    },
    yaxis: {
      labels: {
        formatter: v => Number(v).toLocaleString('fr-FR'),
        style: { colors: labelColor },
      },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: { formatter: v => `${Number(v).toLocaleString('fr-FR')} FCFA` },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: isDark ? 0.55 : 0.4,
        opacityTo: isDark ? 0.1 : 0.05,
      },
    },
    colors: ['#6366f1'],
  }
})

const formatCurrency = v => Number(v || 0).toLocaleString('fr-FR')

// Analytics export (POST with rows + headings)
const buildTopExportBody = (items, kind) => {
  const headings = ['#', kind === 'customer' ? 'Client' : 'Partenaire', 'Téléphone', 'Commandes', 'CA (FCFA)', 'Dernière activité']
  const rows = items.map((it, i) => [
    i + 1,
    it.name || '',
    it.phone || '',
    it.orders_count,
    it.revenue,
    it.last_activity_at || '',
  ])
  return { rows, headings }
}

const buildChurnExportBody = (items, kind) => {
  const headings = ['#', kind === 'customer' ? 'Client' : 'Partenaire', 'Téléphone', 'Commandes', 'CA cumulé', 'Silence (jours)', 'Score risque', 'Dernière commande']
  const rows = items.map((it, i) => [
    i + 1,
    it.name || '',
    it.phone || '',
    it.orders_count,
    it.revenue,
    it.days_silent,
    it.churn_score,
    it.last_activity_at || '',
  ])
  return { rows, headings }
}

const buildVariabilityExportBody = (items, kind) => {
  const headings = ['#', kind === 'customer' ? 'Client' : 'Partenaire', 'Téléphone', 'Commandes', 'CA', 'CV', 'Intervalle moyen (j)', 'Première activité', 'Dernière activité']
  const rows = items.map((it, i) => [
    i + 1,
    it.name || '',
    it.phone || '',
    it.orders_count,
    it.revenue,
    it.cv,
    it.mean_interval_days,
    it.first_activity_at || '',
    it.last_activity_at || '',
  ])
  return { rows, headings }
}
</script>

<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between gap-3 mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">
          Analytics clients
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Aide à la décision : qui rapporte du CA, qui décroche, qui est imprévisible.
        </p>
      </div>

      <VBtn
        variant="outlined"
        color="primary"
        prepend-icon="tabler-refresh"
        :loading="loading[activeTab]"
        @click="refresh"
      >
        Actualiser
      </VBtn>
    </div>

    <PeriodFilter
      v-if="activeTab === 'overview' || activeTab === 'top'"
      v-model="periodValue"
      class="mb-4"
    />

    <VCard
      rounded="lg"
      class="mb-4"
    >
      <VTabs
        v-model="activeTab"
        color="primary"
        align-tabs="start"
        slider-color="primary"
      >
        <VTab value="overview">
          <VIcon
            icon="tabler-chart-pie"
            start
          /> Vue d'ensemble
        </VTab>
        <VTab value="top">
          <VIcon
            icon="tabler-trophy"
            start
          /> Top clients & partenaires
        </VTab>
        <VTab value="churn">
          <VIcon
            icon="tabler-alert-triangle"
            start
          /> Clients à risque
        </VTab>
        <VTab value="variability">
          <VIcon
            icon="tabler-wave-saw-tool"
            start
          /> Patterns variables
        </VTab>
      </VTabs>
    </VCard>

    <VWindow
      v-model="activeTab"
      :touch="false"
    >
      <!-- OVERVIEW -->
      <VWindowItem value="overview">
        <VRow>
          <VCol
            cols="12"
            sm="6"
            md="3"
          >
            <KpiCard
              label="CA total"
              :value="formatCurrency(globalKpis?.total_revenue)"
              suffix="FCFA"
              icon="tabler-cash"
              color="success"
              :loading="loading.overview"
            />
          </VCol>
          <VCol
            cols="12"
            sm="6"
            md="3"
          >
            <KpiCard
              label="Livraisons"
              :value="globalKpis?.deliveries_count ?? 0"
              icon="tabler-truck-delivery"
              color="primary"
              :loading="loading.overview"
            />
          </VCol>
          <VCol
            cols="12"
            sm="6"
            md="3"
          >
            <KpiCard
              label="Panier moyen"
              :value="formatCurrency(globalKpis?.average_basket)"
              suffix="FCFA"
              icon="tabler-shopping-cart"
              color="info"
              :loading="loading.overview"
            />
          </VCol>
          <VCol
            cols="12"
            sm="6"
            md="3"
          >
            <KpiCard
              label="Clients actifs"
              :value="globalKpis?.active_customers ?? 0"
              :hint="globalKpis ? `${globalKpis.customer_activity_rate}% du total` : ''"
              icon="tabler-user-check"
              color="warning"
              :loading="loading.overview"
            />
          </VCol>
          <VCol
            cols="12"
            sm="6"
            md="3"
          >
            <KpiCard
              label="Partenaires actifs"
              :value="globalKpis?.active_partners ?? 0"
              :hint="globalKpis ? `${globalKpis.partner_activity_rate}% du total` : ''"
              icon="tabler-building-store"
              color="secondary"
              :loading="loading.overview"
            />
          </VCol>
          <VCol
            cols="12"
            sm="6"
            md="3"
          >
            <KpiCard
              label="Total clients"
              :value="globalKpis?.total_customers ?? 0"
              icon="tabler-users"
              color="primary"
              :loading="loading.overview"
            />
          </VCol>
          <VCol
            cols="12"
            sm="6"
            md="3"
          >
            <KpiCard
              label="Total partenaires"
              :value="globalKpis?.total_partners ?? 0"
              icon="tabler-building"
              color="info"
              :loading="loading.overview"
            />
          </VCol>
        </VRow>

        <VCard
          rounded="lg"
          class="mt-4"
        >
          <VCardItem>
            <VCardTitle>Évolution du chiffre d'affaires</VCardTitle>
          </VCardItem>
          <VCardText>
            <VueApexCharts
              v-if="revenueSeries.length"
              type="area"
              height="320"
              :series="revenueChartSeries"
              :options="revenueChartOptions"
            />
            <div
              v-else
              class="text-center text-medium-emphasis py-8"
            >
              Aucune donnée sur la période sélectionnée.
            </div>
          </VCardText>
        </VCard>
      </VWindowItem>

      <!-- TOP -->
      <VWindowItem value="top">
        <VRow>
          <VCol
            cols="12"
            lg="6"
          >
            <div class="d-flex justify-end mb-2">
              <DownloadButton
                endpoint="/exports/analytics/top-customers"
                method="POST"
                :body="buildTopExportBody(topCustomers, 'customer')"
                filename="top-clients"
                label="Exporter top clients"
                size="small"
              />
            </div>
            <TopCustomersTable
              :items="topCustomers"
              :sort="topSort"
              :loading="loading.top"
              @update:sort="topSort = $event"
            />
          </VCol>
          <VCol
            cols="12"
            lg="6"
          >
            <div class="d-flex justify-end mb-2">
              <DownloadButton
                endpoint="/exports/analytics/top-partners"
                method="POST"
                :body="buildTopExportBody(topPartners, 'partner')"
                filename="top-partenaires"
                label="Exporter top partenaires"
                size="small"
              />
            </div>
            <TopPartnersTable
              :items="topPartners"
              :sort="topSort"
              :loading="loading.top"
              @update:sort="topSort = $event"
            />
          </VCol>
        </VRow>
      </VWindowItem>

      <!-- CHURN -->
      <VWindowItem value="churn">
        <VRow>
          <VCol cols="12">
            <div class="d-flex justify-end mb-2">
              <DownloadButton
                endpoint="/exports/analytics/churned-customers"
                method="POST"
                :body="buildChurnExportBody(churnedCustomers, 'customer')"
                filename="clients-churn"
                label="Exporter clients churn"
                size="small"
              />
            </div>
            <ChurnList
              :items="churnedCustomers"
              :loading="loading.churn"
              entity-label="Client"
              :threshold-days="churnSettings.churn_threshold_days"
            />
          </VCol>
          <VCol cols="12">
            <div class="d-flex justify-end mb-2">
              <DownloadButton
                endpoint="/exports/analytics/churned-partners"
                method="POST"
                :body="buildChurnExportBody(churnedPartners, 'partner')"
                filename="partenaires-churn"
                label="Exporter partenaires churn"
                size="small"
              />
            </div>
            <ChurnList
              :items="churnedPartners"
              :loading="loading.churn"
              entity-label="Partenaire"
              :threshold-days="churnSettings.churn_threshold_days"
            />
          </VCol>
        </VRow>
      </VWindowItem>

      <!-- VARIABILITY -->
      <VWindowItem value="variability">
        <VRow>
          <VCol cols="12">
            <div class="d-flex justify-end mb-2">
              <DownloadButton
                endpoint="/exports/analytics/variable-customers"
                method="POST"
                :body="buildVariabilityExportBody(variableCustomers, 'customer')"
                filename="clients-variables"
                label="Exporter clients variables"
                size="small"
              />
            </div>
            <VariabilityList
              :items="variableCustomers"
              :loading="loading.variability"
              entity-label="Client"
              :cv-threshold="variabilitySettings.variability_cv_threshold"
            />
          </VCol>
          <VCol cols="12">
            <div class="d-flex justify-end mb-2">
              <DownloadButton
                endpoint="/exports/analytics/variable-partners"
                method="POST"
                :body="buildVariabilityExportBody(variablePartners, 'partner')"
                filename="partenaires-variables"
                label="Exporter partenaires variables"
                size="small"
              />
            </div>
            <VariabilityList
              :items="variablePartners"
              :loading="loading.variability"
              entity-label="Partenaire"
              :cv-threshold="variabilitySettings.variability_cv_threshold"
            />
          </VCol>
        </VRow>
      </VWindowItem>
    </VWindow>
  </div>
</template>
