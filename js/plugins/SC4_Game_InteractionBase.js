//=============================================================================
// SimCraft 4 - Game_InteractionBase
// SC4_Game_InteractionBase.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Classe parente générique des interactions sociales (Game_InteractionBase).
 * @author SimCraft
 * @help SC4_Game_InteractionBase.js
 * 
 * Classe abstraite/mère définissant le contrat des interactions entre acteurs.
 * Les types concrets (Discuter, Intimider, Recruter, etc.) en héritent.
 */

class Game_InteractionBase {
    /**
     * @param {string} id Identifiant unique du type d'interaction
     * @param {string} name Nom lisible de l'action
     * @param {number} actorId1 Initiateur (souvent PJ)
     * @param {number} actorId2 Cible (PNJ)
     * @param {number} cooldownDuration Temps de recharge en secondes (défaut: 3600s)
     */
    constructor(id = "base", name = "Action", actorId1 = 0, actorId2 = 0, cooldownDuration = 3600) {
        this._id = id;
        this._name = name;
        this._actorId1 = Number(actorId1) || 0;
        this._actorId2 = Number(actorId2) || 0;
        this._cooldownDuration = Number(cooldownDuration) || 0;
    }

    get id() {
        return this._id;
    }

    get name() {
        return this._name;
    }

    get actorId1() {
        return this._actorId1;
    }

    get actorId2() {
        return this._actorId2;
    }

    get cooldownDuration() {
        return this._cooldownDuration;
    }

    /**
     * Vérifie si l'interaction est réalisable
     * @param {Game_Relation} relation 
     * @param {Game_Actor} actor1 
     * @param {Game_Actor} actor2 
     * @param {number} currentTimestamp 
     * @returns {boolean}
     */
    isAvailable(relation, actor1, actor2, currentTimestamp = 0) {
        if (!relation) return false;
        return relation.canInteract(this._id, currentTimestamp, this._cooldownDuration);
    }

    /**
     * Résout la logique et produit une réaction
     * @param {Game_Relation} relation 
     * @param {Game_Actor} actor1 
     * @param {Game_Actor} actor2 
     * @returns {Game_ReactionBase}
     */
    calculateResult(relation, actor1, actor2) {
        throw new Error("calculateResult() doit être implémentée par les classes dérivées.");
    }
}

window.Game_InteractionBase = Game_InteractionBase;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game_InteractionBase;
}
