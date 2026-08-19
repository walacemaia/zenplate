import type { SelectChangeEvent } from '@mui/material/Select';
import type { GridSortModel, GridSortDirection } from '@mui/x-data-grid';

import React from 'react';

import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import {
  Box,
  Stack,
  Select,
  Tooltip,
  MenuItem,
  IconButton,
  InputLabel,
  FormControl,
} from '@mui/material';

type SortFieldOption = {
  field: string;
  label: string;
};

type SortModelSelectorProps = {
  sortModel: GridSortModel;
  options: SortFieldOption[];
  onChange: (nextSortModel: GridSortModel) => void;
  label?: string;
  disabled?: boolean;
  minWidth?: number;
};

const DEFAULT_DIRECTION: GridSortDirection = 'asc';

export default function SortModelSelector({
  sortModel,
  options,
  onChange,
  label = 'Ordenacao',
  disabled = false,
  minWidth = 220,
}: SortModelSelectorProps) {
  const labelId = React.useId();
  const uniqueOptions = React.useMemo(() => {
    const seen = new Set<string>();
    return options.filter((option) => {
      if (seen.has(option.field)) return false;
      seen.add(option.field);
      return true;
    });
  }, [options]);

  const activeSort = sortModel[0];
  const selectedField =
    activeSort?.field && uniqueOptions.some((option) => option.field === activeSort.field)
      ? activeSort.field
      : '';
  const activeDirection = activeSort?.sort ?? DEFAULT_DIRECTION;

  const handleFieldChange = (event: SelectChangeEvent<string>) => {
    const nextField = event.target.value as string;

    if (!nextField) {
      onChange([]);
      return;
    }

    onChange([{ field: nextField, sort: activeDirection ?? DEFAULT_DIRECTION }]);
  };

  const handleToggleDirection = () => {
    const direction = activeDirection === 'asc' ? 'desc' : 'asc';

    if (!selectedField) {
      const firstField = uniqueOptions[0]?.field;
      if (!firstField) return;

      onChange([{ field: firstField, sort: direction }]);
      return;
    }

    onChange([{ field: selectedField, sort: direction }]);
  };

  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      sx={{
        width: { xs: '100%', sm: 'auto' },
        minWidth: { xs: 0, sm: minWidth },
      }}
    >
      <FormControl size="small" sx={{ flex: 1 }} disabled={disabled}>
        <InputLabel id={labelId}>{label}</InputLabel>
        <Select labelId={labelId} value={selectedField} label={label} onChange={handleFieldChange}>
          <MenuItem value="">Sem ordenacao</MenuItem>
          {uniqueOptions.map((option) => (
            <MenuItem key={option.field} value={option.field}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Tooltip title={activeDirection === 'asc' ? 'Ascendente' : 'Descendente'}>
        <Box>
          <IconButton
            size="small"
            color="primary"
            onClick={handleToggleDirection}
            disabled={disabled || uniqueOptions.length === 0}
          >
            {activeDirection === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
          </IconButton>
        </Box>
      </Tooltip>
    </Stack>
  );
}

export type { SortFieldOption };
