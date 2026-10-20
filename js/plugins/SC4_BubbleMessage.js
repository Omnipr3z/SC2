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
 * Ce plugin implémente un système de fenêtres de messages en bulle flottante
 * adaptées dynamiquement aux personnages et événements de la carte :
 * 
 * 1. Flags de message :
 *    - \A           : Cible le joueur ($gamePlayer).
 *    - \E[EVENT_ID] : Cible l'événement désigné par son ID.
 *                     Si l'événement est hors-écran, la bulle se place au plus
 *                     près sur le bord de l'écran (edge clamping).
 *    - \PX[X], \PY[Y] : Cible des coordonnées d'écran (X, Y).
 *    - \L[KEY]      : Texte traduit dynamiquement (résolu en priorité avant les
 *                     autres flags).
 * 
 * 2. Comportement contextuel et par défaut :
 *    - Par défaut, les fenêtres de messages s'affichent en mode vanilla standard.
 *    - Le mode bulle s'active automatiquement dès qu'un flag (\A, \E, \PX, \PY)
 *      est présent dans le message.
 *    - Il peut également être activé globalement à la volée via :
 *      $gameSystem.setBubbleMessageMode(true/false)
 * 
 * 3. Personnalisation de l'apparence :
 *    - Paramètres de plugin configurables dans le gestionnaire de plugins RMMZ.
 *    - Décalages verticaux haut et bas configurables séparément.
 *    - Préchargement automatique des fichiers de polices spécifiés.
 *    - Modifiable à tout moment via Window_BubbleMsg.setConfig({...}) ou
 *      $gameSystem.setBubbleConfig({...}).
 * ============================================================================
 */

(() => {
    "use strict";

    const pluginName = "SC4_BubbleMessage";
    const rawParams = (typeof PluginManager !== "undefined" && PluginManager.parameters)
        ? PluginManager.parameters(pluginName)
        : {};

    function parseNumber(val, defaultVal) {
        if (val === undefined || val === null || val === "") return defaultVal;
        const n = Number(val);
        return isNaN(n) ? defaultVal : n;
    }

    function parseString(val, defaultVal) {
        if (val === undefined || val === null || val === "") return defaultVal;
        return String(val).trim();
    }

    function parseBoolean(val, defaultVal) {
        if (val === undefined || val === null || val === "") return defaultVal;
        if (typeof val === "boolean") return val;
        const s = String(val).trim().toLowerCase();
        if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
        if (s === "false" || s === "0" || s === "no" || s === "off") return false;
        return defaultVal;
    }

    function parsePreloadFonts(raw) {
        if (!raw) return ["BD.ttf"];
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.map(s => String(s).trim()).filter(Boolean);
        } catch (e) {}
        if (typeof raw === "string") {
            return raw.split(",").map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
        }
        return ["BD.ttf"];
    }

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
            if (this._config.windowskin && typeof ImageManager !== "undefined") {
                const skinName = this._config.windowskin.replace(/\.png$/i, "");
                ImageManager.loadSystem(skinName);
            }
        }

        /**
         * Résout et précharge le fichier/nom de police.
         * Supporte "BD", "BD.ttf", "Neuropol.otf", etc.
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

            if (typeof FontManager !== "undefined" && FontManager.load) {
                FontManager.load(family, filename);
            }

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
            if (cfg && cfg.windowskin && typeof ImageManager !== "undefined") {
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
        const cfg = this.currentConfig();
        if (cfg.windowskin && typeof ImageManager !== "undefined") {
            const skinName = cfg.windowskin.replace(/\.png$/i, "");
            ImageManager.loadSystem(skinName);
        }
    }

    /**
     * Retourne la configuration active pour cette instance.
     * @returns {Object}
     */
    currentConfig() {
        const sysConfig = (typeof $gameSystem !== "undefined" && $gameSystem && $gameSystem.getBubbleConfig)
            ? $gameSystem.getBubbleConfig()
            : {};
        return Object.assign({}, Window_BubbleMsg._config, sysConfig, this._instanceConfig);
    }

    /**
     * Cible actuelle de la bulle.
     * @returns {any}
     */
    mapTarget() {
        return this._mapTarget;
    }

    /**
     * Définit manuellement la cible de la bulle.
     * @param {any} target ($gamePlayer, Game_Event, ou {x, y})
     */
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
     * Les flags \L[KEY] sont résolus en amont par SC4_Localization.
     * @param {string} text 
     * @returns {{cleanText: string, isBubble: boolean, target: any}}
     */
    parseBubbleFlags(text) {
        if (typeof text !== "string") {
            return { cleanText: text, isBubble: false, target: null };
        }

        // Localisation préalable si disponible
        if (typeof SC4_Localization !== "undefined" && SC4_Localization.parse) {
            text = SC4_Localization.parse(text);
        }

        let isBubble = false;
        let target = null;
        let px = null;
        let py = null;

        // Flag \A : Joueur (avec ou sans espace après)
        let clean = text.replace(/(?:\x1b|\\)[Aa](\s*)/g, () => {
            isBubble = true;
            target = (typeof $gamePlayer !== "undefined") ? $gamePlayer : null;
            return "";
        });

        // Flag \E[id] : Événement
        clean = clean.replace(/(?:\x1b|\\)[Ee]\[(\d+)\](\s*)/g, (match, p1) => {
            isBubble = true;
            const eventId = parseInt(p1, 10);
            target = (typeof $gameMap !== "undefined" && $gameMap && $gameMap.event)
                ? $gameMap.event(eventId)
                : null;
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

    /**
     * Démarre le traitement et l'affichage d'un nouveau message.
     */
    startMessage() {
        const rawText = $gameMessage.allText();
        const parsed = this.parseBubbleFlags(rawText);

        const isSystemBubble = (typeof $gameSystem !== "undefined" && $gameSystem && $gameSystem.isBubbleMessageMode)
            ? $gameSystem.isBubbleMessageMode()
            : false;

        this._isBubbleMode = parsed.isBubble || isSystemBubble;

        if (this._isBubbleMode) {
            let target = parsed.target;
            if (!target && typeof $gameSystem !== "undefined" && $gameSystem && $gameSystem.bubbleTarget) {
                target = $gameSystem.bubbleTarget;
            }
            if (!target && this._mapTarget) {
                target = this._mapTarget;
            }
            if (!target && typeof $gameMap !== "undefined" && $gameMap) {
                const eventId = ($gameMap._interpreter && $gameMap._interpreter.eventId)
                    ? $gameMap._interpreter.eventId()
                    : 0;
                target = eventId > 0
                    ? $gameMap.event(eventId)
                    : ((typeof $gamePlayer !== "undefined") ? $gamePlayer : null);
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

        // Création du textState avec le texte épuré des flags de positionnement
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
        this.updateDialogueHuds(parsed, rawText);
    }

    /**
     * Ajuste dynamiquement les dimensions de la fenêtre au contenu textuel.
     * Les facesets sont gérés par le HUD Joueur et l'Interlocuteur HUD (non dessinés dans la bulle).
     * @param {string} cleanText 
     */
    adjustBubbleSize(cleanText) {
        const cfg = this.currentConfig();
        const pad = cfg.padding !== undefined ? cfg.padding : 12;
        this.padding = pad;

        const size = (typeof this.textSizeEx === "function")
            ? this.textSizeEx(cleanText)
            : { width: 140, height: 48 };

        let w = size.width + pad * 2 + 16;
        let h = size.height + pad * 2 + 8;

        const boxW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
        const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;

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
        // Les visages ne sont pas dessinés dans les bulles mais gérés par les HUDs dédiés
    }

    /**
     * Met à jour le positionnement de la fenêtre.
     */
    updatePlacement() {
        if (!this._isBubbleMode || !this._mapTarget) {
            super.updatePlacement();
            // Centrage horizontal en mode vanilla si la fenêtre a été redimensionnée
            const boxW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
            this.x = Math.floor((boxW - this.width) / 2);
            return;
        }
        this.updateBubblePlacement();
    }

    /**
     * Positionne la bulle par rapport à la cible avec edge clamping si hors écran.
     */
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
        const boxW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
        const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;

        const targetX = coords.x;
        const targetY = coords.y;

        // Positionnement horizontal : centré sur la cible, clampé aux marges de l'écran
        const idealX = targetX - Math.floor(this.width / 2);
        const minX = margin;
        const maxX = boxW - this.width - margin;
        this.x = Math.max(minX, Math.min(maxX, idealX));

        // Positionnement vertical selon positionType (0=haut, 1=milieu, 2=bas)
        const posType = (typeof $gameMessage !== "undefined" && $gameMessage.positionType)
            ? $gameMessage.positionType()
            : 0;

        // Hauteur de la tête : si entité character (screenY est aux pieds), tête ~48px au-dessus
        const targetHeadY = coords.isCoords ? targetY : (targetY - 48);

        let idealY;
        if (posType === 0) {
            // Au-dessus de la tête : gapTop
            idealY = targetHeadY - this.height - gapTop;
            // Si pas assez de place en haut mais de la place en bas, basculer sous les pieds avec gapBottom
            if (idealY < margin && (targetY + gapBottom + this.height <= boxH - margin)) {
                idealY = targetY + gapBottom;
            }
        } else if (posType === 1) {
            // Centré sur le personnage
            idealY = targetY - Math.floor(this.height / 2) - 24;
        } else {
            // Sous les pieds : gapBottom
            idealY = targetY + gapBottom;
            // Si pas assez de place en bas mais de la place en haut, basculer au-dessus avec gapTop
            if (idealY + this.height > boxH - margin && (targetHeadY - this.height - gapTop >= margin)) {
                idealY = targetHeadY - this.height - gapTop;
            }
        }

        // Edge Clamping : Si la cible est hors-écran, coller la fenêtre au bord le plus proche
        const minY = margin;
        const maxY = boxH - this.height - margin;
        this.y = Math.max(minY, Math.min(maxY, idealY));

        // Ajustement des sous-fenêtres (or, nom)
        if (this._goldWindow) {
            this._goldWindow.y = this.y > 0 ? 0 : boxH - this._goldWindow.height;
        }
        if (this._nameBoxWindow && this._nameBoxWindow.isOpen && this._nameBoxWindow.isOpen()) {
            this._nameBoxWindow.x = this.x;
            this._nameBoxWindow.y = Math.max(0, this.y - this._nameBoxWindow.height);
        }
    }

    /**
     * Retourne les coordonnées écran de la cible.
     * @param {any} target 
     * @returns {{x: number, y: number, isCoords: boolean} | null}
     */
    getTargetCoordinates(target) {
        if (!target) return null;

        // Character / Event / Player avec screenX / screenY
        if (typeof target.screenX === "function" && typeof target.screenY === "function") {
            return { x: target.screenX(), y: target.screenY(), isCoords: false };
        }

        // Coordonnées brutes {x, y}
        if (typeof target.x === "number" && typeof target.y === "number") {
            return { x: target.x, y: target.y, isCoords: true };
        }

        return null;
    }

    /**
     * Ouverture de la fenêtre avec garantie d'habillage et placement bulle.
     */
    open() {
        if (this._isBubbleMode) {
            this.loadWindowskin();
            this.updateBackOpacity();
            this.updatePlacement();
        }
        super.open();
    }

    /**
     * En mode bulle, chaque message s'ouvre proprement sans réutiliser l'état fermé d'une autre fenêtre.
     */
    checkToNotClose() {
        if (this._isBubbleMode) {
            return;
        }
        super.checkToNotClose();
    }

    /**
     * Suivi de la cible lors du déplacement.
     */
    update() {
        super.update();
        if (this._isBubbleMode && this._mapTarget && (this.isOpen() || this.isOpening())) {
            this.updateBubblePlacement();
        }
    }

    /**
     * Lorsque la fenêtre termine sa fermeture, rétablir le mode standard si la fenêtre est entièrement fermée.
     */
    updateClose() {
        super.updateClose();
        if (this.isClosed() && this._isBubbleMode) {
            this._isBubbleMode = false;
            this.resetToVanillaRect();
        }
    }

    /**
     * Met à jour les HUDs selon qui parle et le faceset spécifié dans $gameMessage :
     * - Si le joueur parle et face = "System":1 -> Aucun faceset dans le HUD interlocuteur,
     *   mais surbrillance du HUD joueur (bordure rouge interne 2px).
     * - Si un événement parle et face = "System":1 ->
     *   * Événement héros -> Paperdoll face dans Sprite_InterlocutorHUD avec nom de l'acteur ou du message.
     *   * Sinon -> rien.
     * - Si autre faceset -> Affiché dans Sprite_InterlocutorHUD en haut à droite avec nom.
     * - Si aucun faceset -> Masquage / désactivation des surbrillances.
     */
    updateDialogueHuds(parsed, rawText) {
        const currentScene = (typeof SceneManager !== "undefined") ? SceneManager._scene : null;
        if (!currentScene) return;
        const playerHud = currentScene._playerHud;
        const interlocutorHud = currentScene._interlocutorHud;

        const faceName = (typeof $gameMessage !== "undefined" && $gameMessage.faceName) ? $gameMessage.faceName() : "";
        const faceIndex = (typeof $gameMessage !== "undefined" && $gameMessage.faceIndex) ? $gameMessage.faceIndex() : 0;
        const rawSpeakerName = (typeof $gameMessage !== "undefined" && $gameMessage.speakerName) ? $gameMessage.speakerName() : "";
        const speakerName = (typeof SC4_Localization !== "undefined") ? SC4_Localization.parse(rawSpeakerName) : rawSpeakerName;

        const leader = (typeof $gameParty !== "undefined" && $gameParty.leader) ? $gameParty.leader() : null;
        const leaderName = leader ? (typeof leader.name === "function" ? leader.name() : leader.name) : "";

        const isPlayerSpeaker = Boolean(
            (this._mapTarget && typeof $gamePlayer !== "undefined" && this._mapTarget === $gamePlayer) ||
            (parsed && parsed.target && typeof $gamePlayer !== "undefined" && parsed.target === $gamePlayer) ||
            (rawText && /(?:\x1b|\\)[Aa]/.test(rawText)) ||
            (speakerName && leaderName && speakerName.toLowerCase() === leaderName.toLowerCase()) ||
            (typeof $gameMessage !== "undefined" && $gameMessage._speakerIsPlayer)
        );

        const isSystemFace = Boolean(faceName && faceName.toLowerCase() === "system" && faceIndex === 1);

        if (faceName) {
            if (isPlayerSpeaker) {
                // Joueur parle
                if (playerHud && typeof playerHud.setSpeakingHighlight === "function") {
                    playerHud.setSpeakingHighlight(true);
                }
                if (interlocutorHud && typeof interlocutorHud.hideInterlocutor === "function") {
                    interlocutorHud.hideInterlocutor();
                }
            } else {
                // PNJ / Événement parle
                if (playerHud && typeof playerHud.setSpeakingHighlight === "function") {
                    playerHud.setSpeakingHighlight(false);
                }
                if (isSystemFace) {
                    // Événement héros ?
                    let heroActor = null;
                    const tgt = this._mapTarget;
                    if (tgt) {
                        if (typeof tgt.hero === "function" && tgt.hero()) {
                            heroActor = tgt.hero();
                        } else if (tgt._heroActorId && typeof $gameActors !== "undefined") {
                            heroActor = $gameActors.actor(tgt._heroActorId);
                        } else if (tgt._actorId && typeof $gameActors !== "undefined") {
                            heroActor = $gameActors.actor(tgt._actorId);
                        } else if (typeof tgt.event === "function") {
                            const evData = tgt.event();
                            if (evData && evData.note) {
                                const m = evData.note.match(/<Hero(?::(\d+))?>/i);
                                if (m) {
                                    const actId = m[1] ? parseInt(m[1], 10) : 1;
                                    heroActor = (typeof $gameActors !== "undefined") ? $gameActors.actor(actId) : null;
                                }
                            }
                        }
                    }
                    if (!heroActor && speakerName && typeof $gameActors !== "undefined" && $gameActors._data) {
                        heroActor = $gameActors._data.find(a => a && typeof a.name === "function" && a.name() === speakerName);
                    }

                    if (heroActor && interlocutorHud && typeof interlocutorHud.showInterlocutor === "function") {
                        interlocutorHud.showInterlocutor(faceName, faceIndex, speakerName, heroActor);
                    } else if (interlocutorHud && typeof interlocutorHud.hideInterlocutor === "function") {
                        interlocutorHud.hideInterlocutor();
                    }
                } else {
                    // Faceset classique pour l'événement
                    if (interlocutorHud && typeof interlocutorHud.showInterlocutor === "function") {
                        interlocutorHud.showInterlocutor(faceName, faceIndex, speakerName, null);
                    }
                }
            }
        } else {
            if (playerHud && typeof playerHud.setSpeakingHighlight === "function") {
                playerHud.setSpeakingHighlight(false);
            }
            if (interlocutorHud && typeof interlocutorHud.hideInterlocutor === "function") {
                interlocutorHud.hideInterlocutor();
            }
        }
    }

    /**
     * Réinitialisation lors de la fermeture du message.
     * Conserve le rect et skin de la bulle pendant la fermeture (openness > 0) pour éviter tout flash vanilla.
     */
    terminateMessage() {
        super.terminateMessage();
        this._mapTarget = null;
        const currentScene = (typeof SceneManager !== "undefined") ? SceneManager._scene : null;
        if (currentScene) {
            if (currentScene._playerHud && typeof currentScene._playerHud.setSpeakingHighlight === "function") {
                currentScene._playerHud.setSpeakingHighlight(false);
            }
            if (currentScene._interlocutorHud && typeof currentScene._interlocutorHud.hideInterlocutor === "function") {
                currentScene._interlocutorHud.hideInterlocutor();
            }
        }
        if (this.isClosed()) {
            this._isBubbleMode = false;
            this.resetToVanillaRect();
        }
    }

    /**
     * Rétablit les dimensions et marges standards vanilla.
     */
    resetToVanillaRect() {
        if (this._vanillaRect) {
            this.x = this._vanillaRect.x;
            this.y = this._vanillaRect.y;
            this.width = this._vanillaRect.width;
            this.height = this._vanillaRect.height;
            this.padding = (typeof $gameSystem !== "undefined" && $gameSystem && $gameSystem.windowPadding)
                ? $gameSystem.windowPadding()
                : 12;
            this.loadWindowskin();
            this.updateBackOpacity();
            this.createContents();
        }
    }

    // --- Personnalisation de l'apparence ---

    /**
     * Indique si l'outline (contour / ombre de lettre) est activé.
     * @returns {boolean}
     */
    isOutlineEnabled() {
        const cfg = this.currentConfig();
        if (cfg.enableOutline !== undefined) return Boolean(cfg.enableOutline);
        if (cfg.outline !== undefined) return Boolean(cfg.outline);
        if (cfg.enableTextShadow !== undefined) return Boolean(cfg.enableTextShadow);
        if (cfg.textShadow !== undefined) return Boolean(cfg.textShadow);
        if (typeof cfg.outlineWidth === "number") return cfg.outlineWidth > 0;
        return false;
    }

    /**
     * Épaisseur de l'outline à appliquer.
     * @returns {number}
     */
    currentOutlineWidth() {
        if (!this.isOutlineEnabled()) return 0;
        const cfg = this.currentConfig();
        if (typeof cfg.outlineWidth === "number" && cfg.outlineWidth > 0) {
            return cfg.outlineWidth;
        }
        return 3;
    }

    /**
     * Couleur de l'outline à appliquer.
     * @returns {string}
     */
    currentOutlineColor() {
        if (!this.isOutlineEnabled()) return "rgba(0, 0, 0, 0)";
        const cfg = this.currentConfig();
        if (cfg.outlineColor && typeof cfg.outlineColor === "string") {
            return cfg.outlineColor;
        }
        return (typeof ColorManager !== "undefined" && ColorManager.outlineColor)
            ? ColorManager.outlineColor()
            : "rgba(0, 0, 0, 0.6)";
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
            const baseFontSize = (cfg.fontSize > 0) ? cfg.fontSize : (typeof $gameSystem !== "undefined" ? $gameSystem.mainFontSize() : 26);
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
        return (super.standardFontFace) ? super.standardFontFace() : (typeof $gameSystem !== "undefined" ? $gameSystem.mainFontFace() : "rmmz-mainfont");
    }

    standardFontSize() {
        const cfg = this.currentConfig();
        if (this._isBubbleMode && cfg.fontSize > 0) {
            return cfg.fontSize;
        }
        return (super.standardFontSize) ? super.standardFontSize() : (typeof $gameSystem !== "undefined" ? $gameSystem.mainFontSize() : 26);
    }

    loadWindowskin() {
        const cfg = this.currentConfig();
        if (this._isBubbleMode && cfg.windowskin && typeof ImageManager !== "undefined") {
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

// Exposer globalement la classe
window.Window_BubbleMsg = Window_BubbleMsg;

// ============================================================================
// Extensions Game_System pour le contrôle du mode Bubble
// ============================================================================

Game_System.prototype.isBubbleMessageMode = function() {
    return !!this._bubbleMessageMode;
};

Game_System.prototype.setBubbleMessageMode = function(enabled) {
    this._bubbleMessageMode = !!enabled;
};

Game_System.prototype.getBubbleConfig = function() {
    this._bubbleConfig = this._bubbleConfig || {};
    return this._bubbleConfig;
};

Game_System.prototype.setBubbleConfig = function(cfg) {
    this._bubbleConfig = Object.assign(this.getBubbleConfig(), cfg || {});
    // Active automatiquement le mode bulle universel sauf si enabled: false
    if (cfg && cfg.enabled !== false) {
        this._bubbleMessageMode = true;
    }
    // Préchargement immédiat de la police
    if (cfg && cfg.fontFace) {
        Window_BubbleMsg.resolveFontFace(cfg.fontFace);
    }
    // Préchargement immédiat de l'habillage
    if (cfg && cfg.windowskin && typeof ImageManager !== "undefined") {
        const skinName = cfg.windowskin.replace(/\.png$/i, "");
        ImageManager.loadSystem(skinName);
    }
    // Cible optionnelle
    if (cfg && cfg.target !== undefined) {
        this.bubbleTarget = cfg.target;
    }
};

// ============================================================================
// Remplacement contextuel dans Scene_Message
// ============================================================================

const _Scene_Message_createMessageWindow = Scene_Message.prototype.createMessageWindow;
Scene_Message.prototype.createMessageWindow = function() {
    const rect = this.messageWindowRect();
    this._messageWindow = new Window_BubbleMsg(rect);
    this.addWindow(this._messageWindow);
};

// Alignement de la fenêtre de choix (Window_ChoiceList) avec la bulle de message
if (typeof Window_ChoiceList !== "undefined" && Window_ChoiceList.prototype.updatePlacement) {
    const _Window_ChoiceList_updatePlacement = Window_ChoiceList.prototype.updatePlacement;
    Window_ChoiceList.prototype.updatePlacement = function() {
        _Window_ChoiceList_updatePlacement.call(this);
        if (this._messageWindow && this._messageWindow._isBubbleMode) {
            const boxW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
            const idealX = this._messageWindow.x + Math.floor((this._messageWindow.width - this.width) / 2);
            this.x = Math.max(8, Math.min(boxW - this.width - 8, idealX));
        }
    };
}

// ============================================================================
// Outils de test console interactifs
// ============================================================================

/**
 * Affiche un message bulle sur le joueur.
 * @param {string} message 
 * @param {number} positionType 0=haut, 1=milieu, 2=bas
 */
window.testBubbleMsg = function(message = "Message de test", positionType = 0) {
    if (!SceneManager._scene || !SceneManager._scene._messageWindow) {
        console.warn("[SC4_BubbleMessage] Aucune fenêtre de message active.");
        return;
    }
    const win = SceneManager._scene._messageWindow;
    win.setMapTarget($gamePlayer);
    $gameMessage.setBackground(0);
    $gameMessage.setPositionType(positionType);
    $gameMessage.add(message);
};

/**
 * Affiche un message bulle sur un événement spécifique.
 * @param {number} eventId 
 * @param {string} message 
 * @param {number} positionType 
 */
window.testBubbleMsgEvent = function(eventId = 1, message = "Message événement", positionType = 0) {
    if (!SceneManager._scene || !SceneManager._scene._messageWindow) {
        console.warn("[SC4_BubbleMessage] Aucune fenêtre de message active.");
        return;
    }
    const event = $gameMap ? $gameMap.event(eventId) : null;
    if (!event) {
        console.warn(`[SC4_BubbleMessage] Événement ID ${eventId} introuvable.`);
        return;
    }
    const win = SceneManager._scene._messageWindow;
    win.setMapTarget(event);
    $gameMessage.setBackground(0);
    $gameMessage.setPositionType(positionType);
    $gameMessage.add(message);
};

/**
 * Affiche un message bulle à des coordonnées d'écran spécifiques.
 * @param {number} x 
 * @param {number} y 
 * @param {string} message 
 * @param {number} positionType 
 */
window.testBubbleMsgCoords = function(x = 400, y = 300, message = "Message coordonnées", positionType = 1) {
    if (!SceneManager._scene || !SceneManager._scene._messageWindow) {
        console.warn("[SC4_BubbleMessage] Aucune fenêtre de message active.");
        return;
    }
    const win = SceneManager._scene._messageWindow;
    win.setMapTarget({ x, y });
    $gameMessage.setBackground(0);
    $gameMessage.setPositionType(positionType);
    $gameMessage.add(message);
};

/**
 * Efface la cible de la bulle et revient au positionnement standard.
 */
window.clearBubbleTarget = function() {
    if (SceneManager._scene && SceneManager._scene._messageWindow) {
        SceneManager._scene._messageWindow.setMapTarget(null);
    }
};

// ============================================================================
// Capture de l'émetteur du message dans Game_Interpreter
// ============================================================================
if (typeof Game_Interpreter !== "undefined") {
    const _Game_Interpreter_command101 = Game_Interpreter.prototype.command101;
    Game_Interpreter.prototype.command101 = function(params) {
        if (typeof $gameMessage !== "undefined") {
            $gameMessage._speakerEventId = this._eventId;
            $gameMessage._speakerIsPlayer = (this._eventId === 0);
        }
        return _Game_Interpreter_command101.call(this, params);
    };
}

if (typeof Window_Message !== "undefined") {
    Window_Message.prototype.checkToSeeIfFaceExists = function() {
        return false;
    };
    Window_Message.prototype.drawMessageFace = function() {
        // Désactivé : Les visages ne sont pas dessinés dans les messages mais gérés par les HUDs dédiés
    };
}

// ============================================================================
// Préchargement des polices personnalisées au démarrage
// ============================================================================

if (typeof Scene_Boot !== "undefined") {
    const _Scene_Boot_loadCustomFonts = Scene_Boot.prototype.loadCustomFonts;
    Scene_Boot.prototype.loadCustomFonts = function() {
        if (_Scene_Boot_loadCustomFonts) {
            _Scene_Boot_loadCustomFonts.call(this);
        }
        Window_BubbleMsg.preloadConfiguredFonts();
    };
}
Window_BubbleMsg.preloadConfiguredFonts();

})();
