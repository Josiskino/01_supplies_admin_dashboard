import { $api } from '@/utils/api'

export const useDriverTurnover = () => {
  const filter = ref('month')
  const dateFrom = ref(null)
  const dateTo = ref(null)
  const isLoading = ref(false)

  const report = ref([])
  const period = ref({ from: null, to: null })
  const totalGlobalTurnover = ref(0)
  const totalGlobalCommission = ref(0)
  const totalGlobalDeliveries = ref(0)

  const fetchDriverTurnover = async (params = {}) => {
    isLoading.value = true
    try {
      const response = await $api('/statistics/driver-turnover', {
        method: 'GET',
        params: {
          filter: filter.value,
          ...(dateFrom.value && { date_from: dateFrom.value }),
          ...(dateTo.value && { date_to: dateTo.value }),
          ...params,
        },
      })

      if (response.success) {
        report.value = response.data.report || []
        period.value = response.data.period || { from: null, to: null }
        totalGlobalTurnover.value = response.data.total_global_turnover || 0
        totalGlobalCommission.value = response.data.total_global_commission || 0
        totalGlobalDeliveries.value = response.data.total_global_deliveries || 0
      }
    } catch (error) {
      console.error('Error fetching driver turnover:', error)
      report.value = []
      totalGlobalTurnover.value = 0
      totalGlobalCommission.value = 0
    } finally {
      isLoading.value = false
    }
  }

  return {
    filter,
    dateFrom,
    dateTo,
    isLoading: readonly(isLoading),
    report: readonly(report),
    period: readonly(period),
    totalGlobalTurnover: readonly(totalGlobalTurnover),
    totalGlobalCommission: readonly(totalGlobalCommission),
    totalGlobalDeliveries: readonly(totalGlobalDeliveries),
    fetchDriverTurnover,
  }
}
