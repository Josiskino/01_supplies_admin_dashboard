import { canNavigate } from '@layouts/plugins/casl'

export const setupGuards = router => {
  // 👉 router.beforeEach
  // Docs: https://router.vuejs.org/guide/advanced/navigation-guards.html#global-before-guards
  router.beforeEach(to => {
    /**
         * Check if user is logged in by checking if token & user data exists in local storage
         * Feel free to update this logic to suit your needs
         */
    const isLoggedIn = !!(useCookie('userData').value && useCookie('accessToken').value)

    /*
         * If it's a public route, continue navigation. This kind of pages are allowed to visited by login & non-login users. Basically, without any restrictions.
         * Examples of public routes are, 404, under maintenance, etc.
         */
    if (to.meta.public) {
      // For public routes, allow access but check login for specific routes if needed
      return
    }

    /*
          If user is logged in and is trying to access login like page, redirect to home
          else allow visiting the page
          (WARN: Don't allow executing further by return statement because next code will check for permissions)
         */
    if (to.meta.unauthenticatedOnly) {
      if (isLoggedIn)
        return '/'
      else
        return undefined
    }

    // Check if route requires specific permissions
    const hasPermissionDefined = to.matched.some(route => route.meta?.action && route.meta?.subject)
    
    // If route has no permissions defined and user is logged in, allow access
    if (!hasPermissionDefined && isLoggedIn) {
      return
    }
    
    if (!canNavigate(to) && to.matched.length) {
      /* eslint-disable indent */
            return isLoggedIn
                ? { name: 'template-not-authorized' }
                : {
                    name: 'auth-login',
                    query: {
                        ...to.query,
                        to: to.fullPath !== '/' ? to.path : undefined,
                    },
                }
            /* eslint-enable indent */
    }
  })
}
