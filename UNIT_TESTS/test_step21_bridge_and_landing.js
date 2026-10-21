//=============================================================================
// UNIT TEST - Test Step 21: Bridge Console, Landing/Takeoff & Ship Parallax
//=============================================================================

const assert = require("assert");

// 1. Mock minimal environment
global.window = global;
global.Graphics = { boxWidth: 1280, boxHeight: 720, width: 1280, height: 720 };
global.Rectangle = class {
    constructor(x, y, w, h) {
        this.x = x || 0;
        this.y = y || 0;
        this.width = w || 0;
        this.height = h || 0;
    }
};

global.AudioManager = {
    _lastSe: null,
    playSe(se) {
        this._lastSe = se;
    }
};

global.SoundManager = {
    playOk() {},
    playBuzzer() {}
};

global.ImageManager = {
    loadSystem() { return {}; }
};

global.Window_Base = class {
    constructor(rect) {
        this.x = rect ? rect.x : 0;
        this.y = rect ? rect.y : 0;
        this.width = rect ? rect.width : 0;
        this.height = rect ? rect.height : 0;
        this.contents = {
            clear() {},
            fontSize: 18,
            textColor: "#ffffff",
            outlineColor: "#000000",
            outlineWidth: 3
        };
        this.opacity = 255;
    }
    innerWidth() { return this.width - 20; }
    innerHeight() { return this.height - 20; }
    drawText() {}
    changePaintOpacity() {}
    refresh() {}
};

global.Window_Command = class extends global.Window_Base {
    constructor(rect) {
        super(rect);
        this._list = [];
        this._index = 0;
        this._handlers = {};
    }
    clearCommandList() {
        this._list = [];
    }
    addCommand(name, symbol, enabled = true, ext = null) {
        this._list.push({ name, symbol, enabled, ext });
    }
    setHandler(symbol, method) {
        this._handlers[symbol] = method;
    }
    callHandler(symbol) {
        if (this._handlers[symbol]) this._handlers[symbol]();
    }
    itemRect(index) {
        return new Rectangle(0, index * 48, this.width, 48);
    }
    itemRectWithPadding(index) {
        return this.itemRect(index);
    }
    select(index) {
        this._index = index;
    }
    open() { this._open = true; }
    close() { this._open = false; }
    activate() { this._active = true; }
    deactivate() { this._active = false; }
};

global.Game_System = class {
    constructor() {
        this._landingAuthorizations = {};
        this._bridgeConsoleOpen = false;
    }
    mainFontFace() { return "sans-serif"; }
};

global.$gameSystem = new global.Game_System();

global.Game_Player = class {
    constructor() {
        this._mapId = 0;
        this._x = 0;
        this._y = 0;
        this._d = 2;
        this._fadeType = 0;
    }
    canMove() { return true; }
    isAttacking() { return false; }
    isActing() { return false; }
    reserveTransfer(mapId, x, y, d, fadeType) {
        this._mapId = mapId;
        this._x = x;
        this._y = y;
        this._d = d;
        this._fadeType = fadeType;
    }
};

global.$gamePlayer = new global.Game_Player();
global.$gameParty = { leader() { return null; } };

global.Game_Screen = class {
    constructor() {
        this._pictures = {};
    }
    showPicture(id, name, origin, x, y, sx, sy, opacity, blend) {
        this._pictures[id] = { name, origin, x, y, sx, sy, opacity, blend };
    }
    movePicture(id, origin, x, y, sx, sy, opacity, blend, duration) {
        if (this._pictures[id]) {
            this._pictures[id].opacity = opacity;
            this._pictures[id].duration = duration;
        }
    }
    erasePicture(id) {
        delete this._pictures[id];
    }
};

global.$gameScreen = new global.Game_Screen();

// Mock Spaceship
class MockSpaceship {
    constructor(id = 1) {
        this._id = id;
        this.name = "Dawn Of Faith";
        this._onBoard = null;
        this._orbitingPlanetId = null;
        this._status = "Static";
        this.mapId = 31;
        this.landingX = 10;
        this.landingY = 10;
    }
    get id() { return this._id; }
    get orbitingPlanetId() { return this._orbitingPlanetId; }
    get orbitingPlanet() {
        if (this._orbitingPlanetId === null) return null;
        return { id: this._orbitingPlanetId, name: "Ankaros Prime", landingAllowed: true };
    }
    onBoardType() {
        if (!this._onBoard) return null;
        const m = String(this._onBoard).toUpperCase().match(/^([VDP])/);
        return m ? m[1] : null;
    }
    onBoardTargetId() {
        if (!this._onBoard) return null;
        const m = String(this._onBoard).toUpperCase().match(/^[VDP](\d+)/);
        return m ? parseInt(m[1], 10) : null;
    }
    isLanded() {
        return this.onBoardType() === "P" ? this.onBoardTargetId() : null;
    }
    aboard(targetId, type = "V") {
        const t = (type || "V").toUpperCase();
        this._onBoard = `${t}${targetId}`;
    }
    leaveHost() {
        this._onBoard = null;
    }
    setOrbitingPlanet(planetId) {
        this._orbitingPlanetId = planetId;
        this._status = "Orbiting";
    }
}

const mockShip = new MockSpaceship(1);
const mockShip2 = new MockSpaceship(2);
mockShip2.name = "Vigilance Prime";
mockShip2.mapId = 29;

global.$gameSpaceships = {
    _ships: [mockShip, mockShip2],
    ship(id) { return this._ships.find(s => s.id === Number(id)) || null; },
    shipByMapId(mapId) { return this._ships.find(s => s.mapId === Number(mapId)) || null; },
    spaceships() { return this._ships; },
    playerShip() { return mockShip; }
};

global.$gamePOIs = {
    _pois: {
        prime_spatioport: {
            id: "prime_spatioport",
            planetId: 5,
            landingMapId: 37,
            landingX: 127,
            landingY: 58
        }
    },
    get(id) { return this._pois[id] || null; },
    getAll() { return Object.values(this._pois); }
};

global.Game_Map = class {
    constructor() {
        this._mapId = 1;
        this._parallaxName = "";
        this._parallaxZero = false;
        this._parallaxLoopX = false;
        this._parallaxLoopY = false;
        this._parallaxSx = 0;
        this._parallaxSy = 0;
    }
    mapId() { return this._mapId; }
    setupParallax() {}
};

global.$gameMap = new global.Game_Map();

global.Game_CharacterBase = class {
    constructor() { this.initMembers(); }
    initMembers() {
        this._x = 0; this._y = 0; this._direction = 2; this._moveSpeed = 4;
        this._action = "walk"; this._isActing = false;
    }
    direction() { return this._direction; }
    setDirection(d) { this._direction = d; }
    isMoving() { return false; }
    resetPattern() {}
    canPass() { return true; }
    canPassDiagonally() { return true; }
    moveStraight() {}
    moveDiagonally() {}
};

global.Game_Character = class extends global.Game_CharacterBase {
    pattern() { return 1; }
    characterName() { return ''; }
};

global.Game_Follower = class extends global.Game_Character {
    constructor() { super(); this._actor = null; }
    actor() { return this._actor; }
};

global.Game_Event = class extends global.Game_Character {};

global.Game_Actor = class {
    constructor(id) { this._id = id; }
    actorId() { return this._id; }
};

global.Game_Actors = class {
    constructor() { this._data = []; }
    actor(id) { return this._data[id]; }
};

global.Game_Action = class {};
global.Game_Hero = class {};
global.Game_Interpreter = class {};
global.PluginManager = { registerCommand: () => {} };
global.SceneManager = { push: () => {}, pop: () => {}, _scene: null };
global.TouchInput = { isRightPressed: () => false };
global.$dataActors = [];
global.$gameActors = new global.Game_Actors();

// Load modules
require("../js/plugins/SC4_rmmz_objects_Patches.js");
require("../js/plugins/SC4_Interface.js");
require("../js/plugins/SC4_Window_BridgeConsole.js");

console.log("==============================================================");
console.log("   TEST STEP 21: Bridge Console, Landing & Ship Parallax      ");
console.log("==============================================================\n");

// ----------------------------------------------------------------------------
// TEST 1: Window_BridgeConsole - 5-Section Architecture Verification
// ----------------------------------------------------------------------------
console.log("--- Test 1: Window_BridgeConsole 5-Section Conformance ---");
const consoleWin = new Window_BridgeConsole(new Rectangle(0, 0, 480, 420));
assert.strictEqual(typeof consoleWin.playerShip, "object", "Section 1: playerShip getter accessible");
assert.strictEqual(typeof consoleWin.isLanded, "boolean", "Section 1: isLanded getter accessible");
assert.strictEqual(typeof consoleWin.canLand, "boolean", "Section 1: canLand getter accessible");
assert.strictEqual(typeof consoleWin.isLandingAuthorized, "boolean", "Section 1: isLandingAuthorized getter accessible");
assert.strictEqual(typeof consoleWin.landingPoi, "object", "Section 1: landingPoi getter accessible");

// Verification of targetShip priority hierarchy
assert.strictEqual(consoleWin.targetShip.id, 1, "Default targetShip fallback to playerShip (ID 1)");
global.$gameMap._mapId = 29;
assert.strictEqual(consoleWin.targetShip.id, 2, "Priority 2: context mapId 29 maps to Vigilance Prime (ID 2)");
consoleWin.setShipId(1);
assert.strictEqual(consoleWin.targetShip.id, 1, "Priority 1: explicit shipId 1 overrides mapId 29");
consoleWin.setShipId(null);
assert.strictEqual(consoleWin.targetShip.id, 2, "Resetting explicit shipId falls back to mapId 29 (ID 2)");
global.$gameMap._mapId = 1;
assert.strictEqual(consoleWin.targetShip.id, 1, "Back on generic mapId falls back to playerShip (ID 1)");

assert.strictEqual(typeof consoleWin.maxCols, "function", "Section 2: maxCols accessible");
assert.strictEqual(typeof consoleWin.itemHeight, "function", "Section 2: itemHeight accessible");
assert.strictEqual(typeof consoleWin.headerHeight, "function", "Section 2: headerHeight accessible");
assert.strictEqual(typeof consoleWin.titleRect, "function", "Section 2: titleRect accessible");
assert.strictEqual(typeof consoleWin.statusRect, "function", "Section 2: statusRect accessible");

assert.strictEqual(typeof consoleWin.resetFontSettings, "function", "Section 3: resetFontSettings accessible");
assert.strictEqual(typeof consoleWin.styliseTitle, "function", "Section 3: styliseTitle accessible");
assert.strictEqual(typeof consoleWin.styliseStatus, "function", "Section 3: styliseStatus accessible");

assert.strictEqual(typeof consoleWin.drawTitleBlock, "function", "Section 4: drawTitleBlock accessible");
assert.strictEqual(typeof consoleWin.drawStatusBlock, "function", "Section 4: drawStatusBlock accessible");
assert.strictEqual(typeof consoleWin.drawItem, "function", "Section 4: drawItem accessible");

assert.strictEqual(typeof consoleWin.makeCommandList, "function", "Section 5: makeCommandList accessible");
assert.strictEqual(typeof consoleWin.refresh, "function", "Section 5: refresh accessible");
console.log("✓ Window_BridgeConsole respects all 5 architectural sections.");

// ----------------------------------------------------------------------------
// TEST 2: Bridge Console Command Availability Matrix
// ----------------------------------------------------------------------------
console.log("\n--- Test 2: Command Availability Matrix ---");

// Situation A: Free space flight (not orbiting, not landed)
mockShip.leaveHost();
mockShip._orbitingPlanetId = null;
mockShip._status = "Static";
consoleWin.refresh();

let navCmd = consoleWin._list.find(c => c.symbol === "navigation");
let landCmd = consoleWin._list.find(c => c.symbol === "land");
let takeoffCmd = consoleWin._list.find(c => c.symbol === "takeoff");
let dockCmd = consoleWin._list.find(c => c.symbol === "dock");
let quitCmd = consoleWin._list.find(c => c.symbol === "quit");

assert.strictEqual(navCmd.enabled, true, "Navigation enabled in deep space");
assert.strictEqual(landCmd.enabled, false, "Land disabled in deep space");
assert.strictEqual(takeoffCmd.enabled, false, "Takeoff disabled when in flight");
assert.strictEqual(dockCmd.enabled, false, "Docking disabled (WIP)");
assert.strictEqual(quitCmd.enabled, true, "Quit always enabled");
console.log("✓ State A: Deep space flight matrix validated.");

// Situation B: Orbiting Planet 5, Landing Unauthorized
mockShip.setOrbitingPlanet(5);
$gameSystem.setLandingAuthorized(5, false);
consoleWin.refresh();

navCmd = consoleWin._list.find(c => c.symbol === "navigation");
landCmd = consoleWin._list.find(c => c.symbol === "land");
takeoffCmd = consoleWin._list.find(c => c.symbol === "takeoff");

assert.strictEqual(navCmd.enabled, true, "Navigation enabled in orbit");
assert.strictEqual(consoleWin.canLand, true, "Ship is physically able to land");
assert.strictEqual(consoleWin.isLandingAuthorized, false, "Landing clearance not granted");
assert.strictEqual(landCmd.enabled, false, "Land disabled without authorization");
assert.strictEqual(takeoffCmd.enabled, false, "Takeoff disabled while in orbit");
console.log("✓ State B: In-orbit without authorization matrix validated.");

// Situation C: Orbiting Planet 5, Landing Authorized
$gameSystem.setLandingAuthorized(5, true);
consoleWin.refresh();

landCmd = consoleWin._list.find(c => c.symbol === "land");
assert.strictEqual(consoleWin.isLandingAuthorized, true, "Landing clearance granted");
assert.strictEqual(landCmd.enabled, true, "Land ENABLED with authorization");
console.log("✓ State C: In-orbit with authorization matrix validated.");

// Situation D: Landed on Planet 5
mockShip.aboard(5, "P");
consoleWin.refresh();

navCmd = consoleWin._list.find(c => c.symbol === "navigation");
landCmd = consoleWin._list.find(c => c.symbol === "land");
takeoffCmd = consoleWin._list.find(c => c.symbol === "takeoff");

assert.strictEqual(navCmd.enabled, false, "Navigation disabled while landed");
assert.strictEqual(landCmd.enabled, false, "Land disabled while already landed");
assert.strictEqual(takeoffCmd.enabled, true, "Takeoff ENABLED while landed");
console.log("✓ State D: Landed ship matrix validated.");

// ----------------------------------------------------------------------------
// TEST 3: Landing Authorization System API
// ----------------------------------------------------------------------------
console.log("\n--- Test 3: Landing Authorization API ---");
assert.strictEqual(typeof SC4.isLandingAuthorized, "function", "SC4.isLandingAuthorized is exported");
assert.strictEqual(typeof SC4.setLandingAuthorized, "function", "SC4.setLandingAuthorized is exported");

SC4.setLandingAuthorized("furia", true);
assert.strictEqual(SC4.isLandingAuthorized("furia"), true, "Landing authorized for furia");
SC4.setLandingAuthorized("furia", false);
assert.strictEqual(SC4.isLandingAuthorized("furia"), false, "Landing revoked for furia");

assert.strictEqual(typeof SC4.isLandingAllowed, "function", "SC4.isLandingAllowed is exported");

// Verification of player movement block when bridge console is active
assert.strictEqual($gamePlayer.canMove(), true, "Player can move normally when console closed");
$gameSystem._bridgeConsoleOpen = true;
assert.strictEqual($gamePlayer.canMove(), false, "Player CANNOT move while bridge console is open");
$gameSystem._bridgeConsoleOpen = false;
assert.strictEqual($gamePlayer.canMove(), true, "Player can move again when bridge console is closed");

console.log("✓ SC4 Landing Authorization API & Input Lock function as expected.");

// ----------------------------------------------------------------------------
// TEST 4: Scripted Landing Sequence V1
// ----------------------------------------------------------------------------
console.log("\n--- Test 4: Scripted Landing Sequence V1 ---");
mockShip.leaveHost();
mockShip.setOrbitingPlanet(5);

SC4.performLandingSequence("prime_spatioport");

assert.strictEqual(AudioManager._lastSe.name, "FIREWIND2", "Landing SE FIREWIND2 played");
assert.ok($gameScreen._pictures[1], "Landing_placeholder overlay picture displayed");
assert.strictEqual($gameScreen._pictures[1].name, "Landing_placeholder", "Correct picture name shown");
assert.strictEqual(mockShip.isLanded(), 5, "Spaceship status set to Landed on planet 5");
assert.strictEqual(mockShip._status, "Static", "Spaceship movement status set to Static");
assert.strictEqual($gamePlayer._mapId, 37, "Player transferred to landing Map 37");
assert.strictEqual($gamePlayer._x, 127, "Player transferred to x: 127");
assert.strictEqual($gamePlayer._y, 58, "Player transferred to y: 58");
assert.strictEqual($gamePlayer._fadeType, 2, "Player transfer was mute/silent under overlay");
console.log("✓ Landing sequence V1 executed successfully with SE, picture, transfer & ship state.");

// ----------------------------------------------------------------------------
// TEST 5: Scripted Takeoff Sequence V1
// ----------------------------------------------------------------------------
console.log("\n--- Test 5: Scripted Takeoff Sequence V1 ---");
assert.strictEqual(mockShip.isLanded(), 5, "Ship is currently landed");

SC4.performTakeoffSequence();

assert.strictEqual(AudioManager._lastSe.name, "ShipJump", "Takeoff SE ShipJump played");
assert.ok($gameScreen._pictures[1], "Takeoff picture overlay displayed");
assert.strictEqual(mockShip.isLanded(), null, "Ship left planet surface (isLanded === null)");
assert.strictEqual(mockShip.orbitingPlanetId, 5, "Ship placed in orbit around planet 5");
assert.strictEqual(mockShip._status, "Orbiting", "Ship status updated to Orbiting");
assert.strictEqual($gamePlayer._mapId, 31, "Player transferred to ship interior (Map 31)");
assert.strictEqual($gamePlayer._x, 10, "Player at ship spawn x: 10");
assert.strictEqual($gamePlayer._y, 10, "Player at ship spawn y: 10");
console.log("✓ Takeoff sequence V1 executed successfully with SE, picture, transfer & orbit state.");

// ----------------------------------------------------------------------------
// TEST 6: Dynamic Ship Map Parallax (<spaceshipIdParalaxes:1>)
// ----------------------------------------------------------------------------
console.log("\n--- Test 6: Hublot / Dynamic Parallax on Ship Inner Maps ---");
global.$dataMap = {
    note: "<spaceshipIdParalaxes: 1>"
};

// Case 1: Ship in orbit around Planet 5
mockShip.leaveHost();
mockShip.setOrbitingPlanet(5);
$gameMap.updateSpaceshipParallax();

assert.strictEqual($gameMap._parallaxName, "!planet_5", "Parallax set to !planet_5");
assert.strictEqual($gameMap._parallaxZero, true, "Zero-parallax active for stationary orbit");
assert.strictEqual($gameMap._parallaxSx, 0, "No horizontal scroll in stationary orbit");

// Case 2: Ship in InterSystemJump (FTL Warp)
mockShip._status = "InterSystemJump";
$gameMap.updateSpaceshipParallax();

assert.strictEqual($gameMap._parallaxName, "Warp", "Parallax set to Warp in FTL jump");
assert.strictEqual($gameMap._parallaxZero, false, "Dynamic scrolling active");
assert.strictEqual($gameMap._parallaxSx, 8, "Fast horizontal scroll during Warp");

// Case 3: Ship in deep space flight
mockShip._status = "MoveToDest";
mockShip._orbitingPlanetId = null;
$gameMap.updateSpaceshipParallax();

assert.strictEqual($gameMap._parallaxName, "StarlitSky", "Parallax set to StarlitSky in open space");
assert.strictEqual($gameMap._parallaxSx, 0.5, "Gentle stellar drift scroll in deep space");

// Case 4: Map without tag remains untouched
global.$dataMap = { note: "" };
$gameMap._parallaxName = "CustomBackground";
$gameMap.updateSpaceshipParallax();
assert.strictEqual($gameMap._parallaxName, "CustomBackground", "Untagged map parallax preserved");
console.log("✓ Dynamic ship parallax reacts accurately to all navigation states.");

console.log("\n==============================================================");
console.log("  TEST STEP 21 RÉUSSI : 100% des tests validés !              ");
console.log("==============================================================");
