<script setup>
import VueApexCharts from 'vue3-apexcharts'
import { computed } from 'vue'

const props = defineProps({
  data: { type: Array, default: () => [] }, // [{ month: '2026-01', count: 3 }]
  height: { type: Number, default: 40 },
  color: { type: String, default: '#6366f1' },
})

const series = computed(() => [{
  name: 'Livraisons',
  data: props.data.map(d => d.count),
}])

const categories = computed(() => props.data.map(d => d.month))

const options = computed(() => ({
  chart: {
    type: 'area',
    sparkline: { enabled: true },
    animations: { enabled: false },
    toolbar: { show: false },
  },
  stroke: { curve: 'smooth', width: 2 },
  fill: {
    type: 'gradient',
    gradient: { opacityFrom: 0.4, opacityTo: 0.05 },
  },
  colors: [props.color],
  tooltip: {
    fixed: { enabled: false },
    x: {
      formatter: (_, { dataPointIndex }) => categories.value[dataPointIndex],
    },
    y: { formatter: v => `${v} livraison${v > 1 ? 's' : ''}` },
    marker: { show: false },
  },
}))
</script>

<template>
  <div v-if="data.length">
    <VueApexCharts
      type="area"
      :height="height"
      :series="series"
      :options="options"
    />
  </div>
  <div
    v-else
    class="text-caption text-medium-emphasis"
  >
    Aucune donnée
  </div>
</template>
