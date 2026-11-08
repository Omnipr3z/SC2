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
 *    - Immobile (Static / Orbiting) : Fond d'étoiles figé.
 *    - En propulsion (MoveToDest / MoveToOrbit) : Défilement orienté selon le cap.
 *    - En saut FTL (InterSystemJump) : Animation Warp accélérée.
 *
 * 2. Couche intermédiaire (Mid / Depth Layer) :
 *    - Étoiles rapprochées avec défilement à profondeur x1.6 (masqué en Warp).
 *
 * 3. Couche haute (Upper Layer) :
 *    - Astres visibles projetés sur l'écran hublot avec Bounding-Box Culling.
 * ============================================================================
 */

class SpaceParallaxesManager {
        // ========================================================================
        // 1. CONFIGURATION & GETTERS D'ÉCHELLE (MODIFIABLES À LA VOLÉE)
        // ========================================================================

        /** Échelle de conversion système -> écran cockpit (x10 par défaut) */
        static get projectionScale() { return 10; }

        /** Multiplicateurs de zoom par type d'astre */
        static get planetZoomMultiplier()  { return 30; }
        static get moonZoomMultiplier()    { return 30; }
        static get starZoomMultiplier()    { return 4;  }
        static get stationZoomMultiplier() { return 2;  }
        static get vortexZoomMultiplier()  { return 4;  }
        static get beltZoomMultiplier()    { return 4;  }

        /**
         * Résout le multiplicateur de zoom approprié selon le type d'astre.
         * @param {object} p - Astre ou Game_Planet
         * @returns {number}
         */
        static resolveZoomMultiplier(p) {
            if (!p) return 1;
            const pType = String(p.type || p._type || "").toLowerCase();
            if (pType.includes("star") || pType.includes("etoile")) return this.starZoomMultiplier;
            if (pType.includes("station") || pType.includes("base") || (typeof p.isStation === "function" && p.isStation())) return this.stationZoomMultiplier;
            if (pType.includes("vortex")) return this.vortexZoomMultiplier;
            if (pType.includes("belt") || (typeof p.isBelt === "function" && p.isBelt())) return this.beltZoomMultiplier;
            if (pType.includes("moon")) return this.moonZoomMultiplier;
            return this.planetZoomMultiplier;
        }

        // ========================================================================
        // 2. ORCHESTRATEUR PRINCIPAL
        // ========================================================================

        /**
         * Résout l'instance du vaisseau ciblé.
         * @param {number|string|null} shipId 
         * @returns {Game_Spaceship|null}
         */
        static resolveShip(shipId) {
            const spaceships = (typeof $gameSpaceships !== "undefined") ? $gameSpaceships : null;
            if (!spaceships) return null;
            if (shipId === "player" || shipId === null || shipId === undefined) {
                return spaceships.playerShip();
            }
            return spaceships.ship(Number(shipId));
        }

        /**
         * Point d'entrée principal : calcule l'état instantané des 3 couches.
         * @param {number|string|null} shipId 
         * @returns {{ lower: object, mid: object, upper: object }|null}
         */
        static getParallaxesStatus(shipId) {
            const ship = this.resolveShip(shipId);
            if (!ship) return null;

            const { lower, mid } = this.computeBackgroundLayers(ship);
            const upper = this.computeUpperLayer(ship);

            return { lower, mid, upper };
        }

        // ========================================================================
        // 3. COUCHES D'ARRIÈRE-PLAN (BASSE & INTERMÉDIAIRE)
        // ========================================================================

        /**
         * Calcule les couches d'étoiles (fond lointain et étoiles de profondeur).
         * @param {Game_Spaceship} ship 
         * @returns {{ lower: object, mid: object }}
         */
        static computeBackgroundLayers(ship) {
            // Cas 1 : Saut FTL / Warp
            if (ship._status === "InterSystemJump" || (ship.isHyperdrive && ship.isHyperdrive())) {
                return {
                    lower: { name: "Warp", loopX: true, loopY: false, sx: 8, sy: 0 },
                    mid: { name: "Stars", loopX: false, loopY: false, sx: 0, sy: 0, visible: false }
                };
            }

            // Cas 2 : Propulsion conventionnelle sous la lumière
            if (ship.isMoving && ship.isMoving()) {
                const map = (typeof $gameMap !== "undefined") ? $gameMap : null;
                const mapHeading = (map && map.shipHeadingVector)
                    ? map.shipHeadingVector()
                    : { x: 0, y: -3 };
                const speed = ship.speed || 0.5;
                const speedRatio = speed / 0.5;
                const baseSx = mapHeading.x * speedRatio;
                const baseSy = mapHeading.y * speedRatio;

                return {
                    lower: {
                        name: "StarlitSky",
                        loopX: (mapHeading.x !== 0),
                        loopY: (mapHeading.y !== 0),
                        sx: baseSx,
                        sy: baseSy
                    },
                    mid: {
                        name: "Stars",
                        loopX: (mapHeading.x !== 0),
                        loopY: (mapHeading.y !== 0),
                        sx: baseSx * 1.6,
                        sy: baseSy * 1.6,
                        visible: true
                    }
                };
            }

            // Cas 3 : Immobile, orbite stationnaire ou atterri
            return {
                lower: { name: "StarlitSky", loopX: false, loopY: false, sx: 0, sy: 0 },
                mid: { name: "Stars", loopX: false, loopY: false, sx: 0, sy: 0, visible: true }
            };
        }

        // ========================================================================
        // 4. COUCHE HAUTE (ASTRES & VAISSEAUX)
        // ========================================================================

        /**
         * Calcule la couche haute (astres en champ de vision).
         * @param {Game_Spaceship} ship 
         * @returns {object}
         */
        static computeUpperLayer(ship) {
            const isWarp = ship._status === "InterSystemJump" || (ship.isHyperdrive && ship.isHyperdrive());
            const isLanded = ship.isLanded && ship.isLanded() !== null;

            if (isWarp || isLanded) {
                return { visible: false, planets: {}, ships: {} };
            }

            const galaxy = (typeof $gameGalaxy !== "undefined") ? $gameGalaxy : null;
            const currentSys = galaxy ? galaxy.currentSystem() : null;
            if (!currentSys) {
                return { visible: true, planets: {}, ships: {} };
            }

            const screen = this.getScreenParams();
            const heading = this.resolveShipHeading(ship, currentSys);
            const planets = this.computePlanetsInView(ship, currentSys, heading, screen);

            return {
                visible: true,
                planets,
                ships: {}
            };
        }

        /**
         * Paramètres géométriques de projection écran.
         * @returns {object}
         */
        static getScreenParams() {
            const boxW = Graphics.width || 1280;
            const boxH = Graphics.height || 720;
            const projScale = this.projectionScale;
            return {
                boxW,
                boxH,
                centerX: Math.floor(boxW / 2),
                centerY: Math.floor(boxH / 2),
                scaleX: (boxW / 178) * projScale,
                scaleY: (boxH / 99) * projScale
            };
        }

        /**
         * Détermine le cap angulaire du vaisseau (vers sa cible ou selon sa trajectoire).
         * @param {Game_Spaceship} ship 
         * @param {Game_PlanetarySystem} currentSys 
         * @returns {number}
         */
        static resolveShipHeading(ship, currentSys) {
            let heading = ship.headingAngle ?? ship._headingAngle ?? (-Math.PI / 2);

            if (ship.isMoving && ship.isMoving()) {
                const dest = this.resolveShipDestination(ship, currentSys);
                if (dest) {
                    const vx = dest.x - ship.x;
                    const vy = dest.y - ship.y;
                    if (Math.hypot(vx, vy) > 0.001) {
                        heading = Math.atan2(vy, vx);
                        ship._headingAngle = heading;
                    }
                }
            }
            return heading;
        }

        /**
         * Détermine la destination immédiate du vaisseau en mouvement.
         * @param {Game_Spaceship} ship 
         * @param {Game_PlanetarySystem} currentSys 
         * @returns {{x: number, y: number}|null}
         */
        static resolveShipDestination(ship, currentSys) {
            if (ship._status === "MoveToOrbit") {
                const orbitP = ship.orbitingPlanet || currentSys.planet(ship.orbitingPlanetId);
                if (orbitP && typeof orbitP.x === "number" && typeof orbitP.y === "number") {
                    return { x: orbitP.x, y: orbitP.y };
                }
            } else if (ship._status === "MoveToContact" && ship.contactShip) {
                return { x: ship.contactShip.x, y: ship.contactShip.y };
            } else if (typeof ship.targetX === "number" && typeof ship.targetY === "number") {
                return { x: ship.targetX, y: ship.targetY };
            }
            return null;
        }

        /**
         * Calcule et projette tous les astres du système présents dans le hublot.
         * @param {Game_Spaceship} ship 
         * @param {Game_PlanetarySystem} currentSys 
         * @param {number} heading 
         * @param {object} screen 
         * @returns {object}
         */
        static computePlanetsInView(ship, currentSys, heading, screen) {
            const planets = {};
            const cosH = Math.cos(heading);
            const sinH = Math.sin(heading);

            const planetList = (currentSys._data && Array.isArray(currentSys._data.planetIds))
                ? currentSys._data.planetIds.map(id => currentSys.planet(id)).filter(Boolean)
                : (Array.isArray(currentSys.planets) ? currentSys.planets : []);

            for (const p of planetList) {
                if (!p || typeof p.x !== "number" || typeof p.y !== "number") continue;

                const state = this.projectPlanet(p, ship, cosH, sinH, screen);
                if (state) {
                    planets[p.id] = state;
                }
            }

            return planets;
        }

        /**
         * Projette un astre donné et applique le Bounding-Box Culling (zéro pop-in).
         * @param {object} p - Astre
         * @param {Game_Spaceship} ship 
         * @param {number} cosH 
         * @param {number} sinH 
         * @param {object} screen 
         * @returns {object}
         */
        static projectPlanet(p, ship, cosH, sinH, screen) {
            const zoomMultiplier = this.resolveZoomMultiplier(p);
            const baseZoom = p.zoom || 0.1;
            const pZoom = baseZoom * zoomMultiplier;

            // 1. Orbite stationnaire : centré au milieu du hublot
            if (ship._status === "Orbiting" && (ship.orbitingPlanetId === p.id || ship.orbitingPlanet === p)) {
                return {
                    visible: true,
                    bitmapName: p.bitmapName,
                    screenX: screen.centerX,
                    screenY: screen.centerY,
                    rotation: p.rotationAngle || 0,
                    zoom: pZoom
                };
            }

            // 2. Broadphase culling rapide (> 300 unités sur la carte système)
            const dx = p.x - ship.x;
            const dy = p.y - ship.y;
            if (Math.abs(dx) > 300 || Math.abs(dy) > 300) {
                return { visible: false };
            }

            // 3. Coordonnées relatives orientées selon le cap du vaisseau
            const fwd = dx * cosH + dy * sinH;
            const right = -dx * sinH + dy * cosH;

            const screenX = Math.round(screen.centerX + right * screen.scaleX);
            const screenY = Math.round(screen.centerY - fwd * screen.scaleY);

            // 4. Bounding Box Culling : l'astre apparaît dès que son bord touche l'écran
            const visualRadiusPx = Math.ceil(350 * pZoom);
            const isVisible = (
                screenX + visualRadiusPx >= 0 &&
                screenX - visualRadiusPx <= screen.boxW &&
                screenY + visualRadiusPx >= 0 &&
                screenY - visualRadiusPx <= screen.boxH
            );

            if (!isVisible) {
                return { visible: false };
            }

            return {
                visible: true,
                bitmapName: p.bitmapName,
                screenX,
                screenY,
                rotation: p.rotationAngle || 0,
                zoom: pZoom
            };
        }
    }

    // Export global
    window.SpaceParallaxesManager = SpaceParallaxesManager;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = SpaceParallaxesManager;
    }
