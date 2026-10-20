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

    // ========================================================================
    // 1. DONNÉES & GETTERS MÉTIER
    // ========================================================================

    get quests() {
        const qm = window.$gameQuests;
        return qm ? qm.quests() : [];
    }

    get questCounts() {
        const allQuests = this.quests;
        return {
            active: allQuests.filter(q => q && q.active).length,
            recurring: allQuests.filter(q => q && q.recurring).length,
            completed: allQuests.filter(q => q && q.completed).length,
            total: allQuests.length
        };
    }

    loc(key, def) {
        return typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(key, def) : def;
    }

    // ========================================================================
    // 2. CONFIGURATION & COMMANDES
    // ========================================================================

    maxCols() {
        return 4;
    }

    makeCommandList() {
        const counts = this.questCounts;
        const activeLbl = this.loc("quest.filter_active", "En cours");
        const recLbl = this.loc("quest.filter_recurring", "Contrats");
        const compLbl = this.loc("quest.filter_completed", "Terminées");
        const allLbl = this.loc("quest.filter_all", "Toutes");

        this.addCommand(`${activeLbl} (${counts.active})`, "active");
        this.addCommand(`${recLbl} (${counts.recurring})`, "recurring");
        this.addCommand(`${compLbl} (${counts.completed})`, "completed");
        this.addCommand(`${allLbl} (${counts.total})`, "all");
    }
}

window.Window_QuestFilter = Window_QuestFilter;
if (typeof global !== "undefined") {
    global.Window_QuestFilter = Window_QuestFilter;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Window_QuestFilter };
}
