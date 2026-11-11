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

class Window_InventoryAction extends Window_Command {
    constructor(rect) {
        super(rect);
        this._mode = "target"; // "target" ou "party"
        this._canDeposit = true;
        this._canEquip = false;
        this._canConsume = false;
        this._overloadOne = false;
        this._overloadAll = false;
        this._canAcceptOne = true;
        this._canAcceptAll = true;
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

    get canEquip() {
        return this._canEquip;
    }

    get canConsume() {
        return this._canConsume;
    }

    get isOverloadOne() {
        return this._overloadOne;
    }

    get isOverloadAll() {
        return this._overloadAll;
    }

    get canAcceptOne() {
        return this._canAcceptOne;
    }

    get canAcceptAll() {
        return this._canAcceptAll;
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

    setup(mode, canDeposit = true, canEquip = false, overloadOne = false, overloadAll = false, canAcceptOne = true, canAcceptAll = true, canConsume = false) {
        this._mode = mode;
        this._canDeposit = canDeposit;
        this._canEquip = canEquip;
        this._overloadOne = Boolean(overloadOne);
        this._overloadAll = Boolean(overloadAll);
        this._canAcceptOne = Boolean(canAcceptOne);
        this._canAcceptAll = Boolean(canAcceptAll);
        this._canConsume = Boolean(canConsume);
        this.refresh();
        const numItems = this.maxItems();
        this.height = this.fittingHeight(numItems);
        this.select(0);
        this.open();
        this.activate();
    }

    reposition(x, y) {
        this.x = x;
        this.y = y;
        if (typeof Graphics !== "undefined") {
            const maxX = Graphics.boxWidth - this.width - 8;
            const maxY = Graphics.boxHeight - this.height - 8;
            this.x = Math.max(8, Math.min(maxX, this.x));
            this.y = Math.max(8, Math.min(maxY, this.y));
        }
    }

    makeCommandList() {
        if (this._mode === "target") {
            const txtOne = this._overloadOne
                ? this.loc("inventory.take_one", "Prendre 1") + " ⚠️"
                : this.loc("inventory.take_one", "Prendre 1");
            const txtAll = this._overloadAll
                ? this.loc("inventory.take_all", "Prendre Tout") + " ⚠️"
                : this.loc("inventory.take_all", "Prendre Tout");

            this.addCommand(txtOne, "take_one", true);
            this.addCommand(txtAll, "take_all", true);
            if (this._canEquip) {
                this.addCommand(this.loc("inventory.equip", "Équiper"), "equip", true);
            }
            if (this._canConsume) {
                this.addCommand(this.loc("inventory.consume", "Consommer"), "consume", true);
            }
            this.addCommand(this.loc("inventory.cancel", "Annuler"), "cancel", true);
        } else {
            if (this._canEquip) {
                this.addCommand(this.loc("inventory.equip", "Équiper"), "equip", true);
            }
            if (this._canConsume) {
                this.addCommand(this.loc("inventory.consume", "Consommer"), "consume", true);
            }
            const txtDepOne = !this._canAcceptOne
                ? this.loc("inventory.deposit_one", "Déposer 1") + " (Plein !)"
                : this.loc("inventory.deposit_one", "Déposer 1");
            const txtDepAll = !this._canAcceptAll
                ? this.loc("inventory.deposit_all", "Déposer Tout") + " (Plein !)"
                : this.loc("inventory.deposit_all", "Déposer Tout");

            this.addCommand(txtDepOne, "deposit_one", this._canDeposit && this._canAcceptOne);
            this.addCommand(txtDepAll, "deposit_all", this._canDeposit && this._canAcceptAll);
            this.addCommand(this.loc("inventory.drop_one", "Jeter 1"), "drop_one", true);
            this.addCommand(this.loc("inventory.drop_all", "Jeter Tout"), "drop_all", true);
            this.addCommand(this.loc("inventory.cancel", "Annuler"), "cancel", true);
        }
    }

    drawItem(index) {
        const rect = this.itemLineRect(index);
        const align = this.itemTextAlign();
        const symbol = this.commandSymbol(index);
        this.resetTextColor();
        if ((symbol === "take_one" && this._overloadOne) || (symbol === "take_all" && this._overloadAll)) {
            this.changeTextColor("#ef4444"); // Alerte rouge
        } else if ((symbol === "deposit_one" && !this._canAcceptOne) || (symbol === "deposit_all" && !this._canAcceptAll)) {
            this.changeTextColor("#ef4444"); // Alerte rouge meuble plein
        }
        this.changePaintOpacity(this.isCommandEnabled(index));
        this.drawText(this.commandName(index), rect.x, rect.y, rect.width, align);
    }
}

window.Window_InventoryAction = Window_InventoryAction;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Window_InventoryAction;
}
