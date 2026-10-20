//=============================================================================
// RPG Maker MZ - SC4_Game_PlanetarySystem
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Modèle de système stellaire et astres satellites.
 * @author SimCraft
 * @base SC4_Game_Planet
 * 
 * @help SC4_Game_PlanetarySystem.js
 */

class Game_PlanetarySystem {
    constructor(data) {
        this._id = data.id;
        const defName = typeof SC4_Localization !== "undefined" ? SC4_Localization.getText("travel.default_system_name", "Système sans nom") : "Système sans nom";
        this._name = data.name || defName;
        this._description = data.description || "";
        this._starType = data.starType || "Yellow Star";
        this._starColor = data.starColor || "#ffffff";
        this._pos = data.pos || { x: 0, y: 0 };
        this._connections = Array.isArray(data.connections) ? [...data.connections] : [];
        this._entryPoint = data.entryPoint || { x: 640, y: 320 };
        this._planetIds = Array.isArray(data.planetIds) ? [...data.planetIds] : [];
        this._planets = [];
        this.initPlanets();
    }

    get id() { return this._id; }
    get name() {
        if (window.$gameSector) {
            const sec = window.$gameSector.currentSectorData();
            const sData = sec && Array.isArray(sec.systems) ? sec.systems.find(s => s && s.id === this._id) : null;
            if (sData && sData.name) return sData.name;
        }
        return this._name;
    }
    get description() {
        if (window.$gameSector) {
            const sec = window.$gameSector.currentSectorData();
            const sData = sec && Array.isArray(sec.systems) ? sec.systems.find(s => s && s.id === this._id) : null;
            if (sData && sData.description) return sData.description;
        }
        return this._description;
    }
    get starType() { return this._starType; }
    get starColor() { return this._starColor; }
    get pos() { return this._pos; }
    get position() { return this._pos; }
    get connections() { return this._connections; }
    get entryPoint() { return this._entryPoint; }
    get planetIds() { return this._planetIds; }

    initPlanets() {
        const dbPlanets = window.$dataPlanets || [];
        this._planets = [];
        this._planetIds.forEach((pId, index) => {
            const defBody = typeof SC4_Localization !== "undefined" ? SC4_Localization.getText("travel.body_default", "Corps") : "Corps";
            const rawData = (typeof dbPlanets.find === "function" ? dbPlanets.find(p => p && p.id === pId) : null) || dbPlanets[pId] || { id: pId, name: `${defBody} ${pId}`, x: 0, y: 0 };
            this._planets[index] = new Game_Planet(rawData, index);
        });
    }

    planets() {
        if (this._planets.length === 0 && this._planetIds.length > 0) {
            this.initPlanets();
        }
        return this._planets;
    }

    planet(targetId) {
        if (targetId === null || targetId === undefined) return null;
        const numId = Number(targetId);
        const list = this.planets();
        return list.find(p => p && (p.dbId === numId || p.id === numId)) || null;
    }

    makeSavefileData() {
        return {
            planets: this.planets().map(p => p.makeSavefileData())
        };
    }

    loadSavefileData(data) {
        if (data && Array.isArray(data.planets)) {
            const currentPlanets = this.planets();
            data.planets.forEach((pData, idx) => {
                if (currentPlanets[idx]) {
                    currentPlanets[idx].loadSavefileData(pData);
                }
            });
        }
    }
}

window.Game_PlanetarySystem = Game_PlanetarySystem;
if (typeof global !== "undefined") {
    global.Game_PlanetarySystem = Game_PlanetarySystem;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Game_PlanetarySystem };
}
