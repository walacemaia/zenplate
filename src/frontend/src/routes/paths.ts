const ROOTS = {
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  ADMIN: '/admin',
};

// ----------------------------------------------------------------------

export const paths = {
  faqs: '/faqs',
  minimalStore: 'https://mui.com/store/items/minimal-dashboard/',
  // AUTH
  auth: {
    icp: {
      signIn: `${ROOTS.AUTH}/icp/sign-in`,
    },
  },
  // DASHBOARD
  dashboard: {
    root: ROOTS.DASHBOARD,
    home: `${ROOTS.DASHBOARD}/home`,
    profile: `${ROOTS.DASHBOARD}/profile`,
  },

  admin: {
    root: ROOTS.ADMIN,
    repostatus: `${ROOTS.ADMIN}/repostatus`,
    profiles: `${ROOTS.ADMIN}/profiles`,
    configuration: `${ROOTS.ADMIN}/configuration`,
    backup: `${ROOTS.ADMIN}/backup`,
  },
};
