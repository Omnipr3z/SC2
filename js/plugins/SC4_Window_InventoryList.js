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

    // ========================================================================
    // 1. DONNÉES & GETTERS MÉTIER
    // ========================================================================

    get currentWeight() {
        if (this._isParty) {
            return (typeof $gameParty !== "undefined" && typeof $gameParty.totalWeight === "function") ? $gameParty.totalWeight() : 0;
        }
        return this._targetInventory ? this._targetInventory.totalWeight() : 0;
    }

    get maxWeight() {
        if (this._isParty) {
            return (typeof $gameParty !== "undefined" && typeof $gameParty.maxWeight === "function") ? $gameParty.maxWeight() : Infinity;
        }
        return this._targetInventory ? this._targetInventory.maxWeight() : Infinity;
    }

    get isOverloaded() {
        return this.currentWeight > this.maxWeight;
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
    // 2. RECTANGLES & GÉOMÉTRIE
    // ========================================================================

    itemNameRect(lineRect) {
        return new Rectangle(lineRect.x, lineRect.y, lineRect.width - 80, lineRect.height);
    }

    itemQtyRect(lineRect) {
        return new Rectangle(lineRect.x, lineRect.y, lineRect.width, lineRect.height);
    }

    weightBarRect() {
        const lh = typeof this.lineHeight === "function" ? this.lineHeight() : 36;
        const y = this.innerHeight - lh;
        const w = this.innerWidth - 8;
        return {
            backgroundRect: new Rectangle(0, y - 2, this.innerWidth, lh + 4),
            titleRect: new Rectangle(4, y, Math.floor(w / 2), lh),
            valueRect: new Rectangle(4, y, w, lh)
        };
    }

    // ========================================================================
    // 3. STYLES & TYPOGRAPHIE
    // ========================================================================

    styliseWeightStatus(isOverloaded) {
        if (isOverloaded) {
            this.changeTextColor("#ff4d4d");
        } else if (typeof ColorManager !== "undefined") {
            this.changeTextColor(ColorManager.systemColor());
        }
    }

    // ========================================================================
    // 4. DESSIN PAR BLOC
    // ========================================================================

    drawItemContent(lineRect, item) {
        const nameRect = this.itemNameRect(lineRect);
        const qtyRect = this.itemQtyRect(lineRect);
        const qty = this.itemQuantity(item);

        this.changePaintOpacity(this.isCurrentItemEnabled());
        this.drawItemName(item, nameRect.x, nameRect.y, nameRect.width);
        this.drawText("x" + qty, qtyRect.x, qtyRect.y, qtyRect.width, "right");
        this.changePaintOpacity(1);
    }

    drawWeightStatusBlock() {
        const rects = this.weightBarRect();
        const curWeight = this.currentWeight;
        const maxWeight = this.maxWeight;
        const isOverloaded = this.isOverloaded;

        const label = this.loc("inventory.weight", "Poids");
        const maxStr = (maxWeight === Infinity || isNaN(maxWeight)) ? "∞" : maxWeight;
        const text = `${label}: ${curWeight}/${maxStr}`;

        if (typeof ColorManager !== "undefined") {
            this.contents.fillRect(rects.backgroundRect.x, rects.backgroundRect.y, rects.backgroundRect.width, rects.backgroundRect.height, ColorManager.dimColor1());
        }
        this.changePaintOpacity(true);
        this.styliseWeightStatus(isOverloaded);
        this.drawText(this._title, rects.titleRect.x, rects.titleRect.y, rects.titleRect.width, "left");
        this.drawText(text, rects.valueRect.x, rects.valueRect.y, rects.valueRect.width, "right");
        this.resetTextColor();
    }

    // ========================================================================
    // 5. ORCHESTRATION & RAFRAÎCHISSEMENT
    // ========================================================================

    drawItem(index) {
        const item = this.itemAt(index);
        if (item) {
            const rect = this.itemLineRect(index);
            this.drawItemContent(rect, item);
        }
    }

    drawWeightStatus() {
        this.drawWeightStatusBlock();
    }

    drawAllItems() {
        this.makeItemList();
        super.drawAllItems();
        this.drawWeightStatus();
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
