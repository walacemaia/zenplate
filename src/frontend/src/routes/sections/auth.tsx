import type { RouteObject } from 'react-router';

import { Outlet } from 'react-router';
import { lazy, Suspense } from 'react';

import { AuthSplitLayout } from 'src/layouts/auth-split';

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
          <AuthSplitLayout
            slotProps={{
              section: { title: 'IcpApp' },
            }}
          >
            <Icp.SignInPage />
          </AuthSplitLayout>
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
