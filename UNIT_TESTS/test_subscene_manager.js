const assert = require("assert");
const path = require("path");
const fs = require("fs");

console.log("==============================================================");
console.log("   UNIT TEST : SUBSCENE MANAGER & PERSISTENCE               ");
console.log("==============================================================");

// Mock environnement RMMZ
global.window = global;
global.Graphics = { width: 1280, height: 720, boxWidth: 1280, boxHeight: 720 };
global.Input = { isTriggered: () => false };
global.SoundManager = { playOk: () => {}, playCancel: () => {}, playBuzzer: () => {} };

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
    }
    fillAll() {}
    clear() {}
};

global.Sprite = class Sprite {
    constructor() {
        this.bitmap = null;
        this.opacity = 255;
    }
};

global.Stage = class Stage {
    constructor() {
        this.children = [];
    }
    addChild(c) { this.children.push(c); }
    removeChild(c) {
        const i = this.children.indexOf(c);
        if (i >= 0) this.children.splice(i, 1);
    }
};

global.Scene_Base = class Scene_Base extends global.Stage {
    createWindowLayer() {}
    update() {}
};

global.Window_Base = class Window_Base {
    constructor(rect) {
        this.initialize(rect);
    }
    initialize(rect) {
        this._rect = rect;
        this.x = rect ? rect.x : 0;
        this.y = rect ? rect.y : 0;
        this.width = rect ? rect.width : 0;
        this.height = rect ? rect.height : 0;
        this.padding = 12;
        this.opacity = 255;
        this.openness = 255;
        this._handlers = {};
        this._visible = true;
        this.visible = true;
        this._active = true;
        this.active = true;
        this.contents = { clear: () => {}, drawText: () => {}, fillRect: () => {}, blt: () => {} };
    }
    setHandler(s, h) { this._handlers[s] = h; }
    isHandled(s) { return Boolean(this._handlers[s]); }
    callHandler(s) { if (this._handlers[s]) this._handlers[s](); }
    open() { this.openness = 255; this.visible = true; }
    close() { this.openness = 0; }
    show() { this.visible = true; this._visible = true; }
    hide() { this.visible = false; this._visible = false; }
    isOpen() { return this.openness >= 255; }
    isClosed() { return this.openness === 0; }
    activate() { this._active = true; this.active = true; }
    deactivate() { this._active = false; this.active = false; }
    createContents() {}
    drawText() {}
    drawIcon() {}
    destroy() {}
    refresh() {}
    select() {}
    update() {}
};

global.Window_Selectable = class Window_Selectable extends global.Window_Base {
    initialize(rect) {
        super.initialize(rect);
        this._index = 0;
        this._cursorRect = new global.Rectangle(0, 0, 0, 0);
    }
    index() { return this._index; }
    select(i) { this._index = i; }
    setCursorRect(x, y, w, h) { this._cursorRect = new global.Rectangle(x, y, w, h); }
    updateCursor() {}
    cursorDown() {}
    cursorUp() {}
};

global.Window_Command = class Window_Command extends global.Window_Selectable {
    initialize(rect) {
        super.initialize(rect);
        this._list = [];
        this.makeCommandList();
    }
    clearCommandList() { this._list = []; }
    makeCommandList() {}
    addCommand(name, symbol, enabled = true, ext = null) {
        this._list.push({ name, symbol, enabled, ext });
    }
    maxItems() { return this._list ? this._list.length : 0; }
    refresh() {
        this.clearCommandList();
        this.makeCommandList();
    }
};

global.Window_SpaceShipInfo = class Window_SpaceShipInfo extends global.Window_Base {
    setShip(s) { this._ship = s; }
};

global.Window_BridgeConsole = class Window_BridgeConsole extends global.Window_Base {
    setShipId(id) { this._shipId = id; }
    setMode(mode) { this._mode = mode; }
    currentExt() { return { id: "test_poi" }; }
};

global.$gamePlayer = {
    screenX: () => 640,
    screenY: () => 400,
    direction: () => 2
};

global.DEBUGTOOL = { log: () => {}, warn: () => {}, error: () => {} };
global.$gameParty = {
    leader: () => ({ actorId: () => 1 })
};
global.$gameActors = {
    actor: (id) => ({ actorId: () => id, name: () => "Test Actor " + id })
};

global.$relationManager = {
    getActorFactionId: (id) => 1,
    getRelationWithPlayer: (id) => ({ trust: 50, respect: 40 }),
    getAvailableInteractions: (id) => ["chat"],
    openRelationDialog: (targetActorId = 2, targetEventId = null) => {
        return SubSceneManager.open(SubScene_RelationDialog, targetActorId, targetEventId);
    }
};

let exchangeEnded = false;
global.$relationDialogManager = {
    startExchange: (targetActorId) => ({ relation: { trust: 50, respect: 40 }, availableInteractions: ["chat"] }),
    endExchange: () => { exchangeEnded = true; }
};

const baseDir = path.resolve(__dirname, "..");
require(path.join(baseDir, "js/plugins/SC4_Window_RingCommand.js"));
require(path.join(baseDir, "js/plugins/SC4_Window_InteractionRingCommand.js"));
require(path.join(baseDir, "js/plugins/SC4_SubSceneManager.js"));
require(path.join(baseDir, "js/plugins/SC4_SubScene_Base.js"));
require(path.join(baseDir, "js/plugins/SC4_SubScene_Console.js"));
require(path.join(baseDir, "js/plugins/SC4_SubScene_RelationDialog.js"));

// Mock Scene_Map avec gestion des SubScenes
class MockScene_Map extends global.Scene_Base {
    constructor() {
        super();
        this._currentSubScene = null;
        this._subSceneStack = [];
        this._subSceneInputBlocked = false;
    }
    openSubScene(subSceneClass, ...args) {
        const subScene = new subSceneClass(this, ...args);
        this._currentSubScene = subScene;
        this.addChild(subScene);
        subScene.create();
        subScene.start();
        this.onSubSceneOpen(subScene);
        return subScene;
    }
    closeSubScene(result = null) {
        if (this._currentSubScene) {
            const closing = this._currentSubScene;
            closing.stop();
            closing.terminate();
            this.removeChild(closing);
            this._currentSubScene = null;
            this.onSubSceneClose(closing);
        }
    }
    onSubSceneOpen() { this._subSceneInputBlocked = true; }
    onSubSceneClose() { this._subSceneInputBlocked = false; }
    currentSubScene() { return this._currentSubScene; }
    start() {
        SubSceneManager.resume(this);
    }
}

let testsPassed = 0;

// TEST 1: Initialisation & API de base de SubSceneManager
console.log("\n[Test 1] Vérification de base SubSceneManager...");
assert.strictEqual(SubSceneManager.isSuspended(), false, "Initialement non suspendu");
assert.strictEqual(SubSceneManager.suspendedData(), null, "Aucune donnée suspendue au départ");
console.log("✔ SubSceneManager initialisé correctement");
testsPassed++;

// TEST 2: Ouverture de SubScene_Console sur Scene_Map
console.log("\n[Test 2] Ouverture de SubScene_Console sur Scene_Map...");
global.$gameSpaceships = {
    ship: (id) => ({ id, name: "Alpha Ship" }),
    playerShip: () => ({ id: 0, name: "Alpha Ship" })
};

const map1 = new MockScene_Map();
const consoleSubScene = map1.openSubScene(SubScene_Console, 0);
assert.ok(consoleSubScene, "Sous-scène console créée");
assert.strictEqual(map1.currentSubScene(), consoleSubScene, "Sous-scène active enregistrée sur Scene_Map");
assert.strictEqual(consoleSubScene.targetShip.id, 0, "Cible le vaisseau ID 0");
assert.strictEqual(consoleSubScene._consoleWindow._mode, "main", "Console en mode main");
console.log("✔ SubScene_Console ouverte et active");
testsPassed++;

// TEST 3: Navigation & Suspension inter-scènes
console.log("\n[Test 3] Déclenchement de onNavigation() et suspension...");
let pushedSceneClass = null;
global.SceneManager = {
    _scene: map1,
    push: (sceneCls) => { pushedSceneClass = sceneCls; }
};
global.Scene_SpaceTravel = class Scene_SpaceTravel extends global.Scene_Base {};

consoleSubScene.onNavigation();
assert.strictEqual(SubSceneManager.isSuspended(), true, "SubSceneManager doit être marqué suspendu");
const suspended = SubSceneManager.suspendedData();
assert.ok(suspended, "Données de suspension présentes");
assert.strictEqual(suspended.subSceneClass, SubScene_Console, "Classe mémorisée = SubScene_Console");
assert.deepStrictEqual(suspended.args, [0], "Arguments mémorisés = [0]");
assert.deepStrictEqual(suspended.resumeData, { mode: "main" }, "resumeData = { mode: 'main' }");
console.log("✔ SubSceneManager.suspend() mémorise fidèlement la sous-scène");
testsPassed++;

// TEST 4: Restauration automatique au retour sur Scene_Map (popScene -> new Scene_Map)
console.log("\n[Test 4] Restauration automatique sur nouvelle Scene_Map...");
const map2 = new MockScene_Map();
global.SceneManager._scene = map2;

// map2 démarre (start())
map2.start();

const restoredConsole = map2.currentSubScene();
assert.ok(restoredConsole, "La console doit être restaurée sur map2");
assert.ok(restoredConsole instanceof SubScene_Console, "L'instance doit être une SubScene_Console");
assert.strictEqual(restoredConsole.targetShip.id, 0, "Le vaisseau ID 0 est bien conservé");
assert.strictEqual(restoredConsole._consoleWindow._mode, "main", "Mode restauré en 'main'");
assert.strictEqual(SubSceneManager.isSuspended(), false, "L'état suspendu doit être consommé et vidé");
console.log("✔ SubSceneManager.resume() a réinstancié la console avec son contexte");
testsPassed++;

// TEST 5: Consommation unique (pas de réouverture intempestive au start suivant)
console.log("\n[Test 5] Consommation unique (aucune réouverture multiple)...");
const map3 = new MockScene_Map();
global.SceneManager._scene = map3;
map3.start();
assert.strictEqual(map3.currentSubScene(), null, "Aucune sous-scène ne doit être ouverte sur map3");
console.log("✔ L'état suspendu a bien été consommé de façon unique");
testsPassed++;

// TEST 6: Purge explicite lors d'un atterrissage ou d'une sortie
console.log("\n[Test 6] Purge explicite (clear)...");
const map4 = new MockScene_Map();
const consoleToQuit = map4.openSubScene(SubScene_Console, 0);
// Simulation clic quitter
consoleToQuit.onQuit();
assert.strictEqual(map4.currentSubScene(), null, "La sous-scène a été fermée sur map4");
assert.strictEqual(SubSceneManager.isSuspended(), false, "SubSceneManager ne doit rien avoir en suspend");

// Vérification que le start suivant n'ouvre rien
map4.start();
assert.strictEqual(map4.currentSubScene(), null, "Aucune réouverture après quit");
console.log("✔ Purge explicite validée");
testsPassed++;

// TEST 7: SubSceneManager.open() & SubScene_RelationDialog
console.log("\n[Test 7] Ouverture universelle de SubScene_RelationDialog via SubSceneManager.open()...");
const map5 = new MockScene_Map();
global.SceneManager._scene = map5;

const relDialog = SubSceneManager.open(SubScene_RelationDialog, 2, 8);
assert.ok(relDialog, "SubScene_RelationDialog doit être instancié");
assert.strictEqual(relDialog._dimmerSprite, undefined, "SubScene_Base ne doit plus créer de dimmer");
assert.ok(relDialog._commandWindow instanceof Window_RingCommand, "La roue de commandes doit être Window_RingCommand");
assert.strictEqual(relDialog.targetActorId, 2, "targetActorId doit être 2");
assert.strictEqual(relDialog.targetEventId, 8, "targetEventId doit être 8");
assert.strictEqual(map5.currentSubScene(), relDialog, "Doit être la sous-scène active de map5");
console.log("✔ SubSceneManager.open() ouvre et injecte proprement SubScene_RelationDialog");
testsPassed++;

// TEST 8: Suspension & Restauration de SubScene_RelationDialog
console.log("\n[Test 8] Suspension & Restauration de SubScene_RelationDialog...");
assert.deepStrictEqual(relDialog.resumeArgs(), [2, 8, {}], "resumeArgs doit retourner [2, 8, options]");

// Suspension simulée (ex: ouverture de l'inventaire ou du codex)
relDialog.suspend({ lastInteraction: "chat" });
assert.strictEqual(SubSceneManager.isSuspended(), true, "SubSceneManager doit être marqué suspendu");

// Simulation retour sur nouvelle instance de Scene_Map
const map6 = new MockScene_Map();
global.SceneManager._scene = map6;
map6.start();

const restoredDialog = map6.currentSubScene();
assert.ok(restoredDialog, "Dialogue relationnel restauré sur map6");
assert.ok(restoredDialog instanceof SubScene_RelationDialog, "Doit être une instance de SubScene_RelationDialog");
assert.strictEqual(restoredDialog.targetActorId, 2, "targetActorId conservé (2)");
assert.strictEqual(restoredDialog.targetEventId, 8, "targetEventId conservé (8)");
assert.strictEqual(SubSceneManager.isSuspended(), false, "État suspendu consommé");
console.log("✔ SubScene_RelationDialog restauré fidèlement avec interlocuteur et événement ancrés");
testsPassed++;

// TEST 9: Clôture du dialogue et notification à RelationDialogManager
console.log("\n[Test 9] Clôture du dialogue (onCommandCancel)...");
exchangeEnded = false;
restoredDialog.onCommandCancel();
assert.strictEqual(map6.currentSubScene(), null, "Dialogue fermé sur map6");
assert.strictEqual(exchangeEnded, true, "endExchange() doit être appelé sur $relationDialogManager");
assert.strictEqual(SubSceneManager.isSuspended(), false, "SubSceneManager ne doit rien avoir en suspend");

// Vérification qu'une nouvelle Scene_Map ne réouvre rien
const map7 = new MockScene_Map();
global.SceneManager._scene = map7;
map7.start();
assert.strictEqual(map7.currentSubScene(), null, "Aucune réouverture intempestive après clôture");
console.log("✔ Clôture propre et notification au service de session validées");
testsPassed++;

console.log(`\n==============================================================`);
console.log(`   TOUS LES TESTS ONT RÉUSSI : ${testsPassed}/${testsPassed} PASSED`);
console.log(`==============================================================\n`);

