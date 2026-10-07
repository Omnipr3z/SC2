//=============================================================================
// SC4_rmmz_core_Patches.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Surcharges et patches des classes natives de rmmz_core.js.
 * @author SimCraft
 * @help
 * ============================================================================
 * SC4_rmmz_core_Patches.js
 * ============================================================================
 * Regroupe tous les patches et surcharges apportés aux classes de rmmz_core :
 * 
 * 1. TouchInput :
 *    - Suivi de l'état du clic droit maintenu (_rightPressed) et des événements
 *      right-click (trigger, release).
 *    - Suivi en continu de la position du curseur de la souris (cursorX, cursorY)
 *      même hors clics.
 *    - Mémorisation des coordonnées des derniers clics gauche (leftX, leftY)
 *      et droit (rightX, rightY).
 *    - Nouvelles méthodes d'accès : isRightPressed(), isRightTriggered(),
 *      isRightReleased(), isLeftPressed(), isLeftTriggered().
 * ============================================================================
 */

(() => {
    "use strict";

    // ========================================================================
    // 1. Patches pour TouchInput
    // ========================================================================
    const _TouchInput_clear = TouchInput.clear;
    TouchInput.clear = function() {
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

    const _TouchInput_update = TouchInput.update;
    TouchInput.update = function() {
        _TouchInput_update.call(this);
        this._rightTriggered = false;
        this._rightReleased = false;
        if (this._rightPressed) {
            this._rightPressedTime++;
        } else {
            this._rightPressedTime = 0;
        }
    };

    TouchInput._onRightButtonDown = function(event) {
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

    const _TouchInput_onLeftButtonDown = TouchInput._onLeftButtonDown;
    TouchInput._onLeftButtonDown = function(event) {
        if (_TouchInput_onLeftButtonDown) {
            _TouchInput_onLeftButtonDown.call(this, event);
        }
        const x = Graphics.pageToCanvasX(event.pageX);
        const y = Graphics.pageToCanvasY(event.pageY);
        this._leftTriggerX = x;
        this._leftTriggerY = y;
        this._cursorX = x;
        this._cursorY = y;
    };

    const _TouchInput_onMouseMove = TouchInput._onMouseMove;
    TouchInput._onMouseMove = function(event) {
        if (_TouchInput_onMouseMove) {
            _TouchInput_onMouseMove.call(this, event);
        }
        const x = Graphics.pageToCanvasX(event.pageX);
        const y = Graphics.pageToCanvasY(event.pageY);
        this._cursorX = x;
        this._cursorY = y;
    };

    const _TouchInput_onMouseUp = TouchInput._onMouseUp;
    TouchInput._onMouseUp = function(event) {
        if (_TouchInput_onMouseUp) {
            _TouchInput_onMouseUp.call(this, event);
        }
        if (event.button === 2) {
            const x = Graphics.pageToCanvasX(event.pageX);
            const y = Graphics.pageToCanvasY(event.pageY);
            this._rightPressed = false;
            this._rightReleased = true;
            this._cursorX = x;
            this._cursorY = y;
        }
    };

    const _TouchInput_onLostFocus = TouchInput._onLostFocus;
    TouchInput._onLostFocus = function() {
        if (_TouchInput_onLostFocus) {
            _TouchInput_onLostFocus.call(this);
        }
        this._rightPressed = false;
        this._rightPressedTime = 0;
    };

    // Méthodes d'assistance publiques
    TouchInput.isRightPressed = function() {
        return Boolean(this._rightPressed);
    };

    TouchInput.isRightTriggered = function() {
        return Boolean(this._rightTriggered);
    };

    TouchInput.isRightReleased = function() {
        return Boolean(this._rightReleased);
    };

    TouchInput.isLeftPressed = function() {
        return this.isPressed();
    };

    TouchInput.isLeftTriggered = function() {
        return this.isTriggered();
    };

    Object.defineProperty(TouchInput, "rightX", {
        get: function() { return this._rightX || 0; },
        configurable: true
    });

    Object.defineProperty(TouchInput, "rightY", {
        get: function() { return this._rightY || 0; },
        configurable: true
    });

    Object.defineProperty(TouchInput, "leftX", {
        get: function() { return this._leftTriggerX || 0; },
        configurable: true
    });

    Object.defineProperty(TouchInput, "leftY", {
        get: function() { return this._leftTriggerY || 0; },
        configurable: true
    });

    Object.defineProperty(TouchInput, "cursorX", {
        get: function() { return this._cursorX || this._x || 0; },
        configurable: true
    });

    Object.defineProperty(TouchInput, "cursorY", {
        get: function() { return this._cursorY || this._y || 0; },
        configurable: true
    });

    // ========================================================================
    // 2. Gestion du Clavier (AZERTY / QWERTY, ZQSD / WASD, E, I, R, A)
    // ========================================================================
    if (typeof ConfigManager !== "undefined") {
        ConfigManager.keyboardLayout = "azerty";

        const _ConfigManager_makeData = ConfigManager.makeData;
        ConfigManager.makeData = function() {
            const config = _ConfigManager_makeData ? _ConfigManager_makeData.call(this) : {};
            config.keyboardLayout = this.keyboardLayout;
            return config;
        };

        const _ConfigManager_applyData = ConfigManager.applyData;
        ConfigManager.applyData = function(config) {
            if (_ConfigManager_applyData) {
                _ConfigManager_applyData.call(this, config);
            }
            this.keyboardLayout = (config && config.keyboardLayout) ? config.keyboardLayout : "azerty";
            this.applyKeyboardLayout();
        };

        ConfigManager.applyKeyboardLayout = function() {
            if (typeof Input === "undefined" || !Input.keyMapper) return;
            const isQwerty = this.keyboardLayout === "qwerty";

            // Touches communes
            Input.keyMapper[13] = "ok";        // Enter
            Input.keyMapper[32] = "ok";        // Espace
            Input.keyMapper[69] = "ok";        // E (Interagir avec objets/events comme Enter)
            Input.keyMapper[73] = "inventory"; // I (Ouvrir l'inventaire)
            Input.keyMapper[82] = "reload";    // R (Recharger - réservé gunfight)
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
                delete Input.keyMapper[90];       // Z n'est plus ni haut ni enter
            } else {
                // AZERTY : ZQSD pour se déplacer
                Input.keyMapper[90] = "up";       // Z -> Haut (et plus du tout Enter !)
                Input.keyMapper[81] = "left";     // Q -> Gauche
                Input.keyMapper[83] = "down";     // S -> Bas
                Input.keyMapper[68] = "right";    // D -> Droite
                Input.keyMapper[65] = "special";  // A -> Action spéciale
                delete Input.keyMapper[87];       // W retiré
            }
        };

        // Application initiale
        ConfigManager.applyKeyboardLayout();
    }

    // Intégration dans le menu des Options (Window_Options)
    if (typeof Window_Options !== "undefined") {
        const _Window_Options_addGeneralOptions = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            if (_Window_Options_addGeneralOptions) {
                _Window_Options_addGeneralOptions.call(this);
            }
            this.addCommand("Clavier", "keyboardLayout");
        };

        const _Window_Options_statusText = Window_Options.prototype.statusText;
        Window_Options.prototype.statusText = function(index) {
            const symbol = this.commandSymbol(index);
            if (symbol === "keyboardLayout") {
                const val = this.getConfigValue(symbol);
                return val === "qwerty" ? "QWERTY" : "AZERTY";
            }
            return _Window_Options_statusText ? _Window_Options_statusText.call(this, index) : "";
        };

        const _Window_Options_processOk = Window_Options.prototype.processOk;
        Window_Options.prototype.processOk = function() {
            const index = this.index();
            const symbol = this.commandSymbol(index);
            if (symbol === "keyboardLayout") {
                const current = this.getConfigValue(symbol);
                const next = current === "qwerty" ? "azerty" : "qwerty";
                this.changeValue(symbol, next);
                if (typeof ConfigManager.applyKeyboardLayout === "function") {
                    ConfigManager.applyKeyboardLayout();
                }
                return;
            }
            if (_Window_Options_processOk) {
                _Window_Options_processOk.call(this);
            }
        };

        const _Window_Options_cursorRight = Window_Options.prototype.cursorRight;
        Window_Options.prototype.cursorRight = function() {
            const index = this.index();
            const symbol = this.commandSymbol(index);
            if (symbol === "keyboardLayout") {
                this.changeValue(symbol, "qwerty");
                if (typeof ConfigManager.applyKeyboardLayout === "function") {
                    ConfigManager.applyKeyboardLayout();
                }
                return;
            }
            if (_Window_Options_cursorRight) {
                _Window_Options_cursorRight.call(this);
            }
        };

        const _Window_Options_cursorLeft = Window_Options.prototype.cursorLeft;
        Window_Options.prototype.cursorLeft = function() {
            const index = this.index();
            const symbol = this.commandSymbol(index);
            if (symbol === "keyboardLayout") {
                this.changeValue(symbol, "azerty");
                if (typeof ConfigManager.applyKeyboardLayout === "function") {
                    ConfigManager.applyKeyboardLayout();
                }
                return;
            }
            if (_Window_Options_cursorLeft) {
                _Window_Options_cursorLeft.call(this);
            }
        };
    }

})();
