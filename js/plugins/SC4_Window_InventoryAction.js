//=============================================================================
// RPG Maker MZ - SC4_Window_InventoryAction
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Fenêtre d'action contextuelle (Prendre / Déposer / Jeter).
 * @author SimCraft
 * 
 * @help SC4_Window_InventoryAction.js
 */

const _BaseWindowInvAct = typeof Window_Command !== "undefined" ? Window_Command : (typeof Window_Selectable !== "undefined" ? Window_Selectable : Object);

class Window_InventoryAction extends _BaseWindowInvAct {
    constructor(rect) {
        super(rect);
        this._mode = "target"; // "target" ou "party"
        this._canDeposit = true;
        this.openness = 0;
        this.deactivate();
    }

    setup(mode, canDeposit = true) {
        this._mode = mode;
        this._canDeposit = canDeposit;
        this.refresh();
        this.select(0);
        this.open();
        this.activate();
    }

    makeCommandList() {
        const getTxt = (key, fallback) => {
            return (typeof LocalisationManager !== "undefined" && typeof LocalisationManager.getText === "function")
                ? LocalisationManager.getText(key, fallback)
                : fallback;
        };

        if (this._mode === "target") {
            this.addCommand(getTxt("inventory.take_one", "Prendre 1"), "take_one", true);
            this.addCommand(getTxt("inventory.take_all", "Prendre Tout"), "take_all", true);
            this.addCommand(getTxt("inventory.cancel", "Annuler"), "cancel", true);
        } else {
            this.addCommand(getTxt("inventory.deposit_one", "Déposer 1"), "deposit_one", this._canDeposit);
            this.addCommand(getTxt("inventory.deposit_all", "Déposer Tout"), "deposit_all", this._canDeposit);
            this.addCommand(getTxt("inventory.drop_one", "Jeter 1"), "drop_one", true);
            this.addCommand(getTxt("inventory.drop_all", "Jeter Tout"), "drop_all", true);
            this.addCommand(getTxt("inventory.cancel", "Annuler"), "cancel", true);
        }
    }
}

// ============================================================================
// 4. Scène principale Scene_Inventory
// ============================================================================

window.Window_InventoryAction = Window_InventoryAction;
if (typeof global !== "undefined") {
    global.Window_InventoryAction = Window_InventoryAction;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Window_InventoryAction };
}
