export default [
  {
    title: 'Dashboards',
    icon: { icon: 'tabler-smart-home' },
    children: [
      {
        title: 'Analytics',
        //to: 'template-dashboards-analytics',
      },
    ],
    badgeContent: '5',
    badgeClass: 'bg-error',
  },
  { heading: 'App' },
  { title: 'Couriers',
    icon: { icon: 'tabler-users' },
    children: [
      { title: 'List', to: 'couriers-list' },
      { title: 'Add',  },
    ]
  },
  {
    title: 'Delivery',
    icon: { icon: 'tabler-truck' },
    children: [
      { title: 'Dashboard', to: 'delivery-dashboard' },
      { title: 'List',  },
      { title: 'Add',  },
    ]
  },
  {
    title: 'Partners',
    icon: { icon: 'tabler-users' },
    //to: 'app-partners-list',  // <- Route générée automatiquement
    children: [
      { title: 'List',  },
      { title: 'Add',  },
    ]
  },
  { title: 'Reports',
    icon: { icon: 'tabler-chart-bar' },
  },
  { title: 'Roles & Permissions',
    icon: { icon: 'tabler-lock' },
    children: [
      { title: 'Roles', to: 'role' },
      { title: 'Permissions',  },
    ]
  },
  { title: 'Settings', 
    icon: { icon: 'tabler-settings' },
    children: [
      { title: 'List',  },
      { title: 'Add',  },
    ]
  }, 
]
