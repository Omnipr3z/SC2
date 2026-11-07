//=============================================================================
// SC4_QuestManager.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Hub et initialisation des quêtes ($gameQuests, $storyManager).
 * @author SimCraft
 * @base SC4_Game_QuestLocation
 * @base SC4_Game_Quest
 * @base SC4_Game_Quests
 * @base SC4_StoryManager
 * 
 * @help SC4_QuestManager.js
 */

// Instances globales
if (typeof Game_Quests !== "undefined" && typeof window !== "undefined") {
    window.$gameQuests = new Game_Quests();
}
if (typeof StoryManager !== "undefined" && typeof window !== "undefined") {
    window.$storyManager = new StoryManager();
}

// Commandes de plugin RMMZ
if (typeof PluginManager !== "undefined" && PluginManager.registerCommand) {
    PluginManager.registerCommand("SC4_QuestManager", "openQuestBook", () => {
        if (window.SC4 && typeof window.SC4.openQuestBook === "function") {
            window.SC4.openQuestBook();
        }
    });
}
