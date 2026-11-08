//=============================================================================
// RPG Maker MZ - SC4_Window_ItemAction
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Menu contextuel d'action sur un objet (Utiliser / Jeter 1 / Jeter Tout).
 * @author SimCraft
 * 
 * @help SC4_Window_ItemAction.js
 */

class Window_ItemAction extends Window_Command {
    constructor(rect) {
        super(rect);
        this.openness = 0;
        this.deactivate();
        this._item = null;
    }

    setup(item) {
        this._item = item;
        this.refresh();
        this.select(0);
        this.open();
        this.activate();
    }

    makeCommandList() {
        const item = this._item;
        const getTxt = (key, fallback) => LocalisationManager.getText(key, fallback);
        if (item && $gameParty.canUse(item)) {
            this.addCommand(getTxt("inventory.use", "Utiliser"), "use", true);
        }
        this.addCommand(getTxt("inventory.drop_one", "Jeter 1"), "drop_one", true);
        this.addCommand(getTxt("inventory.drop_all", "Jeter Tout"), "drop_all", true);
        this.addCommand(getTxt("inventory.cancel", "Annuler"), "cancel", true);
    }
}

window.Window_ItemAction = Window_ItemAction;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Window_ItemAction;
}

