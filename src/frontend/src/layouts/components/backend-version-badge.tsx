import { useEffect, useRef, useState } from 'react';

import Chip from '@mui/material/Chip';

import { useIcpContext } from 'src/auth/context/icp/icp-context-provider';
import {
  BACKEND_VERSION_ACTIVE_CHECK_INTERVAL_MS,
  BACKEND_VERSION_KEY,
} from 'src/constants/backend-version';
import { getBackendVersion } from 'src/utils/backend-version';

type BadgeState = {
  version: string | null;
  mismatch: boolean;
  offline: boolean;
};

export function BackendVersionBadge() {
  const { backend } = useIcpContext();
  const checkingRef = useRef(false);
  const [state, setState] = useState<BadgeState>({
    version: localStorage.getItem(BACKEND_VERSION_KEY),
    mismatch: false,
    offline: false,
  });

  useEffect(() => {
    let active = true;

    const loadBackendVersion = async () => {
      if (checkingRef.current) {
        return;
      }

      checkingRef.current = true;

      try {
        const backendVersion = await getBackendVersion(backend);
        if (!backendVersion) {
          if (!active) {
            return;
          }

          setState((prev) => ({
            ...prev,
            offline: true,
          }));
          return;
        }

        const storedVersion = localStorage.getItem(BACKEND_VERSION_KEY);

        if (!active) {
          return;
        }

        setState({
          version: backendVersion,
          mismatch: !!storedVersion && storedVersion !== backendVersion,
          offline: false,
        });
      } finally {
        checkingRef.current = false;
      }
    };

    void loadBackendVersion();

    const onFocus = () => {
      void loadBackendVersion();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadBackendVersion();
      }
    };

    const intervalId = window.setInterval(() => {
      void loadBackendVersion();
    }, BACKEND_VERSION_ACTIVE_CHECK_INTERVAL_MS);

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [backend]);

  const label = state.offline
    ? 'Backend Offline'
    : state.version
      ? `Backend v${state.version}`
      : 'Backend v--';

  return (
    <Chip
      size="small"
      label={label}
      color={state.offline ? 'error' : state.mismatch ? 'warning' : 'success'}
      variant={state.offline || state.mismatch ? 'filled' : 'outlined'}
      sx={{
        height: 26,
        fontWeight: 600,
        borderRadius: 1,
        '& .MuiChip-label': {
          px: 1,
        },
      }}
    />
  );
}
