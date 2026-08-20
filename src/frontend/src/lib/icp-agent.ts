import type { Identity } from '@dfinity/agent';

import { HttpAgent } from '@dfinity/agent';

// Ponto único de host + fetchRootKey para toda instanciação de actor.
//
// Duplicar esta lógica em mais de um consumidor já causou, em outro projeto do
// ecossistema, uma root key buscada duas vezes por criação de actor (um
// consumidor com guard incompleto repassando o agent para o `createActor`
// gerado pelo dfx, que também chama `fetchRootKey` internamente). Todo call
// site deve usar `createIcpAgent`, nunca reimplementar host/guard por conta própria.
//
// Mitigação temporária: a skill oficial `internet-identity` recomenda eliminar
// `fetchRootKey()` via cookie `ic_env` + `safeGetCanisterEnv()` (`@icp-sdk/core`),
// mecanismo hoje amarrado a `icp-cli`/`icp.yaml`. Revisar quando migrar de `dfx`.

export const isProduction = process.env.DFX_NETWORK === 'ic';

export const IC_HOST = isProduction ? 'https://icp-api.io' : 'http://127.0.0.1:4943';

export async function createIcpAgent(identity?: Identity): Promise<HttpAgent> {
  const agent = identity
    ? await HttpAgent.create({ host: IC_HOST, identity })
    : await HttpAgent.create({ host: IC_HOST });

  if (!isProduction) {
    if (process.env.DFX_NETWORK === 'ic') {
      throw new Error('Refusing to fetch root key on mainnet');
    }
    await agent.fetchRootKey();
  }

  return agent;
}
