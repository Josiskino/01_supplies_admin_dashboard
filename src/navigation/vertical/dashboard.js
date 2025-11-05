// Navigation items configuration
const allNavItems = [
  {
    title: 'Dashboards',
    icon: { icon: 'tabler-smart-home' },
    to: 'dashboard',
    badgeContent: '5',
    badgeClass: 'bg-error',
    roles: ['Logisticien', 'Assistant Logisticien', 'Comptable', 'Service Client'], // Accessible to all
  },
  { heading: 'App' },
  { 
    title: 'Couriers',
    icon: { icon: 'tabler-users' },
    roles: ['Logisticien', 'Assistant Logisticien'],
    children: [
      { title: 'List', to: 'couriers-list' },
      { title: 'Activity', to: 'couriers-activity' },
    ],
  },
  {
    title: 'Delivery',
    icon: { icon: 'tabler-truck' },
    roles: ['Logisticien', 'Assistant Logisticien'],
    children: [
      { title: 'Dashboard', to: 'delivery-dashboard' },
      { title: 'List', to: 'delivery-list' },
    ],
  },
  {
    title: 'Partners',
    icon: { icon: 'tabler-users' },
    roles: ['Logisticien', 'Assistant Logisticien', 'Service Client'],
    children: [
      { title: 'List', to: 'partners-list' },
      { title: 'Add' },
    ],
  },
  { 
    title: 'Reports',
    icon: { icon: 'tabler-chart-bar' },
    roles: ['Logisticien', 'Assistant Logisticien', 'Comptable', 'Service Client'], // Accessible to all
  },
  { 
    title: 'Roles & Permissions',
    icon: { icon: 'tabler-lock' },
    to: 'role',
    roles: [], // Only Super Admin or specific role - adjust as needed
  },
  {
    title: 'Customers',
    icon: { icon: 'tabler-users' },
    to: 'customer-list',
    roles: ['Logisticien', 'Assistant Logisticien', 'Service Client'],
  },
  {
    title: 'Financial',
    icon: { icon: 'tabler-currency-dollar' },
    roles: ['Comptable'],
    children: [
      { title: 'Transactions', to: 'financial-transactions' },
      { title: 'Report', to: 'financial-report' },
    ],
  },
  { 
    title: 'Settings', 
    icon: { icon: 'tabler-settings' },
    to: 'settings',
    roles: [], // Only Super Admin or specific role - adjust as needed
  }, 
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
    // If no role, return only dashboard
    console.log('[Navigation] No role found, returning dashboard only')

    return allNavItems.filter(item => item.title === 'Dashboards' || item.heading)
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

// Export all nav items for reference
export { allNavItems }

// Default export - will be computed in the component
export default allNavItems
