//=============================================================================
// RPG Maker MZ - SC4_StoryManager
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Moteur scénaristique et déclencheurs de quêtes ($storyManager).
 * @author SimCraft
 * @base SC4_Game_Quests
 * 
 * @help SC4_StoryManager.js
 */

class StoryManager {
    constructor() {
        this._triggeredQuests = new Set();
    }

    update() {
        if (!window.$gameDate || !window.$gameQuests) return;
        const currentTimestamp = window.$gameDate.timestamp;

        window.$gameQuests.quests().forEach(quest => {
            // Échéance calendaire & Auto-échec si délai expiré
            if (quest.active && quest.hasDeadline()) {
                quest.checkDeadline();
            }

            // Déclenchement automatique selon conditions temporelles et cartographiques
            if (!quest.active && !quest.completed && !quest.failed && !this._triggeredQuests.has(quest.id)) {
                let timeOk = !quest.triggerTimestamp || currentTimestamp >= quest.triggerTimestamp;
                let poiOk = true;
                if (quest.triggerPoiLocated) {
                    poiOk = window.$gameSystem && typeof window.$gameSystem.isPoiLocated === "function"
                        ? window.$gameSystem.isPoiLocated(quest.triggerPoiLocated)
                        : false;
                }
                if (timeOk && poiOk) {
                    this.startQuest(quest.id);
                }
            }
        });
    }

    startQuest(questId) {
        const quest = window.$gameQuests ? window.$gameQuests.quest(questId) : null;
        if (!quest) return;

        this._triggeredQuests.add(questId);
        quest.activate();

        // Envoi des alertes radio / astropathiques au terminal de vol
        if (quest.alertTxt && Array.isArray(quest.alertTxt) && window.$systemMapManager) {
            quest.alertTxt.forEach(item => {
                window.$systemMapManager.log(item.style || "info", item.txt);
            });
        }
    }

    makeSavefileData() {
        return {
            triggeredQuests: Array.from(this._triggeredQuests)
        };
    }

    loadSavefileData(data) {
        this._triggeredQuests.clear();
        if (data && Array.isArray(data.triggeredQuests)) {
            data.triggeredQuests.forEach(id => this._triggeredQuests.add(id));
        }
    }
}

window.StoryManager = StoryManager;
if (typeof global !== "undefined") {
    global.StoryManager = StoryManager;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { StoryManager };
}
