//=============================================================================
// RPG Maker MZ - SC4_Game_POI
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Modèle de Point d'Intérêt (POI) et gestion d'atterrissage.
 * @author SimCraft
 * @base SC4_Game_GalacticRepoBase
 * 
 * @help SC4_Game_POI.js
 * 
 * ============================================================================
 * GAME_POI
 * ============================================================================
 * Modélise une destination / point d'intérêt précis (spatioport, balise, épave,
 * base orbitale, colonie minière).
 * 
 * Feuille terminale de la hiérarchie spatiale en cascade :
 * Galaxy -> Sectors -> Planetary Systems -> Planets -> POIs.
 * 
 * Triple rôle :
 * 1. Modèle d'objet : Données géographiques et de téléportation de carte
 *    (mapX, mapY, landingMapId, landingX, landingY, landingEventId).
 *    Maintien de l'état dynamique de partie (découvert/masqué, autorisation
 *    d'atterrissage).
 * 2. Intégration : En tant que feuille de l'arbre, _hasSubObjects est à false.
 * 3. Hub ascendant : Navigation montante directe vers l'astre parent (Game_Planet),
 *    le système (Game_PlanetarySystem), le secteur et la galaxie.
 * ============================================================================
 */

class Game_POI extends Game_GalacticRepoBase {
    constructor(data = null, parentId = null) {
        super(data, parentId);
    }

    // ========================================================================
    // 1. INITIALISATION & CONFIGURATION
    // ========================================================================

    initMembers() {
        super.initMembers();
        this._hasSubObjects = false;
        this._subObjectsClassName = null;
        this._subObjectsDatabaseSourceName = null;
        this._subObjectsIdsKey = "";
        this._savedDataKeys = ["_located", "_landingAuthorized"];

        this._icon = "poi_station";
        this._mapX = 0.5;
        this._mapY = 0.5;
        this._landingMapId = 0;
        this._landingX = 0;
        this._landingY = 0;
        this._landingEventId = 0;
        this._planetId = null;

        // États dynamiques de partie
        this._located = null;
        this._landingAuthorized = null;
    }

    setup(data, parentId = null) {
        const res = super.setup(data, parentId);
        if (!this._data) return res;

        this._icon = this._data.icon || "poi_station";
        this._mapX = typeof this._data.mapX === "number" ? this._data.mapX : 0.5;
        this._mapY = typeof this._data.mapY === "number" ? this._data.mapY : 0.5;
        this._landingMapId = this._data.landingMapId || 0;
        this._landingX = this._data.landingX || 0;
        this._landingY = this._data.landingY || 0;
        this._landingEventId = this._data.landingEventId || 0;
        this._planetId = this._data.planetId || parentId || null;

        return res;
    }

    // ========================================================================
    // 2. GETTERS DES PROPRIÉTÉS DU POI
    // ========================================================================

    get poiId() { return this.id; }
    get icon() { return this._icon; }
    get mapX() { return this._mapX; }
    get mapY() { return this._mapY; }
    get landingMapId() { return this._landingMapId; }
    get landingX() { return this._landingX; }
    get landingY() { return this._landingY; }
    get landingEventId() { return this._landingEventId; }
    get planetId() { return this._planetId || this.parentId; }

    // ========================================================================
    // 3. ÉTATS DYNAMIQUES : DÉCOUVERTE & ATTERRISSAGE
    // ========================================================================

    /**
     * Indique si le POI a été découvert.
     * @returns {boolean}
     */
    isLocated() {
        if (this._located !== null && this._located !== undefined) {
            return Boolean(this._located);
        }
        return this._data && this._data.located !== undefined ? Boolean(this._data.located) : true;
    }

    /**
     * Modifie l'état de découverte du POI et notifie QuestManager.
     * @param {boolean} [status=true]
     */
    setLocated(status = true) {
        this._located = Boolean(status);
        if (typeof window !== "undefined" && window.$questManager && typeof window.$questManager.update === "function") {
            window.$questManager.update();
        }
    }

    /**
     * Indique si l'atterrissage sur le POI est autorisé.
     * @returns {boolean}
     */
    isLandingAuthorized() {
        if (this._landingAuthorized !== null && this._landingAuthorized !== undefined) {
            return Boolean(this._landingAuthorized);
        }
        return this._data ? Boolean(this._data.landingAuthorized) : false;
    }

    /**
     * Modifie l'autorisation d'atterrissage sur le POI.
     * @param {boolean} [authorized=true]
     */
    setLandingAuthorized(authorized = true) {
        this._landingAuthorized = Boolean(authorized);
    }

    // ========================================================================
    // 4. HUB VERS LES ANCESTRES (PLANÈTE, SYSTÈME, SECTEUR, GALAXIE)
    // ========================================================================

    get planet() {
        return this.parent;
    }

    get system() {
        return this.planet ? this.planet.system : null;
    }

    get sector() {
        return this.system ? this.system.sector : null;
    }

    get galaxy() {
        return super.galaxy;
    }
}

window.Game_POI = Game_POI;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game_POI;
}
