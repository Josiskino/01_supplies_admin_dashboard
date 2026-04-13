import { ability } from '@/plugins/casl/ability'

/**
 * Configuration de la navigation verticale.
 *
 * Chaque item peut avoir :
 * - action + subject  → vérifié via CASL (ability.can)
 * - adminOnly         → visible uniquement par admin / Super Admin
 * - superAdminOnly    → visible uniquement par Super Admin
 * - children[]        → items enfants (action/subject propres ou hérités)
 */
const allNavItems = [
  { heading: 'App' },

  // 1. Livraisons
  {
    title: 'Delivery',
    icon: { icon: 'tabler-truck' },
    to: 'delivery-list',
    action: 'view',
    subject: 'delivery',
  },

  // 2. Partenaires
  {
    title: 'Partners',
    icon: { icon: 'tabler-users' },
    to: 'partners-list',
    action: 'view',
    subject: 'partner',
  },

  // 3. Livreurs
  {
    title: 'Couriers',
    icon: { icon: 'tabler-motorcycle' },
    to: 'couriers-list',
    action: 'view',
    subject: 'driver',
  },

  // 4. Clients
  {
    title: 'Customers',
    icon: { icon: 'tabler-user-circle' },
    to: 'customer-list',
    action: 'view',
    subject: 'customer',
  },

  // 5. Financier (groupe)
  {
    title: 'Financial',
    icon: { icon: 'tabler-currency-dollar' },
    action: 'view',
    subject: 'financial',
    children: [
      {
        title: 'Transactions',
        to: 'financial-transactions',
        action: 'view',
        subject: 'payment',
      },
      {
        title: 'Price Adjustments',
        to: 'financial-price-adjustments',
        action: 'view',
        subject: 'price-adjustment',
      },
      {
        title: 'Expenses',
        to: 'financial-expenses',
        action: 'view',
        subject: 'expense',
      },
      {
        title: 'Driver Turnover',
        to: 'financial-driver-turnover',
        action: 'view',
        subject: 'payment',
      },
      {
        title: 'Report',
        to: 'financial-report',
        action: 'view',
        subject: 'financial',
      },
    ],
  },

  // 6. Statistiques
  {
    title: 'Statistics',
    icon: { icon: 'tabler-chart-bar' },
    to: 'statistics',
    action: 'view',
    subject: 'business-stats',
  },

  // ── Section admin ─────────────────────────────────────────────

  { heading: 'Administration' },

  // 7. Utilisateurs
  {
    title: 'Users',
    icon: { icon: 'tabler-users-group' },
    to: 'users-list',
    adminOnly: true,
    action: 'view',
    subject: 'user',
  },

  // 8. Notifications (opt-outs)
  {
    title: 'Notifications',
    icon: { icon: 'tabler-bell-off' },
    adminOnly: true,
    action: 'view',
    subject: 'notifications-admin',
    children: [
      { title: 'Opt-outs globaux', to: 'notification-opt-outs-list' },
      { title: 'Exclusions par livraison', to: 'notification-opt-outs-delivery-exclusions' },
      { title: 'Templates de messages', to: 'notification-opt-outs-templates' },
    ],
  },

  // 9. Journal d'activité
  {
    title: 'Journal d\'activité',
    icon: { icon: 'tabler-activity' },
    to: 'activity-logs',
    superAdminOnly: true,
    action: 'view',
    subject: 'activity-logs',
  },

  // 10. Rôles & Permissions
  {
    title: 'Roles & Permissions',
    icon: { icon: 'tabler-lock' },
    to: 'role',
    adminOnly: true,
    action: 'view',
    subject: 'roles-permissions',
  },

  // 11. Paramètres
  {
    title: 'Settings',
    icon: { icon: 'tabler-settings' },
    to: 'settings',
    adminOnly: true,
    action: 'view',
    subject: 'settings',
  },
]

// ─── Helpers rôle ──────────────────────────────────────────────────────────

export const getUserRole = () => {
  const userData = useCookie('userData').value
  if (!userData) return null

  return userData.role?.name || userData.role || userData.roles?.[0]?.name || userData.roles?.[0] || null
}

const isAdminRole = role => {
  const r = role?.toString().trim().toLowerCase()

  return r === 'admin' || r === 'super admin' || r === 'superadmin' || r === 'super-admin'
}

const isSuperAdminRole = role => {
  const r = role?.toString().trim().toLowerCase()

  return r === 'super admin' || r === 'superadmin' || r === 'super-admin'
}

// ─── Filtrage navigation ────────────────────────────────────────────────────

/**
 * Retourne les items de navigation accessibles à l'utilisateur connecté.
 * Utilise CASL (ability.can) comme source de vérité principale.
 */
export const getFilteredNavigation = () => {
  const userRole   = getUserRole()
  const superAdmin = isSuperAdminRole(userRole)
  const admin      = isAdminRole(userRole)

  const canAccess = (item) => {
    // Super Admin voit tout
    if (superAdmin) return true

    // Réservé Super Admin seulement
    if (item.superAdminOnly) return false

    // Admin voit les items adminOnly
    if (item.adminOnly && admin) return true
    if (item.adminOnly && !admin) return false

    // Vérification CASL
    if (item.action && item.subject) {
      return ability.can(item.action, item.subject)
    }

    return false
  }

  return allNavItems
    .filter(item => {
      // Les headings sont toujours inclus (filtrés après si section vide)
      if (item.heading) return true

      return canAccess(item)
    })
    .map(item => {
      // Filtrer les enfants aussi
      if (item.children) {
        return {
          ...item,
          children: item.children.filter(child => {
            if (superAdmin || admin) return true
            if (!child.action || !child.subject) return true

            return ability.can(child.action, child.subject)
          }),
        }
      }

      return item
    })
    .filter((item, index, arr) => {
      // Supprimer les headings orphelins (suivis d'un autre heading ou fin de liste)
      if (!item.heading) return true
      const next = arr[index + 1]

      return next && !next.heading
    })
}

// ─── Premier écran accessible ───────────────────────────────────────────────

export const getFirstAccessiblePage = (userRole = null) => {
  if (!userRole) userRole = getUserRole()
  if (!userRole) return null

  const filtered = getFilteredNavigation()

  for (const item of filtered) {
    if (item.heading) continue
    if (item.children?.length) return item.children[0].to
    if (item.to) return item.to
  }

  return null
}

export { allNavItems }
export default allNavItems
