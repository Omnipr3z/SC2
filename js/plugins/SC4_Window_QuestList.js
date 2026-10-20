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

    refresh() {
        this.makeItemList();
        super.refresh();
        this.updateDetail();
    }

    drawItem(index) {
        const quest = this._data[index];
        if (!quest) return;

        const rect = this.itemLineRect(index);
        this.contents.fontFace = $gameSystem ? $gameSystem.mainFontFace() : "sans-serif";
        this.contents.outlineColor = "#000000";
        this.contents.outlineWidth = 3;

        // Détermination du code couleur par catégorie / état
        let itemColor = "#ebdbb2";
        let marker = "◈";
        if (quest.failed) {
            itemColor = "#fb4934";
            marker = "✖";
        } else if (quest.completed) {
            itemColor = "#8ec07c";
            marker = "✔";
        } else if (quest.recurring) {
            itemColor = "#b8bb26"; // Vert émeraude contrat récurrent
            marker = "🔄";
        } else if (quest.category === "secondary" || quest.category === "side") {
            itemColor = "#83a598"; // Cyan quête secondaire
            marker = "📜";
        } else if (quest.category === "bounty") {
            itemColor = "#fe8019"; // Orange prime de recherche
            marker = "🎯";
        } else {
            itemColor = "#fabd2f"; // Doré quête principale
            marker = "👑";
        }

        // Puce et Pin de suivi
        const trackPin = quest.isTracking ? "📌" : "◌";
        this.contents.fontSize = 13;
        this.contents.textColor = quest.isTracking ? "#8ec07c" : "#7c6f64";
        this.drawText(trackPin, rect.x, rect.y + 4, 18, "center");

        this.contents.fontSize = 14;
        this.contents.textColor = itemColor;
        this.drawText(marker, rect.x + 20, rect.y + 4, 20, "center");

        // Titre + compteur de répétition
        let titleTxt = quest.name;
        if (quest.recurring && quest.completedCount > 0) {
            titleTxt += ` (x${quest.completedCount})`;
        }
        this.contents.fontSize = 14;
        this.contents.textColor = quest.completed ? "#a89984" : itemColor;
        const titleW = rect.width - 150;
        this.drawText(titleTxt, rect.x + 44, rect.y + 4, titleW, "left");

        // Badge objectifs ou délai restant
        this.contents.fontSize = 11;
        if (typeof quest.hasDeadline === "function" && quest.hasDeadline() && quest.active) {
            const remStr = quest.remainingTimeString();
            const remMin = quest.remainingTime();
            this.contents.textColor = remMin <= 60 ? "#fb4934" : (remMin <= 360 ? "#fe8019" : "#b8bb26");
            this.drawText(`⏱ ${remStr}`, rect.x + rect.width - 100, rect.y + 4, 95, "right");
        } else {
            const completedLocs = quest.locations ? quest.locations.filter(l => l && l.completed).length : 0;
            const totalLocs = quest.locations ? quest.locations.length : 0;
            this.contents.textColor = quest.completed ? "#8ec07c" : "#83a598";
            const badgeLbl = typeof SC4_Localization !== "undefined" ? SC4_Localization.getText("quest.obj_badge", "obj.") : "obj.";
            const objTxt = totalLocs > 0 ? `${completedLocs}/${totalLocs} ${badgeLbl}` : "";
            this.drawText(objTxt, rect.x + rect.width - 70, rect.y + 4, 65, "right");
        }
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
