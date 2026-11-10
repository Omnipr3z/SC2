//=============================================================================
// SC4_Game_ScActorEquipment.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Sous-composant d'équipement pour Game_ScActor (Game_ScActorEquipment).
 * @author SimCraft
 * @help
 * ============================================================================
 * Game_ScActorEquipment.js
 * ============================================================================
 * Composant délégué responsable de la gestion des équipements pour un acteur :
 * - Slots d'équipements et compatibilité des types d'équipements.
 * - Gestion des armes, armures et objets équipés.
 * - Extraction des calques Paperdoll (<visual_equip: ...>) et Faceset (<face: ...>).
 * - Bonus d'équipement (capacité de port, stats tactiques).
 * ============================================================================
 */

const _scActorEquipmentMap = new WeakMap();

class Game_ScActorEquipment {
    /**
     * @param {Game_ScActor} actor Acteur parent
     */
    constructor(actor) {
        this.setActor(actor);
    }

    /**
     * Définit ou ré-associe l'acteur parent sans créer de référence circulaire énumérable.
     * @param {Game_ScActor|number} actor 
     */
    setActor(actor) {
        this._actorId = (typeof actor === "number") ? actor : (actor && typeof actor.actorId === "function" ? actor.actorId() : 0);
        if (actor && typeof actor === "object") {
            _scActorEquipmentMap.set(this, actor);
        }
    }

    /**
     * @returns {Game_ScActor} Acteur parent
     */
    actor() {
        const mapped = _scActorEquipmentMap.get(this);
        if (mapped) return mapped;
        if (this._actorId && typeof $gameActors !== "undefined" && $gameActors && typeof $gameActors.actor === "function") {
            return $gameActors.actor(this._actorId);
        }
        return null;
    }

    /**
     * @returns {number[]} Liste des identifiants d'etype pour chaque slot
     */
    slots() {
        const a = this.actor();
        return (a && typeof a.equipSlots === "function") ? a.equipSlots() : [];
    }

    /**
     * @returns {Array<object|null>} Liste des armes et armures actuellement équipées
     */
    equips() {
        const a = this.actor();
        return (a && typeof a.equips === "function") ? a.equips() : [];
    }

    /**
     * @returns {Array<object>} Liste des armes équipées
     */
    weapons() {
        const a = this.actor();
        return (a && typeof a.weapons === "function") ? a.weapons() : [];
    }

    /**
     * @returns {Array<object>} Liste des armures équipées
     */
    armors() {
        const a = this.actor();
        return (a && typeof a.armors === "function") ? a.armors() : [];
    }

    /**
     * Retourne l'objet équipé à un slot donné.
     * @param {number} slotId Index du slot (0..n)
     * @returns {object|null}
     */
    itemAt(slotId) {
        const list = this.equips();
        return (slotId >= 0 && slotId < list.length) ? list[slotId] : null;
    }

    /**
     * Équipe un objet à un slot spécifique.
     * @param {number} slotId Index du slot
     * @param {object|null} item Arme ou armure
     */
    changeEquip(slotId, item) {
        const a = this.actor();
        if (a && typeof a.changeEquip === "function") {
            a.changeEquip(slotId, item);
        }
    }

    /**
     * Force l'équipement d'un objet (sans vérification des sceaux ou restrictions).
     * @param {number} slotId Index du slot
     * @param {object|null} item Arme ou armure
     */
    forceChangeEquip(slotId, item) {
        const a = this.actor();
        if (a && typeof a.forceChangeEquip === "function") {
            a.forceChangeEquip(slotId, item);
        }
    }

    /**
     * Retire tous les équipements de l'acteur.
     */
    clear() {
        const a = this.actor();
        if (a && typeof a.clearEquipments === "function") {
            a.clearEquipments();
        }
    }

    /**
     * Vérifie si le changement d'équipement d'un slot est autorisé.
     * @param {number} slotId Index du slot
     * @returns {boolean}
     */
    isEquipChangeOk(slotId) {
        const a = this.actor();
        return (a && typeof a.isEquipChangeOk === "function")
            ? a.isEquipChangeOk(slotId)
            : true;
    }

    /**
     * Vérifie si l'acteur peut équiper cet objet.
     * @param {object} item Arme ou armure
     * @returns {boolean}
     */
    canEquip(item) {
        const a = this.actor();
        return (a && typeof a.canEquip === "function")
            ? a.canEquip(item)
            : true;
    }

    /**
     * Détermine l'index du slot compatible pour un objet donné.
     * @param {object} item Arme ou armure RMMZ
     * @returns {number} Index du slot ou -1
     */
    findSlotFor(item) {
        if (!item || typeof item !== "object") return -1;
        const slots = this.slots();
        const equips = this.equips();

        const isWeapon = (typeof DataManager !== "undefined" && typeof DataManager.isWeapon === "function")
            ? DataManager.isWeapon(item)
            : Boolean(item.wtypeId !== undefined);

        const targetEtypeId = isWeapon ? 1 : item.etypeId;

        // 1. Recherche d'un slot vide compatible en priorité
        for (let i = 0; i < slots.length; i++) {
            if (slots[i] === targetEtypeId && !equips[i]) {
                return i;
            }
        }

        // 2. Repli sur le premier slot compatible
        for (let i = 0; i < slots.length; i++) {
            if (slots[i] === targetEtypeId) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Équipe un objet dans son slot dédié.
     * @param {object} item Arme ou armure
     * @returns {boolean} Succès de l'opération
     */
    equip(item) {
        if (!item) return false;
        const slotId = this.findSlotFor(item);
        if (slotId < 0) return false;
        if (!this.isEquipChangeOk(slotId)) return false;

        this.changeEquip(slotId, item);
        return true;
    }

    /**
     * Retire l'équipement à un slot donné.
     * @param {number} slotId Index du slot
     * @returns {boolean} Succès
     */
    unequip(slotId) {
        if (slotId < 0 || !this.isEquipChangeOk(slotId)) return false;
        this.changeEquip(slotId, null);
        return true;
    }

    /**
     * Vérifie si un objet spécifique est actuellement équipé.
     * @param {number} itemId ID de l'arme ou armure
     * @param {boolean|null} isWeapon true pour arme, false pour armure, null pour indifférent
     * @returns {boolean}
     */
    hasEquipped(itemId, isWeapon = null) {
        const list = this.equips();
        for (const eq of list) {
            if (!eq || eq.id !== itemId) continue;
            if (isWeapon === true && !DataManager.isWeapon(eq)) continue;
            if (isWeapon === false && !DataManager.isArmor(eq)) continue;
            return true;
        }
        return false;
    }

    /**
     * Extrait toutes les couches d'équipements visuels (Paperdoll) équipées.
     * Lit les notetags <visual_equip: FILENAME, [zindex]> sur chaque équipement.
     * @returns {Array<{ filename: string, zindex: number }>}
     */
    getVisualEquipLayers() {
        const layers = [];
        const equips = this.equips();

        for (const item of equips) {
            if (!item || !item.note) continue;

            const regex = /<visual_equip:\s*([^,>]+)(?:,\s*(\d+))?>/gi;
            let match;
            while ((match = regex.exec(item.note)) !== null) {
                const filename = match[1].trim();
                const zindex = match[2] ? parseInt(match[2], 10) : 55;
                layers.push({ filename, zindex });
            }
        }

        return layers;
    }

    /**
     * Extrait toutes les couches de portrait faceset d'équipements équipées.
     * Lit les notetags <face: FILENAME, [zindex], [unisex]> sur chaque équipement.
     * @returns {Array<{ filename: string, zindex: number, unisex: boolean }>}
     */
    getFaceEquipLayers() {
        const layers = [];
        const equips = this.equips();

        for (const item of equips) {
            if (!item || !item.note) continue;

            const regex = /<face:\s*([^,>]+)(?:,\s*(\d+))?(?:,\s*(true|false))?\s*>/gi;
            let match;
            while ((match = regex.exec(item.note)) !== null) {
                const filename = match[1].trim();
                const zindex = match[2] ? parseInt(match[2], 10) : 10;
                const unisex = match[3] ? (match[3].toLowerCase() === "true") : false;
                layers.push({ filename, zindex, unisex });
            }
        }

        return layers;
    }

    /**
     * Calcule le bonus de capacité de port conféré par l'équipement.
     * (Poids négatif dans le notetag ou balise <weightCapacityBonus: X>).
     * @returns {number}
     */
    equipmentWeightBonus() {
        let bonus = 0;
        const equips = this.equips();
        for (const eq of equips) {
            if (!eq) continue;

            // 1. Poids négatif (ex: sac à dos allégeant la charge)
            if (typeof DataManager !== "undefined" && typeof DataManager.itemRawWeight === "function") {
                const raw = DataManager.itemRawWeight(eq);
                if (raw < 0) {
                    bonus += Math.abs(raw);
                }
            }

            // 2. Notetag explicite <weightCapacityBonus: X>
            if (eq.note) {
                const match = eq.note.match(/<weightCapacityBonus:\s*(\d+)>/i);
                if (match) {
                    bonus += parseInt(match[1], 10);
                }
            }
        }
        return bonus;
    }
    /**
     * Sérialisation whitelistée (déléguée depuis Game_ScActor).
     * @returns {object}
     */
    makeSavefileData() {
        return {};
    }

    /**
     * Désérialisation ciblée (l'équipement concret reste synchronisé avec _equips de Game_Actor).
     * @param {object} data 
     */
    loadSavefileData(data) {
        // Rien de spécifique à charger ici
    }
}

if (typeof window !== "undefined") {
    window.Game_ScActorEquipment = Game_ScActorEquipment;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game_ScActorEquipment;
}

