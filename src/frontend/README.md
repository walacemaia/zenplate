> **Nota histórica**: este arquivo documenta a fusão original entre o template Minimal UI e o template ICP (época em que o projeto ainda usava `dfx`). Os blocos de código abaixo (`dfx generate`, `@dfinity/*`, proxy na porta `4943`, etc.) são um registro de como essa fusão foi feita, **não** refletem a configuração atual — o projeto migrou para `icp-cli`/`@icp-sdk/core` (ver `README.md` da raiz e a skill `migracao-dfx-para-icp-cli.md` do `zen-skills`).

## Prerequisites

- Node.js 20.x (Recommended)

## Installation

**Using Yarn (Recommended)**

```sh
yarn install
yarn dev
```

**Using Npm**

```sh
npm i
npm run dev
```

## Build

```sh
yarn build
# or
npm run build
```

## Mock server

By default we provide demo data from : `https://api-dev-minimal-[version].vercel.app`

To set up your local server:

- **Guide:** [https://docs.minimals.cc/mock-server](https://docs.minimals.cc/mock-server).

- **Resource:** [Download](https://www.dropbox.com/sh/6ojn099upi105tf/AACpmlqrNUacwbBfVdtt2t6va?dl=0).

## Full version

- Create React App ([migrate to CRA](https://docs.minimals.cc/migrate-to-cra/)).
- Next.js
- Vite.js

## Starter version

- To remove unnecessary components. This is a simplified version ([https://starter.minimals.cc/](https://starter.minimals.cc/))
- Good to start a new project. You can copy components from the full version.
- Make sure to install the dependencies exactly as compared to the full version.

---

**NOTE:**
_When copying folders remember to also copy hidden files like .env. This is important because .env files often contain environment variables that are crucial for the application to run correctly._

---

## Combinação das configurações ICP x Minimal Template

A estratégia para combinação é incluir os arquivos do template Minimal nas pastas de um projeto ICP existente.
O template deve ser incluído no caminho src/xxx_frontend onde alguns arquivos precisam ser combinados ou substituídos para que as configurações do ICP e Minimal coexistam.

### src/xxx_frontend/index.html

Substitua pelo arquivo do template Minimal.

### src/xxx_frontend/pacakge.json

#### Anterior (ICP)

```Json
{
  "name": "icp_app_frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "setup": "npm i && dfx canister create icp_app_backend && dfx generate icp_app_backend && dfx deploy",
    "start": "vite --port 3000",
    "prebuild": "dfx generate",
    "build": "tsc && vite build",
    "format": "prettier --write \"src/**/*.{json,js,jsx,ts,tsx,css,scss}\""
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@dfinity/agent": "^2.1.3",
    "@dfinity/candid": "^2.1.3",
    "@dfinity/principal": "^2.1.3"
  },
  "devDependencies": {
    "@types/react": "^18.2.14",
    "@types/react-dom": "^18.2.6",
    "@vitejs/plugin-react": "^4.0.1",
    "dotenv": "^16.3.1",
    "sass": "^1.63.6",
    "typescript": "^5.1.3",
    "vite": "^4.3.9",
    "vite-plugin-environment": "^1.1.3"
  }
}
```

#### Combinado

```Json
{
  "name": "icp_app_frontend",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "scripts": {
    "setup": "npm install && dfx canister create icp_app_backend && dfx generate icp_app_backend && dfx deploy",
    "start": "vite --port 3000",
    "build": "tsc && vite build",
    "dev": "dfx start --background && npm run build && dfx deploy",
    "vite": "vite",
    "format": "prettier --write \"src/**/*.{json,js,jsx,ts,tsx,css,scss}\"",
    "lint": "eslint \"src/**/*.{js,jsx,ts,tsx}\"",
    "lint:fix": "eslint --fix \"src/**/*.{js,jsx,ts,tsx}\"",
    "test": "npm test"
  },
  "workspaces": [
    "src/frontend"
  ],
  "dependencies": {
    "@dfinity/agent": "^2.1.3",
    "@dfinity/candid": "^2.1.3",
    "@dfinity/principal": "^2.1.3",
    "@emotion/cache": "^11.14.0",
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.0",
    "@fontsource-variable/dm-sans": "^5.1.1",
    "@fontsource-variable/inter": "^5.1.1",
    "@fontsource-variable/nunito-sans": "^5.1.1",
    "@fontsource-variable/public-sans": "^5.1.2",
    "@fontsource/barlow": "^5.1.1",
    "@hookform/resolvers": "^3.9.1",
    "@iconify-json/solar": "^1.2.2",
    "@iconify/react": "^5.1.0",
    "@mui/lab": "^6.0.0-beta.21",
    "@mui/material": "^6.3.0",
    "@mui/x-data-grid": "^7.23.5",
    "@mui/x-date-pickers": "^7.23.3",
    "@mui/x-tree-view": "^7.23.2",
    "autosuggest-highlight": "^3.3.4",
    "axios": "^1.7.9",
    "dayjs": "^1.11.13",
    "es-toolkit": "^1.31.0",
    "framer-motion": "^11.15.0",
    "minimal-shared": "^1.0.5",
    "nprogress": "^0.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-helmet-async": "^2.0.5",
    "react-hook-form": "^7.54.2",
    "react-router": "^7.1.1",
    "simplebar-react": "^3.3.0",
    "stylis": "^4.3.4",
    "stylis-plugin-rtl": "^2.1.1",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.17.0",
    "@types/autosuggest-highlight": "^3.2.3",
    "@types/dotenv": "^6.1.1",
    "@types/node": "^22.10.7",
    "@types/nprogress": "^0.2.3",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@types/stylis": "^4.2.7",
    "@typescript-eslint/parser": "^8.19.0",
    "@vitejs/plugin-react-swc": "^3.7.2",
    "dotenv": "^16.4.7",
    "eslint": "^9.17.0",
    "eslint-import-resolver-typescript": "^3.7.0",
    "eslint-plugin-import": "^2.31.0",
    "eslint-plugin-perfectionist": "^4.4.0",
    "eslint-plugin-react": "^7.37.3",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-unused-imports": "^4.1.4",
    "globals": "^15.14.0",
    "prettier": "^3.4.2",
    "typescript": "^5.7.2",
    "typescript-eslint": "^8.19.0",
    "vite": "^6.0.6",
    "vite-plugin-checker": "^0.8.0",
    "vite-plugin-environment": "^1.1.3"
  }
}
```

### src/xxx_frontend/tsconfig.json

#### Anterior (ICP)

```Json
{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

#### Combinado

```Json
{
  "compilerOptions": {
    /* ICP */
    "useDefineForClassFields": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["vite/client", "node"],

    /* Bundler */
    "baseUrl": ".",
    "module": "ESNext",
    "jsx": "react-jsx",
    "allowJs": true,
    "resolveJsonModule": true,

    /* Build */
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "incremental": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "isolatedModules": true,

    /* Linting */
    "strict": true,
    "noEmit": true,
    "strictNullChecks": true
  },
  "include": ["src"],
  "exclude": ["node_modules"],
  "references": [
    {
      "path": "./tsconfig.node.json"
    }
  ]
}
```

### src/xxx_frontend/vite.config.js

Remover o arquivo.

```js
import { fileURLToPath, URL } from 'url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import environment from 'vite-plugin-environment';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export default defineConfig({
  build: {
    emptyOutDir: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4943',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    environment('all', { prefix: 'CANISTER_' }),
    environment('all', { prefix: 'DFX_' }),
  ],
  resolve: {
    alias: [
      {
        find: 'declarations',
        replacement: fileURLToPath(new URL('../declarations', import.meta.url)),
      },
    ],
    dedupe: ['@dfinity/agent'],
  },
});
```

### src/xxx_frontend/vite.config.ts

Neste arquivo introduzimos as configurações de vite.config.js e vite.config.ts (Minimal).

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import dotenv from 'dotenv';
import environment from 'vite-plugin-environment';

// Carrega variáveis de ambiente
dotenv.config({ path: '../../.env' });

export default defineConfig({
  plugins: [
    react(),
    environment('all', { prefix: 'CANISTER_' }),
    environment('all', { prefix: 'DFX_' }),
  ],

  build: {
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4943',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
    port: 8081,
    host: '127.0.0.1', // Define explicitamente o host
    strictPort: true, // Evita fallback para outra porta se a 8081 estiver ocupada
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
    dedupe: ['@dfinity/agent'],
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
});
```

### src/XXX_frontend/public/.ic-assets.json5

Neste arquivo precisamos ampliar alguns acessos para o template funcionar sem alterações. **Estas alterações devem ser revistas para uma aplicação real**.

#### Anterior (ICP)

```Json
"Content-Security-Policy": "default-src 'self';script-src 'self';connect-src 'self' http://localhost:* https://icp0.io https://*.icp0.io https://icp-api.io;img-src 'self' data:;style-src * 'unsafe-inline';style-src-elem * 'unsafe-inline';font-src *;object-src 'none';base-uri 'self';frame-ancestors 'none';form-action 'self';upgrade-insecure-requests;",
```

#### Alterado

```Json
"Content-Security-Policy": "default-src 'self';script-src 'self';connect-src 'self' http://localhost:* https://icp0.io https://*.icp0.io https://icp-api.io;img-src 'self' data:;style-src * 'unsafe-inline';style-src-elem * 'unsafe-inline';font-src *;object-src 'none';base-uri 'self';frame-ancestors 'none';form-action 'self';upgrade-insecure-requests;",
```

### Registro de domínio customizado (opcional)

Se o projeto for publicar um domínio próprio (ex.: `meuapp.com`), registrar via `https://icp0.io/registrations` (ver [documentação oficial do IC](https://internetcomputer.org/docs/current/developer-docs/production/custom-domain/)) e listar o domínio em `src/.well-known/ic-domains`. Este template não traz nenhum domínio pré-registrado.
