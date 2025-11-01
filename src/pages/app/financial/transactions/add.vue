<script setup>
/* eslint-disable camelcase */
const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  drivers: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:isDialogVisible', 'expenseAdded'])

const dialogVisible = computed({
  get: () => props.isDialogVisible,
  set: val => emit('update:isDialogVisible', val),
})

// Expense types
const expenseTypes = [
  { title: 'Maintenance', value: 'maintenance', icon: 'tabler-tools' },
  { title: 'Fuel', value: 'fuel', icon: 'tabler-gas-station' },
  { title: 'Oil Change', value: 'oil_change', icon: 'tabler-droplet' },
  { title: 'Tires', value: 'tires', icon: 'tabler-circle' },
  { title: 'Insurance', value: 'insurance', icon: 'tabler-shield' },
  { title: 'Repair', value: 'repair', icon: 'tabler-wrench' },
  { title: 'Other', value: 'other', icon: 'tabler-category' },
]

// Form data
const form = ref({
  driver_id: null,
  type: null,
  amount: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  receipt_number: '',
  notes: '',
})

const isSubmitting = ref(false)
const errors = ref({})

// Driver options
const driverOptions = computed(() => {
  return props.drivers.map(driver => ({
    title: `${driver.user?.name || driver.name || 'Unknown'} - ${driver.vehicle_type || 'N/A'}`,
    value: driver.id,
  }))
})

// Submit form
const onSubmit = async () => {
  // Validation
  errors.value = {}

  if (!form.value.driver_id) {
    errors.value.driver_id = 'Driver is required'
  }

  if (!form.value.type) {
    errors.value.type = 'Expense type is required'
  }

  if (!form.value.amount || parseFloat(form.value.amount) <= 0) {
    errors.value.amount = 'Valid amount is required'
  }

  if (!form.value.date) {
    errors.value.date = 'Date is required'
  }

  if (Object.keys(errors.value).length > 0) {
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      driver_id: form.value.driver_id,
      type: form.value.type,
      amount: parseFloat(form.value.amount),
      description: form.value.description,
      date: form.value.date,
      receipt_number: form.value.receipt_number,
      notes: form.value.notes,
    }

    await $api('/financial/transactions', {
      method: 'POST',
      body: payload,
    })

    emit('expenseAdded')
    resetForm()
    dialogVisible.value = false
  } catch (error) {
    console.error('Error creating expense:', error)
    errors.value.submit = 'Failed to create expense. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

// Reset form
const resetForm = () => {
  form.value = {
    driver_id: null,
    type: null,
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    receipt_number: '',
    notes: '',
  }
  errors.value = {}
}

// Close dialog
const onClose = () => {
  resetForm()
  dialogVisible.value = false
}

// Watch for dialog close
watch(dialogVisible, newVal => {
  if (!newVal) {
    resetForm()
  }
})
</script>

<template>
  <VDialog
    :width="$vuetify.display.smAndDown ? 'auto' : 700"
    :model-value="dialogVisible"
    @update:model-value="val => dialogVisible = val"
  >
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="dialogVisible = false" />

    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>Add New Expense</span>
      </VCardTitle>

      <VDivider />

      <VCardText>
        <VForm @submit.prevent="onSubmit">
          <VRow>
            <!-- Driver Selection -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="form.driver_id"
                :items="driverOptions"
                label="Driver"
                placeholder="Select driver"
                required
                :error-messages="errors.driver_id"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-user" />
                </template>
              </AppSelect>
            </VCol>

            <!-- Expense Type -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="form.type"
                :items="expenseTypes"
                label="Expense Type"
                placeholder="Select expense type"
                required
                :error-messages="errors.type"
              >
                <template #prepend-inner>
                  <VIcon :icon="expenseTypes.find(t => t.value === form.type)?.icon || 'tabler-category'" />
                </template>
              </AppSelect>
            </VCol>

            <!-- Amount -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.amount"
                label="Amount (XOF)"
                type="number"
                placeholder="0"
                required
                suffix="XOF"
                :error-messages="errors.amount"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-currency-dollar" />
                </template>
              </AppTextField>
            </VCol>

            <!-- Date -->
            <VCol
              cols="12"
              md="6"
            >
              <AppDateTimePicker
                v-model="form.date"
                label="Date"
                placeholder="Select date"
                :config="{ dateFormat: 'Y-m-d' }"
                required
                :error-messages="errors.date"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-calendar" />
                </template>
              </AppDateTimePicker>
            </VCol>

            <!-- Description -->
            <VCol cols="12">
              <AppTextField
                v-model="form.description"
                label="Description"
                placeholder="e.g., Vehicle oil change at service center"
              />
            </VCol>

            <!-- Receipt Number -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.receipt_number"
                label="Receipt Number"
                placeholder="Optional receipt/invoice number"
              />
            </VCol>

            <!-- Notes -->
            <VCol cols="12">
              <AppTextarea
                v-model="form.notes"
                label="Additional Notes"
                placeholder="Any additional information..."
                rows="3"
              />
            </VCol>

            <!-- Error message -->
            <VCol
              v-if="errors.submit"
              cols="12"
            >
              <VAlert
                type="error"
                variant="tonal"
              >
                {{ errors.submit }}
              </VAlert>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>

      <VDivider />

      <VCardActions class="d-flex justify-end gap-3 pa-4">
        <VBtn
          color="secondary"
          variant="tonal"
          @click="onClose"
        >
          Cancel
        </VBtn>
        <VBtn
          color="primary"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          @click="onSubmit"
        >
          Create Expense
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

