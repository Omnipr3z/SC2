//=============================================================================
// RPG Maker MZ - SC4Space_Game_Sector
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Modèle de secteur stellaire et registre des systèmes planétaires.
 * @author SimCraft
 * @base SC4Space_Game_PlanetarySystem
 * 
 * @help SC4Space_Game_Sector.js
 * 
 * ============================================================================
 * GAME_SECTOR
 * ============================================================================
 * Modélise un secteur spatial galactique.
 * Fait partie intégrante de la cascade :
 * Galaxy -> Sectors -> Planetary Systems -> Planets -> POIs.
 * 
 * Triple rôle :
 * 1. Modèle d'objet : Données territoriales du secteur (segment, capitale,
 *    gouverneur de secteur, système courant).
 * 2. Intégration en cascade : Instancie et référence les Game_PlanetarySystem.
 * 3. Hub intermédiaire : Navigation montante vers $gameGalaxy et descendante
 *    vers les systèmes, planètes et POIs du secteur.
 * ============================================================================
 */

class Game_Sector extends Game_GalacticRepoBase {
    constructor(data = null, parentId = null) {
        super(data, parentId);
    }

    // ========================================================================
    // 1. INITIALISATION & CONFIGURATION
    // ========================================================================

    initMembers() {
        super.initMembers();
        this._hasSubObjects = true;
        this._subObjectsClassName = "Game_PlanetarySystem";
        this._subObjectsDatabaseSourceName = "$dataPlanetarySystems";
        this._subObjectsIdsKey = "systemsIds";
        this._savedDataKeys = [];
    }

    setupData(data) {
        if (data) {
            if (!Array.isArray(data.systemsIds)) {
                if (Array.isArray(data.systemIds)) {
                    data.systemsIds = data.systemIds;
                } else if (Array.isArray(data.systems)) {
                    data.systemsIds = data.systems.map(s => (s && s.id !== undefined ? s.id : s));
                }
            }
            if (!data.capitalSystemId && Array.isArray(data.systemsIds) && data.systemsIds.length > 0) {
                data.capitalSystemId = data.systemsIds[0];
            }
        }
        return super.setupData(data);
    }

    // ========================================================================
    // 2. PROPRIÉTÉS DU SECTEUR & GOUVERNANCE
    // ========================================================================

    get sectorId() { return this.id; }
    get sectorName() { return this.name; }
    get segment() { return (this._data && this._data.segment) || ""; }

    get capitalSystemId() {
        return (this._data && this._data.capitalSystemId) || (this.systems[0] ? this.systems[0].id : null);
    }

    get capitalSystem() {
        return this.getSystem(this.capitalSystemId);
    }

    get capitalPlanet() {
        const capSys = this.capitalSystem;
        return capSys ? capSys.capitalPlanet : null;
    }

    get governor() {
        const capPlanet = this.capitalPlanet;
        return (capPlanet && typeof capPlanet.governor === "function") ? capPlanet.governor() : null;
    }

    // ========================================================================
    // 3. NAVIGATION CONTEXTUELLE DANS LE SECTEUR (DÉLÉGUÉE À GALAXY / ACTEUR)
    // ========================================================================

    currentSystemId() {
        return this.galaxy ? this.galaxy.currentSystemId() : this.capitalSystemId;
    }

    currentSystem() {
        return this.galaxy ? this.galaxy.currentSystem() : this.capitalSystem;
    }

    setCurrentSystemId(systemId) {
        if (systemId === null || systemId === undefined) return;
        const exists = this.hasSubObject(systemId);
        if (!exists) {
            if (typeof DEBUGTOOL !== "undefined") {
                DEBUGTOOL.warn(`System id:${systemId} is not part of Sector id:${this.id} (${this.name})`);
            }
        }
        if (this.galaxy) {
            this.galaxy.setCurrentSystemId(systemId);
        }
    }

    // ========================================================================
    // 4. HUB VERS LES ENFANTS & LES ANCESTRES
    // ========================================================================

    get systems() {
        return this.getSubObjects();
    }

    getSystems() {
        return this.getSubObjects();
    }

    getSystem(systemId) {
        return this.getSubObject(systemId);
    }

    system(systemId) {
        return this.getSystem(systemId);
    }

    get planets() {
        return this.systems.flatMap(sys => (sys && typeof sys.planets !== "undefined" ? sys.planets : []));
    }

    getAllPlanets() {
        return this.planets;
    }

    get pois() {
        return this.planets.flatMap(planet => (planet && typeof planet.pois !== "undefined" ? planet.pois : []));
    }

    getAllPOIs() {
        return this.pois;
    }

    getPlanet(planetId) {
        if (planetId === null || planetId === undefined) return null;
        return this.planets.find(p => p && (p.id === planetId || String(p.id) === String(planetId))) || null;
    }

    getPOI(poiId) {
        if (!poiId) return null;
        return this.pois.find(p => p && (p.id === poiId || String(p.id) === String(poiId))) || null;
    }

    get galaxy() {
        return super.galaxy;
    }
}

window.Game_Sector = Game_Sector;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game_Sector;
}
