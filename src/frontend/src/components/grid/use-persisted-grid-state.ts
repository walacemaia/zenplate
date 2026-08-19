import type {
  GridDensity,
  GridSortModel,
  GridFilterModel,
  GridPaginationModel,
  GridColumnVisibilityModel,
} from '@mui/x-data-grid';

import React from 'react';

type PersistedGridState = {
  paginationModel: GridPaginationModel;
  sortModel: GridSortModel;
  filterModel: GridFilterModel;
  density: GridDensity;
  columnVisibilityModel: GridColumnVisibilityModel;
};

type UsePersistedGridStateParams = {
  storageKey: string;
  initialPaginationModel: GridPaginationModel;
  initialSortModel: GridSortModel;
  initialFilterModel: GridFilterModel;
  initialDensity: GridDensity;
  initialColumnVisibilityModel: GridColumnVisibilityModel;
  persistPagination: boolean;
  persistSort: boolean;
  persistFilter: boolean;
  persistDensity: boolean;
  persistColumnVisibility: boolean;
};

const readState = (storageKey: string): Partial<PersistedGridState> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as Partial<PersistedGridState>;
  } catch {
    return {};
  }
};

const writeState = (storageKey: string, value: PersistedGridState) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // Ignore quota and serialization errors to avoid breaking grid rendering.
  }
};

export function usePersistedGridState({
  storageKey,
  initialPaginationModel,
  initialSortModel,
  initialFilterModel,
  initialDensity,
  initialColumnVisibilityModel,
  persistPagination,
  persistSort,
  persistFilter,
  persistDensity,
  persistColumnVisibility,
}: UsePersistedGridStateParams) {
  const resolveInitialState = React.useCallback(() => {
    const persistedState = readState(storageKey);

    return {
      paginationModel:
        persistPagination && persistedState.paginationModel
          ? persistedState.paginationModel
          : initialPaginationModel,
      sortModel:
        persistSort && persistedState.sortModel ? persistedState.sortModel : initialSortModel,
      filterModel:
        persistFilter && persistedState.filterModel
          ? persistedState.filterModel
          : initialFilterModel,
      density: persistDensity && persistedState.density ? persistedState.density : initialDensity,
      columnVisibilityModel:
        persistColumnVisibility && persistedState.columnVisibilityModel
          ? { ...initialColumnVisibilityModel, ...persistedState.columnVisibilityModel }
          : initialColumnVisibilityModel,
    };
  }, [
    initialColumnVisibilityModel,
    initialDensity,
    initialFilterModel,
    initialPaginationModel,
    initialSortModel,
    persistColumnVisibility,
    persistDensity,
    persistFilter,
    persistPagination,
    persistSort,
    storageKey,
  ]);

  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>(
    () => resolveInitialState().paginationModel
  );

  const [sortModel, setSortModel] = React.useState<GridSortModel>(
    () => resolveInitialState().sortModel
  );

  const [filterModel, setFilterModel] = React.useState<GridFilterModel>(
    () => resolveInitialState().filterModel
  );

  const [density, setDensity] = React.useState<GridDensity>(() => resolveInitialState().density);

  const [columnVisibilityModel, setColumnVisibilityModel] =
    React.useState<GridColumnVisibilityModel>(() => resolveInitialState().columnVisibilityModel);

  const arePaginationModelsEqual = React.useCallback(
    (a: GridPaginationModel, b: GridPaginationModel) =>
      a.page === b.page && a.pageSize === b.pageSize,
    []
  );

  const areSortModelsEqual = React.useCallback(
    (a: GridSortModel, b: GridSortModel) => JSON.stringify(a) === JSON.stringify(b),
    []
  );

  const areFilterModelsEqual = React.useCallback(
    (a: GridFilterModel, b: GridFilterModel) => JSON.stringify(a) === JSON.stringify(b),
    []
  );

  const areColumnVisibilityModelsEqual = React.useCallback(
    (a: GridColumnVisibilityModel, b: GridColumnVisibilityModel) =>
      JSON.stringify(a) === JSON.stringify(b),
    []
  );

  React.useEffect(() => {
    const nextState = resolveInitialState();

    setPaginationModel((previous) =>
      arePaginationModelsEqual(previous, nextState.paginationModel)
        ? previous
        : nextState.paginationModel
    );

    setSortModel((previous) =>
      areSortModelsEqual(previous, nextState.sortModel) ? previous : nextState.sortModel
    );

    setFilterModel((previous) =>
      areFilterModelsEqual(previous, nextState.filterModel) ? previous : nextState.filterModel
    );

    setDensity((previous) => (previous === nextState.density ? previous : nextState.density));

    setColumnVisibilityModel((previous) =>
      areColumnVisibilityModelsEqual(previous, nextState.columnVisibilityModel)
        ? previous
        : nextState.columnVisibilityModel
    );
  }, [
    areColumnVisibilityModelsEqual,
    areFilterModelsEqual,
    arePaginationModelsEqual,
    areSortModelsEqual,
    resolveInitialState,
  ]);

  React.useEffect(() => {
    writeState(storageKey, {
      columnVisibilityModel,
      density,
      paginationModel,
      sortModel,
      filterModel,
    });
  }, [columnVisibilityModel, density, filterModel, paginationModel, sortModel, storageKey]);

  return {
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
  };
}
