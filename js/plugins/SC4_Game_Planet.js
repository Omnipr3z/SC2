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
        this._id = id;
        this._dbId = data.id;
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
