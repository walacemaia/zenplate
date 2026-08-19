import React from 'react';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import { icpToTs } from 'src/icpadapters/ProfileAdapter';

import { useIcpContext } from 'src/auth/context/icp/icp-context-provider';

// ----------------------------------------------------------------------

type ProfileAvatarProps = {
  /** Tamanho do avatar em pixels */
  avatarSize?: number;
  /** Mostrar nome de exibição */
  showDisplayName?: boolean;
  /** Mostrar email */
  showEmail?: boolean;
  /** Variante do nome */
  nameVariant?: 'subtitle1' | 'h6' | 'body1' | 'body2';
  /** Callback executado após carregar o profile */
  onLoad?: (data: { avatar: string | null; displayName: string; email: string }) => void;
  /** Forçar recarregamento quando esta prop mudar */
  reload?: any;
};

const PROFILE_CACHE_KEY = 'profile_avatar_cache';

type ProfileCache = {
  avatar: string | null;
  displayName: string;
  email: string;
  isAdmin: boolean;
};

export function ProfileAvatar({
  avatarSize = 96,
  showDisplayName = true,
  showEmail = true,
  nameVariant = 'subtitle1',
  onLoad,
  reload,
}: ProfileAvatarProps) {
  const { backend } = useIcpContext();
  const [avatar, setAvatar] = React.useState<string | null>(null);
  const [displayName, setDisplayName] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>('');

  // const bytesToBase64 = (bytes: Uint8Array) => {
  //   let binary = '';
  //   const chunkSize = 0x8000;
  //   for (let i = 0; i < bytes.length; i += chunkSize) {
  //     binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  //   }
  //   return btoa(binary);
  // };

  const loadFromCache = (): ProfileCache | null => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  };

  const saveToCache = (data: ProfileCache) => {
    try {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Erro ao salvar cache do profile:', e);
    }
  };

  const loadProfileFromBackend = React.useCallback(async () => {
    try {
      if (!backend) {
        // aguarda contexto de autenticação inicializar
        return;
      }
      // const profile = (await backend.getMyProfile())[0];
      const myProf = (await backend.getMyProfile())[0] || undefined;

      if (!myProf) {
        console.error('getMyProfile retornou vazio em uma rota que exige profile.');
        throw new Error('Perfil não encontrado.');
      }

      const profile = icpToTs(myProf);

      if (profile) {
        const name = profile.displayName;
        const mail = profile.email;

        let avatarUrl: string | null = null;
        if (profile.avatar && profile.avatar.length > 0) {
          // const bytes = new Uint8Array(profile.avatar[0] as ArrayBuffer | Uint8Array);
          const base64 = profile.avatar;
          avatarUrl = `data:image/png;base64,${base64}`;
        }
        const data: ProfileCache = {
          avatar: avatarUrl,
          displayName: name ?? '',
          email: mail ?? '',
          isAdmin: profile.role == 'admin',
        };
        setAvatar(avatarUrl);
        setDisplayName(data.displayName);
        setEmail(data.email);
        saveToCache(data);
        onLoad?.(data);
      }
    } catch (e) {
      console.error('Erro ao carregar profile:', e);
    }
  }, [backend, onLoad]);

  // Carrega do cache e, assim que backend estiver pronto, recarrega do backend
  React.useEffect(() => {
    const cached = loadFromCache();
    if (cached) {
      setAvatar(cached.avatar);
      setDisplayName(cached.displayName);
      setEmail(cached.email);
      onLoad?.(cached);
    }
    if (backend) {
      loadProfileFromBackend();
    }
  }, [backend, loadProfileFromBackend]);

  // Listener para atualizar quando o profile for salvo
  React.useEffect(() => {
    const handler = () => {
      console.log('Evento profile:updated recebido em profile-avatar');
      loadProfileFromBackend();
    };
    window.addEventListener('profile:updated', handler);
    return () => window.removeEventListener('profile:updated', handler);
  }, [loadProfileFromBackend]);

  // Recarrega se a prop reload mudar
  React.useEffect(() => {
    if (reload !== undefined) {
      loadProfileFromBackend();
    }
  }, [reload, loadProfileFromBackend]);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'column',
        textAlign: 'center',
      }}
    >
      <Avatar
        src={avatar || undefined}
        alt={displayName}
        sx={{ width: avatarSize, height: avatarSize, mb: showDisplayName || showEmail ? 0.5 : 0 }}
      >
        {displayName?.charAt(0).toUpperCase()}
      </Avatar>

      {showDisplayName && (
        <Typography variant={nameVariant} noWrap sx={{ mt: 0 }}>
          {displayName}
        </Typography>
      )}

      {showEmail && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 3 }} noWrap>
          {email}
        </Typography>
      )}
    </Box>
  );
}

// Retorna o cache bruto (ou null se não existir / inválido)
export function getCachedProfile(): ProfileCache | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProfileCache;
  } catch {
    return null;
  }
}

// Retorna se usuário é admin com base no cache
export function isAdmin(): boolean {
  return getCachedProfile()?.isAdmin === true;
}
