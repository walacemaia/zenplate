module {

  //----------------------------------------------------------------------------
  // Migration Runner
  //----------------------------------------------------------------------------
  // Este template ainda nao passou por nenhuma migracao estrutural do estado
  // agregado (IcpAppState) — nao ha estado antigo para converter. Quando o
  // novo projeto precisar de uma migracao (mudanca estrutural do estado
  // agregado, nao apenas evolucao de campo/versao de um DAO — essa via de
  // versionamento fica no Blobify do proprio DAO, ver arquitetura-backend.md
  // do icp-skills), implemente aqui a funcao `run(old) : New` com os tipos
  // Old/New relevantes e habilite a clausula `(with migration = Migration.run)`
  // no `persistent actor` de `main.mo` (hoje comentada).

};
