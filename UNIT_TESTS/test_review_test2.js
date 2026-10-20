//=============================================================================
// test_review_test2.js
// Tests unitaires validant l'ensemble des fonctionnalités de "Review test 2" :
// 1. Réagencement de l'UI des 3 scènes spatiales (1760x990, grille harmonisée)
// 2. MapId et coordonnées d'onboarding sur les vaisseaux
// 3. Système d'onboarding (V[id], D[id], P[id]) et méthodes associées
// 4. Matrice de compatibilité d'embarquement et amarrage (_dockingAllowed)
// 5. Atterrissage et stockage de la variable NEF_ID (variable 41)
//=============================================================================

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

// Simulation de l'environnement RMMZ
global.window = global;
global.Graphics = { width: 1760, height: 990, boxWidth: 1760, boxHeight: 990 };
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
        this.context = {
            beginPath: () => {},
            arc: () => {},
            fill: () => {}
        };
    }
    drawLine() {}
    strokeRect() {}
};
global.Sprite = class Sprite {
    constructor() {
        this.scale = { x: 1, y: 1 };
        this.anchor = { x: 0, y: 0 };
    }
};
global.ImageManager = {
    loadSystem: () => ({}),
    loadBitmap: () => ({ addLoadListener: () => {} })
};
global.ConfigManager = { locale: "FR" };
global.Game_System = class Game_System {
    constructor() { this._locale = "FR"; }
    mainFontFace() { return "sans-serif"; }
    windowPadding() { return 12; }
};
global.$gameSystem = new global.Game_System();

global.PluginManager = {
    parameters: (plugin) => {
        if (plugin === "SC4_SpaceTravel") {
            return { enableBackgroundSimulation: "true", nefVariableId: "41" };
        }
        return {};
    },
    registerCommand: () => {}
};
global.Input = { isPressed: () => false, isTriggered: () => false };
global.TouchInput = { isTriggered: () => false, isLongPressed: () => false };
global.SceneManager = { goto: () => {}, push: () => {}, pop: () => {} };
global.SoundManager = { playOk: () => {}, playCancel: () => {}, playCursor: () => {}, playBuzzer: () => {} };
global.Utils = { approach: (c, t, s) => (c < t ? Math.min(t, c + s) : Math.max(t, c - s)) };

global.Window_Base = class Window_Base {
    constructor(rect) {
        this.x = rect ? rect.x : 0;
        this.y = rect ? rect.y : 0;
        this.width = rect ? rect.width : 0;
        this.height = rect ? rect.height : 0;
        this.contents = {
            clear: () => {},
            fillRect: () => {},
            drawText: () => {},
            strokeRect: () => {}
        };
    }
    contentsWidth() { return this.width - 24; }
    contentsHeight() { return this.height - 24; }
    addChild() {}
    drawText() {}
};

global.Window_Selectable = class Window_Selectable extends global.Window_Base {
    constructor(rect) { super(rect); }
    refresh() {}
    select() {}
    activate() {}
    deactivate() {}
};
global.Window_Command = class Window_Command extends global.Window_Selectable {
    constructor(rect) { super(rect); }
    setCommands() {}
    setHandler() {}
};
global.Window_HorzCommand = class Window_HorzCommand extends global.Window_Command {};

global.Scene_Base = class Scene_Base {
    constructor() { this._windowLayer = []; }
    addChild() {}
    addWindow(win) { this._windowLayer.push(win); }
    createWindowLayer() {}
    startFadeOut() {}
    update() {}
};
global.Scene_Map = class Scene_Map extends global.Scene_Base { update() {} };

// Variables et SelfSwitches RMMZ
global.mockVariables = {};
global.mockSelfSwitches = {};
global.$gameVariables = {
    setValue: (id, val) => { global.mockVariables[id] = val; },
    value: (id) => global.mockVariables[id] || 0
};
global.$gameSelfSwitches = {
    setValue: (key, val) => { global.mockSelfSwitches[key.join(",")] = val; },
    value: (key) => global.mockSelfSwitches[key.join(",")] || false
};
global.$gamePlayer = {
    setTransparent: (v) => {},
    reserveTransfer: (mapId, x, y, d, fade) => {
        global.mockTransfer = { mapId, x, y, d, fade };
    }
};

// Chargement des scripts
const ROOT_DIR = path.resolve(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Localization.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Game_Planet.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Game_PlanetarySystem.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Game_Sector.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Game_Spaceship.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Game_Spaceships.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_SystemMapManager.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_SpaceTravel.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Window_SpaceCalendar.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Window_SpaceControls.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Window_SpaceEventLog.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Window_SpaceShipInfo.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Window_SpaceTargetInfo.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Scene_SectorTravel.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Scene_SpaceTravel.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Scene_SubsystemTravel.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Interface.js'), 'utf8'));

console.log("==============================================================");
console.log("--- TEST VALIDATION REVIEW TEST 2 ---");
console.log("==============================================================");

// ---------------------------------------------------------------------------
// 1. Test des attributs de Game_Spaceship (mapId, landingX, landingY, onBoard)
// ---------------------------------------------------------------------------
const shipDataShuttle = {
    id: 2,
    name: "Navette Test",
    category: "Shuttle",
    shipClass: "shuttle",
    mapId: 31,
    landingX: 10,
    landingY: 10,
    onBoard: "V1"
};

const shuttle = new Game_Spaceship(shipDataShuttle);
assert.strictEqual(shuttle.mapId, 31, "mapId doit être 31");
assert.strictEqual(shuttle.landingX, 10, "landingX doit être 10");
assert.strictEqual(shuttle.landingY, 10, "landingY doit être 10");
assert.strictEqual(shuttle.onBoard, "V1", "onBoard brut doit être V1");
assert.strictEqual(shuttle.onBoardType(), "V", "onBoardType doit être V");
assert.strictEqual(shuttle.onBoardTargetId(), 1, "onBoardTargetId doit être 1");
assert.strictEqual(shuttle.isOnBoard(), 1, "isOnBoard() doit renvoyer l'ID 1 de l'hôte");
assert.strictEqual(shuttle.isDocked(), null, "isDocked() doit renvoyer null");
assert.strictEqual(shuttle.isLanded(), null, "isLanded() doit renvoyer null");
console.log("✅ 1. Initialisation et getters Game_Spaceship (V1 -> isOnBoard = 1) : OK");

// ---------------------------------------------------------------------------
// 2. Test des méthodes aboard(), leaveHost() et types D (docking) / P (planet)
// ---------------------------------------------------------------------------
shuttle.aboard("D1");
assert.strictEqual(shuttle.isDocked(), 1, "shuttle.isDocked() doit être 1");
assert.strictEqual(shuttle.isOnBoard(), null, "shuttle.isOnBoard() doit être null");

shuttle.aboard(3, "P");
assert.strictEqual(shuttle.isLanded(), 3, "shuttle.isLanded() doit être 3");
assert.strictEqual(shuttle.isOnBoard(), null, "shuttle.isOnBoard() doit être null");
assert.strictEqual(shuttle.isDocked(), null, "shuttle.isDocked() doit être null");

shuttle.leaveHost();
assert.strictEqual(shuttle.onBoard, null, "onBoard doit être null après leaveHost()");
assert.strictEqual(shuttle.isOnBoard(), null, "isOnBoard() doit être null");
assert.strictEqual(shuttle.isDocked(), null, "isDocked() doit être null");
assert.strictEqual(shuttle.isLanded(), null, "isLanded() doit être null");
console.log("✅ 2. Méthodes aboard('D1'), aboard(3, 'P') et leaveHost() : OK");

// ---------------------------------------------------------------------------
// 3. Test de persistance Sauvegarde / Chargement
// ---------------------------------------------------------------------------
shuttle.aboard("V1");
shuttle.allowDocking(true);
const savedData = shuttle.makeSavefileData();
assert.strictEqual(savedData.onBoard, "V1", "makeSavefileData doit inclure onBoard");
assert.strictEqual(savedData.dockingAllowed, true, "makeSavefileData doit inclure dockingAllowed");

const freshShip = new Game_Spaceship({ id: 2, name: "Fresh" });
assert.strictEqual(freshShip.onBoard, null);
assert.strictEqual(freshShip.dockingAllowed, false);
freshShip.loadSavefileData(savedData);
assert.strictEqual(freshShip.onBoard, "V1", "loadSavefileData doit restaurer onBoard");
assert.strictEqual(freshShip.dockingAllowed, true, "loadSavefileData doit restaurer dockingAllowed");
console.log("✅ 3. Persistance complète Save/Load pour onBoard et dockingAllowed : OK");

// ---------------------------------------------------------------------------
// 4. Test de la Matrice de Compatibilité et méthodes isBoardingAllowed / isDockingAllowed
// ---------------------------------------------------------------------------
const sShuttle = new Game_Spaceship({ id: 10, category: "Shuttle", name: "Navette 1" });
const sShuttle2 = new Game_Spaceship({ id: 14, category: "Shuttle", name: "Navette 2" });
const sEscort = new Game_Spaceship({ id: 11, category: "Escort & Scout", name: "Escorteur 1" });
const sEscort2 = new Game_Spaceship({ id: 15, category: "Escort & Scout", name: "Escorteur 2" });
const sFrigate = new Game_Spaceship({ id: 12, category: "Fregate", name: "Frégate 1" });
const sFrigate2 = new Game_Spaceship({ id: 16, category: "Fregate", name: "Frégate 2" });
const sCruiser = new Game_Spaceship({ id: 13, category: "Patrol Cruiser", name: "Croiseur 1" });
const sCruiser2 = new Game_Spaceship({ id: 17, category: "Patrol Cruiser", name: "Croiseur 2" });

global.$gameSpaceships = {
    _list: [sShuttle, sShuttle2, sEscort, sEscort2, sFrigate, sFrigate2, sCruiser, sCruiser2],
    ship: (id) => global.$gameSpaceships._list.find(s => s.id === id) || null,
    spaceships: () => global.$gameSpaceships._list,
    playerShip: () => sCruiser
};

// Auto-ciblage impossible
assert.strictEqual(sShuttle.getOnboardingMode(sShuttle), "notAllowed");

// 4.1 Shuttle
assert.strictEqual(sShuttle.getOnboardingMode(sShuttle2), "notAllowed");
assert.strictEqual(sShuttle.getOnboardingMode(sEscort), "notAllowed");
assert.strictEqual(sShuttle.getOnboardingMode(sFrigate), "onBoard");
assert.strictEqual(sShuttle.getOnboardingMode(sCruiser), "onBoard");
assert.strictEqual(sShuttle.isBoardingAllowed(sFrigate), true);
assert.strictEqual(sShuttle.isBoardingAllowed(sCruiser), true);
assert.strictEqual(sShuttle.isBoardingAllowed(sEscort), false);

// 4.2 Escort & Scout
assert.strictEqual(sEscort.getOnboardingMode(sShuttle), "notAllowed");
assert.strictEqual(sEscort.getOnboardingMode(sEscort2), "docking");
assert.strictEqual(sEscort.getOnboardingMode(sFrigate), "docking");
assert.strictEqual(sEscort.getOnboardingMode(sCruiser), "onBoard");
assert.strictEqual(sEscort.isBoardingAllowed(sCruiser), true);

// 4.3 Fregate
assert.strictEqual(sFrigate.getOnboardingMode(sShuttle), "notAllowed", "Fregate vers Shuttle doit être notAllowed");
assert.strictEqual(sFrigate.getOnboardingMode(sEscort), "docking");
assert.strictEqual(sFrigate.getOnboardingMode(sFrigate2), "docking");
assert.strictEqual(sFrigate.getOnboardingMode(sCruiser), "docking");

// 4.4 Patrol Cruiser
assert.strictEqual(sCruiser.getOnboardingMode(sShuttle), "notAllowed");
assert.strictEqual(sCruiser.getOnboardingMode(sEscort), "notAllowed");
assert.strictEqual(sCruiser.getOnboardingMode(sFrigate), "notAllowed");
assert.strictEqual(sCruiser.getOnboardingMode(sCruiser2), "notAllowed");

// 4.5 isDockingAllowed avec autorisation cible
assert.strictEqual(sEscort.isDockingAllowed(sFrigate), false, "Amarrage refusé car sFrigate.dockingAllowed est false par défaut");
sFrigate.allowDocking(true);
assert.strictEqual(sEscort.isDockingAllowed(sFrigate), true, "Amarrage accordé car sFrigate.dockingAllowed est true");
sFrigate.allowDocking(false);
assert.strictEqual(sEscort.isDockingAllowed(sFrigate), false, "Amarrage révoqué");
console.log("✅ 4. Matrice de compatibilité complète & isDockingAllowed / isBoardingAllowed : OK");

// ---------------------------------------------------------------------------
// 5. Test Synchronisation des positions dans SystemMapManager
// ---------------------------------------------------------------------------
const mapMgr = new SystemMapManager();
assert.strictEqual(mapMgr.mapOffsetX, 12, "mapOffsetX par défaut doit être 12");
assert.strictEqual(mapMgr.mapOffsetY, 12, "mapOffsetY par défaut doit être 12");

// Déplaçons le vaisseau hôte sCruiser
sCruiser.x = 850;
sCruiser.y = 420;
sCruiser.systemId = 3;
sCruiser.sectorId = 0;

// Plaçons sShuttle à bord de sCruiser (V13)
sShuttle.aboard("V13");
// Plaçons sEscort en docking avec sCruiser (mais escort to cruiser = onBoard, testons escort en docking avec sFrigate D12)
sFrigate.x = 200;
sFrigate.y = 300;
sFrigate.systemId = 3;
sEscort.aboard("D12");

mapMgr.updateSpaceships(false);

assert.strictEqual(sShuttle.x, 850, "La position X de sShuttle doit être synchronisée avec sCruiser");
assert.strictEqual(sShuttle.y, 420, "La position Y de sShuttle doit être synchronisée avec sCruiser");
assert.strictEqual(sShuttle.systemId, 3, "Le systemId de sShuttle doit être synchronisé");

assert.strictEqual(sEscort.x, 200, "La position X de sEscort doit être synchronisée avec sFrigate");
assert.strictEqual(sEscort.y, 300, "La position Y de sEscort doit être synchronisée avec sFrigate");
console.log("✅ 5. Synchronisation temps réel des positions des vaisseaux (V et D) : OK");

// ---------------------------------------------------------------------------
// 6. Test Réagencement des Scènes (1760x990, grille harmonisée)
// ---------------------------------------------------------------------------
// Scene_SectorTravel
const scSector = new Scene_SectorTravel();
scSector.createWindows();
assert.deepStrictEqual(
    { x: scSector._logWindow.x, y: scSector._logWindow.y, w: scSector._logWindow.width, h: scSector._logWindow.height },
    { x: 12, y: 744, w: 388, h: 234 },
    "SectorTravel _logWindow doit respecter la grille"
);
assert.deepStrictEqual(
    { x: scSector._targetWindow.x, y: scSector._targetWindow.y, w: scSector._targetWindow.width, h: scSector._targetWindow.height },
    { x: 412, y: 744, w: 880, h: 150 },
    "SectorTravel _targetWindow doit respecter la grille"
);
assert.deepStrictEqual(
    { x: scSector._controlsWindow.x, y: scSector._controlsWindow.y, w: scSector._controlsWindow.width, h: scSector._controlsWindow.height },
    { x: 412, y: 906, w: 1336, h: 72 },
    "SectorTravel _controlsWindow doit respecter la grille"
);
assert.deepStrictEqual(
    { x: scSector._shipWindow.x, y: scSector._shipWindow.y, w: scSector._shipWindow.width, h: scSector._shipWindow.height },
    { x: 1304, y: 90, w: 444, h: 380 },
    "SectorTravel _shipWindow doit respecter la grille"
);

// Scene_SpaceTravel
const scSpace = new Scene_SpaceTravel();
scSpace.createWindows();
assert.deepStrictEqual(
    { x: scSpace._logWindow.x, y: scSpace._logWindow.y, w: scSpace._logWindow.width, h: scSpace._logWindow.height },
    { x: 12, y: 744, w: 388, h: 234 },
    "SpaceTravel _logWindow doit respecter la grille"
);
assert.deepStrictEqual(
    { x: scSpace._targetWindow.x, y: scSpace._targetWindow.y, w: scSpace._targetWindow.width, h: scSpace._targetWindow.height },
    { x: 412, y: 744, w: 880, h: 150 },
    "SpaceTravel _targetWindow doit respecter la grille"
);
assert.deepStrictEqual(
    { x: scSpace._controlsWindow.x, y: scSpace._controlsWindow.y, w: scSpace._controlsWindow.width, h: scSpace._controlsWindow.height },
    { x: 412, y: 906, w: 1336, h: 72 },
    "SpaceTravel _controlsWindow doit respecter la grille"
);
assert.deepStrictEqual(
    { x: scSpace._shipWindow.x, y: scSpace._shipWindow.y, w: scSpace._shipWindow.width, h: scSpace._shipWindow.height },
    { x: 1304, y: 90, w: 444, h: 380 },
    "SpaceTravel _shipWindow doit respecter la grille"
);

// Scene_SubsystemTravel
Scene_SubsystemTravel.prepareContext({ name: "Terre", pois: [] }, true, 10);
const scSub = new Scene_SubsystemTravel();
scSub.createWindows();
assert.deepStrictEqual(
    { x: scSub._logWindow.x, y: scSub._logWindow.y, w: scSub._logWindow.width, h: scSub._logWindow.height },
    { x: 12, y: 744, w: 388, h: 234 },
    "SubsystemTravel _logWindow doit respecter la grille"
);
assert.deepStrictEqual(
    { x: scSub._infoWindow.x, y: scSub._infoWindow.y, w: scSub._infoWindow.width, h: scSub._infoWindow.height },
    { x: 412, y: 744, w: 880, h: 150 },
    "SubsystemTravel _infoWindow doit respecter la grille"
);
assert.deepStrictEqual(
    { x: scSub._controlsWindow.x, y: scSub._controlsWindow.y, w: scSub._controlsWindow.width, h: scSub._controlsWindow.height },
    { x: 412, y: 906, w: 1336, h: 72 },
    "SubsystemTravel _controlsWindow doit respecter la grille"
);
assert.deepStrictEqual(
    { x: scSub._shipWindow.x, y: scSub._shipWindow.y, w: scSub._shipWindow.width, h: scSub._shipWindow.height },
    { x: 1304, y: 90, w: 444, h: 380 },
    "SubsystemTravel _shipWindow doit respecter la grille"
);
// En mode Hangar avec nefId 10, le volet de vaisseau doit afficher la navette (id 10)
assert.strictEqual(scSub._shipWindow._ship.id, 10, "_shipWindow en mode Hangar doit cibler la nef spécifiée (id 10)");
console.log("✅ 6. Grille harmonisée (1760x990) et ciblage de la nef en mode Hangar : OK");

// ---------------------------------------------------------------------------
// 7. Test Atterrissage et stockage de la variable RMMZ 41 (NEF_ID)
// ---------------------------------------------------------------------------
scSub._selectedPoi = {
    name: "Base Alpha",
    landingMapId: 15,
    landingX: 12,
    landingY: 8,
    landingEventId: 2
};

scSub.onLand();

setTimeout(() => {
    assert.strictEqual(global.mockVariables[41], 10, "La variable 41 doit contenir l'ID de la nef (10)");
    assert.strictEqual(global.mockSelfSwitches["15,2,A"], true, "Le SelfSwitch A de l'event 2 de la carte 15 doit être activé");
    assert.deepStrictEqual(global.mockTransfer, { mapId: 15, x: 12, y: 8, d: 2, fade: 0 }, "Le transfert joueur doit être réservé");
    console.log("✅ 7. Atterrissage : variable 41 (NEF_ID), SelfSwitch A et transfert : OK");

    console.log("\n==============================================================");
    console.log("🎉 TOUS LES TESTS DE 'REVIEW TEST 2' SONT VALIDÉS AVEC SUCCÈS !");
    console.log("==============================================================");
}, 450);
