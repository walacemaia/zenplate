// ...existing code...

export async function executeBackendAction<T>(
  action: () => Promise<{ ok?: T; err?: string | string[] }>,
  successMessage: string,
  onSuccess?: (result: T) => void,
  showSuccess?: (msg: string) => void,
  showError?: (msg: string) => void
): Promise<boolean> {
  try {
    const result = await action();
    const hasErr = Object.keys(result).some((key) => key.toLowerCase() === 'err');
    const hasOk = Object.keys(result).some((key) => key.toLowerCase() === 'ok');
    if (hasOk && result.ok !== undefined) {
      if (showSuccess) showSuccess(successMessage);
      if (onSuccess) onSuccess(result.ok);
      return true;
    } else if (hasErr && result.err) {
      const errArr = Array.isArray(result.err) ? result.err : [result.err];
      const err = formatErrors(errArr);
      if (showError) showError(err);
      return false;
    } else {
      if (showError) showError('Unknown error occurred');
      return false;
    }
  } catch (err) {
    if (showError) showError(parseErrorMessage(String(err)));
    return false;
  }
}
/**
 * Extrai a mensagem relevante de um erro complexo, como aqueles envolvendo `ic0.trap`.
 * Se não for um erro de trap, retorna a mensagem original.
 * @param error String de erro bruta.
 * @returns Mensagem extraída ou a string original se não conseguir extrair.
 */
function parseErrorMessage(error: string): string {
  // Procura por mensagens de trap do canister
  const trapMatch = error.match(/Canister called `ic0\.trap` with message: '([^']+)'/);
  if (trapMatch) {
    return getTranslationsFromLocalStorage()[trapMatch[1]] || trapMatch[1];
  }
  // Pode adicionar outras regras de parsing aqui se necessário, preservando a mensagem original
  return error;
}

/**
 * Formata um array de mensagens de erro em uma string única, aplicando parsing para extrair mensagens relevantes.
 * @param errors Array de mensagens de erro.
 * @returns String com erros separados por vírgula.
 */
export function formatErrors(errors: string[]): string {
  const translations = getTranslationsFromLocalStorage();
  return errors
    .map((e) => {
      const parsed = parseErrorMessage(e).trim();
      // Usa tradução se existir chave correspondente
      console.log('Parsed error message:', parsed);
      console.log('Translation found:', translations[parsed]);
      return translations[parsed] || parsed;
    })
    .join(', ');
}

function getTranslationsFromLocalStorage(): Record<string, string> {
  let translations: Record<string, string> = {};
  try {
    const raw = localStorage.getItem('app_translations');
    if (raw) {
      translations = JSON.parse(raw);
    }
  } catch {
    // silenciosamente ignora erros de parsing
  }
  return translations;
}
