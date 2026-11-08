//=============================================================================
// SC4_rmmz_core_Patches.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Surcharges et patches des classes natives de rmmz_core.js et rmmz_managers.js.
 * @author SimCraft
 * @help
 * ============================================================================
 * NORME DES FICHIERS DE PATCHES :
 * - Nom de la Classe en commentaire (ex: // TOUCH INPUT)
 * - Création de tous les alias nécessaires à la classe au début de sa section, suivis d'une ligne vide
 * - Toutes les méthodes de la classe regroupées ensemble (surcharges et ajouts), sans doublons
 * - Ordre des classes identique au fichier natif vanilla
 * - Pas de commentaires superflus en dehors des méthodes (sauf TODO ou note en header)
 * - Règle "Fail Fast" : pas de fallbacks silencieux masquant les bugs
 * ============================================================================
 * Regroupe tous les patches et surcharges apportés aux classes de rmmz_core et managers :
 * 
 * 1. Utils & Number :
 *    - approach : interpolation pas-à-pas vers une cible.
 * 
 * 2. Bitmap :
 *    - drawLine : tracé direct de segments sur le canvas du bitmap.
 * 
 * 3. TouchInput :
 *    - Suivi du clic droit maintenu (_rightPressed) et des déclenchements.
 *    - Suivi continu des coordonnées du curseur et des positions de clic.
 * 
 * 4. ConfigManager :
 *    - Gestion de la disposition clavier (AZERTY / QWERTY), recharge auto et langue.
 *    - Configuration du keyMapper (ZQSD / WASD, E pour interagir, I pour inventaire).
 * 
 * 5. TextManager :
 *    - Traduction dynamique des libellés système et termes vanilla via SC4_Localization.
 * ============================================================================
 */

(() => {
    "use strict";

    window.SC4 = window.SC4 || {};
    if (window.SC4.nefVariableId === undefined) {
        window.SC4.nefVariableId = 41;
    }

    // UTILS
    //=============================================================================
    Utils.approach = function (current, target, step) {
        if (current < target) {
            return Math.min(current + step, target);
        } else if (current > target) {
            return Math.max(current - step, target);
        }
        return target;
    };

    if (!Number.prototype.approach) {
        Object.defineProperty(Number.prototype, "approach", {
            value: function (target, step) {
                return Utils.approach(this.valueOf(), target, step);
            },
            configurable: true,
            writable: true,
            enumerable: false
        });
    }

    // BITMAP
    //=============================================================================
    Bitmap.prototype.drawLine = function (x1, y1, x2, y2, color, lineWidth = 1) {
        const context = this.context;
        context.save();
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.strokeStyle = color || "#ffffff";
        context.lineWidth = lineWidth;
        context.stroke();
        context.restore();
        this._baseTexture.update();
    };

    // TOUCH INPUT
    //=============================================================================
    const _TouchInput_clear = TouchInput.clear;
    const _TouchInput_update = TouchInput.update;
    const _TouchInput_onLeftButtonDown = TouchInput._onLeftButtonDown;
    const _TouchInput_onMouseMove = TouchInput._onMouseMove;
    const _TouchInput_onMouseUp = TouchInput._onMouseUp;
    const _TouchInput_onLostFocus = TouchInput._onLostFocus;

    TouchInput.clear = function () {
        _TouchInput_clear.call(this);
        this._rightPressed = false;
        this._rightPressedTime = 0;
        this._rightTriggered = false;
        this._rightReleased = false;
        this._rightX = 0;
        this._rightY = 0;
        this._leftTriggerX = 0;
        this._leftTriggerY = 0;
        this._cursorX = 0;
        this._cursorY = 0;
    };
    TouchInput.update = function () {
        _TouchInput_update.call(this);
        this._rightTriggered = false;
        this._rightReleased = false;
        if (this._rightPressed) {
            this._rightPressedTime++;
        } else {
            this._rightPressedTime = 0;
        }
    };
    TouchInput._onRightButtonDown = function (event) {
        const x = Graphics.pageToCanvasX(event.pageX);
        const y = Graphics.pageToCanvasY(event.pageY);
        if (Graphics.isInsideCanvas(x, y)) {
            this._rightPressed = true;
            this._rightPressedTime = 0;
            this._rightTriggered = true;
            this._rightX = x;
            this._rightY = y;
            this._cursorX = x;
            this._cursorY = y;
            this._onCancel(x, y);
        }
    };
    TouchInput._onLeftButtonDown = function (event) {
        _TouchInput_onLeftButtonDown.call(this, event);
        const x = Graphics.pageToCanvasX(event.pageX);
        const y = Graphics.pageToCanvasY(event.pageY);
        this._leftTriggerX = x;
        this._leftTriggerY = y;
        this._cursorX = x;
        this._cursorY = y;
    };
    TouchInput._onMouseMove = function (event) {
        _TouchInput_onMouseMove.call(this, event);
        const x = Graphics.pageToCanvasX(event.pageX);
        const y = Graphics.pageToCanvasY(event.pageY);
        this._cursorX = x;
        this._cursorY = y;
    };
    TouchInput._onMouseUp = function (event) {
        _TouchInput_onMouseUp.call(this, event);
        if (event.button === 2) {
            const x = Graphics.pageToCanvasX(event.pageX);
            const y = Graphics.pageToCanvasY(event.pageY);
            this._rightPressed = false;
            this._rightReleased = true;
            this._cursorX = x;
            this._cursorY = y;
        }
    };
    TouchInput._onLostFocus = function () {
        _TouchInput_onLostFocus.call(this);
        this._rightPressed = false;
        this._rightPressedTime = 0;
    };
    TouchInput.isRightPressed = function () {
        return Boolean(this._rightPressed);
    };
    TouchInput.isRightTriggered = function () {
        return Boolean(this._rightTriggered);
    };
    TouchInput.isRightReleased = function () {
        return Boolean(this._rightReleased);
    };
    TouchInput.isLeftPressed = function () {
        return this.isPressed();
    };
    TouchInput.isLeftTriggered = function () {
        return this.isTriggered();
    };
    Object.defineProperty(TouchInput, "rightX", {
        get: function () { return this._rightX || 0; },
        configurable: true
    });
    Object.defineProperty(TouchInput, "rightY", {
        get: function () { return this._rightY || 0; },
        configurable: true
    });
    Object.defineProperty(TouchInput, "leftX", {
        get: function () { return this._leftTriggerX || 0; },
        configurable: true
    });
    Object.defineProperty(TouchInput, "leftY", {
        get: function () { return this._leftTriggerY || 0; },
        configurable: true
    });
    Object.defineProperty(TouchInput, "cursorX", {
        get: function () { return this._cursorX || this._x || 0; },
        configurable: true
    });
    Object.defineProperty(TouchInput, "cursorY", {
        get: function () { return this._cursorY || this._y || 0; },
        configurable: true
    });

    // TILEMAP
    //=============================================================================
    const _Tilemap_update = Tilemap.prototype.update;

    Tilemap.prototype.update = function () {
        if (window.$tutoManager && window.$tutoManager.isBusy()) {
            return;
        }
        _Tilemap_update.call(this);
    };

    // CONFIG MANAGER
    //=============================================================================
    ConfigManager.keyboardLayout = "azerty";
    ConfigManager.autoReload = false;
    ConfigManager.locale = "FR";
    ConfigManager.contextualHelp = true;

    const _ConfigManager_makeData = ConfigManager.makeData;
    const _ConfigManager_applyData = ConfigManager.applyData;

    ConfigManager.makeData = function () {
        const config = _ConfigManager_makeData.call(this);
        config.keyboardLayout = this.keyboardLayout;
        config.autoReload = this.autoReload;
        config.locale = this.locale || "FR";
        config.contextualHelp = this.contextualHelp;
        return config;
    };
    ConfigManager.applyData = function (config) {
        _ConfigManager_applyData.call(this, config);
        this.keyboardLayout = (config && config.keyboardLayout) ? config.keyboardLayout : "azerty";
        this.autoReload = Boolean(config && config.autoReload);
        this.locale = (config && config.locale) ? String(config.locale).toUpperCase() : "FR";
        this.contextualHelp = (config && config.contextualHelp !== undefined) ? Boolean(config.contextualHelp) : true;
        if (typeof $gameSystem !== "undefined" && $gameSystem) {
            $gameSystem._locale = this.locale;
        }
        this.applyKeyboardLayout();
    };
    ConfigManager.applyKeyboardLayout = function () {
        if (!Input.keyMapper) return;
        const isQwerty = this.keyboardLayout === "qwerty";

        // Touches communes
        Input.keyMapper[13] = "ok";        // Enter
        Input.keyMapper[32] = "ok";        // Espace
        Input.keyMapper[69] = "ok";        // E (Interagir avec objets/events comme Enter)
        Input.keyMapper[73] = "inventory"; // I (Ouvrir l'inventaire)
        Input.keyMapper[82] = "reload";    // R (Recharger - réservé gunfight)
        Input.keyMapper[72] = "toggleHud"; // H (Basculer l'affichage des HUDs acteur/arme)
        Input.keyMapper[27] = "escape";    // Échap (Menu natif)
        Input.keyMapper[96] = "escape";    // Numpad 0 (Menu natif)

        // Flèches directionnelles standard
        Input.keyMapper[37] = "left";
        Input.keyMapper[38] = "up";
        Input.keyMapper[39] = "right";
        Input.keyMapper[40] = "down";

        if (isQwerty) {
            // QWERTY : WASD pour se déplacer
            Input.keyMapper[87] = "up";       // W -> Haut
            Input.keyMapper[65] = "left";     // A -> Gauche
            Input.keyMapper[83] = "down";     // S -> Bas
            Input.keyMapper[68] = "right";    // D -> Droite
            Input.keyMapper[81] = "special";  // Q -> Action spéciale
            delete Input.keyMapper[90];
        } else {
            // AZERTY : ZQSD pour se déplacer
            Input.keyMapper[90] = "up";       // Z -> Haut
            Input.keyMapper[81] = "left";     // Q -> Gauche
            Input.keyMapper[83] = "down";     // S -> Bas
            Input.keyMapper[68] = "right";    // D -> Droite
            Input.keyMapper[65] = "special";  // A -> Action spéciale
            delete Input.keyMapper[87];
        }
    };
    ConfigManager.applyKeyboardLayout();

    // TEXT MANAGER
    //=============================================================================
    const _TextManager_basic = TextManager.basic;
    const _TextManager_param = TextManager.param;
    const _TextManager_command = TextManager.command;
    const _TextManager_message = TextManager.message;

    TextManager.basic = function (basicId) {
        const raw = _TextManager_basic.call(this, basicId);
        return SC4_Localization.parse(raw);
    };
    TextManager.param = function (paramId) {
        const raw = _TextManager_param.call(this, paramId);
        return SC4_Localization.parse(raw);
    };
    TextManager.command = function (commandId) {
        const raw = _TextManager_command.call(this, commandId);
        const parsed = SC4_Localization.parse(raw);
        if (parsed !== raw) return parsed;

        const cmdKeys = {
            0: "terms.fight",
            1: "terms.escape",
            2: "terms.attack",
            3: "terms.guard",
            4: "menu.item",
            5: "menu.skill",
            6: "menu.equip",
            7: "menu.status",
            8: "menu.formation",
            9: "menu.save",
            10: "menu.gameEnd",
            11: "title.options",
            12: "terms.weapon",
            13: "terms.armor",
            14: "terms.keyItem",
            15: "terms.equip2",
            16: "terms.optimize",
            17: "terms.clear",
            18: "title.newGame",
            19: "title.continue",
            21: "title.exit",
            22: "terms.cancel",
            24: "terms.buy",
            25: "terms.sell"
        };

        const key = cmdKeys[commandId];
        if (key) {
            return SC4_Localization.getText(key, raw);
        }
        return raw;
    };
    TextManager.message = function (messageId) {
        const raw = _TextManager_message.call(this, messageId);
        const parsed = SC4_Localization.parse(raw);
        if (parsed !== raw) return parsed;

        const msgKeys = {
            alwaysDash: "options.alwaysDash",
            commandRemember: "options.commandRemember",
            touchUI: "options.touchUI",
            bgmVolume: "options.bgmVolume",
            bgsVolume: "options.bgsVolume",
            meVolume: "options.meVolume",
            seVolume: "options.seVolume"
        };

        const key = msgKeys[messageId];
        if (key) {
            return SC4_Localization.getText(key, raw);
        }
        return raw;
    };

    // PLUGIN COMMANDS
    //=============================================================================
    PluginManager.registerCommand("SC4_rmmz_scenes_Patches", "SetHudVisibility", args => {
        const target = (args.target || "all").toLowerCase();
        const action = (args.visible || "toggle").toLowerCase();
        let visible = true;
        if (action === "false" || action === "hide" || action === "off") visible = false;
        if (action === "true" || action === "show" || action === "on") visible = true;
        const isToggle = (action === "toggle");

        if (target === "player" || target === "actor") {
            if (isToggle) $gameSystem.togglePlayerHud();
            else $gameSystem.setPlayerHudVisible(visible);
        } else if (target === "weapon" || target === "gun") {
            if (isToggle) $gameSystem.toggleWeaponHud();
            else $gameSystem.setWeaponHudVisible(visible);
        } else {
            if (isToggle) $gameSystem.toggleHud();
            else $gameSystem.setHudVisible(visible);
        }
    });
    PluginManager.registerCommand("SC4_QuestManager", "openQuestBook", () => {
        if (window.SC4 && typeof window.SC4.openQuestBook === "function") {
            window.SC4.openQuestBook();
        }
    });


})();
