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

class Window_InventoryCommand extends Window_HorzCommand {
    constructor(rect) {
        super(rect);
        this._targetInventory = null;
        this._isPersistent = true;
        this._filterIndex = 0;
    }

    // ========================================================================
    // 1. DONNÉES & GETTERS MÉTIER
    // ========================================================================

    static filterDefinitions() {
        return [
            { key: "all", label: "Tout" },
            { key: "consumable", label: "Consommables" },
            { key: "medical", label: "Biomédical" },
            { key: "material", label: "Ingrédients" },
            { key: "equipment", label: "Équipements" },
            { key: "weapon_ammo", label: "Armes & Munitions" },
            { key: "tool", label: "Outils" },
            { key: "datapad", label: "Datapad" },
            { key: "quest", label: "Objets Clés" },
            { key: "misc", label: "Divers" }
        ];
    }

    leaderInventory() {
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
        if (!container || typeof container.items !== "function") {
            return null;
        }
        if (this._targetInventory && container === this._targetInventory) {
            return null;
        }
        return container;
    }

    hasItemsOfCategory(catKey) {
        if (!catKey || catKey === "all") return true;

        if (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.allItems === "function") {
            const partyHas = $gameParty.allItems().some(item => {
                if (!item) return false;
                if (typeof $gameParty.numItems === "function" && $gameParty.numItems(item) <= 0) return false;
                const info = (typeof DataManager !== "undefined" && typeof DataManager.itemScTypeInfo === "function")
                    ? DataManager.itemScTypeInfo(item)
                    : { key: "misc" };
                return info.key === catKey;
            });
            if (partyHas) return true;
        }

        const lInv = this.leaderInventory();
        if (lInv) {
            const leaderHas = lInv.items().some(item => {
                if (!item) return false;
                if (typeof lInv.numItems === "function" && lInv.numItems(item) <= 0) return false;
                const info = (typeof DataManager !== "undefined" && typeof DataManager.itemScTypeInfo === "function")
                    ? DataManager.itemScTypeInfo(item)
                    : { key: "misc" };
                return info.key === catKey;
            });
            if (leaderHas) return true;
        }

        if (this._targetInventory && typeof this._targetInventory.items === "function") {
            const targetHas = this._targetInventory.items().some(item => {
                if (!item) return false;
                const info = (typeof DataManager !== "undefined" && typeof DataManager.itemScTypeInfo === "function")
                    ? DataManager.itemScTypeInfo(item)
                    : { key: "misc" };
                return info.key === catKey;
            });
            if (targetHas) return true;
        }

        return false;
    }

    availableFilters() {
        const all = Window_InventoryCommand.filterDefinitions();
        return all.filter(f => {
            if (f.key === "all") return true;
            if (this._targetInventory && typeof this._targetInventory.isCategoryAllowed === "function") {
                if (!this._targetInventory.isCategoryAllowed(f.key)) return false;
            }
            return this.hasItemsOfCategory(f.key);
        });
    }

    currentFilter() {
        const list = this.availableFilters();
        if (this._filterIndex >= list.length) {
            this._filterIndex = 0;
        }
        return list[this._filterIndex] || { key: "all", label: "Tout" };
    }

    cycleFilter() {
        const list = this.availableFilters();
        if (list.length > 0) {
            this._filterIndex = (this._filterIndex + 1) % list.length;
            this.refresh();
        }
        return this.currentFilter();
    }

    setFilterCategory(key) {
        const list = this.availableFilters();
        const idx = list.findIndex(f => f.key === key);
        if (idx >= 0) {
            this._filterIndex = idx;
            this.refresh();
        }
    }

    get hasTargetItems() {
        return this._targetInventory ? !this._targetInventory.isEmpty() : false;
    }

    get canDump() {
        if (!this.hasTargetItems) return false;
        if (typeof $gameParty === "undefined" || !$gameParty) return true;
        if (typeof $gameParty.maxWeight !== "function" || typeof $gameParty.totalWeight !== "function") return true;
        const targetW = (this._targetInventory && typeof this._targetInventory.totalWeight === "function")
            ? this._targetInventory.totalWeight()
            : 0;
        const lInv = this.leaderInventory();
        const extraW = (lInv && typeof lInv.totalWeight === "function") ? lInv.totalWeight() : 0;
        return ($gameParty.totalWeight() + extraW + targetW) <= $gameParty.maxWeight();
    }

    get isTargetFull() {
        return Boolean(this._targetInventory && typeof this._targetInventory.isFull === "function" && this._targetInventory.isFull());
    }

    get canDeposit() {
        if (!this._isPersistent) return false;
        if (this.isTargetFull) return false;
        return this.hasPartyItems;
    }

    get hasPartyItems() {
        const hasCommon = (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.allItems === "function")
            ? $gameParty.allItems().length > 0
            : false;
        if (hasCommon) return true;
        const lInv = this.leaderInventory();
        return Boolean(lInv && (typeof lInv.isEmpty === "function" ? !lInv.isEmpty() : lInv.items().length > 0));
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
        return 5;
    }

    setTargetContext(targetInventory, isPersistent) {
        this._targetInventory = targetInventory;
        this._isPersistent = Boolean(isPersistent);
        this.refresh();
    }

    makeCommandList() {
        const txtTake = this.loc("inventory.take", "Prendre");
        const isDumpOverload = this.hasTargetItems && !this.canDump;
        const txtDump = isDumpOverload
            ? this.loc("inventory.dump", "Tout vider") + " ⚠️"
            : this.loc("inventory.dump", "Tout vider");
        const isFull = this.isTargetFull;
        const txtDeposit = isFull
            ? this.loc("inventory.deposit_full", "Déposer (Plein !)")
            : this.loc("inventory.deposit", "Déposer");
        const curFilter = this.currentFilter();
        const txtFilter = `Tri : ${curFilter.label}`;
        const txtClose = this.loc("inventory.close", "Fermer");

        this.addCommand(txtTake, "take", this.hasTargetItems);
        this.addCommand(txtDump, "dump", this.hasTargetItems && this.canDump);
        this.addCommand(txtDeposit, "deposit", this.canDeposit);
        this.addCommand(txtFilter, "filter", true);
        this.addCommand(txtClose, "close", true);
    }

    drawItem(index) {
        const rect = this.itemLineRect(index);
        const align = this.itemTextAlign();
        const symbol = this.commandSymbol(index);
        this.resetTextColor();
        if (symbol === "dump" && this.hasTargetItems && !this.canDump) {
            this.changeTextColor("#ef4444"); // Alerte rouge surcharge
        } else if (symbol === "deposit" && this.isTargetFull) {
            this.changeTextColor("#ef4444"); // Alerte rouge meuble plein
        } else if (symbol === "filter") {
            this.changeTextColor("#00e5ff"); // Cyan néon pour le tri
        }
        this.changePaintOpacity(this.isCommandEnabled(index));
        this.drawText(this.commandName(index), rect.x, rect.y, rect.width, align);
    }
}

window.Window_InventoryCommand = Window_InventoryCommand;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Window_InventoryCommand;
}
