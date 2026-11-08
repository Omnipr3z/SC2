//=============================================================================
// RPG Maker MZ - SC4_BattleAIManager.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Gestionnaire d'orchestration tactique de l'IA de combat et registre des ennemis ($battleAIManager).
 * @author SimCraft 4
 *
 * @help SC4_BattleAIManager.js
 *
 * Chef d'orchestre tactique de l'intelligence artificielle en combat temps réel (ARPG).
 * Centralise et optimise la gestion de tous les ennemis actifs sur la carte :
 *  - Registre centralisé des ennemis actifs (Map eventId -> Game_EnemyAI).
 *  - Cycle de vie sur la carte (onMapLoaded, registerEnemy, unregisterEnemy).
 *  - Suivi réactif O(1) du niveau de menace (engagedCount, hostileCount).
 *  - Contrôle et synchronisation du Mode Combat / Safe Zone sur $gameMap.
 *  - Orchestration audio du BGM de combat et des fondus enchaînés.
 *  - Tactique collective : alertes de meute (Pack Alert) et propagation d'alarmes.
 *  - Optimisation par culling spatial et lissage temporel des calculs d'IA.
 */

class BattleAIManager {
    constructor() {
        this.initMembers();
    }

    initMembers() {
        /** @type {Map<number, IAManager>} Registre eventId -> instance d'IA */
        this._enemies = new Map();

        // Compteurs de menace O(1)
        this._engagedCount = 0;
        this._hostileCount = 0;

        // Gestion du BGM de combat
        this._isBattleBgm = false;
        this._savedMapBgm = null;
        this._bgmFadeOutTimer = 0;
        this._bgmFadeDuration = 3;

        // Optimisation & Culling
        this._cullingDistance = 25; // Tuiles Chebyshev
        this._tickCount = 0;
    }

    // ========================================================================
    // ACCESSEURS D'ÉTAT & REGISTRE
    // ========================================================================

    enemies() {
        return this._enemies;
    }

    enemyCount() {
        return this._enemies.size;
    }

    engagedCount() {
        return this._engagedCount;
    }

    hostileCount() {
        return this._hostileCount;
    }

    isCombatActive() {
        return this._engagedCount > 0 || this._hostileCount > 0;
    }

    hasEngagedEnemies() {
        return this._engagedCount > 0;
    }

    getEnemyAI(eventId) {
        return this._enemies.get(eventId) || null;
    }

    hasEnemy(eventId) {
        return this._enemies.has(eventId);
    }

    // ========================================================================
    // CYCLE DE VIE SUR LA CARTE
    // ========================================================================

    /**
     * Appelé lors du chargement ou changement de carte ($gameMap.setup).
     * Réinitialise le registre et enregistre tous les ennemis présents sur la carte.
     * @param {number} mapId 
     */
    onMapLoaded(mapId) {
        this.clear();
        this.resetBgmState();

        if (typeof $gameMap === "undefined" || !$gameMap || typeof $gameMap.events !== "function") {
            return;
        }

        const events = $gameMap.events();
        for (const ev of events) {
            if (ev && !ev._erased) {
                this.registerEnemy(ev);
            }
        }
    }

    /**
     * Enregistre un événement dans le gestionnaire d'IA de combat.
     * Instancie l'IA si nécessaire via IAManager.create().
     * @param {Game_Event} event 
     * @returns {IAManager|null}
     */
    registerEnemy(event) {
        if (!event) return null;
        const evId = typeof event.eventId === "function" ? event.eventId() : (event._eventId || 0);
        if (!evId) return null;

        if (this._enemies.has(evId)) {
            const existing = this._enemies.get(evId);
            if (existing && existing.event() === event) {
                return existing;
            }
        }

        let ai = event._ai;
        if (!ai) {
            if (typeof IAManager !== "undefined" && typeof IAManager.create === "function") {
                ai = IAManager.create(event);
            }
        }

        if (ai) {
            event._ai = ai;
            this._enemies.set(evId, ai);

            const s = typeof ai.state === "function" ? ai.state() : "neutral";
            if (s === "engage") {
                this._engagedCount++;
                this._hostileCount++;
            } else if (s === "search" || s === "hurted") {
                this._hostileCount++;
            }

            return ai;
        }

        return null;
    }

    /**
     * Désenregistre un événement du gestionnaire.
     * @param {number} eventId 
     * @returns {boolean}
     */
    unregisterEnemy(eventId) {
        if (!this._enemies.has(eventId)) return false;

        const ai = this._enemies.get(eventId);
        this._enemies.delete(eventId);

        if (ai) {
            const s = typeof ai.state === "function" ? ai.state() : "neutral";
            if (s === "engage") {
                this._engagedCount = Math.max(0, this._engagedCount - 1);
            }
            if (s === "engage" || s === "search" || s === "hurted") {
                this._hostileCount = Math.max(0, this._hostileCount - 1);
            }
            this.checkCombatStatusAfterChange();
        }

        return true;
    }

    /**
     * Réinitialise entièrement le registre des ennemis et les compteurs de menace.
     */
    clear() {
        this._enemies.clear();
        this._engagedCount = 0;
        this._hostileCount = 0;
    }

    // ========================================================================
    // GESTION RÉACTIVE DE L'ÉTAT ET MENACE O(1)
    // ========================================================================

    /**
     * Notification émise par un agent IAManager lorsque son état FSM change.
     * Ajuste les compteurs O(1) et déclenche les réactions audio et gameplay.
     * @param {IAManager} enemyAI 
     * @param {string} oldState 
     * @param {string} newState 
     */
    onEnemyStateChange(enemyAI, oldState, newState) {
        if (!enemyAI) return;

        const wasEngaged = (oldState === "engage");
        const isEngaged = (newState === "engage");

        if (!wasEngaged && isEngaged) {
            this._engagedCount++;
            if (this._engagedCount === 1) {
                this.triggerBattleBgm();
            }
            // Alerte de meute : prévenir les alliés proches
            this.alertNearbyAllies(enemyAI.event(), enemyAI.target(), 6);
        } else if (wasEngaged && !isEngaged) {
            this._engagedCount = Math.max(0, this._engagedCount - 1);
            if (this._engagedCount === 0) {
                this.startBattleBgmFadeOut();
            }
        }

        const wasHostile = (oldState === "engage" || oldState === "search" || oldState === "hurted");
        const isHostile = (newState === "engage" || newState === "search" || newState === "hurted");

        if (!wasHostile && isHostile) {
            this._hostileCount++;
        } else if (wasHostile && !isHostile) {
            this._hostileCount = Math.max(0, this._hostileCount - 1);
        }

        this.updateMapCombatMode();
    }

    /**
     * Vérification de cohérence suite à une suppression d'ennemi.
     */
    checkCombatStatusAfterChange() {
        if (this._engagedCount === 0 && this._isBattleBgm) {
            this.startBattleBgmFadeOut();
        }
        this.updateMapCombatMode();
    }

    /**
     * Synchronise l'état de combat de $gameMap (Safe Zone vs Combat Mode).
     */
    updateMapCombatMode() {
        if (typeof $gameMap !== "undefined" && $gameMap && typeof $gameMap.setCombatMode === "function") {
            const shouldBeCombat = this._hostileCount > 0;
            if (typeof $gameMap.isNaturallySafe === "function" && $gameMap.isNaturallySafe()) {
                if (typeof $gameMap.isCombatMode === "function" && $gameMap.isCombatMode() !== shouldBeCombat) {
                    $gameMap.setCombatMode(shouldBeCombat);
                }
            }
        }
    }

    // ========================================================================
    // TACTIQUE COLLECTIVE & ALERTES DE MEUTE (PACK ALERT)
    // ========================================================================

    /**
     * Alerte tous les alliés neutres ou en recherche situés dans le rayon d'assistance.
     * @param {Game_Event} sourceEvent 
     * @param {Game_CharacterBase} target 
     * @param {number} [radius=6] 
     */
    alertNearbyAllies(sourceEvent, target, radius = 6) {
        if (!sourceEvent || !target) return;
        const sx = sourceEvent.x;
        const sy = sourceEvent.y;

        for (const [eventId, ai] of this._enemies.entries()) {
            if (!ai || ai.event() === sourceEvent) continue;
            const ev = ai.event();
            if (!ev || ev._erased) continue;

            const battler = typeof ev.battler === "function" ? ev.battler() : null;
            if (battler && typeof battler.isDead === "function" && battler.isDead()) continue;

            const s = ai.state();
            if (s === "neutral" || s === "search") {
                const dist = this.distance8(sx, sy, ev.x, ev.y);
                if (dist <= radius) {
                    ai.setTarget(target);
                    ai.setState("engage");
                }
            }
        }
    }

    /**
     * Alerte générale transmise à tous les ennemis enregistrés sur la carte.
     * Utilisé lors d'une alarme de base, piratage de terminal ou son de guerre.
     * @param {Game_CharacterBase} target 
     */
    broadcastAlert(target) {
        if (!target) return;
        for (const [eventId, ai] of this._enemies.entries()) {
            if (!ai) continue;
            const ev = ai.event();
            if (!ev || ev._erased) continue;

            const battler = typeof ev.battler === "function" ? ev.battler() : null;
            if (battler && typeof battler.isDead === "function" && battler.isDead()) continue;

            ai.setTarget(target);
            ai.setState("engage");
        }
    }

    /**
     * Recherche tous les ennemis vivants dans un rayon donné.
     * @param {number} x 
     * @param {number} y 
     * @param {number} radius 
     * @returns {Array<{ event: Game_Event, ai: IAManager, distance: number }>}
     */
    findEnemiesInRadius(x, y, radius) {
        const result = [];
        for (const [eventId, ai] of this._enemies.entries()) {
            if (!ai) continue;
            const ev = ai.event();
            if (!ev || ev._erased) continue;

            const battler = typeof ev.battler === "function" ? ev.battler() : null;
            if (battler && typeof battler.isDead === "function" && battler.isDead()) continue;

            const dist = this.distance8(x, y, ev.x, ev.y);
            if (dist <= radius) {
                result.push({ event: ev, ai: ai, distance: dist });
            }
        }
        return result.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Recherche l'ennemi hostile vivant le plus proche d'un personnage.
     * @param {Game_CharacterBase} character 
     * @param {number} [maxRange=15] 
     * @returns {Game_Event|null}
     */
    findNearestHostile(character, maxRange = 15) {
        if (!character) return null;
        let nearest = null;
        let minDist = maxRange + 1;

        for (const [eventId, ai] of this._enemies.entries()) {
            if (!ai) continue;
            const ev = ai.event();
            if (!ev || ev._erased) continue;

            const battler = typeof ev.battler === "function" ? ev.battler() : null;
            if (battler && typeof battler.isDead === "function" && battler.isDead()) continue;

            const dist = this.distance8(character.x, character.y, ev.x, ev.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = ev;
            }
        }
        return nearest;
    }

    // ========================================================================
    // BOUCLE DE MISE À JOUR FRAME PAR FRAME & SPATIAL CULLING
    // ========================================================================

    /**
     * Boucle de mise à jour appelée une fois par frame depuis Game_Map.update().
     */
    update() {
        this._tickCount++;
        this.updateBgm();

        const player = (typeof $gamePlayer !== "undefined") ? $gamePlayer : null;

        for (const [eventId, ai] of this._enemies.entries()) {
            if (!ai) continue;
            const ev = ai.event();

            if (!ev || ev._erased) {
                this.unregisterEnemy(eventId);
                continue;
            }

            const battler = typeof ev.battler === "function" ? ev.battler() : null;
            if (battler && typeof battler.isDead === "function" && battler.isDead()) {
                this.unregisterEnemy(eventId);
                continue;
            }

            // Spatial Culling : espacer les calculs pour les ennemis neutres très éloignés
            if (player) {
                const dist = this.distance8(ev.x, ev.y, player.x, player.y);
                const s = ai.state();

                if (s === "neutral" && dist > this._cullingDistance) {
                    const isNearScreen = typeof ev.isNearTheScreen === "function" && ev.isNearTheScreen();
                    if (!isNearScreen) {
                        if ((this._tickCount + eventId) % 30 !== 0) {
                            continue;
                        }
                    }
                }
            }

            ai.update();
        }
    }

    // ========================================================================
    // NOTIFICATIONS COMBAT DEPUIS FIGHTMANAGER
    // ========================================================================

    /**
     * Notifié lorsqu'un ennemi subit des dégâts.
     * @param {Game_Event} targetEvent 
     * @param {Game_CharacterBase} [attackerChar] 
     */
    onEnemyHurt(targetEvent, attackerChar = null) {
        if (!targetEvent) return;
        const evId = typeof targetEvent.eventId === "function" ? targetEvent.eventId() : targetEvent._eventId;
        const ai = targetEvent._ai || this.getEnemyAI(evId);

        if (ai) {
            if (typeof ai.onHurt === "function") {
                ai.onHurt();
            }
            if (attackerChar && (!ai.target() || ai.state() === "neutral")) {
                ai.setTarget(attackerChar);
                ai.setState("engage");
            }
            this.alertNearbyAllies(targetEvent, attackerChar || ai.target(), 5);
        }
    }

    /**
     * Notifié lorsqu'un ennemi est vaincu.
     * @param {Game_Event} targetEvent 
     * @param {Game_CharacterBase} [attackerChar] 
     */
    onEnemyDeath(targetEvent, attackerChar = null) {
        if (!targetEvent) return;
        const evId = typeof targetEvent.eventId === "function" ? targetEvent.eventId() : targetEvent._eventId;
        const ai = targetEvent._ai || this.getEnemyAI(evId);

        if (ai && typeof ai.playCustomSe === "function") {
            ai.playCustomSe("death");
        }

        this.unregisterEnemy(evId);
    }

    // ========================================================================
    // GESTION DU BGM DE COMBAT & FONDU ENCHAÎNÉ
    // ========================================================================

    /**
     * Déclenche la musique de combat lorsque le premier ennemi engage.
     */
    triggerBattleBgm() {
        this._bgmFadeOutTimer = 0;
        if (this._isBattleBgm) return;

        if (typeof AudioManager !== "undefined") {
            const currentBgm = (typeof AudioManager.saveBgm === "function") ? AudioManager.saveBgm() : null;
            if (currentBgm && currentBgm.name) {
                this._savedMapBgm = currentBgm;
            } else if (typeof $dataMap !== "undefined" && $dataMap && $dataMap.bgm && $dataMap.bgm.name) {
                this._savedMapBgm = { ...$dataMap.bgm, pos: 0 };
            }

            const battleBgm = (typeof $gameSystem !== "undefined" && $gameSystem && typeof $gameSystem.battleBgm === "function")
                ? $gameSystem.battleBgm()
                : (typeof $dataSystem !== "undefined" && $dataSystem ? $dataSystem.battleBgm : null);

            if (battleBgm && battleBgm.name && typeof AudioManager.playBgm === "function") {
                AudioManager.playBgm(battleBgm);
                this._isBattleBgm = true;
            }
        }
    }

    /**
     * Initie le fondu de sortie de la musique de combat vers la musique de carte.
     */
    startBattleBgmFadeOut() {
        if (!this._isBattleBgm) return;
        this._isBattleBgm = false;
        if (typeof AudioManager !== "undefined") {
            if (typeof AudioManager.fadeOutBgm === "function") {
                AudioManager.fadeOutBgm(this._bgmFadeDuration);
            }
            this._bgmFadeOutTimer = this._bgmFadeDuration * 60;
        }
    }

    /**
     * Mise à jour du compte à rebours de fondu et reprise de la musique de carte.
     */
    updateBgm() {
        if (this._bgmFadeOutTimer > 0) {
            this._bgmFadeOutTimer--;
            if (this._bgmFadeOutTimer === 0) {
                if (typeof AudioManager !== "undefined") {
                    const mapBgm = this._savedMapBgm ||
                        ((typeof $dataMap !== "undefined" && $dataMap) ? $dataMap.bgm : null);
                    if (mapBgm && mapBgm.name) {
                        if (typeof AudioManager.replayBgm === "function") {
                            AudioManager.replayBgm(mapBgm);
                        } else if (typeof AudioManager.playBgm === "function") {
                            AudioManager.playBgm(mapBgm);
                        }
                        if (typeof AudioManager.fadeInBgm === "function") {
                            AudioManager.fadeInBgm(this._bgmFadeDuration);
                        }
                    }
                }
                this._savedMapBgm = null;
            }
        }
    }

    /**
     * Réinitialise l'état audio de combat (sur changement de carte).
     */
    resetBgmState() {
        this._isBattleBgm = false;
        this._savedMapBgm = null;
        this._bgmFadeOutTimer = 0;
    }

    /**
     * Calcule la distance de Chebyshev sur la grille (8 directions).
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2 
     * @returns {number}
     */
    distance8(x1, y1, x2, y2) {
        const dx = (typeof $gameMap !== "undefined" && $gameMap && typeof $gameMap.deltaX === "function")
            ? Math.abs($gameMap.deltaX(x1, x2))
            : Math.abs(x1 - x2);
        const dy = (typeof $gameMap !== "undefined" && $gameMap && typeof $gameMap.deltaY === "function")
            ? Math.abs($gameMap.deltaY(y1, y2))
            : Math.abs(y1 - y2);
        return Math.max(dx, dy);
    }
}

// Enregistrement global et singleton
window.BattleAIManager = BattleAIManager;
if (!window.$battleAIManager) {
    window.$battleAIManager = new BattleAIManager();
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = BattleAIManager;
}
