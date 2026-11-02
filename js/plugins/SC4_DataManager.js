//=============================================================================
// SC4_DataManager.js
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
        this.loadScDataFile("$dataShipMotors", "SHIP_MOTORS.json");
        this.loadScDataFile("$dataSpaceships", "SPACESHIPS.json");

        this.loadScDataFile("$dataSectors_PHYSICAL", "SECTORS.json");
        this.loadScDataFile("$dataPlanets_PHYSICAL", "PLANETS.json");
        this.loadScDataFile("$dataPois_PHYSICAL", "POIS.json");
        this.loadScDataFile("$dataQuests_PHYSICAL", "QUESTS.json");
        this.loadScDataFile("$dataFactions_PHYSICAL", "FACTIONS.json");
        this.loadScDataFile("$dataShipCategories_PHYSICAL", "SHIP_CATEGORIES.json");
        this.loadScDataFile("$dataSceSystem", "SCE_SYSTEM.json");
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

                    // Mise à jour et fusion dynamique de la localisation dès qu'un fichier physique arrive
                    if (variableName.includes("_PHYSICAL") || variableName.includes("Planets") || variableName.includes("Sectors") || variableName.includes("Pois") || variableName.includes("Quests")) {
                        if (typeof SC4_Localization !== "undefined" && typeof SC4_Localization.applyToDatabase === "function") {
                            SC4_Localization.applyToDatabase();
                        }
                    }
                } catch (e) {
                    console.warn(`[SC_DataManager] Erreur de parsing JSON pour ${url} :`, e);
                    window[variableName] = [];
                }
            } else {
                console.warn(`[SC_DataManager] Fichier non trouvé (${xhr.status}): ${url}, initialisation par défaut.`);
                window[variableName] = [];
            }
        };
        xhr.onerror = () => {
            console.warn(`[SC_DataManager] Erreur de requête réseau pour ${url}, initialisation par défaut vide.`);
            window[variableName] = [];
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
            "$dataShipMotors",
            "$dataSpaceships",
            "$dataSectors_PHYSICAL",
            "$dataPlanets_PHYSICAL",
            "$dataPois_PHYSICAL",
            "$dataQuests_PHYSICAL"
        ];
        const allLoaded = required.every(key => window[key] !== null && typeof window[key] !== "undefined");
        if (allLoaded && !window.$dataPlanets) {
            if (typeof SC4_Localization !== "undefined" && typeof SC4_Localization.applyToDatabase === "function") {
                SC4_Localization.applyToDatabase();
            }
        }
        return allLoaded && window.$dataPlanets !== null && typeof window.$dataPlanets !== "undefined";
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
        if (typeof Game_Galaxy !== "undefined") {
            window.$gameGalaxy = new Game_Galaxy();
        } else if (typeof Game_Sector !== "undefined") {
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
        if (typeof Game_Factions !== "undefined") {
            window.$gameFactions = new Game_Factions();
        }
        if (typeof Game_Relations !== "undefined") {
            window.$gameRelations = new Game_Relations();
        }
        if (typeof RelationManager !== "undefined") {
            window.$relationManager = new RelationManager();
        }
        if (typeof RelationDialogManager !== "undefined") {
            window.$relationDialogManager = new RelationDialogManager();
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
        if (window.$gameGalaxy && typeof window.$gameGalaxy.makeSavefileData === "function") {
            contents.sc_galaxy = window.$gameGalaxy.makeSavefileData();
        } else if (window.$gameSector && typeof window.$gameSector.makeSavefileData === "function") {
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
        if (window.$gameFactions && typeof window.$gameFactions.makeSavefileData === "function") {
            contents.sc_factions = window.$gameFactions.makeSavefileData();
        }
        if (window.$gameRelations && typeof window.$gameRelations.makeSavefileData === "function") {
            contents.sc_relations = window.$gameRelations.makeSavefileData();
        }
        if (window.$relationManager && typeof window.$relationManager.makeSavefileData === "function") {
            contents.sc_relationManager = window.$relationManager.makeSavefileData();
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
        if (contents && contents.sc_galaxy && window.$gameGalaxy && typeof window.$gameGalaxy.loadSavefileData === "function") {
            window.$gameGalaxy.loadSavefileData(contents.sc_galaxy);
        } else if (contents && contents.sc_sector && window.$gameGalaxy && typeof window.$gameGalaxy.loadSavefileData === "function") {
            window.$gameGalaxy.loadSavefileData(contents.sc_sector);
        } else if (contents && contents.sc_sector && window.$gameSector && typeof window.$gameSector.loadSavefileData === "function") {
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
        if (contents && contents.sc_factions && window.$gameFactions && typeof window.$gameFactions.extractSavefileData === "function") {
            window.$gameFactions.extractSavefileData(contents.sc_factions);
        }
        if (contents && contents.sc_relations && window.$gameRelations && typeof window.$gameRelations.loadSavefileData === "function") {
            window.$gameRelations.loadSavefileData(contents.sc_relations);
        }
        if (contents && contents.sc_relationManager && window.$relationManager && typeof window.$relationManager.loadSavefileData === "function") {
            window.$relationManager.loadSavefileData(contents.sc_relationManager);
        }
    }
}

// ============================================================================
// Surcharges propres des méthodes natives de DataManager
// ============================================================================
(() => {
    "use strict";

    if (typeof DataManager !== "undefined") {
        const _DataManager_loadDatabase = DataManager.loadDatabase;
        DataManager.loadDatabase = function () {
            _DataManager_loadDatabase.call(this);
            SC_DataManager.loadDatabase();
        };

        const _DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
        DataManager.isDatabaseLoaded = function () {
            if (!_DataManager_isDatabaseLoaded.call(this)) {
                return false;
            }
            return SC_DataManager.isDatabaseLoaded();
        };

        const _DataManager_createGameObjects = DataManager.createGameObjects;
        DataManager.createGameObjects = function () {
            _DataManager_createGameObjects.call(this);
            SC_DataManager.createGameObjects();
        };

        const _DataManager_makeSaveContents = DataManager.makeSaveContents;
        DataManager.makeSaveContents = function () {
            const contents = _DataManager_makeSaveContents.call(this);
            SC_DataManager.makeSaveContents(contents);
            return contents;
        };

        const _DataManager_extractSaveContents = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function (contents) {
            _DataManager_extractSaveContents.call(this, contents);
            SC_DataManager.extractSaveContents(contents);
        };
    }
    DataManager.itemRawWeight = function (item) {
        if (!item) return 0;
        if (item.note) {
            const match = item.note.match(/<(?:height|weight):\s*(-?\d+(?:\.\d+)?)>/i);
            if (match) {
                return parseFloat(match[1]);
            }
        }
        return 1;
    };

    DataManager.itemWeight = function (item) {
        const raw = DataManager.itemRawWeight(item);
        return Math.max(0, raw);
    };

    DataManager.isAmmo = function (item) {
        if (!item || (typeof DataManager.isItem === "function" && !DataManager.isItem(item))) return false;
        if (item.ammo === true) return true;
        if (item.note) {
            if (/<ammo>/i.test(item.note) || /<isAmmo:\s*true>/i.test(item.note) || /<munition>/i.test(item.note)) {
                return true;
            }
        }
        if (typeof $dataWeapons !== "undefined" && Array.isArray($dataWeapons)) {
            for (let i = 1; i < $dataWeapons.length; i++) {
                const w = $dataWeapons[i];
                if (w && w.note && /<ammoId:\s*(\d+)>/i.test(w.note)) {
                    const m = w.note.match(/<ammoId:\s*(\d+)>/i);
                    if (m && parseInt(m[1], 10) === item.id) return true;
                }
            }
        }
        return false;
    };

    const _DataManager_loadDatabase = DataManager.loadDatabase;
    DataManager.loadDatabase = function () {
        _DataManager_loadDatabase.call(this);
        SC4_Localization.loadAll();
    };

    const _DataManager_onLoad = DataManager.onLoad;
    DataManager.onLoad = function (object) {
        _DataManager_onLoad.call(this, object);
        if (Array.isArray(object)) {
            for (const item of object) {
                if (item) {
                    SC4_Localization.hookDatabaseObject(item);
                }
            }
        }
    };

    if (typeof window !== "undefined") {
        window.SC_DataManager = SC_DataManager;
    }
    if (typeof module !== "undefined") {
        module.exports = SC_DataManager;
    }
})();
