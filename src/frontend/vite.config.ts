import type { Plugin, ServerOptions } from 'vite';

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

// Cookie `ic_env` para simular, em `vite dev`, o que o canister de assets já
// expõe em produção (ver src/lib/icp-agent.ts).
//
// Achado real crítico: um `server.headers` estático (como fazíamos antes)
// NÃO sobrevive a uma resposta `304 Not Modified` do Vite — o navegador manda
// `If-None-Match` no documento, o Vite responde 304, e o `Set-Cookie` custom
// some dessa resposta (confirmado com curl reproduzindo o 304). Resultado:
// depois da primeira carga, `canisterId` fica `undefined` pra sempre — crash
// síncrono e não capturado em `Actor.createActor`, sem nenhuma chamada de
// rede nova, sintoma de tela de carregamento infinita. Corrigido com um
// middleware de verdade via `configureServer`, que seta o cookie manualmente
// e força `Cache-Control: no-store` na mesma resposta (impede o Vite de
// decidir por um 304 nesse meio tempo).
//
// Só roda na navegação de página em si (`Sec-Fetch-Mode: navigate`, enviado
// por navegadores modernos só em navegação de topo) — rodar os `icp` a cada
// sub-recurso (JS/CSS servidos sem bundle em dev) derruba a performance
// (~20s de carga em vez de instantânea, confirmado numa migração real).
//
// Ver .ai/zen/migracao-dfx-para-icp-cli.md (zen-skills, Fase 5) para o
// achado completo, incluindo a parte de Service Worker/PWA abaixo.
function icpDevEnvPlugin(): Plugin {
  return {
    name: 'icp-dev-env-cookie',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const isNavigation =
          req.headers['sec-fetch-mode'] === 'navigate' ||
          (req.headers.accept?.includes('text/html') ?? false);
        if (!isNavigation) {
          next();
          return;
        }
        try {
          const networkStatus = JSON.parse(icpCli('network status --json')) as NetworkStatus;
          const canisterParams = CANISTER_NAMES.map(
            (name) => `PUBLIC_CANISTER_ID:${name}=${icpCli(`canister status ${name} --id-only`)}`
          ).join('&');
          const cookieValue = `${canisterParams}&ic_root_key=${networkStatus.root_key}`;
          res.setHeader('Set-Cookie', `ic_env=${encodeURIComponent(cookieValue)}; SameSite=Lax`);
          res.setHeader('Cache-Control', 'no-store');
        } catch {
          console.warn(
            '[vite.config] icp network indisponível — rode `icp network start -d` && `icp deploy` antes de `npm run dev` para autenticação e chamadas de actor funcionarem.'
          );
        }
        next();
      });
    },
  };
}

// Proxy `/api` — separado do cookie porque precisa valer pra toda requisição
// `/api/*`, não só navegação. Sem `rewrite`: o gateway real do replica já
// serve a API em `/api/v2|v3/...` (confirmado com curl direto no gateway
// local) — o agent do @icp-sdk/core já constrói as URLs com esse prefixo,
// então o proxy deve encaminhar o path como está, não removê-lo.
function getDevServerProxy(): ServerOptions {
  try {
    const networkStatus = JSON.parse(icpCli('network status --json')) as NetworkStatus;
    return {
      proxy: {
        '/api': {
          target: networkStatus.api_url,
          changeOrigin: true,
        },
      },
    };
  } catch {
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
    ...(command === 'serve' ? [icpDevEnvPlugin()] : []),
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
        // O modo dev do generateSW tem seu próprio fallback de navegação,
        // separado do `workbox` abaixo — default intercepta a rota `/`
        // mesmo com `navigateFallback: undefined` em produção. Sem isso, o
        // cookie ic_env nunca chega em `vite dev` (ver Fase 5 da skill).
        navigateFallbackAllowlist: [],
      },
      // Registramos o SW manualmente em src/utils/pwa-auto-update.ts (auto-reload).
      injectRegister: false,
      workbox: {
        // O cookie ic_env só chega numa resposta de rede real. Pré-cachear o
        // index.html e servir a navegação via SW (default do generateSW)
        // faz o cookie nunca ser atualizado. O fallback de SPA já é coberto
        // pelo `_redirects` do canister (ver Fase 1), então não precisamos
        // que o SW sirva o index.html — toda navegação vai sempre pra rede.
        navigateFallback: undefined,
        globIgnores: ['**/index.html'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkOnly',
          },
        ],
      },
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
    ...(command === 'serve' ? getDevServerProxy() : {}),
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
