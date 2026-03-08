<script setup>
/* eslint-disable camelcase */
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  driverData: {
    type: Object,
    default: null,
  },
  paymentDate: {
    type: String,
    // Utiliser la date locale (pas UTC) pour éviter le décalage d'un jour en UTC+1
    default: () => {
      const today = new Date()

      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    },
  },
})

const emit = defineEmits(['update:isDialogVisible', 'settlementCreated'])

const dialogVisible = computed({
  get: () => props.isDialogVisible,
  set: val => emit('update:isDialogVisible', val),
})

// Form data
const form = ref({
  driver_id: null,
  payment_date: '',
  amount_paid: '',
  driver_expenses: [],
  notes: '',
})

// Unpaid deliveries data
const unpaidDeliveries = ref([])
const expectedAmount = ref(0)
const isLoadingDeliveries = ref(false)
const isSubmitting = ref(false)
const errors = ref({})

// Expense categories (you may need to fetch these from API)
const expenseCategories = ref([
  { id: 1, name: 'Fuel', title: t('Fuel') },
  { id: 2, name: 'Maintenance', title: t('Maintenance') },
  { id: 3, name: 'Repair', title: t('Repair') },
  { id: 4, name: 'Other', title: t('Other') },
])

// New expense form
const newExpense = ref({
  title: '',
  amount: '',
  category_id: null,
})

// Calculate difference
const difference = computed(() => {
  const paid = parseFloat(form.value.amount_paid) || 0
  const expected = expectedAmount.value || 0
  const expensesTotal = form.value.driver_expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0)
  
  return paid - expected - expensesTotal
})

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

// Get driver ID from driverData (handles different structures)
const getDriverId = () => {
  if (!props.driverData) {
    return null
  }
  
  // Handle structure from drivers-to-settle: { driver_id, driver_name, ... }
  if (props.driverData.driver_id) {
    return props.driverData.driver_id
  }
  
  // Handle structure with driver object: { driver: { id, ... } }
  if (props.driverData.driver?.id) {
    return props.driverData.driver.id
  }
  
  // Handle direct driver object
  if (props.driverData.id) {
    return props.driverData.id
  }
  
  return null
}

// Fetch unpaid deliveries
const fetchUnpaidDeliveries = async () => {
  const driverId = getDriverId()
  
  if (!driverId || !props.paymentDate) {
    return
  }

  isLoadingDeliveries.value = true
  try {
    const response = await $api(`/driver-payments/unpaid-deliveries?driver_id=${driverId}&date=${props.paymentDate}`, {
      method: 'GET',
    })

    if (response?.success && response?.data) {
      unpaidDeliveries.value = response.data.unpaid_deliveries || response.data.deliveries || []
      expectedAmount.value = response.data.total_amount || 0
      
      // Pre-fill form
      form.value.driver_id = driverId
      form.value.payment_date = props.paymentDate
    } else if (response?.data) {
      unpaidDeliveries.value = response.data.unpaid_deliveries || response.data.deliveries || []
      expectedAmount.value = response.data.total_amount || 0
      form.value.driver_id = driverId
      form.value.payment_date = props.paymentDate
    }
  } catch (error) {
    console.error('Error fetching unpaid deliveries:', error)
    errors.value.fetch = t('Failed to fetch unpaid deliveries') || 'Échec de la récupération des livraisons non payées'
  } finally {
    isLoadingDeliveries.value = false
  }
}

// Add expense
const addExpense = () => {
  if (!newExpense.value.title || !newExpense.value.amount || !newExpense.value.category_id) {
    return
  }

  form.value.driver_expenses.push({
    title: newExpense.value.title,
    amount: parseFloat(newExpense.value.amount),
    category_id: newExpense.value.category_id,
  })

  // Reset new expense form
  newExpense.value = {
    title: '',
    amount: '',
    category_id: null,
  }
}

// Remove expense
const removeExpense = (index) => {
  form.value.driver_expenses.splice(index, 1)
}

// Submit form
const onSubmit = async () => {
  // Validation
  errors.value = {}

  if (!form.value.driver_id) {
    errors.value.driver_id = t('Driver is required')
  }

  if (!form.value.payment_date) {
    errors.value.payment_date = t('Payment date is required')
  }

  if (!form.value.amount_paid || parseFloat(form.value.amount_paid) <= 0) {
    errors.value.amount_paid = t('Valid amount paid is required')
  }

  if (Object.keys(errors.value).length > 0) {
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      driver_id: form.value.driver_id,
      payment_date: form.value.payment_date,
      amount_paid: parseFloat(form.value.amount_paid),
      driver_expenses: form.value.driver_expenses,
      notes: form.value.notes,
      // Note: We don't send delivery_ids - the backend will automatically fetch unpaid deliveries
    }

    const response = await $api('/driver-payments', {
      method: 'POST',
      body: payload,
    })

    if (response?.success) {
      emit('settlementCreated')
      resetForm()
      dialogVisible.value = false
    } else {
      errors.value.submit = response?.message || t('Failed to create settlement. Please try again.')
    }
  } catch (error) {
    console.error('Error creating settlement:', error)
    errors.value.submit = t('Failed to create settlement. Please try again.')
  } finally {
    isSubmitting.value = false
  }
}

// Reset form
const resetForm = () => {
  form.value = {
    driver_id: null,
    payment_date: '',
    amount_paid: '',
    driver_expenses: [],
    notes: '',
  }
  unpaidDeliveries.value = []
  expectedAmount.value = 0
  newExpense.value = {
    title: '',
    amount: '',
    category_id: null,
  }
  errors.value = {}
}

// Close dialog
const onClose = () => {
  resetForm()
  dialogVisible.value = false
}

// Watch for dialog open to fetch data
watch(dialogVisible, (newVal) => {
  if (newVal && props.driverData) {
    fetchUnpaidDeliveries()
  } else if (!newVal) {
    resetForm()
  }
})

// Watch for driverData changes
watch(() => props.driverData, () => {
  if (dialogVisible.value && props.driverData) {
    fetchUnpaidDeliveries()
  }
}, { deep: true })
</script>

<template>
  <VDialog
    :width="$vuetify.display.smAndDown ? 'auto' : 900"
    :model-value="dialogVisible"
    @update:model-value="val => dialogVisible = val"
    scrollable
  >
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="dialogVisible = false" />

    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>{{ $t('Create Settlement') }}</span>
      </VCardTitle>

      <VDivider />

      <VCardText>
        <VForm @submit.prevent="onSubmit">
          <!-- Loading state -->
          <div
            v-if="isLoadingDeliveries"
            class="text-center py-8"
          >
            <VProgressCircular
              indeterminate
              color="primary"
            />
            <p class="mt-4">
              {{ $t('Loading unpaid deliveries...') }}
            </p>
          </div>

          <!-- Form content -->
          <template v-else>
            <!-- Driver Info -->
            <VAlert
              v-if="driverData"
              type="info"
              variant="tonal"
              class="mb-4"
            >
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="font-weight-medium">
                    {{ driverData.driver_name || driverData.driver?.user?.name || driverData.driver?.name || driverData.driver?.first_name && driverData.driver?.last_name 
                      ? `${driverData.driver.first_name} ${driverData.driver.last_name}`.trim()
                      : $t('Unknown Driver') || 'Livreur inconnu' }}
                  </div>
                  <div class="text-sm">
                    {{ $t('Expected Amount') || 'Montant attendu' }}: <strong>{{ formatPrice(expectedAmount) }}</strong>
                  </div>
                  <div class="text-sm">
                    {{ $t('Deliveries Count') || 'Nombre de livraisons' }}: <strong>{{ unpaidDeliveries.length }}</strong>
                  </div>
                </div>
              </div>
            </VAlert>

            <!-- Unpaid Deliveries List -->
            <VCard
              v-if="unpaidDeliveries.length > 0"
              variant="outlined"
              class="mb-4"
            >
              <VCardTitle class="text-sm">
                {{ $t('Unpaid Deliveries') }} ({{ unpaidDeliveries.length }})
              </VCardTitle>
              <VCardText>
                <VList>
                  <VListItem
                    v-for="delivery in unpaidDeliveries"
                    :key="delivery.id"
                    class="px-0"
                  >
                    <VListItemTitle>
                      {{ $t('Delivery') }} #{{ delivery.id }}
                    </VListItemTitle>
                    <VListItemSubtitle>
                      {{ formatPrice(delivery.price) }} - {{ delivery.partner?.merchant_name || $t('Unknown Partner') }}
                    </VListItemSubtitle>
                  </VListItem>
                </VList>
              </VCardText>
            </VCard>

            <VRow>
              <!-- Payment Date -->
              <VCol
                cols="12"
                md="6"
              >
                <AppDateTimePicker
                  v-model="form.payment_date"
                  :label="$t('Payment Date')"
                  :placeholder="$t('Select payment date')"
                  :config="{ dateFormat: 'Y-m-d' }"
                  required
                  :error-messages="errors.payment_date"
                >
                  <template #prepend-inner>
                    <VIcon icon="tabler-calendar" />
                  </template>
                </AppDateTimePicker>
              </VCol>

              <!-- Amount Paid -->
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.amount_paid"
                  :label="$t('Amount Paid (XOF)')"
                  type="number"
                  placeholder="0"
                  required
                  suffix="XOF"
                  :error-messages="errors.amount_paid"
                >
                  <template #prepend-inner>
                    <VIcon icon="tabler-currency-dollar" />
                  </template>
                </AppTextField>
              </VCol>

              <!-- Expected Amount Display -->
              <VCol
                cols="12"
                md="6"
              >
                <VCard
                  variant="outlined"
                  color="info"
                >
                  <VCardText>
                    <div class="text-sm text-medium-emphasis">
                      {{ $t('Expected Amount') }}
                    </div>
                    <div class="text-h6 font-weight-medium">
                      {{ formatPrice(expectedAmount) }}
                    </div>
                  </VCardText>
                </VCard>
              </VCol>

              <!-- Difference Display -->
              <VCol
                cols="12"
                md="6"
              >
                <VCard
                  variant="outlined"
                  :color="difference >= 0 ? 'success' : 'error'"
                >
                  <VCardText>
                    <div class="text-sm text-medium-emphasis">
                      {{ $t('Difference') }}
                    </div>
                    <div class="text-h6 font-weight-medium">
                      {{ formatPrice(difference) }}
                    </div>
                  </VCardText>
                </VCard>
              </VCol>

              <!-- Driver Expenses Section -->
              <VCol cols="12">
                <VDivider class="my-2" />
                <h6 class="text-h6 mb-4">
                  {{ $t('Driver Expenses (Optional)') }}
                </h6>
              </VCol>

              <!-- Add Expense Form -->
              <VCol
                cols="12"
                md="4"
              >
                <AppTextField
                  v-model="newExpense.title"
                  :label="$t('Expense Title')"
                  :placeholder="$t('e.g., Fuel, Maintenance')"
                />
              </VCol>

              <VCol
                cols="12"
                md="3"
              >
                <AppTextField
                  v-model="newExpense.amount"
                  :label="$t('Amount')"
                  type="number"
                  placeholder="0"
                  suffix="XOF"
                />
              </VCol>

              <VCol
                cols="12"
                md="3"
              >
                <AppSelect
                  v-model="newExpense.category_id"
                  :items="expenseCategories.map(cat => ({ title: cat.title, value: cat.id }))"
                  :label="$t('Category')"
                  :placeholder="$t('Select category')"
                />
              </VCol>

              <VCol
                cols="12"
                md="2"
                class="d-flex align-end"
              >
                <VBtn
                  color="primary"
                  variant="tonal"
                  block
                  @click="addExpense"
                >
                  {{ $t('Add') }}
                </VBtn>
              </VCol>

              <!-- Expenses List -->
              <VCol
                v-if="form.driver_expenses.length > 0"
                cols="12"
              >
                <VCard
                  variant="outlined"
                  class="mt-2"
                >
                  <VCardText>
                    <VList>
                      <VListItem
                        v-for="(expense, index) in form.driver_expenses"
                        :key="index"
                        class="px-0"
                      >
                        <VListItemTitle>
                          {{ expense.title }}
                        </VListItemTitle>
                        <VListItemSubtitle>
                          {{ formatPrice(expense.amount) }}
                        </VListItemSubtitle>
                        <template #append>
                          <VBtn
                            icon
                            size="small"
                            variant="text"
                            color="error"
                            @click="removeExpense(index)"
                          >
                            <VIcon icon="tabler-trash" />
                          </VBtn>
                        </template>
                      </VListItem>
                    </VList>
                    <VDivider class="my-2" />
                    <div class="d-flex justify-space-between">
                      <span class="font-weight-medium">
                        {{ $t('Total Expenses') }}:
                      </span>
                      <span class="font-weight-medium">
                        {{ formatPrice(form.driver_expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0)) }}
                      </span>
                    </div>
                  </VCardText>
                </VCard>
              </VCol>

              <!-- Notes -->
              <VCol cols="12">
                <AppTextarea
                  v-model="form.notes"
                  :label="$t('Notes (Optional)')"
                  :placeholder="$t('Any additional notes about this settlement...')"
                  rows="3"
                />
              </VCol>

              <!-- Error message -->
              <VCol
                v-if="errors.submit || errors.fetch"
                cols="12"
              >
                <VAlert
                  type="error"
                  variant="tonal"
                >
                  {{ errors.submit || errors.fetch }}
                </VAlert>
              </VCol>
            </VRow>
          </template>
        </VForm>
      </VCardText>

      <VDivider />

      <VCardActions class="d-flex justify-end gap-3 pa-4">
        <VBtn
          color="secondary"
          variant="tonal"
          @click="onClose"
        >
          {{ $t('Cancel') }}
        </VBtn>
        <VBtn
          color="primary"
          :loading="isSubmitting"
          :disabled="isSubmitting || isLoadingDeliveries"
          @click="onSubmit"
        >
          {{ $t('Create Settlement') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

