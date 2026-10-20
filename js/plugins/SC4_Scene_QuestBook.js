//=============================================================================
// RPG Maker MZ - SC4_Scene_QuestBook
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Scène du Datapad stellaire et journal de quêtes.
 * @author SimCraft
 * @base SC4_Window_QuestBookHeader
 * @base SC4_Window_QuestFilter
 * @base SC4_Window_QuestList
 * @base SC4_Window_QuestDetail
 * 
 * @help SC4_Scene_QuestBook.js
 */

// Fallback loader pour les tests Node.js
if (typeof Window_QuestBookHeader === "undefined") {
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
                'SC4_Window_QuestBookHeader.js',
                'SC4_Window_QuestFilter.js',
                'SC4_Window_QuestList.js',
                'SC4_Window_QuestDetail.js'
            ];
            for (const f of files) {
                const p = _path.join(pluginsDir, f);
                if (_fs.existsSync(p)) _vm.runInThisContext(_fs.readFileSync(p, 'utf8'));
            }
        }
    } catch (e) {}
}

const _BaseSceneQuestBook = typeof Scene_MenuBase !== "undefined" ? Scene_MenuBase : (typeof Scene_Base !== "undefined" ? Scene_Base : Object);

class Scene_QuestBook extends _BaseSceneQuestBook {
    create() {
        super.create();
        //this.createBackground();
        this.createHeaderWindow();
        this.createFilterWindow();
        this.createListWindow();
        this.createDetailWindow();
    }

    createBackground() {
        this._bgSprite = new Sprite();
        this._bgSprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", "travelScreenBg");
        this.addChild(this._bgSprite);

        this._spaceSprite = new Sprite();
        this._spaceSprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", "space");
        this._spaceSprite.opacity = 210;
        this.addChild(this._spaceSprite);
    }

    createHeaderWindow() {
        const rect = new Rectangle(20, 12, Graphics.width - 40, 52);
        this._headerWindow = new Window_QuestBookHeader(rect);
        this.addWindow(this._headerWindow);
    }

    createFilterWindow() {
        const rect = new Rectangle(20, 68, 430, 50);
        this._filterWindow = new Window_QuestFilter(rect);
        this._filterWindow.setHandler("active", this.onFilterChange.bind(this, "active"));
        this._filterWindow.setHandler("recurring", this.onFilterChange.bind(this, "recurring"));
        this._filterWindow.setHandler("completed", this.onFilterChange.bind(this, "completed"));
        this._filterWindow.setHandler("all", this.onFilterChange.bind(this, "all"));
        this._filterWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._filterWindow);
    }

    createListWindow() {
        const rect = new Rectangle(20, 122, 430, Graphics.height - 134);
        this._listWindow = new Window_QuestList(rect);
        this._listWindow.setHandler("cancel", this.popScene.bind(this));
        this._listWindow.setHandler("ok", () => {
            const q = this._listWindow.item();
            if (q) {
                q.toggleTracking();
                SoundManager.playOk();
                this._listWindow.refresh();
                this._detailWindow.refresh();
            }
            this._listWindow.activate();
        });

        // Navigation par flèches gauche/droite pour cycler les filtres
        this._listWindow._onCycleFilter = (dir) => {
            const symbols = ["active", "recurring", "completed", "all"];
            let idx = symbols.indexOf(this._filterWindow.currentSymbol());
            idx = (idx + dir + symbols.length) % symbols.length;
            this._filterWindow.select(idx);
            this.onFilterChange(symbols[idx]);
        };

        this.addWindow(this._listWindow);
        this._listWindow.activate();
        this._listWindow.select(0);
    }

    createDetailWindow() {
        const rect = new Rectangle(460, 68, Graphics.width - 480, Graphics.height - 80);
        this._detailWindow = new Window_QuestDetail(rect);
        this.addWindow(this._detailWindow);
        this._listWindow.setDetailWindow(this._detailWindow);
    }

    onFilterChange(filterKey) {
        if (this._listWindow) {
            this._listWindow.setFilter(filterKey);
            this._listWindow.activate();
            this._listWindow.select(0);
        }
    }
}

window.Scene_QuestBook = Scene_QuestBook;
if (typeof global !== "undefined") {
    global.Scene_QuestBook = Scene_QuestBook;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Scene_QuestBook };
}
