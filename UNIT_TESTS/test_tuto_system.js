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
        this.context = {
            save: () => { },
            restore: () => { },
            beginPath: () => { },
            closePath: () => { },
            moveTo: () => { },
            lineTo: () => { },
            fill: () => { },
            stroke: () => { }
        };
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
            url: folder + name + ".png",
            width: 48,
            height: 48,
            isReady: () => true
        }),
        loadBitmapFromUrl: (url) => ({
            url: url,
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
        isTriggered: () => false,
        isPressed: () => false,
        clear: function () { this.cleared = true; },
        cleared: false
    },
    ConfigManager: {
        contextualHelp: true,
        saved: false,
        save: function () {
            this.saved = true;
        },
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
    $gameMessage: {
        _busy: false,
        isBusy: function () { return Boolean(this._busy); }
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
    this.scale = { x: 1, y: 1 };
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

// Load SC4_Sprite_NeonArrowBase.js & SC4_Sprite_TutoArrow.js
const baseArrowCode = fs.readFileSync(path.join(__dirname, "../js/plugins/SC4_Sprite_NeonArrowBase.js"), "utf8");
vm.runInNewContext(baseArrowCode, ctx);
const tutoArrowCode = fs.readFileSync(path.join(__dirname, "../js/plugins/SC4_Sprite_TutoArrow.js"), "utf8");
vm.runInNewContext(tutoArrowCode, ctx);

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

it("Calling showTuto() twice in a row in a script call enqueues the second tutorial", () => {
    ctx.$tutoManager.resetSeen();

    // Simulation d'un appel de script séquentiel : showTuto(1); showTuto(2);
    const firstCall = ctx.window.showTuto(1);
    const secondCall = ctx.window.showTuto(2);

    assert.strictEqual(firstCall, true, "First tutorial call succeeds");
    assert.strictEqual(secondCall, true, "Second tutorial call succeeds and is queued");

    // Le premier didacticiel est actif, le second est en file d'attente (_queue)
    assert.strictEqual(ctx.$tutoManager.isBusy(), true);
    assert.strictEqual(ctx.$tutoManager.currentTuto().id, 1);
    assert.strictEqual(ctx.$tutoManager._queue.length, 1);
    assert.strictEqual(ctx.$tutoManager._queue[0].id, 2);

    // Fermeture du premier : le second s'affiche immédiatement
    ctx.$tutoManager.closeCurrent();
    assert.strictEqual(ctx.$tutoManager.currentTuto().id, 2);
    assert.strictEqual(ctx.$tutoManager._queue.length, 0);

    // Fermeture du second : libération complète
    ctx.$tutoManager.closeCurrent();
    assert.strictEqual(ctx.$tutoManager.currentTuto(), null);
    assert.strictEqual(ctx.$tutoManager.isBusy(), false);
});

it("Game_Interpreter.prototype.showTuto and showTutos delegate to $tutoManager", () => {
    // Lecture de la méthode Game_Interpreter dans SC4_rmmz_objects_Patches.js
    const objectsCode = fs.readFileSync(path.join(__dirname, "../js/plugins/SC4_rmmz_objects_Patches.js"), "utf8");
    assert.ok(objectsCode.includes("Game_Interpreter.prototype.showTuto = function"), "showTuto must be patched on Game_Interpreter");
    assert.ok(objectsCode.includes("Game_Interpreter.prototype.showTutos = function"), "showTutos must be patched on Game_Interpreter");

    ctx.$tutoManager.resetSeen();
    ctx.window.showTuto(1);
    ctx.window.showTuto(2);

    assert.strictEqual(ctx.$tutoManager.currentTuto().id, 1);
    assert.strictEqual(ctx.$tutoManager._queue.length, 1);
    assert.strictEqual(ctx.$tutoManager._queue[0].id, 2);
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

it("showTutos queues multiple tutorials from an array of IDs and objects", () => {
    ctx.$tutoManager.resetSeen();
    const count = ctx.$tutoManager.showTutos([
        1,
        "tuto_sector",
        { id: "tuto_1", data: { iconIndex: 3, width: 580 } }
    ]);

    assert.strictEqual(count, 3);
    assert.strictEqual(ctx.$tutoManager.isBusy(), true);
    assert.strictEqual(ctx.$tutoManager.currentTuto().id, 1);

    // Verify properties of the 3rd item in queue
    const third = ctx.$tutoManager._queue[1]; // [0] is tuto_sector, [1] is tuto_1
    assert.strictEqual(third.key, "tuto_1");
    assert.strictEqual(third.iconIndex, 3);
    assert.strictEqual(third.width, 580);
});

it("Resolves iconIndex with correct priority (call data > json data > default 0)", () => {
    ctx.$tutoManager.resetSeen();

    // Default iconIndex is 0
    ctx.$tutoManager.show("tuto_0", { force: true });
    assert.strictEqual(ctx.$tutoManager.currentTuto().iconIndex, 0);

    // Call data overrides
    ctx.$tutoManager.show("tuto_0", { force: true, iconIndex: 4 });
    const lastTuto = ctx.$tutoManager._queue[ctx.$tutoManager._queue.length - 1];
    assert.strictEqual(lastTuto.iconIndex, 4);
});

it("Resolves title via tutoName_[ID] in localization or raw key if missing", () => {
    ctx.$tutoManager.resetSeen();

    // Mock dictionary lookup in SC4_Localization
    const dict = {
        "tutoName_1": "Déplacements"
    };
    const origGetText = ctx.SC4_Localization.getText;
    ctx.SC4_Localization.getText = (k, def) => (dict[k] !== undefined ? dict[k] : (def || k));

    // Tuto 1 has translation "tutoName_1" -> "Déplacements"
    ctx.$tutoManager.show(1, { force: true });
    assert.strictEqual(ctx.$tutoManager.currentTuto().name, "Déplacements");

    // Tuto 2 has NO translation -> displays "tutoName_2"
    ctx.$tutoManager.closeCurrent();
    ctx.$tutoManager.show(2, { force: true });
    assert.strictEqual(ctx.$tutoManager.currentTuto().name, "tutoName_2");

    // Explicit name in call data overrides localization
    ctx.$tutoManager.closeCurrent();
    ctx.$tutoManager.show(2, { name: "Custom Title", force: true });
    assert.strictEqual(ctx.$tutoManager.currentTuto().name, "Custom Title");

    ctx.SC4_Localization.getText = origGetText;
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
    assert.strictEqual(arrow._arrowWidth, 30);
    assert.strictEqual(arrow._arrowHeight, 56);
    assert.ok(arrow.bitmap, "Arrow must have a generated Canvas Bitmap");
    assert.strictEqual(arrow.bitmap.width, 30);
    assert.strictEqual(arrow.bitmap.height, 56);
    assert.strictEqual(arrow.bitmap.context.fillStyle, "rgba(0, 255, 136, 0.8)", "Neon green cyberpunk fillStyle");
    assert.strictEqual(arrow.bitmap.context.shadowColor, "#00ff88", "Neon green glow");

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

it("Supports illustrations with .jpg, .jpeg, .webp, and .png extensions", () => {
    const arrow = new ctx.Sprite_TutoArrow();
    const win = new ctx.Window_Tuto(arrow);

    // Test with .jpg
    win.openTuto({
        id: 99,
        name: "Test JPG",
        txt: "Test.",
        img: "illustration.jpg"
    });
    assert.strictEqual(win._illustrationBitmap.url, "img/GUI/tuto/illustration.jpg");

    // Test with .png
    win.openTuto({
        id: 99,
        name: "Test PNG",
        txt: "Test.",
        img: "illustration.png"
    });
    assert.strictEqual(win._illustrationBitmap.url, "img/GUI/tuto/illustration.png");

    // Test without extension (defaults to .png)
    win.openTuto({
        id: 99,
        name: "Test Raw",
        txt: "Test.",
        img: "illustration"
    });
    assert.strictEqual(win._illustrationBitmap.url, "img/GUI/tuto/illustration.png");
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

    assert.strictEqual(win.width, 520, "Window width should be default 520px");
    assert.ok(win.height >= 160, "Window height must fit lines + image + prompt");

    // Custom width override
    win.openTuto({
        id: 1,
        name: "Déplacement Large",
        txt: "Petit test",
        width: 600
    });
    assert.strictEqual(win.width, 600, "Window width should respect custom width parameter");

    // Name window placement and structure (aligned to parent in WindowLayer)
    assert.ok(win._nameWindow, "Window_Tuto must have a _nameWindow companion");
    assert.strictEqual(win._nameWindow.x, win.x, "Name window X must align to Window_Tuto X");
    assert.strictEqual(win._nameWindow.y, win.y - win._nameWindow.height + 8, "Name window Y must overlap parent by 8px");
    assert.ok(win._nameWindow.width > 0, "Name window width must adapt to icon + text");
});

it("Guarantees Window_Tuto is fully contained inside screen bounds and never overflows", () => {
    const win = new ctx.Window_Tuto();
    const boxW = ctx.Graphics.boxWidth;  // 1280
    const boxH = ctx.Graphics.boxHeight; // 720

    // Test 1: Target near bottom edge (would cause y + height > boxH)
    win.openTuto({
        id: 1,
        name: "Test Bottom",
        txt: "Ligne 1\nLigne 2\nLigne 3",
        coord: { x: 640, y: 700 }
    });
    assert.ok(win.y + win.height <= boxH, `Window bottom (${win.y + win.height}) must not exceed boxH (${boxH})`);
    const nameH1 = win._nameWindow.height;
    assert.ok(win.y - (nameH1 - 8) >= 0, "Title top must not exceed screen top (y:0)");

    // Test 2: Target near right edge (would cause x + width > boxW)
    win.openTuto({
        id: 1,
        name: "Test Right",
        txt: "Ligne 1",
        coord: { x: 1260, y: 300 }
    });
    assert.ok(win.x + win.width <= boxW, `Window right (${win.x + win.width}) must not exceed boxW (${boxW})`);
    assert.ok(win.x >= 0, "Window left must not exceed screen left (x:0)");

    // Test 3: Target near left edge (would cause x < 0)
    win.openTuto({
        id: 1,
        name: "Test Left",
        txt: "Ligne 1",
        coord: { x: 20, y: 300 }
    });
    assert.ok(win.x >= 0, `Window X (${win.x}) must be >= 0`);
});

it("Aligns Window_Tuto with position keywords and configurable padding", () => {
    const win = new ctx.Window_Tuto();
    const boxW = ctx.Graphics.boxWidth;  // 1280
    const boxH = ctx.Graphics.boxHeight; // 720

    // 1. Default padding is 12px
    assert.strictEqual(win.getPadding(), 12, "Default padding must be 12px");
    win.setPadding(16);
    assert.strictEqual(win.getPadding(), 16, "setPadding updates padding");
    win.setPadding(12);

    // 2. Position "top" (centered horizontally, 12px from top taking title height into account)
    win.openTuto({
        id: 1,
        name: "Test Top",
        txt: "Texte en haut.",
        position: "top"
    });
    const nameH = win._nameWindow.height;
    const topPadding = Math.max(0, nameH - 8);
    assert.strictEqual(win.x, Math.round((boxW - win.width) / 2), "X must be centered for 'top'");
    assert.strictEqual(win.y, 12 + topPadding, "Y must be 12px + topPadding so title aligns at 12px from top");

    // 3. Position "bottom-right"
    win.openTuto({
        id: 1,
        name: "Test BR",
        txt: "Texte en bas à droite.",
        position: "bottom-right"
    });
    assert.strictEqual(win.x, boxW - win.width - 12, "X must be 12px from right edge");
    assert.strictEqual(win.y, boxH - win.height - 12, "Y must be 12px from bottom edge");

    // 4. Position "top-left"
    win.openTuto({
        id: 1,
        name: "Test TL",
        txt: "Texte en haut à gauche.",
        position: "top-left"
    });
    assert.strictEqual(win.x, 12, "X must be 12px from left edge");
    assert.strictEqual(win.y, 12 + topPadding, "Y must be 12px from top edge");

    // 5. Position "middle-right"
    win.openTuto({
        id: 1,
        name: "Test MR",
        txt: "Texte au milieu à droite.",
        position: "middle-right"
    });
    assert.strictEqual(win.x, boxW - win.width - 12, "X must be 12px from right edge");
    assert.strictEqual(win.y, Math.round((boxH - win.height) / 2), "Y must be centered vertically");

    // 6. Custom padding in call data
    win.openTuto({
        id: 1,
        name: "Test Custom Pad",
        txt: "Texte avec padding 24px.",
        position: "bottom",
        padding: 24
    });
    assert.strictEqual(win.getPadding(), 24);
    assert.strictEqual(win.y, boxH - win.height - 24, "Y must be 24px from bottom edge");
});

it("Accepts string position as second argument in showTuto('key', 'top')", () => {
    ctx.$tutoManager.resetSeen();
    const result = ctx.window.showTuto("tuto_0", "top");
    assert.strictEqual(result, true);
    assert.strictEqual(ctx.$tutoManager.currentTuto().position, "top");
});

it("Provides a disable button and opens confirmation without closing the tutorial", () => {
    const win = new ctx.Window_Tuto();
    win.openTuto({ id: 1, key: "tuto_0", name: "Tuto", txt: "Message de test." });

    assert.ok(win._disableButtonSprite, "Must have _disableButtonSprite child");
    assert.ok(win._confirmWindow, "Must have _confirmWindow child");
    assert.strictEqual(win._confirmWindow.openness, 0);

    // Button position check
    assert.strictEqual(win._disableButtonSprite.x, win.padding + 6);
    assert.strictEqual(win._disableButtonSprite.y, win.height - win.padding - 4);

    // Simulate mouse hover over disable button
    const btnScreenX = win.x + win._disableButtonSprite.x + 10;
    const btnScreenY = win.y + win._disableButtonSprite.y - 12;
    ctx.TouchInput.x = btnScreenX;
    ctx.TouchInput.y = btnScreenY;
    assert.strictEqual(win.isDisableButtonHovered(), true);

    // Simulate click on disable button
    ctx.TouchInput.isTriggered = () => true;
    win.update();
    ctx.TouchInput.isTriggered = () => false;

    // Confirm window is now opened and active
    assert.strictEqual(win._confirmWindow.openness, 255);
    assert.strictEqual(win._confirmWindow.active, true);
    assert.strictEqual(win._confirmWindow.index(), 1); // Defaults to 'Annuler'

    // Crucial check: Window_Tuto MUST remain OPEN!
    assert.strictEqual(win.openness, 255);
    assert.strictEqual(win.visible, true);
});

it("Canceling confirmation keeps Window_Tuto open, and subsequent click closes tutorial", () => {
    const win = new ctx.Window_Tuto();
    ctx.$tutoManager.resetSeen();
    ctx.$tutoManager.show("tuto_0");
    win.openTuto(ctx.$tutoManager.currentTuto());

    // Open confirmation
    win.openConfirmWindow();
    assert.strictEqual(win._confirmWindow.openness, 255);
    assert.strictEqual(win.openness, 255);

    // Player cancels (chooses 'Annuler' / Escape)
    win.onConfirmCancel();
    assert.strictEqual(win._confirmWindow.openness, 0);

    // Window_Tuto is STILL open and reactivated
    assert.strictEqual(win.openness, 255);
    assert.strictEqual(win.active, true);

    // Now player clicks to close the tutorial as normal
    ctx.TouchInput.x = 0;
    ctx.TouchInput.y = 0;
    ctx.Input.isTriggered = (key) => key === "ok";
    win.update();
    ctx.Input.isTriggered = () => false;

    // Window_Tuto closes normally
    assert.strictEqual(win.openness, 0);
});

it("Validating confirmation disables contextualHelp in ConfigManager and closes Window_Tuto", () => {
    const win = new ctx.Window_Tuto();
    ctx.ConfigManager.contextualHelp = true;
    ctx.ConfigManager.saved = false;
    ctx.$tutoManager.resetSeen();
    ctx.$tutoManager.show("tuto_0");
    ctx.$tutoManager.show("tuto_1");
    win.openTuto(ctx.$tutoManager.currentTuto());

    // Open confirmation
    win.openConfirmWindow();
    assert.strictEqual(win._confirmWindow.openness, 255);

    // Player validates 'Désactiver'
    win.onConfirmDisable();

    // Confirm and tutorial windows close
    assert.strictEqual(win._confirmWindow.openness, 0);
    assert.strictEqual(win.openness, 0);

    // ConfigManager has been updated and saved
    assert.strictEqual(ctx.ConfigManager.contextualHelp, false);
    assert.strictEqual(ctx.ConfigManager.saved, true);

    // TutoManager queue emptied and no longer busy
    assert.strictEqual(ctx.$tutoManager.isBusy(), false);

    // Further attempts to show tutorials fail because contextualHelp is false
    const res = ctx.$tutoManager.show("tuto_sector");
    assert.strictEqual(res, false);

    // Reset for next test runs
    ctx.ConfigManager.contextualHelp = true;
});

it("Clamps Sprite_TutoArrow to 8px screen edge and points towards off-screen map targets", () => {
    const arrow = new ctx.Sprite_TutoArrow();
    const boxW = ctx.Graphics.boxWidth;  // 1280
    const boxH = ctx.Graphics.boxHeight; // 720

    // Test 1: Target far to the right (xMap: 50 -> 50*48 + 24 = 2424px >> 1280)
    arrow.setup({ xMap: 50, yMap: 7 }); // yMap 7 = ~360px (middle of screen)
    arrow.update();

    // Arrow X must be clamped to border (maxX = 1280 - 8 = 1272) within bounce amplitude (8px)
    assert.ok(arrow.x >= 1260 && arrow.x <= 1280, `Arrow X (${arrow.x}) must sit on right edge (~1272)`);
    // Angle must point towards the right (dirAngle = 0, rad = 0 - PI/2 = -PI/2)
    assert.ok(Math.abs(arrow.rotation - (-Math.PI / 2)) < 0.1, "Arrow must point to the right");

    // Test 2: Target far to the left (xMap: -20 -> < 0)
    arrow.setup({ xMap: -20, yMap: 7 });
    arrow.update();
    assert.ok(arrow.x >= 0 && arrow.x <= 20, `Arrow X (${arrow.x}) must sit on left edge (~8)`);
    // Angle must point towards the left (dirAngle = PI, rad = PI - PI/2 = +PI/2)
    assert.ok(Math.abs(arrow.rotation - (Math.PI / 2)) < 0.1, "Arrow must point to the left");

    // Test 3: Target far below the screen (yMap: 50 -> 2424px >> 720)
    arrow.setup({ xMap: 13, yMap: 50 }); // xMap 13 = ~648px (middle of screen)
    arrow.update();
    assert.ok(arrow.y >= 700 && arrow.y <= 720, `Arrow Y (${arrow.y}) must sit on bottom edge (~712)`);
    // Angle must point downwards (dirAngle = PI/2, rad = PI/2 - PI/2 = 0)
    assert.ok(Math.abs(arrow.rotation) < 0.1, "Arrow must point downwards");
});

it("Preserves escape codes and color flags across line breaks in Window_Tuto", () => {
    let capturedText = null;
    let drawCallCount = 0;
    const win = new ctx.Window_Tuto();
    win.drawTextEx = function (text) {
        capturedText = text;
        drawCallCount++;
    };
    win.openTuto({ id: 99, txt: "Ligne 1 avec \\c[3]couleur verte qui dépasse\net continue sur la ligne 2" });

    // Doit appeler drawTextEx UNE SEULE FOIS avec tout le texte joint par \n
    assert.strictEqual(drawCallCount, 1, "drawTextEx ne doit être appelé qu'une seule fois pour préserver les états de police");
    assert.ok(capturedText.includes("\n"), "Le texte rendu doit contenir le saut de ligne \\n unifié");
    assert.ok(capturedText.includes("Ligne 1") && capturedText.includes("ligne 2"), "Toutes les lignes doivent être présentes dans l'appel unique");
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

console.log("\n--- Suite 4: Touch Release Guard & Click-to-Close Debouncing ---");

it("Calls TouchInput.clear() and activates Scene_Map touch release guard with cooldown on Window_Tuto close", () => {
    const sceneMap = {
        _touchReleaseGuard: false,
        _touchCooldown: 0,
        setTouchCoolDown: function (frames) { this._touchCooldown = frames; },
        activateTouchReleaseGuard: function (deadTimeFrames = 0) {
            this._touchReleaseGuard = true;
            if (deadTimeFrames > 0) this.setTouchCoolDown(deadTimeFrames);
        }
    };
    ctx.SceneManager._scene = sceneMap;

    const win = new ctx.Window_Tuto();
    ctx.$tutoManager.resetSeen();
    ctx.$tutoManager.show("tuto_0");
    win.openTuto(ctx.$tutoManager.currentTuto());

    ctx.TouchInput.cleared = false;
    ctx.TouchInput.isTriggered = () => true;

    // Simulate click on Window_Tuto
    win.update();

    ctx.TouchInput.isTriggered = () => false;

    // Must have cleared TouchInput, armed release guard and set 8-frame cooldown on Scene_Map
    assert.strictEqual(ctx.TouchInput.cleared, true);
    assert.strictEqual(sceneMap._touchReleaseGuard, true);
    assert.strictEqual(sceneMap._touchCooldown, 8);
});

it("Single Responsibility Methods: isTouchCoolDownOk() and isTouchReleaseGuardOk() work harmoniously", () => {
    const sceneMap = {
        _touchReleaseGuard: true,
        _touchCooldown: 3,
        setTouchCoolDown: function (frames) {
            this._touchCooldown = Math.max(0, Number(frames) || 0);
        },
        isTouchCoolDownOk: function () {
            if (this._touchCooldown && this._touchCooldown > 0) {
                this._touchCooldown--;
                return false;
            }
            return true;
        },
        isTouchReleaseGuardOk: function () {
            if (!this._touchReleaseGuard) return true;
            if (ctx.TouchInput.isPressed()) return false;
            this._touchReleaseGuard = false;
            return true;
        },
        isMapTouchOk: function () {
            if (ctx.$tutoManager && ctx.$tutoManager.isBusy()) return false;
            if (!this.isTouchCoolDownOk()) return false;
            if (!this.isTouchReleaseGuardOk()) return false;
            return true;
        }
    };

    let isPressedVal = true;
    ctx.TouchInput.isPressed = () => isPressedVal;

    // Frame 1: Cooldown is 3 -> 2, touch blocked
    assert.strictEqual(sceneMap.isMapTouchOk(), false);
    assert.strictEqual(sceneMap._touchCooldown, 2);

    // Frame 2: Cooldown is 2 -> 1, touch blocked
    assert.strictEqual(sceneMap.isMapTouchOk(), false);
    assert.strictEqual(sceneMap._touchCooldown, 1);

    // Frame 3: Cooldown is 1 -> 0, touch blocked
    assert.strictEqual(sceneMap.isMapTouchOk(), false);
    assert.strictEqual(sceneMap._touchCooldown, 0);

    // Frame 4: Cooldown is 0 (isTouchCoolDownOk() returns true), but mouse is still pressed!
    // isTouchReleaseGuardOk() must continue to block
    assert.strictEqual(sceneMap.isTouchCoolDownOk(), true);
    assert.strictEqual(sceneMap.isMapTouchOk(), false, "Must block touch while mouse button is held down even after cooldown");
    assert.strictEqual(sceneMap._touchReleaseGuard, true, "Guard remains active");

    // Frame 5: Player physically releases the mouse button
    isPressedVal = false;
    assert.strictEqual(sceneMap.isTouchReleaseGuardOk(), true, "Guard disarms and returns true");
    assert.strictEqual(sceneMap._touchReleaseGuard, false, "Guard state must be reset to false");

    // Frame 6+: Map touch operates normally
    assert.strictEqual(sceneMap.isMapTouchOk(), true, "Next touch inputs must pass normally");
});

console.log("\n--- Suite 5: Message Window Wait & Auto-Resume ---");

it("isMessageActive() correctly detects $gameMessage and Window_Message states", () => {
    // 1. Both inactive
    ctx.$gameMessage._busy = false;
    ctx.SceneManager._scene = {
        _messageWindow: { isClosed: () => true }
    };
    assert.strictEqual(ctx.$tutoManager.isMessageActive(), false);

    // 2. $gameMessage is busy
    ctx.$gameMessage._busy = true;
    assert.strictEqual(ctx.$tutoManager.isMessageActive(), true);

    // 3. $gameMessage busy is false, but Window_Message is still open/closing
    ctx.$gameMessage._busy = false;
    ctx.SceneManager._scene._messageWindow.isClosed = () => false;
    assert.strictEqual(ctx.$tutoManager.isMessageActive(), true);

    // 4. Window_Message finishes closing
    ctx.SceneManager._scene._messageWindow.isClosed = () => true;
    assert.strictEqual(ctx.$tutoManager.isMessageActive(), false);
});

it("Tuto remains queued when message window is active and does not open Window_Tuto", () => {
    let openedTutoData = null;
    ctx.SceneManager._scene = {
        _messageWindow: { isClosed: () => false },
        _tutoWindow: {
            openTuto: (data) => { openedTutoData = data; }
        }
    };
    ctx.$gameMessage._busy = true;
    ctx.$tutoManager.resetSeen();

    // Trigger tutorial while message is active
    const result = ctx.$tutoManager.show("tuto_0", { force: true });
    assert.strictEqual(result, true);
    assert.strictEqual(ctx.$tutoManager.currentTuto(), null, "Current tuto must remain null while message is busy");
    assert.strictEqual(ctx.$tutoManager.isBusy(), false, "isBusy must be false while waiting for message to avoid freezing map");
    assert.strictEqual(ctx.$tutoManager.hasQueue(), true, "Queue must contain the pending tutorial");
    assert.strictEqual(ctx.$tutoManager.isWaitingForMessage(), true, "Must flag waiting for message");
    assert.strictEqual(openedTutoData, null, "Window_Tuto must not be opened while message window is active");

    // Simulate update cycles during dialog
    ctx.$tutoManager.update();
    ctx.$tutoManager.update();
    assert.strictEqual(ctx.$tutoManager.currentTuto(), null);
    assert.strictEqual(openedTutoData, null);
});

it("Tuto automatically opens upon message completion and Window_Message close", () => {
    let openedTutoData = null;
    ctx.SceneManager._scene = {
        _messageWindow: { isClosed: () => false },
        _tutoWindow: {
            openTuto: (data) => { openedTutoData = data; }
        }
    };
    ctx.$gameMessage._busy = true;
    ctx.$tutoManager.resetSeen();
    ctx.$tutoManager.show("tuto_0", { force: true });

    assert.strictEqual(ctx.$tutoManager.isWaitingForMessage(), true);

    // Message dialog ends: $gameMessage clears, message window closes
    ctx.$gameMessage._busy = false;
    ctx.SceneManager._scene._messageWindow.isClosed = () => true;
    assert.strictEqual(ctx.$tutoManager.isMessageActive(), false);

    // Next frame update triggers queued tutorial
    ctx.$tutoManager.update();

    assert.strictEqual(ctx.$tutoManager.currentTuto() !== null, true);
    assert.strictEqual(ctx.$tutoManager.currentTuto().key, "tuto_0");
    assert.strictEqual(ctx.$tutoManager.isBusy(), true, "isBusy becomes true once tutorial is visually opened");
    assert.strictEqual(ctx.$tutoManager.hasQueue(), false);
    assert.strictEqual(openedTutoData !== null, true);
    assert.strictEqual(openedTutoData.key, "tuto_0");
});

it("closeCurrent() defers second queued tutorial if message window becomes active", () => {
    let openedTutos = [];
    ctx.SceneManager._scene = {
        _messageWindow: { isClosed: () => true },
        _tutoWindow: {
            openTuto: (data) => { openedTutos.push(data.key); }
        }
    };
    ctx.$gameMessage._busy = false;
    ctx.$tutoManager.resetSeen();

    // Show tuto_0 and tuto_1
    ctx.$tutoManager.show("tuto_0", { force: true });
    ctx.$tutoManager.show("tuto_1", { force: true });

    assert.strictEqual(ctx.$tutoManager.currentTuto().key, "tuto_0");
    assert.strictEqual(ctx.$tutoManager._queue.length, 1);
    assert.strictEqual(openedTutos.length, 1);
    assert.strictEqual(openedTutos[0], "tuto_0");

    // An in-game message becomes active before the first tutorial is closed
    ctx.$gameMessage._busy = true;
    ctx.SceneManager._scene._messageWindow.isClosed = () => false;

    // Player closes first tutorial
    ctx.$tutoManager.closeCurrent();

    // Second tutorial must NOT open yet: it remains in queue waiting for message
    assert.strictEqual(ctx.$tutoManager.currentTuto(), null);
    assert.strictEqual(ctx.$tutoManager._queue.length, 1);
    assert.strictEqual(ctx.$tutoManager.isWaitingForMessage(), true);
    assert.strictEqual(openedTutos.length, 1, "tuto_1 must not be opened yet");

    // Message closes
    ctx.$gameMessage._busy = false;
    ctx.SceneManager._scene._messageWindow.isClosed = () => true;

    // TutoManager updates on next frame
    ctx.$tutoManager.update();

    assert.strictEqual(ctx.$tutoManager.currentTuto().key, "tuto_1");
    assert.strictEqual(openedTutos.length, 2);
    assert.strictEqual(openedTutos[1], "tuto_1");
});

it("Scene_Map.prototype.update invokes $tutoManager.update()", () => {
    const scenesCode = fs.readFileSync(path.join(__dirname, "../js/plugins/SC4_rmmz_scenes_Patches.js"), "utf8");
    assert.ok(scenesCode.includes("window.$tutoManager.update()"), "Scene_Map.prototype.update must call $tutoManager.update()");
});

console.log("\n=================================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("=================================================");

if (failed > 0) {
    process.exit(1);
}
