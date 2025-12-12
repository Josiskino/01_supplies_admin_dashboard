<script setup>
/* eslint-disable camelcase */
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  settlement: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:isDialogVisible', 'settlementUpdated'])

const dialogVisible = computed({
  get: () => props.isDialogVisible,
  set: val => emit('update:isDialogVisible', val),
})

// Form data
const form = ref({
  delivery_ids: [],
  amount_paid: '',
  driver_expenses: [],
  notes: '',
})

// Settlement details
const settlementDetails = ref(null)
const isLoadingDetails = ref(false)
const isSubmitting = ref(false)
const errors = ref({})

// Expense categories
const expenseCategories = ref([
  { id: 1, name: 'Fuel', title: t('Fuel') || 'Carburant' },
  { id: 2, name: 'Maintenance', title: t('Maintenance') || 'Maintenance' },
  { id: 3, name: 'Repair', title: t('Repair') || 'Réparation' },
  { id: 4, name: 'Other', title: t('Other') || 'Autre' },
])

// New expense form
const newExpense = ref({
  title: '',
  description: '',
  amount: '',
  category_id: null,
  expense_date: '',
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

// Get theoretical amount
const getTheoreticalAmount = computed(() => {
  if (!settlementDetails.value) return 0
  return parseFloat(settlementDetails.value.theoretical_amount) || 
         parseFloat(settlementDetails.value.total_deliveries_amount) || 0
})

// Calculate difference in real-time
const calculatedDifference = computed(() => {
  const theoretical = getTheoreticalAmount.value
  const paid = parseFloat(form.value.amount_paid) || 0
  return theoretical - paid
})

// Get difference info
const getDifferenceInfo = computed(() => {
  const diff = calculatedDifference.value
  
  if (Math.abs(diff) < 0.01) {
    return {
      type: 'conform',
      color: 'success',
      icon: 'tabler-check',
      label: t('Conform') || 'Conforme',
      amount: 0,
    }
  } else if (diff > 0) {
    return {
      type: 'missing',
      color: 'error',
      icon: 'tabler-alert-triangle',
      label: t('Missing') || 'Manquant',
      amount: diff,
    }
  } else {
    return {
      type: 'excess',
      color: 'info',
      icon: 'tabler-arrow-up',
      label: t('Excess') || 'Excédent',
      amount: Math.abs(diff),
    }
  }
})

// Check if excess is significant (>10%)
const isSignificantExcess = computed(() => {
  if (getDifferenceInfo.value.type !== 'excess') return false
  const theoretical = getTheoreticalAmount.value
  if (theoretical === 0) return false
  const excessPercent = (getDifferenceInfo.value.amount / theoretical) * 100
  return excessPercent > 10
})

// Fetch settlement details
const fetchSettlementDetails = async () => {
  if (!props.settlement?.id) {
    return
  }

  isLoadingDetails.value = true
  try {
    const response = await $api(`/driver-payments/${props.settlement.id}`, {
      method: 'GET',
    })

    if (response?.success && response?.data) {
      settlementDetails.value = response.data
    } else if (response?.data) {
      settlementDetails.value = response.data
    } else {
      settlementDetails.value = props.settlement
    }

    // Pre-fill form
    if (settlementDetails.value) {
      form.value.amount_paid = settlementDetails.value.amount_paid || ''
      form.value.driver_expenses = settlementDetails.value.driver_expenses?.map(exp => ({
        title: exp.title,
        description: exp.description || '',
        amount: exp.amount,
        category_id: exp.category?.id || exp.category_id,
        expense_date: exp.expense_date || '',
      })) || []
      form.value.notes = settlementDetails.value.notes || ''
      form.value.delivery_ids = settlementDetails.value.deliveries?.map(d => d.id) || []
    }
  } catch (error) {
    console.error('Error fetching settlement details:', error)
    errors.value.fetch = t('Failed to fetch settlement details') || 'Échec de la récupération des détails du règlement'
  } finally {
    isLoadingDetails.value = false
  }
}

// Add expense
const addExpense = () => {
  if (!newExpense.value.title || !newExpense.value.amount) {
    return
  }

  form.value.driver_expenses.push({
    title: newExpense.value.title,
    description: newExpense.value.description || '',
    amount: parseFloat(newExpense.value.amount),
    category_id: newExpense.value.category_id,
    expense_date: newExpense.value.expense_date || new Date().toISOString().slice(0, 10),
  })

  // Reset new expense form
  newExpense.value = {
    title: '',
    description: '',
    amount: '',
    category_id: null,
    expense_date: '',
  }
}

// Remove expense
const removeExpense = index => {
  form.value.driver_expenses.splice(index, 1)
}

// Submit form
const onSubmit = async () => {
  // Validation
  errors.value = {}

  if (!form.value.amount_paid || parseFloat(form.value.amount_paid) <= 0) {
    errors.value.amount_paid = t('Valid amount paid is required') || 'Un montant payé valide est requis'
  }

  if (Object.keys(errors.value).length > 0) {
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      delivery_ids: form.value.delivery_ids,
      amount_paid: parseFloat(form.value.amount_paid),
      driver_expenses: form.value.driver_expenses,
      notes: form.value.notes,
    }

    const response = await $api(`/driver-payments/${props.settlement.id}`, {
      method: 'PATCH',
      body: payload,
    })

    if (response?.success) {
      emit('settlementUpdated')
      dialogVisible.value = false
    } else {
      errors.value.submit = response?.message || (t('Failed to update settlement. Please try again.') || 'Échec de la mise à jour du règlement. Veuillez réessayer.')
    }
  } catch (error) {
    console.error('Error updating settlement:', error)
    errors.value.submit = t('Failed to update settlement. Please try again.') || 'Échec de la mise à jour du règlement. Veuillez réessayer.'
  } finally {
    isSubmitting.value = false
  }
}

// Reset form
const resetForm = () => {
  form.value = {
    delivery_ids: [],
    amount_paid: '',
    driver_expenses: [],
    notes: '',
  }
  newExpense.value = {
    title: '',
    description: '',
    amount: '',
    category_id: null,
    expense_date: '',
  }
  errors.value = {}
  settlementDetails.value = null
}

// Close dialog
const onClose = () => {
  resetForm()
  dialogVisible.value = false
}

// Watch for dialog open to fetch data
watch(dialogVisible, newVal => {
  if (newVal && props.settlement) {
    fetchSettlementDetails()
  } else if (!newVal) {
    resetForm()
  }
})

// Watch for settlement prop change
watch(() => props.settlement, () => {
  if (dialogVisible.value && props.settlement) {
    fetchSettlementDetails()
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
        <span>{{ $t('Edit Settlement') || 'Modifier le règlement' }}</span>
      </VCardTitle>

      <VDivider />

      <VCardText>
        <VForm @submit.prevent="onSubmit">
          <!-- Loading state -->
          <div
            v-if="isLoadingDetails"
            class="text-center py-8"
          >
            <VProgressCircular
              indeterminate
              color="primary"
            />
            <p class="mt-4">
              {{ $t('Loading settlement details...') || 'Chargement des détails du règlement...' }}
            </p>
          </div>

          <!-- Form content -->
          <template v-else-if="settlementDetails">
            <!-- Error Alert -->
            <VAlert
              v-if="errors.fetch || errors.submit"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              {{ errors.fetch || errors.submit }}
            </VAlert>

            <!-- Settlement Info -->
            <VAlert
              type="info"
              variant="tonal"
              class="mb-4"
            >
              <div>
                <div class="font-weight-medium mb-2">
                  {{ $t('Driver') || 'Livreur' }}: {{ settlementDetails.driver?.first_name && settlementDetails.driver?.last_name
                    ? `${settlementDetails.driver.first_name} ${settlementDetails.driver.last_name}`.trim()
                    : settlementDetails.driver?.user?.name || settlementDetails.driver?.name || $t('Unknown') || 'Inconnu' }}
                </div>
                <div class="text-sm">
                  {{ $t('Settlement Date') || 'Date de règlement' }}: {{ settlementDetails.settlement_date || settlementDetails.payment_date }}
                </div>
                <div class="text-sm">
                  {{ $t('Total Deliveries Amount') || 'Montant total livraisons' }}: <strong>{{ formatPrice(settlementDetails.total_deliveries_amount) }}</strong>
                </div>
              </div>
            </VAlert>

            <!-- Deliveries List (read-only) -->
            <VCard
              v-if="settlementDetails.deliveries && settlementDetails.deliveries.length > 0"
              variant="outlined"
              class="mb-4"
            >
              <VCardTitle class="text-sm">
                {{ $t('Deliveries') }} ({{ settlementDetails.deliveries.length }})
              </VCardTitle>
              <VCardText>
                <VList>
                  <VListItem
                    v-for="delivery in settlementDetails.deliveries"
                    :key="delivery.id"
                    class="px-0"
                  >
                    <VListItemTitle>
                      {{ $t('Delivery') || 'Livraison' }} #{{ delivery.id }}
                    </VListItemTitle>
                    <VListItemSubtitle>
                      {{ formatPrice(delivery.price) }} - {{ delivery.partner?.name || delivery.partner?.merchant_name || $t('Unknown Partner') || 'Partenaire inconnu' }}
                    </VListItemSubtitle>
                  </VListItem>
                </VList>
              </VCardText>
            </VCard>

            <VRow>
              <!-- Theoretical Amount (Read-only) -->
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  :model-value="formatPrice(getTheoreticalAmount)"
                  :label="($t('Theoretical Amount') || 'Montant théorique')"
                  readonly
                  variant="outlined"
                  hint="($t('Amount expected based on deliveries and expenses') || 'Montant attendu basé sur les livraisons et dépenses')"
                  persistent-hint
                >
                  <template #prepend-inner>
                    <VIcon icon="tabler-calculator" />
                  </template>
                </AppTextField>
              </VCol>

              <!-- Amount Paid -->
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.amount_paid"
                  :label="($t('Amount Paid') || 'Montant payé')"
                  :placeholder="($t('Enter amount actually received') || 'Entrez le montant réellement reçu')"
                  type="number"
                  min="0"
                  step="0.01"
                  :error-messages="errors.amount_paid"
                  :hint="($t('Can be higher or lower than theoretical amount') || 'Peut être supérieur ou inférieur au montant théorique')"
                  persistent-hint
                  required
                >
                  <template #prepend-inner>
                    <VIcon icon="tabler-currency-dollar" />
                  </template>
                </AppTextField>
              </VCol>
            </VRow>

            <!-- Difference Display -->
            <VRow
              v-if="form.amount_paid"
              class="mt-2"
            >
              <VCol cols="12">
                <VCard
                  :color="getDifferenceInfo.color"
                  variant="tonal"
                >
                  <VCardText class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center gap-2">
                      <VIcon
                        :icon="getDifferenceInfo.icon"
                        :color="getDifferenceInfo.color"
                      />
                      <div>
                        <div class="text-sm text-medium-emphasis">
                          {{ $t('Difference') || 'Différence' }}
                        </div>
                        <div class="text-h6 font-weight-bold">
                          {{ getDifferenceInfo.type === 'excess' 
                            ? `+${formatPrice(getDifferenceInfo.amount)}`
                            : getDifferenceInfo.type === 'missing'
                              ? `-${formatPrice(getDifferenceInfo.amount)}`
                              : formatPrice(0) }}
                        </div>
                      </div>
                    </div>
                    <VChip
                      :color="getDifferenceInfo.color"
                      variant="flat"
                    >
                      <VIcon
                        :icon="getDifferenceInfo.icon"
                        size="14"
                        class="me-1"
                      />
                      {{ getDifferenceInfo.label }}
                    </VChip>
                  </VCardText>
                </VCard>

                <!-- Warning for significant excess -->
                <VAlert
                  v-if="isSignificantExcess"
                  type="warning"
                  variant="tonal"
                  class="mt-2"
                >
                  <div class="d-flex align-center gap-2">
                    <VIcon icon="tabler-alert-triangle" />
                    <div>
                      <div class="font-weight-medium">
                        {{ $t('Significant Excess') || 'Excédent significatif' }}
                      </div>
                      <div class="text-sm">
                        {{ $t('The amount paid exceeds the theoretical amount by more than 10%. Please verify and add a note if necessary.') || 'Le montant payé dépasse le montant théorique de plus de 10%. Veuillez vérifier et ajouter une note si nécessaire.' }}
                      </div>
                    </div>
                  </div>
                </VAlert>
              </VCol>
            </VRow>

            <!-- Driver Expenses -->
            <VCard
              variant="outlined"
              class="mb-4"
            >
              <VCardTitle class="text-sm">
                {{ $t('Driver Expenses') || 'Dépenses du livreur' }}
              </VCardTitle>
              <VCardText>
                <!-- Existing Expenses -->
                <VList
                  v-if="form.driver_expenses.length > 0"
                  class="mb-4"
                >
                  <VListItem
                    v-for="(expense, index) in form.driver_expenses"
                    :key="index"
                    class="px-0"
                  >
                    <VListItemTitle>
                      {{ expense.title }}
                      <span v-if="expense.description">
                        - {{ expense.description }}
                      </span>
                    </VListItemTitle>
                    <VListItemSubtitle>
                      {{ formatPrice(expense.amount) }}
                      <span v-if="expense.category_id">
                        - {{ expenseCategories.find(c => c.id === expense.category_id)?.title || $t('Unknown') || 'Inconnu' }}
                      </span>
                    </VListItemSubtitle>
                    <template #append>
                      <IconBtn
                        color="error"
                        @click="removeExpense(index)"
                      >
                        <VIcon icon="tabler-trash" />
                      </IconBtn>
                    </template>
                  </VListItem>
                </VList>

                <!-- Add New Expense -->
                <VRow>
                  <VCol
                    cols="12"
                    md="4"
                  >
                    <AppTextField
                      v-model="newExpense.title"
                      :label="($t('Expense Title') || 'Titre de la dépense')"
                      :placeholder="($t('Enter title') || 'Entrez le titre')"
                    />
                  </VCol>
                  <VCol
                    cols="12"
                    md="3"
                  >
                    <AppTextField
                      v-model="newExpense.amount"
                      :label="($t('Amount') || 'Montant')"
                      :placeholder="($t('Enter amount') || 'Entrez le montant')"
                      type="number"
                    />
                  </VCol>
                  <VCol
                    cols="12"
                    md="3"
                  >
                    <AppSelect
                      v-model="newExpense.category_id"
                      :items="expenseCategories"
                      :label="($t('Category') || 'Catégorie')"
                      :placeholder="($t('Select category') || 'Sélectionnez une catégorie')"
                      clearable
                    />
                  </VCol>
                  <VCol
                    cols="12"
                    md="2"
                  >
                    <VBtn
                      color="primary"
                      class="mt-4"
                      @click="addExpense"
                    >
                      {{ $t('Add') || 'Ajouter' }}
                    </VBtn>
                  </VCol>
                </VRow>
              </VCardText>
            </VCard>

            <!-- Notes -->
            <VRow>
              <VCol cols="12">
                <AppTextarea
                  v-model="form.notes"
                  :label="($t('Notes') || 'Notes')"
                  :placeholder="($t('Enter any additional notes...') || 'Entrez des notes supplémentaires...')"
                  rows="3"
                />
              </VCol>
            </VRow>
          </template>
        </VForm>
      </VCardText>

      <VDivider />

      <VCardActions class="d-flex justify-end pa-4">
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
          :disabled="isLoadingDetails"
          @click="onSubmit"
        >
          {{ $t('Update Settlement') || 'Mettre à jour le règlement' }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

