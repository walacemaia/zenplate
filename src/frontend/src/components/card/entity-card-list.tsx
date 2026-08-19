import type { ReactNode } from 'react';

import { useRef, useEffect } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

type EntityCardListProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  emptyLabel?: string;
  minCardWidth?: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  loadingMoreLabel?: string;
};

export default function EntityCardList<T>({
  items,
  getKey,
  renderItem,
  emptyLabel = 'Nenhum registro encontrado.',
  minCardWidth = 400,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  loadingMoreLabel = 'Carregando mais registros...',
}: EntityCardListProps<T>) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!onLoadMore || !hasMore) return undefined;

    const target = sentinelRef.current;
    if (!target) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting || loadingMore) return;
        onLoadMore();
      },
      {
        root: null,
        rootMargin: '300px 0px',
        threshold: 0,
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadingMore, onLoadMore]);

  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        {emptyLabel}
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        gap: 1.5,
        display: 'grid',
        alignItems: 'stretch',
        gridTemplateColumns: {
          xs: '1fr',
          sm: `repeat(auto-fit, minmax(${Math.max(1, minCardWidth)}px, 1fr))`,
        },
      }}
    >
      {items.map((item) => (
        <Box
          key={getKey(item)}
          sx={{
            minWidth: 0,
            height: '100%',
            display: 'flex',
            '& > *': {
              flex: 1,
            },
          }}
        >
          {renderItem(item)}
        </Box>
      ))}

      {hasMore && (
        <Box
          ref={sentinelRef}
          sx={{
            gridColumn: '1 / -1',
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            color: 'text.secondary',
          }}
        >
          {loadingMore && <CircularProgress size={18} />}
          <Typography variant="body2" color="text.secondary">
            {loadingMore ? loadingMoreLabel : 'Role para carregar mais'}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
