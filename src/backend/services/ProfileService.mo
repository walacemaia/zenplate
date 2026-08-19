import Prim "mo:⛔";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Runtime "mo:core/Runtime";

import CoreTranslator "mo:cacheddb/translation/CoreTranslator";

import ProfileDAO "../model/ProfileDAO";
import IcpAppTranslator "../translation/IcpAppTranslator";

/// Service de Profile.
///
/// Concentra as operacoes de dominio sobre Profile que antes ficavam
/// espalhadas em `main.mo`. Recebe apenas o `ProfileDAO` — nao depende de
/// nenhum outro service (folha do grafo).
///
/// O service nao faz autorizacao: cabe ao `main.mo` aplicar
/// `checkAuthenticated` / `checkAdminAuthorization` etc. antes de chamar
/// estas operacoes. A unica excecao e `isAdmin`, cuja semantica e
/// "este Principal pode atuar como admin?" — esta e uma regra de dominio
/// e mora aqui (o endpoint `isAdmin` em main.mo apenas delega).
module {

  public type Profile = ProfileDAO.Profile;
  type Result<Ok, Err> = Result.Result<Ok, Err>;
  type Language = CoreTranslator.Language;

  public class ProfileService(profileDAO : ProfileDAO.ProfileDAO) {

    // -----------------------------------------------------------------------
    // Setup: view adapter para o campo derivado `isController`.
    //
    // O Profile possui um campo `isController : ?Bool` que NAO e estado
    // persistido autoritativo: ele descreve, no momento da consulta, se o
    // `principal` daquele Profile e um controller do canister. Ja que essa
    // informacao varia conforme as settings do canister (controllers podem
    // ser adicionados/removidos pela equipe), preenche-la apenas no momento
    // da leitura (via adapter) e a forma correta — mais detalhes na definicao
    // de Profile em ProfileDAO.
    // -----------------------------------------------------------------------
    profileDAO.store.addViewAdapter({
      adapt = func(profile : Profile) : Profile {
        { profile with isController = ?Prim.isController(profile.principal) };
      };
    });

    // -----------------------------------------------------------------------
    // Operacoes thin pass-through ao DAO.
    // -----------------------------------------------------------------------

    /// Profile por id.
    public func getById(id : Nat) : ?Profile {
      profileDAO.getProfile(id);
    };

    /// Profile pelo Principal informado.
    public func getByPrincipal(principal : Principal) : ?Profile {
      profileDAO.getProfileByPrincipal(principal);
    };

    /// Cria um Profile default associado ao Principal informado.
    public func createForPrincipal(principal : Principal) : Profile {
      profileDAO.createProfileForPrincipal(principal);
    };

    /// Adiciona um Profile fornecido. Regra "primeiro Profile vira admin"
    /// mora no proprio DAO.
    public func add(profile : Profile, caller : Principal) : Result<Profile, [Text]> {
      profileDAO.addProfile(profile, caller);
    };

    /// Atualiza Profile existente.
    public func update(profile : Profile) : Result<Profile, [Text]> {
      profileDAO.updateProfile(profile);
    };

    /// Remove Profile pelo id.
    public func delete(id : Nat) : Result<Nat, [Text]> {
      profileDAO.deleteProfile(id);
    };

    /// Pagina os Profiles aplicando filtros/ordenacao no DAO.
    public func getPaginated({
      filters : Text;
      sortField : Text;
      sortOrder : Text;
      start : Nat;
      pageSize : Nat;
      language : Language;
    }) : ([Profile], Nat) {
      profileDAO.store.getAllObjectsPaginated {
        filters;
        sortColumn = sortField;
        sortOrder;
        start;
        pageSize;
        adapt = true;
        language;
      };
    };

    /// Campos disponiveis para ordenacao da pagina.
    public func getSortableFields() : [Text] {
      profileDAO.store.getSortableFields();
    };

    // -----------------------------------------------------------------------
    // Operacoes com regra de dominio.
    // -----------------------------------------------------------------------

    /// Indica se o Principal pode atuar como administrador.
    /// Controllers do canister tem acesso administrativo intrinseco;
    /// usuarios precisam ter `role == #admin` no proprio Profile.
    public func isAdmin(principal : Principal) : Bool {
      if (Prim.isController(principal)) {
        return true;
      };
      switch (profileDAO.getProfileByPrincipal(principal)) {
        case (?p) { p.role == #admin };
        case null false;
      };
    };

    /// Promove o Profile identificado por `profileId` a admin.
    /// Mantem o comportamento original do endpoint: trap se Profile nao
    /// existir (mensagem preservada byte-a-byte).
    public func promote(profileId : Nat) : Result<Profile, [Text]> {
      switch (profileDAO.getProfile(profileId)) {
        case (?p) {
          let adminProfile = { p with role = #admin };
          profileDAO.updateProfile(adminProfile);
        };
        case null {
          Runtime.trap("Profile not found for ID: " # Nat.toText(profileId));
        };
      };
    };

    /// Rebaixa o Profile identificado por `profileId` a usuario comum.
    /// `callerProfileId` e usado apenas para a guarda de auto-rebaixamento
    /// (admin nao pode rebaixar a si mesmo). A guarda preserva o trap
    /// original via `IcpAppTranslator.profileAdminSelfDemotion`.
    public func demote(profileId : Nat, callerProfileId : Nat) : Result<Profile, [Text]> {
      if (profileId == callerProfileId) {
        Runtime.trap(IcpAppTranslator.profileAdminSelfDemotion);
      };
      switch (profileDAO.getProfile(profileId)) {
        case (?p) {
          let demotedProfile = { p with role = #user };
          profileDAO.updateProfile(demotedProfile);
        };
        case null {
          Runtime.trap("Profile not found for ID: " # Nat.toText(profileId));
        };
      };
    };

    /// Idioma preferido do Principal. Retorna `#en` quando o Profile nao
    /// existe — comportamento usado por traducoes durante operacoes em
    /// que o caller ainda nao registrou Profile.
    public func getLanguage(principal : Principal) : Language {
      switch (profileDAO.getProfileByPrincipal(principal)) {
        case (?p) p.language;
        case null #en;
      };
    };
  };
};
