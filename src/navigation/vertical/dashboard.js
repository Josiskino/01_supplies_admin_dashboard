export default [
  {
    title: 'Dashboards',
    icon: { icon: 'tabler-smart-home' },
    to: 'dashboard',

    // children: [
    //   {
    //     title: 'Analytics',
    //     //to: 'template-dashboards-analytics',
    //   },
    // ],
    badgeContent: '5',
    badgeClass: 'bg-error',
  },
  { heading: 'App' },
  { 
    title: 'Couriers',
    icon: { icon: 'tabler-users' },
    children: [
      { title: 'List', to: 'couriers-list' },
      { title: 'Activity', to: 'couriers-activity' },
    ],
  },
  {
    title: 'Delivery',
    icon: { icon: 'tabler-truck' },
    children: [
      { title: 'Dashboard', to: 'delivery-dashboard' },
      { title: 'List', to: 'delivery-list' },
    ],
  },
  {
    title: 'Partners',
    icon: { icon: 'tabler-users' },

    children: [
      { title: 'List', to: 'partners-list' },
      { title: 'Add'  },
    ],
  },
  { title: 'Reports',
    icon: { icon: 'tabler-chart-bar' },
  },
  { 
    title: 'Roles & Permissions',
    icon: { icon: 'tabler-lock' },
    to: 'role',

    // children: [
    //   { title: 'Roles', to: 'role' },
    // ],
  },
  {
    title: 'Financial',
    icon: { icon: 'tabler-currency-dollar' },

    children: [
      { title: 'Transactions', to: 'financial-transactions' },
      { title: 'Report', to: 'financial-report' },
    ],
  },
  { title: 'Settings', 
    icon: { icon: 'tabler-settings' },
    to: 'settings',
  }, 
]
