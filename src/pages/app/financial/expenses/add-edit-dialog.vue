<script setup>
/* eslint-disable camelcase */
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  expense: {
    type: Object,
    default: null,
  },
  drivers: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:isDialogVisible', 'expenseSaved'])

const dialogVisible = computed({
  get: () => props.isDialogVisible,
  set: val => emit('update:isDialogVisible', val),
})

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Form data
const form = ref({
  date: getTodayDate(), // Date par défaut : aujourd'hui
  title: '',
  description: '',
  amount: '',
  category_id: null,
  driver_id: null,
  expense_type: 'general', // default: company expense
})

const isSubmitting = ref(false)

// Driver search
const driverSearch = ref('')

// Expense categories
const expenseCategories = ref([])
const isLoadingCategories = ref(false)

// Fetch expense categories from API
const fetchExpenseCategories = async () => {
  isLoadingCategories.value = true
  try {
    const response = await $api('/status/expense-categories', { method: 'GET' })
    
    console.log('Expense categories API response:', response)
    
    // Handle different response structures
    let categoriesList = []
    
    // Case 1: response.data is an array (most common)
    if (response?.data && Array.isArray(response.data)) {
      categoriesList = response.data
    }
    // Case 2: response is directly an array
    else if (Array.isArray(response)) {
      categoriesList = response
    }
    // Case 3: response.data.data exists
    else if (response?.data?.data && Array.isArray(response.data.data)) {
      categoriesList = response.data.data
    }
    
    console.log('Categories list to format:', categoriesList)
    
    // Format categories for AppSelect: { title: category_name or description, value: id }
    if (categoriesList.length > 0) {
      // Log pour voir la structure complète d'une catégorie
      if (categoriesList.length > 0) {
        console.log('Sample category object:', categoriesList[0])
        console.log('Available keys in category:', Object.keys(categoriesList[0]))
      }
      
      expenseCategories.value = categoriesList.map(category => {
        // Le JSON retourne name: null, mais le modèle Laravel a category_name
        // Utiliser category_name s'il existe, sinon description
        const title = category.category_name || category.description || category.name || ''
        
        return {
          title: title,
          value: category.id,
          description: category.description || '',
        }
      })
      
      console.log('Formatted expense categories:', expenseCategories.value)
    } else {
      console.warn('No categories found in response')
      expenseCategories.value = []
    }
  } catch (error) {
    console.error('Error fetching expense categories:', error)
    expenseCategories.value = []
  } finally {
    isLoadingCategories.value = false
  }
}

// Expense type options
const expenseTypeOptions = computed(() => [
  { title: t('Company Expense') || 'Dépense société', value: 'general' },
  { title: t('Driver Expense') || 'Dépense livreur', value: 'driver' },
])

// Filtered drivers based on search
const filteredDrivers = computed(() => {
  if (!driverSearch.value) {
    return props.drivers
  }
  
  const searchText = driverSearch.value.toLowerCase()
  return props.drivers.filter(driver => {
    const title = (driver.title || '').toLowerCase()
    return title.includes(searchText)
  })
})

// Check if we're in edit mode
const isEditMode = computed(() => !!props.expense?.id)

// Reset form function (defined before watches)
const resetForm = () => {
  form.value = {
    date: getTodayDate(), // Date par défaut : aujourd'hui
    title: '',
    description: '',
    amount: '',
    category_id: null,
    driver_id: null,
    expense_type: 'general',
  }
  driverSearch.value = ''
}

// Watch for expense prop changes to load data
watch(() => props.expense, newExpense => {
  if (newExpense) {
    // Format date from expense (could be YYYY-MM-DD or ISO string)
    let expenseDate = getTodayDate()
    if (newExpense.date) {
      const date = new Date(newExpense.date)
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        expenseDate = `${year}-${month}-${day}`
      }
    }
    
    form.value = {
      date: expenseDate,
      title: newExpense.title || '',
      description: newExpense.description || '',
      amount: newExpense.amount || '',
      category_id: newExpense.category?.id || null,
      driver_id: newExpense.driver?.id || null,
      expense_type: newExpense.expense_type || 'general',
    }
  } else {
    resetForm()
  }
}, { immediate: true })

// Reset driver_id when expense_type changes to general
watch(() => form.value.expense_type, newType => {
  if (newType === 'general') {
    form.value.driver_id = null
    driverSearch.value = ''
  }
})

// Submit form
const onSubmit = async () => {
  // Validation
  if (!form.value.title) {
    alert(t('Title is required') || 'Le libellé est requis')
    return
  }

  if (!form.value.amount || parseFloat(form.value.amount) <= 0) {
    alert(t('Valid amount is required') || 'Un montant valide est requis')
    return
  }

  if (form.value.expense_type === 'driver' && !form.value.driver_id) {
    alert(t('Driver is required for driver expenses') || 'Le livreur est requis pour les dépenses livreurs')
    return
  }

  isSubmitting.value = true

  try {
    const payload = {
      date: form.value.date,
      title: form.value.title,
      description: form.value.description || null,
      amount: parseFloat(form.value.amount),
      category_id: form.value.category_id || null,
      expense_type: form.value.expense_type,
    }

    // Add driver_id only for driver expenses
    if (form.value.expense_type === 'driver') {
      payload.driver_id = form.value.driver_id
    }

    if (isEditMode.value) {
      // Update existing expense
      await $api(`/expenses/${props.expense.id}`, {
        method: 'PUT',
        body: payload,
        onResponseError({ response }) {
          console.error('Error updating expense:', response._data)
          const errorMessage = response._data?.message || t('Error updating expense') || 'Erreur lors de la mise à jour de la dépense'
          const errorDetails = response._data?.errors ? Object.values(response._data.errors).flat().join(', ') : ''
          alert(`${errorMessage}${errorDetails ? `\n${errorDetails}` : ''}`)
        },
      })
    } else {
      // Create new expense
      await $api('/expenses', {
        method: 'POST',
        body: payload,
        onResponseError({ response }) {
          console.error('Error creating expense:', response._data)
          const errorMessage = response._data?.message || t('Error creating expense') || 'Erreur lors de la création de la dépense'
          const errorDetails = response._data?.errors ? Object.values(response._data.errors).flat().join(', ') : ''
          alert(`${errorMessage}${errorDetails ? `\n${errorDetails}` : ''}`)
        },
      })
    }

    emit('expenseSaved')
    resetForm()
    dialogVisible.value = false
  } catch (error) {
    console.error(`Error ${isEditMode.value ? 'updating' : 'creating'} expense:`, error)
  } finally {
    isSubmitting.value = false
  }
}

// Close dialog
const onClose = () => {
  resetForm()
  dialogVisible.value = false
}

// Watch for dialog open/close
watch(dialogVisible, newVal => {
  if (newVal) {
    // Load categories when dialog opens
    fetchExpenseCategories()
  } else {
    // Reset when dialog closes
    if (!props.expense) {
      resetForm()
    } else {
      driverSearch.value = ''
    }
  }
})
</script>

<template>
  <VDialog
    :width="$vuetify.display.smAndDown ? 'auto' : 800"
    :model-value="dialogVisible"
    @update:model-value="val => dialogVisible = val"
  >
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="dialogVisible = false" />

    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>{{ isEditMode ? ($t('Edit Expense') || 'Modifier la dépense') : ($t('Add New Expense') || 'Ajouter une dépense') }}</span>
      </VCardTitle>

      <VDivider />

      <VCardText>
        <VForm @submit.prevent="onSubmit">
          <VRow>
            <!-- Expense Type -->
            <VCol cols="12">
              <AppSelect
                v-model="form.expense_type"
                :items="expenseTypeOptions"
                :label="$t('Expense Type') || 'Type de dépense'"
                :placeholder="$t('Select expense type') || 'Sélectionner le type'"
              />
            </VCol>

            <!-- Driver (only for driver expenses) -->
            <VCol
              v-if="form.expense_type === 'driver'"
              cols="12"
            >
              <AppAutocomplete
                v-model="form.driver_id"
                v-model:search="driverSearch"
                :items="filteredDrivers"
                :label="$t('Driver') || 'Livreur'"
                :placeholder="$t('Search and select a driver') || 'Rechercher et sélectionner un livreur'"
                item-title="title"
                item-value="value"
                clearable
                no-filter
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-user" />
                </template>
              </AppAutocomplete>
            </VCol>

            <!-- Date and Title -->
            <VCol
              cols="12"
              md="4"
            >
              <AppTextField
                v-model="form.date"
                :label="$t('Date') || 'Date'"
                type="date"
                required
              />
            </VCol>
            <VCol
              cols="12"
              md="8"
            >
              <AppTextField
                v-model="form.title"
                :label="$t('Title') || 'Libellé'"
                :placeholder="$t('Enter title') || 'Entrer le libellé'"
                required
              />
            </VCol>

            <!-- Description -->
            <VCol cols="12">
              <AppTextarea
                v-model="form.description"
                :label="$t('Description') || 'Description'"
                :placeholder="$t('Enter description (optional)') || 'Entrer une description (optionnel)'"
                rows="3"
              />
            </VCol>

            <!-- Amount -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.amount"
                :label="$t('Amount (XOF)') || 'Montant (FCFA)'"
                :placeholder="$t('Enter amount') || 'Entrer le montant'"
                type="number"
                min="0"
                step="0.01"
                suffix="FCFA"
                required
              />
            </VCol>

            <!-- Category -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="form.category_id"
                :items="expenseCategories"
                :loading="isLoadingCategories"
                :label="$t('Category') || 'Catégorie'"
                :placeholder="$t('Select category (optional)') || 'Sélectionner une catégorie (optionnel)'"
                item-title="title"
                item-value="value"
                clearable
              />
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
          :disabled="!form.title || !form.amount"
          @click="onSubmit"
        >
          {{ isEditMode ? ($t('Update') || 'Mettre à jour') : ($t('Create') || 'Créer') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

