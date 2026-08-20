import type { ActorSubclass, ActorConfig, Agent } from '@dfinity/agent';
import type { _SERVICE } from '@backend/icp_app_backend.did';

import { Actor } from '@dfinity/agent';

import { idlFactory } from '../../../declarations/icp_app_backend/icp_app_backend.did.js';

// Wrapper local para o backend gerado pelo dfx.
//
// O `src/declarations/icp_app_backend/index.js` gerado pelo `dfx` instancia um
// actor com `HttpAgent` default (mainnet) e chama `fetchRootKey()` no topo do
// módulo. Isso dispara uma requisição para `icp-api.io` no simples `import`,
// gerando um `ProtocolError 400 canister id not resolved` no console durante
// dev/local. Consumimos apenas `idlFactory` (arquivo puro) e reexpomos
// `canisterId`/`createActor` daqui, evitando o side-effect.

export const canisterId = process.env.CANISTER_ID_ICP_APP_BACKEND as string;

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
