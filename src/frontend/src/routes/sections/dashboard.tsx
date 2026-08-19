import type { RouteObject } from 'react-router';

import { Outlet } from 'react-router';
import { lazy, Suspense } from 'react';

import { CONFIG } from 'src/global-config';
import { DashboardLayout } from 'src/layouts/dashboard';

import { LoadingScreen } from 'src/components/loading-screen';

import { AuthGuard } from 'src/auth/guard';

import { usePathname } from '../hooks';

// ----------------------------------------------------------------------

const PageHome = lazy(() => import('src/pages/dashboard/home-page'));
const PageProfile = lazy(() => import('src/pages/dashboard/profile/profile'));
const PageRepoStats = lazy(() => import('src/pages/admin/repository-stats'));
const PageProfiles = lazy(() => import('src/pages/admin/profiles/profile-page'));
const PageConfiguration = lazy(() => import('src/pages/admin/configuration/configuration'));
const PageBackup = lazy(() => import('src/pages/admin/backup'));

// ----------------------------------------------------------------------

function SuspenseOutlet() {
  const pathname = usePathname();
  return (
    <Suspense key={pathname} fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  );
}

const dashboardLayout = () => (
  <DashboardLayout>
    <SuspenseOutlet />
  </DashboardLayout>
);

export const dashboardRoutes: RouteObject[] = [
  {
    path: 'dashboard',
    element: CONFIG.auth.skip ? dashboardLayout() : <AuthGuard>{dashboardLayout()}</AuthGuard>,
    children: [
      { path: 'home', element: <PageHome /> },
      { path: 'profile', element: <PageProfile /> },
    ],
  },

  {
    path: 'admin',
    element: CONFIG.auth.skip ? dashboardLayout() : <AuthGuard>{dashboardLayout()}</AuthGuard>,
    children: [
      { path: 'repostatus', element: <PageRepoStats />, index: true },
      { path: 'profiles', element: <PageProfiles /> },
      { path: 'configuration', element: <PageConfiguration /> },
      { path: 'backup', element: <PageBackup /> },
    ],
  },
];
