//=============================================================================
// RPG Maker MZ - SC4_Window_QuestFilter
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Barre d'onglets et de filtrage des quêtes du Datapad.
 * @author SimCraft
 * 
 * @help SC4_Window_QuestFilter.js
 */

const _BaseWindowQuestFilter = typeof Window_HorzCommand !== "undefined" ? Window_HorzCommand : (typeof Window_Command !== "undefined" ? Window_Command : (typeof Window_Base !== "undefined" ? Window_Base : Object));

class Window_QuestFilter extends _BaseWindowQuestFilter {
    constructor(rect) {
        super(rect);
    }

    maxCols() {
        return 4;
    }

    makeCommandList() {
        const qm = window.$gameQuests;
        const allQuests = qm ? qm.quests() : [];
        const activeCount = allQuests.filter(q => q && q.active).length;
        const recurringCount = allQuests.filter(q => q && q.recurring).length;
        const completedCount = allQuests.filter(q => q && q.completed).length;
        const totalCount = allQuests.length;

        const loc = (key, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(key, def) : def;
        const activeLbl = loc("quest.filter_active", "En cours");
        const recLbl = loc("quest.filter_recurring", "Contrats");
        const compLbl = loc("quest.filter_completed", "Terminées");
        const allLbl = loc("quest.filter_all", "Toutes");

        this.addCommand(`${activeLbl} (${activeCount})`, "active");
        this.addCommand(`${recLbl} (${recurringCount})`, "recurring");
        this.addCommand(`${compLbl} (${completedCount})`, "completed");
        this.addCommand(`${allLbl} (${totalCount})`, "all");
    }
}

window.Window_QuestFilter = Window_QuestFilter;
if (typeof global !== "undefined") {
    global.Window_QuestFilter = Window_QuestFilter;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Window_QuestFilter };
}
