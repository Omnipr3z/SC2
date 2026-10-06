//=============================================================================
// SC4_rmmz_objects_Patches.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Surcharges et patches des classes natives de rmmz_objects.js.
 * @author SimCraft
 * @help
 * ============================================================================
 * SC4_rmmz_objects_Patches.js
 * ============================================================================
 * Regroupe tous les patches et surcharges apportés aux classes de rmmz_objects :
 * 
 * 1. Game_Actors :
 *    - Instancie Game_Hero à la place de Game_Actor pour les acteurs avec <Hero>.
 * 
 * 2. Game_Map :
 *    - Calcul de coordonnées en 8 directions (diagonales 1, 3, 7, 9).
 * 
 * 3. Game_CharacterBase :
 *    - Gestion centralisée des actions et animations (playAction, updateAction).
 *    - executeMove8Dir pour le déplacement 8 directions et glissement d'obstacle.
 * 
 * 4. Game_Character :
 *    - findDirectionTo : Pathfinding A* 8 directions avec distance octile.
 *    - moveTowardCharacter / moveAwayFromCharacter : Support des diagonales.
 * 
 * 5. Game_Player :
 *    - Liaison avec le Game_Hero du leader.
 *    - Lecture des entrées 8 directions (Input.dir8).
 *    - Mode visée et déclenchement d'attaque via playAction.
 * 
 * 6. Game_Follower :
 *    - Liaison avec le Game_Hero du membre suiveur (Paperdoll followers).
 *    - Orientation 8 directions en déplacement diagonal et vitesse normalisée.
 * 
 * 7. Game_Event :
 *    - Détection des notetags <actor: ID> et <actor_visible> (page active / note).
 *    - Affichage Paperdoll composite si héros, ou sprite classique sinon.
 *    - Masquage automatique quand l'acteur est dans l'équipe (sauf <actor_visible>).
 * 
 * 8. Game_Interpreter :
 *    - Appel de script this.playAction(...) ciblant l'acteur ou l'événement courant.
 * ============================================================================
 */

(() => {
    "use strict";

    // ========================================================================
    // 1. Patches pour Game_Actors
    // ========================================================================
    const _Game_Actors_actor = Game_Actors.prototype.actor;
    Game_Actors.prototype.actor = function(actorId) {
        if ($dataActors && $dataActors[actorId]) {
            if (!this._data[actorId]) {
                const actorData = $dataActors[actorId];
                if (actorData.note && /<hero>/i.test(actorData.note)) {
                    this._data[actorId] = new Game_Hero(actorId);
                } else {
                    this._data[actorId] = new Game_Actor(actorId);
                }
            }
            return this._data[actorId];
        }
        return null;
    };

    // ========================================================================
    // Patches pour Game_Actor & Game_Action (Étape 9 - Combat ARPG temps réel)
    // ========================================================================
    Game_Actor.prototype.attackSkillId = function() {
        const actorData = this.actor ? this.actor() : null;
        if (actorData && actorData.note) {
            const match = actorData.note.match(/<attackId:\s*(\d+)>/i);
            if (match) {
                return Number(match[1]);
            }
        }
        return 1;
    };

    Game_Actor.prototype.hasNoWeapons = function() {
        const w = typeof this.weapons === "function" ? this.weapons() : [];
        return w.filter(Boolean).length === 0;
    };

    if (typeof Game_Action !== "undefined") {
        const _Game_Action_setSubject = Game_Action.prototype.setSubject;
        Game_Action.prototype.setSubject = function(subject) {
            _Game_Action_setSubject.call(this, subject);
            this._customSubject = subject;
        };

        const _Game_Action_subject = Game_Action.prototype.subject;
        Game_Action.prototype.subject = function() {
            const orig = _Game_Action_subject.call(this);
            if (!orig && this._customSubject) {
                return this._customSubject;
            }
            return orig;
        };

        const _Game_Action_friendsUnit = Game_Action.prototype.friendsUnit;
        Game_Action.prototype.friendsUnit = function() {
            const s = this.subject();
            if (s && typeof s.friendsUnit === "function") {
                return s.friendsUnit();
            }
            return (s && s.isActor()) ? $gameParty : $gameTroop;
        };

        const _Game_Action_opponentsUnit = Game_Action.prototype.opponentsUnit;
        Game_Action.prototype.opponentsUnit = function() {
            const s = this.subject();
            if (s && typeof s.opponentsUnit === "function") {
                return s.opponentsUnit();
            }
            return (s && s.isActor()) ? $gameTroop : $gameParty;
        };

        const _Game_Action_testApply = Game_Action.prototype.testApply;
        Game_Action.prototype.testApply = function(target) {
            if (this.isForOpponent() && target && target.isAlive()) {
                return true;
            }
            return _Game_Action_testApply.call(this, target);
        };
    }

    if (typeof Game_Enemy !== "undefined") {
        Game_Enemy.prototype.friendsUnit = function() {
            return (typeof $gameTroop !== "undefined" && $gameTroop) ? $gameTroop : null;
        };
        Game_Enemy.prototype.opponentsUnit = function() {
            return (typeof $gameParty !== "undefined" && $gameParty) ? $gameParty : null;
        };
    }

    // ========================================================================
    // 2. Patches pour Game_Map (Coordonnées 8 directions)
    // ========================================================================
    Game_Map.prototype.xWithDirection = function(x, d) {
        return x + (d === 6 || d === 3 || d === 9 ? 1 : d === 4 || d === 1 || d === 7 ? -1 : 0);
    };

    Game_Map.prototype.yWithDirection = function(y, d) {
        return y + (d === 2 || d === 1 || d === 3 ? 1 : d === 8 || d === 7 || d === 9 ? -1 : 0);
    };

    Game_Map.prototype.roundXWithDirection = function(x, d) {
        return this.roundX(this.xWithDirection(x, d));
    };

    Game_Map.prototype.roundYWithDirection = function(y, d) {
        return this.roundY(this.yWithDirection(y, d));
    };

    // ========================================================================
    // 3. Patches pour Game_CharacterBase (Déplacement 8 dir & Moteur d'actions)
    // ========================================================================
    const _Game_CharacterBase_initMembers = Game_CharacterBase.prototype.initMembers;
    Game_CharacterBase.prototype.initMembers = function() {
        _Game_CharacterBase_initMembers.call(this);
        this._action = "walk";
        this._isActing = false;
        this._actionPattern = 0;
        this._actionTimer = 0;
        this._actionMaxFrames = 4;
        this._actionFrameDuration = 4;
        this._actionDirection = 2;
        this._actionOnEnd = null;
    };

    if (!Game_CharacterBase.prototype.isDashing) {
        Game_CharacterBase.prototype.isDashing = function() {
            return false;
        };
    }

    Game_CharacterBase.prototype.action = function() {
        if (this.isActing()) {
            return this._action || "walk";
        }
        const dashing = typeof this.isDashing === "function" && this.isDashing();
        const moving = typeof this.isMoving === "function" && this.isMoving();
        if (dashing && moving) {
            return "dash";
        }
        return this._action || "walk";
    };

    Game_CharacterBase.prototype.setAction = function(action) {
        this._action = action;
    };

    Game_CharacterBase.prototype.isActing = function() {
        return Boolean(this._isActing);
    };

    Game_CharacterBase.prototype.isAttacking = function() {
        return this.isActing() && this._action === "atk";
    };

    Game_CharacterBase.prototype.actionPattern = function() {
        return this._actionPattern || 0;
    };

    Game_CharacterBase.prototype.attackPattern = function() {
        return this.actionPattern();
    };

    Game_CharacterBase.prototype.canAct = function() {
        return !this.isActing();
    };

    Game_CharacterBase.prototype.canAttack = function() {
        return this.canAct();
    };

    /**
     * Déclenche une action animée sur ce personnage (ou sur l'acteur spécifié via actorId).
     * @param {{ action?: string, duration?: number, frames?: number, direction?: number, actorId?: number, onEnd?: Function }|string} options 
     * @returns {boolean}
     */
    Game_CharacterBase.prototype.playAction = function(options = {}) {
        if (typeof options === "string") {
            options = { action: options };
        }
        const actorId = options.actorId || (options.id ? Number(options.id) : 0);
        if (actorId > 0 && typeof window.$heroHub !== "undefined" && window.$heroHub) {
            const target = window.$heroHub.findActorCharacter(actorId);
            if (target && target !== this) {
                return target.playAction({ ...options, actorId: 0 });
            } else if (!target) {
                return false;
            }
        }

        if (!this.canAct()) return false;

        // Arrêt immédiat de tout mouvement en cours
        this._realX = this._x;
        this._realY = this._y;

        if (options.direction) {
            this.setDirection(options.direction);
        }
        this._actionDirection = this.direction();

        let actionName = options.action || "atk";
        let frames = options.frames;
        let duration = options.duration;

        const hero = (typeof this.hero === "function") ? this.hero() : null;
        if (hero && typeof hero.getAttackConfig === "function" && (!frames || !duration)) {
            const cfg = hero.getAttackConfig();
            if (!frames) frames = cfg.frames;
            if (!duration) duration = cfg.duration;
            if (!options.action) actionName = cfg.actionName;
        }

        // Déclenchement de l'action ATK pour le joueur et transmission au FightManager
        if (typeof $gamePlayer !== "undefined" && this === $gamePlayer && actionName === "atk") {
            const pActor = (typeof this.actor === "function" ? this.actor() : null) ||
                           (typeof this.hero === "function" ? this.hero() : null) ||
                           (typeof $gameParty !== "undefined" && $gameParty ? $gameParty.leader() : null);
            const pActorId = pActor && typeof pActor.actorId === "function" ? pActor.actorId() : 1;
            console.log(`Player ${pActorId} action ATK`);

            if (window.$fightManager) {
                window.$fightManager.onPlayerAttack(this, this._actionDirection);
            }
        }

        this._isActing = true;
        this._action = actionName;
        this._actionPattern = 0;
        this._actionTimer = 0;
        this._actionMaxFrames = Number(frames) || 4;
        this._actionFrameDuration = Number(duration) || 4;
        this._actionOnEnd = typeof options.onEnd === "function" ? options.onEnd : null;

        return true;
    };

    /**
     * Progression temporelle de l'animation d'action (frame par frame).
     */
    Game_CharacterBase.prototype.updateAction = function() {
        if (this._isActing) {
            this._actionTimer++;
            const currentPattern = Math.floor(this._actionTimer / this._actionFrameDuration);
            if (currentPattern < this._actionMaxFrames) {
                this._actionPattern = currentPattern;
            } else {
                this._isActing = false;
                this._action = "walk";
                this._actionPattern = 0;
                this._actionTimer = 0;
                this.setDirection(this._actionDirection);
                this._pattern = 0;
                if (typeof this.resetPattern === "function") {
                    this.resetPattern();
                }
                if (this._actionOnEnd) {
                    const cb = this._actionOnEnd;
                    this._actionOnEnd = null;
                    cb.call(this);
                }
            }
        }
    };

    Game_CharacterBase.prototype.updateAttack = function() {
        this.updateAction();
    };

    const _Game_CharacterBase_update = Game_CharacterBase.prototype.update;
    Game_CharacterBase.prototype.update = function() {
        if (_Game_CharacterBase_update) {
            _Game_CharacterBase_update.call(this);
        }
        this.updateAction();
        if (this.isActing()) {
            this.setDirection(this._actionDirection);
        }
    };

    /**
     * Exécute un pas en 8 directions avec gestion des diagonales et glissement.
     * @param {number} direction (1..9)
     */
    Game_CharacterBase.prototype.executeMove8Dir = function(direction) {
        if ([1, 3, 7, 9].includes(direction)) {
            let horz = 0;
            let vert = 0;
            switch (direction) {
                case 1: horz = 4; vert = 2; break; // Bas-Gauche
                case 3: horz = 6; vert = 2; break; // Bas-Droite
                case 7: horz = 4; vert = 8; break; // Haut-Gauche
                case 9: horz = 6; vert = 8; break; // Haut-Droite
            }

            if (this.canPassDiagonally(this._x, this._y, horz, vert)) {
                this.moveDiagonally(horz, vert);
                this.setDirection(direction);
            } else {
                // Glissement contre l'obstacle sur l'axe libre
                if (this.canPass(this._x, this._y, horz)) {
                    this.moveStraight(horz);
                } else if (this.canPass(this._x, this._y, vert)) {
                    this.moveStraight(vert);
                }
            }
        } else {
            this.moveStraight(direction);
        }
    };

    /**
     * Calcule la direction opposée en 8 directions.
     * @param {number} direction 
     * @returns {number}
     */
    Game_CharacterBase.prototype.reverseDir8 = function(direction) {
        switch (direction) {
            case 2: return 8;
            case 4: return 6;
            case 6: return 4;
            case 8: return 2;
            case 1: return 9;
            case 3: return 7;
            case 7: return 3;
            case 9: return 1;
            default: return 2;
        }
    };

    /**
     * Détermine la direction 8 axes pour faire face à un autre personnage.
     * @param {Game_CharacterBase} target 
     * @returns {number}
     */
    Game_CharacterBase.prototype.directionToCharacter = function(target) {
        if (!target) return 0;
        const dx = $gameMap.deltaX(target.x, this.x);
        const dy = $gameMap.deltaY(target.y, this.y);
        if (dx === 0 && dy > 0) return 2;
        if (dx < 0 && dy === 0) return 4;
        if (dx > 0 && dy === 0) return 6;
        if (dx === 0 && dy < 0) return 8;
        if (dx < 0 && dy > 0) return 1;
        if (dx > 0 && dy > 0) return 3;
        if (dx < 0 && dy < 0) return 7;
        if (dx > 0 && dy < 0) return 9;
        return 0;
    };

    // ========================================================================
    // 3. Patches pour Game_Character (Pathfinding 8 directions)
    // ========================================================================
    /**
     * Pathfinding A* 8 directions intégrant l'heuristique de distance octile.
     * @param {number} goalX 
     * @param {number} goalY 
     * @returns {number} Direction (1..9, ou 0)
     */
    Game_Character.prototype.findDirectionTo = function(goalX, goalY) {
        const searchLimit = this.searchLimit();
        const mapWidth = $gameMap.width();
        const nodeList = [];
        const openNodes = new Map();
        const closedSet = new Set();
        const start = {};
        let best = start;

        if (this.x === goalX && this.y === goalY) {
            return 0;
        }

        // Si le personnage est déjà adjacent au but et que ce but est bloqué par un événement normal
        const deltaX = $gameMap.deltaX(goalX, this.x);
        const deltaY = $gameMap.deltaY(goalY, this.y);
        if (Math.abs(deltaX) <= 1 && Math.abs(deltaY) <= 1) {
            const eventsAtGoal = $gameMap.eventsXy(goalX, goalY);
            if (eventsAtGoal.some(e => e.isNormalPriority())) {
                return 0;
            }
        }

        // Distance octile admissible pour le déplacement en 8 directions
        const distance8 = (x, y) => {
            const dx = Math.abs($gameMap.deltaX(x, goalX));
            const dy = Math.abs($gameMap.deltaY(y, goalY));
            return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy);
        };

        start.parent = null;
        start.x = this.x;
        start.y = this.y;
        start.g = 0;
        start.f = distance8(start.x, start.y);
        const startPos = start.y * mapWidth + start.x;
        nodeList.push(start);
        openNodes.set(startPos, start);

        const DIRS = [
            { dir: 2, horz: 0, vert: 2, isDiag: false },
            { dir: 4, horz: 4, vert: 0, isDiag: false },
            { dir: 6, horz: 6, vert: 0, isDiag: false },
            { dir: 8, horz: 0, vert: 8, isDiag: false },
            { dir: 1, horz: 4, vert: 2, isDiag: true },
            { dir: 3, horz: 6, vert: 2, isDiag: true },
            { dir: 7, horz: 4, vert: 8, isDiag: true },
            { dir: 9, horz: 6, vert: 8, isDiag: true }
        ];

        while (nodeList.length > 0) {
            let bestIndex = 0;
            for (let i = 1; i < nodeList.length; i++) {
                if (nodeList[i].f < nodeList[bestIndex].f) {
                    bestIndex = i;
                }
            }

            const current = nodeList[bestIndex];
            const x1 = current.x;
            const y1 = current.y;
            const pos1 = y1 * mapWidth + x1;
            const g1 = current.g;

            nodeList.splice(bestIndex, 1);
            openNodes.delete(pos1);
            closedSet.add(pos1);

            if (current.x === goalX && current.y === goalY) {
                best = current;
                break;
            }

            if (g1 >= searchLimit) {
                continue;
            }

            for (const d of DIRS) {
                const x2 = d.isDiag ? $gameMap.roundXWithDirection(x1, d.horz) : $gameMap.roundXWithDirection(x1, d.dir);
                const y2 = d.isDiag ? $gameMap.roundYWithDirection(y1, d.vert) : $gameMap.roundYWithDirection(y1, d.dir);
                const pos2 = y2 * mapWidth + x2;

                if (closedSet.has(pos2)) {
                    continue;
                }

                if (d.isDiag) {
                    if (!this.canPassDiagonally(x1, y1, d.horz, d.vert)) {
                        continue;
                    }
                } else {
                    if (!this.canPass(x1, y1, d.dir)) {
                        continue;
                    }
                }

                const stepCost = d.isDiag ? Math.SQRT2 : 1;
                const g2 = g1 + stepCost;
                let neighbor = openNodes.get(pos2);

                if (!neighbor || g2 < neighbor.g) {
                    if (!neighbor) {
                        neighbor = { x: x2, y: y2 };
                        nodeList.push(neighbor);
                        openNodes.set(pos2, neighbor);
                    }
                    neighbor.parent = current;
                    neighbor.g = g2;
                    neighbor.f = g2 + distance8(x2, y2);
                    if (!best || neighbor.f - neighbor.g < best.f - best.g) {
                        best = neighbor;
                    }
                }
            }
        }

        let node = best;
        while (node.parent && node.parent !== start) {
            node = node.parent;
        }

        const deltaX1 = $gameMap.deltaX(node.x, start.x);
        const deltaY1 = $gameMap.deltaY(node.y, start.y);

        if (deltaX1 < 0 && deltaY1 > 0) return 1; // Bas-Gauche
        if (deltaX1 > 0 && deltaY1 > 0) return 3; // Bas-Droite
        if (deltaX1 < 0 && deltaY1 < 0) return 7; // Haut-Gauche
        if (deltaX1 > 0 && deltaY1 < 0) return 9; // Haut-Droite
        if (deltaY1 > 0) return 2; // Bas
        if (deltaX1 < 0) return 4; // Gauche
        if (deltaX1 > 0) return 6; // Droite
        if (deltaY1 < 0) return 8; // Haut

        // Fallback heuristique si hors de portée ou but direct non atteint
        const deltaX2 = this.deltaXFrom(goalX);
        const deltaY2 = this.deltaYFrom(goalY);
        const horz = deltaX2 > 0 ? 4 : (deltaX2 < 0 ? 6 : 0);
        const vert = deltaY2 > 0 ? 8 : (deltaY2 < 0 ? 2 : 0);

        if (horz !== 0 && vert !== 0) {
            if (this.canPassDiagonally(this.x, this.y, horz, vert)) {
                if (horz === 4 && vert === 2) return 1;
                if (horz === 6 && vert === 2) return 3;
                if (horz === 4 && vert === 8) return 7;
                if (horz === 6 && vert === 8) return 9;
            }
        }

        if (Math.abs(deltaX2) > Math.abs(deltaY2)) {
            return horz;
        } else if (vert !== 0) {
            return vert;
        }

        return 0;
    };

    /**
     * Déplacement vers un personnage avec prise en compte des diagonales.
     * @param {Game_Character} character 
     */
    Game_Character.prototype.moveTowardCharacter = function(character) {
        const sx = this.deltaXFrom(character.x);
        const sy = this.deltaYFrom(character.y);
        const horz = sx > 0 ? 4 : (sx < 0 ? 6 : 0);
        const vert = sy > 0 ? 8 : (sy < 0 ? 2 : 0);

        if (horz !== 0 && vert !== 0) {
            if (this.canPassDiagonally(this.x, this.y, horz, vert)) {
                this.moveDiagonally(horz, vert);
                return;
            }
        }
        if (Math.abs(sx) > Math.abs(sy)) {
            this.moveStraight(horz);
            if (!this.isMovementSucceeded() && vert !== 0) {
                this.moveStraight(vert);
            }
        } else if (vert !== 0) {
            this.moveStraight(vert);
            if (!this.isMovementSucceeded() && horz !== 0) {
                this.moveStraight(horz);
            }
        }
    };

    /**
     * Éloignement d'un personnage avec prise en compte des diagonales.
     * @param {Game_Character} character 
     */
    Game_Character.prototype.moveAwayFromCharacter = function(character) {
        const sx = this.deltaXFrom(character.x);
        const sy = this.deltaYFrom(character.y);
        const horz = sx > 0 ? 6 : (sx < 0 ? 4 : 0);
        const vert = sy > 0 ? 2 : (sy < 0 ? 8 : 0);

        if (horz !== 0 && vert !== 0) {
            if (this.canPassDiagonally(this.x, this.y, horz, vert)) {
                this.moveDiagonally(horz, vert);
                return;
            }
        }
        if (Math.abs(sx) > Math.abs(sy)) {
            this.moveStraight(horz);
            if (!this.isMovementSucceeded() && vert !== 0) {
                this.moveStraight(vert);
            }
        } else if (vert !== 0) {
            this.moveStraight(vert);
            if (!this.isMovementSucceeded() && horz !== 0) {
                this.moveStraight(horz);
            }
        }
    };

    // ========================================================================
    // 4. Patches pour Game_Player
    // ========================================================================
    Game_Player.prototype.hero = function() {
        const leader = $gameParty ? $gameParty.leader() : null;
        return (leader && leader.isHero && leader.isHero()) ? leader : null;
    };

    Game_Player.prototype.isHero = function() {
        return Boolean(this.hero());
    };

    // Entrées 8 directions pour le joueur
    Game_Player.prototype.getInputDirection = function() {
        return Input.dir8;
    };

    // Surcharge standard RMMZ de executeMove
    Game_Player.prototype.executeMove = function(direction) {
        // Étape 7 : Si un follower est présent sur la case cible et que le joueur ne lui fait pas encore face :
        // "cela ne doit pas effectuer le mouvement directement mais lui faire face dans un premier temps"
        const targetX = $gameMap.roundXWithDirection(this.x, direction);
        const targetY = $gameMap.roundYWithDirection(this.y, direction);
        const followerOnTile = (this.followers && this.followers())
            ? this.followers().data().find(f => f && f.isVisible() && f.pos(targetX, targetY))
            : null;

        if (followerOnTile && this.direction() !== direction) {
            this.setDirection(direction);
            return;
        }

        this.executeMove8Dir(direction);
        if (this.isAiming()) {
            this.setDirection(this.aimDirection());
        }
    };

    // Normalisation de la vitesse en diagonale (1/sqrt(2) ≈ 0.7071)
    const _Game_Player_distancePerFrame = Game_Player.prototype.distancePerFrame;
    Game_Player.prototype.distancePerFrame = function() {
        let dist = _Game_Player_distancePerFrame.call(this);
        if (this.isMoving() && this._realX !== this._x && this._realY !== this._y) {
            dist *= 0.7071;
        }
        return dist;
    };

    // Blocage du déplacement pendant l'attaque
    const _Game_Player_canMove = Game_Player.prototype.canMove;
    Game_Player.prototype.canMove = function() {
        if (this.isAttacking()) {
            return false;
        }
        return _Game_Player_canMove.call(this);
    };

    /**
     * Recherche le suiveur visible le plus proche du joueur.
     * @returns {Game_Follower|null}
     */
    Game_Player.prototype.findNearestFollower = function() {
        if (!this.followers) return null;
        const visibleFollowers = this.followers().data().filter(f => f && f.isVisible());
        if (visibleFollowers.length === 0) return null;

        let nearest = null;
        let minDist = Infinity;
        for (const f of visibleFollowers) {
            const dist = Math.hypot($gameMap.deltaX(f.x, this.x), $gameMap.deltaY(f.y, this.y));
            if (dist < minDist) {
                minDist = dist;
                nearest = f;
            }
        }
        return nearest;
    };

    /**
     * Déclenche l'interaction avec un suiveur (face-à-face et fenêtre de choix).
     * @param {Game_Follower} follower 
     * @returns {boolean}
     */
    Game_Player.prototype.interactWithFollower = function(follower) {
        if (!follower || !follower.isVisible() || !follower.actor()) return false;
        if (typeof $gameMessage !== "undefined" && $gameMessage.isBusy()) return false;

        // Arrêt immédiat de toute destination de déplacement en cours
        if (typeof $gameTemp !== "undefined" && $gameTemp.clearDestination) {
            $gameTemp.clearDestination();
        }

        // Orientation mutuelle en face-à-face
        const dir = this.directionToCharacter(follower);
        if (dir > 0) {
            this.setDirection(dir);
            follower.setDirection(this.reverseDir8(dir));
        }

        // Affichage du choix
        if (typeof $gameMessage !== "undefined" && $gameMessage) {
            $gameMessage.clear();
            $gameMessage.setChoices(["Demander de rester", "Ouvrir l'inventaire", "Ne rien faire"], 0, 2);
            $gameMessage.setChoiceCallback(n => {
                if (n === 0) {
                    this.commandFollowerStay(follower);
                } else if (n === 1) {
                    const actorId = follower.actor().actorId();
                    if (typeof $inventories !== "undefined" && $inventories) {
                        $inventories.open("A_" + actorId);
                    }
                }
            });
        }

        return true;
    };

    /**
     * Commande pour demander à un suiveur de rester :
     * - Si un événement avec <actor: ID> existe sur la carte, il est téléporté à sa place
     *   avec sa direction (axes x/y) et le membre quitte l'équipe.
     * - Sinon, affiche le message "Je ne peux pas rester ici".
     * @param {Game_Follower} follower 
     */
    Game_Player.prototype.commandFollowerStay = function(follower) {
        if (!follower || !follower.actor()) return;
        const actorId = follower.actor().actorId();

        let targetEvent = null;
        if (typeof $gameMap !== "undefined" && $gameMap && $gameMap.events) {
            targetEvent = $gameMap.events().find(e => e && typeof e.actorId === "function" && e.actorId() === actorId);
        }

        if (targetEvent) {
            const fx = follower.x;
            const fy = follower.y;
            let fDir = follower.direction();
            // Direction convertie sur les axes x et y (pas en diagonale)
            if ([1, 3, 7, 9].includes(fDir)) {
                const diagToCardinal = { 1: 2, 3: 2, 7: 8, 9: 8 };
                fDir = diagToCardinal[fDir] || 2;
            }

            targetEvent.locate(fx, fy);
            targetEvent.setDirection(fDir);
            $gameParty.removeActor(actorId);
        } else {
            if (typeof $gameMessage !== "undefined" && $gameMessage) {
                $gameMessage.clear();
                $gameMessage.add("Je ne peux pas rester ici");
            }
        }
    };

    // Déclenchement d'action au toucher/clic avec prise en compte des événements adjacents en 8 directions
    Game_Player.prototype.triggerTouchAction = function() {
        if ($gameTemp.isDestinationValid()) {
            const destX = $gameTemp.destinationX();
            const destY = $gameTemp.destinationY();
            const x1 = this.x;
            const y1 = this.y;

            // 1. Clic gauche sur le joueur : pas d'interaction automatique de fin de déplacement
            if (destX === x1 && destY === y1) {
                return this.triggerTouchActionD1(x1, y1);
            }

            const dx = $gameMap.deltaX(destX, x1);
            const dy = $gameMap.deltaY(destY, y1);
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            // 2. Clic sur un follower visible
            const clickedFollower = (this.followers && this.followers())
                ? this.followers().data().find(f => f && f.isVisible() && f.pos(destX, destY))
                : null;

            if (clickedFollower && !this.isAiming()) {
                if (absDx <= 1 && absDy <= 1) {
                    let dirToFollower = 0;
                    if (dx === 0 && dy > 0) dirToFollower = 2;
                    else if (dx < 0 && dy === 0) dirToFollower = 4;
                    else if (dx > 0 && dy === 0) dirToFollower = 6;
                    else if (dx === 0 && dy < 0) dirToFollower = 8;
                    else if (dx < 0 && dy > 0) dirToFollower = 1;
                    else if (dx > 0 && dy > 0) dirToFollower = 3;
                    else if (dx < 0 && dy < 0) dirToFollower = 7;
                    else if (dx > 0 && dy < 0) dirToFollower = 9;

                    // Ne déclenche l'interaction que si le joueur lui fait déjà face
                    if (this.direction() === dirToFollower) {
                        $gameTemp.clearDestination();
                        return this.interactWithFollower(clickedFollower);
                    } else {
                        // Sinon, le joueur se tourne simplement vers lui au premier clic
                        if (dirToFollower > 0) {
                            this.setDirection(dirToFollower);
                        }
                        $gameTemp.clearDestination();
                        return true;
                    }
                }
            }

            // 3. Si le joueur est adjacent à la case cliquée (orthogonale ou diagonale)
            if (absDx <= 1 && absDy <= 1) {

                let dir = 0;
                if (dx === 0 && dy > 0) dir = 2;
                else if (dx < 0 && dy === 0) dir = 4;
                else if (dx > 0 && dy === 0) dir = 6;
                else if (dx === 0 && dy < 0) dir = 8;
                else if (dx < 0 && dy > 0) dir = 1;
                else if (dx > 0 && dy > 0) dir = 3;
                else if (dx < 0 && dy < 0) dir = 7;
                else if (dx > 0 && dy < 0) dir = 9;

                const events = $gameMap.eventsXy(destX, destY);
                if (events.length > 0) {
                    if (dir > 0) {
                        this.setDirection(dir);
                    }
                    // Si un événement hostile vivant est cliqué au contact, déclenche une attaque !
                    const hostileTarget = events.find(e => e && typeof e.isHostile === "function" && e.isHostile() && e.battler && e.battler() && !e.battler().isDead());
                    if (hostileTarget) {
                        $gameTemp.clearDestination();
                        return this.performAttack();
                    }

                    this.startMapEvent(destX, destY, [0, 1, 2], true);
                    if ($gameMap.isAnyEventStarting() || $gameMap.setupStartingEvent()) {
                        $gameTemp.clearDestination();
                        return true;
                    }
                    // Si l'événement bloque le passage (priorité normale), on arrête la recherche de chemin en boucle
                    if (events.some(e => e.isNormalPriority())) {
                        $gameTemp.clearDestination();
                        return true;
                    }
                }
            }

            // Cas de face ou comptoir
            const direction = this.direction();
            const x2 = $gameMap.roundXWithDirection(x1, direction);
            const y2 = $gameMap.roundYWithDirection(y1, direction);
            const x3 = $gameMap.roundXWithDirection(x2, direction);
            const y3 = $gameMap.roundYWithDirection(y2, direction);

            if (destX === x2 && destY === y2) {
                return this.triggerTouchActionD2(x2, y2);
            } else if (destX === x3 && destY === y3) {
                return this.triggerTouchActionD3(x2, y2);
            }
        }
        return false;
    };

    // Déclenchement d'interaction via touche OK face à un suiveur
    const _Game_Player_triggerButtonAction = Game_Player.prototype.triggerButtonAction;
    Game_Player.prototype.triggerButtonAction = function() {
        if (Input.isTriggered("ok")) {
            const direction = this.direction();
            const frontX = $gameMap.roundXWithDirection(this.x, direction);
            const frontY = $gameMap.roundYWithDirection(this.y, direction);
            const follower = (this.followers && this.followers())
                ? this.followers().data().find(f => f && f.isVisible() && f.pos(frontX, frontY))
                : null;
            if (follower) {
                return this.interactWithFollower(follower);
            }

            // Attaque si face à un ennemi hostile
            const hostileEvent = $gameMap.eventsXy(frontX, frontY).find(e => e && typeof e.isHostile === "function" && e.isHostile() && e.battler && e.battler() && !e.battler().isDead());
            if (hostileEvent) {
                return this.performAttack();
            }
        }
        return _Game_Player_triggerButtonAction ? _Game_Player_triggerButtonAction.call(this) : false;
    };

    // Mode visée (clic droit maintenu) & orientation vers le curseur
    Game_Player.prototype.isAiming = function() {
        return Boolean(TouchInput && TouchInput.isRightPressed && TouchInput.isRightPressed());
    };

    Game_Player.prototype.aimDirection = function() {
        if (!TouchInput) return this.direction();
        const px = this.screenX();
        const py = this.screenY() - 48; // Centre du personnage (96x96)
        const cx = (typeof TouchInput.cursorX !== "undefined") ? TouchInput.cursorX : TouchInput.x;
        const cy = (typeof TouchInput.cursorY !== "undefined") ? TouchInput.cursorY : TouchInput.y;
        const dx = cx - px;
        const dy = cy - py;

        if (Math.hypot(dx, dy) < 10) {
            return this.direction();
        }

        const angle = Math.atan2(dy, dx);
        return this.angleTo8Direction(angle);
    };

    Game_Player.prototype.angleTo8Direction = function(angle) {
        const octant = Math.floor((angle + Math.PI / 8) / (Math.PI / 4));
        switch (octant) {
            case 0: return 6; // Droite
            case 1: return 3; // Bas-Droite
            case 2: return 2; // Bas
            case 3: return 1; // Bas-Gauche
            case 4:
            case -4: return 4; // Gauche
            case -3: return 7; // Haut-Gauche
            case -2: return 8; // Haut
            case -1: return 9; // Haut-Droite
            default: return 2;
        }
    };

    // ========================================================================
    // Gestion de l'action d'attaque du joueur (délégation à playAction)
    // ========================================================================
    /**
     * Déclenche l'attaque du joueur :
     * 1. Arrête immédiatement tout déplacement en cours.
     * 2. Oriente le joueur vers la position visée au clic.
     * 3. Délègue à playAction({ action: "atk", direction: dir }).
     */
    Game_Player.prototype.performAttack = function() {
        if (!this.canAttack()) {
            console.warn("[Combat] ⚠️ performAttack : canAttack() est faux !");
            return false;
        }

        // Arrêt immédiat du déplacement
        if (typeof $gameTemp !== "undefined" && $gameTemp.clearDestination) {
            $gameTemp.clearDestination();
        }
        this._realX = this._x;
        this._realY = this._y;

        const dir = this.isAiming() ? this.aimDirection() : this.direction();
        return this.playAction({ action: "atk", direction: dir });
    };

    const _Game_Player_update = Game_Player.prototype.update;
    Game_Player.prototype.update = function(sceneActive) {
        if (_Game_Player_update) {
            _Game_Player_update.call(this, sceneActive);
        }
        if (sceneActive) {
            if (this.isActing()) {
                // Maintient la direction fixée au moment de l'action
                this.setDirection(this._actionDirection);
            } else if (this.isAiming()) {
                this.setDirection(this.aimDirection());
                // Déclenchement de l'attaque si clic gauche pressé en visée
                if (TouchInput && TouchInput.isTriggered && TouchInput.isTriggered() && this.canAttack()) {
                    this.performAttack();
                }
            }
        }
    };

    Game_Player.prototype.isAimActionTriggered = function() {
        return this.isAiming() && Boolean(TouchInput && TouchInput.isTriggered && TouchInput.isTriggered());
    };

    Game_Player.prototype.onAimAction = function() {
        if (this.canAttack()) {
            this.performAttack();
        }
    };

    // ========================================================================
    // 6. Patches pour Game_Follower (Paperdoll & Déplacement 8 directions)
    // ========================================================================
    if (typeof Game_Follower !== "undefined") {
        /**
         * Récupère le Game_Hero associé à ce follower si l'acteur a le flag <Hero>.
         * @returns {Game_Hero|null}
         */
        Game_Follower.prototype.hero = function() {
            const actor = this.actor();
            return (actor && actor.isHero && actor.isHero()) ? actor : null;
        };

        Game_Follower.prototype.isHero = function() {
            return Boolean(this.hero());
        };

        // Orientation en 8 directions lors des mouvements en diagonale du follower
        const _Game_Follower_moveDiagonally = Game_Follower.prototype.moveDiagonally;
        Game_Follower.prototype.moveDiagonally = function(horz, vert) {
            _Game_Follower_moveDiagonally.call(this, horz, vert);
            if (this.isMovementSucceeded()) {
                let diagDir = 0;
                if (horz === 4 && vert === 2) diagDir = 1;
                else if (horz === 6 && vert === 2) diagDir = 3;
                else if (horz === 4 && vert === 8) diagDir = 7;
                else if (horz === 6 && vert === 8) diagDir = 9;
                if (diagDir > 0) {
                    this.setDirection(diagDir);
                }
            }
        };

        // Normalisation de la vitesse en diagonale (1/sqrt(2) ≈ 0.7071)
        const _Game_Follower_distancePerFrame = Game_Follower.prototype.distancePerFrame;
        Game_Follower.prototype.distancePerFrame = function() {
            let dist = _Game_Follower_distancePerFrame.call(this);
            if (this.isMoving() && this._realX !== this._x && this._realY !== this._y) {
                dist *= 0.7071;
            }
            return dist;
        };

        Game_Follower.prototype.isDashing = function() {
            return typeof $gamePlayer !== "undefined" && $gamePlayer && typeof $gamePlayer.isDashing === "function" ? $gamePlayer.isDashing() : false;
        };

        Game_Follower.prototype.realMoveSpeed = function() {
            if (typeof $gamePlayer !== "undefined" && $gamePlayer && typeof $gamePlayer.realMoveSpeed === "function") {
                return $gamePlayer.realMoveSpeed();
            }
            return typeof this.moveSpeed === "function" ? this.moveSpeed() : (this._moveSpeed || 4);
        };

        // Rafraîchissement avec préchargement du composite
        const _Game_Follower_refresh = Game_Follower.prototype.refresh;
        Game_Follower.prototype.refresh = function() {
            if (_Game_Follower_refresh) {
                _Game_Follower_refresh.call(this);
            }
            const hero = this.hero();
            if (hero) {
                hero.getCompositeEntry("walk");
                hero.getCompositeEntry("dash");
                hero.getCompositeEntry("atk");
            }
        };
    }

    // ========================================================================
    // 7. Patches pour Game_Event (Étape 6 - Événements Acteurs & Notetags)
    // ========================================================================
    if (typeof Game_Event !== "undefined") {
        const _Game_Event_initMembers = Game_Event.prototype.initMembers;
        Game_Event.prototype.initMembers = function() {
            _Game_Event_initMembers.call(this);
            this._actorId = 0;
            this._actorVisible = false;
            this._isJoiningParty = false;
            this._role = "neutral";
            this._enemyId = 0;
            this._enemyBattler = null;
            this._isContainer = false;
            this._containerInventoryId = null;
            this._hasActorInventory = false;
            this._actorInventoryId = null;
            this._hasEnemyInventory = false;
            this._enemyInventoryId = null;
        };

        /**
         * Extrait les notetags de l'acteur, du combat et de l'inventaire :
         * - <actor: ID> : lie cet événement à l'acteur de la base de données
         * - <actor_visible> : force la visibilité même si l'acteur est dans l'équipe
         * - <role: "neutral"|"hostile"|"ally"|"civilian"> : rôle de l'entité
         * - <enemy: ID> : lie l'entité hostile à un ennemi de la base de données
         * - <inventory> ou <inventory: ID> : conteneur avec inventaire
         * - <actor_inventory: ID> : inventaire d'acteur lié
         * - <enemy_inventory: ID> : inventaire d'ennemi lié
         */
        Game_Event.prototype.extractActorNotetag = function() {
            this._actorId = 0;
            this._actorVisible = false;
            this._role = "neutral";
            this._enemyId = 0;
            this._isContainer = false;
            this._containerInventoryId = null;
            this._hasActorInventory = false;
            this._actorInventoryId = null;
            this._hasEnemyInventory = false;
            this._enemyInventoryId = null;

            const parseNoteText = (text) => {
                if (!text) return;
                const matchActor = text.match(/<actor:\s*\[?(\d+)\]?>/i);
                if (matchActor) {
                    this._actorId = Number(matchActor[1]);
                }
                if (/<actor_visible>/i.test(text)) {
                    this._actorVisible = true;
                }
                const matchRole = text.match(/<role:\s*([^>]+)>/i);
                if (matchRole) {
                    let r = matchRole[1].trim().toLowerCase();
                    r = r.replace(/^\[+|\]+$/g, "").replace(/^list:\s*/i, "").replace(/^"+|"+$/g, "").trim().toLowerCase();
                    this._role = r;
                }
                const matchEnemy = text.match(/<enemy:\s*\[?(\d+)\]?>/i);
                if (matchEnemy) {
                    this._enemyId = Number(matchEnemy[1]);
                }
                const matchContainer = text.match(/<inventory(?::\s*([^>]+))?>/i);
                if (matchContainer) {
                    this._isContainer = true;
                    if (matchContainer[1]) {
                        this._containerInventoryId = matchContainer[1].trim();
                    }
                }
                const matchActorInv = text.match(/<actor_inventory:\s*\[?(\d+)\]?>/i);
                if (matchActorInv) {
                    this._hasActorInventory = true;
                    this._actorInventoryId = "A_" + Number(matchActorInv[1]);
                }
                const matchEnemyInv = text.match(/<enemy_inventory:\s*\[?(\d+)\]?>/i);
                if (matchEnemyInv) {
                    this._hasEnemyInventory = true;
                    this._enemyInventoryId = "E_" + Number(matchEnemyInv[1]);
                }
            };

            // 1. Note globale de l'événement (fallback)
            const ev = this.event();
            if (ev && ev.note) {
                parseNoteText(ev.note);
            }

            // 2. Commentaires de la page active (codes 108 / 408) - prioritaires
            const page = this.page();
            if (page && page.list) {
                for (const cmd of page.list) {
                    if (cmd.code === 108 || cmd.code === 408) {
                        parseNoteText(cmd.parameters[0]);
                    }
                }
            }

            // Instancie le battler ennemi si <enemy: ID>
            if (this._enemyId > 0 && typeof Game_Enemy !== "undefined") {
                if (!this._enemyBattler || this._enemyBattler.enemyId() !== this._enemyId) {
                    if (typeof $dataEnemies !== "undefined" && $dataEnemies && $dataEnemies[this._enemyId]) {
                        this._enemyBattler = new Game_Enemy(this._enemyId, 0, 0);
                    }
                }
            }
        };

        Game_Event.prototype.role = function() {
            return this._role || "neutral";
        };

        Game_Event.prototype.setRole = function(role) {
            this._role = (role || "neutral").toLowerCase();
        };

        Game_Event.prototype.isHostile = function() {
            return this.role() === "hostile";
        };

        Game_Event.prototype.isAlly = function() {
            return this.role() === "ally";
        };

        Game_Event.prototype.isNeutral = function() {
            return this.role() === "neutral";
        };

        Game_Event.prototype.isCivilian = function() {
            return this.role() === "civilian";
        };

        Game_Event.prototype.enemyId = function() {
            return this._enemyId || 0;
        };

        Game_Event.prototype.battler = function() {
            if (!this._enemyBattler && this._enemyId > 0 && typeof Game_Enemy !== "undefined" && typeof $dataEnemies !== "undefined" && $dataEnemies && $dataEnemies[this._enemyId]) {
                this._enemyBattler = new Game_Enemy(this._enemyId, 0, 0);
            }
            return this._enemyBattler || (this.actor ? this.actor() : null);
        };

        Game_Event.prototype.actorId = function() {
            return this._actorId || 0;
        };

        Game_Event.prototype.actor = function() {
            const id = this.actorId();
            if (id > 0 && typeof $gameActors !== "undefined" && $gameActors) {
                return $gameActors.actor(id);
            }
            return null;
        };

        Game_Event.prototype.hero = function() {
            const actor = this.actor();
            return (actor && actor.isHero && actor.isHero()) ? actor : null;
        };

        Game_Event.prototype.isHero = function() {
            return Boolean(this.hero());
        };

        /**
         * Détermine si l'événement court/dash selon sa vitesse configurée (5 = Rapide, 6 = Plus rapide/vite).
         */
        Game_Event.prototype.isDashing = function() {
            const speed = typeof this.moveSpeed === "function" ? this.moveSpeed() : (this._moveSpeed || 4);
            return speed >= 5;
        };

        Game_Event.prototype.realMoveSpeed = function() {
            return typeof this.moveSpeed === "function" ? this.moveSpeed() : (this._moveSpeed || 4);
        };

        Game_Event.prototype.isActorInParty = function() {
            if (this._actorId > 0 && typeof $gameParty !== "undefined" && $gameParty) {
                return $gameParty.members().some(a => a && a.actorId() === this._actorId);
            }
            return false;
        };

        /**
         * Détermine si l'événement doit être masqué car l'acteur est présent dans l'équipe.
         * @returns {boolean}
         */
        Game_Event.prototype.isInPartyHidden = function() {
            return this._actorId > 0 && !this._actorVisible && this.isActorInParty();
        };

        const _Game_Event_setupPageSettings = Game_Event.prototype.setupPageSettings;
        Game_Event.prototype.setupPageSettings = function() {
            if (_Game_Event_setupPageSettings) {
                _Game_Event_setupPageSettings.call(this);
            }
            this.extractActorNotetag();
            this.updateActorAppearance();
        };

        const _Game_Event_refresh = Game_Event.prototype.refresh;
        Game_Event.prototype.refresh = function() {
            if (_Game_Event_refresh) {
                _Game_Event_refresh.call(this);
            }
            if (this._actorId > 0) {
                this.updateActorAppearance();
            }
        };

        /**
         * Met à jour l'apparence visuelle de l'événement avec les données de l'acteur.
         */
        Game_Event.prototype.updateActorAppearance = function() {
            if (this._actorId > 0) {
                const actor = this.actor();
                if (actor) {
                    this.setImage(actor.characterName(), actor.characterIndex());
                    const hero = this.hero();
                    if (hero) {
                        hero.getCompositeEntry("walk");
                        hero.getCompositeEntry("dash");
                        hero.getCompositeEntry("atk");
                        hero.getCompositeEntry("hurt");
                        hero.getCompositeEntry("down");
                    }
                }
            }
        };

        const _Game_Event_isTransparent = Game_Event.prototype.isTransparent;
        Game_Event.prototype.isTransparent = function() {
            if (this.isInPartyHidden()) {
                return true;
            }
            return _Game_Event_isTransparent.call(this);
        };

        const _Game_Event_isThrough = Game_Event.prototype.isThrough;
        Game_Event.prototype.isThrough = function() {
            if (this.isInPartyHidden()) {
                return true;
            }
            return _Game_Event_isThrough.call(this);
        };

        const _Game_Event_start = Game_Event.prototype.start;
        Game_Event.prototype.start = function() {
            if (this.isInPartyHidden()) {
                return;
            }
            _Game_Event_start.call(this);
        };

        /**
         * Étape 7 : Ajoute cet acteur à l'équipe du joueur après s'être déplacé
         * jusqu'à la position où le follower doit apparaître.
         * @param {Function} [onComplete] Callback optionnel à l'arrivée
         * @returns {boolean}
         */
        Game_Event.prototype.joinPlayerParty = function(onComplete) {
            if (this.isActorInParty()) {
                return false;
            }
            const actorId = this.actorId();
            if (actorId <= 0) {
                return false;
            }

            const joinPos = this.getFollowerJoinPosition();
            const precedingChar = joinPos.precedingChar;

            // Si l'événement est déjà sur la case cible
            if (this.pos(joinPos.x, joinPos.y)) {
                this.finishJoinParty(precedingChar, onComplete);
                return true;
            }

            // Début du déplacement vers l'emplacement du follower
            this._isJoiningParty = true;
            this._joinTargetX = joinPos.x;
            this._joinTargetY = joinPos.y;
            this._joinPrecedingChar = precedingChar;
            this._joinOnComplete = onComplete;

            return true;
        };

        Game_Event.prototype.getFollowerJoinPosition = function() {
            const precedingChar = (typeof $gamePlayer !== "undefined" && $gamePlayer && $gamePlayer.followers)
                ? ($gamePlayer.followers().visibleFollowers().length > 0 
                    ? $gamePlayer.followers().visibleFollowers().at(-1) 
                    : $gamePlayer)
                : null;

            if (!precedingChar) {
                return { x: this.x, y: this.y, precedingChar: null };
            }

            const pDir = precedingChar.direction();
            const behindDir = [1, 3, 7, 9].includes(pDir)
                ? (10 - pDir)
                : ({ 2: 8, 8: 2, 4: 6, 6: 4 }[pDir] || 8);

            const targetX = $gameMap.roundXWithDirection(precedingChar.x, behindDir);
            const targetY = $gameMap.roundYWithDirection(precedingChar.y, behindDir);

            if (this.canPass(precedingChar.x, precedingChar.y, behindDir) || this.pos(targetX, targetY)) {
                return { x: targetX, y: targetY, precedingChar };
            }

            // Si la case arrière n'est pas franchissable, chercher une case adjacente franchissable
            for (const d of [2, 4, 6, 8, 1, 3, 7, 9]) {
                const tx = $gameMap.roundXWithDirection(precedingChar.x, d);
                const ty = $gameMap.roundYWithDirection(precedingChar.y, d);
                if (this.canPass(precedingChar.x, precedingChar.y, d) || this.pos(tx, ty)) {
                    return { x: tx, y: ty, precedingChar };
                }
            }

            return { x: precedingChar.x, y: precedingChar.y, precedingChar };
        };

        Game_Event.prototype.updateJoinParty = function() {
            if (this.isMoving()) return;

            if (this.pos(this._joinTargetX, this._joinTargetY)) {
                this._isJoiningParty = false;
                this.finishJoinParty(this._joinPrecedingChar, this._joinOnComplete);
                return;
            }

            const dir = this.findDirectionTo(this._joinTargetX, this._joinTargetY);
            if (dir > 0) {
                this.executeMove8Dir(dir);
            } else {
                // Si bloqué, on termine l'adhésion au plus près
                this._isJoiningParty = false;
                this.finishJoinParty(this._joinPrecedingChar, this._joinOnComplete);
            }
        };

        Game_Event.prototype.finishJoinParty = function(precedingChar, onComplete) {
            const actorId = this.actorId();
            const finalDir = precedingChar ? precedingChar.direction() : this.direction();
            this.setDirection(finalDir);

            const posX = this.x;
            const posY = this.y;
            const posDir = this.direction();

            // Ajout de l'acteur à l'équipe
            $gameParty.addActor(actorId);

            // Positionne le nouveau follower exactement à l'emplacement où l'event est arrivé
            if (typeof $gamePlayer !== "undefined" && $gamePlayer && $gamePlayer.followers) {
                const follower = $gamePlayer.followers().data().find(f => f && f.actor() && f.actor().actorId() === actorId);
                if (follower) {
                    follower.locate(posX, posY);
                    follower.setDirection(posDir);
                }
            }

            if (typeof onComplete === "function") {
                onComplete.call(this);
            }
        };

        const _Game_Event_update = Game_Event.prototype.update;
        Game_Event.prototype.update = function() {
            if (_Game_Event_update) {
                _Game_Event_update.call(this);
            }
            if (this._isJoiningParty) {
                this.updateJoinParty();
            }
        };
    }

    // ========================================================================
    // 8. Patches pour Game_Interpreter (Support de this.playAction en appel de script)
    // ========================================================================
    if (typeof Game_Interpreter !== "undefined") {
        /**
         * Raccourci de commande d'événement (Script Call) :
         * this.playAction({ actorId: 2, action: "atk", duration: 4, frames: 4 })
         * ou
         * this.playAction({ action: "atk", duration: 4, frames: 4 })
         * @param {{ actorId?: number, id?: number, action?: string, duration?: number, frames?: number }|string} options 
         * @returns {boolean}
         */
        Game_Interpreter.prototype.playAction = function(options = {}) {
            if (typeof options === "string") {
                options = { action: options };
            }
            const actorId = options.actorId || (options.id ? Number(options.id) : 0);
            if (actorId > 0) {
                if (typeof window.$heroHub !== "undefined" && window.$heroHub) {
                    const target = window.$heroHub.findActorCharacter(actorId);
                    if (target && typeof target.playAction === "function") {
                        return target.playAction({ ...options, actorId: 0 });
                    }
                }
                return false;
            }

            // Si aucun actorId n'est fourni, cible l'événement exécutant l'interpréteur
            const char = this.character(0);
            if (char && typeof char.playAction === "function") {
                return char.playAction(options);
            }
            return false;
        };

        /**
         * Raccourci pour appeler joinPlayerParty() depuis un appel de script d'événement :
         * this.joinPlayerParty();
         * ou
         * this.joinPlayerParty(eventId);
         * @param {number} [eventId=0] 0 pour l'événement exécutant l'interpréteur
         * @returns {boolean}
         */
        Game_Interpreter.prototype.joinPlayerParty = function(eventId = 0) {
            const char = this.character(eventId);
            if (char && typeof char.joinPlayerParty === "function") {
                const started = char.joinPlayerParty();
                if (started) {
                    this.setWaitMode("joinParty");
                }
                return started;
            }
            return false;
        };

        const _Game_Interpreter_updateWaitMode = Game_Interpreter.prototype.updateWaitMode;
        Game_Interpreter.prototype.updateWaitMode = function() {
            if (this._waitMode === "joinParty") {
                const char = this.character(0);
                const waiting = char && Boolean(char._isJoiningParty);
                if (!waiting) {
                    this._waitMode = "";
                }
                return waiting;
            }
            return _Game_Interpreter_updateWaitMode ? _Game_Interpreter_updateWaitMode.call(this) : false;
        };

        /**
         * Ouvre l'inventaire spécifié (ou de l'événement courant si conteneur)
         * @param {string} [inventoryId=null]
         */
        Game_Interpreter.prototype.openInventory = function(inventoryId = null) {
            if (typeof $inventories !== "undefined" && $inventories) {
                const id = inventoryId || ("C_" + this._eventId);
                $inventories.open(id, { eventId: this._eventId });
                return true;
            }
            return false;
        };

        /**
         * Initialise le butin d'un ennemi et ouvre son inventaire
         * @param {number} [enemyId=1]
         */
        Game_Interpreter.prototype.openEnemyLoot = function(enemyId = 1) {
            if (typeof $inventories !== "undefined" && $inventories) {
                $inventories.initEnnemyInventory(enemyId);
                $inventories.open("E_" + enemyId, { eventId: this._eventId });
                return true;
            }
            return false;
        };
    }

    // ========================================================================
    // 9. Patches pour Game_Party (Synchronisation de l'inventaire lors de l'intégration)
    // ========================================================================
    if (typeof Game_Party !== "undefined") {
        const _Game_Party_addActor = Game_Party.prototype.addActor;
        Game_Party.prototype.addActor = function(actorId) {
            _Game_Party_addActor.call(this, actorId);
            if (typeof $inventories !== "undefined" && $inventories) {
                const invId = "A_" + actorId;
                if ($inventories.hasInventory(invId)) {
                    const actorInv = $inventories.inventory(invId);
                    for (const item of actorInv.items()) {
                        const count = actorInv.numItems(item);
                        if (count > 0) {
                            this.gainItem(item, count);
                        }
                    }
                    actorInv.clear();
                }
            }
        };
    }

    // ========================================================================
    // 10. Déclenchement automatique des conteneurs sur Game_Event
    // ========================================================================
    if (typeof Game_Event !== "undefined") {
        const _Game_Event_start = Game_Event.prototype.start;
        Game_Event.prototype.start = function() {
            const list = this.list();
            if (this._isContainer && (!list || list.length <= 1)) {
                const invId = this._containerInventoryId || ("C_" + this.eventId());
                if (typeof $inventories !== "undefined" && $inventories) {
                    $inventories.open(invId, { eventId: this.eventId() });
                    return;
                }
            }
            _Game_Event_start.call(this);
        };
    }

})();


