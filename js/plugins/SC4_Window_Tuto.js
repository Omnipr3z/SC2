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
     */
    Sprite_TutoArrow.prototype.updatePosition = function () {
        if (!this._targetData) return;

        let targetX = 0;
        let targetY = 0;

        if (this._targetData.xMap !== undefined && this._targetData.yMap !== undefined) {
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

        const rad = (this._baseAngle * Math.PI) / 180;
        // Oscillation le long de l'axe de la flèche (recul puis poussée vers la pointe)
        const bounceOffset = -Math.abs(Math.sin(this._tick * 0.1) * 8);

        this.x = targetX + Math.sin(rad) * bounceOffset;
        this.y = targetY - Math.cos(rad) * bounceOffset;
        this.rotation = rad;
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
        const rect = new Rectangle(0, 0, 480, 220);
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
        this.createPromptSprite();
    };

    Window_Tuto.prototype.loadWindowskin = function () {
        this.windowskin = ImageManager.loadSystem("WindowTuto");
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

        // Joue le jingle sonore
        if (typeof AudioManager !== "undefined" && AudioManager.playSe) {
            AudioManager.playSe({ name: "Neon", volume: 75, pitch: 100, pan: 0 });
        }

        // Précharge l'illustration si définie
        if (tutoData.img) {
            const imgKey = String(tutoData.img).replace(/\.png$/i, "");
            this._illustrationBitmap = ImageManager.loadBitmap("img/GUI/tuto/", imgKey);
            if (!this._illustrationBitmap.isReady()) {
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
        this.visible = true;
        this.activate();
    };

    /**
     * Découpe et enveloppe le texte en lignes respectant la largeur maximale sans couper les mots.
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
                // Prise en compte de la largeur des icônes s'il y en a (\I[x] = ~34px)
                const iconMatches = (testLine.match(/\\[Ii]\[\d+\]/g) || []).length + (testLine.match(/\x1b[Ii]\[\d+\]/g) || []).length;
                const testWidth = this.textWidth(cleanTest) + (iconMatches * 34);

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

        // Largeur de lecture confortable max pour le texte
        const maxContentW = Math.min(560, boxW - 80);

        if (this.contents) {
            this.contents.fontSize = 18;
        }

        const rawTxt = this._tutoData.txt || "";
        const parsedTxt = (typeof SC4_Localization !== "undefined") ? SC4_Localization.parse(rawTxt) : rawTxt;

        // Calcul des lignes enveloppées
        const lines = this.computeWrappedLines(parsedTxt, maxContentW);
        this._wrappedLines = lines;

        // Mesure de la largeur max réelle nécessaire
        let maxLineWidth = 0;
        for (const line of lines) {
            const cleanLine = line.replace(/\x1b[A-Za-z]+(\[.*?\])?/g, "").replace(/\\[A-Za-z]+(\[.*?\])?/g, "");
            const iconMatches = (line.match(/\\[Ii]\[\d+\]/g) || []).length + (line.match(/\x1b[Ii]\[\d+\]/g) || []).length;
            const w = this.textWidth(cleanLine) + (iconMatches * 34);
            if (w > maxLineWidth) maxLineWidth = w;
        }

        // Largeur du titre (s'il y en a un)
        let titleW = 0;
        if (this._tutoData.name) {
            if (this.contents) this.contents.fontSize = 20;
            const parsedTitle = (typeof SC4_Localization !== "undefined") ? SC4_Localization.parse(this._tutoData.name) : this._tutoData.name;
            titleW = this.textWidth(parsedTitle) + 40;
            if (this.contents) this.contents.fontSize = 18;
        }

        // Largeur de contenu souhaitée (au minimum 380px pour une bonne ergonomie)
        const desiredContentW = Math.max(maxLineWidth, titleW, 360);
        const winW = Math.min(boxW - 40, Math.max(400, desiredContentW + this.padding * 2 + 20));

        // Calcul de la hauteur proportionnée
        const bodyLineHeight = 26;
        const bodyH = Math.max(bodyLineHeight, lines.length * bodyLineHeight);
        const titleH = this._tutoData.name ? 38 : 0;
        const imgH = this._illustrationBitmap ? ((this._illustrationBitmap.height || 48) + 16) : 0;
        const promptH = 26;
        const totalPadding = this.padding * 2 + 16;

        const winH = Math.min(boxH - 40, titleH + bodyH + imgH + promptH + totalPadding);

        let winX = Math.round((boxW - winW) / 2);
        let winY = Math.round((boxH - winH) / 2);

        const coord = this._tutoData.coord;
        if (coord) {
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

            // Garde-fous limites d'écran
            winX = Math.max(16, Math.min(boxW - winW - 16, winX));
            winY = Math.max(16, Math.min(boxH - winH - 16, winY));
        }

        this.move(winX, winY, winW, winH);
        this.createContents();

        if (this._promptSprite) {
            this._promptSprite.x = winW - this.padding - 4;
            this._promptSprite.y = winH - this.padding - 2;
        }
    };

    Window_Tuto.prototype.refresh = function () {
        if (!this.contents) return;
        this.contents.clear();
        if (!this._tutoData) return;

        const cw = this.contentsWidth();
        let curY = 4;

        // 1. Titre du tutoriel
        if (this._tutoData.name) {
            this.contents.fontSize = 20;
            this.changeTextColor("#00eeff");
            this.contents.fontBold = true;
            const parsedTitle = (typeof SC4_Localization !== "undefined") ? SC4_Localization.parse(this._tutoData.name) : this._tutoData.name;
            this.drawText(parsedTitle, 0, curY, cw, "center");
            this.contents.fontBold = false;
            this.resetTextColor();
            curY += 28;

            // Ligne de séparation subtile
            this.contents.fillRect(16, curY, cw - 32, 1, "#00eeff");
            curY += 10;
        }

        // 2. Corps du texte enveloppé
        const lines = this._wrappedLines || [];
        const bodyLineHeight = 26;
        this.contents.fontSize = 18;
        this.resetTextColor();

        for (const line of lines) {
            if (line) {
                this.drawTextEx(line, 10, curY, cw - 20);
            }
            curY += bodyLineHeight;
        }

        // 3. Illustration optionnelle
        if (this._illustrationBitmap && this._illustrationBitmap.isReady()) {
            curY += 6;
            const imgW = this._illustrationBitmap.width || 48;
            const imgH = this._illustrationBitmap.height || 48;
            const imgX = Math.round((cw - imgW) / 2);
            this.contents.blt(this._illustrationBitmap, 0, 0, imgW, imgH, imgX, curY);
        }
    };

    Window_Tuto.prototype.update = function () {
        Window_Base.prototype.update.call(this);
        if (!this.visible || this.openness === 0) return;

        // Pulsation subtile de l'invite de touche
        if (this._promptSprite) {
            this._promptTimer++;
            this._promptSprite.opacity = 160 + Math.sin(this._promptTimer * 0.1) * 80;
        }

        // Détection de la touche de validation ou clic
        if (Input.isTriggered("ok") || Input.isTriggered("cancel") || TouchInput.isTriggered()) {
            if (typeof SoundManager !== "undefined" && SoundManager.playOk) {
                SoundManager.playOk();
            }
            this.close();
            if (this._arrowSprite) {
                this._arrowSprite.setup(null);
            }
            if (window.$tutoManager && typeof window.$tutoManager.closeCurrent === "function") {
                window.$tutoManager.closeCurrent();
            }
        }
    };

    window.Sprite_TutoArrow = Sprite_TutoArrow;
    window.Window_Tuto = Window_Tuto;

})();
