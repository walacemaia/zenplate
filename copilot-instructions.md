# Instrucoes ICP para este projeto (zenplate)

As diretrizes gerais do ecossistema icp-workspace (skills oficiais da Internet Computer, arquitetura de backend/frontend, governanca de traducoes) sao sincronizadas a partir do repositorio `zen-skills` e vivem em `.ai/zen/` — nao editar manualmente, esses arquivos sao sobrescritos por `scripts/sync-skills.sh` do `zen-skills`:

- [.ai/zen/icp-skills-oficiais.md](.ai/zen/icp-skills-oficiais.md) — roteamento para as skills oficiais da Internet Computer (icp-cli/dfx, motoko, canister-security, stable-memory, multi-canister)
- [.ai/zen/arquitetura-backend.md](.ai/zen/arquitetura-backend.md) — camadas Motoko (`main.mo`/`services/`/`XxxxDatabase`/DAOs/`admin/`, padroes de upgrade)
- [.ai/zen/arquitetura-frontend.md](.ai/zen/arquitetura-frontend.md) — formularios, grids, conversoes, submit
- [.ai/zen/traducao.md](.ai/zen/traducao.md) — governanca de `CoreTranslator`/`IcpAppTranslator`
- [.ai/zen/criar-aplicacao-do-template.md](.ai/zen/criar-aplicacao-do-template.md) — como criar um projeto novo a partir deste template (rename de identidade)

Regra de governanca: solicitar autorizacao explicita do usuario sempre que alguma implementacao precisar violar as diretrizes desses guias.

## Regras especificas deste template

- Este e o `zenplate`: um esqueleto sem conteudo de dominio de produto, extraido do Zenquest (trabalho pontual — nao ha atualizacao automatica entre os dois). Ao usar este repositorio como base para um projeto novo, seguir `.ai/zen/criar-aplicacao-do-template.md` (renomear `IcpApp`/`icp_app`/`ICP_APP` para o nome real do projeto antes de adicionar features).
- Este repositorio ainda usa `dfx` no estado atual. Qualquer migracao para `icp-cli` deve ocorrer em branch dedicada.
- Regras de negocio locais do projeto (quando existirem, alem das diretrizes gerais acima) vao em `.ai/app/`.
