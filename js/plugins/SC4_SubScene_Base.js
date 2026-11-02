//=============================================================================
// SimCraft 4 - SubScene Base Component
// SC4_SubScene_Base.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Classe de base abstraite pour les sous-scènes enfants (SubScenes) héritant de Scene_Base.
 * @author SimCraft 4 Core Team
 * @help
 * ============================================================================
 * ■ SC4_SubScene_Base : Moteur de Sous-Scènes Autonomes (Child Scenes)
 * ============================================================================
 * Ce plugin fournit l'infrastructure générique des sous-scènes (SubScenes)
 * superposées sur Scene_Map sans rupture de boucle de rendu ni duplication de carte.
 *
 * Hérite de manière sécurisée de Scene_Base (donc d'un PIXI.Container / Stage)
 * pour offrir nativement :
 * - createWindowLayer() & addWindow()
 * - updateChildren() automatique
 * - Voile d'ombrage optionnel (Dimmer)
 * - Cycle de vie standardisé : create() -> start() -> update() -> stop() -> terminate()
 * ============================================================================
 */

(function () {
    "use strict";

    // Résolution sécurisée de la classe parente (Scene_Base -> Stage -> PIXI.Container -> Object)
    const ParentClass = (typeof Scene_Base !== "undefined")
        ? Scene_Base
        : ((typeof Stage !== "undefined")
            ? Stage
            : ((typeof PIXI !== "undefined" && PIXI.Container) ? PIXI.Container : class {}));

    // ========================================================================
    // 1. CLASSE SUBSCENE_BASE
    // ========================================================================
    class SubScene_Base extends ParentClass {
        constructor(parentScene, ...args) {
            super();
            this._parentScene = parentScene || null;
            this._callerSubScene = null;
            this._active = false;
            this._closing = false;
            this._windows = [];
            this._dimmerSprite = null;
            this.initMembers(...args);
        }

        /**
         * Hook d'initialisation des variables d'instance spécifiques.
         */
        initMembers(...args) {
            // Surchargeable par les sous-classes
        }

        get parentScene() {
            return this._parentScene;
        }

        set parentScene(scene) {
            this._parentScene = scene;
        }

        get callerSubScene() {
            return this._callerSubScene;
        }

        set callerSubScene(subScene) {
            this._callerSubScene = subScene;
        }

        isActive() {
            return !!this._active;
        }

        isClosing() {
            return !!this._closing;
        }

        // ====================================================================
        // 2. CYCLE DE VIE (LIFECYCLE)
        // ====================================================================

        create() {
            this.createDimmer();
            this.createWindowLayer();
            this.createDisplayObjects();
        }

        createDimmer(opacity = 120) {
            if (typeof Sprite !== "undefined" && typeof Bitmap !== "undefined" && typeof Graphics !== "undefined") {
                this._dimmerSprite = new Sprite();
                this._dimmerSprite.bitmap = new Bitmap(Graphics.width, Graphics.height);
                this._dimmerSprite.bitmap.fillAll("rgba(0, 0, 0, 0.6)");
                this._dimmerSprite.opacity = opacity;
                this.addChild(this._dimmerSprite);
            }
        }

        createWindowLayer() {
            if (typeof super.createWindowLayer === "function") {
                super.createWindowLayer();
            } else if (typeof WindowLayer !== "undefined") {
                const w = (typeof Graphics !== "undefined") ? Graphics.boxWidth : 1280;
                const h = (typeof Graphics !== "undefined") ? Graphics.boxHeight : 720;
                const x = (typeof Graphics !== "undefined") ? (Graphics.width - w) / 2 : 0;
                const y = (typeof Graphics !== "undefined") ? (Graphics.height - h) / 2 : 0;
                this._windowLayer = new WindowLayer();
                this._windowLayer.x = x;
                this._windowLayer.y = y;
                this.addChild(this._windowLayer);
            }
        }

        createDisplayObjects() {
            // Hook principal pour les sous-classes : instancier fenêtres et sprites
        }

        start() {
            this._active = true;
            this._closing = false;
            this.onStart();
        }

        onStart() {
            // Hook de démarrage (activer la fenêtre principale, etc.)
        }

        update() {
            if (!this.isActive()) return;
            if (typeof super.update === "function") {
                super.update();
            } else {
                this.updateChildren();
            }
            this.updateMain();
        }

        updateChildren() {
            if (this._windows && Array.isArray(this._windows)) {
                for (let i = 0; i < this._windows.length; i++) {
                    const win = this._windows[i];
                    if (win && typeof win.update === "function") {
                        win.update();
                    }
                }
            }
        }

        updateMain() {
            // Hook d'actualisation propre à la sous-scène
        }

        stop() {
            this._active = false;
            this.onStop();
        }

        onStop() {
            // Hook d'arrêt
        }

        terminate() {
            this.onDestroy();
            this.destroyWindows();
        }

        onDestroy() {
            // Hook de destruction / nettoyage des écouteurs
        }

        destroyWindows() {
            if (this._windows && Array.isArray(this._windows)) {
                for (let i = 0; i < this._windows.length; i++) {
                    const win = this._windows[i];
                    if (win && typeof win.destroy === "function") {
                        win.destroy();
                    }
                }
                this._windows = [];
            }
        }

        // ====================================================================
        // 3. GESTION DES FENÊTRES & FERMETURE
        // ====================================================================

        addWindow(window) {
            if (!window) return;
            this._windows.push(window);
            if (this._windowLayer && typeof this._windowLayer.addChild === "function") {
                this._windowLayer.addChild(window);
            } else if (typeof this.addChild === "function") {
                this.addChild(window);
            }
        }

        /**
         * Met en veille la sous-scène lorsqu'une sous-scène enfant (Inception) est ouverte par-dessus.
         */
        deactivate() {
            this._active = false;
            if (this._windows && Array.isArray(this._windows)) {
                for (let i = 0; i < this._windows.length; i++) {
                    const win = this._windows[i];
                    if (win && typeof win.deactivate === "function") {
                        win.deactivate();
                    }
                }
            }
            this.onDeactivate();
        }

        onDeactivate() {
            // Hook de mise en veille pour les sous-classes
        }

        /**
         * Réactive la sous-scène lorsque la sous-scène enfant est fermée.
         */
        reactivate() {
            this._active = true;
            this._closing = false;
            if (this._windows && Array.isArray(this._windows)) {
                for (let i = 0; i < this._windows.length; i++) {
                    const win = this._windows[i];
                    if (win && typeof win.activate === "function") {
                        win.activate();
                    }
                }
            }
            this.onReactivate();
        }

        onReactivate() {
            // Hook de réactivation pour les sous-classes
        }

        /**
         * Hook appelé lors du retour d'une sous-scène enfant avec résultat optionnel.
         * @param {SubScene_Base} childSubScene 
         * @param {any} [result=null] 
         */
        onSubSceneResume(childSubScene, result = null) {
            // Surchargeable par les sous-classes (ex: SubScene_RelationDialog ou Console)
        }

        /**
         * Ouvre une sous-scène enfant au-dessus de celle-ci (Inception).
         * @param {class} subSceneClass 
         * @param  {...any} args 
         * @returns {SubScene_Base}
         */
        openChildSubScene(subSceneClass, ...args) {
            if (this._parentScene && typeof this._parentScene.openSubScene === "function") {
                return this._parentScene.openSubScene(subSceneClass, ...args);
            }
            return null;
        }

        /**
         * Ferme cette sous-scène en transmettant optionnellement un résultat à la sous-scène parente.
         * @param {any} [result=null] 
         */
        close(result = null) {
            if (this._closing) return;
            this._closing = true;
            if (this._parentScene && typeof this._parentScene.closeSubScene === "function") {
                this._parentScene.closeSubScene(result);
            }
        }
    }

    // Export global
    if (typeof window !== "undefined") {
        window.SubScene_Base = SubScene_Base;
        window.SC4_SubScene_Base = SubScene_Base;
    }
    if (typeof global !== "undefined") {
        global.SubScene_Base = SubScene_Base;
        global.SC4_SubScene_Base = SubScene_Base;
    }

    // ========================================================================
    // 4. INTÉGRATION SUR SCENE_MAP
    // ========================================================================
    if (typeof Scene_Map !== "undefined") {
        const _Scene_Map_update = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function () {
            _Scene_Map_update.call(this);
            if (this._currentSubScene && this._currentSubScene.isActive()) {
                this._currentSubScene.update();
            }
        };

        Scene_Map.prototype.openSubScene = function (subSceneClass, ...args) {
            this._subSceneStack = this._subSceneStack || [];

            // Inception : si une sous-scène est déjà active, on l'endort et on l'empile
            let caller = null;
            if (this._currentSubScene) {
                caller = this._currentSubScene;
                if (typeof caller.deactivate === "function") {
                    caller.deactivate();
                }
                this._subSceneStack.push(caller);
            }

            const subScene = new subSceneClass(this, ...args);
            subScene.callerSubScene = caller;
            this._currentSubScene = subScene;
            this.addChild(subScene);
            subScene.create();
            subScene.start();
            this.onSubSceneOpen(subScene);
            return subScene;
        };

        Scene_Map.prototype.closeSubScene = function (result = null) {
            if (this._currentSubScene) {
                const closingSubScene = this._currentSubScene;
                closingSubScene.stop();
                closingSubScene.terminate();
                this.removeChild(closingSubScene);
                this._currentSubScene = null;

                // Inception : Dépilement LIFO
                this._subSceneStack = this._subSceneStack || [];
                if (this._subSceneStack.length > 0) {
                    const previousSubScene = this._subSceneStack.pop();
                    this._currentSubScene = previousSubScene;
                    if (typeof previousSubScene.reactivate === "function") {
                        previousSubScene.reactivate();
                    }
                    if (typeof previousSubScene.onSubSceneResume === "function") {
                        previousSubScene.onSubSceneResume(closingSubScene, result);
                    }
                } else {
                    this.onSubSceneClose(closingSubScene);
                }
            }
        };

        Scene_Map.prototype.closeAllSubScenes = function () {
            while (this._currentSubScene || (this._subSceneStack && this._subSceneStack.length > 0)) {
                this.closeSubScene();
            }
        };

        Scene_Map.prototype.currentSubScene = function () {
            return this._currentSubScene;
        };

        Scene_Map.prototype.subSceneStackDepth = function () {
            return (this._subSceneStack ? this._subSceneStack.length : 0) + (this._currentSubScene ? 1 : 0);
        };

        Scene_Map.prototype.onSubSceneOpen = function (subScene) {
            this._subSceneInputBlocked = true;
        };

        Scene_Map.prototype.onSubSceneClose = function (subScene) {
            this._subSceneInputBlocked = false;
        };

        // Neutralise les clics tactiles/souris de déplacement sur la carte
        const _Scene_Map_processMapTouch = Scene_Map.prototype.processMapTouch;
        Scene_Map.prototype.processMapTouch = function () {
            if (this._currentSubScene && this._currentSubScene.isActive()) {
                return;
            }
            if (_Scene_Map_processMapTouch) {
                _Scene_Map_processMapTouch.call(this);
            }
        };

        // Neutralise l'ouverture du menu principal quand une sous-scène est active
        const _Scene_Map_isMenuEnabled = Scene_Map.prototype.isMenuEnabled;
        Scene_Map.prototype.isMenuEnabled = function () {
            if (this._currentSubScene && this._currentSubScene.isActive()) {
                return false;
            }
            return _Scene_Map_isMenuEnabled ? _Scene_Map_isMenuEnabled.call(this) : true;
        };
    }
})();
