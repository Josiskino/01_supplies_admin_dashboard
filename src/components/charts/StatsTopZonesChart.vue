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

const chartConfig = computed(() => {
  const categories = props.data.map(item => item.neighborhood || 'N/A')
  const seriesData = props.data.map(item => item.count || 0)

  return {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: true,
        distributed: true,
        columnWidth: '55%',
      },
    },
    dataLabels: {
      enabled: true,
      formatter: val => val.toLocaleString(),
      style: {
        fontSize: '12px',
        colors: ['#fff'],
      },
    },
    colors: [
      '#7367f0', '#28c76f', '#ea5455', '#ff9f43', '#00cfe8',
      '#a8aaae', '#4b4b4b', '#fdac41', '#39da8a', '#ff5b5c',
    ],
    series: [{
      name: 'Orders',
      data: seriesData,
    }],
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
      },
    },
    tooltip: {
      y: {
        formatter: value => `${value.toLocaleString()} orders`,
      },
    },
    legend: {
      show: false,
    },
    grid: {
      borderColor,
      xaxis: {
        lines: { show: true },
      },
      yaxis: {
        lines: { show: false },
      },
    },
  }
})
</script>

<template>
  <VueApexCharts
    type="bar"
    height="350"
    :options="chartConfig"
    :series="chartConfig.series"
  />
</template>

<style lang="scss">
@use "@core/scss/template/libs/apex-chart";
</style>
