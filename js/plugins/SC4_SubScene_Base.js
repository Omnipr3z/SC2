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
 * - Cycle de vie standardisé : create() -> start() -> update() -> stop() -> terminate()
 * ============================================================================
 */

// ========================================================================
// 1. CLASSE SUBSCENE_BASE
// ========================================================================
class SubScene_Base extends Scene_Base {
    constructor(parentScene, ...args) {
        super();
        this._parentScene = parentScene || null;
        this._callerSubScene = null;
        this._active = false;
        this._closing = false;
        this._windows = [];
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
        this.createWindowLayer();
        this.createDisplayObjects();
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
        if (typeof $tutoManager !== "undefined" && $tutoManager && typeof $tutoManager.isBusy === "function" && $tutoManager.isBusy()) {
            return;
        }
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

    // ====================================================================
    // 4. SUSPENSION & PERSISTANCE INTER-SCÈNES (SubSceneManager)
    // ====================================================================

    /**
     * Mémorise cette sous-scène dans SubSceneManager pour réouverture au retour.
     * @param {any} [resumeData=null]
     */
    suspend(resumeData = null) {
        if (typeof SubSceneManager !== "undefined") {
            SubSceneManager.suspend(this, resumeData);
        }
    }

    /**
     * Arguments passés au constructeur lors de la réinstanciation au retour.
     * À surcharger par les sous-classes si nécessaire.
     * @returns {any[]}
     */
    resumeArgs() {
        return [];
    }

    /**
     * Hook appelé juste avant la suspension.
     */
    onSuspend() {
        // Surchargeable par les sous-classes
    }

    /**
     * Hook appelé lors de la restauration après réinstanciation sur la nouvelle scène.
     * @param {any} [resumeData=null]
     */
    onResume(resumeData = null) {
        // Surchargeable par les sous-classes
    }
}

// Export global
window.SubScene_Base = SubScene_Base;
if (typeof module !== "undefined" && module.exports) {
    module.exports = SubScene_Base;
}
