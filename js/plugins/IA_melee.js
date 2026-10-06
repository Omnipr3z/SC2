//=============================================================================
// RPG Maker MZ - IA_melee.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] IA spécialisée de Combat au Corps-à-Corps (Hérite de IAManager).
 * @author SimCraft 4
 *
 * @help IA_melee.js
 *
 * Spécialisation de l'IA pour les ennemis au corps-à-corps (<AI_MODE: melee>).
 * Hérite de la classe IAManager.
 */

class IA_Melee extends IAManager {
    /**
     * @param {Game_Event} event 
     */
    constructor(event) {
        super(event);
        this._mode = "melee";
        if (!this._attackRange || this._attackRange < 1) {
            this._attackRange = 1;
        }
    }

    /**
     * Exécute une attaque au corps-à-corps sur la cible.
     * Déclenche l'animation d'action ("atk"), fige le compteur d'attaque pendant l'anim,
     * résout les dégâts via FightManager, et remet le compteur à zéro à la fin de l'anim.
     * @param {Game_CharacterBase} target 
     */
    executeAttack(target) {
        const event = this._event;
        if (!event || !target) return;

        // Fait face à la cible
        if (typeof event.turnTowardCharacter === "function") {
            event.turnTowardCharacter(target);
        }

        const attackerBattler = typeof event.battler === "function" ? event.battler() : null;
        if (!attackerBattler || (typeof attackerBattler.isDead === "function" && attackerBattler.isDead())) {
            return;
        }

        // Sélection de la compétence de l'ennemi
        let skillId = 1;
        if (typeof attackerBattler.enemy === "function") {
            const enemyData = attackerBattler.enemy();
            if (enemyData && enemyData.actions && enemyData.actions.length > 0) {
                if (typeof attackerBattler.makeActions === "function") {
                    attackerBattler.makeActions();
                    const curAct = typeof attackerBattler.currentAction === "function" ? attackerBattler.currentAction() : null;
                    if (curAct && curAct.item()) {
                        skillId = curAct.item().id;
                    } else {
                        skillId = enemyData.actions[0].skillId || 1;
                    }
                } else {
                    skillId = enemyData.actions[0].skillId || 1;
                }
            }
        }
        const skill = (typeof $dataSkills !== "undefined" && $dataSkills) ? $dataSkills[skillId] : null;

        let enemyActionName = "atk";
        if (skill && skill.note) {
            const matchAction = skill.note.match(/<action:\s*["']?([a-zA-Z0-9_-]+)["']?>/i);
            if (matchAction) {
                enemyActionName = matchAction[1].toLowerCase();
            }
        }

        // Lancement de l'action animée de l'ennemi
        if (typeof event.playAction === "function") {
            event.playAction({
                action: enemyActionName,
                duration: 4,
                frames: 4,
                onEnd: () => {
                    // "Pendant la durée de l'anim d'attaque du character ("atk" ou autre) le compteur d'attack ne doit pas defilé. Il doit etre remis à zero à la fin de l'anim"
                    this.resetAttackTimer();
                }
            });
        } else {
            this.resetAttackTimer();
        }

        // Résolution de l'impact et des dégâts via FightManager
        if (window.$fightManager && typeof window.$fightManager.executeEnemyAttack === "function") {
            window.$fightManager.executeEnemyAttack(event, target, skillId);
        }
    }
}

window.IA_Melee = IA_Melee;
