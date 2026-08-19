import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import dotenv from 'dotenv';
import environment from 'vite-plugin-environment';
import { VitePWA } from 'vite-plugin-pwa';

// Carrega variáveis de ambiente
dotenv.config({ path: '../../.env' });

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    environment('all', { prefix: 'CANISTER_' }),
    environment('all', { prefix: 'DFX_' }),
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
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4943',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
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
        '**/declarations/**', // Ignora a pasta gerada pelo DFX
      ],
    },
  },
  resolve: {
    alias: [
      {
        find: 'declarations',
        replacement: path.resolve(__dirname, '../declarations'),
      },
      {
        find: /^src\/(.+)/,
        replacement: path.resolve(__dirname, 'src/$1'),
      },
    ],
    dedupe: ['@dfinity/agent', 'react', 'react-dom'],
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
}));
