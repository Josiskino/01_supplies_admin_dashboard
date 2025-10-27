const emailRouteComponent = () => import('@/pages/template/apps/email/index.vue')

// 👉 Redirects
export const redirects = [
  // ℹ️ We are redirecting to different pages based on role.
  // NOTE: Role is just for UI purposes. ACL is based on abilities.
  {
    path: '/',
    name: 'index',
    redirect: to => {
      // TODO: Get type from backend
      const userData = useCookie('userData')
      const userRole = userData.value?.role
      if (userRole === 'admin')
        return { name: 'template-dashboards-crm' }
      if (userRole === 'client')
        return { name: 'template-access-control' }
      
      return { name: 'template-login', query: to.query }
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
