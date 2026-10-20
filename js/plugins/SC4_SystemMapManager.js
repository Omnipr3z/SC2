//=============================================================================
// RPG Maker MZ - SC4_SystemMapManager
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Moteur de boucle orbitale et simulation temps réel ($systemMapManager).
 * @author SimCraft
 * @base SC4_Game_Planet
 * @base SC4_Game_PlanetarySystem
 * @base SC4_Game_Sector
 * @base SC4_Game_Spaceship
 * @base SC4_Game_Spaceships
 * 
 * @help SC4_SystemMapManager.js
 */

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

window.SystemMapManager = SystemMapManager;
if (typeof global !== "undefined") {
    global.SystemMapManager = SystemMapManager;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { SystemMapManager };
}
