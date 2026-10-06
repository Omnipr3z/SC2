//=============================================================================
// SC_DataManager.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Gestionnaire étendu des données SimCraft et persistance.
 * @author SimCraft
 * @help
 * ============================================================================
 * SC_DataManager.js
 * ============================================================================
 * Étend et complète le chargement des bases de données et la persistance des
 * sauvegardes pour les systèmes SimCraft sans altérer le code natif de RMMZ :
 * - Chargement asynchrone des fichiers JSON spécifiques (data/SC/INVENTORIES.json).
 * - Initialisation des objets globaux SimCraft ($inventories).
 * - Enregistrement et restauration des inventaires dans les sauvegardes.
 * ============================================================================
 */

class SC_DataManager {
    /**
     * Charge les fichiers de base de données spécifiques à SimCraft.
     */
    static loadDatabase() {
        this.loadScDataFile("$dataInventories", "INVENTORIES.json");
    }

    /**
     * Charge un fichier JSON depuis data/SC/ avec gestion gracieuse des erreurs.
     * @param {string} variableName Nom de la variable globale (ex: "$dataInventories")
     * @param {string} filename Nom du fichier (ex: "INVENTORIES.json")
     */
    static loadScDataFile(variableName, filename) {
        window[variableName] = null;
        const url = "data/SC/" + (filename.endsWith(".json") ? filename : filename + ".json");
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.overrideMimeType("application/json");
        xhr.onload = () => {
            if (xhr.status < 400) {
                try {
                    window[variableName] = JSON.parse(xhr.responseText);
                } catch (e) {
                    console.warn(`[SC_DataManager] Erreur de parsing JSON pour ${url} :`, e);
                    window[variableName] = {};
                }
            } else {
                console.warn(`[SC_DataManager] Fichier non trouvé (${xhr.status}): ${url}, initialisation par défaut vide.`);
                window[variableName] = {};
            }
        };
        xhr.onerror = () => {
            console.warn(`[SC_DataManager] Erreur de requête réseau pour ${url}, initialisation par défaut vide.`);
            window[variableName] = {};
        };
        xhr.send();
    }

    /**
     * Vérifie si tous les fichiers de données SimCraft sont chargés.
     * @returns {boolean}
     */
    static isDatabaseLoaded() {
        return window.$dataInventories !== null && typeof window.$dataInventories !== "undefined";
    }

    /**
     * Instancie les objets de jeu globaux SimCraft.
     */
    static createGameObjects() {
        if (typeof Game_Inventories !== "undefined") {
            window.$inventories = new Game_Inventories();
        }
    }

    /**
     * Ajoute les données SimCraft au paquet de sauvegarde.
     * @param {object} contents 
     */
    static makeSaveContents(contents) {
        if (window.$inventories && typeof window.$inventories.makeSavefileData === "function") {
            contents.sc_inventories = window.$inventories.makeSavefileData();
        }
    }

    /**
     * Restaure les données SimCraft depuis le paquet de sauvegarde.
     * @param {object} contents 
     */
    static extractSaveContents(contents) {
        if (contents && contents.sc_inventories && window.$inventories && typeof window.$inventories.loadSavefileData === "function") {
            window.$inventories.loadSavefileData(contents.sc_inventories);
        }
    }
}

// ============================================================================
// Surcharges propres des méthodes natives de DataManager
// ============================================================================
(() => {
    "use strict";

    const _DataManager_loadDatabase = DataManager.loadDatabase;
    DataManager.loadDatabase = function() {
        _DataManager_loadDatabase.call(this);
        SC_DataManager.loadDatabase();
    };

    const _DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        if (!_DataManager_isDatabaseLoaded.call(this)) {
            return false;
        }
        return SC_DataManager.isDatabaseLoaded();
    };

    const _DataManager_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function() {
        _DataManager_createGameObjects.call(this);
        SC_DataManager.createGameObjects();
    };

    const _DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        const contents = _DataManager_makeSaveContents.call(this);
        SC_DataManager.makeSaveContents(contents);
        return contents;
    };

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        SC_DataManager.extractSaveContents(contents);
    };

    window.SC_DataManager = SC_DataManager;
})();
