import Result "mo:core/Result";

import Logger "mo:cacheddb/utils/Logger";

import ConfigurationDAO "../model/ConfigurationDAO";

/// Service de Configuration.
///
/// Concentra as operacoes de dominio sobre a Configuration global do
/// canister. Recebe apenas o `ConfigurationDAO` — folha do grafo de
/// dependencias.
///
/// O service nao faz autorizacao: cabe a `main.mo` aplicar
/// `checkAuthenticated` / `checkAdminAuthorization` antes de invocar.
///
/// Observacao sobre lifecycle: o bootstrap da configuracao default
/// (criar Configuration se nao existir no startup/upgrade) permanece em
/// `main.mo`, porem usa as primitivas `has()` e `addDefault()` expostas
/// aqui. Isso mantem o trap/log de inicializacao com acesso direto ao
/// `logger` instanciado em main, sem que o service precise carregar
/// dependencia sobre `Logger`/`logContext`.
module {

  public type Configuration = ConfigurationDAO.Configuration;
  type Result<Ok, Err> = Result.Result<Ok, Err>;

  public class ConfigurationService(configurationDAO : ConfigurationDAO.ConfigurationDAO) {

    /// Configuration atual. Trapeia se nao houver configuration carregada
    /// (mesma semantica de `ConfigurationDAO.getConfiguration`).
    public func get() : Configuration {
      configurationDAO.getConfiguration();
    };

    /// Atualiza a Configuration.
    public func update(config : Configuration) : Result<Configuration, [Text]> {
      configurationDAO.updateConfiguration(config);
    };

    /// Indica se ja existe uma Configuration persistida.
    public func has() : Bool {
      configurationDAO.hasConfiguration();
    };

    /// Insere a Configuration default. Util no bootstrap: combinar com
    /// `has()` para evitar sobrescrever Configuration restaurada de
    /// upgrade.
    public func addDefault() : Result<Configuration, [Text]> {
      configurationDAO.addConfiguration(ConfigurationDAO.createDefaultConfig());
    };

    /// Nivel de log corrente. Usado como `logLevelResolver` do Logger.
    public func getLogLevel() : Logger.LogLevel {
      configurationDAO.getConfiguration().logLevel;
    };
  };
};
