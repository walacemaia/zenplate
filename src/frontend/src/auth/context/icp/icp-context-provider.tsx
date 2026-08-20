import type { AuthContextValue } from 'src/auth/types';
import type { _SERVICE } from '@backend/icp_app_backend.did';
import type { Identity, ActorSubclass } from '@icp-sdk/core/agent';

import { AuthClient } from '@icp-sdk/auth/client';
import React, { useState, useEffect, useContext, createContext } from 'react';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { paths } from 'src/routes/paths';

import { tsToIcp, BLANK_PROFILE, type ProfileType } from 'src/icpadapters/ProfileAdapter';

import { SimpleProfileForm } from './simple-profile-form';
import { createIcpAgent } from '../../../lib/icp-agent';
import { canisterId, createActor } from '../../../lib/icp-app-backend-client';

const AuthContext = createContext<any>(null);

const SESSION_DURATION_NS = {
  standard: BigInt(8) * BigInt(3_600_000_000_000),
  rememberMe: BigInt(30) * BigInt(24) * BigInt(3_600_000_000_000),
};

type LoginOptions = {
  rememberMe?: boolean;
};

interface IcpAuthContextValue extends AuthContextValue {
  isAuthenticated: boolean;
  login: (options?: LoginOptions) => Promise<void>;
  logout: () => void;
  loadTranslations: () => void;
  identity: Identity;
  backend: ActorSubclass<_SERVICE> | null;
  translations: (key: string) => string | null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [identity, setIdentity] = useState<any>(null);
  const [backend, setBackend] = useState<ActorSubclass<_SERVICE> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [translations, setTranslations] = useState<{ [key: string]: string }>({});
  // Controle de criação de profile
  const [mustCreateProfile, setMustCreateProfile] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<ProfileType | null>(null);

  /**
   * Na carga das páginas, cria o AuthClient e verifica se o usuário está autenticado.
   */
  useEffect(() => {
    checkAuthenticated();
  }, []);

  function getAuthClient(): AuthClient {
    if (authClient == null) {
      // Calcula posição centralizada para a janela de login. `identityProvider`
      // e `windowOpenerFeatures` agora pertencem ao construtor do AuthClient
      // (não mais a `login`/`signIn`) — calculados uma vez, na montagem.
      const width = 500;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      // O IdleManager padrao do @icp-sdk/auth desloga o usuario apos
      // 10 min de inatividade (mouse/teclado/touch) e ainda chama
      // window.location.reload(), o que quebra o "lembrar de mim" e torna
      // a sessao de 8h/30d inconsistente. Aqui desativamos o idle para que
      // a duracao da sessao seja governada exclusivamente por maxTimeToLive.
      const client = new AuthClient({
        identityProvider: identityProvider(),
        windowOpenerFeatures: `toolbar=0,location=0,menubar=0,width=${width},height=${height},left=${left},top=${top}`,
        idleOptions: {
          disableIdle: true,
          disableDefaultIdleCallback: true,
        },
      });
      setAuthClient(client);
      return client;
    }
    return authClient;
  }

  async function checkAuthenticated() {
    console.log('Checking ICP authentication...');
    const client = getAuthClient();
    if (client.isAuthenticated()) {
      console.log('Authenticated in ICP');
      await updateClient(client);
    } else {
      console.log('Not authenticated in ICP');
      setLoading(false);
    }
    if (Object.keys(translations).length === 0) {
      loadTranslations();
    }
  }

  /**
   * Atualiza o estado do client em conformidadade com a autenticação.
   * @param client informação de autenticação a ser usada para atualizar o client.
   */
  async function updateClient(client: AuthClient) {
    const id = await client.getIdentity();
    setIdentity(id);
    setAuthenticated(true);
    const actor = await createActorWithAuth(id);
    console.log('Backend actor created after authentication:', actor);
    setBackend(actor);
    await checkOrRequireProfile(actor, id);
    await loadTranslationsFromBackend(actor);
    setLoading(false);
  }

  /**
   * Realiza o login com o Internet Identity, atualizando o client em caso de sucesso.
   */
  async function login(options: LoginOptions = {}) {
    const client = getAuthClient();
    const maxTimeToLive = options.rememberMe
      ? SESSION_DURATION_NS.rememberMe
      : SESSION_DURATION_NS.standard;

    try {
      await client.signIn({ maxTimeToLive });
      console.log('Authentication Successful');
      await updateClient(client);
      // Redireciona para /dashboard/home após login
      window.location.href = paths.dashboard.home;
    } catch (err) {
      console.error('Login Failed: ', err);
    }
  }

  /**
   * Realiza o logout, limpando o estado do client.
   */
  async function logout() {
    if (authClient) {
      await authClient.signOut();
    }
    resetAuth();
  }

  /**
   * Libera todas as estruturas de autenticação.
   */
  function resetAuth() {
    console.log('resetAuth');
    setAuthenticated(false);
    setIdentity(null);
    setBackend(null);
    setAuthClient(null);
  }

  /**
   * Cria um ator com autenticação.
   * @param id identiidade do usuário autenticado.
   * @returns o ator criado.
   */
  async function createActorWithAuth(id?: Identity): Promise<ActorSubclass<_SERVICE>> {
    const agent = await createIcpAgent(id);
    return createActor(canisterId, { agent });
  }

  /**
   * @returns o provedor de identidade adequado ao ambiente de execução.
   */
  const identityProvider = (): string =>
    // Sempre id.ai real (local e produção) — decisão deliberada após
    // confirmar que o Internet Identity local do icp-cli (`ii: true`) fala
    // um protocolo postMessage incompatível com o handshake ICRC-29 do
    // @icp-sdk/auth atual ("Channel was closed before a response was
    // received", reproduzido de forma consistente). A rede local confia nas
    // assinaturas da mainnet (icp-cli >= 0.2.4), então a delegação do id.ai
    // real valida normalmente contra o canister local. Trade-off aceito: dev
    // local exige internet. Ver plano de migração, Fase 3, para revisitar se
    // o II local do icp-cli for atualizado no futuro.
    'https://id.ai/authorize';

  function getAuthContextValue(): IcpAuthContextValue {
    return {
      loading,
      isAuthenticated: authenticated,
      authenticated,
      unauthenticated: !authenticated,
      user: { id: identity ? identity.getPrincipal().toText() : null },
      checkUserSession: checkAuthenticated,
      login,
      logout,
      loadTranslations,
      identity,
      backend,
      translations: (key: string) => translations[key] || key,
    };
  }

  /* ------------------------------------------------------------------------ */
  /*                                Translation                               */
  /* ------------------------------------------------------------------------ */
  const TRANSLATION_KEY = 'app_translations';

  /**
   * Atualiza as traduções de acordo com o usuário autenticado.
   * Se não houver backend autenticado, cria um actor anônimo.
   */
  async function loadTranslations() {
    if (backend) {
      await loadTranslationsFromBackend(backend);
    } else {
      // Cria um actor anônimo para carregar traduções quando não autenticado
      const anonymousActor = await createActorWithAuth();
      await loadTranslationsFromBackend(anonymousActor);
    }
  }

  /**
   * Carrega traduções diretamente do backend fornecido.
   */
  async function loadTranslationsFromBackend(actor: ActorSubclass<_SERVICE>) {
    try {
      const serverTranslations = await actor.getTranslations();
      const translationMap = Object.fromEntries(serverTranslations);
      localStorage.setItem(TRANSLATION_KEY, JSON.stringify(translationMap));
      setTranslations(translationMap);
    } catch (error) {
      console.error('Erro ao buscar traduções:', error);
    }
  }

  /* ------------------------------------------------------------------------ */
  /*             Criação do Profile no primeiro acesso                        */
  /* ------------------------------------------------------------------------ */

  /**
   * Verifica se o usuário tem profile. Se não tiver, exige criação via diálogo.
   */
  async function checkOrRequireProfile(actor: ActorSubclass<_SERVICE>, id: Identity) {
    const profile = await actor.getMyProfile();
    console.log('Profile loaded:', profile);
    if (!profile || profile.length === 0) {
      // Prepara objeto para criação (usa mesmo form de edição)
      const principalText = id.getPrincipal().toText();
      setPendingProfile({ ...BLANK_PROFILE, principal: principalText });
      setMustCreateProfile(true);
    } else {
      setMustCreateProfile(false);
      setPendingProfile(null);
    }
  }

  const handleSaveProfile = async (data: ProfileType) => {
    if (!backend) return;
    const result = await backend.addMyProfile(tsToIcp(data));
    if ('ok' in result) {
      setMustCreateProfile(false);
      setPendingProfile(null);
      // Notifica outros componentes e atualiza traduções
      window.dispatchEvent(new Event('profile:updated'));
      await loadTranslations();
    } else {
      // Mantém o diálogo aberto; erros podem ser exibidos pelo próprio form via Alert do app
      console.error('Erro ao criar profile:', result.err);
    }
  };

  const handleCancelProfile = async () => {
    // Impede prosseguir sem profile: realiza logout
    setMustCreateProfile(false);
    setPendingProfile(null);
    await logout();
  };

  return (
    <AuthContext.Provider value={getAuthContextValue()}>
      {children}
      <Dialog
        open={mustCreateProfile}
        fullWidth
        maxWidth="sm"
        onClose={handleCancelProfile}
        disableEscapeKeyDown
      >
        <DialogTitle>
          {(translations && translations['create']) || 'Create'}{' '}
          {translations && translations['profile']}
        </DialogTitle>
        <DialogContent>
          {pendingProfile && (
            <SimpleProfileForm
              profile={pendingProfile}
              onSave={handleSaveProfile}
              onCancel={handleCancelProfile}
              translations={translations}
            />
          )}
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
};

export const useIcpContext = () => useContext(AuthContext);
