import type { _SERVICE } from '@backend/icp_app_backend.did';

import { createIcpAgent } from 'src/lib/icp-agent';
import { canisterId, createActor } from 'src/lib/icp-app-backend-client';
import {
  BACKEND_VERSION_KEY,
  BACKEND_VERSION_RELOAD_KEY,
  BACKEND_VERSION_RELOAD_WINDOW_MS,
  BACKEND_VERSION_UPDATE_NOTICE_KEY,
} from 'src/constants/backend-version';

type BackendVersionProvider = Pick<_SERVICE, 'getVersion'>;

export type BackendVersionUpdateNotice = {
  previousVersion: string;
  nextVersion: string;
  at: number;
};

export async function getBackendVersion(
  provider?: BackendVersionProvider | null
): Promise<string | null> {
  try {
    if (provider) {
      const version = await provider.getVersion();
      return version.toString();
    }

    const agent = await createIcpAgent();
    const actor = createActor(canisterId, { agent });
    const version = await actor.getVersion();
    return version.toString();
  } catch (error) {
    console.warn('Falha ao verificar versão do backend:', error);
    return null;
  }
}

export async function clearPwaState() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch (error) {
    console.warn('Falha ao limpar estado da PWA:', error);
  }
}

export async function checkBackendVersionAndReloadIfNeeded(
  provider?: BackendVersionProvider | null
): Promise<boolean> {
  const backendVersion = await getBackendVersion(provider);
  if (!backendVersion) {
    return true;
  }

  const currentVersion = localStorage.getItem(BACKEND_VERSION_KEY);
  if (!currentVersion) {
    localStorage.setItem(BACKEND_VERSION_KEY, backendVersion);
    return true;
  }

  if (currentVersion === backendVersion) {
    return true;
  }

  const now = Date.now();
  const lastReload = Number(sessionStorage.getItem(BACKEND_VERSION_RELOAD_KEY) || '0');

  if (lastReload > 0 && now - lastReload < BACKEND_VERSION_RELOAD_WINDOW_MS) {
    // Evita loop de reload em janelas curtas.
    localStorage.setItem(BACKEND_VERSION_KEY, backendVersion);
    return true;
  }

  sessionStorage.setItem(BACKEND_VERSION_RELOAD_KEY, String(now));
  sessionStorage.setItem(
    BACKEND_VERSION_UPDATE_NOTICE_KEY,
    JSON.stringify({
      previousVersion: currentVersion,
      nextVersion: backendVersion,
      at: now,
    } satisfies BackendVersionUpdateNotice)
  );

  localStorage.setItem(BACKEND_VERSION_KEY, backendVersion);
  await clearPwaState();
  window.location.reload();
  return false;
}

export function consumeBackendVersionUpdateNotice(): BackendVersionUpdateNotice | null {
  const raw = sessionStorage.getItem(BACKEND_VERSION_UPDATE_NOTICE_KEY);

  if (!raw) {
    return null;
  }

  sessionStorage.removeItem(BACKEND_VERSION_UPDATE_NOTICE_KEY);

  try {
    const parsed = JSON.parse(raw) as BackendVersionUpdateNotice;

    if (!parsed.previousVersion || !parsed.nextVersion || !parsed.at) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
