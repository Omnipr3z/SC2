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
         * @param {number|string|object} tutoId ID ou clé de tutoriel dans $dataTutos.
         * @param {object} [data={}] Paramètres optionnels (coord, arrow, imgName, force, txt, name).
         * @returns {boolean} True si le tutoriel a été pris en compte/mis en file.
         */
        show(tutoId, data = {}) {
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

            const tutoEntry = {
                id: item.id,
                key: item.key,
                name: data.name || item.name || "",
                txt: resolvedTxt,
                img: data.imgName !== undefined ? data.imgName : (item.img || null),
                coord: data.coord || null,    // { xMap, yMap } ou { x, y }
                arrow: data.arrow || null,    // { xMap, yMap, x, y, angle }
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
            return this.show(tutoId, data);
        }

        /**
         * Dépile et active le prochain tutoriel de la file d'attente.
         */
        processNext() {
            if (this._queue.length > 0) {
                this._current = this._queue.shift();
                const key = this._current.key;
                const id = this._current.id;
                if (key) this._seenTutos[key] = true;
                if (id) this._seenTutos[id] = true;

                if (typeof SceneManager !== "undefined" && SceneManager._scene && SceneManager._scene._tutoWindow) {
                    SceneManager._scene._tutoWindow.openTuto(this._current);
                }
            } else {
                this._current = null;
            }
        }

        /**
         * Ferme le tutoriel actuellement affiché et passe au suivant s'il y en a.
         */
        closeCurrent() {
            this._current = null;
            this.processNext();
        }

        /**
         * Indique si un didacticiel est en cours d'affichage ou en attente.
         * @returns {boolean}
         */
        isBusy() {
            return Boolean(this._current || (this._queue && this._queue.length > 0));
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

})();
