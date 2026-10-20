//=============================================================================
// RPG Maker MZ - SC4_Game_QuestLocation
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Modèle de localisation spatiale / objectif de quête.
 * @author SimCraft
 * 
 * @help SC4_Game_QuestLocation.js
 */

class Game_QuestLocation {
    constructor(data) {
        this._id = data.id || "loc_0";
        this._name = data.name || "Objectif";
        this._description = data.description || "";
        this._sectorId = typeof data.sectorId === "number" ? data.sectorId : 0;
        this._systemId = typeof data.systemId === "number" ? data.systemId : 0;
        this._planetId = data.planetId !== undefined ? data.planetId : null;
        this._poiId = data.poiId || null;
        this._active = data.active !== false;
        this._completed = data.completed === true;
    }

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
    get sectorId() { return this._sectorId; }
    get systemId() { return this._systemId; }
    get planetId() { return this._planetId; }
    get poiId() { return this._poiId; }
    get active() { return this._active && !this._completed; }
    get completed() { return this._completed; }

    activate() { this._active = true; }
    deactivate() { this._active = false; }
    complete() { this._completed = true; }

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
