//=============================================================================
// RPG Maker MZ - SC4_QuestManager
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Contrôleur opérationnel du cycle de vie des quêtes ($questManager).
 * @author SimCraft
 * @base SC4_Game_Quests
 * 
 * @help SC4_QuestManager.js
 * 
 * Contrôleur opérationnel (Controller) des quêtes :
 * - update() : surveille à chaque tick temporel / découverte de POI les délais et déclencheurs.
 * - start(questId) : active une quête et diffuse l'alerte console de bord.
 * - advanceStep(questId) : valide l'étape en cours et passe à la suivante.
 * - complete(questId, outcome) : clôture avec succès, distribue les récompenses et notifie $storyManager.
 * - fail(questId) : clôture en échec et notifie $storyManager.
 */

class QuestManager {
    constructor() {
        this._triggeredQuests = new Set();
    }

    update() {
        if (!window.$gameDate || !window.$gameQuests) return;
        const currentTimestamp = window.$gameDate.timestamp;

        window.$gameQuests.quests().forEach(quest => {
            // Échéance calendaire & Auto-échec si délai expiré
            if (quest.active && quest.hasDeadline()) {
                const wasActive = quest.active;
                quest.checkDeadline();
                if (wasActive && quest.failed) {
                    this.onQuestFailed(quest.id);
                }
            }

            // Déclenchement automatique selon conditions temporelles et cartographiques
            const hasAutoTrigger = Boolean(quest.triggerTimestamp || quest.triggerPoiLocated);
            if (hasAutoTrigger && !quest.active && !quest.completed && !quest.failed && !this._triggeredQuests.has(quest.id)) {
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
        if (!quest) return false;

        this._triggeredQuests.add(questId);
        quest.activate();

        // Envoi des alertes radio / astropathiques au terminal de vol
        if (quest.alertTxt && Array.isArray(quest.alertTxt) && window.$systemMapManager) {
            quest.alertTxt.forEach(item => {
                window.$systemMapManager.log(item.style || "info", item.txt);
            });
        }

        // Notification d'activation au StoryManager pour le suivi scénaristique
        if (window.$storyManager && typeof window.$storyManager.onQuestStarted === "function") {
            window.$storyManager.onQuestStarted(questId);
        }
        return true;
    }

    start(questId) {
        return this.startQuest(questId);
    }

    advanceStep(questId) {
        const quest = window.$gameQuests ? window.$gameQuests.quest(questId) : null;
        if (!quest || !quest.active) return false;

        if (typeof quest.nextStep === "function") {
            quest.nextStep();
        } else if (quest.currentStep !== undefined) {
            quest.currentStep++;
        }

        if (window.$storyManager && typeof window.$storyManager.onQuestStepAdvanced === "function") {
            window.$storyManager.onQuestStepAdvanced(questId, quest.currentStep);
        }
        return true;
    }

    completeQuest(questId, outcome = "default") {
        const quest = window.$gameQuests ? window.$gameQuests.quest(questId) : null;
        if (!quest || !quest.active) return false;

        quest.complete();
        this.giveRewards(quest);

        // Ruissellement des conséquences narratives vers le StoryManager
        if (window.$storyManager && typeof window.$storyManager.onQuestCompleted === "function") {
            window.$storyManager.onQuestCompleted(questId, outcome);
        }
        return true;
    }

    complete(questId, outcome = "default") {
        return this.completeQuest(questId, outcome);
    }

    failQuest(questId) {
        const quest = window.$gameQuests ? window.$gameQuests.quest(questId) : null;
        if (!quest || !quest.active) return false;

        quest.fail();
        this.onQuestFailed(questId);
        return true;
    }

    fail(questId) {
        return this.failQuest(questId);
    }

    onQuestFailed(questId) {
        if (window.$storyManager && typeof window.$storyManager.onQuestFailed === "function") {
            window.$storyManager.onQuestFailed(questId);
        }
    }

    giveRewards(quest) {
        if (!quest || !quest.rewards) return;
        const rewards = quest.rewards;

        // Crédits / Gold
        if (rewards.gold && window.$gameParty) {
            window.$gameParty.gainGold(Number(rewards.gold));
        }

        // XP
        if (rewards.exp && window.$gameParty) {
            window.$gameParty.allMembers().forEach(actor => {
                actor.gainExp(Number(rewards.exp));
            });
        }

        // Items
        if (rewards.items && Array.isArray(rewards.items) && window.$gameParty) {
            rewards.items.forEach(r => {
                const item = window.$dataItems ? window.$dataItems[r.id] : null;
                if (item) {
                    window.$gameParty.gainItem(item, Number(r.amount || 1));
                }
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

window.QuestManager = QuestManager;
if (typeof module !== "undefined" && module.exports) {
    module.exports = QuestManager;
}
