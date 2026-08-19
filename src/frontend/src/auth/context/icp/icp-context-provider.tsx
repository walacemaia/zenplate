import type { AuthContextValue } from 'src/auth/types';
import type { _SERVICE } from '@backend/icp_app_backend.did';
import type { Identity, ActorSubclass } from '@dfinity/agent';

import { HttpAgent } from '@dfinity/agent';
import { AuthClient } from '@icp-sdk/auth/client';
import React, { useState, useEffect, useContext, createContext } from 'react';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { paths } from 'src/routes/paths';

import { tsToIcp, BLANK_PROFILE, type ProfileType } from 'src/icpadapters/ProfileAdapter';

import { SimpleProfileForm } from './simple-profile-form';
import { canisterId, createActor } from '../../../../../declarations/icp_app_backend';

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

  async function getAuthClient() {
    if (authClient == null) {
      // O IdleManager padrao do @icp-sdk/auth desloga o usuario apos
      // 10 min de inatividade (mouse/teclado/touch) e ainda chama
      // window.location.reload(), o que quebra o "lembrar de mim" e torna
      // a sessao de 8h/30d inconsistente. Aqui desativamos o idle para que
      // a duracao da sessao seja governada exclusivamente por maxTimeToLive.
      const client = await AuthClient.create({
        idleOptions: {
          disableIdle: true,
          disableDefaultIdleCallback: true,
        },
      });
      if (client == null) {
        throw new Error('AuthClient not created in ICP');
      }
      setAuthClient(client);
      return client;
    }
    return authClient;
  }

  async function checkAuthenticated() {
    console.log('Checking ICP authentication...');
    const client = await getAuthClient();
    if (await client.isAuthenticated()) {
      console.log('Authenticated in ICP');
      updateClient(client);
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
    const id = client.getIdentity();
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
    const client = await getAuthClient();

    // Calcula posição centralizada para a janela de login
    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const maxTimeToLive = options.rememberMe
      ? SESSION_DURATION_NS.rememberMe
      : SESSION_DURATION_NS.standard;

    await client.login({
      identityProvider: identityProvider(),
      maxTimeToLive,
      windowOpenerFeatures: `toolbar=0,location=0,menubar=0,width=${width},height=${height},left=${left},top=${top}`,
      onSuccess: async () => {
        console.log('Authentication Successful');
        await updateClient(client);
        // Redireciona para /dashboard/home após login
        window.location.href = paths.dashboard.home;
      },
      onError: (err) => console.error('Login Failed: ', err),
    });
  }

  /**
   * Realiza o logout, limpando o estado do client.
   */
  async function logout() {
    if (authClient) {
      await authClient.logout();
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
    // Define o host com base no ambiente
    const isProduction = process.env.DFX_NETWORK === 'ic';

    // Without personalized domain
    // const host = isProduction ? 'https://icp0.io' : 'http://127.0.0.1:4943';

    // With personalized domain
    const host = isProduction ? 'https://icp-api.io' : 'http://127.0.0.1:4943';

    console.log('Produção = ' + isProduction);
    console.log('Host = ' + host);

    let agent: HttpAgent;
    if (id) {
      console.log('Creating actor with id: ', id);
      agent = await HttpAgent.create({ host, identity: id });
      //      new HttpAgent({ host, identity: id });
    } else {
      console.log('Creating actor without id');
      agent = await HttpAgent.create({ host });
    }

    // Para desenvolvimento: obtém o root key (necessário na réplica local)
    if (!isProduction) {
      await agent.fetchRootKey();
    }
    return createActor(canisterId, { agent });
  }

  // /**
  //  * @returns o provedor de identidade adequado ao ambiente de execução.
  //  */
  // const identityProvider = () => {
  //   if (process.env.DFX_NETWORK === 'local') {
  //     return `http://${process.env.CANISTER_ID_INTERNET_IDENTITY}.localhost:4943`;
  //   } else if (process.env.DFX_NETWORK === 'ic') {
  //     return 'https://identity.ic0.app';
  //   } else {
  //     return `https://${process.env.CANISTER_ID_INTERNET_IDENTITY}.dfinity.network`;
  //   }
  // };
  const identityProvider = (): string => {
    // Local: usa o II local (DFX)
    if (process.env.DFX_NETWORK === 'local') {
      return `http://${process.env.CANISTER_ID_INTERNET_IDENTITY}.localhost:4943`;
    }
    // Produção / outros ambientes: força o II 2.0 (id.ai)
    // Isso cobre 'ic' e também 'staging'/'production' customizados.
    return 'https://id.ai/authorize';
  };

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
