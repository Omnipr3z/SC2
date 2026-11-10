//=============================================================================
// test_fullscreen_option.js
// Unit tests for SimCraft 4 Fullscreen Config & Options Window Integration
//=============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("=================================================");
console.log("  TEST SUITE: SC4 Fullscreen Option & Config     ");
console.log("=================================================");

let isFullScreenState = false;
let requestFullScreenCalled = false;
let cancelFullScreenCalled = false;

// Simulated RMMZ browser context
const ctx = {
    console: console,
    Math: Math,
    String: String,
    Number: Number,
    Array: Array,
    Object: Object,
    Boolean: Boolean,
    setTimeout: (fn, ms) => { fn(); },
    Bitmap: function () {},
    Rectangle: function (x, y, w, h) {
        this.x = x || 0; this.y = y || 0; this.width = w || 0; this.height = h || 0;
    },
    Graphics: {
        _isFullScreen: () => isFullScreenState,
        _requestFullScreen: () => {
            isFullScreenState = true;
            requestFullScreenCalled = true;
        },
        _cancelFullScreen: () => {
            isFullScreenState = false;
            cancelFullScreenCalled = true;
        },
        _switchFullScreen: function () {
            if (this._isFullScreen()) {
                this._cancelFullScreen();
            } else {
                this._requestFullScreen();
            }
        }
    },
    Input: {
        keyMapper: {}
    },
    TouchInput: {
        clear: () => {}
    },
    PluginManager: {
        registerCommand: () => {},
        parameters: () => ({})
    },
    Utils: {
        approach: (c, t, s) => c < t ? Math.min(t, c + s) : Math.max(t, c - s),
        isNwjs: () => true
    },
    SoundManager: {
        playCursor: () => {},
        playOk: () => {},
        playCancel: () => {},
        preloadImportantSounds: () => {}
    },
    TextManager: {
        basic: (id) => "",
        param: (id) => "",
        command: (id) => "",
        message: (id) => ""
    },
    Tilemap: {
        prototype: {
            update: () => {}
        }
    },
    ConfigManager: {
        saved: false,
        save: function () { this.saved = true; },
        makeData: function () { return {}; },
        applyData: function () {}
    },
    SC4_Localization: {
        locale: () => "FR",
        setLocale: () => {},
        getText: (key, def) => {
            if (key === "options.fullscreen") return "Plein écran (F4)";
            if (key === "options.language") return "Langue";
            if (key === "options.contextualHelp") return "Aide contextuelle";
            return def || key;
        },
        parse: (t) => t || ""
    },
    Window_Base: function () { this.initialize(...arguments); },
    Window_Selectable: function () { this.initialize(...arguments); },
    Window_Command: function () { this.initialize(...arguments); },
    Window_Options: function () { this.initialize(...arguments); },
    Window_StatusBase: function () {},
    Window_MenuCommand: function () {},
    Window_TitleCommand: function () {},
    Window_Message: function () {},
    Window_ChoiceList: function () {},
    Window_NameBox: function () {},
    Scene_Base: function () {},
    Scene_Boot: function () {},
    Scene_Title: function () {},
    SceneManager: {
        goto: () => {}
    },
    DataManager: {
        isBattleTest: () => false,
        isEventTest: () => false
    }
};

ctx.Window_Base.prototype.initialize = function () {};
ctx.Window_Selectable.prototype = Object.create(ctx.Window_Base.prototype);
ctx.Window_Selectable.prototype.constructor = ctx.Window_Selectable;

ctx.Window_Command.prototype = Object.create(ctx.Window_Selectable.prototype);
ctx.Window_Command.prototype.constructor = ctx.Window_Command;
ctx.Window_Command.prototype.initialize = function () {
    this._list = [];
};
ctx.Window_Command.prototype.addCommand = function (name, symbol, enabled = true) {
    this._list.push({ name, symbol, enabled });
};
ctx.Window_Command.prototype.commandSymbol = function (index) {
    return this._list[index] ? this._list[index].symbol : "";
};
ctx.Window_Command.prototype.commandName = function (index) {
    return this._list[index] ? this._list[index].name : "";
};
ctx.Window_Command.prototype.findSymbol = function (symbol) {
    return this._list.findIndex(item => item.symbol === symbol);
};

ctx.Window_Options.prototype = Object.create(ctx.Window_Command.prototype);
ctx.Window_Options.prototype.constructor = ctx.Window_Options;
ctx.Window_Options.prototype.initialize = function () {
    ctx.Window_Command.prototype.initialize.call(this);
    this._index = 0;
};
ctx.Window_Options.prototype.addGeneralOptions = function () {};
ctx.Window_Options.prototype.statusText = function (index) { return ""; };
ctx.Window_Options.prototype.processOk = function () {};
ctx.Window_Options.prototype.cursorRight = function () {};
ctx.Window_Options.prototype.cursorLeft = function () {};
ctx.Window_Options.prototype.getConfigValue = function (symbol) { return ctx.ConfigManager[symbol]; };
ctx.Window_Options.prototype.setConfigValue = function (symbol, val) { ctx.ConfigManager[symbol] = val; };
ctx.Window_Options.prototype.changeValue = function (symbol, value) {
    this.setConfigValue(symbol, value);
};
ctx.Window_Options.prototype.index = function () { return this._index; };

ctx.Window_StatusBase.prototype = Object.create(ctx.Window_Selectable.prototype);
ctx.Window_StatusBase.prototype.drawActorFace = function () {};

ctx.Window_MenuCommand.prototype = Object.create(ctx.Window_Command.prototype);
ctx.Window_MenuCommand.prototype.addOriginalCommands = function () {};

ctx.Window_TitleCommand.prototype = Object.create(ctx.Window_Command.prototype);
ctx.Window_TitleCommand.prototype.updatePlacement = function () {};
ctx.Window_TitleCommand.prototype.makeCommandList = function () {};

ctx.Window_Message.prototype = Object.create(ctx.Window_Base.prototype);
ctx.Window_Message.prototype.updatePlacement = function () {};

ctx.Window_ChoiceList.prototype = Object.create(ctx.Window_Command.prototype);
ctx.Window_ChoiceList.prototype.updatePlacement = function () {};

ctx.Window_NameBox.prototype.setName = function () {};

ctx.Scene_Base.prototype.start = function () {};
ctx.Scene_Boot.prototype = Object.create(ctx.Scene_Base.prototype);
ctx.Scene_Boot.prototype.constructor = ctx.Scene_Boot;
ctx.Scene_Boot.prototype.loadCustomFonts = function () {};
ctx.Scene_Boot.prototype.start = function () {
    ctx.Scene_Base.prototype.start.call(this);
};
ctx.Scene_Boot.prototype.startNormalGame = function () {};
ctx.Scene_Boot.prototype.resizeScreen = function () {};
ctx.Scene_Boot.prototype.updateDocumentTitle = function () {};

ctx.Scene_Title.prototype = Object.create(ctx.Scene_Base.prototype);
ctx.Scene_Title.prototype.constructor = ctx.Scene_Title;
ctx.Scene_Title.prototype.initialize = function () {};
ctx.Scene_Title.prototype.createCommandWindow = function () {};

ctx.window = ctx;

// Load SC4_rmmz_core_Patches.js
const corePatchesCode = fs.readFileSync(path.join(__dirname, "../js/plugins/SC4_rmmz_core_Patches.js"), "utf8");
vm.runInNewContext(corePatchesCode, ctx);

// Load SC4_rmmz_windows_Patches.js
const windowsPatchesCode = fs.readFileSync(path.join(__dirname, "../js/plugins/SC4_rmmz_windows_Patches.js"), "utf8");
vm.runInNewContext(windowsPatchesCode, ctx);

// Apply Scene_Boot.prototype.start patch (from SC4_rmmz_scenes_Patches.js)
const _Scene_Boot_start = ctx.Scene_Boot.prototype.start;
ctx.Scene_Boot.prototype.start = function () {
    _Scene_Boot_start.call(this);
    if (typeof ctx.ConfigManager !== "undefined" && typeof ctx.ConfigManager.applyFullscreen === "function") {
        ctx.ConfigManager.applyFullscreen();
    }
};

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

console.log("\n--- Suite 1: ConfigManager Lifecycle & Defaults ---");

it("Initializes ConfigManager.fullscreen to false by default (windowed mode)", () => {
    assert.strictEqual(ctx.ConfigManager.fullscreen, false);
});

it("makeData serializes fullscreen property into config save", () => {
    ctx.ConfigManager.fullscreen = true;
    const data = ctx.ConfigManager.makeData();
    assert.strictEqual(data.fullscreen, true);

    ctx.ConfigManager.fullscreen = false;
    const data2 = ctx.ConfigManager.makeData();
    assert.strictEqual(data2.fullscreen, false);
});

it("applyData restores fullscreen property from config save", () => {
    ctx.ConfigManager.applyData({ fullscreen: true });
    assert.strictEqual(ctx.ConfigManager.fullscreen, true);

    ctx.ConfigManager.applyData({});
    assert.strictEqual(ctx.ConfigManager.fullscreen, false);
});

it("applyFullscreen calls Graphics._requestFullScreen when fullscreen is true and not yet full", () => {
    isFullScreenState = false;
    requestFullScreenCalled = false;
    cancelFullScreenCalled = false;

    ctx.ConfigManager.fullscreen = true;
    ctx.ConfigManager.applyFullscreen();
    assert.strictEqual(requestFullScreenCalled, true);
    assert.strictEqual(isFullScreenState, true);
});

it("applyFullscreen calls Graphics._cancelFullScreen when fullscreen is false and currently full", () => {
    isFullScreenState = true;
    requestFullScreenCalled = false;
    cancelFullScreenCalled = false;

    ctx.ConfigManager.fullscreen = false;
    ctx.ConfigManager.applyFullscreen();
    assert.strictEqual(cancelFullScreenCalled, true);
    assert.strictEqual(isFullScreenState, false);
});

console.log("\n--- Suite 2: Window_Options Integration ---");

it("Window_Options includes the fullscreen command with localized label", () => {
    const win = new ctx.Window_Options();
    win.addGeneralOptions();

    const idx = win.findSymbol("fullscreen");
    assert.ok(idx >= 0, "Window_Options must contain 'fullscreen' command");
    assert.strictEqual(win.commandName(idx), "Plein écran (F4)");
});

it("Toggling fullscreen in Window_Options updates ConfigManager and triggers applyFullscreen", () => {
    const win = new ctx.Window_Options();
    win.addGeneralOptions();

    isFullScreenState = false;
    requestFullScreenCalled = false;
    ctx.ConfigManager.fullscreen = false;

    // Simulate changeValue to true
    win.changeValue("fullscreen", true);
    assert.strictEqual(ctx.ConfigManager.fullscreen, true);
    assert.strictEqual(requestFullScreenCalled, true);
    assert.strictEqual(isFullScreenState, true);

    // Simulate changeValue to false
    win.changeValue("fullscreen", false);
    assert.strictEqual(ctx.ConfigManager.fullscreen, false);
    assert.strictEqual(isFullScreenState, false);
});

console.log("\n--- Suite 3: Keyboard F4 & Boot Synchronization ---");

it("Graphics._switchFullScreen updates ConfigManager.fullscreen automatically", () => {
    isFullScreenState = false;
    ctx.ConfigManager.fullscreen = false;
    ctx.ConfigManager.saved = false;

    // Simulate pressing F4
    ctx.Graphics._switchFullScreen();
    assert.strictEqual(isFullScreenState, true);
    assert.strictEqual(ctx.ConfigManager.fullscreen, true);
    assert.strictEqual(ctx.ConfigManager.saved, true);

    // Simulate pressing F4 again
    ctx.Graphics._switchFullScreen();
    assert.strictEqual(isFullScreenState, false);
    assert.strictEqual(ctx.ConfigManager.fullscreen, false);
});

it("Scene_Boot.prototype.start applies fullscreen on startup if configured", () => {
    isFullScreenState = false;
    requestFullScreenCalled = false;
    ctx.ConfigManager.fullscreen = true;

    const boot = new ctx.Scene_Boot();
    boot.start();

    assert.strictEqual(requestFullScreenCalled, true);
    assert.strictEqual(isFullScreenState, true);

    // Reset
    ctx.ConfigManager.fullscreen = false;
    isFullScreenState = false;
});

console.log("\n=================================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("=================================================");

if (failed > 0) process.exit(1);
