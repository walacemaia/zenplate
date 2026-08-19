import type { Configuration } from '@backend/icp_app_backend.did';

export type ConfigurationType = {
  id: bigint;
  lastChange: bigint;
  logLevel: string;
  maxProfileImageSize: bigint;
  eventsForCacheWarmup: bigint;
};

export const BLANK_CONFIGURATION: ConfigurationType = {
  id: 0n,
  lastChange: 0n,
  logLevel: 'info',
  maxProfileImageSize: 204800n, // 200KB
  eventsForCacheWarmup: 1000n,
};

/* -------------------------------------------------------------------------- */
/*                                 Conversões                                 */
/* -------------------------------------------------------------------------- */

// Helper para extrair chave de variant (logLevel)
const variantKey = (v: Record<string, unknown>): string => Object.keys(v)[0] || '';
const toVariant = (key: string): any => ({ [key]: null });

export function icpToTs(obj: Configuration): ConfigurationType {
  return {
    id: obj.id,
    lastChange: obj.lastChange,
    logLevel: variantKey(obj.logLevel),
    maxProfileImageSize: obj.maxProfileImageSize,
    eventsForCacheWarmup: obj.eventsForCacheWarmup,
  };
}

export function tsToIcp(data: ConfigurationType): Configuration {
  return {
    id: data.id,
    lastChange: data.lastChange,
    logLevel: toVariant(data.logLevel),
    maxProfileImageSize: data.maxProfileImageSize,
    eventsForCacheWarmup: data.eventsForCacheWarmup,
  } as Configuration;
}

export function tsToIcpArray(objects: ConfigurationType[]): Configuration[] {
  return objects.map((obj) => tsToIcp(obj));
}

export function icpToTsArray(objects: Configuration[]): ConfigurationType[] {
  return objects.map((obj) => icpToTs(obj));
}
