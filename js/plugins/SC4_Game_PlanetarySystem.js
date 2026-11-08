//=============================================================================
// RPG Maker MZ - SC4Space_Game_PlanetarySystem
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Modèle de système stellaire et registre des astres/planètes.
 * @author SimCraft
 * @base SC4Space_Game_Planet
 * 
 * @help SC4Space_Game_PlanetarySystem.js
 * 
 * ============================================================================
 * GAME_PLANETARYSYSTEM
 * ============================================================================
 * Modélise un système stellaire (étoile et corps célestes en orbite).
 * Fait partie intégrante de la cascade :
 * Galaxy -> Sectors -> Planetary Systems -> Planets -> POIs.
 * 
 * Triple rôle :
 * 1. Modèle d'objet : Données physiques et stellaires (type et couleur d'étoile,
 *    coordonnées galactiques, connexions hyper-spatiales, point d'entrée, capitale).
 * 2. Intégration en cascade : Instancie et référence l'ensemble des Game_Planet.
 * 3. Hub intermédiaire : Navigation montante vers le Game_Sector parent et
 *    descendante vers les planètes et POIs du système.
 * ============================================================================
 */

class Game_PlanetarySystem extends Game_GalacticRepoBase {
    constructor(data = null, parentId = null) {
        super(data, parentId);
    }

    // ========================================================================
    // 1. INITIALISATION & CONFIGURATION
    // ========================================================================

    initMembers() {
        super.initMembers();
        this._hasSubObjects = true;
        this._subObjectsClassName = "Game_Planet";
        this._subObjectsDatabaseSourceName = "$dataPlanets";
        this._subObjectsIdsKey = "planetIds";
        this._savedDataKeys = [];

        this._starType = "Yellow Star";
        this._starColor = "#ffffff";
        this._pos = { x: 0, y: 0 };
        this._connections = [];
        this._entryPoint = { x: 640, y: 320 };
        this._planetIds = [];
        this._capitalPlanetId = null;
    }

    setup(data, parentId = null) {
        const res = super.setup(data, parentId);
        if (!this._data) return res;

        this._starType = this._data.starType || "Yellow Star";
        this._starColor = this._data.starColor || "#ffffff";
        this._pos = this._data.pos || { x: 0, y: 0 };
        this._connections = Array.isArray(this._data.connections) ? [...this._data.connections] : [];
        this._entryPoint = this._data.entryPoint || { x: 640, y: 320 };
        this._planetIds = Array.isArray(this._data.planetIds) ? [...this._data.planetIds] : [];
        this._capitalPlanetId = this._data.capital !== undefined ? this._data.capital : (this._data.capitalPlanetId || null);

        return res;
    }

    // ========================================================================
    // 2. PROPRIÉTÉS STELLAIRES & CONFIGURATION SYSTÈME
    // ========================================================================

    get starType() { return this._starType; }
    get starColor() { return this._starColor; }
    get pos() { return this._pos; }
    get position() { return this._pos; }
    get connections() { return this._connections; }
    get entryPoint() { return this._entryPoint; }
    get planetIds() { return this._planetIds; }
    get capitalPlanetId() { return this._capitalPlanetId; }

    get capitalPlanet() {
        const targetId = this._capitalPlanetId || (this.planets[0] ? this.planets[0].id : null);
        return this.getPlanet(targetId);
    }

    // ========================================================================
    // 3. NAVIGATION CONTEXTUELLE DANS LE SYSTÈME (DÉLÉGUÉE À GALAXY / ACTEUR)
    // ========================================================================

    currentPlanetId() {
        return this.galaxy ? this.galaxy.currentPlanetId() : (this.capitalPlanet ? this.capitalPlanet.id : null);
    }

    currentPlanet() {
        return this.galaxy ? this.galaxy.currentPlanet() : this.capitalPlanet;
    }

    setCurrentPlanetId(planetId) {
        if (planetId !== null && planetId !== undefined) {
            const exists = this.hasSubObject(planetId);
            if (!exists) {
                if (typeof DEBUGTOOL !== "undefined") {
                    DEBUGTOOL.warn(`Planet id:${planetId} is not part of System id:${this.id} (${this.name})`);
                }
            }
        }
        if (this.galaxy) {
            this.galaxy.setCurrentPlanetId(planetId);
        }
    }

    // ========================================================================
    // 4. HUB VERS LES ENFANTS & LES ANCESTRES
    // ========================================================================

    get planets() {
        return this.getSubObjects();
    }

    getPlanets() {
        return this.getSubObjects();
    }

    getPlanet(targetId) {
        return this.getSubObject(targetId);
    }

    planet(targetId) {
        return this.getPlanet(targetId);
    }

    get pois() {
        return this.planets.flatMap(planet => (planet && typeof planet.pois !== "undefined" ? planet.pois : []));
    }

    getAllPOIs() {
        return this.pois;
    }

    getPOI(poiId) {
        if (!poiId) return null;
        return this.pois.find(p => p && (p.id === poiId || String(p.id) === String(poiId))) || null;
    }

    get sector() {
        return this.parent;
    }

    get galaxy() {
        return super.galaxy;
    }
}

window.Game_PlanetarySystem = Game_PlanetarySystem;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game_PlanetarySystem;
}

