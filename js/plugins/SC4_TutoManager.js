//=============================================================================
// SC4_TutoManager.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Moteur de didacticiel contextuel, file d'attente et état d'aide contextuelle ($tutoManager).
 * @author SimCraft
 * @help
 * ============================================================================
 * SC4_TutoManager.js
 * ============================================================================
 * Gère l'orchestration des tutoriels contextuels dans SimCraft 4 :
 * - Vérification de l'option globale d'aide contextuelle (ConfigManager.contextualHelp).
 * - Registre des tutoriels déjà visualisés (_seenTutos) persisté dans la sauvegarde.
 * - File d'attente ordonnée (_queue) et affichage séquentiel.
 * - Déclenchement via $tutoManager.show(tutoId, data) ou showTuto(tutoId, data).
 * - Support des coordonnées cibles ({ xMap, yMap } ou { x, y }) et flèche indicative.
 * ============================================================================
 */

(() => {
    "use strict";

    class TutoManager {
        constructor() {
            this._seenTutos = {};
            this._queue = [];
            this._current = null;
        }

        /**
         * Recherche les métadonnées d'un tutoriel dans $dataTutos.
         * @param {number|string|object} tutoId ID numérique, clé (ex: "tuto_0") ou objet direct.
         * @returns {object|null}
         */
        findTutoData(tutoId) {
            if (!tutoId) return null;
            if (typeof tutoId === "object" && (tutoId.id !== undefined || tutoId.key !== undefined)) {
                return tutoId;
            }
            const list = window.$dataTutos || [];
            if (Array.isArray(list)) {
                for (let i = 1; i < list.length; i++) {
                    const item = list[i];
                    if (!item) continue;
                    if (item.id === tutoId || item.key === tutoId || String(item.id) === String(tutoId)) {
                        return item;
                    }
                }
            }
            return null;
        }

        /**
         * Déclenche l'affichage d'un tutoriel contextuel.
         * Si tutoId est un tableau, délègue automatiquement à showTutos.
         * @param {number|string|object|Array} tutoId ID ou clé de tutoriel dans $dataTutos (ou tableau).
         * @param {object} [data={}] Paramètres optionnels (coord, arrow, imgName, force, txt, name, iconIndex, width).
         * @returns {boolean|number} True si le tutoriel a été pris en compte/mis en file (ou nombre pour showTutos).
         */
        show(tutoId, data = {}) {
            if (typeof data === "string") {
                data = { position: data };
            }

            if (Array.isArray(tutoId)) {
                return this.showTutos(tutoId);
            }

            if (typeof ConfigManager !== "undefined" && ConfigManager.contextualHelp === false) {
                return false;
            }

            const item = this.findTutoData(tutoId);
            if (!item) {
                console.warn(`[SC4_TutoManager] Tutoriel introuvable : ${tutoId}`);
                return false;
            }

            const keyOrId = item.key || item.id;
            if (this.isSeen(keyOrId) && !data.force) {
                return false;
            }

            // Marque immédiatement comme vu pour éviter les déclenchements en doublon
            if (item.key) this._seenTutos[item.key] = true;
            if (item.id) this._seenTutos[item.id] = true;

            // Récupération du texte traduit si disponible via SC4_Localization
            let resolvedTxt = data.txt || item.txt || "";
            if (typeof SC4_Localization !== "undefined" && item.key) {
                const locTxt = SC4_Localization.getText(item.key, "");
                if (locTxt) resolvedTxt = locTxt;
            }

            // Résolution prioritaire du titre traduit : clé tutoName_[ID_DU_TUTO] via SC4_Localization
            let resolvedName = data.name || "";
            if (!resolvedName) {
                const idKey = `tutoName_${item.id !== undefined ? item.id : item.key}`;
                if (typeof SC4_Localization !== "undefined" && typeof SC4_Localization.getText === "function") {
                    const locById = SC4_Localization.getText(idKey, "");
                    if (locById && locById !== idKey) {
                        resolvedName = locById;
                    } else if (item.key) {
                        const keyKey = `tutoName_${item.key}`;
                        const locByKey = SC4_Localization.getText(keyKey, "");
                        if (locByKey && locByKey !== keyKey) {
                            resolvedName = locByKey;
                        }
                    }
                }
                // Si aucune traduction n'est trouvée dans le dictionnaire, afficher directement tutoName_[ID]
                if (!resolvedName) {
                    resolvedName = idKey;
                }
            }

            // Résolution prioritaire de l'icône : data de l'appel => data du json/item => index 0 par défaut
            let resolvedIconIndex = 0;
            if (data && data.iconIndex !== undefined) {
                resolvedIconIndex = Number(data.iconIndex);
            } else if (item && item.iconIndex !== undefined) {
                resolvedIconIndex = Number(item.iconIndex);
            }

            // Résolution de la largeur personnalisée éventuelle
            const customWidth = (data && data.width !== undefined)
                ? Number(data.width)
                : ((item && item.width !== undefined) ? Number(item.width) : null);

            // Résolution du positionnement par mot-clé (ex: "top", "bottom-right", "top-left") ou coordonnées
            const rawPosition = (data && (data.position || data.pos))
                || (data && typeof data.coord === "string" ? data.coord : null)
                || item.position || item.pos
                || (typeof item.coord === "string" ? item.coord : null)
                || null;

            const tutoEntry = {
                id: item.id,
                key: item.key,
                name: resolvedName,
                txt: resolvedTxt,
                iconIndex: resolvedIconIndex,
                width: customWidth,
                img: data.imgName !== undefined ? data.imgName : (item.img || null),
                position: rawPosition,
                coord: (data && typeof data.coord === "object") ? data.coord : ((typeof item.coord === "object") ? item.coord : null),
                arrow: data.arrow || null,    // { xMap, yMap, x, y, angle }
                padding: (data && data.padding !== undefined) ? data.padding : (item.padding !== undefined ? item.padding : null),
                force: Boolean(data.force)
            };

            this._queue.push(tutoEntry);

            if (!this._current) {
                this.processNext();
            }

            return true;
        }

        /**
         * Alias pour show()
         */
        showTuto(tutoId, data = {}) {
            if (typeof data === "string") {
                data = { position: data };
            }
            if (Array.isArray(tutoId)) {
                return this.showTutos(tutoId);
            }
            return this.show(tutoId, data);
        }

        /**
         * Déclenche ou enfile une série de plusieurs tutoriels d'un coup.
         * Accepte un tableau d'identifiants (IDs numériques ou clés) ou d'objets de configuration.
         * Exemples :
         *   $tutoManager.showTutos([1, 2, "tuto_sector"]);
         *   $tutoManager.showTutos([{ id: "tuto_1" }, { id: 1, data: { xMap: 4, yMap: 15 } }, 2, "tuto_2"]);
         * @param {Array<number|string|object>} list
         * @returns {number} Nombre de tutoriels ajoutés avec succès à la file.
         */
        showTutos(list) {
            if (!Array.isArray(list)) return 0;
            let addedCount = 0;
            for (const item of list) {
                if (item === null || item === undefined) continue;
                if (typeof item === "number" || typeof item === "string") {
                    if (this.show(item)) addedCount++;
                } else if (typeof item === "object") {
                    const tutoId = (item.id !== undefined) ? item.id : ((item.key !== undefined) ? item.key : item);
                    const data = item.data || item;
                    if (this.show(tutoId, data)) addedCount++;
                }
            }
            return addedCount;
        }

        /**
         * Vérifie si une boîte de dialogue ou fenêtre de message est actuellement active ou en cours d'affichage/fermeture.
         * @returns {boolean}
         */
        isMessageActive() {
            if (typeof $gameMessage !== "undefined" && $gameMessage && typeof $gameMessage.isBusy === "function") {
                if ($gameMessage.isBusy()) return true;
            }
            if (typeof SceneManager !== "undefined" && SceneManager._scene) {
                const scene = SceneManager._scene;
                if (scene._messageWindow && typeof scene._messageWindow.isClosed === "function") {
                    if (!scene._messageWindow.isClosed()) return true;
                }
                if (scene._scrollTextWindow && typeof scene._scrollTextWindow.isClosed === "function") {
                    if (!scene._scrollTextWindow.isClosed()) return true;
                }
            }
            return false;
        }

        /**
         * Vérifie si le gestionnaire peut dépiler et afficher le prochain tutoriel.
         * @returns {boolean}
         */
        canProcessNext() {
            if (this.isMessageActive()) return false;
            if (typeof SceneManager !== "undefined") {
                if (typeof SceneManager.isSceneChanging === "function" && SceneManager.isSceneChanging()) {
                    return false;
                }
            }
            return true;
        }

        /**
         * Dépile et active le prochain tutoriel de la file d'attente si aucune fenêtre de message n'est active.
         * @returns {boolean}
         */
        processNext() {
            if (!this.canProcessNext()) {
                return false;
            }
            if (this._queue.length > 0) {
                this._current = this._queue.shift();
                const key = this._current.key;
                const id = this._current.id;
                if (key) this._seenTutos[key] = true;
                if (id) this._seenTutos[id] = true;

                if (typeof SceneManager !== "undefined" && SceneManager._scene && SceneManager._scene._tutoWindow) {
                    SceneManager._scene._tutoWindow.openTuto(this._current);
                }
                return true;
            } else {
                this._current = null;
                return false;
            }
        }

        /**
         * Actualisation périodique du gestionnaire de tutoriels.
         * Si des tutoriels sont en attente dans la file d'attente et qu'aucune fenêtre de message
         * n'est active, déclenche l'ouverture du prochain tutoriel.
         */
        update() {
            if (!this._current && this._queue && this._queue.length > 0) {
                if (this.canProcessNext()) {
                    this.processNext();
                }
            }
        }

        /**
         * Ferme le tutoriel actuellement affiché et passe au suivant s'il y en a.
         */
        closeCurrent() {
            this._current = null;
            this.processNext();
            if (!this.isBusy()) {
                if (typeof TouchInput !== "undefined" && typeof TouchInput.clear === "function") {
                    TouchInput.clear();
                }
                if (typeof SceneManager !== "undefined" && SceneManager._scene && typeof SceneManager._scene.activateTouchReleaseGuard === "function") {
                    SceneManager._scene.activateTouchReleaseGuard(8);
                }
            }
        }

        /**
         * Désactive l'aide contextuelle globalement et vide la file d'attente active.
         */
        disableContextualHelp() {
            if (typeof ConfigManager !== "undefined") {
                ConfigManager.contextualHelp = false;
                if (typeof ConfigManager.save === "function") {
                    ConfigManager.save();
                }
            }
            this._queue = [];
            this._current = null;
            if (typeof TouchInput !== "undefined" && typeof TouchInput.clear === "function") {
                TouchInput.clear();
            }
            if (typeof SceneManager !== "undefined" && SceneManager._scene && typeof SceneManager._scene.activateTouchReleaseGuard === "function") {
                SceneManager._scene.activateTouchReleaseGuard(8);
            }
        }

        /**
         * Indique si un didacticiel est actuellement affiché à l'écran.
         * Note : Si un didacticiel est simplement en attente dans la file (_queue) pendant
         * qu'un message d'événement est actif, isBusy reste false pour ne pas bloquer
         * la boucle de jeu et permettre à la boîte de dialogue de se dérouler.
         * @returns {boolean}
         */
        isBusy() {
            return Boolean(this._current);
        }

        /**
         * Indique si la file d'attente contient des tutoriels en attente.
         * @returns {boolean}
         */
        hasQueue() {
            return Boolean(this._queue && this._queue.length > 0);
        }

        /**
         * Indique si un tutoriel attend la fermeture d'un message avant de s'afficher.
         * @returns {boolean}
         */
        isWaitingForMessage() {
            return Boolean(!this._current && this._queue && this._queue.length > 0 && this.isMessageActive());
        }

        /**
         * Retourne le tutoriel actif actuellement affiché.
         * @returns {object|null}
         */
        currentTuto() {
            return this._current;
        }

        /**
         * Vérifie si un tutoriel a déjà été visualisé.
         * @param {string|number} idOrKey 
         * @returns {boolean}
         */
        isSeen(idOrKey) {
            return Boolean(this._seenTutos[idOrKey]);
        }

        /**
         * Marque manuellement un tutoriel comme vu.
         * @param {string|number} idOrKey 
         */
        markAsSeen(idOrKey) {
            this._seenTutos[idOrKey] = true;
        }

        /**
         * Réinitialise l'historique des tutoriels visualisés.
         */
        resetSeen() {
            this._seenTutos = {};
            this._queue = [];
            this._current = null;
        }

        /**
         * Retourne l'ensemble des clés / identifiants vus.
         * @returns {string[]}
         */
        seenTutoIds() {
            return Object.keys(this._seenTutos).filter(k => this._seenTutos[k]);
        }

        /**
         * Retourne la liste complète des tutoriels configurés.
         * @returns {object[]}
         */
        allTutos() {
            const list = window.$dataTutos || [];
            if (!Array.isArray(list)) return [];
            return list.filter(item => Boolean(item));
        }

        /**
         * Données sérialisées pour la sauvegarde.
         * @returns {object}
         */
        makeSavefileData() {
            return {
                seenTutos: { ...this._seenTutos }
            };
        }

        /**
         * Restauration depuis les données de sauvegarde.
         * @param {object} data 
         */
        loadSavefileData(data) {
            this._seenTutos = (data && data.seenTutos) ? { ...data.seenTutos } : {};
            this._queue = [];
            this._current = null;
        }
    }

    window.TutoManager = TutoManager;
    if (!window.$tutoManager) {
        window.$tutoManager = new TutoManager();
    }

    window.showTuto = function (tutoId, data = {}) {
        if (typeof data === "string") {
            data = { position: data };
        }
        if (window.$tutoManager) return window.$tutoManager.showTuto(tutoId, data);
        return false;
    };

    window.showTutos = function (list) {
        if (window.$tutoManager) return window.$tutoManager.showTutos(list);
        return 0;
    };

})();
