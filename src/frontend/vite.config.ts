import type { ServerOptions } from 'vite';

import { execSync } from 'child_process';

import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';
import { icpBindgen } from '@icp-sdk/bindgen/plugins/vite';

const ICP_ENVIRONMENT = process.env.ICP_ENVIRONMENT || 'local';
const CANISTER_NAMES = ['icp_app_backend'];

type NetworkStatus = {
  api_url: string;
  root_key: string;
};

function icpCli(args: string): string {
  return execSync(`icp ${args} -e ${ICP_ENVIRONMENT}`, { encoding: 'utf-8', stdio: 'pipe' }).trim();
}

// Cookie `ic_env` + proxy `/api` para simular, em `vite dev`, o que o
// canister de assets já expõe em produção (ver src/lib/icp-agent.ts). Lê o
// estado da rede local via `icp network status`/`icp canister status` — só
// deve rodar quando `command === 'serve'` (nunca em build). Se a rede local
// não estiver no ar, cai para a porta default do gateway (8000) sem cookie:
// `safeGetCanisterEnv()` retorna `undefined` e o app segue com root key
// default do @icp-sdk/core (funciona para builds locais sem backend, mas
// chamadas de actor vão falhar até `icp network start -d` rodar).
function getDevServerConfig(): ServerOptions {
  try {
    const networkStatus = JSON.parse(icpCli('network status --json')) as NetworkStatus;
    const canisterParams = CANISTER_NAMES.map(
      (name) => `PUBLIC_CANISTER_ID:${name}=${icpCli(`canister status ${name} --id-only`)}`
    ).join('&');
    const cookieValue = `${canisterParams}&ic_root_key=${networkStatus.root_key}`;

    return {
      headers: {
        'Set-Cookie': `ic_env=${encodeURIComponent(cookieValue)}; SameSite=Lax`,
      },
      proxy: {
        // Sem `rewrite`: o gateway real do replica já serve a API em
        // `/api/v2|v3/...` (confirmado com curl direto no gateway local) — o
        // agent do @icp-sdk/core já constrói as URLs com esse prefixo, então
        // o proxy deve encaminhar o path como está, não removê-lo.
        '/api': {
          target: networkStatus.api_url,
          changeOrigin: true,
        },
      },
    };
  } catch {
    console.warn(
      '[vite.config] icp network indisponível — rode `icp network start -d` && `icp deploy` antes de `npm run dev` para autenticação e chamadas de actor funcionarem.'
    );
    return {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    };
  }
}

export default defineConfig(({ mode, command }) => ({
  plugins: [
    react(),
    icpBindgen({
      didFile: '../../.mops/.build/icp_app_backend.did',
      outDir: './src/generated',
      // Não usamos a classe/actor gerado pelo bindgen (mantemos o wrapper
      // manual em lib/icp-app-backend-client.ts — ver Decisão 4 do plano de
      // migração) — só idlFactory/_SERVICE, então desabilita o arquivo extra.
      output: { actor: { disabled: true } },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      // IMPORTANTE: para funcionar também em npm run dev
      devOptions: {
        enabled: true,
      },
      // Registramos o SW manualmente em src/utils/pwa-auto-update.ts (auto-reload).
      injectRegister: false,
      manifest: {
        name: 'IcpApp',
        short_name: 'IcpApp',
        description: 'Aprendendo com tranquilidade.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#6b46c1',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/logo/logo-single-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/logo/logo-single-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],

  build: {
    outDir: 'dist',
    sourcemap: mode !== 'production',
    emptyOutDir: true,
  },
  server: {
    fs: {
      allow: [
        // Permite acesso aos fontes e node_modules da raiz
        '../../node_modules',
        // Diretório do frontend
        '.',
      ],
    },
    // port: 8081,
    // host: "127.0.0.1", // Define explicitamente o host
    // strictPort: true,  // Evita fallback para outra porta se a 8081 estiver ocupada
    watch: {
      usePolling: true,
      //useFsEvents: true, // Ativa o uso de eventos nativos
      interval: 2000, // Define o intervalo em milissegundos
      ignored: [
        '**/node_modules/**', // Ignora a pasta node_modules
        '**/dist/**', // Ignora a pasta de saída
        '**/generated/**', // Ignora a pasta gerada pelo bindgen
      ],
    },
    ...(command === 'serve' ? getDevServerConfig() : {}),
  },
  resolve: {
    alias: [
      {
        find: /^src\/(.+)/,
        replacement: path.resolve(__dirname, 'src/$1'),
      },
    ],
    dedupe: ['@icp-sdk/core', 'react', 'react-dom'],
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
}));
