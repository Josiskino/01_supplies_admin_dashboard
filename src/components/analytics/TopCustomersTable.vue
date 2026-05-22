<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  sort:  { type: String, default: 'revenue' },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:sort'])

const headers = computed(() => [
  { title: '#', key: 'rank', width: 50 },
  { title: 'Client', key: 'name' },
  { title: 'Téléphone', key: 'phone' },
  { title: 'Commandes', key: 'orders_count', align: 'end' },
  { title: 'CA (FCFA)', key: 'revenue', align: 'end' },
  { title: 'Dernière activité', key: 'last_activity_at' },
])

const rows = computed(() => props.items.map((item, idx) => ({
  ...item,
  rank: idx + 1,
})))

const formatCurrency = v => Number(v || 0).toLocaleString('fr-FR')
const formatDate = v => v ? new Date(v).toLocaleDateString('fr-FR') : '–'

const setSort = newSort => emit('update:sort', newSort)
</script>

<template>
  <VCard rounded="lg">
    <VCardItem>
      <VCardTitle class="d-flex align-center gap-3">
        <VIcon
          icon="tabler-trophy"
          color="warning"
        />
        Top clients
      </VCardTitle>

      <template #append>
        <div class="d-flex flex-wrap gap-2">
          <VBtn
            :variant="sort === 'revenue' ? 'elevated' : 'outlined'"
            :color="sort === 'revenue' ? 'primary' : 'default'"
            size="small"
            @click="setSort('revenue')"
          >
            Par CA
          </VBtn>
          <VBtn
            :variant="sort === 'orders' ? 'elevated' : 'outlined'"
            :color="sort === 'orders' ? 'primary' : 'default'"
            size="small"
            @click="setSort('orders')"
          >
            Par commandes
          </VBtn>
        </div>
      </template>
    </VCardItem>

    <VDataTable
      :headers="headers"
      :items="rows"
      :loading="loading"
      density="comfortable"
      hover
      hide-default-footer
      items-per-page="50"
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
        <span class="font-weight-medium">{{ formatCurrency(item.revenue) }}</span>
      </template>

      <template #item.last_activity_at="{ item }">
        {{ formatDate(item.last_activity_at) }}
      </template>

      <template #no-data>
        <div class="text-center text-medium-emphasis py-6">
          Aucun client sur la période sélectionnée.
        </div>
      </template>
    </VDataTable>
  </VCard>
</template>
