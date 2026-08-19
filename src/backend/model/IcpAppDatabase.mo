import DataAccessObject "mo:cacheddb/DataAccessObject";
import CachedRepository "mo:cacheddb/CachedRepository";
import Logger "mo:cacheddb/utils/Logger";
import CoreTranslator "mo:cacheddb/translation/CoreTranslator";
import AdminTypes "../admin/AdminTypes";
import BackupRegistry "../admin/BackupRegistry";
import MaintenanceService "../admin/MaintenanceService";
import CacheControl "../admin/CacheControl";

import ProfileDAO "ProfileDAO";
import ConfigurationDAO "ConfigurationDAO";
import ImageDAO "ImageDAO";

module {

  // Types -------------------------------------------------------------------

  public type IcpAppState = {
    profileState : ?DataAccessObject.State<Nat>;
    configurationState : ?DataAccessObject.State<Nat>;
    imageState : ?DataAccessObject.State<Nat>;
  };

  public type RepositoryStats = CachedRepository.RepositoryStats;

  public type AllRepositoryStats = CacheControl.AllRepositoryStats;

  /// Identificadores estaveis dos DAOs para uso em rotinas de backup/restore.
  /// A ordem definida no registry e tambem a recomendada para restaurar
  /// (entidades referenciadas devem ser restauradas antes das que as
  /// referenciam).
  ///
  /// Tipos administrativos (backup/auditoria) são definidos em
  /// `admin/AdminTypes.mo` e re-exportados aqui para manter compatibilidade
  /// com chamadores existentes (`main.mo` referencia `IcpAppDatabase.X`).
  public type DaoId = AdminTypes.DaoId;
  public type DaoAuditEntry = AdminTypes.DaoAuditEntry;
  public type DaoAuditChunk = AdminTypes.DaoAuditChunk;
  public type DaoBackupHandle = AdminTypes.DaoBackupHandle;
  public type OrphanRecord = AdminTypes.OrphanRecord;
  public type ReferenceAuditSummary = AdminTypes.ReferenceAuditSummary;
  public type AuditReport = AdminTypes.AuditReport;

  /// Database that encapsulates all Entities and their relationships.
  ///
  /// Este template só traz as 3 entidades genéricas do ecossistema
  /// (Profile/Configuration/Image) — sem nenhuma `Reference`/`ViewAdapter`
  /// cross-DAO registrada, porque não há um segundo DAO de domínio para
  /// relacionar. Ao adicionar entidades novas, registre aqui as
  /// `Reference`s de integridade referencial e os `ViewAdapter`s/`Translator`s
  /// cross-DAO (ver `.ai/icp/arquitetura-backend.md`, sincronizado a partir
  /// do `icp-skills`).
  public class IcpAppDatabase({
    translate : CoreTranslator.Translator;
    logger : Logger.Logger;

  }) {
    ignore translate;

    private type Configuration = ConfigurationDAO.Configuration;
    public let configurationDAO = ConfigurationDAO.ConfigurationDAO();

    private let configuration = func() : Configuration {
      configurationDAO.getConfiguration();
    };

    private type Profile = ProfileDAO.Profile;
    public let profileDAO = ProfileDAO.ProfileDAO(
      logger,
      configuration,
    );

    private type Image = ImageDAO.Image;
    public let imageDAO = ImageDAO.ImageDAO(
      logger
    );

    /* -------------------------------------------------------------------------- */
    /*                                    State                                   */
    /* -------------------------------------------------------------------------- */

    /// Exporta o estado estavel agregado de todos os DAOs.
    public func getState() : IcpAppState {
      {
        profileState = ?profileDAO.store.getState();
        configurationState = ?configurationDAO.store.getState();
        imageState = ?imageDAO.store.getState();
      };
    };

    /// Restaura o estado estavel agregado de todos os DAOs.
    public func setState(state : IcpAppState) {
      profileDAO.store.setState(state.profileState);
      configurationDAO.store.setState(state.configurationState);
      imageDAO.store.setState(state.imageState);
    };

    /* -------------------------------------------------------------------------- */
    /*                          Backup / Restore                                  */
    /* -------------------------------------------------------------------------- */

    // Registry imutável dos handles de backup/audit. A lista preserva a
    // ordem semântica de restore (entidades referenciadas antes das que as
    // referenciam) — hoje irrelevante (sem referências cross-DAO), mas
    // mantida como convenção para quando novas entidades forem adicionadas.
    private let backupRegistryInternal = BackupRegistry.Registry([
      ("configuration", BackupRegistry.makeHandle<Configuration>(configurationDAO.store)),
      ("profile", BackupRegistry.makeHandle<Profile>(profileDAO.store)),
      ("image", BackupRegistry.makeHandle<Image>(imageDAO.store)),
    ]);

    // Serviço de manutenção operando sobre o registry — não conhece DAOs
    // específicos. Adicionar um novo DAO requer apenas atualizar a lista
    // acima.
    private let maintenanceServiceInternal = MaintenanceService.MaintenanceService(backupRegistryInternal);

    /// Retorna a lista de identificadores dos DAOs disponiveis para backup.
    public func getDaoIdentifiers() : [DaoId] {
      backupRegistryInternal.getDaoIdentifiers();
    };

    /// Retorna apenas os identificadores dos DAOs que possuem ao menos uma
    /// referência de saída registrada (e portanto são candidatos à auditoria
    /// de integridade referencial). Delega para `BackupRegistry`.
    public func getAuditableDaoIdentifiers() : [DaoId] {
      backupRegistryInternal.getAuditableDaoIdentifiers();
    };

    /// Retorna o handle de backup para o DAO identificado por `id`.
    public func getDaoBackupHandle(id : DaoId) : ?DaoBackupHandle {
      backupRegistryInternal.getHandle(id);
    };

    /// Coloca todos os DAOs em modo de manutencao. Delega para
    /// `MaintenanceService`.
    public func setMaintenanceMode(enabled : Bool) {
      maintenanceServiceInternal.setMaintenanceMode(enabled);
    };

    /// Indica se ao menos um DAO esta em modo de manutencao. Delega para
    /// `MaintenanceService`.
    public func isMaintenanceMode() : Bool {
      maintenanceServiceInternal.isMaintenanceMode();
    };

    /// Limpa todos os DAOs registrados, em ordem do registry. Delega para
    /// `MaintenanceService`.
    public func clearAllDaos() {
      maintenanceServiceInternal.clearAllDaos();
    };

    /* -------------------------------------------------------------------------- */
    /*                             Gestão do cache                                */
    /* -------------------------------------------------------------------------- */

    // Operações administrativas sobre o cache extraídas para
    // `admin/CacheControl.mo`. Recebe diretamente os DAOs e o logger (não a
    // base inteira) para deixar o acoplamento explícito.
    private let cacheControlInternal = CacheControl.CacheControl(
      profileDAO,
      configurationDAO,
      imageDAO,
      logger,
    );

    /// Limpa os caches de todos os DAOs da base. Delega para `CacheControl`.
    public func clearCaches() : () {
      cacheControlInternal.clearCaches();
    };

    /// Retorna estatísticas de todos os repositórios. Delega para `CacheControl`.
    public func getRepositoryStats() : AllRepositoryStats {
      cacheControlInternal.getRepositoryStats();
    };

    /// Preenche caches com dados recentes para reduzir latencia inicial.
    /// Delega para `CacheControl` (stub neste template — ver nota do módulo).
    public func warmupCache(maxWarmup : Nat) : () {
      cacheControlInternal.warmupCache(maxWarmup);
    };
  };

};
