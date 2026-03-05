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

// Helper function to format date string to YYYY-MM-DD format without timezone issues
const formatDateToYYYYMMDD = (dateString) => {
  if (!dateString) return getTodayDate()
  
  // Convert to string if it's not already
  const dateStr = String(dateString).trim()
  
  // If already in YYYY-MM-DD format, return as is (this is what input type="date" provides)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  
  // Try to extract YYYY-MM-DD from ISO string (e.g., "2025-01-17T00:00:00.000Z" -> "2025-01-17")
  // This avoids timezone conversion issues
  const isoMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoMatch) {
    return isoMatch[1]
  }
  
  // Try parsing as Date object and extract date part directly from string first
  // If it's a date like "2025-01-17 00:00:00" or similar, try to extract the date part
  const datePartMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (datePartMatch) {
    const [, year, month, day] = datePartMatch
    return `${year}-${month}-${day}`
  }
  
  // Fallback: try parsing as Date object (for edge cases)
  // Use UTC methods to avoid timezone conversion issues
  const date = new Date(dateStr)
  if (!isNaN(date.getTime())) {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // Last resort: return today's date
  console.warn('formatDateToYYYYMMDD: Invalid date string, using today:', dateString)
  return getTodayDate()
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

// Snackbar for notifications
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

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

// For driver expenses, only show the "Carburant" category
const availableCategories = computed(() => {
  if (form.value.expense_type !== 'driver') return expenseCategories.value
  return expenseCategories.value.filter(c =>
    (c.title || '').toLowerCase().includes('carburant')
  )
})

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
watch(() => props.expense, (newExpense, oldExpense) => {
  // Only update if expense actually changed and dialog is visible
  if (newExpense && newExpense.id) {
    // Format date from expense (use expense_date field)
    
    // Make sure we have a valid date - use expense_date as primary field
    let expenseDate = getTodayDate() // Default fallback
    
    if (newExpense.expense_date) {
      expenseDate = formatDateToYYYYMMDD(newExpense.expense_date)
    } else {
      console.warn('No expense_date found in expense object, using today\'s date as fallback')
    }
    
    form.value = {
      date: expenseDate,
      title: newExpense.title || '',
      description: newExpense.description || '',
      amount: newExpense.amount || '',
      category_id: newExpense.category?.id || newExpense.category_id || null,
      driver_id: newExpense.driver?.id || newExpense.driver_id || null,
      expense_type: newExpense.expense_type || 'general',
    }
    
    // Set driver search if driver is present
    if (form.value.driver_id && props.drivers.length > 0) {
      const driver = props.drivers.find(d => (d.value || d.id) === form.value.driver_id)
      if (driver) {
        driverSearch.value = driver.title || driver.name || ''
      }
    }
  } else if (!newExpense && !dialogVisible.value) {
    // Only reset if dialog is closed and no expense is selected
    resetForm()
  }
}, { immediate: false })

// Reset driver_id when expense_type changes to general; auto-select Carburant for driver
watch(() => form.value.expense_type, newType => {
  if (newType === 'general') {
    form.value.driver_id = null
    driverSearch.value = ''
    form.value.category_id = null
  } else if (newType === 'driver') {
    const carburant = expenseCategories.value.find(c =>
      (c.title || '').toLowerCase().includes('carburant')
    )
    form.value.category_id = carburant?.value ?? null
  }
})

// Submit form
const onSubmit = async () => {
  // Validation
  if (!form.value.title) {
    snackbarText.value = t('Title is required') || 'Le libellé est requis'
    snackbarColor.value = 'error'
    snackbar.value = true
    return
  }

  if (!form.value.amount || parseFloat(form.value.amount) <= 0) {
    snackbarText.value = t('Valid amount is required') || 'Un montant valide est requis'
    snackbarColor.value = 'error'
    snackbar.value = true
    return
  }

  if (form.value.expense_type === 'driver' && !form.value.driver_id) {
    snackbarText.value = t('Driver is required for driver expenses') || 'Le livreur est requis pour les dépenses livreurs'
    snackbarColor.value = 'error'
    snackbar.value = true
    return
  }

  isSubmitting.value = true

  try {
    // Ensure date is in YYYY-MM-DD format before sending
    const formattedDate = formatDateToYYYYMMDD(form.value.date)
    
    const payload = {
      expense_date: formattedDate, // Use expense_date instead of date
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

    let hasError = false

    if (isEditMode.value) {
      // Update existing expense
      await $api(`/expenses/${props.expense.id}`, {
        method: 'PUT',
        body: payload,
        onResponseError({ response }) {
          console.error('Error updating expense:', response._data)
          hasError = true
          const errorMessage = response._data?.message || t('Error updating expense') || 'Erreur lors de la mise à jour de la dépense'
          const errorDetails = response._data?.errors ? Object.values(response._data.errors).flat().join(', ') : ''
          snackbarText.value = `${errorMessage}${errorDetails ? `\n${errorDetails}` : ''}`
          snackbarColor.value = 'error'
          snackbar.value = true
        },
      })
      
      // Show success notification only if no error occurred
      if (!hasError) {
        snackbarText.value = t('Expense updated successfully') || 'Dépense mise à jour avec succès'
        snackbarColor.value = 'success'
        snackbar.value = true
        
        emit('expenseSaved')
        resetForm()
        dialogVisible.value = false
      }
    } else {
      // Create new expense
      await $api('/expenses', {
        method: 'POST',
        body: payload,
        onResponseError({ response }) {
          console.error('Error creating expense:', response._data)
          hasError = true
          const errorMessage = response._data?.message || t('Error creating expense') || 'Erreur lors de la création de la dépense'
          const errorDetails = response._data?.errors ? Object.values(response._data.errors).flat().join(', ') : ''
          snackbarText.value = `${errorMessage}${errorDetails ? `\n${errorDetails}` : ''}`
          snackbarColor.value = 'error'
          snackbar.value = true
        },
      })
      
      // Show success notification only if no error occurred
      if (!hasError) {
        snackbarText.value = t('Expense created successfully') || 'Dépense créée avec succès'
        snackbarColor.value = 'success'
        snackbar.value = true

    emit('expenseSaved')
    resetForm()
    dialogVisible.value = false
      }
    }
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
    
    // If expense is provided, load its data when dialog opens
    if (props.expense && props.expense.id) {
      console.log('Dialog opened with expense, loading data...')
      console.log('Expense date from props:', props.expense.date)
      
      // Format date from expense (use expense_date field)
      let expenseDate = getTodayDate() // Default fallback
      
      if (props.expense.expense_date) {
        expenseDate = formatDateToYYYYMMDD(props.expense.expense_date)
      } else {
        console.warn('No expense_date found in expense object when opening dialog')
      }
      
      form.value = {
        date: expenseDate,
        title: props.expense.title || '',
        description: props.expense.description || '',
        amount: props.expense.amount || '',
        category_id: props.expense.category?.id || props.expense.category_id || null,
        driver_id: props.expense.driver?.id || props.expense.driver_id || null,
        expense_type: props.expense.expense_type || 'general',
      }
      
      // Set driver search if driver is present
      if (form.value.driver_id && props.drivers.length > 0) {
        const driver = props.drivers.find(d => (d.value || d.id) === form.value.driver_id)
        if (driver) {
          driverSearch.value = driver.title || driver.name || ''
        }
      }
    }
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
                :items="availableCategories"
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

  <!-- Success/Error Notification Snackbar -->
  <VSnackbar
    v-model="snackbar"
    location="top right"
    :timeout="3000"
    :color="snackbarColor"
    variant="elevated"
  >
    {{ snackbarText }}
  </VSnackbar>
</template>

