//=============================================================================
// test_review_additions.js
// Tests unitaires validant l'ensemble des ajouts et reviews de SimCraft 4 :
// 1. Calendrier Neotori (format Era-cycle-sequence/decade/jr - [hr:min])
// 2. Découplage des POIs (POIS_FR/EN.json, PLANETS_FR/EN.json) et landingAllowed
// 3. Système de découverte des POIs (.located, $gameSystem, triggerPoiLocated)
// 4. Règles du moteur Warp (warpAllowed, coût 500 au départ, 0 en vol)
// 5. UI Spatiale (padding 24px, portrait Capitaine, scroll Y, rétention logs)
// 6. Dialogue HUDs (Suppression face dans bulles, PlayerHUD 2px red, InterlocutorHUD, \L[key])
//=============================================================================

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

// 1. Simulation d'environnement RMMZ
global.window = global;
global.require = require;
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
            fill: () => {},
            fillRect: () => {},
            strokeRect: () => {},
            stroke: () => {},
            rect: () => {},
            roundRect: () => {},
            drawImage: () => {},
            fillText: () => {},
            measureText: (text) => ({ width: (text ? text.length * 6 : 0) }),
            createLinearGradient: () => ({ addColorStop: () => {} })
        };
    }
    clear() {}
    fillRect() {}
    drawText() {}
    isReady() { return true; }
};

global.Sprite = class Sprite {
    constructor() {
        this.scale = { x: 1, y: 1 };
        this.anchor = { x: 0, y: 0 };
        this.visible = true;
        this.x = 0;
        this.y = 0;
    }
    addChild() {}
    setFrame() {}
};

global.ImageManager = {
    standardFaceWidth: 144,
    standardFaceHeight: 144,
    faceWidth: 144,
    faceHeight: 144,
    loadSystem: () => new global.Bitmap(100, 100),
    loadFace: () => new global.Bitmap(144, 144),
    loadBitmap: () => new global.Bitmap(100, 100)
};

global.ConfigManager = { locale: "FR", save: () => {} };

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
global.TouchInput = { isTriggered: () => false, isLongPressed: () => false, wheelY: 0 };
global.SceneManager = { goto: () => {}, push: () => {}, pop: () => {}, _scene: null };
global.SoundManager = { playOk: () => {}, playCancel: () => {}, playCursor: () => {}, playBuzzer: () => {} };
global.Utils = { approach: (c, t, s) => (c < t ? Math.min(t, c + s) : Math.max(t, c - s)) };

global.Window_Base = class Window_Base {
    constructor(rect) {
        this.initialize(rect);
    }
    initialize(rect) {
        this.x = rect ? rect.x : 0;
        this.y = rect ? rect.y : 0;
        this.width = rect ? rect.width : 0;
        this.height = rect ? rect.height : 0;
        this.padding = 12;
        this.contents = new global.Bitmap(this.width, this.height);
        this.visible = true;
    }
    contentsWidth() { return Math.max(0, this.width - this.padding * 2); }
    contentsHeight() { return Math.max(0, this.height - this.padding * 2); }
    lineHeight() { return 28; }
    addChild() {}
    drawText() {}
    drawFace() {}
    resetFontSettings() {}
    resetTextColor() {}
    changeTextColor() {}
    createContents() { this.contents = new global.Bitmap(this.width, this.height); }
    systemColor() { return "#88aaff"; }
    normalColor() { return "#ffffff"; }
    crisisColor() { return "#ffaa00"; }
    powerUpColor() { return "#00ff88"; }
    isOpen() { return true; }
    isClosed() { return false; }
    update() {}
    convertEscapeCharacters(text) { return text; }
    createTextState(text, x, y, width) { return { text, x, y, width, index: 0 }; }
    textSizeEx(text) { return { width: (text ? text.length * 8 : 100), height: 32 }; }
};

global.Window_Selectable = class Window_Selectable extends global.Window_Base {
    constructor(rect) { super(rect); }
    refresh() {}
    select() {}
    activate() {}
    deactivate() {}
};

global.Window_Command = class Window_Command extends global.Window_Selectable {
    constructor(rect) { super(rect); this._list = []; }
    addCommand(name, symbol, enabled = true, ext = null) {
        this._list.push({ name, symbol, enabled, ext });
    }
    commandName(index) { return this._list[index] ? this._list[index].name : ""; }
    setHandler() {}
};

global.Window_Message = class Window_Message extends global.Window_Base {
    constructor(rect) { super(rect); }
    startMessage() {}
    terminateMessage() {}
    newPage() {}
    updatePlacement() {}
    updateBackground() {}
    open() { this.openness = 255; }
    close() { this.openness = 0; }
    isOpen() { return this.openness === 255; }
    isClosed() { return this.openness === 0; }
    isClosing() { return false; }
    isOpening() { return false; }
    loadWindowskin() {}
    updateBackOpacity() {}
};

global.Game_Message = class Game_Message {
    constructor() {
        this.clear();
    }
    clear() {
        this._texts = [];
        this._faceName = "";
        this._faceIndex = 0;
        this._speakerName = "";
        this._positionType = 0;
        this._background = 0;
        this._speakerIsPlayer = false;
        this._speakerEventId = 0;
    }
    add(text) { this._texts.push(text); }
    allText() { return this._texts.join("\n"); }
    faceName() { return this._faceName; }
    faceIndex() { return this._faceIndex; }
    speakerName() { return this._speakerName; }
    positionType() { return this._positionType; }
    setFaceImage(name, index) { this._faceName = name; this._faceIndex = index; }
    setSpeakerName(name) { this._speakerName = name; }
    setPositionType(type) { this._positionType = type; }
    setBackground(bg) { this._background = bg; }
    isBusy() { return this._texts.length > 0; }
};
global.$gameMessage = new global.Game_Message();

global.Game_System = class Game_System {
    constructor() {
        this._locale = "FR";
        this._locatedPois = {};
        this._spaceTravelLogHistory = [];
        this._landingAllowedState = {};
    }
    mainFontFace() { return "sans-serif"; }
    windowPadding() { return 12; }
    isPoiLocated(poiId) {
        if (this._locatedPois && this._locatedPois[poiId] !== undefined) {
            return !!this._locatedPois[poiId];
        }
        if (global.$dataPois && Array.isArray(global.$dataPois)) {
            const p = global.$dataPois.find(x => x && x.id === poiId);
            if (p && p.located !== undefined) return !!p.located;
        }
        return true;
    }
    setPoiLocated(poiId, located = true) {
        if (!this._locatedPois) this._locatedPois = {};
        this._locatedPois[poiId] = !!located;
    }
    isLandingAllowed(planetId) {
        if (this._landingAllowedState && this._landingAllowedState[planetId] !== undefined) {
            return !!this._landingAllowedState[planetId];
        }
        if (global.$dataPlanets && Array.isArray(global.$dataPlanets)) {
            const pl = global.$dataPlanets.find(x => x && x.id === planetId);
            if (pl && pl.landingAllowed !== undefined) return !!pl.landingAllowed;
        }
        return false;
    }
    setLandingAllowed(planetId, allowed = true) {
        if (!this._landingAllowedState) this._landingAllowedState = {};
        this._landingAllowedState[planetId] = !!allowed;
    }
    addSpaceTravelLog(entry) {
        if (!this._spaceTravelLogHistory) this._spaceTravelLogHistory = [];
        this._spaceTravelLogHistory.push(entry);
        if (this._spaceTravelLogHistory.length > 50) this._spaceTravelLogHistory.shift();
    }
    getSpaceTravelLogs() {
        return this._spaceTravelLogHistory || [];
    }
};
global.$gameSystem = new global.Game_System();

global.Game_Party = class Game_Party {
    constructor() {
        this._leader = {
            name: () => "Capitaine Val",
            actorId: () => 1,
            hp: 100,
            mhp: 100,
            mp: 50,
            mmp: 50,
            tp: 25,
            level: 5,
            isHero: () => false,
            faceName: () => "Actor1",
            faceIndex: () => 0
        };
    }
    leader() { return this._leader; }
};
global.$gameParty = new global.Game_Party();

global.Game_Player = class Game_Player {
    constructor() {
        this._x = 10;
        this._y = 10;
    }
    screenX() { return 500; }
    screenY() { return 400; }
};
global.$gamePlayer = new global.Game_Player();

global.Game_Map = class Game_Map {
    constructor() {
        this._events = {};
        this._interpreter = { eventId: () => 1 };
    }
    event(id) {
        return this._events[id] || { screenX: () => 600, screenY: () => 400, event: () => ({ note: "" }) };
    }
};
global.$gameMap = new global.Game_Map();

global.Sprite_Character = class Sprite_Character extends global.Sprite {
    characterPatternY() { return 0; }
    pattern() { return 0; }
    characterName() { return ""; }
    updateBitmap() {}
    updateFrame() {}
};
global.Spriteset_Map = class Spriteset_Map {
    createCharacterSprite() {}
};
global.Window_StatusBase = class Window_StatusBase extends global.Window_Base {
    drawFace() {}
};
global.Window_Scrollable = class Window_Scrollable extends global.Window_Base { update() {} };
global.Window_HorzCommand = class Window_HorzCommand extends global.Window_Command {};
global.Window_ChoiceList = class Window_ChoiceList extends global.Window_Command { updatePlacement() {} };
global.Window_NameBox = class Window_NameBox extends global.Window_Base { setName(n) {} };

global.Scene_Base = class Scene_Base {
    constructor() { this._windowLayer = []; }
    addChild() {}
    addWindow(win) { this._windowLayer.push(win); }
    createWindowLayer() {}
    startFadeOut() {}
    update() {}
    isReady() { return true; }
};
global.Scene_MenuBase = class Scene_MenuBase extends global.Scene_Base {};
global.Scene_Map = class Scene_Map extends global.Scene_Base { update() {} };
global.Scene_Message = class Scene_Message extends global.Scene_Base {
    createMessageWindow() {}
    messageWindowRect() { return new global.Rectangle(0, 0, 100, 100); }
};
global.Scene_Boot = class Scene_Boot extends global.Scene_Base { loadCustomFonts() {} };

global.Game_Interpreter = class Game_Interpreter {
    eventId() { return 0; }
    command101(params) { return true; }
};
global.TextManager = { basic: (id) => "", param: (id) => "", command: (id) => "" };
global.ColorManager = { outlineColor: () => "rgba(0,0,0,0.6)" };

// Charger les scripts requis
const pluginsDir = path.resolve(__dirname, '../js/plugins');
vm.runInThisContext(fs.readFileSync(path.join(pluginsDir, 'SC4_Localization.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(pluginsDir, 'SC4_GameDate.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(pluginsDir, 'SC4_SpaceTravel.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(pluginsDir, 'SC4_Window_SpaceCalendar.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(pluginsDir, 'SC4_Window_SpaceControls.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(pluginsDir, 'SC4_Window_SpaceEventLog.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(pluginsDir, 'SC4_Window_SpaceShipInfo.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(pluginsDir, 'SC4_Window_SpaceTargetInfo.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(pluginsDir, 'SC4_QuestManager.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(pluginsDir, 'SC4_BubbleMessage.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(pluginsDir, 'SC4_rmmz_sprites_Patches.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(pluginsDir, 'SC4_Interface.js'), 'utf8'));

console.log("==============================================================");
console.log("       TESTS UNITAIRES : AJOUTS & REVIEWS SIMCRAFT 4         ");
console.log("==============================================================\n");

let passed = 0;
let total = 0;

function it(desc, fn) {
    total++;
    try {
        fn();
        console.log(`  ✅ [PASS] ${desc}`);
        passed++;
    } catch (e) {
        console.error(`  ❌ [FAIL] ${desc}`);
        console.error(`     -> ${e.message}`);
    }
}

// ----------------------------------------------------------------------------
// TEST 1 : Formatage Calendrier Neotori
// ----------------------------------------------------------------------------
console.log("--- 1. Calendrier Neotori (format Era-cycle-sequence) ---");

it("Formate la date selon le standard Neotori spécifié", () => {
    // Era:1-cycle:450-séquence:07/2/5 - [14:30]
    const mockDate = {
        getYear: () => 450,
        getMonth: () => 7,
        getDecadeIndex: () => 2,
        getDayMonth: () => 14,
        getHr: () => 14,
        getMin: () => 30
    };
    const formatted = Game_DateFormatter.formatNeotori(mockDate);
    assert.strictEqual(formatted, "Era:1-cycle:450-séquence:07/2/5 - [14:30]");
});

it("Game_DateFormatter.format40K redirige vers Neotori", () => {
    const mockDate = {
        getYear: () => 100,
        getMonth: () => 3,
        getDecadeIndex: () => 1,
        getDayMonth: () => 3,
        getHr: () => 9,
        getMin: () => 5
    };
    const formatted = Game_DateFormatter.format40K(mockDate);
    assert.strictEqual(formatted, "Era:1-cycle:100-séquence:03/1/4 - [09:05]");
});

// ----------------------------------------------------------------------------
// TEST 2 : Données POIs & Planètes découplées et localisées
// ----------------------------------------------------------------------------
console.log("\n--- 2. Découplage des POIs et Planètes ---");

it("POIS_FR.json et POIS_EN.json existent dans loc/ et POIS.json contient les POIs", () => {
    const poisFrPath = path.resolve(__dirname, '../data/SC/loc/POIS_FR.json');
    const poisPhysPath = path.resolve(__dirname, '../data/SC/POIS.json');
    assert.ok(fs.existsSync(poisFrPath), "loc/POIS_FR.json doit exister");
    assert.ok(fs.existsSync(poisPhysPath), "POIS.json doit exister");

    const poisFr = JSON.parse(fs.readFileSync(poisFrPath, 'utf8')).filter(p => !!p);
    const poisPhys = JSON.parse(fs.readFileSync(poisPhysPath, 'utf8')).filter(p => !!p);
    assert.ok(poisFr.length >= 18, "Doit contenir au moins 18 POIs");
    assert.ok(poisPhys.length >= 18, "Doit contenir au moins 18 POIs");
    assert.ok(poisPhys[0].id !== undefined, "POI 1 possède un ID");
    assert.ok(poisPhys[0].located !== undefined, "POI 1 possède un attribut located");
});

it("PLANETS.json utilise poiIds et landingAllowed", () => {
    const planetsPath = path.resolve(__dirname, '../data/SC/PLANETS.json');
    assert.ok(fs.existsSync(planetsPath), "PLANETS.json doit exister");
    const planets = JSON.parse(fs.readFileSync(planetsPath, 'utf8')).filter(p => !!p);
    assert.ok(planets.length >= 7, "Au moins 7 planètes");
    const p1 = planets[0];
    assert.ok(Array.isArray(p1.poiIds), "Planète a un tableau poiIds au lieu de pois");
    assert.strictEqual(typeof p1.landingAllowed, "boolean", "Planète a un booléen landingAllowed");
});

it("Game_Planet.getPois(onlyLocated) filtre correctement selon $gameSystem", () => {
    global.$dataPois = [
        { id: "poi_1", name: "POI 1", located: true },
        { id: "poi_2", name: "POI 2", located: true },
        { id: "poi_3", name: "POI 3", located: false }
    ];

    const pData = { id: 1, name: "Test Planet", poiIds: ["poi_1", "poi_2", "poi_3"], landingAllowed: true };
    const planet = new Game_Planet(pData);

    $gameSystem.setPoiLocated("poi_1", true);
    $gameSystem.setPoiLocated("poi_2", true);
    $gameSystem.setPoiLocated("poi_3", false);

    const allPois = planet.getPois(false);
    assert.strictEqual(allPois.length, 3, "getPois(false) retourne tous les 3 POIs");

    const locatedOnly = planet.getPois(true);
    assert.strictEqual(locatedOnly.length, 2, "getPois(true) filtre le POI non localisé");
    assert.ok(!locatedOnly.some(p => p.id === "poi_3"), "Le POI 3 ne doit pas être inclus");

    // Si on découvre le POI 3
    $gameSystem.setPoiLocated("poi_3", true);
    assert.strictEqual(planet.getPois(true).length, 3, "Le POI 3 apparaît une fois localisé");
});

it("Game_Planet landingAllowed et isLandingAllowed", () => {
    const pData = { id: 2, name: "Restricted Planet", poiIds: [], landingAllowed: false };
    const planet = new Game_Planet(pData);
    assert.strictEqual(planet.isLandingAllowed(), false, "Atterrissage interdit par défaut");

    planet.setLandingAllowed(true);
    assert.strictEqual(planet.isLandingAllowed(), true, "Atterrissage autorisé après modification");
});

// ----------------------------------------------------------------------------
// TEST 3 : Découverte des POIs & Quêtes (triggerPoiLocated)
// ----------------------------------------------------------------------------
console.log("\n--- 3. Découverte des POIs & Trigger Quêtes ---");

it("StoryManager.update évalue triggerPoiLocated en parallèle de triggerTimestamp", () => {
    global.$gameDate = { timestamp: 100 };
    global.$dataQuests = [
        {
            id: "quest_poi_discovery",
            name: "Mission Recon",
            triggerPoiLocated: "warp_beacon_alpha",
            triggerTimestamp: 50,
            locations: []
        }
    ];
    global.$gameQuests = new Game_Quests();
    const story = new StoryManager();

    // Au départ POI warp_beacon_alpha n'est pas localisé
    $gameSystem.setPoiLocated("warp_beacon_alpha", false);
    story.update();
    assert.ok(!global.$gameQuests.quest("quest_poi_discovery").active, "Quête inactive avant découverte POI");

    // Localisation du POI warp_beacon_alpha
    $gameSystem.setPoiLocated("warp_beacon_alpha", true);
    story.update();
    assert.ok(global.$gameQuests.quest("quest_poi_discovery").active, "Quête activée dès que le POI est localisé !");
});

// ----------------------------------------------------------------------------
// TEST 4 : Règles de Saut Warp & Moteur
// ----------------------------------------------------------------------------
console.log("\n--- 4. Règles de Saut Warp (Moteur & Carburant) ---");

it("Moteurs 2 et 4 autorisent le warp, les autres le refusent", () => {
    const motorsPath = path.resolve(__dirname, '../data/SC/SHIP_MOTORS.json');
    const motors = JSON.parse(fs.readFileSync(motorsPath, 'utf8'));
    const m1 = motors.find(m => m && m.id === 1);
    const m2 = motors.find(m => m && m.id === 2);
    const m3 = motors.find(m => m && m.id === 3);
    const m4 = motors.find(m => m && m.id === 4);

    assert.strictEqual(m1.warpAllowed, false, "Moteur 1 ne doit pas être warp");
    assert.strictEqual(m2.warpAllowed, true, "Moteur 2 doit être warp");
    assert.strictEqual(m3.warpAllowed, false, "Moteur 3 ne doit pas être warp");
    assert.strictEqual(m4.warpAllowed, true, "Moteur 4 doit être warp");
});

it("Game_Spaceship.isWarpAllowed vérifie les capacités du moteur", () => {
    global.$dataShipMotors = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/SC/SHIP_MOTORS.json'), 'utf8'));
    global.$gameSector = {
        system: (id) => ({ id, pos: { x: 100 * id, y: 100 * id } })
    };
    const ship = new Game_Spaceship({ id: 1, name: "Corvette", motorId: 1, fuel: 1000, maxFuel: 1000, systemId: 1 });
    assert.strictEqual(ship.isWarpAllowed(), false, "Motor 1 -> Warp interdit");

    ship._motorId = 2;
    assert.strictEqual(ship.isWarpAllowed(), true, "Motor 2 -> Warp autorisé");
});

it("Saut Warp consomme exactement 500 fuel au départ et 0 en vol", () => {
    global.$dataShipMotors = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/SC/SHIP_MOTORS.json'), 'utf8'));
    global.$gameSector = {
        system: (id) => ({ id, pos: { x: 100 * id, y: 100 * id } })
    };
    const ship = new Game_Spaceship({ id: 2, name: "Frégate", motorId: 2, fuel: 600, maxFuel: 1000, systemId: 1 });
    
    // Lancement du saut inter-système
    const success = ship.startInterSystemJump(2);
    assert.strictEqual(success, true, "Saut accepté avec 600 fuel et moteur warp");
    assert.strictEqual(ship.fuel, 100, "500 fuel déduits immédiatement au départ (600 - 500 = 100)");

    // Mise à jour pendant le vol (50 updates)
    for (let i = 0; i < 50; i++) {
        ship.updateInterSystemJump();
    }
    assert.strictEqual(ship.fuel, 100, "Aucune consommation supplémentaire continue en vol (fuel reste à 100)");
});

it("Saut Warp échoue si le fuel est strictement inférieur à 500", () => {
    global.$dataShipMotors = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/SC/SHIP_MOTORS.json'), 'utf8'));
    global.$gameSector = {
        system: (id) => ({ id, pos: { x: 100 * id, y: 100 * id } })
    };
    const ship = new Game_Spaceship({ id: 3, name: "Corvette", motorId: 2, fuel: 499, maxFuel: 1000, systemId: 1 });
    const success = ship.startInterSystemJump(2);
    assert.strictEqual(success, false, "Saut rejeté car fuel < 500");
    assert.strictEqual(ship.fuel, 499, "Fuel non débité");
});

// ----------------------------------------------------------------------------
// TEST 5 : UI Spatiale & Rétention des logs
// ----------------------------------------------------------------------------
console.log("\n--- 5. UI Spatiale & Rétention des logs ---");

it("Window_SpaceShipInfo applique un padding horizontal de 24px", () => {
    const rect = new Rectangle(0, 0, 1000, 120);
    const win = new Window_SpaceShipInfo(rect);
    assert.strictEqual(win.paddingX, 24, "paddingX doit être fixé à 24px");
});

it("Window_SpaceTargetInfo gère le défilement scroll Y", () => {
    const rect = new Rectangle(0, 0, 400, 180);
    const win = new Window_SpaceTargetInfo(rect);
    win.setTarget("planet", { name: "Planet A", description: "Ligne de test\n".repeat(15) });
    win._maxScrollY = 120;
    assert.strictEqual(win._scrollY, 0, "scrollY initial à 0");
    
    // Défilement molette souris vers le bas
    global.TouchInput.wheelY = 40;
    win.processWheel();
    assert.ok(win._scrollY > 0, "scrollY a augmenté après défilement souris");
});

it("Window_SpaceEventLog conserve l'historique dans $gameSystem", () => {
    const rect = new Rectangle(0, 0, 400, 150);
    const logWin1 = new Window_SpaceEventLog(rect);
    logWin1.addMessage("info", "Premier message de bord");
    logWin1.addMessage("info", "Deuxième message de bord");

    // Vérifier que $gameSystem a stocké les messages
    const sysLogs = $gameSystem.getSpaceTravelLogs();
    assert.strictEqual(sysLogs.length, 2, "2 messages sauvegardés dans $gameSystem");

    // Nouvelle instance de fenêtre (comme lors d'un changement de scène)
    const logWin2 = new Window_SpaceEventLog(rect);
    assert.strictEqual(logWin2._out.length, 2, "La nouvelle fenêtre restaure les messages de $gameSystem dans _out");
    assert.strictEqual(logWin2._out[0].text, "Premier message de bord");
});

// ----------------------------------------------------------------------------
// TEST 6 : Dialogue HUDs, Pas de face dans les bulles, et Localisation \L
// ----------------------------------------------------------------------------
console.log("\n--- 6. Dialogue HUDs & Pas de faceset dans les bulles ---");

it("Window_BubbleMsg ne réserve aucun espace pour les facesets et ne les dessine pas", () => {
    const rect = new Rectangle(0, 0, 800, 200);
    const msgWin = new Window_BubbleMsg(rect);
    
    $gameMessage.clear();
    $gameMessage.setFaceImage("Actor1", 0);
    $gameMessage.add("Message simple sans visage");

    assert.strictEqual(msgWin.checkToSeeIfFaceExists(), false, "checkToSeeIfFaceExists doit retourner false");

    // Calcul de la taille de bulle
    msgWin.adjustBubbleSize("Message simple sans visage");
    // La largeur ne doit PAS contenir 144 + 16 de portrait
    const textW = msgWin.textSizeEx("Message simple sans visage").width;
    const pad = 12;
    const expectedW = Math.max(120, textW + pad * 2 + 16);
    assert.strictEqual(msgWin.width, expectedW, "Largeur adaptée uniquement au texte");
});

it("Sprite_PlayerHUD active la bordure rouge 2px quand le joueur parle", () => {
    const hud = new Sprite_PlayerHUD();
    assert.strictEqual(hud._isSpeaking, false, "Initialement _isSpeaking = false");

    hud.setSpeakingHighlight(true);
    assert.strictEqual(hud._isSpeaking, true, "setSpeakingHighlight(true) active la surbrillance rouge");

    hud.setSpeakingHighlight(false);
    assert.strictEqual(hud._isSpeaking, false, "setSpeakingHighlight(false) désactive la surbrillance");
});

it("Sprite_InterlocutorHUD affiche le badge et supporte hideInterlocutor", () => {
    const interHud = new Sprite_InterlocutorHUD();
    assert.strictEqual(interHud.visible, false, "Interlocuteur HUD masqué au départ");

    interHud.showInterlocutor("Actor2", 0, "Inspecteur", null);
    assert.strictEqual(interHud.visible, true, "Interlocuteur HUD visible après showInterlocutor");

    interHud.hideInterlocutor();
    assert.strictEqual(interHud.visible, false, "Interlocuteur HUD masqué après hideInterlocutor");
});

it("Les noms d'interlocuteur parsent \\L[key] et \\l[key] pour la localisation", () => {
    SC4_Localization.loadAll();
    SC4_Localization.setLocale("FR");
    const parsedFr = SC4_Localization.parse("\\L[menu.save]");
    assert.strictEqual(parsedFr, "Sauvegarder", "Traduction FR correcte");

    const parsedLower = SC4_Localization.parse("\\l[menu.save]");
    assert.strictEqual(parsedLower, "Sauvegarder", "Support du tag en minuscule \\l");

    SC4_Localization.setLocale("EN");
    const parsedEn = SC4_Localization.parse("\\L[menu.save]");
    assert.strictEqual(parsedEn, "Save", "Traduction EN correcte");
    
    // Remettre en FR
    SC4_Localization.setLocale("FR");
});

// ----------------------------------------------------------------------------
// BILAN FINAL
// ----------------------------------------------------------------------------
console.log("\n==============================================================");
console.log(`RÉSULTAT : ${passed} / ${total} tests réussis`);
console.log("==============================================================");

if (passed !== total) {
    process.exit(1);
} else {
    console.log("🎉 TOUS LES TESTS D'AJOUTS ET DE REVIEWS SONT VALIDÉS !");
}
