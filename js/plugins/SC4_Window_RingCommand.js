//=============================================================================
// SC4_Window_RingCommand.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Fenêtre de commandes circulaire rotative (Window_RingCommand).
 * @author SimCraft
 * @help
 * ============================================================================
 * SC4_Window_RingCommand.js
 * ============================================================================
 * Ce plugin implémente la classe Window_RingCommand où les options sont disposées
 * en cercle avec animation d'ouverture fluide (Ease-Out).
 * 
 * 1. Caractéristiques :
 *    - Disposition radiale des éléments autour du centre.
 *    - Animation d'ouverture fluide (Ease-Out).
 *    - Support des icônes d'icônetier RMMZ (index numérique) et emojis.
 *    - Intégration de la localisation dynamique (\L[KEY]).
 *    - Navigation circulaire intuitive au clavier/manette/souris/tactile.
 * 
 * 2. Intégrations architecturales (Norme SimCraft Engine) :
 *    - Les surcharges et méthodes de Game_System sont dans SC4_rmmz_objects_Patches.js
 *    - Les surcharges et méthodes de Scene_Map sont dans SC4_rmmz_scenes_Patches.js
 * 
 * 3. Personnalisation de l'apparence :
 *    - Police, taille, dimensions des items, rayon et transparence configurables via :
 *      Window_RingCommand.setConfig({...}) ou
 *      $gameSystem.setRingCommandConfig({...})
 * ============================================================================
 */

class Window_RingCommand extends Window_Command {
    /**
     * Configuration par défaut du Ring Menu.
     */
    static _config = {
        fontFace: "",
        fontSize: 0,
        itemWidth: 120,
        itemHeight: 40,
        radius: 0, // 0 = calcul automatique selon la taille de fenêtre
        windowskin: "",
        opacity: 0, // Transparence du cadre de la fenêtre globale (fond invisible)
        enablePlayerClick: true
    };

    /**
     * Résout et précharge le fichier/nom de police.
     * @param {string} fontFace 
     * @returns {string}
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

        return family;
    }

    /**
     * Définit la configuration globale.
     * @param {Object} cfg 
     */
    static setConfig(cfg) {
        this._config = Object.assign(this._config, cfg || {});
        if (cfg && cfg.fontFace) {
            this.resolveFontFace(cfg.fontFace);
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
     * Réinitialise la configuration globale.
     */
    static resetConfig() {
        this._config = {
            fontFace: "",
            fontSize: 0,
            itemWidth: 120,
            itemHeight: 40,
            radius: 0,
            windowskin: "",
            opacity: 0,
            enablePlayerClick: true
        };
    }

    constructor(rect) {
        super(rect);
        if (!this._center && rect) {
            this.initialize(rect);
        }
    }

    initialize(rect) {
        super.initialize(rect);
        this._center = { x: rect.width / 2, y: rect.height / 2 };
        this._commandData = [];
        this._startAngle = -Math.PI / 2; // Position 12h (midi)
        this._radius = 0;
        this._targetRadius = this.calculateTargetRadius();
        this._customConfig = {};

        const cfg = this.currentConfig();
        this.opacity = (cfg.opacity !== undefined) ? cfg.opacity : 0;
    }

    /**
     * Retourne la configuration active pour cette instance.
     * @returns {Object}
     */
    currentConfig() {
        const sysConfig = (typeof $gameSystem !== "undefined" && $gameSystem && $gameSystem.getRingCommandConfig)
            ? $gameSystem.getRingCommandConfig()
            : {};
        return Object.assign({}, Window_RingCommand._config, sysConfig, this._customConfig);
    }

    /**
     * Calcule le rayon optimal pour éviter le débordement hors de la fenêtre.
     * @returns {number}
     */
    calculateTargetRadius() {
        const cfg = this.currentConfig();
        if (cfg.radius && cfg.radius > 0) {
            return cfg.radius;
        }
        const minDim = Math.min(this.width, this.height);
        const itemW = this.itemWidth();
        return Math.max(40, Math.floor((minDim / 2) - (itemW / 1.2) - 10));
    }

    itemWidth() {
        const cfg = this.currentConfig();
        return cfg.itemWidth || 120;
    }

    itemHeight() {
        const cfg = this.currentConfig();
        return cfg.itemHeight || 40;
    }

    /**
     * Définit la liste des commandes et lance l'animation d'ouverture.
     * @param {Array<{name: string, symbol: string, enabled?: boolean, icon?: any, ext?: any}>} commands 
     */
    setCommands(commands) {
        this._commandData = commands || [];
        this._radius = 0;
        this._targetRadius = this.calculateTargetRadius();
        this.refresh();
        this.select(this._commandData.length > 0 ? 0 : -1);
    }

    makeCommandList() {
        if (!this._commandData || !Array.isArray(this._commandData)) {
            return;
        }
        for (const cmd of this._commandData) {
            let name = cmd.name;
            if (typeof SC4_Localization !== "undefined" && SC4_Localization.parse) {
                name = SC4_Localization.parse(name);
            }
            this.addCommand(name, cmd.symbol, cmd.enabled !== false, cmd.ext, cmd.icon);
        }
    }

    addCommand(name, symbol, enabled = true, ext = null, icon = null) {
        this._list.push({ name, symbol, enabled, ext, icon });
    }

    update() {
        super.update();
        this.updateOpeningRadius();
    }

    /**
     * Animation d'ouverture fluide (Ease-Out du rayon).
     */
    updateOpeningRadius() {
        if (this.isOpen() && this._radius < this._targetRadius) {
            this._radius += (this._targetRadius - this._radius) * 0.2 + 0.5;
            if (this._radius > this._targetRadius) {
                this._radius = this._targetRadius;
            }
            Window_Selectable.prototype.refresh.call(this);
        }
    }

    /**
     * Calcule le rectangle de l'item selon sa position angulaire sur le cercle.
     * @param {number} index 
     * @returns {Rectangle}
     */
    itemRect(index) {
        const max = this.maxItems();
        if (max === 0) {
            return new Rectangle(0, 0, 0, 0);
        }

        const step = (Math.PI * 2) / max;
        const angle = this._startAngle + (index * step);
        const w = this.itemWidth();
        const h = this.itemHeight();

        const x = this._center.x + Math.cos(angle) * this._radius - (w / 2);
        const y = this._center.y + Math.sin(angle) * this._radius - (h / 2);

        return new Rectangle(Math.floor(x), Math.floor(y), w, h);
    }

    /**
     * Dessin d'un élément du menu avec icône éventuelle.
     * @param {number} index 
     */
    drawItem(index) {
        const rect = this.itemRect(index);
        const item = this._list[index];
        if (!item) return;

        this.resetTextColor();
        this.changePaintOpacity(item.enabled);

        let textX = rect.x;
        let textW = rect.width;

        if (item.icon !== null && item.icon !== undefined) {
            if (typeof item.icon === "number" && typeof ImageManager !== "undefined") {
                // Icône native RMMZ
                const iconY = rect.y + Math.floor((rect.height - ImageManager.iconHeight) / 2);
                this.drawIcon(item.icon, rect.x + 4, iconY);
                textX += ImageManager.iconWidth + 8;
                textW -= (ImageManager.iconWidth + 8);
            } else if (typeof item.icon === "string") {
                // Emoji ou chaîne courte
                const iconStr = item.icon + " ";
                this.drawText(iconStr + item.name, rect.x, rect.y, rect.width, "center");
                return;
            }
        }

        this.drawText(item.name, textX, rect.y, textW, "center");
    }

    /**
     * Positionnement du curseur natif sur l'item sélectionné.
     */
    updateCursor() {
        if (this.index() >= 0) {
            const rect = this.itemRect(this.index());
            this.setCursorRect(rect.x, rect.y, rect.width, rect.height);
        } else {
            this.setCursorRect(0, 0, 0, 0);
        }
    }

    // --- Navigation angulaire circulaire ---

    cursorRight(wrap) {
        this.cursorDown(wrap);
    }

    cursorLeft(wrap) {
        this.cursorUp(wrap);
    }

    callOkHandler() {
        const item = this._list[this.index()];
        if (item && this.isHandled(item.symbol)) {
            this.callHandler(item.symbol);
        } else if (this.isHandled("ok")) {
            super.callOkHandler();
        } else {
            this.activate();
        }
    }

    /**
     * Ouvre et positionne la fenêtre centrée sur une cible ou un point.
     * @param {any} target ($gamePlayer, Game_Event, ou {x, y})
     */
    openAtTarget(target) {
        let sx = 0;
        let sy = 0;
        if (target) {
            if (typeof target.screenX === "function" && typeof target.screenY === "function") {
                sx = target.screenX();
                sy = target.screenY() - 24;
            } else if (typeof target.x === "number" && typeof target.y === "number") {
                sx = target.x;
                sy = target.y;
            }
        }
        this.openAt(sx, sy);
    }

    /**
     * Ouvre la fenêtre aux coordonnées écran spécifiées avec edge clamping.
     * @param {number} screenX 
     * @param {number} screenY 
     */
    openAt(screenX, screenY) {
        const boxW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
        const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;
        const margin = 8;

        const idealX = screenX - Math.floor(this.width / 2);
        const idealY = screenY - Math.floor(this.height / 2);

        this.x = Math.max(margin, Math.min(boxW - this.width - margin, idealX));
        this.y = Math.max(margin, Math.min(boxH - this.height - margin, idealY));

        this._radius = 0;
        this.show();
        this.open();
        this.activate();
    }

    // --- Personnalisation de police et d'apparence ---

    resetFontSettings() {
        super.resetFontSettings();
        const cfg = this.currentConfig();
        if (cfg.fontFace) {
            this.contents.fontFace = Window_RingCommand.resolveFontFace(cfg.fontFace);
        }
        if (cfg.fontSize > 0) {
            this.contents.fontSize = cfg.fontSize;
        }
    }

    standardFontFace() {
        const cfg = this.currentConfig();
        if (cfg.fontFace) {
            return Window_RingCommand.resolveFontFace(cfg.fontFace);
        }
        return (super.standardFontFace) ? super.standardFontFace() : (typeof $gameSystem !== "undefined" ? $gameSystem.mainFontFace() : "rmmz-mainfont");
    }

    standardFontSize() {
        const cfg = this.currentConfig();
        if (cfg.fontSize > 0) {
            return cfg.fontSize;
        }
        return (super.standardFontSize) ? super.standardFontSize() : (typeof $gameSystem !== "undefined" ? $gameSystem.mainFontSize() : 26);
    }

    loadWindowskin() {
        const cfg = this.currentConfig();
        if (cfg.windowskin && typeof ImageManager !== "undefined") {
            const skinName = cfg.windowskin.replace(/\.png$/i, "");
            this.windowskin = ImageManager.loadSystem(skinName);
        } else {
            super.loadWindowskin();
        }
    }
}

// Exposer globalement la classe
window.Window_RingCommand = Window_RingCommand;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Window_RingCommand;
}
