/**
 * Composable for managing financial reports
 */

import { $api } from '@/utils/api'

export const useFinancialReports = () => {
  const period = ref('month')
  const dateFrom = ref(null)
  const dateTo = ref(null)
  const isLoading = ref(false)

  const financialSummary = ref(null)
  const driverStats = ref([])
  const expenseBreakdown = ref([])
  const revenueTrend = ref([])

  /**
   * Calculate period dates based on selection
   */
  const getPeriodDates = () => {
    const today = new Date()
    let start = null
    let end = today.toISOString().slice(0, 10)

    switch (period.value) {
    case 'today':
      start = today.toISOString().slice(0, 10)
      break
    case 'week':
      start = new Date(today.setDate(today.getDate() - 7)).toISOString().slice(0, 10)
      break
    case 'month':
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
      break
    case 'year':
      start = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10)
      break
    case 'custom':
      start = dateFrom.value || null
      end = dateTo.value || today.toISOString().slice(0, 10)
      break
    }

    return { start, end }
  }

  /**
   * Fetch financial report data
   */
  const fetchFinancialReport = async () => {
    isLoading.value = true
    try {
      const { start, end } = getPeriodDates()

      const queryParams = {
        period: period.value,
        ...(start && { date_from: start }),
        ...(end && { date_to: end }),
      }

      const queryString = new URLSearchParams(queryParams).toString()

      const response = await $api(`/financial/reports?${queryString}`, {
        method: 'GET',
      })

      if (response && response.summary) {
        financialSummary.value = response.summary
        driverStats.value = response.driverStats || []
        expenseBreakdown.value = response.expenseBreakdown || []
        revenueTrend.value = response.revenueTrend || []
      } else {
        // Fallback structure if API doesn't return expected format
        financialSummary.value = {
          totalRevenue: response?.totalRevenue || 0,
          totalExpenses: response?.totalExpenses || 0,
          netProfit: (response?.totalRevenue || 0) - (response?.totalExpenses || 0),
          profitMargin: response?.totalRevenue
            ? (((response.totalRevenue - (response.totalExpenses || 0)) / response.totalRevenue) * 100)
            : 0,
          completedDeliveries: response?.completedDeliveries || 0,
          revenueFromDeliveries: response?.totalRevenue || 0,
          averageRevenuePerDelivery: response?.completedDeliveries
            ? (response.totalRevenue / response.completedDeliveries)
            : 0,
          averageExpensePerTransaction: response?.totalExpenseTransactions
            ? ((response.totalExpenses || 0) / response.totalExpenseTransactions)
            : 0,
        }
        driverStats.value = response?.drivers || []
        expenseBreakdown.value = response?.expensesByType || []
      }
    } catch (error) {
      console.error('Error fetching financial report:', error)

      // Set default values on error
      financialSummary.value = {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        profitMargin: 0,
        completedDeliveries: 0,
        revenueFromDeliveries: 0,
        averageRevenuePerDelivery: 0,
        averageExpensePerTransaction: 0,
      }
      driverStats.value = []
      expenseBreakdown.value = []
      revenueTrend.value = []
    } finally {
      isLoading.value = false
    }
  }

  return {
    period,
    dateFrom,
    dateTo,
    financialSummary: readonly(financialSummary),
    driverStats: readonly(driverStats),
    expenseBreakdown: readonly(expenseBreakdown),
    revenueTrend: readonly(revenueTrend),
    isLoading: readonly(isLoading),
    fetchFinancialReport,
  }
}

