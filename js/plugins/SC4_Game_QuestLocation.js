//=============================================================================
// RPG Maker MZ - SC4_Game_QuestLocation
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Modèle de localisation spatiale / objectif de quête connecté à $gameGalaxy.
 * @author SimCraft
 * 
 * @help SC4_Game_QuestLocation.js
 * 
 * Modèle unitaire d'objectif géographique de quête.
 * S'appuie sur la hiérarchie ascendante $gameGalaxy :
 * Galaxy -> Sector -> System -> Planet -> POI
 * Permet la résolution dynamique des ancêtres à partir du ciblage le plus fin.
 */

class Game_QuestLocation {
    constructor(data = {}) {
        this._id = data.id || "loc_0";
        this._name = data.name || "Objectif";
        this._description = data.description || "";
        this._sectorId = typeof data.sectorId === "number" ? data.sectorId : null;
        this._systemId = typeof data.systemId === "number" ? data.systemId : null;
        this._planetId = data.planetId !== undefined && data.planetId !== null ? data.planetId : null;
        this._poiId = data.poiId || null;
        this._active = data.active !== false;
        this._completed = data.completed === true;
    }

    // ========================================================================
    // IDENTITÉ & ÉTAT
    // ========================================================================

    get id() { return this._id; }

    get name() {
        const def = typeof SC4_Localization !== "undefined" ? SC4_Localization.getText("quest.default_objective", "Objectif") : "Objectif";
        const raw = this._name || def;
        return typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(raw) : raw;
    }

    get description() {
        const raw = this._description || "";
        return typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(raw) : raw;
    }

    get active() { return this._active && !this._completed; }
    get completed() { return this._completed; }

    activate() { this._active = true; }
    deactivate() { this._active = false; }
    complete() { this._completed = true; }

    // ========================================================================
    // NAVIGATION & RÉSOLUTION HIÉRARCHIQUE ($gameGalaxy)
    // ========================================================================

    get galaxy() {
        if (typeof window !== "undefined" && window.$gameGalaxy) return window.$gameGalaxy;
        if (typeof global !== "undefined" && global.$gameGalaxy) return global.$gameGalaxy;
        return null;
    }

    get poi() {
        if (!this._poiId || !this.galaxy) return null;
        return typeof this.galaxy.getPOI === "function" ? this.galaxy.getPOI(this._poiId) : null;
    }

    get planet() {
        if (this._planetId !== null && this._planetId !== undefined) {
            return this.galaxy && typeof this.galaxy.getPlanet === "function" ? this.galaxy.getPlanet(this._planetId) : null;
        }
        const currentPoi = this.poi;
        return currentPoi && currentPoi.parent ? currentPoi.parent : null;
    }

    get system() {
        if (this._systemId !== null && this._systemId !== undefined) {
            return this.galaxy && typeof this.galaxy.getSystem === "function" ? this.galaxy.getSystem(this._systemId) : null;
        }
        const currentPlanet = this.planet;
        return currentPlanet && currentPlanet.parent ? currentPlanet.parent : null;
    }

    get sector() {
        if (this._sectorId !== null && this._sectorId !== undefined) {
            return this.galaxy && typeof this.galaxy.getSector === "function" ? this.galaxy.getSector(this._sectorId) : null;
        }
        const currentSystem = this.system;
        return currentSystem && currentSystem.parent ? currentSystem.parent : null;
    }

    get target() {
        return this.poi || this.planet || this.system || this.sector || null;
    }

    // ========================================================================
    // IDS RÉSOLUS (DIRECTS OU DÉRIVÉS DE L'ASCENDANCE)
    // ========================================================================

    get poiId() {
        return this._poiId;
    }

    get planetId() {
        if (this._planetId !== null && this._planetId !== undefined) return this._planetId;
        const pl = this.planet;
        return pl ? pl.id : null;
    }

    get systemId() {
        if (this._systemId !== null && this._systemId !== undefined) return this._systemId;
        const sys = this.system;
        return sys ? sys.id : null;
    }

    get sectorId() {
        if (this._sectorId !== null && this._sectorId !== undefined) return this._sectorId;
        const sec = this.sector;
        return sec ? sec.id : null;
    }

    get isLocated() {
        if (!this._poiId) return true;
        if (typeof window !== "undefined" && window.$gameSystem && typeof window.$gameSystem.isPoiLocated === "function") {
            return window.$gameSystem.isPoiLocated(this._poiId);
        }
        return true;
    }

    // ========================================================================
    // FORMATAGE & FIL D'ARIANE TACTIQUE
    // ========================================================================

    breadcrumbText() {
        const parseText = (txt) => (typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(txt) : txt);
        const loc = (key, def) => (typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(key, def) : def);

        const sec = this.sector;
        const secName = sec ? parseText(sec.name) : loc("travel.sector_default", "Secteur");

        const sys = this.system;
        const sysName = sys ? parseText(sys.name) : (this.systemId !== null && this.systemId !== undefined ? `${loc("travel.system_default", "Système")} ${this.systemId}` : "");

        const pl = this.planet;
        const bodyLbl = loc("travel.body_default", loc("travel.celestial_body", "Corps"));
        const plName = pl ? parseText(pl.name) : (this.planetId !== null && this.planetId !== undefined ? `${bodyLbl} ${this.planetId}` : "");

        let poiDisplayName = "";
        if (this._poiId) {
            if (this.isLocated) {
                const p = this.poi;
                poiDisplayName = p ? parseText(p.name) : this._poiId;
            } else {
                poiDisplayName = loc("quest.unknown_poi", "??? [Site non découvert]");
            }
        }

        const parts = [secName];
        if (sysName) parts.push(sysName);
        if (plName) parts.push(plName);
        if (poiDisplayName) parts.push(poiDisplayName);

        return `📍 ${parts.join(" ▹ ")}`;
    }

    // ========================================================================
    // PERSISTANCE SAUVEGARDE
    // ========================================================================

    makeSavefileData() {
        return {
            id: this._id,
            active: this._active,
            completed: this._completed
        };
    }

    loadSavefileData(data) {
        if (data) {
            if (typeof data.active === "boolean") this._active = data.active;
            if (typeof data.completed === "boolean") this._completed = data.completed;
        }
    }
}

window.Game_QuestLocation = Game_QuestLocation;
if (typeof global !== "undefined") {
    global.Game_QuestLocation = Game_QuestLocation;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Game_QuestLocation };
}
