//=============================================================================
// SC4_rmmz_objects_Patches.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Surcharges et patches des classes natives de rmmz_objects.js.
 * @author SimCraft
 * @help
 * ============================================================================
 * NORME DES FICHIERS DE PATCHES :
 * - Nom de la Classe en commentaire (ex: // GAME MAP)
 * - Création de tous les alias nécessaires à la classe au début de sa section, suivis d'une ligne vide
 * - Toutes les méthodes de la classe regroupées ensemble (surcharges et ajouts), sans doublons
 * - Ordre des classes identique au fichier natif vanilla
 * - Pas de commentaires superflus en dehors des méthodes (sauf TODO ou note en header)
 * - Règle "Fail Fast" : pas de fallbacks silencieux masquant les bugs
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

    // GAME TEMP (PURGE DE L'HISTORIQUE TACTILE ANTI-BOUCLE)
    //=============================================================================
    const _Game_Temp_setDestination = Game_Temp.prototype.setDestination;
    Game_Temp.prototype.setDestination = function (x, y) {
        _Game_Temp_setDestination.call(this, x, y);
        if (typeof $gamePlayer !== "undefined" && $gamePlayer && typeof $gamePlayer.clearTouchMoveHistory === "function") {
            $gamePlayer.clearTouchMoveHistory();
        }
    };

    const _Game_Temp_clearDestination = Game_Temp.prototype.clearDestination;
    Game_Temp.prototype.clearDestination = function () {
        _Game_Temp_clearDestination.call(this);
        if (typeof $gamePlayer !== "undefined" && $gamePlayer && typeof $gamePlayer.clearTouchMoveHistory === "function") {
            $gamePlayer.clearTouchMoveHistory();
        }
    };

    // GAME ACTOR
    //=============================================================================
    // GAME ACTORS & ACTOR (Initialisation souveraine Game_ScActor)
    //=============================================================================
    const _Game_Actors_actor = Game_Actors.prototype.actor;
    const _Game_Actor_name = Game_Actor.prototype.name;
    const _Game_Actor_nickname = Game_Actor.prototype.nickname;
    const _Game_Actor_profile = Game_Actor.prototype.profile;
    const _Game_Actor_tradeItemWithParty = Game_Actor.prototype.tradeItemWithParty;

    Game_Actors.prototype.actor = function (actorId) {
        if ($dataActors && $dataActors[actorId]) {
            if (!this._data[actorId]) {
                if (typeof Game_ScActor !== "undefined") {
                    this._data[actorId] = new Game_ScActor(actorId);
                } else if (typeof Game_Hero !== "undefined") {
                    this._data[actorId] = new Game_Hero(actorId);
                } else {
                    this._data[actorId] = new Game_Actor(actorId);
                }
            }
            return this._data[actorId];
        }
        return null;
    };

    Game_Actors.prototype.makeSavefileData = function () {
        const result = {};
        for (let i = 1; i < this._data.length; i++) {
            const actor = this._data[i];
            if (actor && typeof actor.makeSavefileData === "function") {
                result[i] = actor.makeSavefileData();
            }
        }
        return result;
    };

    Game_Actors.prototype.loadSavefileData = function (data) {
        if (!data || typeof data !== "object") return;
        for (const [idStr, actorData] of Object.entries(data)) {
            const id = parseInt(idStr, 10);
            if (id > 0) {
                const actor = this.actor(id);
                if (actor && typeof actor.loadSavefileData === "function") {
                    actor.loadSavefileData(actorData);
                }
            }
        }
    };

    Game_Actor.prototype.name = function () {
        return SC4_Localization.parse(_Game_Actor_name.call(this));
    };
    Game_Actor.prototype.nickname = function () {
        return SC4_Localization.parse(_Game_Actor_nickname.call(this));
    };
    Game_Actor.prototype.profile = function () {
        return SC4_Localization.parse(_Game_Actor_profile.call(this));
    };
    Game_Actor.prototype.tradeItemWithParty = function (newItem, oldItem) {
        if (!newItem || (typeof $gameParty !== "undefined" && $gameParty && $gameParty.numItems(newItem) > 0)) {
            return _Game_Actor_tradeItemWithParty
                ? _Game_Actor_tradeItemWithParty.call(this, newItem, oldItem)
                : false;
        }
        if (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.findMemberInventoryWithItem === "function") {
            const memberBag = $gameParty.findMemberInventoryWithItem(newItem);
            if (memberBag) {
                $gameParty.gainItem(oldItem, 1);
                if (typeof memberBag.loseItem === "function") {
                    memberBag.loseItem(newItem, 1);
                } else if (typeof memberBag.removeItem === "function") {
                    memberBag.removeItem(newItem, 1);
                }
                return true;
            }
        }
        return false;
    };

    // BATTLER BASE
    //=============================================================================
    const _Game_BattlerBase_xparam = Game_BattlerBase.prototype.xparam;

    Game_BattlerBase.prototype.xparam = function (xparamId) {
        const val = _Game_BattlerBase_xparam.call(this, xparamId);
        if (xparamId === 0 && val === 0 && this.isActor && this.isActor()) {
            return 0.95;
        }
        return val;
    }

    //ACTION
    //=============================================================================
    const _Game_Action_setSubject = Game_Action.prototype.setSubject;
    const _Game_Action_subject = Game_Action.prototype.subject;
    const _Game_Action_friendsUnit = Game_Action.prototype.friendsUnit;
    const _Game_Action_opponentsUnit = Game_Action.prototype.opponentsUnit;
    const _Game_Action_testApply = Game_Action.prototype.testApply;

    Game_Action.prototype.setSubject = function (subject) {
        _Game_Action_setSubject.call(this, subject);
        this._customSubject = subject;
    }
    Game_Action.prototype.subject = function () {
        const orig = _Game_Action_subject.call(this);
        if (!orig && this._customSubject) {
            return this._customSubject;
        }
        return orig;
    }
    Game_Action.prototype.friendsUnit = function () {
        const s = this.subject();
        if (s && typeof s.friendsUnit === "function") {
            return s.friendsUnit();
        }
        return (s && s.isActor()) ? $gameParty : $gameTroop;
    }
    Game_Action.prototype.opponentsUnit = function () {
        const s = this.subject();
        if (s && typeof s.opponentsUnit === "function") {
            return s.opponentsUnit();
        }
        return (s && s.isActor()) ? $gameTroop : $gameParty;
    }
    Game_Action.prototype.testApply = function (target) {
        if (this.isForOpponent() && target && target.isAlive()) {
            return true;
        }
        return _Game_Action_testApply.call(this, target);
    }

    // GAME ENEMY
    //=============================================================================
    const _Game_Enemy_name = Game_Enemy.prototype.name;

    Game_Enemy.prototype.friendsUnit = function () {
        return (typeof $gameTroop !== "undefined" && $gameTroop) ? $gameTroop : null;
    }
    Game_Enemy.prototype.opponentsUnit = function () {
        return (typeof $gameParty !== "undefined" && $gameParty) ? $gameParty : null;
    }
    Game_Enemy.prototype.name = function () {
        return SC4_Localization.parse(_Game_Enemy_name.call(this));
    }

    // GAME MAP
    //=============================================================================
    const _Game_Map_initMembers = Game_Map.prototype.initMembers;
    const _Game_Map_isDashDisabled = Game_Map.prototype.isDashDisabled;
    const _Game_Map_update = Game_Map.prototype.update;
    const _Game_Map_setup = Game_Map.prototype.setup;
    const _Game_Map_setupParallax = Game_Map.prototype.setupParallax;

    Game_Map.prototype.initMembers = function () {
        _Game_Map_initMembers.call(this);
        this._spaceShipId = null;
        this._shipHeadingVector = { x: 0, y: -3 };
    }
    Game_Map.prototype.isSpaceShip = function () {
        return this._spaceShipId !== null;
    }
    Game_Map.prototype.spaceShipId = function () {
        return this._spaceShipId;
    }
    Game_Map.prototype.shipHeadingVector = function () {
        return this._shipHeadingVector;
    }
    Game_Map.prototype.xWithDirection = function (x, d) {
        return x + (d === 6 || d === 3 || d === 9 ? 1 : d === 4 || d === 1 || d === 7 ? -1 : 0);
    }
    Game_Map.prototype.yWithDirection = function (y, d) {
        return y + (d === 2 || d === 1 || d === 3 ? 1 : d === 8 || d === 7 || d === 9 ? -1 : 0);
    }
    Game_Map.prototype.roundXWithDirection = function (x, d) {
        return this.roundX(this.xWithDirection(x, d));
    }
    Game_Map.prototype.roundYWithDirection = function (y, d) {
        return this.roundY(this.yWithDirection(y, d));
    }
    Game_Map.prototype.isNaturallySafe = function () {
        if (typeof $dataMap === "undefined" || !$dataMap) return false;
        if ($dataMap.disableDashing) return true;
        if ($dataMap.meta && ($dataMap.meta.safe_zone || $dataMap.meta.safeMap || $dataMap.meta.safe)) return true;
        return false;
    }
    Game_Map.prototype.isSafeZone = function () {
        return !this.isCombatMode() && this.isNaturallySafe();
    }
    Game_Map.prototype.isWater = function (x, y) {
        if (!this.isValid(x, y)) return false;

        // 1. Passage bateau ou navire natif RMMZ
        if (typeof this.isBoatPassable === "function" && this.isBoatPassable(x, y)) return true;
        if (typeof this.isShipPassable === "function" && this.isShipPassable(x, y)) return true;

        // 2. Drapeaux 0x0200 (bateau) et 0x0400 (navire)
        if (typeof this.checkPassage === "function") {
            if (this.checkPassage(x, y, 0x0200) || this.checkPassage(x, y, 0x0400)) {
                return true;
            }
        }

        // 3. Détection des tuiles d'eau A1 via Tilemap
        if (typeof Tilemap !== "undefined" && typeof this.layeredTiles === "function") {
            const tiles = this.layeredTiles(x, y);
            for (const tileId of tiles) {
                if (typeof Tilemap.isWaterTile === "function" && Tilemap.isWaterTile(tileId)) {
                    return true;
                }
                if (typeof Tilemap.isWaterfallTile === "function" && Tilemap.isWaterfallTile(tileId)) {
                    return true;
                }
            }
        }

        return false;
    }
    Game_Map.prototype.isCombatMode = function () {
        return Boolean(this._combatMode);
    }
    Game_Map.prototype.setCombatMode = function (active) {
        const prev = Boolean(this._combatMode);
        this._combatMode = Boolean(active);
        if (this._combatMode !== prev) {
            if (this._combatMode) {
                if (typeof $gamePlayer !== "undefined" && $gamePlayer && typeof $gamePlayer.onAlertTrigger === "function") {
                    $gamePlayer.onAlertTrigger();
                }
                if (typeof $gamePlayer !== "undefined" && $gamePlayer && $gamePlayer._followers && typeof $gamePlayer._followers.forEach === "function") {
                    $gamePlayer._followers.forEach(f => {
                        if (f && typeof f.onAlertTrigger === "function") f.onAlertTrigger();
                    });
                }
            }
        }
    }
    Game_Map.prototype.updateCombatMode = function () {
        if (!this.isNaturallySafe()) return;
        if (typeof IAManager !== "undefined" && typeof IAManager.countActiveHostileEnemies === "function") {
            const activeHostiles = IAManager.countActiveHostileEnemies();
            if (activeHostiles > 0 && !this.isCombatMode()) {
                this.setCombatMode(true);
            } else if (activeHostiles === 0 && this.isCombatMode()) {
                this.setCombatMode(false);
            }
        }
    }
    Game_Map.prototype.isDashDisabled = function () {
        if (this.isCombatMode()) {
            return false;
        }
        if (typeof $dataMap !== "undefined" && $dataMap && $dataMap.meta && ($dataMap.meta.no_dash || $dataMap.meta.noDash)) {
            return true;
        }
        return _Game_Map_isDashDisabled ? _Game_Map_isDashDisabled.call(this) : (typeof $dataMap !== "undefined" && $dataMap ? Boolean($dataMap.disableDashing) : false);
    }
    Game_Map.prototype.update = function (sceneActive) {
        if (window.$tutoManager && window.$tutoManager.isBusy()) {
            return;
        }
        if (_Game_Map_update) {
            _Game_Map_update.call(this, sceneActive);
        }
        if (window.$battleAIManager && typeof window.$battleAIManager.update === "function") {
            window.$battleAIManager.update();
        } else {
            this.updateCombatMode();
            if (typeof IAManager !== "undefined" && typeof IAManager.updateBgm === "function") {
                IAManager.updateBgm();
            }
        }
    }
    Game_Map.prototype.setup = function (mapId) {
        this._combatMode = false;
        this._spaceShipId = null;
        this._shipHeadingVector = { x: 0, y: -3 };
        this._overlays = [];
        if (typeof $dataMap !== "undefined" && $dataMap && $dataMap.note) {
            const match = $dataMap.note.match(/<spaceship:\s*(\w+)>/i);
            if (match) {
                this._spaceShipId = match[1].toLowerCase() === "player" ? "player" : parseInt(match[1], 10);
            }
            const loopX = Boolean($dataMap.parallaxLoopX);
            const loopY = Boolean($dataMap.parallaxLoopY);
            const sx = loopX ? (Number($dataMap.parallaxSx) || 0) : 0;
            const sy = loopY ? (Number($dataMap.parallaxSy) || 0) : 0;
            this._shipHeadingVector = { x: sx, y: sy };
            if (this._shipHeadingVector.x === 0 && this._shipHeadingVector.y === 0) {
                this._shipHeadingVector.y = -3;
            }

            // Parsing des notetags d'overlays cartographiques (<overlay:...>)
            this.setupMapOverlays($dataMap.note);
        }
        if (_Game_Map_setup) {
            _Game_Map_setup.call(this, mapId);
        }
        if (window.$battleAIManager && typeof window.$battleAIManager.onMapLoaded === "function") {
            window.$battleAIManager.onMapLoaded(mapId);
        } else if (typeof IAManager !== "undefined" && typeof IAManager.resetBgmState === "function") {
            IAManager.resetBgmState();
        }
    };

    /**
     * Analyse les notetags <overlay:...> de la carte et peuple this._overlays.
     * Syntaxe : <overlay: id, imgName, type, zIndex, xMap, yMap, opacity, persistant, blendMode, hue, regionTrigger, flickerType, fadeDuration>
     * @param {string} note 
     */
    Game_Map.prototype.setupMapOverlays = function (note) {
        this._overlays = [];
        if (!note) return;
        const regex = /<overlay:\s*([^>]+)>/gi;
        let match;
        while ((match = regex.exec(note)) !== null) {
            const raw = match[1].trim();
            const parts = raw.split(",").map(p => p.trim());
            if (parts.length >= 2) {
                const type = parts[2] || "static";
                const isShadow = type.toLowerCase().includes("shadow");
                const defaultZ = isShadow ? 2 : 4;
                const overlayData = {
                    id: parts[0],
                    imgName: parts[1],
                    type: type,
                    zIndex: (parts[3] !== undefined && parts[3] !== "") ? Number(parts[3]) : defaultZ,
                    xMap: (parts[4] !== undefined && parts[4] !== "") ? Number(parts[4]) : 0,
                    yMap: (parts[5] !== undefined && parts[5] !== "") ? Number(parts[5]) : 0,
                    opacity: (parts[6] !== undefined && parts[6] !== "") ? Number(parts[6]) : 255,
                    persistant: (parts[7] !== undefined) ? (parts[7].toLowerCase() === "true" || parts[7] === "1") : false,
                    blendMode: (parts[8] !== undefined && parts[8] !== "") ? Number(parts[8]) : 0,
                    hue: (parts[9] !== undefined && parts[9] !== "") ? Number(parts[9]) : 0,
                    regionTrigger: (parts[10] !== undefined && parts[10] !== "") ? Number(parts[10]) : 0,
                    flickerType: (parts[11] !== undefined && parts[11] !== "") ? parts[11] : null,
                    fadeDuration: (parts[12] !== undefined && parts[12] !== "") ? Number(parts[12]) : null
                };
                this._overlays.push(overlayData);
            }
        }
    };

    Game_Map.prototype.overlays = function () {
        return this._overlays || [];
    };
    Game_Map.prototype.setupParallax = function () {
        if (_Game_Map_setupParallax) {
            _Game_Map_setupParallax.call(this);
        }
    }

    // CHARACTER BASE
    //=============================================================================
    const _Game_CharacterBase_initMembers = Game_CharacterBase.prototype.initMembers;
    const _Game_CharacterBase_realMoveSpeed = Game_CharacterBase.prototype.realMoveSpeed;
    const _Game_CharacterBase_moveStraight = Game_CharacterBase.prototype.moveStraight;
    const _Game_CharacterBase_moveDiagonally = Game_CharacterBase.prototype.moveDiagonally;
    const _Game_CharacterBase_resetPattern = Game_CharacterBase.prototype.resetPattern;
    const _Game_CharacterBase_updatePattern = Game_CharacterBase.prototype.updatePattern;
    const _Game_CharacterBase_update = Game_CharacterBase.prototype.update;

    Game_CharacterBase.prototype.initMembers = function () {
        _Game_CharacterBase_initMembers.call(this);
        this._action = "walk";
        this._isActing = false;
        this._actionPattern = 0;
        this._actionTimer = 0;
        this._actionMaxFrames = 4;
        this._actionFrameDuration = 4;
        this._actionDirection = 2;
        this._actionOnEnd = null;
        this._indicatorQueue = [];
        this._pose = null;
        this._poseOptions = {};
        this._actionQueue = [];
        this._currentQueueItem = null;
        this._isRotating = false;
        this._rotatePath = [];
        this._rotateTimer = 0;
        this._rotateStepDelay = 3;
        this._rotateOnEnd = null;
    }
    Game_CharacterBase.prototype.setPose = function (poseName, options = {}) {
        this._pose = poseName || null;
        this._poseOptions = options || {};
        if (!this.isActing()) {
            this._action = this._pose || "walk";
        }
    }
    Game_CharacterBase.prototype.clearPose = function () {
        this._pose = null;
        this._poseOptions = {};
        if (!this.isActing()) {
            this._action = "walk";
            if (typeof this.resetPattern === "function") {
                this.resetPattern();
            }
        }
    }
    Game_CharacterBase.prototype.pose = function () {
        return this._pose;
    }
    Game_CharacterBase.prototype.isPoseActive = function () {
        return Boolean(this._pose);
    }
    Game_CharacterBase.prototype.onAlertTrigger = function () {
        if (this._pose && this._poseOptions && this._poseOptions.onAlert !== false) {
            this.clearPose();
        }
    }
    Game_CharacterBase.prototype.requestIndicator = function (type) {
        if (!this._indicatorQueue) {
            this._indicatorQueue = [];
        }
        this._indicatorQueue.push(type);
    }
    Game_CharacterBase.prototype.isDashing = function () {
        return false;
    }
    Game_CharacterBase.prototype.action = function () {
        if (this.isActing()) {
            return this._action || (this._pose || "walk");
        }
        if (this._actionFreezeLastFrame && this._action) {
            return this._action;
        }
        if (this._pose) {
            return this._pose;
        }
        const dashing = typeof this.isDashing === "function" && this.isDashing();
        const moving = typeof this.isMoving === "function" && this.isMoving();
        if (dashing && moving) {
            return "run";
        }
        return this._action || "walk";
    }
    Game_CharacterBase.prototype.realMoveSpeed = function () {
        let speed = _Game_CharacterBase_realMoveSpeed ? _Game_CharacterBase_realMoveSpeed.call(this) : (this._moveSpeed || 4);
        if (this._pose && this._poseOptions && typeof this._poseOptions.speedMod === "number") {
            speed += this._poseOptions.speedMod;
        }
        return speed;
    }
    Game_CharacterBase.prototype.moveStraight = function (d) {
        if (this._pose && this._poseOptions && this._poseOptions.canMove === false) {
            return;
        }
        if (_Game_CharacterBase_moveStraight) {
            _Game_CharacterBase_moveStraight.call(this, d);
        }
    }
    Game_CharacterBase.prototype.moveDiagonally = function (horz, vert) {
        if (this._pose && this._poseOptions && this._poseOptions.canMove === false) {
            return;
        }
        if (_Game_CharacterBase_moveDiagonally) {
            _Game_CharacterBase_moveDiagonally.call(this, horz, vert);
        }
    }
    Game_CharacterBase.prototype.setAction = function (action) {
        this._action = action;
    }
    Game_CharacterBase.prototype.isActing = function () {
        return Boolean(this._isActing || this._isRotating || (this._actionQueue && this._actionQueue.length > 0));
    }
    Game_CharacterBase.prototype.isAttacking = function () {
        return this.isActing() && this._action === "atk";
    }
    Game_CharacterBase.prototype.actionPattern = function () {
        return this._actionPattern || 0;
    }
    Game_CharacterBase.prototype.attackPattern = function () {
        return this.actionPattern();
    }
    Game_CharacterBase.prototype.canAct = function () {
        if (this._queueBypassCanAct) {
            return true;
        }
        return !this.isActing();
    }
    Game_CharacterBase.prototype.canAttack = function () {
        return this.canAct();
    }
    Game_CharacterBase.prototype.playAction = function (options = {}) {
        /**
     * Déclenche une action animée sur ce personnage (ou sur l'acteur spécifié via actorId).
     * @param {{ action?: string, duration?: number, frames?: number, direction?: number, actorId?: number, onEnd?: Function }|string} options 
     * @returns {boolean}
     */
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
            const skillId = options.skillId || (typeof hero.attackSkillId === "function" ? hero.attackSkillId() : 1);
            const cfg = hero.getAttackConfig(skillId);
            if (!frames) frames = cfg.frames;
            if (!duration) duration = cfg.duration;
            if (!options.action) actionName = cfg.actionName;
        }

        // Déclenchement de l'action ATK pour le joueur et transmission au FightManager
        if (typeof $gamePlayer !== "undefined" && this === $gamePlayer && actionName === "atk" && !options.skipMelee) {
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
        this._actionFreezeLastFrame = options.freezeLastFrame !== undefined ? Boolean(options.freezeLastFrame) : (actionName === "down");
        this._actionOnEnd = typeof options.onEnd === "function" ? options.onEnd : null;

        return true;
    }

    /**
     * Résout une direction sous forme de chiffre RMMZ (1..9).
     * @param {number|string} dir
     * @returns {number}
     */
    Game_CharacterBase.prototype.resolveDirectionNumber = function (dir) {
        let numDir = Number(dir);
        if (isNaN(numDir) || numDir === 0) {
            const s = String(dir || "").toLowerCase();
            if (s === "down" || s === "bas") numDir = 2;
            else if (s === "left" || s === "gauche") numDir = 4;
            else if (s === "right" || s === "droite") numDir = 6;
            else if (s === "up" || s === "haut") numDir = 8;
            else if (s === "downleft" || s === "basgauche") numDir = 1;
            else if (s === "downright" || s === "basdroite") numDir = 3;
            else if (s === "upleft" || s === "hautgauche") numDir = 7;
            else if (s === "upright" || s === "hautdroite") numDir = 9;
            else numDir = this.direction() || 2;
        }
        return numDir;
    };

    /**
     * Calcule le delta de déplacement (dx, dy) pour une direction donnée.
     * @param {number} dir
     * @returns {{ dx: number, dy: number }}
     */
    Game_CharacterBase.prototype.directionToDelta = function (dir) {
        const num = Number(dir);
        let dx = 0;
        let dy = 0;
        if (num === 1) { dx = -1; dy = 1; }
        else if (num === 2) { dx = 0; dy = 1; }
        else if (num === 3) { dx = 1; dy = 1; }
        else if (num === 4) { dx = -1; dy = 0; }
        else if (num === 6) { dx = 1; dy = 0; }
        else if (num === 7) { dx = -1; dy = -1; }
        else if (num === 8) { dx = 0; dy = -1; }
        else if (num === 9) { dx = 1; dy = -1; }
        return { dx, dy };
    };

    /**
     * Calcule la trajectoire angulaire la plus courte entre deux directions 8-dir.
     * En cas d'opposé parfait (180°), privilégie le passage par le bas (2) ou la droite (6).
     * @param {number} fromDir
     * @param {number} toDir
     * @returns {{ steps: number, path: number[] }}
     */
    Game_CharacterBase.prototype.getShortestTurnPath = function (fromDir, toDir) {
        const DIRS = [8, 9, 6, 3, 2, 1, 4, 7];
        let fromIdx = DIRS.indexOf(Number(fromDir));
        let toIdx = DIRS.indexOf(Number(toDir));
        if (fromIdx === -1) fromIdx = 4;
        if (toIdx === -1) toIdx = fromIdx;
        if (fromIdx === toIdx) return { steps: 0, path: [] };

        const distCW = (toIdx - fromIdx + 8) % 8;
        const distCCW = (fromIdx - toIdx + 8) % 8;

        let sign = 1;
        if (distCW < distCCW) {
            sign = 1;
        } else if (distCCW < distCW) {
            sign = -1;
        } else {
            // Règle de départage à 180° : privilégier le passage par le bas (2) ou la droite (6)
            let hasFavoredCW = false;
            for (let i = 1; i < distCW; i++) {
                const d = DIRS[(fromIdx + i) % 8];
                if (d === 2 || d === 6) hasFavoredCW = true;
            }
            sign = hasFavoredCW ? 1 : -1;
        }

        const numSteps = (sign === 1) ? distCW : distCCW;
        const path = [];
        for (let step = 1; step <= numSteps; step++) {
            const nextIdx = (fromIdx + sign * step + 8 * 10) % 8;
            path.push(DIRS[nextIdx]);
        }
        return { steps: numSteps, path };
    };

    /**
     * Déclenche une rotation progressive 8 directions vers l'angle cible.
     * @param {number|string} targetDirection
     * @param {object|number} [options={}] - Options ou durée en frames par cran de 45° (stepDelay)
     * @returns {boolean}
     */
    Game_CharacterBase.prototype.playRotate = function (targetDirection, options = {}) {
        const opts = (typeof options === "number") ? { stepDelay: options } : (options || {});
        const numDir = this.resolveDirectionNumber(targetDirection);
        const curDir = this.direction() || 2;
        const turn = this.getShortestTurnPath(curDir, numDir);

        if (turn.steps === 0 || !turn.path || turn.path.length === 0) {
            this.setDirection(numDir);
            this._actionDirection = numDir;
            if (typeof opts.onEnd === "function") {
                opts.onEnd.call(this);
            }
            return true;
        }

        this._isRotating = true;
        this._rotatePath = turn.path;
        this._rotateTimer = 0;
        this._rotateStepDelay = Number(opts.stepDelay) || 3;
        this._rotateOnEnd = typeof opts.onEnd === "function" ? opts.onEnd : null;
        this._actionDirection = curDir;
        return true;
    };

    /**
     * Met à jour la rotation progressive à chaque frame.
     */
    Game_CharacterBase.prototype.updateRotate = function () {
        this._rotateTimer++;
        if (this._rotateTimer >= this._rotateStepDelay) {
            this._rotateTimer = 0;
            if (this._rotatePath && this._rotatePath.length > 0) {
                const nextDir = this._rotatePath.shift();
                this.setDirection(nextDir);
                this._actionDirection = nextDir;
            }
            if (!this._rotatePath || this._rotatePath.length === 0) {
                this._isRotating = false;
                if (this._rotateOnEnd) {
                    const cb = this._rotateOnEnd;
                    this._rotateOnEnd = null;
                    cb.call(this);
                }
            }
        }
    };

    /**
     * File d'attente d'actions (_actionQueue).
     */
    Game_CharacterBase.prototype.queueAction = function (item) {
        this.queueActions([item]);
    };

    Game_CharacterBase.prototype.queueActions = function (items) {
        if (!this._actionQueue) {
            this._actionQueue = [];
        }
        if (Array.isArray(items)) {
            for (const it of items) {
                if (it) this._actionQueue.push(it);
            }
        }
        if (!this._isActing && !this._isRotating && !this._currentQueueItem) {
            this.processNextAction();
        }
    };

    Game_CharacterBase.prototype.actionQueue = function () {
        return this._actionQueue || [];
    };

    Game_CharacterBase.prototype.currentQueueItem = function () {
        return this._currentQueueItem;
    };

    Game_CharacterBase.prototype.stopActionRepeat = function () {
        if (this._currentQueueItem) {
            this._currentQueueItem.repeat = 0;
        }
    };

    Game_CharacterBase.prototype.clearActionQueue = function () {
        this._actionQueue = [];
        this._currentQueueItem = null;
        this._isRotating = false;
        this._rotatePath = [];
        this._isActing = false;
        this._action = this._pose || "walk";
        if (typeof this.resetPattern === "function") {
            this.resetPattern();
        }
    };

    Game_CharacterBase.prototype.processNextAction = function () {
        if (!this._actionQueue) {
            this._actionQueue = [];
        }

        // Vérification de répétition sur l'élément en cours
        if (this._currentQueueItem && this._currentQueueItem.repeat !== undefined) {
            const r = this._currentQueueItem.repeat;
            if (r === true || r < 0 || r === Infinity) {
                this.executeQueueItem(this._currentQueueItem);
                return;
            } else if (typeof r === "number" && r > 0) {
                this._currentQueueItem.repeat--;
                this.executeQueueItem(this._currentQueueItem);
                return;
            }
        }

        this._currentQueueItem = null;

        if (this._actionQueue.length === 0) {
            this._isActing = false;
            this._isRotating = false;
            this._action = this._pose || "walk";
            if (typeof this.resetPattern === "function") {
                this.resetPattern();
            }
            return;
        }

        const item = this._actionQueue.shift();
        this._currentQueueItem = item;
        this.executeQueueItem(item);
    };

    Game_CharacterBase.prototype.executeQueueItem = function (item) {
        if (!item) {
            this.processNextAction();
            return;
        }

        const type = item.type || "action";

        if (type === "rotate") {
            const targetDir = item.targetDir || item.direction;
            const delay = item.stepDelay || item.delay || 3;
            this.playRotate(targetDir, {
                stepDelay: delay,
                onEnd: () => this.processNextAction()
            });
        } else if (type === "translate") {
            const dx = Number(item.dx) || 0;
            const dy = Number(item.dy) || 0;
            this._x += dx;
            this._y += dy;
            this._realX = this._x;
            this._realY = this._y;
            if (typeof this.refreshBushDepth === "function") {
                this.refreshBushDepth();
            }
            if (this._followers && typeof this._followers.synchronize === "function") {
                this._followers.synchronize(this._x, this._y, this.direction());
            }
            if (item.direction) {
                this.setDirection(item.direction);
                this._actionDirection = item.direction;
            }
            this.processNextAction();
        } else if (type === "wait") {
            const duration = Number(item.duration) || Number(item.frames) || 1;
            this._isActing = true;
            this._actionTimer = 0;
            this._actionMaxFrames = 1;
            this._actionFrameDuration = duration;
            this._actionOnEnd = () => this.processNextAction();
        } else if (type === "setPose") {
            this.setPose(item.pose, item.options);
            this.processNextAction();
        } else if (type === "clearPose") {
            this.clearPose();
            this.processNextAction();
        } else if (type === "call") {
            if (typeof item.fn === "function") {
                item.fn.call(this);
            }
            this.processNextAction();
        } else {
            // type === "action"
            const opts = (typeof item === "string") ? { action: item } : { ...item };
            const userOnEnd = opts.onEnd;
            opts.onEnd = () => {
                if (typeof userOnEnd === "function") {
                    userOnEnd.call(this);
                }
                this.processNextAction();
            };
            this._queueBypassCanAct = true;
            this.playAction(opts);
            this._queueBypassCanAct = false;
        }
    };

    /**
     * Exécute une transition d'action en deux étapes avec déplacement physique d'une case.
     * Idéal pour les animations transitives (se lever d'un lit, sortir d'un cockpit, franchir un rebord).
     * @param {string|object} dataAction1 - Première action (sur la case de départ)
     * @param {string|object} dataAction2 - Deuxième action (sur la case d'arrivée)
     * @param {number|string} direction - Direction de translation (2:Bas, 4:Gauche, 6:Droite, 8:Haut)
     * @param {object} [options={}] - Options complémentaires (onEnd, deltaX, deltaY, smoothRotate, rotateDelay, etc.)
     * @returns {boolean}
     */
    Game_CharacterBase.prototype.playTranslateAction = function (dataAction1, dataAction2, direction, options = {}) {
        let opts = options;
        let act1 = dataAction1;
        let act2 = dataAction2;
        let dir = direction;

        // Support d'un objet de configuration unique
        if (dataAction1 && typeof dataAction1 === "object" && !dataAction2) {
            opts = dataAction1;
            act1 = opts.action1 || opts.act1;
            act2 = opts.action2 || opts.act2;
            dir = (opts.direction !== undefined) ? opts.direction : opts.dir;
        }

        const actorId = opts.actorId || (opts.id ? Number(opts.id) : 0);
        if (actorId > 0 && typeof window.$heroHub !== "undefined" && window.$heroHub) {
            const target = window.$heroHub.findActorCharacter(actorId);
            if (target && target !== this) {
                return target.playTranslateAction(act1, act2, dir, { ...opts, actorId: 0 });
            } else if (!target) {
                return false;
            }
        }

        if (!this.canAct()) return false;

        const numDir = this.resolveDirectionNumber(dir);
        const defD = this.directionToDelta(numDir);
        const dx = (opts.deltaX !== undefined) ? Number(opts.deltaX) : defD.dx;
        const dy = (opts.deltaY !== undefined) ? Number(opts.deltaY) : defD.dy;

        const action1Obj = (typeof act1 === "string") ? { action: act1 } : { ...act1 };
        action1Obj.direction = action1Obj.direction || numDir;

        const action2Obj = (typeof act2 === "string") ? { action: act2 } : { ...act2 };
        action2Obj.direction = action2Obj.direction || numDir;
        if (opts.freezeLastFrame !== undefined && action2Obj.freezeLastFrame === undefined) {
            action2Obj.freezeLastFrame = opts.freezeLastFrame;
        }

        const userOnEnd = typeof opts.onEnd === "function" ? opts.onEnd : null;
        const smoothRotate = opts.smoothRotate !== undefined ? Boolean(opts.smoothRotate) : true;
        const rotateDelay = Number(opts.rotateDelay) || 3;

        const steps = [];

        // 1. Rotation progressive préliminaire vers la direction cible (si pas déjà orienté)
        if (smoothRotate && this.direction() !== numDir) {
            steps.push({ type: "rotate", targetDir: numDir, stepDelay: rotateDelay });
        } else if (!smoothRotate && this.direction() !== numDir) {
            this.setDirection(numDir);
            this._actionDirection = numDir;
        }

        // 2. Action 1 (sur la case de départ)
        steps.push({ type: "action", ...action1Obj });

        // 3. Translation physique d'une case
        steps.push({ type: "translate", dx, dy, direction: numDir });

        // 4. Action 2 (sur la case d'arrivée)
        steps.push({ type: "action", ...action2Obj });

        // 5. Gestion de la pose finale / nettoyage de la pose initiale (ex: lit)
        const shouldClearPose = (opts.clearPose !== undefined) ? Boolean(opts.clearPose) : Boolean(this.isPoseActive && this.isPoseActive());
        if (opts.finalPose !== undefined) {
            if (opts.finalPose === null || opts.finalPose === "walk") {
                steps.push({ type: "clearPose" });
            } else {
                steps.push({ type: "setPose", pose: opts.finalPose, options: opts.poseOptions || {} });
            }
        } else if (shouldClearPose) {
            steps.push({ type: "clearPose" });
        }

        // 6. Callback utilisateur éventuel
        if (userOnEnd) {
            steps.push({ type: "call", fn: userOnEnd });
        }

        this.queueActions(steps);
        return true;
    };

    Game_CharacterBase.prototype.updateAction = function () {
        /**
         * Progression temporelle de l'animation d'action ou de rotation (frame par frame).
         */
        if (this._isRotating) {
            this.updateRotate();
            return;
        }
        if (this._isActing) {
            this._actionTimer++;
            const currentPattern = Math.floor(this._actionTimer / this._actionFrameDuration);
            if (currentPattern < this._actionMaxFrames) {
                this._actionPattern = currentPattern;
            } else {
                this._isActing = false;
                if (typeof this.isBurstShooting === "function" && this.isBurstShooting()) {
                    // Maintien de la dernière frame de tir en rafale (évite de repasser par walk entre deux tirs)
                    this._actionPattern = Math.max(0, this._actionMaxFrames - 1);
                    this._pattern = this._actionPattern;
                } else if (this._actionFreezeLastFrame) {
                    this._actionPattern = Math.max(0, this._actionMaxFrames - 1);
                    this._pattern = this._actionPattern;
                    // Conserve l'action (ex: "down") figée sur la dernière frame
                } else {
                    this._action = this._pose || "walk";
                    this._actionPattern = 0;
                    this._actionTimer = 0;
                    this.setDirection(this._actionDirection);
                    this._pattern = 0;
                    if (typeof this.resetPattern === "function") {
                        this.resetPattern();
                    }
                }
                if (this._actionOnEnd) {
                    const cb = this._actionOnEnd;
                    this._actionOnEnd = null;
                    cb.call(this);
                }
            }
        }
    };
    Game_CharacterBase.prototype.resetPattern = function () {
        if (this._action && this._action !== "walk") {
            return;
        }
        if (_Game_CharacterBase_resetPattern) {
            _Game_CharacterBase_resetPattern.call(this);
        } else {
            this.setPattern(1);
        }
    }
    Game_CharacterBase.prototype.updatePattern = function () {
        if (this._action && this._action !== "walk") {
            return;
        }
        if (_Game_CharacterBase_updatePattern) {
            _Game_CharacterBase_updatePattern.call(this);
        }
    }
    Game_CharacterBase.prototype.updateAttack = function () {
        this.updateAction();
    }
    Game_CharacterBase.prototype.update = function () {
        if (_Game_CharacterBase_update) {
            _Game_CharacterBase_update.call(this);
        }
        this.updateAction();
        if (this.isActing()) {
            this.setDirection(this._actionDirection);
        }
    }
    Game_CharacterBase.prototype.executeMove8Dir = function (direction) {

        /**
         * Exécute un pas en 8 directions avec gestion des diagonales et glissement.
         * @param {number} direction (1..9)
         */
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
    }
    Game_CharacterBase.prototype.reverseDir8 = function (direction) {
        /**
     * Calcule la direction opposée en 8 directions.
     * @param {number} direction 
     * @returns {number}
     */
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
    }
    Game_CharacterBase.prototype.directionToCharacter = function (target) {
        /**
         * Détermine la direction 8 axes pour faire face à un autre personnage.
         * @param {Game_CharacterBase} target 
         * @returns {number}
         */
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
    }
    Game_CharacterBase.prototype.directionToPosition = function (targetX, targetY) {
        /**
         * Détermine la direction 8 axes pour faire face à une coordonnée de la carte.
         * @param {number} targetX 
         * @param {number} targetY 
         * @returns {number}
         */
        const dx = $gameMap.deltaX(targetX, this.x);
        const dy = $gameMap.deltaY(targetY, this.y);
        if (dx === 0 && dy === 0) return this.direction();

        const angle = Math.atan2(dy, dx);
        const octant = Math.round((angle / (Math.PI / 4)) + 8) % 8;
        const OCTANT_TO_DIR = [6, 3, 2, 1, 4, 7, 8, 9];
        return OCTANT_TO_DIR[octant] || this.direction();
    }
    Game_CharacterBase.prototype.shiftY = function () {
        if (this.isObjectCharacter()) {
            return 0;
        } else if (this.isHero && this.isHero()) {
            return -6;
        } else {
            return 6;
        }
    }

    //GAME CHARACTER
    //=============================================================================
    Game_Character.prototype.findDirectionTo = function (goalX, goalY) {
        /**
         * Pathfinding A* 8 directions intégrant l'heuristique de distance octile.
         * @param {number} goalX 
         * @param {number} goalY 
         * @returns {number} Direction (1..9, ou 0)
         */
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
    }
    Game_Character.prototype.moveTowardCharacter = function (character) {
        /**
         * Déplacement vers un personnage avec prise en compte des diagonales.
         * @param {Game_Character} character 
         */
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
    }
    Game_Character.prototype.moveAwayFromCharacter = function (character) {
        /**
         * Éloignement d'un personnage avec prise en compte des diagonales.
         * @param {Game_Character} character 
         */
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

    //GAME PLAYER
    //=============================================================================
    const _Game_Player_initMembers = Game_Player.prototype.initMembers;
    const _Game_Player_distancePerFrame = Game_Player.prototype.distancePerFrame;
    const _Game_Player_canMove = Game_Player.prototype.canMove;
    const _Game_Player_triggerButtonAction = Game_Player.prototype.triggerButtonAction;
    const _Game_Player_isDashing = Game_Player.prototype.isDashing;
    const _Game_Player_hasStepAnime = Game_Player.prototype.hasStepAnime;
    const _Game_Player_action = Game_Player.prototype.action;
    const _Game_Player_update = Game_Player.prototype.update;
    const _Game_Player_updateScroll = Game_Player.prototype.updateScroll;
    const _Game_Player_moveByInput = Game_Player.prototype.moveByInput;

    Game_Player.prototype.initMembers = function () {
        if (_Game_Player_initMembers) {
            _Game_Player_initMembers.call(this);
        }
        this._shootCooldown = 0;
        this._isReloading = false;
        this._reloadTimer = 0;
        this._reloadMode = "";
    };
    Game_Player.prototype.actor = function () {
        return (typeof $gameParty !== "undefined" && $gameParty) ? $gameParty.leader() : null;
    };

    Game_Player.prototype.canAct = function () {
        if (typeof this.isBurstShooting === "function" && this.isBurstShooting() && this._shootCooldown <= 0) {
            return true;
        }
        return Game_CharacterBase.prototype.canAct.call(this);
    }
    Game_Player.prototype.canAttack = function () {
        if (typeof this.isBurstShooting === "function" && this.isBurstShooting() && this._shootCooldown <= 0) {
            return true;
        }
        return Game_CharacterBase.prototype.canAttack.call(this);
    }
    Game_Player.prototype.hero = function () {
        const leader = $gameParty ? $gameParty.leader() : null;
        return (leader && leader.isHero && leader.isHero()) ? leader : null;
    }
    Game_Player.prototype.isHero = function () {
        return Boolean(this.hero());
    }
    Game_Player.prototype.getInputDirection = function () {
        return Input.dir8;
    }
    Game_Player.prototype.clearTouchMoveHistory = function () {
        this._touchMoveHistory = [];
    }
    Game_Player.prototype.recordTouchMove = function (direction) {
        if (!this._touchMoveHistory) {
            this._touchMoveHistory = [];
        }
        this._touchMoveHistory.push({
            direction: direction,
            x: this.x,
            y: this.y
        });
        if (this._touchMoveHistory.length > 4) {
            this._touchMoveHistory.shift();
        }
    }
    Game_Player.prototype.isTouchMoveOscillating = function () {
        if (!this._touchMoveHistory || this._touchMoveHistory.length < 4) {
            return false;
        }
        const h = this._touchMoveHistory;
        const d0 = h[0].direction, d1 = h[1].direction;
        const d2 = h[2].direction, d3 = h[3].direction;

        // 1. Détection de pattern alterné opposé (ex: 4, 6, 4, 6 ou 7, 3, 7, 3 ou 8, 2, 8, 2)
        const isAlternating = (d0 === d2 && d1 === d3);
        const isOpposite = (d1 === this.reverseDir8(d0) || d3 === this.reverseDir8(d2));
        if (isAlternating && isOpposite) return true;

        // 2. Détection de double aller-retour consécutif
        if (d1 === this.reverseDir8(d0) && d3 === this.reverseDir8(d2)) return true;

        // 3. Détection de boucle de positions (oscillation entre deux coordonnées identiques)
        if (h[0].x === h[2].x && h[0].y === h[2].y && h[1].x === h[3].x && h[1].y === h[3].y) {
            return true;
        }

        return false;
    }
    Game_Player.prototype.executeMove = function (direction) {
        // Détection et interruption de boucle d'aller-retour au clic (destination inaccessible)
        if (typeof $gameTemp !== "undefined" && $gameTemp && $gameTemp.isDestinationValid()) {
            const destX = $gameTemp.destinationX();
            const destY = $gameTemp.destinationY();
            this.recordTouchMove(direction);

            if (this.isTouchMoveOscillating()) {
                $gameTemp.clearDestination();
                this.clearTouchMoveHistory();
                const faceDir = this.directionToPosition(destX, destY);
                if (faceDir > 0) {
                    this.setDirection(faceDir);
                }
                return;
            }
        } else {
            this.clearTouchMoveHistory();
        }

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
    }
    Game_Player.prototype.distancePerFrame = function () {
        // Normalisation de la vitesse en diagonale (1/sqrt(2) ≈ 0.7071)
        let dist = _Game_Player_distancePerFrame.call(this);
        if (this.isMoving() && this._realX !== this._x && this._realY !== this._y) {
            dist *= 0.7071;
        }
        return dist;
    }
    Game_Player.prototype.canMove = function () {
        if (this._pose && this._poseOptions && this._poseOptions.canMove === false) {
            return false;
        }
        if (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.isOverloaded === "function" && $gameParty.isOverloaded()) {
            return false;
        }
        // Blocage du déplacement pendant l'attaque, les actions ou si KO
        if (this.isAttacking() || this.isActing()) {
            return false;
        }
        if (this._pose) {
            if (this._poseOptions && this._poseOptions.canMove === false) {
                return false;
            }
        } else if (this._action && this._action !== "walk") {
            return false;
        }
        const actor = (typeof this.actor === "function" ? this.actor() : null) ||
            (typeof this.hero === "function" ? this.hero() : null) ||
            (typeof $gameParty !== "undefined" && $gameParty ? $gameParty.leader() : null);
        if (actor && typeof actor.isDead === "function" && actor.isDead()) {
            return false;
        }
        if (SceneManager._scene._currentSubScene) return false;
        return _Game_Player_canMove.call(this);
    }
    Game_Player.prototype.findNearestFollower = function () {
        /**
     * Recherche le suiveur visible le plus proche du joueur.
     * @returns {Game_Follower|null}
     */
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
    }
    Game_Player.prototype.interactWithFollower = function (follower) {
        /**
     * Déclenche l'interaction avec un suiveur (face-à-face et fenêtre de choix).
     * @param {Game_Follower} follower 
     * @returns {boolean}
     */
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
    }
    Game_Player.prototype.commandFollowerStay = function (follower) {
        /**
    * Commande pour demander à un suiveur de rester :
    * - Si un événement avec <actor: ID> existe sur la carte, il est téléporté à sa place
    *   avec sa direction (axes x/y) et le membre quitte l'équipe.
    * - Sinon, affiche le message "Je ne peux pas rester ici".
    * @param {Game_Follower} follower 
    */
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
    }
    Game_Player.prototype.triggerTouchAction = function () {
        // Déclenchement d'action au toucher/clic avec prise en compte des événements adjacents en 8 directions
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
    }
    Game_Player.prototype.triggerButtonAction = function () {
        // Déclenchement d'interaction via touche OK face à un suiveur
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
    }
    Game_Player.prototype.isAiming = function () {
        // Mode visée (clic droit maintenu) & orientation vers le curseur
        return Boolean(TouchInput && TouchInput.isRightPressed && TouchInput.isRightPressed());
    }
    Game_Player.prototype.isReloading = function () {
        return Boolean(this._isReloading);
    }
    Game_Player.prototype.startReload = function () {
        if ($gameMap.isSafeZone()) {
            DEBUGTOOL.log("🕊️ Rechargement impossible en zone sécurisée", "gunfight");
            return;
        }
        const actor = this.actor ? this.actor() : $gameParty.leader();
        if (!actor || !actor.combat) return;
        const combat = actor.combat;
        const weapon = combat.gunfightWeapon();
        const stats = combat.gunfightStats();

        if (!stats.reload) {
            DEBUGTOOL.log(`ℹ️ L'arme "${stats.name}" n'utilise pas de système de recharge.`, "gunfight");
            return;
        }

        const loaded = combat.getLoadedAmmo(weapon);
        if (loaded >= stats.ammoCap) {
            DEBUGTOOL.log(`ℹ️ Chargeur déjà plein (${loaded}/${stats.ammoCap})`, "gunfight");
            return;
        }

        const reserve = combat.getReserveAmmo(weapon);
        if (stats.ammoId > 0 && reserve <= 0) {
            DEBUGTOOL.log(`❌ Recharge impossible : aucune munition en réserve dans l'inventaire (item ID ${stats.ammoId})`, "gunfight");
            GunfightManager.playSe(stats.emptySe);
            return;
        }

        DEBUGTOOL.log(`🔄 Début de la recharge - Mode: ${stats.reloadMode}, Actuel: ${loaded}/${stats.ammoCap}, Réserve: ${reserve}`, "gunfight");
        this._isReloading = true;
        this._reloadTimer = 0;
        this._reloadMode = stats.reloadMode;
    }
    Game_Player.prototype.interruptReload = function () {
        if (this._isReloading) {
            DEBUGTOOL.log("⚠️ Rechargement interrompu !", "gunfight");
            this._isReloading = false;
            this._reloadTimer = 0;
        }
    }
    Game_Player.prototype.updateReload = function () {
        if (!this._isReloading) return;
        const actor = this.actor ? this.actor() : $gameParty.leader();
        if (!actor || !actor.combat) {
            this._isReloading = false;
            return;
        }
        const combat = actor.combat;
        const weapon = combat.gunfightWeapon();
        const stats = combat.gunfightStats();

        if (this._reloadMode === "1by1") {
            const rHeld = Input.isPressed("reload");
            if (rHeld) {
                this._reloadTimer++;
                if (this._reloadTimer >= stats.rechargeTime) {
                    if (stats.ammoId > 0 && typeof $gameParty !== "undefined") {
                        $gameParty.loseItem($dataItems[stats.ammoId], 1);
                    }
                    const cur = combat.getLoadedAmmo(weapon);
                    const next = cur + 1;
                    combat.setLoadedAmmo(weapon, next);
                    GunfightManager.playSe(stats.reloadSe);
                    this._reloadTimer = 0;
                    DEBUGTOOL.log(`➕ 1 balle chargée (${next}/${stats.ammoCap}), réserve restante: ${combat.getReserveAmmo(weapon)}`, "gunfight");

                    if (next >= stats.ammoCap || combat.getReserveAmmo(weapon) <= 0) {
                        DEBUGTOOL.log(`✅ Recharge 1by1 terminée (Chargeur plein ou réserve épuisée)`, "gunfight");
                        this._isReloading = false;
                    }
                }
            } else {
                DEBUGTOOL.log(`⏹️ Touche R relâchée : arrêt de la recharge 1by1. Chargeur conservé à ${combat.getLoadedAmmo(weapon)}/${stats.ammoCap}`, "gunfight");
                this._isReloading = false;
                this._reloadTimer = 0;
            }
        } else {
            this._reloadTimer++;
            if (this._reloadTimer >= stats.rechargeTime) {
                if (stats.ammoId > 0 && typeof $gameParty !== "undefined") {
                    $gameParty.loseItem($dataItems[stats.ammoId], 1);
                }
                combat.setLoadedAmmo(weapon, stats.ammoCap);
                GunfightManager.playSe(stats.reloadSe);
                DEBUGTOOL.log(`✅ Chargeur plein complet rechargé (${stats.ammoCap}/${stats.ammoCap})`, "gunfight");
                this._isReloading = false;
                this._reloadTimer = 0;
            }
        }
    }
    Game_Player.prototype.isDashing = function () {
        if (this._pose && this._poseOptions && this._poseOptions.allowDash === false) {
            return false;
        }
        if (this.isReloading()) return false;
        if (this.isAiming && this.isAiming()) {
            return false;
        }
        return _Game_Player_isDashing ? _Game_Player_isDashing.call(this) : false;
    }
    Game_Player.prototype.hasStepAnime = function () {
        if (this.isReloading()) return true;
        return _Game_Player_hasStepAnime ? _Game_Player_hasStepAnime.call(this) : (this._stepAnime || false);
    }
    Game_Player.prototype.action = function () {
        if (this.isActing()) {
            return _Game_Player_action ? _Game_Player_action.call(this) : (this._action || "walk");
        }
        if (this._pose) {
            return this._pose;
        }
        if ($gameMap.isSafeZone()) {
            const isDashing = this.isDashing();
            const isMoving = this.isMoving();
            return (isDashing && isMoving) ? "run" : "walk";
        }

        const actor = this.actor ? this.actor() : $gameParty.leader();
        const stats = (actor && actor.combat) ? actor.combat.gunfightStats() : null;

        if (this.isReloading()) {
            const actionName = (stats && (stats.reloadAction || stats.specialAnim)) ? (stats.reloadAction || stats.specialAnim) : "";
            if (this.isMoving()) {
                return actionName ? `walkreload_${actionName}` : "walkreload";
            }
            return actionName ? `reload_${actionName}` : "reload";
        }

        if (this.isBurstShooting && this.isBurstShooting()) {
            if (this._lastShootAction) {
                return this._lastShootAction;
            }
            if (stats && stats.specialAnim) {
                return `shot_${stats.specialAnim}`;
            }
            return "shot";
        }

        if (this.isAiming && this.isAiming()) {
            if (stats && stats.specialAnim) {
                return `guard_${stats.specialAnim}`;
            }
            return "guard";
        }

        if (stats && stats.specialAnim) {
            const isDashing = this.isDashing();
            const isMoving = this.isMoving();
            if (isDashing && isMoving) {
                return `run_${stats.specialAnim}`;
            }
            return `walk_${stats.specialAnim}`;
        }

        return _Game_Player_action ? _Game_Player_action.call(this) : (this.isDashing() ? "run" : "walk");
    }
    Game_Player.prototype.aimDirection = function () {
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
    }
    Game_Player.prototype.angleTo8Direction = function (angle) {
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
    }
    Game_Player.prototype.performAttack = function () {
        if ($gameMap.isSafeZone()) {
            DEBUGTOOL.log("🕊️ Attaque impossible en zone sécurisée (armes rengainées)", "gunfight");
            return false;
        }
        const actor = this.actor ? this.actor() : $gameParty.leader();
        const stats = (actor && actor.combat) ? actor.combat.gunfightStats() : null;

        if (stats && stats.isRanged) {
            DEBUGTOOL.log(`🎯 performAttack (coup par coup) délégué au tir à distance : "${stats.name}"`, "gunfight");
            return this.performGunfightShoot();
        }

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
    }
    Game_Player.prototype.performGunfightShoot = function () {
        if ($gameMap.isSafeZone()) {
            DEBUGTOOL.log("🕊️ Tir impossible en zone sécurisée (armes rengainées)", "gunfight");
            return false;
        }
        const actor = this.actor ? this.actor() : $gameParty.leader();
        if (!actor || !actor.combat) {
            DEBUGTOOL.log("⚠️ Aucun acteur ou composant combat actif trouvé pour effectuer le tir", "gunfight");
            return false;
        }
        const combat = actor.combat;
        const weapon = combat.gunfightWeapon();
        const stats = combat.gunfightStats();

        if (!stats.isRanged) {
            return this.performAttack();
        }

        // Vérifications d'interdiction
        if (this._shootCooldown > 0) {
            DEBUGTOOL.log(`⏳ Tir en cooldown (${this._shootCooldown} frames restantes)`, "gunfight");
            return false;
        }
        if (this.isReloading()) {
            DEBUGTOOL.log("⚠️ Tir impossible : rechargement en cours", "gunfight");
            return false;
        }
        if (stats.heavy && this.isMoving()) {
            DEBUGTOOL.log("⚠️ Tir impossible : arme lourde en mouvement", "gunfight");
            return false;
        }

        // Arrêt immédiat de la destination
        if (typeof $gameTemp !== "undefined" && $gameTemp.clearDestination) {
            $gameTemp.clearDestination();
        }

        // Vérification des munitions
        if (stats.reload) {
            const loaded = combat.getLoadedAmmo(weapon);
            if (loaded <= 0) {
                if (typeof $gameTemp !== "undefined" && $gameTemp.clearDestination) {
                    $gameTemp.clearDestination();
                }
                this._lastShootAction = null;
                DEBUGTOOL.log(`⚠️ Tir à sec ! Chargeur vide (0/${stats.ammoCap})`, "gunfight");
                GunfightManager.playSe(stats.outOfAmmo);
                if (typeof ConfigManager !== "undefined" && ConfigManager.autoReload) {
                    DEBUGTOOL.log("💡 Option B (Recharge auto) : déclenchement automatique", "gunfight");
                    this.startReload();
                }
                return false;
            }
            combat.consumeLoadedAmmo(weapon, 1);
            DEBUGTOOL.log(`💥 Pan ! Balle consommée. Reste ${combat.getLoadedAmmo(weapon)}/${stats.ammoCap}`, "gunfight");
        } else {
            DEBUGTOOL.log(`💥 Pan ! Tir sans munition requise (${stats.name})`, "gunfight");
        }

        // Réinitialisation du délai entre chaque tir
        this._shootCooldown = stats.rateOfFire;

        // Bruitage de détonation
        GunfightManager.playSe(stats.shootSe);

        // Orientation vers la cible
        const aimDir = this.aimDirection ? this.aimDirection() : this.direction();
        this.setDirection(aimDir);

        // Déclenchement de l'action d'animation d'attaque
        this.playAction({
            skillId: stats.skillId,
            direction: aimDir,
            skipMelee: true
        });
        this._lastShootAction = this._action;

        if (typeof this.adjustCenterScroll === "function") {
            this.adjustCenterScroll();
        }

        // Création et projection de la balle / projectile
        if (window.$fightManager && typeof window.$fightManager.spawnProjectile === "function") {
            window.$fightManager.spawnProjectile({
                attacker: this,
                x: this.x,
                y: this.y,
                realX: this._realX !== undefined ? this._realX : this.x,
                realY: this._realY !== undefined ? this._realY : this.y,
                direction: aimDir,
                range: stats.range,
                speed: stats.projectileSpeed,
                image: stats.projectileImg,
                skillId: stats.skillId
            });
            DEBUGTOOL.log(`🚀 Projectile propulsé en direction ${aimDir} (vitesse: ${stats.projectileSpeed}px/f, portée: ${stats.range} cases)`, "gunfight");
        }

        return true;
    }
    Game_Player.prototype.isBurstShooting = function () {
        if (!this.isAiming || !this.isAiming()) return false;
        if (!TouchInput || !TouchInput.isPressed || !TouchInput.isPressed()) return false;
        const actor = this.actor ? this.actor() : $gameParty.leader();
        if (!actor || !actor.combat) return false;
        const combat = actor.combat;
        const stats = combat.gunfightStats();
        if (!stats || !stats.isRanged || !stats.burst) return false;
        if (this.isReloading && this.isReloading()) return false;
        if (stats.reload) {
            const weapon = combat.gunfightWeapon();
            const loaded = combat.getLoadedAmmo(weapon);
            if (loaded <= 0) return false;
        }
        return true;
    }
    Game_Player.prototype.adjustCenterScroll = function () {
        if (typeof $gameMap === "undefined" || !$gameMap) return;
        if (typeof $gameMap.isScrolling === "function" && $gameMap.isScrolling()) return;

        const cx = this.centerX();
        const cy = this.centerY();
        const curX = this.scrolledX();
        const curY = this.scrolledY();

        const diffX = curX - cx;
        const diffY = curY - cy;

        if (Math.abs(diffX) > 0.005) {
            if (diffX > 0) {
                const maxDisplayX = $gameMap.isLoopHorizontal() ? Infinity : Math.max(0, $gameMap.width() - $gameMap.screenTileX());
                const canScroll = $gameMap.isLoopHorizontal() ? diffX : Math.max(0, maxDisplayX - $gameMap._displayX);
                const scrollAmt = Math.min(diffX, canScroll);
                if (scrollAmt > 0.001) {
                    const step = (this.isMoving && this.isMoving()) ? scrollAmt : Math.min(scrollAmt, Math.max(0.08, scrollAmt * 0.35));
                    $gameMap.scrollRight(step);
                }
            } else {
                const canScroll = $gameMap.isLoopHorizontal() ? -diffX : Math.max(0, $gameMap._displayX);
                const scrollAmt = Math.min(-diffX, canScroll);
                if (scrollAmt > 0.001) {
                    const step = (this.isMoving && this.isMoving()) ? scrollAmt : Math.min(scrollAmt, Math.max(0.08, scrollAmt * 0.35));
                    $gameMap.scrollLeft(step);
                }
            }
        }

        if (Math.abs(diffY) > 0.005) {
            if (diffY > 0) {
                const maxDisplayY = $gameMap.isLoopVertical() ? Infinity : Math.max(0, $gameMap.height() - $gameMap.screenTileY());
                const canScroll = $gameMap.isLoopVertical() ? diffY : Math.max(0, maxDisplayY - $gameMap._displayY);
                const scrollAmt = Math.min(diffY, canScroll);
                if (scrollAmt > 0.001) {
                    const step = (this.isMoving && this.isMoving()) ? scrollAmt : Math.min(scrollAmt, Math.max(0.08, scrollAmt * 0.35));
                    $gameMap.scrollDown(step);
                }
            } else {
                const canScroll = $gameMap.isLoopVertical() ? -diffY : Math.max(0, $gameMap._displayY);
                const scrollAmt = Math.min(-diffY, canScroll);
                if (scrollAmt > 0.001) {
                    const step = (this.isMoving && this.isMoving()) ? scrollAmt : Math.min(scrollAmt, Math.max(0.08, scrollAmt * 0.35));
                    $gameMap.scrollUp(step);
                }
            }
        }
    }
    Game_Player.prototype.updateScroll = function (lastScrolledX, lastScrolledY) {
        if (_Game_Player_updateScroll) {
            _Game_Player_updateScroll.call(this, lastScrolledX, lastScrolledY);
        }
        this.adjustCenterScroll();
    }
    Game_Player.prototype.update = function (sceneActive) {
        if (this._shootCooldown > 0) {
            this._shootCooldown--;
        }

        if (sceneActive) {
            if (Input.isTriggered && Input.isTriggered("reload")) {
                if (!this.isReloading()) {
                    this.startReload();
                }
            }
            if (this.isReloading()) {
                this.updateReload();
            }
            if (this.isAiming && this.isAiming() && (this.canAttack() || (this.isBurstShooting && this.isBurstShooting()))) {
                const actor = this.actor ? this.actor() : $gameParty.leader();
                const stats = (actor && actor.combat) ? actor.combat.gunfightStats() : null;

                if (stats && stats.isRanged && stats.burst) {
                    if (TouchInput && TouchInput.isPressed && TouchInput.isPressed() && this._shootCooldown <= 0) {
                        this.performGunfightShoot();
                    }
                }
            }
            if (this._lastShootAction && !this.isActing()) {
                if (!this.isBurstShooting || !this.isBurstShooting()) {
                    this._action = "walk";
                    this._lastShootAction = null;
                    this._actionPattern = 0;
                    this._actionTimer = 0;
                    if (typeof this.resetPattern === "function") {
                        this.resetPattern();
                    }
                }
            }
        }

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
        if (this._overloadAlertTimer > 0) {
            this._overloadAlertTimer--;
        }
        if (this._overloadAlertCooldown > 0) {
            this._overloadAlertCooldown--;
        }
        this.adjustCenterScroll();
    }
    Game_Player.prototype.isAimActionTriggered = function () {
        return this.isAiming() && Boolean(TouchInput && TouchInput.isTriggered && TouchInput.isTriggered());
    }
    Game_Player.prototype.onAimAction = function () {
        if (this.canAttack()) {
            this.performAttack();
        }
    }
    Game_Player.prototype.moveByInput = function () {
        const actor = this.actor ? this.actor() : $gameParty.leader();
        const stats = (actor && actor.combat) ? actor.combat.gunfightStats() : null;

        if (stats) {
            if (stats.snipe && this.isAiming && this.isAiming()) {
                return;
            }
            if (this.isReloading() && !stats.reloadMove) {
                return;
            }
        }

        if (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.isOverloaded === "function" && $gameParty.isOverloaded()) {
            if (this.isMoving()) return;
            const dir = (typeof this.getInputDirection === "function") ? this.getInputDirection() : 0;
            if (dir > 0) {
                this.triggerOverloadAlert();
            }
            return;
        }
        if (_Game_Player_moveByInput) {
            _Game_Player_moveByInput.call(this);
        }
    }
    Game_Player.prototype.triggerOverloadAlert = function () {
        if (!this._overloadAlertCooldown || this._overloadAlertCooldown <= 0) {
            this._overloadAlertTimer = 25;
            this._overloadAlertCooldown = 30;
            if (typeof SoundManager !== "undefined" && typeof SoundManager.playBuzzer === "function") {
                SoundManager.playBuzzer();
            }
        }
    }

    // GAME FOLLOWER
    // ========================================================================
    const _Game_Follower_action = Game_Follower.prototype.action;
    const _Game_Follower_moveDiagonally = Game_Follower.prototype.moveDiagonally;
    const _Game_Follower_distancePerFrame = Game_Follower.prototype.distancePerFrame;
    const _Game_Follower_refresh = Game_Follower.prototype.refresh;

    Game_Follower.prototype.action = function () {
        if (this.isActing && this.isActing()) {
            return _Game_Follower_action ? _Game_Follower_action.call(this) : (this._action || "walk");
        }
        if (this._pose) {
            return this._pose;
        }
        if ($gameMap.isSafeZone()) {
            const isDashing = this.isDashing();
            const isMoving = this.isMoving();
            return (isDashing && isMoving) ? "run" : "walk";
        }
        const actor = this.actor ? this.actor() : (this.hero ? this.hero() : null);
        const stats = (actor && actor.combat) ? actor.combat.gunfightStats() : null;
        if (stats && stats.specialAnim) {
            const isDashing = this.isDashing();
            const isMoving = this.isMoving();
            if (isDashing && isMoving) {
                return `run_${stats.specialAnim}`;
            }
            return `walk_${stats.specialAnim}`;
        }
        return _Game_Follower_action ? _Game_Follower_action.call(this) : (this.isDashing() ? "run" : "walk");
    }


    Game_Follower.prototype.hero = function () {
        /**
     * Récupère le Game_Hero associé à ce follower si l'acteur a le flag <Hero>.
     * @returns {Game_Hero|null}
     */
        const actor = this.actor();
        return (actor && actor.isHero && actor.isHero()) ? actor : null;
    }
    Game_Follower.prototype.isHero = function () {
        return Boolean(this.hero());
    }
    Game_Follower.prototype.moveDiagonally = function (horz, vert) {

        // Orientation en 8 directions lors des mouvements en diagonale du follower
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
    }
    Game_Follower.prototype.distancePerFrame = function () {
        // Normalisation de la vitesse en diagonale (1/sqrt(2) ≈ 0.7071)
        let dist = _Game_Follower_distancePerFrame.call(this);
        if (this.isMoving() && this._realX !== this._x && this._realY !== this._y) {
            dist *= 0.7071;
        }
        return dist;
    }
    Game_Follower.prototype.isDashing = function () {
        return typeof $gamePlayer !== "undefined" && $gamePlayer && typeof $gamePlayer.isDashing === "function" ? $gamePlayer.isDashing() : false;
    }
    Game_Follower.prototype.realMoveSpeed = function () {
        if (typeof $gamePlayer !== "undefined" && $gamePlayer && typeof $gamePlayer.realMoveSpeed === "function") {
            return $gamePlayer.realMoveSpeed();
        }
        return typeof this.moveSpeed === "function" ? this.moveSpeed() : (this._moveSpeed || 4);
    }
    Game_Follower.prototype.refresh = function () {
        // Rafraîchissement avec préchargement du composite
        if (_Game_Follower_refresh) {
            _Game_Follower_refresh.call(this);
        }
        const hero = this.hero();
        if (hero && hero.character) {
            hero.character.getCompositeEntry("walk");
            hero.character.getCompositeEntry("run");
            hero.character.getCompositeEntry("atk");
        }
    }

    // GAME EVENT
    // ========================================================================
    const _Game_Event_initMembers = Game_Event.prototype.initMembers;
    const _Game_Event_setupPageSettings = Game_Event.prototype.setupPageSettings;
    const _Game_Event_refresh = Game_Event.prototype.refresh;
    const _Game_Event_isTransparent = Game_Event.prototype.isTransparent;
    const _Game_Event_isThrough = Game_Event.prototype.isThrough;
    const _Game_Event_start = Game_Event.prototype.start;
    const _Game_Event_update = Game_Event.prototype.update;

    Game_Event.prototype.initMembers = function () {
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
    }
    Game_Event.prototype.extractActorNotetag = function () {
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
        this._actorId = 0;
        this._actorVisible = false;
        this._role = "neutral";
        this._enemyId = 0;
        this._isContainer = false;
        this._containerInventoryId = null;
        this._isPersistentContainer = false;
        this._isAutoEraseContainer = false;
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
                    const rawVal = matchContainer[1].trim();
                    const parts = rawVal.split(",").map(s => s.trim());
                    this._containerInventoryId = parts[0];
                    if (parts.length > 1) {
                        if (/persistent/i.test(parts[1])) {
                            this._isPersistentContainer = true;
                        } else if (/auto_erase|erase/i.test(parts[1])) {
                            this._isAutoEraseContainer = true;
                        }
                    }
                }
            }
            if (/<persistent(?:_container|_inventory)?>/i.test(text)) {
                this._isPersistentContainer = true;
            }
            if (/<auto_erase(?:_container)?/i.test(text)) {
                this._isAutoEraseContainer = true;
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
    }
    Game_Event.prototype.role = function () {
        return this._role || "neutral";
    }
    Game_Event.prototype.setRole = function (role) {
        this._role = (role || "neutral").toLowerCase();
    }
    Game_Event.prototype.isHostile = function () {
        return this.role() === "hostile";
    }
    Game_Event.prototype.isAlly = function () {
        return this.role() === "ally";
    }
    Game_Event.prototype.isNeutral = function () {
        return this.role() === "neutral";
    }
    Game_Event.prototype.isCivilian = function () {
        return this.role() === "civilian";
    }
    Game_Event.prototype.enemyId = function () {
        return this._enemyId || 0;
    }
    Game_Event.prototype.battler = function () {
        if (!this._enemyBattler && this._enemyId > 0 && typeof Game_Enemy !== "undefined" && typeof $dataEnemies !== "undefined" && $dataEnemies && $dataEnemies[this._enemyId]) {
            this._enemyBattler = new Game_Enemy(this._enemyId, 0, 0);
        }
        return this._enemyBattler || (this.actor ? this.actor() : null);
    }
    Game_Event.prototype.actorId = function () {
        return this._actorId || 0;
    }
    Game_Event.prototype.actor = function () {
        const id = this.actorId();
        if (id > 0 && typeof $gameActors !== "undefined" && $gameActors) {
            return $gameActors.actor(id);
        }
        return null;
    }
    Game_Event.prototype.hero = function () {
        const actor = this.actor();
        return (actor && actor.isHero && actor.isHero()) ? actor : null;
    }
    Game_Event.prototype.isHero = function () {
        return Boolean(this.hero());
    }
    Game_Event.prototype.isDashing = function () {
        /**
         * Détermine si l'événement court/dash selon sa vitesse configurée (5 = Rapide, 6 = Plus rapide/vite).
         */
        const speed = typeof this.moveSpeed === "function" ? this.moveSpeed() : (this._moveSpeed || 4);
        return speed >= 5;
    }
    Game_Event.prototype.realMoveSpeed = function () {
        return typeof this.moveSpeed === "function" ? this.moveSpeed() : (this._moveSpeed || 4);
    }
    Game_Event.prototype.isActorInParty = function () {
        if (this._actorId > 0 && typeof $gameParty !== "undefined" && $gameParty) {
            return $gameParty.members().some(a => a && a.actorId() === this._actorId);
        }
        return false;
    }
    Game_Event.prototype.isInPartyHidden = function () {
        /**
         * Détermine si l'événement doit être masqué car l'acteur est présent dans l'équipe.
         * @returns {boolean}
         */
        return this._actorId > 0 && !this._actorVisible && this.isActorInParty();
    }
    Game_Event.prototype.setupPageSettings = function () {
        const prevDirection = this._direction;
        if (_Game_Event_setupPageSettings) {
            _Game_Event_setupPageSettings.call(this);
        }
        this.extractActorNotetag();
        this.updateActorAppearance();

        // Préservation de la direction lors de la mort (interrupteur C ou D)
        const page = this.page();
        const isDeathPage = page && page.conditions && page.conditions.selfSwitchValid &&
            (page.conditions.selfSwitchCh === "C" || page.conditions.selfSwitchCh === "D");

        if (isDeathPage) {
            const mapId = (typeof $gameMap !== "undefined" && $gameMap && typeof $gameMap.mapId === "function")
                ? $gameMap.mapId()
                : (this._mapId || 1);
            const evId = (typeof this.eventId === "function") ? this.eventId() : (this._eventId || 0);
            const storedDir = (typeof $gameSystem !== "undefined" && $gameSystem && $gameSystem._eventDeathDirections && mapId && evId)
                ? $gameSystem._eventDeathDirections[`${mapId}_${evId}`]
                : null;
            const targetDir = this._deathDirection || storedDir || prevDirection;
            if (targetDir) {
                this._deathDirection = targetDir;
                if (typeof $gameSystem !== "undefined" && $gameSystem && mapId && evId) {
                    if (!$gameSystem._eventDeathDirections) {
                        $gameSystem._eventDeathDirections = {};
                    }
                    $gameSystem._eventDeathDirections[`${mapId}_${evId}`] = targetDir;
                }
                this._action = "walk";
                this._isActing = false;
                this.setDirectionFix(false);
                this.setDirection(targetDir);
                this._originalDirection = targetDir;
                if (page.directionFix) {
                    this.setDirectionFix(true);
                }
            }
        }
    }
    Game_Event.prototype.refresh = function () {
        if (_Game_Event_refresh) {
            _Game_Event_refresh.call(this);
        }
        if (this._actorId > 0) {
            this.updateActorAppearance();
        }
    }
    Game_Event.prototype.updateActorAppearance = function () {
        /**
         * Met à jour l'apparence visuelle de l'événement avec les données de l'acteur.
         */
        if (this._actorId > 0) {
            const actor = this.actor();
            if (actor) {
                this.setImage(actor.characterName(), actor.characterIndex());
                const hero = this.hero();
                if (hero && hero.character) {
                    hero.character.getCompositeEntry("walk");
                    hero.character.getCompositeEntry("run");
                    hero.character.getCompositeEntry("atk");
                    hero.character.getCompositeEntry("hurt");
                    hero.character.getCompositeEntry("down");
                }
            }
        }
    }
    Game_Event.prototype.isTransparent = function () {
        if (this.isInPartyHidden()) {
            return true;
        }
        return _Game_Event_isTransparent.call(this);
    }
    Game_Event.prototype.isThrough = function () {
        if (this.isInPartyHidden()) {
            return true;
        }
        return _Game_Event_isThrough.call(this);
    }
    Game_Event.prototype.start = function () {
        const list = this.list();
        if (this._isContainer && (!list || list.length <= 1)) {
            const invId = this._containerInventoryId || ("C_" + this.eventId());
            if (typeof $inventories !== "undefined" && $inventories) {
                const isPersist = this._isPersistentContainer || (!this._isAutoEraseContainer);
                $inventories.open(invId, {
                    eventId: this.eventId(),
                    persistent: isPersist
                });
                return;
            }
        }
        if (this.isInPartyHidden()) {
            return;
        }
        _Game_Event_start.call(this);
    }
    Game_Event.prototype.joinPlayerParty = function (onComplete) {
        /**
         * Étape 7 : Ajoute cet acteur à l'équipe du joueur après s'être déplacé
         * jusqu'à la position où le follower doit apparaître.
         * @param {Function} [onComplete] Callback optionnel à l'arrivée
         * @returns {boolean}
         */
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
    }
    Game_Event.prototype.getFollowerJoinPosition = function () {
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
    }
    Game_Event.prototype.updateJoinParty = function () {
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
    }
    Game_Event.prototype.finishJoinParty = function (precedingChar, onComplete) {
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
    }
    Game_Event.prototype.update = function () {
        if (window.$tutoManager && window.$tutoManager.isBusy()) {
            return;
        }
        if (_Game_Event_update) {
            _Game_Event_update.call(this);
        }
        if (this._isJoiningParty) {
            this.updateJoinParty();
        }
    }

    // GAME INTERPRETER
    // ========================================================================
    const _Game_Interpreter_updateWaitMode = Game_Interpreter.prototype.updateWaitMode;
    const _Game_Interpreter_command101 = Game_Interpreter.prototype.command101;

    Game_Interpreter.prototype.command101 = function (params) {
        $gameMessage._speakerEventId = this._eventId;
        $gameMessage._speakerIsPlayer = (this._eventId === 0);
        return _Game_Interpreter_command101.call(this, params);
    };

    Game_Interpreter.prototype.playAction = function (options = {}) {
        /**
         * Raccourci de commande d'événement (Script Call) :
         * this.playAction({ actorId: 2, action: "atk", duration: 4, frames: 4 })
         * ou
         * this.playAction({ action: "atk", duration: 4, frames: 4 })
         * @param {{ actorId?: number, id?: number, action?: string, duration?: number, frames?: number }|string} options 
         * @returns {boolean}
         */
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
    }
    Game_Interpreter.prototype.playTranslateAction = function (dataAction1, dataAction2, direction, options = {}) {
        /**
         * Raccourci pour déclencher une action de translation depuis un appel de script d'événement :
         * this.playTranslateAction("standup_bed", "standup_floor", 6);
         * ou
         * this.playTranslateAction("standup_bed", "standup_floor", 6, { isPlayer: true });
         * @param {string|object} dataAction1
         * @param {string|object} dataAction2
         * @param {number|string} direction
         * @param {object} [options={}]
         * @returns {boolean}
         */
        let opts = options;
        let act1 = dataAction1;
        let act2 = dataAction2;
        let dir = direction;

        if (dataAction1 && typeof dataAction1 === "object" && !dataAction2) {
            opts = dataAction1;
            act1 = opts.action1 || opts.act1;
            act2 = opts.action2 || opts.act2;
            dir = (opts.direction !== undefined) ? opts.direction : opts.dir;
        }

        const actorId = opts.actorId || (opts.id ? Number(opts.id) : 0);
        if (actorId > 0 && typeof window.$heroHub !== "undefined" && window.$heroHub) {
            const target = window.$heroHub.findActorCharacter(actorId);
            if (target && typeof target.playTranslateAction === "function") {
                return target.playTranslateAction(act1, act2, dir, { ...opts, actorId: 0 });
            }
        }

        const char = (opts.target === "player" || opts.isPlayer) ? (window.$gamePlayer || this.character(0)) : (this.character(0) || window.$gamePlayer);
        if (char && typeof char.playTranslateAction === "function") {
            return char.playTranslateAction(act1, act2, dir, opts);
        }
        return false;
    }
    Game_Interpreter.prototype.joinPlayerParty = function (eventId = 0) {
        /**
         * Raccourci pour appeler joinPlayerParty() depuis un appel de script d'événement :
         * this.joinPlayerParty();
         * ou
         * this.joinPlayerParty(eventId);
         * @param {number} [eventId=0] 0 pour l'événement exécutant l'interpréteur
         * @returns {boolean}
         */
        const char = this.character(eventId);
        if (char && typeof char.joinPlayerParty === "function") {
            const started = char.joinPlayerParty();
            if (started) {
                this.setWaitMode("joinParty");
            }
            return started;
        }
        return false;
    }
    Game_Interpreter.prototype.updateWaitMode = function () {
        if (this._waitMode === "joinParty") {
            const char = this.character(0);
            const waiting = char && Boolean(char._isJoiningParty);
            if (!waiting) {
                this._waitMode = "";
            }
            return waiting;
        }
        return _Game_Interpreter_updateWaitMode ? _Game_Interpreter_updateWaitMode.call(this) : false;
    }
    Game_Interpreter.prototype.openInventory = function (inventoryId = null, persistent = null) {
        /**
     * Ouvre l'inventaire spécifié (ou de l'événement courant si conteneur)
     * @param {string} [inventoryId=null]
     */
        if (typeof $inventories !== "undefined" && $inventories) {
            const id = inventoryId || ("C_" + this._eventId);
            let isPersist = persistent;
            if (isPersist === null && this._eventId && typeof $gameMap !== "undefined" && $gameMap) {
                const ev = $gameMap.event(this._eventId);
                if (ev) {
                    isPersist = ev._isPersistentContainer || (!ev._isAutoEraseContainer);
                }
            }
            $inventories.open(id, {
                eventId: this._eventId,
                persistent: isPersist !== null ? Boolean(isPersist) : true
            });
            return true;
        }
        return false;
    }
    Game_Interpreter.prototype.openEnemyLoot = function (enemyId = 1) {
        /**
     * Initialise le butin d'un ennemi et ouvre son inventaire
     * @param {number} [enemyId=1]
     */
        if (typeof $inventories !== "undefined" && $inventories) {
            $inventories.initEnnemyInventory(enemyId);
            $inventories.open("E_" + enemyId, { eventId: this._eventId, persistent: false });
            return true;
        }
        return false;
    }

    // !!! TODO LINK TO GUI MANAGER
    Game_Interpreter.prototype.setHudVisible = function (visible) {
        if (typeof $gameSystem !== "undefined" && $gameSystem) $gameSystem.setHudVisible(visible);
    }
    Game_Interpreter.prototype.toggleHud = function () {
        if (typeof $gameSystem !== "undefined" && $gameSystem) return $gameSystem.toggleHud();
    }
    Game_Interpreter.prototype.showHud = function () { this.setHudVisible(true); };
    Game_Interpreter.prototype.hideHud = function () { this.setHudVisible(false); };
    Game_Interpreter.prototype.setPlayerHudVisible = function (visible) {
        if (typeof $gameSystem !== "undefined" && $gameSystem) $gameSystem.setPlayerHudVisible(visible);
    }
    Game_Interpreter.prototype.togglePlayerHud = function () {
        if (typeof $gameSystem !== "undefined" && $gameSystem) return $gameSystem.togglePlayerHud();
    }
    Game_Interpreter.prototype.showPlayerHud = function () { this.setPlayerHudVisible(true); };
    Game_Interpreter.prototype.hidePlayerHud = function () { this.setPlayerHudVisible(false); };

    Game_Interpreter.prototype.setWeaponHudVisible = function (visible) {
        if (typeof $gameSystem !== "undefined" && $gameSystem) $gameSystem.setWeaponHudVisible(visible);
    }
    Game_Interpreter.prototype.toggleWeaponHud = function () {
        if (typeof $gameSystem !== "undefined" && $gameSystem) return $gameSystem.toggleWeaponHud();
    }
    Game_Interpreter.prototype.showWeaponHud = function () { this.setWeaponHudVisible(true); };
    Game_Interpreter.prototype.hideWeaponHud = function () { this.setWeaponHudVisible(false); };

    Game_Interpreter.prototype.showTuto = function (tutoId, data = {}) {
        if (typeof data === "string") {
            data = { position: data };
        }
        if (window.$tutoManager && typeof window.$tutoManager.showTuto === "function") {
            return window.$tutoManager.showTuto(tutoId, data);
        }
        return false;
    };

    Game_Interpreter.prototype.showTutos = function (list) {
        if (window.$tutoManager && typeof window.$tutoManager.showTutos === "function") {
            return window.$tutoManager.showTutos(list);
        }
        return 0;
    };

    // GAME PARTY
    // ========================================================================
    const _Game_Party_addActor = Game_Party.prototype.addActor;
    const _Game_Party_hasItem = Game_Party.prototype.hasItem;
    const _Game_Party_consumeItem = Game_Party.prototype.consumeItem;

    Game_Party.prototype.findMemberInventoryWithItem = function (item) {
        if (!item || typeof item !== "object") return null;
        const members = (typeof this.allMembers === "function")
            ? this.allMembers()
            : ((typeof this.members === "function") ? this.members() : []);
        for (const actor of members) {
            if (!actor) continue;
            if (actor.inventory && typeof actor.inventory.numItems === "function") {
                if (actor.inventory.numItems(item) > 0) {
                    return typeof actor.inventory.container === "function"
                        ? (actor.inventory.container() || actor.inventory)
                        : actor.inventory;
                }
            } else if (typeof $inventories !== "undefined" && $inventories && typeof actor.actorId === "function") {
                const inv = $inventories.inventory("A_" + actor.actorId());
                if (inv && typeof inv.numItems === "function" && inv.numItems(item) > 0) {
                    return inv;
                }
            }
        }
        return null;
    };

    Game_Party.prototype.hasItem = function (item, includeEquip) {
        if (!item) return false;
        if (typeof item === "number") {
            if (typeof DEBUGTOOL !== "undefined" && typeof DEBUGTOOL.warn === "function") {
                DEBUGTOOL.warn(
                    `[Game_Party.hasItem] Identifiant numérique (${item}) passé au lieu d'un objet RMMZ ($dataItems[id] / $dataWeapons[id] / $dataArmors[id]).`,
                    "INVENTORY"
                );
            }
            return false;
        }
        if (_Game_Party_hasItem && _Game_Party_hasItem.call(this, item, includeEquip)) {
            return true;
        }
        return Boolean(this.findMemberInventoryWithItem(item));
    };

    Game_Party.prototype.consumeItem = function (item) {
        if (typeof DataManager !== "undefined" && DataManager.isItem(item) && item.consumable) {
            if (this.numItems(item) > 0) {
                if (_Game_Party_consumeItem) {
                    _Game_Party_consumeItem.call(this, item);
                } else {
                    this.loseItem(item, 1);
                }
                return;
            }
            const memberBag = this.findMemberInventoryWithItem(item);
            if (memberBag) {
                if (typeof memberBag.loseItem === "function") {
                    memberBag.loseItem(item, 1);
                } else if (typeof memberBag.removeItem === "function") {
                    memberBag.removeItem(item, 1);
                }
            }
        }
    };

    Game_Party.prototype.addActor = function (actorId) {
        const alreadyInParty = Array.isArray(this._actors) && this._actors.includes(actorId);
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
        // Ajout automatique des contacts SubCom mutuels lors de l'arrivée d'un nouveau membre
        if (!alreadyInParty && typeof Game_ScActorSubCom !== "undefined" && typeof $gameActors !== "undefined" && $gameActors) {
            const joinedActor = $gameActors.actor(actorId);
            const members = (typeof this.allMembers === "function") ? this.allMembers() : (typeof this.members === "function" ? this.members() : []);
            if (joinedActor && Array.isArray(members)) {
                for (const member of members) {
                    if (!member || typeof member.actorId !== "function" || member.actorId() === actorId) continue;
                    if (member.subCom && typeof member.subCom.addContact === "function") {
                        member.subCom.addContact(actorId);
                    }
                    if (joinedActor.subCom && typeof joinedActor.subCom.addContact === "function") {
                        joinedActor.subCom.addContact(member.actorId());
                    }
                }
            }
        }
    }
    Game_Party.prototype.maxWeight = function () {
        let max = 0;
        const members = (typeof this.members === "function") ? this.members() : [];
        for (const actor of members) {
            if (actor && actor.inventory) {
                max += actor.inventory.weightCapacity();
            }
        }
        return Math.max(10, max);
    }
    Game_Party.prototype.stockWeight = function () {
        let total = 0;
        const items = (typeof this.allItems === "function") ? this.allItems() : [];
        for (const item of items) {
            if (item) {
                const qty = (typeof this.numItems === "function") ? this.numItems(item) : 0;
                const w = (typeof DataManager.itemStockWeight === "function")
                    ? DataManager.itemStockWeight(item)
                    : DataManager.itemWeight(item);
                total += w * qty;
            }
        }
        return Math.round(total * 100) / 100;
    };

    Game_Party.prototype.wornWeight = function () {
        let total = 0;
        const members = (typeof this.members === "function") ? this.members() : [];
        for (const actor of members) {
            if (actor) {
                if (actor.inventory && typeof actor.inventory.wornResidualWeight === "function") {
                    total += actor.inventory.wornResidualWeight();
                } else if (actor.equipment && typeof actor.equipment.wornResidualWeight === "function") {
                    total += actor.equipment.wornResidualWeight();
                } else if (typeof actor.equips === "function" && typeof DataManager.itemWornWeight === "function") {
                    for (const eq of actor.equips()) {
                        if (eq) total += DataManager.itemWornWeight(eq);
                    }
                }
            }
        }
        return Math.round(total * 100) / 100;
    };

    Game_Party.prototype.totalWeight = function () {
        return Math.round((this.stockWeight() + this.wornWeight()) * 100) / 100;
    };
    Game_Party.prototype.isOverloaded = function () {
        return this.totalWeight() > this.maxWeight();
    }
    Game_Party.prototype.canAcceptItem = function (item, amount = 1) {
        if (!item) return false;
        const itemW = DataManager.itemWeight(item) * amount;
        return (this.totalWeight() + itemW) <= this.maxWeight();
    }

    // GAME SYSTEM
    // ========================================================================
    const _Game_System_initialize = Game_System.prototype.initialize;

    Object.defineProperty(Game_System.prototype, "locale", {
        get: function () {
            if (typeof ConfigManager !== "undefined" && ConfigManager.locale) {
                return String(ConfigManager.locale).toUpperCase();
            }
            return this._locale || "FR";
        },
        set: function (val) {
            const upper = String(val || "FR").toUpperCase();
            this._locale = upper;
            if (typeof ConfigManager !== "undefined") {
                ConfigManager.locale = upper;
                if (typeof ConfigManager.save === "function") {
                    ConfigManager.save();
                }
            }
        },
        configurable: true
    });
    Game_System.prototype.initialize = function () {
        if (_Game_System_initialize) _Game_System_initialize.call(this);
        const p = (typeof PluginManager !== "undefined" && typeof PluginManager.parameters === "function")
            ? PluginManager.parameters("SC4_rmmz_scenes_Patches") : {};
        const defHud = (p && p.defaultHudVisible !== undefined) ? p.defaultHudVisible !== "false" : true;
        const defPlayer = (p && p.defaultPlayerHud !== undefined) ? p.defaultPlayerHud !== "false" : defHud;
        const defWeapon = (p && p.defaultWeaponHud !== undefined) ? p.defaultWeaponHud !== "false" : defHud;
        this._playerHudVisible = defPlayer;
        this._weaponHudVisible = defWeapon;
    }
    Game_System.prototype.isPlayerHudVisible = function () {
        return this._playerHudVisible !== undefined ? Boolean(this._playerHudVisible) : true;
    }
    Game_System.prototype.setPlayerHudVisible = function (visible) {
        this._playerHudVisible = Boolean(visible);
    }
    Game_System.prototype.togglePlayerHud = function () {
        this.setPlayerHudVisible(!this.isPlayerHudVisible());
        return this.isPlayerHudVisible();
    }
    Game_System.prototype.isWeaponHudVisible = function () {
        return this._weaponHudVisible !== undefined ? Boolean(this._weaponHudVisible) : true;
    }
    Game_System.prototype.setWeaponHudVisible = function (visible) {
        this._weaponHudVisible = Boolean(visible);
    }
    Game_System.prototype.toggleWeaponHud = function () {
        this.setWeaponHudVisible(!this.isWeaponHudVisible());
        return this.isWeaponHudVisible();
    }
    Game_System.prototype.isHudVisible = function () {
        return this.isPlayerHudVisible() || this.isWeaponHudVisible();
    }
    Game_System.prototype.setHudVisible = function (visible) {
        this.setPlayerHudVisible(visible);
        this.setWeaponHudVisible(visible);
    }
    Game_System.prototype.toggleHud = function () {
        const newState = !this.isHudVisible();
        this.setHudVisible(newState);
        return newState;
    }
    Game_System.prototype.isBubbleMessageMode = function () {
        return Boolean(this._bubbleMessageMode);
    }
    Game_System.prototype.setBubbleMessageMode = function (enabled) {
        this._bubbleMessageMode = Boolean(enabled);
    }
    Game_System.prototype.getBubbleConfig = function () {
        this._bubbleConfig = this._bubbleConfig || {};
        return this._bubbleConfig;
    }
    Game_System.prototype.setBubbleConfig = function (cfg) {
        this._bubbleConfig = Object.assign(this.getBubbleConfig(), cfg || {});
        if (cfg && cfg.enabled !== false) {
            this._bubbleMessageMode = true;
        }
        if (cfg && cfg.fontFace && typeof Window_BubbleMsg !== "undefined") {
            Window_BubbleMsg.resolveFontFace(cfg.fontFace);
        }
        if (cfg && cfg.windowskin) {
            const skinName = cfg.windowskin.replace(/\.png$/i, "");
            ImageManager.loadSystem(skinName);
        }
        if (cfg && cfg.target !== undefined) {
            this.bubbleTarget = cfg.target;
        }
    }
    Game_System.prototype.isLandingAuthorized = function (id) {
        if (!this._landingAuthorizations) {
            this._landingAuthorizations = {};
        }
        if (this._landingAuthorizations[id] !== undefined) {
            return Boolean(this._landingAuthorizations[id]);
        }
        if (typeof window !== "undefined" && window.$gamePOIs && typeof window.$gamePOIs.get === "function") {
            const poi = window.$gamePOIs.get(id);
            if (poi && poi.landingAuthorized !== undefined) {
                return Boolean(poi.landingAuthorized);
            }
        }
        if (typeof window !== "undefined" && window.$gameGalaxy && typeof window.$gameGalaxy.getPlanet === "function") {
            const planet = window.$gameGalaxy.getPlanet(id);
            if (planet && planet.landingAuthorized !== undefined) {
                return Boolean(planet.landingAuthorized);
            }
        }
        return false;
    }
    Game_System.prototype.setLandingAuthorized = function (id, authorized = true) {
        if (!this._landingAuthorizations) {
            this._landingAuthorizations = {};
        }
        this._landingAuthorizations[id] = Boolean(authorized);
    };

    Game_System.prototype.isPoiLocated = function(poiId) {
        if (!poiId) return true;
        this._poiLocatedState = this._poiLocatedState || {};
        if (this._poiLocatedState[poiId] !== undefined) {
            return Boolean(this._poiLocatedState[poiId]);
        }
        const allPois = window.$dataPois || [];
        const p = allPois.find(item => item && item.id === poiId);
        if (p && p.located !== undefined) {
            return Boolean(p.located);
        }
        return true;
    };

    Game_System.prototype.setPoiLocated = function(poiId, status = true) {
        if (!poiId) return;
        this._poiLocatedState = this._poiLocatedState || {};
        this._poiLocatedState[poiId] = Boolean(status);
        if (window.$questManager && typeof window.$questManager.update === "function") {
            window.$questManager.update();
        }
    };

    Game_System.prototype.isLandingAllowed = function(planetId) {
        const pl = window.$gameGalaxy ? window.$gameGalaxy.getPlanet(planetId) : null;
        return pl ? pl.isLandingAllowed() : false;
    };

    Game_System.prototype.addSpaceTravelLog = function(style, text) {
        this._spaceTravelLogHistory = this._spaceTravelLogHistory || [];
        this._spaceTravelLogHistory.push({ style: style || "info", text });
        if (this._spaceTravelLogHistory.length > 50) {
            this._spaceTravelLogHistory.shift();
        }
    };

    Game_System.prototype.getSpaceTravelLogs = function() {
        this._spaceTravelLogHistory = this._spaceTravelLogHistory || [];
        return this._spaceTravelLogHistory;
    };

    Game_System.prototype.isRingMenuEnabled = function () {
        // Menu circulaire désactivé pour le moment sur demande utilisateur
        return false;
    };

    Game_System.prototype.setRingMenuEnabled = function (enabled) {
        this._ringMenuEnabled = Boolean(enabled);
    };

    Game_System.prototype.getRingCommandConfig = function () {
        this._ringCommandConfig = this._ringCommandConfig || {};
        return this._ringCommandConfig;
    };

    Game_System.prototype.setRingCommandConfig = function (cfg) {
        this._ringCommandConfig = Object.assign(this.getRingCommandConfig(), cfg || {});
        if (cfg && cfg.fontFace && typeof Window_RingCommand !== "undefined" && typeof Window_RingCommand.resolveFontFace === "function") {
            Window_RingCommand.resolveFontFace(cfg.fontFace);
        }
        if (cfg && cfg.windowskin && typeof ImageManager !== "undefined") {
            const skinName = cfg.windowskin.replace(/\.png$/i, "");
            ImageManager.loadSystem(skinName);
        }
    };

})();


