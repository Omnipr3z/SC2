const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("==============================================================");
console.log("   UNIT TEST : QUEST SYSTEM & $gameGalaxy INTEGRATION        ");
console.log("==============================================================");

// Mock environnement RMMZ
global.window = global;
global.Graphics = { width: 1280, height: 720, boxWidth: 1280, boxHeight: 720 };

global.Rectangle = class Rectangle {
    constructor(x, y, width, height) {
        this.x = x || 0;
        this.y = y || 0;
        this.width = width || 0;
        this.height = height || 0;
    }
};

global.Bitmap = class Bitmap {
    constructor(w, h) {
        this.width = w;
        this.height = h;
        this.fontSize = 16;
        this.textColor = "#ffffff";
    }
    clear() {}
    fillRect() {}
    drawText() {}
};

global.Window_Base = class Window_Base {
    constructor(rect) {
        this._rect = rect || new Rectangle(0, 0, 800, 600);
        this.contents = new Bitmap(this._rect.width, this._rect.height);
    }
    get innerWidth() { return this._rect.width - 32; }
    get innerHeight() { return this._rect.height - 32; }
    contentsWidth() { return this.innerWidth; }
    contentsHeight() { return this.innerHeight; }
    lineHeight() { return 36; }
    drawText() {}
    textWidth(str) { return (str || "").length * 6; }
    scrollTo() {}
    refresh() {}
    loc(k, def) { return def; }
};

// Charger les JSON et fusionner les localisations FR
const baseDir = path.resolve(__dirname, "..");
const sectorsPhysical = JSON.parse(fs.readFileSync(path.join(baseDir, "data/SC/SECTORS.json"), "utf8"));
const sectorsFR = JSON.parse(fs.readFileSync(path.join(baseDir, "data/SC/loc/SECTORS_FR.json"), "utf8"));
const planetsPhysical = JSON.parse(fs.readFileSync(path.join(baseDir, "data/SC/PLANETS.json"), "utf8"));
const planetsFR = JSON.parse(fs.readFileSync(path.join(baseDir, "data/SC/loc/PLANETS_FR.json"), "utf8"));
const poisPhysical = JSON.parse(fs.readFileSync(path.join(baseDir, "data/SC/POIS.json"), "utf8"));
const poisFR = JSON.parse(fs.readFileSync(path.join(baseDir, "data/SC/loc/POIS_FR.json"), "utf8"));
const questsPhysical = JSON.parse(fs.readFileSync(path.join(baseDir, "data/SC/QUESTS.json"), "utf8"));
const questsFR = JSON.parse(fs.readFileSync(path.join(baseDir, "data/SC/loc/QUESTS_FR.json"), "utf8"));

// Fusion helper
function mergeLoc(arrPhys, arrLoc) {
    if (!Array.isArray(arrPhys)) return arrPhys;
    return arrPhys.map(item => {
        if (!item) return item;
        const loc = Array.isArray(arrLoc) ? arrLoc.find(l => l && l.id === item.id) : null;
        const merged = { ...item };
        if (loc) {
            if (loc.name) merged.name = loc.name;
            if (loc.description) merged.description = loc.description;
            if (loc.systems && Array.isArray(merged.systems)) {
                merged.systems = merged.systems.map(s => {
                    const sLoc = loc.systems ? loc.systems.find(sl => sl && sl.id === s.id) : null;
                    return sLoc ? { ...s, ...sLoc } : s;
                });
            }
        }
        return merged;
    });
}

global.$dataSectors = mergeLoc(sectorsPhysical, sectorsFR);
global.$dataPlanets = mergeLoc(planetsPhysical, planetsFR);
global.$dataPois = mergeLoc(poisPhysical, poisFR);
global.$dataQuests = mergeLoc(questsPhysical, questsFR);

// Charger les classes spatiales
require(path.join(baseDir, "js/plugins/SC4_Game_GalacticRepoBase.js"));
require(path.join(baseDir, "js/plugins/SC4_Game_POIs.js"));
require(path.join(baseDir, "js/plugins/SC4_Game_Planet.js"));
require(path.join(baseDir, "js/plugins/SC4_Game_PlanetarySystem.js"));
require(path.join(baseDir, "js/plugins/SC4_Game_Sector.js"));
require(path.join(baseDir, "js/plugins/SC4_Game_Galaxy.js"));

// Instancier $gameGalaxy
global.$gameGalaxy = new Game_Galaxy();
global.$gameParty = { leader: () => ({ _currentSectorId: 1, _currentSystemId: 1, _currentPlanetId: 1, _currentPoiId: "prime_spatioport" }) };
global.$gameSystem = { isPoiLocated: (id) => true, mainFontFace: () => "sans-serif" };

// Charger les classes de quêtes
require(path.join(baseDir, "js/plugins/SC4_Game_QuestLocation.js"));
require(path.join(baseDir, "js/plugins/SC4_Game_Quest.js"));
require(path.join(baseDir, "js/plugins/SC4_Game_Quests.js"));

let testsPassed = 0;

// TEST 1: $gameGalaxy vérification structure
console.log("\n[Test 1] Vérification de l'arbre $gameGalaxy...");
assert.ok(global.$gameGalaxy, "$gameGalaxy doit être instancié");
assert.ok(global.$gameGalaxy.sectors.length > 0, "Doit avoir au moins un secteur");
const primePoi = global.$gameGalaxy.getPOI("prime_spatioport");
assert.ok(primePoi, "prime_spatioport doit être trouvé via $gameGalaxy.getPOI");
assert.ok(primePoi.parent, "prime_spatioport doit avoir un parent (Game_Planet)");
assert.ok(primePoi.parent.parent, "La planète doit avoir un parent (Game_PlanetarySystem)");
assert.ok(primePoi.parent.parent.parent, "Le système doit avoir un parent (Game_Sector)");
console.log("✔ Hiérarchie $gameGalaxy validée :");
console.log("   POI:       ", primePoi.name, `(id: ${primePoi.id})`);
console.log("   Planète:   ", primePoi.parent.name, `(id: ${primePoi.parent.id})`);
console.log("   Système:   ", primePoi.parent.parent.name, `(id: ${primePoi.parent.parent.id})`);
console.log("   Secteur:   ", primePoi.parent.parent.parent.name, `(id: ${primePoi.parent.parent.parent.id})`);
testsPassed++;

// TEST 2: Résolution ascendante dynamique dans Game_QuestLocation
console.log("\n[Test 2] Résolution dynamique dans Game_QuestLocation (avec seulement poiId)...");
const locPoiOnly = new Game_QuestLocation({
    id: "loc_test_1",
    name: "Spatioport Magellan",
    poiId: "prime_spatioport"
});
assert.strictEqual(locPoiOnly.poiId, "prime_spatioport");
assert.ok(locPoiOnly.poi, "locPoiOnly.poi doit être résolu");
assert.strictEqual(locPoiOnly.planetId, primePoi.parent.id, "planetId doit être résolu dynamiquement via parent");
assert.ok(locPoiOnly.planet, "locPoiOnly.planet doit être résolu dynamiquement");
assert.strictEqual(locPoiOnly.systemId, primePoi.parent.parent.id, "systemId doit être résolu dynamiquement");
assert.ok(locPoiOnly.system, "locPoiOnly.system doit être résolu dynamiquement");
assert.strictEqual(locPoiOnly.sectorId, primePoi.parent.parent.parent.id, "sectorId doit être résolu dynamiquement");
assert.ok(locPoiOnly.sector, "locPoiOnly.sector doit être résolu dynamiquement");
assert.strictEqual(locPoiOnly.isLocated, true, "isLocated doit être true");
const bc = locPoiOnly.breadcrumbText();
console.log("✔ Fil d'Ariane généré :", bc);
assert.ok(bc.startsWith("📍"), "Le fil d'Ariane doit commencer par 📍");
testsPassed++;

// TEST 3: Résolution avec ciblage planète uniquement
console.log("\n[Test 3] Résolution avec ciblage planète uniquement...");
const locPlanetOnly = new Game_QuestLocation({
    id: "loc_test_2",
    name: "Orbite Ankaros",
    planetId: primePoi.parent.id
});
assert.strictEqual(locPlanetOnly.poiId, null);
assert.strictEqual(locPlanetOnly.planetId, primePoi.parent.id);
assert.ok(locPlanetOnly.planet);
assert.strictEqual(locPlanetOnly.systemId, primePoi.parent.parent.id);
assert.strictEqual(locPlanetOnly.sectorId, primePoi.parent.parent.parent.id);
console.log("✔ Fil d'Ariane planète :", locPlanetOnly.breadcrumbText());
testsPassed++;

// TEST 4: Game_Quests indicateurs en cascade
console.log("\n[Test 4] Indicateurs multi-échelles dans Game_Quests...");
const questsRepo = new Game_Quests();
const q1 = questsRepo.quest(1);
assert.ok(q1, "Quête 1 doit exister");
q1.activate();
q1.setTracking(true);

const targetSysId = locPoiOnly.systemId;
const targetPlanetId = locPoiOnly.planetId;
const targetSectorId = locPoiOnly.sectorId;

assert.strictEqual(questsRepo.hasIndicatorForPoi("prime_spatioport"), true, "hasIndicatorForPoi doit retourner true");
assert.strictEqual(questsRepo.hasIndicatorForPlanet(targetPlanetId), true, "hasIndicatorForPlanet doit retourner true en cascade");
assert.strictEqual(questsRepo.hasIndicatorForSystem(targetSysId), true, "hasIndicatorForSystem doit retourner true en cascade");
assert.strictEqual(questsRepo.hasIndicatorForSector(targetSectorId), true, "hasIndicatorForSector doit retourner true en cascade");
console.log("✔ Indicateurs en cascade vérifiés avec succès (POI -> Planète -> Système -> Secteur)");
testsPassed++;

// TEST 5: Simulation Window_QuestDetail
console.log("\n[Test 5] Test de rendu de Window_QuestDetail...");
require(path.join(baseDir, "js/plugins/SC4_Window_QuestDetail.js"));
const winDetail = new Window_QuestDetail(new Rectangle(0, 0, 800, 600));
winDetail.setQuest(q1);
assert.doesNotThrow(() => {
    winDetail.drawLocationsBlock(100);
}, "drawLocationsBlock ne doit pas lever d'exception");
console.log("✔ Window_QuestDetail rendu sans erreur");
testsPassed++;

// TEST 6: Vérification qu'aucune référence à $gameSector n'est accessible ou requise
console.log("\n[Test 6] Vérification absence totale de $gameSector...");
assert.strictEqual(typeof global.$gameSector, "undefined", "$gameSector ne doit plus être défini sur window/global");
testsPassed++;

// TEST 7: Instanciation et cycle complet de Scene_QuestBook
console.log("\n[Test 7] Instanciation et initialisation de Scene_QuestBook...");
global.Window_Selectable = class Window_Selectable extends global.Window_Base {
    constructor(rect) {
        super(rect);
        this._index = 0;
        this._handlers = {};
    }
    setHandler(symbol, method) { this._handlers[symbol] = method; }
    callHandler(symbol) { if (this._handlers[symbol]) this._handlers[symbol](); }
    select(i) { this._index = i; }
    index() { return this._index; }
    activate() {}
    deactivate() {}
};

global.Window_Command = class Window_Command extends global.Window_Selectable {
    constructor(rect) {
        super(rect);
        this._list = [];
    }
    addCommand(name, symbol, enabled = true) {
        this._list.push({ name, symbol, enabled });
    }
    currentSymbol() {
        return this._list[this._index] ? this._list[this._index].symbol : null;
    }
};

global.Window_HorzCommand = class Window_HorzCommand extends global.Window_Command {};

global.Scene_MenuBase = class Scene_MenuBase {
    constructor() {
        this._windowLayer = { addChild: () => {} };
        this._children = [];
    }
    create() {}
    addWindow(win) { this._children.push(win); }
    addChild(c) { this._children.push(c); }
    popScene() {}
};

global.SoundManager = { playOk: () => {}, playCancel: () => {} };
global.ImageManager = { loadSystem: () => null, loadBitmap: () => new global.Bitmap(100, 100) };

require(path.join(baseDir, "js/plugins/SC4_Window_QuestBookHeader.js"));
require(path.join(baseDir, "js/plugins/SC4_Window_QuestFilter.js"));
require(path.join(baseDir, "js/plugins/SC4_Window_QuestList.js"));
require(path.join(baseDir, "js/plugins/SC4_Scene_QuestBook.js"));

global.$gameQuests = questsRepo;

const questBookScene = new Scene_QuestBook();
assert.doesNotThrow(() => {
    questBookScene.create();
}, "Scene_QuestBook.create() ne doit pas lancer d'exception");

assert.ok(questBookScene._headerWindow, "Header window créée");
assert.ok(questBookScene._filterWindow, "Filter window créée");
assert.ok(questBookScene._listWindow, "List window créée");
assert.ok(questBookScene._detailWindow, "Detail window créée");

// Test du changement de filtre
assert.doesNotThrow(() => {
    questBookScene.onFilterChange("recurring");
    questBookScene.onFilterChange("all");
    questBookScene.onFilterChange("active");
}, "Changement de filtres dans Scene_QuestBook sans erreur");

console.log("✔ Scene_QuestBook s'initialise et commute les filtres sans aucune erreur");
testsPassed++;

console.log(`\n==============================================================`);
console.log(`   TOUS LES TESTS ONT RÉUSSI : ${testsPassed}/${testsPassed} PASSED`);
console.log(`==============================================================\n`);
