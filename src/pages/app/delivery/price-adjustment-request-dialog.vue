<script setup>
/* eslint-disable camelcase */
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  delivery: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:isDialogVisible', 'requestCreated'])

const dialogVisible = computed({
  get: () => props.isDialogVisible,
  set: val => emit('update:isDialogVisible', val),
})

// Form data
const form = ref({
  requested_price: '',
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

// Calculate price adjustment
const priceAdjustment = computed(() => {
  if (!form.value.requested_price || !props.delivery?.price) {
    return 0
  }

  const current = parseFloat(props.delivery.price)
  const requested = parseFloat(form.value.requested_price)

  return requested - current
})

const isDiscount = computed(() => priceAdjustment.value < 0)
const isIncrease = computed(() => priceAdjustment.value > 0)

const adjustmentPercentage = computed(() => {
  if (!props.delivery?.price || priceAdjustment.value === 0) {
    return 0
  }

  const current = parseFloat(props.delivery.price)
  return (Math.abs(priceAdjustment.value) / current) * 100
})

// Initialize form when delivery changes
watch(() => props.delivery, newDelivery => {
  if (newDelivery) {
    // Pre-fill with current price (user can modify)
    form.value.requested_price = newDelivery.price || ''
    form.value.reason = ''
  }
}, { immediate: true })

// Submit form
const onSubmit = async () => {
  // Validation
  errors.value = {}

  if (!form.value.requested_price || parseFloat(form.value.requested_price) <= 0) {
    errors.value.requested_price = t('Valid requested price is required') || 'Un prix demandé valide est requis'
  }

  // No need to validate if price is higher or lower, both are acceptable now
  // Just ensure it's a valid positive number (handled by the first check)

  if (Object.keys(errors.value).length > 0) {
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      requested_price: parseFloat(form.value.requested_price),
      ...(form.value.reason && { reason: form.value.reason }),
    }

    const response = await $api(`/deliveries/${props.delivery.id}/price-adjustment-requests`, {
      method: 'POST',
      body: payload,
    })

    if (response?.success) {
      emit('requestCreated')
      resetForm()
      dialogVisible.value = false
    } else {
      errors.value.submit = response?.message || t('Failed to create price adjustment request. Please try again.') || 'Échec de la création de la demande de rabais. Veuillez réessayer.'
    }
  } catch (error) {
    console.error('Error creating price adjustment request:', error)
    
    // Handle specific error cases
    if (error?.data?.message) {
      errors.value.submit = error.data.message
    } else if (error?.response?.status === 422) {
      errors.value.submit = t('A pending request already exists for this delivery') || 'Une demande en attente existe déjà pour cette livraison'
    } else {
      errors.value.submit = t('Failed to create price adjustment request. Please try again.') || 'Échec de la création de la demande de rabais. Veuillez réessayer.'
    }
  } finally {
    isSubmitting.value = false
  }
}

// Reset form
const resetForm = () => {
  form.value = {
    requested_price: '',
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
        <span>{{ $t('Price Adjustment Request') || 'Demande de réajustement de prix' }}</span>
      </VCardTitle>

      <VDivider />

      <VCardText>
        <VForm @submit.prevent="onSubmit">
          <!-- Delivery Info -->
          <VAlert
            v-if="delivery"
            type="info"
            variant="tonal"
            class="mb-4"
          >
            <div class="d-flex flex-column gap-2">
              <div>
                <strong>{{ $t('Delivery') || 'Livraison' }}:</strong> #{{ delivery.id }}
              </div>
              <div
                v-if="delivery.partner"
              >
                <strong>{{ $t('Partner') || 'Partenaire' }}:</strong> {{ delivery.partner.name || delivery.partner.merchant_name || $t('Unknown') || 'Inconnu' }}
              </div>
              <div>
                <strong>{{ $t('Current Price') || 'Prix actuel' }}:</strong> {{ formatPrice(delivery.price) }}
              </div>
              <div v-if="form.requested_price">
                <strong v-if="isDiscount">{{ $t('Discount Amount') || 'Montant du rabais' }}:</strong>
                <strong v-else-if="isIncrease">{{ $t('Price Increase') || 'Majoration' }}:</strong>
                <span v-if="form.requested_price">
                  {{ formatPrice(Math.abs(priceAdjustment)) }} 
                  <small>({{ adjustmentPercentage.toFixed(1) }}%)</small>
                </span>
              </div>
            </div>
          </VAlert>

          <VRow>
            <!-- Requested Price -->
            <VCol cols="12">
              <AppTextField
                v-model="form.requested_price"
                :label="$t('New Price') || 'Nouveau prix'"
                type="number"
                :hint="$t('Enter the new price (can be higher or lower)') || 'Entrez le nouveau prix (peut être supérieur ou inférieur)'"
                suffix="XOF"
                :error-messages="errors.requested_price"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-currency-dollar" />
                </template>
              </AppTextField>
            </VCol>

            <!-- Reason -->
            <VCol cols="12">
              <AppTextarea
                v-model="form.reason"
                :hint="$t('Optional reason for the price adjustment') || 'Raison optionnelle pour le réajustement de prix'"
                :placeholder="($t('Explain why you are requesting this price adjustment...') || 'Expliquez pourquoi vous demandez cet ajustement de prix...')"
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
          <template v-if="isDiscount">
            {{ $t('Request Discount') || 'Demander un rabais' }}
          </template>
          <template v-else-if="isIncrease">
            {{ $t('Request Price Increase') || 'Demander une majoration' }}
          </template>
          <template v-else>
            {{ $t('Submit Price Adjustment') || 'Soumettre le réajustement' }}
          </template>
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
