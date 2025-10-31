/**
 * Composable for managing all application statuses
 */

// Default statuses for each category
const defaultStatuses = {
  deliveries: [
    {
      id: 1,
      name: 'Pending',
      label: 'En attente',
      color: 'warning',
      icon: 'tabler-clock',
      description: 'Demande reçue, en attente d\'assignation',
      isDefault: true,
      canEdit: false,
      category: 'deliveries',
    },
    {
      id: 2,
      name: 'Assigned',
      label: 'Assignée',
      color: 'info',
      icon: 'tabler-user-check',
      description: 'Livreur assigné à la demande',
      isDefault: true,
      canEdit: false,
      category: 'deliveries',
    },
    {
      id: 3,
      name: 'In Progress',
      label: 'En cours',
      color: 'primary',
      icon: 'tabler-truck',
      description: 'Livraison en cours',
      isDefault: true,
      canEdit: false,
      category: 'deliveries',
    },
    {
      id: 4,
      name: 'Delivered',
      label: 'Livrée',
      color: 'success',
      icon: 'tabler-check',
      description: 'Livraison terminée avec succès',
      isDefault: true,
      canEdit: false,
      category: 'deliveries',
    },
    {
      id: 5,
      name: 'Cancelled',
      label: 'Annulée',
      color: 'error',
      icon: 'tabler-x',
      description: 'Demande annulée',
      isDefault: true,
      canEdit: false,
      category: 'deliveries',
    },
  ],
  drivers: [
    {
      id: 101,
      name: 'Available',
      label: 'Disponible',
      color: 'success',
      icon: 'tabler-user-check',
      description: 'Livreur disponible pour une nouvelle mission',
      isDefault: true,
      canEdit: false,
      category: 'drivers',
    },
    {
      id: 102,
      name: 'Busy',
      label: 'Occupé',
      color: 'warning',
      icon: 'tabler-truck',
      description: 'Livreur en cours de livraison',
      isDefault: true,
      canEdit: false,
      category: 'drivers',
    },
    {
      id: 103,
      name: 'Offline',
      label: 'Hors ligne',
      color: 'secondary',
      icon: 'tabler-user-off',
      description: 'Livreur non disponible',
      isDefault: true,
      canEdit: false,
      category: 'drivers',
    },
    {
      id: 104,
      name: 'Suspended',
      label: 'Suspendu',
      color: 'error',
      icon: 'tabler-user-x',
      description: 'Livreur temporairement suspendu',
      isDefault: true,
      canEdit: false,
      category: 'drivers',
    },
  ],
  partners: [
    {
      id: 201,
      name: 'Prospecting',
      label: 'Prospection',
      color: 'info',
      icon: 'tabler-search',
      description: 'Partenaire en cours de prospection',
      isDefault: true,
      canEdit: false,
      category: 'partners',
    },
    {
      id: 202,
      name: 'Active',
      label: 'Actif',
      color: 'success',
      icon: 'tabler-handshake',
      description: 'Partenaire actif et opérationnel',
      isDefault: true,
      canEdit: false,
      category: 'partners',
    },
    {
      id: 203,
      name: 'Inactive',
      label: 'Inactif',
      color: 'secondary',
      icon: 'tabler-pause',
      description: 'Partenaire temporairement inactif',
      isDefault: true,
      canEdit: false,
      category: 'partners',
    },
    {
      id: 204,
      name: 'Rejected',
      label: 'Rejeté',
      color: 'error',
      icon: 'tabler-x',
      description: 'Partenariat rejeté ou terminé',
      isDefault: true,
      canEdit: false,
      category: 'partners',
    },
  ],
  clients: [
    {
      id: 301,
      name: 'Active',
      label: 'Actif',
      color: 'success',
      icon: 'tabler-user-check',
      description: 'Client actif avec compte valide',
      isDefault: true,
      canEdit: false,
      category: 'clients',
    },
    {
      id: 302,
      name: 'Pending',
      label: 'En attente',
      color: 'warning',
      icon: 'tabler-clock',
      description: 'Client en attente de validation',
      isDefault: true,
      canEdit: false,
      category: 'clients',
    },
    {
      id: 303,
      name: 'Suspended',
      label: 'Suspendu',
      color: 'error',
      icon: 'tabler-user-x',
      description: 'Client temporairement suspendu',
      isDefault: true,
      canEdit: false,
      category: 'clients',
    },
  ],
}

export const useStatusManagement = () => {
  const statusCategories = ref({ ...defaultStatuses })
  const isLoading = ref(false)

  /**
   * Get all statuses for a specific category
   */
  const getStatusesByCategory = category => {
    return statusCategories.value[category] || []
  }

  /**
   * Get status options for select components by category
   */
  const getStatusOptions = category => {
    const statuses = getStatusesByCategory(category)
    
    return statuses.map(status => ({
      title: status.label,
      value: status.name.toLowerCase().replace(/\s+/g, '-'),
      color: status.color,
      icon: status.icon,
    }))
  }

  /**
   * Get status by name and category
   */
  const getStatusByName = (category, name) => {
    const statuses = getStatusesByCategory(category)
    
    return statuses.find(status => 
      status.name.toLowerCase().replace(/\s+/g, '-') === name.toLowerCase(),
    )
  }

  /**
   * Get status color by name and category
   */
  const getStatusColor = (category, name) => {
    const status = getStatusByName(category, name)
    
    return status ? status.color : 'secondary'
  }

  /**
   * Get status icon by name and category
   */
  const getStatusIcon = (category, name) => {
    const status = getStatusByName(category, name)
    
    return status ? status.icon : 'tabler-circle'
  }

  /**
   * Get status label by name and category
   */
  const getStatusLabel = (category, name) => {
    const status = getStatusByName(category, name)
    
    return status ? status.label : name
  }

  /**
   * Add a new status to a category
   */
  const addStatus = async (category, statusData) => {
    try {
      const statuses = getStatusesByCategory(category)
      const maxId = Math.max(...statuses.map(s => s.id), 0)
      
      const newStatus = {
        id: maxId + 1,
        name: statusData.name,
        label: statusData.label,
        color: statusData.color,
        icon: statusData.icon,
        description: statusData.description,
        isDefault: false,
        canEdit: true,
        category,
      }
      
      statusCategories.value[category].push(newStatus)
      
      return true
    } catch (error) {
      console.error('Error adding status:', error)
      
      return false
    }
  }

  /**
   * Update an existing status
   */
  const updateStatus = async (category, statusData) => {
    try {
      const statuses = getStatusesByCategory(category)
      const index = statuses.findIndex(s => s.id === statusData.id)
      
      if (index !== -1) {
        statusCategories.value[category][index] = { ...statusData }
      }
      
      return true
    } catch (error) {
      console.error('Error updating status:', error)
      
      return false
    }
  }

  /**
   * Delete a status from a category
   */
  const deleteStatus = async (category, statusId) => {
    try {
      const statuses = getStatusesByCategory(category)
      const index = statuses.findIndex(s => s.id === statusId)
      
      if (index !== -1 && !statuses[index].isDefault) {
        statusCategories.value[category].splice(index, 1)
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error deleting status:', error)
      
      return false
    }
  }

  /**
   * Load statuses from API
   */
  const loadStatuses = async () => {
    isLoading.value = true
    try {
      const response = await $api('/settings/statuses', {
        method: 'GET',
      })
      
      if (response && response.success && response.statuses) {
        statusCategories.value = { ...defaultStatuses, ...response.statuses }
      }
    } catch (error) {
      console.warn('Could not load statuses from API, using defaults:', error)
      statusCategories.value = { ...defaultStatuses }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Save all statuses to API
   */
  const saveAllStatuses = async () => {
    isLoading.value = true
    try {
      await $api('/settings/statuses', {
        method: 'POST',
        body: { statuses: statusCategories.value },
      })
      
      return true
    } catch (error) {
      console.error('Error saving statuses:', error)
      
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Load statuses on composable initialization
  onMounted(() => {
    loadStatuses()
  })

  return {
    statusCategories: readonly(statusCategories),
    isLoading: readonly(isLoading),
    getStatusesByCategory,
    getStatusOptions,
    getStatusByName,
    getStatusColor,
    getStatusIcon,
    getStatusLabel,
    addStatus,
    updateStatus,
    deleteStatus,
    loadStatuses,
    saveAllStatuses,
  }
}

// Legacy composable for backward compatibility with delivery statuses
export const useDeliveryStatuses = () => {
  const { 
    getStatusesByCategory, 
    getStatusOptions, 
    getStatusByName, 
    getStatusColor, 
    getStatusIcon, 
    getStatusLabel, 
  } = useStatusManagement()

  return {
    statuses: computed(() => getStatusesByCategory('deliveries')),
    getStatuses: () => getStatusesByCategory('deliveries'),
    getStatusOptions: () => getStatusOptions('deliveries'),
    getStatusByName: name => getStatusByName('deliveries', name),
    getStatusColor: name => getStatusColor('deliveries', name),
    getStatusIcon: name => getStatusIcon('deliveries', name),
    getStatusLabel: name => getStatusLabel('deliveries', name),
  }
}
