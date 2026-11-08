//=============================================================================
// SimCraft 4 - Game_ReactionBase
// SC4_Game_ReactionBase.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Classe parente générique des réactions sociales (Game_ReactionBase).
 * @author SimCraft
 * @help SC4_Game_ReactionBase.js
 * 
 * Classe de données et de logique représentant la réaction d'un PNJ
 * suite à une interaction sociale (dialogue, affinité, modificateurs d'état).
 */

class Game_ReactionBase {
    /**
     * @param {object} params Paramètres de la réaction
     */
    constructor(params = {}) {
        this._type = params.type || "neutral";
        this._interactionType = params.interactionType || "unknown";
        this._dialogueKey = params.dialogueKey || "";
        this._dialogueText = params.dialogueText || "";
        this._affinityDelta = Number(params.affinityDelta) || 0;
        this._threatDelta = Number(params.threatDelta) || 0;
        this._stateIdToAdd = params.stateIdToAdd ? Number(params.stateIdToAdd) : null;
        this._stateIdToRemove = params.stateIdToRemove ? Number(params.stateIdToRemove) : null;
        this._selfSwitch = params.selfSwitch ? JSON.parse(JSON.stringify(params.selfSwitch)) : null;
        this._shouldCloseScene = !!params.shouldCloseScene;
    }

    get shouldCloseScene() {
        return this._shouldCloseScene;
    }

    set shouldCloseScene(val) {
        this._shouldCloseScene = !!val;
    }

    get type() {
        return this._type;
    }

    get interactionType() {
        return this._interactionType;
    }

    get dialogueKey() {
        return this._dialogueKey;
    }

    get dialogueText() {
        return this._dialogueText;
    }

    /**
     * Retourne la séquence de répliques normalisée.
     * Chaque élément est un objet { target: "npc"|"player"|number, text: string }
     * @returns {Array<{target: string|number, text: string}>}
     */
    dialogueSequence() {
        if (!this._dialogueText) return [];
        if (Array.isArray(this._dialogueText)) {
            return this._dialogueText.map(item => {
                if (typeof item === "string") {
                    return { target: "npc", text: item };
                } else if (item && typeof item === "object") {
                    return {
                        target: item.target !== undefined ? item.target : "npc",
                        text: item.text || ""
                    };
                }
                return { target: "npc", text: String(item) };
            });
        }
        return [{ target: "npc", text: String(this._dialogueText) }];
    }

    isMultiMessage() {
        return Array.isArray(this._dialogueText) && this._dialogueText.length > 1;
    }

    get affinityDelta() {
        return this._affinityDelta;
    }

    get threatDelta() {
        return this._threatDelta;
    }

    get stateIdToAdd() {
        return this._stateIdToAdd;
    }

    get stateIdToRemove() {
        return this._stateIdToRemove;
    }

    get selfSwitch() {
        return this._selfSwitch;
    }

    isPositive() {
        return this._affinityDelta > 0;
    }

    isNegative() {
        return this._affinityDelta < 0;
    }

    isHostile() {
        return this._type === "hostile" || this._type === "total_hostility";
    }
}

window.Game_ReactionBase = Game_ReactionBase;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game_ReactionBase;
}
