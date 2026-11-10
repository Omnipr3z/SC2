//=============================================================================
// test_destination_sprite.js
// Unit tests for SC4 Animated Destination Indicator (Sprite_Destination)
//=============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("=================================================");
console.log("  TEST SUITE: SC4 Animated Destination Sprite    ");
console.log("=================================================");

// Mock environment
const ctx = {
    console: console,
    Math: Math,
    String: String,
    Number: Number,
    Array: Array,
    Object: Object,
    Boolean: Boolean,
    Graphics: { width: 1760, height: 990 },
    Bitmap: function (w, h) {
        this.width = w;
        this.height = h;
        this.context = {
            save: () => { },
            restore: () => { },
            beginPath: () => { },
            ellipse: () => { },
            arc: () => { },
            fill: () => { },
            stroke: () => { },
            translate: () => { },
            scale: () => { },
            createRadialGradient: () => ({
                addColorStop: () => { }
            }),
            lineWidth: 1,
            strokeStyle: "",
            fillStyle: ""
        };
        this._baseTexture = { update: () => { } };
        this.destroy = function () { this._destroyed = true; };
    },
    ImageManager: {
        loadBitmap: (folder, name) => ({
            folder,
            name,
            width: 48,
            height: 48,
            isReady: () => true
        })
    },
    Sprite: function () {
        this.initialize(...arguments);
    },
    Sprite_Character: function () { },
    Spriteset_Map: function () { },
    $gameTemp: {
        _destinationValid: false,
        _destX: 0,
        _destY: 0,
        isDestinationValid: function () { return this._destinationValid; },
        destinationX: function () { return this._destX; },
        destinationY: function () { return this._destY; },
        setDestination: function (x, y) {
            this._destX = x;
            this._destY = y;
            this._destinationValid = true;
        },
        clearDestination: function () {
            this._destinationValid = false;
        }
    },
    $gameMap: {
        tileWidth: () => 48,
        tileHeight: () => 48,
        adjustX: (x) => x,
        adjustY: (y) => y,
        isValid: (x, y) => (x >= 0 && x < 25 && y >= 0 && y < 30),
        isPassable: function (x, y, d) {
            // Tile (5, 5) is open ground, (0, 0) is wall
            if (x === 0 && y === 0) return false;
            return true;
        }
    },
    $gamePlayer: {
        isCollidedWithCharacters: function (x, y) {
            // NPC at (10, 10)
            if (x === 10 && y === 10) return true;
            return false;
        }
    }
};

ctx.Sprite.prototype.initialize = function () {
    this.x = 0;
    this.y = 0;
    this.scale = { x: 1, y: 1 };
    this.anchor = { x: 0, y: 0 };
    this.opacity = 255;
    this.visible = true;
    this.blendMode = 0;
    this.children = [];
};
ctx.Sprite.prototype.update = function () { };
ctx.Sprite.prototype.addChild = function (c) { this.children.push(c); c.parent = this; };
ctx.Sprite.prototype.destroy = function () { this._destroyed = true; };

// Base Sprite_Destination vanilla dummy
ctx.Sprite_Destination = function () {
    this.initialize(...arguments);
};
ctx.Sprite_Destination.prototype = Object.create(ctx.Sprite.prototype);
ctx.Sprite_Destination.prototype.constructor = ctx.Sprite_Destination;
ctx.Sprite_Destination.prototype.initialize = function () {
    ctx.Sprite.prototype.initialize.call(this);
};

ctx.window = ctx;

// Load SC4_rmmz_sprites_Patches.js into context
const pluginCode = fs.readFileSync(path.join(__dirname, "../js/plugins/SC4_rmmz_sprites_Patches.js"), "utf8");
vm.runInNewContext(pluginCode, ctx);

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
// Suite 1: Structural Initialization
// -------------------------------------------------------------
console.log("\n--- Suite 1: Structural Initialization & Components ---");

it("Initializes compound Sprite_Destination with ground ellipse and pointer arrow", () => {
    const dest = new ctx.Sprite_Destination();

    assert.ok(dest._groundSprite, "Ground sprite must exist");
    assert.ok(dest._pointerSprite, "Pointer sprite must exist");
    assert.strictEqual(dest.children.length, 2);

    // Ground sprite setup: additive blend, centered anchor
    assert.strictEqual(dest._groundSprite.anchor.x, 0.5);
    assert.strictEqual(dest._groundSprite.anchor.y, 0.5);
    assert.strictEqual(dest._groundSprite.blendMode, 1);
    assert.ok(dest._groundBitmap);

    // Pointer sprite setup: loads destPointer, anchor at tip (0.5, 1.0)
    assert.strictEqual(dest._pointerSprite.anchor.x, 0.5);
    assert.strictEqual(dest._pointerSprite.anchor.y, 1.0);
    assert.strictEqual(dest._pointerSprite.bitmap.name, "destPointer");
});

// -------------------------------------------------------------
// Suite 2: Visibility & Positioning
// -------------------------------------------------------------
console.log("\n--- Suite 2: Visibility & Coordinate Positioning ---");

it("Remains invisible when destination is not valid, and displays upon click", () => {
    const dest = new ctx.Sprite_Destination();
    ctx.$gameTemp.clearDestination();

    dest.update();
    assert.strictEqual(dest.visible, false);

    ctx.$gameTemp.setDestination(5, 7);
    dest.update();
    assert.strictEqual(dest.visible, true);
    assert.strictEqual(dest.x, (5 + 0.5) * 48);
    assert.strictEqual(dest.y, (7 + 0.5) * 48);

    ctx.$gameTemp.clearDestination();
    dest.update();
    assert.strictEqual(dest.visible, false);
});

// -------------------------------------------------------------
// Suite 3: Passability-Conditional Pointer
// -------------------------------------------------------------
console.log("\n--- Suite 3: Passability-Conditional Pointer ---");

it("Displays pointer arrow on passable floor tiles", () => {
    const dest = new ctx.Sprite_Destination();
    ctx.$gameTemp.setDestination(5, 5); // Passable tile
    dest.update();

    assert.strictEqual(dest.visible, true);
    assert.strictEqual(dest._pointerSprite.visible, true);
    assert.strictEqual(dest._groundSprite.visible, true);
});

it("Hides pointer arrow on impassable wall tile while keeping ground ellipse", () => {
    const dest = new ctx.Sprite_Destination();
    ctx.$gameTemp.setDestination(0, 0); // Wall (impassable)
    dest.update();

    assert.strictEqual(dest.visible, true);
    assert.strictEqual(dest._pointerSprite.visible, false, "Pointer must be hidden on impassable tile");
    assert.strictEqual(dest._groundSprite.visible, true, "Ground circle remains visible");
});

it("Hides pointer arrow on tiles blocked by character/event collision", () => {
    const dest = new ctx.Sprite_Destination();
    ctx.$gameTemp.setDestination(10, 10); // Collides with character
    dest.update();

    assert.strictEqual(dest.visible, true);
    assert.strictEqual(dest._pointerSprite.visible, false, "Pointer must be hidden when blocked by NPC");
});

// -------------------------------------------------------------
// Suite 4: Animation & Oscillation
// -------------------------------------------------------------
console.log("\n--- Suite 4: Animation & Float Oscillation ---");

it("Animates ground circle pulse and oscillates pointer vertically", () => {
    const dest = new ctx.Sprite_Destination();
    ctx.$gameTemp.setDestination(5, 5);
    dest.update();

    const scale1 = dest._groundSprite.scale.x;
    const y1 = dest._pointerSprite.y;

    // Advance animation by a few frames
    for (let i = 0; i < 5; i++) {
        dest.update();
    }

    const scale2 = dest._groundSprite.scale.x;
    const y2 = dest._pointerSprite.y;

    assert.notStrictEqual(scale1, scale2, "Ground scale must animate over frames");
    assert.notStrictEqual(y1, y2, "Pointer Y must oscillate over frames");
});

it("Ground oval expands from 48px (scale 0.67) to 72px (scale 1.0) with decreasing opacity", () => {
    const dest = new ctx.Sprite_Destination();
    ctx.$gameTemp.setDestination(5, 5);

    // Initial update: frameCount = 1 / 25
    dest.update();
    const initialScale = dest._groundSprite.scale.x;
    const initialOpacity = dest._groundSprite.opacity;

    assert.ok(initialScale >= 0.67 && initialScale <= 0.72, `Initial scale should be around 0.67, got ${initialScale}`);
    assert.ok(initialOpacity > 180, `Initial opacity should be high, got ${initialOpacity}`);

    // Advance to late in cycle (frameCount = 24)
    for (let i = 0; i < 23; i++) {
        dest.update();
    }

    const finalScale = dest._groundSprite.scale.x;
    const finalOpacity = dest._groundSprite.opacity;

    assert.ok(finalScale > 0.95 && finalScale <= 1.0, `Scale near end of pulse should approach 1.0 (72px), got ${finalScale}`);
    assert.ok(finalOpacity < 50, `Opacity near end of pulse should fade towards 0, got ${finalOpacity}`);
    assert.ok(finalScale > initialScale, "Oval must expand over the cycle");
    assert.ok(finalOpacity < initialOpacity, "Opacity must decrease as oval expands");
});

it("Arrow opacity strictly stays between 45% (115) and 65% (166) and is higher when lower", () => {
    const dest = new ctx.Sprite_Destination();
    ctx.$gameTemp.setDestination(5, 5);

    let minObservedOp = 999;
    let maxObservedOp = -999;
    let highestYRecord = { y: -999, op: 0 }; // highest Y = lowest physical position on screen
    let lowestYRecord = { y: 999, op: 0 };  // lowest Y = highest physical position on screen

    // Sample across a full period (approx 55 frames for 2*PI / 0.12)
    for (let i = 0; i < 70; i++) {
        dest.update();
        const op = dest._pointerSprite.opacity;
        const py = dest._pointerSprite.y;

        if (op < minObservedOp) minObservedOp = op;
        if (op > maxObservedOp) maxObservedOp = op;

        if (py > highestYRecord.y) {
            highestYRecord = { y: py, op: op };
        }
        if (py < lowestYRecord.y) {
            lowestYRecord = { y: py, op: op };
        }
    }

    // Strict bounds 115 to 166
    assert.ok(minObservedOp >= 115, `Min opacity should not drop below 115 (45%), observed: ${minObservedOp}`);
    assert.ok(maxObservedOp <= 166, `Max opacity should not exceed 166 (65%), observed: ${maxObservedOp}`);
    assert.strictEqual(minObservedOp, 115, `Min opacity must reach exactly 115 (45%)`);
    assert.strictEqual(maxObservedOp, 166, `Max opacity must reach exactly 166 (65%)`);

    // Higher position (lower py) should have lower opacity
    assert.ok(highestYRecord.op > lowestYRecord.op,
        `Opacity at lowest position (${highestYRecord.op}) must be higher than opacity at highest position (${lowestYRecord.op})`);
});

it("Destroys ground bitmap on destroy call", () => {
    const dest = new ctx.Sprite_Destination();
    dest.destroy();
    assert.strictEqual(dest._groundBitmap._destroyed, true);
});

// -------------------------------------------------------------
// Suite 5: Ring Menu Disabled State
// -------------------------------------------------------------
console.log("\n--- Suite 5: Ring Menu Disabled Verification ---");

it("Ring Menu is disabled by default in objects/scenes patches and Window_RingCommand is well-formed", () => {
    // 1. Verify Window_RingCommand class definition and export
    const ringCtx = {
        console: console,
        Window_Command: class { initialize() { } },
        window: {}
    };
    const ringCode = fs.readFileSync(path.join(__dirname, "../js/plugins/SC4_Window_RingCommand.js"), "utf8");
    vm.runInNewContext(ringCode, ringCtx);
    assert.ok(ringCtx.window.Window_RingCommand, "Window_RingCommand class must be exported to window");

    // 2. Verify Game_System.prototype.isRingMenuEnabled in SC4_rmmz_objects_Patches.js
    const objectsCode = fs.readFileSync(path.join(__dirname, "../js/plugins/SC4_rmmz_objects_Patches.js"), "utf8");
    assert.ok(objectsCode.includes("Game_System.prototype.isRingMenuEnabled = function"), "isRingMenuEnabled must be patched in objects");
    assert.ok(objectsCode.includes("return false;"), "isRingMenuEnabled must return false");

    // 3. Verify Scene_Map.prototype.updateRingCommandTrigger in SC4_rmmz_scenes_Patches.js
    const scenesCode = fs.readFileSync(path.join(__dirname, "../js/plugins/SC4_rmmz_scenes_Patches.js"), "utf8");
    assert.ok(scenesCode.includes("Scene_Map.prototype.updateRingCommandTrigger = function"), "updateRingCommandTrigger must be patched in scenes");
    assert.ok(scenesCode.includes("this.createRingCommandWindow();"), "createAllWindows must call createRingCommandWindow");
});

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log("\n=================================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("=================================================");
if (failed > 0) process.exit(1);

