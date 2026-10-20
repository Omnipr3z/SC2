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
 * @param nefVariableId
 * @text Variable ID de la Nef
 * @desc Numéro de la variable RMMZ où stocker l'ID de la nef lors d'un atterrissage ou transfert (défaut 41).
 * @type variable
 * @default 41
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
        this._poiIds = Array.isArray(data.poiIds) ? [...data.poiIds] : (Array.isArray(data.pois) ? data.pois.map(p => p.id) : []);
        this._landingAllowed = Boolean(data.landingAllowed);
        this._interactive = data.interactive !== false;
        this._orbitAngle = 0;
        this._rotationAngle = 0;
        this._active = false;
    }

    get id() { return this._id; }
    get dbId() { return this._dbId; }
    get interactive() { return this._interactive; }
    get type() {
        if (window.$dataPlanets) {
            const raw = (typeof window.$dataPlanets.find === "function") 
                ? (window.$dataPlanets.find(p => p && p.id === this._dbId) || window.$dataPlanets[this._dbId])
                : window.$dataPlanets[this._dbId];
            if (raw && raw.type) return raw.type;
        }
        return this._type;
    }
    get name() {
        if (window.$dataPlanets) {
            const raw = (typeof window.$dataPlanets.find === "function") 
                ? (window.$dataPlanets.find(p => p && p.id === this._dbId) || window.$dataPlanets[this._dbId])
                : window.$dataPlanets[this._dbId];
            if (raw && raw.name) return raw.name;
        }
        return this._name;
    }
    get description() {
        if (window.$dataPlanets) {
            const raw = (typeof window.$dataPlanets.find === "function") 
                ? (window.$dataPlanets.find(p => p && p.id === this._dbId) || window.$dataPlanets[this._dbId])
                : window.$dataPlanets[this._dbId];
            if (raw && raw.description) return raw.description;
        }
        return this._description;
    }
    get x() { return this._x; }
    set x(val) { this._x = val; }
    get y() { return this._y; }
    set y(val) { this._y = val; }
    get zoom() { return this._zoom; }
    get bitmapName() { return this._bitmapName; }
    get moves() { return this._moves; }
    get poiIds() { return this._poiIds; }
    get landingAllowed() { return this._landingAllowed; }

    isLandingAllowed() {
        return Boolean(this._landingAllowed);
    }

    setLandingAllowed(val) {
        this._landingAllowed = Boolean(val);
    }

    get pois() {
        return this.getPois(false);
    }

    getPois(onlyLocated = false) {
        const allPois = (window.$dataPois || []).filter(p => !!p);
        const ids = this._poiIds || [];
        const list = allPois.filter(p => ids.includes(p.id) || p.planetId === this._dbId);
        if (onlyLocated && window.$gameSystem && typeof window.$gameSystem.isPoiLocated === "function") {
            return list.filter(p => window.$gameSystem.isPoiLocated(p.id));
        }
        return list;
    }

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
        const allPois = (window.$dataPois || []).filter(p => !!p);
        return allPois.find(p => p && p.id === poiId) || null;
    }

    isStation() {
        if (!this._type) return false;
        const t = this._type.toLowerCase();
        return t.includes("station") || t.includes("base") || t.includes("relais") || t.includes("relay");
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
        const defName = typeof SC4_Localization !== "undefined" ? SC4_Localization.getText("travel.default_system_name", "Système sans nom") : "Système sans nom";
        this._name = data.name || defName;
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
    get name() {
        if (window.$gameSector) {
            const sec = window.$gameSector.currentSectorData();
            const sData = sec && Array.isArray(sec.systems) ? sec.systems.find(s => s && s.id === this._id) : null;
            if (sData && sData.name) return sData.name;
        }
        return this._name;
    }
    get description() {
        if (window.$gameSector) {
            const sec = window.$gameSector.currentSectorData();
            const sData = sec && Array.isArray(sec.systems) ? sec.systems.find(s => s && s.id === this._id) : null;
            if (sData && sData.description) return sData.description;
        }
        return this._description;
    }
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
            const defBody = typeof SC4_Localization !== "undefined" ? SC4_Localization.getText("travel.body_default", "Corps") : "Corps";
            const rawData = (typeof dbPlanets.find === "function" ? dbPlanets.find(p => p && p.id === pId) : null) || dbPlanets[pId] || { id: pId, name: `${defBody} ${pId}`, x: 0, y: 0 };
            this._planets[index] = new Game_Planet(rawData, index);
        });
    }

    planets() {
        if (this._planets.length === 0 && this._planetIds.length > 0) {
            this.initPlanets();
        }
        return this._planets;
    }

    planet(targetId) {
        if (targetId === null || targetId === undefined) return null;
        const numId = Number(targetId);
        const list = this.planets();
        return list.find(p => p && (p.dbId === numId || p.id === numId)) || null;
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
        this._currentSectorId = 1;
        this._currentSystemId = 1;
        this._systems = new Map();
    }

    currentSectorData() {
        const sectors = window.$dataSectors || [];
        return sectors.find(s => s && s.id === this._currentSectorId) || sectors.find(s => !!s) || null;
    }

    get currentSectorId() { return this._currentSectorId; }
    set currentSectorId(val) { this._currentSectorId = val || 1; }

    get currentSystemId() { return this._currentSystemId; }
    set currentSystemId(val) {
        this._currentSystemId = val || 1;
    }

    system(systemId) {
        const targetId = systemId || this._currentSystemId || 1;
        if (!this._systems.has(targetId)) {
            const sector = this.currentSectorData();
            const sysData = sector && Array.isArray(sector.systems) 
                ? sector.systems.find(s => s && s.id === targetId)
                : null;

            if (sysData) {
                this._systems.set(targetId, new Game_PlanetarySystem(sysData));
            } else {
                return null;
            }
        }
        return this._systems.get(targetId);
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

class Game_Spaceships {
    constructor() {
        this._data = [];
        this.initShips();
    }

    initShips() {
        const rawShips = window.$dataSpaceships || [];
        this._data = [];
        rawShips.forEach((s) => {
            if (s && typeof s === "object") {
                this._data.push(new Game_Spaceship(s));
            }
        });
    }

    spaceships() {
        if (this._data.length === 0 && Array.isArray(window.$dataSpaceships) && window.$dataSpaceships.length > 0) {
            this.initShips();
        }
        return this._data.filter(s => Boolean(s));
    }

    ship(id) {
        if (id === null || id === undefined) return null;
        const numId = Number(id);
        return this.spaceships().find(s => s && s.id === numId) || null;
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

if (typeof window !== "undefined") {
    window.Game_Planet = Game_Planet;
    window.Game_PlanetarySystem = Game_PlanetarySystem;
    window.Game_Sector = Game_Sector;
    window.Game_Spaceship = Game_Spaceship;
    window.Game_Spaceships = Game_Spaceships;
}

// ============================================================================
// 4. MOTEUR PHYSIQUE & MANAGER CARTOGRAPHIQUE (SystemMapManager)
// ============================================================================

class SystemMapManager {
    constructor() {
        this._mapOffsetX = 12;
        this._mapOffsetY = 12;
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
        if (typeof $gameSystem !== "undefined" && $gameSystem && typeof $gameSystem.addSpaceTravelLog === "function") {
            $gameSystem.addSpaceTravelLog(style, txt);
        }
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
        // Découplage total : vitesse constante fluide et régulière dans les scènes spatiales
        window.$gameDate.setScrollSpeedMode(2);
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
                            const parent = this.planets.find(p => p && (p.dbId === move.planetId || p.id === move.planetId));
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

                // 3. Verrouillage gravitationnel et orientation ciblée (LookAt / Tidal Lock)
                const lookMove = planet.moves.find(m => m && m.type === "lookAt");
                if (lookMove) {
                    let tx = null;
                    let ty = null;
                    if (lookMove.target === "orbitParent") {
                        const orbitMove = planet.moves.find(m => m && m.type === "orbitPlanet");
                        if (orbitMove) {
                            const parent = this.planets.find(p => p && (p.dbId === orbitMove.planetId || p.id === orbitMove.planetId));
                            if (parent) {
                                tx = parent.x;
                                ty = parent.y;
                            }
                        }
                    } else if (lookMove.target === "star" || lookMove.target === "center") {
                        tx = lookMove.centerX || 640;
                        ty = lookMove.centerY || 320;
                    } else if (typeof lookMove.target === "number") {
                        const targetBody = this.planets.find(p => p && (p.dbId === lookMove.target || p.id === lookMove.target));
                        if (targetBody) {
                            tx = targetBody.x;
                            ty = targetBody.y;
                        }
                    } else if (lookMove.target === "tangent") {
                        const theta = planet.orbitAngle || 0;
                        const orbitMove = planet.moves.find(m => m && (m.type === "orbit" || m.type === "orbitPlanet"));
                        const rx = orbitMove ? (orbitMove.radiusX || 100) : 100;
                        const ry = orbitMove ? (orbitMove.radiusY || 100) : 100;
                        const vx = -Math.sin(theta) * rx;
                        const vy = Math.cos(theta) * ry;
                        planet.rotationAngle = (Math.atan2(vy, vx) + (lookMove.offsetAngle || 0)) % pi2;
                    }
                    if (tx !== null && ty !== null) {
                        const dx = tx - planet.x;
                        const dy = ty - planet.y;
                        planet.rotationAngle = (Math.atan2(dy, dx) + (lookMove.offsetAngle || 0)) % pi2;
                    }
                }
            }
        });
    }

    updateSpaceships(isBackground = false) {
        const timeFactor = (window.$gameDate && window.$gameDate.getTickPerMin() > 0) 
            ? (60 / window.$gameDate.getTickPerMin()) 
            : 1;
        
        this.spaceships.forEach(ship => {
            if (!ship) return;

            // Synchronisation de position pour vaisseaux à bord ou amarrés
            if (ship.isOnBoard() || ship.isDocked()) {
                const hostId = ship.isOnBoard() || ship.isDocked();
                const hostShip = window.$gameSpaceships ? window.$gameSpaceships.ship(hostId) : null;
                if (hostShip && hostShip !== ship) {
                    ship.x = hostShip.x;
                    ship.y = hostShip.y;
                    ship.systemId = hostShip.systemId;
                    ship.sectorId = hostShip.sectorId;
                }
                // Si à bord d'un hangar, pas de navigation autonome
                if (ship.isOnBoard()) return;
            } else if (ship.isLanded()) {
                const planetId = ship.isLanded();
                const curSys = window.$gameSector ? window.$gameSector.currentSystem() : null;
                let planet = curSys ? curSys.planet(planetId) : null;
                if (!planet && window.$gameSector) {
                    for (const sys of window.$gameSector.systems()) {
                        const p = sys.planet(planetId);
                        if (p) {
                            planet = p;
                            ship.systemId = sys.id;
                            break;
                        }
                    }
                }
                if (planet) {
                    ship.x = planet.x;
                    ship.y = planet.y;
                }
                return;
            }

            // 1. Saut Inter-système
            if (ship.status === "InterSystemJump") {
                const finished = ship.updateInterSystemJump(timeFactor);
                if (finished) {
                    const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
                    const targetSys = window.$gameSector ? window.$gameSector.system(ship.systemId) : null;
                    const sysName = targetSys ? (typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(targetSys.name) : targetSys.name) : loc("travel.system_default", "Système");
                    const msg = loc("travel.log_warp_arrival", "Le %1 a émergé du Warp dans le système %2.").replace("%1", ship.name).replace("%2", sysName);
                    this.log("alert", msg);
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
                        const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
                        const pName = typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(planet.name) : planet.name;
                        if (planet.isStation && planet.isStation()) {
                            const msg = loc("travel.log_station_contact", "Le %1 est entré en contact avec %2.").replace("%1", ship.name).replace("%2", pName);
                            this.log("basicInfos", msg);
                        } else {
                            const msg = loc("travel.log_orbit_arrival", "Le %1 est entré en orbite stationnaire autour de %2.").replace("%1", ship.name).replace("%2", pName);
                            this.log("basicInfos", msg);
                        }
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
                        const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
                        const msg = loc("travel.log_contact_arrival", "Le %1 est entré en contact avec le %2.").replace("%1", ship.name).replace("%2", targetShip.name);
                        this.log("basicInfos", msg);
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
                    const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
                    const coords = `${ship.targetX}-${ship.targetY}`;
                    const msg = loc("travel.log_coords_reached", "Le %1 a atteint les coordonnées %2.").replace("%1", ship.name).replace("%2", coords);
                    this.log("infos", msg);
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
    const nefVarId = Number(parameters["nefVariableId"] || 41);

    window.SC4 = window.SC4 || {};
    window.SC4.nefVariableId = nefVarId;

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        // Simulation en tâche de fond si le joueur est sur la carte normale
        if (enableBgSim && window.$systemMapManager) {
            window.$systemMapManager.update(true);
        }
    };

    // ========================================================================
    // 6. EXTENSIONS GAME_SYSTEM (DÉCOUVERTE POI & HISTORIQUE DES LOGS)
    // ========================================================================
    if (typeof Game_System !== "undefined") {
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
            if (window.$storyManager && typeof window.$storyManager.update === "function") {
                window.$storyManager.update();
            }
        };

        Game_System.prototype.isLandingAllowed = function(planetId) {
            const curSys = window.$gameSector ? window.$gameSector.currentSystem() : null;
            const pl = curSys ? curSys.planet(planetId) : null;
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
    }

})();
