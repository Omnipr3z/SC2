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
     * Recherche un événement hostile vivant au contact direct devant un personnage.
     * @param {Game_CharacterBase} attacker 
     * @param {number} [direction=null] Direction de visée / regard (1..9)
     * @returns {Game_Event|null}
     */
    findHostileTargetInFront(attacker, direction = null) {
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

        const frontX = $gameMap.roundX(attacker.x + dx);
        const frontY = $gameMap.roundY(attacker.y + dy);

        const events = $gameMap.eventsXy(frontX, frontY);
        console.log(`[FightManager] 🔍 findHostileTargetInFront : Case devant (${frontX}, ${frontY}) dir ${dir} -> ${events.length} événement(s)`);
        for (const ev of events) {
            const role = typeof ev.role === "function" ? ev.role() : "inconnu";
            const hostile = typeof ev.isHostile === "function" ? ev.isHostile() : false;
            const battler = typeof ev.battler === "function" ? ev.battler() : null;
            const isDead = battler ? battler.isDead() : "Pas de battler";
            console.log(`[FightManager]   - Event #${ev.eventId()} "${ev.event ? ev.event().name : 'N/A'}" : role="${role}", isHostile=${hostile}, battler=${Boolean(battler)}, isDead=${isDead}`);
            if (ev && !ev._erased && hostile) {
                if (battler && !battler.isDead()) {
                    console.log(`[FightManager]   🎯 Cible hostile valide trouvée : Event #${ev.eventId()}`);
                    return ev;
                }
            }
        }
        return null;
    }

    /**
     * Déclenche la vérification et l'exécution d'une attaque lorsque le joueur lance l'action "atk".
     * Condition : le joueur ne doit pas être équipé d'arme (mains nues).
     * @param {Game_Player} player 
     * @param {number} direction Direction de l'attaque
     * @returns {boolean} true si une attaque hostile a été résolue
     */
    onPlayerAttack(player, direction) {
        if (!player) return false;
        const actor = (typeof player.actor === "function" ? player.actor() : null) ||
                      (typeof player.hero === "function" ? player.hero() : null) ||
                      (typeof $gameParty !== "undefined" && $gameParty ? $gameParty.leader() : null);
        console.log(`[FightManager] ⚔️ onPlayerAttack appelé : pos=(${player.x}, ${player.y}), direction=${direction}, acteur=${actor ? (actor.name ? actor.name() : actor) : "aucun"}`);
        if (!actor) {
            console.warn("[FightManager] ❌ Aucun acteur trouvé pour le joueur !");
            return false;
        }

        // Condition : joueur non équipé d'arme (mains nues)
        const hasNoWeapons = typeof actor.hasNoWeapons === "function" ? actor.hasNoWeapons() : false;
        const weapons = (typeof actor.weapons === "function" ? actor.weapons().filter(Boolean) : []);
        console.log(`[FightManager] Vérification équipement : hasNoWeapons=${hasNoWeapons}, Armes équipées=[${weapons.map(w => w ? w.name : "").join(", ")}]`);
        if (!hasNoWeapons) {
            console.warn("[FightManager] ⚠️ ATTENTION : Le héros a une arme équipée ! L'attaque à mains nues ne se déclenche que si AUCUNE arme n'est équipée.");
            return false;
        }

        const targetEvent = this.findHostileTargetInFront(player, direction);
        if (!targetEvent) {
            console.warn("[FightManager] ⚠️ Aucune cible hostile vivante trouvée au contact direct devant le joueur.");
            return false;
        }

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
        const targetBattler = typeof targetEvent.battler === "function" ? targetEvent.battler() : null;
        if (!attackerActor || !targetBattler) {
            console.warn("[FightManager] ❌ executeAttack : attaquant ou battler cible manquant !");
            return false;
        }

        const skillId = typeof attackerActor.attackSkillId === "function" ? attackerActor.attackSkillId() : 1;
        const skill = (typeof $dataSkills !== "undefined" && $dataSkills) ? $dataSkills[skillId] : null;

        console.log(`[FightManager] 💥 executeAttack : ${attackerActor.name()} attaque Event #${targetEvent.eventId()} (${targetEvent.event ? targetEvent.event().name : 'Ennemi'})`);
        console.log(`[FightManager]   Skill #${skillId} "${skill ? skill.name : 'N/A'}", Battler: ${targetBattler.name()}, HP avant: ${targetBattler.hp}/${targetBattler.mhp}`);

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
        console.log(`[FightManager]   Joue animation #${animId} sur Event #${targetEvent.eventId()}`);
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

        console.log(`[FightManager]   Résultat Game_Action : Dégâts=${damage}, Critique=${result ? result.critical : false}, Touché=${result ? result.isHit() : false}, HP restant=${targetBattler.hp}/${targetBattler.mhp}, Mort=${isDead}`);

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
            // Non mort :
            // - Joue l'action "hurt" (duration: 8, frames: 3)
            // - Projeté une case en arrière avec direction fixe
            // - Revient en walk 1
            console.log(`[FightManager]   🥊 Ennemi SURVIT -> Déclenchement playAction("hurt", duration: 8, frames: 3) + knockback 1 case`);
            this.applyKnockback(attackerChar, targetEvent);
            if (typeof targetEvent.playAction === "function") {
                targetEvent.playAction({
                    action: "hurt",
                    duration: 8,
                    frames: 3,
                    onEnd: () => {
                        console.log(`[FightManager]   Fin de "hurt" sur Event #${targetEvent.eventId()}, retour en "walk" pattern 1`);
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
            // Vaincu :
            // - Joue l'action "down" (duration: 10, frames: 3)
            // - À la fin de cette action, active l'interrupteur local C
            console.log(`[FightManager]   💀 Ennemi VAINCU -> Déclenchement playAction("down", duration: 10, frames: 3) + activation SelfSwitch C`);
            if (typeof targetEvent.playAction === "function") {
                targetEvent.playAction({
                    action: "down",
                    duration: 10,
                    frames: 3,
                    onEnd: () => {
                        console.log(`[FightManager]   Fin de "down" sur Event #${targetEvent.eventId()} -> Activation SelfSwitch C`);
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
     * L'ennemi faisant face au joueur, il est propulsé dans la direction opposée à son regard.
     * @param {Game_CharacterBase} attackerChar 
     * @param {Game_Event} targetEvent 
     */
    applyKnockback(attackerChar, targetEvent) {
        const targetDir = targetEvent.direction();
        let knockbackDir = 10 - targetDir;
        if (typeof targetEvent.reverseDir8 === "function") {
            knockbackDir = targetEvent.reverseDir8(targetDir);
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
        if (dx !== 0 && dy !== 0 && typeof targetEvent.canPassDiagonally === "function") {
            canPass = targetEvent.canPassDiagonally(targetEvent.x, targetEvent.y, dx > 0 ? 6 : 4, dy > 0 ? 2 : 8);
        } else if (typeof targetEvent.canPass === "function") {
            canPass = targetEvent.canPass(targetEvent.x, targetEvent.y, knockbackDir);
        }

        console.log(`[FightManager]   Knockback : Event #${targetEvent.eventId()} (pos: ${targetEvent.x},${targetEvent.y}) face: ${targetDir} -> recul: dir ${knockbackDir} (dx=${dx}, dy=${dy}, passible=${canPass})`);

        if (canPass && typeof targetEvent.jump === "function") {
            targetEvent.jump(dx, dy);
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
