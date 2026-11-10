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
        this._rect = rect;
        this._handlers = {};
        this._visible = true;
        this._openness = 255;
        this._active = true;
    }
    setHandler(s, h) { this._handlers[s] = h; }
    callHandler(s) { if (this._handlers[s]) this._handlers[s](); }
    open() { this._openness = 255; }
    close() { this._openness = 0; }
    activate() { this._active = true; }
    deactivate() { this._active = false; }
    destroy() {}
    refresh() {}
    select() {}
};

global.Window_SpaceShipInfo = class Window_SpaceShipInfo extends global.Window_Base {
    setShip(s) { this._ship = s; }
};

global.Window_BridgeConsole = class Window_BridgeConsole extends global.Window_Base {
    setShipId(id) { this._shipId = id; }
    setMode(mode) { this._mode = mode; }
    currentExt() { return { id: "test_poi" }; }
};

global.Window_FactionInfo = class Window_FactionInfo extends global.Window_Base {
    setFaction(id, title) { this._factionId = id; this._title = title; }
};

global.Window_RelationStatus = class Window_RelationStatus extends global.Window_Base {
    setRelation(rel, actor) { this._relation = rel; this._actor = actor; }
};

global.Window_InteractionCommand = class Window_InteractionCommand extends global.Window_Base {
    setAvailableInteractions(list) { this._interactions = list; }
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
assert.strictEqual(relDialog.targetActorId, 2, "targetActorId doit être 2");
assert.strictEqual(relDialog.targetEventId, 8, "targetEventId doit être 8");
assert.strictEqual(map5.currentSubScene(), relDialog, "Doit être la sous-scène active de map5");
console.log("✔ SubSceneManager.open() ouvre et injecte proprement SubScene_RelationDialog");
testsPassed++;

// TEST 8: Suspension & Restauration de SubScene_RelationDialog
console.log("\n[Test 8] Suspension & Restauration de SubScene_RelationDialog...");
assert.deepStrictEqual(relDialog.resumeArgs(), [2, 8], "resumeArgs doit retourner [2, 8]");

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

