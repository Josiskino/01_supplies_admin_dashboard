import { $api } from '@/utils/api'
import { ref, watch } from 'vue'

export const useBusinessDeveloperStats = () => {
  const filter = ref('week')
  const dateFrom = ref(null)
  const dateTo = ref(null)
  const driverId = ref(null)
  const isLoading = ref(false)

  const topConsumers = ref([])
  const topZones = ref([])
  const period = ref({ from: null, to: null })

  const fetchStats = async () => {
    isLoading.value = true
    try {
      const queryParams = {
        filter: filter.value,
        ...(dateFrom.value && { date_from: dateFrom.value }),
        ...(dateTo.value && { date_to: dateTo.value }),
        ...(driverId.value && { driver_id: driverId.value }),
      }

      // If dates are provided, filter is ignored by backend (as per guide)
      const queryString = new URLSearchParams(queryParams).toString()
      const url = `/statistics/business-developer?${queryString}`

      const response = await $api(url, {
        method: 'GET',
      })

      if (response && response.success) {
        topConsumers.value = response.data.top_consumers || []
        topZones.value = response.data.top_zones || []
        period.value = response.data.period || { from: null, to: null }
      }
    } catch (error) {
      console.error('Error fetching business developer stats:', error)
      topConsumers.value = []
      topZones.value = []
    } finally {
      isLoading.value = false
    }
  }

  // Auto-fetch on parameter changes
  watch([filter, driverId], () => {
    fetchStats()
  })

  // Specific watch for custom dates to avoid redundant calls
  watch([dateFrom, dateTo], () => {
    if (dateFrom.value && dateTo.value) {
      fetchStats()
    }
  })

  return {
    filter,
    dateFrom,
    dateTo,
    driverId,
    isLoading,
    topConsumers,
    topZones,
    period,
    fetchStats,
  }
}
