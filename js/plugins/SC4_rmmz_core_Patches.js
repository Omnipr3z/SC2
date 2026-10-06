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

})();
