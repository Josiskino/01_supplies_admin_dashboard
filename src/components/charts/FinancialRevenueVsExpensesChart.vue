<script setup>
const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
})

const headingColor = 'rgba(var(--v-theme-on-background), var(--v-high-emphasis-opacity))'
const labelColor = 'rgba(var(--v-theme-on-background), var(--v-medium-emphasis-opacity))'
const borderColor = 'rgba(var(--v-border-color), var(--v-border-opacity))'

// Prepare chart data
const chartConfig = computed(() => {
  if (!props.data || props.data.length === 0) {
    return {
      chart: {
        type: 'line',
        height: 350,
        toolbar: { show: false },
      },
      stroke: {
        width: [2, 2],
        curve: 'smooth',
      },
      colors: ['#22c55e', '#ef4444'],
      series: [
        {
          name: 'Revenue',
          data: [],
        },
        {
          name: 'Expenses',
          data: [],
        },
      ],
      xaxis: {
        categories: [],
      },
      yaxis: {
        labels: {
          style: {
            colors: labelColor,
            fontSize: '13px',
          },
          formatter: value => `${(value / 1000).toFixed(0)}K`,
        },
      },
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
      grid: {
        strokeDashArray: 8,
        borderColor,
      },
    }
  }

  // Transform data for chart
  const categories = props.data.map(item => item.date || item.period || 'N/A')
  const revenueData = props.data.map(item => parseFloat(item.revenue) || 0)
  const expensesData = props.data.map(item => parseFloat(item.expenses) || 0)

  return {
    chart: {
      type: 'line',
      height: 350,
      toolbar: { show: false },
    },
    stroke: {
      width: [2, 2],
      curve: 'smooth',
    },
    colors: ['#22c55e', '#ef4444'],
    series: [
      {
        name: 'Revenue',
        data: revenueData,
      },
      {
        name: 'Expenses',
        data: expensesData,
      },
    ],
    xaxis: {
      categories,
      labels: {
        style: {
          colors: labelColor,
          fontSize: '13px',
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: labelColor,
          fontSize: '13px',
        },
        formatter: value => `${(value / 1000).toFixed(0)}K`,
      },
    },
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
    grid: {
      strokeDashArray: 8,
      borderColor,
    },
  }
})
</script>

<template>
  <div>
    <VueApexCharts
      type="line"
      height="350"
      :options="chartConfig"
      :series="chartConfig.series"
    />
  </div>
</template>

<style lang="scss">
@use "@core/scss/template/libs/apex-chart";
</style>

