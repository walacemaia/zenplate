import type { ActorSubclass, ActorConfig, Agent } from '@icp-sdk/core/agent';
import type { _SERVICE } from '@backend/icp_app_backend.did';

import { Actor } from '@icp-sdk/core/agent';
import { safeGetCanisterEnv } from '@icp-sdk/core/agent/canister-env';

import { idlFactory } from '../generated/declarations/icp_app_backend.did.js';

// Wrapper local para o backend, mantido por escolha do projeto em vez da
// classe gerada pelo `@icp-sdk/bindgen` (que converte variants/enums do
// Candid para tipos TS próprios — adotar exigiria revisar os 4 arquivos de
// `icpadapters/` e testar todas as telas que chamam o backend). Consumimos
// só `idlFactory`/`_SERVICE` (arquivos puros do bindgen) e expomos
// `createActor` estrito, que sempre exige um `Agent` já construído (nunca
// aceita `agentOptions` — força quem chama a decidir host/root key/identidade
// via `createIcpAgent`, evitando duplicar essa lógica em mais de um lugar).

export const canisterId = safeGetCanisterEnv<{ readonly ['PUBLIC_CANISTER_ID:icp_app_backend']: string }>()?.[
  'PUBLIC_CANISTER_ID:icp_app_backend'
] as string;

export type CreateActorOptions = {
  agent: Agent;
  actorOptions?: ActorConfig;
};

export function createActor(
  targetCanisterId: string,
  options: CreateActorOptions
): ActorSubclass<_SERVICE> {
  return Actor.createActor<_SERVICE>(idlFactory, {
    agent: options.agent,
    canisterId: targetCanisterId,
    ...options.actorOptions,
  });
}
