//=============================================================================
// Game_Inventories.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Hub gestionnaire des inventaires secondaires ($inventories).
 * @author SimCraft
 * @help
 * ============================================================================
 * Game_Inventories.js
 * ============================================================================
 * Point d'accès central et registre de tous les inventaires secondaires :
 * - $inventories.inventory(id) : Accède ou instancie un inventaire à la volée.
 * - $inventories.open(id, options) : Ouvre la scène de gestion et de transfert.
 * - $inventories.initEnnemyInventory(enemyId) : Génère le butin unique d'un ennemi.
 * - $inventories.unset(id) : Supprime un inventaire vidé.
 * ============================================================================
 */

class Game_Inventories {
    constructor() {
        this._data = {}; // { inventoryId: Game_Inventory }
        this._looted = {}; // { inventoryId: boolean } (pour cadavres ou conteneurs temporaires vidés)
        this._currentOpenId = null;
        this._currentEventId = null;
    }

    /**
     * Accède ou crée à la volée un inventaire avec son ID.
     * Si l'inventaire est nouveau et n'a pas déjà été vidé/pillé,
     * charge ses données initiales depuis $dataInventories.
     * @param {string} id (ex: "A_1", "C_1", "E_1")
     * @returns {Game_Inventory}
     */
    inventory(id) {
        if (!id) id = "DEFAULT";
        const key = String(id).trim();

        if (!this._data[key]) {
            const inv = new Game_Inventory(key);
            // Charge les données initiales uniquement si non vidé/pillé auparavant
            if (!this.isLooted(key) && typeof $dataInventories !== "undefined" && $dataInventories && $dataInventories[key]) {
                inv.loadData($dataInventories[key]);
            }
            // Par convention, les acteurs (A_) et conteneurs (C_) sont persistants par défaut sauf indication contraire
            if (key.startsWith("A_") || key.startsWith("C_")) {
                const hasExplicitFlag = typeof $dataInventories !== "undefined" && $dataInventories && $dataInventories[key] &&
                    ($dataInventories[key].persistent !== undefined || $dataInventories[key].auto_erase !== undefined);
                if (!hasExplicitFlag && !inv.isPersistent()) {
                    inv.setPersistent(true);
                }
            }
            this._data[key] = inv;
        }

        return this._data[key];
    }

    /**
     * Crée ou configure un inventaire secondaire via l'API simple.
     * @param {string} id Identifiant unique (ex: "C_COFFRE", "C_1")
     * @param {object} [options={}] Options (persistent, maxWeight, maxSlots, onlyWeapons, items, etc.)
     * @returns {Game_Inventory}
     */
    create(id, options = {}) {
        if (!id) id = "DEFAULT";
        const key = String(id).trim();
        const inv = new Game_Inventory(key);
        if (options && typeof options === "object") {
            inv.loadData(options);
        }
        this._data[key] = inv;
        return inv;
    }

    /**
     * Indique si un inventaire a déjà été vidé/pillé.
     * @param {string} id 
     * @returns {boolean}
     */
    isLooted(id) {
        if (!id) return false;
        return Boolean(this._looted && this._looted[String(id).trim()]);
    }

    /**
     * Marque un inventaire comme pillé (ne sera plus rechargé depuis $dataInventories).
     * @param {string} id 
     */
    markLooted(id) {
        if (!id) return;
        this._looted = this._looted || {};
        this._looted[String(id).trim()] = true;
    }

    /**
     * Définit le caractère persistant d'un inventaire.
     * @param {string} id 
     * @param {boolean} persistent 
     */
    setPersistent(id, persistent = true) {
        const inv = this.inventory(id);
        if (inv) {
            inv.setPersistent(persistent);
        }
    }

    /**
     * Vérifie si un inventaire existe déjà dans le registre actif.
     * @param {string} id 
     * @returns {boolean}
     */
    hasInventory(id) {
        if (!id) return false;
        return Boolean(this._data[String(id).trim()]);
    }

    /**
     * Supprime un inventaire du registre.
     * @param {string} id 
     */
    unset(id) {
        if (!id) return;
        delete this._data[String(id).trim()];
    }

    /**
     * Supprime un inventaire du registre (API simple).
     * @param {string} id 
     */
    remove(id) {
        this.unset(id);
    }

    /**
     * Ouvre la scène d'inventaire pour transférer avec un inventaire cible.
     * @param {string} inventoryId ID de l'inventaire secondaire (ex: "C_1", "E_1", "A_2")
     * @param {object} [options={}] Options contextuelles (ex: { eventId: 2, persistent: true })
     */
    open(inventoryId, options = {}) {
        this._currentOpenId = String(inventoryId).trim();
        this._currentEventId = options.eventId || null;

        const inv = this.inventory(this._currentOpenId);
        if (options.persistent !== undefined) {
            inv.setPersistent(Boolean(options.persistent));
        }

        if (typeof Scene_Inventory !== "undefined") {
            Scene_Inventory.prepare(this._currentOpenId, options);
            if (SceneManager._scene instanceof Scene_Map) {
                SceneManager.push(Scene_Inventory);
            }
        }
    }

    /**
     * ID de l'inventaire actuellement ouvert.
     * @returns {string|null}
     */
    currentOpenId() {
        return this._currentOpenId;
    }

    /**
     * ID de l'événement associé à l'ouverture actuelle (si applicable).
     * @returns {number|null}
     */
    currentEventId() {
        return this._currentEventId;
    }

    /**
     * Initialise l'inventaire d'un ennemi vaincu selon ses tables de butin vanilla
     * et $dataInventories. Une fois généré, il est conservé tant que non vidé.
     * @param {number} enemyId 
     * @param {object} [options={}]
     * @returns {Game_Inventory}
     */
    initEnnemyInventory(enemyId, options = {}) {
        const key = "E_" + Number(enemyId);

        // Si déjà généré, ne doit pas être réinitialisé (conserve l'état courant)
        if (this._data[key]) {
            return this._data[key];
        }

        const inv = this.inventory(key);

        // Génération du butin supplémentaire basé sur les dropItems natifs RMMZ
        const enemy = (typeof $dataEnemies !== "undefined" && $dataEnemies) ? $dataEnemies[enemyId] : null;
        if (enemy && Array.isArray(enemy.dropItems)) {
            for (const drop of enemy.dropItems) {
                if (drop && drop.kind > 0 && drop.dataId > 0 && drop.denominator > 0) {
                    // Probabilité 1 / denominator
                    if (Math.random() * drop.denominator < 1) {
                        let itemObj = null;
                        if (drop.kind === 1 && typeof $dataItems !== "undefined") itemObj = $dataItems[drop.dataId];
                        else if (drop.kind === 2 && typeof $dataWeapons !== "undefined") itemObj = $dataWeapons[drop.dataId];
                        else if (drop.kind === 3 && typeof $dataArmors !== "undefined") itemObj = $dataArmors[drop.dataId];

                        if (itemObj) {
                            inv.gainItem(itemObj, 1);
                        }
                    }
                }
            }
        }

        return inv;
    }

    /**
     * Alias avec orthographe alternative.
     */
    initEnemyInventory(enemyId, options = {}) {
        return this.initEnnemyInventory(enemyId, options);
    }

    /**
     * Sérialise tous les inventaires pour la sauvegarde du jeu.
     * @returns {object}
     */
    makeSavefileData() {
        const saveObj = {};
        for (const key of Object.keys(this._data)) {
            const inv = this._data[key];
            if (inv && typeof inv.makeSaveData === "function") {
                saveObj[key] = inv.makeSaveData();
            }
        }
        saveObj._looted = Object.assign({}, this._looted || {});
        return saveObj;
    }

    /**
     * Restaure tous les inventaires depuis les données de sauvegarde.
     * @param {object} saveData 
     */
    loadSavefileData(saveData) {
        this._data = {};
        this._looted = {};
        if (!saveData || typeof saveData !== "object") return;
        if (saveData._looted && typeof saveData._looted === "object") {
            this._looted = Object.assign({}, saveData._looted);
        }
        for (const key of Object.keys(saveData)) {
            if (key === "_looted" || key === "looted") continue;
            const inv = new Game_Inventory(key);
            inv.loadData(saveData[key]);
            if ((key.startsWith("A_") || key.startsWith("C_")) && saveData[key].persistent === undefined && !saveData[key].auto_erase) {
                inv.setPersistent(true);
            }
            this._data[key] = inv;
        }
    }
}

window.Game_Inventories = Game_Inventories;
window.$inventories = new Game_Inventories();
