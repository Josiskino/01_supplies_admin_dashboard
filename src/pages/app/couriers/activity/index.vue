<script setup>
/* eslint-disable camelcase */
const selectedDriverId = ref(null)
const selectedDate = ref(new Date().toISOString().slice(0, 10)) // Today by default
const isLoading = ref(false)
const isLoadingDrivers = ref(false)

// Driver options
const drivers = ref([])

// Activity data
const driverActivity = ref(null)
const deliveries = ref([])

// Statistics
const statistics = computed(() => {
  if (!driverActivity.value) {
    return {
      totalDeliveries: 0,
      totalRevenue: 0,
      totalTime: 0,
      averageTime: 0,
      averageRevenue: 0,
    }
  }

  const totalDeliveries = deliveries.value.length
  const totalRevenue = deliveries.value.reduce((sum, d) => sum + (parseFloat(d.price) || 0), 0)

  // Calculate total time in minutes
  let totalTimeMinutes = 0

  deliveries.value.forEach(delivery => {
    if (delivery.started_at && delivery.completed_at) {
      const start = new Date(delivery.started_at)
      const end = new Date(delivery.completed_at)
      const diffMinutes = (end - start) / (1000 * 60)

      totalTimeMinutes += diffMinutes
    }
  })

  return {
    totalDeliveries,
    totalRevenue,
    totalTime: totalTimeMinutes,
    averageTime: totalDeliveries > 0 ? Math.round(totalTimeMinutes / totalDeliveries) : 0,
    averageRevenue: totalDeliveries > 0 ? Math.round(totalRevenue / totalDeliveries) : 0,
  }
})

// Fetch drivers list
const fetchDrivers = async () => {
  isLoadingDrivers.value = true
  try {
    const response = await $api('/drivers', {
      method: 'GET',
    })

    if (Array.isArray(response)) {
      drivers.value = response
    } else if (response?.data && Array.isArray(response.data)) {
      drivers.value = response.data
    } else {
      drivers.value = []
    }

    // Set first driver as default if available
    if (drivers.value.length > 0 && !selectedDriverId.value) {
      selectedDriverId.value = drivers.value[0].id
    }
  } catch (error) {
    console.error('Error fetching drivers:', error)
    drivers.value = []
  } finally {
    isLoadingDrivers.value = false
  }
}

// Fetch driver activity
const fetchDriverActivity = async () => {
  if (!selectedDriverId.value) return

  isLoading.value = true
  try {
    const queryParams = new URLSearchParams({
      driver_id: selectedDriverId.value,
      date: selectedDate.value,
    })

    const response = await $api(`/drivers/${selectedDriverId.value}/activity?${queryParams}`, {
      method: 'GET',
    })

    // Handle response structure
    if (response && response.deliveries) {
      deliveries.value = Array.isArray(response.deliveries) ? response.deliveries : []
      driverActivity.value = response
    } else if (Array.isArray(response)) {
      deliveries.value = response
      driverActivity.value = { deliveries: response }
    } else {
      deliveries.value = []
      driverActivity.value = null
    }
  } catch (error) {
    console.error('Error fetching driver activity:', error)
    deliveries.value = []
    driverActivity.value = null
  } finally {
    isLoading.value = false
  }
}

// Format time
const formatTime = value => {
  if (!value) {
    return '—'
  }
  try {
    const date = new Date(value)

    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

// Format duration
const formatDuration = minutes => {
  if (!minutes || minutes === 0) {
    return '—'
  }
  if (minutes < 60) {
    return `${Math.round(minutes)}m`
  }

  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  return `${hours}h ${mins}m`
}

// Calculate delivery duration
const calculateDuration = delivery => {
  if (!delivery.started_at || !delivery.completed_at) {
    return null
  }

  try {
    const start = new Date(delivery.started_at)
    const end = new Date(delivery.completed_at)

    return (end - start) / (1000 * 60)
  } catch {
    return null
  }
}

// Format price
const formatPrice = value => {
  if (value == null) {
    return '—'
  }
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

// Table headers
const headers = [
  { title: '#', key: 'index', sortable: false, width: '60px' },
  { title: 'Client', key: 'client', sortable: false },
  { title: 'Pickup', key: 'pickup', sortable: false },
  { title: 'Dropoff', key: 'dropoff', sortable: false },
  { title: 'Started At', key: 'started_at', sortable: false },
  { title: 'Completed At', key: 'completed_at', sortable: false },
  { title: 'Duration', key: 'duration', sortable: false },
  { title: 'Price', key: 'price', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
]

// Watch for changes
watch([selectedDriverId, selectedDate], () => {
  if (selectedDriverId.value) {
    fetchDriverActivity()
  }
})

// Load on mount
onMounted(() => {
  fetchDrivers()
})
</script>

<template>
  <section>
    <!-- Header Section -->
    <VCard class="mb-6">
      <VCardItem class="pb-4">
        <VCardTitle>Driver Activity</VCardTitle>
        <VCardSubtitle>
          Track daily activity, deliveries, and earnings for each driver
        </VCardSubtitle>
      </VCardItem>

      <VCardText>
        <VRow>
          <!-- Driver Selection -->
          <VCol
            cols="12"
            md="6"
          >
            <AppSelect
              v-model="selectedDriverId"
              :items="drivers.map(d => ({ title: d.user?.name || d.name || 'Unknown', value: d.id }))"
              :loading="isLoadingDrivers"
              label="Select Driver"
              placeholder="Choose a driver"
              prepend-inner-icon="tabler-user"
            />
          </VCol>

          <!-- Date Selection -->
          <VCol
            cols="12"
            md="6"
          >
            <AppDateTimePicker
              v-model="selectedDate"
              label="Select Date"
              placeholder="Select date"
              :config="{ dateFormat: 'Y-m-d' }"
              prepend-inner-icon="tabler-calendar"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- Statistics Cards -->
    <VRow
      v-if="selectedDriverId && driverActivity"
      class="match-height mb-6"
    >
      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard>
          <VCardText class="d-flex align-center justify-space-between">
            <div>
              <div class="text-sm text-medium-emphasis">
                Total Deliveries
              </div>
              <div class="text-h4 font-weight-medium mt-1">
                {{ statistics.totalDeliveries }}
              </div>
            </div>
            <VAvatar
              color="primary"
              variant="tonal"
              size="56"
            >
              <VIcon
                icon="tabler-package"
                size="28"
              />
            </VAvatar>
          </VCardText>
        </VCard>
      </VCol>

      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard>
          <VCardText class="d-flex align-center justify-space-between">
            <div>
              <div class="text-sm text-medium-emphasis">
                Total Revenue
              </div>
              <div class="text-h4 font-weight-medium mt-1">
                {{ formatPrice(statistics.totalRevenue) }}
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

      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard>
          <VCardText class="d-flex align-center justify-space-between">
            <div>
              <div class="text-sm text-medium-emphasis">
                Total Time
              </div>
              <div class="text-h4 font-weight-medium mt-1">
                {{ formatDuration(statistics.totalTime) }}
              </div>
            </div>
            <VAvatar
              color="info"
              variant="tonal"
              size="56"
            >
              <VIcon
                icon="tabler-clock"
                size="28"
              />
            </VAvatar>
          </VCardText>
        </VCard>
      </VCol>

      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard>
          <VCardText class="d-flex align-center justify-space-between">
            <div>
              <div class="text-sm text-medium-emphasis">
                Avg. Time per Delivery
              </div>
              <div class="text-h4 font-weight-medium mt-1">
                {{ formatDuration(statistics.averageTime) }}
              </div>
            </div>
            <VAvatar
              color="warning"
              variant="tonal"
              size="56"
            >
              <VIcon
                icon="tabler-timer"
                size="28"
              />
            </VAvatar>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Deliveries List -->
    <VCard v-if="selectedDriverId">
      <VCardItem class="pb-4">
        <VCardTitle>Delivery History</VCardTitle>
        <VCardSubtitle>
          Detailed list of all deliveries for the selected date
        </VCardSubtitle>
      </VCardItem>

      <VCardText>
        <VDataTableServer
          :headers="headers"
          :items="deliveries"
          :loading="isLoading"
          :items-length="deliveries.length"
          item-value="id"
          class="text-no-wrap"
        >
          <!-- Index -->
          <template #item.index="{ index }">
            <span class="text-high-emphasis font-weight-medium">
              {{ index + 1 }}
            </span>
          </template>

          <!-- Client -->
          <template #item.client="{ item }">
            <div>
              <div class="text-body-1 font-weight-medium">
                {{ item.requester?.name || item.client?.name || item.user?.name || '—' }}
              </div>
              <div class="text-sm text-medium-emphasis">
                <a
                  v-if="item.requester?.phone || item.client?.phone || item.user?.phone"
                  :href="`tel:${item.requester?.phone || item.client?.phone || item.user?.phone}`"
                  class="text-primary"
                >
                  {{ item.requester?.phone || item.client?.phone || item.user?.phone }}
                </a>
                <span v-else>—</span>
              </div>
            </div>
          </template>

          <!-- Pickup -->
          <template #item.pickup="{ item }">
            <a
              v-if="item.pickup_location?.url || (item.pickup_location?.lat && item.pickup_location?.lng)"
              :href="item.pickup_location?.url || `https://www.google.com/maps?q=${item.pickup_location.lat},${item.pickup_location.lng}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary"
            >
              <VIcon
                icon="tabler-map-pin"
                size="16"
                class="me-1"
              />
              View on map
            </a>
            <span v-else>—</span>
          </template>

          <!-- Dropoff -->
          <template #item.dropoff="{ item }">
            <a
              v-if="item.dropoff_location?.url || (item.dropoff_location?.lat && item.dropoff_location?.lng)"
              :href="item.dropoff_location?.url || `https://www.google.com/maps?q=${item.dropoff_location.lat},${item.dropoff_location.lng}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary"
            >
              <VIcon
                icon="tabler-map-pin"
                size="16"
                class="me-1"
              />
              View on map
            </a>
            <span v-else>—</span>
          </template>

          <!-- Started At -->
          <template #item.started_at="{ item }">
            <div class="d-flex align-center gap-2">
              <VIcon
                icon="tabler-player-play"
                size="16"
                color="success"
              />
              <span class="text-body-1">
                {{ formatTime(item.started_at) }}
              </span>
            </div>
          </template>

          <!-- Completed At -->
          <template #item.completed_at="{ item }">
            <div class="d-flex align-center gap-2">
              <VIcon
                icon="tabler-player-stop"
                size="16"
                color="primary"
              />
              <span class="text-body-1">
                {{ formatTime(item.completed_at) }}
              </span>
            </div>
          </template>

          <!-- Duration -->
          <template #item.duration="{ item }">
            <VChip
              size="small"
              color="info"
              variant="tonal"
            >
              {{ formatDuration(calculateDuration(item)) }}
            </VChip>
          </template>

          <!-- Price -->
          <template #item.price="{ item }">
            <span class="text-body-1 font-weight-medium">
              {{ formatPrice(item.price) }}
            </span>
          </template>

          <!-- Status -->
          <template #item.status="{ item }">
            <VChip
              size="small"
              :color="item.status === 'completed' || item.status === 'delivered' ? 'success' : (item.status === 'in-progress' ? 'warning' : 'secondary')"
              label
              class="text-capitalize"
            >
              {{ item.status || '—' }}
            </VChip>
          </template>

          <!-- Empty State -->
          <template #no-data>
            <div class="text-center py-8">
              <VIcon
                icon="tabler-inbox"
                size="48"
                color="secondary"
                class="mb-4"
              />
              <h6 class="text-h6 mb-2">
                No deliveries found
              </h6>
              <p class="text-medium-emphasis">
                No deliveries were completed by this driver on the selected date.
              </p>
            </div>
          </template>
        </VDataTableServer>
      </VCardText>
    </VCard>

    <!-- Empty State when no driver selected -->
    <VCard v-if="!selectedDriverId">
      <VCardText class="text-center py-12">
        <VIcon
          icon="tabler-user-search"
          size="64"
          color="secondary"
          class="mb-4"
        />
        <h6 class="text-h6 mb-2">
          Select a Driver
        </h6>
        <p class="text-medium-emphasis">
          Choose a driver from the dropdown above to view their activity and delivery statistics.
        </p>
      </VCardText>
    </VCard>
  </section>
</template>
