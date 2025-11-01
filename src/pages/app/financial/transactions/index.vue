<script setup>
/* eslint-disable camelcase */
import ExpenseAddDialog from './add.vue'

const searchQuery = ref('')
const selectedDriverId = ref()
const selectedExpenseType = ref()
const dateFrom = ref(null)
const dateTo = ref(null)

// Data table options
const itemsPerPage = ref(15)
const page = ref(1)
const isLoading = ref(false)
const isAddExpenseDialogOpen = ref(false)

// Drivers list
const drivers = ref([])
const isLoadingDrivers = ref(false)

// Expense types
const expenseTypes = [
  { title: 'Maintenance', value: 'maintenance', icon: 'tabler-tools', color: 'warning' },
  { title: 'Fuel', value: 'fuel', icon: 'tabler-gas-station', color: 'primary' },
  { title: 'Oil Change', value: 'oil_change', icon: 'tabler-droplet', color: 'info' },
  { title: 'Tires', value: 'tires', icon: 'tabler-circle', color: 'secondary' },
  { title: 'Insurance', value: 'insurance', icon: 'tabler-shield', color: 'success' },
  { title: 'Repair', value: 'repair', icon: 'tabler-wrench', color: 'error' },
  { title: 'Other', value: 'other', icon: 'tabler-category', color: 'secondary' },
]

// Transactions/Expenses data
const expenses = ref([])
const totalExpenses = ref(0)

// Statistics
const totalAmount = computed(() => {
  return expenses.value.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0)
})

// Headers for expenses table
const headers = [
  { title: '#', key: 'index', sortable: false, width: '60px' },
  { title: 'Date', key: 'date', sortable: true },
  { title: 'Driver', key: 'driver', sortable: false },
  { title: 'Type', key: 'type', sortable: false },
  { title: 'Description', key: 'description', sortable: false },
  { title: 'Amount', key: 'amount', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false },
]

// Fetch drivers
const fetchDrivers = async () => {
  isLoadingDrivers.value = true
  try {
    const response = await $api('/drivers', {
      method: 'GET',
    })

    if (Array.isArray(response)) {
      drivers.value = response
    } else if (response?.data && Array.isArray(response.data)) {
      drivers.value = response.data
    } else {
      drivers.value = []
    }
  } catch (error) {
    console.error('Error fetching drivers:', error)
    drivers.value = []
  } finally {
    isLoadingDrivers.value = false
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

    if (searchQuery.value) {
      queryParams.search = searchQuery.value
    }

    if (selectedDriverId.value) {
      queryParams.driver_id = selectedDriverId.value
    }

    if (selectedExpenseType.value) {
      queryParams.type = selectedExpenseType.value
    }

    if (dateFrom.value) {
      queryParams.date_from = dateFrom.value
    }

    if (dateTo.value) {
      queryParams.date_to = dateTo.value
    }

    const queryString = new URLSearchParams(queryParams).toString()
    const url = `/financial/transactions${queryString ? `?${queryString}` : ''}`

    const response = await $api(url, {
      method: 'GET',
    })

    // Handle response structure
    if (response) {
      if (Array.isArray(response)) {
        expenses.value = response
        totalExpenses.value = response.length
      } else if (response.data && Array.isArray(response.data)) {
        expenses.value = response.data
        totalExpenses.value = response.meta?.total || response.data.length
      } else {
        expenses.value = []
        totalExpenses.value = 0
      }
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

// Format date
const formatDate = value => {
  if (!value) {
    return '—'
  }

  try {
    const date = new Date(value)

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
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

// Get expense type info
const getExpenseTypeInfo = type => {
  return expenseTypes.find(t => t.value === type) || expenseTypes[expenseTypes.length - 1]
}

// Delete expense
const deleteExpense = async expenseId => {
  try {
    await $api(`/financial/transactions/${expenseId}`, {
      method: 'DELETE',
    })
    fetchExpenses()
  } catch (error) {
    console.error('Error deleting expense:', error)
  }
}

// Watch for changes and refetch
watch([searchQuery, selectedDriverId, selectedExpenseType, dateFrom, dateTo, itemsPerPage], () => {
  page.value = 1
  fetchExpenses()
})

watch(page, () => {
  fetchExpenses()
})

// Load on mount
onMounted(() => {
  fetchDrivers()
  fetchExpenses()
})
</script>

<template>
  <section>
    <!-- Header Section -->
    <VCard class="mb-6">
      <VCardItem class="pb-4">
        <VCardTitle>Financial Transactions</VCardTitle>
        <VCardSubtitle>
          Track all expenses related to drivers (maintenance, fuel, repairs, etc.)
        </VCardSubtitle>
      </VCardItem>

      <VCardText>
        <VRow class="mb-4">
          <!-- Total Expenses Summary -->
          <VCol
            cols="12"
            md="4"
          >
            <VCard
              color="error"
              variant="tonal"
            >
              <VCardText class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-sm text-medium-emphasis">
                    Total Expenses
                  </div>
                  <div class="text-h4 font-weight-medium mt-1">
                    {{ formatPrice(totalAmount) }}
                  </div>
                </div>
                <VAvatar
                  color="error"
                  variant="tonal"
                  size="56"
                >
                  <VIcon
                    icon="tabler-currency-dollar"
                    size="28"
                  />
                </VAvatar>
              </VCardText>
            </VCard>
          </VCol>

          <!-- Total Transactions -->
          <VCol
            cols="12"
            md="4"
          >
            <VCard
              color="info"
              variant="tonal"
            >
              <VCardText class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-sm text-medium-emphasis">
                    Total Transactions
                  </div>
                  <div class="text-h4 font-weight-medium mt-1">
                    {{ expenses.length }}
                  </div>
                </div>
                <VAvatar
                  color="info"
                  variant="tonal"
                  size="56"
                >
                  <VIcon
                    icon="tabler-receipt"
                    size="28"
                  />
                </VAvatar>
              </VCardText>
            </VCard>
          </VCol>

          <!-- Add Expense Button -->
          <VCol
            cols="12"
            md="4"
            class="d-flex align-center justify-end"
          >
            <VBtn
              color="primary"
              prepend-icon="tabler-plus"
              size="large"
              @click="isAddExpenseDialogOpen = true"
            >
              Add Expense
            </VBtn>
          </VCol>
        </VRow>

        <!-- Filters -->
        <VRow>
          <VCol
            cols="12"
            sm="6"
            md="3"
          >
            <AppSelect
              v-model="selectedDriverId"
              :items="drivers.map(d => ({ title: d.user?.name || d.name || 'Unknown', value: d.id }))"
              :loading="isLoadingDrivers"
              placeholder="Filter by driver"
              label="Driver"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>

          <VCol
            cols="12"
            sm="6"
            md="3"
          >
            <AppSelect
              v-model="selectedExpenseType"
              :items="expenseTypes"
              placeholder="Filter by type"
              label="Expense Type"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>

          <VCol
            cols="12"
            sm="6"
            md="2"
          >
            <AppDateTimePicker
              v-model="dateFrom"
              placeholder="Date from"
              label="Date From"
              :config="{ dateFormat: 'Y-m-d' }"
              clearable
            />
          </VCol>

          <VCol
            cols="12"
            sm="6"
            md="2"
          >
            <AppDateTimePicker
              v-model="dateTo"
              placeholder="Date to"
              label="Date To"
              :config="{ dateFormat: 'Y-m-d' }"
              clearable
            />
          </VCol>

          <VCol
            cols="12"
            sm="12"
            md="2"
          >
            <AppTextField
              v-model="searchQuery"
              placeholder="Search by description..."
              label="Search"
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

          <!-- Date -->
          <template #item.date="{ item }">
            <span class="text-high-emphasis">
              {{ formatDate(item.date || item.created_at) }}
            </span>
          </template>

          <!-- Driver -->
          <template #item.driver="{ item }">
            <div class="d-flex align-center gap-2">
              <VAvatar
                size="32"
                variant="tonal"
                color="primary"
              >
                <VIcon icon="tabler-user" />
              </VAvatar>
              <div>
                <div class="text-body-1 font-weight-medium">
                  {{ item.driver?.user?.name || item.driver?.name || item.driver_name || 'Unknown' }}
                </div>
                <div
                  v-if="item.driver?.vehicle_type"
                  class="text-sm text-medium-emphasis"
                >
                  {{ item.driver.vehicle_type }}
                </div>
              </div>
            </div>
          </template>

          <!-- Type -->
          <template #item.type="{ item }">
            <VChip
              size="small"
              :color="getExpenseTypeInfo(item.type || item.expense_type)?.color || 'secondary'"
              variant="tonal"
            >
              <VIcon
                :icon="getExpenseTypeInfo(item.type || item.expense_type)?.icon || 'tabler-category'"
                size="14"
                class="me-1"
              />
              {{ getExpenseTypeInfo(item.type || item.expense_type)?.title || 'Other' }}
            </VChip>
          </template>

          <!-- Description -->
          <template #item.description="{ item }">
            <div class="text-body-1">
              {{ item.description || item.notes || '—' }}
            </div>
          </template>

          <!-- Amount -->
          <template #item.amount="{ item }">
            <span class="text-body-1 font-weight-medium text-error">
              - {{ formatPrice(item.amount) }}
            </span>
          </template>

          <!-- Actions -->
          <template #item.actions="{ item }">
            <VBtn
              icon
              size="small"
              variant="text"
              color="error"
              @click="deleteExpense(item.id)"
            >
              <VIcon icon="tabler-trash" />
            </VBtn>
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
                No expenses found
              </h6>
              <p class="text-medium-emphasis">
                No expenses were recorded for the selected filters.
              </p>
            </div>
          </template>
        </VDataTableServer>
      </VCardText>
    </VCard>

    <!-- Add Expense Dialog -->
    <ExpenseAddDialog
      v-model:is-dialog-visible="isAddExpenseDialogOpen"
      :drivers="drivers"
      @expense-added="fetchExpenses"
    />
  </section>
</template>
