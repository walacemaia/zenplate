import 'katex/dist/katex.min.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { Outlet, RouterProvider, createBrowserRouter } from 'react-router';

import App from './app';
import { routesSection } from './routes/sections';
import { ErrorBoundary } from './routes/components';
import { checkBackendVersionAndReloadIfNeeded } from './utils/backend-version';
import { setupPwaAutoUpdate } from './utils/pwa-auto-update';

// ----------------------------------------------------------------------

const CHUNK_RELOAD_ATTEMPT_KEY = '__zq_chunk_reload_attempt_at__';
const CHUNK_RELOAD_WINDOW_MS = 15_000;

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return /Failed to fetch dynamically imported module|Importing a module script failed|dynamically imported module/i.test(
    error.message
  );
}

function reloadOnChunkLoadError(): boolean {
  const now = Date.now();
  const lastAttempt = Number(sessionStorage.getItem(CHUNK_RELOAD_ATTEMPT_KEY) || '0');

  if (lastAttempt > 0 && now - lastAttempt < CHUNK_RELOAD_WINDOW_MS) {
    return false;
  }

  sessionStorage.setItem(CHUNK_RELOAD_ATTEMPT_KEY, String(now));
  window.location.reload();
  return true;
}

window.addEventListener('vite:preloadError', (event: Event) => {
  const customEvent = event as Event & { payload?: unknown; error?: unknown };
  const err = customEvent.payload ?? customEvent.error;

  if (!isChunkLoadError(err)) {
    return;
  }

  event.preventDefault();
  reloadOnChunkLoadError();
});

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  if (!isChunkLoadError(event.reason)) {
    return;
  }

  event.preventDefault();
  reloadOnChunkLoadError();
});

const router = createBrowserRouter([
  {
    Component: () => (
      <App>
        <Outlet />
      </App>
    ),
    errorElement: <ErrorBoundary />,
    children: routesSection,
  },
]);

const root = createRoot(document.getElementById('root')!);

function renderApp() {
  root.render(
    <StrictMode>
      <HelmetProvider>
        <RouterProvider router={router} />
      </HelmetProvider>
    </StrictMode>
  );
}

async function runVersionGate(): Promise<boolean> {
  return checkBackendVersionAndReloadIfNeeded();
}

async function bootstrap() {
  setupPwaAutoUpdate();
  const shouldRender = await runVersionGate();
  if (shouldRender) {
    renderApp();
  }
}

void bootstrap();
