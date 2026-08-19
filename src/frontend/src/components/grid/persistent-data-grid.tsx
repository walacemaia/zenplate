import React from 'react';

import {
  DataGrid,
  type GridDensity,
  type DataGridProps,
  type GridSortModel,
  type GridFilterModel,
  type GridValidRowModel,
  type GridPaginationModel,
  type GridColumnVisibilityModel,
} from '@mui/x-data-grid';

import { usePersistedGridState } from './use-persisted-grid-state';

const EMPTY_SORT_MODEL: GridSortModel = [];
const EMPTY_FILTER_MODEL: GridFilterModel = { items: [] };
const EMPTY_COLUMN_VISIBILITY_MODEL: GridColumnVisibilityModel = {
  id: false,
  __check__: false,
};
const DEFAULT_DENSITY: GridDensity = 'standard';

type PersistentDataGridProps<R extends GridValidRowModel = GridValidRowModel> = Omit<
  DataGridProps<R>,
  | 'filterModel'
  | 'initialState'
  | 'density'
  | 'columnVisibilityModel'
  | 'onDensityChange'
  | 'onColumnVisibilityModelChange'
  | 'onFilterModelChange'
  | 'onPaginationModelChange'
  | 'onSortModelChange'
  | 'paginationModel'
  | 'sortModel'
> & {
  gridId: string;
  storageScopeKey?: string;
  initialPaginationModel: GridPaginationModel;
  initialSortModel?: GridSortModel;
  initialFilterModel?: GridFilterModel;
  initialDensity?: GridDensity;
  initialColumnVisibilityModel?: GridColumnVisibilityModel;
  persistPagination?: boolean;
  persistSort?: boolean;
  persistFilter?: boolean;
  persistDensity?: boolean;
  persistColumnVisibility?: boolean;
  onDensityChange?: DataGridProps<R>['onDensityChange'];
  onColumnVisibilityModelChange?: DataGridProps<R>['onColumnVisibilityModelChange'];
  onPaginationModelChange?: DataGridProps<R>['onPaginationModelChange'];
  onSortModelChange?: DataGridProps<R>['onSortModelChange'];
  onFilterModelChange?: DataGridProps<R>['onFilterModelChange'];
};

export default function PersistentDataGrid<R extends GridValidRowModel = GridValidRowModel>({
  gridId,
  storageScopeKey,
  initialPaginationModel,
  initialSortModel = EMPTY_SORT_MODEL,
  initialFilterModel = EMPTY_FILTER_MODEL,
  initialDensity = DEFAULT_DENSITY,
  initialColumnVisibilityModel = EMPTY_COLUMN_VISIBILITY_MODEL,
  persistFilter = true,
  persistPagination = true,
  persistSort = true,
  persistDensity = true,
  persistColumnVisibility = true,
  onDensityChange,
  onColumnVisibilityModelChange,
  onPaginationModelChange,
  onSortModelChange,
  onFilterModelChange,
  ...dataGridProps
}: PersistentDataGridProps<R>) {
  const storageKey = React.useMemo(
    () =>
      storageScopeKey ? `icp_app:grid:${gridId}:${storageScopeKey}` : `icp_app:grid:${gridId}`,
    [gridId, storageScopeKey]
  );

  const {
    columnVisibilityModel,
    density,
    filterModel,
    paginationModel,
    setColumnVisibilityModel,
    setDensity,
    setFilterModel,
    setPaginationModel,
    setSortModel,
    sortModel,
  } = usePersistedGridState({
    storageKey,
    initialFilterModel,
    initialColumnVisibilityModel,
    initialDensity,
    initialPaginationModel,
    initialSortModel,
    persistColumnVisibility,
    persistDensity,
    persistFilter,
    persistPagination,
    persistSort,
  });

  return (
    <DataGrid
      {...dataGridProps}
      columnVisibilityModel={columnVisibilityModel}
      density={density}
      filterModel={filterModel}
      paginationModel={paginationModel}
      sortModel={sortModel}
      onColumnVisibilityModelChange={(model, details) => {
        setColumnVisibilityModel(model);
        onColumnVisibilityModelChange?.(model, details);
      }}
      onDensityChange={(value) => {
        setDensity(value);
        onDensityChange?.(value);
      }}
      onFilterModelChange={(model, details) => {
        setFilterModel(model);
        onFilterModelChange?.(model, details);
      }}
      onPaginationModelChange={(model, details) => {
        setPaginationModel(model);
        onPaginationModelChange?.(model, details);
      }}
      onSortModelChange={(model, details) => {
        setSortModel(model);
        onSortModelChange?.(model, details);
      }}
    />
  );
}
