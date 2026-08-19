import Runtime "mo:core/Runtime";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Result "mo:core/Result";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Int "mo:core/Int";

import Logger "mo:cacheddb/utils/Logger";
import DataAccessObject "mo:cacheddb/DataAccessObject";
import Repository "mo:cacheddb/Repository";

module {

  // Shortcuts
  type Result<Ok, Err> = Result.Result<Ok, Err>;
  type List<T> = List.List<T>;
  type Text = Text.Text;

  type Validation<K> = DataAccessObject.Validation<K>;
  type BusinessObject<K> = DataAccessObject.BusinessObject<K>;
  type DataAccessObject<K, V> = DataAccessObject.DataAccessObject<K, V>;
  type Blobify<T> = Repository.Blobify<T>;

  ///----------------------------------------------------------------------------
  /// CONFIGURATION
  ///----------------------------------------------------------------------------

  public let CURRENT_CONFIG_VERSION : Nat16 = 0;

  public type Configuration = BusinessObject<Nat> and {
    // Log level da aplicação.
    logLevel : Logger.LogLevel;
    // Tamanho máximo permitido para imagens de perfil (em bytes).
    maxProfileImageSize : Nat;
    // Número de eventos usados para aquecer o cache na inicialização.
    eventsForCacheWarmup : Nat;
  };

  /// Cria um Token default a partir dos campos obrigatórios informados.
  public func createDefaultConfig() : Configuration {
    {
      id = 0;
      logLevel = #deb;
      lastChange = Time.now();
      maxProfileImageSize = 200 * 1024;
      eventsForCacheWarmup = 1000;
    };
  };

  ///----------------------------------------------------------------------------
  /// SERIALIZAÇÃO
  ///----------------------------------------------------------------------------

  public let configBlobify : Blobify<Configuration> = {

    to_blob = func(obj : Configuration) : Blob {
      Repository.addVersion(
        CURRENT_CONFIG_VERSION,
        to_candid (obj),
      );
    };

    from_blob = func(blob : Blob) : Configuration {
      // Com versionamento
      let (version, contentBlob) = Repository.splitBlob(blob);
      switch (version) {
        case (0) {
          switch ((from_candid (contentBlob)) : ?Configuration) {
            case (?o) o;
            case (null) Runtime.trap("Failed to decode Configuration version " # debug_show (version));
          };
        };
        case (_) {
          Runtime.trap("Unsupported Configuration version: " # debug_show (version));
        };
      };
    };
  };

  ///----------------------------------------------------------------------------
  /// DAO
  ///----------------------------------------------------------------------------

  public class ConfigurationDAO() {
    // O ConfigurationDAO usa um logger interno para não gerar chamadas ciclicas
    // ao logar, já que o Logger se baseia na configuração para obter o nível de log.
    let logger = Logger.Logger();
    var currentLogLevel : Logger.LogLevel = #error;
    
    private let repName = "CONFIGURATION_DAO";
    logger.info(repName, "Starting ConfigurationDAO");

    /// Define como obter valores texto de propriedades.
    let textProperties : [(Text, Configuration -> Text)] = [
      ("id", func(obj : Configuration) : Text { Nat.toText(obj.id) }),
      ("logLevel", func(obj : Configuration) : Text { debug_show (obj.logLevel) }),
    ];

    // Define como obter valores Nat de propriedades identifacas pelo nome (introspecção);
    let natProperties : [(Text, Configuration -> Nat)] = [
      ("id", func(obj : Configuration) : Nat { obj.id }),
      ("lastChange", func(obj : Configuration) : Nat { Int.abs(obj.lastChange) }),
    ];

    /// Data Access Object
    public let store = DataAccessObject.DataAccessObject<Nat, Configuration>({
      keyOf = func(obj : Configuration) : Nat { obj.id };
      keyToString = func(id : Nat) : Text {
        Nat.toText(id);
      };
      keyComparator = Nat.compare;
      valueBlobify = configBlobify;
      repName = "CONFIGURATION_DAO";
      natProperties;
      textProperties;
      logger;
    });

    // O resolver não consulta DAO para evitar recursão indireta em logs.
    logger.logLevelResolver := func() : Logger.LogLevel { currentLogLevel };

    /* -------------------------------------------------------------------------- */
    /*                            Ações de atualização                            */
    /* -------------------------------------------------------------------------- */

    /// Função a ser executada ao incluir, permitindo alterações sobre o objeto.
    let onInsert = func(obj : Configuration) : Configuration {
      return {
        obj with id = store.nextSequenceId();
        lastChange = Time.now();
      };
    };

    /// Função a ser executada ao alterar, permitindo alterações sobre o objeto.
    let onUpdate = func(obj : Configuration) : Configuration {
      return {
        obj with lastChange = Time.now();
      };
    };

    let afterUpdate = func(obj : Configuration) : Configuration {
      currentLogLevel := obj.logLevel;
      logger.info(repName, "Updating log level to " # debug_show (obj.logLevel));
      obj;
    };

    let afterInsert = func(obj : Configuration) : Configuration {
      currentLogLevel := obj.logLevel;
      logger.info(repName, "Updating log level to " # debug_show (obj.logLevel));
      obj;
    };

    store.beforeInsertObject := ?onInsert;
    store.beforeUpdateObject := ?onUpdate;
    store.afterUpdateObject := ?afterUpdate;
    store.afterInsertObject := ?afterInsert;

    // Indexes -------------------------------------------------------------
    private func _idToText(id : ?Nat) : ?Text {
      switch (id) {
        case (?n) return ?Nat.toText(n);
        case null return null;
      };
    };

    /* -------------------------------------------------------------------------- */
    /*                            Funções de atualização                          */
    /* -------------------------------------------------------------------------- */

    /// Adiciona um novo objeto ao banco de dados.
    /// #### Parâmetros
    /// - `obj` Membro a ser adicionado.
    /// #### Retorna
    /// - O objeto adicionado, eventualmente com atributos atualizados durante
    /// o processo ou ```null``` caso o novo objeto não possa ser inserido.
    public func addConfiguration(obj : Configuration) : Result<Configuration, [Text]> {
      logger.debugInfo(repName, "addConfiguration " # debug_show (obj));
      if (hasConfiguration()) {
        Runtime.trap("Only one configuration object is allowed");
      };
      store.addObject(obj);
    };

    /// Atualiza um objeto existente pelo ID.
    /// #### Parâmetros
    /// - `obj` nova versão do objeto.
    /// #### Retorna
    /// - O objeto atualizado se a atualização foi bem-sucedida, ou `null` se o
    /// objeto a ser atualizado não existe.
    public func updateConfiguration(obj : Configuration) : Result<Configuration, [Text]> {
      logger.debugInfo(repName, "updateConfiguration " # debug_show (obj));
      return store.updateObject(obj);
    };

    /// Remove um membro pelo ID
    /// #### Retorna
    /// - o objeto excluído ou null se o objeto não existe.
    public func deleteConfiguration(id : Nat) : Result<Nat, [Text]> {
      Runtime.trap("Configuration deletion is not allowed");
    };

    /* -------------------------------------------------------------------------- */
    /*                             Funções de pesquisa                            */
    /* -------------------------------------------------------------------------- */

    // Recupera a configuração mais recente entre os registros existentes.
    // Isso evita depender de um ID fixo e mantém compatibilidade com dados antigos.
    private func findCurrentConfiguration() : ?Configuration {
      var selected : ?Configuration = null;
      for (config in store.getAllObjects()) {
        switch (selected) {
          case (null) {
            selected := ?config;
          };
          case (?current) {
            if (config.lastChange >= current.lastChange) {
              selected := ?config;
            };
          };
        };
      };
      selected;
    };

    public func getConfiguration() : Configuration {
      switch (findCurrentConfiguration()) {
        case (?obj) {
          currentLogLevel := obj.logLevel;
          obj;
        };
        case (null) {
          createDefaultConfig();
        };
      };
    };

    /// Verifica a existência de uma configuração
    public func hasConfiguration() : Bool {
      switch (findCurrentConfiguration()) {
        case (?_) true;
        case (null) false;
      };
    };

  };
};
