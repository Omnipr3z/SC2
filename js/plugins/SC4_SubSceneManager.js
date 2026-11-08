//=============================================================================
// SimCraft 4 - SubScene Manager Component
// SC4_SubSceneManager.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Gestionnaire centralisé du cycle de vie et de la persistance des sous-scènes.
 * @author SimCraft 4 Core Team
 * 
 * @help SC4_SubSceneManager.js
 * 
 * ============================================================================
 * ■ SC4_SubSceneManager : Orchestrateur de Sous-Scènes & Persistance
 * ============================================================================
 * Ce gestionnaire centralise :
 * 1. La suspension et la reprise des sous-scènes à travers les transitions de
 *    scènes natives RMMZ (ex: passage de Scene_Map à Scene_SpaceTravel, puis popScene).
 * 2. L'accès global à la sous-scène active.
 * 3. La purge explicite lors des transitions terminales (atterrissage, sortie).
 * ============================================================================
 */

class SubSceneManager {
    static init() {
        this._suspended = null;
    }

    /**
     * Mémorise une sous-scène active pour réouverture au retour d'une scène plein écran.
     * @param {SubScene_Base} subScene 
     * @param {any} [resumeData=null] Données contextuelles de reprise (ex: mode, index)
     */
    static suspend(subScene, resumeData = null) {
        if (!subScene) return;
        this._suspended = {
            subSceneClass: subScene.constructor,
            args: typeof subScene.resumeArgs === "function" ? subScene.resumeArgs() : [],
            resumeData: resumeData
        };
        if (typeof subScene.onSuspend === "function") {
            subScene.onSuspend();
        }
    }

    /**
     * Indique si une sous-scène est actuellement en attente de réouverture.
     * @returns {boolean}
     */
    static isSuspended() {
        return Boolean(this._suspended);
    }

    /**
     * Retourne les données de la sous-scène suspendue.
     * @returns {object|null}
     */
    static suspendedData() {
        return this._suspended;
    }

    /**
     * Restaure la sous-scène suspendue sur la scène hôte spécifiée (ex: Scene_Map).
     * Consomme immédiatement l'état suspendu pour éviter toute réouverture multiple.
     * @param {Scene_Base} parentScene 
     * @returns {SubScene_Base|null}
     */
    static resume(parentScene) {
        if (!this._suspended || !parentScene || typeof parentScene.openSubScene !== "function") {
            return null;
        }
        const { subSceneClass, args, resumeData } = this._suspended;
        this._suspended = null;

        const subScene = parentScene.openSubScene(subSceneClass, ...args);
        if (subScene && typeof subScene.onResume === "function") {
            subScene.onResume(resumeData);
        }
        return subScene;
    }

    /**
     * Purge définitivement la sous-scène en attente sans la restaurer.
     */
    static clear() {
        this._suspended = null;
    }

    /**
     * Retourne la sous-scène actuellement active sur la scène courante.
     * @returns {SubScene_Base|null}
     */
    static current() {
        const scene = (typeof SceneManager !== "undefined") ? SceneManager._scene : null;
        if (!scene) return null;
        if (typeof scene.currentSubScene === "function") {
            return scene.currentSubScene();
        }
        return scene._currentSubScene || null;
    }

    /**
     * Ouvre une sous-scène sur la scène active courante.
     * @param {class} subSceneClass 
     * @param  {...any} args 
     * @returns {SubScene_Base|null}
     */
    static open(subSceneClass, ...args) {
        const scene = (typeof SceneManager !== "undefined") ? SceneManager._scene : null;
        if (scene && typeof scene.openSubScene === "function") {
            return scene.openSubScene(subSceneClass, ...args);
        }
        return null;
    }

    /**
     * Ferme la sous-scène active courante.
     * @param {any} [result=null] 
     */
    static close(result = null) {
        const scene = (typeof SceneManager !== "undefined") ? SceneManager._scene : null;
        if (scene && typeof scene.closeSubScene === "function") {
            return scene.closeSubScene(result);
        }
        return null;
    }
    /**
     * Vérifie si une sous-scène est active sur la scène courante.
     * @param {class} [subSceneClass=null] Optionnel : filtre sur une classe spécifique (ex: SubScene_Console)
     * @returns {boolean}
     */
    static isActive(subSceneClass = null) {
        const cur = this.current();
        if (!cur || !cur.isActive()) return false;
        if (subSceneClass) {
            return cur instanceof subSceneClass || cur.constructor === subSceneClass;
        }
        return true;
    }
}

SubSceneManager.init();

window.SubSceneManager = SubSceneManager;
if (typeof module !== "undefined" && module.exports) {
    module.exports = SubSceneManager;
}

