//=============================================================================
// RPG Maker MZ - SC4_Window_QuestList
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Liste des quêtes et contrats avec badges, marqueurs et délais.
 * @author SimCraft
 * 
 * @help SC4_Window_QuestList.js
 */

const _BaseWindowQuestList = typeof Window_Selectable !== "undefined" ? Window_Selectable : (typeof Window_Base !== "undefined" ? Window_Base : Object);

class Window_QuestList extends _BaseWindowQuestList {
    constructor(rect) {
        super(rect);
        this._filter = "active";
        this._data = [];
        this._detailWindow = null;
        this._onCycleFilter = null;
        this.refresh();
    }

    setDetailWindow(detailWindow) {
        this._detailWindow = detailWindow;
        this.updateDetail();
    }

    setFilter(filter) {
        if (this._filter !== filter) {
            this._filter = filter;
            this.refresh();
            this.select(0);
        }
    }

    maxItems() {
        return this._data ? this._data.length : 0;
    }

    item() {
        return this._data && this.index() >= 0 ? this._data[this.index()] : null;
    }

    itemHeight() {
        return 48;
    }

    makeItemList() {
        const qm = window.$gameQuests;
        const all = qm ? qm.quests() : [];
        if (this._filter === "active") {
            this._data = all.filter(q => q && q.active);
        } else if (this._filter === "recurring") {
            this._data = all.filter(q => q && q.recurring);
        } else if (this._filter === "completed") {
            this._data = all.filter(q => q && q.completed);
        } else {
            this._data = [...all];
        }
    }

    // ========================================================================
    // 1. DONNÉES & GETTERS MÉTIER
    // ========================================================================

    getQuestVisuals(quest) {
        if (quest.failed) {
            return { color: "#fb4934", marker: "✖" };
        } else if (quest.completed) {
            return { color: "#8ec07c", marker: "✔" };
        } else if (quest.recurring) {
            return { color: "#b8bb26", marker: "🔄" };
        } else if (quest.category === "secondary" || quest.category === "side") {
            return { color: "#83a598", marker: "📜" };
        } else if (quest.category === "bounty") {
            return { color: "#fe8019", marker: "🎯" };
        }
        return { color: "#fabd2f", marker: "👑" };
    }

    getQuestTitleText(quest) {
        let titleTxt = quest.name;
        if (quest.recurring && quest.completedCount > 0) {
            titleTxt += ` (x${quest.completedCount})`;
        }
        return titleTxt;
    }

    loc(key, def) {
        return typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(key, def) : def;
    }

    // ========================================================================
    // 2. RECTANGLES & GÉOMÉTRIE
    // ========================================================================

    itemPinRect(lineRect) {
        return new Rectangle(lineRect.x, lineRect.y + 4, 18, 24);
    }

    itemMarkerRect(lineRect) {
        return new Rectangle(lineRect.x + 20, lineRect.y + 4, 20, 24);
    }

    itemTitleRect(lineRect) {
        const titleW = lineRect.width - 150;
        return new Rectangle(lineRect.x + 44, lineRect.y + 4, titleW, 24);
    }

    itemDeadlineRect(lineRect) {
        return new Rectangle(lineRect.x + lineRect.width - 100, lineRect.y + 4, 95, 24);
    }

    itemObjectiveRect(lineRect) {
        return new Rectangle(lineRect.x + lineRect.width - 70, lineRect.y + 4, 65, 24);
    }

    // ========================================================================
    // 3. STYLES & TYPOGRAPHIE
    // ========================================================================

    resetItemFontSettings() {
        this.contents.fontFace = $gameSystem ? $gameSystem.mainFontFace() : "sans-serif";
        this.contents.outlineColor = "#000000";
        this.contents.outlineWidth = 3;
    }

    stylisePin(isTracking) {
        this.contents.fontSize = 13;
        this.contents.textColor = isTracking ? "#8ec07c" : "#7c6f64";
    }

    styliseMarker(color) {
        this.contents.fontSize = 14;
        this.contents.textColor = color;
    }

    styliseTitle(color, isCompleted) {
        this.contents.fontSize = 14;
        this.contents.textColor = isCompleted ? "#a89984" : color;
    }

    styliseDeadline(remainingMin) {
        this.contents.fontSize = 11;
        this.contents.textColor = remainingMin <= 60 ? "#fb4934" : (remainingMin <= 360 ? "#fe8019" : "#b8bb26");
    }

    styliseObjective(isCompleted) {
        this.contents.fontSize = 11;
        this.contents.textColor = isCompleted ? "#8ec07c" : "#83a598";
    }

    // ========================================================================
    // 4. DESSIN PAR BLOC
    // ========================================================================

    drawPinBlock(lineRect, quest) {
        const rect = this.itemPinRect(lineRect);
        const pin = quest.isTracking ? "📌" : "◌";
        this.stylisePin(quest.isTracking);
        this.drawText(pin, rect.x, rect.y, rect.width, "center");
    }

    drawMarkerBlock(lineRect, quest, marker, color) {
        const rect = this.itemMarkerRect(lineRect);
        this.styliseMarker(color);
        this.drawText(marker, rect.x, rect.y, rect.width, "center");
    }

    drawTitleBlock(lineRect, quest, color) {
        const rect = this.itemTitleRect(lineRect);
        const titleText = this.getQuestTitleText(quest);
        this.styliseTitle(color, quest.completed);
        this.drawText(titleText, rect.x, rect.y, rect.width, "left");
    }

    drawBadgeBlock(lineRect, quest) {
        if (typeof quest.hasDeadline === "function" && quest.hasDeadline() && quest.active) {
            const rect = this.itemDeadlineRect(lineRect);
            const remStr = quest.remainingTimeString();
            const remMin = quest.remainingTime();
            this.styliseDeadline(remMin);
            this.drawText(`⏱ ${remStr}`, rect.x, rect.y, rect.width, "right");
        } else {
            const rect = this.itemObjectiveRect(lineRect);
            const completedLocs = quest.locations ? quest.locations.filter(l => l && l.completed).length : 0;
            const totalLocs = quest.locations ? quest.locations.length : 0;
            this.styliseObjective(quest.completed);
            const badgeLbl = this.loc("quest.obj_badge", "obj.");
            const objTxt = totalLocs > 0 ? `${completedLocs}/${totalLocs} ${badgeLbl}` : "";
            this.drawText(objTxt, rect.x, rect.y, rect.width, "right");
        }
    }

    drawItemContent(lineRect, quest) {
        this.resetItemFontSettings();
        const { color, marker } = this.getQuestVisuals(quest);

        this.drawPinBlock(lineRect, quest);
        this.drawMarkerBlock(lineRect, quest, marker, color);
        this.drawTitleBlock(lineRect, quest, color);
        this.drawBadgeBlock(lineRect, quest);
    }

    // ========================================================================
    // 5. ORCHESTRATION & RAFRAÎCHISSEMENT
    // ========================================================================

    drawItem(index) {
        const quest = this._data[index];
        if (!quest) return;
        const rect = this.itemLineRect(index);
        this.drawItemContent(rect, quest);
    }

    refresh() {
        this.makeItemList();
        super.refresh();
        this.updateDetail();
    }

    select(index) {
        super.select(index);
        this.updateDetail();
    }

    updateDetail() {
        if (this._detailWindow) {
            this._detailWindow.setQuest(this.item());
        }
    }

    cursorRight() {
        if (this._onCycleFilter) this._onCycleFilter(1);
    }

    cursorLeft() {
        if (this._onCycleFilter) this._onCycleFilter(-1);
    }
}

window.Window_QuestList = Window_QuestList;
if (typeof global !== "undefined") {
    global.Window_QuestList = Window_QuestList;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Window_QuestList };
}
