import Time "mo:core/Time";

import DataAccessObject "mo:cacheddb/DataAccessObject";
import Repository "mo:cacheddb/Repository";

/// Tipos compartilhados pelos serviços administrativos (backup/restore,
/// auditoria de integridade referencial, saneamento de órfãos, modo de
/// manutenção e controle de cache).
///
/// Estes tipos são *operacionais* — não pertencem ao domínio de negócio
/// (que vive em `model/`). Isolá-los aqui mantém `IcpAppDatabase.mo`
/// focado em colaboração multi-DAO, conforme as diretrizes arquiteturais
/// do ecossistema (ver `.ai/icp/arquitetura-backend.md`, sincronizado a
/// partir do `icp-skills`).
///
/// Por compatibilidade com chamadores existentes (`main.mo` referencia
/// `IcpAppDatabase.DaoAuditChunk`, etc.), o `IcpAppDatabase` re-exporta
/// estes tipos como aliases públicos.
module {

  /// Identificadores estáveis dos DAOs para uso em rotinas de
  /// backup/restore, auditoria e saneamento. A ordem definida no registry
  /// também é a recomendada para restaurar (entidades referenciadas devem
  /// ser restauradas antes das que as referenciam).
  public type DaoId = Text;

  /// Resultado da auditoria de integridade referencial para um único objeto
  /// source de um DAO. `violations` lista as referências de saída cujo target
  /// não foi encontrado no DAO destino.
  public type DaoAuditEntry = {
    sourceId : Nat;
    violations : [DataAccessObject.ReferenceAuditViolation];
  };

  /// Chunk de auditoria retornado por `DaoBackupHandle.auditChunk` /
  /// endpoint `auditDaoChunk`. `scanned` informa quantos objetos foram
  /// efetivamente auditados nesta janela (independente de terem violações);
  /// `nextKey` indica o cursor para a próxima janela (null = fim).
  public type DaoAuditChunk = {
    entries : [DaoAuditEntry];
    scanned : Nat;
    nextKey : ?Nat;
  };

  /// Handle uniforme para backup/restore e auditoria de um DAO de chave `Nat`.
  public type DaoBackupHandle = {
    getChunk : (fromKey : ?Nat, maxBytes : Nat) -> ([Repository.BlobEntry<Nat>], ?Nat);
    putChunk : (entries : [Repository.BlobEntry<Nat>]) -> ();
    size : () -> Nat;
    reindex : () -> ();
    clear : () -> ();
    getSequence : () -> Nat;
    setSequence : (value : Nat) -> ();
    setMaintenanceMode : (enabled : Bool) -> ();
    isMaintenanceMode : () -> Bool;
    hasAuditors : () -> Bool;
    auditChunk : (fromKey : ?Nat, maxObjects : Nat) -> DaoAuditChunk;
  };

  /// Registro de um objeto-fonte com pelo menos uma referência de saída
  /// apontando para um target inexistente.
  public type OrphanRecord = {
    sourceEntity : Text;
    sourceId : Nat;
    targetEntity : Text;
    targetRole : Text;
    missingTargetIds : [Text];
    message : Text;
  };

  /// Sumário agregado por (sourceEntity, targetEntity, targetRole).
  public type ReferenceAuditSummary = {
    sourceEntity : Text;
    targetEntity : Text;
    targetRole : Text;
    scanned : Nat;
    orphans : Nat;
  };

  /// Relatório completo da auditoria de integridade referencial.
  public type AuditReport = {
    scannedAt : Time.Time;
    totals : [ReferenceAuditSummary];
    orphans : [OrphanRecord];
  };

};
