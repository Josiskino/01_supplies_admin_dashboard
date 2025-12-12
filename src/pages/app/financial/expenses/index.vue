<script setup>
/* eslint-disable camelcase */
import { useI18n } from 'vue-i18n'
import AddEditExpenseDialog from './add-edit-dialog.vue'

const { t } = useI18n()

// Selected driver or 'company' for company expenses
const selectedView = ref('company') // 'company' or driver ID

// Filters
const selectedCategoryId = ref('')
const searchQuery = ref('')
const dateFrom = ref(null)
const dateTo = ref(null)

// Data table options
const itemsPerPage = ref(15)
const page = ref(1)
const isLoading = ref(false)

// Expenses data
const expenses = ref([])
const totalExpenses = ref(0)

// All expenses for statistics (without filters)
const allExpenses = ref([])

// Dialog states
const isAddEditDialogOpen = ref(false)
const selectedExpense = ref(null)

// Categories and drivers for filters
const categories = ref([])
const drivers = ref([])
const isLoadingDrivers = ref(false)

// Headers for expenses table
const headers = computed(() => [
  { title: '#', key: 'index', sortable: false, width: '60px' },
  { title: t('Title') || 'Libellé', key: 'title', sortable: false, width: '200px' },
  { title: t('Driver') || 'Livreur', key: 'driver', sortable: false, width: '180px' },
  { title: t('Category') || 'Catégorie', key: 'category', sortable: false, width: '150px' },
  { title: t('Amount') || 'Montant', key: 'amount', sortable: true, width: '130px' },
  { title: t('Created By') || 'Créé par', key: 'created_by', sortable: false, width: '150px' },
  { title: t('Date') || 'Date', key: 'created_at', sortable: true, width: '150px' },
  { title: t('Actions') || 'Actions', key: 'actions', sortable: false, width: '120px' },
])

// Statistics - Current view (filtered by selected driver/company and dates)
const currentViewTotal = computed(() => {
  return expenses.value.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0)
})

// Statistics - All company expenses (without date filters)
const companyExpensesTotal = computed(() => {
  return allExpenses.value
    .filter(e => e.expense_type === 'general')
    .reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0)
})

// Statistics - All driver expenses for selected driver (without date filters)
const selectedDriverExpensesTotal = computed(() => {
  if (selectedView.value === 'company') return 0
  const driverId = parseInt(selectedView.value)
  return allExpenses.value
    .filter(e => e.expense_type === 'driver' && e.driver?.id === driverId)
    .reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0)
})

// Statistics - Global total (all expenses)
const globalTotal = computed(() => {
  return allExpenses.value.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0)
})

// Get selected driver name
const selectedDriverName = computed(() => {
  if (selectedView.value === 'company') return null
  const driver = drivers.value.find(d => d.value === parseInt(selectedView.value))
  return driver?.title || t('Unknown') || 'Inconnu'
})

// Fetch all expenses for statistics (without filters)
const fetchAllExpenses = async () => {
  try {
    const response = await $api('/expenses?per_page=1000', {
      method: 'GET',
    })

    if (response?.data && Array.isArray(response.data)) {
      allExpenses.value = response.data
    } else if (Array.isArray(response)) {
      allExpenses.value = response
    } else {
      allExpenses.value = []
    }
  } catch (error) {
    console.error('Error fetching all expenses:', error)
    allExpenses.value = []
  }
}

// Fetch expenses
const fetchExpenses = async () => {
  isLoading.value = true
  try {
    const queryParams = {
      per_page: itemsPerPage.value,
      page: page.value,
    }

    // Filter by expense type based on selected view
    if (selectedView.value === 'company') {
      queryParams.expense_type = 'general'
    } else {
      queryParams.expense_type = 'driver'
      queryParams.driver_id = selectedView.value
    }

    if (selectedCategoryId.value) {
      queryParams.category_id = selectedCategoryId.value
    }

    if (searchQuery.value) {
      queryParams.search = searchQuery.value
    }

    if (dateFrom.value) {
      queryParams.date_from = dateFrom.value
    }

    if (dateTo.value) {
      queryParams.date_to = dateTo.value
    }

    const queryString = new URLSearchParams(queryParams).toString()
    const url = `/expenses${queryString ? `?${queryString}` : ''}`

    const response = await $api(url, {
      method: 'GET',
    })

    // Handle response structure
    if (response?.data && Array.isArray(response.data)) {
      expenses.value = response.data
      totalExpenses.value = response.meta?.total || response.data.length
    } else if (Array.isArray(response)) {
      expenses.value = response
      totalExpenses.value = response.length
    } else {
      expenses.value = []
      totalExpenses.value = 0
    }
  } catch (error) {
    console.error('Error fetching expenses:', error)
    expenses.value = []
    totalExpenses.value = 0
  } finally {
    isLoading.value = false
  }
}

// Fetch categories
const fetchCategories = async () => {
  try {
    const response = await $api('/expense-categories', {
      method: 'GET',
    })

    if (response?.data && Array.isArray(response.data)) {
      categories.value = response.data.map(cat => ({
        title: cat.name,
        value: cat.id,
      }))
    } else if (Array.isArray(response)) {
      categories.value = response.map(cat => ({
        title: cat.name,
        value: cat.id,
      }))
    }
  } catch (error) {
    console.error('Error fetching categories:', error)
    categories.value = []
  }
}

// Fetch drivers
const fetchDrivers = async () => {
  isLoadingDrivers.value = true
  try {
    const response = await $api('/drivers?per_page=100', {
      method: 'GET',
    })

    let driversList = []
    if (response?.data && Array.isArray(response.data)) {
      driversList = response.data
    } else if (Array.isArray(response)) {
      driversList = response
    }

    drivers.value = driversList.map(driver => ({
      title: `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || t('N/A'),
      value: driver.id,
      driver: driver, // Keep full driver object for statistics
    }))
  } catch (error) {
    console.error('Error fetching drivers:', error)
    drivers.value = []
  } finally {
    isLoadingDrivers.value = false
  }
}

// Select view (driver or company)
const selectView = (view) => {
  selectedView.value = view
  page.value = 1
  fetchExpenses()
}

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

// Format date
const formatDate = value => {
  if (!value) {
    return '—'
  }

  try {
    const date = new Date(value)

    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

// Get driver expenses total for a specific driver
const getDriverExpensesTotal = (driverId) => {
  const id = typeof driverId === 'string' ? parseInt(driverId) : driverId
  return allExpenses.value
    .filter(e => e.expense_type === 'driver' && e.driver?.id === id)
    .reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0)
}

// Open add dialog
const openAddDialog = () => {
  selectedExpense.value = null
  isAddEditDialogOpen.value = true
}

// Open edit dialog
const openEditDialog = expense => {
  selectedExpense.value = expense
  isAddEditDialogOpen.value = true
}

// Delete expense
const deleteExpense = async expense => {
  if (!confirm(t('Are you sure you want to delete this expense?') || 'Êtes-vous sûr de vouloir supprimer cette dépense ?')) {
    return
  }

  try {
    await $api(`/expenses/${expense.id}`, {
      method: 'DELETE',
    })

    // Refresh lists
    await fetchAllExpenses()
    await fetchExpenses()
  } catch (error) {
    console.error('Error deleting expense:', error)
    alert(t('Error deleting expense') || 'Erreur lors de la suppression de la dépense')
  }
}

// Watch for changes and refetch
watch([selectedCategoryId, searchQuery, dateFrom, dateTo, itemsPerPage, selectedView], () => {
  page.value = 1
  fetchExpenses()
})

watch(page, () => {
  fetchExpenses()
})

// Watch for dialog close
watch(isAddEditDialogOpen, newVal => {
  if (!newVal) {
    selectedExpense.value = null
    fetchAllExpenses()
    fetchExpenses()
  }
})

// Load on mount
onMounted(() => {
  fetchAllExpenses()
  fetchExpenses()
  fetchCategories()
  fetchDrivers()
})
</script>

<template>
  <section>
    <!-- Header Section -->
    <VCard class="mb-6">
      <VCardItem class="pb-4">
        <div class="d-flex align-center justify-space-between">
          <div>
            <VCardTitle>{{ $t('Expenses') || 'Dépenses' }}</VCardTitle>
            <VCardSubtitle>
              {{ $t('Manage company and driver expenses') || 'Gérer les dépenses de la société et des livreurs' }}
            </VCardSubtitle>
          </div>
          <VBtn
            color="primary"
            prepend-icon="tabler-plus"
            @click="openAddDialog"
          >
            {{ $t('Add Expense') || 'Ajouter une dépense' }}
          </VBtn>
        </div>
      </VCardItem>

      <VCardText>
        <!-- Statistics -->
        <VRow class="mb-6">
          <!-- Selected Driver/Company Expenses (Current View) -->
          <VCol
            cols="12"
            md="4"
          >
            <VCard
              :color="selectedView === 'company' ? 'secondary' : 'primary'"
              variant="tonal"
              class="h-100"
            >
              <VCardText class="d-flex align-center justify-space-between h-100">
                <div class="flex-grow-1">
                  <div class="text-sm text-medium-emphasis">
                    {{ selectedView === 'company' 
                      ? ($t('Company Expenses') || 'Dépenses société')
                      : ($t('Driver Expenses') || 'Dépenses livreur') + ': ' + selectedDriverName }}
                  </div>
                  <div class="text-h4 font-weight-medium mt-1">
                    {{ formatPrice(currentViewTotal) }}
                  </div>
                  <div
                    class="text-xs text-medium-emphasis mt-1"
                    :style="{ minHeight: '16px' }"
                  >
                    <span v-if="dateFrom || dateTo">
                      {{ $t('Filtered period') || 'Période filtrée' }}
                    </span>
                    <span v-else>&nbsp;</span>
                  </div>
                </div>
                <VAvatar
                  :color="selectedView === 'company' ? 'secondary' : 'primary'"
                  variant="tonal"
                  size="56"
                  class="ms-2"
                >
                  <VIcon
                    :icon="selectedView === 'company' ? 'tabler-building' : 'tabler-user'"
                    size="28"
                  />
                </VAvatar>
              </VCardText>
            </VCard>
          </VCol>

          <!-- Company Expenses Total (All Time) -->
          <VCol
            cols="12"
            md="4"
          >
            <VCard
              color="info"
              variant="tonal"
              class="h-100"
            >
              <VCardText class="d-flex align-center justify-space-between h-100">
                <div class="flex-grow-1">
                  <div class="text-sm text-medium-emphasis">
                    {{ $t('Total Company Expenses') || 'Total dépenses société' }}
                  </div>
                  <div class="text-h4 font-weight-medium mt-1">
                    {{ formatPrice(companyExpensesTotal) }}
                  </div>
                  <div class="text-xs text-medium-emphasis mt-1">
                    {{ $t('All time') || 'Toutes périodes' }}
                  </div>
                </div>
                <VAvatar
                  color="info"
                  variant="tonal"
                  size="56"
                  class="ms-2"
                >
                  <VIcon
                    icon="tabler-building"
                    size="28"
                  />
                </VAvatar>
              </VCardText>
            </VCard>
          </VCol>

          <!-- Global Total -->
          <VCol
            cols="12"
            md="4"
          >
            <VCard
              color="success"
              variant="tonal"
              class="h-100"
            >
              <VCardText class="d-flex align-center justify-space-between h-100">
                <div class="flex-grow-1">
                  <div class="text-sm text-medium-emphasis">
                    {{ $t('Global Total') || 'Total global' }}
                  </div>
                  <div class="text-h4 font-weight-medium mt-1">
                    {{ formatPrice(globalTotal) }}
                  </div>
                  <div class="text-xs text-medium-emphasis mt-1">
                    {{ $t('All expenses') || 'Toutes les dépenses' }}
                  </div>
                </div>
                <VAvatar
                  color="success"
                  variant="tonal"
                  size="56"
                  class="ms-2"
                >
                  <VIcon
                    icon="tabler-currency-dollar"
                    size="28"
                  />
                </VAvatar>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>

        <!-- Drivers List -->
        <VCard
          variant="outlined"
          class="mb-4"
        >
          <VCardTitle class="text-sm pb-2">
            {{ $t('Select View') || 'Sélectionner une vue' }}
          </VCardTitle>
          <VCardText>
            <div class="d-flex flex-wrap gap-2">
              <!-- Company Button -->
              <VBtn
                :color="selectedView === 'company' ? 'primary' : 'default'"
                :variant="selectedView === 'company' ? 'flat' : 'outlined'"
                prepend-icon="tabler-building"
                @click="selectView('company')"
              >
                {{ $t('Company Expenses') || 'Dépenses société' }}
                <VChip
                  v-if="companyExpensesTotal > 0"
                  size="x-small"
                  class="ms-2"
                >
                  {{ formatPrice(companyExpensesTotal) }}
                </VChip>
              </VBtn>

              <!-- Drivers Buttons -->
              <VBtn
                v-for="driver in drivers"
                :key="driver.value"
                :color="selectedView === String(driver.value) ? 'primary' : 'default'"
                :variant="selectedView === String(driver.value) ? 'flat' : 'outlined'"
                :loading="isLoadingDrivers"
                prepend-icon="tabler-user"
                @click="selectView(String(driver.value))"
              >
                {{ driver.title }}
                <VChip
                  v-if="getDriverExpensesTotal(driver.value) > 0"
                  size="x-small"
                  class="ms-2"
                >
                  {{ formatPrice(getDriverExpensesTotal(driver.value)) }}
                </VChip>
              </VBtn>
            </div>
          </VCardText>
        </VCard>

        <!-- Filters -->
        <VRow class="mb-4">
          <VCol
            cols="12"
            sm="6"
            md="3"
          >
            <AppSelect
              v-model="selectedCategoryId"
              :items="categories"
              :label="$t('Category')"
              :placeholder="$t('Filter by category')"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>

          <VCol
            cols="12"
            sm="6"
            md="3"
          >
            <AppDateTimePicker
              v-model="dateFrom"
              :label="$t('Date From')"
              :placeholder="$t('Date from')"
              :config="{ dateFormat: 'Y-m-d' }"
              clearable
            />
          </VCol>

          <VCol
            cols="12"
            sm="6"
            md="3"
          >
            <AppDateTimePicker
              v-model="dateTo"
              :label="$t('Date To')"
              :placeholder="$t('Date to')"
              :config="{ dateFormat: 'Y-m-d' }"
              clearable
            />
          </VCol>

          <VCol
            cols="12"
            sm="6"
            md="3"
          >
            <AppTextField
              v-model="searchQuery"
              :label="$t('Search')"
              :placeholder="($t('Search...') || 'Rechercher...')"
              clearable
              prepend-inner-icon="tabler-search"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- Expenses Table -->
    <VCard>
      <VCardText>
        <VDataTableServer
          v-model:items-per-page="itemsPerPage"
          v-model:page="page"
          :headers="headers"
          :items="expenses"
          :items-length="totalExpenses"
          :loading="isLoading"
          item-value="id"
          class="text-no-wrap"
        >
          <!-- Index -->
          <template #item.index="{ index }">
            <span class="text-high-emphasis font-weight-medium">
              {{ (page - 1) * itemsPerPage + index + 1 }}
            </span>
          </template>

          <!-- Title -->
          <template #item.title="{ item }">
            <div>
              <div class="text-body-1 font-weight-medium">
                {{ item.title || '—' }}
              </div>
              <div
                v-if="item.description"
                class="text-sm text-medium-emphasis"
              >
                {{ item.description }}
              </div>
            </div>
          </template>

          <!-- Driver -->
          <template #item.driver="{ item }">
            <div v-if="item.driver">
              <div class="text-body-1 font-weight-medium">
                {{ `${item.driver.first_name || ''} ${item.driver.last_name || ''}`.trim() || '—' }}
              </div>
              <div
                v-if="item.driver.phone"
                class="text-sm text-medium-emphasis"
              >
                {{ item.driver.phone }}
              </div>
            </div>
            <span v-else class="text-medium-emphasis">{{ $t('Company Expense') || 'Dépense société' }}</span>
          </template>

          <!-- Category -->
          <template #item.category="{ item }">
            <div v-if="item.category">
              {{ item.category.name || '—' }}
            </div>
            <span v-else>—</span>
          </template>

          <!-- Amount -->
          <template #item.amount="{ item }">
            <span class="text-body-1 font-weight-bold text-primary">
              {{ formatPrice(item.amount) }}
            </span>
          </template>

          <!-- Created By -->
          <template #item.created_by="{ item }">
            <div v-if="item.created_by">
              <div class="text-sm font-weight-medium">
                {{ item.created_by.name || '—' }}
              </div>
            </div>
            <span v-else>—</span>
          </template>

          <!-- Created At -->
          <template #item.created_at="{ item }">
            <span class="text-sm">
              {{ formatDate(item.created_at) }}
            </span>
          </template>

          <!-- Actions -->
          <template #item.actions="{ item }">
            <div class="d-flex gap-2">
              <IconBtn @click.stop="openEditDialog(item)">
                <VIcon icon="tabler-pencil" />
                <VTooltip activator="parent">
                  {{ $t('Edit') }}
                </VTooltip>
              </IconBtn>

              <IconBtn
                color="error"
                @click.stop="deleteExpense(item)"
              >
                <VIcon icon="tabler-trash" />
                <VTooltip activator="parent">
                  {{ $t('Delete') }}
                </VTooltip>
              </IconBtn>
            </div>
          </template>

          <!-- Empty State -->
          <template #no-data>
            <div class="text-center py-8">
              <VIcon
                icon="tabler-inbox"
                size="48"
                color="secondary"
                class="mb-4"
              />
              <h6 class="text-h6 mb-2">
                {{ $t('No expenses found') || 'Aucune dépense trouvée' }}
              </h6>
              <p class="text-medium-emphasis">
                {{ $t('No expenses match the selected filters.') || 'Aucune dépense ne correspond aux filtres sélectionnés.' }}
              </p>
            </div>
          </template>
        </VDataTableServer>
      </VCardText>
    </VCard>

    <!-- Add/Edit Expense Dialog -->
    <AddEditExpenseDialog
      v-model:is-dialog-visible="isAddEditDialogOpen"
      :expense="selectedExpense"
      :categories="categories"
      :drivers="drivers"
      @expense-saved="fetchExpenses"
    />
  </section>
</template>

