import Runtime "mo:core/Runtime";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Result "mo:core/Result";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Int "mo:core/Int";
import Option "mo:core/Option";
import Principal "mo:core/Principal";
import Blob "mo:core/Blob";
import Nat16 "mo:core/Nat16";

import DataAccessObject "mo:cacheddb/DataAccessObject";
import IcpAppTranslator "../translation/IcpAppTranslator";
import CoreTranslator "mo:cacheddb/translation/CoreTranslator";
import Repository "mo:cacheddb/Repository";
import Logger "mo:cacheddb/utils/Logger";

import ConfigurationDAO "./ConfigurationDAO";

module {

  // Shortcuts
  type Result<Ok, Err> = Result.Result<Ok, Err>;
  type List<T> = List.List<T>;
  type Text = Text.Text;
  type Validation<K> = DataAccessObject.Validation<K>;
  type Language = CoreTranslator.Language;

  ///----------------------------------------------------------------------------
  /// PROFILE
  ///----------------------------------------------------------------------------

  public let CURRENT_PROFILE_VERSION : Nat16 = 0;

  public type Role = {
    #user;
    #admin;
  };

  public type Profile = DataAccessObject.BusinessObject<Nat> and {
    userName : Text;
    displayName : ?Text;
    userBio : ?Text;
    avatar : ?Blob;
    principal : Principal;
    language : CoreTranslator.Language;
    country : ?Text;
    email : ?Text;
    role : Role;
    /// Indica se o `principal` deste profile e um controller do canister.
    /// Campo derivado em runtime (preenchido por view adapter); nao representa
    /// estado persistido autoritativo, e o adapter sobrescreve qualquer valor
    /// que tenha sido serializado.
    isController : ?Bool;
  };

  /// Cria um Profile default a partir dos campos obrigatórios informados.
  public func createDefaultProfile({ userName : Text; principal : Principal }) : Profile {
    {
      id = 0;
      lastChange = Time.now();
      userName = userName;
      displayName = null;
      userBio = null;
      avatar = null;
      language = #en;
      country = null;
      email = null;
      principal = principal;
      role = #user;
      isController = null;
    };
  };

  ///----------------------------------------------------------------------------
  /// SERIALIZAÇÃO
  ///----------------------------------------------------------------------------

  public let profileBlobify : Repository.Blobify<Profile> = {

    to_blob = func(obj : Profile) : Blob {
      Repository.addVersion(
        CURRENT_PROFILE_VERSION,
        to_candid (obj),
      );
    };

    from_blob = func(blob : Blob) : Profile {
      let (version, contentBlob) = Repository.splitBlob(blob);
      switch (version) {
        case (0) {
          switch ((from_candid (contentBlob)) : ?Profile) {
            case (?o) o;
            case (null) Runtime.trap("Failed to decode Profile version " # debug_show (version));
          };
        };
        case (_) {
          Runtime.trap("Unsupported Profile version: " # debug_show (version));
        };
      };
    };
  };

  ///----------------------------------------------------------------------------
  /// DAO
  ///----------------------------------------------------------------------------

  public class ProfileDAO(logger : Logger.Logger, configuration: () -> ConfigurationDAO.Configuration) {
    private let repName = "PROFILE_DAO";

    /// Define como obter valores texto de propriedades.
    let textProperties : [(Text, Profile -> Text)] = [
      ("id", func(obj : Profile) : Text { Nat.toText(obj.id) }),
      ("lastChange", func(obj : Profile) : Text { Nat.toText(Int.abs(obj.lastChange)) }),
      ("userName", func(obj : Profile) : Text { obj.userName }),
      ("displayName", func(obj : Profile) : Text { Option.get(obj.displayName, "") }),
      ("userBio", func(obj : Profile) : Text { Option.get(obj.userBio, "") }),
      ("email", func(obj : Profile) : Text { Option.get(obj.email, "") }),
      ("country", func(m : Profile) : Text { Option.get(m.country, "") }),
    ];

    // Define como obter valores Nat de propriedades identifacas pelo nome (introspecção);
    let natProperties : [(Text, Profile -> Nat)] = [
      ("id", func(obj : Profile) : Nat { obj.id }),
      ("ownerId", func(obj : Profile) : Nat { obj.id }),
      ("lastChange", func(obj : Profile) : Nat { Int.abs(obj.lastChange) }),
    ];

    /// Data Access Object
    public let store = DataAccessObject.DataAccessObject<Nat, Profile>({
      keyOf = func(obj : Profile) : Nat { obj.id };
      keyToString = func(id : Nat) : Text {
        Nat.toText(id);
      };
      keyComparator = Nat.compare;
      valueBlobify = profileBlobify;
      repName = "PROFILE_DAO";
      natProperties;
      textProperties;
      logger;
    });


    /* -------------------------------------------------------------------------- */
    /*                            Ações de atualização                            */
    /* -------------------------------------------------------------------------- */

    /// Função a ser executada ao incluir, permitindo alterações sobre o objeto.
    let onInsert = func(obj : Profile) : Profile {
      return {
        obj with id = store.nextSequenceId();
        lastChange = Time.now();
      };
    };

    /// Função a ser executada ao alterar, permitindo alterações sobre o objeto.
    let onUpdate = func(obj : Profile) : Profile {
      return {
        obj with lastChange = Time.now();
      };
    };

    store.beforeInsertObject := ?onInsert;
    store.beforeUpdateObject := ?onUpdate;

    // Validações

    store.addValidation(
      func(obj : Profile) : Result<Profile, Text> {
        if (Text.size(obj.userName) == 0) {
          return #err(IcpAppTranslator.profileUserNameRequired);
        };
        #ok obj;
      }
    );

    store.addValidation(
      func(obj : Profile) : Result<Profile, Text> {
        let maxImageSize : Nat = configuration().maxProfileImageSize;
        logger.debugInfo(repName, "Validating avatar size, max allowed: " # debug_show (maxImageSize));
        if (Option.isSome(obj.avatar)) {
          let avatarBlob = Option.get(obj.avatar, Blob.empty());
          if (Blob.size(avatarBlob) > maxImageSize) {
            return #err(IcpAppTranslator.profileAvatarSizeExceeded);
          };
        };  
        #ok obj;
      }
    );

    // Indexes -------------------------------------------------------------

    private let userNameIdx = store.addIndex({
      name = "PROFILE_NAME_IDX";
      unique = true;
      uniquenessMessage = ?IcpAppTranslator.profileUserNameUniqueness;
      objectKey = func(obj : Profile) : [Text] {
        [obj.userName];
      };
    });

    private let userPrincipalIdx = store.addIndex({
      name = "PROFILE_PRINCIPAL_IDX";
      unique = true;
      uniquenessMessage = ?IcpAppTranslator.profilePrincipalUniqueness;
      objectKey = func(obj : Profile) : [Text] {
        [Principal.toText(obj.principal)];
      };
    });

    /* -------------------------------------------------------------------------- */
    /*                            Funções de atualização                          */
    /* -------------------------------------------------------------------------- */

    /// Adiciona um novo profile ao banco de dados.
    /// - Parâmetros
    ///     - `obj` objeto a ser adicionado.
    ///     - `caller` Principal que está inserindo o novo profile.
    /// -  Retorna: O profile adicionado, eventualmente com atributos atualizados durante
    /// o processo, ou ```null``` caso o novo profile não possa ser inserido.
    public func addProfile(obj : Profile, caller : Principal) : Result<Profile, [Text]> {
      logger.debugInfo(repName, "addProfile");
      // O primeiro profile criado será um admin
      let newProfile = switch (store.isEmpty()) {
        case (true) {
          {
            obj with
            role = #admin;
          };
        };
        case (false) { { obj with role = #user } };
      };
      store.addObject({ newProfile with principal = caller });
    };

    /// Atualiza um objeto existente pelo ID.
    /// - Parâmetros
    ///     - `obj` nova versão do objeto.
    /// - Retorna  O objeto atualizado se a atualização foi bem-sucedida, ou `null` se o
    /// objeto a ser atualizado não existe.
    public func updateProfile(obj : Profile) : Result<Profile, [Text]> {
      logger.debugInfo(repName, "updateProfile " # debug_show (obj));
      return store.updateObject(obj);
    };

    /// Remove um profile pelo ID
    /// - Parâmetros
    ///     - `id` o identificador do profile  a ser removido.
    ///     - `caller` o Principal responsável pela exclusão para validação da autorização de remoção do usuário.
    /// - Retorna: O objeto excluído ou null se o objeto não existe.
    public func deleteProfile(id : Nat) : Result<Nat, [Text]> {
      logger.debugInfo(repName, "deleteProfile " # debug_show (id));
      return store.removeObject(id);
    };

    /// Cria um profile para o `Principal` informado.
    private func profileFromPrincipal(principal : Principal) : Profile {
      createDefaultProfile({
        userName = Principal.toText(principal);
        principal;
      });
    };

    /// Cria um usuário para o `Principal` informado.
    /// - Parâmetros
    ///     - `principal` o `Principal` para o qual o usuário será criado.
    /// - Retorna: O usuário criado.
    public func createProfileForPrincipal(principal : Principal) : Profile {
      let newProfile = profileFromPrincipal(principal);
      switch (addProfile(newProfile, principal)) {
        case (#ok p) p;
        case (#err msg) Runtime.trap(msg[0]);
      };
    };

    /// Obtém o usuário referente ao `Principal` informado, criando um caso ainda não exista.
    public func getOrCreateProfileByPrincipal(principal : Principal) : Profile {
      let profile = store.getObjectsByIndex(userPrincipalIdx, ?Principal.toText(principal)).next();
      switch (profile) {
        case null {
          createProfileForPrincipal(principal);
        };
        case (?p) {
          logger.debugInfo(repName,"profile carregado: " # Principal.toText(p.principal));
          p;
        };
      };
    };

    /* -------------------------------------------------------------------------- */
    /*                             Funções de pesquisa                            */
    /* -------------------------------------------------------------------------- */

    /// Retorna o profile com o id informado.
    public func getProfile(id : Nat) : ?Profile {
      store.getObject(id);
    };

    /// Retorna o profile com o userName informado.
    public func getProfileByUserName(userName : Text) : ?Profile {
      store.getObjectsByIndex(userNameIdx, ?userName).next();
    };

    /// Obtém o profile referente ao `Principal` informado.
    public func getProfileByPrincipal(principal : Principal) : ?Profile {
      store.getObjectsByIndex(userPrincipalIdx, ?Principal.toText(principal)).next();
    };

    // Retorna um Iterator para as chaves de todos os profiles.
    public func getAllProfiles() : Iter.Iter<Nat> {
      store.getAllKeys();
    };

  };
};
