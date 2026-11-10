//=============================================================================
// SC4_Window_Tuto.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Fenêtre d'affichage des tutoriels contextuels (Window_Tuto) et flèche indicatrice (Sprite_TutoArrow).
 * @author SimCraft
 * @help
 * ============================================================================
 * SC4_Window_Tuto.js
 * ============================================================================
 * Composants graphiques du moteur de didacticiel contextuel :
 * 
 * 1. Sprite_TutoArrow :
 *    - Affiche une flèche oscillante pointant vers une cible (coordonnées carte ou écran).
 *    - Image : img/GUI/tuto/arrow.png (48x48), ancrée à la pointe (0.5, 1.0).
 *    - Rotation selon angle fourni et oscillation flottante sinusoïdale.
 * 
 * 2. Window_Tuto :
 *    - Fenêtre 9-slice utilisant le windowskin img/system/WindowTuto.png (192x192).
 *    - Son d'apparition : Neon.ogg.
 *    - Enveloppement dynamique automatique des lignes (Word Wrap) évitant tout débordement.
 *    - Dimensionnement dynamique auto-proportionné au contenu texte, titre et illustration.
 *    - Positionnement contextuel (centré par défaut ou près de la coordonnée cible).
 *    - Fermeture par Entrée, Espace, Échap ou Clic tactile.
 * ============================================================================
 */

(() => {
    "use strict";

    //=============================================================================
    // Sprite_TutoArrow
    //=============================================================================
    function Sprite_TutoArrow() {
        this.initialize(...arguments);
    }

    Sprite_TutoArrow.prototype = Object.create(Sprite.prototype);
    Sprite_TutoArrow.prototype.constructor = Sprite_TutoArrow;

    Sprite_TutoArrow.prototype.initialize = function () {
        if (Sprite.prototype.initialize) {
            Sprite.prototype.initialize.call(this);
        }
        this.bitmap = ImageManager.loadBitmap("img/GUI/tuto/", "arrow");
        this.anchor.set(0.5, 1.0); // Ancrage à la pointe de la flèche
        this.visible = false;
        this.z = 250;
        this._targetData = null;
        this._baseAngle = 0;
        this._tick = 0;
    };

    /**
     * Configure la cible de la flèche.
     * @param {object|null} arrowData { xMap, yMap, x, y, angle }
     */
    Sprite_TutoArrow.prototype.setup = function (arrowData) {
        if (!arrowData) {
            this.visible = false;
            this._targetData = null;
            return;
        }
        this._targetData = arrowData;
        this._baseAngle = Number(arrowData.angle) || 0;
        this._tick = 0;
        this.visible = true;
        this.updatePosition();
    };

    Sprite_TutoArrow.prototype.update = function () {
        if (Sprite.prototype.update) {
            Sprite.prototype.update.call(this);
        }
        if (!this.visible || !this._targetData) return;
        this._tick++;
        this.updatePosition();
    };

    /**
     * Calcule la position à l'écran et applique l'oscillation.
     * Si la cible est une coordonnée carte (xMap, yMap) située hors de l'écran,
     * la flèche se positionne sur la bordure de l'écran (marge de 8px) et s'oriente
     * vers la case cible pour guider le joueur.
     */
    Sprite_TutoArrow.prototype.updatePosition = function () {
        if (!this._targetData) return;

        let targetX = 0;
        let targetY = 0;
        let isMapCoord = false;

        if (this._targetData.xMap !== undefined && this._targetData.yMap !== undefined) {
            isMapCoord = true;
            const tileW = (window.$gameMap && typeof window.$gameMap.tileWidth === "function") ? window.$gameMap.tileWidth() : 48;
            const tileH = (window.$gameMap && typeof window.$gameMap.tileHeight === "function") ? window.$gameMap.tileHeight() : 48;
            if (window.$gameMap && typeof window.$gameMap.adjustX === "function") {
                targetX = Math.round(window.$gameMap.adjustX(this._targetData.xMap) * tileW + tileW / 2);
                targetY = Math.round(window.$gameMap.adjustY(this._targetData.yMap) * tileH + tileH / 2);
            } else {
                targetX = this._targetData.xMap * tileW + tileW / 2;
                targetY = this._targetData.yMap * tileH + tileH / 2;
            }
        } else if (this._targetData.x !== undefined && this._targetData.y !== undefined) {
            targetX = Number(this._targetData.x) || 0;
            targetY = Number(this._targetData.y) || 0;
        } else {
            return;
        }

        const boxW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
        const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;
        const margin = 8;
        const minX = margin;
        const maxX = boxW - margin;
        const minY = margin;
        const maxY = boxH - margin;

        const isOffScreen = isMapCoord && (targetX < minX || targetX > maxX || targetY < minY || targetY > maxY);

        if (isOffScreen) {
            const cx = boxW / 2;
            const cy = boxH / 2;
            const dx = targetX - cx;
            const dy = targetY - cy;

            let scaleX = Infinity;
            let scaleY = Infinity;

            if (dx > 0) scaleX = (maxX - cx) / dx;
            else if (dx < 0) scaleX = (minX - cx) / dx;

            if (dy > 0) scaleY = (maxY - cy) / dy;
            else if (dy < 0) scaleY = (minY - cy) / dy;

            const scale = Math.min(scaleX, scaleY);
            const edgeX = cx + dx * scale;
            const edgeY = cy + dy * scale;

            // Angle pointant vers la cible (correction -PI/2 car le sprite arrow.png pointe nativement vers le bas)
            const dirAngle = Math.atan2(dy, dx);
            const rad = dirAngle - Math.PI / 2;

            // Oscillation le long de la direction de la flèche
            const bounceOffset = -Math.abs(Math.sin(this._tick * 0.1) * 8);
            this.x = edgeX + Math.sin(rad) * bounceOffset;
            this.y = edgeY - Math.cos(rad) * bounceOffset;
            this.rotation = rad;
        } else {
            const rad = (this._baseAngle * Math.PI) / 180;
            // Oscillation le long de l'axe de la flèche (recul puis poussée vers la pointe)
            const bounceOffset = -Math.abs(Math.sin(this._tick * 0.1) * 8);

            this.x = targetX + Math.sin(rad) * bounceOffset;
            this.y = targetY - Math.cos(rad) * bounceOffset;
            this.rotation = rad;
        }
    };

    //=============================================================================
    // Window_TutoName (Fenêtre de titre contextuelle enfant)
    //=============================================================================
    const NameBoxParent = (typeof Window_NameBox !== "undefined") ? Window_NameBox : Window_Base;

    function Window_TutoName() {
        this.initialize(...arguments);
    }

    Window_TutoName.prototype = Object.create(NameBoxParent.prototype);
    Window_TutoName.prototype.constructor = Window_TutoName;

    Window_TutoName.prototype.initialize = function () {
        NameBoxParent.prototype.initialize.call(this, new Rectangle());
        this.loadWindowskin();
        this._title = "";
        this._iconIndex = 0;
        this.openness = 0;
        this.visible = false;
        this._iconsBitmap = ImageManager.loadBitmap("img/GUI/tuto/", "tuto_icons");
        if (this._iconsBitmap && !this._iconsBitmap.isReady()) {
            this._iconsBitmap.addLoadListener(() => {
                if (this._title && this.contents) this.refresh();
            });
        }
    };

    Window_TutoName.prototype.loadWindowskin = function () {
        this.windowskin = ImageManager.loadSystem("WindowTuto");
    };

    Window_TutoName.prototype.resetTextColor = function () {
        if (typeof this.changeTextColor === "function") {
            this.changeTextColor("#00ff88");
        }
        if (typeof this.changeOutlineColor === "function") {
            this.changeOutlineColor("rgba(0, 30, 10, 0.8)");
        }
    };

    /**
     * Configure et prépare le titre et son icône.
     * @param {string} title Nom du tutoriel.
     * @param {number} [iconIndex=0] Index horizontal de l'icône dans tuto_icons.png (32x32).
     */
    Window_TutoName.prototype.setup = function (title, iconIndex = 0) {
        this._title = title || "";
        this._iconIndex = Number(iconIndex) || 0;
        if (!this._title) {
            this.visible = false;
            this.openness = 0;
            return;
        }
        this.visible = true;
        this.updatePlacement();
        this.createContents();
        this.refresh();
    };

    Window_TutoName.prototype.updatePlacement = function () {
        this.width = this.windowWidth();
        this.height = this.windowHeight();
        // Superposé en haut à gauche de la fenêtre parente, débordant de 8px en Y
        this.x = 0;
        this.y = -this.height + 8;
    };

    Window_TutoName.prototype.windowWidth = function () {
        if (!this._title) return 0;
        if (typeof this.resetFontSettings === "function") this.resetFontSettings();
        const parsedTitle = (typeof SC4_Localization !== "undefined")
            ? SC4_Localization.parse(this._title)
            : this._title;
        const cleanTitle = parsedTitle.replace(/\x1b[A-Za-z]+(\[.*?\])?/g, "").replace(/\\[A-Za-z]+(\[.*?\])?/g, "");
        const textW = this.textWidth(cleanTitle);
        const iconW = 32;
        const spacing = 10;
        const totalContentW = iconW + spacing + textW;
        return Math.ceil(totalContentW + this.padding * 2 + 16);
    };

    Window_TutoName.prototype.windowHeight = function () {
        if (typeof this.fittingHeight === "function") {
            return this.fittingHeight(1);
        }
        const lh = (typeof this.lineHeight === "function") ? this.lineHeight() : 36;
        return lh + this.padding * 2;
    };

    Window_TutoName.prototype.refresh = function () {
        if (!this.contents) return;
        this.contents.clear();
        if (!this._title) return;

        // 1. Découpage et dessin de l'icône 32x32 depuis tuto_icons.png
        if (this._iconsBitmap && this._iconsBitmap.isReady()) {
            const sx = (this._iconIndex || 0) * 32;
            const sy = 0;
            const sw = 32;
            const sh = 32;
            const dy = Math.max(0, Math.round((this.contentsHeight() - 32) / 2));
            this.contents.blt(this._iconsBitmap, sx, sy, sw, sh, 4, dy);
        }

        // 2. Dessin du titre en vert néon (#00ff88)
        const textX = 32 + 12;
        const textW = this.contentsWidth() - textX;
        const lh = (typeof this.lineHeight === "function") ? this.lineHeight() : 36;
        const textY = Math.max(0, Math.round((this.contentsHeight() - lh) / 2));
        if (typeof this.resetFontSettings === "function") this.resetFontSettings();
        if (typeof this.resetTextColor === "function") this.resetTextColor();
        this.contents.fontBold = true;
        const parsedTitle = (typeof SC4_Localization !== "undefined")
            ? SC4_Localization.parse(this._title)
            : this._title;
        this.drawText(parsedTitle, textX, textY, textW, "left");
        this.contents.fontBold = false;
        if (typeof this.resetTextColor === "function") this.resetTextColor();
    };

    //=============================================================================
    // Window_TutoConfirm (Fenêtre modale de confirmation pour désactiver les tutos)
    //=============================================================================
    const CommandParent = (typeof Window_Command !== "undefined")
        ? Window_Command
        : ((typeof Window_Selectable !== "undefined") ? Window_Selectable : Window_Base);

    function Window_TutoConfirm() {
        this.initialize(...arguments);
    }

    Window_TutoConfirm.prototype = Object.create(CommandParent.prototype);
    Window_TutoConfirm.prototype.constructor = Window_TutoConfirm;

    Window_TutoConfirm.prototype.initialize = function () {
        const boxW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
        const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;
        const winW = 540;
        const winH = 170;
        const winX = Math.round((boxW - winW) / 2);
        const winY = Math.round((boxH - winH) / 2);
        const rect = new Rectangle(winX, winY, winW, winH);

        this._handlers = {};
        this._list = [];
        this._index = 1; // "Annuler" sélectionné par défaut pour sécurité

        CommandParent.prototype.initialize.call(this, rect);
        this.loadWindowskin();
        this.openness = 0;
        this.visible = false;
        this.deactivate();
        this.z = 300;
    };

    Window_TutoConfirm.prototype.loadWindowskin = function () {
        this.windowskin = ImageManager.loadSystem("WindowTuto");
    };

    Window_TutoConfirm.prototype.isOpen = function () {
        return this.openness >= 255;
    };

    Window_TutoConfirm.prototype.isClosed = function () {
        return this.openness <= 0;
    };

    Window_TutoConfirm.prototype.isOpenAndActive = function () {
        return this.isOpen() && this.active;
    };

    Window_TutoConfirm.prototype.maxCols = function () {
        return 2;
    };

    Window_TutoConfirm.prototype.messageAreaHeight = function () {
        return 68;
    };

    Window_TutoConfirm.prototype.itemRect = function (index) {
        let rect;
        if (typeof CommandParent.prototype.itemRect === "function") {
            rect = CommandParent.prototype.itemRect.call(this, index);
        } else {
            const cols = this.maxCols();
            const col = index % cols;
            const row = Math.floor(index / cols);
            const w = Math.floor((this.contentsWidth() - 16) / cols);
            const h = 36;
            const x = col * (w + 16);
            const y = row * h;
            rect = new Rectangle(x, y, w, h);
        }
        rect.y += this.messageAreaHeight();
        return rect;
    };

    Window_TutoConfirm.prototype.clearCommandList = function () {
        this._list = [];
    };

    Window_TutoConfirm.prototype.addCommand = function (name, symbol, enabled = true) {
        this._list.push({ name, symbol, enabled });
    };

    Window_TutoConfirm.prototype.makeCommandList = function () {
        const confirmTxt = (typeof SC4_Localization !== "undefined")
            ? SC4_Localization.getText("tuto_disable_confirm", "Désactiver")
            : "Désactiver";
        const cancelTxt = (typeof SC4_Localization !== "undefined")
            ? SC4_Localization.getText("tuto_disable_cancel", "Annuler")
            : "Annuler";

        this.addCommand(confirmTxt, "disable");
        this.addCommand(cancelTxt, "cancel");
    };

    Window_TutoConfirm.prototype.maxItems = function () {
        return this._list ? this._list.length : 0;
    };

    Window_TutoConfirm.prototype.commandName = function (index) {
        return this._list[index] ? this._list[index].name : "";
    };

    Window_TutoConfirm.prototype.commandSymbol = function (index) {
        return this._list[index] ? this._list[index].symbol : "";
    };

    Window_TutoConfirm.prototype.isCommandEnabled = function (index) {
        return this._list[index] ? this._list[index].enabled : true;
    };

    Window_TutoConfirm.prototype.currentSymbol = function () {
        return this.commandSymbol(this.index());
    };

    Window_TutoConfirm.prototype.setHandler = function (symbol, method) {
        this._handlers = this._handlers || {};
        this._handlers[symbol] = method;
    };

    Window_TutoConfirm.prototype.isHandled = function (symbol) {
        return Boolean(this._handlers && this._handlers[symbol]);
    };

    Window_TutoConfirm.prototype.callHandler = function (symbol) {
        if (this.isHandled(symbol)) {
            this._handlers[symbol]();
        }
    };

    Window_TutoConfirm.prototype.processOk = function () {
        if (this.isCurrentItemEnabled()) {
            this.playOkSound();
            this.callOkHandler();
        } else {
            this.playBuzzerSound();
        }
    };

    Window_TutoConfirm.prototype.playOkSound = function () {
        if (typeof SoundManager !== "undefined" && SoundManager.playOk) {
            SoundManager.playOk();
        }
    };

    Window_TutoConfirm.prototype.playBuzzerSound = function () {
        if (typeof SoundManager !== "undefined" && SoundManager.playBuzzer) {
            SoundManager.playBuzzer();
        }
    };

    Window_TutoConfirm.prototype.playCancelSound = function () {
        if (typeof SoundManager !== "undefined" && SoundManager.playCancel) {
            SoundManager.playCancel();
        }
    };

    Window_TutoConfirm.prototype.callOkHandler = function () {
        const symbol = this.currentSymbol();
        if (this.isHandled(symbol)) {
            this.callHandler(symbol);
        } else if (this.isHandled("ok")) {
            this.callHandler("ok");
        } else {
            this.activate();
        }
    };

    Window_TutoConfirm.prototype.processCancel = function () {
        if (typeof SoundManager !== "undefined" && SoundManager.playCancel) {
            SoundManager.playCancel();
        }
        if (this.isHandled("cancel")) {
            this.callHandler("cancel");
        } else {
            this.close();
            this.deactivate();
        }
    };

    Window_TutoConfirm.prototype.isCurrentItemEnabled = function () {
        return this.isCommandEnabled(this.index());
    };

    Window_TutoConfirm.prototype.drawItem = function (index) {
        const rect = this.itemRect(index);
        this.resetTextColor();
        this.changePaintOpacity(this.isCommandEnabled(index));
        this.drawText(this.commandName(index), rect.x, rect.y, rect.width, "center");
    };

    Window_TutoConfirm.prototype.drawAllItems = function () {
        const topIndex = (typeof this.topIndex === "function") ? this.topIndex() : 0;
        for (let i = 0; i < this.maxItems(); i++) {
            this.drawItem(topIndex + i);
        }
    };

    Window_TutoConfirm.prototype.refresh = function () {
        this.clearCommandList();
        this.makeCommandList();
        if (this.contents) {
            this.contents.clear();
            this.drawExplanation();
            this.drawAllItems();
        }
    };

    Window_TutoConfirm.prototype.drawExplanation = function () {
        if (!this.contents) return;
        const titleTxt = (typeof SC4_Localization !== "undefined")
            ? SC4_Localization.getText("tuto_disable_title", "Désactiver l'aide contextuelle ?")
            : "Désactiver l'aide contextuelle ?";
        const descTxt = (typeof SC4_Localization !== "undefined")
            ? SC4_Localization.getText("tuto_disable_desc", "Les tutoriels peuvent être réactivés depuis le menu Options.")
            : "Les tutoriels peuvent être réactivés depuis le menu Options.";

        const cw = this.contentsWidth();
        if (typeof this.resetFontSettings === "function") this.resetFontSettings();
        this.contents.fontBold = true;
        if (typeof this.changeTextColor === "function") this.changeTextColor("#ffaa44");
        this.drawText(titleTxt, 0, 4, cw, "center");
        this.contents.fontBold = false;
        if (typeof this.changeTextColor === "function") this.changeTextColor("#dddddd");
        this.contents.fontSize = 18;
        this.drawText(descTxt, 0, 36, cw, "center");
        if (typeof this.resetFontSettings === "function") this.resetFontSettings();
    };

    Window_TutoConfirm.prototype.processTouch = function () {
        if (this.isOpenAndActive && this.isOpenAndActive()) {
            if (typeof TouchInput !== "undefined" && TouchInput.isTriggered && TouchInput.isTriggered()) {
                if (typeof this.isTouchedInsideFrame === "function" && !this.isTouchedInsideFrame()) {
                    if (typeof TouchInput.clear === "function") TouchInput.clear();
                    this.processCancel();
                    return;
                }
            }
        }
        if (typeof CommandParent.prototype.processTouch === "function") {
            CommandParent.prototype.processTouch.call(this);
        }
    };

    //=============================================================================
    // Window_Tuto
    //=============================================================================
    function Window_Tuto() {
        this.initialize(...arguments);
    }

    Window_Tuto.prototype = Object.create(Window_Base.prototype);
    Window_Tuto.prototype.constructor = Window_Tuto;

    Window_Tuto.prototype.initialize = function (arrowSprite = null) {
        const rect = new Rectangle(0, 0, 520, 200);
        Window_Base.prototype.initialize.call(this, rect);
        this.loadWindowskin();
        this.opacity = 255;
        this.visible = false;
        this.openness = 0;
        this._arrowSprite = arrowSprite;
        this._tutoData = null;
        this._illustrationBitmap = null;
        this._wrappedLines = [];
        this._promptTimer = 0;
        this._screenPadding = 12;
        this._disableButtonHovered = false;
        this.createPromptSprite();
        this.createDisableButtonSprite();
        this.createNameWindow();
        this.createConfirmWindow();
    };

    /**
     * Retourne le padding d'alignement écran (12px par défaut, surchargeable via tutoData ou setPadding).
     * @returns {number}
     */
    Window_Tuto.prototype.getPadding = function () {
        if (this._tutoData && this._tutoData.padding !== undefined && this._tutoData.padding !== null) {
            return Math.max(0, Number(this._tutoData.padding));
        }
        return (this._screenPadding !== undefined) ? this._screenPadding : 12;
    };

    /**
     * Définit le padding d'alignement écran par défaut.
     * @param {number} pad 
     */
    Window_Tuto.prototype.setPadding = function (pad) {
        this._screenPadding = Math.max(0, Number(pad));
    };

    /**
     * Parse un mot-clé de positionnement (ex: "top-left", "bottom-center", "middle-right", "top", "bottom").
     * @param {string} posStr 
     * @param {number} winW 
     * @param {number} winH 
     * @param {number} boxW 
     * @param {number} boxH 
     * @param {number} pad 
     * @param {number} topPadding 
     * @returns {{ x: number, y: number }}
     */
    Window_Tuto.prototype.parsePositionKeyword = function (posStr, winW, winH, boxW, boxH, pad, topPadding) {
        const str = String(posStr || "").toLowerCase().replace(/_/g, "-").trim();
        let x = Math.round((boxW - winW) / 2);
        let y = Math.round((boxH - winH) / 2);

        // Détection horizontale : left, right, center/middle
        if (str.includes("left")) {
            x = pad;
        } else if (str.includes("right")) {
            x = boxW - winW - pad;
        } else if (str.includes("center") || str.includes("middle")) {
            x = Math.round((boxW - winW) / 2);
        }

        // Détection verticale : top, bottom, center/middle
        if (str.includes("top")) {
            y = pad + topPadding;
        } else if (str.includes("bottom")) {
            y = boxH - winH - pad;
        } else if (str === "left" || str === "right") {
            y = Math.round((boxH - winH) / 2);
        }

        return { x, y };
    };

    Window_Tuto.prototype.loadWindowskin = function () {
        this.windowskin = ImageManager.loadSystem("WindowTuto");
    };

    Window_Tuto.prototype.createNameWindow = function () {
        this._nameWindow = new Window_TutoName();
        this.addChild(this._nameWindow);
    };

    Window_Tuto.prototype.createPromptSprite = function () {
        this._promptSprite = new Sprite();
        const bw = 160;
        const bh = 24;
        this._promptSprite.bitmap = new Bitmap(bw, bh);
        this._promptSprite.bitmap.fontSize = 13;
        this._promptSprite.bitmap.fontItalic = true;
        this._promptSprite.bitmap.textColor = "#99ccff";
        this._promptSprite.bitmap.drawText("[ Entrée / Clic ]", 0, 0, bw, bh, "right");
        this._promptSprite.anchor.set(1.0, 1.0);
        this.addChild(this._promptSprite);
    };

    Window_Tuto.prototype.createDisableButtonSprite = function () {
        this._disableButtonSprite = new Sprite();
        const bw = 180;
        const bh = 24;
        this._disableButtonSprite.bitmap = new Bitmap(bw, bh);
        this._disableButtonSprite.anchor.set(0.0, 1.0);
        this._disableButtonHovered = false;
        this.addChild(this._disableButtonSprite);
        this.refreshDisableButton(false);
    };

    Window_Tuto.prototype.refreshDisableButton = function (hovered = false) {
        if (!this._disableButtonSprite || !this._disableButtonSprite.bitmap) return;
        const bmp = this._disableButtonSprite.bitmap;
        bmp.clear();
        const bw = bmp.width;
        const bh = bmp.height;
        const btnTxt = (typeof SC4_Localization !== "undefined")
            ? SC4_Localization.getText("tuto_disable_btn", "Désactiver les tutos")
            : "Désactiver les tutos";

        bmp.fontSize = 13;
        bmp.fontItalic = true;

        if (hovered) {
            bmp.fillRect(0, 0, bw, bh, "rgba(255, 100, 100, 0.2)");
            if (typeof bmp.strokeRect === "function") {
                bmp.strokeRect(0, 0, bw, bh, "rgba(255, 120, 120, 0.6)");
            }
            bmp.textColor = "#ff7777";
        } else {
            bmp.textColor = "#aa8888";
        }
        bmp.drawText(`[ ⊘ ${btnTxt} ]`, 0, 0, bw, bh, "center");
    };

    Window_Tuto.prototype.isDisableButtonHovered = function () {
        if (!this.visible || this.openness < 255 || !this._disableButtonSprite) return false;
        if (typeof TouchInput === "undefined") return false;
        const tx = (TouchInput.x !== undefined) ? TouchInput.x : -1;
        const ty = (TouchInput.y !== undefined) ? TouchInput.y : -1;
        const gx = this.x + this._disableButtonSprite.x;
        const gy = this.y + this._disableButtonSprite.y - 24;
        const gw = this._disableButtonSprite.bitmap ? this._disableButtonSprite.bitmap.width : 180;
        const gh = this._disableButtonSprite.bitmap ? this._disableButtonSprite.bitmap.height : 24;
        return (tx >= gx && tx <= gx + gw && ty >= gy && ty <= gy + gh);
    };

    Window_Tuto.prototype.updateDisableButton = function () {
        const hovered = this.isDisableButtonHovered();
        if (hovered !== this._disableButtonHovered) {
            this._disableButtonHovered = hovered;
            this.refreshDisableButton(hovered);
        }
    };

    Window_Tuto.prototype.isDisableButtonClicked = function () {
        if (!this.visible || this.openness < 255 || !this._disableButtonSprite) return false;
        if (typeof TouchInput === "undefined") return false;
        if (typeof TouchInput.isTriggered === "function" && TouchInput.isTriggered() && this.isDisableButtonHovered()) {
            return true;
        }
        return false;
    };

    Window_Tuto.prototype.createConfirmWindow = function () {
        this._confirmWindow = new Window_TutoConfirm();
        this._confirmWindow.setHandler("disable", this.onConfirmDisable.bind(this));
        this._confirmWindow.setHandler("cancel", this.onConfirmCancel.bind(this));
    };

    Window_Tuto.prototype.openConfirmWindow = function () {
        if (!this._confirmWindow) {
            this.createConfirmWindow();
        }
        if (!this._confirmWindow.parent) {
            if (this.parent) {
                this.parent.addChild(this._confirmWindow);
            } else if (typeof SceneManager !== "undefined" && SceneManager._scene && typeof SceneManager._scene.addWindow === "function") {
                SceneManager._scene.addWindow(this._confirmWindow);
            }
        }
        if (typeof SoundManager !== "undefined" && SoundManager.playOk) {
            SoundManager.playOk();
        }
        this.deactivate();
        this._confirmWindow.refresh();
        this._confirmWindow.select(1); // "Annuler" par défaut pour sécurité
        this._confirmWindow.open();
        this._confirmWindow.activate();
        this._confirmWindow.visible = true;
    };

    Window_Tuto.prototype.onConfirmDisable = function () {
        if (this._confirmWindow) {
            this._confirmWindow.close();
            this._confirmWindow.deactivate();
        }
        if (window.$tutoManager && typeof window.$tutoManager.disableContextualHelp === "function") {
            window.$tutoManager.disableContextualHelp();
        } else {
            if (typeof ConfigManager !== "undefined") {
                ConfigManager.contextualHelp = false;
                if (typeof ConfigManager.save === "function") {
                    ConfigManager.save();
                }
            }
            if (window.$tutoManager) {
                window.$tutoManager._queue = [];
                window.$tutoManager._current = null;
            }
        }
        this.close();
        if (this._nameWindow) {
            this._nameWindow.close();
        }
        if (this._arrowSprite) {
            this._arrowSprite.setup(null);
        }
        if (typeof TouchInput !== "undefined" && typeof TouchInput.clear === "function") {
            TouchInput.clear();
        }
        if (typeof SceneManager !== "undefined" && SceneManager._scene && typeof SceneManager._scene.activateTouchReleaseGuard === "function") {
            SceneManager._scene.activateTouchReleaseGuard(8);
        }
    };

    Window_Tuto.prototype.onConfirmCancel = function () {
        if (this._confirmWindow) {
            this._confirmWindow.close();
            this._confirmWindow.deactivate();
        }
        this.activate();
        if (typeof TouchInput !== "undefined" && typeof TouchInput.clear === "function") {
            TouchInput.clear();
        }
    };

    /**
     * Associe la flèche indicatrice si elle a été créée séparément.
     * @param {Sprite_TutoArrow} arrowSprite 
     */
    Window_Tuto.prototype.setArrowSprite = function (arrowSprite) {
        this._arrowSprite = arrowSprite;
    };

    /**
     * Ouvre et configure le tutoriel.
     * @param {object} tutoData 
     */
    Window_Tuto.prototype.openTuto = function (tutoData) {
        if (!tutoData) return;
        this._tutoData = tutoData;

        if (this._confirmWindow) {
            this._confirmWindow.close();
            this._confirmWindow.deactivate();
        }
        this._disableButtonHovered = false;
        this.refreshDisableButton(false);

        // Joue le jingle sonore
        if (typeof AudioManager !== "undefined" && AudioManager.playSe) {
            AudioManager.playSe({ name: "Neon", volume: 75, pitch: 100, pan: 0 });
        }

        // Précharge l'illustration si définie (support PNG, JPG/JPEG et WEBP)
        if (tutoData.img) {
            const rawImg = String(tutoData.img).trim();
            const hasExt = /\.(png|jpe?g|webp)$/i.test(rawImg);
            const url = hasExt ? `img/GUI/tuto/${rawImg}` : `img/GUI/tuto/${rawImg}.png`;
            if (typeof ImageManager !== "undefined" && typeof ImageManager.loadBitmapFromUrl === "function") {
                this._illustrationBitmap = ImageManager.loadBitmapFromUrl(url);
            } else if (typeof ImageManager !== "undefined" && typeof ImageManager.loadBitmap === "function") {
                this._illustrationBitmap = ImageManager.loadBitmap("img/GUI/tuto/", rawImg.replace(/\.png$/i, ""));
            } else {
                this._illustrationBitmap = null;
            }

            if (this._illustrationBitmap && typeof this._illustrationBitmap.isReady === "function" && !this._illustrationBitmap.isReady()) {
                this._illustrationBitmap.addLoadListener(() => {
                    if (this.visible && this._tutoData) {
                        this.calculatePlacementAndResize();
                        this.refresh();
                    }
                });
            }
        } else {
            this._illustrationBitmap = null;
        }

        // Flèche indicatrice
        if (this._arrowSprite) {
            this._arrowSprite.setup(tutoData.arrow);
        }

        this.calculatePlacementAndResize();
        this.refresh();
        this.open();
        if (this._nameWindow && this._tutoData && this._tutoData.name) {
            this._nameWindow.open();
        }
        this.visible = true;
        this.activate();
    };

    /**
     * Découpe et enveloppe le texte en lignes respectant la largeur maximale sans couper les mots.
     * Utilise la police réelle d'affichage pour une précision au pixel près.
     * @param {string} text 
     * @param {number} maxContentWidth 
     * @returns {string[]}
     */
    Window_Tuto.prototype.computeWrappedLines = function (text, maxContentWidth) {
        if (!text) return [];

        const converted = (typeof this.convertEscapeCharacters === "function")
            ? this.convertEscapeCharacters(text)
            : text;

        const paragraphs = converted.split("\n");
        const result = [];

        // Applique les paramètres de police effectifs pour la mesure
        if (typeof this.resetFontSettings === "function") {
            this.resetFontSettings();
        } else if (this.contents) {
            this.contents.fontSize = 26;
        }

        for (const paragraph of paragraphs) {
            if (!paragraph || paragraph.trim() === "") {
                result.push("");
                continue;
            }
            const words = paragraph.split(" ");
            let currentLine = "";

            for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                // Mesure sans les codes d'échappement invisibles (\C[x], \I[x], etc.)
                const cleanTest = testLine.replace(/\x1b[A-Za-z]+(\[.*?\])?/g, "").replace(/\\[A-Za-z]+(\[.*?\])?/g, "");
                // Prise en compte de la largeur des icônes s'il y en a
                const iconMatches = (testLine.match(/\\[Ii]\[\d+\]/g) || []).length + (testLine.match(/\x1b[Ii]\[\d+\]/g) || []).length;
                const iconW = (typeof ImageManager !== "undefined" && ImageManager.iconWidth) ? ImageManager.iconWidth : 32;
                const testWidth = this.textWidth(cleanTest) + (iconMatches * (iconW + 4));

                if (testWidth > maxContentWidth && currentLine) {
                    result.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) {
                result.push(currentLine);
            }
        }
        return result;
    };

    /**
     * Calcule la taille et les coordonnées optimales de la fenêtre.
     */
    Window_Tuto.prototype.calculatePlacementAndResize = function () {
        const boxW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
        const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;

        // 1. Largeur par défaut (520px) ou personnalisée dans les paramètres/données
        let winW = (this._tutoData.width && Number(this._tutoData.width) > 0)
            ? Number(this._tutoData.width)
            : 520;

        // 2. Si une illustration est présente, adapter la largeur au minimum à l'image + padding
        if (this._illustrationBitmap && this._illustrationBitmap.isReady()) {
            const minImgW = (this._illustrationBitmap.width || 0) + this.padding * 2 + 24;
            winW = Math.max(winW, minImgW);
        }

        // Garde-fou écran pour la largeur
        winW = Math.min(boxW - 40, winW);

        // 3. Calcul des lignes enveloppées sur la largeur intérieure disponible
        const innerContentW = winW - this.padding * 2 - 20; // 10px de marge de chaque côté
        const rawTxt = this._tutoData.txt || "";
        const parsedTxt = (typeof SC4_Localization !== "undefined") ? SC4_Localization.parse(rawTxt) : rawTxt;

        const lines = this.computeWrappedLines(parsedTxt, innerContentW);
        this._wrappedLines = lines;

        // 4. Calcul de la hauteur proportionnée
        const bodyLineHeight = (typeof this.lineHeight === "function") ? this.lineHeight() : 36;
        const bodyH = Math.max(bodyLineHeight, lines.length * bodyLineHeight);
        const imgH = (this._illustrationBitmap && this._illustrationBitmap.isReady())
            ? ((this._illustrationBitmap.height || 48) + 16)
            : 0;
        const promptH = 28;
        const totalPadding = this.padding * 2 + 16;

        const winH = Math.min(boxH - 40, bodyH + imgH + promptH + totalPadding);

        // Configure et met à jour la fenêtre de titre enfant en amont pour connaître sa hauteur
        if (this._nameWindow) {
            this._nameWindow.setup(this._tutoData.name, this._tutoData.iconIndex);
        }

        const nameH = (this._nameWindow && this._nameWindow.visible) ? this._nameWindow.height : 0;
        const nameW = (this._nameWindow && this._nameWindow.visible) ? this._nameWindow.width : 0;
        const topPadding = nameH ? Math.max(0, nameH - 8) : 0;
        const totalW = Math.max(winW, nameW);
        const pad = this.getPadding();

        let winX = Math.round((boxW - winW) / 2);
        let winY = Math.round((boxH - winH) / 2);

        // Résolution du positionnement : mot-clé ou cible spécifique
        const posKeyword = this._tutoData.position || (typeof this._tutoData.coord === "string" ? this._tutoData.coord : null);
        const coord = (this._tutoData.coord && typeof this._tutoData.coord === "object") ? this._tutoData.coord : null;

        if (posKeyword) {
            // 1. Positionnement par mot-clé (ex: "top-left", "bottom", "middle-right", "top", etc.)
            const pos = this.parsePositionKeyword(posKeyword, winW, winH, boxW, boxH, pad, topPadding);
            winX = pos.x;
            winY = pos.y;
        } else if (coord) {
            // 2. Positionnement par cible spécifique (coordonnées carte xMap/yMap ou écran x/y)
            let targetX = 0;
            let targetY = 0;
            if (coord.xMap !== undefined && coord.yMap !== undefined && window.$gameMap) {
                const tileW = window.$gameMap.tileWidth();
                const tileH = window.$gameMap.tileHeight();
                targetX = Math.round(window.$gameMap.adjustX(coord.xMap) * tileW + tileW / 2);
                targetY = Math.round(window.$gameMap.adjustY(coord.yMap) * tileH + tileH / 2);
            } else if (coord.x !== undefined && coord.y !== undefined) {
                targetX = Number(coord.x) || 0;
                targetY = Number(coord.y) || 0;
            }

            // Place la fenêtre au-dessus ou en dessous de la cible avec marge
            if (targetY > boxH / 2) {
                winY = targetY - winH - 30;
            } else {
                winY = targetY + 30;
            }
            winX = targetX - Math.round(winW / 2);
        }
        // Sinon : centrage par défaut

        // Garde-fous stricts : la fenêtre et son titre doivent être intégralement contenus dans l'écran
        if (winY + winH > boxH - pad) {
            winY = boxH - winH - pad;
        }
        if (winY - topPadding < pad) {
            winY = topPadding + pad;
        }
        if (winX + totalW > boxW - pad) {
            winX = boxW - totalW - pad;
        }
        if (winX < pad) {
            winX = pad;
        }

        this.move(winX, winY, winW, winH);
        this.createContents();

        if (this._promptSprite) {
            this._promptSprite.x = winW - this.padding - 6;
            this._promptSprite.y = winH - this.padding - 4;
        }
        if (this._disableButtonSprite) {
            this._disableButtonSprite.x = this.padding + 6;
            this._disableButtonSprite.y = winH - this.padding - 4;
        }
    };

    Window_Tuto.prototype.refresh = function () {
        if (!this.contents) return;
        this.contents.clear();
        if (!this._tutoData) return;

        const cw = this.contentsWidth();
        let curY = 8; // Marge haute du corps

        // 1. Corps du texte enveloppé (rendu unifié pour préserver les codes d'échappement comme \c[x] entre les lignes)
        const lines = this._wrappedLines || [];
        const bodyLineHeight = (typeof this.lineHeight === "function") ? this.lineHeight() : 36;
        const maxTextW = cw - 20;

        if (lines.length > 0) {
            const fullText = lines.join("\n");
            this.drawTextEx(fullText, 10, curY, maxTextW);
            curY += lines.length * bodyLineHeight;
        }

        // 2. Illustration optionnelle
        if (this._illustrationBitmap && this._illustrationBitmap.isReady()) {
            curY += 8;
            const imgW = this._illustrationBitmap.width || 48;
            const imgH = this._illustrationBitmap.height || 48;
            const imgX = Math.round((cw - imgW) / 2);
            this.contents.blt(this._illustrationBitmap, 0, 0, imgW, imgH, imgX, curY);
        }
    };

    Window_Tuto.prototype.close = function () {
        Window_Base.prototype.close.call(this);
        if (this._nameWindow) {
            this._nameWindow.close();
        }
        if (this._confirmWindow && (this._confirmWindow.openness > 0 || (typeof this._confirmWindow.isOpen === "function" && this._confirmWindow.isOpen()))) {
            this._confirmWindow.close();
            this._confirmWindow.deactivate();
        }
    };

    Window_Tuto.prototype.update = function () {
        Window_Base.prototype.update.call(this);
        if (!this.visible || this.openness === 0) return;

        // Priorité absolue à la fenêtre modale de confirmation
        if (this._confirmWindow && (this._confirmWindow.openness > 0 || (typeof this._confirmWindow.isOpen === "function" && this._confirmWindow.isOpen()))) {
            if (!this._confirmWindow.parent || this._confirmWindow.parent === this) {
                this._confirmWindow.update();
            }
            return;
        }

        // Synchronise la fenêtre de titre enfant
        if (this._nameWindow) {
            this._nameWindow.openness = this.openness;
            this._nameWindow.update();
        }

        // Pulsation subtile de l'invite de touche
        if (this._promptSprite) {
            this._promptTimer++;
            this._promptSprite.opacity = 160 + Math.sin(this._promptTimer * 0.1) * 80;
        }

        // Mise à jour de l'état / survol du bouton de désactivation
        this.updateDisableButton();

        // Clic sur le bouton de désactivation : ouvre la confirmation sans fermer le tuto
        if (this.isDisableButtonClicked()) {
            if (typeof TouchInput !== "undefined" && typeof TouchInput.clear === "function") {
                TouchInput.clear();
            }
            this.openConfirmWindow();
            return;
        }

        // Détection de la touche de validation ou clic de fermeture du didacticiel
        if (Input.isTriggered("ok") || Input.isTriggered("cancel") || TouchInput.isTriggered()) {
            if (typeof SoundManager !== "undefined" && SoundManager.playOk) {
                SoundManager.playOk();
            }
            this.close();
            if (this._nameWindow) {
                this._nameWindow.close();
            }
            if (this._arrowSprite) {
                this._arrowSprite.setup(null);
            }
            if (window.$tutoManager && typeof window.$tutoManager.closeCurrent === "function") {
                window.$tutoManager.closeCurrent();
            }
            if (typeof TouchInput !== "undefined" && typeof TouchInput.clear === "function") {
                TouchInput.clear();
            }
            if (typeof SceneManager !== "undefined" && SceneManager._scene && typeof SceneManager._scene.activateTouchReleaseGuard === "function") {
                SceneManager._scene.activateTouchReleaseGuard(8);
            }
        }
    };

    window.Sprite_TutoArrow = Sprite_TutoArrow;
    window.Window_TutoName = Window_TutoName;
    window.Window_TutoConfirm = Window_TutoConfirm;
    window.Window_Tuto = Window_Tuto;

})();
