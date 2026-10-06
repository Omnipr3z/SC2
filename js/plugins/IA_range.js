//=============================================================================
// RPG Maker MZ - IA_range.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] IA spécialisée de Combat à Distance (Hérite de IAManager).
 * @author SimCraft 4
 *
 * @help IA_range.js
 *
 * Spécialisation de l'IA pour les ennemis attaquant à distance (<AI_MODE: range>).
 * Hérite de la classe IAManager.
 */

class IA_Range extends IAManager {
    /**
     * @param {Game_Event} event 
     */
    constructor(event) {
        super(event);
        this._mode = "range";
        if (!this._attackRange || this._attackRange <= 1) {
            this._attackRange = 4; // Portée d'engagement à distance par défaut
        }
    }

    /**
     * Exécute une attaque à distance.
     * Prévu pour l'étape Gunfight / tir balistique.
     * @param {Game_CharacterBase} target 
     */
    executeAttack(target) {
        const event = this._event;
        if (!event || !target) return;

        if (typeof event.turnTowardCharacter === "function") {
            event.turnTowardCharacter(target);
        }

        if (typeof event.playAction === "function") {
            event.playAction({
                action: "atk",
                duration: 4,
                frames: 4,
                onEnd: () => {
                    this.resetAttackTimer();
                }
            });
        } else {
            this.resetAttackTimer();
        }

        if (window.$fightManager && typeof window.$fightManager.executeEnemyAttack === "function") {
            window.$fightManager.executeEnemyAttack(event, target);
        }
    }
}

window.IA_Range = IA_Range;
