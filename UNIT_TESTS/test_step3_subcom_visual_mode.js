/**
 * ============================================================================
 * TEST UNITAIRE ÉTAPE 3 + PRÉ-ÉTAPE :
 *  - Pré-étape : Orientation relative des bulles en dialogue & Window_InteractionRingCommand
 *  - Étape 3   : Mode Visuel SubCom ($guiManager, ColorManager stack, SubComHologramFilter)
 * ============================================================================
 */

global.window = global;
const assert = require("assert");
const path = require("path");

const pluginsDir = path.resolve(__dirname, "../js/plugins");

// ============================================================================
// MOCKS RMMZ & PIXI ENVIRONNEMENT HEADLESS
// ============================================================================

const warnedLogs = [];
const errorLogs = [];
global.DEBUGTOOL = {
    log: () => {},
    warn: (tag, msg, data) => warnedLogs.push({ tag, msg, data }),
    error: (tag, msg, data) => errorLogs.push({ tag, msg, data })
};

global.Graphics = {
    boxWidth: 1280,
    boxHeight: 720,
    width: 1280,
    height: 720,
    deltaTime: 1 / 60
};

global.Rectangle = class Rectangle {
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
};

class MockContext2D {
    constructor(bitmap) {
        this.bitmap = bitmap;
        this.font = "20px sans-serif";
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
    fillRect() {}
    strokeRect() {}
    clearRect() {}
    drawImage() {}
    fillText(txt, x, y) {
        this.bitmap._recordedTexts.push({ txt, x, y, fillStyle: this.fillStyle, font: this.font });
    }
    measureText(str) {
        const match = String(this.font || "").match(/(\d+(?:\.\d+)?)px/);
        const fontSize = match ? parseFloat(match[1]) : 20;
        return { width: String(str || "").length * (fontSize * 0.55) };
    }
}

class MockBitmap {
    constructor(w = 256, h = 256, name = "") {
        this.width = w;
        this.height = h;
        this.name = name;
        this._canvas = { width: w, height: h };
        this.context = new MockContext2D(this);
        this.fontFace = "rmmz-mainfont";
        this.fontSize = 26;
        this.textColor = "#ffffff";
        this.outlineColor = "rgba(0, 0, 0, 0.5)";
        this.outlineWidth = 3;
        this._baseTexture = { update: () => {} };
        this._loadingState = "loaded";
        this._loadListeners = [];
        this._recordedTexts = [];
        this._pixels = new Map();
    }
    isReady() { return this._loadingState === "loaded"; }
    isError() { return this._loadingState === "error"; }
    addLoadListener(cb) {
        if (this.isReady()) cb(this);
        else this._loadListeners.push(cb);
    }
    triggerLoad() {
        this._loadingState = "loaded";
        const cbs = this._loadListeners.splice(0);
        for (const cb of cbs) cb(this);
    }
    clear() { this._recordedTexts = []; }
    blt() {}
    setPixel(x, y, color) { this._pixels.set(`${x},${y}`, color); }
    getPixel(x, y) { return this._pixels.get(`${x},${y}`) || "#ffffff"; }
}
global.Bitmap = MockBitmap;

function makePaletteSkin(name, colorsByIndex = {}) {
    const bmp = new MockBitmap(192, 192, name);
    for (const [idxStr, hex] of Object.entries(colorsByIndex)) {
        const n = Number(idxStr);
        const px = 96 + (n % 8) * 12 + 6;
        const py = 144 + Math.floor(n / 8) * 12 + 6;
        bmp.setPixel(px, py, hex);
    }
    bmp.setPixel(120, 120, colorsByIndex.pending || "#999999");
    return bmp;
}

const skinWindow = makePaletteSkin("Window", { 0: "#ffffff", 1: "#20a0ff", 15: "#e0e0e0", pending: "#777777" });
const skinBubble = makePaletteSkin("Window_Bubble", { 0: "#111111", 1: "#2244aa", 15: "#333333", pending: "#444444" });
const skinSubCom = makePaletteSkin("WindowSubCom", { 0: "#39ff88", 1: "#99ffcc", 15: "#117744", pending: "#22aa66" });

const systemBitmaps = new Map([
    ["Window", skinWindow],
    ["Window_Bubble", skinBubble],
    ["WindowSubCom", skinSubCom],
    ["WindowArrow", new MockBitmap(32, 32, "WindowArrow")],
    ["WindowArrowSubCom", new MockBitmap(32, 32, "WindowArrowSubCom")]
]);
const customBitmaps = new Map();

global.ImageManager = {
    faceWidth: 144,
    faceHeight: 144,
    loadSystem: (name) => {
        if (!systemBitmaps.has(name)) {
            systemBitmaps.set(name, new MockBitmap(192, 192, name));
        }
        return systemBitmaps.get(name);
    },
    loadFace: (name) => new MockBitmap(576, 288, name),
    loadBitmap: (folder, name) => {
        const key = `${folder}${name}`;
        if (customBitmaps.has(key)) return customBitmaps.get(key);
        return new MockBitmap(64, 64, name);
    }
};

global.FontManager = {
    _loaded: [],
    load: (family, filename) => { global.FontManager._loaded.push({ family, filename }); }
};

global.SoundManager = {
    playOk: () => {},
    playCancel: () => {},
    playCursor: () => {}
};

global.Bitmap_Composite = {
    getCompositeFaceEntry: (actor) => ({
        composer: { isReady: () => true, bltComposite: () => {} },
        bitmap: new MockBitmap(144, 144, `hero_${actor.actorId()}`),
        isComposed: true
    })
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
        this.anchor = { x: 0, y: 0, set: (ax, ay) => { this.anchor.x = ax; this.anchor.y = ay; } };
        this.scale = { x: 1, y: 1, set: (sx, sy) => { this.scale.x = sx; this.scale.y = sy; } };
    }
    addChild(c) { this.children.push(c); return c; }
    removeChild(c) {
        const i = this.children.indexOf(c);
        if (i >= 0) this.children.splice(i, 1);
    }
    setFrame(x, y, w, h) { this._frame = { x, y, w, h }; }
    update() {
        for (const c of this.children) {
            if (c && typeof c.update === "function") c.update();
        }
    }
    destroy() {}
}
global.Sprite = MockSprite;

class MockWindow {
    constructor(rect) {
        this.initialize(rect || new Rectangle(0, 0, 100, 100));
    }
    initialize(rect) {
        this.x = rect.x;
        this.y = rect.y;
        this.width = rect.width;
        this.height = rect.height;
        this.padding = 12;
        this.backOpacity = 192;
        this.opacity = 255;
        this.contentsOpacity = 255;
        this.visible = true;
        this.openness = 255;
        this._closing = false;
        this._opening = false;
        this._active = false;
        this.windowskin = skinWindow;
        this.children = [];
        this.contents = new MockBitmap(Math.max(1, this.width - 24), Math.max(1, this.height - 24), "contents");
    }
    addChild(c) { this.children.push(c); return c; }
    get innerWidth() { return Math.max(0, this.width - this.padding * 2); }
    get innerHeight() { return Math.max(0, this.height - this.padding * 2); }
    changePaintOpacity() {}
    setCursorRect(x, y, w, h) { this._cursorRect = new Rectangle(x, y, w, h); }
    createContents() {
        this.contents = new MockBitmap(Math.max(1, this.width - this.padding * 2), Math.max(1, this.height - this.padding * 2), "contents");
    }
    loadWindowskin() { this.windowskin = ImageManager.loadSystem("Window"); }
    updateBackOpacity() { this.backOpacity = 192; }
    standardFontFace() { return $gameSystem.mainFontFace(); }
    standardFontSize() { return $gameSystem.mainFontSize(); }
    lineHeight() { return 36; }
    calcTextHeight() { return this.lineHeight(); }
    maxFontSizeInLine() { return this.contents ? this.contents.fontSize : 26; }
    changeTextColor(color) { if (this.contents) this.contents.textColor = color; }
    resetFontSettings() {
        if (!this.contents) return;
        this.contents.fontFace = this.standardFontFace();
        this.contents.fontSize = this.standardFontSize();
        this.resetTextColor();
    }
    resetTextColor() {
        this.changeTextColor(ColorManager.normalColor());
        if (this.contents) {
            this.contents.outlineColor = ColorManager.outlineColor();
            this.contents.outlineWidth = 3;
        }
    }
    systemColor() { return ColorManager.systemColor(); }
    createTextState(text, x, y, width) {
        return { text, x, y, width, index: 0, startX: x, startY: y, outputWidth: 0, outputHeight: 0 };
    }
    newLineX() { return 0; }
    newPage(textState) {
        if (this.contents) this.contents.clear();
        this.resetFontSettings();
        textState.x = textState.startX;
        textState.y = 0;
    }
    processColorChange(colorIndex) {
        this.changeTextColor(ColorManager.textColor(colorIndex));
    }
    processEscapeCharacter(code, textState) {
        if (code === "C") {
            const m = textState.text.slice(textState.index).match(/^\[(\d+)\]/);
            if (m) {
                textState.index += m[0].length;
                this.processColorChange(Number(m[1]));
            }
        }
    }
    processControlCharacter(textState, c) {
        if (c === "\x1b") {
            const code = textState.text[textState.index] || "";
            textState.index++;
            this.processEscapeCharacter(code, textState);
        }
    }
    processCharacter(textState) {
        const c = textState.text[textState.index++];
        if (c === "\x1b" || c.charCodeAt(0) < 0x20) {
            this.processControlCharacter(textState, c);
        } else if (this.contents) {
            this.contents.context.fillStyle = this.contents.textColor;
            this.contents.context.fillText(c, textState.x, textState.y);
            textState.x += Math.round((this.contents.fontSize || 20) * 0.55);
        }
    }
    processAllText(textState) {
        while (textState.index < textState.text.length) {
            this.processCharacter(textState);
        }
    }
    drawTextEx(text, x, y, width) {
        const ts = this.createTextState(String(text || "").replace(/\\([A-Za-z])/g, "\x1b$1"), x, y, width);
        this.resetFontSettings();
        this.processAllText(ts);
        return ts.x - x;
    }
    textSizeEx(text) {
        const clean = String(text || "").replace(/\x1b[A-Za-z](\[\d+\])?/g, "").replace(/\\C\[\d+\]/gi, "");
        const fs = this.contents ? this.contents.fontSize : this.standardFontSize();
        const lines = clean.split("\n");
        const maxLen = lines.reduce((m, l) => Math.max(m, l.length), 0);
        return {
            width: Math.ceil(maxLen * fs * 0.6),
            height: Math.max(this.lineHeight(), lines.length * this.lineHeight())
        };
    }
    open() { this._opening = true; this.openness = 255; this._opening = false; }
    close() { this._closing = true; this.openness = 0; this._closing = false; }
    isOpen() { return this.openness >= 255; }
    isClosed() { return this.openness <= 0; }
    isOpening() { return this._opening; }
    isClosing() { return this._closing; }
    activate() { this._active = true; }
    deactivate() { this._active = false; }
    hide() { this.visible = false; }
    show() { this.visible = true; }
    update() {}
    updateOpen() {}
    updateClose() {}
    destroy() {}
}
global.Window_Base = MockWindow;

class MockWindowSelectable extends MockWindow {
    initialize(rect) {
        super.initialize(rect);
        this._list = [];
        this._index = 0;
        this._handlers = {};
    }
    maxItems() { return this._list ? this._list.length : 0; }
    maxCols() { return 1; }
    itemWidth() { return 120; }
    itemHeight() { return 36; }
    itemRect(index) { return new Rectangle(0, index * 36, this.itemWidth(), this.itemHeight()); }
    select(i) { this._index = i; }
    index() { return this._index; }
    setHandler(sym, fn) { this._handlers[sym] = fn; }
    isHandled(sym) { return Boolean(this._handlers[sym]); }
    callHandler(sym) { if (this._handlers[sym]) this._handlers[sym](); }
    drawItem() {}
    drawAllItems() {
        for (let i = 0; i < this.maxItems(); i++) this.drawItem(i);
    }
    refresh() {
        if (this.contents) this.contents.clear();
        this.drawAllItems();
    }
    updateCursor() {}
    cursorRight() {}
    cursorLeft() {}
    processCursorMove() {}
    processTouch() {}
    isCancelEnabled() { return true; }
    drawText(txt, x, y, w, align) {
        if (this.contents) this.contents.context.fillText(txt, x, y);
    }
    drawIcon() {}
    textWidth(t) { return String(t || "").length * 10; }
}
global.Window_Selectable = MockWindowSelectable;

class MockWindowCommand extends MockWindowSelectable {
    initialize(rect) {
        super.initialize(rect);
        this.clearCommandList();
    }
    clearCommandList() { this._list = []; }
    addCommand(name, symbol, enabled = true, ext = null) {
        this._list.push({ name, symbol, enabled, ext });
    }
    makeCommandList() {}
    refresh() {
        this.clearCommandList();
        this.makeCommandList();
        super.refresh();
    }
    currentData() { return this._list[this._index] || null; }
}
global.Window_Command = MockWindowCommand;

class MockWindowMessage extends MockWindow {
    initialize(rect) {
        super.initialize(rect);
        this._textState = null;
        this._positionType = 2;
        this._background = 0;
    }
    startMessage() {}
    terminateMessage() { $gameMessage.clear(); this.close(); }
    updatePlacement() {
        this._positionType = $gameMessage.positionType();
        this.y = (this._positionType * (Graphics.boxHeight - this.height)) / 2;
    }
    updateBackground() { this._background = $gameMessage.background(); }
    updateMessage() { return false; }
    startInput() {
        if (typeof MockWindowMessage._onStartInput === "function") {
            MockWindowMessage._onStartInput(this);
        }
        return false;
    }
    checkToNotClose() {}
    update() { super.update(); }
}
global.Window_Message = MockWindowMessage;

global.Scene_Base = class Scene_Base {
    constructor() { this.children = []; this._windowLayer = null; }
    addChild(c) { this.children.push(c); return c; }
    removeChild(c) {
        const i = this.children.indexOf(c);
        if (i >= 0) this.children.splice(i, 1);
    }
    create() {}
    start() {}
    update() {}
    stop() {}
    terminate() {}
};

global.WindowLayer = class WindowLayer {
    constructor() { this.children = []; this.x = 0; this.y = 0; }
    addChild(c) { this.children.push(c); return c; }
};

global.SceneManager = { _scene: null };

global.ColorManager = {
    _windowskin: skinWindow,
    textColor(n) {
        const px = 96 + (n % 8) * 12 + 6;
        const py = 144 + Math.floor(n / 8) * 12 + 6;
        return this._windowskin.getPixel(px, py);
    },
    normalColor() { return this.textColor(0); },
    systemColor() { return this.textColor(16); },
    pendingColor() { return this._windowskin.getPixel(120, 120); },
    outlineColor() { return "rgba(0, 0, 0, 0.6)"; }
};

global.PluginManager = {
    _commands: {},
    parameters: () => ({}),
    registerCommand: (pluginName, commandName, fn) => {
        PluginManager._commands[`${pluginName}:${commandName}`] = fn;
    }
};

global.$gameSystem = {
    _bubbleMode: false,
    _bubbleConfig: {},
    isBubbleMessageMode: () => global.$gameSystem._bubbleMode,
    setBubbleMessageMode: (v) => { global.$gameSystem._bubbleMode = Boolean(v); },
    getBubbleConfig: () => Object.assign({}, global.$gameSystem._bubbleConfig),
    setBubbleConfig: (c) => { global.$gameSystem._bubbleConfig = Object.assign({}, c); },
    mainFontFace: () => "rmmz-mainfont",
    mainFontSize: () => 26,
    windowPadding: () => 12
};

global.$gameMessage = {
    _texts: [],
    _positionType: 2,
    _background: 0,
    clear() { this._texts = []; this._positionType = 2; this._background = 0; },
    add(txt) { this._texts.push(txt); },
    allText() { return this._texts.join("\n"); },
    positionType() { return this._positionType; },
    setPositionType(p) { this._positionType = p; },
    background() { return this._background; },
    setBackground(b) { this._background = b; },
    isBusy() { return this._texts.length > 0; }
};

global.$gameDate = { timestamp: 1000 };

global.$gamePlayer = {
    _sx: 640,
    _sy: 400,
    _dir: 2,
    screenX() { return this._sx; },
    screenY() { return this._sy; },
    direction() { return this._dir; }
};

const eventsMap = new Map();
global.$gameMap = {
    _interpreter: { eventId: () => 0 },
    event: (id) => eventsMap.get(id) || null
};

function makeEvent(id, sx, sy, dir = 2) {
    const ev = {
        _id: id,
        _sx: sx,
        _sy: sy,
        _dir: dir,
        eventId: () => id,
        screenX: () => ev._sx,
        screenY: () => ev._sy,
        direction: () => ev._dir
    };
    eventsMap.set(id, ev);
    return ev;
}

// Chargement dans l'ORDRE RÉEL DE plugins.js (SC4_BubbleMessage AVANT SC4_rmmz_core_Patches !)
global.Utils = { RPGMAKER_NAME: "MZ" };
global.Game_System = function Game_System() {};
global.Game_System.prototype = {};
global.ConfigManager = { makeData: () => ({}), applyData: () => {} };
global.Input = { keyMapper: {} };
global.TextManager = { basic: () => "", param: () => "", command: () => "", message: () => "" };
global.TouchInput = { clear() {}, update() {}, _onLeftButtonDown() {}, _onMouseMove() {}, _onMouseUp() {}, _onLostFocus() {}, isPressed: () => false, isTriggered: () => false };
global.Tilemap = function Tilemap() {};
global.Tilemap.prototype = { update() {} };

require(path.join(pluginsDir, "SC4_core.js"));
require(path.join(pluginsDir, "SC4_Interface.js"));
require(path.join(pluginsDir, "SC4_Localization.js"));
require(path.join(pluginsDir, "SC4_Game_Relation.js"));
require(path.join(pluginsDir, "SC4_Game_ScActorSocial.js"));
require(path.join(pluginsDir, "SC4_Game_Faction.js"));
require(path.join(pluginsDir, "SC4_Sprite_PaperdollFace.js"));
require(path.join(pluginsDir, "SC4_SubComHologramFilter.js"));
require(path.join(pluginsDir, "SC4_Sprite_HudBase.js"));
require(path.join(pluginsDir, "SC4_Sprite_ActorHUD.js"));
require(path.join(pluginsDir, "SC4_Sprite_InterlocutorHUD.js"));
require(path.join(pluginsDir, "SC4_Window_RingCommand.js"));
require(path.join(pluginsDir, "SC4_Window_InteractionRingCommand.js"));
require(path.join(pluginsDir, "SC4_BubbleMessage.js"));
require(path.join(pluginsDir, "SC4_SubSceneManager.js"));
require(path.join(pluginsDir, "SC4_SubScene_Base.js"));
require(path.join(pluginsDir, "SC4_SubScene_RelationDialog.js"));
require(path.join(pluginsDir, "SC4_GuiManager.js"));
require(path.join(pluginsDir, "SC4_RelationManager.js"));
require(path.join(pluginsDir, "SC4_RelationDialogManager.js"));
require(path.join(pluginsDir, "SC4_rmmz_core_Patches.js")); // Chargé EN DERNIER comme dans plugins.js !

// Acteurs et managers de test
function makeMockActor(id, name, isHeroFlag, faceName = "Actor1", faceIndex = 0) {
    const actor = {
        _actorId: id,
        _name: name,
        _isHero: isHeroFlag,
        _social: null,
        hp: 100,
        mhp: 100,
        actorId: () => id,
        name: () => actor._name,
        isHero: () => actor._isHero,
        faceName: () => faceName,
        faceIndex: () => faceIndex,
        equips: () => [],
        meta: () => 1
    };
    Object.defineProperty(actor, "social", {
        get() {
            if (!this._social) this._social = new Game_ScActorSocial(this);
            return this._social;
        }
    });
    return actor;
}

const actorPlayer = makeMockActor(1, "Mosay", true);
const actorHeroNpc = makeMockActor(51, "Priscilla", true);
const actorVanillaNpc = makeMockActor(52, "Capitaine Vane", false, "People1", 3);
const actorsDb = { 1: actorPlayer, 51: actorHeroNpc, 52: actorVanillaNpc };

global.$gameActors = { actor: (id) => actorsDb[id] || null };
global.$gameParty = { leader: () => actorPlayer };
global.$dataFactions = [null, { id: 1, name: "Fédération", bannerName: "banner_fed" }];
global.$gameFactions = {
    affinity: () => 0,
    faction: (id) => id === 1 ? new Game_Faction(global.$dataFactions[1]) : null
};
global.$relationManager = new RelationManager();
global.$relationDialogManager = new RelationDialogManager();

class MockScene_Map extends Scene_Base {
    constructor() {
        super();
        this._currentSubScene = null;
        this._subSceneStack = [];
    }
    openSubScene(cls, ...args) {
        const sub = new cls(this, ...args);
        this._currentSubScene = sub;
        this.addChild(sub);
        sub.create();
        sub.start();
        return sub;
    }
    closeSubScene() {
        if (this._currentSubScene) {
            const closing = this._currentSubScene;
            closing.stop();
            closing.terminate();
            this.removeChild(closing);
            this._currentSubScene = null;
        }
    }
    currentSubScene() { return this._currentSubScene; }
}

let passed = 0;
function test(name, fn) {
    // Reset propre entre tests
    $guiManager.init();
    $gameMessage.clear();
    $gameSystem.setBubbleMessageMode(false);
    SceneManager._scene = null;
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
}

console.log("====================================================================");
console.log(" TEST UNITAIRE ÉTAPE 3 & PRÉ-ÉTAPE : SUBCOM VISUAL MODE & AXE RING ");
console.log("====================================================================");

// ============================================================================
// 1. PILE CONTEXTUELLE COLORMANAGER & ORDRE DES PLUGINS
// ============================================================================
console.log("\n--- 1. ColorManager Caller Stack (ordre plugins.js respecté) ---");

test("ColorManager bascule dynamiquement de Windowskin selon la bulle (\A vs \E SubCom) et préserve Window.png pour Choice/Tuto", () => {
    const bubble = new Window_BubbleMsg(new Rectangle(0, 480, 1280, 240));
    const mapScene = new MockScene_Map();
    SceneManager._scene = mapScene;
    const ev = makeEvent(5, 800, 400);

    // 1. Simuler un dialogue SubCom actif (mode = 1)
    mapScene.openSubScene(SubScene_RelationDialog, 51, 5, 1);
    assert.strictEqual($guiManager.bubbleMode, 1);

    // Interlocuteur (\E[5]) -> SubCom -> WindowSubCom
    $gameMessage.clear();
    $gameMessage.add("\\E[5]\\C[0]Transmission cryptée");
    bubble.startMessage();
    assert.strictEqual(bubble.effectiveMode(), 1);
    assert.strictEqual(bubble.windowskin, skinSubCom);
    assert.strictEqual(bubble.contents.textColor, "#39ff88", "c[0] doit provenir de WindowSubCom.png !");

    // \C[15] dans cette même bulle lit bien WindowSubCom
    bubble.drawTextEx("\\C[15]Alerte", 0, 0, 200);
    assert.strictEqual(bubble.contents.textColor, "#117744", "c[15] doit lire WindowSubCom.png !");

    // Joueur (\A) dans ce même SubCom -> FORCE mode 0 (Window_Bubble)
    $gameMessage.clear();
    $gameMessage.add("\\A\\C[0]Bien reçu !");
    bubble.startMessage();
    assert.strictEqual(bubble.effectiveMode(), 0, "La bulle joueur doit toujours rester en mode 0");
    assert.strictEqual(bubble.windowskin, skinBubble);
    assert.strictEqual(bubble.contents.textColor, "#111111", "c[0] joueur doit lire Window_Bubble.png !");

    // Fenêtre tierce (ex: Window_Tuto) -> lit ColorManager._windowskin (Window.png)
    const tutoLike = new MockWindow(new Rectangle(0, 0, 300, 150));
    tutoLike.drawTextEx("\\C[1]Tuto", 0, 0, 200);
    assert.strictEqual(tutoLike.contents.textColor, "#20a0ff", "Fenêtre hors Window_BubbleMsg conserve Window.png !");

    // Choix imbriqué depuis startInput() sur Window_BubbleMsg -> doit retrouver Window.png (caller = null)
    let inputNormalColor = null;
    MockWindowMessage._onStartInput = () => {
        inputNormalColor = ColorManager.normalColor();
    };
    ColorManager.withWindowContext(bubble, () => {
        assert.strictEqual(ColorManager.normalColor(), "#111111");
        bubble.startInput();
    });
    MockWindowMessage._onStartInput = null;
    assert.strictEqual(inputNormalColor, "#ffffff", "startInput() doit réinitialiser le caller ColorManager pour Window_ChoiceList !");

    mapScene.closeSubScene();
});

test("ColorManager ignore un windowskin non prêt et se replie sur ColorManager._windowskin", () => {
    const bubble = new Window_BubbleMsg(new Rectangle(0, 480, 1280, 240));
    const unreadySkin = makePaletteSkin("PendingSkin", { 0: "#abcdef" });
    unreadySkin._loadingState = "loading";
    bubble.windowskin = unreadySkin;

    ColorManager.withWindowContext(bubble, () => {
        assert.strictEqual(ColorManager.normalColor(), "#ffffff", "Skin non prêt doit se replier sur Window.png");
    });
});

// ============================================================================
// 2. GUIMANAGER : GESTION DES MODES & RESTAURATION
// ============================================================================
console.log("\n--- 2. GuiManager Bubble Mode & Idempotence ---");

test("GuiManager mémorise _lastBubbleMode sans l'écraser en cas d'appels consécutifs identiques", () => {
    assert.strictEqual($guiManager.bubbleMode, 0);
    assert.strictEqual($guiManager.lastBubbleMode, 0);

    $guiManager.setBubbleMode(1);
    assert.strictEqual($guiManager.getBubbleMode(), 1);
    assert.strictEqual($guiManager.getLastBubbleMode(), 0);

    // Appel redondant sur le même mode 1
    $guiManager.setBubbleMode(1);
    assert.strictEqual($guiManager.lastBubbleMode, 0, "_lastBubbleMode ne doit pas être écrasé par 1");

    $guiManager.restoreLastBubbleMode();
    assert.strictEqual($guiManager.bubbleMode, 0);

    // Changement depuis mode personnalisé 2 -> 1 -> restore -> 2
    $guiManager.setBubbleMode(2);
    $guiManager.setBubbleMode(1);
    assert.strictEqual($guiManager.lastBubbleMode, 2);
    $guiManager.restoreLastBubbleMode();
    assert.strictEqual($guiManager.bubbleMode, 2);
});

// ============================================================================
// 3. WINDOW_INTERACTIONRINGCOMMAND : ARC OPPOSÉ VECTORIEL 8 DIRECTIONS
// ============================================================================
console.log("\n--- 3. Window_InteractionRingCommand (Vecteur Interlocuteur & Repli) ---");

test("Window_InteractionRingCommand déploie la roue dans le dos du joueur selon le vecteur (indépendant de sprite.direction)", () => {
    const ring = new Window_InteractionRingCommand(new Rectangle(0, 0, 420, 420));
    ring.setCommands([
        { name: "C1", symbol: "c1", enabled: true },
        { name: "C2", symbol: "c2", enabled: true },
        { name: "C3", symbol: "c3", enabled: true }
    ]);
    ring._radius = 90;

    // Tester les 8 vecteurs (PNJ en N, NE, E, SE, S, SO, O, NO) alors que les sprites regardent n'importe où (dir = 2)
    const offsets = [
        [0, -100], [100, -100], [100, 0], [100, 100],
        [0, 100], [-100, 100], [-100, 0], [-100, -100]
    ];
    for (const [dx, dy] of offsets) {
        const playerT = { screenX: () => 500, screenY: () => 300, direction: () => 2 };
        const npcT = { screenX: () => 500 + dx, screenY: () => 300 + dy, direction: () => 8 };
        ring.setArcFromTargets(playerT, npcT);

        for (let i = 0; i < 3; i++) {
            const rect = ring.itemRect(i);
            const vx = (rect.x + ring.itemWidth() / 2) - ring._center.x;
            const vy = (rect.y + ring.itemHeight() / 2) - ring._center.y;
            const dot = vx * dx + vy * dy;
            assert.ok(dot < 0, `Item ${i} pour vecteur (${dx},${dy}) doit être dans le dos du joueur (dot=${dot})`);
        }
    }

    // Repli si pas d'événement (appel SubCom pur) -> oppositeAngle(facing = 6 droite -> gauche dx < 0)
    const playerOnly = { screenX: () => 500, screenY: () => 300, direction: () => 6 };
    ring.setArcFromTargets(playerOnly, null);
    for (let i = 0; i < 3; i++) {
        const rect = ring.itemRect(i);
        const vx = (rect.x + ring.itemWidth() / 2) - ring._center.x;
        assert.ok(vx < 0, "Sans cible événement, l'arc doit se replier sur le dos du regard joueur");
    }
});

// ============================================================================
// 4. PRE-ETAPE & ETAPE 3 SUR WINDOW_BUBBLEMSG
// ============================================================================
console.log("\n--- 4. Window_BubbleMsg Orientation Dialogue & Mode Visuel SubCom ---");

test("Hors scène de dialogue, Window_BubbleMsg respecte strictement le positionType manuel", () => {
    const bubble = new Window_BubbleMsg(new Rectangle(0, 480, 1280, 240));
    makeEvent(10, 640, 200, 2); // Au-dessus du joueur
    $gamePlayer._sx = 640;
    $gamePlayer._sy = 420;

    $gameMessage.clear();
    $gameMessage.setPositionType(2); // Forcé EN BAS manuellement
    $gameMessage.add("\\ATexte manuel en bas");
    bubble.startMessage();
    assert.ok(bubble.y > $gamePlayer._sy, "Hors dialogue, positionType manuel (2 = bas) doit primer !");

    $gameMessage.clear();
    $gameMessage.setPositionType(0); // Forcé EN HAUT manuellement
    $gameMessage.add("\\E[10]Bulle événement en haut");
    bubble.startMessage();
    assert.ok(bubble.y < 200, "Hors dialogue, positionType manuel (0 = haut) doit primer !");
});

test("En scène de dialogue, l'axe relatif place vertical/diagonal dos à dos et latéral tous deux en haut", () => {
    const bubble = new Window_BubbleMsg(new Rectangle(0, 480, 1280, 240));
    const mapScene = new MockScene_Map();
    SceneManager._scene = mapScene;
    const ev = makeEvent(11, 640, 240, 2);
    $gamePlayer._sx = 640;
    $gamePlayer._sy = 420;
    $gamePlayer._dir = 8;

    mapScene.openSubScene(SubScene_RelationDialog, 51, 11, 0);

    // 1) Interlocuteur AU-DESSUS (dy < 0) -> PNJ en haut (0), PJ en bas (2)
    $gameMessage.clear();
    $gameMessage.add("\\E[11]PNJ en haut");
    bubble.startMessage();
    assert.strictEqual(bubble.resolveBubblePositionType(), 0);
    assert.ok(bubble.y < ev.screenY());

    $gameMessage.clear();
    $gameMessage.setPositionType(0); // Même si $gameMessage dit 0, le dialogue impose bas (2)
    $gameMessage.add("\\AJoueur en bas");
    bubble.startMessage();
    assert.strictEqual(bubble.resolveBubblePositionType(), 2);
    assert.ok(bubble.y > $gamePlayer.screenY());

    // 2) Interlocuteur EN-DESSOUS (dy > 0) et même diagonale verticale |dy| === |dx| -> PNJ bas (2), PJ haut (0)
    ev._sx = 740;
    ev._sy = 520; // dx=+100, dy=+100
    $gameMessage.clear();
    $gameMessage.add("\\E[11]PNJ en bas");
    bubble.startMessage();
    assert.strictEqual(bubble.resolveBubblePositionType(), 2);

    $gameMessage.clear();
    $gameMessage.add("\\AJoueur en haut");
    bubble.startMessage();
    assert.strictEqual(bubble.resolveBubblePositionType(), 0);

    // 3) Dialogue LATÉRAL (|dx| > |dy|) -> LES DEUX en haut (0), quel que soit le sens de direction()
    ev._sx = 840;
    ev._sy = 440; // dx=+200, dy=+20
    ev._dir = 6; // tourne même le dos
    $gameMessage.clear();
    $gameMessage.add("\\E[11]Latéral PNJ");
    bubble.startMessage();
    assert.strictEqual(bubble.resolveBubblePositionType(), 0);

    $gameMessage.clear();
    $gameMessage.add("\\ALatéral PJ");
    bubble.startMessage();
    assert.strictEqual(bubble.resolveBubblePositionType(), 0);

    // 4) Edge clamping préservé si PNJ tout en haut de l'écran (y=12)
    ev._sx = 640;
    ev._sy = 12;
    $gamePlayer._sy = 200;
    $gameMessage.clear();
    $gameMessage.add("\\E[11]Clamped");
    bubble.startMessage();
    assert.ok(bubble.y >= 8, "Edge clamping doit empêcher la bulle de sortir de l'écran");

    mapScene.closeSubScene();
});

test("Mode SubCom applique WindowSubCom/WindowArrowSubCom, ajuste la taille avant calcul et bascule sur le HUD sans événement", () => {
    const bubble = new Window_BubbleMsg(new Rectangle(0, 480, 1280, 240));
    const mapScene = new MockScene_Map();
    SceneManager._scene = mapScene;

    // Tester qu'une taille de police mode 1 spécifique agrandit la bulle dès startMessage
    const savedMode1Size = Window_BubbleMsg._modeAssets[1].fontSize;
    Window_BubbleMsg._modeAssets[1].fontSize = 34;

    $relationManager.openRelationDialog(51, 0, 1); // SubCom sans événement !
    assert.strictEqual($guiManager.bubbleMode, 1);

    // Message NPC sans tag \E -> détecté comme dialogue actif + ancrage repli sous HUD interlocuteur
    $gameMessage.clear();
    $gameMessage.add("Ici secteur Alpha, vous me recevez ?");
    bubble.startMessage();

    assert.strictEqual(bubble._isBubbleMode, true, "Dans une SubScene dialogue sans event, la bulle reste active");
    assert.strictEqual(bubble.windowskin, skinSubCom, "Habillage WindowSubCom attendu");
    assert.strictEqual(bubble._bubbleArrowSprite.bitmap.name, "WindowArrowSubCom", "Queue BD SubCom attendue");
    assert.strictEqual(bubble.contents.fontSize, 34, "Police mode 1 appliquée avant dessin");
    assert.ok(bubble._mapTarget && bubble._mapTarget.isHudAnchor, "Ancrage HUD repli activé");
    assert.strictEqual(bubble._mapTarget.x, 1280 - 150);
    assert.strictEqual(bubble._mapTarget.y, 296);
    assert.ok(bubble.y > 296, "La bulle SubCom sans événement se place sous le HUD Interlocuteur");
    assert.strictEqual(bubble._bubbleArrowSprite.scale.y, -1, "La flèche pointe vers le haut vers le HUD Interlocuteur");

    // Changement de mode à chaud via update() (1 -> 0 -> 1)
    $guiManager.setBubbleMode(0);
    bubble.update();
    assert.strictEqual(bubble.windowskin, skinBubble, "update() détecte le passage à chaud en mode 0");
    $guiManager.setBubbleMode(1);
    bubble.update();
    assert.strictEqual(bubble.windowskin, skinSubCom, "update() réapplique WindowSubCom au retour en mode 1");

    // Vérifier fermeture propre et restauration (_lastBubbleMode était 0)
    mapScene.currentSubScene().onCommandCancel();
    assert.strictEqual($guiManager.bubbleMode, 0);

    // Vérifier aussi watchModeBitmap asynchrone sur skinSubCom en chargement
    const origReady = skinSubCom.isReady;
    let asyncLoading = true;
    skinSubCom.isReady = () => !asyncLoading;
    const bubbleAsync = new Window_BubbleMsg(new Rectangle(0, 480, 1280, 240));
    $relationManager.openRelationDialog(51, 0, 1);
    $gameMessage.clear();
    $gameMessage.add("Test chargement asynchrone");
    bubbleAsync.startMessage();
    assert.strictEqual(bubbleAsync.isModeAssetsReady(1), false);
    asyncLoading = false;
    skinSubCom.triggerLoad();
    assert.strictEqual(bubbleAsync.isModeAssetsReady(1), true);
    skinSubCom.isReady = origReady;
    mapScene.closeSubScene();

    Window_BubbleMsg._modeAssets[1].fontSize = savedMode1Size;
});

// ============================================================================
// 5. SUBSCENE_RELATIONDIALOG, RELATIONMANAGER, INTERFACE & SUSPENSION
// ============================================================================
console.log("\n--- 5. Orchestration RelationManager / Interface / SubScene ---");

test("SC4.openRelationDialog & PluginManager relaient le mode, retirent \C[15], gèrent suspend/resume & restoreLastBubbleMode", () => {
    const mapScene = new MockScene_Map();
    SceneManager._scene = mapScene;
    makeEvent(7, 700, 400);

    // Via commande de plugin
    const cmd = PluginManager._commands["SC4_Interface:openRelationDialog"];
    cmd.call({ eventId: () => 7 }, { targetActorId: "51", targetEventId: "0", mode: "1" });

    const sub = mapScene.currentSubScene();
    assert.ok(sub instanceof SubScene_RelationDialog);
    assert.ok(sub._commandWindow instanceof Window_InteractionRingCommand);
    assert.strictEqual(sub.bubbleMode, 1);
    assert.strictEqual($guiManager.bubbleMode, 1);
    assert.strictEqual($guiManager.lastBubbleMode, 0);

    // Vérifier qu'aucun \C[15] n'est injecté par processNextDialogueMessage
    $gameMessage.clear();
    sub.playDialogueSequence([{ target: "npc", text: "Rapport de mission." }], () => {});
    assert.strictEqual($gameMessage._texts.length, 1);
    assert.strictEqual($gameMessage._texts[0], "\\E[7]Rapport de mission.", "Plus aucun \\C[15]/\\C[0] en dur !");

    // Suspension & restauration SubSceneManager conservent le mode 1
    sub.suspend();
    assert.strictEqual(SubSceneManager.isSuspended(), true);
    const mapScene2 = new MockScene_Map();
    SceneManager._scene = mapScene2;
    const resumed = SubSceneManager.resume(mapScene2);
    assert.ok(resumed instanceof SubScene_RelationDialog);
    assert.strictEqual(resumed.bubbleMode, 1);
    assert.strictEqual($guiManager.bubbleMode, 1);

    // Clôture externe via closeSubScene (terminate) restaure _lastBubbleMode (0)
    mapScene2.closeSubScene();
    assert.strictEqual($guiManager.bubbleMode, 0);

    // Edge-case : même si setBubbleMode(1) puis setBubbleMode(0) avaient été appelés manuellement avant un dialogue normal (0),
    // clôturer le dialogue normal ne doit JAMAIS rebascule vers 1 !
    $guiManager.setBubbleMode(1);
    $guiManager.setBubbleMode(0);
    assert.strictEqual($guiManager.lastBubbleMode, 1);
    $relationManager.openRelationDialog(51, 7); // mode 0 par défaut
    mapScene2.closeSubScene();
    assert.strictEqual($guiManager.bubbleMode, 0, "Clore un dialogue normal (mode 0) laisse mode = 0 !");
});

// ============================================================================
// 6. SUBCOMHOLOGRAMFILTER & SPRITE_INTERLOCUTORHUD (HERO & VANILLA)
// ============================================================================
console.log("\n--- 6. SubComHologramFilter & Sprite_InterlocutorHUD ---");

test("SubComHologramFilter gère les presets, avertit sur preset inconnu et anime uTime", () => {
    warnedLogs.length = 0;
    const filter = new SubComHologramFilter("green", 1.0);
    assert.strictEqual(filter.preset, "green");
    assert.ok(SubComHologramFilter.FRAGMENT_SRC.includes("uTintColor"));
    assert.ok(SubComHologramFilter.FRAGMENT_SRC.includes("inputClamp"));
    assert.strictEqual(filter.padding, 0);

    const t0 = filter.uniforms.uTime;
    filter.update(1 / 30);
    assert.ok(filter.uniforms.uTime > t0, "uTime doit progresser");

    filter.setPreset("cyan");
    assert.strictEqual(filter.preset, "cyan");
    assert.ok(Math.abs(filter.uniforms.uTintColor[2] - 1.0) < 1e-4);

    filter.setPreset("inexistant");
    assert.ok(warnedLogs.some(w => w.tag === "SubComHologramFilter"), "DEBUGTOOL.warn attendu sur preset inconnu");
    assert.ok(Math.abs(filter.uniforms.uTintColor[1] - 0.96) < 1e-4, "Repli attendu sur green");
});

test("Sprite_InterlocutorHUD attache le filtre uniquement sur _faceSprite en mode 1 (Hero et Vanilla) et le retire en mode 0", () => {
    const mapScene = new MockScene_Map();
    SceneManager._scene = mapScene;
    const iHud = new Sprite_InterlocutorHUD();

    // Test 1 : Interlocuteur Hero (id=51) en mode 1 SubCom
    $relationManager.openRelationDialog(51, 0, 1);
    iHud.update();
    assert.strictEqual(iHud.visible, true);
    assert.ok(iHud._faceSprite.visible);
    assert.ok(Array.isArray(iHud._faceSprite.filters) && iHud._faceSprite.filters.length === 1);
    assert.ok(iHud._faceSprite.filters[0] instanceof SubComHologramFilter);
    assert.strictEqual(iHud.filters, null, "Le filtre ne doit PAS être appliqué sur le HUD racine");
    assert.strictEqual(iHud._upperLayerSprite.filters, null, "Le filtre ne doit PAS altérer l'upperLayer");

    const tBefore = iHud._faceSprite.filters[0].uniforms.uTime;
    iHud.update();
    assert.ok(iHud._faceSprite.filters[0].uniforms.uTime > tBefore, "Le filtre hologramme s'anime à chaque update");

    // Fermer la sous-scène -> retour en mode 0 -> masque et détache le filtre
    mapScene.currentSubScene().onCommandCancel();
    iHud.update();
    assert.strictEqual(iHud.visible, false);
    assert.strictEqual(iHud._faceSprite.filters, null, "Filtre détaché à la fermeture");

    // Test 2 : Basculer en mode 0 sur un PNJ Hero (dialogue normal sur carte) -> AUCUN filtre
    $relationManager.openRelationDialog(51, 7, 0);
    iHud.update();
    assert.strictEqual(iHud.visible, true);
    assert.strictEqual(iHud._faceSprite.filters, null, "Pas de filtre hologramme en dialogue normal mode 0");
    mapScene.closeSubScene();

    // Test 3 : Interlocuteur Vanilla (id=52) en mode 1 -> filtre attaché aussi !
    $relationManager.openRelationDialog(52, 0, 1);
    iHud.update();
    assert.strictEqual(iHud.visible, true);
    assert.strictEqual(iHud.isHero(), false);
    assert.ok(Array.isArray(iHud._faceSprite.filters) && iHud._faceSprite.filters[0] instanceof SubComHologramFilter,
        "Le filtre hologramme fonctionne aussi sur les visages Vanilla");

    mapScene.closeSubScene();
});

console.log(`\n====================================================================`);
console.log(`🎉 ÉTAPE 3 & PRÉ-ÉTAPE VALIDÉES : ${passed}/${passed} TESTS RÉUSSIS !`);
console.log(`====================================================================\n`);
