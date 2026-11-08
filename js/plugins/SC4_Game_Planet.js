//=============================================================================
// RPG Maker MZ - SC4_Game_Planet
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Modèle d'astre céleste, physique orbitale et registre des POIs.
 * @author SimCraft
 * @base SC4_Game_POI
 * 
 * @help SC4_Game_Planet.js
 * 
 * ============================================================================
 * GAME_PLANET
 * ============================================================================
 * Modélise un corps céleste (planète, lune, station, astéroïde, etc.).
 * Fait partie intégrante de la cascade :
 * Galaxy -> Sectors -> Planetary Systems -> Planets -> POIs.
 * 
 * Triple rôle :
 * 1. Modèle d'objet : Données physiques et orbitales (coordonnées x/y, type,
 *    mouvements orbitaux, autorisations d'atterrissage, gouverneur et contrôleur).
 * 2. Intégration en cascade : Instancie et référence l'ensemble des Game_POI de l'astre.
 * 3. Hub intermédiaire : Navigation montante vers le Game_PlanetarySystem parent
 *    et descendante vers les points d'intérêt (POIs) de la surface/orbite.
 * ============================================================================
 */

class Game_Planet extends Game_GalacticRepoBase {
    constructor(data = null, parentId = null) {
        super(data, parentId);
    }

    // ========================================================================
    // 1. INITIALISATION & CONFIGURATION
    // ========================================================================

    initMembers() {
        super.initMembers();
        this._hasSubObjects = true;
        this._subObjectsClassName = "Game_POI";
        this._subObjectsDatabaseSourceName = "$dataPois";
        this._subObjectsIdsKey = "poiIds";
        this._savedDataKeys = [
            "_x",
            "_y",
            "_orbitAngle",
            "_rotationAngle",
            "_active",
            "_landingAllowed"
        ];

        this._index = 0;
        this._type = "Planet";
        this._x = 0;
        this._y = 0;
        this._zoom = 1.0;
        this._bitmapName = "";
        this._moves = [];
        this._poiIds = [];
        this._landingAllowed = false;
        this._interactive = true;
        this._governorId = null;
        this._spaceControllerId = null;
        this._orbitAngle = 0;
        this._rotationAngle = 0;
        this._active = false;
    }

    setup(data, parentId = null) {
        const res = super.setup(data, parentId);
        if (!this._data) return res;

        this._type = this._data.type || "Planet";
        this._x = this._data.x || 0;
        this._y = this._data.y || 0;
        this._zoom = this._data.zoom || 1.0;
        this._bitmapName = this._data.bitmapName || "";
        this._moves = Array.isArray(this._data.moves) ? JSON.parse(JSON.stringify(this._data.moves)) : [];
        this._poiIds = Array.isArray(this._data.poiIds)
            ? [...this._data.poiIds]
            : (Array.isArray(this._data.pois) ? this._data.pois.map(p => p.id) : []);
        this._landingAllowed = Boolean(this._data.landingAllowed);
        this._interactive = this._data.interactive !== false;
        this._governorId = (typeof this._data.governorId === "number" && this._data.governorId > 0) ? this._data.governorId : null;
        this._spaceControllerId = (typeof this._data.spaceControllerId === "number" && this._data.spaceControllerId > 0) ? this._data.spaceControllerId : null;

        return res;
    }

    // ========================================================================
    // 2. GETTERS & PROPRIÉTÉS PHYSIQUES
    // ========================================================================

    get dbId() { return this.id; }
    get index() { return this._index; }
    set index(val) { this._index = val; }
    get interactive() { return this._interactive; }
    get type() { return this._type; }
    get x() { return this._x; }
    set x(val) { this._x = val; }
    get y() { return this._y; }
    set y(val) { this._y = val; }
    get zoom() { return this._zoom; }
    get bitmapName() { return this._bitmapName; }
    get moves() { return this._moves; }
    get poiIds() { return this._poiIds; }

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

    get landingAllowed() { return this._landingAllowed; }
    isLandingAllowed() { return Boolean(this._landingAllowed); }
    setLandingAllowed(val) { this._landingAllowed = Boolean(val); }

    // ========================================================================
    // 3. ACTEURS, GOUVERNANCE & FACTIONS
    // ========================================================================

    get governorId() { return this._governorId; }
    get spaceControllerId() { return this._spaceControllerId; }

    governor() {
        if (!this._governorId || !window.$gameActors || typeof window.$gameActors.actor !== "function") return null;
        return window.$gameActors.actor(this._governorId) || null;
    }

    spaceController() {
        if (!this._spaceControllerId || !window.$gameActors || typeof window.$gameActors.actor !== "function") return null;
        return window.$gameActors.actor(this._spaceControllerId) || null;
    }

    governorFactionId() {
        const gov = this.governor();
        return (gov && typeof gov.factionId === "function") ? gov.factionId() : null;
    }

    // ========================================================================
    // 4. ASTRONOMIE, CYCLES JOUR/NUIT & TINT
    // ========================================================================

    isStation() {
        if (!this._type) return false;
        const t = this._type.toLowerCase();
        return t.includes("station") || t.includes("base") || t.includes("relais") || t.includes("relay");
    }

    isBelt() {
        const t = (this._type || "").toLowerCase();
        const b = (this._bitmapName || "").toLowerCase();
        return t.includes("belt") || t.includes("ceinture") || b.startsWith("belt_");
    }

    isMoon() {
        if (this.isStation() || this.isBelt()) return false;
        return Array.isArray(this._moves) && this._moves.some(m => m && m.type === "orbitPlanet");
    }

    hasDynamicDayNight() {
        return !this.isBelt() && !this.isStation();
    }

    get orbitRadiusUA() {
        if (Array.isArray(this._moves)) {
            const m = this._moves.find(mv => mv && (mv.type === "orbit" || mv.type === "orbitPlanet"));
            if (m) {
                if (typeof m.orbitRadiusUA === "number") return m.orbitRadiusUA;
                if (typeof m.radiusX === "number") return m.radiusX / 100;
            }
        }
        return 1.0;
    }

    get orbitalDays() {
        if (Array.isArray(this._moves)) {
            const m = this._moves.find(mv => mv && (mv.type === "orbit" || mv.type === "orbitPlanet"));
            if (m) {
                if (typeof m.orbitalDays === "number") return m.orbitalDays;
                if (typeof m.speed === "number" && m.speed > 0) {
                    return Math.max(1, Math.round((Math.PI * 2 / m.speed) / (60 * 1440)));
                }
            }
        }
        return 360;
    }

    get rotationHours() {
        if (Array.isArray(this._moves)) {
            const m = this._moves.find(mv => mv && mv.type === "rotation");
            if (m) {
                if (typeof m.rotationHours === "number") return m.rotationHours;
                if (typeof m.value === "number" && m.value > 0) {
                    return Math.max(1, Math.round((Math.PI * 2 / m.value) / 3600));
                }
            }
        }
        return 24;
    }

    calculateLocalSolarTime(poiAngle = 0, starPos = { x: 640, y: 320 }) {
        const sunAngle = Math.atan2(starPos.y - this._y, starPos.x - this._x);
        const currentPoiAngle = poiAngle + this._rotationAngle;
        let deltaTheta = (currentPoiAngle - sunAngle) % (Math.PI * 2);
        if (deltaTheta > Math.PI) deltaTheta -= Math.PI * 2;
        if (deltaTheta < -Math.PI) deltaTheta += Math.PI * 2;
        let localHour = 12 + (deltaTheta / Math.PI) * 12;
        localHour = (localHour + 24) % 24;
        return Math.round(localHour * 10) / 10;
    }

    getLocalTint(poiAngle = 0, starPos = { x: 640, y: 320 }) {
        if (!this.hasDynamicDayNight()) {
            return [-40, -35, -20, 90];
        }
        const hour = this.calculateLocalSolarTime(poiAngle, starPos);
        let r = 0, g = 0, b = 0, gray = 0;
        if (hour >= 6 && hour < 12) {
            const t = (hour - 6) / 6;
            r = Math.round(20 * (1 - t));
            g = Math.round(-10 * (1 - t));
            b = Math.round(-20 * (1 - t));
            gray = Math.round(30 * (1 - t));
        } else if (hour >= 12 && hour < 18) {
            const t = (hour - 12) / 6;
            r = Math.round(30 * t);
            g = Math.round(-20 * t);
            b = Math.round(-30 * t);
            gray = Math.round(60 * t);
        } else if (hour >= 18 && hour < 24) {
            const t = (hour - 18) / 6;
            r = Math.round(30 * (1 - t) - 70 * t);
            g = Math.round(-20 * (1 - t) - 60 * t);
            b = Math.round(-30 * (1 - t) - 30 * t);
            gray = Math.round(60 * (1 - t) + 120 * t);
        } else {
            const t = hour / 6;
            r = Math.round(-70 * (1 - t) + 20 * t);
            g = Math.round(-60 * (1 - t) - 10 * t);
            b = Math.round(-30 * (1 - t) - 20 * t);
            gray = Math.round(120 * (1 - t) + 30 * t);
        }
        return [r || 0, g || 0, b || 0, gray || 0];
    }

    // ========================================================================
    // 5. HUB VERS LES POIs (ENFANTS) & LES ANCESTRES
    // ========================================================================

    get pois() {
        return this.getSubObjects();
    }

    getPois(onlyLocated = false) {
        const all = this.pois;
        if (!onlyLocated) return all;
        return all.filter(p => (p && typeof p.isLocated === "function" ? p.isLocated() : true));
    }

    poi(poiId) {
        return this.getSubObject(poiId);
    }

    getPOI(poiId) {
        return this.getSubObject(poiId);
    }

    currentPOIId() {
        return this.galaxy ? this.galaxy.currentPOIId() : null;
    }

    currentPOI() {
        return this.galaxy ? this.galaxy.currentPOI() : null;
    }

    get system() {
        return this.parent;
    }

    get sector() {
        return this.system ? this.system.sector : null;
    }

    get galaxy() {
        return super.galaxy;
    }
}
window.Game_Planet = Game_Planet;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game_Planet;
}
