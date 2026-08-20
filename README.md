# zenplate

Template base para novos projetos do ecossistema `icp-workspace`: backend Motoko sobre a biblioteca [`cached-db`](https://github.com/walacemaia/cacheddb) (padrão DAO/Service/`XxxxDatabase`/`admin`) + frontend React/MUI (formulários, grids, autenticação via Internet Identity), sem nenhum conteúdo de domínio de produto.

Extraído do [Zenquest](https://github.com/walacemaia/zenquest) — aplicação de referência do ecossistema — removendo o conteúdo de domínio de produto (quiz/exame/plano de estudo) e mantendo só a infraestrutura genérica. Essa extração foi um trabalho pontual, não é uma relação de manutenção contínua entre os dois repositórios: `zenplate` não é atualizado automaticamente quando o Zenquest evolui.

## O que este template já traz

- **Backend**: `main.mo` com a espinha dorsal de autenticação/autorização, `ProfileDAO`/`ConfigurationDAO`/`ImageDAO` (identidade, configuração singleton, blobs), `admin/` (backup, manutenção, controle de cache, reparo, auditoria de integridade referencial), `translation/IcpAppTranslator.mo` (mecanismo de tradução `CoreTranslator`, dicionário vazio).
- **Frontend**: layout/tema/rotas genéricos, autenticação Internet Identity, páginas de admin (backup, configuração, perfis), kit de componentes reutilizáveis (`PersistentDataGrid`, `EntityCardList`, wrapper `Form`, `executeBackendAction`).

## O que NÃO está pronto (propositalmente)

- `migration.mo` está no formato mínimo/no-op — ainda não passou por nenhuma migração de schema real.
- Não há suíte de diagnóstico de integridade referencial (`dev/ReferentialIntegrityDevSuite.mo`) — precisa ser escrita quando o conjunto de DAOs do novo projeto estiver definido, cobrindo as entidades que o projeto realmente vai ter.
- `.icp/data/` (mapeamento de canister IDs de mainnet) não existe neste template — é gerado pelo `icp deploy` no primeiro deploy contra mainnet do novo projeto.
- Domínio customizado (`src/frontend/src/.well-known/ic-domains`) está vazio — configurar apenas se o projeto for publicar em domínio próprio.

## Como usar

Para criar um projeto novo a partir deste template, ver o skill [`criar-aplicacao-do-template.md`](https://github.com/walacemaia/zen-skills/blob/main/skills/criar-aplicacao-do-template.md) do repositório [`zen-skills`](https://github.com/walacemaia/zen-skills): rename mecânico de identidade (`IcpApp`/`icp_app`/`ICP_APP` → o nome do projeto novo), seguido de `mops install`, `npm install`, `icp deploy` e `sync-skills` para popular `.ai/zen/`.

## Ferramentas / setup local

Este projeto usa [`icp-cli`](https://github.com/dfinity/icp-cli) (não `dfx`) para build/deploy. Instalação e comandos básicos:

```bash
npm install -g @icp-sdk/icp-cli @icp-sdk/ic-wasm   # requer Node >= 18
mops install                                        # dependências Motoko
npm install                                          # dependências do frontend (workspace)
icp network start -d                                 # rede local
icp deploy                                           # build + deploy dos canisters
```

Login via Internet Identity, local e em produção, sempre aponta para `https://id.ai/authorize` (não usa Internet Identity local via `ii: true` — incompatibilidade de protocolo confirmada entre o II local empacotado pelo `icp-cli` e o `@icp-sdk/auth` atual; detalhes na skill [`migracao-dfx-para-icp-cli.md`](https://github.com/walacemaia/zen-skills/blob/main/skills/migracao-dfx-para-icp-cli.md) do `zen-skills`). Login local, portanto, exige conexão com a internet.
