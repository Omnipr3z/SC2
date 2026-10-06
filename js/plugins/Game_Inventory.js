//=============================================================================
// Game_Inventory.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Classe représentant une instance d'inventaire secondaire.
 * @author SimCraft
 * @help
 * ============================================================================
 * Game_Inventory.js
 * ============================================================================
 * Représente un inventaire autonome (pour acteur, conteneur ou ennemi).
 * Supporte les objets, armes et armures du moteur RMMZ, le suivi des quantités,
 * les transferts et la sérialisation pour sauvegarde.
 * ============================================================================
 */

class Game_Inventory {
    /**
     * @param {string} id Identifiant unique (ex: "A_1", "C_1", "E_1")
     */
    constructor(id) {
        this._id = String(id);
        this._items = {}; // { key: quantity }
    }

    /**
     * @returns {string}
     */
    id() {
        return this._id;
    }

    /**
     * Génère la clé de stockage pour un objet RMMZ.
     * @param {object} item 
     * @returns {string|null}
     */
    itemKey(item) {
        if (!item || typeof item !== "object") return null;
        if (DataManager.isItem(item)) return "i_" + item.id;
        if (DataManager.isWeapon(item)) return "w_" + item.id;
        if (DataManager.isArmor(item)) return "a_" + item.id;
        return null;
    }

    /**
     * Résout une clé de stockage en objet de données RMMZ.
     * @param {string} key 
     * @returns {object|null}
     */
    keyToObject(key) {
        if (!key || typeof key !== "string") return null;
        const parts = key.split("_");
        if (parts.length === 2) {
            const prefix = parts[0];
            const id = Number(parts[1]);
            if (prefix === "i" && typeof $dataItems !== "undefined") return $dataItems[id] || null;
            if (prefix === "w" && typeof $dataWeapons !== "undefined") return $dataWeapons[id] || null;
            if (prefix === "a" && typeof $dataArmors !== "undefined") return $dataArmors[id] || null;
        }
        if (!isNaN(key) && typeof $dataItems !== "undefined") {
            return $dataItems[Number(key)] || null;
        }
        return null;
    }

    /**
     * Retourne la quantité possédée d'un objet.
     * @param {object} item 
     * @returns {number}
     */
    numItems(item) {
        const key = this.itemKey(item);
        return key ? (this._items[key] || 0) : 0;
    }

    /**
     * Ajoute ou retire une quantité d'objet dans cet inventaire.
     * @param {object} item 
     * @param {number} amount 
     */
    gainItem(item, amount) {
        const key = this.itemKey(item);
        if (!key) return;
        const current = this.numItems(item);
        const newTotal = Math.max(0, current + Number(amount));
        if (newTotal > 0) {
            this._items[key] = newTotal;
        } else {
            delete this._items[key];
        }
    }

    /**
     * Retire une quantité d'un objet.
     * @param {object} item 
     * @param {number} amount 
     */
    loseItem(item, amount) {
        this.gainItem(item, -amount);
    }

    /**
     * Vérifie si un objet est présent dans l'inventaire.
     * @param {object} item 
     * @returns {boolean}
     */
    hasItem(item) {
        return this.numItems(item) > 0;
    }

    /**
     * Retourne la liste de tous les objets valides possédés.
     * @returns {Array<object>}
     */
    items() {
        const list = [];
        for (const key of Object.keys(this._items)) {
            const obj = this.keyToObject(key);
            if (obj && this._items[key] > 0) {
                list.push(obj);
            }
        }
        return list;
    }

    /**
     * Retourne les entrées détaillées { item, quantity }.
     * @returns {Array<{ item: object, quantity: number }>}
     */
    itemEntries() {
        return this.items().map(item => ({
            item: item,
            quantity: this.numItems(item)
        }));
    }

    /**
     * Indique si l'inventaire est complètement vide.
     * @returns {boolean}
     */
    isEmpty() {
        return this.items().length === 0;
    }

    /**
     * Vide intégralement l'inventaire.
     */
    clear() {
        this._items = {};
    }

    /**
     * Charge le contenu depuis une liste de données JSON.
     * Supporte [{ item_id: 1, quantity: 10, kind: 1 }, ...] ou [{ item_id, quantity }]
     * @param {Array<object>} dataArray 
     */
    loadData(dataArray) {
        this.clear();
        if (!Array.isArray(dataArray)) return;
        for (const entry of dataArray) {
            if (!entry) continue;
            const itemId = Number(entry.item_id || entry.id);
            const quantity = Number(entry.quantity) || 1;
            const kind = Number(entry.kind) || 1; // 1: item, 2: weapon, 3: armor

            let itemObj = null;
            if (kind === 1 && typeof $dataItems !== "undefined") itemObj = $dataItems[itemId];
            else if (kind === 2 && typeof $dataWeapons !== "undefined") itemObj = $dataWeapons[itemId];
            else if (kind === 3 && typeof $dataArmors !== "undefined") itemObj = $dataArmors[itemId];

            if (itemObj) {
                this.gainItem(itemObj, quantity);
            }
        }
    }

    /**
     * Génère la structure de sauvegarde sérialisable.
     * @returns {Array<object>}
     */
    makeSaveData() {
        const result = [];
        for (const key of Object.keys(this._items)) {
            const quantity = this._items[key];
            if (quantity <= 0) continue;
            const parts = key.split("_");
            if (parts.length === 2) {
                const prefix = parts[0];
                const id = Number(parts[1]);
                let kind = 1;
                if (prefix === "w") kind = 2;
                else if (prefix === "a") kind = 3;
                result.push({
                    kind: kind,
                    item_id: id,
                    quantity: quantity
                });
            }
        }
        return result;
    }
}

window.Game_Inventory = Game_Inventory;
