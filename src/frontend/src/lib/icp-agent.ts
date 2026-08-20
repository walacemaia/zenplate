import type { Identity } from '@icp-sdk/core/agent';

import { HttpAgent } from '@icp-sdk/core/agent';
import { safeGetCanisterEnv } from '@icp-sdk/core/agent/canister-env';

// Ponto único de host + root key para toda instanciação de actor.
//
// Duplicar esta lógica em mais de um consumidor já causou, em outro projeto do
// ecossistema, uma root key buscada duas vezes por criação de actor. Todo call
// site deve usar `createIcpAgent`, nunca reimplementar host/root key por conta própria.
//
// A root key vem do cookie `ic_env` (servido pelo canister de assets em
// produção e simulado pelo dev server do Vite em local — ver
// `getDevServerConfig()` em vite.config.ts), nunca de `fetchRootKey()` em
// runtime: essa chamada busca a root key do próprio replica a cada boot, o
// que é um vetor de MITM em mainnet. `host` nunca é hardcoded — usar sempre
// `window.location.origin`, que funciona tanto no canister de assets em
// produção quanto no proxy `/api` do Vite em local (ver vite.config.ts).
export async function createIcpAgent(identity?: Identity): Promise<HttpAgent> {
  const canisterEnv = safeGetCanisterEnv();

  return HttpAgent.create({
    host: window.location.origin,
    identity,
    rootKey: canisterEnv?.IC_ROOT_KEY,
  });
}
