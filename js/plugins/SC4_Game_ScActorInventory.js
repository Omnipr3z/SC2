//=============================================================================
// SC4_Game_ScActorInventory.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Sous-composant d'inventaire et de capacité de charge pour Game_ScActor.
 * @author SimCraft
 * @help
 * ============================================================================
 * Game_ScActorInventory.js
 * ============================================================================
 * Composant délégué gérant le stockage et la charge pour un acteur :
 * - Lien avec l'inventaire secondaire $inventories.inventory("A_" + actorId).
 * - Calcul du poids, capacité d'emport et bonus d'équipements.
 * - État de fatigue / exhaustion.
 * ============================================================================
 */

const _scActorInventoryMap = new WeakMap();

class Game_ScActorInventory {
    /**
     * @param {Game_ScActor} actor Acteur parent
     */
    constructor(actor) {
        this.setActor(actor);
        const aId = (typeof actor === "number") ? actor : (actor && typeof actor.actorId === "function" ? actor.actorId() : 0);
        this._inventoryId = "A_" + aId;
        this._exhaustion = 0;
    }

    /**
     * Définit ou ré-associe l'acteur parent sans créer de référence circulaire énumérable.
     * @param {Game_ScActor|number} actor 
     */
    setActor(actor) {
        this._actorId = (typeof actor === "number") ? actor : (actor && typeof actor.actorId === "function" ? actor.actorId() : 0);
        if (actor && typeof actor === "object") {
            _scActorInventoryMap.set(this, actor);
        }
    }

    /**
     * @returns {Game_ScActor} Acteur parent
     */
    actor() {
        const mapped = _scActorInventoryMap.get(this);
        if (mapped) return mapped;
        if (this._actorId && typeof $gameActors !== "undefined" && $gameActors && typeof $gameActors.actor === "function") {
            return $gameActors.actor(this._actorId);
        }
        return null;
    }

    /**
     * @returns {string} Identifiant de l'inventaire secondaire (ex: "A_1")
     */
    id() {
        return this._inventoryId;
    }

    /**
     * Accède à l'instance Game_Inventory associée dans le registre global $inventories.
     * @returns {Game_Inventory|null}
     */
    container() {
        if (typeof $inventories !== "undefined" && $inventories && typeof $inventories.inventory === "function") {
            return $inventories.inventory(this._inventoryId);
        }
        return null;
    }

    /**
     * Liste des objets contenus dans le sac de l'acteur.
     * @returns {Array<object>}
     */
    items() {
        const c = this.container();
        return c ? c.items() : [];
    }

    /**
     * Quantité possédée pour un objet donné dans l'inventaire personnel.
     * @param {object} item 
     * @returns {number}
     */
    numItems(item) {
        const c = this.container();
        return c ? c.numItems(item) : 0;
    }

    /**
     * Ajoute des objets dans l'inventaire personnel de l'acteur.
     * @param {object} item 
     * @param {number} amount 
     * @returns {number} Quantité effectivement ajoutée
     */
    addItem(item, amount = 1) {
        const c = this.container();
        return c ? c.addItem(item, amount) : 0;
    }

    /**
     * Retire des objets de l'inventaire personnel de l'acteur.
     * @param {object} item 
     * @param {number} amount 
     * @returns {number} Quantité retirée
     */
    removeItem(item, amount = 1) {
        const c = this.container();
        return c ? c.removeItem(item, amount) : 0;
    }

    /**
     * Indique si l'acteur possède l'objet en quantité suffisante.
     * @param {object} item 
     * @param {number} amount 
     * @returns {boolean}
     */
    hasItem(item, amount = 1) {
        const c = this.container();
        return c ? c.hasItem(item, amount) : false;
    }

    /**
     * Calcule le poids total des objets portés dans le sac personnel.
     * @returns {number} Poids en unités SC4
     */
    currentWeight() {
        const c = this.container();
        return c ? c.currentWeight() : 0;
    }

    /**
     * Calcule le bonus de capacité de port octroyé par les pièces d'équipement portées.
     * @returns {number}
     */
    equipmentWeightCapacityBonus() {
        const a = this.actor();
        if (a && a.equipment && typeof a.equipment.equipmentWeightBonus === "function") {
            return a.equipment.equipmentWeightBonus();
        }

        // Repli direct sur equips() si equipment n'est pas encore initialisé
        let bonus = 0;
        const equips = (a && typeof a.equips === "function") ? a.equips() : [];
        for (const eq of equips) {
            if (!eq) continue;
            if (typeof DataManager !== "undefined" && typeof DataManager.itemRawWeight === "function") {
                const raw = DataManager.itemRawWeight(eq);
                if (raw < 0) {
                    bonus += Math.abs(raw);
                }
            }
        }
        return bonus;
    }

    /**
     * Calcule la capacité de port de base de l'acteur (sans bonus d'équipement).
     * @returns {number}
     */
    baseWeightCapacity() {
        const a = this.actor();
        const baseAtk = (a && typeof a.atk === "number") ? a.atk : 10;
        return Math.max(10, Math.round(baseAtk * 2.5));
    }

    /**
     * Capacité de charge maximale totale de l'acteur.
     * @returns {number}
     */
    weightCapacity() {
        return this.baseWeightCapacity() + this.equipmentWeightCapacityBonus();
    }

    /**
     * Indique si l'acteur est en surcharge pondérale.
     * @returns {boolean}
     */
    isOverloaded() {
        return this.currentWeight() > this.weightCapacity();
    }

    /**
     * Niveau de fatigue / exhaustion accumulé par l'acteur.
     * @returns {number}
     */
    exhaustion() {
        return this._exhaustion || 0;
    }

    /**
     * Définit le niveau d'épuisement de l'acteur.
     * @param {number} val 
     */
    setExhaustion(val) {
        this._exhaustion = Math.max(0, Number(val) || 0);
    }

    /**
     * Incrémente ou décrémente la fatigue.
     * @param {number} delta 
     */
    addExhaustion(delta) {
        this.setExhaustion(this.exhaustion() + (Number(delta) || 0));
    }

    /**
     * Synchronise le maxWeight du conteneur avec la capacité dynamique calculée.
     */
    syncMaxWeight() {
        const c = this.container();
        if (c && typeof c.setMaxWeight === "function") {
            c.setMaxWeight(this.weightCapacity());
        }
    }

    /**
     * Sérialisation whitelistée (déléguée depuis Game_ScActor).
     * @returns {object}
     */
    makeSavefileData() {
        return {
            exhaustion: this._exhaustion || 0
        };
    }

    /**
     * Désérialisation ciblée de la fatigue.
     * @param {object} data 
     */
    loadSavefileData(data) {
        if (!data || typeof data !== "object") return;
        if (data.exhaustion !== undefined) {
            this._exhaustion = Number(data.exhaustion) || 0;
        }
    }
}

if (typeof window !== "undefined") {
    window.Game_ScActorInventory = Game_ScActorInventory;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game_ScActorInventory;
}

