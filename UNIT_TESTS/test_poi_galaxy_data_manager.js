"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("==============================================================");
console.log("   TEST : Game_POI, Game_Galaxy, Game_Inventories & DataManager");
console.log("==============================================================\n");

// 1. Initialisation de l'environnement global Node.js
global.window = global;
global.PluginManager = {
    parameters: () => ({})
};
global.DataManager = {
    createGameObjects: () => {},
    makeSaveContents: () => ({}),
    extractSaveContents: () => {},
    onLoad: () => {}
};
global.Scene_Boot = { prototype: { create: () => {} } };
global.SC4 = global.SC4 || {};

// 2. Charger DEBUGTOOL & GalacticRepoBase
require("../js/plugins/SC4_DEBUGTOOL.js");
require("../js/plugins/SC4_Game_GalacticRepoBase.js");
require("../js/plugins/SC4_Game_POI.js");
require("../js/plugins/SC4_Game_Planet.js");
require("../js/plugins/SC4_Game_PlanetarySystem.js");
require("../js/plugins/SC4_Game_Sector.js");
require("../js/plugins/SC4_Game_Galaxy.js");
require("../js/plugins/SC4_Game_Inventories.js");

// 3. Vérifier qu'AUCUNE instanciation globale prématurée n'a eu lieu
console.log("Test 1: Vérification de l'absence d'instanciation prématurée...");
assert.strictEqual(global.$gameGalaxy, undefined, "$gameGalaxy ne doit PAS être instancié au chargement du script !");
assert.strictEqual(global.$inventories, undefined, "$inventories ne doit PAS être instancié au chargement du script !");
console.log("  -> Succès : ni $gameGalaxy ni $inventories ne sont instanciés prématurément.");

// 4. Charger SC4_DataManager
require("../js/plugins/SC4_DataManager.js");
assert.ok(global.SC_DataManager, "SC_DataManager doit exister");

// 5. Exécuter SC_DataManager.createGameObjects()
console.log("Test 2: Instanciation via SC_DataManager.createGameObjects()...");
SC_DataManager.createGameObjects();

assert.ok(global.$gameGalaxy instanceof Game_Galaxy, "$gameGalaxy doit être une instance de Game_Galaxy");
assert.ok(global.$inventories instanceof Game_Inventories, "$inventories doit être une instance de Game_Inventories");
console.log("  -> Succès : $gameGalaxy et $inventories sont correctement instanciés par SC_DataManager.");

// 6. Vérifier Game_POI
console.log("Test 3: Vérification de Game_POI...");
assert.ok(typeof Game_POI === "function", "Game_POI doit être défini");
assert.strictEqual(typeof Game_POIs, "undefined", "Game_POIs ne doit PLUS exister (obsolète)");

const testPoi = new Game_POI({
    id: 101,
    name: "Spatioport Alpha",
    mapX: 0.25,
    mapY: 0.75,
    landingMapId: 12,
    landingX: 10,
    landingY: 15,
    landingAuthorized: true
}, 1);

assert.strictEqual(testPoi.id, 101);
assert.strictEqual(testPoi.name, "Spatioport Alpha");
assert.strictEqual(testPoi.isLandingAuthorized(), true);
testPoi.setLandingAuthorized(false);
assert.strictEqual(testPoi.isLandingAuthorized(), false);
console.log("  -> Succès : Game_POI fonctionne parfaitement de manière unitaire.");

// 7. Vérifier plugins.js et plugins.backup.js
console.log("Test 4: Vérification de la synchronisation de plugins.js & plugins.backup.js...");
const pluginsContent = fs.readFileSync(path.join(__dirname, "../js/plugins.js"), "utf8");
const backupContent = fs.readFileSync(path.join(__dirname, "../js/plugins.backup.js"), "utf8");

assert.strictEqual(pluginsContent, backupContent, "plugins.js et plugins.backup.js doivent être strictement identiques");

// Vérifier que le format est valide
const jsonMatch = pluginsContent.match(/\[[\s\S]*\]/);
const parsedPlugins = JSON.parse(jsonMatch[0]);
const poiPlugin = parsedPlugins.find(p => p.name === "SC4_Game_POI");
const oldPoiPlugin = parsedPlugins.find(p => p.name === "SC4_Game_POIs");

assert.ok(poiPlugin, "SC4_Game_POI doit être présent dans plugins.js");
assert.strictEqual(oldPoiPlugin, undefined, "SC4_Game_POIs ne doit PLUS être présent dans plugins.js");
console.log("  -> Succès : plugins.js et plugins.backup.js sont synchronisés et référencent SC4_Game_POI.");

console.log("\n==============================================================");
console.log("   TOUS LES TESTS ONT RÉUSSI AVEC SUCCÈS (4/4) !");
console.log("==============================================================");
