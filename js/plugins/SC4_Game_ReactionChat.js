//=============================================================================
// SimCraft 4 - Game_ReactionChat
// SC4_Game_ReactionChat.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Réactions spécialisées pour l'interaction Discuter (Game_ReactionChat).
 * @author SimCraft
 * @help SC4_Game_ReactionChat.js
 * 
 * Sous-classe concrète de Game_ReactionBase pour les dialogues de bavardage
 * et prises de contact ordinaires (Amicaux, Neutres, Froids, Hostiles).
 */

class Game_ReactionChat extends Game_ReactionBase {
    constructor(params = {}) {
        params.interactionType = "chat";
        super(params);
    }

    /**
     * Réaction Amicale / Chaleureuse (+3 affinité)
     */
    static createFriendly(actorId = 0, customText = "") {
        return new Game_ReactionChat({
            type: "friendly",
            dialogueKey: "CHAT_FRIENDLY",
            dialogueText: customText || "C'est un plaisir d'échanger avec vous, citoyen.",
            affinityDelta: 3,
            threatDelta: 0
        });
    }

    /**
     * Réaction Neutre / Standard (+1 affinité)
     */
    static createNeutral(actorId = 0, customText = "") {
        return new Game_ReactionChat({
            type: "neutral",
            dialogueKey: "CHAT_NEUTRAL",
            dialogueText: customText || "Rien de particulier à signaler dans le secteur.",
            affinityDelta: 1,
            threatDelta: 0
        });
    }

    /**
     * Réaction Froide / Distante (-2 affinité)
     */
    static createCold(actorId = 0, customText = "") {
        return new Game_ReactionChat({
            type: "cold",
            dialogueKey: "CHAT_COLD",
            dialogueText: customText || "Je n'ai pas de temps à perdre en bavardages stériles.",
            affinityDelta: -2,
            threatDelta: 0
        });
    }

    /**
     * Réaction Hostile / Agressive (-2 affinité, menace éventuelle)
     */
    static createHostile(actorId = 0, customText = "") {
        return new Game_ReactionChat({
            type: "hostile",
            dialogueKey: "CHAT_HOSTILE",
            dialogueText: customText || "Passez votre chemin si vous tenez à votre matricule.",
            affinityDelta: -2,
            threatDelta: 5,
            shouldCloseScene: true
        });
    }

    /**
     * Réaction de Lassitude / Seuil de saturation atteint ("Boring" / Fatigue sociale)
     * @param {number} actorId 
     * @param {string} customText 
     * @param {number} affinityPenalty Pénalité antispam dynamique (ex: -1)
     * @param {boolean} shouldClose Si vrai, clôture la sous-scène
     */
    static createBored(actorId = 0, customText = "", affinityPenalty = 0, shouldClose = false) {
        return new Game_ReactionChat({
            type: "bored",
            dialogueKey: "CHAT_BORED",
            dialogueText: customText || "Je n'ai plus envie de discuter pour le moment.",
            affinityDelta: Number(affinityPenalty) || 0,
            threatDelta: 0,
            shouldCloseScene: !!shouldClose
        });
    }

    /**
     * Réaction avec une séquence de répliques (monologue ou ping-pong PNJ/Joueur)
     * @param {number} actorId 
     * @param {Array<string|{target: string|number, text: string}>} sequence 
     * @param {object} params Options additionnelles (type, affinityDelta, shouldCloseScene...)
     * @returns {Game_ReactionChat}
     */
    static createSequence(actorId = 0, sequence = [], params = {}) {
        return new Game_ReactionChat(Object.assign({
            type: params.type || "neutral",
            dialogueKey: params.dialogueKey || "CHAT_SEQUENCE",
            dialogueText: sequence,
            affinityDelta: params.affinityDelta !== undefined ? Number(params.affinityDelta) : 1,
            threatDelta: params.threatDelta !== undefined ? Number(params.threatDelta) : 0,
            shouldCloseScene: !!params.shouldCloseScene
        }, params));
    }
}

window.Game_ReactionChat = Game_ReactionChat;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game_ReactionChat;
}
