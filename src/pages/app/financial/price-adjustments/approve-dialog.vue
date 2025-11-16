<script setup>
/* eslint-disable camelcase */
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  request: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:isDialogVisible', 'requestApproved'])

const dialogVisible = computed({
  get: () => props.isDialogVisible,
  set: val => emit('update:isDialogVisible', val),
})

// Form data
const form = ref({
  price: '',
  reason: '',
})

const isSubmitting = ref(false)
const errors = ref({})

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

// Initialize form when request changes
watch(() => props.request, newRequest => {
  if (newRequest) {
    form.value.price = newRequest.requested_price || ''
    form.value.reason = ''
  }
}, { immediate: true })

// Submit form
const onSubmit = async () => {
  // Validation
  errors.value = {}

  if (!form.value.price || parseFloat(form.value.price) <= 0) {
    errors.value.price = t('Valid price is required') || 'Un prix valide est requis'
  }

  if (Object.keys(errors.value).length > 0) {
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      price: parseFloat(form.value.price),
      ...(form.value.reason && { reason: form.value.reason }),
    }

    const response = await $api(`/price-adjustment-requests/${props.request.id}/approve`, {
      method: 'POST',
      body: payload,
    })

    if (response?.success) {
      emit('requestApproved')
      resetForm()
      dialogVisible.value = false
    } else {
      errors.value.submit = response?.message || t('Failed to approve request. Please try again.') || 'Échec de l\'approbation de la demande. Veuillez réessayer.'
    }
  } catch (error) {
    console.error('Error approving request:', error)
    errors.value.submit = t('Failed to approve request. Please try again.') || 'Échec de l\'approbation de la demande. Veuillez réessayer.'
  } finally {
    isSubmitting.value = false
  }
}

// Reset form
const resetForm = () => {
  form.value = {
    price: '',
    reason: '',
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
    :width="$vuetify.display.smAndDown ? 'auto' : 600"
    :model-value="dialogVisible"
    @update:model-value="val => dialogVisible = val"
  >
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="dialogVisible = false" />

    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>{{ $t('Approve Price Adjustment Request') || 'Approuver la demande de rabais' }}</span>
      </VCardTitle>

      <VDivider />

      <VCardText>
        <VForm @submit.prevent="onSubmit">
          <!-- Request Info -->
          <VAlert
            v-if="request"
            type="info"
            variant="tonal"
            class="mb-4"
          >
            <div class="d-flex flex-column gap-2">
              <div>
                <strong>{{ $t('Delivery') || 'Livraison' }}:</strong> #{{ request.delivery_id || request.delivery?.id }}
              </div>
              <div>
                <strong>{{ $t('Current Price') || 'Prix actuel' }}:</strong> {{ formatPrice(request.current_price) }}
              </div>
              <div>
                <strong>{{ $t('Requested Price') || 'Prix demandé' }}:</strong> {{ formatPrice(request.requested_price) }}
              </div>
              <div>
                <strong>{{ $t('Discount') || 'Rabais' }}:</strong> - {{ formatPrice(request.discount_amount) }} ({{ request.discount_percentage?.toFixed(2) || '0.00' }}%)
              </div>
              <div
                v-if="request.reason"
                class="mt-2"
              >
                <strong>{{ $t('Reason') || 'Raison' }}:</strong> {{ request.reason }}
              </div>
            </div>
          </VAlert>

          <VRow>
            <!-- Final Price -->
            <VCol cols="12">
              <AppTextField
                v-model="form.price"
                :label="($t('Final Price (XOF)') || 'Prix final (XOF)')"
                type="number"
                placeholder="0"
                required
                suffix="XOF"
                :error-messages="errors.price"
                :hint="($t('You can modify the requested price if needed') || 'Vous pouvez modifier le prix demandé si nécessaire')"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-currency-dollar" />
                </template>
              </AppTextField>
            </VCol>

            <!-- Approval Reason -->
            <VCol cols="12">
              <AppTextarea
                v-model="form.reason"
                :label="($t('Approval Reason (Optional)') || 'Raison de l\'approbation (Optionnel)')"
                :placeholder="($t('Any additional notes about this approval...') || 'Toute note supplémentaire concernant cette approbation...')"
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
          color="success"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          @click="onSubmit"
        >
          {{ $t('Approve') || 'Approuver' }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

