//=============================================================================
// RPG Maker MZ - SC4Space_Game_Galaxy
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Modèle de la galaxie et registre racine des secteurs.
 * @author SimCraft
 * @base SC4Space_Game_GalacticRepoBase
 * 
 * @help SC4Space_Game_Galaxy.js
 * 
 * ============================================================================
 * GAME_GALAXY
 * ============================================================================
 * Classe racine de l'architecture spatiale hiérarchique SimCraft 4 :
 * Galaxy -> Sectors -> Planetary Systems -> Planets -> POIs.
 * 
 * L'instance globale unique $gameGalaxy est le point d'entrée souverain de
 * l'univers spatial en jeu.
 * 
 * Triple rôle :
 * 1. Modèle d'objet : Données galactiques globales et centralisation des méthodes
 *    d'accès à la localisation spatiale du joueur (liée à l'acteur leader du groupe).
 * 2. Intégration en cascade : Instancie et référence l'ensemble des Game_Sector.
 * 3. Hub universel : Accès rapide en cascade (allPlanetarySystems, allPlanets,
 *    allPOIs) et recherche universelle d'entités par ID.
 * ============================================================================
 */

class Game_Galaxy extends Game_GalacticRepoBase {
    constructor(data = null) {
        super(data, null);
    }

    // ========================================================================
    // 1. INITIALISATION & CONFIGURATION
    // ========================================================================

    initMembers() {
        super.initMembers();
        this._hasSubObjects = true;
        this._subObjectsClassName = "Game_Sector";
        this._subObjectsDatabaseSourceName = "$dataSectors";
        this._subObjectsIdsKey = "sectorIds";
        this._savedDataKeys = ["_defaultPosition"];

        // Position de repli hors session de jeu / avant initialisation de $gameParty
        this._defaultPosition = {
            sectorId: 1,
            systemId: 1,
            planetId: null,
            poiId: null
        };
    }

    setupData(data) {
        if (!data) {
            const dataSectors = typeof window !== "undefined" ? window.$dataSectors : (typeof global !== "undefined" ? global.$dataSectors : null);
            const sectorIds = Array.isArray(dataSectors)
                ? dataSectors.filter(s => s && s.id !== undefined).map(s => s.id)
                : [1];

            const existingGalaxy = typeof window !== "undefined" ? window.$dataGalaxy : (typeof global !== "undefined" ? global.$dataGalaxy : null);
            data = existingGalaxy || {
                id: 1,
                name: "Galaxie SimCraft",
                description: "Ensemble des secteurs stellaires connus",
                sectorIds: sectorIds
            };
        }

        if (!Array.isArray(data.sectorIds)) {
            const dataSectors = typeof window !== "undefined" ? window.$dataSectors : (typeof global !== "undefined" ? global.$dataSectors : null);
            data.sectorIds = Array.isArray(dataSectors)
                ? dataSectors.filter(s => s && s.id !== undefined).map(s => s.id)
                : [1];
        }

        return super.setupData(data);
    }

    // ========================================================================
    // 2. CENTRALISATION DE LA LOCALISATION DU JOUEUR (LIÉE À L'ACTEUR LEADER)
    // ========================================================================

    /**
     * Résout l'acteur de référence (le leader du groupe du joueur).
     * @returns {Game_Actor|null}
     */
    currentActor() {
        if (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.leader === "function") {
            return $gameParty.leader();
        }
        if (typeof window !== "undefined" && window.$gameParty && typeof window.$gameParty.leader === "function") {
            return window.$gameParty.leader();
        }
        return null;
    }

    // --- SECTEUR COURANT ---
    currentSectorId() {
        const actor = this.currentActor();
        if (actor) {
            if (actor._currentSectorId !== undefined && actor._currentSectorId !== null) return actor._currentSectorId;
            if (actor._currentSector !== undefined && actor._currentSector !== null) {
                return typeof actor._currentSector === "object" ? actor._currentSector.id : actor._currentSector;
            }
        }
        return this._defaultPosition.sectorId;
    }

    currentSector() {
        return this.getSector(this.currentSectorId());
    }

    setCurrentSectorId(sectorId) {
        const actor = this.currentActor();
        if (actor) {
            actor._currentSectorId = sectorId;
            actor._currentSector = sectorId;
        } else {
            this._defaultPosition.sectorId = sectorId;
        }
    }

    // --- SYSTÈME COURANT ---
    currentSystemId() {
        const actor = this.currentActor();
        if (actor) {
            if (actor._currentSystemId !== undefined && actor._currentSystemId !== null) return actor._currentSystemId;
            if (actor._currentSystem !== undefined && actor._currentSystem !== null) {
                return typeof actor._currentSystem === "object" ? actor._currentSystem.id : actor._currentSystem;
            }
        }
        const curSec = this.currentSector();
        return (curSec && curSec.capitalSystemId) || this._defaultPosition.systemId;
    }

    currentSystem() {
        return this.getSystem(this.currentSystemId());
    }

    setCurrentSystemId(systemId) {
        const actor = this.currentActor();
        if (actor) {
            actor._currentSystemId = systemId;
            actor._currentSystem = systemId;
        } else {
            this._defaultPosition.systemId = systemId;
        }
    }

    // --- PLANÈTE COURANTE ---
    currentPlanetId() {
        const actor = this.currentActor();
        if (actor) {
            if (actor._currentPlanetId !== undefined && actor._currentPlanetId !== null) return actor._currentPlanetId;
            if (actor._currentPlanet !== undefined && actor._currentPlanet !== null) {
                return typeof actor._currentPlanet === "object" ? actor._currentPlanet.id : actor._currentPlanet;
            }
        }
        return this._defaultPosition.planetId;
    }

    currentPlanet() {
        const pId = this.currentPlanetId();
        return pId !== null && pId !== undefined ? this.getPlanet(pId) : null;
    }

    setCurrentPlanetId(planetId) {
        const actor = this.currentActor();
        if (actor) {
            actor._currentPlanetId = planetId;
            actor._currentPlanet = planetId;
        } else {
            this._defaultPosition.planetId = planetId;
        }
    }

    // --- POI COURANT ---
    currentPOIId() {
        const actor = this.currentActor();
        if (actor) {
            if (actor._currentPOIId !== undefined && actor._currentPOIId !== null) return actor._currentPOIId;
            if (actor._currentPoiId !== undefined && actor._currentPoiId !== null) return actor._currentPoiId;
            if (actor._currentPOI !== undefined && actor._currentPOI !== null) {
                return typeof actor._currentPOI === "object" ? actor._currentPOI.id : actor._currentPOI;
            }
            if (actor._currentPoi !== undefined && actor._currentPoi !== null) {
                return typeof actor._currentPoi === "object" ? actor._currentPoi.id : actor._currentPoi;
            }
        }
        return this._defaultPosition.poiId;
    }

    currentPoiId() {
        return this.currentPOIId();
    }

    currentPOI() {
        const poiId = this.currentPOIId();
        return poiId ? this.getPOI(poiId) : null;
    }

    currentPoi() {
        return this.currentPOI();
    }

    setCurrentPOIId(poiId) {
        const actor = this.currentActor();
        if (actor) {
            actor._currentPOIId = poiId;
            actor._currentPoiId = poiId;
            actor._currentPOI = poiId;
            actor._currentPoi = poiId;
        } else {
            this._defaultPosition.poiId = poiId;
        }
    }

    setCurrentPoiId(poiId) {
        this.setCurrentPOIId(poiId);
    }

    setCurrentPosition(sectorId, systemId = null, planetId = null, poiId = null) {
        this.setCurrentSectorId(sectorId);
        this.setCurrentSystemId(systemId);
        this.setCurrentPlanetId(planetId);
        this.setCurrentPOIId(poiId);
    }

    // ========================================================================
    // 3. HUB VERS LES SECTEURS & RECHERCHE GLOBALE EN CASCADE
    // ========================================================================

    get sectors() {
        return this.getSubObjects();
    }

    getSector(sectorId) {
        return this.getSubObject(sectorId);
    }

    get allPlanetarySystems() {
        return this.sectors.flatMap(sector => (sector && typeof sector.systems !== "undefined" ? sector.systems : []));
    }

    get allPlanets() {
        return this.allPlanetarySystems.flatMap(sys => (sys && typeof sys.planets !== "undefined" ? sys.planets : []));
    }

    get allPOIs() {
        return this.allPlanets.flatMap(planet => (planet && typeof planet.pois !== "undefined" ? planet.pois : []));
    }

    getSystem(systemId) {
        if (systemId === null || systemId === undefined) return null;
        return this.allPlanetarySystems.find(s => s && (s.id === systemId || String(s.id) === String(systemId))) || null;
    }

    getPlanet(planetId) {
        if (planetId === null || planetId === undefined) return null;
        return this.allPlanets.find(p => p && (p.id === planetId || String(p.id) === String(planetId))) || null;
    }

    getPOI(poiId) {
        if (!poiId) return null;
        return this.allPOIs.find(poi => poi && (poi.id === poiId || String(poi.id) === String(poiId))) || null;
    }
}

window.Game_Galaxy = Game_Galaxy;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game_Galaxy;
}
