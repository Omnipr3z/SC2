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

class Window_InventoryList extends Window_Selectable {
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
        this._excludeInventory = null;
        this._category = "all";
        this.refresh();
    }

    setCategory(cat) {
        const targetCat = cat || "all";
        if (this._category !== targetCat) {
            this._category = targetCat;
            this.refresh();
            this.select(0);
        }
    }

    category() {
        return this._category || "all";
    }

    setTargetInventory(inv) {
        this._targetInventory = inv;
        this.refresh();
    }

    setExcludeInventory(inv) {
        if (this._excludeInventory !== inv) {
            this._excludeInventory = inv || null;
            this.refresh();
        }
    }

    leaderInventory(explicitExclude = null) {
        if (typeof $gameParty === "undefined" || !$gameParty || typeof $gameParty.leader !== "function") {
            return null;
        }
        const leader = $gameParty.leader();
        if (!leader) return null;
        let container = null;
        if (leader.inventory && typeof leader.inventory.container === "function") {
            container = leader.inventory.container();
        } else if (typeof leader.actorId === "function" && typeof $inventories !== "undefined" && $inventories && typeof $inventories.inventory === "function") {
            container = $inventories.inventory("A_" + leader.actorId());
        }
        if (!container || typeof container.items !== "function" || typeof container.numItems !== "function") {
            return null;
        }
        const excluded = explicitExclude || this._excludeInventory || this._targetInventory;
        if (excluded && container === excluded) {
            return null;
        }
        return container;
    }

    itemIdentityKey(item) {
        if (!item || typeof item !== "object") return null;
        if (typeof DataManager !== "undefined") {
            if (typeof DataManager.isItem === "function" && DataManager.isItem(item)) return "i_" + item.id;
            if (typeof DataManager.isWeapon === "function" && DataManager.isWeapon(item)) return "w_" + item.id;
            if (typeof DataManager.isArmor === "function" && DataManager.isArmor(item)) return "a_" + item.id;
        }
        if (item.wtypeId !== undefined) return "w_" + item.id;
        if (item.etypeId !== undefined || item.atypeId !== undefined) return "a_" + item.id;
        return "i_" + (item.id !== undefined ? item.id : item.name);
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
        if (!this._headerWindow) {
            // Repli : Réserve la ligne du bas pour afficher le poids si aucun header externe
            return Math.max(1, Math.floor((this.innerHeight - this.lineHeight()) / this.itemHeight()));
        }
        return Math.max(1, Math.floor(this.innerHeight / this.itemHeight()));
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
        let list = [];
        if (this._isParty) {
            const seenKeys = new Set();
            if (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.allItems === "function") {
                // Objets du sac commun (exclut naturellement les équipements portés qui sont dans actor._equips)
                for (const item of $gameParty.allItems()) {
                    if (item && $gameParty.numItems(item) > 0) {
                        const key = this.itemIdentityKey(item);
                        if (key && !seenKeys.has(key)) {
                            seenKeys.add(key);
                        }
                        list.push(item);
                    }
                }
            }
            // Agrégation avec l'inventaire personnel du leader uniquement (A_<leaderId>)
            const lInv = this.leaderInventory();
            if (lInv) {
                for (const item of lInv.items()) {
                    if (item && lInv.numItems(item) > 0) {
                        const key = this.itemIdentityKey(item);
                        if (!key || !seenKeys.has(key)) {
                            if (key) seenKeys.add(key);
                            list.push(item);
                        }
                    }
                }
            }
        } else if (this._targetInventory) {
            list = this._targetInventory.items();
        }

        // Filtrage dynamique selon la catégorie active
        if (this._category && this._category !== "all") {
            list = list.filter(item => {
                const info = (typeof DataManager !== "undefined" && typeof DataManager.itemScTypeInfo === "function")
                    ? DataManager.itemScTypeInfo(item)
                    : { key: "misc" };
                return info.key === this._category;
            });
        }

        this._data = list;
    }

    // ========================================================================
    // 1. DONNÉES & GETTERS MÉTIER
    // ========================================================================

    get currentWeight() {
        if (this._isParty) {
            const baseW = (typeof $gameParty !== "undefined" && typeof $gameParty.totalWeight === "function") ? $gameParty.totalWeight() : 0;
            const lInv = this.leaderInventory();
            const extraW = (lInv && typeof lInv.totalWeight === "function") ? lInv.totalWeight() : 0;
            return Math.round((baseW + extraW) * 100) / 100;
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
            const partyQty = (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.numItems === "function")
                ? $gameParty.numItems(item)
                : 0;
            const lInv = this.leaderInventory();
            const leaderQty = lInv ? lInv.numItems(item) : 0;
            return partyQty + leaderQty;
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

    setHeaderWindow(headerWindow) {
        this._headerWindow = headerWindow;
        this.refresh();
    }

    refresh() {
        this.makeItemList();
        if (this.contents) {
            this.contents.clear();
        }
        if (this.contentsBack) {
            this.contentsBack.clear();
        }
        if (this.maxItems() > 0) {
            if (this.index() >= this.maxItems() || this.index() < 0) {
                this.select(0);
            }
        } else {
            this.select(-1);
        }
        super.refresh();
        if (this._headerWindow) {
            this._headerWindow.refresh();
        } else {
            this.drawWeightStatus();
        }
    }

    drawAllItems() {
        super.drawAllItems();
    }

    drawItemBackground(index) {
        if (index >= 0 && index < this.maxItems()) {
            super.drawItemBackground(index);
        }
    }

    updateHelp() {
        if (!this._helpWindow) return;
        const item = this.item();
        if (!item) {
            this._helpWindow.clear();
            return;
        }

        const info = (typeof DataManager !== "undefined" && typeof DataManager.itemScTypeInfo === "function")
            ? DataManager.itemScTypeInfo(item)
            : { key: "misc", label: "Divers" };
        const weight = (typeof DataManager !== "undefined" && typeof DataManager.itemWeight === "function")
            ? DataManager.itemWeight(item)
            : 1;

        // Détection de surcharge prédictive si l'objet est dans le conteneur
        let weightNotice = `\\c[4]${weight} UM\\c[0]`;
        const bonus = (typeof DataManager !== "undefined" && typeof DataManager.itemWeightBonus === "function") ? DataManager.itemWeightBonus(item) : 0;
        const worn = (typeof DataManager !== "undefined" && typeof DataManager.itemWornWeight === "function") ? DataManager.itemWornWeight(item) : 0;
        if (bonus > 0) {
            weightNotice += ` \\c[3](+${bonus} UM Capacité)\\c[0]`;
        } else if (worn > 0) {
            weightNotice += ` \\c[6](${worn} UM porté)\\c[0]`;
        }

        if (!this._isParty && typeof $gameParty !== "undefined" && $gameParty) {
            const baseW = (typeof $gameParty.totalWeight === "function") ? $gameParty.totalWeight() : 0;
            const lInv = this.leaderInventory(this._targetInventory);
            const extraW = (lInv && typeof lInv.totalWeight === "function") ? lInv.totalWeight() : 0;
            const curW = Math.round((baseW + extraW) * 100) / 100;
            const maxW = (typeof $gameParty.maxWeight === "function") ? $gameParty.maxWeight() : 48;
            if (curW + weight > maxW) {
                weightNotice = `\\c[2]⚠️ +${weight} UM (SURCHARGE !)\\c[0]`;
            }
        }

        const typeColor = (info.key === "misc") ? "\\c[7]" : "\\c[14]";
        const line1 = `${typeColor}[ TYPE : ${info.label.toUpperCase()} ]\\c[0]  |  Charge : ${weightNotice}`;
        const line2 = item.description || "";
        this._helpWindow.setText(line1 + "\n" + line2);
    }
}

// ============================================================================
// 3. Fenêtre de commande d'actions contextuelles (Transférer / Jeter / Annuler)
// ============================================================================

window.Window_InventoryList = Window_InventoryList;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Window_InventoryList;
}
