/**
 * Responsabilidade deste arquivo:
 * - Detectar o MIME type de imagens armazenadas como bytes brutos (Uint8Array).
 * - Reconstruir Blobs com o MIME correto para preview e impressao.
 *
 * Estrategia:
 * - O backend (ImageDAO) armazena apenas Blob bruto, sem campo de MIME.
 *   Para evitar migracao de schema, deduzimos o formato por magic-bytes
 *   (PNG/JPEG/WebP/GIF) ou por heuristica textual (SVG).
 *
 * Fora de escopo:
 * - Validacao de payload SVG (sanitizacao XSS): SVG carregado via <img>
 *   nao executa scripts no navegador, entao manter como esta e seguro.
 */

const FALLBACK_MIME = 'application/octet-stream';

/**
 * MIME types reconhecidos por esta funcao. Usado para allowlists em chamadas
 * externas (ex.: APIs que aceitam apenas subset de formatos).
 */
export type DetectedImageMime =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/gif'
  | 'image/svg+xml'
  | typeof FALLBACK_MIME;

/** Tamanho maximo (em bytes) inspecionado para detectar SVG textual. */
const SVG_INSPECT_LIMIT = 512;

function startsWithBom(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
}

function looksLikeSvg(bytes: Uint8Array): boolean {
  const offset = startsWithBom(bytes) ? 3 : 0;
  const slice = bytes.subarray(offset, Math.min(bytes.length, offset + SVG_INSPECT_LIMIT));
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: false }).decode(slice);
  } catch {
    return false;
  }
  const trimmed = text.trimStart().toLowerCase();
  if (trimmed.startsWith('<svg')) return true;
  if (trimmed.startsWith('<?xml')) {
    return trimmed.includes('<svg');
  }
  return false;
}

/**
 * Detecta o MIME type de uma imagem a partir dos primeiros bytes.
 * Retorna `application/octet-stream` quando nao reconhece o formato,
 * permitindo que callers decidam como tratar (renderizar ou descartar).
 */
export function detectImageMime(bytes: Uint8Array): DetectedImageMime {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return 'image/gif';
  }
  if (looksLikeSvg(bytes)) {
    return 'image/svg+xml';
  }
  return FALLBACK_MIME;
}

/**
 * Cria um Blob com o MIME type correto detectado a partir dos bytes.
 * Util para preview com URL.createObjectURL e impressao via data: URL.
 */
export function blobFromImageBytes(bytes: Uint8Array): Blob {
  return new Blob([bytes as BlobPart], { type: detectImageMime(bytes) });
}
