//=============================================================================
// SimCraft 4 - Game_InteractionChat
// SC4_Game_InteractionChat.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Interaction concrète Discuter (Game_InteractionChat).
 * @author SimCraft
 * @help SC4_Game_InteractionChat.js
 * 
 * Classe d'interaction concrète permettant d'engager une conversation
 * ordinaire avec un PNJ. Calcule la réaction en appliquant les seuils Umbral
 * et les modificateurs d'états psychologiques RMMZ.
 */

const _InteractionBaseClass = (typeof Game_InteractionBase !== "undefined")
    ? Game_InteractionBase
    : (typeof require !== "undefined" ? require("./SC4_Game_InteractionBase") : Object);

const _ReactionChatClass = (typeof Game_ReactionChat !== "undefined")
    ? Game_ReactionChat
    : (typeof require !== "undefined" ? require("./SC4_Game_ReactionChat") : null);

class Game_InteractionChat extends _InteractionBaseClass {
    constructor(actorId1 = 0, actorId2 = 0) {
        super("chat", "Discuter", actorId1, actorId2, 3600);
    }

    /**
     * Résout la réaction du PNJ selon les seuils Umbral et les états
     * @param {Game_Relation} relation 
     * @param {Game_Actor} actor1 
     * @param {Game_Actor} actor2 
     * @returns {Game_ReactionChat}
     */
    calculateResult(relation, actor1, actor2) {
        const ReactionClass = (typeof Game_ReactionChat !== "undefined") ? Game_ReactionChat : _ReactionChatClass;
        if (!relation) {
            return ReactionClass.createNeutral(this._actorId2);
        }

        // 1. Vérification du seuil de saturation ("Boring" / Patience sociale façon Les Sims)
        const currentTimestamp = (typeof $gameDate !== "undefined" && $gameDate) ? $gameDate.timestamp : 0;
        if (relation.isSaturated(currentTimestamp)) {
            // Antispam dynamique : 50% de chance de pénalité d'affinité
            const hasPenalty = (typeof Math !== "undefined" && Math.random) ? (Math.random() < 0.5) : false;
            const penalty = hasPenalty ? -1 : 0;
            const shouldClose = relation.affinity < 0 || ((typeof Math !== "undefined" && Math.random) ? (Math.random() < 0.5) : false);
            return ReactionClass.createBored(this._actorId2, "Je n'ai plus envie de discuter pour le moment.", penalty, shouldClose);
        }

        const isRepetitive = relation.getPatience(currentTimestamp) <= 60;

        // 2. Prise en compte prioritaire des États RMMZ ($dataStates) du PNJ
        if (actor2 && typeof actor2.states === "function") {
            const states = actor2.states();
            const hasHostileState = states.some(s => s && s.meta && s.meta.hostile);
            if (hasHostileState) {
                return ReactionClass.createHostile(this._actorId2);
            }
            const hasIntimidatedState = states.some(s => s && s.meta && s.meta.intimidated);
            if (hasIntimidatedState) {
                return ReactionClass.createNeutral(this._actorId2, "P-pas d'histoires... Que me voulez-vous ?");
            }
        }

        // 3. Application de la grille des seuils Umbral déterministes
        const threshold = relation.reactionThreshold();
        let result = null;

        switch (threshold) {
            case "total_hostility":
                result = ReactionClass.createHostile(this._actorId2, "Dégagez avant que j'ouvre le feu !");
                break;
            case "hostility":
                result = ReactionClass.createCold(this._actorId2);
                break;
            case "neutrality":
                result = ReactionClass.createNeutral(this._actorId2);
                break;
            case "respect":
                result = ReactionClass.createFriendly(this._actorId2);
                break;
            case "loyalty":
                result = ReactionClass.createFriendly(this._actorId2, "À vos ordres ! Que puis-je faire pour vous assister ?");
                break;
            default:
                result = ReactionClass.createNeutral(this._actorId2);
                break;
        }

        // Si l'interaction est répétée (patience moyenne), c'est du bavardage d'ambiance (gain neutre)
        if (isRepetitive && result && result.affinityDelta > 0) {
            result._affinityDelta = 0;
        }

        return result;
    }
}

if (typeof module !== "undefined") {
    module.exports = Game_InteractionChat;
}
