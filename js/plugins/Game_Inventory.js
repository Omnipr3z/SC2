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
        // Par convention SC4 : les conteneurs (C_) et sacs d'acteurs (A_) sont persistants par défaut
        this._persistent = this._id.startsWith("A_") || this._id.startsWith("C_");
        this._explicitEphemeral = false;
        this._maxWeight = null;
        this._maxSlots = null;
        this._onlyWeapons = false;
        this._onlyItems = false;
        this._onlyArmors = false;
        this._onlyAmmo = false;
        this._allowedTypes = null;
        this._allowedItemIds = null;
        this._blockedItemIds = null;
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
     * Indique si cet inventaire est persistant (ne doit pas être effacé une fois vidé).
     * @returns {boolean}
     */
    isPersistent() {
        if (this._explicitEphemeral) return false;
        if (this._id.startsWith("A_") || this._id.startsWith("C_")) {
            return this._persistent !== false;
        }
        return Boolean(this._persistent);
    }

    /**
     * Indique si l'inventaire doit s'auto-effacer après vidage (ex: cadavres, coffres temporaires).
     * @returns {boolean}
     */
    isAutoErase() {
        return Boolean(this._explicitEphemeral) || (this._id.startsWith("E_") && !this._persistent);
    }

    /**
     * Définit le caractère persistant de cet inventaire.
     * @param {boolean} value 
     */
    setPersistent(value) {
        this._persistent = Boolean(value);
        if (!this._persistent) {
            this._explicitEphemeral = true;
        } else {
            this._explicitEphemeral = false;
        }
    }

    /**
     * Calcule le poids total accumulé dans cet inventaire.
     * @returns {number}
     */
    totalWeight() {
        let total = 0;
        for (const item of this.items()) {
            const qty = this.numItems(item);
            const w = (typeof DataManager !== "undefined" && typeof DataManager.itemWeight === "function") 
                ? DataManager.itemWeight(item) 
                : 1;
            total += w * qty;
        }
        return Math.round(total * 100) / 100;
    }

    /**
     * Capacité maximale en poids de cet inventaire.
     * @returns {number}
     */
    maxWeight() {
        return (this._maxWeight !== null && this._maxWeight !== undefined) ? this._maxWeight : Infinity;
    }

    /**
     * Définit la capacité maximale en poids.
     * @param {number|null} val 
     */
    setMaxWeight(val) {
        this._maxWeight = (val !== null && val !== undefined) ? Number(val) : null;
    }

    /**
     * Indique si l'inventaire est surchargé.
     * @returns {boolean}
     */
    isOverloaded() {
        return this.totalWeight() > this.maxWeight();
    }

    /**
     * Nombre maximum d'emplacements différents (slots).
     * @returns {number}
     */
    maxSlots() {
        return (this._maxSlots !== null && this._maxSlots !== undefined) ? this._maxSlots : Infinity;
    }

    /**
     * Définit le nombre maximum d'emplacements.
     * @param {number|null} val 
     */
    setMaxSlots(val) {
        this._maxSlots = (val !== null && val !== undefined) ? Number(val) : null;
    }

    /**
     * Configure les restrictions et options d'inventaire.
     * @param {object} options 
     */
    setRestrictions(options = {}) {
        if (!options || typeof options !== "object") return;
        if (options.persistent !== undefined) {
            this._persistent = Boolean(options.persistent);
            if (!this._persistent) this._explicitEphemeral = true;
            else this._explicitEphemeral = false;
        }
        if (options.auto_erase !== undefined) {
            this._persistent = !Boolean(options.auto_erase);
            if (options.auto_erase) this._explicitEphemeral = true;
            else this._explicitEphemeral = false;
        }
        if (options.maxWeight !== undefined) this.setMaxWeight(options.maxWeight);
        if (options.maxSlots !== undefined) this.setMaxSlots(options.maxSlots);
        if (options.onlyWeapons !== undefined) this._onlyWeapons = Boolean(options.onlyWeapons);
        if (options.onlyItems !== undefined) this._onlyItems = Boolean(options.onlyItems);
        if (options.onlyArmors !== undefined) this._onlyArmors = Boolean(options.onlyArmors);
        if (options.onlyAmmo !== undefined) this._onlyAmmo = Boolean(options.onlyAmmo);
        if (options.allowedTypes !== undefined) this._allowedTypes = Array.isArray(options.allowedTypes) ? options.allowedTypes.slice() : null;
        if (options.allowedItemIds !== undefined) this._allowedItemIds = Array.isArray(options.allowedItemIds) ? options.allowedItemIds.slice() : null;
        if (options.blockedItemIds !== undefined) this._blockedItemIds = Array.isArray(options.blockedItemIds) ? options.blockedItemIds.slice() : null;
    }

    /**
     * Vérifie si un objet respecte toutes les restrictions pour être déposé dans cet inventaire.
     * @param {object} item 
     * @param {number} [amount=1] 
     * @returns {{ allowed: boolean, reason: string }}
     */
    checkAcceptItem(item, amount = 1) {
        if (!item) return { allowed: false, reason: "invalid_item" };
        amount = Number(amount) || 1;

        // Restriction : Armes uniquement
        if (this._onlyWeapons) {
            const isW = typeof DataManager !== "undefined" && typeof DataManager.isWeapon === "function" ? DataManager.isWeapon(item) : (item._itype === "weapon");
            if (!isW) {
                return { allowed: false, reason: "only_weapons" };
            }
        }

        // Restriction : Consommables uniquement
        if (this._onlyItems) {
            const isI = typeof DataManager !== "undefined" && typeof DataManager.isItem === "function" ? DataManager.isItem(item) : (item._itype === "item");
            if (!isI) {
                return { allowed: false, reason: "only_items" };
            }
        }

        // Restriction : Armures / Équipements uniquement
        if (this._onlyArmors) {
            const isA = typeof DataManager !== "undefined" && typeof DataManager.isArmor === "function" ? DataManager.isArmor(item) : (item._itype === "armor");
            if (!isA) {
                return { allowed: false, reason: "only_armors" };
            }
        }

        // Restriction : Munitions uniquement
        if (this._onlyAmmo) {
            const isAmmo = (typeof DataManager !== "undefined" && typeof DataManager.isAmmo === "function")
                ? DataManager.isAmmo(item)
                : (Boolean(DataManager.isItem ? DataManager.isItem(item) : (item._itype === "item")) && Boolean(item.note && (/<ammo/i.test(item.note) || /<munition/i.test(item.note))));
            if (!isAmmo) {
                return { allowed: false, reason: "only_ammo" };
            }
        }

        // Types autorisés
        if (Array.isArray(this._allowedTypes) && this._allowedTypes.length > 0) {
            let matchesType = false;
            for (const t of this._allowedTypes) {
                const typeStr = String(t).toLowerCase();
                if ((typeStr === "weapon" || typeStr === "w") && DataManager.isWeapon(item)) matchesType = true;
                if ((typeStr === "armor" || typeStr === "a") && DataManager.isArmor(item)) matchesType = true;
                if ((typeStr === "item" || typeStr === "i") && DataManager.isItem(item)) matchesType = true;
                if (typeStr === "ammo" && (typeof DataManager.isAmmo === "function" ? DataManager.isAmmo(item) : /<ammo/i.test(item.note || ""))) matchesType = true;
            }
            if (!matchesType) {
                return { allowed: false, reason: "allowed_types" };
            }
        }

        // Objets interdits (blockedItemIds)
        if (Array.isArray(this._blockedItemIds) && this._blockedItemIds.length > 0) {
            const key = this.itemKey(item);
            for (const b of this._blockedItemIds) {
                if (b === item.id || String(b) === String(item.id) || String(b) === key) {
                    return { allowed: false, reason: "blocked_item" };
                }
            }
        }

        // Objets autorisés spécifiques (allowedItemIds)
        if (Array.isArray(this._allowedItemIds) && this._allowedItemIds.length > 0) {
            const key = this.itemKey(item);
            let found = false;
            for (const a of this._allowedItemIds) {
                if (a === item.id || String(a) === String(item.id) || String(a) === key) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                return { allowed: false, reason: "not_in_allowed_list" };
            }
        }

        // Limite du nombre d'emplacements (slots)
        if (this._maxSlots !== null && this._maxSlots !== undefined && this._maxSlots > 0) {
            if (!this.hasItem(item) && this.items().length >= this._maxSlots) {
                return { allowed: false, reason: "max_slots" };
            }
        }

        // Limite de poids
        if (this._maxWeight !== null && this._maxWeight !== undefined && this._maxWeight > 0) {
            const itemW = (typeof DataManager !== "undefined" && typeof DataManager.itemWeight === "function")
                ? DataManager.itemWeight(item)
                : 1;
            if (this.totalWeight() + (itemW * amount) > this._maxWeight) {
                return { allowed: false, reason: "max_weight" };
            }
        }

        return { allowed: true, reason: "" };
    }

    /**
     * Indique si l'objet peut être accepté dans cet inventaire.
     * @param {object} item 
     * @param {number} [amount=1] 
     * @returns {boolean}
     */
    canAcceptItem(item, amount = 1) {
        return this.checkAcceptItem(item, amount).allowed;
    }

    /**
     * Vide intégralement l'inventaire.
     */
    clear() {
        this._items = {};
    }

    /**
     * Charge le contenu depuis une liste de données JSON ou un objet de configuration.
     * @param {Array<object>|object} data 
     */
    loadData(data) {
        this.clear();
        if (!data) return;

        let dataArray = data;
        if (!Array.isArray(data) && typeof data === "object") {
            this.setRestrictions(data);
            dataArray = data.items || [];
        }
        if (!Array.isArray(dataArray)) return;

        for (const entry of dataArray) {
            if (!entry) continue;

            let kind = 1; // 1: item, 2: weapon, 3: armor
            let itemId = 0;

            if (entry.weapon_id !== undefined) {
                kind = 2;
                itemId = Number(entry.weapon_id);
            } else if (entry.armor_id !== undefined) {
                kind = 3;
                itemId = Number(entry.armor_id);
            } else if (entry.type === "weapon" || entry.kind === "weapon" || entry.type === "w" || entry.kind === 2 || entry.kind === "2") {
                kind = 2;
                itemId = Number(entry.item_id || entry.id);
            } else if (entry.type === "armor" || entry.kind === "armor" || entry.type === "a" || entry.kind === 3 || entry.kind === "3") {
                kind = 3;
                itemId = Number(entry.item_id || entry.id);
            } else {
                kind = Number(entry.kind) || 1;
                itemId = Number(entry.item_id || entry.id);
            }

            const quantity = Number(entry.quantity) || 1;

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
     * @returns {object}
     */
    makeSaveData() {
        const items = [];
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
                items.push({
                    kind: kind,
                    item_id: id,
                    quantity: quantity
                });
            }
        }
        return {
            items: items,
            persistent: Boolean(this._persistent),
            maxWeight: this._maxWeight || null,
            maxSlots: this._maxSlots || null,
            onlyWeapons: Boolean(this._onlyWeapons),
            onlyItems: Boolean(this._onlyItems),
            onlyArmors: Boolean(this._onlyArmors),
            onlyAmmo: Boolean(this._onlyAmmo),
            allowedTypes: this._allowedTypes || null,
            allowedItemIds: this._allowedItemIds || null,
            blockedItemIds: this._blockedItemIds || null,
            initialized: true
        };
    }
}

window.Game_Inventory = Game_Inventory;
