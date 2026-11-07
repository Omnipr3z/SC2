//=============================================================================
// SimCraft 4 - Space Parallaxes Manager
// SC4_SpaceParallaxesManager.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Gestionnaire d'état des parallaxes spatiales dynamiques (fond cinétique et astres en approche).
 * @author SimCraft 4 Core Team
 * @help
 * ============================================================================
 * ■ SC4_SpaceParallaxesManager : Moteur d'état des hublots spatiaux
 * ============================================================================
 * Calcule l'état dynamique des couches de parallaxes visibles depuis les hublots
 * intérieurs de vaisseau en fonction de la situation cinétique et orbitale.
 *
 * 1. Couche basse (Lower Layer) :
 *    - Immobile (Static / Orbiting) : Vitesse nulle (fond figé).
 *    - En propulsion (MoveToDest / MoveToOrbit) : Défilement orienté selon le cap
 *      de la carte ($gameMap.shipHeadingVector()) proportionnel à ship.speed.
 *    - En saut FTL (InterSystemJump) : Animation Warp accélérée.
 *
 * 2. Couche intermédiaire (Mid / Depth Layer) :
 *    - Étoiles rapprochées (Stars.png sur fond transparent).
 *    - Défilement cinétique à coefficient de profondeur x1.6 (masqué en Warp).
 *
 * 3. Couche haute (Upper Layer) :
 *    - Planète ciblée, orbitée ou en approche selon le champ de vision 178x99 px.
 *    - Échelle adaptée à l'écran hublot (zoom x10 par rapport à SpaceTravel) et rotation.
 * ============================================================================
 */

(function () {
    "use strict";

    class SpaceParallaxesManager {
        /**
         * Résout l'instance du vaisseau ciblé.
         * @param {number|string|null} shipId 
         * @returns {Game_Spaceship|null}
         */
        static resolveShip(shipId) {
            const spaceships = (typeof $gameSpaceships !== "undefined" && $gameSpaceships)
                ? $gameSpaceships
                : (typeof window !== "undefined" ? window.$gameSpaceships : null);
            if (!spaceships) return null;

            if (shipId === "player" || shipId === null || shipId === undefined) {
                return typeof spaceships.playerShip === "function" ? spaceships.playerShip() : null;
            }
            if (typeof spaceships.ship === "function") {
                return spaceships.ship(Number(shipId));
            }
            return null;
        }

        /**
         * Calcule et renvoie l'état instantané des parallaxes d'un vaisseau.
         * @param {number|string|null} shipId 
         * @returns {{ lower: object, mid: object, upper: object }|null}
         */
        static getParallaxesStatus(shipId) {
            const ship = this.resolveShip(shipId);
            if (!ship) return null;

            // ----------------------------------------------------------------
            // 1. ÉTAT COUCHE BASSE & COUCHE INTERMÉDIAIRE (PROFONDEUR ÉTOILES)
            // ----------------------------------------------------------------
            const mapHeading = (typeof $gameMap !== "undefined" && $gameMap && typeof $gameMap.shipHeadingVector === "function")
                ? $gameMap.shipHeadingVector()
                : { x: 0, y: -3 };

            let lower = {
                name: "StarlitSky",
                loopX: false,
                loopY: false,
                sx: 0,
                sy: 0
            };

            let mid = {
                name: "Stars",
                loopX: false,
                loopY: false,
                sx: 0,
                sy: 0,
                visible: true
            };

            if (ship._status === "InterSystemJump" || (typeof ship.isHyperdrive === "function" && ship.isHyperdrive())) {
                lower = {
                    name: "Warp",
                    loopX: true,
                    loopY: false,
                    sx: 8,
                    sy: 0
                };
                mid = {
                    name: "Stars",
                    loopX: false,
                    loopY: false,
                    sx: 0,
                    sy: 0,
                    visible: false
                };
            } else if (typeof ship.isMoving === "function" && ship.isMoving()) {
                const speed = typeof ship.speed === "number" ? ship.speed : 0.5;
                const speedRatio = speed / 0.5;
                const baseSx = mapHeading.x * speedRatio;
                const baseSy = mapHeading.y * speedRatio;

                lower = {
                    name: "StarlitSky",
                    loopX: (mapHeading.x !== 0),
                    loopY: (mapHeading.y !== 0),
                    sx: baseSx,
                    sy: baseSy
                };

                // Couche intermédiaire (étoiles plus proches -> vitesse x1.6 pour la profondeur)
                mid = {
                    name: "Stars",
                    loopX: (mapHeading.x !== 0),
                    loopY: (mapHeading.y !== 0),
                    sx: baseSx * 1.6,
                    sy: baseSy * 1.6,
                    visible: true
                };
            } else {
                // Immobile, au sol ou en orbite stationnaire
                lower = {
                    name: "StarlitSky",
                    loopX: false,
                    loopY: false,
                    sx: 0,
                    sy: 0
                };
                mid = {
                    name: "Stars",
                    loopX: false,
                    loopY: false,
                    sx: 0,
                    sy: 0,
                    visible: true
                };
            }

            // ----------------------------------------------------------------
            // 2. ÉTAT COUCHE HAUTE (PLANÈTE EN VUE)
            // ----------------------------------------------------------------
            let upper = {
                visible: false,
                bitmapName: null,
                screenX: 0,
                screenY: 0,
                rotation: 0,
                zoom: 1.0
            };

            const isLanded = (typeof ship.isLanded === "function" && ship.isLanded() !== null);
            if (!isLanded) {
                const galaxy = (typeof $gameGalaxy !== "undefined" && $gameGalaxy) ? $gameGalaxy : (typeof window !== "undefined" ? window.$gameGalaxy : null);
                const currentSys = (galaxy && typeof galaxy.currentSystem === "function") ? galaxy.currentSystem() : null;

                const boxW = (typeof Graphics !== "undefined" && Graphics.width) ? Graphics.width : 1280;
                const boxH = (typeof Graphics !== "undefined" && Graphics.height) ? Graphics.height : 720;
                const centerX = Math.floor(boxW / 2);
                const centerY = Math.floor(boxH / 2);
                const halfW = 89;   // 178 / 2
                const halfH = 49.5; // 99 / 2

                if (ship._status === "Orbiting") {
                    let targetPlanet = ship.orbitingPlanet || (currentSys && ship.orbitingPlanetId !== null && ship.orbitingPlanetId !== undefined ? currentSys.planet(ship.orbitingPlanetId) : null);
                    if (targetPlanet) {
                        const baseZoom = (typeof targetPlanet.zoom === "number") ? targetPlanet.zoom : 0.1;
                        upper = {
                            visible: true,
                            bitmapName: targetPlanet.bitmapName,
                            screenX: centerX,
                            screenY: centerY,
                            rotation: targetPlanet.rotationAngle || 0,
                            zoom: baseZoom * 10
                        };
                    }
                } else if (typeof ship.x === "number" && typeof ship.y === "number") {
                    let heading = (typeof ship.headingAngle === "number")
                        ? ship.headingAngle
                        : ((typeof ship._headingAngle === "number") ? ship._headingAngle : -Math.PI / 2);

                    if (typeof ship.isMoving === "function" && ship.isMoving()) {
                        let destX = (typeof ship.targetX === "number") ? ship.targetX : null;
                        let destY = (typeof ship.targetY === "number") ? ship.targetY : null;

                        if (ship._status === "MoveToOrbit") {
                            const orbitP = ship.orbitingPlanet || (currentSys && ship.orbitingPlanetId !== null && ship.orbitingPlanetId !== undefined ? currentSys.planet(ship.orbitingPlanetId) : null);
                            if (orbitP && typeof orbitP.x === "number" && typeof orbitP.y === "number") {
                                destX = orbitP.x;
                                destY = orbitP.y;
                            }
                        } else if (ship._status === "MoveToContact" && ship.contactShip) {
                            destX = ship.contactShip.x;
                            destY = ship.contactShip.y;
                        }

                        if (destX !== null && destY !== null) {
                            const vx = destX - ship.x;
                            const vy = destY - ship.y;
                            if (Math.hypot(vx, vy) > 0.001) {
                                heading = Math.atan2(vy, vx);
                                ship._headingAngle = heading;
                            }
                        }
                    }

                    const cosH = Math.cos(heading);
                    const sinH = Math.sin(heading);

                    let targetPlanet = null;
                    let targetFwd = 0;
                    let targetRight = 0;

                    if (ship._status === "MoveToOrbit") {
                        const orbitP = ship.orbitingPlanet || (currentSys && ship.orbitingPlanetId !== null && ship.orbitingPlanetId !== undefined ? currentSys.planet(ship.orbitingPlanetId) : null);
                        if (orbitP && typeof orbitP.x === "number" && typeof orbitP.y === "number") {
                            const dx = orbitP.x - ship.x;
                            const dy = orbitP.y - ship.y;
                            const fwd = dx * cosH + dy * sinH;
                            const right = -dx * sinH + dy * cosH;
                            if (Math.abs(right) <= halfW && Math.abs(fwd) <= halfH) {
                                targetPlanet = orbitP;
                                targetFwd = fwd;
                                targetRight = right;
                            }
                        }
                    }

                    if (!targetPlanet && currentSys && Array.isArray(currentSys.planets)) {
                        let minDistance = Infinity;
                        for (const p of currentSys.planets) {
                            if (!p || typeof p.x !== "number" || typeof p.y !== "number") continue;
                            const dx = p.x - ship.x;
                            const dy = p.y - ship.y;
                            const fwd = dx * cosH + dy * sinH;
                            const right = -dx * sinH + dy * cosH;
                            if (Math.abs(right) <= halfW && Math.abs(fwd) <= halfH) {
                                const dist = Math.hypot(dx, dy);
                                if (dist < minDistance) {
                                    minDistance = dist;
                                    targetPlanet = p;
                                    targetFwd = fwd;
                                    targetRight = right;
                                }
                            }
                        }
                    }

                    if (targetPlanet) {
                        const baseZoom = (typeof targetPlanet.zoom === "number") ? targetPlanet.zoom : 0.1;
                        upper = {
                            visible: true,
                            bitmapName: targetPlanet.bitmapName,
                            screenX: Math.round(centerX + targetRight * (boxW / 178)),
                            screenY: Math.round(centerY - targetFwd * (boxH / 99)),
                            rotation: targetPlanet.rotationAngle || 0,
                            zoom: baseZoom * 10
                        };
                    }
                }
            }

            return { lower, mid, upper };
        }
    }

    // Export global
    if (typeof window !== "undefined") {
        window.SpaceParallaxesManager = SpaceParallaxesManager;
        window.SC4_SpaceParallaxesManager = SpaceParallaxesManager;
    }
    if (typeof global !== "undefined") {
        global.SpaceParallaxesManager = SpaceParallaxesManager;
        global.SC4_SpaceParallaxesManager = SpaceParallaxesManager;
    }
})();

