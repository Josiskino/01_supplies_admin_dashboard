// Navigation items configuration
const allNavItems = [
  // Commented out - Dashboard is no longer displayed in navigation
  // {
  //   title: 'Dashboards',
  //   icon: { icon: 'tabler-smart-home' },
  //   to: 'dashboard',
  //   badgeContent: '5',
  //   badgeClass: 'bg-error',
  //   roles: ['Logisticien', 'Assistant Logisticien', 'Comptable', 'Service Client'], // Accessible to all
  // },
  { heading: 'App' },

  // 1. Livraison (Delivery)

  {
    title: 'Delivery',
    icon: { icon: 'tabler-truck' },
    to: 'delivery-list',
    roles: ['Logisticien', 'Assistant Logisticien', 'Comptable', 'Superviseur', 'Stagiaire'],
    // Commented out for future use - uncomment to restore dropdown menu
    // children: [
    //   { title: 'Dashboard', to: 'delivery-dashboard' },
    //   { title: 'List', to: 'delivery-list' },
    // ],
  },
  // 2. Partenaires (Partners)
  {
    title: 'Partners',
    icon: { icon: 'tabler-users' },
    to: 'partners-list',
    roles: ['Logisticien', 'Assistant Logisticien', 'Service Client', 'Comptable', 'Superviseur', 'Stagiaire'],
  },
  // 3. Livreurs (Couriers)
  { 
    title: 'Couriers',
    icon: { icon: 'tabler-users' },
    to: 'couriers-list',
    roles: ['Logisticien', 'Assistant Logisticien', 'Comptable', 'Superviseur'],
    // Commented out - Activity screen is no longer displayed in navigation
    // children: [
    //   { title: 'List', to: 'couriers-list' },
    //   { title: 'Activity', to: 'couriers-activity' },
    // ],
  },
  // 4. Clients (Customers)
  {
    title: 'Customers',
    icon: { icon: 'tabler-users' },
    to: 'customer-list',
    roles: ['Logisticien', 'Assistant Logisticien', 'Service Client', 'Comptable', 'Superviseur', 'Stagiaire'],
  },
  // 5. Financier (Financial)
  {
    title: 'Financial',
    icon: { icon: 'tabler-currency-dollar' },
    roles: ['Comptable', 'Superviseur'],
    children: [
      { title: 'Transactions', to: 'financial-transactions' },
      { title: 'Price Adjustments', to: 'financial-price-adjustments' },
      { title: 'Expenses', to: 'financial-expenses' },
      { title: 'Driver Turnover', to: 'financial-driver-turnover' },
      { title: 'Report', to: 'financial-report' },
    ],
  },
  // 6. Statistiques (Statistics)
  {
    title: 'Statistics',
    icon: { icon: 'tabler-chart-bar' },
    to: 'statistics',
    roles: ['Business Developer'],
  },
  // 7. Exclusions de notifications
  {
    title: 'Notifications',
    icon: { icon: 'tabler-bell-off' },
    roles: [], // Admin & Super Admin uniquement (roles vide = admin only)
    children: [
      { title: 'Opt-outs globaux', to: 'notification-opt-outs-list' },
      { title: 'Exclusions par livraison', to: 'notification-opt-outs-delivery-exclusions' },
    ],
  },
  // 8. Rôles et Permissions (Roles & Permissions)

  {
    title: 'Roles & Permissions',
    icon: { icon: 'tabler-lock' },
    to: 'role',
    roles: [], // Only Super Admin or specific role - adjust as needed
  },
  // 7. Paramètres (Settings)
  { 
    title: 'Settings', 
    icon: { icon: 'tabler-settings' },
    to: 'settings',
    roles: [], // Only Super Admin or specific role - adjust as needed
  }, 
  // Commented out - Reports section is no longer displayed in navigation
  // { 
  //   title: 'Reports',
  //   icon: { icon: 'tabler-chart-bar' },
  //   roles: ['Logisticien', 'Assistant Logisticien', 'Comptable', 'Service Client'], // Accessible to all
  // }, 
]

// Function to get user role from cookie
export const getUserRole = () => {
  const userData = useCookie('userData').value
  if (!userData) {
    console.log('[Navigation] No userData found')

    return null
  }

  // Check different possible role field names
  const role = userData.role?.name || userData.role || userData.roles?.[0]?.name || userData.roles?.[0]

  console.log('[Navigation] ==========================================')
  console.log('[Navigation] UserData structure:', {
    'userData.role': userData.role,
    'userData.role?.name': userData.role?.name,
    'userData.roles': userData.roles,
    'userData.roles?.[0]': userData.roles?.[0],
    'userData.roles?.[0]?.name': userData.roles?.[0]?.name,
  })
  console.log('[Navigation] Detected role (raw):', role)
  console.log('[Navigation] Detected role (type):', typeof role)
  console.log('[Navigation] ==========================================')

  return role
}

// Function to filter navigation items based on user role
export const getFilteredNavigation = () => {
  const userRole = getUserRole()

  console.log('[Navigation] Filtering navigation for role:', userRole)

  if (!userRole) {
    // If no role, return only headings (dashboard is commented out)
    console.log('[Navigation] No role found, returning headings only')

    return allNavItems.filter(item => item.heading)
  }

  // Normalize user role for comparison (case-insensitive)
  const normalizedUserRole = userRole?.toString().trim().toLowerCase()

  // If user is admin, show all items
  // Check for: "Super Admin", "super admin", "SuperAdmin", "admin", etc.
  const isAdmin = normalizedUserRole === 'admin' || 
                  normalizedUserRole === 'super admin' || 
                  normalizedUserRole === 'superadmin' ||
                  normalizedUserRole === 'super-admin'

  if (isAdmin) {
    console.log('[Navigation] Admin role detected, showing all items')

    // Return all items for admin
    return allNavItems
  }

  const filtered = allNavItems.filter(item => {
    // Headings are always shown
    if (item.heading) return true

    // If item has no roles array, it's not accessible (like Settings, Roles & Permissions)
    if (!item.roles || item.roles.length === 0) return false

    // Check if user role is in the allowed roles (case-insensitive comparison)
    const normalizedItemRoles = item.roles.map(r => {
      const roleStr = r?.toString().trim().toLowerCase()

      console.log(`[Navigation] Normalizing role "${r}" -> "${roleStr}"`)

      return roleStr
    })

    const isAllowed = normalizedItemRoles.includes(normalizedUserRole)

    console.log(`[Navigation] Item "${item.title}": ${isAllowed ? 'ALLOWED' : 'DENIED'}`)
    console.log(`  - User role: "${normalizedUserRole}"`)
    console.log(`  - Allowed roles: [${normalizedItemRoles.join(', ')}]`)
    console.log(`  - Match: ${isAllowed}`)

    return isAllowed
  })

  console.log('[Navigation] Filtered items:', filtered.map(i => i.title || i.heading))

  return filtered
}

// Function to get the first accessible page for a user role
export const getFirstAccessiblePage = (userRole = null) => {
  // If no role provided, try to get it from cookie
  if (!userRole) {
    userRole = getUserRole()
  }

  if (!userRole) {
    return null
  }

  // Normalize user role for comparison (case-insensitive)
  const normalizedUserRole = userRole?.toString().trim().toLowerCase()

  // If user is admin, return first item
  const isAdmin = normalizedUserRole === 'admin' || 
                  normalizedUserRole === 'super admin' || 
                  normalizedUserRole === 'superadmin' ||
                  normalizedUserRole === 'super-admin'

  if (isAdmin) {
    // For admin, return first non-heading item
    const firstItem = allNavItems.find(item => !item.heading && (item.to || item.children))
    if (firstItem) {
      if (firstItem.children && firstItem.children.length > 0) {
        return firstItem.children[0].to
      }
      return firstItem.to
    }
    return null
  }

  // Filter items based on role
  const filtered = allNavItems.filter(item => {
    if (item.heading) return false
    if (!item.roles || item.roles.length === 0) return false

    const normalizedItemRoles = item.roles.map(r => r?.toString().trim().toLowerCase())
    return normalizedItemRoles.includes(normalizedUserRole)
  })

  // Find first accessible item
  for (const item of filtered) {
    // If item has children, return first child
    if (item.children && item.children.length > 0) {
      return item.children[0].to
    }
    // If item has direct route, return it
    if (item.to) {
      return item.to
    }
  }

  return null
}

// Export all nav items for reference
export { allNavItems }

// Default export - will be computed in the component
export default allNavItems
