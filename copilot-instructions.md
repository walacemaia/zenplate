# Instrucoes ICP para este projeto (icp-template)

As diretrizes gerais do ecossistema icp-workspace (skills oficiais da Internet Computer, arquitetura de backend/frontend, governanca de traducoes) sao sincronizadas a partir do repositorio `icp-skills` e vivem em `.ai/icp/` — nao editar manualmente, esses arquivos sao sobrescritos por `scripts/sync-skills.sh` do `icp-skills`:

- [.ai/icp/icp-skills-oficiais.md](.ai/icp/icp-skills-oficiais.md) — roteamento para as skills oficiais da Internet Computer (icp-cli/dfx, motoko, canister-security, stable-memory, multi-canister)
- [.ai/icp/arquitetura-backend.md](.ai/icp/arquitetura-backend.md) — camadas Motoko (`main.mo`/`services/`/`XxxxDatabase`/DAOs/`admin/`, padroes de upgrade)
- [.ai/icp/arquitetura-frontend.md](.ai/icp/arquitetura-frontend.md) — formularios, grids, conversoes, submit
- [.ai/icp/traducao.md](.ai/icp/traducao.md) — governanca de `CoreTranslator`/`IcpAppTranslator`
- [.ai/icp/criar-aplicacao-do-template.md](.ai/icp/criar-aplicacao-do-template.md) — como criar um projeto novo a partir deste template (rename de identidade)

Regra de governanca: solicitar autorizacao explicita do usuario sempre que alguma implementacao precisar violar as diretrizes desses guias.

## Regras especificas deste template

- Este e o `icp-template`: um esqueleto sem conteudo de dominio de produto, extraido do Zenquest (trabalho pontual — nao ha atualizacao automatica entre os dois). Ao usar este repositorio como base para um projeto novo, seguir `.ai/icp/criar-aplicacao-do-template.md` (renomear `IcpApp`/`icp_app`/`ICP_APP` para o nome real do projeto antes de adicionar features).
- Este repositorio ainda usa `dfx` no estado atual. Qualquer migracao para `icp-cli` deve ocorrer em branch dedicada.
- Regras de negocio locais do projeto (quando existirem, alem das diretrizes gerais acima) vao em `.ai/app/`.
