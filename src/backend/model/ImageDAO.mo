import Runtime "mo:core/Runtime";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Result "mo:core/Result";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Int "mo:core/Int";
import Blob "mo:core/Blob";
import Nat16 "mo:core/Nat16";

import DataAccessObject "mo:cacheddb/DataAccessObject";
import CoreTranslator "mo:cacheddb/translation/CoreTranslator";
import Repository "mo:cacheddb/Repository";
import Logger "mo:cacheddb/utils/Logger";

module {

    // Shortcuts
    type Result<Ok, Err> = Result.Result<Ok, Err>;
    type List<T> = List.List<T>;
    type Text = Text.Text;
    type Validation<K> = DataAccessObject.Validation<K>;
    type Language = CoreTranslator.Language;

    ///----------------------------------------------------------------------------
    /// IMAGE
    ///----------------------------------------------------------------------------
    ///
    /// Contrato:
    /// - `Image` é um blob store genérico, sem dono fixo. Neste template não
    ///   há nenhuma entidade que a referencie (o avatar de `Profile` é
    ///   armazenado inline como `Blob`, não via `ImageDAO`) — está pronta
    ///   para ser adotada por uma entidade nova (ex.: como weak entity, ao
    ///   estilo `Question -> Image` do Zenquest: sem `Reference` registrada
    ///   na `IcpAppDatabase`, ciclo de vida gerido pelos hooks do DAO dono).
    /// - Se `addImage`/`updateImage`/`deleteImage` ficarem restritos a uso
    ///   interno (via DAO proprietário), não os exponha como endpoints
    ///   públicos em `main.mo` — mantenha a Image acessível só pelo ponto de
    ///   entrada da entidade proprietária, como no exemplo do Zenquest.
    ///----------------------------------------------------------------------------

    public let CURRENT_IMAGE_VERSION : Nat16 = 0;

    public type Image = DataAccessObject.BusinessObject<Nat> and {
        parentKey : Text;
        data : Blob;
    };

    ///----------------------------------------------------------------------------
    /// SERIALIZAÇÃO
    ///----------------------------------------------------------------------------

    private func decodeImageV0(version : Nat16, contentBlob : Blob) : Image {
        switch ((from_candid (contentBlob)) : ?Image) {
            case (?o) o;
            case (null) Runtime.trap("Failed to decode Image version " # debug_show (version));
        };
    };

    private func migrateToCurrent(version : Nat16, contentBlob : Blob) : Image {
        switch (version) {
            case (0) {
                decodeImageV0(version, contentBlob);
            };
            case (_) {
                Runtime.trap("Unsupported Image version: " # debug_show (version));
            };
        };
    };

    public let imageBlobify : Repository.Blobify<Image> = {

        to_blob = func(obj : Image) : Blob {
            Repository.addVersion(
                CURRENT_IMAGE_VERSION,
                to_candid (obj),
            );
        };

        from_blob = func(blob : Blob) : Image {
            let (version, contentBlob) = Repository.splitBlob(blob);
            migrateToCurrent(version, contentBlob);
        };
    };

    ///----------------------------------------------------------------------------
    /// DAO
    ///----------------------------------------------------------------------------

    public class ImageDAO(logger : Logger.Logger) {
        private let repName = "IMAGE_DAO";

        /// Define como obter valores texto de propriedades.
        let textProperties : [(Text, Image -> Text)] = [
            ("id", func(obj : Image) : Text { Nat.toText(obj.id) }),
            ("lastChange", func(obj : Image) : Text { Nat.toText(Int.abs(obj.lastChange)) }),
        ];

        // Define como obter valores Nat de propriedades identifacas pelo nome (introspecção);
        let natProperties : [(Text, Image -> Nat)] = [
            ("id", func(obj : Image) : Nat { obj.id }),
            ("lastChange", func(obj : Image) : Nat { Int.abs(obj.lastChange) }),
        ];

        /// Data Access Object
        public let store = DataAccessObject.DataAccessObject<Nat, Image>({
            keyOf = func(obj : Image) : Nat { obj.id };
            keyToString = func(id : Nat) : Text {
                Nat.toText(id);
            };
            keyComparator = Nat.compare;
            valueBlobify = imageBlobify;
            repName = "IMAGE_DAO";
            natProperties;
            textProperties;
            logger;
        });

        // Imagens carregam blobs potencialmente grandes; manter cache em heap
        // desabilitado evita picos de memória em indexação/migração.
        store.setCacheEnabled(false);

        /* -------------------------------------------------------------------------- */
        /*                            Ações de atualização                            */
        /* -------------------------------------------------------------------------- */

        /// Função a ser executada ao incluir, permitindo alterações sobre o objeto.
        let onInsert = func(obj : Image) : Image {
            return {
                obj with id = store.nextSequenceId();
                lastChange = Time.now();
            };
        };

        /// Função a ser executada ao alterar, permitindo alterações sobre o objeto.
        let onUpdate = func(obj : Image) : Image {
            return {
                obj with lastChange = Time.now();
            };
        };

        store.beforeInsertObject := ?onInsert;
        store.beforeUpdateObject := ?onUpdate;

        // Validações

        store.addValidation(
            func(obj : Image) : Result<Image, Text> {
                if (Blob.size(obj.data) == 0) {
                    return #err("Image data cannot be empty");
                };
                #ok obj;
            }
        );

        // Indexes -------------------------------------------------------------
        // private let parentKeyIdx = store.addIndex({
        //     name = "IMAGE_PARENT_KEY_IDX";
        //     unique = false;
        //     uniquenessMessage = null;
        //     objectKey = func(obj : Image) : [Text] {
        //         [obj.parentKey];
        //     };
        // });

        /* -------------------------------------------------------------------------- */
        /*                            Funções de atualização                          */
        /* -------------------------------------------------------------------------- */

        /// Adiciona uma nova imagem ao banco de dados.
        /// - Parâmetros
        ///     - `obj` objeto a ser adicionado.
        /// -  Retorna: A imagem adicionada, eventualmente com atributos atualizados durante
        /// o processo, ou erro caso a nova imagem não possa ser inserida.
        public func addImage(obj : Image) : Result<Image, [Text]> {
            logger.debugInfo(repName, "addImage");
            store.addObject(obj);
        };

        /// Atualiza um objeto existente pelo ID.
        /// - Parâmetros
        ///     - `obj` nova versão do objeto.
        /// - Retorna  O objeto atualizado se a atualização foi bem-sucedida, ou erro se o
        /// objeto a ser atualizado não existe.
        public func updateImage(obj : Image) : Result<Image, [Text]> {
            logger.debugInfo(repName, "updateImage " # debug_show (obj.id));
            return store.updateObject(obj);
        };

        /// Remove um objeto pelo ID
        /// - Parâmetros
        ///     - `id` o identificador do objeto a ser removido.
        /// - Retorna: O objeto excluído ou erro se o objeto não existe.
        public func deleteImage(id : Nat) : Result<Nat, [Text]> {
            logger.debugInfo(repName, "deleteImage " # debug_show (id));
            return store.removeObject(id);
        };

        /* -------------------------------------------------------------------------- */
        /*                             Funções de pesquisa                            */
        /* -------------------------------------------------------------------------- */

        /// Retorna a imagem com o id informado.
        public func getImage(id : Nat) : ?Image {
            store.getObject(id);
        };

        // Retorna um Iterator para as chaves de todas as imagens.
        public func getAllImages() : Iter.Iter<Nat> {
            store.getAllKeys();
        };

        /// Utilitário interno de recovery: localiza imagens por `parentKey`
        /// via varredura completa (não há índice). Não exposto publicamente.
        private func _getImagesByParentKey(parentKey : Text) : Iter.Iter<Nat> {
            Iter.map<Image, Nat>(
                Iter.filter<Image>(
                    store.getAllObjects(),
                    func(img : Image) : Bool { img.parentKey == parentKey },
                ),
                func(img : Image) : Nat { img.id },
            );
        };
        ignore _getImagesByParentKey;

    };
};
