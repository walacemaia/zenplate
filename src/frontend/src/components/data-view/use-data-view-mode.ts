import React from 'react';

export type DataViewMode = 'grid' | 'cards';

const FALLBACK_MODE: DataViewMode = 'cards';

function readMode(storageKey: string, defaultMode: DataViewMode): DataViewMode {
  if (typeof window === 'undefined') {
    return defaultMode;
  }

  const raw = window.sessionStorage.getItem(storageKey);
  if (raw === 'grid' || raw === 'cards') {
    return raw;
  }

  return defaultMode;
}

export function useDataViewMode(
  viewId: string,
  forceCards: boolean,
  defaultMode: DataViewMode = FALLBACK_MODE
) {
  const storageKey = React.useMemo(() => `icp_app:view-mode:${viewId}`, [viewId]);

  const [preferredMode, setPreferredMode] = React.useState<DataViewMode>(() =>
    readMode(storageKey, defaultMode)
  );

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.setItem(storageKey, preferredMode);
  }, [preferredMode, storageKey]);

  const mode: DataViewMode = forceCards ? 'cards' : preferredMode;

  return {
    mode,
    preferredMode,
    setPreferredMode,
    isForced: forceCards,
  };
}
