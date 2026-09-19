import type { RouteObject } from 'react-router';

import { Outlet } from 'react-router';
import { lazy, Suspense } from 'react';

import { SplashScreen } from 'src/components/loading-screen';

import { GuestGuard } from 'src/auth/guard';

/* ------------------------------------------------------------------------ */
/*                                    ICP                                   */
/* ------------------------------------------------------------------------ */
const Icp = {
  SignInPage: lazy(() => import('src/pages/auth/icp/sign-in')),
};

const authIcp = {
  path: 'icp',
  children: [
    {
      path: 'sign-in',
      element: (
        <GuestGuard>
          <Icp.SignInPage />
        </GuestGuard>
      ),
    },
  ],
};

// ----------------------------------------------------------------------

export const authRoutes: RouteObject[] = [
  {
    path: 'auth',
    element: (
      <Suspense fallback={<SplashScreen />}>
        <Outlet />
      </Suspense>
    ),
    children: [authIcp],
  },
];
