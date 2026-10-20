//=============================================================================
// RPG Maker MZ - SC4_Game_Sector
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Modèle de secteur stellaire / carte galactique.
 * @author SimCraft
 * @base SC4_Game_PlanetarySystem
 * 
 * @help SC4_Game_Sector.js
 */

class Game_Sector {
    constructor() {
        this._currentSectorId = 1;
        this._currentSystemId = 1;
        this._systems = new Map();
    }

    currentSectorData() {
        const sectors = window.$dataSectors || [];
        return sectors.find(s => s && s.id === this._currentSectorId) || sectors.find(s => !!s) || null;
    }

    get currentSectorId() { return this._currentSectorId; }
    set currentSectorId(val) { this._currentSectorId = val || 1; }

    get currentSystemId() { return this._currentSystemId; }
    set currentSystemId(val) {
        this._currentSystemId = val || 1;
    }

    system(systemId) {
        const targetId = systemId || this._currentSystemId || 1;
        if (!this._systems.has(targetId)) {
            const sector = this.currentSectorData();
            const sysData = sector && Array.isArray(sector.systems) 
                ? sector.systems.find(s => s && s.id === targetId)
                : null;

            if (sysData) {
                this._systems.set(targetId, new Game_PlanetarySystem(sysData));
            } else {
                return null;
            }
        }
        return this._systems.get(targetId);
    }

    systems() {
        const sector = this.currentSectorData();
        if (!sector || !Array.isArray(sector.systems)) return [];
        return sector.systems.map(s => this.system(s.id)).filter(Boolean);
    }

    currentSystem() {
        return this.system(this._currentSystemId);
    }

    makeSavefileData() {
        const systemsData = {};
        for (const [id, sys] of this._systems.entries()) {
            systemsData[id] = sys.makeSavefileData();
        }
        return {
            currentSectorId: this._currentSectorId,
            currentSystemId: this._currentSystemId,
            systems: systemsData
        };
    }

    loadSavefileData(data) {
        if (!data) return;
        this._currentSectorId = data.currentSectorId || 0;
        this._currentSystemId = data.currentSystemId || 0;
        this._systems.clear();

        if (data.systems) {
            for (const [idStr, sData] of Object.entries(data.systems)) {
                const sId = Number(idStr);
                const sys = this.system(sId);
                if (sys) sys.loadSavefileData(sData);
            }
        }
    }
}

// ============================================================================
// 3. GAME OBJECTS : VAISSEAUX SPATIAUX & HYPERDRIVE
// ============================================================================

window.Game_Sector = Game_Sector;
if (typeof global !== "undefined") {
    global.Game_Sector = Game_Sector;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Game_Sector };
}
