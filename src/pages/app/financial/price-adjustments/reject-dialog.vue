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

const emit = defineEmits(['update:isDialogVisible', 'requestRejected'])

const dialogVisible = computed({
  get: () => props.isDialogVisible,
  set: val => emit('update:isDialogVisible', val),
})

// Form data
const form = ref({
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

// Reset form when dialog opens
watch(dialogVisible, newVal => {
  if (newVal) {
    form.value.reason = ''
    errors.value = {}
  }
})

// Submit form
const onSubmit = async () => {
  isSubmitting.value = true
  try {
    const payload = {}
    if (form.value.reason) {
      payload.reason = form.value.reason
    }

    const response = await $api(`/price-adjustment-requests/${props.request.id}/reject`, {
      method: 'POST',
      body: payload,
    })

    if (response?.success) {
      emit('requestRejected')
      resetForm()
      dialogVisible.value = false
    } else {
      errors.value.submit = response?.message || t('Failed to reject request. Please try again.') || 'Échec du rejet de la demande. Veuillez réessayer.'
    }
  } catch (error) {
    console.error('Error rejecting request:', error)
    errors.value.submit = t('Failed to reject request. Please try again.') || 'Échec du rejet de la demande. Veuillez réessayer.'
  } finally {
    isSubmitting.value = false
  }
}

// Reset form
const resetForm = () => {
  form.value = {
    reason: '',
  }
  errors.value = {}
}

// Close dialog
const onClose = () => {
  resetForm()
  dialogVisible.value = false
}
</script>

<template>
  <VDialog
    :width="$vuetify.display.smAndDown ? 'auto' : 500"
    :model-value="dialogVisible"
    @update:model-value="val => dialogVisible = val"
  >
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="dialogVisible = false" />

    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>{{ $t('Reject Price Adjustment Request') || 'Rejeter la demande de rabais' }}</span>
      </VCardTitle>

      <VDivider />

      <VCardText>
        <VForm @submit.prevent="onSubmit">
          <!-- Request Info -->
          <VAlert
            v-if="request"
            type="warning"
            variant="tonal"
            class="mb-4"
          >
            <div class="d-flex flex-column gap-2">
              <div>
                <strong>{{ $t('Delivery') || 'Livraison' }}:</strong> #{{ request.delivery_id || request.delivery?.id }}
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
                <strong>{{ $t('Original Reason') || 'Raison originale' }}:</strong> {{ request.reason }}
              </div>
            </div>
          </VAlert>

          <VRow>
            <!-- Rejection Reason -->
            <VCol cols="12">
              <AppTextarea
                v-model="form.reason"
                :label="($t('Rejection Reason (Optional)') || 'Raison du rejet (Optionnel)')"
                :placeholder="($t('Explain why this request is being rejected...') || 'Expliquez pourquoi cette demande est rejetée...')"
                rows="4"
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
          color="error"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          @click="onSubmit"
        >
          {{ $t('Reject') || 'Rejeter' }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

