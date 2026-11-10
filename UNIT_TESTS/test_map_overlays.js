//=============================================================================
// test_map_overlays.js
// Unit tests for SimCraft 4 Map Overlays System
//=============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("=================================================");
console.log("  TEST SUITE: SC4 Map Overlays Manager & Rendering ");
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
    Graphics: {
        boxWidth: 1280,
        boxHeight: 720
    },
    ImageManager: {
        loadBitmap: (folder, name) => ({
            width: 96,
            height: 96,
            isReady: () => true
        })
    },
    Sprite: function () {
        this.initialize(...arguments);
    },
    $gamePlayer: {
        x: 10,
        y: 10,
        isTransferring: () => false
    },
    $gameMap: {
        _mapId: 1,
        _overlays: [],
        mapId: function () { return this._mapId; },
        tileWidth: () => 48,
        tileHeight: () => 48,
        displayX: () => 0,
        displayY: () => 0,
        adjustX: (x) => x,
        adjustY: (y) => y,
        regionId: function (x, y) {
            if (x === 15 && y === 15) return 12; // Region 12 under roof
            return 0;
        }
    }
};

ctx.Sprite.prototype.initialize = function () {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.opacity = 255;
    this.visible = true;
    this.blendMode = 0;
    this.anchor = { x: 0, y: 0 };
    this.scale = { x: 1, y: 1 };
    this.children = [];
    this._hue = 0;
};
ctx.Sprite.prototype.update = function () { };
ctx.Sprite.prototype.setHue = function (h) { this._hue = h; };
ctx.Sprite.prototype.addChild = function (c) { this.children.push(c); c.parent = this; };
ctx.Sprite.prototype.removeChild = function (c) {
    const idx = this.children.indexOf(c);
    if (idx >= 0) this.children.splice(idx, 1);
};

ctx.window = ctx;

// Number clamping polyfill if needed
if (!Number.prototype.clamp) {
    Number.prototype.clamp = function (min, max) {
        return Math.min(Math.max(this, min), max);
    };
}
ctx.Number.prototype.clamp = function (min, max) {
    return Math.min(Math.max(this, min), max);
};

// Load SC4_MapOverlaysManager.js
const managerCode = fs.readFileSync(path.join(__dirname, "../js/plugins/SC4_MapOverlaysManager.js"), "utf8");
vm.runInNewContext(managerCode, ctx);

// Load SC4_Spriteset_Overlays.js
const spritesetCode = fs.readFileSync(path.join(__dirname, "../js/plugins/SC4_Spriteset_Overlays.js"), "utf8");
vm.runInNewContext(spritesetCode, ctx);

// Setup setupMapOverlays directly on $gameMap
ctx.$gameMap.setupMapOverlays = function (note) {
    this._overlays = [];
    if (!note) return;
    const regex = /<overlay:\s*([^>]+)>/gi;
    let match;
    while ((match = regex.exec(note)) !== null) {
        const raw = match[1].trim();
        const parts = raw.split(",").map(p => p.trim());
        if (parts.length >= 2) {
            const type = parts[2] || "static";
            const isShadow = type.toLowerCase().includes("shadow");
            const defaultZ = isShadow ? 2 : 4;
            const overlayData = {
                id: parts[0],
                imgName: parts[1],
                type: type,
                zIndex: (parts[3] !== undefined && parts[3] !== "") ? Number(parts[3]) : defaultZ,
                xMap: (parts[4] !== undefined && parts[4] !== "") ? Number(parts[4]) : 0,
                yMap: (parts[5] !== undefined && parts[5] !== "") ? Number(parts[5]) : 0,
                opacity: (parts[6] !== undefined && parts[6] !== "") ? Number(parts[6]) : 255,
                persistant: (parts[7] !== undefined) ? (parts[7].toLowerCase() === "true" || parts[7] === "1") : false,
                blendMode: (parts[8] !== undefined && parts[8] !== "") ? Number(parts[8]) : 0,
                hue: (parts[9] !== undefined && parts[9] !== "") ? Number(parts[9]) : 0,
                regionTrigger: (parts[10] !== undefined && parts[10] !== "") ? Number(parts[10]) : 0,
                flickerType: (parts[11] !== undefined && parts[11] !== "") ? parts[11] : null,
                fadeDuration: (parts[12] !== undefined && parts[12] !== "") ? Number(parts[12]) : null
            };
            this._overlays.push(overlayData);
        }
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
        console.error(`    ${err.stack || err.message}`);
        failed++;
    }
}

// -------------------------------------------------------------
// Suite 1: Notetag Parsing
// -------------------------------------------------------------
console.log("\n--- Suite 1: Notetag Parsing (<overlay:...>) ---");

it("Correctly parses full <overlay:...> notetag with all parameters", () => {
    const note = "<spaceship: player>\n<overlay: roof_barracks, roof_01, static, 5, 14.5, 8.25, 255, true, 0, 180, 12>";
    ctx.$gameMap.setupMapOverlays(note);
    const list = ctx.$gameMap._overlays;

    assert.strictEqual(list.length, 1);
    const item = list[0];
    assert.strictEqual(item.id, "roof_barracks");
    assert.strictEqual(item.imgName, "roof_01");
    assert.strictEqual(item.type, "static");
    assert.strictEqual(item.zIndex, 5);
    assert.strictEqual(item.xMap, 14.5);
    assert.strictEqual(item.yMap, 8.25);
    assert.strictEqual(item.opacity, 255);
    assert.strictEqual(item.persistant, true);
    assert.strictEqual(item.blendMode, 0);
    assert.strictEqual(item.hue, 180);
    assert.strictEqual(item.regionTrigger, 12);
});

it("Applies graceful defaults when trailing notetag parameters are omitted", () => {
    const note = "<overlay: light_hangar, lamp_glow, light, 6, 20, 10>";
    ctx.$gameMap.setupMapOverlays(note);
    const list = ctx.$gameMap._overlays;

    assert.strictEqual(list.length, 1);
    const item = list[0];
    assert.strictEqual(item.id, "light_hangar");
    assert.strictEqual(item.imgName, "lamp_glow");
    assert.strictEqual(item.type, "light");
    assert.strictEqual(item.zIndex, 6);
    assert.strictEqual(item.xMap, 20);
    assert.strictEqual(item.yMap, 10);
    assert.strictEqual(item.opacity, 255);
    assert.strictEqual(item.persistant, false);
    assert.strictEqual(item.blendMode, 0);
    assert.strictEqual(item.hue, 0);
    assert.strictEqual(item.regionTrigger, 0);
});

it("Parses multiple <overlay:...> tags on the same map note (coexistence of shadow and roof)", () => {
    const note = "<space>\n<inner>\n<spaceship: 1>\n<overlay: shadow_ship1, ship_1, shadow, 2, 9, 1, 150, false, 0, 0, 0>\n<overlay: roof_ship1, roof_ship1, roof, 6, 9, 1, 255, false, 0, 0, 1>";
    ctx.$gameMap.setupMapOverlays(note);
    const list = ctx.$gameMap._overlays;

    assert.strictEqual(list.length, 2);

    // Shadow overlay
    assert.strictEqual(list[0].id, "shadow_ship1");
    assert.strictEqual(list[0].imgName, "ship_1");
    assert.strictEqual(list[0].type, "shadow");
    assert.strictEqual(list[0].zIndex, 2);
    assert.strictEqual(list[0].xMap, 9);
    assert.strictEqual(list[0].yMap, 1);
    assert.strictEqual(list[0].opacity, 150);

    // Roof overlay
    assert.strictEqual(list[1].id, "roof_ship1");
    assert.strictEqual(list[1].imgName, "roof_ship1");
    assert.strictEqual(list[1].type, "roof");
    assert.strictEqual(list[1].zIndex, 6);
    assert.strictEqual(list[1].xMap, 9);
    assert.strictEqual(list[1].yMap, 1);
    assert.strictEqual(list[1].opacity, 255);
    assert.strictEqual(list[1].regionTrigger, 1);
});

// -------------------------------------------------------------
// Suite 2: MapOverlaysManager Lifecycle & Persistence
// -------------------------------------------------------------
console.log("\n--- Suite 2: MapOverlaysManager Lifecycle & Persistence ---");

it("Synchronizes notetag overlays and handles dynamic creation at runtime", () => {
    ctx.$mapOverlaysManager._data = {};
    const notetags = [
        { id: "roof_1", imgName: "roof_a", type: "static", zIndex: 4, xMap: 5, yMap: 5, opacity: 255, persistant: false }
    ];

    ctx.$mapOverlaysManager.onMapInit(1, notetags);
    assert.ok(ctx.$mapOverlaysManager.getOverlay("roof_1", 1));

    // Dynamic addition in-game (non-persistent)
    ctx.$mapOverlaysManager.createOverlay({
        id: "temp_marker",
        imgName: "marker_temp",
        type: "static",
        persistant: false
    }, 1);

    // Dynamic addition in-game (persistent)
    ctx.$mapOverlaysManager.createOverlay({
        id: "crater_impact",
        imgName: "crater",
        type: "static",
        persistant: true
    }, 1);

    assert.strictEqual(ctx.$mapOverlaysManager.getOverlaysData(1).length, 3);

    // Re-entering map (transfer): non-persistent temp_marker should be removed, crater_impact kept
    ctx.$mapOverlaysManager.onMapInit(1, notetags, { skipRefresh: false });
    const refreshed = ctx.$mapOverlaysManager.getOverlaysData(1);
    assert.strictEqual(refreshed.length, 2);
    assert.ok(ctx.$mapOverlaysManager.getOverlay("roof_1", 1));
    assert.ok(ctx.$mapOverlaysManager.getOverlay("crater_impact", 1));
    assert.strictEqual(ctx.$mapOverlaysManager.getOverlay("temp_marker", 1), null);
});

it("Returns overlays sorted by zIndex ascending", () => {
    ctx.$mapOverlaysManager._data = {};
    ctx.$mapOverlaysManager.createOverlay({ id: "high", zIndex: 10 }, 1);
    ctx.$mapOverlaysManager.createOverlay({ id: "low", zIndex: 2 }, 1);
    ctx.$mapOverlaysManager.createOverlay({ id: "mid", zIndex: 5 }, 1);

    const sorted = ctx.$mapOverlaysManager.getOverlaysData(1);
    assert.strictEqual(sorted[0].id, "low");
    assert.strictEqual(sorted[1].id, "mid");
    assert.strictEqual(sorted[2].id, "high");
});

it("Serializes and deserializes persistent overlays to/from savefile data", () => {
    ctx.$mapOverlaysManager._data = {};
    ctx.$mapOverlaysManager.createOverlay({ id: "keep_me", persistant: true, opacity: 150 }, 1);
    ctx.$mapOverlaysManager.createOverlay({ id: "discard_me", persistant: false, opacity: 200 }, 1);

    const saved = ctx.$mapOverlaysManager.makeSavefileData();
    assert.ok(saved.overlaysData[1]);
    assert.ok(saved.overlaysData[1]["keep_me"]);
    assert.strictEqual(saved.overlaysData[1]["discard_me"], undefined);

    const freshManager = new ctx.MapOverlaysManager();
    freshManager.loadSavefileData(saved);
    const restored = freshManager.getOverlay("keep_me", 1);
    assert.ok(restored);
    assert.strictEqual(restored.opacity, 150);
    assert.strictEqual(freshManager.getOverlay("discard_me", 1), null);
});

it("Preserves non-persistent overlay states during same-map no-fade transfers (skipRefresh)", () => {
    ctx.$mapOverlaysManager._data = {};
    const notetags = [
        { id: "roof_1", imgName: "roof_a", type: "roof", zIndex: 6, xMap: 5, yMap: 5, opacity: 255, persistant: false }
    ];

    // Initial map load: roof created at 255
    ctx.$mapOverlaysManager.onMapInit(1, notetags);
    const roof = ctx.$mapOverlaysManager.getOverlay("roof_1", 1);
    assert.strictEqual(roof.opacity, 255);

    // Player enters room -> roof fades out to 0
    roof.setTargetOpacity(0);
    while (roof.isBusy()) roof.update();
    assert.strictEqual(roof.opacity, 0);

    // Case 1: Same-map transfer with skipRefresh: true (fadeType: 2) -> roof remains at 0!
    ctx.$mapOverlaysManager.onMapInit(1, notetags, { skipRefresh: true });
    assert.strictEqual(roof.opacity, 0);

    // Case 2: Regular map transfer (e.g. from outer space) -> roof resets to 255
    ctx.$mapOverlaysManager.onMapInit(1, notetags, { skipRefresh: false });
    assert.strictEqual(roof.opacity, 255);
});

it("Preserves non-persistent overlay states when returning from pushed scene (menu/inventory) on same map", () => {
    ctx.$mapOverlaysManager._data = {};
    const notetags = [
        { id: "roof_1", imgName: "roof_a", type: "roof", zIndex: 6, xMap: 5, yMap: 5, opacity: 255, persistant: false }
    ];

    // Initial map load: roof created at 255, lastMapId recorded as 1
    ctx.$mapOverlaysManager.onMapInit(1, notetags);
    const roof = ctx.$mapOverlaysManager.getOverlay("roof_1", 1);
    assert.strictEqual(roof.opacity, 255);
    assert.strictEqual(ctx.$mapOverlaysManager.lastMapId, 1);

    // Player enters room -> roof fades out to 0
    roof.setTargetOpacity(0);
    while (roof.isBusy()) roof.update();
    assert.strictEqual(roof.opacity, 0);

    // Player opens Inventory (Scene_Item) and closes it -> Scene_Map.onMapLoaded runs on map 1
    ctx.$gamePlayer.isTransferring = () => false;
    ctx.$mapOverlaysManager.onMapInit(1, notetags); // called without explicit skipRefresh

    // Roof must NOT pop back to 255, it stays at 0!
    assert.strictEqual(roof.opacity, 0);

    // Overriding / forcing refresh via forceRefresh
    ctx.$mapOverlaysManager.forceRefresh = true;
    ctx.$mapOverlaysManager.onMapInit(1, notetags);
    assert.strictEqual(roof.opacity, 255, "forceRefresh must reset non-persistent overlays to defaults");

    // Immediate manual reset in console via restoreMapDefaults()
    roof.setOpacity(50);
    assert.strictEqual(roof.opacity, 50);
    ctx.$gameMap._overlays = notetags;
    ctx.$mapOverlaysManager.restoreMapDefaults(1);
    assert.strictEqual(roof.opacity, 255, "restoreMapDefaults() must immediately reset overlays to defaults");
});

// -------------------------------------------------------------
// Suite 3: Game_MapOverlay State & Interpolation
// -------------------------------------------------------------
console.log("\n--- Suite 3: Game_MapOverlay State & Interpolation ---");

it("Smoothly interpolates opacity on fadeOut and fadeIn", () => {
    const overlay = new ctx.Game_MapOverlay({ id: "test", opacity: 255, fadeSpeed: 50 });
    assert.strictEqual(overlay.opacity, 255);

    overlay.fadeOut();
    assert.strictEqual(overlay.targetOpacity, 0);
    assert.strictEqual(overlay.isBusy(), true);

    // Step 1: 255 - 50 = 205
    overlay.update();
    assert.strictEqual(overlay.opacity, 205);

    // Run until finish
    while (overlay.isBusy()) {
        overlay.update();
    }
    assert.strictEqual(overlay.opacity, 0);
    assert.strictEqual(overlay.isBusy(), false);

    // Fade back in
    overlay.fadeIn();
    assert.strictEqual(overlay.targetOpacity, 255);
    while (overlay.isBusy()) {
        overlay.update();
    }
    assert.strictEqual(overlay.opacity, 255);
});

it("Automatically fades out when player enters regionTrigger tile", () => {
    const overlay = new ctx.Game_MapOverlay({ id: "roof", opacity: 255, regionTrigger: 12, fadeSpeed: 100 });

    // Case 1: Player is at (10, 10), region is 0
    ctx.$gamePlayer.x = 10;
    ctx.$gamePlayer.y = 10;
    overlay.update();
    assert.strictEqual(overlay.targetOpacity, 255);

    // Case 2: Player walks into (15, 15), region is 12 -> should trigger fade out!
    ctx.$gamePlayer.x = 15;
    ctx.$gamePlayer.y = 15;
    overlay.update();
    assert.strictEqual(overlay.targetOpacity, 0);

    // Finish fade out
    while (overlay.isBusy()) overlay.update();
    assert.strictEqual(overlay.opacity, 0);

    // Case 3: Player exits building back to (10, 10)
    ctx.$gamePlayer.x = 10;
    ctx.$gamePlayer.y = 10;
    overlay.update();
    assert.strictEqual(overlay.targetOpacity, 255);
    while (overlay.isBusy()) overlay.update();
    assert.strictEqual(overlay.opacity, 255);
});

it("Roof overlay defaults to 80-frame smooth fade duration and supports custom fadeDuration", () => {
    // 1. Default roof type: 80 frames duration
    const roof = new ctx.Game_MapOverlay({ id: "roof_default", type: "roof", opacity: 255 });
    assert.strictEqual(roof.fadeDuration, 80);
    assert.strictEqual(Math.round(roof.fadeSpeed * 80), 255);

    roof.fadeOut();
    for (let f = 0; f < 40; f++) roof.update();
    // After 40 frames (half way), opacity should be roughly half (127-128)
    assert.strictEqual(Math.round(roof.opacity), 128);

    for (let f = 0; f < 40; f++) roof.update();
    // After 80 frames, opacity reaches 0
    assert.strictEqual(roof.opacity, 0);

    // 2. Custom fadeDuration via parameter (e.g. 50 frames)
    const roofCustom = new ctx.Game_MapOverlay({ id: "roof_custom", type: "roof", opacity: 200, fadeDuration: 50 });
    assert.strictEqual(roofCustom.fadeDuration, 50);
    assert.strictEqual(roofCustom.fadeSpeed, 4); // 200 / 50 = 4
});

it("Game_MapFogOverlay autoscrolls with offset update", () => {
    const fog = new ctx.Game_MapFogOverlay({ id: "fog1", scrollSpeedX: 1.5, scrollSpeedY: -0.5 });
    assert.strictEqual(fog.offsetX, 0);
    assert.strictEqual(fog.offsetY, 0);

    fog.update();
    assert.strictEqual(fog.offsetX, 1.5);
    assert.strictEqual(fog.offsetY, -0.5);
});

// -------------------------------------------------------------
// Suite 4: Visual Components & Frustum Culling
// -------------------------------------------------------------
console.log("\n--- Suite 4: Visual Rendering & Frustum Culling ---");

it("Sprite_MapOverlay synchronizes coordinates and culls off-screen objects", () => {
    const overlay = new ctx.Game_MapOverlay({ id: "prop1", imgName: "crate", xMap: 5, yMap: 5, opacity: 200 });
    const sprite = new ctx.Sprite_MapOverlay(overlay);

    // On-screen (5*48 = 240px, 5*48 = 240px)
    sprite.update();
    assert.strictEqual(sprite.x, 240);
    assert.strictEqual(sprite.y, 240);
    assert.strictEqual(sprite.opacity, 200);
    assert.strictEqual(sprite.visible, true);

    // Move overlay far off-screen to the right (xMap: 50 -> 2400px >> 1280)
    overlay.setPosition(50, 5);
    sprite.update();
    assert.strictEqual(sprite.visible, false); // Frustum culling activated!

    // Return near screen
    overlay.setPosition(10, 5);
    sprite.update();
    assert.strictEqual(sprite.visible, true);
});

it("Sprite_MapOverlay aligns pixel-perfectly with RMMZ Tilemap under fractional camera scroll", () => {
    // In SC4 (1760x990 resolution), camera can center on player at fractional coordinates, e.g. displayX = 12.15625
    const originalDisplayX = ctx.$gameMap.displayX;
    const originalDisplayY = ctx.$gameMap.displayY;
    const originalAdjustX = ctx.$gameMap.adjustX;
    const originalAdjustY = ctx.$gameMap.adjustY;

    ctx.$gameMap.displayX = () => 12.15625;
    ctx.$gameMap.displayY = () => 8.1875;
    ctx.$gameMap.adjustX = (x) => x - 12.15625;
    ctx.$gameMap.adjustY = (y) => y - 8.1875;

    const overlay = new ctx.Game_MapOverlay({ id: "roof1", imgName: "roof_ship1", xMap: 26, yMap: 16, opacity: 255 });
    const sprite = new ctx.Sprite_MapOverlay(overlay);
    sprite.update();

    // RMMZ Tilemap formula: ox = Math.ceil(displayX * 48) = Math.ceil(583.5) = 584
    // Expected tile X: 26 * 48 - 584 = 664 (NOT 665 that Math.round generated)
    assert.strictEqual(sprite.x, 664);
    assert.strictEqual(sprite.y, 375);

    // Restore
    ctx.$gameMap.displayX = originalDisplayX;
    ctx.$gameMap.displayY = originalDisplayY;
    ctx.$gameMap.adjustX = originalAdjustX;
    ctx.$gameMap.adjustY = originalAdjustY;
});

it("Spriteset_Overlays manages child sprites lifecycle based on manager data", () => {
    ctx.$mapOverlaysManager._data = {};
    ctx.$mapOverlaysManager.createOverlay({ id: "o1", imgName: "img1", zIndex: 1 }, 1);
    ctx.$mapOverlaysManager.createOverlay({ id: "o2", imgName: "img2", zIndex: 3 }, 1);

    const spriteset = new ctx.Spriteset_Overlays();
    spriteset.update();

    assert.ok(spriteset._spriteMap["o1"]);
    assert.ok(spriteset._spriteMap["o2"]);
    assert.strictEqual(spriteset.lowerContainer.children.length, 1);
    assert.strictEqual(spriteset.upperContainer.children.length, 1);

    // Remove one overlay
    ctx.$mapOverlaysManager.removeOverlay("o1", 1);
    spriteset.update();

    assert.strictEqual(spriteset.lowerContainer.children.length, 0);
    assert.strictEqual(spriteset.upperContainer.children.length, 1);
    assert.strictEqual(spriteset._spriteMap["o1"], undefined);
    assert.ok(spriteset._spriteMap["o2"]);
});

it("Spriteset_Overlays routes shadow overlays to lowerContainer (z = 2) and lights/roofs to upperContainer (z = 6)", () => {
    ctx.$mapOverlaysManager._data = {};
    ctx.$mapOverlaysManager.createOverlay({ id: "ship_shadow", imgName: "ship_1", type: "shadow", opacity: 150 }, 1);
    ctx.$mapOverlaysManager.createOverlay({ id: "screen_light", imgName: "halo_screen", type: "light", opacity: 200 }, 1);
    ctx.$mapOverlaysManager.createOverlay({ id: "ship_roof", imgName: "roof_part1", type: "roof", opacity: 255 }, 1);

    const spriteset = new ctx.Spriteset_Overlays();
    assert.strictEqual(spriteset.lowerContainer.z, 2);
    assert.strictEqual(spriteset.upperContainer.z, 6);

    spriteset.update();

    const shadowSprite = spriteset._spriteMap["ship_shadow"];
    const lightSprite = spriteset._spriteMap["screen_light"];
    const roofSprite = spriteset._spriteMap["ship_roof"];

    assert.ok(shadowSprite);
    assert.ok(lightSprite);
    assert.ok(roofSprite);

    // Assert correct container placement
    assert.strictEqual(shadowSprite.parent, spriteset.lowerContainer);
    assert.strictEqual(lightSprite.parent, spriteset.upperContainer);
    assert.strictEqual(roofSprite.parent, spriteset.upperContainer);

    // Verify Tilemap attachment attaches both containers
    const mockTilemap = new ctx.Sprite();
    spriteset.attachToTilemap(mockTilemap);
    assert.strictEqual(mockTilemap.children.includes(spriteset.lowerContainer), true);
    assert.strictEqual(mockTilemap.children.includes(spriteset.upperContainer), true);
});

it("Simultaneously renders and updates multiple overlays (shadow z=2 and roof z=6) on the same map", () => {
    ctx.$mapOverlaysManager._data = {};
    const note = "<overlay: shadow_ship1, ship_1, shadow, 2, 9, 1, 150, false, 0, 0, 0>\n<overlay: roof_ship1, roof_ship1, roof, 6, 9, 1, 255, false, 0, 0, 1>";
    ctx.$gameMap.setupMapOverlays(note);
    ctx.$mapOverlaysManager.onMapInit(1);

    const spriteset = new ctx.Spriteset_Overlays();
    spriteset.update();

    const shadowSprite = spriteset._spriteMap["shadow_ship1"];
    const roofSprite = spriteset._spriteMap["roof_ship1"];

    assert.ok(shadowSprite, "Shadow sprite must exist");
    assert.ok(roofSprite, "Roof sprite must exist");
    assert.strictEqual(shadowSprite.parent, spriteset.lowerContainer);
    assert.strictEqual(roofSprite.parent, spriteset.upperContainer);
    assert.strictEqual(shadowSprite.visible, true);
    assert.strictEqual(roofSprite.visible, true);
    assert.strictEqual(shadowSprite.opacity, 150);
    assert.strictEqual(roofSprite.opacity, 255);
});

it("Game_MapOverlay flickerType synchronizes oscillation for shadows and lights", () => {
    const shadowOverlay = new ctx.Game_MapOverlay({ id: "s1", type: "shadow", opacity: 150, flickerType: "slow", flickerSpeed: 0.1 });
    const lightOverlay = new ctx.Game_MapOverlay({ id: "l1", type: "light", opacity: 200, flickerType: "slow", flickerSpeed: 0.1 });

    const initialShadowOp = shadowOverlay.opacity;
    const initialLightZoom = lightOverlay.zoomX;

    shadowOverlay.update();
    lightOverlay.update();

    // After 1 step of flicker, opacity and zoom oscillate
    assert.notStrictEqual(shadowOverlay.opacity, initialShadowOp);
    assert.notStrictEqual(lightOverlay.zoomX, initialLightZoom);
});

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log("\n=================================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("=================================================");

if (failed > 0) {
    process.exit(1);
}
