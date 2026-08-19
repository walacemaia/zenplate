import ToggleButton from '@mui/material/ToggleButton';
import TableRowsIcon from '@mui/icons-material/TableRows';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import type { DataViewMode } from './use-data-view-mode';

type DataViewModeToggleProps = {
  mode: DataViewMode;
  onChange: (mode: DataViewMode) => void;
};

export function DataViewModeToggle({ mode, onChange }: DataViewModeToggleProps) {
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
      aria-label="Modo de visualizacao"
      sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
    >
      <ToggleButton value="grid" aria-label="Visualizacao em grade">
        <TableRowsIcon sx={{ mr: 0.75 }} fontSize="small" />
        Grade
      </ToggleButton>
      <ToggleButton value="cards" aria-label="Visualizacao em cards">
        <ViewAgendaIcon sx={{ mr: 0.75 }} fontSize="small" />
        Cards
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
