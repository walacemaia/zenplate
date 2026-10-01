import type { Identity } from '@icp-sdk/core/agent';

import { DelegationIdentity } from '@icp-sdk/core/identity';

/**
 * Fim da sessão do Internet Identity.
 *
 * A sessão é uma delegação com prazo (`maxTimeToLive` no login). Vencida com
 * a página aberta, nada no cliente percebia: o ator seguia assinando com a
 * identidade vencida, a réplica recusava com "Invalid delegation expiry", e o
 * erro HTTP cru aparecia na tela — só um recarregar (Ctrl-F5) levava de volta
 * ao login. Aqui o cliente percebe o vencimento por dois caminhos: um relógio
 * agendado para o fim da delegação e, por garantia, o próprio erro da
 * réplica, se uma chamada chegar antes do relógio (aba suspensa, relógio do
 * sistema adiantado).
 */

/** Antecedência com que a sessão é encerrada, para não disputar com a réplica. */
const EXPIRY_MARGIN_MS = 30_000;

/** Maior espera que `setTimeout` aceita (~24,8 dias); sessões de 30 dias reagendam. */
export const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/** Marca, para a tela de login, que a sessão acabou por vencimento. */
const SESSION_EXPIRED_FLAG = 'auth.sessionExpired';

/** Instante (ms) em que a sessão deve ser encerrada: o menor vencimento da cadeia, com margem. */
export function sessionEndMs(identity: Identity | null | undefined): number | null {
  if (!(identity instanceof DelegationIdentity)) return null;
  const expirations = identity.getDelegation().delegations.map((d) => d.delegation.expiration);
  if (expirations.length === 0) return null;
  const earliest = expirations.reduce((a, b) => (b < a ? b : a));
  return Number(earliest / 1_000_000n) - EXPIRY_MARGIN_MS;
}

/** A réplica recusou a chamada porque a delegação venceu. */
export function isSessionExpiredError(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  return /delegation has expired|Invalid delegation expiry/i.test(text);
}

export function markSessionExpired(): void {
  try {
    sessionStorage.setItem(SESSION_EXPIRED_FLAG, '1');
  } catch {
    // Sem sessionStorage, o login só não mostra o aviso.
  }
}

/** A sessão anterior acabou por vencimento? Só lê: a limpeza é à parte. */
export function wasSessionExpired(): boolean {
  try {
    return sessionStorage.getItem(SESSION_EXPIRED_FLAG) === '1';
  } catch {
    return false;
  }
}

/** Apaga a marca, para o aviso aparecer uma vez. */
export function clearSessionExpired(): void {
  try {
    sessionStorage.removeItem(SESSION_EXPIRED_FLAG);
  } catch {
    // nada a apagar
  }
}

/**
 * Envolve o ator para que toda chamada recusada por delegação vencida
 * encerre a sessão (`onExpired`) e falhe com `message` no lugar do erro HTTP.
 */
export function guardSession<T extends object>(
  actor: T,
  onExpired: () => void,
  message: () => string
): T {
  return new Proxy(actor, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== 'function') return value;
      const guarded = (...args: unknown[]) => {
        const result = value.apply(target, args);
        if (!(result instanceof Promise)) return result;
        return result.catch((error: unknown) => {
          if (isSessionExpiredError(error)) {
            onExpired();
            throw new Error(message());
          }
          throw error;
        });
      };
      // Preserva o que o agente pendura no método (ex.: `withOptions`).
      return Object.assign(guarded, value);
    },
  });
}
