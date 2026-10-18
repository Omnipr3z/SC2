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
        this.loadScDataFile("$dataTimeSystem", "TIME_SYSTEM.json");
        this.loadScDataFile("$dataSectors", "SECTORS.json");
        this.loadScDataFile("$dataPlanets", "PLANETS.json");
        this.loadScDataFile("$dataShipMotors", "SHIP_MOTORS.json");
        this.loadScDataFile("$dataSpaceships", "SPACESHIPS.json");
        this.loadScDataFile("$dataQuests", "QUESTS.json");
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
        const required = [
            "$dataInventories",
            "$dataTimeSystem",
            "$dataSectors",
            "$dataPlanets",
            "$dataShipMotors",
            "$dataSpaceships",
            "$dataQuests"
        ];
        return required.every(key => window[key] !== null && typeof window[key] !== "undefined");
    }

    /**
     * Instancie les objets de jeu globaux SimCraft.
     */
    static createGameObjects() {
        if (typeof Game_Inventories !== "undefined") {
            window.$inventories = new Game_Inventories();
        }
        if (typeof Game_Date !== "undefined") {
            window.$gameDate = new Game_Date();
        }
        if (typeof Game_Sector !== "undefined") {
            window.$gameSector = new Game_Sector();
        }
        if (typeof Game_Spaceships !== "undefined") {
            window.$gameSpaceships = new Game_Spaceships();
        }
        if (typeof Game_Quests !== "undefined") {
            window.$gameQuests = new Game_Quests();
        }
        if (typeof StoryManager !== "undefined") {
            window.$storyManager = new StoryManager();
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
        if (window.$gameDate && typeof window.$gameDate.makeSavefileData === "function") {
            contents.sc_gameDate = window.$gameDate.makeSavefileData();
        }
        if (window.$gameSector && typeof window.$gameSector.makeSavefileData === "function") {
            contents.sc_sector = window.$gameSector.makeSavefileData();
        }
        if (window.$gameSpaceships && typeof window.$gameSpaceships.makeSavefileData === "function") {
            contents.sc_spaceships = window.$gameSpaceships.makeSavefileData();
        }
        if (window.$gameQuests && typeof window.$gameQuests.makeSavefileData === "function") {
            contents.sc_quests = window.$gameQuests.makeSavefileData();
        }
        if (window.$storyManager && typeof window.$storyManager.makeSavefileData === "function") {
            contents.sc_story = window.$storyManager.makeSavefileData();
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
        if (contents && contents.sc_gameDate && window.$gameDate && typeof window.$gameDate.loadSavefileData === "function") {
            window.$gameDate.loadSavefileData(contents.sc_gameDate);
        }
        if (contents && contents.sc_sector && window.$gameSector && typeof window.$gameSector.loadSavefileData === "function") {
            window.$gameSector.loadSavefileData(contents.sc_sector);
        }
        if (contents && contents.sc_spaceships && window.$gameSpaceships && typeof window.$gameSpaceships.loadSavefileData === "function") {
            window.$gameSpaceships.loadSavefileData(contents.sc_spaceships);
        }
        if (contents && contents.sc_quests && window.$gameQuests && typeof window.$gameQuests.loadSavefileData === "function") {
            window.$gameQuests.loadSavefileData(contents.sc_quests);
        }
        if (contents && contents.sc_story && window.$storyManager && typeof window.$storyManager.loadSavefileData === "function") {
            window.$storyManager.loadSavefileData(contents.sc_story);
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
