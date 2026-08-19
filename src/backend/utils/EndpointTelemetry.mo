import Prim "mo:⛔";
import Nat "mo:core/Nat";
import Nat64 "mo:core/Nat64";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Iter "mo:core/Iter";

/// Telemetria leve para endpoints/funcoes de um canister IC.
///
/// Cada chamada e' instrumentada com:
///   - delta de instrucoes executadas (`Prim.performanceCounter(0)`)
///   - delta de cycles consumidos (`Prim.cyclesBalance()`)
///   - duracao em nanossegundos (`Time.now()`)
///
/// O `Tracker` mantem agregados por nome (calls, total, max, last) em memoria.
/// Por usar `Map` e leituras de cycles, o estado deve viver em campo
/// `transient` do actor — `entries()` continua produzindo dados a cada chamada.
///
/// Modulo independente do dominio: nao referencia tipos ou servicos do
/// projeto, apto a ser promovido para biblioteca compartilhada entre
/// projetos Motoko/ICP.
module {

  public type Stats = {
    calls : Nat;
    totalInstructions : Nat;
    maxInstructions : Nat;
    totalCycles : Nat;
    maxCycles : Nat;
    totalDurationNs : Nat;
    maxDurationNs : Nat;
    lastInstructions : Nat;
    lastCycles : Nat;
    lastDurationNs : Nat;
    lastSeenAtNs : Int;
  };

  public type Probe = {
    name : Text;
    startedAtNs : Int;
    instructionsBefore : Nat;
    cyclesBefore : Nat;
  };

  private func emptyStats() : Stats {
    {
      calls = 0;
      totalInstructions = 0;
      maxInstructions = 0;
      totalCycles = 0;
      maxCycles = 0;
      totalDurationNs = 0;
      maxDurationNs = 0;
      lastInstructions = 0;
      lastCycles = 0;
      lastDurationNs = 0;
      lastSeenAtNs = 0;
    };
  };

  /// Agregador de telemetria por nome.
  public class Tracker() {

    let stats = Map.empty<Text, Stats>();

    /// Inicia uma sonda capturando instrucoes/cycles/tempo correntes.
    public func begin(name : Text) : Probe {
      {
        name;
        startedAtNs = Time.now();
        instructionsBefore = Nat64.toNat(Prim.performanceCounter(0));
        cyclesBefore = Prim.cyclesBalance();
      };
    };

    /// Encerra a sonda e acumula deltas nas estatisticas do `probe.name`.
    public func record(probe : Probe) {
      let instructionsAfter = Nat64.toNat(Prim.performanceCounter(0));
      let cyclesAfter = Prim.cyclesBalance();
      let endedAtNs = Time.now();

      let deltaInstructions = Int.abs(Nat.toInt(instructionsAfter) - Nat.toInt(probe.instructionsBefore));
      let deltaCycles = Int.abs(Nat.toInt(probe.cyclesBefore) - Nat.toInt(cyclesAfter));
      let deltaDurationNs = Int.abs(endedAtNs - probe.startedAtNs);

      let current = switch (Map.get(stats, Text.compare, probe.name)) {
        case (?s) s;
        case null emptyStats();
      };

      Map.add(
        stats,
        Text.compare,
        probe.name,
        {
          calls = current.calls + 1;
          totalInstructions = current.totalInstructions + deltaInstructions;
          maxInstructions = Nat.max(current.maxInstructions, deltaInstructions);
          totalCycles = current.totalCycles + deltaCycles;
          maxCycles = Nat.max(current.maxCycles, deltaCycles);
          totalDurationNs = current.totalDurationNs + deltaDurationNs;
          maxDurationNs = Nat.max(current.maxDurationNs, deltaDurationNs);
          lastInstructions = deltaInstructions;
          lastCycles = deltaCycles;
          lastDurationNs = deltaDurationNs;
          lastSeenAtNs = endedAtNs;
        },
      );
    };

    /// Instrumenta a execucao sincrona de `run`, acumulando estatisticas em `name`.
    public func track<T>(name : Text, run : () -> T) : T {
      let probe = begin(name);
      let result = run();
      record(probe);
      result;
    };

    /// Estatisticas atuais para um nome especifico.
    public func get(name : Text) : ?Stats {
      Map.get(stats, Text.compare, name);
    };

    /// Iterador sobre `(name, stats)` para snapshots/relatorios.
    public func entries() : Iter.Iter<(Text, Stats)> {
      Map.entries(stats);
    };

    /// Limpa todas as estatisticas acumuladas.
    public func reset() {
      Map.clear(stats);
    };
  };

};
