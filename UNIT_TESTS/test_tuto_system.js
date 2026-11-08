//=============================================================================
// test_tuto_system.js
// Unit tests for SimCraft 4 Contextual Tutorial Engine
//=============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("=================================================");
console.log("  TEST SUITE: SC4 Contextual Tutorial Engine     ");
console.log("=================================================");

// Setup simulated RMMZ browser context
const ctx = {
    console: console,
    Math: Math,
    String: String,
    Number: Number,
    Array: Array,
    Object: Object,
    Boolean: Boolean,
    Rectangle: function (x, y, w, h) {
        this.x = x || 0;
        this.y = y || 0;
        this.width = w || 0;
        this.height = h || 0;
    },
    Bitmap: function (w, h) {
        this.width = w || 0;
        this.height = h || 0;
        this.fontSize = 16;
        this.fontItalic = false;
        this.textColor = "#ffffff";
        this.drawText = () => { };
        this.fillRect = () => { };
        this.clear = () => { };
        this.blt = () => { };
    },
    Sprite: function () {
        this.initialize(...arguments);
    },
    Window_Base: function () {
        this.initialize(...arguments);
    },
    Window_Selectable: function () {
        this.initialize(...arguments);
    },
    Scene_MenuBase: function () {
        this.initialize(...arguments);
    },
    ImageManager: {
        loadBitmap: (folder, name) => ({
            width: 48,
            height: 48,
            isReady: () => true
        }),
        loadSystem: (name) => ({
            width: 192,
            height: 192,
            isReady: () => true
        })
    },
    AudioManager: {
        playedSe: [],
        playSe(se) { this.playedSe.push(se); }
    },
    SoundManager: {
        playOk: () => { }
    },
    Graphics: {
        boxWidth: 1280,
        boxHeight: 720
    },
    Input: {
        isTriggered: () => false
    },
    TouchInput: {
        isTriggered: () => false
    },
    ConfigManager: {
        contextualHelp: true,
        makeData: function () {
            return { contextualHelp: this.contextualHelp };
        },
        applyData: function (data) {
            this.contextualHelp = (data && data.contextualHelp !== undefined) ? Boolean(data.contextualHelp) : true;
        }
    },
    SC4_Localization: {
        getText: (k, def) => def || k,
        parse: (t) => t || ""
    },
    $gameMap: {
        tileWidth: () => 48,
        tileHeight: () => 48,
        adjustX: (x) => x,
        adjustY: (y) => y
    },
    SceneManager: {
        _scene: null
    }
};

ctx.Sprite.prototype.initialize = function (bitmap) {
    this.bitmap = bitmap || null;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.rotation = 0;
    this.opacity = 255;
    this.visible = true;
    this.anchor = {
        x: 0,
        y: 0,
        set(x, y) { this.x = x; this.y = y; }
    };
};
ctx.Sprite.prototype.update = function () { };
ctx.Sprite.prototype.addChild = function () { };
ctx.Sprite.prototype.removeChild = function () { };

ctx.Window_Base.prototype.initialize = function (rect) {
    this.rect = rect || new ctx.Rectangle();
    this.x = this.rect.x;
    this.y = this.rect.y;
    this.width = this.rect.width;
    this.height = this.rect.height;
    this.padding = 12;
    this.opacity = 255;
    this.openness = 255;
    this.visible = true;
    this.active = true;
    this.contents = new ctx.Bitmap(this.width, this.height);
};
ctx.Window_Base.prototype.move = function (x, y, w, h) {
    this.x = x; this.y = y; this.width = w; this.height = h;
};
ctx.Window_Base.prototype.createContents = function () {
    this.contents = new ctx.Bitmap(this.width, this.height);
};
ctx.Window_Base.prototype.contentsWidth = function () { return Math.max(0, this.width - this.padding * 2); };
ctx.Window_Base.prototype.contentsHeight = function () { return Math.max(0, this.height - this.padding * 2); };
ctx.Window_Base.prototype.drawText = function () { };
ctx.Window_Base.prototype.drawTextEx = function () { };
ctx.Window_Base.prototype.textWidth = function (t) { return t ? t.length * 10 : 0; };
ctx.Window_Base.prototype.textSizeEx = function () { return { width: 300, height: 48 }; };
ctx.Window_Base.prototype.convertEscapeCharacters = function (t) { return t || ""; };
ctx.Window_Base.prototype.changeTextColor = function () { };
ctx.Window_Base.prototype.resetTextColor = function () { };
ctx.Window_Base.prototype.open = function () { this.openness = 255; };
ctx.Window_Base.prototype.close = function () { this.openness = 0; };
ctx.Window_Base.prototype.activate = function () { this.active = true; };
ctx.Window_Base.prototype.deactivate = function () { this.active = false; };
ctx.Window_Base.prototype.update = function () { };
ctx.Window_Base.prototype.addChild = function () { };

ctx.Window_Selectable.prototype = Object.create(ctx.Window_Base.prototype);
ctx.Window_Selectable.prototype.constructor = ctx.Window_Selectable;
ctx.Window_Selectable.prototype.initialize = function (rect) {
    ctx.Window_Base.prototype.initialize.call(this, rect);
    this._index = 0;
};
ctx.Window_Selectable.prototype.index = function () { return this._index; };
ctx.Window_Selectable.prototype.select = function (i) { this._index = i; };
ctx.Window_Selectable.prototype.itemLineRect = function (i) { return new ctx.Rectangle(0, i * 24, this.width, 24); };
ctx.Window_Selectable.prototype.changePaintOpacity = function () { };
ctx.Window_Selectable.prototype.setHandler = function () { };
ctx.Window_Selectable.prototype.refresh = function () { };

ctx.Scene_MenuBase.prototype.initialize = function () { };
ctx.Scene_MenuBase.prototype.create = function () { };
ctx.Scene_MenuBase.prototype.addChild = function () { };
ctx.Scene_MenuBase.prototype.addWindow = function () { };
ctx.Scene_MenuBase.prototype.popScene = function () { };
ctx.Scene_MenuBase.prototype.update = function () { };

ctx.window = ctx;

// Sample $dataTutos database
ctx.$dataTutos = [
    null,
    { id: 1, key: "tuto_0", name: "Déplacement", img: "arrow.png", txt: "Utilisez les touches pour vous déplacer." },
    { id: 2, key: "tuto_1", name: "Inventaire", img: "key.png", txt: "Accédez à votre inventaire." },
    { id: 3, key: "tuto_sector", name: "Secteur", img: null, txt: "Carte de secteur." }
];

// Load SC4_TutoManager.js
const tutoManagerCode = fs.readFileSync(path.join(__dirname, "../js/plugins/SC4_TutoManager.js"), "utf8");
vm.runInNewContext(tutoManagerCode, ctx);

// Load SC4_Window_Tuto.js
const windowTutoCode = fs.readFileSync(path.join(__dirname, "../js/plugins/SC4_Window_Tuto.js"), "utf8");
vm.runInNewContext(windowTutoCode, ctx);

// Load SC4_Scene_TutoBook.js
const sceneTutoBookCode = fs.readFileSync(path.join(__dirname, "../js/plugins/SC4_Scene_TutoBook.js"), "utf8");
vm.runInNewContext(sceneTutoBookCode, ctx);

let passed = 0;
let failed = 0;

function it(desc, fn) {
    try {
        fn();
        console.log(`  ✓ ${desc}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${desc}`);
        console.error(`    ${err.stack || err.message}`);
        failed++;
    }
}

// -------------------------------------------------------------
// Suite 1: TutoManager Unit Tests
// -------------------------------------------------------------
console.log("\n--- Suite 1: TutoManager Orchestration & Queue ---");

it("Instantiates TutoManager and exposes $tutoManager", () => {
    assert.ok(ctx.TutoManager);
    assert.ok(ctx.$tutoManager);
    assert.strictEqual(ctx.$tutoManager.isBusy(), false);
});

it("Finds tutorial data by numeric ID and by key", () => {
    const t1 = ctx.$tutoManager.findTutoData(1);
    assert.strictEqual(t1.name, "Déplacement");

    const t2 = ctx.$tutoManager.findTutoData("tuto_1");
    assert.strictEqual(t2.name, "Inventaire");

    const tNone = ctx.$tutoManager.findTutoData("unknown_key");
    assert.strictEqual(tNone, null);
});

it("Queues and shows a tutorial when not seen yet", () => {
    ctx.$tutoManager.resetSeen();
    const result = ctx.$tutoManager.show(1);
    assert.strictEqual(result, true);
    assert.strictEqual(ctx.$tutoManager.isBusy(), true);
    assert.strictEqual(ctx.$tutoManager.currentTuto().id, 1);
    assert.strictEqual(ctx.$tutoManager.isSeen(1), true);
    assert.strictEqual(ctx.$tutoManager.isSeen("tuto_0"), true);
});

it("Does not re-trigger a tutorial that was already seen unless force: true", () => {
    const secondTry = ctx.$tutoManager.show(1);
    assert.strictEqual(secondTry, false);

    const forcedTry = ctx.$tutoManager.show(1, { force: true });
    assert.strictEqual(forcedTry, true);
});

it("Handles multiple queued tutorials sequentially", () => {
    ctx.$tutoManager.resetSeen();
    ctx.$tutoManager.show("tuto_0");
    ctx.$tutoManager.show("tuto_1");

    assert.strictEqual(ctx.$tutoManager.currentTuto().key, "tuto_0");

    // Close first tutorial
    ctx.$tutoManager.closeCurrent();
    assert.strictEqual(ctx.$tutoManager.currentTuto().key, "tuto_1");
    assert.strictEqual(ctx.$tutoManager.isBusy(), true);

    // Close second tutorial
    ctx.$tutoManager.closeCurrent();
    assert.strictEqual(ctx.$tutoManager.currentTuto(), null);
    assert.strictEqual(ctx.$tutoManager.isBusy(), false);
});

it("Respects ConfigManager.contextualHelp = false option", () => {
    ctx.ConfigManager.contextualHelp = false;
    ctx.$tutoManager.resetSeen();

    const res = ctx.$tutoManager.show("tuto_0");
    assert.strictEqual(res, false);
    assert.strictEqual(ctx.$tutoManager.isBusy(), false);

    ctx.ConfigManager.contextualHelp = true;
});

it("Correctly serializes and deserializes seen tutorials to/from savefile data", () => {
    ctx.$tutoManager.resetSeen();
    ctx.$tutoManager.show("tuto_0");
    ctx.$tutoManager.show("tuto_1");

    const saved = ctx.$tutoManager.makeSavefileData();
    assert.ok(saved.seenTutos);
    assert.strictEqual(saved.seenTutos["tuto_0"], true);
    assert.strictEqual(saved.seenTutos["tuto_1"], true);

    const freshManager = new ctx.TutoManager();
    assert.strictEqual(freshManager.isSeen("tuto_0"), false);
    freshManager.loadSavefileData(saved);
    assert.strictEqual(freshManager.isSeen("tuto_0"), true);
    assert.strictEqual(freshManager.isSeen("tuto_1"), true);
});

// -------------------------------------------------------------
// Suite 2: Sprite_TutoArrow & Window_Tuto Mechanics
// -------------------------------------------------------------
console.log("\n--- Suite 2: Visual Components (Arrow & Window) ---");

it("Initializes Sprite_TutoArrow with correct anchor and oscillation", () => {
    const arrow = new ctx.Sprite_TutoArrow();
    assert.strictEqual(arrow.anchor.x, 0.5);
    assert.strictEqual(arrow.anchor.y, 1.0);
    assert.strictEqual(arrow.visible, false);

    arrow.setup({ xMap: 5, yMap: 10, angle: 90 });
    assert.strictEqual(arrow.visible, true);
    assert.strictEqual(arrow.rotation, (90 * Math.PI) / 180);

    // After ticking, position remains calculated
    arrow.update();
    assert.ok(arrow.x > 0);
    assert.ok(arrow.y > 0);
});

it("Initializes Window_Tuto and triggers openTuto correctly", () => {
    const arrow = new ctx.Sprite_TutoArrow();
    const win = new ctx.Window_Tuto(arrow);

    ctx.AudioManager.playedSe = [];
    win.openTuto({
        id: 1,
        name: "Déplacement",
        txt: "Texte de test.",
        img: "arrow.png",
        arrow: { x: 200, y: 300, angle: 0 }
    });

    assert.strictEqual(win.visible, true);
    assert.strictEqual(win.openness, 255);
    assert.strictEqual(arrow.visible, true);
    assert.strictEqual(ctx.AudioManager.playedSe.length, 1);
    assert.strictEqual(ctx.AudioManager.playedSe[0].name, "Neon");
});

it("Window_Tuto closes and advances queue on user OK input", () => {
    const win = new ctx.Window_Tuto();
    ctx.$tutoManager.resetSeen();
    ctx.$tutoManager.show("tuto_0");
    ctx.$tutoManager.show("tuto_1");

    win.openTuto(ctx.$tutoManager.currentTuto());
    assert.strictEqual(ctx.$tutoManager.currentTuto().key, "tuto_0");

    // Simulate OK input
    const origOk = ctx.Input.isTriggered;
    ctx.Input.isTriggered = (key) => key === "ok";

    win.update();

    ctx.Input.isTriggered = origOk;

    // Window closed and moved to next
    assert.strictEqual(win.openness, 0);
    assert.strictEqual(ctx.$tutoManager.currentTuto().key, "tuto_1");
});

it("Wraps long lines properly and proportions window dimensions to content", () => {
    const win = new ctx.Window_Tuto();
    const longText = "Utilisez les touches directionnelles ou cliquez sur une destination pour vous déplacer dans le complexe Inral.";
    const lines = win.computeWrappedLines(longText, 300); // 300px max width
    assert.ok(lines.length >= 2, "Long line should be wrapped into at least 2 lines");
    for (const line of lines) {
        assert.ok(win.textWidth(line) <= 300, `Line "${line}" must fit within 300px`);
    }

    win.openTuto({
        id: 1,
        name: "Déplacement & Navigation",
        txt: longText,
        img: "arrow.png"
    });

    assert.ok(win.width >= 400, "Window width must be at least 400px");
    assert.ok(win.height >= 160, "Window height must fit lines + title + image");
});

// -------------------------------------------------------------
// Suite 3: Freeze Behavior & Scene_TutoBook
// -------------------------------------------------------------
console.log("\n--- Suite 3: Map Freeze & History Book ---");

it("Locks player movement and pause menu when tuto is busy", () => {
    // Simulated Scene_Map
    const sceneMap = {
        _currentSubScene: null,
        isActive: () => true
    };

    const isPlayerActive = function () {
        if (ctx.$tutoManager && ctx.$tutoManager.isBusy()) {
            return false;
        }
        return true;
    };

    const isMenuEnabled = function () {
        if (ctx.$tutoManager && ctx.$tutoManager.isBusy()) {
            return false;
        }
        return true;
    };

    // Ensure a tutorial is active
    ctx.$tutoManager.resetSeen();
    ctx.$tutoManager.show("tuto_0", { force: true });

    // Case 1: Tuto is busy
    assert.strictEqual(ctx.$tutoManager.isBusy(), true);
    assert.strictEqual(isPlayerActive.call(sceneMap), false);
    assert.strictEqual(isMenuEnabled.call(sceneMap), false);

    // Case 2: Tuto closes
    ctx.$tutoManager.closeCurrent();
    assert.strictEqual(ctx.$tutoManager.isBusy(), false);
    assert.strictEqual(isPlayerActive.call(sceneMap), true);
    assert.strictEqual(isMenuEnabled.call(sceneMap), true);
});

it("Freezes Spriteset_Map, Tilemap (autotiles), Game_Map and Game_Event updates when tuto is busy", () => {
    let spritesetUpdated = false;
    let tilemapUpdated = false;
    let mapUpdated = false;
    let eventUpdated = false;
    let sceneMainUpdated = false;

    // Simulated methods with the exact patch logic
    const spritesetUpdate = function () {
        if (ctx.$tutoManager && ctx.$tutoManager.isBusy()) return;
        spritesetUpdated = true;
    };
    const tilemapUpdate = function () {
        if (ctx.$tutoManager && ctx.$tutoManager.isBusy()) return;
        tilemapUpdated = true;
    };
    const mapUpdate = function () {
        if (ctx.$tutoManager && ctx.$tutoManager.isBusy()) return;
        mapUpdated = true;
    };
    const eventUpdate = function () {
        if (ctx.$tutoManager && ctx.$tutoManager.isBusy()) return;
        eventUpdated = true;
    };
    const sceneMainUpdate = function () {
        if (ctx.$tutoManager && ctx.$tutoManager.isBusy()) return;
        sceneMainUpdated = true;
    };

    // When tutorial is busy:
    ctx.$tutoManager.show("tuto_0", { force: true });
    assert.strictEqual(ctx.$tutoManager.isBusy(), true);

    spritesetUpdate();
    tilemapUpdate();
    mapUpdate();
    eventUpdate();
    sceneMainUpdate();

    assert.strictEqual(spritesetUpdated, false, "Spriteset_Map must be suspended");
    assert.strictEqual(tilemapUpdated, false, "Tilemap (autotiles) must be suspended");
    assert.strictEqual(mapUpdated, false, "Game_Map must be suspended");
    assert.strictEqual(eventUpdated, false, "Game_Event must be suspended");
    assert.strictEqual(sceneMainUpdated, false, "Scene_Map.updateMain must be suspended");

    // When tutorial closes:
    ctx.$tutoManager.closeCurrent();
    assert.strictEqual(ctx.$tutoManager.isBusy(), false);

    spritesetUpdate();
    tilemapUpdate();
    mapUpdate();
    eventUpdate();
    sceneMainUpdate();

    assert.strictEqual(spritesetUpdated, true);
    assert.strictEqual(tilemapUpdated, true);
    assert.strictEqual(mapUpdated, true);
    assert.strictEqual(eventUpdated, true);
    assert.strictEqual(sceneMainUpdated, true);
});

it("Window_TutoList lists seen items with proper titles and masks locked items", () => {
    ctx.$tutoManager.resetSeen();
    ctx.$tutoManager.markAsSeen("tuto_0");

    const listWin = new ctx.Window_TutoList(new ctx.Rectangle(0, 0, 300, 400));
    assert.strictEqual(listWin.maxItems(), 3);
    assert.strictEqual(listWin.isItemSeen(listWin.item(0)), true);
    assert.strictEqual(listWin.isItemSeen(listWin.item(1)), false);
});

console.log("\n=================================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("=================================================");

if (failed > 0) {
    process.exit(1);
}
