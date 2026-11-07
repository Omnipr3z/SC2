//=============================================================================
// UNIT TEST - Space Parallaxes Manager & Dual Parallax System
// SC4/UNIT_TESTS/test_space_parallaxes_manager.js
//=============================================================================

const assert = require("assert");

// 1. Mock minimal environment
global.window = global;
global.Graphics = { width: 1280, height: 720, boxWidth: 1280, boxHeight: 720 };
global.ImageManager = {
    loadBitmap(dir, name) { return { name: dir + name }; },
    loadParallax(name) { return { name }; }
};

// Mock Sprite
global.Sprite = class {
    constructor() {
        this.anchor = { x: 0, y: 0 };
        this.scale = { x: 1, y: 1 };
        this.x = 0;
        this.y = 0;
        this.rotation = 0;
        this.visible = true;
        this.bitmap = null;
    }
};

// Require our classes
require("../js/plugins/SC4_SpaceParallaxesManager.js");
require("../js/plugins/SC4_Sprite_ParallaxesUpperLayer.js");

console.log("==============================================================");
console.log("   TEST : SpaceParallaxesManager & Dynamic Space Parallax    ");
console.log("==============================================================");

// Mock spaceship
class MockSpaceship {
    constructor(id = 1) {
        this._id = id;
        this._status = "Static";
        this._x = 100;
        this._y = 100;
        this._speed = 0.5;
        this._isLanded = null;
        this._orbitingPlanetId = null;
    }
    get id() { return this._id; }
    get x() { return this._x; }
    get y() { return this._y; }
    get speed() { return this._speed; }
    isMoving() {
        return this._status === "MoveToDest" || this._status === "MoveToOrbit" || this._status === "InterSystemJump";
    }
    isLanded() { return this._isLanded; }
    get orbitingPlanetId() { return this._orbitingPlanetId; }
    get orbitingPlanet() {
        if (this._orbitingPlanetId === null) return null;
        if (typeof global !== "undefined" && global.$gameGalaxy && typeof global.$gameGalaxy.currentSystem === "function") {
            const sys = global.$gameGalaxy.currentSystem();
            if (sys && typeof sys.planet === "function") {
                const p = sys.planet(this._orbitingPlanetId);
                if (p) return p;
            }
        }
        return {
            id: this._orbitingPlanetId,
            name: "Ankaros",
            bitmapName: "planet_ankaros",
            x: 100,
            y: 100,
            rotationAngle: 0.75,
            zoom: 0.12 // 0.12 on space map -> 1.2 on cockpit window (*10)
        };
    }
}

const mockShip = new MockSpaceship(1);
global.$gameSpaceships = {
    ship(id) { return id === 1 ? mockShip : null; },
    playerShip() { return mockShip; }
};

global.$gameMap = {
    _spaceShipId: 1,
    _shipHeadingVector: { x: 2, y: -3 },
    isSpaceShip() { return this._spaceShipId !== null; },
    spaceShipId() { return this._spaceShipId; },
    shipHeadingVector() { return this._shipHeadingVector; }
};

// ----------------------------------------------------------------------------
// TEST 1: Static ship -> motionless background & no planet
// ----------------------------------------------------------------------------
console.log("\n--- Test 1: Static Ship State ---");
mockShip._status = "Static";
mockShip._orbitingPlanetId = null;

let status = SpaceParallaxesManager.getParallaxesStatus(1);
assert.ok(status, "Status object returned");
assert.strictEqual(status.lower.name, "StarlitSky", "Lower layer name is StarlitSky");
assert.strictEqual(status.lower.sx, 0, "Lower layer sx is 0 when static");
assert.strictEqual(status.lower.sy, 0, "Lower layer sy is 0 when static");
assert.strictEqual(status.lower.loopX, false, "loopX is false when static");
assert.strictEqual(status.mid.name, "Stars", "Mid layer is Stars");
assert.strictEqual(status.mid.visible, true, "Mid layer visible when static");
assert.strictEqual(status.mid.sx, 0, "Mid layer sx is 0 when static");
assert.strictEqual(status.mid.sy, 0, "Mid layer sy is 0 when static");
assert.strictEqual(status.upper.visible, false, "Upper layer planet is hidden when no target planet");
console.log("✓ Static state: background motionless, upper layer hidden.");

// ----------------------------------------------------------------------------
// TEST 2: Moving ship -> directional kinetic scroll proportional to speed
// ----------------------------------------------------------------------------
console.log("\n--- Test 2: Moving Ship State (Sub-light Propulsion) ---");
mockShip._status = "MoveToDest";
mockShip._speed = 1.0; // 2x base speed (base = 0.5)

status = SpaceParallaxesManager.getParallaxesStatus(1);
assert.strictEqual(status.lower.name, "StarlitSky", "Background is StarlitSky");
assert.strictEqual(status.lower.loopX, true, "loopX is active during movement");
assert.strictEqual(status.lower.loopY, true, "loopY is active during movement");
assert.strictEqual(status.lower.sx, 4, "Lower sx scaled by speedRatio (2 * (1.0/0.5) = 4)");
assert.strictEqual(status.lower.sy, -6, "Lower sy scaled by speedRatio (-3 * (1.0/0.5) = -6)");
assert.strictEqual(status.mid.name, "Stars", "Mid layer is Stars");
assert.strictEqual(status.mid.visible, true, "Mid layer is visible during movement");
assert.strictEqual(status.mid.sx, 4 * 1.6, "Mid layer sx scaled by 1.6x for depth");
assert.strictEqual(status.mid.sy, -6 * 1.6, "Mid layer sy scaled by 1.6x for depth");
console.log("✓ Moving state: kinetic scroll correctly oriented and scaled to engine speed.");

// ----------------------------------------------------------------------------
// TEST 3: InterSystemJump (Warp)
// ----------------------------------------------------------------------------
console.log("\n--- Test 3: Warp Jump State ---");
mockShip._status = "InterSystemJump";

status = SpaceParallaxesManager.getParallaxesStatus(1);
assert.strictEqual(status.lower.name, "Warp", "Background switches to Warp");
assert.strictEqual(status.lower.loopX, true, "loopX is true for Warp");
assert.strictEqual(status.lower.sx, 8, "Fast sx speed during Warp");
assert.strictEqual(status.mid.visible, false, "Mid layer hidden during Warp jump");
console.log("✓ Warp state: switches to Warp texture with rapid scroll.");

// ----------------------------------------------------------------------------
// TEST 4: Approaching planet in field of view (178x99 px box)
// ----------------------------------------------------------------------------
console.log("\n--- Test 4: Planet in Cockpit Field of View ---");
mockShip._status = "MoveToOrbit";
mockShip._orbitingPlanetId = 5;
// Planet is at (100, 100), ship is at (80, 90) -> dx = 20, dy = 10 (well within halfW 89, halfH 49.5)
mockShip._x = 80;
mockShip._y = 90;

status = SpaceParallaxesManager.getParallaxesStatus(1);
assert.strictEqual(status.upper.visible, true, "Planet visible inside field of view");
assert.strictEqual(status.upper.bitmapName, "planet_ankaros", "Correct planet bitmap");
assert.strictEqual(status.upper.rotation, 0.75, "Rotation angle transmitted");
assert.strictEqual(status.upper.zoom, 1.2, "Planet zoom transmitted");

const expectedCenterX = 640;
const expectedCenterY = 360;
const headingTest4 = Math.atan2(10, 20);
const fwdTest4 = 20 * Math.cos(headingTest4) + 10 * Math.sin(headingTest4);
const rightTest4 = -20 * Math.sin(headingTest4) + 10 * Math.cos(headingTest4);
const expectedScreenX = Math.round(640 + rightTest4 * (1280 / 178));
const expectedScreenY = Math.round(360 - fwdTest4 * (720 / 99));

assert.strictEqual(status.upper.screenX, expectedScreenX, "ScreenX properly projected (centered on target path)");
assert.strictEqual(status.upper.screenY, expectedScreenY, "ScreenY properly projected ahead (top of cockpit)");
console.log("✓ Field of view: planet projected accurately on cockpit coordinates.");

// ----------------------------------------------------------------------------
// TEST 5: Planet out of field of view (outside 178x99 px box)
// ----------------------------------------------------------------------------
console.log("\n--- Test 5: Planet Outside Field of View ---");
mockShip._x = -100; // dx = 200 > 89
status = SpaceParallaxesManager.getParallaxesStatus(1);
assert.strictEqual(status.upper.visible, false, "Planet hidden when outside field of view");
console.log("✓ Outside range: upper layer remains invisible.");

// ----------------------------------------------------------------------------
// TEST 6: In-orbit stationary state (perfect center)
// ----------------------------------------------------------------------------
console.log("\n--- Test 6: In-Orbit Stationary State ---");
mockShip._status = "Orbiting";
mockShip._x = 100;
mockShip._y = 100;

status = SpaceParallaxesManager.getParallaxesStatus(1);
assert.strictEqual(status.lower.sx, 0, "Lower layer stars motionless in orbit");
assert.strictEqual(status.lower.sy, 0, "Lower layer stars motionless in orbit");
assert.strictEqual(status.upper.visible, true, "Planet visible in orbit");
assert.strictEqual(status.upper.screenX, 640, "Planet centered horizontally in orbit");
assert.strictEqual(status.upper.screenY, 360, "Planet centered vertically in orbit");
console.log("✓ Orbiting state: background still, planet dead center in cockpit window.");

// ----------------------------------------------------------------------------
// TEST 7: Sprite_ParallaxesUpperLayer updateState
// ----------------------------------------------------------------------------
console.log("\n--- Test 7: Sprite_ParallaxesUpperLayer Render Binding ---");
const sprite = new Sprite_ParallaxesUpperLayer();
sprite.updateState(status.upper);

assert.strictEqual(sprite.visible, true, "Sprite is visible");
assert.strictEqual(sprite.x, 640, "Sprite x set to 640");
assert.strictEqual(sprite.y, 360, "Sprite y set to 360");
assert.strictEqual(sprite.rotation, 0.75, "Sprite rotation applied");
assert.strictEqual(sprite.scale.x, 1.2, "Sprite scale X set to zoom");
assert.strictEqual(sprite.scale.y, 1.2, "Sprite scale Y set to zoom");

sprite.updateState({ visible: false });
assert.strictEqual(sprite.visible, false, "Sprite hidden when state.visible is false");
console.log("✓ Sprite_ParallaxesUpperLayer reacts faithfully to state changes.");

// ----------------------------------------------------------------------------
// TEST 8: Free Navigation Proximity Detection (no orbit assigned yet)
// ----------------------------------------------------------------------------
console.log("\n--- Test 8: Free Navigation Proximity Detection ---");
mockShip._status = "MoveToDest";
mockShip._orbitingPlanetId = null;
mockShip._x = 1100;
mockShip._y = 160;
mockShip.targetX = 1100;
mockShip.targetY = 100; // Moving North (heading = -Math.PI / 2)

global.$gameGalaxy = {
    currentSystem() {
        return {
            planets: [
                { id: 2, name: "Planet 1", bitmapName: "planet_1", x: 1165, y: 132, zoom: 0.1, rotationAngle: 0.2 },
                { id: 3, name: "Planet Far", bitmapName: "planet_6", x: 500, y: 500, zoom: 0.15 }
            ]
        };
    }
};

status = SpaceParallaxesManager.getParallaxesStatus(1);
assert.strictEqual(status.upper.visible, true, "Planet 2 detected in FOV during free flight");
assert.strictEqual(status.upper.bitmapName, "planet_1", "Correct planet bitmap from system");
assert.strictEqual(status.upper.zoom, 1.0, "Planet zoom magnified by 10x (0.1 * 10 = 1.0)");
console.log("✓ Free navigation: unorbited planet detected in FOV when passing close by.");

// ----------------------------------------------------------------------------
// TEST 9: Moving South (User scenario: approaching planet from top of galaxy)
// ----------------------------------------------------------------------------
console.log("\n--- Test 9: Moving South Towards Planet (Relative Angle Verification) ---");
mockShip._status = "MoveToOrbit";
mockShip._orbitingPlanetId = 10;
mockShip._x = 500;
mockShip._y = 100;

global.$gameGalaxy = {
    currentSystem() {
        return {
            planets: [
                { id: 10, name: "South Planet", bitmapName: "planet_south", x: 500, y: 140, zoom: 0.1, rotationAngle: 0 }
            ],
            planet(id) { return id === 10 ? this.planets[0] : null; }
        };
    }
};

// 1. Initial position: ship at y=100, target planet at y=140 (ahead by 40px in South direction)
status = SpaceParallaxesManager.getParallaxesStatus(1);
assert.strictEqual(status.upper.visible, true, "Planet visible inside field of view");
assert.strictEqual(status.upper.screenX, 640, "Planet centered horizontally");
// D_forward = 40px ahead -> screenY = 360 - 40 * (720 / 99) = 360 - 291 = 69 (near TOP of screen)
assert.strictEqual(status.upper.screenY < 360, true, "Planet is in TOP half of cockpit window (ahead)");
const initialY = status.upper.screenY;

// 2. Advance ship South towards planet: ship moves to y=120 (closer, distance = 20px)
mockShip._x = 500;
mockShip._y = 120;
status = SpaceParallaxesManager.getParallaxesStatus(1);
assert.strictEqual(status.upper.visible, true, "Planet still visible");
// As ship gets closer, screenY moves DOWNWARDS towards center, in sync with stars!
assert.strictEqual(status.upper.screenY > initialY, true, "Planet descends towards center as ship advances");
assert.strictEqual(status.upper.screenY < 360, true, "Planet is still approaching center");
console.log("✓ Southward navigation: planet enters from top and descends toward center in sync with stars.");

console.log("\n==============================================================");
console.log("  TOUS LES TESTS DU GESTIONNAIRE DE PARALLAXE SONT VALIDÉS ! ");
console.log("==============================================================");

