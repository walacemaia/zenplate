import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Nat "mo:core/Nat";

/// Conjunto de `Nat` baseado em `Map<Nat, Bool>`. Pequena fachada para as
/// operações que aparecem repetidamente nas rotinas de filtragem e warmup
/// da `IcpAppDatabase`. Não pretende substituir `Map` em geral — apenas
/// encapsular o uso comum "set of ids" para evitar repetir `Nat.compare`,
/// boilerplate de iteração e a conversão `(key, _)` → `key`.
module {

  public type NatSet = Map.Map<Nat, Bool>;

  /// Conjunto vazio.
  public func empty() : NatSet {
    Map.empty<Nat, Bool>();
  };

  /// Adiciona `id` ao conjunto. Sem efeito se já estava presente.
  public func add(set : NatSet, id : Nat) {
    Map.add(set, Nat.compare, id, true);
  };

  /// Indica se `id` pertence ao conjunto.
  public func has(set : NatSet, id : Nat) : Bool {
    switch (Map.get(set, Nat.compare, id)) {
      case (?_) true;
      case null false;
    };
  };

  /// Adiciona em massa todos os ids vindos de um iterador.
  public func addAllFromIter(set : NatSet, ids : Iter.Iter<Nat>) {
    for (id in ids) {
      add(set, id);
    };
  };

  /// Intersecção: retorna um conjunto novo com os ids presentes em ambos.
  public func intersect(left : NatSet, right : NatSet) : NatSet {
    let result = empty();
    for ((id, _) in Map.entries(left)) {
      if (has(right, id)) {
        add(result, id);
      };
    };
    result;
  };

  /// Iterador apenas das chaves do conjunto (descarta os valores `Bool`).
  public func keys(set : NatSet) : Iter.Iter<Nat> {
    let entries = Map.entries(set);
    object {
      public func next() : ?Nat {
        switch (entries.next()) {
          case (?(id, _)) ?id;
          case null null;
        };
      };
    };
  };
};
