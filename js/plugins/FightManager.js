//=============================================================================
// FightManager.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Gestionnaire du système de combat ARPG en temps réel.
 * @author SimCraft
 * @help
 * ============================================================================
 * FightManager.js
 * ============================================================================
 * Gère le système de combat temps réel :
 * - Répertoire des événements acteurs (ActorEvent) sur la carte.
 * - Détection des cibles au contact (mêlée / mains nues).
 * - Résolution des compétences (Game_Action) selon les formules natives RMMZ.
 * - Réactions visuelles : orientation face à l'attaquant, animation de skill,
 *   knockback (recul d'une case) et action "hurt", ou action "down" et
 *   activation de l'interrupteur local C à la défaite.
 * - Historique et stockage des résultats d'attaques.
 * ============================================================================
 */

/**
 * Chef d'orchestre du combat temps réel dans SC4.
 */
class FightManager {
    constructor() {
        this._actorEvents = [];
        this._resultsHistory = [];
        this._lastResult = null;
    }

    /**
     * Initialise ou rafraîchit la liste des événements acteurs présents sur la carte.
     * Filtre les événements possédant le notetag <actor: ID>.
     * @returns {Game_Event[]}
     */
    refreshMapEvents() {
        this._actorEvents = [];
        if (typeof $gameMap !== "undefined" && $gameMap && typeof $gameMap.events === "function") {
            for (const ev of $gameMap.events()) {
                if (ev && typeof ev.actorId === "function" && ev.actorId() > 0) {
                    this._actorEvents.push(ev);
                }
            }
        }
        return this._actorEvents;
    }

    /**
     * Retourne les ActorEvents répertoriés sur la carte active.
     * @returns {Game_Event[]}
     */
    actorEvents() {
        return this.refreshMapEvents();
    }

    /**
     * Recherche un événement hostile vivant au contact ou en collapse avec un personnage.
     * Vérifie dans l'ordre :
     * 1. Case directement visée / devant le personnage (frontX, frontY)
     * 2. Case identique (collapse / superposition directe) (x, y)
     * 3. Cases adjacentes au contact direct (distance <= 1 case en x et y)
     * @param {Game_CharacterBase} attacker 
     * @param {number} [direction=null] Direction de visée / regard (1..9)
     * @returns {Game_Event|null}
     */
    findHostileTarget(attacker, direction = null) {
        if (!attacker || typeof $gameMap === "undefined" || !$gameMap) return null;
        const dir = direction || attacker.direction();

        let dx = 0;
        let dy = 0;
        switch (dir) {
            case 2: dy = 1; break; // Bas
            case 4: dx = -1; break; // Gauche
            case 6: dx = 1; break; // Droite
            case 8: dy = -1; break; // Haut
            case 1: dx = -1; dy = 1; break; // Bas-Gauche
            case 3: dx = 1; dy = 1; break; // Bas-Droite
            case 7: dx = -1; dy = -1; break; // Haut-Gauche
            case 9: dx = 1; dy = -1; break; // Haut-Droite
        }

        const isValidTarget = (ev) => {
            if (!ev || ev._erased) return false;
            // Optimisation de performance : ne considérer que les ennemis visibles à l'écran
            if (typeof ev.isNearTheScreen === "function" && !ev.isNearTheScreen()) return false;
            const hostile = typeof ev.isHostile === "function" ? ev.isHostile() : false;
            if (!hostile) return false;
            const b = typeof ev.battler === "function" ? ev.battler() : null;
            return b ? !b.isDead() : true;
        };

        // 1. Case ciblée devant dans la direction de l'action
        const frontX = $gameMap.roundX(attacker.x + dx);
        const frontY = $gameMap.roundY(attacker.y + dy);
        let target = $gameMap.eventsXy(frontX, frontY).find(isValidTarget);
        if (target) return target;

        // 2. Case identique (collapse / superposition directe)
        target = $gameMap.eventsXy(attacker.x, attacker.y).find(isValidTarget);
        if (target) return target;

        return null;
    }

    /**
     * Méthode de compatibilité pointant vers findHostileTarget.
     * @param {Game_CharacterBase} attacker 
     * @param {number} [direction=null] 
     * @returns {Game_Event|null}
     */
    findHostileTargetInFront(attacker, direction = null) {
        return this.findHostileTarget(attacker, direction);
    }

    /**
     * Déclenche la vérification et l'exécution d'une attaque lorsque le joueur lance l'action "atk".
     * @param {Game_Player} player 
     * @param {number} direction Direction de l'attaque
     * @returns {boolean} true si une attaque hostile a été résolue
     */
    onPlayerAttack(player, direction) {
        if (!player) return false;
        const actor = (typeof player.actor === "function" ? player.actor() : null) ||
                      (typeof player.hero === "function" ? player.hero() : null) ||
                      (typeof $gameParty !== "undefined" && $gameParty ? $gameParty.leader() : null);
        if (!actor) return false;

        // Étape 9 : Attaque à mains nues uniquement si le joueur n'a pas d'arme
        if (typeof actor.hasNoWeapons === "function" && !actor.hasNoWeapons()) {
            return false;
        }

        const targetEvent = this.findHostileTarget(player, direction);
        if (!targetEvent) return false;

        return this.executeAttack(player, targetEvent);
    }

    /**
     * Résout l'attaque au corps-à-corps d'un personnage sur un événement ennemi.
     * @param {Game_CharacterBase} attackerChar 
     * @param {Game_Event} targetEvent 
     * @returns {boolean}
     */
    executeAttack(attackerChar, targetEvent) {
        const attackerActor = (typeof attackerChar.actor === "function" ? attackerChar.actor() : null) ||
                              (typeof attackerChar.hero === "function" ? attackerChar.hero() : null) ||
                              (typeof $gameParty !== "undefined" && $gameParty ? $gameParty.leader() : null);
        let targetBattler = typeof targetEvent.battler === "function" ? targetEvent.battler() : null;
        if (!targetBattler && targetEvent._enemyId > 0 && typeof Game_Enemy !== "undefined") {
            targetBattler = new Game_Enemy(targetEvent._enemyId, 0, 0);
            targetEvent._enemyBattler = targetBattler;
        }

        if (!attackerActor || !targetBattler) return false;

        const evId = typeof targetEvent.eventId === "function" ? targetEvent.eventId() : (targetEvent._eventId || 0);
        const targetActorId = (typeof targetEvent.actorId === "function" ? targetEvent.actorId() : targetEvent._actorId) || 0;
        console.log(`Event ${evId} actor ${targetActorId} hurted`);

        const skillId = typeof attackerActor.attackSkillId === "function" ? attackerActor.attackSkillId() : 1;
        const skill = (typeof $dataSkills !== "undefined" && $dataSkills) ? $dataSkills[skillId] : null;

        // 1. L'event fait face au player avec direction fixe
        if (typeof targetEvent.turnTowardCharacter === "function") {
            targetEvent.turnTowardCharacter(attackerChar);
        }
        targetEvent.setDirectionFix(true);

        // 2. L'animation de la compétence est jouée sur l'event
        let animId = skill ? skill.animationId : 1;
        if (animId === -1) {
            animId = (attackerActor.bareHandsAnimationId && attackerActor.bareHandsAnimationId()) || 1;
        }
        if (animId > 0 && typeof $gameTemp !== "undefined" && $gameTemp && typeof $gameTemp.requestAnimation === "function") {
            $gameTemp.requestAnimation([targetEvent], animId);
        }

        // 3. Résolution de l'attaque via Game_Action (moteur natif RMMZ)
        const action = new Game_Action(attackerActor);
        action.setSkill(skillId);
        action.apply(targetBattler);

        const result = targetBattler.result ? targetBattler.result() : null;
        const damage = result ? result.hpDamage : 0;
        const isDead = targetBattler.isDead();

        // Enregistrement du résultat dans le FightManager
        const fightRecord = {
            attacker: attackerChar,
            target: targetEvent,
            skillId: skillId,
            damage: damage,
            critical: result ? Boolean(result.critical) : false,
            isDead: isDead,
            timestamp: Date.now()
        };
        this._lastResult = fightRecord;
        this._resultsHistory.push(fightRecord);

        // 4. Réaction visuelle et physique de l'événement
        if (!isDead) {
            this.applyKnockback(attackerChar, targetEvent);
            if (targetEvent._ai && typeof targetEvent._ai.onHurt === "function") {
                targetEvent._ai.onHurt();
            }
            if (typeof targetEvent.playAction === "function") {
                targetEvent.playAction({
                    action: "hurt",
                    duration: 8,
                    frames: 3,
                    onEnd: () => {
                        targetEvent.setDirectionFix(false);
                        targetEvent.setAction("walk");
                        if (typeof targetEvent.setPattern === "function") {
                            targetEvent.setPattern(1);
                        }
                    }
                });
            } else {
                targetEvent.setDirectionFix(false);
            }
        } else {
            if (typeof targetEvent.playAction === "function") {
                targetEvent.playAction({
                    action: "down",
                    duration: 10,
                    frames: 3,
                    onEnd: () => {
                        if (typeof $gameMap !== "undefined" && $gameMap && typeof $gameSelfSwitches !== "undefined") {
                            const key = [$gameMap.mapId(), targetEvent.eventId(), "C"];
                            $gameSelfSwitches.setValue(key, true);
                        }
                        targetEvent.setDirectionFix(false);
                    }
                });
            } else {
                if (typeof $gameMap !== "undefined" && $gameMap && typeof $gameSelfSwitches !== "undefined") {
                    const key = [$gameMap.mapId(), targetEvent.eventId(), "C"];
                    $gameSelfSwitches.setValue(key, true);
                }
                targetEvent.setDirectionFix(false);
            }
        }

        return true;
    }

    /**
     * Applique la projection en arrière (knockback) d'une case.
     * La cible faisant face à l'assaillant, elle est propulsée dans la direction opposée à son regard.
     * @param {Game_CharacterBase} attackerChar 
     * @param {Game_CharacterBase} targetChar 
     */
    applyKnockback(attackerChar, targetChar) {
        const targetDir = typeof targetChar.direction === "function" ? targetChar.direction() : 2;
        let knockbackDir = 10 - targetDir;
        if (typeof targetChar.reverseDir8 === "function") {
            knockbackDir = targetChar.reverseDir8(targetDir);
        }

        let dx = 0;
        let dy = 0;
        switch (knockbackDir) {
            case 2: dy = 1; break;
            case 4: dx = -1; break;
            case 6: dx = 1; break;
            case 8: dy = -1; break;
            case 1: dx = -1; dy = 1; break;
            case 3: dx = 1; dy = 1; break;
            case 7: dx = -1; dy = -1; break;
            case 9: dx = 1; dy = -1; break;
        }

        let canPass = false;
        if (dx !== 0 && dy !== 0 && typeof targetChar.canPassDiagonally === "function") {
            canPass = targetChar.canPassDiagonally(targetChar.x, targetChar.y, dx > 0 ? 6 : 4, dy > 0 ? 2 : 8);
        } else if (typeof targetChar.canPass === "function") {
            canPass = targetChar.canPass(targetChar.x, targetChar.y, knockbackDir);
        }

        if (canPass && typeof targetChar.jump === "function") {
            targetChar.jump(dx, dy);
        }
    }

    /**
     * Résout l'attaque au corps-à-corps d'un ennemi sur un personnage (par défaut le joueur).
     * @param {Game_Event} attackerEvent 
     * @param {Game_CharacterBase} [targetChar] 
     * @returns {boolean} true si l'attaque a été résolue
     */
    executeEnemyAttack(attackerEvent, targetChar) {
        if (!attackerEvent) return false;
        targetChar = targetChar || (typeof $gamePlayer !== "undefined" ? $gamePlayer : null);
        if (!targetChar) return false;

        let attackerBattler = typeof attackerEvent.battler === "function" ? attackerEvent.battler() : null;
        if (!attackerBattler && attackerEvent._enemyId > 0 && typeof Game_Enemy !== "undefined") {
            attackerBattler = new Game_Enemy(attackerEvent._enemyId, 0, 0);
            attackerEvent._enemyBattler = attackerBattler;
        }
        if (!attackerBattler || (typeof attackerBattler.isDead === "function" && attackerBattler.isDead())) {
            return false;
        }

        let targetBattler = (typeof targetChar.actor === "function" ? targetChar.actor() : null) ||
                            (typeof targetChar.hero === "function" ? targetChar.hero() : null) ||
                            (typeof targetChar.battler === "function" ? targetChar.battler() : null) ||
                            (typeof $gameParty !== "undefined" && $gameParty ? $gameParty.leader() : null);
        if (!targetBattler || (typeof targetBattler.isDead === "function" && targetBattler.isDead())) {
            return false;
        }

        // Sélection de la compétence de l'ennemi (vanilla actions)
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

        const evId = typeof attackerEvent.eventId === "function" ? attackerEvent.eventId() : (attackerEvent._eventId || 0);
        const attackerEnemyId = (typeof attackerEvent.enemyId === "function" ? attackerEvent.enemyId() : attackerEvent._enemyId) || 0;
        console.log(`Enemy Event ${evId} (Enemy ${attackerEnemyId}) attacks with skill ${skillId}`);

        // 1. L'ennemi fait face à la cible
        if (typeof attackerEvent.turnTowardCharacter === "function") {
            attackerEvent.turnTowardCharacter(targetChar);
        }

        // 2. Animation d'action de l'ennemi (notetag de la compétence ou "atk")
        let enemyActionName = "atk";
        if (skill && skill.note) {
            const matchAction = skill.note.match(/<action:\s*["']?([a-zA-Z0-9_-]+)["']?>/i);
            if (matchAction) {
                enemyActionName = matchAction[1].toLowerCase();
            }
        }
        if (typeof attackerEvent.playAction === "function") {
            attackerEvent.playAction({
                action: enemyActionName,
                duration: 4,
                frames: 4
            });
        }

        // 3. La cible fait face à l'ennemi avec direction fixe
        if (typeof targetChar.turnTowardCharacter === "function") {
            targetChar.turnTowardCharacter(attackerEvent);
        }
        if (typeof targetChar.setDirectionFix === "function") {
            targetChar.setDirectionFix(true);
        }

        // 4. L'animation de la compétence est jouée sur la cible
        let animId = skill ? skill.animationId : 1;
        if (animId === -1 && typeof attackerBattler.bareHandsAnimationId === "function") {
            animId = attackerBattler.bareHandsAnimationId() || 1;
        }
        if (animId > 0 && typeof $gameTemp !== "undefined" && $gameTemp && typeof $gameTemp.requestAnimation === "function") {
            $gameTemp.requestAnimation([targetChar], animId);
        }

        // 5. Résolution native des dégâts via Game_Action (moteur RMMZ)
        const action = new Game_Action(attackerBattler);
        action.setSkill(skillId);
        action.apply(targetBattler);

        const result = targetBattler.result ? targetBattler.result() : null;
        const damage = result ? result.hpDamage : 0;
        const isDead = targetBattler.isDead();

        // Enregistrement dans l'historique
        const fightRecord = {
            attacker: attackerEvent,
            target: targetChar,
            skillId: skillId,
            damage: damage,
            critical: result ? Boolean(result.critical) : false,
            isDead: isDead,
            timestamp: Date.now()
        };
        this._lastResult = fightRecord;
        this._resultsHistory.push(fightRecord);

        // 6. Réaction visuelle et physique de la cible
        this.applyKnockback(attackerEvent, targetChar);

        if (!isDead) {
            if (typeof targetChar.playAction === "function") {
                targetChar.playAction({
                    action: "hurt",
                    duration: 8,
                    frames: 3,
                    onEnd: () => {
                        if (typeof targetChar.setDirectionFix === "function") {
                            targetChar.setDirectionFix(false);
                        }
                        if (typeof targetChar.setAction === "function") {
                            targetChar.setAction("walk");
                        }
                        if (typeof targetChar.setPattern === "function") {
                            targetChar.setPattern(1);
                        }
                    }
                });
            } else if (typeof targetChar.setDirectionFix === "function") {
                targetChar.setDirectionFix(false);
            }
        } else {
            if (typeof targetChar.playAction === "function") {
                targetChar.playAction({
                    action: "down",
                    duration: 10,
                    frames: 3,
                    onEnd: () => {
                        if (typeof targetChar.setDirectionFix === "function") {
                            targetChar.setDirectionFix(false);
                        }
                        this.checkGameOver(targetChar);
                    }
                });
            } else {
                if (typeof targetChar.setDirectionFix === "function") {
                    targetChar.setDirectionFix(false);
                }
                this.checkGameOver(targetChar);
            }
        }

        return true;
    }

    /**
     * Vérifie si le combat se termine par un Game Over.
     * @param {Game_CharacterBase} targetChar 
     */
    checkGameOver(targetChar) {
        const isPartyDead = (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.isAllDead === "function" && $gameParty.isAllDead());
        const isPlayerTarget = (typeof $gamePlayer !== "undefined" && targetChar === $gamePlayer);
        if (isPlayerTarget || isPartyDead) {
            if (typeof SceneManager !== "undefined" && SceneManager.goto && typeof Scene_Gameover !== "undefined") {
                SceneManager.goto(Scene_Gameover);
            }
        }
    }

    /**
     * Dernier résultat d'attaque résolu.
     * @returns {object|null}
     */
    lastResult() {
        return this._lastResult;
    }

    /**
     * Historique des résultats de combat.
     * @returns {Array<object>}
     */
    resultsHistory() {
        return this._resultsHistory;
    }

    /**
     * Réinitialise l'historique des combats.
     */
    clearHistory() {
        this._resultsHistory = [];
        this._lastResult = null;
    }
}

window.FightManager = FightManager;
window.$fightManager = new FightManager();
