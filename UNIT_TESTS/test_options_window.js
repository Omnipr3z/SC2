//=============================================================================
// test_options_window.js
// Unit tests for SC4 Scene_Options & Window_Options Dynamic Dimensions
//=============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("=================================================");
console.log("  TEST SUITE: SC4 Options Window & Scene Sizing   ");
console.log("=================================================");

const ctx = {
    console: console,
    Math: Math,
    String: String,
    Number: Number,
    Array: Array,
    Object: Object,
    Boolean: Boolean,
    Rectangle: function (x, y, w, h) {
        this.x = x || 0; this.y = y || 0; this.width = w || 0; this.height = h || 0;
    },
    Graphics: {
        boxWidth: 1760,
        boxHeight: 990
    },
    ConfigManager: {
        save: () => {}
    },
    SceneManager: {
        pop: () => {}
    },
    SoundManager: {},
    ImageManager: {},
    EffectManager: {},
    DataManager: {},
    TouchInput: {
        clear: () => {}
    },
    PluginManager: {
        registerCommand: () => {},
        parameters: () => ({})
    }
};

ctx.window = ctx;

// Minimal RMMZ Hierarchy
ctx.Scene_Base = function () {};
ctx.Scene_Base.prototype.initialize = function () {};
ctx.Scene_Base.prototype.addWindow = function (w) { this._children = this._children || []; this._children.push(w); };

ctx.Scene_MenuBase = function () {};
ctx.Scene_MenuBase.prototype = Object.create(ctx.Scene_Base.prototype);
ctx.Scene_MenuBase.prototype.constructor = ctx.Scene_MenuBase;
ctx.Scene_MenuBase.prototype.calcWindowHeight = function (numLines, selectable) {
    return numLines * 36 + 24; // 36px line height + 24px padding (12 * 2)
};

ctx.Scene_Options = function () {};
ctx.Scene_Options.prototype = Object.create(ctx.Scene_MenuBase.prototype);
ctx.Scene_Options.prototype.constructor = ctx.Scene_Options;
ctx.Scene_Options.prototype.popScene = function () {};
ctx.Scene_Options.prototype.createOptionsWindow = function () {
    const rect = this.optionsWindowRect();
    this._optionsWindow = new ctx.Window_Options(rect);
    this._optionsWindow.setHandler("cancel", this.popScene.bind(this));
    this.addWindow(this._optionsWindow);
};
ctx.Scene_Options.prototype.optionsWindowRect = function () {
    const n = Math.min(this.maxCommands(), this.maxVisibleCommands());
    const ww = 400;
    const wh = this.calcWindowHeight(n, true);
    const wx = (ctx.Graphics.boxWidth - ww) / 2;
    const wy = (ctx.Graphics.boxHeight - wh) / 2;
    return new ctx.Rectangle(wx, wy, ww, wh);
};
ctx.Scene_Options.prototype.maxCommands = function () { return 7; };
ctx.Scene_Options.prototype.maxVisibleCommands = function () { return 12; };

// Mock Window_Options
ctx.Window_Base = function () {};
ctx.Window_Base.prototype.initialize = function () {};

ctx.Window_Options = function (rect) {
    this.x = rect.x;
    this.y = rect.y;
    this.width = rect.width;
    this.height = rect.height;
    this._handlers = {};
    this._mockItemsCount = 12; // 12 commands by default in SC4
};
ctx.Window_Options.prototype = Object.create(ctx.Window_Base.prototype);
ctx.Window_Options.prototype.constructor = ctx.Window_Options;
ctx.Window_Options.prototype.setHandler = function (sym, fn) { this._handlers[sym] = fn; };
ctx.Window_Options.prototype.maxItems = function () { return this._mockItemsCount; };
ctx.Window_Options.prototype.move = function (x, y, w, h) {
    this.x = x; this.y = y; this.width = w; this.height = h;
};

// Mock other scenes for SC4_rmmz_scenes_Patches.js
ctx.Scene_Boot = function () {};
ctx.Scene_Boot.prototype = Object.create(ctx.Scene_Base.prototype);
ctx.Scene_Title = function () {};
ctx.Scene_Title.prototype = Object.create(ctx.Scene_Base.prototype);
ctx.Scene_Message = function () {};
ctx.Scene_Message.prototype = Object.create(ctx.Scene_Base.prototype);
ctx.Scene_Message.prototype.createMessageWindow = function () {};
ctx.Scene_Map = function () {};
ctx.Scene_Map.prototype = Object.create(ctx.Scene_Message.prototype);
ctx.Scene_Map.prototype.processMapTouch = function () {};
ctx.Scene_Map.prototype.isMenuEnabled = function () { return true; };
ctx.Scene_Map.prototype.isPlayerActive = function () { return true; };
ctx.Scene_Menu = function () {};
ctx.Scene_Menu.prototype = Object.create(ctx.Scene_MenuBase.prototype);
ctx.Scene_Item = function () {};
ctx.Scene_Item.prototype = Object.create(ctx.Scene_MenuBase.prototype);
ctx.Scene_Item.prototype.create = function () {};
ctx.Scene_Item.prototype.item = function () { return null; };
ctx.Scene_Item.prototype.useItem = function () {};

// Load SC4_rmmz_scenes_Patches.js
const scenesPatchesCode = fs.readFileSync(path.join(__dirname, "../js/plugins/SC4_rmmz_scenes_Patches.js"), "utf8");
vm.runInNewContext(scenesPatchesCode, ctx);

let passed = 0;
let failed = 0;

function it(desc, fn) {
    try {
        fn();
        console.log(`  ✓ ${desc}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${desc}`);
        console.error(`    ${err.message}`);
        failed++;
    }
}

console.log("\n--- Suite 1: Scene_Options Dimensions & Capacity ---");

it("Scene_Options.prototype.maxCommands returns 30 (not legacy 7)", () => {
    const scene = new ctx.Scene_Options();
    assert.strictEqual(scene.maxCommands(), 30);
});

it("Scene_Options.prototype.maxVisibleCommands calculates dynamic capacity with 16px margins", () => {
    const scene = new ctx.Scene_Options();
    ctx.Graphics.boxHeight = 990;
    // maxH = 990 - 32 = 958. (958 - 24) / 36 = 25.94 -> 25
    assert.strictEqual(scene.maxVisibleCommands(), 25);
});

it("Scene_Options.prototype.optionsWindowRect sets ww to 560 and respects 16px max top/bottom margin", () => {
    const scene = new ctx.Scene_Options();
    ctx.Graphics.boxWidth = 1760;
    ctx.Graphics.boxHeight = 990;

    const rect = scene.optionsWindowRect();
    assert.strictEqual(rect.width, 560);
    assert.strictEqual(rect.x, Math.round((1760 - 560) / 2)); // 600

    // Margin top and bottom must be at least 16px
    assert.ok(rect.y >= 16);
    assert.ok(rect.height <= 990 - 32);
});

console.log("\n--- Suite 2: Dynamic Content Adaptation (12 items vs 30 items) ---");

it("Adapts window height precisely to 12 items (456px) without vertical dead space", () => {
    const scene = new ctx.Scene_Options();
    ctx.Graphics.boxWidth = 1760;
    ctx.Graphics.boxHeight = 990;

    scene.createOptionsWindow();
    const win = scene._optionsWindow;

    // 12 items: 12 * 36 + 24 = 456px
    assert.strictEqual(win.height, 456);
    // Vertically centered: (990 - 456) / 2 = 267
    assert.strictEqual(win.y, 267);
});

it("Clamps window height to boxHeight - 32 (leaving 16px top/bottom) when content exceeds screen", () => {
    const scene = new ctx.Scene_Options();
    ctx.Graphics.boxWidth = 1760;
    ctx.Graphics.boxHeight = 990;

    // Simulate 35 items
    ctx.Window_Options.prototype.maxItems = () => 35;

    scene.createOptionsWindow();
    const win = scene._optionsWindow;

    const maxH = 990 - 32; // 958px
    assert.strictEqual(win.height, maxH);
    // Margins must be exactly 16px
    assert.strictEqual(win.y, 16);
    assert.strictEqual(ctx.Graphics.boxHeight - (win.y + win.height), 16);
});

console.log("\n--- Suite 3: Lower Resolution Responsiveness ---");

it("Responsive on 1280x720: clamps properly leaving 16px margin max", () => {
    const scene = new ctx.Scene_Options();
    ctx.Graphics.boxWidth = 1280;
    ctx.Graphics.boxHeight = 720;

    // 12 items: 456px fits in 720 - 32 = 688px
    ctx.Window_Options.prototype.maxItems = () => 12;
    scene.createOptionsWindow();
    const win12 = scene._optionsWindow;
    assert.strictEqual(win12.height, 456);
    assert.strictEqual(win12.y, Math.round((720 - 456) / 2)); // 132

    // 25 items: 25 * 36 + 24 = 924px > 688px -> capped at 688px with 16px margins
    ctx.Window_Options.prototype.maxItems = () => 25;
    scene.createOptionsWindow();
    const win25 = scene._optionsWindow;
    assert.strictEqual(win25.height, 688);
    assert.strictEqual(win25.y, 16);
});

console.log("\n=================================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("=================================================");

if (failed > 0) process.exit(1);
