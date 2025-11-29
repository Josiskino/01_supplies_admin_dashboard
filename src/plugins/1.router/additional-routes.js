const emailRouteComponent = () => import('@/pages/template/apps/email/index.vue')

// 👉 Redirects
export const redirects = [
  // ℹ️ We are redirecting to different pages based on role.
  // NOTE: Role is just for UI purposes. ACL is based on abilities.
  {
    path: '/',
    name: 'index',
    redirect: to => {
      const userData = useCookie('userData')
      
      // Check if user is logged in
      if (!userData.value) {
        return { name: 'auth-login', query: to.query }
      }
      
      // Get user role (check different possible role field names)
      const userRole = userData.value.role?.name || userData.value.role || userData.value.roles?.[0]?.name || userData.value.roles?.[0]
      
      if (!userRole) {
        return { name: 'auth-login', query: to.query }
      }
      
      // Normalize role for comparison (case-insensitive)
      const normalizedRole = userRole.toString().trim().toLowerCase()
      
      // Redirect based on role
      // Admin roles - keep dashboard for now
      if (normalizedRole === 'admin' || 
          normalizedRole === 'super admin' || 
          normalizedRole === 'superadmin' ||
          normalizedRole === 'super-admin') {
        return { name: 'template-dashboards-crm' }
      }
      
      // Logisticien and Assistant Logisticien → Delivery list
      if (normalizedRole === 'logisticien' || normalizedRole === 'assistant logisticien') {
        return { name: 'delivery-list' }
      }
      
      // Comptable → Financial transactions
      if (normalizedRole === 'comptable') {
        return { name: 'financial-transactions' }
      }
      
      // Client role
      if (normalizedRole === 'client') {
        return { name: 'template-access-control' }
      }
      
      // Default: redirect to login
      return { name: 'auth-login', query: to.query }
    },
  },
  {
    path: '/pages/user-profile',
    name: 'template-pages-user-profile',
    redirect: () => ({ name: 'template-pages-user-profile-tab', params: { tab: 'profile' } }),
  },
  {
    path: '/pages/account-settings',
    name: 'template-pages-account-settings',
    redirect: () => ({ name: 'template-pages-account-settings-tab', params: { tab: 'account' } }),
  },
]
export const routes = [
  // Email filter
  {
    path: '/apps/email/filter/:filter',
    name: 'template-apps-email-filter',
    component: emailRouteComponent,
    meta: {
      navActiveLink: 'template-apps-email',
      layoutWrapperClasses: 'layout-content-height-fixed',
    },
  },

  // Email label
  {
    path: '/apps/email/label/:label',
    name: 'template-apps-email-label',
    component: emailRouteComponent,
    meta: {
      // contentClass: 'email-application',
      navActiveLink: 'template-apps-email',
      layoutWrapperClasses: 'layout-content-height-fixed',
    },
  },
  {
    path: '/dashboards/logistics',
    name: 'template-dashboards-logistics',
    component: () => import('@/pages/template/apps/logistics/dashboard.vue'),
  },
  {
    path: '/dashboards/academy',
    name: 'template-dashboards-academy',
    component: () => import('@/pages/template/apps/academy/dashboard.vue'),
  },
  {
    path: '/apps/ecommerce/dashboard',
    name: 'template-apps-ecommerce-dashboard',
    component: () => import('@/pages/template/dashboards/ecommerce.vue'),
  },
]
