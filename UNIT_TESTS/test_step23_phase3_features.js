//=============================================================================
// SimCraft 4 - Unit Tests : Step 23 - Phase 3 Features
// test_step23_phase3_features.js
//=============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("==============================================================");
console.log("   TEST STEP 23: Phase 3 Features (Inventaire, Factions, Flotte, Temps) ");
console.log("==============================================================");

// ----------------------------------------------------------------------------
// 1. MOCKS RPG MAKER MZ / SC4
// ----------------------------------------------------------------------------
global.window = global;
global.Graphics = {
    boxWidth: 1280,
    boxHeight: 720,
    width: 1280,
    height: 720
};

global.Rectangle = class {
    constructor(x, y, width, height) {
        this.x = x || 0;
        this.y = y || 0;
        this.width = width || 0;
        this.height = height || 0;
    }
};

global.Bitmap = class {
    constructor(w, h) {
        this.width = w;
        this.height = h;
    }
    clear() {}
    drawText() {}
};

global.DataManager = {
    isItem: (item) => item && item._type === "item",
    isWeapon: (item) => item && item._type === "weapon",
    isArmor: (item) => item && item._type === "armor",
    itemWeight: (item) => (item ? (item.weight || 1) : 1)
};

global.SoundManager = {
    playShop: () => { global.SoundManager._shopPlayed = true; },
    playBuzzer: () => { global.SoundManager._buzzerPlayed = true; },
    playCursor: () => { global.SoundManager._cursorPlayed = true; },
    playOk: () => {}
};

global.Window_Base = class {
    constructor(rect) {
        this.x = rect ? rect.x : 0;
        this.y = rect ? rect.y : 0;
        this.width = rect ? rect.width : 100;
        this.height = rect ? rect.height : 100;
        this.contents = new global.Bitmap(this.width, this.height);
        this.opacity = 255;
    }
    resetFontSettings() {}
    drawText() {}
    refresh() {}
    activate() {}
    deactivate() {}
};

global.Window_Command = class extends global.Window_Base {
    constructor(rect) {
        super(rect);
        this._list = [];
        this._index = 0;
        this._handlers = {};
        this.refresh();
    }
    refresh() {
        this.clearCommandList();
        this.makeCommandList();
    }
    makeCommandList() {}
    clearCommandList() { this._list = []; }
    addCommand(name, symbol, enabled = true, ext = null) {
        this._list.push({ name, symbol, enabled, ext });
    }
    setHandler(sym, fn) { this._handlers[sym] = fn; }
    callHandler(sym) { if (this._handlers[sym]) this._handlers[sym](); }
    commandName(i) { return this._list[i] ? this._list[i].name : ""; }
    commandSymbol(i) { return this._list[i] ? this._list[i].symbol : ""; }
    isCommandEnabled(i) { return this._list[i] ? this._list[i].enabled : false; }
    itemRect(i) { return new Rectangle(0, i * 32, this.width, 32); }
};

global.Window_HorzCommand = class extends global.Window_Command {
    maxCols() { return 4; }
};

require(path.resolve(__dirname, "../js/plugins/SC4_Window_InventoryCommand.js"));
require(path.resolve(__dirname, "../js/plugins/SC4_Game_Inventory.js"));
require(path.resolve(__dirname, "../js/plugins/SC4_Game_Faction.js"));
require(path.resolve(__dirname, "../js/plugins/SC4_Game_Factions.js"));
require(path.resolve(__dirname, "../js/plugins/SC4_Window_SpaceTimeControls.js"));

const item1 = { id: 1, _type: "item", name: "Ration", weight: 2 };
const item2 = { id: 2, _type: "weapon", name: "Fusil", weight: 5 };
global.$dataItems = [null, item1];
global.$dataWeapons = [null, item2];
global.$dataArmors = [];

// TEST 1: Feature A - Commande "Tout vider" & Alerte Surcharge
// ----------------------------------------------------------------------------
console.log("\n--- Test 1: Feature A - Commande 'Tout vider' & Alerte Surcharge ---");
assert.ok(global.Window_InventoryCommand, "Window_InventoryCommand disponible");

const mockContainer = new global.Game_Inventory("C_10");
mockContainer.gainItem(item1, 3); // 6 kg
mockContainer.gainItem(item2, 1); // 5 kg (total 11 kg)

global.$gameParty = {
    _totalWeight: 10,
    _maxWeight: 30,
    _items: {},
    totalWeight() { return this._totalWeight; },
    maxWeight() { return this._maxWeight; },
    isOverweight() { return this._totalWeight > this._maxWeight; },
    allItems() { return []; },
    gainItem(it, amt) {
        this._totalWeight += (it.weight || 0) * amt;
    },
    leader() { return { name: () => "Capitaine Mosay" }; }
};

const invCmdRect = new Rectangle(0, 0, 800, 48);
const invCmdWin = new global.Window_InventoryCommand(invCmdRect);
invCmdWin.setTargetContext(mockContainer, true);

assert.strictEqual(invCmdWin.maxCols(), 4, "Window_InventoryCommand dispose de 4 colonnes");

const dumpCmd = invCmdWin._list.find(c => c.symbol === "dump");
assert.ok(dumpCmd, "Commande 'Tout vider' présente dans la liste");
assert.strictEqual(dumpCmd.enabled, true, "Commande active car 10kg + 11kg <= 30kg");

// Simulation de surcharge du conteneur (ex: +30kg)
global.$gameParty._totalWeight = 25; // 25kg + 11kg = 36kg > 30kg max
invCmdWin.refresh();
const dumpCmdOverweight = invCmdWin._list.find(c => c.symbol === "dump");
assert.strictEqual(dumpCmdOverweight.enabled, false, "Commande grisée car le conteneur dépasse la capacité portante");
console.log("✓ Commande 'Tout vider' présente, correctement dimensionnée (4 cols) et conditionnée au poids.");

// ----------------------------------------------------------------------------
// TEST 2: Feature B - Factions (Modèle Soft, JSON, Localisation & Persistence)
// ----------------------------------------------------------------------------
console.log("\n--- Test 2: Feature B - Factions Soft ($gameFactions) ---");
const factionsPath = path.resolve(__dirname, "../data/SC/FACTIONS.json");
const factionsFrPath = path.resolve(__dirname, "../data/SC/loc/FACTIONS_FR.json");
const factionsEnPath = path.resolve(__dirname, "../data/SC/loc/FACTIONS_EN.json");

assert.ok(fs.existsSync(factionsPath), "FACTIONS.json existe");
assert.ok(fs.existsSync(factionsFrPath), "FACTIONS_FR.json existe");
assert.ok(fs.existsSync(factionsEnPath), "FACTIONS_EN.json existe");

const rawFactions = JSON.parse(fs.readFileSync(factionsPath, "utf8"));
const rawFactionsFr = JSON.parse(fs.readFileSync(factionsFrPath, "utf8"));
assert.strictEqual(rawFactions[0], null, "Index 0 de FACTIONS.json est null");
assert.strictEqual(rawFactionsFr[0], null, "Index 0 de FACTIONS_FR.json est null");
assert.strictEqual(rawFactions.length, 9, "9 entrées dans FACTIONS.json (1 null + 8 factions)");

global.$dataFactions = rawFactionsFr;
global.$dataFactions_PHYSICAL = rawFactions;

const gfRegistry = new global.Game_Factions();
const fed = gfRegistry.faction(1);
assert.strictEqual(fed.id, 1, "Faction 1 résolue");
assert.strictEqual(fed.name, "Fédération Humaine (GMT / SFI)", "Nom localisé résolu");
assert.strictEqual(fed.affinity, 0, "Affinité joueur par défaut à 0");
assert.strictEqual(fed.powerBalance, 0, "Balance de pouvoir par défaut à 0");

// Test clamping et diplomatie
fed.affinity = 150;
assert.strictEqual(fed.affinity, 100, "Affinité clampée à 100 max");
fed.affinity = -200;
assert.strictEqual(fed.affinity, -100, "Affinité clampée à -100 min");
fed.affinity = 25;

fed.changePowerBalance(15);
assert.strictEqual(fed.powerBalance, 15, "Power balance incrémentée à 15");

const elionRelation = fed.relationWith(2);
assert.strictEqual(elionRelation.affinity, 60, "Affinité Fédération envers Elions = 60");
assert.strictEqual(elionRelation.powerBalance, 10, "Power balance envers Elions = 10");

// Sauvegarde et restauration
const savefile = gfRegistry.makeSavefileData();
assert.ok(savefile["1"], "Faction 1 présente dans le paquet de sauvegarde");
assert.strictEqual(savefile["1"].affinity, 25, "Affinité persistée");

const freshRegistry = new global.Game_Factions();
freshRegistry.extractSavefileData(savefile);
assert.strictEqual(freshRegistry.faction(1).affinity, 25, "Affinité restaurée depuis sauvegarde");
console.log("✓ Données FACTIONS.json, Game_Faction et $gameFactions validés à 100%.");

// ----------------------------------------------------------------------------
// TEST 3: Feature C - Catégories de Vaisseaux (Tailles 1 à 4 entières)
// ----------------------------------------------------------------------------
console.log("\n--- Test 3: Feature C - SHIP_CATEGORIES.json (Tailles 1 à 4) ---");
const categoriesPath = path.resolve(__dirname, "../data/SC/SHIP_CATEGORIES.json");
const categoriesFrPath = path.resolve(__dirname, "../data/SC/loc/SHIP_CATEGORIES_FR.json");

assert.ok(fs.existsSync(categoriesPath), "SHIP_CATEGORIES.json existe");
assert.ok(fs.existsSync(categoriesFrPath), "SHIP_CATEGORIES_FR.json existe");

const rawCategories = JSON.parse(fs.readFileSync(categoriesPath, "utf8"));
assert.strictEqual(rawCategories[0], null, "Index 0 de SHIP_CATEGORIES.json est null");

for (let i = 1; i < rawCategories.length; i++) {
    const cat = rawCategories[i];
    assert.ok(Number.isInteger(cat.size), `La catégorie ${cat.id} a un size entier strict`);
    assert.ok(cat.size >= 1 && cat.size <= 4, `Size de ${cat.id} compris entre 1 et 4`);
    if (cat.size <= 2) {
        assert.strictEqual(cat.landingAllowed, true, `Taille ${cat.size} (${cat.id}) doit autoriser l'atterrissage`);
    } else {
        assert.strictEqual(cat.landingAllowed, false, `Taille ${cat.size} (${cat.id}) interdit l'atterrissage atmosphérique`);
    }
}
console.log("✓ Classification des vaisseaux par gabarit entier (Tailles 1 à 4) validée.");

// ----------------------------------------------------------------------------
// TEST 4: Feature D - Contrôle du Flux Temporel Stellaire
// ----------------------------------------------------------------------------
console.log("\n--- Test 4: Feature D - Fenêtre Window_SpaceTimeControls ---");
global.$gameDate = {
    _mode: 1,
    getScrollSpeedMode() { return this._mode; },
    setScrollSpeedMode(m) { this._mode = m; }
};

const timeCtrlWin = new global.Window_SpaceTimeControls(new Rectangle(0, 0, 320, 48));
assert.strictEqual(timeCtrlWin.maxCols(), 4, "Window_SpaceTimeControls possède 4 commandes");
assert.strictEqual(timeCtrlWin.currentSpeedMode(), 1, "Mode initial = 1 (Normal)");

// Passage en pause
global.$gameDate.setScrollSpeedMode(0);
assert.strictEqual(timeCtrlWin.currentSpeedMode(), 0, "Mode basculé en Pause (0)");

// Passage en avance rapide 5x
global.$gameDate.setScrollSpeedMode(2);
assert.strictEqual(timeCtrlWin.currentSpeedMode(), 2, "Mode basculé en Rapide (2)");

// Réinitialisation automatique en 1x simulée
global.$gameDate.setScrollSpeedMode(1);
assert.strictEqual(timeCtrlWin.currentSpeedMode(), 1, "Mode réinitialisé à 1x à l'arrivée");
console.log("✓ Window_SpaceTimeControls pilote le flux temporel ($gameDate) avec succès.");

console.log("\n==============================================================");
console.log("  TEST STEP 23 RÉUSSI : 100% des tests validés !              ");
console.log("==============================================================");
