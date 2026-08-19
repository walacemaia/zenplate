import Map "mo:core/Map";
import Text "mo:core/Text";

import CoreTranslator "mo:cacheddb/translation/CoreTranslator";

module {

  // Shortcuts
  type Map<K, V> = Map.Map<K, V>;

  /* ---------------------------------------------------------------------- */
  /*                                  Keys                                  */
  /* ---------------------------------------------------------------------- */

  public let management = "management";
  public let appSlogan = "appSlogan";
  public let none = "none";
  public let remove = "remove";
  public let apply = "apply";
  public let failedToLoad = "failedToLoad";

  // Profile
  public let profile = "profile";
  public let profilePlural = "profilePlural";
  public let profileUserName = "profileUserName";
  public let profileDisplayName = "profileDisplayName";
  public let profileUserBio = "profileUserBio";
  public let profileLanguage = "profileLanguage";
  public let profileUserNameUniqueness = "profileUserNameUniqueness";
  public let profilePrincipalUniqueness = "profilePrincipalUniqueness";
  public let profileUploadAvatar = "profileUploadAvatar";
  public let profileRemoveAvatar = "profileRemoveAvatar";
  public let profileCountry = "profileCountry";
  public let profileEmail = "profileEmail";
  public let profileChooseCountry = "profileChooseCountry";
  public let profilePrincipal = "profilePrincipal";
  public let principalCopied = "principalCopied";
  public let profileAdminSelfDemotion = "profileAdminSelfDemotion";
  public let profileEmailRequired = "profileEmailRequired";
  public let invalidEmailAddress = "invalidEmailAddress";
  public let profileUserNameRequired = "profileUserNameRequired";
  public let profileAvatarSizeExceeded = "profileAvatarSizeExceeded";

  // Configuration
  public let configuration = "configuration";
  public let logLevel = "logLevel";
  public let maxProfileImageSize = "maxProfileImageSize";
  public let eventsForCacheWarmup = "eventsForCacheWarmup";
  public let configurationLogLevelRequired = "configurationLogLevelRequired";
  public let configurationMaxProfileImageSizePositive = "configurationMaxProfileImageSizePositive";
  public let configurationEventsForCacheWarmupPositive = "configurationEventsForCacheWarmupPositive";

  // Genéricos de UI (grid/filtros/diálogos — usados pelo kit de componentes)
  public let clear = "clear";
  public let overview = "overview";

  public func multiLanguageSupport() : Map<Text, Map<Text, Text>> {
    let map = Map.empty<Text, Map<Text, Text>>();
    Map.add(map, Text.compare, CoreTranslator.code(#ptbr), ptbrDictionary(?CoreTranslator.ptbrDictionary(null)));
    Map.add(map, Text.compare, CoreTranslator.code(#en), enDictionary(?CoreTranslator.enDictionary(null)));
    map;
  };

  private func add(map : Map<Text, Text>, key : Text, value : Text) : () {
    Map.add(map, Text.compare, key, value);
  };

  /* ---------------------------------------------------------------------- */
  /*                                  PTBR                                  */
  /* ---------------------------------------------------------------------- */
  private func ptbrDictionary(base : ?Map<Text, Text>) : Map<Text, Text> {
    let map = Map.empty<Text, Text>();
    CoreTranslator.putAll(base, map);
    add(map, appSlogan, "Caminhe com calma para chegar rápido.");
    add(map, none, "Nenhuma");
    add(map, remove, "Remover");
    add(map, apply, "Aplicar");
    add(map, failedToLoad, "Falha ao carregar.");

    add(map, management, "Gerenciamento");

    // Profile
    add(map, profile, "Profile");
    add(map, profilePlural, "Profiles");
    add(map, profileUserName, "Username");
    add(map, profileDisplayName, "Nome de apresentação");
    add(map, profileUserBio, "Sobre você");
    add(map, profileLanguage, "Idioma preferido");
    add(map, profileUserNameUniqueness, "Este nome de usuário já se encontra em uso.");
    add(map, profilePrincipalUniqueness, "Já existe um profile para o usuário.");
    add(map, profileUploadAvatar, "Carregar imagem");
    add(map, profileRemoveAvatar, "Remover imagem");
    add(map, profileCountry, "País");
    add(map, profileEmail, "E-mail");
    add(map, profileChooseCountry, "Escolha um país");
    add(map, profilePrincipal, "Principal");
    add(map, principalCopied, "Principal copiado para a área de transferência.");
    add(map, profileAdminSelfDemotion, "Administradores não podem se despromover.");
    add(map, profileEmailRequired, "E-mail é obrigatório.");
    add(map, invalidEmailAddress, "Endereço de e-mail inválido.");
    add(map, profileUserNameRequired, "Nome de usuário é obrigatório.");
    add(map, profileAvatarSizeExceeded, "O tamanho da imagem de perfil excede o limite permitido.");

    // Configuration
    add(map, configuration, "Configuração");
    add(map, logLevel, "Nível de Log");
    add(map, configurationLogLevelRequired, "Nível de log é obrigatório.");
    add(map, maxProfileImageSize, "Tamanho Máximo da Imagem de Perfil (bytes)");
    add(map, configurationMaxProfileImageSizePositive, "Tamanho máximo da imagem de perfil deve ser positivo.");
    add(map, eventsForCacheWarmup, "Eventos para Aquecimento de Cache");
    add(map, configurationEventsForCacheWarmupPositive, "Eventos para aquecimento de cache deve ser positivo.");

    // Genéricos de UI
    add(map, clear, "Limpar");
    add(map, overview, "Visão Geral");

    return map;
  };

  /* ---------------------------------------------------------------------- */
  /*                                   EN                                   */
  /* ---------------------------------------------------------------------- */
  private func enDictionary(base : ?Map<Text, Text>) : Map<Text, Text> {
    let map = Map.empty<Text, Text>();
    CoreTranslator.putAll(base, map);
    add(map, appSlogan, "Walk slowly, arrive quickly.");
    add(map, none, "None");
    add(map, remove, "Remove");
    add(map, apply, "Apply");
    add(map, failedToLoad, "Failed to load.");

    add(map, management, "Management");

    // Profile
    add(map, profile, "Profile");
    add(map, profilePlural, "Profiles");
    add(map, profileUserName, "Username");
    add(map, profileDisplayName, "Display Name");
    add(map, profileUserBio, "About You");
    add(map, profileLanguage, "Preferred Language");
    add(map, profileUserNameUniqueness, "This username is already in use.");
    add(map, profilePrincipalUniqueness, "A profile for this user already exists.");
    add(map, profileUploadAvatar, "Load picture");
    add(map, profileRemoveAvatar, "Remove picture");
    add(map, profileCountry, "Country");
    add(map, profileEmail, "E-mail");
    add(map, profileChooseCountry, "Choose a country");
    add(map, profilePrincipal, "Principal");
    add(map, principalCopied, "Principal copied to clipboard.");
    add(map, profileAdminSelfDemotion, "Administrators cannot demote themselves.");
    add(map, profileEmailRequired, "E-mail is required.");
    add(map, invalidEmailAddress, "Invalid e-mail address.");
    add(map, profileUserNameRequired, "Username is required.");
    add(map, profileAvatarSizeExceeded, "The profile image size exceeds the allowed limit.");

    // Configuration
    add(map, configuration, "Configuration");
    add(map, logLevel, "Log Level");
    add(map, configurationLogLevelRequired, "Log level is required.");
    add(map, maxProfileImageSize, "Max Profile Image Size (bytes)");
    add(map, configurationMaxProfileImageSizePositive, "Max profile image size must be positive.");
    add(map, eventsForCacheWarmup, "Events for Cache Warmup");
    add(map, configurationEventsForCacheWarmupPositive, "Events for cache warmup must be positive.");

    // Generic UI
    add(map, clear, "Clear");
    add(map, overview, "Overview");

    return map;
  };

};
