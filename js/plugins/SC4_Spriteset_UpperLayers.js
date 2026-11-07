//=============================================================================
// SimCraft 4 - Spriteset Upper Layers
// SC4_Spriteset_UpperLayers.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Conteneur multi-couches pour les astres et vaisseaux visibles par les hublots spatiaux.
 * @author SimCraft 4 Core Team
 * @help
 * ============================================================================
 * ■ SC4_Spriteset_UpperLayers : Conteneur multi-astres & vaisseaux hublot
 * ============================================================================
 * Gère une collection indexée de sprites (planètes et vaisseaux tiers) affichés
 * dans Spriteset_Map. Indexe les corps célestes selon $gameGalaxy.currentSystem()
 * et met à jour leurs états en fonction des calculs du SpaceParallaxesManager.
 * ============================================================================
 */

(function () {
    "use strict";

    const ContainerBase = (typeof PIXI !== "undefined" && PIXI.Container) ? PIXI.Container : class {
        constructor() {
            this.children = [];
            this.visible = true;
        }
        addChild(c) { this.children.push(c); return c; }
        removeChildren() { this.children = []; }
    };

    class Spriteset_UpperLayers extends ContainerBase {
        constructor(systemId) {
            super();
            this._currentSystemId = (systemId !== undefined) ? systemId : null;

            this._planetsContainer = (typeof PIXI !== "undefined" && PIXI.Container) ? new PIXI.Container() : new ContainerBase();
            this._shipsContainer = (typeof PIXI !== "undefined" && PIXI.Container) ? new PIXI.Container() : new ContainerBase();

            if (this._planetsContainer && typeof this.addChild === "function") {
                this.addChild(this._planetsContainer);
            }
            if (this._shipsContainer && typeof this.addChild === "function") {
                this.addChild(this._shipsContainer);
            }

            this._planets = new Map();
            this._ships = new Map();

            this.setupPlanets();
            this.setupShips();
        }

        isPlanetarySystemChanging() {
            const galaxy = (typeof $gameGalaxy !== "undefined" && $gameGalaxy) ? $gameGalaxy : (typeof window !== "undefined" ? window.$gameGalaxy : null);
            const sys = (galaxy && typeof galaxy.currentSystem === "function") ? galaxy.currentSystem() : null;
            const currentId = sys ? sys.id : null;
            return this._currentSystemId !== currentId;
        }

        reloadSystem() {
            const galaxy = (typeof $gameGalaxy !== "undefined" && $gameGalaxy) ? $gameGalaxy : (typeof window !== "undefined" ? window.$gameGalaxy : null);
            const sys = (galaxy && typeof galaxy.currentSystem === "function") ? galaxy.currentSystem() : null;
            this._currentSystemId = sys ? sys.id : null;
            this.setupPlanets();
            this.setupShips();
        }

        setupPlanets() {
            if (this._planetsContainer && typeof this._planetsContainer.removeChildren === "function") {
                this._planetsContainer.removeChildren();
            }
            this._planets.clear();

            const galaxy = (typeof $gameGalaxy !== "undefined" && $gameGalaxy) ? $gameGalaxy : (typeof window !== "undefined" ? window.$gameGalaxy : null);
            const sys = (galaxy && typeof galaxy.currentSystem === "function") ? galaxy.currentSystem() : null;
            if (!sys) return;

            const planetIds = (sys._data && Array.isArray(sys._data.planetIds))
                ? sys._data.planetIds
                : (Array.isArray(sys.planets) ? sys.planets.map(p => p.id) : []);

            const SpriteClass = (typeof Sprite_ParallaxesUpperLayer !== "undefined")
                ? Sprite_ParallaxesUpperLayer
                : (typeof window !== "undefined" ? window.Sprite_ParallaxesUpperLayer : null);
            if (!SpriteClass) return;

            for (const planetId of planetIds) {
                const planet = typeof sys.planet === "function" ? sys.planet(planetId) : null;
                if (!planet) continue;

                const sprite = new SpriteClass();
                if (typeof sprite.preloadBitmap === "function") {
                    sprite.preloadBitmap(planet.bitmapName);
                } else if (planet.bitmapName && typeof ImageManager !== "undefined" && typeof ImageManager.loadBitmap === "function") {
                    const cleanName = String(planet.bitmapName).replace(/\.png$/i, "");
                    sprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", cleanName);
                }
                sprite.visible = false;
                this._planets.set(planetId, sprite);
                if (this._planetsContainer && typeof this._planetsContainer.addChild === "function") {
                    this._planetsContainer.addChild(sprite);
                }
            }
        }

        setupShips() {
            if (this._shipsContainer && typeof this._shipsContainer.removeChildren === "function") {
                this._shipsContainer.removeChildren();
            }
            this._ships.clear();
        }

        updateState(upperState) {
            if (this.isPlanetarySystemChanging()) {
                this.reloadSystem();
            }

            if (!upperState || !upperState.visible) {
                this.visible = false;
                return;
            }
            this.visible = true;

            if (upperState.planets) {
                this.updatePlanets(upperState.planets);
            }
            if (upperState.ships) {
                this.updateShips(upperState.ships);
            }
        }

        updatePlanets(planetsData) {
            for (const [planetId, data] of Object.entries(planetsData)) {
                const sprite = this._planets.get(Number(planetId));
                if (sprite) {
                    sprite.updateState(data);
                }
            }
        }

        updateShips(shipsData) {
            // Traitement spécifique des vaisseaux tiers
        }
    }

    // Export global
    if (typeof window !== "undefined") {
        window.Spriteset_UpperLayers = Spriteset_UpperLayers;
        window.SC4_Spriteset_UpperLayers = Spriteset_UpperLayers;
    }
    if (typeof global !== "undefined") {
        global.Spriteset_UpperLayers = Spriteset_UpperLayers;
        global.SC4_Spriteset_UpperLayers = Spriteset_UpperLayers;
    }
})();

