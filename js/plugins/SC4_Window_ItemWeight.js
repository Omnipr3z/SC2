//=============================================================================
// RPG Maker MZ - SC4_Window_ItemWeight
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Fenêtre d'affichage de la jauge de charge d'inventaire (Scene_Item).
 * @author SimCraft
 * 
 * @help SC4_Window_ItemWeight.js
 */

class Window_ItemWeight extends Window_Base {
    constructor(rect) {
        super(rect);
        this.refresh();
    }

    refresh() {
        this.contents.clear();
        const curWeight = $gameParty.totalWeight();
        const maxWeight = $gameParty.maxWeight();
        const isOverloaded = curWeight > maxWeight;
        const label = LocalisationManager.getText("inventory.weight", "Poids");
        const maxStr = (maxWeight === Infinity || isNaN(maxWeight)) ? "∞" : maxWeight;
        const text = `${label}: ${curWeight}/${maxStr} UM`;
        if (isOverloaded) {
            this.changeTextColor("#ff4d4d");
        } else {
            this.changeTextColor(ColorManager.systemColor());
        }
        this.drawText(text, 0, 0, this.innerWidth, "center");
        this.resetTextColor();
    }
}

window.Window_ItemWeight = Window_ItemWeight;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Window_ItemWeight;
}

