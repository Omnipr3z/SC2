//=============================================================================
// SC4_SpaceTravel.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Moteur de navigation spatiale, physique orbitale et simulation galactique.
 * @author SimCraft
 * 
 * @param enableBackgroundSimulation
 * @text Simulation en tâche de fond
 * @desc Si vrai, les déplacements spatiaux continuent hors scène pendant l'exploration sur carte (Scene_Map).
 * @type boolean
 * @default true
 * 
 * @param hyperdriveKey
 * @text Touche Hyperdrive
 * @desc Nom de la touche d'entrée pour activer l'hyperdrive (ex: shift, control).
 * @type string
 * @default shift
 * 
 * @help
 * ============================================================================
 * SC4_SpaceTravel.js
 * ============================================================================
 * Fournit le moteur métier complet pour les voyages spatiaux :
 * 
 * 1. Modèles de Données ($gameSector, $gameSpaceships) :
 *    - Hiérarchie stellaire : Secteur -> Système planétaire -> Planète -> POI.
 *    - Physique orbitale 2D temps réel (étoiles, planètes, lunes/stations).
 *    - Gestion complète des vaisseaux, moteurs, hyperdrive et consommation de carburant.
 * 
 * 2. Simulation des Déplacements :
 *    - Déplacements intra-système (coordonnées libres et mise en orbite).
 *    - Sauts inter-systèmes (vol FTL le long des constellations avec durée de transit).
 *    - Point d'arrivée automatique lors de l'entrée dans un système.
 *    - Simulation continue en arrière-plan lorsque le joueur est dans son vaisseau (Scene_Map).
 * 
 * 3. Persistance complète dans les sauvegardes via SC_DataManager.
 * ============================================================================
 */

// ============================================================================
// 1. GAME OBJECTS : PLANÈTES & CORPS CÉLESTES
// ============================================================================

class Game_Planet {
    constructor(data, id) {
        this._id = id;
        this._dbId = data.id;
        this._type = data.type || "Planet";
        this._name = data.name || "Inconnu";
        this._description = data.description || "";
        this._x = data.x || 0;
        this._y = data.y || 0;
        this._zoom = data.zoom || 1.0;
        this._bitmapName = data.bitmapName || "";
        this._moves = Array.isArray(data.moves) ? JSON.parse(JSON.stringify(data.moves)) : [];
        this._pois = Array.isArray(data.pois) ? JSON.parse(JSON.stringify(data.pois)) : [];
        this._orbitAngle = 0;
        this._rotationAngle = 0;
        this._active = false;
    }

    get id() { return this._id; }
    get dbId() { return this._dbId; }
    get type() { return this._type; }
    get name() { return this._name; }
    get description() { return this._description; }
    get x() { return this._x; }
    set x(val) { this._x = val; }
    get y() { return this._y; }
    set y(val) { this._y = val; }
    get zoom() { return this._zoom; }
    get bitmapName() { return this._bitmapName; }
    get moves() { return this._moves; }
    get pois() { return this._pois; }

    get orbitAngle() { return this._orbitAngle; }
    set orbitAngle(value) {
        this._orbitAngle = value % (Math.PI * 2);
    }

    get rotationAngle() { return this._rotationAngle; }
    set rotationAngle(val) {
        this._rotationAngle = val % (Math.PI * 2);
    }

    get active() { return this._active; }
    activate() { this._active = true; }
    deactivate() { this._active = false; }

    poi(poiId) {
        return this._pois.find(p => p.id === poiId) || null;
    }

    makeSavefileData() {
        return {
            x: this._x,
            y: this._y,
            orbitAngle: this._orbitAngle,
            active: this._active
        };
    }

    loadSavefileData(data) {
        if (data) {
            if (typeof data.x === "number") this._x = data.x;
            if (typeof data.y === "number") this._y = data.y;
            if (typeof data.orbitAngle === "number") this._orbitAngle = data.orbitAngle;
            if (typeof data.active === "boolean") this._active = data.active;
        }
    }
}

// ============================================================================
// 2. GAME OBJECTS : SYSTÈMES PLANÉTAIRES & SECTEUR
// ============================================================================

class Game_PlanetarySystem {
    constructor(data) {
        this._id = data.id;
        this._name = data.name || "Système sans nom";
        this._description = data.description || "";
        this._starType = data.starType || "Yellow Star";
        this._starColor = data.starColor || "#ffffff";
        this._pos = data.pos || { x: 0, y: 0 };
        this._connections = Array.isArray(data.connections) ? [...data.connections] : [];
        this._entryPoint = data.entryPoint || { x: 640, y: 320 };
        this._planetIds = Array.isArray(data.planetIds) ? [...data.planetIds] : [];
        this._planets = [];
        this.initPlanets();
    }

    get id() { return this._id; }
    get name() { return this._name; }
    get description() { return this._description; }
    get starType() { return this._starType; }
    get starColor() { return this._starColor; }
    get pos() { return this._pos; }
    get position() { return this._pos; }
    get connections() { return this._connections; }
    get entryPoint() { return this._entryPoint; }
    get planetIds() { return this._planetIds; }

    initPlanets() {
        const dbPlanets = window.$dataPlanets || [];
        this._planets = [];
        this._planetIds.forEach((pId, index) => {
            const rawData = dbPlanets.find(p => p.id === pId) || { id: pId, name: `Corps ${pId}`, x: 0, y: 0 };
            this._planets[index] = new Game_Planet(rawData, index);
        });
    }

    planets() {
        if (this._planets.length === 0 && this._planetIds.length > 0) {
            this.initPlanets();
        }
        return this._planets;
    }

    planet(indexOrId) {
        const list = this.planets();
        if (list[indexOrId]) return list[indexOrId];
        return list.find(p => p.dbId === indexOrId) || null;
    }

    makeSavefileData() {
        return {
            planets: this.planets().map(p => p.makeSavefileData())
        };
    }

    loadSavefileData(data) {
        if (data && Array.isArray(data.planets)) {
            const currentPlanets = this.planets();
            data.planets.forEach((pData, idx) => {
                if (currentPlanets[idx]) {
                    currentPlanets[idx].loadSavefileData(pData);
                }
            });
        }
    }
}

class Game_Sector {
    constructor() {
        this._currentSectorId = 0;
        this._currentSystemId = 0;
        this._systems = new Map();
    }

    currentSectorData() {
        const sectors = window.$dataSectors || [];
        return sectors.find(s => s.id === this._currentSectorId) || sectors[0] || null;
    }

    get currentSectorId() { return this._currentSectorId; }
    set currentSectorId(val) { this._currentSectorId = val; }

    get currentSystemId() { return this._currentSystemId; }
    set currentSystemId(val) {
        this._currentSystemId = val;
    }

    system(systemId) {
        if (!this._systems.has(systemId)) {
            const sector = this.currentSectorData();
            const sysData = sector && Array.isArray(sector.systems) 
                ? sector.systems.find(s => s.id === systemId)
                : null;

            if (sysData) {
                this._systems.set(systemId, new Game_PlanetarySystem(sysData));
            } else {
                return null;
            }
        }
        return this._systems.get(systemId);
    }

    systems() {
        const sector = this.currentSectorData();
        if (!sector || !Array.isArray(sector.systems)) return [];
        return sector.systems.map(s => this.system(s.id)).filter(Boolean);
    }

    currentSystem() {
        return this.system(this._currentSystemId);
    }

    makeSavefileData() {
        const systemsData = {};
        for (const [id, sys] of this._systems.entries()) {
            systemsData[id] = sys.makeSavefileData();
        }
        return {
            currentSectorId: this._currentSectorId,
            currentSystemId: this._currentSystemId,
            systems: systemsData
        };
    }

    loadSavefileData(data) {
        if (!data) return;
        this._currentSectorId = data.currentSectorId || 0;
        this._currentSystemId = data.currentSystemId || 0;
        this._systems.clear();

        if (data.systems) {
            for (const [idStr, sData] of Object.entries(data.systems)) {
                const sId = Number(idStr);
                const sys = this.system(sId);
                if (sys) sys.loadSavefileData(sData);
            }
        }
    }
}

// ============================================================================
// 3. GAME OBJECTS : VAISSEAUX SPATIAUX & HYPERDRIVE
// ============================================================================

class Game_Spaceship {
    constructor(data) {
        this._id = data.id;
        this._name = data.name || "Navire sans nom";
        this._category = data.category || "Vaisseau";
        this._shipClass = data.shipClass || "Standard";
        this._captainId = data.captainId || 1;
        this._bitmapName = data.bitmapName || "PlayerShip";
        this._sectorId = data.sectorId || 0;
        this._systemId = data.systemId || 0;
        this._x = data.x || 0;
        this._y = data.y || 0;
        this._targetX = this._x;
        this._targetY = this._y;
        this._orbitingPlanetId = null;
        this._contactShipId = null;
        this._capacity = data.capacity || 100;
        this._faction = data.faction || "Neutre";
        this._motorId = typeof data.motorId === "number" ? data.motorId : 0;
        this._fuel = typeof data.fuel === "number" ? data.fuel : 500;
        this._status = "Static"; // Static | Orbiting | MoveToOrbit | MoveToDest | InterSystemJump
        this._driveActive = false;
        this._tmpSpeed = 0;

        // Saut inter-système
        this._jumpTargetSystemId = null;
        this._jumpProgress = 0;
        this._jumpDuration = 0;
    }

    get id() { return this._id; }
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
        return motors.find(m => m.id === this._motorId) || motors[0] || {
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

    // Engagement d'un saut inter-système
    startInterSystemJump(targetSystemId) {
        const sector = window.$gameSector;
        if (!sector) return false;

        const currentSys = sector.system(this._systemId);
        const targetSys = sector.system(targetSystemId);
        if (!currentSys || !targetSys) return false;

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
        return true;
    }

    updateInterSystemJump(speedFactor = 1.0) {
        if (this._status !== "InterSystemJump") return false;

        this.consumeFuel(0.04 * speedFactor);
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
            jumpDuration: this._jumpDuration
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
    }
}

class Game_Spaceships {
    constructor() {
        this._data = [];
        this.initShips();
    }

    initShips() {
        const rawShips = window.$dataSpaceships || [];
        this._data = rawShips.map(s => new Game_Spaceship(s));
    }

    spaceships() {
        if (this._data.length === 0 && Array.isArray(window.$dataSpaceships) && window.$dataSpaceships.length > 0) {
            this.initShips();
        }
        return this._data;
    }

    ship(id) {
        return this.spaceships().find(s => s.id === id) || null;
    }

    playerShip() {
        const ships = this.spaceships();
        if (ships.length === 0) return null;
        if (window.$gameParty && typeof $gameParty.leader === "function" && $gameParty.leader()) {
            const leaderId = $gameParty.leader().actorId();
            const found = ships.find(s => s.captainId === leaderId);
            if (found) return found;
        }
        return ships[0];
    }

    makeSavefileData() {
        return this.spaceships().map(s => s.makeSavefileData());
    }

    loadSavefileData(data) {
        if (Array.isArray(data)) {
            const list = this.spaceships();
            data.forEach((sData, idx) => {
                if (list[idx]) list[idx].loadSavefileData(sData);
            });
        }
    }
}

// ============================================================================
// 4. MOTEUR PHYSIQUE & MANAGER CARTOGRAPHIQUE (SystemMapManager)
// ============================================================================

class SystemMapManager {
    constructor() {
        this._mapOffsetX = 0;
        this._mapOffsetY = 0;
        this._logs = [];
    }

    get planets() {
        return window.$gameSector ? window.$gameSector.currentSystem().planets() : [];
    }

    get spaceships() {
        return window.$gameSpaceships ? window.$gameSpaceships.spaceships() : [];
    }

    get playerSpaceship() {
        return window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
    }

    get mapOffsetX() { return this._mapOffsetX; }
    get mapOffsetY() { return this._mapOffsetY; }

    log(style, txt) {
        this._logs.push({ style, txt, timestamp: window.$gameDate ? window.$gameDate.timestamp : 0 });
    }

    pullLogs() {
        const logs = [...this._logs];
        this._logs = [];
        return logs;
    }

    update(isBackground = false) {
        this.updateTimeFlow(isBackground);
        this.updatePlanetsPhysics();
        this.updateSpaceships(isBackground);
        if (!isBackground) {
            this.updateMapOffset();
        }
    }

    updateTimeFlow(isBackground = false) {
        if (!window.$gameDate) return;
        const ship = this.playerSpaceship;
        if (ship) {
            if (ship.status === "InterSystemJump" || ship.isHyperdrive()) {
                window.$gameDate.setScrollSpeedMode(4); // Vitesse FTL / Warp x12
            } else if (ship.isMoving()) {
                window.$gameDate.setScrollSpeedMode(2); // Vitesse en croisière x2
            } else {
                window.$gameDate.setScrollSpeedMode(1); // Temps continu normal x1 (statique ou orbite)
            }
        }
        // Avancement temporel régulier dans les scènes spatiales
        if (!isBackground) {
            window.$gameDate.passTick();
        }
    }

    updateMapOffset() {
        const ship = this.playerSpaceship;
        if (!ship) return;

        // Centrage fluide de la caméra sur le vaisseau
        const targetX = Math.min(0, Math.max(-ship.x + (Graphics.width / 2), -(1600 - Graphics.width)));
        const targetY = Math.min(0, Math.max(-ship.y + (Graphics.height / 2), -(1200 - Graphics.height)));

        this._mapOffsetX = Utils.approach(this._mapOffsetX, targetX, 2);
        this._mapOffsetY = Utils.approach(this._mapOffsetY, targetY, 2);
    }

    updatePlanetsPhysics() {
        const totalTicks = window.$gameDate ? (window.$gameDate.timestamp * 60 + window.$gameDate._tick) : Graphics.frameCount;
        const pi2 = Math.PI * 2;

        this.planets.forEach(planet => {
            let rotSpeed = 0.0006;
            if (Array.isArray(planet.moves)) {
                const rotMove = planet.moves.find(m => m.type === "rotation");
                if (rotMove && typeof rotMove.value === "number") {
                    rotSpeed = rotMove.value;
                }
            }
            planet.rotationAngle = (totalTicks * rotSpeed) % pi2;

            if (Array.isArray(planet.moves)) {
                planet.moves.forEach(move => {
                    if (move.type === "orbit" || move.type === "orbitPlanet") {
                        let cx = move.centerX || 640;
                        let cy = move.centerY || 320;

                        if (move.type === "orbitPlanet") {
                            const parent = this.planets[move.planetId];
                            if (parent) {
                                cx = parent.x;
                                cy = parent.y;
                            }
                        }

                        const spd = move.speed || 0.0001;
                        const initialOffset = (typeof move.value === "number" ? move.value : 0) * pi2;
                        planet.orbitAngle = (initialOffset + totalTicks * spd) % pi2;

                        planet.x = cx + Math.cos(planet.orbitAngle) * (move.radiusX || 100);
                        planet.y = cy + Math.sin(planet.orbitAngle) * (move.radiusY || 100);
                    }
                });
            }
        });
    }

    updateSpaceships(isBackground = false) {
        const timeFactor = (window.$gameDate && window.$gameDate.getTickPerMin() > 0) 
            ? (60 / window.$gameDate.getTickPerMin()) 
            : 1;
        
        this.spaceships.forEach(ship => {
            if (!ship) return;

            // 1. Saut Inter-système
            if (ship.status === "InterSystemJump") {
                const finished = ship.updateInterSystemJump(timeFactor);
                if (finished) {
                    const targetSys = window.$gameSector ? window.$gameSector.system(ship.systemId) : null;
                    const sysName = targetSys ? targetSys.name : "Système";
                    this.log("alert", `Le ${ship.name} a émergé du Warp dans le système ${sysName}.`);
                }
                return;
            }

            // 2. Déplacements locaux intra-système (vitesse d'origine)
            const moveSpeed = (ship.speed / 4) * timeFactor;

            if (ship.status === "MoveToOrbit") {
                const planet = ship.orbitingPlanet;
                if (planet) {
                    const dist = Math.hypot(ship.x - planet.x, ship.y - planet.y);
                    if (dist > moveSpeed + 2) {
                        ship.consumeFuel(0.01 * timeFactor);
                        ship.x = Utils.approach(ship.x, planet.x, moveSpeed);
                        ship.y = Utils.approach(ship.y, planet.y, moveSpeed);
                    } else {
                        ship.x = planet.x;
                        ship.y = planet.y;
                        ship.status = "Orbiting";
                        this.log("basicInfos", `Le ${ship.name} est entré en orbite stationnaire autour de ${planet.name}.`);
                    }
                }
            } else if (ship.status === "Orbiting") {
                const planet = ship.orbitingPlanet;
                if (planet) {
                    ship.x = planet.x;
                    ship.y = planet.y;
                }
            } else if (ship.status === "MoveToContact") {
                const targetShip = ship.contactShip;
                if (targetShip) {
                    const dist = Math.hypot(ship.x - targetShip.x, ship.y - targetShip.y);
                    if (dist > moveSpeed + 2) {
                        ship.consumeFuel(0.01 * timeFactor);
                        ship.x = Utils.approach(ship.x, targetShip.x, moveSpeed);
                        ship.y = Utils.approach(ship.y, targetShip.y, moveSpeed);
                    } else {
                        ship.x = targetShip.x;
                        ship.y = targetShip.y;
                        ship.status = "InContact";
                        this.log("basicInfos", `Le ${ship.name} est entré en contact avec le ${targetShip.name}.`);
                    }
                }
            } else if (ship.status === "InContact") {
                const targetShip = ship.contactShip;
                if (targetShip) {
                    ship.x = targetShip.x;
                    ship.y = targetShip.y;
                }
            } else if (ship.status === "MoveToDest") {
                const dist = Math.hypot(ship.x - ship.targetX, ship.y - ship.targetY);
                if (dist > moveSpeed) {
                    ship.consumeFuel(0.01 * timeFactor);
                    ship.x = Utils.approach(ship.x, ship.targetX, moveSpeed);
                    ship.y = Utils.approach(ship.y, ship.targetY, moveSpeed);
                } else {
                    ship.x = ship.targetX;
                    ship.y = ship.targetY;
                    ship.status = "Static";
                    this.log("infos", `Le ${ship.name} a atteint les coordonnées ${ship.targetX}-${ship.targetY}.`);
                }
            }
        });
    }
}

// Instance globale du gestionnaire de carte
window.$systemMapManager = new SystemMapManager();

// ============================================================================
// 5. SIMULATION EN ARRIÈRE-PLAN SUR SCENE_MAP
// ============================================================================

(() => {
    "use strict";

    const pluginName = "SC4_SpaceTravel";
    const parameters = PluginManager.parameters(pluginName);
    const enableBgSim = parameters["enableBackgroundSimulation"] !== "false";

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        // Simulation en tâche de fond si le joueur est sur la carte normale
        if (enableBgSim && window.$systemMapManager) {
            window.$systemMapManager.update(true);
        }
    };

})();
