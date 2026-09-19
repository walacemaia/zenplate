# Instrucoes para agentes de IA — zenplate

Arquivo canonico de instrucoes deste repositorio. `CLAUDE.md` e
`.github/copilot-instructions.md` sao apenas roteadores que apontam para ca:
conteudo novo entra neste arquivo ou em `.ai/app/`, nunca duplicado nos roteadores.

## Regras especificas deste template

- Este e o `zenplate`: um esqueleto sem conteudo de dominio de produto, extraido do Zenquest (trabalho pontual — nao ha atualizacao automatica entre os dois). Ao usar este repositorio como base para um projeto novo, seguir a skill `zen-criar-aplicacao-do-template` (renomear `IcpApp`/`icp_app`/`ICP_APP` para o nome real do projeto antes de adicionar features).
- Este repositorio usa `icp-cli` (`icp.yaml` na raiz); a migracao a partir do `dfx` ja foi concluida.

## Onde mora cada coisa

- **Diretrizes gerais do ecossistema icp-workspace** (skills oficiais da Internet
  Computer, arquitetura de backend/frontend, governanca de traducoes): chegam por
  instalacao por maquina do `zen-skills`. Nao ficam copiadas dentro do projeto.
- **Regras especificas deste projeto**: um arquivo por tema em `.ai/app/`, listado
  na secao abaixo com link relativo. Este template ainda nao tem nenhum.

## Diretrizes especificas da aplicacao

Nenhuma ainda. Ao criar a primeira, adicionar `.ai/app/<tema>.md` e lista-la aqui
como link relativo, com uma linha dizendo quando ela se aplica.

### Convencao para os documentos de `.ai/app/`

- Frontmatter YAML no topo do arquivo, para que agentes com suporte a skills possam
  carrega-lo sob demanda (os demais leem como markdown normal):

  ```yaml
  ---
  name: <tema>
  description: "Use when: <situacoes em que a regra se aplica>"
  ---
  ```

- O arquivo em `.ai/app/` e a fonte unica da regra. Este `AGENTS.md` so lista e aponta
  — nao repete o conteudo.
- Regra de governanca: solicitar autorizacao explicita do usuario sempre que alguma
  implementacao precisar violar uma dessas diretrizes.

## Convencoes gerais do ecossistema icp-workspace

- **Backend**: Motoko sobre `cached-db` (`Repository`/`CachedRepository`/`DataAccessObject`/`CoreTranslator`).
- **Frontend**: React + MUI + react-hook-form + zod, integracao via Internet Identity/`icp-cli`.
