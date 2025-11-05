<script setup>
/* eslint-disable camelcase */
import { useI18n } from 'vue-i18n'
import { useDeliveryStatuses } from '@/composables/useStatusManagement'
import DeliveryAddDialog from './add.vue'

const { t } = useI18n()
const { getStatusOptions, getStatusColor, getStatusLabel } = useDeliveryStatuses()

const headers = computed(() => [
  { title: '#', key: 'index', sortable: false, width: '60px' },
  { title: t('Customer'), key: 'customer' },
  { title: t('Partner'), key: 'partner' },
  { title: t('Driver'), key: 'driver' },
  { title: t('Pickup Location'), key: 'pickup_location' },
  { title: t('Dropoff Location'), key: 'dropoff_location' },
  { title: t('Distance'), key: 'distance_km' },
  { title: t('Price'), key: 'price' },
  { title: t('Status'), key: 'status' },
  { title: t('Start Time'), key: 'start_at' },
  { title: t('Delivered At'), key: 'delivered_at' },
  { title: t('Created By'), key: 'creator' },
  { title: t('Created At'), key: 'created_at' },
  { title: t('Actions'), key: 'actions', sortable: false, width: '100px' },
])

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

// Success notifications
const isSuccessSnackVisible = ref(false)
const successSnackText = ref('')

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

const formatDateTime = value => {
  if (!value) return '—'
  try {
    const date = new Date(value)
    
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  catch {
    return '—'
  }
}

const fetchDeliveries = async () => {
  isLoading.value = true
  try {
    // Simple call to /deliveries endpoint without filters for testing
    const res = await $api('/deliveries', { method: 'GET' })

    console.log('=== Delivery list response ===')
    console.log('Response:', res)
    console.log('==============================')

    // Handle different response formats
    if (Array.isArray(res)) {
      // Response is directly an array
      deliveries.value = res
      total.value = res.length
    } else if (res && res.success && res.data) {
      // Response has { success: true, data: [...] } structure
      if (Array.isArray(res.data)) {
        deliveries.value = res.data
        // Handle pagination meta
        if (res.meta && res.meta.total) {
          const metaTotal = res.meta.total
          total.value = Array.isArray(metaTotal) && metaTotal.length > 0 ? metaTotal[0] : (typeof metaTotal === 'number' ? metaTotal : res.data.length)
        } else {
          total.value = res.data.length
        }
      } else if (res.data.data && Array.isArray(res.data.data)) {
        // Nested structure: { success: true, data: { data: [...], meta: {...} } }
        deliveries.value = res.data.data
        const metaTotal = res.data.meta?.total
        total.value = Array.isArray(metaTotal) && metaTotal.length > 0 ? metaTotal[0] : (typeof metaTotal === 'number' ? metaTotal : res.data.data.length)
      } else {
        deliveries.value = []
        total.value = 0
      }
    } else if (res && Array.isArray(res.data)) {
      // Response has { data: [...], meta: {...} } structure (without success)
      deliveries.value = res.data
      const metaTotal = res.meta?.total
      total.value = Array.isArray(metaTotal) && metaTotal.length > 0 ? metaTotal[0] : (typeof metaTotal === 'number' ? metaTotal : res.data.length)
    } else {
      deliveries.value = []
      total.value = 0
    }
    
    console.log('=== Processed deliveries ===')
    console.log('Deliveries count:', deliveries.value.length)
    console.log('Total:', total.value)
    if (deliveries.value.length > 0) {
      console.log('First delivery:', deliveries.value[0])
    }
    console.log('=============================')
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
  successSnackText.value = t('Delivery created successfully')
  isSuccessSnackVisible.value = true
  fetchDeliveries()
}

// View delivery details
const viewDelivery = delivery => {
  console.log('View delivery:', delivery)
  // TODO: Implement view delivery dialog or navigate to detail page
  // For now, we can show an alert or open a dialog
  alert(t('View delivery details') + ': ' + (delivery.id || 'N/A'))
}

// Edit delivery
const editDelivery = delivery => {
  console.log('Edit delivery:', delivery)
  // TODO: Implement edit delivery dialog
  // For now, we can show an alert or open a dialog
  alert(t('Edit delivery') + ': ' + (delivery.id || 'N/A'))
}
</script>

<template>
  <section>
    <VCard class="mb-6">
      <VCardItem class="pb-4">
        <VCardTitle>{{ $t('Ongoing Deliveries') }}</VCardTitle>
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
              :placeholder="$t('Filter by status')"
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
              :placeholder="$t('Search by requester name or phone')"
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
              {{ $t('Add Delivery') }}
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

          <!-- Customer -->
          <template #item.customer="{ item }">
            <div
              v-if="item?.customer"
              class="d-flex flex-column"
            >
              <span class="text-high-emphasis font-weight-medium">
                {{ (item.customer.full_name || `${item.customer.first_name || ''} ${item.customer.last_name || ''}`.trim() || '—').toUpperCase() }}
              </span>
              <a
                v-if="item.customer.phone"
                :href="`tel:${item.customer.phone}`"
                class="text-xs text-primary text-decoration-none"
              >
                {{ item.customer.phone }}
              </a>
            </div>
            <span v-else>—</span>
          </template>

          <!-- Partner -->
          <template #item.partner="{ item }">
            <div
              v-if="item?.partner"
              class="d-flex flex-column"
            >
              <span class="text-high-emphasis font-weight-medium">
                {{ (item.partner.name || '—').toUpperCase() }}
              </span>
              <span
                v-if="item.partner.contact_name"
                class="text-xs text-disabled"
              >
                {{ item.partner.contact_name }}
              </span>
              <a
                v-if="item.partner.phone"
                :href="`tel:${item.partner.phone}`"
                class="text-xs text-primary text-decoration-none"
              >
                {{ item.partner.phone }}
              </a>
            </div>
            <span v-else>—</span>
          </template>

          <!-- Driver -->
          <template #item.driver="{ item }">
            <div
              v-if="item?.driver"
              class="d-flex flex-column"
            >
              <span class="text-high-emphasis font-weight-medium">
                {{ `${item.driver.first_name || ''} ${item.driver.last_name || ''}`.trim() || '—' }}
              </span>
              <span
                v-if="item.driver.plate_number"
                class="text-xs text-disabled"
              >
                {{ item.driver.plate_number }}
              </span>
              <a
                v-if="item.driver.phone"
                :href="`tel:${item.driver.phone}`"
                class="text-xs text-primary text-decoration-none"
              >
                {{ item.driver.phone }}
              </a>
            </div>
            <span v-else>—</span>
          </template>

          <!-- Pickup Location -->
          <template #item.pickup_location="{ item }">
            <div
              v-if="item?.pickup_location"
              class="text-body-2"
              style="max-inline-size: 200px;"
            >
              {{ item.pickup_location }}
            </div>
            <span v-else>—</span>
          </template>

          <!-- Dropoff Location -->
          <template #item.dropoff_location="{ item }">
            <div
              v-if="item?.dropoff_location"
              class="text-body-2"
              style="max-inline-size: 200px;"
            >
              {{ item.dropoff_location }}
            </div>
            <span v-else>—</span>
          </template>

          <!-- Distance -->
          <template #item.distance_km="{ item }">
            <span class="text-high-emphasis">
              {{ item?.distance_km ? `${item.distance_km} ${$t('km')}` : '—' }}
            </span>
          </template>

          <!-- Price -->
          <template #item.price="{ item }">
            {{ formatPrice(item?.price) }}
          </template>

          <!-- Status -->
          <template #item.status="{ item }">
            <VChip
              size="small"
              :color="getStatusColor(item?.status?.name || item?.status)"
              label
              class="text-capitalize"
            >
              {{ item?.status?.name || getStatusLabel(item?.status) || item?.status || $t('Unknown') }}
            </VChip>
          </template>

          <!-- Start Time -->
          <template #item.start_at="{ item }">
            <div class="d-flex flex-column">
              <span class="text-high-emphasis">
                {{ formatDateTime(item?.timestamps?.start_at || item?.start_at) }}
              </span>
            </div>
          </template>

          <!-- Delivered At -->
          <template #item.delivered_at="{ item }">
            <div class="d-flex flex-column">
              <span
                v-if="item?.timestamps?.delivered_at || item?.delivered_at"
                class="text-high-emphasis"
              >
                {{ formatDateTime(item?.timestamps?.delivered_at || item?.delivered_at) }}
              </span>
              <span
                v-else
                class="text-disabled"
              >
                —
              </span>
            </div>
          </template>

          <!-- Creator -->
          <template #item.creator="{ item }">
            <div
              v-if="item?.created_by"
              class="d-flex flex-column"
            >
              <span class="text-high-emphasis">
                {{ item.created_by.name || '—' }}
              </span>
            </div>
            <span v-else>—</span>
          </template>

          <!-- Created At -->
          <template #item.created_at="{ item }">
            <span class="text-high-emphasis">
              {{ formatDate(item?.timestamps?.created_at || item?.created_at) }}
            </span>
          </template>

          <!-- Actions -->
          <template #item.actions="{ item }">
            <div class="d-flex gap-2">
              <IconBtn @click.stop="viewDelivery(item)">
                <VIcon icon="tabler-eye" />
                <VTooltip activator="parent">
                  {{ $t('View Delivery') }}
                </VTooltip>
              </IconBtn>

              <IconBtn @click.stop="editDelivery(item)">
                <VIcon icon="tabler-pencil" />
                <VTooltip activator="parent">
                  {{ $t('Edit Delivery') }}
                </VTooltip>
              </IconBtn>
            </div>
          </template>
        </VDataTableServer>
      </VCardText>
    </VCard>

    <!-- Add Delivery Dialog -->
    <DeliveryAddDialog
      v-model:is-dialog-visible="isAddDeliveryDialogOpen"
      @delivery-added="onDeliveryAdded"
    />

    <!-- Success Notification -->
    <VSnackbar
      v-model="isSuccessSnackVisible"
      location="top right"
      timeout="3000"
      color="success"
      variant="elevated"
    >
      {{ successSnackText }}
    </VSnackbar>
  </section>
</template>
