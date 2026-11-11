//=============================================================================
// SimCraft 4 - Window_InteractionCommand
// SC4_Window_InteractionCommand.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Menu de sélection des actions sociales (Window_InteractionCommand).
 * @author SimCraft
 * @help SC4_Window_InteractionCommand.js
 */

class Window_InteractionCommand extends Window_Command {
    constructor(rect) {
        super(rect);
        this._availableInteractions = [];
    }

    setAvailableInteractions(interactions = []) {
        this._availableInteractions = Array.isArray(interactions) ? interactions : [];
        this.refresh();
        if (typeof this.select === "function") this.select(0);
        if (typeof this.activate === "function") this.activate();
    }

    clearCommandList() {
        this._list = [];
    }

    refresh() {
        this.clearCommandList();
        this.makeCommandList();
        if (typeof super.refresh === "function") {
            super.refresh();
        }
    }

    loc(key, fallback) {
        if (typeof SC4_Localization !== "undefined" && typeof SC4_Localization.getText === "function") {
            return SC4_Localization.getText(key, fallback);
        }
        return fallback;
    }

    makeCommandList() {
        this._availableInteractions = this._availableInteractions || [];
        if (this._availableInteractions.includes("chat")) {
            this.addCommand(`💬 ${this.loc("relation.cmd_chat", "Discuter")}`, "chat", true);
        } else if (this._availableInteractions.includes("chat_saturated")) {
            this.addCommand(`💬 ${this.loc("relation.cmd_chat_saturated", "Discuter (Agacé)")}`, "chat", false);
        } else {
            this.addCommand(`💬 ${this.loc("relation.cmd_chat_cooldown", "Discuter (Attendre)")}`, "chat", false);
        }

        // Perspectives V2 / Extensions
        if (this._availableInteractions.includes("intimidate")) {
            this.addCommand(`⚡ ${this.loc("relation.cmd_intimidate", "Intimider")}`, "intimidate", true);
        }
        if (this._availableInteractions.includes("recruit")) {
            this.addCommand(`🤝 ${this.loc("relation.cmd_recruit", "Recruter")}`, "recruit", true);
        }

        this.addCommand(`❌ ${this.loc("relation.cmd_leave", "Quitter")}`, "cancel", true);
    }
}

window.Window_InteractionCommand = Window_InteractionCommand;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Window_InteractionCommand;
}
