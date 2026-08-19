import IcpAppDatabase "../model/IcpAppDatabase";

import ProfileService "ProfileService";
import ConfigurationService "ConfigurationService";

/// Agregador de services de negocio.
///
/// Recebe a `IcpAppDatabase` (camada de persistencia + integridade
/// referencial) e expoe os services como campos publicos. `main.mo` faz
/// `let services = Services.Services(database)` uma unica vez e despacha
/// endpoints via `services.<area>.<operacao>(...)`.
///
/// Ordem de instanciacao dos services e topologica: services-folha primeiro,
/// services que consomem outros depois. Conforme novos services forem
/// extraidos, sao adicionados aqui mantendo a invariante "nenhum service
/// e construido antes das suas dependencias".
module {

  public class Services(database : IcpAppDatabase.IcpAppDatabase) {

    /// ProfileService — folha pura, depende apenas de `profileDAO`.
    public let profile = ProfileService.ProfileService(database.profileDAO);

    /// ConfigurationService — folha pura, depende apenas de `configurationDAO`.
    public let configuration = ConfigurationService.ConfigurationService(database.configurationDAO);

  };
};
