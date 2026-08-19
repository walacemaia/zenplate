/**
 * Registra o Service Worker com auto-reload quando uma nova versao do frontend
 * for detectada. Complementa `checkBackendVersionAndReloadIfNeeded` (que sO
 * dispara quando a versao do backend muda) para mudancas puras de frontend.
 *
 * Sem interacao do usuario: assim que o browser identifica que ha um SW novo
 * pronto, `updateSW(true)` chama skipWaiting e recarrega a pagina.
 */
import { registerSW } from 'virtual:pwa-register';

const HOURLY_CHECK_MS = 60 * 60 * 1000;

export function setupPwaAutoUpdate() {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Novo SW pronto: ativa e recarrega automaticamente.
      void updateSW(true);
    },
    onRegisteredSW(_swScriptUrl, registration) {
      if (!registration) return;
      // Abas abertas por muito tempo ainda pegam updates via check periodico.
      setInterval(() => {
        void registration.update();
      }, HOURLY_CHECK_MS);
    },
  });
}
