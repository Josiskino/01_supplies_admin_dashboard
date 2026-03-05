import { $api } from '@/utils/api'
import { echo } from '@/plugins/echo'

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

  const handleRealtimeUpdate = (eventData) => {
    const { driver_id, data } = eventData

    // Le backend diffuse toujours sur le mois en cours — on n'applique la mise à jour
    // en temps réel que si l'utilisateur consulte le mois en cours
    if (filter.value !== 'month') return

    const reportList = [...report.value]
    const existingIndex = reportList.findIndex(r => r.driver_id === driver_id)

    if (existingIndex >= 0) {
      if (data.deliveries_count === 0) {
        // Toutes les livraisons annulées → retirer le livreur de la liste
        reportList.splice(existingIndex, 1)
      } else {
        reportList[existingIndex] = {
          ...reportList[existingIndex],
          total_turnover: data.total_turnover,
          deliveries_count: data.deliveries_count,
          commission_amount: data.commission_amount,
        }
      }
    } else if (data.deliveries_count > 0) {
      // Nouveau livreur avec des livraisons actives — ajout direct depuis les données de l'event
      // (évite un refetch API qui peut rater des données à cause du timing ShouldBroadcastNow)
      reportList.push({
        driver_id: driver_id,
        driver_name: data.driver_name || 'Livreur #' + driver_id,
        total_turnover: data.total_turnover,
        deliveries_count: data.deliveries_count,
        commission_amount: data.commission_amount,
        settlements_count: 0,
      })
    }

    // Retrier par CA décroissant
    reportList.sort((a, b) => b.total_turnover - a.total_turnover)
    report.value = reportList

    // Recalculer les totaux globaux
    totalGlobalTurnover.value = reportList.reduce((sum, r) => sum + r.total_turnover, 0)
    totalGlobalCommission.value = reportList.reduce((sum, r) => sum + r.commission_amount, 0)
    totalGlobalDeliveries.value = reportList.reduce((sum, r) => sum + r.deliveries_count, 0)
  }

  onMounted(() => {
    echo.channel('driver-turnover').listen('.DriverTurnoverUpdated', handleRealtimeUpdate)
  })

  onUnmounted(() => {
    echo.leaveChannel('driver-turnover')
  })

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
