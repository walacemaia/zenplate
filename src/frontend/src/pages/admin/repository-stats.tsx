import React from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid2';
import Table from '@mui/material/Table';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import TableContainer from '@mui/material/TableContainer';

import { fData, fNumber } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';

import { Chart, useChart } from 'src/components/chart';

import { useIcpContext } from 'src/auth/context/icp/icp-context-provider';

// ----------------------------------------------------------------------

type RepositoryStats = {
  objectsInCache: number;
  usedMemory: number;
  allocatedPages: number;
  objectCount: number;
  freeMemory: number;
};

type AllRepositoryStats = {
  profile: RepositoryStats;
  configuration: RepositoryStats;
  image: RepositoryStats;
};

type RuntimeMemoryStats = {
  heapBytes: number;
  wasmBytes: number;
  stablePages: number;
  stableBytes: number;
};

const STABLE_PAGE_BYTES = 65_536;
const REGION_BLOCK_PAGES = 128;
const UPDATE_BASE_CYCLES_13 = 5_000_000;

type EndpointCostStats = {
  endpoint: string;
  calls: number;
  totalInstructions: number;
  maxInstructions: number;
  totalCycles: number;
  maxCycles: number;
  totalDurationNs: number;
  maxDurationNs: number;
  lastInstructions: number;
  lastCycles: number;
  lastDurationNs: number;
};

export default function Page() {
  const { backend, translations: t } = useIcpContext();
  const [stats, setStats] = React.useState<AllRepositoryStats | null>(null);
  const [runtimeMemory, setRuntimeMemory] = React.useState<RuntimeMemoryStats | null>(null);
  const [endpointStats, setEndpointStats] = React.useState<EndpointCostStats[]>([]);

  React.useEffect(() => {
    loadSeries();
  }, []);

  async function loadSeries() {
    const [data, runtimeData, endpointData] = await Promise.all([
      backend.getRepositoryStats(),
      backend.memory(),
      backend.getEndpointCostStats(),
    ]);
    // Converte bigint para number
    const converted: AllRepositoryStats = {
      profile: convertStats(data.profile),
      configuration: convertStats(data.configuration),
      image: convertStats(data.image),
    };
    setStats(converted);
    setRuntimeMemory(convertRuntimeMemory(runtimeData));
    setEndpointStats(convertEndpointStats(endpointData));
  }

  function convertStats(s: any): RepositoryStats {
    return {
      objectsInCache: Number(s.objectsInCache),
      usedMemory: Number(s.usedMemory),
      allocatedPages: Number(s.allocatedPages),
      objectCount: Number(s.objectCount),
      freeMemory: Number(s.freeMemory),
    };
  }

  function convertRuntimeMemory(s: any): RuntimeMemoryStats {
    return {
      heapBytes: Number(s.heapBytes),
      wasmBytes: Number(s.wasmBytes),
      stablePages: Number(s.stablePages),
      stableBytes: Number(s.stableBytes),
    };
  }

  function convertEndpointStats(raw: any): EndpointCostStats[] {
    const rows = (raw as [string, any][]).map(([endpoint, s]) => ({
      endpoint,
      calls: Number(s.calls),
      totalInstructions: Number(s.totalInstructions),
      maxInstructions: Number(s.maxInstructions),
      totalCycles: Number(s.totalCycles),
      maxCycles: Number(s.maxCycles),
      totalDurationNs: Number(s.totalDurationNs),
      maxDurationNs: Number(s.maxDurationNs),
      lastInstructions: Number(s.lastInstructions),
      lastCycles: Number(s.lastCycles),
      lastDurationNs: Number(s.lastDurationNs),
    }));

    rows.sort(
      (a, b) =>
        UPDATE_BASE_CYCLES_13 * b.calls +
        b.totalInstructions -
        (UPDATE_BASE_CYCLES_13 * a.calls + a.totalInstructions)
    );
    return rows;
  }

  function toMs(ns: number): string {
    return `${(ns / 1_000_000).toFixed(2)} ms`;
  }

  async function handleClearCache() {
    try {
      await backend.clearCache();
      await loadSeries();
    } catch (e) {
      console.error('Failed to clear cache:', e);
    }
  }

  async function handleWarmupCache() {
    try {
      await backend.warmupCache();
      await loadSeries();
    } catch (e) {
      console.error('Failed to warmup cache:', e);
    }
  }

  async function handleResetEndpointStats() {
    try {
      await backend.resetEndpointCostStats();
      await loadSeries();
    } catch (e) {
      console.error('Failed to reset endpoint cost stats:', e);
    }
  }

  const daos = ['profile', 'configuration', 'image'];
  const daoLabels = daos.map((dao) => t(dao) || dao);

  const chartBaseOptions = useChart({
    chart: { type: 'bar' },
    xaxis: { categories: daoLabels },
    plotOptions: { bar: { horizontal: false, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    fill: { opacity: 1 },
    yaxis: {
      labels: {
        formatter: (val: number) => fNumber(val),
      },
    },
    tooltip: {
      y: { formatter: (val: number) => fNumber(val) },
    },
  });

  const chartOptions = (title: string) => ({
    ...chartBaseOptions,
    title: { text: title, align: 'left' as const },
  });

  if (!stats) {
    return (
      <DashboardContent maxWidth="xl">
        <Typography variant="h4">{t('loading') || 'Loading...'}</Typography>
      </DashboardContent>
    );
  }

  // Prepara dados para gráficos
  const objectsInCacheData = daos.map(
    (dao) => stats[dao as keyof AllRepositoryStats].objectsInCache
  );
  const usedMemoryData = daos.map((dao) => stats[dao as keyof AllRepositoryStats].usedMemory);
  const allocatedPagesData = daos.map(
    (dao) => stats[dao as keyof AllRepositoryStats].allocatedPages
  );
  const objectCountData = daos.map((dao) => stats[dao as keyof AllRepositoryStats].objectCount);
  const freeMemoryData = daos.map((dao) => stats[dao as keyof AllRepositoryStats].freeMemory);

  // Totais
  const totals = {
    objectsInCache: objectsInCacheData.reduce((a, b) => a + b, 0),
    usedMemory: usedMemoryData.reduce((a, b) => a + b, 0),
    allocatedPages: allocatedPagesData.reduce((a, b) => a + b, 0),
    objectCount: objectCountData.reduce((a, b) => a + b, 0),
    freeMemory: freeMemoryData.reduce((a, b) => a + b, 0),
  };

  // Páginas lógicas reportadas pelos DAOs.
  const logicalStablePages = totals.allocatedPages;
  const logicalStableBytes = logicalStablePages * STABLE_PAGE_BYTES;

  // Páginas físicas estimadas: arredonda por bloco de 128 páginas por region/DAO.
  const physicalStablePages = daos.reduce((acc, dao) => {
    const pages = stats[dao as keyof AllRepositoryStats].allocatedPages;
    if (pages <= 0) return acc;
    return acc + Math.ceil(pages / REGION_BLOCK_PAGES) * REGION_BLOCK_PAGES;
  }, 0);
  const physicalStableBytes = physicalStablePages * STABLE_PAGE_BYTES;

  return (
    <DashboardContent maxWidth="xl">
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button variant="outlined" color="secondary" onClick={handleClearCache}>
          {t('clearCache') || 'Clear Cache'}
        </Button>
        <Button variant="contained" color="primary" onClick={handleWarmupCache}>
          {t('warmupCache') || 'Warmup Cache'}
        </Button>
        <Button variant="outlined" color="warning" onClick={handleResetEndpointStats}>
          {t('resetEndpointCostStats') || 'Reset Endpoint Cost Stats'}
        </Button>
        <Button variant="outlined" onClick={loadSeries}>
          {t('refresh') || 'Refresh'}
        </Button>
      </Box>
      <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
        {t('repositoryStats') || 'Repository Statistics'}
      </Typography>

      <Grid container spacing={3}>
        {/* Runtime Memory */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader title={t('runtimeMemory') || 'Runtime Memory'} />
            <Box
              sx={{
                px: 3,
                pb: 3,
                display: 'grid',
                rowGap: 2,
                columnGap: 2,
                gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
              }}
            >
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary">
                  {t('heapMemory') || 'Heap Memory'}
                </Typography>
                <Typography variant="h6">{fData(runtimeMemory?.heapBytes || 0)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {fNumber(runtimeMemory?.heapBytes || 0)} bytes
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary">
                  {t('wasmMemory') || 'Wasm Memory'}
                </Typography>
                <Typography variant="h6">{fData(runtimeMemory?.wasmBytes || 0)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {fNumber(runtimeMemory?.wasmBytes || 0)} bytes
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary">
                  {t('logicalStablePages') || 'Logical Stable Pages'}
                </Typography>
                <Typography variant="h6">{fNumber(logicalStablePages)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  64 KiB/page
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary">
                  {t('logicalStableMemory') || 'Logical Stable Memory'}
                </Typography>
                <Typography variant="h6">{fData(logicalStableBytes)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {fNumber(logicalStableBytes)} bytes
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary">
                  {t('physicalStablePages') || 'Physical Stable Pages (Estimated)'}
                </Typography>
                <Typography variant="h6">{fNumber(physicalStablePages)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('blockSizeHint') || '128 pages/block, 64 KiB/page'}
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary">
                  {t('physicalStableMemory') || 'Physical Stable Memory (Estimated)'}
                </Typography>
                <Typography variant="h6">{fData(physicalStableBytes)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {fNumber(physicalStableBytes)} bytes
                </Typography>
              </Paper>
            </Box>
          </Card>
        </Grid>

        {/* Endpoint Cost */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader title={t('endpointCostStats') || 'Endpoint Cost Stats'} />
            <TableContainer component={Paper} sx={{ p: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('endpoint') || 'Endpoint'}</TableCell>
                    <TableCell align="right">{t('calls') || 'Calls'}</TableCell>
                    <TableCell align="right">
                      {t('avgInstructions') || 'Avg Instructions'}
                    </TableCell>
                    <TableCell align="right">
                      {t('accumulatedInstructions') || 'Accumulated Instructions'}
                    </TableCell>
                    <TableCell align="right">
                      {t('avgEstimatedCycles') || 'Avg Cycles (Estimated)'}
                    </TableCell>
                    <TableCell align="right">
                      {t('accumulatedEstimatedCycles') || 'Accumulated Cycles (Estimated)'}
                    </TableCell>
                    <TableCell align="right">{t('avgDuration') || 'Avg Duration'}</TableCell>
                    <TableCell align="right">{t('maxDuration') || 'Max Duration'}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {endpointStats.map((row) => {
                    const avgInstructions =
                      row.calls > 0 ? Math.floor(row.totalInstructions / row.calls) : 0;
                    const avgEstimatedCycles = UPDATE_BASE_CYCLES_13 + avgInstructions;
                    const accumulatedEstimatedCycles =
                      UPDATE_BASE_CYCLES_13 * row.calls + row.totalInstructions;
                    const avgDurationNs =
                      row.calls > 0 ? Math.floor(row.totalDurationNs / row.calls) : 0;

                    return (
                      <TableRow key={row.endpoint}>
                        <TableCell component="th" scope="row">
                          {row.endpoint}
                        </TableCell>
                        <TableCell align="right">{fNumber(row.calls)}</TableCell>
                        <TableCell align="right">{fNumber(avgInstructions)}</TableCell>
                        <TableCell align="right">{fNumber(row.totalInstructions)}</TableCell>
                        <TableCell align="right">{fNumber(avgEstimatedCycles)}</TableCell>
                        <TableCell align="right">{fNumber(accumulatedEstimatedCycles)}</TableCell>
                        <TableCell align="right">{toMs(avgDurationNs)}</TableCell>
                        <TableCell align="right">{toMs(row.maxDurationNs)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {endpointStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        {t('noData') || 'No data'}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ px: 1, pt: 1, display: 'block' }}
              >
                {t('cyclesEstimationNote') ||
                  'Estimated cycles (13-node subnet): 5,000,000 + instructions per update message.'}
              </Typography>
            </TableContainer>
          </Card>
        </Grid>

        {/* Objects in Cache */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title={t('objectsInCache') || 'Objects in Cache'} />
            <Chart
              type="bar"
              series={[
                { name: t('objectsInCache') || 'Objects in Cache', data: objectsInCacheData },
              ]}
              options={chartOptions(t('objectsInCacheDesc') || 'Objects in Cache')}
              sx={{ p: 2, height: 320 }}
            />
          </Card>
        </Grid>

        {/* Used Memory */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title={t('usedMemory') || 'Used Memory'} />
            <Chart
              type="bar"
              series={[{ name: t('usedMemory') || 'Used Memory', data: usedMemoryData }]}
              options={chartOptions(t('usedMemoryDesc') || 'Used Memory')}
              sx={{ p: 2, height: 320 }}
            />
          </Card>
        </Grid>

        {/* Allocated Pages */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title={t('allocatedPages') || 'Allocated Pages'} />
            <Chart
              type="bar"
              series={[
                { name: t('allocatedPages') || 'Allocated Pages', data: allocatedPagesData },
              ]}
              options={chartOptions(t('allocatedPagesDesc') || 'Allocated Pages')}
              sx={{ p: 2, height: 320 }}
            />
          </Card>
        </Grid>

        {/* Object Count */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title={t('objectCount') || 'Object Count'} />
            <Chart
              type="bar"
              series={[{ name: t('objectCount') || 'Object Count', data: objectCountData }]}
              options={chartOptions(t('objectCountDesc') || 'Object Count')}
              sx={{ p: 2, height: 320 }}
            />
          </Card>
        </Grid>

        {/* Free Memory */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title={t('freeMemory') || 'Free Memory'} />
            <Chart
              type="bar"
              series={[{ name: t('freeMemory') || 'Free Memory', data: freeMemoryData }]}
              options={chartOptions(t('freeMemoryDesc') || 'Free Memory')}
              sx={{ p: 2, height: 320 }}
            />
          </Card>
        </Grid>

        {/* Tabela Resumo */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader title={t('summary') || 'Summary'} />
            <TableContainer component={Paper} sx={{ p: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('entity') || 'DAO'}</TableCell>
                    <TableCell align="right">{t('objectsInCache') || 'Objects in Cache'}</TableCell>
                    <TableCell align="right">{t('usedMemory') || 'Used Memory'}</TableCell>
                    <TableCell align="right">{t('allocatedPages') || 'Allocated Pages'}</TableCell>
                    <TableCell align="right">{t('objectCount') || 'Object Count'}</TableCell>
                    <TableCell align="right">{t('freeMemory') || 'Free Memory'}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {daos.map((dao, index) => {
                    const s = stats[dao as keyof AllRepositoryStats];
                    return (
                      <TableRow key={dao}>
                        <TableCell component="th" scope="row">
                          {daoLabels[index]}
                        </TableCell>
                        <TableCell align="right">{fNumber(s.objectsInCache)}</TableCell>
                        <TableCell align="right">{fNumber(s.usedMemory)}</TableCell>
                        <TableCell align="right">{fNumber(s.allocatedPages)}</TableCell>
                        <TableCell align="right">{fNumber(s.objectCount)}</TableCell>
                        <TableCell align="right">{fNumber(s.freeMemory)}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow sx={{ '& td': { fontWeight: 'bold', borderTop: '2px solid' } }}>
                    <TableCell>{t('total') || 'Total'}</TableCell>
                    <TableCell align="right">{fNumber(totals.objectsInCache)}</TableCell>
                    <TableCell align="right">{fNumber(totals.usedMemory)}</TableCell>
                    <TableCell align="right">{fNumber(totals.allocatedPages)}</TableCell>
                    <TableCell align="right">{fNumber(totals.objectCount)}</TableCell>
                    <TableCell align="right">{fNumber(totals.freeMemory)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
