//=============================================================================
// SC4_Scene_TutoBook.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Journal et carnet des tutoriels débloqués (Scene_TutoBook, Window_TutoList, Window_TutoDetail).
 * @author SimCraft
 * @help
 * ============================================================================
 * SC4_Scene_TutoBook.js
 * ============================================================================
 * Scène de consultation de l'historique des tutoriels :
 * - Window_TutoList : Liste sélectionnable de tous les tutoriels du jeu.
 *   Les tutoriels déjà visualisés sont indiqués avec leur nom complet ;
 *   ceux non encore vus sont masqués par un libellé d'inconnu.
 * - Window_TutoDetail : Affichage complet du texte, conseils et illustration.
 * - Intégré nativement au Codex stellaire et accessible par script :
 *   SceneManager.push(Scene_TutoBook);
 * ============================================================================
 */

(() => {
    "use strict";

    //=============================================================================
    // Window_TutoList
    //=============================================================================
    function Window_TutoList() {
        this.initialize(...arguments);
    }

    Window_TutoList.prototype = Object.create(Window_Selectable.prototype);
    Window_TutoList.prototype.constructor = Window_TutoList;

    Window_TutoList.prototype.initialize = function (rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._data = [];
        this.refresh();
        this.select(0);
    };

    Window_TutoList.prototype.maxItems = function () {
        return this._data ? this._data.length : 0;
    };

    Window_TutoList.prototype.item = function (index) {
        return this._data && index >= 0 ? this._data[index] : null;
    };

    Window_TutoList.prototype.currentItem = function () {
        return this.item(this.index());
    };

    Window_TutoList.prototype.makeItemList = function () {
        if (window.$tutoManager && typeof window.$tutoManager.allTutos === "function") {
            this._data = window.$tutoManager.allTutos();
        } else if (window.$dataTutos && Array.isArray(window.$dataTutos)) {
            this._data = window.$dataTutos.filter(t => Boolean(t));
        } else {
            this._data = [];
        }
    };

    Window_TutoList.prototype.isItemSeen = function (item) {
        if (!item) return false;
        if (window.$tutoManager && typeof window.$tutoManager.isSeen === "function") {
            return window.$tutoManager.isSeen(item.key) || window.$tutoManager.isSeen(item.id);
        }
        return false;
    };

    Window_TutoList.prototype.drawItem = function (index) {
        const item = this.item(index);
        if (!item) return;

        const rect = this.itemLineRect(index);
        const seen = this.isItemSeen(item);

        this.resetTextColor();
        if (seen) {
            this.changePaintOpacity(true);
            const idKey = `tutoName_${item.id !== undefined ? item.id : item.key}`;
            let title = "";
            if (typeof SC4_Localization !== "undefined") {
                const locVal = SC4_Localization.getText(idKey, "");
                if (locVal && locVal !== idKey) {
                    title = locVal;
                } else if (item.key) {
                    const locByKey = SC4_Localization.getText(`tutoName_${item.key}`, "");
                    if (locByKey && locByKey !== `tutoName_${item.key}`) {
                        title = locByKey;
                    }
                }
            }
            if (!title) title = item.name || idKey;
            title = (typeof SC4_Localization !== "undefined") ? SC4_Localization.parse(title) : title;
            this.drawText(`◈ ${title}`, rect.x + 4, rect.y, rect.width - 8, "left");
        } else {
            this.changePaintOpacity(false);
            this.changeTextColor("#778899");
            this.drawText("◇ --- Verrouillé ---", rect.x + 4, rect.y, rect.width - 8, "left");
            this.resetTextColor();
            this.changePaintOpacity(true);
        }
    };

    Window_TutoList.prototype.refresh = function () {
        this.makeItemList();
        Window_Selectable.prototype.refresh.call(this);
    };

    //=============================================================================
    // Window_TutoDetail
    //=============================================================================
    function Window_TutoDetail() {
        this.initialize(...arguments);
    }

    Window_TutoDetail.prototype = Object.create(Window_Base.prototype);
    Window_TutoDetail.prototype.constructor = Window_TutoDetail;

    Window_TutoDetail.prototype.initialize = function (rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this._tuto = null;
        this._isSeen = false;
        this._illustrationBitmap = null;
    };

    Window_TutoDetail.prototype.setTuto = function (tuto, isSeen) {
        if (this._tuto === tuto && this._isSeen === isSeen) return;
        this._tuto = tuto;
        this._isSeen = isSeen;

        if (tuto && isSeen && tuto.img) {
            const rawImg = String(tuto.img).trim();
            const hasExt = /\.(png|jpe?g|webp)$/i.test(rawImg);
            const url = hasExt ? `img/GUI/tuto/${rawImg}` : `img/GUI/tuto/${rawImg}.png`;
            if (typeof ImageManager !== "undefined" && typeof ImageManager.loadBitmapFromUrl === "function") {
                this._illustrationBitmap = ImageManager.loadBitmapFromUrl(url);
            } else if (typeof ImageManager !== "undefined" && typeof ImageManager.loadBitmap === "function") {
                this._illustrationBitmap = ImageManager.loadBitmap("img/GUI/tuto/", rawImg.replace(/\.png$/i, ""));
            } else {
                this._illustrationBitmap = null;
            }
        } else {
            this._illustrationBitmap = null;
        }

        this.refresh();
    };

    Window_TutoDetail.prototype.refresh = function () {
        this.contents.clear();
        if (!this._tuto) return;

        const cw = this.contentsWidth();

        if (!this._isSeen) {
            this.changeTextColor("#8899aa");
            this.drawText("Ce didacticiel n'a pas encore été découvert.", 20, 40, cw - 40, "center");
            this.resetTextColor();
            return;
        }

        let curY = 10;

        // Titre
        this.changeTextColor("#00eeff");
        this.contents.fontBold = true;
        this.contents.fontSize = 24;
        const idKey = `tutoName_${this._tuto.id !== undefined ? this._tuto.id : this._tuto.key}`;
        let title = "";
        if (typeof SC4_Localization !== "undefined") {
            const locVal = SC4_Localization.getText(idKey, "");
            if (locVal && locVal !== idKey) {
                title = locVal;
            } else if (this._tuto.key) {
                const locByKey = SC4_Localization.getText(`tutoName_${this._tuto.key}`, "");
                if (locByKey && locByKey !== `tutoName_${this._tuto.key}`) {
                    title = locByKey;
                }
            }
        }
        if (!title) title = this._tuto.name || idKey;
        const parsedTitle = (typeof SC4_Localization !== "undefined") ? SC4_Localization.parse(title) : title;
        this.drawText(parsedTitle, 10, curY, cw - 20, "left");
        this.contents.fontBold = false;
        this.resetTextColor();
        curY += 40;

        // Ligne de séparation
        this.contents.fillRect(10, curY, cw - 20, 2, "#00eeff");
        curY += 16;

        // Description / Corps
        this.contents.fontSize = 18;
        let rawTxt = this._tuto.txt || "";
        if (typeof SC4_Localization !== "undefined" && this._tuto.key) {
            const locTxt = SC4_Localization.getText(this._tuto.key, "");
            if (locTxt) rawTxt = locTxt;
        }
        const parsedTxt = (typeof SC4_Localization !== "undefined") ? SC4_Localization.parse(rawTxt) : rawTxt;
        this.drawTextEx(parsedTxt, 10, curY, cw - 20);

        // Illustration
        if (this._illustrationBitmap && this._illustrationBitmap.isReady()) {
            const imgW = this._illustrationBitmap.width;
            const imgH = this._illustrationBitmap.height;
            const imgX = Math.round((cw - imgW) / 2);
            const imgY = this.contentsHeight() - imgH - 20;
            this.contents.blt(this._illustrationBitmap, 0, 0, imgW, imgH, imgX, imgY);
        }
    };

    //=============================================================================
    // Scene_TutoBook
    //=============================================================================
    function Scene_TutoBook() {
        this.initialize(...arguments);
    }

    Scene_TutoBook.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_TutoBook.prototype.constructor = Scene_TutoBook;

    Scene_TutoBook.prototype.initialize = function () {
        Scene_MenuBase.prototype.initialize.call(this);
    };

    Scene_TutoBook.prototype.create = function () {
        Scene_MenuBase.prototype.create.call(this);
        this.createBackgroundLayer();
        this.createListWindow();
        this.createDetailWindow();
    };

    Scene_TutoBook.prototype.createBackgroundLayer = function () {
        const loadT1 = (name) => {
            return (ImageManager.loadTitle1) ? ImageManager.loadTitle1(name) : ImageManager.loadBitmap("img/titles1/", name);
        };
        this._bg = new Sprite(loadT1("Bg_0"));
        this._bg.opacity = 180;
        this.addChild(this._bg);
    };

    Scene_TutoBook.prototype.createListWindow = function () {
        const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;
        const rect = new Rectangle(40, 50, 360, boxH - 100);
        this._listWindow = new Window_TutoList(rect);
        this._listWindow.setHandler("cancel", this.popScene.bind(this));
        this._listWindow.setHandler("ok", () => {
            this._listWindow.activate();
        });
        this.addWindow(this._listWindow);
    };

    Scene_TutoBook.prototype.createDetailWindow = function () {
        const boxW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
        const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;
        const rect = new Rectangle(420, 50, boxW - 460, boxH - 100);
        this._detailWindow = new Window_TutoDetail(rect);
        this.addWindow(this._detailWindow);
        this.updateDetail();
    };

    Scene_TutoBook.prototype.update = function () {
        Scene_MenuBase.prototype.update.call(this);
        this.updateDetail();
    };

    Scene_TutoBook.prototype.updateDetail = function () {
        if (!this._listWindow || !this._detailWindow) return;
        const item = this._listWindow.currentItem();
        const seen = this._listWindow.isItemSeen(item);
        this._detailWindow.setTuto(item, seen);
    };

    window.Window_TutoList = Window_TutoList;
    window.Window_TutoDetail = Window_TutoDetail;
    window.Scene_TutoBook = Scene_TutoBook;

})();
