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

    makeCommandList() {
        this._availableInteractions = this._availableInteractions || [];
        if (this._availableInteractions.includes("chat")) {
            this.addCommand("💬 Discuter", "chat", true);
        } else if (this._availableInteractions.includes("chat_saturated")) {
            this.addCommand("💬 Discuter (Saturé)", "chat", false);
        } else {
            this.addCommand("💬 Discuter (Cooldown)", "chat", false);
        }

        // Perspectives V2 / Extensions
        if (this._availableInteractions.includes("intimidate")) {
            this.addCommand("⚡ Intimider", "intimidate", true);
        }
        if (this._availableInteractions.includes("recruit")) {
            this.addCommand("🤝 Recruter", "recruit", true);
        }

        this.addCommand("❌ Quitter", "cancel", true);
    }
}

window.Window_InteractionCommand = Window_InteractionCommand;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Window_InteractionCommand;
}
