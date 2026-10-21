//=============================================================================
// RPG Maker MZ - SC4_Game_Planet
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Modèle d'astre céleste, physique orbitale et POIs.
 * @author SimCraft
 * 
 * @help SC4_Game_Planet.js
 */

class Game_Planet {
    constructor(data, id) {
        this._index = id !== undefined ? id : 0;
        this._dbId = (data && data.id !== undefined) ? data.id : id;
        this._id = this._dbId;
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
    get index() { return this._index; }
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

window.Game_Planet = Game_Planet;
if (typeof global !== "undefined") {
    global.Game_Planet = Game_Planet;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Game_Planet };
}
