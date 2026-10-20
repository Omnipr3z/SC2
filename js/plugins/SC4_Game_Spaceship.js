//=============================================================================
// RPG Maker MZ - SC4_Game_Spaceship
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Modèle de vaisseau spatial (navigation, carburant, FTL, amarrage).
 * @author SimCraft
 * 
 * @help SC4_Game_Spaceship.js
 */

class Game_Spaceship {
    constructor(data) {
        this._id = data.id;
        const defShip = typeof SC4_Localization !== "undefined" ? SC4_Localization.getText("travel.default_ship_name", "Navire sans nom") : "Navire sans nom";
        this._name = data.name || defShip;
        this._category = data.category || "Vaisseau";
        this._shipClass = data.shipClass || "Standard";
        this._captainId = data.captainId || 1;
        this._bitmapName = data.bitmapName || "PlayerShip";
        this._sectorId = (typeof data.sectorId === "number" && data.sectorId > 0) ? data.sectorId : 1;
        this._systemId = (typeof data.systemId === "number" && data.systemId > 0) ? data.systemId : 1;
        this._x = data.x || 0;
        this._y = data.y || 0;
        this._targetX = this._x;
        this._targetY = this._y;
        this._orbitingPlanetId = null;
        this._contactShipId = null;
        this._capacity = data.capacity || 100;
        this._faction = data.faction || "Neutre";
        this._motorId = typeof data.motorId === "number" ? data.motorId : 1;
        this._fuel = typeof data.fuel === "number" ? data.fuel : 500;
        this._status = "Static"; // Static | Orbiting | MoveToOrbit | MoveToDest | InterSystemJump
        this._driveActive = false;
        this._tmpSpeed = 0;

        // Saut inter-système
        this._jumpTargetSystemId = null;
        this._jumpProgress = 0;
        this._jumpDuration = 0;

        // SE et BGS audio spécifiques
        this._movingSE = data.movingSE || null;
        this._hyperdriveBGS = data.hyperdriveBGS || null;
        this._warpjumpSE = data.warpjumpSE || null;

        // Carte et coordonnées de transfert/atterrissage
        this._mapId = typeof data.mapId === "number" ? data.mapId : 0;
        this._landingX = typeof data.landingX === "number" ? data.landingX : 0;
        this._landingY = typeof data.landingY === "number" ? data.landingY : 0;

        // Système d'onboarding (V[id], D[id], P[id]) et autorisation d'amarrage
        this._onBoard = (data.onBoard && data.onBoard !== "null" && data.onBoard !== 0 && data.onBoard !== false) ? String(data.onBoard).trim() : null;
        this._dockingAllowed = !!data.dockingAllowed;
    }

    get id() { return this._id; }
    get mapId() { return this._mapId; }
    get landingX() { return this._landingX; }
    get landingY() { return this._landingY; }
    get dockingAllowed() { return this._dockingAllowed; }
    set dockingAllowed(val) { this._dockingAllowed = !!val; }
    allowDocking(val = true) { this._dockingAllowed = !!val; }

    get onBoard() { return this._onBoard; }

    onBoardType() {
        if (!this._onBoard) return null;
        const m = String(this._onBoard).toUpperCase().match(/^([VDP])/);
        return m ? m[1] : null;
    }

    onBoardTargetId() {
        if (!this._onBoard) return null;
        const m = String(this._onBoard).toUpperCase().match(/^[VDP](\d+)/);
        return m ? parseInt(m[1], 10) : null;
    }

    isOnBoard() {
        return this.onBoardType() === "V" ? this.onBoardTargetId() : null;
    }

    isDocked() {
        return this.onBoardType() === "D" ? this.onBoardTargetId() : null;
    }

    isLanded() {
        return this.onBoardType() === "P" ? this.onBoardTargetId() : null;
    }

    aboard(targetId, type = "V") {
        if (targetId === null || targetId === undefined || targetId === false || targetId === 0 || targetId === "") {
            this._onBoard = null;
            return;
        }
        if (typeof targetId === "string" && /^[vdpVDP]\d+$/.test(targetId.trim())) {
            this._onBoard = targetId.trim().toUpperCase();
            return;
        }
        const t = (type || "V").toUpperCase();
        this._onBoard = `${t}${targetId}`;
    }

    leaveHost() {
        this._onBoard = null;
    }

    getOnboardingMode(targetShipId) {
        const target = (typeof targetShipId === "object" && targetShipId !== null)
            ? targetShipId
            : (window.$gameSpaceships ? window.$gameSpaceships.ship(targetShipId) : null);
        if (!target || target === this || target.id === this._id) return "notAllowed";

        const norm = (cat) => {
            if (!cat) return "";
            const c = cat.toLowerCase().replace(/[\s&_-]/g, "");
            if (c.includes("shuttle") || c.includes("navette")) return "shuttle";
            if (c.includes("escort") || c.includes("scout")) return "escort";
            if (c.includes("fregate") || c.includes("frigate")) return "fregate";
            if (c.includes("cruiser") || c.includes("croiseur") || c.includes("patrol")) return "cruiser";
            return c;
        };

        const srcCat = norm(this._category);
        const dstCat = norm(target.category);

        if (srcCat === "shuttle") {
            if (dstCat === "fregate" || dstCat === "cruiser") return "onBoard";
            return "notAllowed";
        } else if (srcCat === "escort") {
            if (dstCat === "cruiser") return "onBoard";
            if (dstCat === "escort" || dstCat === "fregate") return "docking";
            return "notAllowed";
        } else if (srcCat === "fregate") {
            if (dstCat === "escort" || dstCat === "fregate" || dstCat === "cruiser") return "docking";
            return "notAllowed";
        } else if (srcCat === "cruiser") {
            return "notAllowed";
        }
        return "notAllowed";
    }

    isBoardingAllowed(targetShipId) {
        return this.getOnboardingMode(targetShipId) === "onBoard";
    }

    isDockingAllowed(targetShipId) {
        const mode = this.getOnboardingMode(targetShipId);
        if (mode !== "docking") return false;
        const target = (typeof targetShipId === "object" && targetShipId !== null)
            ? targetShipId
            : (window.$gameSpaceships ? window.$gameSpaceships.ship(targetShipId) : null);
        return !!(target && target.dockingAllowed);
    }
    get name() { return this._name; }
    get category() { return this._category; }
    get shipClass() { return this._shipClass; }
    get captainId() { return this._captainId; }
    get captain() {
        return (window.$gameActors && typeof $gameActors.actor === "function") 
            ? $gameActors.actor(this._captainId) 
            : null;
    }
    get bitmapName() { return this._bitmapName; }
    get sectorId() { return this._sectorId; }
    set sectorId(val) { this._sectorId = val; }
    get systemId() { return this._systemId; }
    set systemId(val) { this._systemId = val; }
    get x() { return this._x; }
    set x(val) { this._x = val; }
    get y() { return this._y; }
    set y(val) { this._y = val; }
    get targetX() { return this._targetX; }
    get targetY() { return this._targetY; }
    get orbitingPlanetId() { return this._orbitingPlanetId; }
    get capacity() { return this._capacity; }
    get faction() { return this._faction; }
    get motorId() { return this._motorId; }
    get motor() {
        const motors = window.$dataShipMotors || [];
        return motors[this._motorId] || motors.find(m => m && m.id === this._motorId) || motors.find(m => !!m) || {
            speed: 0.5,
            capacity: 500,
            hyperdrive: { buffRate: 2.0, consumeRate: 2.0 }
        };
    }

    get fuel() { return this._fuel; }
    set fuel(val) { this._fuel = Math.max(0, val); }

    get status() { return this._status; }
    set status(val) { this._status = val; }

    get jumpTargetSystemId() { return this._jumpTargetSystemId; }
    get jumpProgress() { return this._jumpProgress; }
    get jumpDuration() { return this._jumpDuration; }

    get movingSE() {
        if (this._movingSE) {
            return typeof this._movingSE === "string" 
                ? { name: this._movingSE, volume: 90, pitch: 80 } 
                : Object.assign({ name: "Collapse3", volume: 90, pitch: 80 }, this._movingSE);
        }
        return { name: "Collapse3", volume: 90, pitch: 80 };
    }

    get hyperdriveBGS() {
        if (this._hyperdriveBGS) {
            return typeof this._hyperdriveBGS === "string" 
                ? { name: this._hyperdriveBGS, volume: 90, pitch: 100 } 
                : Object.assign({ name: "FIREWIND2", volume: 90, pitch: 100 }, this._hyperdriveBGS);
        }
        return { name: "FIREWIND2", volume: 90, pitch: 100 };
    }

    get warpjumpSE() {
        if (this._warpjumpSE) {
            return typeof this._warpjumpSE === "string" 
                ? { name: this._warpjumpSE, volume: 90, pitch: 100 } 
                : Object.assign({ name: "ShipJump", volume: 90, pitch: 100 }, this._warpjumpSE);
        }
        return { name: "ShipJump", volume: 90, pitch: 100 };
    }

    get orbitingPlanet() {
        if (this._orbitingPlanetId === null) return null;
        const currentSys = window.$gameSector ? window.$gameSector.currentSystem() : null;
        return currentSys ? currentSys.planet(this._orbitingPlanetId) : null;
    }

    get contactShipId() { return this._contactShipId; }
    get contactShip() {
        if (this._contactShipId === null) return null;
        return window.$gameSpaceships ? window.$gameSpaceships.ship(this._contactShipId) : null;
    }

    get speed() {
        let buff = 1.0;
        if (this.isHyperdrive()) {
            buff = (this.motor.hyperdrive && this.motor.hyperdrive.buffRate) ? this.motor.hyperdrive.buffRate : 1.5;
        }
        if (this.motor.capacity === -1 || this._fuel > 0) {
            return (this.motor.speed || 0.5) * buff;
        }
        return 0.1; // Vitesse de secours minimale si panne sèche
    }

    isMoving() {
        return this._status === "MoveToDest" || this._status === "MoveToOrbit" || this._status === "MoveToContact" || this._status === "InterSystemJump";
    }

    isHyperdrive() {
        return !!(this.motor.hyperdrive && this._driveActive && this._fuel > 0);
    }

    activeHyperdrive() {
        if (this.canActivateHyperdrive()) {
            this._driveActive = true;
        }
    }

    deactivateHyperdrive() {
        this._driveActive = false;
    }

    canActivateHyperdrive() {
        return !!(this.motor.hyperdrive && this._fuel > 0);
    }

    setTarget(x, y) {
        this.clearOrbit();
        this.clearContact();
        this._targetX = Math.round(x);
        this._targetY = Math.round(y);
        this._status = "MoveToDest";
    }

    setOrbitingPlanet(planetId) {
        this.clearContact();
        this._orbitingPlanetId = planetId;
        const currentSys = window.$gameSector ? window.$gameSector.currentSystem() : null;
        const planet = currentSys ? currentSys.planet(planetId) : null;
        if (planet && Math.hypot(this._x - planet.x, this._y - planet.y) <= 8) {
            this._x = planet.x;
            this._y = planet.y;
            this._status = "Orbiting";
        } else {
            this._status = "MoveToOrbit";
        }
    }

    setContactShip(shipId) {
        this.clearOrbit();
        this._contactShipId = shipId;
        const target = this.contactShip;
        if (target && Math.hypot(this._x - target.x, this._y - target.y) <= 12) {
            this._x = target.x;
            this._y = target.y;
            this._status = "InContact";
        } else {
            this._status = "MoveToContact";
        }
    }

    clearOrbit() {
        this._orbitingPlanetId = null;
    }

    clearContact() {
        this._contactShipId = null;
    }

    consumeFuel(amount) {
        if (this.motor.capacity === -1) return; // Carburant infini
        if (this.isHyperdrive()) {
            amount *= (this.motor.hyperdrive.consumeRate || 1.5);
        }
        this._fuel = Math.max(0, this._fuel - amount);
        if (this._fuel <= 0 && this._driveActive) {
            this.deactivateHyperdrive();
        }
    }

    isWarpAllowed() {
        return Boolean(this.motor && this.motor.warpAllowed);
    }

    // Engagement d'un saut inter-système
    startInterSystemJump(targetSystemId) {
        if (!this.isWarpAllowed()) return false;
        if (this.motor.capacity !== -1 && this._fuel < 500) return false;

        const sector = window.$gameSector;
        if (!sector) return false;

        const currentSys = sector.system(this._systemId);
        const targetSys = sector.system(targetSystemId);
        if (!currentSys || !targetSys) return false;

        // Consommation fixe de 500 carburant au lancement du saut
        this.consumeFuel(500);

        // Abandon des déplacements locaux
        this.clearOrbit();
        this._jumpTargetSystemId = targetSystemId;
        this._status = "InterSystemJump";

        // Distance galactique
        const dx = targetSys.pos.x - currentSys.pos.x;
        const dy = targetSys.pos.y - currentSys.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Durée du saut en ticks (indexée sur la vitesse du moteur)
        const baseSpeed = Math.max(0.2, this.speed);
        this._jumpDuration = Math.max(120, Math.round((dist / baseSpeed) * 3));
        this._jumpProgress = 0;
        this._jumpWarmupTicks = 40; // Préchauffage sonore/moteur avant propulsion physique
        return true;
    }

    updateInterSystemJump(speedFactor = 1.0) {
        if (this._status !== "InterSystemJump") return false;

        // Temporisation de charge au démarrage
        if (this._jumpWarmupTicks > 0) {
            this._jumpWarmupTicks--;
            return false;
        }

        // Pas de consommation supplémentaire en mouvement
        this._jumpProgress += speedFactor;

        if (this._jumpProgress >= this._jumpDuration) {
            this.completeInterSystemJump();
            return true;
        }
        return false;
    }

    completeInterSystemJump() {
        const targetSysId = this._jumpTargetSystemId;
        this._systemId = targetSysId;
        this._jumpTargetSystemId = null;
        this._jumpProgress = 0;
        this._jumpDuration = 0;

        const sector = window.$gameSector;
        if (sector) {
            sector.currentSystemId = targetSysId;
            const targetSys = sector.system(targetSysId);
            if (targetSys && targetSys.entryPoint) {
                this._x = targetSys.entryPoint.x;
                this._y = targetSys.entryPoint.y;
                this._targetX = this._x;
                this._targetY = this._y;
            }
        }
        this._status = "Static";
    }

    makeSavefileData() {
        return {
            x: this._x,
            y: this._y,
            targetX: this._targetX,
            targetY: this._targetY,
            sectorId: this._sectorId,
            systemId: this._systemId,
            orbitingPlanetId: this._orbitingPlanetId,
            contactShipId: this._contactShipId,
            fuel: this._fuel,
            status: this._status,
            driveActive: this._driveActive,
            jumpTargetSystemId: this._jumpTargetSystemId,
            jumpProgress: this._jumpProgress,
            jumpDuration: this._jumpDuration,
            onBoard: this._onBoard,
            dockingAllowed: this._dockingAllowed
        };
    }

    loadSavefileData(data) {
        if (!data) return;
        if (typeof data.x === "number") this._x = data.x;
        if (typeof data.y === "number") this._y = data.y;
        if (typeof data.targetX === "number") this._targetX = data.targetX;
        if (typeof data.targetY === "number") this._targetY = data.targetY;
        if (typeof data.sectorId === "number") this._sectorId = data.sectorId;
        if (typeof data.systemId === "number") this._systemId = data.systemId;
        this._orbitingPlanetId = data.orbitingPlanetId !== undefined ? data.orbitingPlanetId : null;
        this._contactShipId = data.contactShipId !== undefined ? data.contactShipId : null;
        if (typeof data.fuel === "number") this._fuel = data.fuel;
        if (typeof data.status === "string") this._status = data.status;
        if (typeof data.driveActive === "boolean") this._driveActive = data.driveActive;
        this._jumpTargetSystemId = data.jumpTargetSystemId !== undefined ? data.jumpTargetSystemId : null;
        if (typeof data.jumpProgress === "number") this._jumpProgress = data.jumpProgress;
        if (typeof data.jumpDuration === "number") this._jumpDuration = data.jumpDuration;
        if (data.onBoard !== undefined) this._onBoard = data.onBoard;
        if (typeof data.dockingAllowed === "boolean") this._dockingAllowed = data.dockingAllowed;
    }
}

window.Game_Spaceship = Game_Spaceship;
if (typeof global !== "undefined") {
    global.Game_Spaceship = Game_Spaceship;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Game_Spaceship };
}
