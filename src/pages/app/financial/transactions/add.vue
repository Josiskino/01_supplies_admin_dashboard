<script setup>
/* eslint-disable camelcase */
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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
const expenseTypes = computed(() => [
  { title: t('Maintenance'), value: 'maintenance', icon: 'tabler-tools' },
  { title: t('Fuel'), value: 'fuel', icon: 'tabler-gas-station' },
  { title: t('Oil Change'), value: 'oil_change', icon: 'tabler-droplet' },
  { title: t('Tires'), value: 'tires', icon: 'tabler-circle' },
  { title: t('Insurance'), value: 'insurance', icon: 'tabler-shield' },
  { title: t('Repair'), value: 'repair', icon: 'tabler-wrench' },
  { title: t('Other'), value: 'other', icon: 'tabler-category' },
])

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
    title: `${driver.user?.name || driver.name || t('Unknown')} - ${driver.vehicle_type || t('N/A')}`,
    value: driver.id,
  }))
})

// Submit form
const onSubmit = async () => {
  // Validation
  errors.value = {}

  if (!form.value.driver_id) {
    errors.value.driver_id = t('Driver is required')
  }

  if (!form.value.type) {
    errors.value.type = t('Expense type is required')
  }

  if (!form.value.amount || parseFloat(form.value.amount) <= 0) {
    errors.value.amount = t('Valid amount is required')
  }

  if (!form.value.date) {
    errors.value.date = t('Date is required')
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
    errors.value.submit = t('Failed to create expense. Please try again.')
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
        <span>{{ $t('Add New Expense') }}</span>
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
                :label="$t('Driver')"
                :placeholder="$t('Select driver')"
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
                :label="$t('Expense Type')"
                :placeholder="$t('Select expense type')"
                required
                :error-messages="errors.type"
              >
                <template #prepend-inner>
                  <VIcon :icon="expenseTypes.find(et => et.value === form.type)?.icon || 'tabler-category'" />
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
                :label="$t('Amount (XOF)')"
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
                :label="$t('Date')"
                :placeholder="$t('Select date')"
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
                :label="$t('Description')"
                :placeholder="$t('e.g., Vehicle oil change at service center')"
              />
            </VCol>

            <!-- Receipt Number -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.receipt_number"
                :label="$t('Receipt Number')"
                :placeholder="$t('Optional receipt/invoice number')"
              />
            </VCol>

            <!-- Notes -->
            <VCol cols="12">
              <AppTextarea
                v-model="form.notes"
                :label="$t('Additional Notes')"
                :placeholder="$t('Any additional information...')"
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
          {{ $t('Cancel') }}
        </VBtn>
        <VBtn
          color="primary"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          @click="onSubmit"
        >
          {{ $t('Create Expense') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

