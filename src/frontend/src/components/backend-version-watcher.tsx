import { useEffect, useRef } from 'react';

import { useIcpContext } from 'src/auth/context/icp/icp-context-provider';
import { useAlert } from 'src/utils/Alert';
import {
  checkBackendVersionAndReloadIfNeeded,
  consumeBackendVersionUpdateNotice,
} from 'src/utils/backend-version';
import { BACKEND_VERSION_ACTIVE_CHECK_INTERVAL_MS } from 'src/constants/backend-version';

export function BackendVersionWatcher() {
  const { backend } = useIcpContext();
  const { showSuccess } = useAlert();
  const checkingRef = useRef(false);

  useEffect(() => {
    const notice = consumeBackendVersionUpdateNotice();

    if (notice) {
      showSuccess(
        `Versao do backend atualizada (${notice.previousVersion} -> ${notice.nextVersion}). Assets recarregados.`
      );
    }
  }, [showSuccess]);

  useEffect(() => {
    const runCheck = async () => {
      if (checkingRef.current) {
        return;
      }

      checkingRef.current = true;
      try {
        await checkBackendVersionAndReloadIfNeeded(backend);
      } finally {
        checkingRef.current = false;
      }
    };

    const onFocus = () => {
      void runCheck();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void runCheck();
      }
    };

    const intervalId = window.setInterval(() => {
      void runCheck();
    }, BACKEND_VERSION_ACTIVE_CHECK_INTERVAL_MS);

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [backend]);

  return null;
}
