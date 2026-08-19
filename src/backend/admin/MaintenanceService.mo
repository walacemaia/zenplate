import BackupRegistry "BackupRegistry";

/// Serviço administrativo para operações cross-DAO que afetam o estado
/// global da base: modo de manutenção (bloqueio de escritas regulares
/// durante backup/restore) e limpeza total (primeira fase do restore).
///
/// Opera exclusivamente via `BackupRegistry` — não conhece DAOs específicos
/// nem tipos de domínio. Adicionar um novo DAO não requer mudança aqui.
module {

  /// Encapsula as operações cross-DAO de manutenção. Sem estado próprio —
  /// toda a verdade vive nos stores dos DAOs, acessados via registry.
  public class MaintenanceService(registry : BackupRegistry.Registry) {

    /// Habilita/desabilita o modo de manutenção em todos os DAOs. Enquanto
    /// habilitado, as APIs regulares de escrita (`add*`/`update*`/`delete*`)
    /// são rejeitadas, permitindo que backup/restore ocorram sem
    /// concorrência. Operações de leitura e APIs de chunk continuam
    /// permitidas.
    public func setMaintenanceMode(enabled : Bool) : () {
      for (entry in registry.entriesIter()) {
        entry.1.setMaintenanceMode(enabled);
      };
    };

    /// Indica se ao menos um DAO está em modo de manutenção. A consistência
    /// entre DAOs é responsabilidade do chamador — em condições normais,
    /// todos estão no mesmo estado porque `setMaintenanceMode` os altera
    /// atomicamente dentro de uma única mensagem.
    public func isMaintenanceMode() : Bool {
      for (entry in registry.entriesIter()) {
        if (entry.1.isMaintenanceMode()) return true;
      };
      false;
    };

    /// Limpa todos os DAOs registrados, na ordem do registry. Utilizada como
    /// primeira fase do restore, garantindo que nenhum DAO fique mesclado
    /// com dados pré-existentes (política "melhor incompleto do que
    /// misturado"). Falhas internas (region/extents) propagam como trap.
    public func clearAllDaos() : () {
      for (entry in registry.entriesIter()) {
        entry.1.clear();
      };
    };
  };
};
