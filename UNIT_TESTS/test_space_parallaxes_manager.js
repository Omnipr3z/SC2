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

// Mock PIXI.Container
global.PIXI = {
    Container: class {
        constructor() {
            this.children = [];
            this.visible = true;
        }
        addChild(c) { this.children.push(c); return c; }
        removeChildren() { this.children = []; }
    }
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
require("../js/plugins/SC4_Spriteset_UpperLayers.js");

console.log("==============================================================");
console.log("   TEST : SpaceParallaxesManager & Spriteset_UpperLayers     ");
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
            zoom: 0.12
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
// TEST 1: Static ship -> motionless background & upper ready
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
assert.strictEqual(status.upper.visible, true, "Upper layer container ready");
assert.deepStrictEqual(status.upper.planets, {}, "No planets visible when no system data");
console.log("✓ Static state: background motionless, upper layer ready.");

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
assert.strictEqual(status.upper.visible, false, "Upper container hidden during Warp jump");
console.log("✓ Warp state: switches to Warp texture with rapid scroll, upper layer hidden.");

// ----------------------------------------------------------------------------
// TEST 4: Approaching planet in field of view (178x99 px box) & Zoom *20
// ----------------------------------------------------------------------------
console.log("\n--- Test 4: Planet in Cockpit Field of View & Zoom x20 ---");
mockShip._status = "MoveToOrbit";
mockShip._orbitingPlanetId = 5;
mockShip._x = 80;
mockShip._y = 90;

global.$gameGalaxy = {
    currentSystem() {
        return {
            id: 1,
            _data: { planetIds: [5] },
            planets: [
                { id: 5, name: "Ankaros", bitmapName: "planet_ankaros", x: 100, y: 100, rotationAngle: 0.75, zoom: 0.12 }
            ],
            planet(id) { return id === 5 ? this.planets[0] : null; }
        };
    }
};

status = SpaceParallaxesManager.getParallaxesStatus(1);
assert.strictEqual(status.upper.visible, true, "Upper layer is visible");
const p5 = status.upper.planets[5];
assert.ok(p5, "Planet 5 state returned in planets dictionary");
assert.strictEqual(p5.visible, true, "Planet 5 visible inside field of view");
assert.strictEqual(p5.bitmapName, "planet_ankaros", "Correct planet bitmap");
assert.strictEqual(p5.rotation, 0.75, "Rotation angle transmitted");
assert.strictEqual(p5.zoom, 0.12 * 20, "Planet zoom magnified by 20x (0.12 * 20 = 2.4)");

const headingTest4 = Math.atan2(10, 20);
const fwdTest4 = 20 * Math.cos(headingTest4) + 10 * Math.sin(headingTest4);
const rightTest4 = -20 * Math.sin(headingTest4) + 10 * Math.cos(headingTest4);
const expectedScreenX = Math.round(640 + rightTest4 * (1280 / 178));
const expectedScreenY = Math.round(360 - fwdTest4 * (720 / 99));

assert.strictEqual(p5.screenX, expectedScreenX, "ScreenX properly projected (centered on target path)");
assert.strictEqual(p5.screenY, expectedScreenY, "ScreenY properly projected ahead (top of cockpit)");
console.log("✓ Field of view: planet projected accurately on cockpit coordinates with zoom x20.");

// ----------------------------------------------------------------------------
// TEST 5: Broad-phase culling (> 250px away)
// ----------------------------------------------------------------------------
console.log("\n--- Test 5: Broad-Phase Culling (> 250px) ---");
mockShip._x = -200; // dx = 300 > 250
status = SpaceParallaxesManager.getParallaxesStatus(1);
assert.strictEqual(status.upper.planets[5].visible, false, "Planet hidden when outside 250px zone");
console.log("✓ Broad-phase: distant bodies (> 250px) automatically culled without full projection.");

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
assert.strictEqual(status.upper.planets[5].visible, true, "Planet visible in orbit");
assert.strictEqual(status.upper.planets[5].screenX, 640, "Planet centered horizontally in orbit");
assert.strictEqual(status.upper.planets[5].screenY, 360, "Planet centered vertically in orbit");
console.log("✓ Orbiting state: background still, planet dead center in cockpit window.");

// ----------------------------------------------------------------------------
// TEST 7: Sprite_ParallaxesUpperLayer updateState
// ----------------------------------------------------------------------------
console.log("\n--- Test 7: Sprite_ParallaxesUpperLayer Render Binding ---");
const sprite = new Sprite_ParallaxesUpperLayer();
sprite.preloadBitmap("planet_ankaros");
assert.ok(sprite.bitmap, "Bitmap preloaded");
sprite.updateState(status.upper.planets[5]);

assert.strictEqual(sprite.visible, true, "Sprite is visible");
assert.strictEqual(sprite.x, 640, "Sprite x set to 640");
assert.strictEqual(sprite.y, 360, "Sprite y set to 360");
assert.strictEqual(sprite.rotation, 0.75, "Sprite rotation applied");
assert.strictEqual(sprite.scale.x, 2.4, "Sprite scale X set to zoom (2.4)");
assert.strictEqual(sprite.scale.y, 2.4, "Sprite scale Y set to zoom (2.4)");

sprite.updateState({ visible: false });
assert.strictEqual(sprite.visible, false, "Sprite hidden when state.visible is false");
console.log("✓ Sprite_ParallaxesUpperLayer reacts faithfully to state changes.");

// ----------------------------------------------------------------------------
// TEST 8: Free Navigation Proximity Detection
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
            id: 2,
            _data: { planetIds: [2, 3] },
            planets: [
                { id: 2, name: "Planet 1", bitmapName: "planet_1", x: 1165, y: 132, zoom: 0.1, rotationAngle: 0.2 },
                { id: 3, name: "Planet Far", bitmapName: "planet_6", x: 500, y: 500, zoom: 0.15 }
            ],
            planet(id) { return this.planets.find(p => p.id === id); }
        };
    }
};

status = SpaceParallaxesManager.getParallaxesStatus(1);
assert.strictEqual(status.upper.planets[2].visible, true, "Planet 2 detected in FOV during free flight");
assert.strictEqual(status.upper.planets[2].zoom, 0.1 * 20, "Planet zoom magnified by 20x (0.1 * 20 = 2.0)");
assert.strictEqual(status.upper.planets[3].visible, false, "Planet 3 culled because > 250px away");
console.log("✓ Free navigation: unorbited planet detected in FOV when passing close by.");

// ----------------------------------------------------------------------------
// TEST 9: Moving South (User scenario: relative angle calculation)
// ----------------------------------------------------------------------------
console.log("\n--- Test 9: Moving South Towards Planet (Relative Angle Verification) ---");
mockShip._status = "MoveToOrbit";
mockShip._orbitingPlanetId = 10;
mockShip._x = 500;
mockShip._y = 100;

global.$gameGalaxy = {
    currentSystem() {
        return {
            id: 3,
            _data: { planetIds: [10] },
            planets: [
                { id: 10, name: "South Planet", bitmapName: "planet_south", x: 500, y: 140, zoom: 0.1, rotationAngle: 0 }
            ],
            planet(id) { return id === 10 ? this.planets[0] : null; }
        };
    }
};

status = SpaceParallaxesManager.getParallaxesStatus(1);
const southP = status.upper.planets[10];
assert.strictEqual(southP.visible, true, "Planet visible inside field of view");
assert.strictEqual(southP.screenX, 640, "Planet centered horizontally");
assert.strictEqual(southP.screenY < 360, true, "Planet is in TOP half of cockpit window (ahead)");
const initialY = southP.screenY;

mockShip._x = 500;
mockShip._y = 120;
status = SpaceParallaxesManager.getParallaxesStatus(1);
assert.strictEqual(status.upper.planets[10].visible, true, "Planet still visible");
assert.strictEqual(status.upper.planets[10].screenY > initialY, true, "Planet descends towards center as ship advances");
console.log("✓ Southward navigation: planet enters from top and descends toward center in sync with stars.");

// ----------------------------------------------------------------------------
// TEST 10: Space Station Zoom (zoom * 2 instead of zoom * 20)
// ----------------------------------------------------------------------------
console.log("\n--- Test 10: Space Station Zoom Multiplier (x2) ---");
global.$gameGalaxy = {
    currentSystem() {
        return {
            id: 4,
            _data: { planetIds: [20, 21] },
            planets: [
                { id: 20, name: "Alpha Planet", bitmapName: "planet_alpha", x: 500, y: 120, zoom: 0.1, isStation() { return false; } },
                { id: 21, name: "Starbase Prime", bitmapName: "station_prime", x: 500, y: 120, zoom: 0.1, isStation() { return true; } }
            ],
            planet(id) { return this.planets.find(p => p.id === id); }
        };
    }
};

status = SpaceParallaxesManager.getParallaxesStatus(1);
assert.strictEqual(status.upper.planets[20].zoom, 0.1 * 20, "Regular planet zoom is 20x (2.0)");
assert.strictEqual(status.upper.planets[21].zoom, 0.1 * 2, "Space station zoom is 2x (0.2)");
console.log("✓ Station scale: space station zoom is scaled to x2 while regular planet is scaled to x20.");

// ----------------------------------------------------------------------------
// TEST 11: Spriteset_UpperLayers Container Lifecycle & Indexing
// ----------------------------------------------------------------------------
console.log("\n--- Test 11: Spriteset_UpperLayers Lifecycle & System Reload ---");
const upperContainer = new Spriteset_UpperLayers(4);
assert.strictEqual(upperContainer._currentSystemId, 4, "Initialized with systemId 4");
assert.strictEqual(upperContainer._planets.size, 2, "Two planet sprites indexed from planetIds");

// Render status to container
upperContainer.updateState(status.upper);
const spr20 = upperContainer._planets.get(20);
const spr21 = upperContainer._planets.get(21);
assert.strictEqual(spr20.visible, true, "Sprite 20 updated to visible");
assert.strictEqual(spr20.scale.x, 2.0, "Sprite 20 scale set to 2.0");
assert.strictEqual(spr21.visible, true, "Sprite 21 updated to visible");
assert.strictEqual(spr21.scale.x, 0.2, "Sprite 21 scale set to 0.2");

// Change planetary system
assert.strictEqual(upperContainer.isPlanetarySystemChanging(), false, "System has not changed yet");

global.$gameGalaxy = {
    currentSystem() {
        return {
            id: 99,
            _data: { planetIds: [50] },
            planets: [
                { id: 50, name: "New System Planet", bitmapName: "planet_50", x: 500, y: 120, zoom: 0.1 }
            ],
            planet(id) { return this.planets[0]; }
        };
    }
};

assert.strictEqual(upperContainer.isPlanetarySystemChanging(), true, "isPlanetarySystemChanging detects new systemId 99");
upperContainer.reloadSystem();
assert.strictEqual(upperContainer._currentSystemId, 99, "Current system updated to 99");
assert.strictEqual(upperContainer._planets.size, 1, "Planets re-indexed to new system (1 planet)");
assert.ok(upperContainer._planets.has(50), "Planet 50 sprite exists in new system");
assert.strictEqual(upperContainer._planets.has(20), false, "Old planet 20 cleaned up");

// Test Warp jump: container should become completely invisible
upperContainer.updateState({ visible: false, planets: {}, ships: {} });
assert.strictEqual(upperContainer.visible, false, "Container completely invisible during Warp");

console.log("✓ Spriteset_UpperLayers: multi-planet indexing, system reload detection and Warp culling validated.");

console.log("\n==============================================================");
console.log("  TOUS LES TESTS DU GESTIONNAIRE DE PARALLAXE SONT VALIDÉS ! ");
console.log("==============================================================");
