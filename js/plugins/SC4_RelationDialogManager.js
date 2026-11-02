//=============================================================================
// SimCraft 4 - RelationDialogManager
// SC4_RelationDialogManager.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Contrôleur de flux pour les scènes et sous-scènes de dialogue social (RelationDialogManager).
 * @author SimCraft
 * @help SC4_RelationDialogManager.js
 * 
 * Gère la machine à états de l'échange de dialogue :
 * 1. Initialisation de l'échange et récupération des interactions possibles.
 * 2. Instanciation de l'interaction choisie par le joueur.
 * 3. Calcul de la réaction PNJ.
 * 4. Application des conséquences via RelationManager.
 */

class RelationDialogManager {
    constructor() {
        this._activeInterlocutorId = null;
        this._currentInteraction = null;
        this._lastReaction = null;
    }

    get activeInterlocutorId() {
        return this._activeInterlocutorId;
    }

    get currentInteraction() {
        return this._currentInteraction;
    }

    get lastReaction() {
        return this._lastReaction;
    }

    /**
     * Démarre une session d'échange avec un PNJ
     * @param {number} targetActorId 
     * @returns {object} { relation, availableInteractions }
     */
    startExchange(targetActorId) {
        this._activeInterlocutorId = Number(targetActorId) || 0;
        this._currentInteraction = null;
        this._lastReaction = null;

        if (typeof $relationManager === "undefined" || !$relationManager) {
            return { relation: null, availableInteractions: [] };
        }

        const relation = $relationManager.getRelationWithPlayer(this._activeInterlocutorId);
        const availableInteractions = $relationManager.getAvailableInteractions(this._activeInterlocutorId);

        return {
            relation: relation,
            availableInteractions: availableInteractions
        };
    }

    /**
     * Sélectionne et instancie une interaction par son identifiant
     * @param {string} interactionType 
     * @returns {Game_InteractionBase|null}
     */
    selectInteraction(interactionType) {
        if (!this._activeInterlocutorId) return null;

        const playerId = (typeof $gameParty !== "undefined" && $gameParty && $gameParty.leader())
            ? $gameParty.leader().actorId()
            : 1;

        if (interactionType === "chat") {
            const InteractionChatClass = (typeof Game_InteractionChat !== "undefined")
                ? Game_InteractionChat
                : (typeof require !== "undefined" ? require("./SC4_Game_InteractionChat") : null);

            if (InteractionChatClass) {
                this._currentInteraction = new InteractionChatClass(playerId, this._activeInterlocutorId);
            }
        }

        return this._currentInteraction;
    }

    /**
     * Exécute l'interaction sélectionnée et calcule la réaction
     * @returns {Game_ReactionBase|null}
     */
    executeCurrentInteraction() {
        if (!this._currentInteraction || !this._activeInterlocutorId) return null;

        const relation = (typeof $relationManager !== "undefined" && $relationManager)
            ? $relationManager.getRelation(this._currentInteraction.actorId1, this._currentInteraction.actorId2)
            : null;

        const playerActor = (typeof $gameActors !== "undefined" && $gameActors)
            ? $gameActors.actor(this._currentInteraction.actorId1)
            : null;

        const targetActor = (typeof $gameActors !== "undefined" && $gameActors)
            ? $gameActors.actor(this._currentInteraction.actorId2)
            : null;

        this._lastReaction = this._currentInteraction.calculateResult(relation, playerActor, targetActor);
        return this._lastReaction;
    }

    /**
     * Confirme l'échange et applique les conséquences au monde
     * @returns {boolean} Succès
     */
    confirmReaction() {
        if (!this._currentInteraction || !this._lastReaction) return false;

        if (typeof $relationManager !== "undefined" && $relationManager) {
            $relationManager.applyInteractionResult(this._currentInteraction, this._lastReaction);
        }

        return true;
    }

    /**
     * Annule ou termine la session de dialogue en cours
     */
    endExchange() {
        this._activeInterlocutorId = null;
        this._currentInteraction = null;
        this._lastReaction = null;
    }
}

if (typeof module !== "undefined") {
    module.exports = RelationDialogManager;
}
