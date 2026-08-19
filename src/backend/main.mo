import Prim "mo:⛔";
import Nat "mo:core/Nat";
import Nat16 "mo:core/Nat16";
import Nat64 "mo:core/Nat64";
import Result "mo:core/Result";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Map "mo:core/Map";
import Array "mo:core/Array";

import Logger "mo:cacheddb/utils/Logger";
import CoreTranslator "mo:cacheddb/translation/CoreTranslator";
import CachedRepository "mo:cacheddb/CachedRepository";
import Repository "mo:cacheddb/Repository";

import Migration "migration";
import IcpAppTranslator "translation/IcpAppTranslator";
import IcpAppDatabase "model/IcpAppDatabase";
import Services "services/Services";
import ProfileDAO "model/ProfileDAO";
import ConfigurationDAO "model/ConfigurationDAO";
import EndpointTelemetry "utils/EndpointTelemetry";

///-------------------------------------------------------------------------- */
/// API de serviços do sistema.
///
//(with migration = Migration.run)
persistent actor icp_app_backend {

  ignore Migration;

  type Result<Ok, Err> = Result.Result<Ok, Err>;
  type Language = CoreTranslator.Language;
  type Map<K, V> = Map.Map<K, V>;

  /* ------------------------------------------------------------------------ */
  /*                                Translation                               */
  /* ------------------------------------------------------------------------ */
  transient let mls = IcpAppTranslator.multiLanguageSupport();

  transient let translate : CoreTranslator.Translator = func(key : Text, lang : Language) : Text {
    CoreTranslator.translate(mls, key, lang);
  };

  private func getLanguage(caller : Principal) : Language {
    services.profile.getLanguage(caller);
  };

  public query ({ caller }) func getTranslations() : async [(Text, Text)] {
    switch (Map.get(mls, Text.compare, CoreTranslator.code(getLanguage(caller)))) {
      case (?dic) { Iter.toArray(Map.entries(dic)) };
      case null [];
    };
  };

  /* -------------------------------------------------------------------------- */
  /*                             Logger                                         */
  /* -------------------------------------------------------------------------- */
  transient let logContext = "icp_app_backend";
  transient let logger = Logger.Logger();
  transient let database = IcpAppDatabase.IcpAppDatabase({
    translate;
    logger;
  });
  transient let services = Services.Services(database);
  var databaseState : ?IcpAppDatabase.IcpAppState = null;

  /* ------------------------------------------------------------------------ */
  /*                               Authorization                              */
  /* ------------------------------------------------------------------------ */

  /// Somente o dono do Profile pode alterá-lo. Um usuário não pode alterar sua role para #admin.
  private func checkProfileAuthorization(profile : Profile, caller : Principal) {
    if (profile.role == #admin) {
      checkAdminAuthorization(caller);
    };
    if (profile.principal != caller) {
      Runtime.trap("Usuário não autorizado a alterar profile: " # debug_show (caller));
    };
  };

  private func checkAuthenticated(caller : Principal) {
    ignore caller;
    //assert (Principal.toText(caller) != "2vxsx-fae");
  };

  // Verifica se o caller é um controlador (admin) do canister.
  private func checkAdminAuthorization(caller : Principal) {

    if (Prim.isController(caller)) {
      return;
    };

    let profile = getProfileOrTrap(caller);
    if (profile.role != #admin) {
      Runtime.trap("Usuário não autorizado: Somente administradores podem acessar esta função: " # debug_show (caller));
    };

  };

  /// Verifica se o caller e um controller do canister. Utilizada por
  /// endpoints de infraestrutura (backup, restore, manutencao) que precisam
  /// funcionar mesmo quando o `profileDAO` esta vazio ou em transicao
  /// durante uma restauracao. Diferentemente de `checkAdminAuthorization`,
  /// nao aceita admins de dominio: privilegio precisa estar registrado
  /// nas settings do canister (`dfx canister update-settings --add-controller`).
  private func checkControllerAuthorization(caller : Principal) {
    if (not Prim.isController(caller)) {
      Runtime.trap(
        "Operacao restrita a controllers do canister. Caller: " # debug_show (caller)
      );
    };
  };

  /// Verifica se o caller informado pode alterar dados associados ao profile de id informado.
  private func checkOwnership(profileId : Nat, caller : Principal) {
    let callerProfile = getProfileOrTrap(caller);
    if (callerProfile.id != profileId) {
      Runtime.trap("Usuário não autorizado a manipular dados do profile: " # Nat.toText(profileId));
    };
  };

  /* -------------------------------------------------------------------------- */
  /*                             ConfigurationDAO                               */
  /* -------------------------------------------------------------------------- */

  type Configuration = ConfigurationDAO.Configuration;

  // Cria configuração apenas quando realmente não há estado restaurável.
  private func ensureConfiguration() {
    if (not services.configuration.has()) {
      logger.info(logContext, "No configuration found at startup. Creating default configuration.");
      switch (services.configuration.addDefault()) {
        case (#ok config) {
          logger.info(logContext, "Default configuration created successfully at startup: " # debug_show (config));
        };
        case (#err msg) {
          logger.error(logContext, "Error creating default configuration at startup: " # debug_show (msg));
          Runtime.trap(msg[0]);
        };
      };
    };
  };

  // Em upgrades, `databaseState` será restaurado no postupgrade.
  // Evita criar default antes da restauração para não mascarar logLevel persistido.
  switch (databaseState) {
    case (null) {
      ensureConfiguration();
    };
    case (?_) {};
  };

  logger.logLevelResolver := func() : Logger.LogLevel {
    services.configuration.getLogLevel();
  };

  public query ({ caller }) func getConfiguration() : async Configuration {
    checkAuthenticated(caller);
    services.configuration.get();
  };

  public shared ({ caller }) func updateConfiguration(config : Configuration) : async Result<Configuration, [Text]> {
    checkAdminAuthorization(caller);
    services.configuration.update(config);
  };

  /* -------------------------------------------------------------------------- */
  /*                                    Profile                                 */
  /* -------------------------------------------------------------------------- */
  type Profile = ProfileDAO.Profile;

  /// Retorna o profile do caller.
  public query ({ caller }) func getMyProfile() : async ?Profile {
    services.profile.getByPrincipal(caller);
  };

  public query ({ caller }) func isAdmin() : async Bool {
    services.profile.isAdmin(caller);
  };

  /// Cria e persiste o profile do caller.
  public shared ({ caller }) func createMyProfile() : async Profile {
    checkAuthenticated(caller);
    services.profile.createForPrincipal(caller);
  };

  /// Adiciona um novo profile para o caller no banco de dados. O primeiro profile será uma administrador.
  public shared ({ caller }) func addMyProfile(profile : Profile) : async Result<Profile, [Text]> {
    checkAuthenticated(caller);
    services.profile.add(profile, caller);
  };

  // public shared ({ caller }) func getOrCreateMyProfile() : async Profile {
  //   checkAuthenticated(caller);
  //   profileDAO.getOrCreateProfileByPrincipal(caller);
  // };

  public shared ({ caller }) func promoteToAdmin(profileId : Nat) : async Result<Profile, [Text]> {
    checkAdminAuthorization(caller);
    services.profile.promote(profileId);
  };

  public shared ({ caller }) func demoteFromAdmin(profileId : Nat) : async Result<Profile, [Text]> {
    checkAdminAuthorization(caller);
    services.profile.demote(profileId, getProfileOrTrap(caller).id);
  };

  /// Atualiza um profile existente pelo ID.
  /// - Parâmetros
  ///   - `profile` Dados do profile a serem atualizados.
  /// (o ID deve ser válido e existente).
  /// - Retorna: Um `Result.ok` com o objeto alterado em caso de sucesso ou um `Result.err`
  /// com um array contendo as mensagens dos erros ocorridos.
  public shared ({ caller }) func updateMyProfile(profile : Profile) : async Result<Profile, [Text]> {
    checkProfileAuthorization(profile, caller);
    let result = services.profile.update(profile);
    result;
  };

  /// Retorna os profiles conforme os critérios de filtro, ordenação e fatiamento.
  public query ({ caller }) func getProfiles({
    filters : Text;
    sortField : Text;
    sortOrder : Text;
    start : Nat;
    pageSize : Nat;
  }) : async ([Profile], Nat) {
    checkAdminAuthorization(caller);
    services.profile.getPaginated {
      filters;
      sortField;
      sortOrder;
      start;
      pageSize;
      language = getLanguage(caller);
    };
  };

  public query ({ caller }) func getProfilesSortableFields() : async [Text] {
    checkAdminAuthorization(caller);
    services.profile.getSortableFields();
  };

  /// Remove um profile pelo ID.
  /// #### Parâmetros
  /// - `id` ID do profile a ser removido.
  /// #### Retorna
  /// - Um `Result.ok` com o objeto excluído em caso de sucesso ou um `Result.err`
  /// com um array contendo as mensagens dos erros ocorridos.
  public shared ({ caller }) func deleteProfile(id : Nat) : async Result<Nat, [Text]> {
    checkAdminAuthorization(caller);
    services.profile.delete(id);
  };

  /* ------------------------------------------------------------------------ */
  /*                            Funções auxiliares                           */
  /* ------------------------------------------------------------------------ */

  private func trap(msg : Text) : None {
    logger.error(logContext, msg);
    Prim.trap msg;
  };

  /// Obtém o profile do caller ou gera um trap caso não exista.
  private func getProfileOrTrap(caller : Principal) : Profile {
    switch (services.profile.getByPrincipal(caller)) {
      case (?p) p;
      case null {
        trap("Profile não encontrado para o caller: " # debug_show (caller));
      };
    };
  };

  /* -------------------------------------------------------------------------- */
  /*                          Telemetria de endpoint                             */
  /* -------------------------------------------------------------------------- */

  public type EndpointCostStats = EndpointTelemetry.Stats;

  transient let endpointTelemetry = EndpointTelemetry.Tracker();

  private func profileEndpointSync<T>(name : Text, run : () -> T) : T {
    endpointTelemetry.track<T>(name, run);
  };

  /* -------------------------------------------------------------------------- */
  /*                               Consumo de memória                           */
  /* -------------------------------------------------------------------------- */

  public type RuntimeMemoryReport = {
    heapBytes : Nat; // heap efetivamente usado
    wasmBytes : Nat; // memória wasm reservada (heap)
    stablePages : Nat64; // páginas de memória estável (64KiB cada)
    stableBytes : Nat; // memória estável total em bytes
  };

  public query ({ caller }) func memory() : async RuntimeMemoryReport {
    checkAdminAuthorization(caller);
    let stableBytes = Prim.rts_stable_memory_size();
    {
      heapBytes = Prim.rts_heap_size();
      wasmBytes = Prim.rts_memory_size();
      stablePages = Nat64.fromNat(stableBytes / 65_536);
      stableBytes = stableBytes;
    };
  };

  /* -------------------------------------------------------------------------- */
  /*                                   Stable                                   */
  /* -------------------------------------------------------------------------- */

  // A version incremented on each upgrade.
  var version : Nat = 0;

  /// Returns the current version, for cache control.
  public query func getVersion() : async Nat {
    return version;
  };

  /* -------------------------------------------------------------------------- */
  /*                           Repository Statistics                            */
  /* -------------------------------------------------------------------------- */

  public type RepositoryStats = CachedRepository.RepositoryStats;

  /// Retorna estatísticas de todos os repositórios.
  public query ({ caller }) func getRepositoryStats() : async IcpAppDatabase.AllRepositoryStats {
    checkAdminAuthorization(caller);
    database.getRepositoryStats();
  };

  public shared ({ caller }) func getEndpointCostStats() : async [(Text, EndpointCostStats)] {
    checkAdminAuthorization(caller);
    Iter.toArray(endpointTelemetry.entries());
  };

  public shared ({ caller }) func resetEndpointCostStats() : async () {
    checkAdminAuthorization(caller);
    endpointTelemetry.reset();
  };

  /* -------------------------------------------------------------------------- */
  /*                                Cache                                       */
  /* -------------------------------------------------------------------------- */

  /// Aquece o cache dos DAOs (stub neste template — ver `admin/CacheControl.mo`).
  public shared ({ caller }) func warmupCache() : async () {
    profileEndpointSync<()>(
      "warmupCache",
      func() : () {
        checkAdminAuthorization(caller);
        database.warmupCache(1000);
      },
    );
  };

  public shared func clearCache() : async () {
    profileEndpointSync<()>(
      "clearCache",
      func() : () {
        logger.info(logContext, "Limpando caches...");
        database.clearCaches();
        logger.info(logContext, "Caches limpos.");
      },
    );
  };

  /* -------------------------------------------------------------------------- */
  /*                            Backup / Restore                                */
  /* -------------------------------------------------------------------------- */

  /// Limite default de bytes por chunk de backup/restore (compativel com o
  /// limite de mensagem ingress da ICP, que e ~2 MiB). Mantemos uma folga
  /// para overhead de Candid.
  transient let DEFAULT_BACKUP_CHUNK_BYTES : Nat = 1_800_000;

  /// Limite default de objetos auditados por chamada a `auditDaoChunk`.
  /// Calibrado para respeitar o limite de 5B instruções por mensagem
  /// considerando que cada objeto pode disparar várias resoluções de FK
  /// (potencialmente com leitura de disco quando o cache do target DAO
  /// estiver frio).
  transient let DEFAULT_AUDIT_CHUNK_OBJECTS : Nat = 100;

  public type BackupBlobEntry = {
    key : Nat;
    payLoad : Blob;
  };

  public type BackupChunk = {
    entries : [BackupBlobEntry];
    nextKey : ?Nat;
  };

  private func toBackupEntry(entry : Repository.BlobEntry<Nat>) : BackupBlobEntry {
    { key = entry.key; payLoad = entry.payLoad };
  };

  private func fromBackupEntry(entry : BackupBlobEntry) : Repository.BlobEntry<Nat> {
    { key = entry.key; payLoad = entry.payLoad };
  };

  /// Lista os identificadores de DAOs disponiveis para backup/restore.
  /// A ordem retornada deve ser respeitada no restore para preservar
  /// integridade referencial.
  public query ({ caller }) func getDaoIdentifiers() : async [Text] {
    checkAdminAuthorization(caller);
    database.getDaoIdentifiers();
  };

  /// Lista os identificadores de DAOs que possuem ao menos uma referência
  /// de saída registrada — ou seja, candidatos à auditoria de integridade
  /// referencial. DAOs sem outcome references (ex.: `image`,
  /// `configuration`) são omitidos para evitar trabalho desnecessário.
  public query ({ caller }) func getAuditableDaoIdentifiers() : async [Text] {
    checkControllerAuthorization(caller);
    database.getAuditableDaoIdentifiers();
  };

  /// Executa, em modo read-only, a auditoria de integridade referencial de
  /// um único DAO a partir de `fromKey` (inclusive), auditando até
  /// `maxObjects` registros. Os auditores são populados automaticamente pela
  /// lib cacheddb (em `addOutcomeReference`), portanto novas referências
  /// são auditadas sem manutenção manual. A chunked API permite que o cliente
  /// pagine por todos os DAOs respeitando o limite de instruções por
  /// mensagem da IC.
  public query ({ caller }) func auditDaoChunk(
    daoId : Text,
    fromKey : ?Nat,
    maxObjects : ?Nat,
  ) : async Result<IcpAppDatabase.DaoAuditChunk, Text> {
    checkControllerAuthorization(caller);
    switch (database.getDaoBackupHandle(daoId)) {
      case null #err("DAO desconhecido: " # daoId);
      case (?handle) {
        let limit = switch (maxObjects) {
          case (?n) if (n > 0) n else DEFAULT_AUDIT_CHUNK_OBJECTS;
          case null DEFAULT_AUDIT_CHUNK_OBJECTS;
        };
        #ok(handle.auditChunk(fromKey, limit));
      };
    };
  };

  /// Retorna a quantidade total de registros do DAO informado.
  /// Utilizado para calcular progresso deterministico durante o export.
  public query ({ caller }) func getDaoSize(daoId : Text) : async Result<Nat, Text> {
    checkControllerAuthorization(caller);
    switch (database.getDaoBackupHandle(daoId)) {
      case null #err("DAO desconhecido: " # daoId);
      case (?handle) #ok(handle.size());
    };
  };

  /// Liga/desliga o modo de manutencao em todos os DAOs. Enquanto habilitado,
  /// as APIs regulares de escrita (`add*`/`update*`/`delete*`) sao rejeitadas,
  /// permitindo que backup/restore ocorram sem concorrencia. Endpoints de
  /// leitura permanecem disponiveis.
  public shared ({ caller }) func setMaintenanceMode(enabled : Bool) : async Bool {
    checkControllerAuthorization(caller);
    database.setMaintenanceMode(enabled);
    logger.info(logContext, "Maintenance mode set to " # debug_show (enabled));
    enabled;
  };

  public query ({ caller }) func isMaintenanceMode() : async Bool {
    checkAdminAuthorization(caller);
    database.isMaintenanceMode();
  };

  private func requireMaintenance() : Result<(), Text> {
    if (database.isMaintenanceMode()) {
      #ok();
    } else {
      #err("Operação de backup/restore requer modo de manutenção habilitado. Chame setMaintenanceMode(true) antes.");
    };
  };

  /// Retorna um chunk de `BlobEntry` para o DAO identificado, iniciando em
  /// `fromKey` (ou no primeiro registro quando `null`). Encerra ao acumular
  /// `maxBytes` (default seguro para o limite de mensagens da ICP). O campo
  /// `nextKey` indica o cursor a usar na proxima chamada; `null` significa
  /// que nao ha mais registros para esse DAO.
  public query ({ caller }) func getBlobEntries(
    daoId : Text,
    fromKey : ?Nat,
    maxBytes : ?Nat,
  ) : async Result<BackupChunk, Text> {
    checkControllerAuthorization(caller);
    switch (requireMaintenance()) {
      case (#err e) return #err(e);
      case (#ok _) {};
    };
    switch (database.getDaoBackupHandle(daoId)) {
      case null #err("DAO desconhecido: " # daoId);
      case (?handle) {
        let limit = switch (maxBytes) {
          case (?b) if (b > 0) b else DEFAULT_BACKUP_CHUNK_BYTES;
          case null DEFAULT_BACKUP_CHUNK_BYTES;
        };
        let (rawEntries, nextKey) = handle.getChunk(fromKey, limit);
        #ok({
          entries = Array.map<Repository.BlobEntry<Nat>, BackupBlobEntry>(rawEntries, toBackupEntry);
          nextKey;
        });
      };
    };
  };

  /// Persiste no DAO identificado um conjunto de `BlobEntry` previamente
  /// obtidos por `getBlobEntries`. Indices nao sao atualizados automaticamente
  /// para minimizar o custo por chunk; ao concluir a restauracao de um DAO,
  /// invoque `reindexDao` para reconstruir os indices em heap a partir do
  /// estado persistido em disco.
  public shared ({ caller }) func putBlobEntries(
    daoId : Text,
    entries : [BackupBlobEntry],
  ) : async Result<Nat, Text> {
    checkControllerAuthorization(caller);
    switch (requireMaintenance()) {
      case (#err e) return #err(e);
      case (#ok _) {};
    };
    switch (database.getDaoBackupHandle(daoId)) {
      case null #err("DAO desconhecido: " # daoId);
      case (?handle) {
        let converted = Array.map<BackupBlobEntry, Repository.BlobEntry<Nat>>(entries, fromBackupEntry);
        handle.putChunk(converted);
        #ok(entries.size());
      };
    };
  };

  /// Reconstroi os indices em heap do DAO identificado a partir do estado
  /// atual em disco. Deve ser chamado pelo frontend ao concluir o restore
  /// de cada DAO (ou ao final do restore de toda a base).
  public shared ({ caller }) func reindexDao(daoId : Text) : async Result<(), Text> {
    checkControllerAuthorization(caller);
    switch (requireMaintenance()) {
      case (#err e) return #err(e);
      case (#ok _) {};
    };
    switch (database.getDaoBackupHandle(daoId)) {
      case null #err("DAO desconhecido: " # daoId);
      case (?handle) {
        handle.reindex();
        #ok();
      };
    };
  };

  /// Limpa todos os registros e indices de um DAO, preservando regioes ja
  /// alocadas em disco. Deve ser chamado pelo frontend antes de iniciar o
  /// restore de cada DAO para garantir que a base nao fique mesclada com
  /// dados pre-existentes.
  public shared ({ caller }) func clearDao(daoId : Text) : async Result<(), Text> {
    checkControllerAuthorization(caller);
    switch (requireMaintenance()) {
      case (#err e) return #err(e);
      case (#ok _) {};
    };
    switch (database.getDaoBackupHandle(daoId)) {
      case null #err("DAO desconhecido: " # daoId);
      case (?handle) {
        handle.clear();
        #ok();
      };
    };
  };

  /// Encapsula todas as acoes que precisam acontecer atomicamente antes do
  /// frontend comecar a transmitir chunks de restore:
  ///
  /// 1. Verifica autorizacao de controller do canister (trap em violacao).
  ///    Controller eh exigido (e nao apenas admin de dominio) porque o
  ///    profileDAO sera limpo nesta operacao: o caller precisa continuar
  ///    autorizado mesmo sem profile.
  /// 2. Exige modo de manutencao habilitado (retorna `#err` para UX).
  /// 3. Compara `expectedDaoIds` (vindos do manifesto) com o registry; aborta
  ///    com `#err` se houver DAOs no manifesto que o canister desconhece.
  /// 4. Limpa todos os DAOs do registry (uniao com manifesto), em ordem
  ///    topologica do registry. Falha em qualquer clear propaga como trap,
  ///    revertendo o estado da chamada inteira (politica "melhor incompleto
  ///    do que misturado" combinada com atomicidade do canister).
  ///
  /// Retorna a lista de identificadores de DAOs do registry, na ordem em
  /// que foram limpos (e na ordem recomendada para o frontend restaurar).
  public shared ({ caller }) func startRestore(expectedDaoIds : [Text]) : async Result<[Text], Text> {
    checkControllerAuthorization(caller);
    switch (requireMaintenance()) {
      case (#err e) return #err(e);
      case (#ok _) {};
    };

    let registryIds = database.getDaoIdentifiers();

    // Pre-condicao: todo DAO citado no manifesto deve existir no registry.
    // (DAOs do registry ausentes do manifesto sao toleraveis: serao limpos
    //  e ficarao vazios apos o restore.)
    for (id in expectedDaoIds.values()) {
      switch (database.getDaoBackupHandle(id)) {
        case null return #err("DAO desconhecido no manifesto: " # id);
        case (?_) {};
      };
    };

    // Limpeza atomica de todos os DAOs do registry. Como executa dentro de
    // uma unica chamada update, qualquer trap reverte o estado das limpezas
    // ja aplicadas neste batch.
    database.clearAllDaos();

    #ok(registryIds);
  };

  /// Retorna o valor atual da sequencia do DAO. Utilizado durante o export
  /// para preservar o proximo id a ser distribuido no canister restaurado.
  public query ({ caller }) func getDaoSequence(daoId : Text) : async Result<Nat, Text> {
    checkControllerAuthorization(caller);
    switch (database.getDaoBackupHandle(daoId)) {
      case null #err("DAO desconhecido: " # daoId);
      case (?handle) #ok(handle.getSequence());
    };
  };

  /// Substitui o valor da sequencia do DAO. Deve ser chamado apos a
  /// restauracao dos blobs e do reindex, para que `nextSequenceId()` continue
  /// produzindo ids nao colidentes com os objetos restaurados.
  public shared ({ caller }) func setDaoSequence(daoId : Text, value : Nat) : async Result<(), Text> {
    checkControllerAuthorization(caller);
    switch (requireMaintenance()) {
      case (#err e) return #err(e);
      case (#ok _) {};
    };
    switch (database.getDaoBackupHandle(daoId)) {
      case null #err("DAO desconhecido: " # daoId);
      case (?handle) {
        handle.setSequence(value);
        #ok();
      };
    };
  };

  /* -------------------------------------------------------------------------- */
  /*                               Upgrade                                      */
  /* -------------------------------------------------------------------------- */
  // Atualiza a estruturas do modelo a partir das estruturas persistidas.
  system func postupgrade() {
    switch (databaseState) {
      case null {};
      case (?state) {
        database.setState(state);
        databaseState := null;
        version += 1;
        logger.info(logContext, "ESTADO RESTAURADO! Version: " # Nat.toText(version));
      };
    };
    ensureConfiguration();
    logger.logLevelResolver := func() : Logger.LogLevel {
      services.configuration.getLogLevel();
    };
  };

  /// Atualiza as estruturas persistidas a partir das estruturas do modelo.
  system func preupgrade() {
    logger.info(logContext, "INICIANDO PREUPGRADE");
    // Reduz pico de memória no upgrade: remove objetos em cache antes de
    // materializar o estado estável.
    database.clearCaches();
    databaseState := ?database.getState();
    logger.info(logContext, "ESTADO SALVO ");
  };

};
