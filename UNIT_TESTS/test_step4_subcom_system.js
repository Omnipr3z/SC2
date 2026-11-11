/**
 * ============================================================================
 * TEST UNITAIRE ÉTAPE 4 & FIX ORBITE :
 *  - Fix Orbite prématurée (MoveToOrbit vs Orbiting) sur BridgeConsole,
 *    Scene_SpaceTravel et SC4.performLandingSequence
 *  - $guiManager (isSubComActive, isNavigationLocked, save/load)
 *  - Game_DateFormatter (fromTimestamp, formatTimestamp, formatShortTimestamp)
 *  - Game_ScActorSubCom & addActor contacts mutuels
 *  - $subComManager (queue, merge, expiration, recallAt-*, missed cap, Ship_msg SE,
 *    dead actor purge, masked caller & revealCaller, SC_DataManager save/load)
 *  - Window_BridgeConsole (nav verrouillée, libellés SubCom, clignotement sans
 *    reconstruction de makeCommandList) & SubScene_Console (live refresh & LIFO)
 *  - Sprite_SubcomHUD, Window_SubcomMissedList, Window_SubcomContactCommand,
 *    Window_SubcomCommand, SubScene_Subcom, SubScene_SubcomDialog & InterlocutorHUD
 * ============================================================================
 */

global.window = global;
const assert = require("assert");
const path = require("path");

const pluginsDir = path.resolve(__dirname, "../js/plugins");

// ============================================================================
// 1. MOCKS RMMZ / PIXI ENVIRONNEMENT COMPLET
// ============================================================================

const warnedLogs = [];
const errorLogs = [];
global.DEBUGTOOL = {
    log: () => {},
    warn: (tag, msg, data) => warnedLogs.push({ tag, msg, data }),
    error: (tag, msg, data) => errorLogs.push({ tag, msg, data })
};

global.Utils = { RPGMAKER_NAME: "MZ" };

global.Graphics = {
    boxWidth: 1280,
    boxHeight: 720,
    width: 1280,
    height: 720,
    deltaTime: 1 / 60,
    frameCount: 0
};

global.Rectangle = class Rectangle {
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
};

global.JsonEx = {
    makeDeepCopy(obj) {
        const seen = new WeakSet();
        const check = (val, depth = 0) => {
            if (depth > 20) {
                throw new Error("Object too deep");
            }
            if (val && typeof val === "object") {
                if (seen.has(val)) throw new Error("Object too deep");
                seen.add(val);
                for (const key of Object.keys(val)) {
                    check(val[key], depth + 1);
                }
                seen.delete(val);
            }
        };
        check(obj, 0);
        return JSON.parse(JSON.stringify(obj));
    }
};

class MockContext2D {
    constructor(bitmap) {
        this.bitmap = bitmap;
        this.font = "16px sans-serif";
        this.fillStyle = "#ffffff";
        this.strokeStyle = "#ffffff";
        this.textAlign = "left";
        this.shadowColor = "transparent";
        this.lineWidth = 1;
    }
    save() {}
    restore() {}
    beginPath() {}
    moveTo() {}
    lineTo() {}
    stroke() {}
    fillRect(x, y, w, h) {
        this.bitmap._recordedRects.push({ op: "fillRect", x, y, w, h, style: this.fillStyle });
    }
    strokeRect() {}
    clearRect(x, y, w, h) {
        this.bitmap._recordedRects.push({ op: "clearRect", x, y, w, h });
    }
    drawImage() {}
    fillText(txt, x, y) {
        this.bitmap._recordedTexts.push({ txt: String(txt), x, y, fillStyle: this.fillStyle, font: this.font });
    }
    measureText(str) {
        return { width: String(str || "").length * 9 };
    }
}

class MockBitmap {
    constructor(w = 256, h = 256, name = "") {
        this.width = w;
        this.height = h;
        this.name = name;
        this._canvas = { width: w, height: h };
        this.context = new MockContext2D(this);
        this.fontFace = "sans-serif";
        this.fontSize = 18;
        this.textColor = "#ffffff";
        this.outlineColor = "#000000";
        this.outlineWidth = 3;
        this._baseTexture = { updateCount: 0, update() { this.updateCount++; } };
        this._loadingState = "loaded";
        this._loadListeners = [];
        this._recordedTexts = [];
        this._recordedRects = [];
    }
    isReady() { return this._loadingState === "loaded"; }
    isError() { return this._loadingState === "error"; }
    addLoadListener(cb) { cb(this); }
    clear() { this._recordedTexts = []; this._recordedRects = []; }
    clearRect(x, y, w, h) { this.context.clearRect(x, y, w, h); }
    fillRect(x, y, w, h, color) {
        const prev = this.context.fillStyle;
        this.context.fillStyle = color;
        this.context.fillRect(x, y, w, h);
        this.context.fillStyle = prev;
    }
    gradientFillRect() {}
    strokeRect() {}
    blt() {}
    getPixel() { return "#ffffff"; }
}
global.Bitmap = MockBitmap;

global.ImageManager = {
    faceWidth: 144,
    faceHeight: 144,
    loadSystem: (name) => new MockBitmap(192, 192, name),
    loadFace: (name) => new MockBitmap(576, 288, name),
    loadBitmap: (folder, name) => new MockBitmap(64, 64, name)
};

global.Bitmap_Composite = {
    getCompositeFaceEntry: (actor) => ({
        composer: { isReady: () => true, bltComposite: () => {} },
        bitmap: new MockBitmap(144, 144, `hero_${actor.actorId()}`),
        isComposed: true
    })
};

const playedSes = [];
global.AudioManager = {
    _lastSe: null,
    playSe(se) {
        this._lastSe = se;
        playedSes.push(se);
    },
    playBgs() {},
    stopBgs() {}
};

global.SoundManager = {
    playOk() {},
    playCancel() {},
    playCursor() {},
    playBuzzer() {}
};

global.Input = {
    keyMapper: {},
    isTriggered: () => false,
    isRepeated: () => false,
    update: () => {}
};

global.TouchInput = {
    x: 0,
    y: 0,
    clear() {},
    update() {},
    isPressed: () => false,
    isTriggered: () => false,
    isRightPressed: () => false,
    isClicked: () => false,
    isCancelled: () => false
};

global.ConfigManager = { makeData: () => ({}), applyData: () => {} };
global.TextManager = { basic: () => "", param: () => "", command: () => "", message: () => "" };
global.Tilemap = class Tilemap { update() {} };

global.ColorManager = {
    textColor: () => "#ffffff",
    normalColor: () => "#ffffff",
    systemColor: () => "#61afef",
    pendingColor: () => "#999999",
    outlineColor: () => "#000000"
};

class MockSprite {
    constructor(bitmap = null) {
        this.bitmap = bitmap;
        this.x = 0;
        this.y = 0;
        this.width = bitmap ? bitmap.width : 0;
        this.height = bitmap ? bitmap.height : 0;
        this.visible = true;
        this.opacity = 255;
        this.filters = null;
        this.children = [];
        this.anchor = { x: 0, y: 0, set(ax, ay) { this.x = ax; this.y = ay; } };
        this.scale = { x: 1, y: 1, set(sx, sy) { this.x = sx; this.y = sy; } };
    }
    addChild(c) { this.children.push(c); return c; }
    removeChild(c) {
        const i = this.children.indexOf(c);
        if (i >= 0) this.children.splice(i, 1);
    }
    setFrame() {}
    update() {
        for (const c of this.children) {
            if (c && typeof c.update === "function") c.update();
        }
    }
    destroy() { this.children = []; }
}
global.Sprite = MockSprite;

global.WindowLayer = class WindowLayer {
    constructor() { this.children = []; this.x = 0; this.y = 0; }
    addChild(c) { this.children.push(c); return c; }
};

class MockWindowBase {
    constructor(rect) {
        this.initialize(rect || new Rectangle(0, 0, 100, 100));
    }
    initialize(rect) {
        this.x = rect.x || 0;
        this.y = rect.y || 0;
        this.width = rect.width || 100;
        this.height = rect.height || 100;
        this.padding = 12;
        this.opacity = 255;
        this.backOpacity = 192;
        this.visible = true;
        this.openness = 255;
        this._active = false;
        this.origin = { x: 0, y: 0 };
        this.children = [];
        this.contents = new MockBitmap(Math.max(1, this.innerWidth), Math.max(1, this.innerHeight), "contents");
        this.contentsBack = new MockBitmap(Math.max(1, this.innerWidth), Math.max(1, this.innerHeight), "contentsBack");
    }
    get innerWidth() { return Math.max(0, this.width - this.padding * 2); }
    get innerHeight() { return Math.max(0, this.height - this.padding * 2); }
    open() { this.openness = 255; this._open = true; }
    close() { this.openness = 0; this._open = false; }
    isOpen() { return this.openness >= 255; }
    isClosed() { return this.openness <= 0; }
    activate() { this._active = true; }
    deactivate() { this._active = false; }
    get active() { return this._active; }
    set active(v) { this._active = Boolean(v); }
    show() { this.visible = true; }
    hide() { this.visible = false; }
    changeTextColor(c) { if (this.contents) this.contents.textColor = c; }
    resetTextColor() { this.changeTextColor("#ffffff"); }
    resetFontSettings() {}
    loadWindowskin() {}
    drawIcon() {}
    changePaintOpacity() {}
    drawText(txt, x, y, w, align) {
        if (this.contents && this.contents.context) {
            this.contents.context.fillStyle = this.contents.textColor;
            this.contents.context.fillText(txt, x, y);
        }
    }
    update() {}
    destroy() { this.children = []; }
}
global.Window_Base = MockWindowBase;

class MockWindowSelectable extends MockWindowBase {
    initialize(rect) {
        super.initialize(rect);
        this._index = 0;
        this._handlers = {};
        this._scrollY = 0;
        this._scrollBaseY = 0;
    }
    maxCols() { return 1; }
    maxItems() { return 0; }
    itemWidth() { return Math.floor(this.innerWidth / this.maxCols()); }
    itemHeight() { return 36; }
    scrollY() { return this._scrollY; }
    scrollBaseX() { return 0; }
    scrollBaseY() { return this._scrollBaseY; }
    scrollTo(x, y) { this._scrollY = Math.max(0, y); }
    smoothScrollTo(x, y) { this.scrollTo(x, y); }
    row() { return Math.floor(this._index / this.maxCols()); }
    topIndex() { return 0; }
    maxVisibleItems() { return this.maxItems(); }
    itemRect(index) {
        const y = index * this.itemHeight() - this.scrollBaseY();
        return new Rectangle(0, y, this.innerWidth, this.itemHeight());
    }
    itemRectWithPadding(index) { return this.itemRect(index); }
    drawItemBackground() {}
    drawItem() {}
    drawAllItems() {
        for (let i = 0; i < this.maxItems(); i++) {
            this.drawItemBackground(i);
            this.drawItem(i);
        }
    }
    paint() {
        if (this.contents) this.contents.clear();
        if (this.contentsBack) this.contentsBack.clear();
        this.drawAllItems();
    }
    refresh() { this.paint(); }
    select(index) { this._index = index; }
    index() { return this._index; }
    setCursorRect() {}
    setHandler(sym, fn) { this._handlers[sym] = fn; }
    isHandled(sym) { return Boolean(this._handlers[sym]); }
    callHandler(sym) { if (this._handlers[sym]) this._handlers[sym](); }
    callOkHandler() { if (this.isHandled("ok")) this.callHandler("ok"); }
    hitTest(x, y) { return (y >= 0) ? 0 : -1; }
}
global.Window_Selectable = MockWindowSelectable;

class MockWindowCommand extends MockWindowSelectable {
    initialize(rect) {
        super.initialize(rect);
        this._list = [];
    }
    maxItems() { return this._list.length; }
    clearCommandList() { this._list = []; }
    addCommand(name, symbol, enabled = true, ext = null) {
        this._list.push({ name, symbol, enabled, ext });
    }
    makeCommandList() {}
    currentData() { return this._list[this._index] || null; }
    currentSymbol() { const d = this.currentData(); return d ? d.symbol : null; }
    currentExt() { const d = this.currentData(); return d ? d.ext : null; }
    refresh() {
        this.clearCommandList();
        this.makeCommandList();
        super.paint();
    }
}
global.Window_Command = MockWindowCommand;

global.Window_SpaceShipInfo = class extends MockWindowBase {
    initialize(rect) {
        super.initialize(rect);
        this._ship = null;
        this._refreshCount = 0;
    }
    setShip(s) { this._ship = s; }
    refresh() { this._refreshCount++; }
};

global.Window_Message = class extends MockWindowBase {
    startMessage() {}
    terminateMessage() {}
    updatePlacement() {}
    updateBackground() {}
    startInput() { return false; }
    checkToNotClose() {}
};

global.Scene_Base = class Scene_Base {
    constructor() {
        this.children = [];
        this._windowLayer = null;
        this._active = false;
    }
    initialize() {}
    create() {}
    start() { this._active = true; }
    update() { this.updateChildren(); }
    updateChildren() {
        for (const c of this.children) {
            if (c && typeof c.update === "function") c.update();
        }
    }
    stop() { this._active = false; }
    terminate() {}
    isActive() { return this._active; }
    createWindowLayer() {
        this._windowLayer = new WindowLayer();
        this.addChild(this._windowLayer);
    }
    addWindow(win) {
        if (this._windowLayer) this._windowLayer.addChild(win);
        else this.addChild(win);
    }
    addChild(c) { this.children.push(c); return c; }
    addChildAt(c, idx) { this.children.splice(idx, 0, c); return c; }
    removeChild(c) {
        const i = this.children.indexOf(c);
        if (i >= 0) this.children.splice(i, 1);
    }
};

global.Scene_Map = class Scene_Map extends Scene_Base {
    createAllWindows() {}
    createDisplayObjects() {}
    onMapLoaded() {}
    update() { super.update(); }
    updateMain() {}
    onMapTouch() {}
    isMapTouchOk() { return true; }
    isMenuEnabled() { return true; }
    isPlayerActive() { return true; }
};
global.Scene_Menu = class Scene_Menu extends Scene_Base { createCommandWindow() {} };
global.Scene_Item = class Scene_Item extends Scene_Base { create() {} useItem() {} };
global.Scene_Options = class Scene_Options extends Scene_Base { createOptionsWindow() {} };
global.Scene_Boot = class Scene_Boot extends Scene_Base {};
global.Scene_Title = class Scene_Title extends Scene_Base {};
global.Scene_Message = class Scene_Message extends Scene_Base {};
global.Scene_Equip = class Scene_Equip extends Scene_Base {};
global.Scene_Load = class Scene_Load extends Scene_Base {};
global.Scene_GameEnd = class Scene_GameEnd extends Scene_Base {};

global.SceneManager = {
    _scene: null,
    _pushedScene: null,
    push(cls) { this._pushedScene = cls; },
    pop() {},
    isSceneChanging: () => false,
    isNextScene: () => false
};

global.PluginManager = {
    _commands: {},
    parameters: () => ({}),
    registerCommand: (p, n, fn) => { PluginManager._commands[`${p}:${n}`] = fn; }
};

// Mock natives Game_* required by SC4_rmmz_objects_Patches & SC_DataManager
global.Game_Temp = class Game_Temp {
    setDestination() {}
    clearDestination() {}
};
global.Game_System = class Game_System {
    constructor() {
        this._landingAuthorizations = {};
    }
    mainFontFace() { return "sans-serif"; }
    mainFontSize() { return 20; }
    windowPadding() { return 12; }
    isMenuEnabled() { return true; }
    isRingMenuEnabled() { return true; }
    setLandingAuthorized(id, val) { this._landingAuthorizations[id] = Boolean(val); }
    isLandingAuthorized(id) { return Boolean(this._landingAuthorizations[id]); }
    isBubbleMessageMode() { return false; }
    setBubbleMessageMode() {}
};
global.Game_Timer = class {};
global.Game_Message = class {
    constructor() { this._texts = []; }
    clear() { this._texts = []; }
    add(t) { this._texts.push(t); }
    isBusy() { return this._texts.length > 0; }
    positionType() { return 2; }
    setPositionType() {}
    background() { return 0; }
    setBackground() {}
};
global.Game_Screen = class {
    constructor() { this._pictures = {}; }
    showPicture(id, name, o, x, y, sx, sy, op, bl) {
        this._pictures[id] = { id, name, origin: o, x, y, sx, sy, opacity: op, blend: bl };
    }
    movePicture() {}
    erasePicture(id) { delete this._pictures[id]; }
};
global.Game_Picture = class {};
global.Game_Variables = class {};
global.Game_Switches = class {};
global.Game_SelfSwitches = class {
    constructor() { this._data = {}; }
    setValue(key, v) { this._data[key.join(",")] = Boolean(v); }
    value(key) { return Boolean(this._data[key.join(",")]); }
};
global.Game_BattlerBase = class { xparam() { return 0; } };
global.Game_Battler = class extends global.Game_BattlerBase {};
global.Game_Actor = class extends global.Game_Battler {
    constructor(actorId) {
        super();
        this.initialize(actorId);
    }
    initialize(actorId) {
        this._actorId = actorId;
        const d = $dataActors[actorId] || {};
        this._name = d.name || `Actor${actorId}`;
        this._nickname = d.nickname || "";
        this._profile = d.profile || "";
        this._faceName = d.faceName || "Actor1";
        this._faceIndex = d.faceIndex || 0;
        this._equips = [];
        this._states = [];
        this.hp = 100;
        this.mhp = 100;
        this.mp = 50;
        this.mmp = 50;
        this.tp = 0;
        this.level = 1;
        this.atk = 10;
    }
    setup(actorId) { this._actorId = actorId; }
    actorId() { return this._actorId; }
    actor() { return $dataActors[this._actorId] || null; }
    name() { return this._name; }
    nickname() { return this._nickname; }
    profile() { return this._profile; }
    faceName() { return this._faceName; }
    faceIndex() { return this._faceIndex; }
    equips() { return this._equips; }
    param(id) { return id === 2 ? this.atk : 10; }
    isDead() { return this._states.includes(1); }
    die() { if (!this._states.includes(1)) this._states.push(1); }
    revive() { this._states = this._states.filter(s => s !== 1); }
    addState(id) { if (!this._states.includes(id)) this._states.push(id); }
    removeState(id) { this._states = this._states.filter(s => s !== id); }
    tradeItemWithParty() { return true; }
};
global.Game_Actors = class Game_Actors {
    constructor() { this._data = []; }
    actor(actorId) {
        if ($dataActors[actorId]) {
            if (!this._data[actorId]) {
                this._data[actorId] = new Game_Actor(actorId);
            }
            return this._data[actorId];
        }
        return null;
    }
};
global.Game_Unit = class {};
global.Game_Party = class Game_Party extends global.Game_Unit {
    constructor() {
        super();
        this._actors = [1];
        this._items = {};
        this._weapons = {};
        this._armors = {};
    }
    members() { return this._actors.map(id => $gameActors.actor(id)).filter(Boolean); }
    allMembers() { return this.members(); }
    leader() { return this.members()[0] || null; }
    addActor(actorId) {
        if (!this._actors.includes(actorId)) {
            this._actors.push(actorId);
        }
    }
    numItems() { return 0; }
    allItems() { return []; }
    hasItem() { return false; }
    gainItem() {}
    loseItem() {}
    consumeItem() {}
};
global.Game_Troop = class extends global.Game_Unit {};
global.Game_CharacterBase = class {
    constructor() { this.initMembers(); }
    initMembers() {
        this._x = 0; this._y = 0; this._direction = 2; this._moveSpeed = 4;
    }
    direction() { return this._direction; }
    isMoving() { return false; }
    canPass() { return true; }
    canPassDiagonally() { return true; }
    screenX() { return 640; }
    screenY() { return 400; }
};
global.Game_Character = class extends global.Game_CharacterBase {
    pattern() { return 1; }
    characterName() { return ""; }
};
global.Game_Player = class extends global.Game_Character {
    constructor() {
        super();
        this._mapId = 31;
        this._x = 10;
        this._y = 10;
        this._d = 2;
        this._fadeType = 0;
    }
    canMove() { return true; }
    isAttacking() { return false; }
    isActing() { return false; }
    isJumping() { return false; }
    isAiming() { return false; }
    centerX() { return 8; }
    centerY() { return 6; }
    scrolledX() { return 8; }
    scrolledY() { return 6; }
    reserveTransfer(m, x, y, d, f) {
        this._mapId = m; this._x = x; this._y = y; this._d = d; this._fadeType = f;
    }
};
global.Game_Follower = class extends global.Game_Character { actor() { return null; } };
global.Game_Followers = class { forEach() {} };
global.Game_Vehicle = class extends global.Game_Character {};
global.Game_Event = class extends global.Game_Character {
    constructor(id = 1, actorId = 0) {
        super();
        this._eventId = id;
        this._actorId = actorId;
    }
    eventId() { return this._eventId; }
    actorId() { return this._actorId; }
};
global.Game_Map = class {
    constructor() {
        this._mapId = 31;
        this._events = [];
        this._displayX = 0;
        this._displayY = 0;
        this._interpreter = { eventId: () => 0 };
    }
    mapId() { return this._mapId; }
    events() { return this._events.filter(Boolean); }
    event(id) { return this._events.find(e => e && e.eventId() === id) || null; }
    isScrolling() { return false; }
    isEventRunning() { return false; }
    isLoopHorizontal() { return false; }
    isLoopVertical() { return false; }
    width() { return 20; }
    height() { return 20; }
    screenTileX() { return 17; }
    screenTileY() { return 13; }
    setup() {}
};
global.Game_Action = class {};
global.Game_Interpreter = class {};
global.Game_Enemy = class extends global.Game_Battler {};

global.DataManager = {
    isWeapon: (item) => Boolean(item && item.wtypeId !== undefined),
    isArmor: (item) => Boolean(item && item.etypeId !== undefined),
    isItem: (item) => Boolean(item && item.itypeId !== undefined),
    loadDatabase() {},
    isDatabaseLoaded: () => true,
    createGameObjects() {
        global.$gameTemp = new Game_Temp();
        global.$gameSystem = new Game_System();
        global.$gameScreen = new Game_Screen();
        global.$gameMessage = new Game_Message();
        global.$gameSelfSwitches = new Game_SelfSwitches();
        global.$gameActors = new Game_Actors();
        global.$gameParty = new Game_Party();
        global.$gameMap = new Game_Map();
        global.$gamePlayer = new Game_Player();
    },
    makeSaveContents: () => ({}),
    extractSaveContents: () => {},
    onLoad: () => {}
};

// Mock Databases
global.$dataActors = [
    null,
    { id: 1, name: "Mosay", nickname: "Cmd", profile: "", note: "<Hero>\n<Race: Human>\n<Sex: Male>\n<Face>\n<factionId: 1>" },
    { id: 2, name: "Priscilla", nickname: "", profile: "", note: "<Hero>\n<Race: Human>\n<Sex: Female>\n<Face>\n<factionId: 1>" },
    { id: 3, name: "Gouverneur Iban", nickname: "", profile: "", note: "<factionId: 2>", faceName: "People1", faceIndex: 2 },
    { id: 4, name: "Officier Vane", nickname: "", profile: "", note: "<factionId: 1>", faceName: "People2", faceIndex: 1 }
];
global.$dataSystem = { equipTypes: ["", "Arme"] };
global.$dataSkills = [null];
global.$dataItems = [null];
global.$dataWeapons = [null];
global.$dataArmors = [null];
global.$dataTimeSystem = {
    start_timestamp: 100000,
    minutes_per_hour: 60,
    hours_per_day: 24,
    days_per_month: 30,
    months_per_year: 12,
    tick_per_min: [0, 60, 30, 15, 5],
    months_of_year: ["M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12"],
    days_of_decade: ["Primus","Secundus","Tertius","Quartus","Quintus","Sextus","Septimus","Octavus","Nonus","Decimus"],
    seasons_global: ["Printemps","Été","Automne","Hiver"]
};

// ============================================================================
// 2. CHARGEMENT DES PLUGINS RÉELS DANS L'ORDRE DE plugins.js
// ============================================================================
require(path.join(pluginsDir, "SC4_core.js"));
require(path.join(pluginsDir, "SC4_Interface.js"));
require(path.join(pluginsDir, "SC4_Localization.js"));
require(path.join(pluginsDir, "SC4_GameDate.js"));
require(path.join(pluginsDir, "SC4_Game_DateFormatter.js"));
require(path.join(pluginsDir, "SC4_Game_ScActorEquipment.js"));
require(path.join(pluginsDir, "SC4_Game_ScActorInventory.js"));
require(path.join(pluginsDir, "SC4_Game_ScActorCombat.js"));
require(path.join(pluginsDir, "SC4_Game_ScActorSocial.js"));
require(path.join(pluginsDir, "SC4_Game_ScActorSubCom.js"));
require(path.join(pluginsDir, "SC4_Game_ScActorLocation.js"));
require(path.join(pluginsDir, "SC4_Game_ScActorCharacter.js"));
require(path.join(pluginsDir, "SC4_Game_ScActor.js"));
require(path.join(pluginsDir, "SC4_Game_Faction.js"));
require(path.join(pluginsDir, "SC4_Game_Relation.js"));
require(path.join(pluginsDir, "SC4_Game_InteractionBase.js"));
require(path.join(pluginsDir, "SC4_Game_InteractionChat.js"));
require(path.join(pluginsDir, "SC4_Game_ReactionBase.js"));
require(path.join(pluginsDir, "SC4_Game_ReactionChat.js"));

require(path.join(pluginsDir, "SC4_Sprite_PaperdollFace.js"));
require(path.join(pluginsDir, "SC4_SubComHologramFilter.js"));
require(path.join(pluginsDir, "SC4_Sprite_HudBase.js"));
require(path.join(pluginsDir, "SC4_Sprite_ActorHUD.js"));
require(path.join(pluginsDir, "SC4_Sprite_InterlocutorHUD.js"));
require(path.join(pluginsDir, "SC4_Sprite_SubcomHUD.js"));

require(path.join(pluginsDir, "SC4_Window_RingCommand.js"));
require(path.join(pluginsDir, "SC4_Window_InteractionRingCommand.js"));
require(path.join(pluginsDir, "SC4_Window_BridgeConsole.js"));
require(path.join(pluginsDir, "SC4_Window_SubcomMissedList.js"));
require(path.join(pluginsDir, "SC4_Window_SubcomContactCommand.js"));
require(path.join(pluginsDir, "SC4_Window_SubcomCommand.js"));

require(path.join(pluginsDir, "SC4_SubSceneManager.js"));
require(path.join(pluginsDir, "SC4_SubScene_Base.js"));
require(path.join(pluginsDir, "SC4_SubScene_RelationDialog.js"));
require(path.join(pluginsDir, "SC4_SubScene_SubcomDialog.js"));
require(path.join(pluginsDir, "SC4_SubScene_Console.js"));
require(path.join(pluginsDir, "SC4_SubScene_Subcom.js"));

require(path.join(pluginsDir, "SC4_Scene_SpaceTravel.js"));

require(path.join(pluginsDir, "SC4_DataManager.js"));
require(path.join(pluginsDir, "SC4_GuiManager.js"));
require(path.join(pluginsDir, "SC4_RelationManager.js"));
require(path.join(pluginsDir, "SC4_RelationDialogManager.js"));
require(path.join(pluginsDir, "SC4_SubComManager.js"));

require(path.join(pluginsDir, "SC4_rmmz_core_Patches.js"));
require(path.join(pluginsDir, "SC4_rmmz_objects_Patches.js"));
require(path.join(pluginsDir, "SC4_rmmz_scenes_Patches.js"));

// ============================================================================
// 3. FIXTURES PARTAGÉES & HELPERS DE TEST
// ============================================================================
class MockSpaceship {
    constructor(id = 1) {
        this._id = id;
        this.name = "Dawn of Faith";
        this.mapId = 31;
        this.landingX = 10;
        this.landingY = 10;
        this._onBoard = null;
        this.orbitingPlanetId = null;
        this.status = "Static";
    }
    get id() { return this._id; }
    get orbitingPlanet() {
        return this.orbitingPlanetId !== null
            ? ($gameGalaxy.getPlanet(this.orbitingPlanetId) || { id: this.orbitingPlanetId, name: "Ankaros Prime", landingAllowed: true })
            : null;
    }
    isLanded() {
        return (this._onBoard && String(this._onBoard).startsWith("P"))
            ? Number(String(this._onBoard).slice(1))
            : null;
    }
    isOnBoard() { return null; }
    isHyperdrive() { return false; }
    aboard(targetId, type = "V") { this._onBoard = `${type}${targetId}`; }
    leaveHost() { this._onBoard = null; }
    canLand() { return this.status === "Orbiting" && this.isLanded() === null; }
}

const planetsDb = {
    5: {
        id: 5,
        name: "Ankaros Prime",
        landingAllowed: true,
        isLandingAllowed() { return Boolean(this.landingAllowed); },
        setLandingAllowed(v) { this.landingAllowed = Boolean(v); },
        pois() { return $gamePOIs.getAll().filter(p => p.planetId === 5); }
    }
};
const poisDb = {
    prime_spatioport: {
        id: "prime_spatioport",
        name: "Spatioport Magellan",
        planetId: 5,
        landingMapId: 37,
        landingX: 127,
        landingY: 58,
        authorized: false,
        setLandingAuthorized(v) { this.authorized = Boolean(v); $gameSystem.setLandingAuthorized(this.id, v); }
    }
};

function setupCleanWorld() {
    DataManager.createGameObjects();
    global.$gameDate = new Game_Date(100000);
    global.$gameFactions = {
        _factions: {
            1: new Game_Faction({ id: 1, name: "Fédération", affinity: 10, bannerName: "banner_fed" }),
            2: new Game_Faction({ id: 2, name: "Gouvernorat", affinity: -15, bannerName: "banner_gov" })
        },
        affinity: (id) => (global.$gameFactions._factions[id] ? global.$gameFactions._factions[id].affinity : 0),
        faction: (id) => global.$gameFactions._factions[id] || null
    };
    global.$relationManager = new RelationManager();
    global.$relationDialogManager = new RelationDialogManager();
    global.$dataFactions = [null, { id: 1, name: "Fédération" }, { id: 2, name: "Gouvernorat" }];

    const ship1 = new MockSpaceship(1);
    global.$gameSpaceships = {
        _ships: [ship1],
        ship: (id) => global.$gameSpaceships._ships.find(s => s.id === Number(id)) || null,
        shipByMapId: (mid) => global.$gameSpaceships._ships.find(s => s.mapId === Number(mid)) || null,
        spaceships: () => global.$gameSpaceships._ships,
        playerShip: () => ship1
    };
    global.$gamePOIs = {
        get: (id) => poisDb[id] || null,
        getAll: () => Object.values(poisDb)
    };
    global.$gameGalaxy = {
        getPlanet: (id) => planetsDb[Number(id)] || null,
        getPOI: (id) => poisDb[id] || null,
        currentPlanet: () => planetsDb[5],
        currentPOI: () => poisDb.prime_spatioport
    };

    $gamePOIs.get("prime_spatioport").setLandingAuthorized(false);
    $gameSystem.setLandingAuthorized(5, false);

    playedSes.length = 0;
    warnedLogs.length = 0;
    errorLogs.length = 0;
    SceneManager._scene = null;
    SceneManager._pushedScene = null;
}

class MockPlayableSceneMap extends Scene_Map {
    constructor() {
        super();
        this._currentSubScene = null;
        this._subSceneStack = [];
        this._subSceneInputBlocked = false;
        this._spriteset = { _characterSprites: [] };
        this.createWindowLayer();
        this.createPlayerHud();
    }
}

let passed = 0;
function test(name, fn) {
    setupCleanWorld();
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
}

console.log("=======================================================================");
console.log("   TEST ÉTAPE 4 & FIX ORBITE : SUBCOM SYSTEM & NAVIGATION CONSOLE      ");
console.log("=======================================================================");

// ============================================================================
// SUITE 1 : GUIMANAGER
// ============================================================================
console.log("\n--- Suite 1: $guiManager (SubCom active flag, Nav Lock, Save/Load) ---");

test("$guiManager initialise isSubComActive=false et isNavigationLocked=false puis bascule correctement", () => {
    assert.strictEqual($guiManager.isSubComActive, false);
    assert.strictEqual($guiManager.isSubComVisible(), false);
    assert.strictEqual($guiManager.isNavigationLocked, false);
    assert.strictEqual($guiManager.navigationLockReason(), null);

    $guiManager.showSubCom();
    assert.strictEqual($guiManager.isSubComActive, true);
    assert.strictEqual($guiManager.isSubComVisible(), true);
    $guiManager.hideSubCom();
    assert.strictEqual($guiManager.isSubComActive, false);
    $guiManager.isSubComActive = true;
    assert.strictEqual($guiManager.isSubComActive, true);

    $guiManager.lockNavigation("iban_incoming");
    assert.strictEqual($guiManager.isNavigationLocked, true);
    assert.strictEqual($guiManager.navigationLockReason(), "iban_incoming");
    $guiManager.unlockNavigation();
    assert.strictEqual($guiManager.isNavigationLocked, false);
    assert.strictEqual($guiManager.navigationLockReason(), null);
});

test("$guiManager persiste isNavigationLocked et réinitialise isSubComActive transitoire à la sauvegarde", () => {
    $guiManager.showPlayerHud();
    $guiManager.showSubCom();
    $guiManager.lockNavigation("quest_opening");
    $guiManager.setBubbleMode(1);

    const saved = JSON.parse(JSON.stringify($guiManager.makeSavefileData()));
    assert.strictEqual(saved.isSubComActive, false, "isSubComActive transitoire ne doit pas rester bloqué actif au save");
    assert.strictEqual(saved.isNavigationLocked, true);
    assert.strictEqual(saved.navigationLockReason, "quest_opening");
    assert.strictEqual(saved.isPlayerHudVisible, true);

    $guiManager.init();
    assert.strictEqual($guiManager.isNavigationLocked, false);
    $guiManager.loadSavefileData(saved);
    assert.strictEqual($guiManager.isNavigationLocked, true);
    assert.strictEqual($guiManager.navigationLockReason(), "quest_opening");
    assert.strictEqual($guiManager.isSubComActive, false);
    assert.strictEqual($guiManager.isPlayerHudVisible(), true);
});

// ============================================================================
// SUITE 2 : GAME_DATEFORMATTER
// ============================================================================
console.log("\n--- Suite 2: Game_DateFormatter timestamp formatting ---");

test("Game_DateFormatter convertit et formate un timestamp arbitraire de manière cohérente avec Game_Date", () => {
    const ts = 55657647;
    const d = new Game_Date(ts);
    const fromStatic = Game_DateFormatter.fromTimestamp(ts);
    assert.ok(fromStatic instanceof Game_Date);
    assert.strictEqual(Game_DateFormatter.formatTimestamp(ts), Game_DateFormatter.formatNeotori(d));
    assert.strictEqual(Game_DateFormatter.formatShortTimestamp(ts), Game_DateFormatter.getShortDate(d));
});

// ============================================================================
// SUITE 3 : GAME_SCACTORSUBCOM & PARTY ADDACTOR
// ============================================================================
console.log("\n--- Suite 3: Game_ScActorSubCom, Lazy Loading & addActor contacts ---");

test("Game_ScActor lazy-load .subCom (0 contact par défaut) sans créer de cycle JsonEx", () => {
    const actor1 = $gameActors.actor(1);
    assert.strictEqual(actor1.hasSubCom(), false);
    const sub = actor1.subCom;
    assert.strictEqual(actor1.hasSubCom(), true);
    assert.ok(sub instanceof Game_ScActorSubCom);
    assert.deepStrictEqual(sub.contacts(), []);
    assert.strictEqual(sub.availableForSubComCall(), true);

    const deepCopy = JsonEx.makeDeepCopy(actor1);
    assert.strictEqual(deepCopy._actorId, 1);
});

test("Game_Party.prototype.addActor échange les contacts mutuels UNIQUEMENT à l'arrivée d'un nouveau membre", () => {
    const actor1 = $gameActors.actor(1);
    const actor2 = $gameActors.actor(2);

    $gameParty.addActor(2);
    assert.strictEqual(actor1.subCom.hasContact(2), true);
    assert.strictEqual(actor2.subCom.hasContact(1), true);

    // Retirer 2 des contacts de 1, puis ré-invoquer addActor(2) alors qu'il est déjà dans la party -> ne rajoute pas
    actor1.subCom.removeContact(2);
    assert.strictEqual(actor1.subCom.hasContact(2), false);
    $gameParty.addActor(2);
    assert.strictEqual(actor1.subCom.hasContact(2), false, "addActor sur membre déjà présent ne doit pas réajouter");
});

test("canBeCalledByPlayer exclut les acteurs morts, indisponibles, en équipe ou présents sur la carte", () => {
    const actor3 = $gameActors.actor(3);
    const actor4 = $gameActors.actor(4);
    assert.strictEqual(actor3.subCom.canBeCalledByPlayer(), true);

    // Indisponible
    actor3.subCom.setAvailableForSubComCall(false);
    assert.strictEqual(actor3.subCom.canBeCalledByPlayer(), false);
    actor3.subCom.setAvailableForSubComCall(true);
    assert.strictEqual(actor3.subCom.canBeCalledByPlayer(), true);

    // Présent sur la map courante
    $gameMap._events.push(new Game_Event(9, 3));
    assert.strictEqual(actor3.subCom.canBeCalledByPlayer(), false, "Acteur incarné sur la carte non appelable");
    $gameMap._events = [];
    assert.strictEqual(actor3.subCom.canBeCalledByPlayer(), true);

    // Dans l'équipe
    $gameParty.addActor(4);
    assert.strictEqual(actor4.subCom.canBeCalledByPlayer(), false, "Membre de la party non appelable par radio");

    // Décès & purge
    $gameActors.actor(1).subCom.addContact(3);
    assert.strictEqual($gameActors.actor(1).subCom.hasContact(3), true);
    actor3.die();
    assert.strictEqual(actor3.subCom.canBeCalledByPlayer(), false);
    assert.deepStrictEqual($gameActors.actor(1).subCom.contacts().includes(3), false, "Décédé purgé des contacts");
});

// ============================================================================
// SUITE 4 : $subComManager & PERSISTANCE DATA MANAGER
// ============================================================================
console.log("\n--- Suite 4: $subComManager (Queue, Merge, RecallAt, Missed, SE, Mask, Save/Load) ---");

test("pushCall fusionne uniquement si startTimestamp <= now, sinon empile séparément", () => {
    const now = $gameDate.timestamp; // 100000
    const c1 = $subComManager.pushCall({ actorId: 3, startTimestamp: now, limitTimestamp: now + 100 });
    assert.ok(c1);
    assert.strictEqual($subComManager.pendingCalls.length, 1);

    // Même acteur, prêt aussi (startTimestamp <= now) -> fusionne au lieu de dupliquer
    const c2 = $subComManager.pushCall({ actorId: 3, startTimestamp: now, limitTimestamp: now + 300, masked: true });
    assert.strictEqual(c2.id, c1.id);
    assert.strictEqual(c2.limitTimestamp, now + 300);
    assert.strictEqual(c2.masked, true);
    assert.strictEqual($subComManager.pendingCalls.length, 1);

    // Même acteur, programmé dans le futur (startTimestamp > now) -> NE FUSIONNE PAS
    const c3 = $subComManager.pushCall({ actorId: 3, startTimestamp: now + 1000, limitTimestamp: now + 1500 });
    assert.notStrictEqual(c3.id, c1.id);
    assert.strictEqual($subComManager.pendingCalls.length, 2);
});

test("Promotion unique activeCall, son Ship_msg uniquement à bord du vaisseau joueur, expiration & recallAt-*", () => {
    const now = $gameDate.timestamp;
    $gameMap._mapId = 31; // Map du vaisseau joueur
    $subComManager.pushCall({ actorId: 3, startTimestamp: now, limitTimestamp: now + 100, blocksNavigation: true }, "recallAt-500");

    $subComManager.update(now);
    assert.strictEqual($subComManager.activeCall.actorId, 3);
    assert.strictEqual($subComManager.hasNavigationBlockingCall(), true);
    assert.strictEqual(playedSes.length, 1);
    assert.strictEqual(playedSes[0].name, "Ship_msg");

    // Hors du vaisseau (map 37), un nouvel appel activé NE joue PAS Ship_msg
    $subComManager.rejectActiveCall();
    $gameMap._mapId = 37;
    playedSes.length = 0;
    $subComManager.pushCall({ actorId: 4, startTimestamp: now + 1, limitTimestamp: now + 20 });
    $subComManager.update(now + 1);
    assert.strictEqual($subComManager.activeCall.actorId, 4);
    assert.strictEqual(playedSes.length, 0, "Pas de son Ship_msg hors vaisseau");

    // Expiration à now + 20 -> passe en appel manqué
    $subComManager.update(now + 20);
    assert.strictEqual($subComManager.activeCall, null);
    assert.strictEqual($subComManager.missedCalls.length, 2); // 3 rejeté + 4 expiré

    // Vérification parseRecallOffset (min, hr, jr, dec)
    assert.strictEqual($subComManager.parseRecallOffset("500"), 500);
    assert.strictEqual($subComManager.parseRecallOffset("4hr"), 240);
    assert.strictEqual($subComManager.parseRecallOffset("2jr"), 2 * 24 * 60);
    assert.strictEqual($subComManager.parseRecallOffset("1dec"), 10 * 24 * 60);

    // Test callback recallAt-4hr sur appel expiré
    $subComManager.init();
    $gameDate.timestamp = 200000;
    $subComManager.pushCall({ actorId: 3, startTimestamp: 200000, limitTimestamp: 200050 }, "recallAt-4hr");
    $subComManager.update(200000);
    assert.ok($subComManager.activeCall);
    $subComManager.update(200050);
    assert.strictEqual($subComManager.activeCall, null);
    assert.strictEqual($subComManager.pendingCalls.length, 1);
    assert.strictEqual($subComManager.pendingCalls[0].startTimestamp, 200050 + 240);
    assert.strictEqual($subComManager.pendingCalls[0].limitTimestamp, 200050 + 240 + 50);
});

test("Plafond 20 appels manqués, regroupement par interlocuteur, purge mort et revealCaller", () => {
    const now = $gameDate.timestamp;
    for (let i = 0; i < 25; i++) {
        $subComManager.recordMissedCall({ actorId: (i % 2 === 0 ? 3 : 4), masked: false }, now + i);
    }
    assert.strictEqual($subComManager.missedCalls.length, 20, "Plafonné à 20 appels manqués");
    assert.strictEqual($subComManager.getUnseenMissedCount(), 20);

    const grouped = $subComManager.getGroupedMissedCalls();
    assert.strictEqual(grouped.length, 2);
    assert.strictEqual(grouped[0].count + grouped[1].count, 20);
    $subComManager.markMissedCallsSeen();
    assert.strictEqual($subComManager.getUnseenMissedCount(), 0);

    // Appel masqué sans révélation automatique -> ne ajoute PAS le contact tant que non révélé
    const leader = $gameParty.leader();
    assert.strictEqual(leader.subCom.hasContact(3), false);
    $subComManager.pushCall({
        actorId: 3,
        startTimestamp: now,
        limitTimestamp: null,
        masked: true,
        maskedLabel: "Signal Masqué",
        revealOnAnswer: false
    });
    $subComManager.update(now);
    const answered = $subComManager.answerActiveCall();
    assert.strictEqual(answered.masked, true);
    assert.strictEqual(leader.subCom.hasContact(3), false);

    // Révélation dynamique -> démasque ET enregistre le contact
    $subComManager.revealCaller();
    assert.strictEqual($subComManager.currentDialogCall.masked, false);
    assert.strictEqual(leader.subCom.hasContact(3), true);

    // Décès acteur 4 en file -> purgé automatiquement à l'update
    $subComManager.pushCall({ actorId: 4, startTimestamp: now });
    $gameActors.actor(4).die();
    $subComManager.update(now);
    assert.strictEqual($subComManager.activeCall, null, "Acteur décédé purgé de la queue");
});

test("SC_DataManager sauvegarde et restaure $guiManager, $subComManager et actor.subCom", () => {
    $guiManager.lockNavigation("story_lock");
    $gameParty.leader().subCom.addContact(3);
    $subComManager.pushCall({ actorId: 3, startTimestamp: 100000, limitTimestamp: 100500, masked: true }, "recallAt-2jr");
    $subComManager.update(100000);
    $subComManager.recordMissedCall({ actorId: 4, masked: false }, 99990);

    const rawContents = DataManager.makeSaveContents();
    const jsonRoundtrip = JSON.parse(JSON.stringify(rawContents));

    setupCleanWorld();
    DataManager.extractSaveContents(jsonRoundtrip);

    assert.strictEqual($guiManager.isNavigationLocked, true);
    assert.strictEqual($guiManager.navigationLockReason(), "story_lock");
    assert.strictEqual($gameParty.leader().subCom.hasContact(3), true);
    assert.strictEqual($subComManager.activeCall.actorId, 3);
    assert.strictEqual($subComManager.activeCall.masked, true);
    assert.strictEqual($subComManager.missedCalls.length, 1);
});

// ============================================================================
// SUITE 5 : FIX ORBITE PRÉMATURÉE (MoveToOrbit vs Orbiting)
// ============================================================================
console.log("\n--- Suite 5: Fix Orbite Prématurée (MoveToOrbit vs Orbiting) ---");

test("Pendant MoveToOrbit : canLand=false, status Approche, vitesse travel conservée et performLandingSequence refusé", () => {
    const ship = $gameSpaceships.playerShip();
    ship.orbitingPlanetId = 5;
    ship.status = "MoveToOrbit";
    $gamePOIs.get("prime_spatioport").setLandingAuthorized(true);

    // 1. Window_BridgeConsole
    const consoleWin = new Window_BridgeConsole(new Rectangle(0, 0, 460, 420));
    assert.strictEqual(consoleWin.isOrbiting, false);
    assert.strictEqual(consoleWin.isApproachingOrbit, true);
    assert.strictEqual(consoleWin.canLand, false);
    const landCmd = consoleWin._list.find(c => c.symbol === "land");
    assert.strictEqual(landCmd.enabled, false, "Atterrir DOIT être désactivé pendant MoveToOrbit");
    assert.ok(
        consoleWin.contents._recordedTexts.some(t => t.txt.includes("approche")),
        "Statut MoveToOrbit doit mentionner l'approche"
    );

    // 2. SC4.performLandingSequence refusé
    const blocked = SC4.performLandingSequence("prime_spatioport");
    assert.strictEqual(blocked, false, "performLandingSequence doit refuser tant que status !== Orbiting");
    assert.strictEqual(ship.isLanded(), null);
    assert.strictEqual(playedSes.length, 0);

    // 3. Scene_SpaceTravel ne casse pas le mode 5x (mode 3) pendant MoveToOrbit
    $gameDate.setScrollSpeedMode(3);
    const spaceScene = Object.create(Scene_SpaceTravel.prototype);
    spaceScene.children = [];
    spaceScene._active = true;
    spaceScene._selectedPlanetId = -1;
    spaceScene._lastShipStatus = "MoveToOrbit";
    spaceScene._lastOrbitingId = 5;
    spaceScene._lastHyperdrive = false;
    spaceScene._planetSprites = [];
    spaceScene._shipSprite = null;
    spaceScene._targetWindow = { setTarget() {} };
    spaceScene._calendarWindow = { refresh() {} };
    spaceScene._shipWindow = { refresh() {} };
    spaceScene._timeControlsWindow = { refresh() {} };
    spaceScene.updateControls = () => {};
    spaceScene.updatePlanetsGraphics = () => {};
    spaceScene.updateShipGraphics = () => {};
    spaceScene.updateQuestPins = () => {};
    spaceScene.updateInput = () => {};
    spaceScene.stopHyperdriveBgs = () => {};
    spaceScene.update();
    assert.strictEqual($gameDate.getScrollSpeedMode(), 3, "Vitesse rapide préservée durant MoveToOrbit");

    // 4. Arrivée réelle en orbite (status === "Orbiting") -> reset 1x, canLand=true et landing OK
    ship.status = "Orbiting";
    consoleWin.refresh();
    assert.strictEqual(consoleWin.isOrbiting, true);
    assert.strictEqual(consoleWin.canLand, true);
    assert.strictEqual(consoleWin._list.find(c => c.symbol === "land").enabled, true);

    spaceScene.update();
    assert.strictEqual($gameDate.getScrollSpeedMode(), 1, "Passage à 1x dès l'orbite atteinte (Orbiting)");

    SC4.performLandingSequence("prime_spatioport");
    assert.strictEqual(ship.isLanded(), 5, "Atterrissage réussi une fois en Orbiting");
});

// ============================================================================
// SUITE 6 : WINDOW_BRIDGECONSOLE (NAV VERROUILLÉE & CLIGNOTEMENT) & SUBSCENE_CONSOLE
// ============================================================================
console.log("\n--- Suite 6: Window_BridgeConsole (Nav lock, Red Blink 24f) & SubScene_Console ---");

test("Window_BridgeConsole verrouille Navigation, garde Subcom toujours actif et clignote en rouge sans reconstruire makeCommandList", () => {
    const win = new Window_BridgeConsole(new Rectangle(0, 0, 460, 420));
    win.show();

    // 0 appel -> Subcom néanmoins cliquable
    let subCmd = win._list.find(c => c.symbol === "subcom");
    let navCmd = win._list.find(c => c.symbol === "navigation");
    assert.strictEqual(subCmd.enabled, true);
    assert.strictEqual(navCmd.enabled, true);

    // Appel masqué bloquant la navigation
    $subComManager.pushCall({
        actorId: 3,
        startTimestamp: 100000,
        blocksNavigation: true,
        masked: true,
        maskedLabel: "Signal Masqué"
    });
    $subComManager.update(100000);
    win.refresh();

    navCmd = win._list.find(c => c.symbol === "navigation");
    subCmd = win._list.find(c => c.symbol === "subcom");
    assert.strictEqual(navCmd.enabled, false);
    assert.ok(navCmd.name.includes("[Verrouillé]"));
    assert.ok(subCmd.name.includes("Signal Masqué"));

    // Spy sur makeCommandList pour prouver que le clignotement ne reconstruit PAS la liste
    let makeListCalls = 0;
    const origMake = win.makeCommandList.bind(win);
    win.makeCommandList = () => {
        makeListCalls++;
        origMake();
    };

    assert.strictEqual(win._subcomBlinkOn, false);
    for (let f = 0; f < 24; f++) win.update();
    assert.strictEqual(win._subcomBlinkOn, true, "Clignotement actif au tick 24");
    assert.strictEqual(makeListCalls, 0, "makeCommandList NE doit PAS être rappelé pour clignoter");
    assert.ok(
        win.contents._recordedTexts.some(t => t.txt.includes("Signal Masqué") && t.fillStyle === "#ff4d4d"),
        "Couleur rouge #ff4d4d dessinée sur la ligne Subcom"
    );

    for (let f = 0; f < 24; f++) win.update();
    assert.strictEqual(win._subcomBlinkOn, false, "Alternance au tick 48");
    assert.strictEqual(makeListCalls, 0);
});

test("SubScene_Console réagit live à un appel/fin de verrouillage et isole onDeactivate / onReactivate avec SubScene_Subcom", () => {
    const mapScene = new MockPlayableSceneMap();
    SceneManager._scene = mapScene;

    const consoleSub = mapScene.openSubScene(SubScene_Console, 1, 15);
    assert.strictEqual(consoleSub._targetEventId, 15);
    assert.strictEqual(consoleSub._consoleWindow.active, true);
    assert.strictEqual(consoleSub._shipInfoWindow.active, false);

    // Changement d'état en arrière-plan (verrouillage + appel entrant) -> updateMain rafraîchit
    $guiManager.lockNavigation("test");
    $subComManager.pushCall({ actorId: 3, startTimestamp: 100000 });
    $subComManager.update(100000);
    consoleSub.update();
    assert.strictEqual(consoleSub._consoleWindow._list.find(c => c.symbol === "navigation").enabled, false);

    // Ouverture enfant SubScene_Subcom -> Console cachée & désactivée, SubCom HUD activé
    consoleSub.onSubcom();
    const subcomSub = mapScene.currentSubScene();
    assert.ok(subcomSub instanceof SubScene_Subcom);
    assert.strictEqual(consoleSub._consoleWindow.visible, false);
    assert.strictEqual(consoleSub._shipInfoWindow.visible, false);
    assert.strictEqual($guiManager.isSubComActive, true);

    // Fermeture de SubScene_Subcom -> Console réaffichée, _shipInfoWindow reste deactivated
    subcomSub.onQuit();
    assert.strictEqual(mapScene.currentSubScene(), consoleSub);
    assert.strictEqual($guiManager.isSubComActive, false);
    assert.strictEqual(consoleSub._consoleWindow.visible, true);
    assert.strictEqual(consoleSub._consoleWindow.active, true);
    assert.strictEqual(consoleSub._shipInfoWindow.visible, true);
    assert.strictEqual(consoleSub._shipInfoWindow.active, false);
});

// ============================================================================
// SUITE 7 : INTERFACE SUBCOM COMPLÈTE (HUD + MISSED + CONTACTS + COMMANDS)
// ============================================================================
console.log("\n--- Suite 7: SubScene_Subcom, Sprite_SubcomHUD, MissedList, Contacts Sticky Scroll & Commands ---");

test("Sprite_SubcomHUD piloté par $guiManager.isSubComActive, alignement 900x420 et cycle Answer / Reject / Call / Quit", () => {
    const mapScene = new MockPlayableSceneMap();
    SceneManager._scene = mapScene;
    assert.ok(mapScene._subcomHud instanceof Sprite_SubcomHUD, "Scene_Map instancie Sprite_SubcomHUD");

    // Préparer un contact joignable (3) et 1 appel entrant de (4)
    $gameParty.leader().subCom.addContact(3);
    $subComManager.pushCall({ actorId: 4, startTimestamp: 100000, masked: true, revealOnAnswer: false });
    $subComManager.update(100000);

    mapScene._subcomHud.update();
    assert.strictEqual(mapScene._subcomHud.visible, false, "Sprite_SubcomHUD masqué hors SubScene_Subcom");

    const subcom = mapScene.openSubScene(SubScene_Subcom, 1, 12);
    mapScene._subcomHud.update();
    assert.strictEqual($guiManager.isSubComActive, true);
    assert.strictEqual(mapScene._subcomHud.visible, true, "Sprite_SubcomHUD visible quand isSubComActive=true");

    // Alignement géométrique
    assert.strictEqual(mapScene._subcomHud.hudRect.width, 420);
    assert.strictEqual(mapScene._subcomHud.hudRect.height, 210);
    assert.strictEqual(mapScene._subcomHud._bgSprite.bitmap.width, 420);
    assert.strictEqual(mapScene._subcomHud._contentsLayer.bitmap.width, 420);
    assert.strictEqual(subcom._missedListWindow.width, 404);
    assert.strictEqual(subcom._missedListWindow.x, mapScene._subcomHud.x + 8);
    assert.strictEqual(subcom._missedListWindow.y, mapScene._subcomHud.y + 86);
    assert.strictEqual(subcom._missedListWindow.active, false, "Window_SubcomMissedList reste purement passive (non interactive)");
    assert.strictEqual(subcom._missedListWindow.hitTest(50, 20), -1, "Window_SubcomMissedList ignore le hitTest/clic");
    assert.strictEqual(subcom._missedListWindow.isCursorVisible(), false, "Window_SubcomMissedList masque le curseur");
    assert.strictEqual(subcom._contactWindow.width, 420);
    assert.strictEqual(subcom._commandWindow.width, 460);
    assert.strictEqual(subcom._commandWindow.x, subcom._contactWindow.x + 420 + 20);

    // Appel actif présent -> answer/reject actifs, call inactif
    const findCmd = (sym) => subcom._commandWindow._list.find(c => c.symbol === sym);
    assert.strictEqual(findCmd("answer").enabled, true);
    assert.strictEqual(findCmd("reject").enabled, true);
    assert.strictEqual(findCmd("call").enabled, false);

    // Rejeter l'appel -> passe en appel manqué, "call" redevient actif !
    subcom.onReject();
    assert.strictEqual($subComManager.activeCall, null);
    assert.strictEqual($subComManager.getUnseenMissedCount(), 1);
    assert.strictEqual(findCmd("answer").enabled, false);
    assert.strictEqual(findCmd("call").enabled, true);
    assert.strictEqual(subcom._missedListWindow._items.length, 1);

    // Lancer "Appeler" -> désactive commandWindow et active contactWindow
    subcom.onCall();
    assert.strictEqual(subcom._commandWindow.active, false);
    assert.strictEqual(subcom._contactWindow.active, true);

    // Sélectionner le contact 3 -> ouvre SubScene_SubcomDialog
    subcom.onContactOk();
    const dlg = mapScene.currentSubScene();
    assert.ok(dlg instanceof SubScene_SubcomDialog);
    assert.strictEqual(dlg.targetActorId, 3);
    assert.strictEqual($guiManager.isSubComActive, false, "SubCom HUD caché durant l'échange dialogue");

    // Raccrocher -> revient sur SubScene_Subcom et réaffiche HUD SubCom
    dlg.onCommandCancel();
    assert.strictEqual(mapScene.currentSubScene(), subcom);
    assert.strictEqual($guiManager.isSubComActive, true);
    assert.strictEqual($subComManager.currentDialogCall, null);

    // Quitter -> marque les appels manqués comme vus et masque HUD
    subcom.onQuit();
    assert.strictEqual($guiManager.isSubComActive, false);
    assert.strictEqual($subComManager.getUnseenMissedCount(), 0);
});

test("Window_SubcomContactCommand gère le défilement avec en-tête fixe et bloque hitTest sur l'en-tête", () => {
    // Ajouter 6 acteurs dans $dataActors pour tester >= 5 contacts
    for (let id = 10; id <= 15; id++) {
        $dataActors[id] = { id, name: `Contact${id}`, note: "" };
        $gameParty.leader().subCom.addContact(id);
    }
    const win = new Window_SubcomContactCommand(new Rectangle(0, 0, 420, 202));
    assert.strictEqual(win.maxItems(), 6);
    assert.strictEqual(win.hitTest(50, 20), -1, "Clic dans le header (<40+padding) ignoré");

    win.select(5);
    win.ensureCursorVisible(false);
    assert.ok(win.scrollY() > 0, "scrollY s'ajuste pour le contact 5 sous le header sticky");
    win.paint();
    assert.ok(
        win.contents._recordedTexts.some(t => t.txt.includes("CONTACTS")),
        "paint() redessine le titre sticky après scroll"
    );
});

// ============================================================================
// SUITE 8 : SUBSCENE_SUBCOMDIALOG, RELATIONMANAGER & INTERLOCUTORHUD MASQUÉ
// ============================================================================
console.log("\n--- Suite 8: SubScene_SubcomDialog, RelationManager.isActiveDialog() & InterlocutorHUD Masqué ---");

test("RelationManager.isActiveDialog() reconnait SubScene_SubcomDialog et InterlocutorHUD masque/révèle l'identité en direct", () => {
    const mapScene = new MockPlayableSceneMap();
    SceneManager._scene = mapScene;
    const iHud = mapScene._interlocutorHud;
    assert.ok(iHud instanceof Sprite_InterlocutorHUD);

    // Démarrer un appel entrant masqué de Iban (id=3)
    $subComManager.pushCall({
        actorId: 3,
        startTimestamp: 100000,
        masked: true,
        maskedLabel: "Signal Masqué",
        revealOnAnswer: false
    });
    $subComManager.update(100000);

    const subcom = mapScene.openSubScene(SubScene_Subcom, 1, 9);
    subcom.onAnswer();

    const dlg = mapScene.currentSubScene();
    assert.ok(dlg instanceof SubScene_SubcomDialog);
    assert.ok(dlg instanceof SubScene_RelationDialog);
    assert.strictEqual($relationManager.isActiveDialog(), true, "isActiveDialog() doit reconnaître SubScene_SubcomDialog");
    assert.strictEqual($relationManager.isInterlocutorMasked(), true);
    assert.strictEqual($guiManager.bubbleMode, 1, "Mode SubCom forcé à 1");

    // Commande Raccrocher dans le Ring Command
    const hangupCmd = dlg._commandWindow._list.find(c => c.symbol === "cancel");
    assert.strictEqual(hangupCmd.name, "\\L[subcom.cmd_hangup]");
    assert.deepStrictEqual(dlg.resumeArgs(), [3, 9, dlg.callData, dlg._options]);

    // Vérifier InterlocutorHUD en état masqué
    iHud.update();
    assert.strictEqual(iHud.visible, true);
    assert.strictEqual(iHud._faceSprite.visible, false, "Portrait caché tant que l'appelant est masqué");
    const maskedTexts = iHud._contentsLayer.bitmap._recordedTexts.map(t => t.txt);
    assert.ok(maskedTexts.some(t => t.includes("SIGNAL MASQUÉ")));
    assert.ok(maskedTexts.some(t => t.includes("FRÉQUENCE CRYPTÉE")));
    assert.ok(maskedTexts.some(t => t.includes("IDENTITÉ INCONNUE")));

    // Révélation en cours de conversation -> HUD se met à jour dès le update() suivant
    $subComManager.revealCaller();
    assert.strictEqual($relationManager.isInterlocutorMasked(), false);
    iHud.update();
    assert.strictEqual(iHud._faceSprite.visible, true, "Portrait visible après révélation");
    assert.ok(
        Array.isArray(iHud._faceSprite.filters) && iHud._faceSprite.filters[0] instanceof SubComHologramFilter,
        "Filtre hologramme vert appliqué au portrait révélé"
    );
    const revealedTexts = iHud._contentsLayer.bitmap._recordedTexts.map(t => t.txt);
    assert.ok(revealedTexts.some(t => t.includes("GOUVERNEUR IBAN")));
    assert.strictEqual($gameParty.leader().subCom.hasContact(3), true);

    // Raccrocher ferme SubScene_SubcomDialog sans casser la pile SubScene_Subcom
    dlg.onCommandCancel();
    assert.strictEqual(mapScene.currentSubScene(), subcom);
    assert.strictEqual($guiManager.bubbleMode, 0, "BubbleMode restauré après raccrochage");
    subcom.onQuit();
    assert.strictEqual(mapScene.currentSubScene(), null);
});

test("Scene_Map.prototype.update pilote bien $subComManager.update(time)", () => {
    const mapScene = new MockPlayableSceneMap();
    SceneManager._scene = mapScene;
    $subComManager.pushCall({ actorId: 3, startTimestamp: $gameDate.timestamp });
    assert.strictEqual($subComManager.activeCall, null);

    mapScene.update();
    assert.ok($subComManager.activeCall && $subComManager.activeCall.actorId === 3, "Scene_Map.update promeut les appels via $subComManager.update(time)");
});

test("Scene_Map.update ne double-update pas les SubScenes (pas de saut 2 par 2 ni d'omission de Quitter)", () => {
    const mapScene = new MockPlayableSceneMap();
    SceneManager._scene = mapScene;

    const attachCursorMoveMock = (win) => {
        let updatesPerFrame = 0;
        const origUpdate = win.update.bind(win);
        win.update = function () {
            updatesPerFrame++;
            origUpdate();
            if (this._active && this.visible) {
                const max = this.maxItems();
                if (Input.isRepeated("down") && max > 0) {
                    const wrap = Input.isTriggered("down");
                    if (this._index < max - 1 || wrap) {
                        this.select((this._index + 1) % max);
                    }
                }
                if (Input.isRepeated("up") && max > 0) {
                    const wrap = Input.isTriggered("up");
                    if (this._index >= 1 || wrap) {
                        this.select((this._index - 1 + max) % max);
                    }
                }
            }
        };
        return {
            getCount: () => updatesPerFrame,
            resetCount: () => { updatesPerFrame = 0; }
        };
    };

    const origIsRepeated = Input.isRepeated;
    const origIsTriggered = Input.isTriggered;
    let fakeDir = null;
    Input.isRepeated = (k) => (k === fakeDir);
    Input.isTriggered = (k) => (k === fakeDir);

    try {
        // 1. Window_BridgeConsole (6 commandes : 0..5, dernier = quit)
        const consoleSub = mapScene.openSubScene(SubScene_Console, 1, 9);
        const consoleWin = consoleSub._consoleWindow;
        const cProbe = attachCursorMoveMock(consoleWin);

        assert.strictEqual(consoleWin.index(), 0);
        const visitedDown = [consoleWin.index()];
        for (let step = 0; step < 6; step++) {
            cProbe.resetCount();
            fakeDir = "down";
            mapScene.update();
            fakeDir = null;
            assert.strictEqual(cProbe.getCount(), 1, "Window_BridgeConsole ne doit être updatée qu'UNE fois par frame");
            visitedDown.push(consoleWin.index());
        }
        assert.deepStrictEqual(visitedDown, [0, 1, 2, 3, 4, 5, 0], "Chaque flèche Bas avance exactement de 1 et passe bien par Quitter (index 5)");
        assert.strictEqual(consoleWin._list[5].symbol, "quit");

        // Flèche Haut depuis 0 doit revenir directement sur Quitter (index 5) sans le sauter
        cProbe.resetCount();
        fakeDir = "up";
        mapScene.update();
        fakeDir = null;
        assert.strictEqual(consoleWin.index(), 5, "Flèche Haut depuis 0 doit sélectionner Quitter (index 5)");

        // 2. Window_SubcomCommand (4 commandes : 0..3, dernier = quit)
        consoleSub.onSubcom();
        const subcom = mapScene.currentSubScene();
        assert.ok(subcom instanceof SubScene_Subcom);
        const subCmdWin = subcom._commandWindow;
        const sProbe = attachCursorMoveMock(subCmdWin);

        const subVisitedDown = [subCmdWin.index()];
        for (let step = 0; step < 4; step++) {
            sProbe.resetCount();
            fakeDir = "down";
            mapScene.update();
            fakeDir = null;
            assert.strictEqual(sProbe.getCount(), 1, "Window_SubcomCommand ne doit être updatée qu'UNE fois par frame");
            subVisitedDown.push(subCmdWin.index());
        }
        assert.deepStrictEqual(subVisitedDown, [0, 1, 2, 3, 0], "Chaque flèche Bas dans SubCom avance de 1 et passe par Quitter (index 3)");
        assert.strictEqual(subCmdWin._list[3].symbol, "quit");

        // Flèche Haut depuis 0 doit atteindre Quitter (index 3)
        fakeDir = "up";
        mapScene.update();
        fakeDir = null;
        assert.strictEqual(subCmdWin.index(), 3, "Flèche Haut depuis 0 dans SubCom doit sélectionner Quitter (index 3)");

        // Garde tutoriel : si $tutoManager.isBusy(), SubScene_Base reste gelée en arrière-plan
        const savedTuto = global.$tutoManager;
        global.$tutoManager = { isBusy: () => true, update: () => {} };
        sProbe.resetCount();
        fakeDir = "up";
        mapScene.update();
        fakeDir = null;
        assert.strictEqual(sProbe.getCount(), 0, "SubScene figée tant que $tutoManager.isBusy()");
        assert.strictEqual(subCmdWin.index(), 3);
        global.$tutoManager = savedTuto;
    } finally {
        Input.isRepeated = origIsRepeated;
        Input.isTriggered = origIsTriggered;
    }
});

test("Propagation targetEventId : openBridgeConsole -> SubScene_Console -> SubScene_Subcom -> SubScene_SubcomDialog", () => {
    const mapScene = new MockPlayableSceneMap();
    SceneManager._scene = mapScene;

    $subComManager.pushCall({ actorId: 3, startTimestamp: $gameDate.timestamp });
    $subComManager.update($gameDate.timestamp);

    const cmd = PluginManager._commands["SC4_Interface:openBridgeConsole"];
    assert.strictEqual(typeof cmd, "function");
    cmd.call({ eventId: () => 14 }, { shipId: "1" });

    const consoleSub = mapScene.currentSubScene();
    assert.ok(consoleSub instanceof SubScene_Console);
    assert.strictEqual(consoleSub._targetEventId, 14, "SubScene_Console récupère l'eventId de l'appelant");

    consoleSub.onSubcom();
    const subcom = mapScene.currentSubScene();
    assert.ok(subcom instanceof SubScene_Subcom);
    assert.strictEqual(subcom._targetEventId, 14, "SubScene_Subcom reçoit l'eventId depuis Console");

    subcom.onAnswer();
    const dlg = mapScene.currentSubScene();
    assert.ok(dlg instanceof SubScene_SubcomDialog);
    assert.strictEqual(dlg.targetEventId, 14, "SubScene_SubcomDialog hérite de l'eventId de Console -> Subcom");

    dlg.onCommandCancel();
    subcom.onQuit();
    consoleSub.onQuit();
});

console.log(`\n=======================================================================`);
console.log(`🎉 ÉTAPE 4 & FIX ORBITE VALIDÉS : ${passed}/${passed} TESTS RÉUSSIS !`);
console.log(`=======================================================================\n`);
