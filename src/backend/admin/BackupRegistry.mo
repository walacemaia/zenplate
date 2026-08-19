import Array "mo:core/Array";
import Iter "mo:core/Iter";
import List "mo:core/List";

import DataAccessObject "mo:cacheddb/DataAccessObject";
import Repository "mo:cacheddb/Repository";

import AdminTypes "AdminTypes";

/// Registry uniforme de handles de backup/audit para todos os DAOs da base.
///
/// Encapsula:
/// - construção do `DaoBackupHandle` a partir de um `DataAccessObject` via
///   `makeHandle<T>` (factory genérica que conecta backup/audit/maintenance
///   ao store do DAO);
/// - lista ordenada `(DaoId, DaoBackupHandle)` — a ordem é semanticamente
///   significativa: é a ordem recomendada de restore (entidades
///   referenciadas antes das que as referenciam);
/// - lookups por identificador e iteração.
///
/// Esta camada é puramente infraestrutural — não conhece tipos de domínio.
/// Serviços administrativos consomem-na via construtor para implementar
/// operações cross-DAO uniformes (`MaintenanceService`, `AuditService`,
/// futuro `CacheControl`).
module {

  type DaoId = AdminTypes.DaoId;
  type DaoBackupHandle = AdminTypes.DaoBackupHandle;
  type DaoAuditChunk = AdminTypes.DaoAuditChunk;
  type DaoAuditEntry = AdminTypes.DaoAuditEntry;

  /// Constrói um `DaoBackupHandle` a partir de um `DataAccessObject` de
  /// chave `Nat`. Conecta cada operação do handle ao método correspondente
  /// do store, incluindo a normalização do resultado de `auditChunk` para
  /// o tipo administrativo `DaoAuditEntry`.
  public func makeHandle<T>(
    store : DataAccessObject.DataAccessObject<Nat, T>
  ) : DaoBackupHandle {
    {
      getChunk = func(fromKey : ?Nat, maxBytes : Nat) : ([Repository.BlobEntry<Nat>], ?Nat) {
        store.getBackupChunk(fromKey, maxBytes);
      };
      putChunk = func(entries : [Repository.BlobEntry<Nat>]) : () {
        store.putBackupChunk(entries);
      };
      size = func() : Nat { store.size() };
      reindex = func() : () { store.reindexFromRepository() };
      clear = func() : () { store.clear() };
      getSequence = func() : Nat { store.getSequence() };
      setSequence = func(value : Nat) : () { store.setSequence(value) };
      setMaintenanceMode = func(enabled : Bool) : () {
        store.setMaintenanceMode(enabled);
      };
      isMaintenanceMode = func() : Bool { store.isMaintenanceMode() };
      hasAuditors = func() : Bool { store.hasReferenceAuditors() };
      // Auditoria data-driven paginada: usa o `auditChunk` da lib cacheddb
      // (mesmo padrão de cursor que `getBackupChunk`) para respeitar o
      // limite de instruções por mensagem. Cada chunk audita até
      // `maxObjects` registros do DAO a partir de `fromKey`, retornando
      // apenas os que possuem violação.
      auditChunk = func(fromKey : ?Nat, maxObjects : Nat) : DaoAuditChunk {
        let chunk = store.auditChunk(fromKey, maxObjects);
        {
          entries = Array.map<(Nat, [DataAccessObject.ReferenceAuditViolation]), DaoAuditEntry>(
            chunk.entries,
            func(pair : (Nat, [DataAccessObject.ReferenceAuditViolation])) : DaoAuditEntry {
              { sourceId = pair.0; violations = pair.1 };
            },
          );
          scanned = chunk.scanned;
          nextKey = chunk.nextKey;
        };
      };
    };
  };

  /// Registry imutável de handles. Construído uma única vez na inicialização
  /// da base, recebendo a lista completa (`entries`) na ordem semântica de
  /// restore. Não há mutação após a construção — handles encapsulam
  /// fechamentos sobre os stores e refletem o estado vivo automaticamente.
  public class Registry(entries : [(DaoId, DaoBackupHandle)]) {

    /// Retorna a lista de identificadores dos DAOs disponíveis, preservando
    /// a ordem semântica de restore.
    public func getDaoIdentifiers() : [DaoId] {
      Array.map<(DaoId, DaoBackupHandle), DaoId>(
        entries,
        func(entry : (DaoId, DaoBackupHandle)) : DaoId { entry.0 },
      );
    };

    /// Retorna apenas os identificadores dos DAOs que possuem ao menos uma
    /// referência de saída registrada (e portanto são candidatos à auditoria
    /// de integridade referencial). DAOs sem outcome references — como
    /// `image`, `configuration` ou entidades-raiz — são omitidos: auditá-los
    /// é trabalho garantido a custo zero.
    public func getAuditableDaoIdentifiers() : [DaoId] {
      let buffer = List.empty<DaoId>();
      for (entry in entries.values()) {
        if (entry.1.hasAuditors()) {
          List.add(buffer, entry.0);
        };
      };
      List.toArray(buffer);
    };

    /// Retorna o handle do DAO identificado por `id` ou `null` se o id é
    /// desconhecido.
    public func getHandle(id : DaoId) : ?DaoBackupHandle {
      for (entry in entries.values()) {
        if (entry.0 == id) {
          return ?entry.1;
        };
      };
      null;
    };

    /// Itera sobre todos os pares `(DaoId, DaoBackupHandle)` na ordem
    /// definida no registry. Utilizado por serviços administrativos
    /// (`MaintenanceService`, `CacheControl`) para aplicar operações
    /// uniformes sobre todos os DAOs.
    public func entriesIter() : Iter.Iter<(DaoId, DaoBackupHandle)> {
      entries.values();
    };
  };
};
