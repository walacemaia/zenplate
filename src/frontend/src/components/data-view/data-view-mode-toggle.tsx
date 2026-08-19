import ToggleButton from '@mui/material/ToggleButton';
import TableRowsIcon from '@mui/icons-material/TableRows';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { useIcpContext } from 'src/auth/context/icp/icp-context-provider';

import type { DataViewMode } from './use-data-view-mode';

type DataViewModeToggleProps = {
  mode: DataViewMode;
  onChange: (mode: DataViewMode) => void;
};

export function DataViewModeToggle({ mode, onChange }: DataViewModeToggleProps) {
  const { translations: t } = useIcpContext();
  const gridLabel = t('dataViewModeGrid') || 'Grid';
  const cardsLabel = t('dataViewModeCards') || 'Cards';

  return (
    <ToggleButtonGroup
      size="small"
      value={mode}
      exclusive
      onChange={(_, value: DataViewMode | null) => {
        if (value) {
          onChange(value);
        }
      }}
      aria-label={t('select') || 'Select'}
      sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
    >
      <ToggleButton value="grid" aria-label={gridLabel}>
        <TableRowsIcon sx={{ mr: 0.75 }} fontSize="small" />
        {gridLabel}
      </ToggleButton>
      <ToggleButton value="cards" aria-label={cardsLabel}>
        <ViewAgendaIcon sx={{ mr: 0.75 }} fontSize="small" />
        {cardsLabel}
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
