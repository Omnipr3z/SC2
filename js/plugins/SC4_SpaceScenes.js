//=============================================================================
// SC4_SpaceScenes.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Coordinateur et commandes de plugin pour les scènes de voyage spatial.
 * @author SimCraft
 * @base Window_SpaceCalendar
 * @base Window_SpaceEventLog
 * @base Window_SpaceShipInfo
 * @base Window_SpaceTargetInfo
 * @base Window_SpaceControls
 * @base Scene_SectorTravel
 * @base Scene_SpaceTravel
 * @base Scene_SubsystemTravel
 * 
 * @help
 * ============================================================================
 * SC4_SpaceScenes.js
 * ============================================================================
 * Enregistre les commandes de plugin et sert de façade d'orchestration pour
 * les 3 niveaux de scènes spatiales de SimCraft 4 :
 * 
 * 1. Scene_SectorTravel    : Niveau 1 (Secteur / Carte Galactique FTL)
 * 2. Scene_SpaceTravel     : Niveau 2 (Système Solaire temps réel)
 * 3. Scene_SubsystemTravel : Niveau 3 (Sous-système planétaire & Mode Hangar)
 * 
 * Commandes de plugin :
 *   - SC4_SpaceScenes openSector   : Ouvre la carte galactique / secteur.
 *   - SC4_SpaceScenes openSystem   : Ouvre le système solaire actuel.
 *   - SC4_SpaceScenes openHangar   : Ouvre le sous-système en mode atterrissage hangar.
 * 
 * @command openSector
 * @text Ouvrir Secteur
 * @desc Ouvre la carte stellaire FTL du secteur.
 * 
 * @command openSystem
 * @text Ouvrir Système
 * @desc Ouvre la vue temps réel du système planétaire.
 * 
 * @command openHangar
 * @text Ouvrir Hangar
 * @desc Ouvre le sous-système planétaire en mode atterrissage hangar.
 * 
 * @arg nefId
 * @text ID de la Nef
 * @desc ID du vaisseau/navette pour le débarquement (défaut 2).
 * @type number
 * @default 2
 * ============================================================================
 */

// Chargement automatique des composants découplés en environnement de test Node.js
if (typeof Window_SpaceCalendar === "undefined") {
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
            const filesToLoad = [
                'Window_SpaceCalendar.js',
                'Window_SpaceEventLog.js',
                'Window_SpaceShipInfo.js',
                'Window_SpaceTargetInfo.js',
                'Window_SpaceControls.js',
                'Scene_SectorTravel.js',
                'Scene_SpaceTravel.js',
                'Scene_SubsystemTravel.js'
            ];
            for (const file of filesToLoad) {
                try {
                    const fullP = _path.join(pluginsDir, file);
                    if (_fs.existsSync(fullP)) {
                        _vm.runInThisContext(_fs.readFileSync(fullP, 'utf8'));
                    }
                } catch (err) {
                    console.warn(`[SC4_SpaceScenes] Notice loading ${file}:`, err.message);
                }
            }
        }
    } catch (e) {
        console.warn("[SC4_SpaceScenes] Fallback loader notice:", e.message);
    }
}

if (typeof global !== 'undefined') {
    if (typeof Scene_SectorTravel !== 'undefined') global.Scene_SectorTravel = Scene_SectorTravel;
    else if (window.Scene_SectorTravel) global.Scene_SectorTravel = window.Scene_SectorTravel;

    if (typeof Scene_SpaceTravel !== 'undefined') global.Scene_SpaceTravel = Scene_SpaceTravel;
    else if (window.Scene_SpaceTravel) global.Scene_SpaceTravel = window.Scene_SpaceTravel;

    if (typeof Scene_SubsystemTravel !== 'undefined') global.Scene_SubsystemTravel = Scene_SubsystemTravel;
    else if (window.Scene_SubsystemTravel) global.Scene_SubsystemTravel = window.Scene_SubsystemTravel;
}

// ============================================================================
// EXPORTS GLOBAUX & INTERFACE HANGAR
// ============================================================================

window.SC4 = window.SC4 || {};

SC4.openHangar = function(nefId = 2) {
    const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
    const planet = ship ? ship.orbitingPlanet : null;

    if (planet) {
        SoundManager.playOk();
        Scene_SubsystemTravel.prepareContext(planet, true, nefId); // true = Hangar Landing Mode
        SceneManager.push(Scene_SubsystemTravel);
    } else {
        SoundManager.playBuzzer();
        if ($gameMessage) {
            const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
            $gameMessage.add(loc("travel.hangar_not_orbiting", "\\C[2]Contrôle Hangar\\C[0] : Le vaisseau n'est pas en orbite stationnaire."));
        }
    }
};

SceneManager.openHangar = SC4.openHangar;

// ============================================================================
// ENREGISTREMENT DES COMMANDES DE PLUGIN RPG MAKER MZ
// ============================================================================

(() => {
    "use strict";

    if (typeof PluginManager !== "undefined" && PluginManager.registerCommand) {
        PluginManager.registerCommand("SC4_SpaceScenes", "openSector", () => {
            SceneManager.push(Scene_SectorTravel);
        });

        PluginManager.registerCommand("SC4_SpaceScenes", "openSystem", () => {
            SceneManager.push(Scene_SpaceTravel);
        });

        PluginManager.registerCommand("SC4_SpaceScenes", "openHangar", (args) => {
            const nefId = args && args.nefId ? Number(args.nefId) : 2;
            SC4.openHangar(nefId);
        });
    }
})();
