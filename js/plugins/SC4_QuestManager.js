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

// Fallback loader pour l'environnement Node.js
if (typeof Game_QuestLocation === "undefined") {
    try {
        const _getMod = (name) => {
            if (typeof require === "function") return require(name);
            if (typeof process !== "undefined" && process.mainModule && process.mainModule.require) return process.mainModule.require(name);
            return null;
        };
        const _fs = _getMod('fs');
        const _path = _getMod('path');
        const _vm = _getMod('vm');
        if (_fs && _path && _vm) {
            let pluginsDir = _path.resolve('js/plugins');
            if (!_fs.existsSync(pluginsDir) && typeof __dirname !== 'undefined') {
                const candidate = _path.resolve(__dirname, '../js/plugins');
                if (_fs.existsSync(candidate)) pluginsDir = candidate;
            }
            if (!_fs.existsSync(pluginsDir) && typeof process !== 'undefined') {
                const candidate2 = _path.resolve(process.cwd(), 'js/plugins');
                if (_fs.existsSync(candidate2)) pluginsDir = candidate2;
            }
            const files = [
                'SC4_Game_QuestLocation.js',
                'SC4_Game_Quest.js',
                'SC4_Game_Quests.js',
                'SC4_StoryManager.js'
            ];
            for (const f of files) {
                const p = _path.join(pluginsDir, f);
                if (_fs.existsSync(p)) _vm.runInThisContext(_fs.readFileSync(p, 'utf8'));
            }
        }
    } catch (e) {}
}

// Instances globales
window.$gameQuests = new Game_Quests();
window.$storyManager = new StoryManager();

// Commandes de plugin RMMZ
if (typeof PluginManager !== "undefined" && PluginManager.registerCommand) {
    PluginManager.registerCommand("SC4_QuestManager", "openQuestBook", () => {
        if (window.SC4 && typeof window.SC4.openQuestBook === "function") {
            window.SC4.openQuestBook();
        }
    });
}
