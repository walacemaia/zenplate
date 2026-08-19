import type { GridColDef } from '@mui/x-data-grid';

import React from 'react';

import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import ShieldIcon from '@mui/icons-material/Security';
import BoltIcon from '@mui/icons-material/Bolt';
import AddModeratorIcon from '@mui/icons-material/AddModerator';
import RemoveModeratorIcon from '@mui/icons-material/RemoveModerator';
import {
  Box,
  Stack,
  Button,
  TextField,
  IconButton,
  useMediaQuery,
  InputAdornment,
} from '@mui/material';
import {
  GridToolbarExport,
  GridActionsCellItem,
  GridToolbarContainer,
  GridToolbarFilterButton,
  GridToolbarColumnsButton,
  GridToolbarDensitySelector,
} from '@mui/x-data-grid';

import { useAlert } from 'src/utils/Alert';
import ConfirmationDialog from 'src/utils/ConfirmationDialog';
import { datagridTranslator } from 'src/utils/DatagridTranslator';

import { DashboardContent } from 'src/layouts/dashboard';
import { executeBackendAction } from 'src/icpadapters/BackendUtils';
import { icpToTsArray, type ProfileType } from 'src/icpadapters/ProfileAdapter';

import EntityCardList from 'src/components/card/entity-card-list';
import PersistentDataGrid from 'src/components/grid/persistent-data-grid';
import { useDataViewMode } from 'src/components/data-view/use-data-view-mode';
import { DataViewModeToggle } from 'src/components/data-view/data-view-mode-toggle';

import { useIcpContext } from 'src/auth/context/icp/icp-context-provider';

import ProfileCard from './profile-card';

type ProfileRow = {
  id: bigint;
  userName: string;
  displayName?: string | null;
  email?: string | null;
  country?: string | null;
  principal: string;
  isAdmin?: boolean;
  isController?: boolean;
  _rowId: string;
};

const INITIAL_PAGINATION_MODEL = { page: 0, pageSize: 10 };
const CARD_PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 400;
const SEARCH_STORAGE_KEY = 'icp_app:search:admin-profile';

export default function ProfileGrid() {
  const { backend, translations: t } = useIcpContext();
  const { showError, showSuccess } = useAlert();
  const [rows, setRows] = React.useState<ProfileRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [cardStart, setCardStart] = React.useState(0);
  const [cardHasMore, setCardHasMore] = React.useState(true);
  const [cardLoadingMore, setCardLoadingMore] = React.useState(false);
  const [cardLoadingInitial, setCardLoadingInitial] = React.useState(false);
  const [searchText, setSearchText] = React.useState(() => {
    try {
      return localStorage.getItem(SEARCH_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [debouncedSearchText, setDebouncedSearchText] = React.useState('');
  const [openDialog, setOpenDialog] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<bigint | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { mode, setPreferredMode } = useDataViewMode('admin-profile', isMobile);

  const mapProfiles = React.useCallback(
    (profiles: ProfileType[]): ProfileRow[] =>
      profiles.map((p) => ({
        id: p.id,
        userName: p.userName,
        displayName: p.displayName,
        email: p.email,
        country: p.country,
        principal: p.principal,
        isAdmin: p.role === 'admin',
        isController: p.isController ?? false,
        _rowId: p.id.toString(),
      })),
    []
  );

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [searchText]);

  React.useEffect(() => {
    try {
      localStorage.setItem(SEARCH_STORAGE_KEY, searchText);
    } catch {
      // Ignore storage failures
    }
  }, [searchText]);

  const buildTextSearchFilter = React.useCallback((value: string): string => {
    if (!value) return '';
    return `#any contains ${value}`;
  }, []);

  React.useEffect(() => {
    const filterStr = buildTextSearchFilter(debouncedSearchText);
    if (mode === 'grid') {
      loadProfilesFull(filterStr);
      return;
    }
    resetAndLoadCardProfiles(filterStr);
  }, [mode, debouncedSearchText, buildTextSearchFilter]);

  async function loadProfilesFull(filterStr: string = buildTextSearchFilter(debouncedSearchText)) {
    setLoading(true);
    try {
      const [profileArray] = await backend.getProfiles({
        filters: filterStr,
        sortField: '',
        sortOrder: '',
        start: 0n,
        pageSize: 10_000n,
      });
      setRows(mapProfiles(icpToTsArray(profileArray)));
    } catch (e) {
      showError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadProfilesPage(start: number, append: boolean, filterStr: string) {
    const [profileArray, total] = await backend.getProfiles({
      filters: filterStr,
      sortField: '',
      sortOrder: '',
      start: BigInt(start),
      pageSize: BigInt(CARD_PAGE_SIZE),
    });
    const pageRows = mapProfiles(icpToTsArray(profileArray));
    setRows((prev) => (append ? [...prev, ...pageRows] : pageRows));

    const nextStart = start + pageRows.length;
    setCardStart(nextStart);
    setCardHasMore(nextStart < Number(total));
  }

  async function resetAndLoadCardProfiles(
    filterStr: string = buildTextSearchFilter(debouncedSearchText)
  ) {
    setCardLoadingInitial(true);
    setCardStart(0);
    setCardHasMore(true);
    try {
      await loadProfilesPage(0, false, filterStr);
    } finally {
      setCardLoadingInitial(false);
    }
  }

  async function handleLoadMoreCards() {
    if (cardLoadingMore || !cardHasMore) return;
    setCardLoadingMore(true);
    try {
      await loadProfilesPage(cardStart, true, buildTextSearchFilter(debouncedSearchText));
    } finally {
      setCardLoadingMore(false);
    }
  }

  async function promote(id: bigint) {
    executeBackendAction(
      () => backend.promoteToAdmin(id),
      t('registerSuccessfullyUpdated'),
      () => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, isAdmin: true } : r))),
      showSuccess,
      showError
    );
  }

  async function demote(id: bigint) {
    executeBackendAction(
      () => backend.demoteFromAdmin(id),
      t('registerSuccessfullyUpdated'),
      () => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, isAdmin: false } : r))),
      showSuccess,
      showError
    );
  }

  const handleDeleteClick = (id: bigint) => {
    setSelectedId(id);
    setOpenDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedId !== null) {
      await executeBackendAction(
        () => backend.deleteProfile(selectedId),
        t('registerSuccessfullyRemoved'),
        () => {
          setRows((prev) => prev.filter((r) => r.id !== selectedId));
          if (mode === 'grid') {
            void loadProfilesFull();
          } else {
            void resetAndLoadCardProfiles();
          }
        },
        showSuccess,
        showError
      );
      setOpenDialog(false);
      setSelectedId(null);
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: t('id'), width: 50 },
    {
      field: 'userName',
      headerName: t('profileUserName'),
      flex: 1,
      minWidth: 140,
      renderCell: (p) => <span>{p.value}</span>,
    },
    {
      field: 'displayName',
      headerName: t('profileDisplayName'),
      flex: 1,
      minWidth: 140,
      renderCell: (p) => <span>{p.value || '-'}</span>,
    },
    {
      field: 'email',
      headerName: t('profileEmail'),
      flex: 1,
      minWidth: 180,
      renderCell: (p) => <span>{p.value || '-'}</span>,
    },
    {
      field: 'country',
      headerName: t('profileCountry'),
      width: 120,
      renderCell: (p) => <span>{p.value || '-'}</span>,
    },
    {
      field: 'principal',
      headerName: 'PrincipalId',
      flex: 1.2,
      minWidth: 280,
      renderCell: (p) => <span>{p.value}</span>,
    },
    {
      field: 'isAdmin',
      headerName: 'Admin',
      width: 100,
      renderCell: (p) => (
        <ShieldIcon
          color={p.value ? 'primary' : 'disabled'}
          fontSize="small"
          titleAccess={p.value ? 'Admin' : 'User'}
        />
      ),
    },
    {
      field: 'isController',
      headerName: 'Controller',
      width: 120,
      renderCell: (p) => (
        <BoltIcon
          color={p.value ? 'warning' : 'disabled'}
          fontSize="small"
          titleAccess={p.value ? 'Controller' : 'Não controller'}
        />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: t('actions'),
      width: 180,
      getActions: ({ row }: { row: ProfileRow }) => {
        const promoteAction = (
          <GridActionsCellItem
            key="promote"
            icon={<AddModeratorIcon />}
            label={t('promote') || 'Promote'}
            disabled={row.isAdmin}
            onClick={() => promote(row.id)}
            showInMenu={false}
          />
        );
        const demoteAction = (
          <GridActionsCellItem
            key="demote"
            icon={<RemoveModeratorIcon />}
            label={t('demote') || 'Demote'}
            disabled={!row.isAdmin}
            onClick={() => demote(row.id)}
            showInMenu={false}
          />
        );
        const deleteAction = (
          <GridActionsCellItem
            key="delete"
            icon={<DeleteIcon />}
            label={t('delete') || 'Delete'}
            onClick={() => handleDeleteClick(row.id)}
            showInMenu={false}
          />
        );
        return [promoteAction, demoteAction, deleteAction];
      },
    },
  ];

  const Toolbar = () => (
    <GridToolbarContainer>
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector />
      <GridToolbarExport />
      <Button size="small" onClick={() => void loadProfilesFull()} sx={{ ml: 1 }}>
        {t('reload') || 'Reload'}
      </Button>
    </GridToolbarContainer>
  );

  return (
    <DashboardContent>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Typography variant="h4">{t('profilePlural') || 'Profiles'}</Typography>
        {!isMobile && <DataViewModeToggle mode={mode} onChange={setPreferredMode} />}
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        alignItems={{ xs: 'stretch', sm: 'center' }}
        sx={{ mb: 2, width: '100%', flexWrap: 'wrap', rowGap: 1.5 }}
      >
        <TextField
          size="small"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder={t('search') || 'Buscar em todas as colunas...'}
          sx={{ flex: '1 1 320px', minWidth: { xs: '100%', sm: 280 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchText ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  edge="end"
                  aria-label={t('clear') || 'Limpar busca'}
                  onClick={() => setSearchText('')}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          }}
        />
      </Stack>

      {mode === 'grid' ? (
        <Card sx={{ p: 2 }}>
          <PersistentDataGrid
            gridId="admin-profile-grid"
            initialPaginationModel={INITIAL_PAGINATION_MODEL}
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(r) => r._rowId}
            pageSizeOptions={[5, 10, 20]}
            disableRowSelectionOnClick
            checkboxSelection={false}
            slots={{ toolbar: Toolbar }}
            getRowHeight={() => 'auto'}
            sx={{
              border: 0,
              '& .MuiDataGrid-cell': {
                whiteSpace: 'normal !important',
                wordWrap: 'break-word !important',
                display: 'flex',
                alignItems: 'center !important',
                lineHeight: '1.4 !important',
                py: '6px !important',
              },
              '& .MuiDataGrid-row': { maxHeight: 'none !important' },
            }}
            localeText={datagridTranslator(t)}
          />
        </Card>
      ) : (
        <Box>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
            <Button size="small" onClick={() => void resetAndLoadCardProfiles()}>
              {t('reload') || 'Reload'}
            </Button>
          </Stack>

          {cardLoadingInitial ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              {t('loading') || 'Carregando...'}
            </Typography>
          ) : (
            <EntityCardList
              items={rows}
              getKey={(row) => row._rowId}
              emptyLabel={t('noRecordsFound') || 'Nenhum registro encontrado.'}
              minCardWidth={400}
              hasMore={cardHasMore}
              loadingMore={cardLoadingMore}
              onLoadMore={handleLoadMoreCards}
              loadingMoreLabel={t('loading') || 'Carregando...'}
              renderItem={(row) => (
                <ProfileCard
                  profile={{
                    userName: row.userName,
                    displayName: row.displayName,
                    email: row.email,
                    country: row.country,
                    principal: row.principal,
                    isAdmin: !!row.isAdmin,
                    isController: !!row.isController,
                  }}
                  onPromote={() => promote(row.id)}
                  onDemote={() => demote(row.id)}
                  onDelete={() => handleDeleteClick(row.id)}
                  t={t}
                />
              )}
            />
          )}
        </Box>
      )}

      {/* Diálogo de Confirmação */}
      <ConfirmationDialog
        open={openDialog}
        title={t('confirmDeletion')}
        message={t('confirmDeletionMsg')}
        cancelText={t('cancel') || 'Cancelar'}
        confirmText={t('delete') || 'Excluir'}
        cancelButtonColor="inherit"
        cancelButtonVariant="outlined"
        confirmButtonColor="error"
        confirmButtonVariant="contained"
        autoFocusButton="cancel"
        onClose={() => setOpenDialog(false)}
        onConfirm={handleConfirmDelete}
      />
    </DashboardContent>
  );
}
