//=============================================================================
// SC4_BubbleMessage.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Fenêtre de message flottante (Bubble Message) et positionnement contextuel.
 * @author SimCraft
 * 
 * @param defaultFontFace
 * @text Police par défaut
 * @desc Nom de famille ou fichier de police dans fonts/ (ex: BD.ttf ou BD).
 * @default BD.ttf
 * 
 * @param defaultFontSize
 * @text Taille de police par défaut
 * @type number
 * @desc Taille de la police en pixels (0 pour la taille standard du système).
 * @default 0
 * 
 * @param defaultWindowskin
 * @text Habillage (Windowskin)
 * @desc Nom de l'image d'habillage dans img/system/ (ex: Window_Bubble ou Window).
 * @default Window_Bubble
 * 
 * @param verticalGapTop
 * @text Décalage vertical haut
 * @type number
 * @desc Espace en pixels entre la bulle et la tête de la cible quand la bulle est au-dessus.
 * @default 14
 * 
 * @param verticalGapBottom
 * @text Décalage vertical bas
 * @type number
 * @desc Espace en pixels entre les pieds de la cible et la bulle quand la bulle est en-dessous.
 * @default 14
 * 
 * @param defaultPadding
 * @text Marges internes (Padding)
 * @type number
 * @desc Marges internes de la fenêtre de bulle en pixels.
 * @default 12
 * 
 * @param defaultBackOpacity
 * @text Opacité du fond
 * @type number
 * @min 0
 * @max 255
 * @desc Opacité de l'arrière-plan de la bulle (0 = transparent, 255 = opaque).
 * @default 240
 * 
 * @param minWidth
 * @text Largeur minimale
 * @type number
 * @desc Largeur minimale de la bulle en pixels.
 * @default 120
 * 
 * @param minHeight
 * @text Hauteur minimale
 * @type number
 * @desc Hauteur minimale de la bulle en pixels.
 * @default 64
 * 
 * @param maxWidthPercent
 * @text Largeur maximale (%)
 * @type number
 * @decimals 2
 * @desc Pourcentage maximal de la largeur d'écran (0.85 = 85%).
 * @default 0.85
 * 
 * @param maxHeightPercent
 * @text Hauteur maximale (%)
 * @type number
 * @decimals 2
 * @desc Pourcentage maximal de la hauteur d'écran (0.80 = 80%).
 * @default 0.80
 * 
 * @param preloadFonts
 * @text Polices à pré-charger
 * @type string[]
 * @desc Liste des fichiers de polices à précharger au démarrage depuis le dossier fonts/ (ex: ["BD.ttf"]).
 * @default ["BD.ttf"]
 * 
 * @param enableOutline
 * @text Activer l'Outline (Ombre)
 * @type boolean
 * @desc Active ou désactive le contour/ombre des lettres en mode bulle (true = avec contour, false = sans contour).
 * @default false
 * 
 * @param defaultOutlineWidth
 * @text Épaisseur de l'Outline
 * @type number
 * @min 0
 * @max 10
 * @desc Épaisseur du contour des lettres en pixels si activé (0 = aucun contour, 3 = standard RMMZ).
 * @default 0
 * 
 * @param outlineColor
 * @text Couleur de l'Outline
 * @type string
 * @desc Couleur du contour (laisser vide pour la couleur par défaut RMMZ 'rgba(0, 0, 0, 0.6)').
 * @default 
 * 
 * @help
 * ============================================================================
 * SC4_BubbleMessage.js
 * ============================================================================
 * Fenêtre de message flottante (Window_BubbleMsg extends Window_Message) :
 * 
 * 1. Flags de message :
 *    - \A           : Cible le joueur ($gamePlayer).
 *    - \E[EVENT_ID] : Cible l'événement désigné par son ID (avec edge clamping).
 *    - \PX[X], \PY[Y] : Cible des coordonnées d'écran (X, Y).
 *    - \L[KEY]      : Texte traduit dynamiquement via SC4_Localization.
 * 
 * 2. Comportement contextuel :
 *    - Mode bulle automatique dès présence d'un flag (\A, \E, \PX, \PY) ou
 *      activation globale via $gameSystem.setBubbleMessageMode(true/false).
 *    - Suivi continu de la cible sur la carte et recalibrage des dimensions.
 * ============================================================================
 */

(() => {
    "use strict";

    const pluginName = "SC4_BubbleMessage";
    const rawParams = PluginManager.parameters(pluginName);

    class Window_BubbleMsg extends Window_Message {
        /**
         * Configuration par défaut des bulles de message.
         */
        static _config = {
            fontFace: parseString(rawParams["defaultFontFace"], "BD.ttf"),
            fontSize: parseNumber(rawParams["defaultFontSize"], 0),
            windowskin: parseString(rawParams["defaultWindowskin"], "Window_Bubble"),
            verticalGapTop: parseNumber(rawParams["verticalGapTop"], 14),
            verticalGapBottom: parseNumber(rawParams["verticalGapBottom"], 14),
            verticalGap: 14,
            padding: parseNumber(rawParams["defaultPadding"], 12),
            backOpacity: parseNumber(rawParams["defaultBackOpacity"], 240),
            minWidth: parseNumber(rawParams["minWidth"], 120),
            minHeight: parseNumber(rawParams["minHeight"], 64),
            maxWidthPercent: parseNumber(rawParams["maxWidthPercent"], 0.85),
            maxHeightPercent: parseNumber(rawParams["maxHeightPercent"], 0.80),
            preloadFonts: parsePreloadFonts(rawParams["preloadFonts"]),
            enableOutline: parseBoolean(rawParams["enableOutline"], false),
            outlineWidth: parseNumber(rawParams["defaultOutlineWidth"], 0),
            outlineColor: parseString(rawParams["outlineColor"], "")
        };

        /**
         * Précharge la liste des polices configurées.
         */
        static preloadConfiguredFonts() {
            const list = this._config.preloadFonts || [];
            for (const font of list) {
                this.resolveFontFace(font);
            }
            if (this._config.fontFace) {
                this.resolveFontFace(this._config.fontFace);
            }
            if (this._config.windowskin) {
                const skinName = this._config.windowskin.replace(/\.png$/i, "");
                ImageManager.loadSystem(skinName);
            }
        }

        /**
         * Résout et précharge le fichier/nom de police.
         * @param {string} fontFace 
         * @returns {string} Nom de famille CSS résolu
         */
        static resolveFontFace(fontFace) {
            if (!fontFace || typeof fontFace !== "string") return "";
            const trimmed = fontFace.trim();
            let family = trimmed;
            let filename = trimmed;

            const extMatch = trimmed.match(/\.(ttf|otf|woff|woff2)$/i);
            if (extMatch) {
                family = trimmed.slice(0, -extMatch[0].length);
            } else {
                filename = trimmed + ".ttf";
            }

            FontManager.load(family, filename);

            if (typeof FontFace !== "undefined" && typeof document !== "undefined" && document.fonts) {
                try {
                    if (!document.fonts.check(`12px "${family}"`)) {
                        const font = new FontFace(family, `url(fonts/${filename})`);
                        font.load().then(loaded => {
                            document.fonts.add(loaded);
                        }).catch(() => {});
                    }
                } catch (e) {}
            }

            return family;
        }

        /**
         * Définit la configuration globale des bulles.
         * @param {Object} cfg 
         */
        static setConfig(cfg) {
            this._config = Object.assign(this._config, cfg || {});
            if (cfg && cfg.fontFace) {
                this.resolveFontFace(cfg.fontFace);
            }
            if (cfg && cfg.preloadFonts) {
                const arr = parsePreloadFonts(cfg.preloadFonts);
                arr.forEach(f => this.resolveFontFace(f));
            }
            if (cfg && cfg.windowskin) {
                const skinName = cfg.windowskin.replace(/\.png$/i, "");
                ImageManager.loadSystem(skinName);
            }
        }

        /**
         * Retourne une copie de la configuration globale.
         * @returns {Object}
         */
        static getConfig() {
            return Object.assign({}, this._config);
        }

        /**
         * Réinitialise la configuration globale aux paramètres de base.
         */
        static resetConfig() {
            this._config = {
                fontFace: parseString(rawParams["defaultFontFace"], ""),
                fontSize: parseNumber(rawParams["defaultFontSize"], 0),
                windowskin: parseString(rawParams["defaultWindowskin"], "Window_Bubble"),
                verticalGapTop: parseNumber(rawParams["verticalGapTop"], 14),
                verticalGapBottom: parseNumber(rawParams["verticalGapBottom"], 14),
                verticalGap: 14,
                padding: parseNumber(rawParams["defaultPadding"], 12),
                backOpacity: parseNumber(rawParams["defaultBackOpacity"], 240),
                minWidth: parseNumber(rawParams["minWidth"], 120),
                minHeight: parseNumber(rawParams["minHeight"], 64),
                maxWidthPercent: parseNumber(rawParams["maxWidthPercent"], 0.85),
                maxHeightPercent: parseNumber(rawParams["maxHeightPercent"], 0.80),
                preloadFonts: parsePreloadFonts(rawParams["preloadFonts"]),
                enableOutline: parseBoolean(rawParams["enableOutline"], false),
                outlineWidth: parseNumber(rawParams["defaultOutlineWidth"], 0),
                outlineColor: parseString(rawParams["outlineColor"], "")
            };
        }

        constructor(rect) {
            super(rect);
            if (!this._vanillaRect && rect) {
                this.initialize(rect);
            }
        }

        initialize(rect) {
            super.initialize(rect);
            this._mapTarget = null;
            this._isBubbleMode = false;
            this._vanillaRect = rect ? new Rectangle(rect.x, rect.y, rect.width, rect.height) : new Rectangle(0, 0, 0, 0);
            this._instanceConfig = {};
            this._bubbleArrowSprite = null;
            const cfg = this.currentConfig();
            if (cfg.windowskin) {
                const skinName = cfg.windowskin.replace(/\.png$/i, "");
                ImageManager.loadSystem(skinName);
            }
            this.createBubbleArrow();
        }

        createBubbleArrow() {
            if (typeof Sprite === "undefined" || typeof ImageManager === "undefined") return;
            const bitmap = ImageManager.loadSystem("WindowArrow");
            const arrow = new Sprite(bitmap);
            if (arrow.anchor && typeof arrow.anchor.set === "function") {
                arrow.anchor.set(0.5, 0);
            }
            arrow.visible = false;
            this._bubbleArrowSprite = arrow;
            this.addChild(arrow);
        }

        /**
         * Retourne la configuration active pour cette instance.
         * @returns {Object}
         */
        currentConfig() {
            const sysConfig = $gameSystem ? $gameSystem.getBubbleConfig() : {};
            return Object.assign({}, Window_BubbleMsg._config, sysConfig, this._instanceConfig);
        }

        mapTarget() {
            return this._mapTarget;
        }

        setMapTarget(target) {
            if (!target) {
                this._mapTarget = null;
                return;
            }
            if (typeof target.screenX === "function" && typeof target.screenY === "function") {
                this._mapTarget = target;
            } else if (typeof target.x === "number" && typeof target.y === "number") {
                this._mapTarget = { x: target.x, y: target.y, isCoords: true };
            } else {
                this._mapTarget = null;
            }
        }

        /**
         * Analyse et extrait les flags de bulle (\A, \E[id], \PX[x], \PY[y]).
         * @param {string} text 
         * @returns {{cleanText: string, isBubble: boolean, target: any}}
         */
        parseBubbleFlags(text) {
            if (typeof text !== "string") {
                return { cleanText: text, isBubble: false, target: null };
            }

            if (typeof SC4_Localization !== "undefined") {
                text = SC4_Localization.parse(text);
            }

            let isBubble = false;
            let target = null;
            let px = null;
            let py = null;

            // Flag \A : Joueur
            let clean = text.replace(/(?:\x1b|\\)[Aa](\s*)/g, () => {
                isBubble = true;
                target = $gamePlayer;
                return "";
            });

            // Flag \E[id] : Événement
            clean = clean.replace(/(?:\x1b|\\)[Ee]\[(\d+)\](\s*)/g, (match, p1) => {
                isBubble = true;
                const eventId = parseInt(p1, 10);
                target = $gameMap.event(eventId);
                return "";
            });

            // Flags \PX[x] et \PY[y] : Coordonnées
            clean = clean.replace(/(?:\x1b|\\)[Pp][Xx]\[(\d+)\](\s*)/g, (match, p1) => {
                isBubble = true;
                px = parseInt(p1, 10);
                return "";
            });
            clean = clean.replace(/(?:\x1b|\\)[Pp][Yy]\[(\d+)\](\s*)/g, (match, p1) => {
                isBubble = true;
                py = parseInt(p1, 10);
                return "";
            });

            if (px !== null || py !== null) {
                target = { x: px !== null ? px : 0, y: py !== null ? py : 0, isCoords: true };
            }

            return { cleanText: clean, isBubble, target };
        }

        startMessage() {
            const rawText = $gameMessage.allText();
            const parsed = this.parseBubbleFlags(rawText);

            const isSystemBubble = $gameSystem ? $gameSystem.isBubbleMessageMode() : false;
            this._isBubbleMode = parsed.isBubble || isSystemBubble;

            if (this._isBubbleMode) {
                let target = parsed.target;
                if (!target && $gameSystem && $gameSystem.bubbleTarget) {
                    target = $gameSystem.bubbleTarget;
                }
                if (!target && this._mapTarget) {
                    target = this._mapTarget;
                }
                if (!target && $gameMap) {
                    const eventId = ($gameMap._interpreter && $gameMap._interpreter.eventId)
                        ? $gameMap._interpreter.eventId()
                        : 0;
                    target = eventId > 0 ? $gameMap.event(eventId) : $gamePlayer;
                }
                this._mapTarget = target;
                this.loadWindowskin();
                this.updateBackOpacity();
                this.adjustBubbleSize(parsed.cleanText);
                this.updateBubblePlacement();
                if (this.isClosing()) {
                    this._closing = false;
                }
                this.openness = 0;
            } else {
                this._mapTarget = null;
                this.resetToVanillaRect();
            }

            const textState = this.createTextState(parsed.cleanText, 0, 0, 0);
            textState.x = this.newLineX(textState);
            textState.startX = textState.x;
            this._textState = textState;
            this.newPage(this._textState);
            this.updatePlacement();
            this.updateBackground();
            this.open();
            if (this._nameBoxWindow) {
                this._nameBoxWindow.start();
            }
        }

        adjustBubbleSize(cleanText) {
            const cfg = this.currentConfig();
            const pad = cfg.padding !== undefined ? cfg.padding : 12;
            this.padding = pad;

            const size = this.textSizeEx(cleanText);

            let w = size.width + pad * 2 + 16;
            let h = size.height + pad * 2 + 8;

            const boxW = Graphics.boxWidth || 1280;
            const boxH = Graphics.boxHeight || 720;

            const minW = cfg.minWidth || 120;
            const minH = cfg.minHeight || 64;
            const maxW = Math.floor(boxW * (cfg.maxWidthPercent || 0.85));
            const maxH = Math.floor(boxH * (cfg.maxHeightPercent || 0.8));

            w = Math.max(minW, Math.min(maxW, Math.ceil(w)));
            h = Math.max(minH, Math.min(maxH, Math.ceil(h)));

            this.width = w;
            this.height = h;

            this.createContents();
            if (typeof this._refreshPauseSignArea === "function") {
                this._refreshPauseSignArea();
            }
        }

        checkToSeeIfFaceExists() {
            return false;
        }

        drawMessageFace() {
            // Désactivé : géré par les HUDs dédiés
        }

        updatePlacement() {
            if (!this._isBubbleMode || !this._mapTarget) {
                super.updatePlacement();
                const boxW = Graphics.boxWidth || 1280;
                this.x = Math.floor((boxW - this.width) / 2);
                return;
            }
            this.updateBubblePlacement();
        }

        updateBubblePlacement() {
            const coords = this.getTargetCoordinates(this._mapTarget);
            if (!coords) {
                super.updatePlacement();
                return;
            }

            const cfg = this.currentConfig();
            const gapTop = cfg.verticalGapTop !== undefined 
                ? cfg.verticalGapTop 
                : (cfg.verticalGap !== undefined ? cfg.verticalGap : 14);
            const gapBottom = cfg.verticalGapBottom !== undefined 
                ? cfg.verticalGapBottom 
                : (cfg.verticalGap !== undefined ? cfg.verticalGap : 14);
            const margin = 8;
            const boxW = Graphics.boxWidth || 1280;
            const boxH = Graphics.boxHeight || 720;

            const targetX = coords.x;
            const targetY = coords.y;

            const idealX = targetX - Math.floor(this.width / 2);
            const minX = margin;
            const maxX = boxW - this.width - margin;
            this.x = Math.max(minX, Math.min(maxX, idealX));

            const posType = $gameMessage.positionType();
            const targetHeadY = coords.isCoords ? targetY : (targetY - 48);

            let idealY;
            if (posType === 0) {
                idealY = targetHeadY - this.height - gapTop;
                if (idealY < margin && (targetY + gapBottom + this.height <= boxH - margin)) {
                    idealY = targetY + gapBottom;
                }
            } else if (posType === 1) {
                idealY = targetY - Math.floor(this.height / 2) - 24;
            } else {
                idealY = targetY + gapBottom;
                if (idealY + this.height > boxH - margin && (targetHeadY - this.height - gapTop >= margin)) {
                    idealY = targetHeadY - this.height - gapTop;
                }
            }

            const minY = margin;
            const maxY = boxH - this.height - margin;
            this.y = Math.max(minY, Math.min(maxY, idealY));

            if (this._goldWindow) {
                this._goldWindow.y = this.y > 0 ? 0 : boxH - this._goldWindow.height;
            }
            if (this._nameBoxWindow && this._nameBoxWindow.isOpen()) {
                this._nameBoxWindow.x = this.x;
                this._nameBoxWindow.y = Math.max(0, this.y - this._nameBoxWindow.height);
            }
            this.updateBubbleArrow(coords);
        }

        updateBubbleArrow(coords) {
            const arrow = this._bubbleArrowSprite;
            if (!arrow) return;
            if (!this._isBubbleMode || !coords || !this.visible || this.openness < 180) {
                arrow.visible = false;
                return;
            }

            const edgePad = Math.min(26, Math.max(12, Math.floor(this.width / 4)));
            const localTargetX = coords.x - this.x;
            arrow.x = Math.round(Math.max(edgePad, Math.min(this.width - edgePad, localTargetX)));

            const bubbleCenterY = this.y + (this.height / 2);
            const targetAnchorY = coords.isCoords ? coords.y : (coords.y - 24);
            const isBubbleAbove = bubbleCenterY <= targetAnchorY;
            const scaleX = (coords.x > this.x + (this.width / 2)) ? -1 : 1;

            if (isBubbleAbove) {
                arrow.y = this.height - 4;
                if (arrow.scale && typeof arrow.scale.set === "function") {
                    arrow.scale.set(scaleX, 1);
                } else if (arrow.scale) {
                    arrow.scale.x = scaleX;
                    arrow.scale.y = 1;
                }
            } else {
                arrow.y = 4;
                if (arrow.scale && typeof arrow.scale.set === "function") {
                    arrow.scale.set(scaleX, -1);
                } else if (arrow.scale) {
                    arrow.scale.x = scaleX;
                    arrow.scale.y = -1;
                }
            }
            arrow.visible = true;
        }

        getTargetCoordinates(target) {
            if (!target) return null;
            if (typeof target.screenX === "function" && typeof target.screenY === "function") {
                return { x: target.screenX(), y: target.screenY(), isCoords: false };
            }
            if (typeof target.x === "number" && typeof target.y === "number") {
                return { x: target.x, y: target.y, isCoords: true };
            }
            return null;
        }

        open() {
            if (this._isBubbleMode) {
                this.loadWindowskin();
                this.updateBackOpacity();
                this.updatePlacement();
            }
            super.open();
            if (this._isBubbleMode && this._mapTarget) {
                this.updateBubbleArrow(this.getTargetCoordinates(this._mapTarget));
            }
        }

        close() {
            if (this._bubbleArrowSprite) {
                this._bubbleArrowSprite.visible = false;
            }
            super.close();
        }

        checkToNotClose() {
            if (this._isBubbleMode) {
                return;
            }
            super.checkToNotClose();
        }

        update() {
            super.update();
            if (this._isBubbleMode && this._mapTarget && (this.isOpen() || this.isOpening())) {
                this.updateBubblePlacement();
            }
        }

        updateClose() {
            super.updateClose();
            if (this._bubbleArrowSprite && this.openness < 180) {
                this._bubbleArrowSprite.visible = false;
            }
            if (this.isClosed() && this._isBubbleMode) {
                this._isBubbleMode = false;
                this.resetToVanillaRect();
            }
        }

        terminateMessage() {
            super.terminateMessage();
            this._mapTarget = null;
            if (this._bubbleArrowSprite) {
                this._bubbleArrowSprite.visible = false;
            }
            if (this.isClosed()) {
                this._isBubbleMode = false;
                this.resetToVanillaRect();
            }
        }

        resetToVanillaRect() {
            if (this._bubbleArrowSprite) {
                this._bubbleArrowSprite.visible = false;
            }
            if (this._vanillaRect) {
                this.x = this._vanillaRect.x;
                this.y = this._vanillaRect.y;
                this.width = this._vanillaRect.width;
                this.height = this._vanillaRect.height;
                this.padding = $gameSystem ? $gameSystem.windowPadding() : 12;
                this.loadWindowskin();
                this.updateBackOpacity();
                this.createContents();
            }
        }

        isOutlineEnabled() {
            const cfg = this.currentConfig();
            if (cfg.enableOutline !== undefined) return Boolean(cfg.enableOutline);
            if (cfg.outline !== undefined) return Boolean(cfg.outline);
            if (cfg.enableTextShadow !== undefined) return Boolean(cfg.enableTextShadow);
            if (cfg.textShadow !== undefined) return Boolean(cfg.textShadow);
            if (typeof cfg.outlineWidth === "number") return cfg.outlineWidth > 0;
            return false;
        }

        currentOutlineWidth() {
            if (!this.isOutlineEnabled()) return 0;
            const cfg = this.currentConfig();
            if (typeof cfg.outlineWidth === "number" && cfg.outlineWidth > 0) {
                return cfg.outlineWidth;
            }
            return 3;
        }

        currentOutlineColor() {
            if (!this.isOutlineEnabled()) return "rgba(0, 0, 0, 0)";
            const cfg = this.currentConfig();
            if (cfg.outlineColor && typeof cfg.outlineColor === "string") {
                return cfg.outlineColor;
            }
            return ColorManager.outlineColor();
        }

        resetFontSettings() {
            super.resetFontSettings();
            if (this._isBubbleMode && this.contents) {
                const cfg = this.currentConfig();
                if (cfg.fontFace) {
                    this.contents.fontFace = Window_BubbleMsg.resolveFontFace(cfg.fontFace);
                }
                if (cfg.fontSize > 0) {
                    this.contents.fontSize = cfg.fontSize;
                }
                this.contents.outlineWidth = this.currentOutlineWidth();
                this.contents.outlineColor = this.currentOutlineColor();
            }
        }

        resetTextColor() {
            super.resetTextColor();
            if (this._isBubbleMode && this.contents) {
                this.contents.outlineWidth = this.currentOutlineWidth();
                this.contents.outlineColor = this.currentOutlineColor();
            }
        }

        lineHeight() {
            if (this._isBubbleMode) {
                const cfg = this.currentConfig();
                if (cfg.fontSize > 0) {
                    return Math.max(16, cfg.fontSize + 8);
                }
            }
            return super.lineHeight();
        }

        calcTextHeight(textState) {
            if (this._isBubbleMode) {
                const cfg = this.currentConfig();
                const baseFontSize = (cfg.fontSize > 0) ? cfg.fontSize : $gameSystem.mainFontSize();
                const lineSpacing = Math.max(0, this.lineHeight() - baseFontSize);
                const lastFontSize = this.contents.fontSize;
                const lines = textState.text.slice(textState.index).split("\n");
                const textHeight = this.maxFontSizeInLine(lines[0]) + lineSpacing;
                this.contents.fontSize = lastFontSize;
                return Math.max(textHeight, this.lineHeight());
            }
            return super.calcTextHeight(textState);
        }

        standardFontFace() {
            const cfg = this.currentConfig();
            if (this._isBubbleMode && cfg.fontFace) {
                return Window_BubbleMsg.resolveFontFace(cfg.fontFace);
            }
            return super.standardFontFace ? super.standardFontFace() : $gameSystem.mainFontFace();
        }

        standardFontSize() {
            const cfg = this.currentConfig();
            if (this._isBubbleMode && cfg.fontSize > 0) {
                return cfg.fontSize;
            }
            return super.standardFontSize ? super.standardFontSize() : $gameSystem.mainFontSize();
        }

        loadWindowskin() {
            const cfg = this.currentConfig();
            if (this._isBubbleMode && cfg.windowskin) {
                const skinName = cfg.windowskin.replace(/\.png$/i, "");
                this.windowskin = ImageManager.loadSystem(skinName);
            } else {
                super.loadWindowskin();
            }
        }

        updateBackOpacity() {
            const cfg = this.currentConfig();
            if (this._isBubbleMode && cfg.backOpacity !== undefined) {
                this.backOpacity = cfg.backOpacity;
            } else {
                super.updateBackOpacity();
            }
        }
    }

    window.Window_BubbleMsg = Window_BubbleMsg;
    Window_BubbleMsg.preloadConfiguredFonts();
    if (typeof module !== "undefined" && module.exports) {
        module.exports = Window_BubbleMsg;
    }
})();
