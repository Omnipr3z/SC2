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

    // ========================================================================
    // 1. DONNÉES & GETTERS MÉTIER
    // ========================================================================

    get mode() {
        return this._mode;
    }

    get canDeposit() {
        return this._canDeposit;
    }

    loc(key, def) {
        if (typeof SC4_Localization !== "undefined") {
            return SC4_Localization.getText(key, def);
        }
        if (typeof LocalisationManager !== "undefined" && typeof LocalisationManager.getText === "function") {
            return LocalisationManager.getText(key, def);
        }
        return def;
    }

    // ========================================================================
    // 2. CONFIGURATION & COMMANDES
    // ========================================================================

    setup(mode, canDeposit = true) {
        this._mode = mode;
        this._canDeposit = canDeposit;
        this.refresh();
        this.select(0);
        this.open();
        this.activate();
    }

    makeCommandList() {
        if (this._mode === "target") {
            this.addCommand(this.loc("inventory.take_one", "Prendre 1"), "take_one", true);
            this.addCommand(this.loc("inventory.take_all", "Prendre Tout"), "take_all", true);
            this.addCommand(this.loc("inventory.cancel", "Annuler"), "cancel", true);
        } else {
            this.addCommand(this.loc("inventory.deposit_one", "Déposer 1"), "deposit_one", this._canDeposit);
            this.addCommand(this.loc("inventory.deposit_all", "Déposer Tout"), "deposit_all", this._canDeposit);
            this.addCommand(this.loc("inventory.drop_one", "Jeter 1"), "drop_one", true);
            this.addCommand(this.loc("inventory.drop_all", "Jeter Tout"), "drop_all", true);
            this.addCommand(this.loc("inventory.cancel", "Annuler"), "cancel", true);
        }
    }
}

window.Window_InventoryAction = Window_InventoryAction;
if (typeof global !== "undefined") {
    global.Window_InventoryAction = Window_InventoryAction;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Window_InventoryAction };
}
