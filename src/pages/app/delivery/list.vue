<script setup>
/* eslint-disable camelcase */
import { useDeliveryStatuses } from '@/composables/useStatusManagement'
import DeliveryAddDialog from './add.vue'

const { getStatusOptions, getStatusColor, getStatusLabel } = useDeliveryStatuses()

const headers = [
  { title: '#', key: 'index', sortable: false, width: '60px' },
  { title: 'Requester', key: 'requester' },
  { title: 'Phone', key: 'phone' },
  { title: 'Pickup Location', key: 'pickup' },
  { title: 'Dropoff Location', key: 'dropoff' },
  { title: 'Price', key: 'price' },
  { title: 'Date', key: 'date' },
  { title: 'Status', key: 'status' },
]

const itemsPerPage = ref(10)
const page = ref(1)
const isLoading = ref(false)

// Filters
const searchQuery = ref('')
const selectedStatus = ref('in-progress')

const deliveries = ref([])
const total = ref(0)

// Add delivery dialog
const isAddDeliveryDialogOpen = ref(false)

const normalizeUrl = obj => {
  if (!obj) return null

  // Prefer explicit URL if provided
  if (obj.url) return obj.url

  // Build map link from lat/lng if available
  if (obj.lat && obj.lng)
    return `https://www.google.com/maps?q=${encodeURIComponent(obj.lat)},${encodeURIComponent(obj.lng)}`

  return null
}

const formatPrice = value => {
  if (value == null) return '—'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(Number(value))
  }
  catch {
    return String(value)
  }
}

const formatDate = value => {
  if (!value) return '—'
  try {
    const date = new Date(value)
    
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }
  catch {
    return '—'
  }
}

const fetchDeliveries = async () => {
  isLoading.value = true
  try {
    const query = new URLSearchParams({
      status: selectedStatus.value || undefined,
      q: searchQuery.value || undefined,
      page: String(page.value),
      per_page: String(itemsPerPage.value),
    }).toString()

    const res = await $api(`/deliveries?${query}`, { method: 'GET' })

    // Accept both array and paginated responses
    if (Array.isArray(res)) {
      deliveries.value = res
      total.value = res.length
    } else if (res && Array.isArray(res.data)) {
      deliveries.value = res.data
      total.value = res.meta?.total ?? res.data.length
    } else {
      deliveries.value = []
      total.value = 0
    }
  } catch (err) {
    console.error('Failed to fetch deliveries:', err)
    deliveries.value = []
    total.value = 0
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchDeliveries)

watch([searchQuery, selectedStatus, itemsPerPage], () => {
  page.value = 1
  fetchDeliveries()
})

watch(page, fetchDeliveries)

// Handle delivery added
const onDeliveryAdded = () => {
  fetchDeliveries()
}
</script>

<template>
  <section>
    <VCard class="mb-6">
      <VCardItem class="pb-4">
        <VCardTitle>Ongoing Deliveries</VCardTitle>
      </VCardItem>

      <VCardText>
        <VRow class="mb-4">
          <VCol
            cols="12"
            sm="4"
          >
            <AppSelect
              v-model="selectedStatus"
              :items="getStatusOptions()"
              placeholder="Filter by status"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>
          <VCol
            cols="12"
            sm="4"
          >
            <AppTextField
              v-model="searchQuery"
              placeholder="Search by requester name or phone"
              clearable
            />
          </VCol>
          <VCol
            cols="12"
            sm="4"
            class="d-flex justify-end"
          >
            <VBtn
              prepend-icon="tabler-plus"
              color="primary"
              @click="isAddDeliveryDialogOpen = true"
            >
              Add Delivery
            </VBtn>
          </VCol>
        </VRow>

        <VDataTableServer
          v-model:items-per-page="itemsPerPage"
          v-model:page="page"
          :headers="headers"
          :items="deliveries"
          :items-length="total"
          :loading="isLoading"
          item-value="id"
          class="text-no-wrap"
        >
          <!-- Index/Counter -->
          <template #item.index="{ index }">
            <span class="text-high-emphasis font-weight-medium">
              {{ (page - 1) * itemsPerPage + index + 1 }}
            </span>
          </template>

          <!-- Requester name -->
          <template #item.requester="{ item }">
            <span class="text-high-emphasis">{{ item?.requester?.name || item?.user?.name || '—' }}</span>
          </template>

          <!-- Phone -->
          <template #item.phone="{ item }">
            <a
              :href="item?.requester?.phone ? `tel:${item.requester.phone}` : (item?.user?.phone ? `tel:${item.user.phone}` : undefined)"
              class="text-primary"
            >
              {{ item?.requester?.phone || item?.user?.phone || '—' }}
            </a>
          </template>

          <!-- Pickup -->
          <template #item.pickup="{ item }">
            <a
              v-if="normalizeUrl(item?.pickup)"
              :href="normalizeUrl(item?.pickup)"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary"
            >
              View pickup on map
            </a>
            <span v-else>—</span>
          </template>

          <!-- Dropoff -->
          <template #item.dropoff="{ item }">
            <a
              v-if="normalizeUrl(item?.dropoff)"
              :href="normalizeUrl(item?.dropoff)"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary"
            >
              View dropoff on map
            </a>
            <span v-else>—</span>
          </template>

          <!-- Price -->
          <template #item.price="{ item }">
            {{ formatPrice(item?.price) }}
          </template>

          <!-- Date -->
          <template #item.date="{ item }">
            <span class="text-high-emphasis">
              {{ formatDate(item?.created_at || item?.date) }}
            </span>
          </template>

          <!-- Status -->
          <template #item.status="{ item }">
            <VChip
              size="small"
              :color="getStatusColor(item?.status)"
              label
              class="text-capitalize"
            >
              {{ getStatusLabel(item?.status) || item?.status || 'Unknown' }}
            </VChip>
          </template>
        </VDataTableServer>
      </VCardText>
    </VCard>

    <!-- Add Delivery Dialog -->
    <DeliveryAddDialog
      v-model:is-dialog-visible="isAddDeliveryDialogOpen"
      @delivery-added="onDeliveryAdded"
    />
  </section>
</template>
