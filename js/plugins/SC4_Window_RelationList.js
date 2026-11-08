//=============================================================================
// SimCraft 4 - Window_RelationList
// SC4_Window_RelationList.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Liste sélectionnable des contacts et relations enregistrées (Window_RelationList).
 * @author SimCraft
 * @help SC4_Window_RelationList.js
 */

class Window_RelationList extends Window_Selectable {
    constructor(rect) {
        super(rect);
        this._data = [];
        this.refresh();
        this.select(0);
        this.activate();
    }

    maxItems() {
        return this._data ? this._data.length : 0;
    }

    item() {
        return this._data && this.index() >= 0 ? this._data[this.index()] : null;
    }

    refresh() {
        this._data = [];
        if (typeof $gameRelations !== "undefined" && $gameRelations) {
            this._data = $gameRelations.all();
        }
        if (typeof super.refresh === "function") {
            super.refresh();
        }
    }

    drawItem(index) {
        const item = this._data[index];
        if (!item) return;

        const rect = this.itemRect(index);
        const actorId = item.actorId2;
        let actorName = `Contact #${actorId}`;

        if (typeof $gameActors !== "undefined" && $gameActors) {
            const actor = $gameActors.actor(actorId);
            if (actor) actorName = actor.name();
        }

        const aff = item.affinity;
        const color = aff >= 0 ? "#44ff88" : "#ff4444";

        this.changeTextColor(ColorManager.normalColor ? ColorManager.normalColor() : "#ffffff");
        this.drawText(actorName, rect.x + 8, rect.y, rect.width - 120, "left");

        this.changeTextColor(color);
        this.drawText(`${aff > 0 ? "+" : ""}${aff}`, rect.x + rect.width - 110, rect.y, 100, "right");
    }
}

window.Window_RelationList = Window_RelationList;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Window_RelationList;
}
