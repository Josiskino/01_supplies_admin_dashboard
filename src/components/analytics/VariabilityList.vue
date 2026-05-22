<script setup>
import { computed } from 'vue'
import EntityTimelineMini from './EntityTimelineMini.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  entityLabel: { type: String, default: 'Client' },
  cvThreshold: { type: Number, default: 0.6 },
})

const headers = computed(() => [
  { title: '#', key: 'rank', width: 50 },
  { title: props.entityLabel, key: 'name' },
  { title: 'Téléphone', key: 'phone' },
  { title: 'Commandes', key: 'orders_count', align: 'end' },
  { title: 'CA', key: 'revenue', align: 'end' },
  { title: 'Régularité', key: 'cv' },
  { title: 'Intervalle moyen', key: 'mean_interval_days' },
  { title: 'Timeline 12 mois', key: 'monthly_timeline', sortable: false, width: 180 },
])

const rows = computed(() => props.items.map((item, idx) => ({
  ...item,
  rank: idx + 1,
})))

const cvColor = cv => {
  if (cv >= 1.5) return 'error'
  if (cv >= 1) return 'warning'
  return 'info'
}

const cvLabel = cv => {
  if (cv >= 1.5) return 'Très erratique'
  if (cv >= 1) return 'Erratique'
  return 'Variable'
}

const formatCurrency = v => Number(v || 0).toLocaleString('fr-FR')
</script>

<template>
  <VCard rounded="lg">
    <VCardItem>
      <VCardTitle class="d-flex align-center gap-3">
        <VIcon
          icon="tabler-wave-saw-tool"
          color="warning"
        />
        {{ entityLabel }}s à patterns variables
      </VCardTitle>

      <template #subtitle>
        <span class="text-caption">
          Coefficient de variation (CV) >
          <strong>{{ cvThreshold }}</strong> sur les intervalles entre commandes.
          Plus le CV est élevé, plus le pattern est erratique.
        </span>
      </template>
    </VCardItem>

    <VDataTable
      :headers="headers"
      :items="rows"
      :loading="loading"
      density="comfortable"
      hover
      items-per-page="25"
    >
      <template #item.name="{ item }">
        <div class="font-weight-medium">
          {{ item.name || '—' }}
        </div>
      </template>

      <template #item.orders_count="{ item }">
        <VChip
          size="small"
          color="primary"
          variant="tonal"
        >
          {{ item.orders_count }}
        </VChip>
      </template>

      <template #item.revenue="{ item }">
        {{ formatCurrency(item.revenue) }}
      </template>

      <template #item.cv="{ item }">
        <VChip
          :color="cvColor(item.cv)"
          size="small"
          variant="elevated"
        >
          {{ cvLabel(item.cv) }} · {{ item.cv }}
        </VChip>
      </template>

      <template #item.mean_interval_days="{ item }">
        {{ item.mean_interval_days }} jours
      </template>

      <template #item.monthly_timeline="{ item }">
        <EntityTimelineMini
          :data="item.monthly_timeline"
          :height="36"
        />
      </template>

      <template #no-data>
        <div class="text-center text-medium-emphasis py-6">
          Aucun {{ entityLabel.toLowerCase() }} avec un pattern variable détecté.
        </div>
      </template>
    </VDataTable>
  </VCard>
</template>
