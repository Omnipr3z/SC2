//=============================================================================
// SC4_SpaceTravel.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Orchestrateur de simulation spatiale et hooks ($systemMapManager, $gameSector).
 * @author SimCraft
 * @base SC4_Game_Planet
 * @base SC4_Game_PlanetarySystem
 * @base SC4_Game_Sector
 * @base SC4_Game_Spaceship
 * @base SC4_Game_Spaceships
 * @base SC4_SystemMapManager
 * 
 * @help SC4_SpaceTravel.js
 */

// Fallback loader pour l'environnement Node.js
if (typeof Game_Planet === "undefined") {
    try {
        const _getMod = (name) => {
            if (typeof require === "function") return require(name);
            if (typeof process !== "undefined" && process.mainModule && process.mainModule.require) return process.mainModule.require(name);
            return null;
        };
        const _fs = _getMod('fs');
        const _path = _getMod('path');
        const _vm = _getMod('vm');
        if (_fs && _path && _vm) {
            let pluginsDir = _path.resolve('js/plugins');
            if (!_fs.existsSync(pluginsDir) && typeof __dirname !== 'undefined') {
                const candidate = _path.resolve(__dirname, '../js/plugins');
                if (_fs.existsSync(candidate)) pluginsDir = candidate;
            }
            if (!_fs.existsSync(pluginsDir) && typeof process !== 'undefined') {
                const candidate2 = _path.resolve(process.cwd(), 'js/plugins');
                if (_fs.existsSync(candidate2)) pluginsDir = candidate2;
            }
            const files = [
                'SC4_Game_Planet.js',
                'SC4_Game_PlanetarySystem.js',
                'SC4_Game_Sector.js',
                'SC4_Game_Spaceship.js',
                'SC4_Game_Spaceships.js',
                'SC4_SystemMapManager.js'
            ];
            for (const f of files) {
                const p = _path.join(pluginsDir, f);
                if (_fs.existsSync(p)) _vm.runInThisContext(_fs.readFileSync(p, 'utf8'));
            }
        }
    } catch (e) {}
}

// ============================================================================
// 5. SIMULATION EN ARRIÈRE-PLAN SUR SCENE_MAP
// ============================================================================

(() => {
    "use strict";

    const pluginName = "SC4_SpaceTravel";
    const parameters = PluginManager.parameters(pluginName);
    const enableBgSim = parameters["enableBackgroundSimulation"] !== "false";
    const nefVarId = Number(parameters["nefVariableId"] || 41);

    window.SC4 = window.SC4 || {};
    window.SC4.nefVariableId = nefVarId;

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        // Simulation en tâche de fond si le joueur est sur la carte normale
        if (enableBgSim && window.$systemMapManager) {
            window.$systemMapManager.update(true);
        }
    };

    // ========================================================================
    // 6. EXTENSIONS GAME_SYSTEM (DÉCOUVERTE POI & HISTORIQUE DES LOGS)
    // ========================================================================
    if (typeof Game_System !== "undefined") {
        Game_System.prototype.isPoiLocated = function(poiId) {
            if (!poiId) return true;
            this._poiLocatedState = this._poiLocatedState || {};
            if (this._poiLocatedState[poiId] !== undefined) {
                return Boolean(this._poiLocatedState[poiId]);
            }
            const allPois = window.$dataPois || [];
            const p = allPois.find(item => item && item.id === poiId);
            if (p && p.located !== undefined) {
                return Boolean(p.located);
            }
            return true;
        };

        Game_System.prototype.setPoiLocated = function(poiId, status = true) {
            if (!poiId) return;
            this._poiLocatedState = this._poiLocatedState || {};
            this._poiLocatedState[poiId] = Boolean(status);
            if (window.$storyManager && typeof window.$storyManager.update === "function") {
                window.$storyManager.update();
            }
        };

        Game_System.prototype.isLandingAllowed = function(planetId) {
            const curSys = window.$gameSector ? window.$gameSector.currentSystem() : null;
            const pl = curSys ? curSys.planet(planetId) : null;
            return pl ? pl.isLandingAllowed() : false;
        };

        Game_System.prototype.addSpaceTravelLog = function(style, text) {
            this._spaceTravelLogHistory = this._spaceTravelLogHistory || [];
            this._spaceTravelLogHistory.push({ style: style || "info", text });
            if (this._spaceTravelLogHistory.length > 50) {
                this._spaceTravelLogHistory.shift();
            }
        };

        Game_System.prototype.getSpaceTravelLogs = function() {
            this._spaceTravelLogHistory = this._spaceTravelLogHistory || [];
            return this._spaceTravelLogHistory;
        };
    }

})();
