import React from 'react';
import JSZip from 'jszip';

import type { ActorSubclass } from '@icp-sdk/core/agent';
import type {
  _SERVICE,
  BackupChunk,
  DaoAuditChunk,
  BackupBlobEntry,
} from '@backend/icp_app_backend.did';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useAlert } from 'src/utils/Alert';

import { DashboardContent } from 'src/layouts/dashboard';

import { executeBackendAction } from 'src/icpadapters/BackendUtils';

import { useIcpContext } from 'src/auth/context/icp/icp-context-provider';

// ----------------------------------------------------------------------

// Limite de bytes de payload por chamada a putBlobEntries (folga abaixo do ingress de ~2 MiB).
const PUT_CHUNK_BYTES = 1_600_000;
// Tamanho-alvo de cada janela de leitura via getBlobEntries.
const GET_CHUNK_BYTES = 1_800_000;

const DAO_FILE_MAGIC = new Uint8Array([0x49, 0x43, 0x50, 0x42, 0x4b, 0x50, 0x30, 0x31]); // "ICPBKP01"

type DaoStatus = 'idle' | 'running' | 'done' | 'error';

type DaoProgress = {
  id: string;
  status: DaoStatus;
  entryCount: number;
  totalBytes: number;
  processedEntries: number;
  processedBytes: number;
  message?: string;
};

type ManifestDao = {
  id: string;
  entryCount: number;
  totalBytes: number;
  // Optional para compatibilidade com manifestos antigos (v1 sem sequence).
  sequence?: string;
};
type Manifest = {
  version: number;
  createdAt: string;
  daos: ManifestDao[];
};

// ----------------------------------------------------------------------
// Tipos do relatório de auditoria, construído client-side a partir dos
// chunks retornados por `auditDaoChunk`. Mantêm a mesma forma que era
// retornada pelo antigo endpoint agregado.
// ----------------------------------------------------------------------

type OrphanRecord = {
  sourceEntity: string;
  sourceId: bigint;
  targetEntity: string;
  targetRole: string;
  missingTargetIds: string[];
  message: string;
};

type ReferenceAuditSummary = {
  sourceEntity: string;
  targetEntity: string;
  targetRole: string;
  scanned: bigint;
  orphans: bigint;
};

type AuditReport = {
  scannedAt: bigint; // nanosegundos epoch
  totals: ReferenceAuditSummary[];
  orphans: OrphanRecord[];
};

// ----------------------------------------------------------------------
// Conversões binárias (key/payload <-> bytes do arquivo .bin)
// ----------------------------------------------------------------------

function bigintToBytes(n: bigint): Uint8Array {
  if (n < 0n) throw new Error('negative key');
  if (n === 0n) return new Uint8Array([0]);
  const out: number[] = [];
  let x = n;
  while (x > 0n) {
    out.unshift(Number(x & 0xffn));
    x >>= 8n;
  }
  return new Uint8Array(out);
}

function bytesToBigint(b: Uint8Array): bigint {
  let x = 0n;
  for (const byte of b) x = (x << 8n) | BigInt(byte);
  return x;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

function toU8(bytes: Uint8Array | number[]): Uint8Array {
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

function encodeRecord(entry: BackupBlobEntry): Uint8Array {
  const keyBytes = bigintToBytes(entry.key);
  if (keyBytes.length > 255) throw new Error('key too large');
  const payload = toU8(entry.payLoad);
  const header = new Uint8Array(1 + keyBytes.length + 4);
  header[0] = keyBytes.length;
  header.set(keyBytes, 1);
  const dv = new DataView(header.buffer, header.byteOffset, header.byteLength);
  dv.setUint32(1 + keyBytes.length, payload.length, false);
  return concat([header, payload]);
}

function parseDaoFile(buf: Uint8Array): BackupBlobEntry[] {
  if (buf.length < DAO_FILE_MAGIC.length) {
    throw new Error('arquivo do DAO inválido (cabeçalho ausente)');
  }
  for (let i = 0; i < DAO_FILE_MAGIC.length; i += 1) {
    if (buf[i] !== DAO_FILE_MAGIC[i]) throw new Error('cabeçalho mágico inválido');
  }
  const out: BackupBlobEntry[] = [];
  let off = DAO_FILE_MAGIC.length;
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  while (off < buf.length) {
    const keyLen = buf[off];
    off += 1;
    if (off + keyLen + 4 > buf.length) throw new Error('arquivo truncado');
    const key = bytesToBigint(buf.subarray(off, off + keyLen));
    off += keyLen;
    const payloadLen = dv.getUint32(off, false);
    off += 4;
    if (off + payloadLen > buf.length) throw new Error('payload truncado');
    const payLoad = buf.slice(off, off + payloadLen);
    off += payloadLen;
    out.push({ key, payLoad });
  }
  return out;
}

// ----------------------------------------------------------------------

export default function Page() {
  const ctx = useIcpContext() as { backend: ActorSubclass<_SERVICE> | null };
  const { backend } = ctx;
  const { showError, showSuccess } = useAlert();

  const [maintenance, setMaintenance] = React.useState<boolean | null>(null);
  const [maintenanceBusy, setMaintenanceBusy] = React.useState(false);

  const [daoIds, setDaoIds] = React.useState<string[]>([]);

  const [progress, setProgress] = React.useState<Record<string, DaoProgress>>({});
  const [log, setLog] = React.useState<string[]>([]);
  const [running, setRunning] = React.useState<'export' | 'import' | null>(null);
  const [importFile, setImportFile] = React.useState<File | null>(null);

  const [auditBusy, setAuditBusy] = React.useState(false);
  const [auditReport, setAuditReport] = React.useState<AuditReport | null>(null);
  const [auditProgress, setAuditProgress] = React.useState<string | null>(null);

  const logRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!backend) return;
    (async () => {
      try {
        const [mode, ids] = await Promise.all([
          backend.isMaintenanceMode(),
          backend.getDaoIdentifiers(),
        ]);
        setMaintenance(mode);
        setDaoIds(ids);
      } catch (e: any) {
        appendLog(`Erro ao consultar estado inicial: ${e?.message ?? e}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend]);

  React.useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  function appendLog(msg: string) {
    const ts = new Date().toISOString().slice(11, 19);
    setLog((prev) => [...prev, `[${ts}] ${msg}`]);
  }

  function resetProgress(ids: string[]) {
    const init: Record<string, DaoProgress> = {};
    for (const id of ids) {
      init[id] = {
        id,
        status: 'idle',
        entryCount: 0,
        totalBytes: 0,
        processedEntries: 0,
        processedBytes: 0,
      };
    }
    setProgress(init);
  }

  function updateDao(id: string, patch: Partial<DaoProgress>) {
    setProgress((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function handleToggleMaintenance(enabled: boolean) {
    if (!backend) return;
    setMaintenanceBusy(true);
    try {
      const result = await backend.setMaintenanceMode(enabled);
      setMaintenance(result);
      appendLog(`Modo de manutenção: ${result ? 'habilitado' : 'desabilitado'}.`);
    } catch (e: any) {
      const msg = `Falha ao alterar modo de manutenção: ${e?.message ?? e}`;
      appendLog(msg);
      showError(msg);
    } finally {
      setMaintenanceBusy(false);
    }
  }

  // ---------------------------- AUDITORIA -----------------------------------

  async function handleRunAudit() {
    if (!backend) return;
    const actor = backend;
    setAuditBusy(true);
    setAuditProgress('Carregando lista de DAOs auditáveis...');
    setAuditReport(null);
    appendLog('Executando auditoria de integridade referencial (chunked por DAO)...');
    try {
      const auditableIds = await actor.getAuditableDaoIdentifiers();
      if (auditableIds.length === 0) {
        appendLog('Nenhum DAO com referências de saída registradas — nada a auditar.');
        showSuccess('Nenhum DAO auditável.');
        setAuditReport({
          scannedAt: BigInt(Date.now()) * 1_000_000n,
          totals: [],
          orphans: [],
        });
        return;
      }
      appendLog(`DAOs auditáveis: ${auditableIds.join(', ')}.`);
      const orphans: OrphanRecord[] = [];
      // Chave do bucket de totais: `${sourceEntity}\u0000${targetEntity}\u0000${targetRole}`
      const summaries = new Map<string, ReferenceAuditSummary>();

      for (let i = 0; i < auditableIds.length; i += 1) {
        const daoId = auditableIds[i];
        setAuditProgress(`Auditando "${daoId}" (${i + 1}/${auditableIds.length})...`);
        appendLog(`DAO "${daoId}": iniciando auditoria.`);

        let fromKey: [] | [bigint] = [];
        let chunkIdx = 0;
        let scannedTotal = 0;
        let orphanTotal = 0;

        // Loop de paginação até nextKey vazio.
        // eslint-disable-next-line no-await-in-loop
        for (;;) {
          chunkIdx += 1;
          // eslint-disable-next-line no-await-in-loop
          const result: { ok: DaoAuditChunk } | { err: string } = await actor.auditDaoChunk(
            daoId,
            fromKey,
            []
          );
          if ('err' in result) {
            throw new Error(`auditDaoChunk(${daoId}): ${result.err}`);
          }
          const chunk: DaoAuditChunk = result.ok;
          scannedTotal += Number(chunk.scanned);

          for (const entry of chunk.entries) {
            for (const v of entry.violations) {
              const key = `${daoId}\u0000${v.targetEntity}\u0000${v.targetRole}`;
              const current = summaries.get(key);
              if (current) {
                summaries.set(key, {
                  ...current,
                  orphans: current.orphans + 1n,
                });
              } else {
                summaries.set(key, {
                  sourceEntity: daoId,
                  targetEntity: v.targetEntity,
                  targetRole: v.targetRole,
                  scanned: 0n, // preenchido ao final do DAO
                  orphans: 1n,
                });
              }
              orphans.push({
                sourceEntity: daoId,
                sourceId: entry.sourceId,
                targetEntity: v.targetEntity,
                targetRole: v.targetRole,
                missingTargetIds: v.missingTargetIds,
                message: v.message,
              });
              orphanTotal += 1;
            }
          }

          setAuditProgress(
            `Auditando "${daoId}" (${i + 1}/${auditableIds.length}): ${scannedTotal} registros, ${orphanTotal} órfãos...`
          );

          if (chunk.nextKey.length === 0) break;
          fromKey = chunk.nextKey;
          // Yield para permitir UI update entre chunks.
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => {
            setTimeout(r, 0);
          });
          if (chunkIdx % 10 === 0) {
            appendLog(`DAO "${daoId}": ${scannedTotal} registros auditados...`);
          }
        }

        // Atualiza `scanned` de todos os buckets criados para este DAO.
        for (const [key, summary] of summaries.entries()) {
          if (summary.sourceEntity === daoId && summary.scanned === 0n) {
            summaries.set(key, { ...summary, scanned: BigInt(scannedTotal) });
          }
        }

        appendLog(
          `DAO "${daoId}": auditoria concluída — ${scannedTotal} registros, ${orphanTotal} órfãos.`
        );
      }

      const report: AuditReport = {
        scannedAt: BigInt(Date.now()) * 1_000_000n,
        totals: Array.from(summaries.values()),
        orphans,
      };
      setAuditReport(report);
      const orphanCount = orphans.length;
      if (orphanCount === 0) {
        appendLog('Auditoria concluída: nenhuma referência órfã encontrada.');
        showSuccess('Auditoria concluída: nenhuma referência órfã.');
      } else {
        appendLog(`Auditoria concluída: ${orphanCount} registro(s) com referências órfãs.`);
        showError(`Auditoria detectou ${orphanCount} registro(s) com referências órfãs.`);
      }
    } catch (e: any) {
      const msg = `Erro durante auditoria: ${e?.message ?? e}`;
      appendLog(msg);
      showError(msg);
    } finally {
      setAuditBusy(false);
      setAuditProgress(null);
    }
  }

  function handleDownloadAuditReport() {
    if (!auditReport) return;
    const payload = JSON.stringify(
      auditReport,
      (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---------------------------- EXPORT --------------------------------------

  async function handleExport() {
    if (!backend) return;
    const actor = backend;
    if (!maintenance) {
      showError('Habilite o modo de manutenção antes de exportar.');
      return;
    }
    setRunning('export');
    resetProgress(daoIds);
    appendLog(`Iniciando backup de ${daoIds.length} DAOs.`);

    try {
      const expectedEntries = new Map<string, number>();
      for (const id of daoIds) {
        // eslint-disable-next-line no-await-in-loop
        const sizeOk = await executeBackendAction<bigint>(
          () => actor.getDaoSize(id),
          '',
          (value) => {
            const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
            const normalized = value > maxSafe ? Number.MAX_SAFE_INTEGER : Number(value);
            expectedEntries.set(id, normalized);
          },
          undefined,
          showError
        );
        if (!sizeOk) {
          appendLog(
            `DAO "${id}": não foi possível obter total de entradas; progresso ficará estimado.`
          );
        }
      }

      const zip = new JSZip();
      const dataFolder = zip.folder('data');
      if (!dataFolder) throw new Error('falha ao criar pasta data/ no zip');

      const manifestDaos: ManifestDao[] = [];

      for (const id of daoIds) {
        const expectedForDao = expectedEntries.get(id) ?? 0;
        updateDao(id, { status: 'running', entryCount: expectedForDao });
        appendLog(`DAO "${id}": exportando...`);

        const chunks: Uint8Array[] = [DAO_FILE_MAGIC];
        let entryCount = 0;
        let totalBytes = 0;
        let cursor: [] | [bigint] = [];
        let exhausted = false;

        while (!exhausted) {
          let chunk: BackupChunk | null = null;
          // eslint-disable-next-line no-await-in-loop
          const ok = await executeBackendAction<BackupChunk>(
            () => actor.getBlobEntries(id, cursor, [BigInt(GET_CHUNK_BYTES)]),
            '',
            (value) => {
              chunk = value;
            },
            undefined,
            showError
          );
          if (!ok || chunk === null) {
            updateDao(id, { status: 'error', message: 'falha ao ler chunk' });
            appendLog(`DAO "${id}": falha ao ler chunk.`);
            throw new Error(`getBlobEntries(${id})`);
          }
          const { entries, nextKey } = chunk as BackupChunk;
          for (const entry of entries) {
            const payload = toU8(entry.payLoad);
            chunks.push(encodeRecord(entry));
            entryCount += 1;
            totalBytes += payload.length;
          }
          updateDao(id, {
            entryCount: expectedForDao > 0 ? expectedForDao : entryCount,
            totalBytes,
            processedEntries: entryCount,
            processedBytes: totalBytes,
          });
          if (nextKey.length === 0) {
            exhausted = true;
          } else {
            cursor = nextKey;
          }
        }

        const fileBytes = concat(chunks);
        dataFolder.file(`${id}.bin`, fileBytes);

        let sequence = 0n;
        // eslint-disable-next-line no-await-in-loop
        const seqOk = await executeBackendAction<bigint>(
          () => actor.getDaoSequence(id),
          '',
          (value) => {
            sequence = value;
          },
          undefined,
          showError
        );
        if (!seqOk) {
          updateDao(id, { status: 'error', message: 'falha ao ler sequence' });
          appendLog(`DAO "${id}": falha ao ler sequence.`);
          throw new Error(`getDaoSequence(${id})`);
        }

        manifestDaos.push({
          id,
          entryCount,
          totalBytes,
          sequence: sequence.toString(),
        });
        updateDao(id, { status: 'done' });
        appendLog(
          `DAO "${id}": ${entryCount} entradas, ${formatBytes(totalBytes)} exportados (sequence=${sequence.toString()}).`
        );
      }

      const manifest: Manifest = {
        version: 1,
        createdAt: new Date().toISOString(),
        daos: manifestDaos,
      };
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));

      appendLog('Compactando arquivo zip...');
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `icp_app-backup-${stamp}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const msg = `Backup concluído (${formatBytes(blob.size)}).`;
      appendLog(msg);
      showSuccess(msg);
    } catch (e: any) {
      appendLog(`Erro durante export: ${e?.message ?? e}`);
    } finally {
      setRunning(null);
    }
  }

  // ---------------------------- IMPORT --------------------------------------

  async function handleImport() {
    if (!backend || !importFile) return;
    const actor = backend;
    if (!maintenance) {
      showError('Habilite o modo de manutenção antes de importar.');
      return;
    }

    setRunning('import');
    appendLog(`Lendo arquivo: ${importFile.name} (${formatBytes(importFile.size)}).`);

    try {
      const zip = await JSZip.loadAsync(importFile);
      const manifestFile = zip.file('manifest.json');
      if (!manifestFile) throw new Error('manifest.json não encontrado no zip');
      const manifestJson = await manifestFile.async('string');
      const manifest: Manifest = JSON.parse(manifestJson);
      if (manifest.version !== 1) {
        throw new Error(`versão de manifest não suportada: ${manifest.version}`);
      }

      const ids = manifest.daos.map((d) => d.id);
      // Une os DAOs presentes no manifesto com os DAOs registrados no
      // canister apenas para fins de UI (todos serao apresentados na lista
      // de progresso). A limpeza efetiva sera realizada atomicamente pelo
      // endpoint `startRestore`.
      const registryIds = daoIds.length > 0 ? daoIds : ids;
      const progressIds = Array.from(new Set([...registryIds, ...ids]));
      resetProgress(progressIds);
      appendLog(`Manifesto v${manifest.version} (${manifest.createdAt}) com ${ids.length} DAOs.`);

      // ----------- Fase 1: pre-condicoes + clear atomico no backend ---------
      appendLog('Iniciando restore (pre-condicoes + limpeza atomica)...');
      let clearedIds: string[] = [];
      const started = await executeBackendAction<string[]>(
        () => actor.startRestore(ids),
        '',
        (value) => {
          clearedIds = value;
        },
        undefined,
        showError
      );
      if (!started) {
        for (const id of progressIds) {
          updateDao(id, { status: 'error', message: 'startRestore falhou' });
        }
        throw new Error('startRestore falhou; restore abortado.');
      }
      appendLog(`startRestore OK: ${clearedIds.length} DAOs limpos no backend.`);
      for (const id of progressIds) {
        if (ids.includes(id)) {
          updateDao(id, { status: 'idle' });
        } else {
          // DAO existe no canister mas nao consta no manifesto: fica limpo,
          // sem dados restaurados ("melhor incompleto do que misturado").
          updateDao(id, { status: 'done', message: 'ausente do manifesto (vazio)' });
        }
      }

      // ----------- Fase 2: restaurar conforme manifesto -----------
      for (const daoMeta of manifest.daos) {
        const {
          id,
          entryCount: expectedEntries,
          totalBytes: expectedBytes,
          sequence: expectedSequence,
        } = daoMeta;
        updateDao(id, {
          status: 'running',
          entryCount: expectedEntries,
          totalBytes: expectedBytes,
        });
        appendLog(
          `DAO "${id}": importando ${expectedEntries} entradas (${formatBytes(expectedBytes)}).`
        );

        const daoFile = zip.file(`data/${id}.bin`);
        if (!daoFile) {
          updateDao(id, { status: 'error', message: 'arquivo ausente' });
          appendLog(`DAO "${id}": arquivo data/${id}.bin ausente, pulando.`);
          continue;
        }
        // eslint-disable-next-line no-await-in-loop
        const fileBuf = new Uint8Array(await daoFile.async('arraybuffer'));
        const records = parseDaoFile(fileBuf);

        let batch: BackupBlobEntry[] = [];
        let batchBytes = 0;
        let processedEntries = 0;
        let processedBytes = 0;
        let aborted = false;

        const flush = async () => {
          if (batch.length === 0) return true;
          const currentBatch = batch;
          const currentBatchBytes = batchBytes;
          batch = [];
          batchBytes = 0;
          const ok = await executeBackendAction<bigint>(
            () => actor.putBlobEntries(id, currentBatch),
            '',
            () => {
              processedEntries += currentBatch.length;
              processedBytes += currentBatchBytes;
              updateDao(id, { processedEntries, processedBytes });
            },
            undefined,
            showError
          );
          return ok;
        };

        for (const rec of records) {
          const recBytes = toU8(rec.payLoad).length;
          if (batch.length > 0 && batchBytes + recBytes > PUT_CHUNK_BYTES) {
            // eslint-disable-next-line no-await-in-loop
            const ok = await flush();
            if (!ok) {
              aborted = true;
              break;
            }
          }
          batch.push(rec);
          batchBytes += recBytes;
        }
        if (!aborted) {
          // eslint-disable-next-line no-await-in-loop
          const ok = await flush();
          if (!ok) aborted = true;
        }
        if (aborted) {
          updateDao(id, { status: 'error', message: 'falha em putBlobEntries' });
          appendLog(`DAO "${id}": importação interrompida.`);
          continue;
        }

        appendLog(`DAO "${id}": dados restaurados, reconstruindo índices...`);
        // eslint-disable-next-line no-await-in-loop
        const reindexOk = await executeBackendAction<null>(
          () => actor.reindexDao(id),
          '',
          undefined,
          undefined,
          showError
        );
        if (!reindexOk) {
          updateDao(id, { status: 'error', message: 'falha no reindex' });
          appendLog(`DAO "${id}": falha no reindex.`);
          continue;
        }

        // Restaura o contador de sequencia preservado no manifesto.
        if (
          expectedSequence === undefined ||
          expectedSequence === null ||
          expectedSequence === ''
        ) {
          updateDao(id, { status: 'done', message: 'sequence ausente no manifesto' });
          appendLog(`DAO "${id}": concluido (sequence nao informada no manifesto).`);
          continue;
        }
        let sequenceValue: bigint;
        try {
          sequenceValue = BigInt(expectedSequence);
        } catch (e: any) {
          updateDao(id, { status: 'error', message: 'sequence invalida' });
          appendLog(`DAO "${id}": sequence invalida no manifesto (${expectedSequence}).`);
          continue;
        }
        // eslint-disable-next-line no-await-in-loop
        const seqOk = await executeBackendAction<null>(
          () => actor.setDaoSequence(id, sequenceValue),
          '',
          undefined,
          undefined,
          showError
        );
        if (!seqOk) {
          updateDao(id, { status: 'error', message: 'falha em setDaoSequence' });
          appendLog(`DAO "${id}": falha ao restaurar sequence.`);
          continue;
        }
        updateDao(id, { status: 'done' });
        appendLog(`DAO "${id}": concluido (sequence=${sequenceValue.toString()}).`);
      }

      const msg = 'Importação concluída.';
      appendLog(msg);
      showSuccess(msg);
    } catch (e: any) {
      appendLog(`Erro durante import: ${e?.message ?? e}`);
    } finally {
      setRunning(null);
    }
  }

  // ---------------------------- UI ------------------------------------------

  const allDaosForUi = React.useMemo(() => {
    const order = daoIds.length > 0 ? daoIds : Object.keys(progress);
    return order.map(
      (id) =>
        progress[id] ?? {
          id,
          status: 'idle' as DaoStatus,
          entryCount: 0,
          totalBytes: 0,
          processedEntries: 0,
          processedBytes: 0,
        }
    );
  }, [daoIds, progress]);

  return (
    <DashboardContent>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Backup
      </Typography>

      <Stack spacing={3}>
        <Card>
          <CardHeader title="Modo de manutenção" />
          <CardContent>
            <Alert severity={maintenance ? 'warning' : 'info'} sx={{ mb: 2 }}>
              {maintenance
                ? 'O sistema está em manutenção. Operações de escrita estão bloqueadas. Backup e restore são permitidos para controllers do canister.'
                : 'O sistema está operacional. Habilite a manutenção para executar backup ou restore.'}
            </Alert>
            <Alert severity="info" sx={{ mb: 2 }}>
              As operações de backup e restore exigem que o seu Principal esteja registrado como{' '}
              <strong>controller do canister</strong> (via{' '}
              <code>icp canister settings update &lt;canister&gt; --add-controller</code>). O papel{' '}
              <code>#admin</code> de domínio não é suficiente, porque o restore pode limpar o
              próprio profile do usuário.
            </Alert>
            <FormControlLabel
              control={
                <Switch
                  checked={!!maintenance}
                  disabled={maintenance === null || maintenanceBusy || running !== null}
                  onChange={(_, checked) => handleToggleMaintenance(checked)}
                />
              }
              label={maintenance ? 'Manutenção habilitada' : 'Manutenção desabilitada'}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Auditoria de integridade referencial"
            subheader="Percorre todas as referências FK registradas e identifica registros que apontam para entidades inexistentes. Somente leitura."
          />
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Button
                variant="contained"
                onClick={handleRunAudit}
                disabled={auditBusy || running !== null}
              >
                {auditBusy ? 'Executando...' : 'Executar auditoria'}
              </Button>
              {auditReport && (
                <Button variant="outlined" onClick={handleDownloadAuditReport} disabled={auditBusy}>
                  Baixar relatório JSON
                </Button>
              )}
              {auditBusy && auditProgress && (
                <Typography variant="body2" color="text.secondary">
                  {auditProgress}
                </Typography>
              )}
              {!auditBusy && auditReport && (
                <Typography variant="body2" color="text.secondary">
                  Executada em{' '}
                  {new Date(Number(auditReport.scannedAt / 1_000_000n)).toLocaleString()}
                </Typography>
              )}
            </Stack>
            {auditReport && (
              <>
                <Alert
                  severity={auditReport.orphans.length === 0 ? 'success' : 'error'}
                  sx={{ mb: 2 }}
                >
                  {auditReport.orphans.length === 0
                    ? 'Nenhuma referência órfã encontrada.'
                    : `${auditReport.orphans.length} registro(s) com referências órfãs detectados.`}
                </Alert>
                {auditReport.totals.length > 0 && (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Totais por referência
                    </Typography>
                    <TableContainer sx={{ mb: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Source</TableCell>
                            <TableCell>Target</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell align="right">Sources auditados</TableCell>
                            <TableCell align="right">Órfãos</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {auditReport.totals.map((t: ReferenceAuditSummary, i: number) => (
                            <TableRow
                              key={`${t.sourceEntity}-${t.targetEntity}-${t.targetRole}-${i}`}
                            >
                              <TableCell>{t.sourceEntity}</TableCell>
                              <TableCell>{t.targetEntity}</TableCell>
                              <TableCell>{t.targetRole}</TableCell>
                              <TableCell align="right">{t.scanned.toString()}</TableCell>
                              <TableCell align="right">{t.orphans.toString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
                {auditReport.orphans.length > 0 && (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Registros órfãos (primeiros 200)
                    </Typography>
                    <TableContainer sx={{ maxHeight: 480 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Source</TableCell>
                            <TableCell>Source ID</TableCell>
                            <TableCell>Target</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>IDs ausentes</TableCell>
                            <TableCell>Mensagem</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {auditReport.orphans.slice(0, 200).map((o: OrphanRecord, i: number) => (
                            <TableRow key={`${o.sourceEntity}-${o.sourceId}-${o.targetRole}-${i}`}>
                              <TableCell>{o.sourceEntity}</TableCell>
                              <TableCell>{o.sourceId.toString()}</TableCell>
                              <TableCell>{o.targetEntity}</TableCell>
                              <TableCell>{o.targetRole}</TableCell>
                              <TableCell>{o.missingTargetIds.join(', ')}</TableCell>
                              <TableCell>{o.message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    {auditReport.orphans.length > 200 && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1, display: 'block' }}
                      >
                        Exibindo 200 de {auditReport.orphans.length} registros. Use "Baixar
                        relatório JSON" para a lista completa.
                      </Typography>
                    )}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Exportar"
            subheader="Gera um arquivo .zip contendo todos os DAOs em formato binário."
          />
          <CardContent>
            <Button
              variant="contained"
              disabled={!maintenance || running !== null || daoIds.length === 0}
              onClick={handleExport}
            >
              {running === 'export' ? 'Exportando...' : 'Exportar backup'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Importar"
            subheader="Restaura o conteúdo de um arquivo .zip de backup. As tabelas existentes são sobrescritas e os índices reconstruídos."
          />
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button variant="outlined" component="label" disabled={running !== null}>
                Selecionar arquivo
                <input
                  hidden
                  type="file"
                  accept=".zip,application/zip"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                />
              </Button>
              <Typography variant="body2" color="text.secondary">
                {importFile
                  ? `${importFile.name} (${formatBytes(importFile.size)})`
                  : 'Nenhum arquivo selecionado'}
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Button
                variant="contained"
                color="warning"
                disabled={!maintenance || !importFile || running !== null}
                onClick={handleImport}
              >
                {running === 'import' ? 'Importando...' : 'Importar backup'}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Progresso por DAO" />
          <CardContent>
            <Grid container spacing={2}>
              {allDaosForUi.map((p) => (
                <Grid key={p.id} size={{ xs: 12, md: 6 }}>
                  <DaoProgressRow progress={p} />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Log" />
          <CardContent>
            <Box
              ref={logRef}
              sx={{
                fontFamily: 'monospace',
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                bgcolor: 'background.neutral',
                p: 2,
                height: 280,
                overflowY: 'auto',
                borderRadius: 1,
              }}
            >
              {log.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                  Nenhuma atividade ainda.
                </Typography>
              ) : (
                log.join('\n')
              )}
            </Box>
            <Divider sx={{ my: 2 }} />
            <Button size="small" onClick={() => setLog([])} disabled={running !== null}>
              Limpar log
            </Button>
          </CardContent>
        </Card>
      </Stack>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function DaoProgressRow({ progress: p }: { progress: DaoProgress }) {
  const ratio =
    p.entryCount > 0
      ? Math.min(100, (p.processedEntries / p.entryCount) * 100)
      : p.totalBytes > 0
        ? Math.min(100, (p.processedBytes / p.totalBytes) * 100)
        : p.status === 'done'
          ? 100
          : 0;

  const color = p.status === 'error' ? 'error' : p.status === 'done' ? 'success' : 'primary';

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography variant="subtitle2">{p.id}</Typography>
        <Typography variant="caption" color="text.secondary">
          {p.processedEntries}/{p.entryCount || '?'} entradas • {formatBytes(p.processedBytes)}
          {p.totalBytes > 0 ? ` / ${formatBytes(p.totalBytes)}` : ''}
        </Typography>
      </Stack>
      <LinearProgress
        variant={
          p.status === 'running' && p.entryCount === 0 && p.totalBytes === 0
            ? 'indeterminate'
            : 'determinate'
        }
        value={ratio}
        color={color}
        sx={{ mt: 0.5, height: 8, borderRadius: 1 }}
      />
      {p.message && (
        <Typography variant="caption" color="error">
          {p.message}
        </Typography>
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(2)} ${units[i]}`;
}
