<script setup>
const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
})

const headingColor = 'rgba(var(--v-theme-on-background), var(--v-high-emphasis-opacity))'
const labelColor = 'rgba(var(--v-theme-on-background), var(--v-medium-emphasis-opacity))'

// Icon and color mapping
const expenseTypeConfig = {
  maintenance: { icon: 'tabler-tool', color: '#3b82f6' },
  fuel: { icon: 'tabler-gas-station', color: '#f59e0b' },
  insurance: { icon: 'tabler-shield', color: '#10b981' },
  other: { icon: 'tabler-receipt', color: '#8b5cf6' },
  repair: { icon: 'tabler-wrench', color: '#ef4444' },
  supplies: { icon: 'tabler-package', color: '#06b6d4' },
}

// Prepare chart data
const chartConfig = computed(() => {
  if (!props.data || props.data.length === 0) {
    return {
      chart: {
        type: 'donut',
        height: 350,
      },
      colors: [],
      series: [],
      labels: [],
      tooltip: {
        y: {
          formatter: value => `${value.toLocaleString()} FCFA`,
        },
      },
      legend: {
        position: 'bottom',
        labels: {
          colors: headingColor,
        },
      },
    }
  }

  // Transform data for chart
  const series = props.data.map(item => parseFloat(item.amount) || 0)
  const labels = props.data.map(item => item.type || 'Unknown')

  const colors = props.data.map(item => {
    const type = (item.type || 'other').toLowerCase()
    
    return expenseTypeConfig[type]?.color || expenseTypeConfig.other.color
  })

  return {
    chart: {
      type: 'donut',
      height: 350,
    },
    colors,
    series,
    labels,
    tooltip: {
      y: {
        formatter: value => `${value.toLocaleString()} FCFA`,
      },
    },
    legend: {
      position: 'bottom',
      labels: {
        colors: headingColor,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val, { seriesIndex }) => {
        const total = series.reduce((sum, s) => sum + s, 0)
        const percentage = total > 0 ? ((series[seriesIndex] / total) * 100).toFixed(1) : 0
        
        return `${percentage}%`
      },
    },
  }
})
</script>

<template>
  <div>
    <VueApexCharts
      type="donut"
      height="350"
      :options="chartConfig"
      :series="chartConfig.series"
    />
  </div>
</template>

<style lang="scss">
@use "@core/scss/template/libs/apex-chart";
</style>

