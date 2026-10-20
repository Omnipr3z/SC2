//=============================================================================
// RPG Maker MZ - SC4_Window_InventoryCommand
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Fenêtre de commande supérieure de transfert d'inventaire.
 * @author SimCraft
 * 
 * @help SC4_Window_InventoryCommand.js
 */

const _BaseWindowInvCmd = typeof Window_HorzCommand !== "undefined" ? Window_HorzCommand : (typeof Window_Command !== "undefined" ? Window_Command : (typeof Window_Base !== "undefined" ? Window_Base : Object));

class Window_InventoryCommand extends _BaseWindowInvCmd {
    constructor(rect) {
        super(rect);
        this._targetInventory = null;
        this._isPersistent = true;
    }

    // ========================================================================
    // 1. DONNÉES & GETTERS MÉTIER
    // ========================================================================

    get hasTargetItems() {
        return this._targetInventory ? !this._targetInventory.isEmpty() : false;
    }

    get canDeposit() {
        return Boolean(this._isPersistent);
    }

    get hasPartyItems() {
        return (typeof $gameParty !== "undefined" && $gameParty) ? $gameParty.allItems().length > 0 : false;
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

    maxCols() {
        return 3;
    }

    setTargetContext(targetInventory, isPersistent) {
        this._targetInventory = targetInventory;
        this._isPersistent = Boolean(isPersistent);
        this.refresh();
    }

    makeCommandList() {
        const txtTake = this.loc("inventory.take", "Prendre");
        const txtDeposit = this.loc("inventory.deposit", "Déposer");
        const txtClose = this.loc("inventory.close", "Fermer");

        this.addCommand(txtTake, "take", this.hasTargetItems);
        this.addCommand(txtDeposit, "deposit", this.canDeposit && this.hasPartyItems);
        this.addCommand(txtClose, "close", true);
    }
}

window.Window_InventoryCommand = Window_InventoryCommand;
if (typeof global !== "undefined") {
    global.Window_InventoryCommand = Window_InventoryCommand;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Window_InventoryCommand };
}
