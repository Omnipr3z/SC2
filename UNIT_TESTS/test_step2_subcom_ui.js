//=============================================================================
// test_step2_subcom_ui.js
// Tests unitaires complets pour l'Étape 2 :
// - Architecture HUD (HudBase cache individualisé, zéro bitmap racine)
// - Sprite_PlayerHUD, Sprite_PlayerRelationHud, Sprite_InterlocutorHUD, Sprite_WeaponHUD
// - Z-order addHudChild() avant _windowLayer
// - Suppression globale du dimmer SubScene_Base
// - SubScene_RelationDialog + Window_RingCommand arc opposé 8 directions & canCancel
// - Window_BubbleMsg queue BD dynamique (WindowArrow.png)
// - Localisation FR / EN complète (UI_FR.json / UI_EN.json)
//=============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("==============================================================");
console.log("   TEST ÉTAPE 2 : ARCHITECTURE HUD, RING ARC, BULLE BD & LOC  ");
console.log("==============================================================\n");

// 1. Mocks RMMZ complets
global.window = global;
global.Graphics = { width: 1280, height: 720, boxWidth: 1280, boxHeight: 720 };
global.ColorManager = { outlineColor: () => "rgba(0, 0, 0, 0.6)", normalColor: () => "#ffffff" };
global.SoundManager = { playOk: () => {}, playCancel: () => {}, playBuzzer: () => {}, playCursor: () => {} };
global.Input = { isTriggered: () => false };
global.TouchInput = { x: 0, y: 0, isTriggered: () => false, clear: () => {} };
global.FontManager = { load: () => {} };

const warnedMessages = [];
global.DEBUGTOOL = {
    log: () => {},
    warn: (tag, msg) => warnedMessages.push({ tag, msg }),
    error: () => {}
};

global.Rectangle = class Rectangle {
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
};

function createMockContext(recordedTexts = []) {
    return {
        font: "",
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        textAlign: "",
        shadowColor: "",
        shadowBlur: 0,
        _recordedTexts: recordedTexts,
        save() {},
        restore() {},
        beginPath() {},
        closePath() {},
        moveTo() {},
        lineTo() {},
        arcTo() {},
        rect() {},
        roundRect() {},
        fill() {},
        stroke() {},
        fillRect() {},
        strokeRect() {},
        drawImage() {},
        fillText(txt, x, y) {
            recordedTexts.push({ txt: String(txt), x, y, fillStyle: this.fillStyle });
        },
        measureText(txt) {
            return { width: String(txt || "").length * 7 };
        },
        createLinearGradient() {
            return { addColorStop: () => {} };
        }
    };
}

global.Bitmap = class Bitmap {
    constructor(w = 100, h = 100) {
        this.width = w;
        this.height = h;
        this._recordedTexts = [];
        this.context = createMockContext(this._recordedTexts);
        this._loadingState = "loaded";
        this._listeners = [];
        this._canvas = { width: w, height: h };
        this.canvas = this._canvas;
    }
    clear() {
        this._recordedTexts.length = 0;
    }
    fillAll() {}
    blt() {}
    isReady() { return this._loadingState === "loaded"; }
    isError() { return this._loadingState === "error"; }
    addLoadListener(fn) {
        if (this.isReady()) {
            fn(this);
        } else {
            this._listeners.push(fn);
        }
    }
    triggerLoad() {
        this._loadingState = "loaded";
        const list = this._listeners.slice();
        this._listeners.length = 0;
        for (const fn of list) fn(this);
    }
};

global.Sprite = class Sprite {
    constructor(bitmap = null) {
        this.bitmap = bitmap;
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.visible = true;
        this.children = [];
        this._frame = { x: 0, y: 0, width: 0, height: 0 };
        this.anchor = { x: 0, y: 0, set(ax, ay) { this.x = ax; this.y = ay; } };
        this.scale = { x: 1, y: 1, set(sx, sy) { this.x = sx; this.y = sy; } };
    }
    addChild(c) { this.children.push(c); return c; }
    removeChild(c) {
        const idx = this.children.indexOf(c);
        if (idx >= 0) this.children.splice(idx, 1);
    }
    setFrame(x, y, w, h) { this._frame = { x, y, width: w, height: h }; }
    update() {
        for (const c of this.children) {
            if (c && typeof c.update === "function") c.update();
        }
    }
};

const asyncBitmaps = new Map();
global.ImageManager = {
    faceWidth: 144,
    faceHeight: 144,
    iconWidth: 32,
    iconHeight: 32,
    loadSystem(name) {
        const b = new global.Bitmap(64, 64);
        b.name = name;
        return b;
    },
    loadFace(name) {
        const b = new global.Bitmap(576, 288);
        b.name = name;
        return b;
    },
    loadBitmap(folder, filename) {
        const key = folder + filename;
        if (asyncBitmaps.has(key)) {
            return asyncBitmaps.get(key);
        }
        const b = new global.Bitmap(128, 128);
        b.name = filename;
        return b;
    }
};

global.PluginManager = {
    parameters: () => ({}),
    registerCommand: () => {}
};

global.Window = class Window {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.padding = 12;
        this.opacity = 255;
        this.backOpacity = 192;
        this.openness = 255;
        this._opening = false;
        this._closing = false;
        this.visible = true;
        this.active = true;
        this.children = [];
    }
    addChild(c) { this.children.push(c); return c; }
    move(x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h; }
    isOpen() { return this.openness >= 255; }
    isClosed() { return this.openness === 0; }
    isOpening() { return Boolean(this._opening); }
    isClosing() { return Boolean(this._closing); }
    open() { this._opening = true; this._closing = false; this.visible = true; }
    close() { this._closing = true; this._opening = false; }
    show() { this.visible = true; }
    hide() { this.visible = false; }
    activate() { this.active = true; }
    deactivate() { this.active = false; }
    update() {
        if (this._opening) {
            this.openness = Math.min(255, this.openness + 64);
            if (this.openness === 255) this._opening = false;
        }
        if (this._closing) {
            this.openness = Math.max(0, this.openness - 64);
            if (this.openness === 0) this._closing = false;
        }
    }
    updateClose() {
        if (this._closing) {
            this.openness = Math.max(0, this.openness - 64);
            if (this.openness === 0) this._closing = false;
        }
    }
};

global.Window_Base = class Window_Base extends global.Window {
    constructor(rect) {
        super();
        this.initialize(rect);
    }
    initialize(rect) {
        if (rect) this.move(rect.x, rect.y, rect.width, rect.height);
        this.createContents();
    }
    createContents() {
        this.contents = new global.Bitmap(this.width || 100, this.height || 100);
        this.contents.fontFace = "GameFont";
        this.contents.fontSize = 24;
    }
    standardFontFace() { return "GameFont"; }
    standardFontSize() { return 24; }
    loadWindowskin() { this.windowskin = ImageManager.loadSystem("Window"); }
    updateBackOpacity() { this.backOpacity = 192; }
    resetFontSettings() { this.contents = this.contents || new global.Bitmap(100, 100); }
    resetTextColor() {}
    drawText() {}
    drawIcon() {}
    changePaintOpacity() {}
    createTextState(text, x, y, w) { return { text, x: x || 0, y: y || 0, startX: x || 0, width: w || 0 }; }
    textSizeEx(text) {
        const lines = String(text || "").split("\n");
        const maxLen = Math.max(...lines.map(l => l.length), 1);
        return { width: maxLen * 12, height: lines.length * 32 };
    }
};

global.Window_Selectable = class Window_Selectable extends global.Window_Base {
    initialize(rect) {
        super.initialize(rect);
        this._index = 0;
        this._handlers = {};
        this._cursorRect = new global.Rectangle();
    }
    index() { return this._index; }
    select(i) { this._index = i; }
    maxItems() { return this._list ? this._list.length : 0; }
    setCursorRect(x, y, w, h) { this._cursorRect = new global.Rectangle(x, y, w, h); }
    updateCursor() {}
    isCancelEnabled() { return true; }
    setHandler(sym, fn) { this._handlers[sym] = fn; }
    isHandled(sym) { return Boolean(this._handlers[sym]); }
    callHandler(sym) { if (this._handlers[sym]) this._handlers[sym](); }
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
    refresh() {
        this.clearCommandList();
        this.makeCommandList();
    }
};

global.Window_Message = class Window_Message extends global.Window_Base {
    initialize(rect) {
        super.initialize(rect);
        this._textState = null;
        this._nameBoxWindow = null;
        this._goldWindow = null;
    }
    newLineX() { return 4; }
    newPage() {}
    updatePlacement() { this.x = 0; this.y = 480; }
    updateBackground() {}
    terminateMessage() { this.close(); }
};

global.Window_ChoiceList = class Window_ChoiceList extends global.Window_Command {
    updatePlacement() {}
};

global.Scene_Base = class Scene_Base {
    constructor() {
        this.children = [];
        this._windows = [];
        this._windowLayer = null;
    }
    initialize() {}
    addChild(c) { this.children.push(c); return c; }
    addChildAt(c, idx) { this.children.splice(idx, 0, c); return c; }
    removeChild(c) {
        const i = this.children.indexOf(c);
        if (i >= 0) this.children.splice(i, 1);
    }
    createWindowLayer() {
        if (!this._windowLayer) {
            this._windowLayer = { isWindowLayer: true };
            this.addChild(this._windowLayer);
        }
    }
    addWindow(w) { this._windows.push(w); }
    create() {}
    start() {}
    update() {}
    stop() {}
    terminate() {}
};

global.Scene_Boot = class Scene_Boot extends global.Scene_Base { loadCustomFonts() {} start() {} };
global.Scene_Title = class Scene_Title extends global.Scene_Base { createCommandWindow() {} };
global.Scene_Menu = class Scene_Menu extends global.Scene_Base { createCommandWindow() {} };
global.Scene_Item = class Scene_Item extends global.Scene_Base { create() {} useItem() {} };
global.Scene_Options = class Scene_Options extends global.Scene_Base { createOptionsWindow() {} };
global.Scene_Message = class Scene_Message extends global.Scene_Base {
    createMessageWindow() {
        this._messageWindow = new Window_Message(this.messageWindowRect());
        this.addWindow(this._messageWindow);
    }
    messageWindowRect() { return new Rectangle(0, 480, 1280, 240); }
};
global.Scene_Map = class Scene_Map extends global.Scene_Message {
    constructor() {
        super();
        this.initialize();
    }
    isPlayerActive() { return true; }
    isMapTouchOk() { return true; }
    createDisplayObjects() {
        this.createWindowLayer();
    }
    createAllWindows() {
        this.createMessageWindow();
    }
};

global.SceneManager = { _scene: null };
global.$gameDate = { timestamp: 100000 };
global.$gameSystem = {
    _locale: "FR",
    _bubbleMessageMode: false,
    _bubbleConfig: {},
    windowPadding: () => 12,
    mainFontFace: () => "GameFont",
    mainFontSize: () => 24,
    isBubbleMessageMode() { return Boolean(this._bubbleMessageMode); },
    setBubbleMessageMode(v) { this._bubbleMessageMode = Boolean(v); },
    getBubbleConfig() { return this._bubbleConfig || {}; }
};

global.$gameMessage = {
    _texts: [],
    _positionType: 0,
    allText() { return this._texts.join("\n"); },
    add(t) { this._texts.push(t); },
    clear() { this._texts = []; },
    positionType() { return this._positionType; },
    setPositionType(p) { this._positionType = p; },
    isBusy() { return false; }
};

global.$gamePlayer = {
    _x: 640,
    _y: 400,
    _direction: 2,
    screenX() { return this._x; },
    screenY() { return this._y; },
    direction() { return this._direction; }
};

global.$gameMap = {
    _interpreter: { eventId: () => 0 },
    event: (id) => ({ id, screenX: () => 400, screenY: () => 300 })
};

global.$dataFactions = [
    null,
    { id: 1, name: "Fédération Stellaire", banner: "fed" },
    { id: 2, name: "Guilde Disparue", banner: "missing_asset" }
];

// Chargement des plugins nécessaires
const pluginsDir = path.resolve(__dirname, "../js/plugins");
require(path.join(pluginsDir, "SC4_core.js"));
require(path.join(pluginsDir, "SC4_Localization.js"));
require(path.join(pluginsDir, "SC4_GuiManager.js"));
require(path.join(pluginsDir, "SC4_Game_Relation.js"));
require(path.join(pluginsDir, "SC4_Game_ScActorSocial.js"));
require(path.join(pluginsDir, "SC4_Game_Faction.js"));
require(path.join(pluginsDir, "SC4_RelationManager.js"));
require(path.join(pluginsDir, "SC4_RelationDialogManager.js"));
require(path.join(pluginsDir, "SC4_Sprite_PaperdollFace.js"));
require(path.join(pluginsDir, "SC4_Sprite_HudBase.js"));
require(path.join(pluginsDir, "SC4_Sprite_ActorHUD.js"));
require(path.join(pluginsDir, "SC4_Sprite_PlayerHUD.js"));
require(path.join(pluginsDir, "SC4_Sprite_PlayerRelationHud.js"));
require(path.join(pluginsDir, "SC4_Sprite_InterlocutorHUD.js"));
require(path.join(pluginsDir, "SC4_Sprite_WeaponHUD.js"));
require(path.join(pluginsDir, "SC4_Window_InteractionCommand.js"));
require(path.join(pluginsDir, "SC4_Window_RingCommand.js"));
require(path.join(pluginsDir, "SC4_SubScene_Base.js"));
require(path.join(pluginsDir, "SC4_SubScene_RelationDialog.js"));
require(path.join(pluginsDir, "SC4_BubbleMessage.js"));
require(path.join(pluginsDir, "SC4_rmmz_scenes_Patches.js"));

SC4_Localization.loadAll();
SC4_Localization.setLocale("FR");

function makeMockActor(id, name, hp, mhp, factionId = 0) {
    const actor = {
        _actorId: id,
        _name: name,
        hp,
        mhp,
        mp: 40,
        mmp: 100,
        tp: 25,
        level: 3,
        _social: null,
        actorId: () => id,
        name: () => actor._name,
        isHero: () => false,
        faceName: () => "Actor1",
        faceIndex: () => 0,
        equips: () => [],
        currentExp: () => 120,
        nextRequiredExp: () => 300,
        meta: (k) => (k === "factionid" && factionId > 0 ? factionId : null),
        hasSocial: function () { return Boolean(this._social); },
        combat: {
            gunfightWeapon: () => ({ id: 1, name: "Blaster" }),
            gunfightStats: () => ({ name: "Blaster", reload: false, ammoCap: 10, iconIndex: 5 }),
            getLoadedAmmo: () => 8,
            getReserveAmmo: () => 30
        }
    };
    Object.defineProperty(actor, "social", {
        get() {
            if (!this._social) this._social = new Game_ScActorSocial(this);
            return this._social;
        }
    });
    return actor;
}

const actorsMap = {
    1: makeMockActor(1, "Wesword", 100, 100, 1),
    2: makeMockActor(2, "Héros B", 75, 120, 0),
    51: makeMockActor(51, "Gouverneur Iban", 100, 100, 1)
};
global.$gameActors = { actor: (id) => actorsMap[id] || null };
let activeLeader = actorsMap[1];
global.$gameParty = { leader: () => activeLeader };
global.$gameFactions = {
    affinity: (id) => (id === 1 ? 30 : 0),
    faction: (id) => {
        const raw = global.$dataFactions.find(f => f && f.id === id);
        return raw ? new Game_Faction(raw) : null;
    }
};
global.$relationManager = new RelationManager();
global.$relationDialogManager = new RelationDialogManager();

let pass = 0;
function test(label, fn) {
    fn();
    console.log(`  ✅ ${label}`);
    pass++;
}

// ============================================================================
// 1. HÉRITAGE HUD BASE, ZERO ROOT BITMAP, CACHE INDIVIDUALISÉ & LISSAGE
// ============================================================================
console.log("--- 1. Sprite_HudBase, Cache Individualisé & Lissage ---");

test("Aucun HUD n'alloue de bitmap racine superflu", () => {
    const pHud = new Sprite_PlayerHUD();
    const prHud = new Sprite_PlayerRelationHud();
    const iHud = new Sprite_InterlocutorHUD();
    const wHud = new Sprite_WeaponHUD();

    assert.strictEqual(pHud.bitmap, null);
    assert.strictEqual(prHud.bitmap, null);
    assert.strictEqual(iHud.bitmap, null);
    assert.strictEqual(wHud.bitmap, null);
    assert.strictEqual(pHud._faceSprite.x, 8);
    assert.strictEqual(pHud._faceSprite.y, 16);
});

test("approach() et gaugeRefreshStep('exp') gèrent les bornes sans NaN", () => {
    const base = new Sprite_HudBase();
    assert.strictEqual(base.approach(undefined, 100, 5), 100);
    assert.strictEqual(base.approach(NaN, 42, 5), 42);
    assert.strictEqual(base.approach(10, 50, 0), 11);

    const pHud = new Sprite_PlayerHUD();
    assert.ok(pHud.gaugeRefreshStep("exp") >= 1);
});

test("PlayerHUD ne fige pas au changement d'acteur et évite les redraws inutiles", () => {
    $guiManager.showPlayerHud();
    const pHud = new Sprite_PlayerHUD();
    pHud.update();
    assert.strictEqual(pHud._hasDrawn, true);
    assert.strictEqual(pHud._cache.actorId, 1);
    assert.strictEqual(pHud._cache.hp, 100);
    assert.strictEqual(pHud.needRedraw(), false, "Aucun redraw si données stables");

    // Changement d'acteur vers actor 2 (hp 75) -> snap immédiat sans lissage depuis 100
    activeLeader = actorsMap[2];
    assert.strictEqual(pHud.needRedraw(), true);
    assert.strictEqual(pHud.shouldThrottleRedraw(), false, "Changement d'acteur non throttlé");
    pHud.update();
    assert.strictEqual(pHud._cache.actorId, 2);
    assert.strictEqual(pHud._cache.hp, 75);

    activeLeader = actorsMap[1];
});

test("watchBitmapReady() déclenche forceDirty() dès que le bitmap asynchrone termine son chargement", () => {
    const loadingBitmap = new global.Bitmap(64, 64);
    loadingBitmap._loadingState = "loading";
    asyncBitmaps.set("img/GUI/factions/banner_fed", loadingBitmap);

    $guiManager.showPlayerRelationHud();
    const prHud = new Sprite_PlayerRelationHud();
    prHud.update();
    assert.strictEqual(prHud._cache.bannerReady, false);

    loadingBitmap.triggerLoad();
    assert.strictEqual(prHud._dirty, true, "forceDirty doit être appelé au load listener");
    assert.strictEqual(prHud.needRedraw(), true);

    prHud.update();
    assert.strictEqual(prHud._cache.bannerReady, true);
    asyncBitmaps.delete("img/GUI/factions/banner_fed");
});

// ============================================================================
// 2. SPRITE_PLAYERRELATIONHUD & SPRITE_INTERLOCUTORHUD
// ============================================================================
console.log("\n--- 2. PlayerRelationHud (Position/Marge) & InterlocutorHUD (Agacement/Obéissance) ---");

test("PlayerRelationHud se positionne à 16px à droite de PlayerHUD (258, 20)", () => {
    const prHud = new Sprite_PlayerRelationHud();
    assert.strictEqual(prHud.x, 20 + 222 + 16); // 258
    assert.strictEqual(prHud.y, 20);
    assert.strictEqual(prHud.hudRect.width, 216);
    assert.strictEqual(prHud.hudRect.height, 68);
});

test("PlayerRelationHud réagit à $guiManager et hideAllHuds()", () => {
    $guiManager.hideAllHuds();
    const prHud = new Sprite_PlayerRelationHud();
    prHud.update();
    assert.strictEqual(prHud.visible, false);

    $guiManager.showPlayerRelationHud();
    prHud.update();
    assert.strictEqual(prHud.visible, true);

    $guiManager.hideAllHuds();
    prHud.update();
    assert.strictEqual(prHud.visible, false);
});

test("Banner manquante journalise un DEBUGTOOL.warn et bascule sur banner_blank", () => {
    warnedMessages.length = 0;
    const errBitmap = new global.Bitmap(32, 32);
    errBitmap._loadingState = "error";
    asyncBitmaps.set("img/GUI/factions/banner_missing_asset", errBitmap);

    const prHud = new Sprite_PlayerRelationHud();
    const resolved = prHud.resolveFactionBannerBitmap(new Game_Faction({ id: 2 }));
    assert.strictEqual(resolved.name, "banner_blank");
    assert.ok(warnedMessages.some(w => w.tag === "Sprite_PlayerRelationHud"), "DEBUGTOOL.warn attendu sur bannière manquante");

    asyncBitmaps.delete("img/GUI/factions/banner_missing_asset");
});

test("InterlocutorHUD affiche Obéissance, Menace et barre graphique Agacement SANS chiffres d'agacement", () => {
    const mapScene = new Scene_Map();
    SceneManager._scene = mapScene;
    const rel = $relationManager.getRelationWithPlayer(51);
    rel.threat = 25;
    rel.agacement = 72;
    rel.lastAgacementTimestamp = $gameDate.timestamp;

    const sub = new SubScene_RelationDialog(mapScene, 51, 9);
    mapScene._currentSubScene = sub;

    const iHud = new Sprite_InterlocutorHUD();
    iHud.update();

    assert.strictEqual(iHud.visible, true);
    const texts = iHud._contentsLayer.bitmap._recordedTexts.map(t => t.txt);
    assert.ok(texts.some(t => t.includes("Obéissance")), "Obéissance doit être affichée");
    assert.ok(texts.some(t => t.includes("Menace")), "Menace doit être affichée");
    assert.ok(texts.includes("Agacement"), "Libellé Agacement doit être présent");
    assert.strictEqual(texts.some(t => t.includes("72")), false, "Aucun chiffre d'agacement ne doit être dessiné !");

    mapScene._currentSubScene = null;
});

// ============================================================================
// 3. Z-ORDER ADDHUDCHILD, SUPPRESSION DIMMER & RING COMMAND ARC OPPOSÉ
// ============================================================================
console.log("\n--- 3. Z-Order Scene_Map, Suppression Dimmer & Ring Command Arc Opposé ---");

test("Scene_Map.addHudChild() insère tous les HUDs strictement avant _windowLayer", () => {
    const scene = new Scene_Map();
    scene.createDisplayObjects();
    const winIdx = scene.children.indexOf(scene._windowLayer);
    assert.ok(winIdx > 0, "_windowLayer doit être au-dessus des HUDs dans scene.children");
    assert.ok(scene.children.indexOf(scene._playerHud) < winIdx);
    assert.ok(scene.children.indexOf(scene._playerRelationHud) < winIdx);
    assert.ok(scene.children.indexOf(scene._interlocutorHud) < winIdx);
    assert.ok(scene.children.indexOf(scene._weaponHud) < winIdx);
});

test("SubScene_Base.create() ne crée aucun dimmer", () => {
    const sub = new SubScene_Base(null);
    sub.create();
    assert.strictEqual(sub._dimmerSprite, undefined, "_dimmerSprite ne doit plus exister");
});

test("Window_RingCommand.setArcFromFacing(dir) place les items strictement à l'opposé du regard sur les 8 directions", () => {
    const dirVectors = {
        1: [-1, 1],
        2: [0, 1],
        3: [1, 1],
        4: [-1, 0],
        6: [1, 0],
        7: [-1, -1],
        8: [0, -1],
        9: [1, -1]
    };

    const ring = new Window_RingCommand(new Rectangle(0, 0, 400, 400));
    ring.setCommands([
        { name: "Cmd1", symbol: "c1", enabled: true },
        { name: "Cmd2", symbol: "c2", enabled: true },
        { name: "Cmd3", symbol: "c3", enabled: true }
    ]);
    ring._radius = 100;

    for (const [dirStr, [fx, fy]] of Object.entries(dirVectors)) {
        const dir = Number(dirStr);
        ring.setArcFromFacing(dir, Math.PI * 0.8);
        for (let i = 0; i < 3; i++) {
            const rect = ring.itemRect(i);
            const itemCenterX = rect.x + ring.itemWidth() / 2;
            const itemCenterY = rect.y + ring.itemHeight() / 2;
            const dx = itemCenterX - ring._center.x;
            const dy = itemCenterY - ring._center.y;
            const dot = dx * fx + dy * fy;
            assert.ok(dot <= 0.5, `Direction ${dir}, item ${i}: doit être dans l'hémisphère opposé (dot=${dot})`);
        }
    }
});

test("SubScene_RelationDialog avec { canCancel: false } désactive annulation et cache la roue pendant les bulles", () => {
    const sub = new SubScene_RelationDialog(null, 51, 9, { canCancel: false });
    sub.createDisplayObjects();
    assert.strictEqual(sub._commandWindow.isCancelEnabled(), false);
    assert.strictEqual(sub._commandWindow._list.some(c => c.symbol === "cancel"), false, "Bouton Quitter omis si canCancel=false");

    let sequenceDone = false;
    sub.playDialogueSequence([{ target: "npc", text: "Bonjour Commandant." }], () => {
        sequenceDone = true;
    });
    assert.strictEqual(sub._commandWindow.visible, false, "La roue doit être masquée pendant une bulle de dialogue");

    // Simuler la fin du message
    sub.updateMain();
    assert.strictEqual(sequenceDone, true);
});

// ============================================================================
// 4. QUEUE BD DYNAMIQUE WINDOW_BUBBLEMSG (WINDOWARROW.PNG)
// ============================================================================
console.log("\n--- 4. Queue BD Dynamique Window_BubbleMsg (WindowArrow) ---");

test("Window_BubbleMsg oriente et flip la queue BD selon la position relative à la cible", () => {
    const bubble = new Window_BubbleMsg(new Rectangle(0, 480, 1280, 240));
    assert.ok(bubble._bubbleArrowSprite, "_bubbleArrowSprite doit être instancié");
    assert.strictEqual(bubble._bubbleArrowSprite.visible, false, "Flèche cachée au départ");

    // 1. Bulle au-dessus du joueur ($gamePlayer en y=400, x=640)
    $gamePlayer._x = 640;
    $gamePlayer._y = 400;
    $gameMessage.clear();
    $gameMessage.setPositionType(0);
    $gameMessage.add("\\ABulle au dessus du joueur");
    bubble.startMessage();
    bubble.openness = 200;
    bubble.updateBubblePlacement();

    assert.strictEqual(bubble._bubbleArrowSprite.visible, true);
    assert.strictEqual(bubble._bubbleArrowSprite.scale.y, 1, "Queue pointe vers le bas (scale.y = 1)");
    assert.strictEqual(bubble._bubbleArrowSprite.y, bubble.height - 4);

    // 2. Bulle en-dessous du joueur ($gamePlayer en y=400, positionType = 2)
    $gameMessage.clear();
    $gameMessage.setPositionType(2);
    $gameMessage.add("\\ABulle en dessous du joueur");
    bubble.startMessage();
    bubble.openness = 220;
    bubble.updateBubblePlacement();

    assert.strictEqual(bubble._bubbleArrowSprite.visible, true);
    assert.strictEqual(bubble._bubbleArrowSprite.scale.y, -1, "Queue retournée vers le haut (scale.y = -1)");
    assert.strictEqual(bubble._bubbleArrowSprite.y, 4);

    // 3. Fermeture immédiate masque la flèche
    bubble.close();
    assert.strictEqual(bubble._bubbleArrowSprite.visible, false, "close() masque immédiatement la queue BD");
});

// ============================================================================
// 5. LOCALISATION COMPLÈTE FR / EN
// ============================================================================
console.log("\n--- 5. Couverture complète Localisation FR / EN ---");

test("Les dictionnaires UI_FR.json et UI_EN.json partagent toutes les clés hud.* et relation.*", () => {
    const uiFr = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../data/SC/loc/UI_FR.json"), "utf8"));
    const uiEn = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../data/SC/loc/UI_EN.json"), "utf8"));

    for (const section of ["hud", "relation"]) {
        const frKeys = Object.keys(uiFr[section] || {}).sort();
        const enKeys = Object.keys(uiEn[section] || {}).sort();
        assert.deepStrictEqual(frKeys, enKeys, `Clés divergentes entre FR et EN dans ui.${section}`);
        assert.ok(frKeys.length > 0, `Section ui.${section} ne doit pas être vide`);
    }

    SC4_Localization.setLocale("EN");
    const cmdEn = new Window_InteractionCommand(new Rectangle(0, 0, 200, 100));
    cmdEn.setAvailableInteractions(["chat_saturated"]);
    assert.ok(cmdEn._list[0].name.includes("Annoyed"), "Localisation EN active sur Window_InteractionCommand");
    SC4_Localization.setLocale("FR");
});

console.log(`\n==============================================================`);
console.log(`🎉 ÉTAPE 2 VALIDÉE : ${pass}/${pass} TESTS RÉUSSIS AVEC SUCCÈS !`);
console.log(`==============================================================\n`);
