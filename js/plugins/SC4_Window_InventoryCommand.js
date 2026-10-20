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

    maxCols() {
        return 3;
    }

    setTargetContext(targetInventory, isPersistent) {
        this._targetInventory = targetInventory;
        this._isPersistent = Boolean(isPersistent);
        this.refresh();
    }

    makeCommandList() {
        const hasTargetItems = this._targetInventory ? !this._targetInventory.isEmpty() : false;
        const canDeposit = Boolean(this._isPersistent);
        const hasPartyItems = (typeof $gameParty !== "undefined" && $gameParty) ? $gameParty.allItems().length > 0 : false;

        const txtTake = (typeof LocalisationManager !== "undefined" && typeof LocalisationManager.getText === "function")
            ? LocalisationManager.getText("inventory.take", "Prendre")
            : "Prendre";
        const txtDeposit = (typeof LocalisationManager !== "undefined" && typeof LocalisationManager.getText === "function")
            ? LocalisationManager.getText("inventory.deposit", "Déposer")
            : "Déposer";
        const txtClose = (typeof LocalisationManager !== "undefined" && typeof LocalisationManager.getText === "function")
            ? LocalisationManager.getText("inventory.close", "Fermer")
            : "Fermer";

        this.addCommand(txtTake, "take", hasTargetItems);
        this.addCommand(txtDeposit, "deposit", canDeposit && hasPartyItems);
        this.addCommand(txtClose, "close", true);
    }
}

// ============================================================================
// 2. Fenêtre de liste d'inventaire avec barre de poids intégrée
// ============================================================================

window.Window_InventoryCommand = Window_InventoryCommand;
if (typeof global !== "undefined") {
    global.Window_InventoryCommand = Window_InventoryCommand;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Window_InventoryCommand };
}
