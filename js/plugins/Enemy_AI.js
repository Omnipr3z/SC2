//=============================================================================
// RPG Maker MZ - Enemy_AI.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Intégrateur d'IA des événements (Hooks Game_Event vers IAManager).
 * @author SimCraft 4
 *
 * @help Enemy_AI.js
 *
 * Fait la liaison entre les événements de carte Game_Event et le système modulaire
 * d'intelligence artificielle IAManager (IA_Melee, IA_Range, etc.).
 */

(() => {
    "use strict";

    if (typeof Game_CharacterBase !== "undefined") {
        /**
         * Calcule la distance de Chebyshev sur la grille (distance admissible à 8 directions).
         */
        Game_CharacterBase.prototype.distance8 = function(x1, y1, x2, y2) {
            const dx = (typeof $gameMap !== "undefined" && $gameMap && typeof $gameMap.deltaX === "function") 
                ? Math.abs($gameMap.deltaX(x1, x2)) 
                : Math.abs(x1 - x2);
            const dy = (typeof $gameMap !== "undefined" && $gameMap && typeof $gameMap.deltaY === "function") 
                ? Math.abs($gameMap.deltaY(y1, y2)) 
                : Math.abs(y1 - y2);
            return Math.max(dx, dy);
        };
    }

    if (typeof Game_Event !== "undefined") {
        /**
         * Initialisation des références d'IA sur l'événement.
         */
        Game_Event.prototype.initAiMembers = function() {
            this._ai = null;
        };

        const _Game_Event_initMembers = Game_Event.prototype.initMembers;
        Game_Event.prototype.initMembers = function() {
            if (_Game_Event_initMembers) {
                _Game_Event_initMembers.call(this);
            }
            this.initAiMembers();
        };

        /**
         * Instanciation de l'IA (IAManager / IA_Melee / IA_Range) selon les notetags actifs.
         */
        Game_Event.prototype.extractAiNotetags = function() {
            if (typeof IAManager !== "undefined" && typeof IAManager.create === "function") {
                this._ai = IAManager.create(this);
            }
        };

        const _Game_Event_setupPageSettings = Game_Event.prototype.setupPageSettings;
        Game_Event.prototype.setupPageSettings = function() {
            if (_Game_Event_setupPageSettings) {
                _Game_Event_setupPageSettings.call(this);
            }
            this.extractAiNotetags();
        };

        /**
         * Instance d'IA associée à cet événement.
         * @returns {IAManager|null}
         */
        Game_Event.prototype.ai = function() {
            return this._ai;
        };

        Game_Event.prototype.aiMode = function() {
            return this._ai ? this._ai.mode() : null;
        };

        Game_Event.prototype.aiState = function() {
            return this._ai ? this._ai.state() : "neutral";
        };

        Game_Event.prototype.setAiState = function(state) {
            if (this._ai) this._ai.setState(state);
        };

        Game_Event.prototype.aiTarget = function() {
            return this._ai ? this._ai.target() : null;
        };

        Game_Event.prototype.setAiTarget = function(target) {
            if (this._ai) this._ai.setTarget(target);
        };

        Game_Event.prototype.aiBasePosition = function() {
            return this._ai ? this._ai.basePosition() : null;
        };

        /**
         * Propriétés proxys pour rétro-compatibilité avec les scripts et notetags.
         */
        Object.defineProperty(Game_Event.prototype, "_aiMode", {
            get() { return this._ai ? this._ai._mode : (this.__aiMode || null); },
            set(v) { if (this._ai) this._ai._mode = v; else this.__aiMode = v; },
            configurable: true
        });

        Object.defineProperty(Game_Event.prototype, "_aiState", {
            get() { return this._ai ? this._ai._state : (this.__aiState || "neutral"); },
            set(v) { if (this._ai) this._ai._state = v; else this.__aiState = v; },
            configurable: true
        });

        Object.defineProperty(Game_Event.prototype, "_aiBaseSpeed", {
            get() { return this._ai ? this._ai._baseSpeed : (this.__aiBaseSpeed !== undefined ? this.__aiBaseSpeed : 2); },
            set(v) { if (this._ai) this._ai._baseSpeed = v; else this.__aiBaseSpeed = v; },
            configurable: true
        });

        Object.defineProperty(Game_Event.prototype, "_aiEngageSpeed", {
            get() { return this._ai ? this._ai._engageSpeed : (this.__aiEngageSpeed !== undefined ? this.__aiEngageSpeed : 4); },
            set(v) { if (this._ai) this._ai._engageSpeed = v; else this.__aiEngageSpeed = v; },
            configurable: true
        });

        Object.defineProperty(Game_Event.prototype, "_aiAttackRange", {
            get() { return this._ai ? this._ai._attackRange : (this.__aiAttackRange !== undefined ? this.__aiAttackRange : 1); },
            set(v) { if (this._ai) this._ai._attackRange = v; else this.__aiAttackRange = v; },
            configurable: true
        });

        Object.defineProperty(Game_Event.prototype, "_aiEngageRange", {
            get() { return this._ai ? this._ai._engageRange : (this.__aiEngageRange !== undefined ? this.__aiEngageRange : 4); },
            set(v) { if (this._ai) this._ai._engageRange = v; else this.__aiEngageRange = v; },
            configurable: true
        });

        Object.defineProperty(Game_Event.prototype, "_aiSearchRange", {
            get() { return this._ai ? this._ai._searchRange : (this.__aiSearchRange !== undefined ? this.__aiSearchRange : 10); },
            set(v) { if (this._ai) this._ai._searchRange = v; else this.__aiSearchRange = v; },
            configurable: true
        });

        Object.defineProperty(Game_Event.prototype, "_aiSearchTime", {
            get() { return this._ai ? this._ai._searchTime : (this.__aiSearchTime !== undefined ? this.__aiSearchTime : 60); },
            set(v) { if (this._ai) this._ai._searchTime = v; else this.__aiSearchTime = v; },
            configurable: true
        });

        Object.defineProperty(Game_Event.prototype, "_aiAttackFrequency", {
            get() { return this._ai ? this._ai._attackFrequency : (this.__aiAttackFrequency !== undefined ? this.__aiAttackFrequency : 240); },
            set(v) { if (this._ai) this._ai._attackFrequency = v; else this.__aiAttackFrequency = v; },
            configurable: true
        });

        Object.defineProperty(Game_Event.prototype, "_aiAttackTimer", {
            get() { return this._ai ? this._ai._attackTimer : (this.__aiAttackTimer || 0); },
            set(v) { if (this._ai) this._ai._attackTimer = v; else this.__aiAttackTimer = v; },
            configurable: true
        });

        Object.defineProperty(Game_Event.prototype, "_aiSearchTimer", {
            get() { return this._ai ? this._ai._searchTimer : (this.__aiSearchTimer || 0); },
            set(v) { if (this._ai) this._ai._searchTimer = v; else this.__aiSearchTimer = v; },
            configurable: true
        });

        Object.defineProperty(Game_Event.prototype, "_aiBasePosition", {
            get() { return this._ai ? this._ai._basePosition : (this.__aiBasePosition || null); },
            set(v) { if (this._ai) this._ai._basePosition = v; else this.__aiBasePosition = v; },
            configurable: true
        });

        Object.defineProperty(Game_Event.prototype, "_aiZoneEngagementRange", {
            get() { return this._ai ? this._ai._zoneEngagementRange : (this.__aiZoneEngagementRange || null); },
            set(v) { if (this._ai) this._ai._zoneEngagementRange = v; else this.__aiZoneEngagementRange = v; },
            configurable: true
        });

        Object.defineProperty(Game_Event.prototype, "_aiLastKnownX", {
            get() { return this._ai ? this._ai._lastKnownX : (this.__aiLastKnownX || null); },
            set(v) { if (this._ai) this._ai._lastKnownX = v; else this.__aiLastKnownX = v; },
            configurable: true
        });

        Object.defineProperty(Game_Event.prototype, "_aiLastKnownY", {
            get() { return this._ai ? this._ai._lastKnownY : (this.__aiLastKnownY || null); },
            set(v) { if (this._ai) this._ai._lastKnownY = v; else this.__aiLastKnownY = v; },
            configurable: true
        });

        /**
         * Mise à jour de l'IA déléguée à l'instance IAManager.
         */
        Game_Event.prototype.updateAI = function() {
            if (this._ai) {
                this._ai.update();
            }
        };

        Game_Event.prototype.updateAINeutral = function(target) {
            if (this._ai) this._ai.updateNeutral(target || this.aiTarget());
        };

        Game_Event.prototype.updateAIEngage = function(target) {
            if (this._ai) this._ai.updateEngage(target || this.aiTarget());
        };

        Game_Event.prototype.updateAISearch = function(target) {
            if (this._ai) this._ai.updateSearch(target || this.aiTarget());
        };

        Game_Event.prototype.updateAIReturn = function(target) {
            if (this._ai) this._ai.updateReturn(target || this.aiTarget());
        };

        const _Game_Event_update = Game_Event.prototype.update;
        Game_Event.prototype.update = function() {
            if (_Game_Event_update) {
                _Game_Event_update.call(this);
            }
            this.updateAI();
        };

        /**
         * Neutralise la route autonome RMMZ lorsque l'IA est en mode engage, recherche ou retour.
         */
        const _Game_Event_updateSelfMovement = Game_Event.prototype.updateSelfMovement;
        Game_Event.prototype.updateSelfMovement = function() {
            if (this._ai && this._ai.mode() && this._ai.state() !== "neutral") {
                return;
            }
            if (_Game_Event_updateSelfMovement) {
                _Game_Event_updateSelfMovement.call(this);
            }
        };
    }
})();
