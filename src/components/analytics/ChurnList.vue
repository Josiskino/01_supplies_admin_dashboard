<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  entityLabel: { type: String, default: 'Client' },
  thresholdDays: { type: Number, default: 60 },
})

const headers = computed(() => [
  { title: '#', key: 'rank', width: 50 },
  { title: props.entityLabel, key: 'name' },
  { title: 'Téléphone', key: 'phone' },
  { title: 'Commandes passées', key: 'orders_count', align: 'end' },
  { title: 'CA cumulé', key: 'revenue', align: 'end' },
  { title: 'Silence (jours)', key: 'days_silent', align: 'end' },
  { title: 'Risque', key: 'churn_score' },
  { title: 'Dernière commande', key: 'last_activity_at' },
])

const rows = computed(() => props.items.map((item, idx) => ({
  ...item,
  rank: idx + 1,
})))

const riskColor = score => {
  if (score === null || score === undefined) return 'default'
  if (score >= 2) return 'error'
  if (score >= 1.5) return 'warning'
  if (score >= 1) return 'orange'
  return 'success'
}

const riskLabel = score => {
  if (score === null || score === undefined) return '—'
  if (score >= 2) return 'Critique'
  if (score >= 1.5) return 'Élevé'
  if (score >= 1) return 'Modéré'
  return 'Récent'
}

const formatCurrency = v => Number(v || 0).toLocaleString('fr-FR')
const formatDate = v => v ? new Date(v).toLocaleDateString('fr-FR') : '–'
</script>

<template>
  <VCard rounded="lg">
    <VCardItem>
      <VCardTitle class="d-flex align-center gap-3">
        <VIcon
          icon="tabler-alert-triangle"
          color="error"
        />
        {{ entityLabel }}s à risque (churn)
      </VCardTitle>

      <template #subtitle>
        <span class="text-caption">
          {{ entityLabel }}s qui commandaient régulièrement et sont silencieux depuis plus de
          <strong>{{ thresholdDays }} jours</strong>.
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

      <template #item.days_silent="{ item }">
        <span class="font-weight-medium">{{ item.days_silent ?? '—' }}</span>
      </template>

      <template #item.churn_score="{ item }">
        <VChip
          :color="riskColor(item.churn_score)"
          size="small"
          variant="elevated"
        >
          {{ riskLabel(item.churn_score) }}
        </VChip>
      </template>

      <template #item.last_activity_at="{ item }">
        {{ formatDate(item.last_activity_at) }}
      </template>

      <template #no-data>
        <div class="text-center text-medium-emphasis py-6">
          Aucun {{ entityLabel.toLowerCase() }} en risque de churn. 🎉
        </div>
      </template>
    </VDataTable>
  </VCard>
</template>
