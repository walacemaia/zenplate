import { safeGetCanisterEnv } from '@icp-sdk/core/agent/canister-env';

// Origem da qual o Internet Identity deriva o principal de cada pessoa.
//
// Sem ela, o II deriva do domínio pelo qual o usuário chegou: associar depois
// um domínio próprio daria a todos um principal novo, e ninguém mais seria
// reconhecido. Fixada na URL do canister de frontend, o principal fica o mesmo
// em qualquer domínio que a aplicação venha a ter — basta listá-lo em
// `/.well-known/ii-alternative-origins` (ver `src/.well-known`).
//
// Na URL do próprio canister o principal é o mesmo de um login sem
// derivationOrigin, então fixá-la não muda nada para quem já entrou por ali.
// Cada ambiente (homologação, produção) tem o seu canister de frontend e,
// portanto, os seus principais.
//
// Na rede local não há derivationOrigin: o II não alcança o canister local
// para validar a lista, e o principal de dev segue derivado de
// `http://localhost:<porta>`.
export function derivationOrigin(): string | undefined {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')) {
    return undefined;
  }
  const frontendId = safeGetCanisterEnv<{ readonly ['PUBLIC_CANISTER_ID:icp_app_frontend']: string }>()?.[
    'PUBLIC_CANISTER_ID:icp_app_frontend'
  ];
  if (!frontendId) {
    // Seguir sem ela derivaria, calado, o principal do domínio atual.
    throw new Error('Id do canister de frontend ausente no cookie ic_env: login bloqueado.');
  }
  return `https://${frontendId}.icp0.io`;
}
