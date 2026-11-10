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
        this.loadLocalization();
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
        this.loadScDataFile("$dataTutos_PHYSICAL", "TUTOS.json");
        this.loadScDataFile("$dataSceSystem", "SCE_SYSTEM.json");
    }

    /**
     * Charge et initialise les dictionnaires de localisation SimCraft.
     */
    static loadLocalization() {
        if (typeof SC4_Localization !== "undefined" && typeof SC4_Localization.loadAll === "function") {
            SC4_Localization.loadAll();
        }
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
        }
        if (typeof Game_Spaceships !== "undefined") {
            window.$gameSpaceships = new Game_Spaceships();
        }
        if (typeof Game_Quests !== "undefined") {
            window.$gameQuests = new Game_Quests();
        }
        if (typeof QuestManager !== "undefined") {
            window.$questManager = new QuestManager();
        }
        if (typeof StoryManager !== "undefined") {
            window.$storyManager = new StoryManager();
        }
        if (typeof Game_Factions !== "undefined") {
            window.$gameFactions = new Game_Factions();
        }
        if (typeof RelationManager !== "undefined") {
            window.$relationManager = new RelationManager();
        }
        if (typeof RelationDialogManager !== "undefined") {
            window.$relationDialogManager = new RelationDialogManager();
        }
        if (typeof BattleAIManager !== "undefined") {
            window.$battleAIManager = new BattleAIManager();
        }
        if (typeof TutoManager !== "undefined") {
            window.$tutoManager = new TutoManager();
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
        }
        if (window.$gameSpaceships && typeof window.$gameSpaceships.makeSavefileData === "function") {
            contents.sc_spaceships = window.$gameSpaceships.makeSavefileData();
        }
        if (window.$gameQuests && typeof window.$gameQuests.makeSavefileData === "function") {
            contents.sc_quests = window.$gameQuests.makeSavefileData();
        }
        if (window.$questManager && typeof window.$questManager.makeSavefileData === "function") {
            contents.sc_questManager = window.$questManager.makeSavefileData();
        }
        if (window.$storyManager && typeof window.$storyManager.makeSavefileData === "function") {
            contents.sc_story = window.$storyManager.makeSavefileData();
        }
        if (window.$gameFactions && typeof window.$gameFactions.makeSavefileData === "function") {
            contents.sc_factions = window.$gameFactions.makeSavefileData();
        }
        if (window.$relationManager && typeof window.$relationManager.makeSavefileData === "function") {
            contents.sc_relationManager = window.$relationManager.makeSavefileData();
        }
        if (window.$tutoManager && typeof window.$tutoManager.makeSavefileData === "function") {
            contents.sc_tutos = window.$tutoManager.makeSavefileData();
        }
        if (window.$mapOverlaysManager && typeof window.$mapOverlaysManager.makeSavefileData === "function") {
            contents.sc_mapOverlays = window.$mapOverlaysManager.makeSavefileData();
        }
        if (window.$gameActors && typeof window.$gameActors.makeSavefileData === "function") {
            contents.sc_actors = window.$gameActors.makeSavefileData();
        }
    }

    /**
     * Restaure les données SimCraft depuis le paquet de sauvegarde.
     * @param {object} contents 
     */
    static extractSaveContents(contents) {
        if (contents && contents.sc_actors && window.$gameActors && typeof window.$gameActors.loadSavefileData === "function") {
            window.$gameActors.loadSavefileData(contents.sc_actors);
        }
        if (contents && contents.sc_inventories && window.$inventories && typeof window.$inventories.loadSavefileData === "function") {
            window.$inventories.loadSavefileData(contents.sc_inventories);
        }
        if (contents && contents.sc_gameDate && window.$gameDate && typeof window.$gameDate.loadSavefileData === "function") {
            window.$gameDate.loadSavefileData(contents.sc_gameDate);
        }
        if (contents && contents.sc_galaxy && window.$gameGalaxy && typeof window.$gameGalaxy.loadSavefileData === "function") {
            window.$gameGalaxy.loadSavefileData(contents.sc_galaxy);
        }
        if (contents && contents.sc_spaceships && window.$gameSpaceships && typeof window.$gameSpaceships.loadSavefileData === "function") {
            window.$gameSpaceships.loadSavefileData(contents.sc_spaceships);
        }
        if (contents && contents.sc_quests && window.$gameQuests && typeof window.$gameQuests.loadSavefileData === "function") {
            window.$gameQuests.loadSavefileData(contents.sc_quests);
        }
        if (contents && contents.sc_questManager && window.$questManager && typeof window.$questManager.loadSavefileData === "function") {
            window.$questManager.loadSavefileData(contents.sc_questManager);
        }
        if (contents && contents.sc_story && window.$storyManager && typeof window.$storyManager.loadSavefileData === "function") {
            window.$storyManager.loadSavefileData(contents.sc_story);
        }
        if (contents && contents.sc_factions && window.$gameFactions && typeof window.$gameFactions.extractSavefileData === "function") {
            window.$gameFactions.extractSavefileData(contents.sc_factions);
        }
        if (contents && contents.sc_relationManager && window.$relationManager && typeof window.$relationManager.loadSavefileData === "function") {
            window.$relationManager.loadSavefileData(contents.sc_relationManager);
        }
        if (contents && contents.sc_tutos && window.$tutoManager && typeof window.$tutoManager.loadSavefileData === "function") {
            window.$tutoManager.loadSavefileData(contents.sc_tutos);
        }
        if (contents && contents.sc_mapOverlays && window.$mapOverlaysManager && typeof window.$mapOverlaysManager.loadSavefileData === "function") {
            window.$mapOverlaysManager.loadSavefileData(contents.sc_mapOverlays);
        }
    }
}

// ============================================================================
// Surcharges propres des méthodes natives de DataManager
// ============================================================================
(() => {
    "use strict";


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

    /**
     * Poids de l'objet lorsqu'il est stocké dans un inventaire ou un conteneur (non équipé).
     * Les objets à charge négative (<weight: -X>) conservent un poids physique en stock (1 UM par défaut ou <stockWeight: Y>).
     */
    DataManager.itemStockWeight = function (item) {
        if (!item) return 0;
        if (item.note) {
            const matchStock = item.note.match(/<stockWeight:\s*(\d+(?:\.\d+)?)>/i);
            if (matchStock) {
                return parseFloat(matchStock[1]);
            }
            const matchWeight = item.note.match(/<(?:height|weight):\s*(-?\d+(?:\.\d+)?)>/i);
            if (matchWeight) {
                const val = parseFloat(matchWeight[1]);
                if (val >= 0) return val;
                return 1; // Une charge négative s'applique uniquement une fois équipée : poids de matière en stock
            }
        }
        return 1;
    };

    DataManager.itemWeight = function (item) {
        return DataManager.itemStockWeight(item);
    };

    /**
     * Poids résiduel de l'équipement lorsqu'il est porté sur le corps de l'acteur.
     * Par défaut = 0 UM (le poids du sac est annulé quand la pièce est portée).
     */
    DataManager.itemWornWeight = function (item) {
        if (!item) return 0;
        if (item.note) {
            const matchWorn = item.note.match(/<(?:wornWeight|equippedWeight):\s*(\d+(?:\.\d+)?)>/i);
            if (matchWorn) {
                return parseFloat(matchWorn[1]);
            }
        }
        return 0;
    };

    /**
     * Bonus de capacité de charge (ou allègement) conféré uniquement lorsque l'équipement est porté.
     * Lit <weightCapacityBonus: Z>, <weightBonus: Z> ou une charge négative <weight: -Z>.
     */
    DataManager.itemWeightBonus = function (item) {
        if (!item) return 0;
        let bonus = 0;
        if (item.note) {
            const matchBonus = item.note.match(/<(?:weightCapacityBonus|weightBonus):\s*(\d+(?:\.\d+)?)>/i);
            if (matchBonus) {
                bonus += parseFloat(matchBonus[1]);
            } else {
                const matchWeight = item.note.match(/<(?:height|weight):\s*(-?\d+(?:\.\d+)?)>/i);
                if (matchWeight) {
                    const val = parseFloat(matchWeight[1]);
                    if (val < 0) {
                        bonus += Math.abs(val);
                    }
                }
            }
        }
        return bonus;
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

    /**
     * Résout la clé et le libellé de catégorie SC4 d'un objet (notetag <sc_type: ...> ou repli).
     * @param {object} item 
     * @returns {{ key: string, label: string }}
     */
    DataManager.itemScTypeInfo = function (item) {
        if (!item) return { key: "misc", label: "Divers" };

        // 1. Notetag explicite <sc_type: ...>
        if (item.note) {
            const match = item.note.match(/<sc_type:\s*([^>]+)>/i);
            if (match) {
                const raw = match[1].trim().toLowerCase();
                if (raw === "consumable" || raw === "consommable") return { key: "consumable", label: "Consommable" };
                if (raw === "ingredient" || raw === "ingrédient" || raw === "material" || raw === "matériau") return { key: "material", label: "Ingrédient / Matériau" };
                if (raw === "equipment" || raw === "équipement" || raw === "equipement" || raw === "armor" || raw === "armure") return { key: "equipment", label: "Équipement" };
                if (raw === "weapon" || raw === "arme" || raw === "ammo" || raw === "munition") return { key: "weapon_ammo", label: "Arme & Munitions" };
                if (raw === "quest" || raw === "quete" || raw === "quête" || raw === "key" || raw === "clé") return { key: "quest", label: "Objet Clé" };
                if (raw === "datapad" || raw === "archive" || raw === "livre" || raw === "book") return { key: "datapad", label: "Datapad / Archive" };
                if (raw === "medical" || raw === "médical") return { key: "medical", label: "Biomédical" };
                if (raw === "tool" || raw === "outil") return { key: "tool", label: "Outil" };
                if (raw === "misc" || raw === "divers") return { key: "misc", label: "Divers" };
                return { key: raw, label: match[1].trim() };
            }
        }

        // 2. Détection pour armes et armures
        if (typeof DataManager.isWeapon === "function" && DataManager.isWeapon(item)) {
            return { key: "weapon_ammo", label: "Arme & Munitions" };
        }
        if (typeof DataManager.isArmor === "function" && DataManager.isArmor(item)) {
            return { key: "equipment", label: "Équipement" };
        }

        // 3. Détection des munitions
        if (typeof DataManager.isAmmo === "function" && DataManager.isAmmo(item)) {
            return { key: "weapon_ammo", label: "Arme & Munitions" };
        }

        // 4. Détection native des types RMMZ
        if (item.itypeId === 2) {
            return { key: "quest", label: "Objet Clé" };
        }
        if (item.itypeId === 3 || item.itypeId === 4) {
            return { key: "datapad", label: "Datapad / Archive" };
        }
        if (item.consumable === true && item.itypeId === 1) {
            return { key: "consumable", label: "Consommable" };
        }

        // 5. Par défaut : "Divers" pour tout objet non typé
        return { key: "misc", label: "Divers" };
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
    window.SC_DataManager = SC_DataManager;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = SC_DataManager;
    }
})();
