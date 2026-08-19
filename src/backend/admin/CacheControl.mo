import CachedRepository "mo:cacheddb/CachedRepository";
import Logger "mo:cacheddb/utils/Logger";

import ConfigurationDAO "../model/ConfigurationDAO";
import ImageDAO "../model/ImageDAO";
import ProfileDAO "../model/ProfileDAO";

/// Operações administrativas sobre o cache dos DAOs:
///   * `clearCaches`         — limpa o cache de todos os DAOs.
///   * `getRepositoryStats`  — agrega métricas de cada repositório.
///   * `warmupCache`         — stub. A estratégia de warmup do Zenquest
///                             (origem deste template) era um algoritmo de
///                             travessia inteiro específico do domínio de
///                             quiz (últimas simulações -> questões -> prova
///                             -> imagens). Não existe equivalente genérico
///                             para aquecer profile/configuration/image sem
///                             um padrão de acesso real do novo projeto —
///                             implemente aqui quando esse padrão existir.
///
/// Recebe explicitamente todos os DAOs envolvidos (não a `IcpAppDatabase`
/// inteira) para deixar o acoplamento claro e evitar dependência circular
/// `admin/` → `model/` → `admin/`.
module {

  public type RepositoryStats = CachedRepository.RepositoryStats;

  public type AllRepositoryStats = {
    profile : RepositoryStats;
    configuration : RepositoryStats;
    image : RepositoryStats;
  };

  public class CacheControl(
    profileDAO : ProfileDAO.ProfileDAO,
    configurationDAO : ConfigurationDAO.ConfigurationDAO,
    imageDAO : ImageDAO.ImageDAO,
    logger : Logger.Logger,
  ) {

    /// Limpa os caches de todos os DAOs da base.
    public func clearCaches() : () {
      profileDAO.store.clearCache();
      configurationDAO.store.clearCache();
      imageDAO.store.clearCache();
    };

    /// Retorna estatísticas de todos os repositórios.
    public func getRepositoryStats() : AllRepositoryStats {
      {
        profile = profileDAO.store.getRepositoryStats();
        configuration = configurationDAO.store.getRepositoryStats();
        image = imageDAO.store.getRepositoryStats();
      };
    };

    /// Stub — ver nota do módulo. Não faz nada até que o novo projeto
    /// defina sua própria estratégia de warmup.
    public func warmupCache(maxWarmup : Nat) : () {
      ignore maxWarmup;
      logger.info("ICP_APP_DATABASE", "warmupCache: nao implementado neste template.");
    };
  };
};
