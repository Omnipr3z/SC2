//=============================================================================
// RPG Maker MZ - IAManager.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Classe parente de gestion de l'Intelligence Artificielle (FSM, Leash, Cible).
 * @author SimCraft 4
 *
 * @help IAManager.js
 *
 * Classe de base modulaire pour l'IA des ennemis et entités de carte.
 * Définit la machine à états finis (FSM) commune :
 *  - MODE_NEUTRE ("neutral")   : suit sa route autonome à AI_BASE_SPEED.
 *  - MODE_ENGAGE ("engage")    : poursuit la cible en pathfinding 8-dir à AI_ENGAGE_SPEED.
 *  - MODE_RECHERCHE ("search") : recherche temporisée pendant AI_SEARCH_TIME.
 *  - MODE_RETOUR_BASE ("return"): repli vers AI_BASE_POSITION en cas de leash ou d'abandon.
 *
 * Spécialisations :
 *  - IA_Melee (IA_melee.js) : Combat rapproché au corps-à-corps.
 *  - IA_Range (IA_range.js) : Combat à distance / armes à feu.
 */

const AI_STATE_NEUTRAL = "neutral";
const AI_STATE_ENGAGE = "engage";
const AI_STATE_SEARCH = "search";
const AI_STATE_RETURN = "return";
const AI_STATE_HURTED = "hurted";

class IAManager {
    /**
     * @param {Game_Event} event - L'événement contrôlé par cette instance d'IA
     */
    constructor(event) {
        this._event = event;
        this.initMembers();
        this.extractNotetags();
    }

    event() {
        return this._event;
    }

    initMembers() {
        this._mode = null;
        this._state = AI_STATE_NEUTRAL;
        this._previousState = AI_STATE_NEUTRAL;
        this._target = null;
        this._baseSpeed = 2;
        this._engageSpeed = 4;
        this._attackRange = 1;
        this._engageRange = 4;
        this._searchRange = 10;
        this._searchTime = 60;
        this._attackFrequency = 60;
        this._attackTimer = 0;       // Compteur qui avance vers attackFrequency
        this._searchTimer = 0;
        this._basePosition = null;
        this._zoneEngagementRange = null;
        this._lastKnownX = null;
        this._lastKnownY = null;
    }

    extractNotetags() {
        const ev = (this._event && typeof this._event.event === "function") ? this._event.event() : (this._event || null);
        this._basePosition = {
            x: ev ? ev.x : (this._event ? this._event.x : 0),
            y: ev ? ev.y : (this._event ? this._event.y : 0)
        };

        const parseText = (text) => {
            if (!text) return;
            const matchMode = text.match(/<AI_MODE:\s*\[?([a-zA-Z0-9_-]+)\]?>/i);
            if (matchMode) this._mode = matchMode[1].trim().toLowerCase();

            const matchBaseSpeed = text.match(/<AI_BASE_SPEED:\s*\[?(\d+(?:\.\d+)?)\]?>/i);
            if (matchBaseSpeed) this._baseSpeed = Number(matchBaseSpeed[1]);

            const matchAtkRange = text.match(/<AI_ATTACK_RANGE:\s*\[?(\d+)\]?>/i);
            if (matchAtkRange) this._attackRange = Number(matchAtkRange[1]);

            const matchEngageRange = text.match(/<AI_ENGAGE_RANGE:\s*\[?(\d+)\]?>/i);
            if (matchEngageRange) this._engageRange = Number(matchEngageRange[1]);

            const matchEngageSpeed = text.match(/<AI_ENGAGE_SPEED:\s*\[?(\d+(?:\.\d+)?)\]?>/i);
            if (matchEngageSpeed) this._engageSpeed = Number(matchEngageSpeed[1]);

            const matchSearchRange = text.match(/<AI_SEARCH_RANGE:\s*\[?(\d+)\]?>/i);
            if (matchSearchRange) this._searchRange = Number(matchSearchRange[1]);

            const matchSearchTime = text.match(/<AI_(?:SEARCH|FORGET)_TIME:\s*\[?(\d+)\]?>/i);
            if (matchSearchTime) this._searchTime = Number(matchSearchTime[1]);

            const matchAtkFreq = text.match(/<AI_ATTACK_FREQUENCY:\s*\[?(\d+)\]?>/i);
            if (matchAtkFreq) this._attackFrequency = Number(matchAtkFreq[1]);

            const matchBasePos = text.match(/<AI_BASE_POSITION:\s*\[?(\d+)\]?\s*,\s*\[?(\d+)\]?>/i);
            if (matchBasePos) {
                this._basePosition = { x: Number(matchBasePos[1]), y: Number(matchBasePos[2]) };
            }

            const matchLeash = text.match(/<AI_ZONE_ENGA(?:E|GE)?MENT_RANGE:\s*\[?(\d+)\]?>/i);
            if (matchLeash) this._zoneEngagementRange = Number(matchLeash[1]);

            const matchSe = text.match(/<se_(engage|search|forget|hurted|death):\s*([a-zA-Z0-9_-]+)(?:,\s*(\d+))?(?:,\s*(\d+))?>/i);
            if (matchSe) {
                const seType = matchSe[1].toLowerCase();
                const seName = matchSe[2].trim();
                const seVol = matchSe[3] !== undefined ? parseInt(matchSe[3], 10) : 90;
                const sePitch = matchSe[4] !== undefined ? parseInt(matchSe[4], 10) : 100;
                this._customSe[seType] = { name: seName, volume: seVol, pitch: sePitch };
            }
        };

        this._customSe = {};

        const enemyId = this._event && typeof this._event.enemyId === "function" ? this._event.enemyId() : (this._event ? this._event._enemyId : 0);
        if (enemyId > 0 && typeof $dataEnemies !== "undefined" && $dataEnemies && $dataEnemies[enemyId]) {
            parseText($dataEnemies[enemyId].note);
        }

        if (ev && ev.note) {
            parseText(ev.note);
        }

        const page = this._event && typeof this._event.page === "function" ? this._event.page() : null;
        if (page && page.list) {
            for (const cmd of page.list) {
                if (cmd.code === 108 || cmd.code === 408) {
                    parseText(cmd.parameters[0]);
                }
            }
        }

        if (this._mode && this._state === AI_STATE_NEUTRAL && this._event && typeof this._event.setMoveSpeed === "function") {
            this._event.setMoveSpeed(this._baseSpeed);
        }
    }

    mode() { return this._mode; }
    state() { return this._state || AI_STATE_NEUTRAL; }
    previousState() { return this._previousState; }
    setState(state) {
        const oldState = this._state;
        if (state === AI_STATE_HURTED && oldState !== AI_STATE_HURTED) {
            this._previousState = oldState;
        }

        this._state = state;

        // Déclenchement automatique des indicateurs visuels, effets et sons au changement d'état :
        const enteringEngage = state === AI_STATE_ENGAGE &&
            (oldState === AI_STATE_NEUTRAL || oldState === AI_STATE_SEARCH || oldState === AI_STATE_RETURN || oldState === null);

        if (enteringEngage) {
            // Ligne 1 : Point d'exclamation
            this.requestIndicator("exclamation");

            // Le personnage fait face au joueur et fait un bond avant d'entamer la poursuite
            const target = this.target();
            if (target && this._event && typeof this._event.turnTowardCharacter === "function") {
                this._event.turnTowardCharacter(target);
            }
            if (this._event && typeof this._event.jump === "function") {
                this._event.jump(0, 0);
            }

            // SE engage (notetag ou défaut Buzzer2, volume 90, pitch 130, pan 0)
            this.playCustomSe("engage", { name: "Buzzer2", volume: 90, pitch: 130, pan: 0 });
        } else if (oldState === AI_STATE_ENGAGE && state === AI_STATE_SEARCH) {
            // Ligne 2 : Point d'interrogation rouge
            this.requestIndicator("question_red");

            // SE search (notetag ou défaut Cancel2, volume 90, pitch 80, pan 0)
            this.playCustomSe("search", { name: "Cancel2", volume: 90, pitch: 80, pan: 0 });
        } else if ((oldState === AI_STATE_SEARCH && (state === AI_STATE_NEUTRAL || state === AI_STATE_RETURN)) ||
                   (oldState === AI_STATE_RETURN && state === AI_STATE_NEUTRAL)) {
            // Ligne 3 : Point d'interrogation jaune lors de l'abandon
            if (oldState === AI_STATE_SEARCH) {
                this.requestIndicator("question_yellow");
            }

            // SE forget (notetag ou défaut Blind, volume 90, pitch 100, pan 0)
            this.playCustomSe("forget", { name: "Blind", volume: 90, pitch: 100, pan: 0 });
        }

        // Vérification automatique de la musique de combat
        if (typeof IAManager !== "undefined" && typeof IAManager.checkBattleBgm === "function") {
            IAManager.checkBattleBgm();
        }

        if (!this._event || typeof this._event.setMoveSpeed !== "function") return;
        switch (state) {
            case AI_STATE_NEUTRAL:
                this._event.setMoveSpeed(this._baseSpeed);
                break;
            case AI_STATE_ENGAGE:
                this._event.setMoveSpeed(this._engageSpeed);
                break;
            case AI_STATE_SEARCH:
                this._event.setMoveSpeed(this._engageSpeed);
                this._searchTimer = this._searchTime;
                break;
            case AI_STATE_RETURN:
                this._event.setMoveSpeed(this._baseSpeed);
                break;
            case AI_STATE_HURTED:
                break;
        }
    }

    playCustomSe(type, defaultSe = null) {
        const se = (this._customSe && this._customSe[type]) || defaultSe;
        if (se && se.name && typeof AudioManager !== "undefined" && typeof AudioManager.playSe === "function") {
            AudioManager.playSe({
                name: se.name,
                volume: se.volume !== undefined ? se.volume : 90,
                pitch: se.pitch !== undefined ? se.pitch : 100,
                pan: 0
            });
        }
    }

    playSurpriseSe() {
        this.playCustomSe("engage", { name: "Buzzer2", volume: 90, pitch: 130, pan: 0 });
    }

    requestIndicator(type) {
        if (this._event && typeof this._event.requestIndicator === "function") {
            this._event.requestIndicator(type);
        }
    }

    target() {
        if (this._target && typeof this._target.x !== "undefined") {
            return this._target;
        }
        if (typeof $gamePlayer !== "undefined" && $gamePlayer) {
            return $gamePlayer;
        }
        return null;
    }

    setTarget(t) { this._target = t; }

    basePosition() { return this._basePosition; }
    attackTimer() { return this._attackTimer; }
    attackFrequency() { return this._attackFrequency; }
    resetAttackTimer() { this._attackTimer = 0; }

    /**
     * Appelé lorsque l'ennemi subit une attaque ("hurt").
     * L'attaque ennemie est interrompue, l'IA passe en Hurted (suspendue) et le compteur est remis à zéro.
     */
    onHurt() {
        if (this._state !== AI_STATE_HURTED) {
            this._previousState = this._state;
        }
        this.setState(AI_STATE_HURTED);
        this.resetAttackTimer();
        this.playCustomSe("hurted");
    }

    /**
     * Reprise de l'IA à la fin de l'animation de hurt.
     */
    onResumeFromHurt() {
        const resumeState = (this._previousState && this._previousState !== AI_STATE_HURTED)
            ? this._previousState
            : AI_STATE_ENGAGE;
        this.setState(resumeState);
    }

    /**
     * Détermine si l'ennemi est prêt et en mesure d'attaquer.
     * @returns {boolean}
     */
    canAttack() {
        if (!this._event) return false;
        if (this._state === AI_STATE_HURTED) return false;
        if (this._event.isActing && this._event.isActing()) return false;
        return this._attackTimer >= this._attackFrequency;
    }

    distance8(x1, y1, x2, y2) {
        const dx = (typeof $gameMap !== "undefined" && $gameMap && typeof $gameMap.deltaX === "function")
            ? Math.abs($gameMap.deltaX(x1, x2))
            : Math.abs(x1 - x2);
        const dy = (typeof $gameMap !== "undefined" && $gameMap && typeof $gameMap.deltaY === "function")
            ? Math.abs($gameMap.deltaY(y1, y2))
            : Math.abs(y1 - y2);
        return Math.max(dx, dy);
    }

    /**
     * Mise à jour de l'IA à chaque frame.
     */
    update() {
        if (!this._event) return;

        // 1. Si l'ennemi est KO, l'IA s'arrête
        const battler = typeof this._event.battler === "function" ? this._event.battler() : null;
        if (battler && typeof battler.isDead === "function" && battler.isDead()) {
            return;
        }

        // 1b. GESTION DU MODE HURTED : IA suspendue pendant l'animation hurt
        if (this._state === AI_STATE_HURTED) {
            if (this._event.isActing && this._event.isActing() && typeof this._event.action === "function" && this._event.action() === "hurt") {
                this.resetAttackTimer();
                return;
            }
            // L'animation hurt est terminée -> reprise de l'état précédent
            this.onResumeFromHurt();
        }

        // 2. OPTIMISATION PERFORMANCE : Ennemis hors écran mis en attente (MODE_NEUTRE)
        if (typeof this._event.isNearTheScreen === "function" && !this._event.isNearTheScreen()) {
            if (this._state !== AI_STATE_NEUTRAL) {
                this.setState(AI_STATE_NEUTRAL);
            }
            return;
        }

        // 3. GESTION DU COMPTEUR D'ATTAQUE :
        // - Si en train de subir une attaque ("hurt") : compteur remis à zéro
        if (this._event.isActing && this._event.isActing() && typeof this._event.action === "function" && this._event.action() === "hurt") {
            this.resetAttackTimer();
            return;
        }

        // - Pendant l'animation d'attaque ("atk") : le compteur ne défile pas
        if (this._event.isActing && this._event.isActing()) {
            return;
        }

        // - Hors action : le compteur avance jusqu'à la fréquence d'attaque
        if (this._attackTimer < this._attackFrequency) {
            this._attackTimer++;
        }

        // Récupération de la cible
        const target = this.target();
        if (!target) return;

        // Cible KO
        const targetBattler = (typeof target.battler === "function" ? target.battler() : null) ||
            (typeof target.actor === "function" ? target.actor() : null) ||
            (typeof $gameParty !== "undefined" && $gameParty ? $gameParty.leader() : null);
        if (targetBattler && typeof targetBattler.isDead === "function" && targetBattler.isDead()) {
            if (this._state !== AI_STATE_NEUTRAL && this._state !== AI_STATE_RETURN) {
                this.setState(this._basePosition ? AI_STATE_RETURN : AI_STATE_NEUTRAL);
            }
            return;
        }

        // Machine à états finis
        switch (this._state) {
            case AI_STATE_NEUTRAL:
                this.updateNeutral(target);
                break;
            case AI_STATE_ENGAGE:
                this.updateEngage(target);
                break;
            case AI_STATE_SEARCH:
                this.updateSearch(target);
                break;
            case AI_STATE_RETURN:
                this.updateReturn(target);
                break;
            default:
                this.setState(AI_STATE_NEUTRAL);
                break;
        }
    }

    updateNeutral(target) {
        if (this._event.moveSpeed() !== this._baseSpeed) {
            this._event.setMoveSpeed(this._baseSpeed);
        }

        const dist = this.distance8(this._event.x, this._event.y, target.x, target.y);
        if (dist <= this._engageRange) {
            if (this._zoneEngagementRange !== null && this._basePosition) {
                const targetDistToBase = this.distance8(target.x, target.y, this._basePosition.x, this._basePosition.y);
                if (targetDistToBase > this._zoneEngagementRange) return;
            }
            this._lastKnownX = target.x;
            this._lastKnownY = target.y;
            this.setState(AI_STATE_ENGAGE);
        }
    }

    updateEngage(target) {
        if (this._event.isActing && this._event.isActing()) return;
        if (this._event.moveSpeed() !== this._engageSpeed) {
            this._event.setMoveSpeed(this._engageSpeed);
        }

        this._lastKnownX = target.x;
        this._lastKnownY = target.y;

        const dist = this.distance8(this._event.x, this._event.y, target.x, target.y);

        // Rupture de Leash
        if (this._zoneEngagementRange !== null && this._basePosition) {
            const selfDistToBase = this.distance8(this._event.x, this._event.y, this._basePosition.x, this._basePosition.y);
            const targetDistToBase = this.distance8(target.x, target.y, this._basePosition.x, this._basePosition.y);
            if (selfDistToBase > this._zoneEngagementRange || targetDistToBase > this._zoneEngagementRange) {
                this.setState(AI_STATE_RETURN);
                return;
            }
        }

        // Sortie du rayon d'engagement -> Recherche
        if (dist > this._engageRange) {
            this.setState(AI_STATE_SEARCH);
            return;
        }

        // Portée d'attaque atteinte
        if (dist <= this._attackRange) {
            if (typeof this._event.turnTowardCharacter === "function") {
                this._event.turnTowardCharacter(target);
            }
            if (this.canAttack()) {
                this.executeAttack(target);
            }
            return;
        }

        // Déplacement vers la cible via pathfinding
        this.updateEngageMovement(target);
    }

    updateEngageMovement(target) {
        if (!this._event.isMoving()) {
            const dir = (typeof this._event.findDirectionTo === "function")
                ? this._event.findDirectionTo(target.x, target.y)
                : 0;
            if (dir > 0) {
                if (typeof this._event.executeMove8Dir === "function") {
                    this._event.executeMove8Dir(dir);
                } else if (typeof this._event.moveStraight === "function") {
                    this._event.moveStraight(dir);
                }
            }
        }
    }

    /**
     * Méthode à surcharger dans les classes dérivées (IA_Melee, IA_Range).
     * @param {Game_CharacterBase} target 
     */
    executeAttack(target) {
        // Implémenté par les sous-classes
    }

    updateSearch(target) {
        if (this._event.isActing && this._event.isActing()) return;
        this._searchTimer--;

        if (this._zoneEngagementRange !== null && this._basePosition) {
            const selfDistToBase = this.distance8(this._event.x, this._event.y, this._basePosition.x, this._basePosition.y);
            if (selfDistToBase >= this._zoneEngagementRange) {
                this.setState(AI_STATE_RETURN);
                return;
            }
        }

        const dist = this.distance8(this._event.x, this._event.y, target.x, target.y);
        if (dist <= this._engageRange) {
            let inLeash = true;
            if (this._zoneEngagementRange !== null && this._basePosition) {
                const targetDistToBase = this.distance8(target.x, target.y, this._basePosition.x, this._basePosition.y);
                if (targetDistToBase > this._zoneEngagementRange) inLeash = false;
            }
            if (inLeash) {
                this._lastKnownX = target.x;
                this._lastKnownY = target.y;
                this.setState(AI_STATE_ENGAGE);
                return;
            }
        }

        if (this._searchTimer <= 0) {
            this.setState(this._basePosition ? AI_STATE_RETURN : AI_STATE_NEUTRAL);
            if (!this._basePosition) this._target = null;
            return;
        }

        if (!this._event.isMoving()) {
            if (Math.random() < 0.7) {
                const tx = this._lastKnownX !== null ? this._lastKnownX : target.x;
                const ty = this._lastKnownY !== null ? this._lastKnownY : target.y;
                const dir = (typeof this._event.findDirectionTo === "function") ? this._event.findDirectionTo(tx, ty) : 0;
                if (dir > 0) {
                    if (typeof this._event.executeMove8Dir === "function") this._event.executeMove8Dir(dir);
                    else if (typeof this._event.moveStraight === "function") this._event.moveStraight(dir);
                } else if (typeof this._event.moveRandom === "function") {
                    this._event.moveRandom();
                }
            } else if (typeof this._event.moveRandom === "function") {
                this._event.moveRandom();
            }
        }
    }

    updateReturn(target) {
        if (this._event.isActing && this._event.isActing()) return;
        if (this._event.moveSpeed() !== this._baseSpeed) {
            this._event.setMoveSpeed(this._baseSpeed);
        }

        const dist = this.distance8(this._event.x, this._event.y, target.x, target.y);
        if (dist <= this._engageRange) {
            let inLeash = true;
            if (this._zoneEngagementRange !== null && this._basePosition) {
                const targetDistToBase = this.distance8(target.x, target.y, this._basePosition.x, this._basePosition.y);
                if (targetDistToBase > this._zoneEngagementRange) inLeash = false;
            }
            if (inLeash) {
                this._lastKnownX = target.x;
                this._lastKnownY = target.y;
                this.setState(AI_STATE_ENGAGE);
                return;
            }
        }

        const bx = this._basePosition ? this._basePosition.x : this._event.x;
        const by = this._basePosition ? this._basePosition.y : this._event.y;
        if (this._event.x === bx && this._event.y === by) {
            this.setState(AI_STATE_NEUTRAL);
            this._target = null;
            this._lastKnownX = null;
            this._lastKnownY = null;
            return;
        }

        if (!this._event.isMoving()) {
            const dir = (typeof this._event.findDirectionTo === "function") ? this._event.findDirectionTo(bx, by) : 0;
            if (dir > 0) {
                if (typeof this._event.executeMove8Dir === "function") this._event.executeMove8Dir(dir);
                else if (typeof this._event.moveStraight === "function") this._event.moveStraight(dir);
            } else if (this.distance8(this._event.x, this._event.y, bx, by) <= 1) {
                this.setState(AI_STATE_NEUTRAL);
                this._target = null;
            }
        }
    }

    /**
     * Instancie automatiquement la classe d'IA appropriée pour un événement donné.
     * @param {Game_Event} event 
     * @returns {IAManager|null}
     */
    static create(event) {
        if (!event) return null;
        let mode = null;

        const parseText = (t) => {
            if (!t) return;
            const m = t.match(/<AI_MODE:\s*\[?([a-zA-Z0-9_-]+)\]?>/i);
            if (m) mode = m[1].trim().toLowerCase();
        };

        const ev = typeof event.event === "function" ? event.event() : null;
        const enemyId = typeof event.enemyId === "function" ? event.enemyId() : (event._enemyId || 0);
        if (enemyId > 0 && typeof $dataEnemies !== "undefined" && $dataEnemies && $dataEnemies[enemyId]) {
            parseText($dataEnemies[enemyId].note);
        }
        if (ev && ev.note) parseText(ev.note);
        const page = typeof event.page === "function" ? event.page() : null;
        if (page && page.list) {
            for (const cmd of page.list) {
                if (cmd.code === 108 || cmd.code === 408) parseText(cmd.parameters[0]);
            }
        }

        if (mode === "melee") {
            if (typeof IA_Melee !== "undefined") return new IA_Melee(event);
            return new IAManager(event);
        } else if (mode === "range") {
            if (typeof IA_Range !== "undefined") return new IA_Range(event);
            return new IAManager(event);
        }
        return null;
    }

    // ========================================================================
    // GESTION DU BGM DE COMBAT ET FONDU
    // ========================================================================
    static resetBgmState() {
        IAManager._isBattleBgm = false;
        IAManager._savedMapBgm = null;
        IAManager._bgmFadeOutTimer = 0;
    }

    /**
     * Compte le nombre d'ennemis actuellement en état "engage" et vivants sur la carte.
     * @returns {number}
     */
    static countEngagedEnemies() {
        if (typeof $gameMap === "undefined" || !$gameMap || typeof $gameMap.events !== "function") return 0;
        let count = 0;
        const events = $gameMap.events();
        for (const ev of events) {
            if (ev && ev._ai && typeof ev._ai.state === "function") {
                const s = ev._ai.state();
                const isCombat = (s === AI_STATE_ENGAGE) || (s === AI_STATE_HURTED && typeof ev._ai.previousState === "function" && ev._ai.previousState() === AI_STATE_ENGAGE);
                if (isCombat) {
                    const battler = typeof ev.battler === "function" ? ev.battler() : null;
                    if (!battler || !battler.isDead || !battler.isDead()) {
                        count++;
                    }
                }
            }
        }
        return count;
    }

    /**
     * Vérifie si le BGM doit basculer vers la musique de combat ou revenir à la musique de la map (fondu de 3s).
     */
    static checkBattleBgm() {
        const engagedCount = IAManager.countEngagedEnemies();

        if (engagedCount > 0) {
            // Au moins un ennemi est engagé contre le joueur
            IAManager._bgmFadeOutTimer = 0; // Annule le retour fondu en cours si l'ennemi se ré-engage

            if (!IAManager._isBattleBgm) {
                if (typeof AudioManager !== "undefined") {
                    const currentBgm = (typeof AudioManager.saveBgm === "function") ? AudioManager.saveBgm() : null;
                    if (currentBgm && currentBgm.name) {
                        IAManager._savedMapBgm = currentBgm;
                    } else if (typeof $dataMap !== "undefined" && $dataMap && $dataMap.bgm && $dataMap.bgm.name) {
                        IAManager._savedMapBgm = { ...$dataMap.bgm, pos: 0 };
                    }

                    const battleBgm = (typeof $gameSystem !== "undefined" && $gameSystem && typeof $gameSystem.battleBgm === "function")
                        ? $gameSystem.battleBgm()
                        : (typeof $dataSystem !== "undefined" && $dataSystem ? $dataSystem.battleBgm : null);

                    if (battleBgm && battleBgm.name && typeof AudioManager.playBgm === "function") {
                        AudioManager.playBgm(battleBgm);
                        IAManager._isBattleBgm = true;
                    }
                }
            }
        } else {
            // Le dernier ennemi engagé quitte le mode engage (ex: search, neutral, ou vaincu)
            if (IAManager._isBattleBgm) {
                IAManager._isBattleBgm = false;
                if (typeof AudioManager !== "undefined") {
                    if (typeof AudioManager.fadeOutBgm === "function") {
                        AudioManager.fadeOutBgm(3); // Fondu de 3s sur la musique de combat
                    }
                    IAManager._bgmFadeOutTimer = 180; // 3 secondes (180 frames à 60 FPS) avant reprise de la map
                }
            }
        }
    }

    /**
     * Mise à jour frame par frame du fondu de BGM.
     */
    static updateBgm() {
        if (IAManager._bgmFadeOutTimer > 0) {
            IAManager._bgmFadeOutTimer--;
            if (IAManager._bgmFadeOutTimer === 0) {
                if (typeof AudioManager !== "undefined") {
                    const mapBgm = IAManager._savedMapBgm ||
                        ((typeof $dataMap !== "undefined" && $dataMap) ? $dataMap.bgm : null);
                    if (mapBgm && mapBgm.name) {
                        if (typeof AudioManager.replayBgm === "function") {
                            AudioManager.replayBgm(mapBgm);
                        } else if (typeof AudioManager.playBgm === "function") {
                            AudioManager.playBgm(mapBgm);
                        }
                        if (typeof AudioManager.fadeInBgm === "function") {
                            AudioManager.fadeInBgm(3);
                        }
                    }
                }
                IAManager._savedMapBgm = null;
            }
        }
    }
}

IAManager._isBattleBgm = false;
IAManager._savedMapBgm = null;
IAManager._bgmFadeOutTimer = 0;

// Enregistrement global
window.IAManager = IAManager;
window.AI_STATE_NEUTRAL = AI_STATE_NEUTRAL;
window.AI_STATE_ENGAGE = AI_STATE_ENGAGE;
window.AI_STATE_SEARCH = AI_STATE_SEARCH;
window.AI_STATE_RETURN = AI_STATE_RETURN;
