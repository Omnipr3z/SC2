//=============================================================================
// SimCraft 4 - Unit Tests : Step 22 - SubScene Base & SubScene Console
// test_step22_subscenes.js
//=============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("==============================================================");
console.log("   TEST STEP 22: SubScene Architecture & Console Orchestrator ");
console.log("==============================================================");

// ----------------------------------------------------------------------------
// 1. MOCKS RPG MAKER MZ / PIXI
// ----------------------------------------------------------------------------
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
    fillAll() {}
    clear() {}
};

global.PIXI = {
    Container: class {
        constructor() {
            this.children = [];
        }
        addChild(c) {
            this.children.push(c);
            return c;
        }
        removeChild(c) {
            const idx = this.children.indexOf(c);
            if (idx >= 0) this.children.splice(idx, 1);
            return c;
        }
        destroy() {
            this.children = [];
        }
    }
};

global.Stage = class extends global.PIXI.Container {
    initialize() {
        this.children = [];
    }
};

global.Sprite = class extends global.PIXI.Container {
    constructor() {
        super();
        this.bitmap = null;
        this.opacity = 255;
    }
};

global.WindowLayer = class extends global.PIXI.Container {
    constructor() {
        super();
        this.x = 0;
        this.y = 0;
    }
};

global.Scene_Base = class extends global.Stage {
    constructor() {
        super();
        this.initialize();
    }
    initialize() {
        super.initialize();
        this._active = false;
        this._windowLayer = null;
    }
    createWindowLayer() {
        this._windowLayer = new global.WindowLayer();
        this.addChild(this._windowLayer);
    }
    addWindow(win) {
        if (this._windowLayer) {
            this._windowLayer.addChild(win);
        } else {
            this.addChild(win);
        }
    }
    isActive() {
        return this._active;
    }
    update() {
        this.updateChildren();
    }
    updateChildren() {
        for (let i = 0; i < this.children.length; i++) {
            const c = this.children[i];
            if (c && typeof c.update === "function") c.update();
        }
    }
};

global.Scene_Map = class extends global.Scene_Base {
    constructor() {
        super();
        this._currentSubScene = null;
    }
    update() {
        super.update();
    }
    processMapTouch() {}
    isMenuEnabled() { return true; }
};

global.Window_Base = class extends global.PIXI.Container {
    constructor(rect) {
        super();
        this.x = rect ? rect.x : 0;
        this.y = rect ? rect.y : 0;
        this.width = rect ? rect.width : 100;
        this.height = rect ? rect.height : 100;
        this.contents = new global.Bitmap(this.width, this.height);
        this._open = true;
        this._active = true;
    }
    open() { this._open = true; }
    close() { this._open = false; }
    activate() { this._active = true; }
    deactivate() { this._active = false; }
    destroy() { super.destroy(); }
};

global.Window_Command = class extends global.Window_Base {
    constructor(rect) {
        super(rect);
        this._list = [];
        this._index = 0;
        this._handlers = {};
    }
    clearCommandList() { this._list = []; }
    addCommand(name, symbol, enabled = true, ext = null) {
        this._list.push({ name, symbol, enabled, ext });
    }
    setHandler(symbol, method) { this._handlers[symbol] = method; }
    callHandler(symbol) {
        if (this._handlers[symbol]) this._handlers[symbol]();
    }
    select(i) { this._index = i; }
    currentExt() {
        const cmd = this._list[this._index];
        return cmd ? cmd.ext : null;
    }
};

global.Window_SpaceShipInfo = class extends global.Window_Base {
    constructor(rect) {
        super(rect);
        this._ship = null;
    }
    setShip(ship) {
        this._ship = ship;
    }
};

// ----------------------------------------------------------------------------
// 2. DONNÉES SPATIALES & ÉTAT DE JEU
// ----------------------------------------------------------------------------
global.Game_System = class {
    constructor() {
        this._landingAuthorizations = {};
    }
    setLandingAuthorized(id, val) {
        this._landingAuthorizations[id] = !!val;
    }
    isLandingAuthorized(id) {
        if (this._landingAuthorizations[id] !== undefined) {
            return this._landingAuthorizations[id];
        }
        return false;
    }
};

global.$gameSystem = new global.Game_System();

global.mockShip = {
    id: 1,
    name: "Dawn of Faith",
    orbitingPlanetId: 5,
    orbitingPlanet: { id: 5, name: "Ankaros Prime", landingAllowed: true },
    isLanded: () => null,
    aboard: () => {},
    leaveHost: () => {}
};

global.$gameSpaceships = {
    playerShip: () => global.mockShip,
    ship: (id) => (id === 1 ? global.mockShip : null)
};

global.$gamePOIs = {
    getAll: () => [
        { id: "prime_spatioport", name: "Spatioport Magellan", planetId: 5, landingMapId: 37, landingX: 127, landingY: 58 },
        { id: "prime_ruins", name: "Ruines d'Ankaros", planetId: 5, landingMapId: 38, landingX: 10, landingY: 10 }
    ],
    get: (id) => global.$gamePOIs.getAll().find(p => p.id === id)
};

global.SC4 = {
    isLandingAuthorized: (id) => global.$gameSystem.isLandingAuthorized(id),
    performLandingSequence: (poiId) => { global.SC4._lastLandedPoi = poiId; },
    performTakeoffSequence: () => { global.SC4._takeoffExecuted = true; },
    openNavigation: () => { global.SC4._navOpened = true; }
};

global.SceneManager = {
    _scene: null,
    push: () => {}
};

// ----------------------------------------------------------------------------
// 3. CHARGEMENT DES PLUGINS SOUS TEST
// ----------------------------------------------------------------------------
require(path.resolve(__dirname, "../js/plugins/SC4_Window_BridgeConsole.js"));
require(path.resolve(__dirname, "../js/plugins/SC4_SubScene_Base.js"));
require(path.resolve(__dirname, "../js/plugins/SC4_SubScene_Console.js"));

// ----------------------------------------------------------------------------
// TEST 1: SubScene_Base Heritage & Cycle de Vie
// ----------------------------------------------------------------------------
console.log("\n--- Test 1: SubScene_Base Heritage & Cycle de Vie ---");
assert.ok(global.SubScene_Base, "SubScene_Base exportée globalement");

let dummyUpdateCalled = false;
class CustomSubScene extends global.SubScene_Base {
    initMembers() {
        this.testVar = "initialized";
    }
    createDisplayObjects() {
        this.dummyWin = new global.Window_Base(new Rectangle(0, 0, 100, 100));
        this.addWindow(this.dummyWin);
    }
    updateMain() {
        dummyUpdateCalled = true;
    }
}

const mockParentScene = new global.Scene_Map();
const subScene = new CustomSubScene(mockParentScene);

assert.strictEqual(subScene.testVar, "initialized", "initMembers exécuté correctement");
assert.strictEqual(subScene.parentScene, mockParentScene, "ParentScene correctement liée");

subScene.create();
assert.ok(subScene._dimmerSprite, "Dimmer créé pour assombrir l'arrière-plan");
assert.ok(subScene._windowLayer, "WindowLayer initialisé");
assert.strictEqual(subScene._windows.length, 1, "addWindow a enregistré la fenêtre enfant");

subScene.start();
assert.strictEqual(subScene.isActive(), true, "SubScene est active après start()");

subScene.update();
assert.strictEqual(dummyUpdateCalled, true, "updateMain appelé lors de l'update");

let closeCalled = false;
mockParentScene.closeSubScene = () => { closeCalled = true; };
subScene.close();
assert.strictEqual(closeCalled, true, "subScene.close() a délégué la fermeture à parentScene");

subScene.stop();
assert.strictEqual(subScene.isActive(), false, "SubScene inactive après stop()");

subScene.terminate();
assert.strictEqual(subScene._windows.length, 0, "Fenêtres détruites au terminate()");
console.log("✓ SubScene_Base respecte 100% du cycle de vie Scene_Base de manière sécurisée.");

// ----------------------------------------------------------------------------
// TEST 2: SubScene_Console Dual-Window Layout
// ----------------------------------------------------------------------------
console.log("\n--- Test 2: SubScene_Console Dual-Window Layout ---");
assert.ok(global.SubScene_Console, "SubScene_Console exportée globalement");
assert.ok(global.SubScene_BridgeConsole, "Alias SubScene_BridgeConsole exporté");

const consoleSubScene = new global.SubScene_Console(mockParentScene, 1);
assert.strictEqual(consoleSubScene.targetShip, global.mockShip, "targetShip résout Dawn of Faith (ship 1)");

consoleSubScene.create();
assert.ok(consoleSubScene._shipInfoWindow, "Volet Gauche (Window_SpaceShipInfo) créé");
assert.ok(consoleSubScene._consoleWindow, "Volet Droit (Window_BridgeConsole) créé");

// Vérification de la géométrie côte-à-côte (dual-screen)
const shipWin = consoleSubScene._shipInfoWindow;
const cmdWin = consoleSubScene._consoleWindow;

assert.strictEqual(shipWin.width, 420, "Largeur volet télémétrique = 420px");
assert.strictEqual(cmdWin.width, 460, "Largeur console de pilotage = 460px");
assert.strictEqual(shipWin.y, cmdWin.y, "Les deux fenêtres sont alignées verticalement");
assert.strictEqual(cmdWin.x, shipWin.x + 420 + 20, "Espacement de 20px entre les deux fenêtres");

consoleSubScene.start();
assert.strictEqual(cmdWin._open, true, "Console ouverte au start()");
assert.strictEqual(shipWin._open, true, "Fiche vaisseau ouverte au start()");
console.log("✓ SubScene_Console orchestre parfaitement le pupitre bi-écran (Télémétrie + Commandes).");

// ----------------------------------------------------------------------------
// TEST 3: SubScene_Console Navigation & Option A Site Selection
// ----------------------------------------------------------------------------
console.log("\n--- Test 3: SubScene_Console Handlers & Option A Landing ---");
global.$gameSystem.setLandingAuthorized("prime_spatioport", true);
global.$gameSystem.setLandingAuthorized("prime_ruins", false);
cmdWin.refresh();

// 1. Clic sur Atterrir -> Bascule en mode land_sites
consoleSubScene.onLand();
assert.strictEqual(cmdWin._mode, "land_sites", "Mode basculé sur land_sites");

const spatioportCmd = cmdWin._list.find(c => c.ext && c.ext.id === "prime_spatioport");
const ruinsCmd = cmdWin._list.find(c => c.ext && c.ext.id === "prime_ruins");
assert.ok(spatioportCmd, "Spatioport Magellan listé");
assert.strictEqual(spatioportCmd.enabled, true, "Spatioport autorisé");
assert.ok(ruinsCmd, "Ruines d'Ankaros listées");
assert.strictEqual(ruinsCmd.enabled, false, "Ruines grisées sans autorisation");

// 2. Sélection du Spatioport
cmdWin._index = cmdWin._list.indexOf(spatioportCmd);
let closedByLanding = false;
mockParentScene.closeSubScene = () => { closedByLanding = true; };
consoleSubScene.onSelectPoi();

assert.strictEqual(global.SC4._lastLandedPoi, "prime_spatioport", "Atterrissage ciblé sur prime_spatioport");
assert.strictEqual(closedByLanding, true, "SubScene fermée à l'atterrissage");

// 3. Décollage
let closedByTakeoff = false;
consoleSubScene._closing = false;
mockParentScene.closeSubScene = () => { closedByTakeoff = true; };
consoleSubScene.onTakeoff();
assert.strictEqual(global.SC4._takeoffExecuted, true, "Décollage exécuté");
assert.strictEqual(closedByTakeoff, true, "SubScene fermée au décollage");
console.log("✓ Handlers de navigation et atterrissage Option A validés dans SubScene_Console.");

// ----------------------------------------------------------------------------
// TEST 4: Scene_Map SubScene Management & API Unifiée
// ----------------------------------------------------------------------------
console.log("\n--- Test 4: Scene_Map SubScene Management & API Unifiée ---");
const mapScene = new global.Scene_Map();
global.SceneManager._scene = mapScene;

// Ouverture via SC4.openBridgeConsole(1)
const opened = global.SC4.openBridgeConsole(1);
assert.strictEqual(mapScene.currentSubScene(), opened, "Sous-scène enregistrée sur Scene_Map");
assert.strictEqual(mapScene.isMenuEnabled(), false, "Menu principal désactivé pendant la sous-scène");

// Fermeture
mapScene.closeSubScene();
assert.strictEqual(mapScene.currentSubScene(), null, "Sous-scène détachée");
assert.strictEqual(mapScene.isMenuEnabled(), true, "Menu principal réactivé");
console.log("✓ Intégration Scene_Map et façade SC4.openBridgeConsole validées à 100%.");

console.log("\n==============================================================");
console.log("  TEST STEP 22 RÉUSSI : 100% des tests validés !              ");
console.log("==============================================================");
