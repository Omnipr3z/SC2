//=============================================================================
// RPG Maker MZ - SC4_Window_InventoryList
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Liste d'inventaire avec barre de jauge de poids intégrée.
 * @author SimCraft
 * 
 * @help SC4_Window_InventoryList.js
 */

const _BaseWindowInvList = typeof Window_Selectable !== "undefined" ? Window_Selectable : (typeof Window_Base !== "undefined" ? Window_Base : Object);

class Window_InventoryList extends _BaseWindowInvList {
    /**
     * @param {Rectangle} rect 
     * @param {string} title 
     * @param {boolean} isParty 
     */
    constructor(rect, title, isParty = false) {
        super(rect);
        this._title = title;
        this._isParty = isParty;
        this._data = [];
        this._targetInventory = null;
        this.refresh();
    }

    setTargetInventory(inv) {
        this._targetInventory = inv;
        this.refresh();
    }

    setTitle(title) {
        this._title = title;
        this.refresh();
    }

    maxCols() {
        return 1;
    }

    maxItems() {
        return this._data ? this._data.length : 0;
    }

    maxPageRows() {
        // Réserve la ligne du bas pour afficher le poids
        return Math.max(1, Math.floor((this.innerHeight - this.lineHeight()) / this.itemHeight()));
    }

    item() {
        return this.itemAt(this.index());
    }

    itemAt(index) {
        return this._data && index >= 0 ? this._data[index] : null;
    }

    isCurrentItemEnabled() {
        return this.item() !== null;
    }

    makeItemList() {
        if (this._isParty) {
            if (typeof $gameParty !== "undefined" && $gameParty) {
                // Objets du sac (exclut naturellement les équipements portés qui sont dans actor._equips)
                this._data = $gameParty.allItems().filter(item => item && $gameParty.numItems(item) > 0);
            } else {
                this._data = [];
            }
        } else if (this._targetInventory) {
            this._data = this._targetInventory.items();
        } else {
            this._data = [];
        }
    }

    drawAllItems() {
        this.makeItemList();
        super.drawAllItems();
        this.drawWeightStatus();
    }

    itemQuantity(item) {
        if (!item) return 0;
        if (this._isParty) {
            return $gameParty.numItems(item);
        } else if (this._targetInventory) {
            return this._targetInventory.numItems(item);
        }
        return 0;
    }

    drawItem(index) {
        const item = this.itemAt(index);
        if (item) {
            const rect = this.itemLineRect(index);
            this.changePaintOpacity(this.isCurrentItemEnabled());
            this.drawItemName(item, rect.x, rect.y, rect.width - 80);
            const qty = this.itemQuantity(item);
            this.drawText("x" + qty, rect.x, rect.y, rect.width, "right");
            this.changePaintOpacity(1);
        }
    }

    drawWeightStatus() {
        const y = this.innerHeight - this.lineHeight();
        const x = 4;
        const w = this.innerWidth - 8;

        const curWeight = this._isParty
            ? ((typeof $gameParty !== "undefined" && typeof $gameParty.totalWeight === "function") ? $gameParty.totalWeight() : 0)
            : (this._targetInventory ? this._targetInventory.totalWeight() : 0);

        const maxWeight = this._isParty
            ? ((typeof $gameParty !== "undefined" && typeof $gameParty.maxWeight === "function") ? $gameParty.maxWeight() : Infinity)
            : (this._targetInventory ? this._targetInventory.maxWeight() : Infinity);

        const isOverloaded = curWeight > maxWeight;

        const label = (typeof LocalisationManager !== "undefined" && typeof LocalisationManager.getText === "function")
            ? LocalisationManager.getText("inventory.weight", "Poids")
            : "Poids";
        const maxStr = (maxWeight === Infinity || isNaN(maxWeight)) ? "∞" : maxWeight;
        const text = `${label}: ${curWeight}/${maxStr}`;

        this.contents.fillRect(0, y - 2, this.innerWidth, this.lineHeight() + 4, ColorManager.dimColor1());
        this.changePaintOpacity(true);
        if (isOverloaded) {
            this.changeTextColor("#ff4d4d");
        } else {
            this.changeTextColor(ColorManager.systemColor());
        }
        this.drawText(this._title, x, y, Math.floor(w / 2), "left");
        this.drawText(text, x, y, w, "right");
        this.resetTextColor();
    }

    updateHelp() {
        if (this._helpWindow) {
            this._helpWindow.setItem(this.item());
        }
    }

    refresh() {
        this.contents.clear();
        this.drawAllItems();
    }
}

// ============================================================================
// 3. Fenêtre de commande d'actions contextuelles (Transférer / Jeter / Annuler)
// ============================================================================

window.Window_InventoryList = Window_InventoryList;
if (typeof global !== "undefined") {
    global.Window_InventoryList = Window_InventoryList;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Window_InventoryList };
}
