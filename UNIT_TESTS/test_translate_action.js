//=============================================================================
// test_translate_action.js
// Unit tests for SimCraft 4 playTranslateAction transitive action & queue system
//=============================================================================

const assert = require("assert");

console.log("=================================================");
console.log("  TEST SUITE: SC4 Transitive Action System       ");
console.log("=================================================");

// Mock environment on global
global.window = global;
global.Graphics = { frameCount: 120, width: 1760, height: 990 };
global.DEBUGTOOL = { log: () => {}, warn: () => {}, error: () => {} };
global.SoundManager = { playBuzzer: () => {} };
global.DataManager = { itemRawWeight: () => 0 };
global.PluginManager = { registerCommand: () => {} };
global.SceneManager = { push: () => {}, pop: () => {} };
global.TouchInput = { isRightPressed: () => false };

class MockTemp {
    setDestination() {}
}
class MockSystem {}
class MockAction {
    setSubject() {}
    subject() {}
    friendsUnit() {}
    opponentsUnit() {}
    testApply() {}
}
class MockActors {
    actor() { return new MockActor(1); }
}
class MockBattlerBase {
    xparam() { return 0; }
}
class MockActor {
    constructor(id = 1) { this._id = id; }
    actorId() { return this._id; }
    profile() { return ""; }
}
class MockEnemy {
    name() { return ""; }
}
class MockMap {
    setup() {}
    events() { return []; }
    roundX(x) { return x; }
    roundY(y) { return y; }
}
class MockCharacterBase {
    constructor() {
        this.initMembers();
    }
    initMembers() {
        this._x = 10;
        this._y = 10;
        this._realX = 10;
        this._realY = 10;
        this._direction = 2;
        this._action = "walk";
        this._isActing = false;
        this._actionPattern = 0;
        this._actionTimer = 0;
        this._actionMaxFrames = 4;
        this._actionFrameDuration = 4;
        this._actionFreezeLastFrame = false;
        this._actionOnEnd = null;
        this._pose = "walk";
        this._actionQueue = [];
        this._currentQueueItem = null;
        this._isRotating = false;
        this._rotatePath = [];
        this._rotateTimer = 0;
        this._rotateStepDelay = 3;
        this._rotateOnEnd = null;
    }
    direction() { return this._direction; }
    setDirection(d) { this._direction = d; }
    isActing() {
        return Boolean(this._isActing || this._isRotating || (this._actionQueue && this._actionQueue.length > 0));
    }
    canAct() {
        if (this._queueBypassCanAct) return true;
        return !this.isActing();
    }
    refreshBushDepth() {}
    resetPattern() {}
}
class MockCharacter extends MockCharacterBase {}
class MockPlayer extends MockCharacterBase {
    constructor() {
        super();
        this._followers = [];
    }
    followers() {
        return { data: () => this._followers, synchronize: () => {} };
    }
}
class MockFollower extends MockCharacterBase {}
class MockEvent extends MockCharacterBase {}
class MockInterpreter {
    character(param) {
        return global.$gamePlayer;
    }
}
class MockParty {
    leader() { return new MockActor(1); }
    isOverloaded() { return false; }
}

global.Game_Temp = MockTemp;
global.Game_System = MockSystem;
global.Game_Action = MockAction;
global.Game_BattlerBase = MockBattlerBase;
global.Game_Actors = MockActors;
global.Game_Actor = MockActor;
global.Game_Enemy = MockEnemy;
global.Game_Party = MockParty;
global.Game_Map = MockMap;
global.Game_CharacterBase = MockCharacterBase;
global.Game_Character = MockCharacter;
global.Game_Player = MockPlayer;
global.Game_Follower = MockFollower;
global.Game_Event = MockEvent;
global.Game_Interpreter = MockInterpreter;

global.$gameTemp = new MockTemp();
global.$gameSystem = new MockSystem();
global.$gameParty = new MockParty();
global.$gameMap = new MockMap();
global.$gamePlayer = new MockPlayer();

// Load the patches containing playTranslateAction, playRotate, and actionQueue
require("../js/plugins/SC4_rmmz_objects_Patches.js");

let passed = 0;
let failed = 0;

function it(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${name}`);
        console.error(err);
        failed++;
    }
}

// -------------------------------------------------------------
// Suite 1: Direction & Coordinate Translation
// -------------------------------------------------------------
console.log("\n--- Suite 1: Direction & Coordinate Translation ---");

it("playTranslateAction with smoothRotate: false snaps direction immediately", () => {
    const player = new MockPlayer();
    player._x = 20;
    player._y = 15;
    player._direction = 2; // Facing down

    const started = player.playTranslateAction("standup_bed", "standup_floor", 6, {
        duration: 2,
        frames: 3,
        smoothRotate: false
    });

    assert.strictEqual(started, true);
    assert.strictEqual(player.direction(), 6); // Immediately turned right
    assert.strictEqual(player._action, "standup_bed");
    assert.strictEqual(player.isActing(), true);
    assert.strictEqual(player._x, 20); // Still on original tile during Action 1
});

it("Shifts physical coordinates exactly when Action 1 ends and begins Action 2", () => {
    const player = new MockPlayer();
    player._x = 27;
    player._y = 22;
    player._direction = 6; // Already facing 6 -> no rotate step needed

    player.playTranslateAction(
        { action: "standup_1", duration: 2, frames: 2 },
        { action: "standup_2", duration: 2, frames: 2 },
        6
    );

    // Frame 1: Action 1 running
    player.updateAction();
    assert.strictEqual(player._action, "standup_1");
    assert.strictEqual(player._x, 27);

    // Frame 2: Action 1 timer reaches 2 -> pattern 1
    player.updateAction();
    assert.strictEqual(player._action, "standup_1");
    assert.strictEqual(player._x, 27);

    // Frame 3: Action 1 timer reaches 3
    player.updateAction();
    assert.strictEqual(player._action, "standup_1");
    assert.strictEqual(player._x, 27);

    // Frame 4: Action 1 ends -> triggers transition in queue!
    // Coordinates shift to 28, and Action 2 starts immediately
    player.updateAction();
    assert.strictEqual(player._x, 28); // Physical X moved by +1!
    assert.strictEqual(player._realX, 28);
    assert.strictEqual(player._action, "standup_2"); // Switched seamlessly to Action 2!
    assert.strictEqual(player.isActing(), true);
    assert.strictEqual(player.direction(), 6);
});

it("Maintains isActing() throughout the full sequence until Action 2 finishes", () => {
    const player = new MockPlayer();
    player._x = 10;
    player._y = 10;
    player._direction = 4; // Already facing 4
    let endCalled = false;

    player.playTranslateAction(
        { action: "act1", duration: 1, frames: 2 },
        { action: "act2", duration: 1, frames: 2 },
        4, // Left (dx = -1)
        { onEnd: () => { endCalled = true; } }
    );

    assert.strictEqual(player.isActing(), true);
    assert.strictEqual(player.direction(), 4);

    // Step through Action 1 (2 frames of duration 1)
    player.updateAction();
    assert.strictEqual(player.isActing(), true);
    player.updateAction(); // Transition occurs here: shifts to (9, 10) and launches act2
    assert.strictEqual(player._x, 9);
    assert.strictEqual(player.isActing(), true);
    assert.strictEqual(player._action, "act2");

    // Step through Action 2 (2 frames of duration 1)
    player.updateAction();
    assert.strictEqual(player.isActing(), true);
    player.updateAction(); // Action 2 ends
    assert.strictEqual(player.isActing(), false);
    assert.strictEqual(player._action, "walk");
    assert.strictEqual(endCalled, true);
});

// -------------------------------------------------------------
// Suite 2: Flexible Syntax & Interpreter Integration
// -------------------------------------------------------------
console.log("\n--- Suite 2: Flexible Syntax & Interpreter Integration ---");

it("Supports single configuration object syntax", () => {
    const player = new MockPlayer();
    player._x = 5;
    player._y = 5;
    player._direction = 8; // Already facing 8

    player.playTranslateAction({
        action1: "vault_up",
        action2: "vault_land",
        direction: 8 // Up (dy = -1)
    });

    assert.strictEqual(player._action, "vault_up");
    assert.strictEqual(player.direction(), 8);

    // Complete Action 1 (4 frames by default)
    while (player._action === "vault_up") {
        player.updateAction();
    }

    assert.strictEqual(player._x, 5);
    assert.strictEqual(player._y, 4); // Moved Up by 1!
    assert.strictEqual(player._action, "vault_land");
});

it("Game_Interpreter.prototype.playTranslateAction triggers successfully on player", () => {
    const interpreter = new MockInterpreter();
    global.$gamePlayer._x = 30;
    global.$gamePlayer._y = 20;
    global.$gamePlayer._direction = 8;

    const res = interpreter.playTranslateAction("climb_start", "climb_finish", 8, { isPlayer: true });
    assert.strictEqual(res, true);
    assert.strictEqual(global.$gamePlayer._action, "climb_start");
    assert.strictEqual(global.$gamePlayer.direction(), 8);
});

// -------------------------------------------------------------
// Suite 3: Smooth 8-Direction Rotation (playRotate)
// -------------------------------------------------------------
console.log("\n--- Suite 3: Smooth 8-Direction Rotation ---");

it("Calculates shortest path from 1 (Bas-Gauche) to 6 (Droite)", () => {
    const player = new MockPlayer();
    const turn = player.getShortestTurnPath(1, 6);
    assert.strictEqual(turn.steps, 3);
    assert.deepStrictEqual(turn.path, [2, 3, 6]); // Bas -> Bas-Droite -> Droite
});

it("Respects tie-breaker at 180° opposite angles", () => {
    const player = new MockPlayer();
    // 8 (Haut) to 2 (Bas) -> passes via Right (6)
    const turn1 = player.getShortestTurnPath(8, 2);
    assert.strictEqual(turn1.steps, 4);
    assert.deepStrictEqual(turn1.path, [9, 6, 3, 2]);

    // 4 (Gauche) to 6 (Droite) -> passes via Down (2)
    const turn2 = player.getShortestTurnPath(4, 6);
    assert.strictEqual(turn2.steps, 4);
    assert.deepStrictEqual(turn2.path, [1, 2, 3, 6]);
});

it("playRotate rotates frame by frame with stepDelay", () => {
    const player = new MockPlayer();
    player._direction = 1; // Bas-Gauche
    let rotateDone = false;

    // Rotate to 6 with 2 frames per step
    player.playRotate(6, { stepDelay: 2, onEnd: () => { rotateDone = true; } });
    assert.strictEqual(player.isActing(), true);
    assert.strictEqual(player.direction(), 1);

    // Frame 1
    player.updateAction();
    assert.strictEqual(player.direction(), 1);

    // Frame 2: Step 1 applied (Bas / 2)
    player.updateAction();
    assert.strictEqual(player.direction(), 2);

    // Frame 3
    player.updateAction();
    assert.strictEqual(player.direction(), 2);

    // Frame 4: Step 2 applied (Bas-Droite / 3)
    player.updateAction();
    assert.strictEqual(player.direction(), 3);

    // Frame 5
    player.updateAction();
    assert.strictEqual(player.direction(), 3);

    // Frame 6: Step 3 applied (Droite / 6) -> rotation ends!
    player.updateAction();
    assert.strictEqual(player.direction(), 6);
    assert.strictEqual(rotateDone, true);
    assert.strictEqual(player._isRotating, false);
});

it("playTranslateAction executes smooth rotation before Action 1 by default", () => {
    const player = new MockPlayer();
    player._x = 10;
    player._y = 10;
    player._direction = 1; // Facing Bas-Gauche, target is 6 (Droite)

    player.playTranslateAction(
        { action: "sleep_out", duration: 1, frames: 1 },
        { action: "stand_floor", duration: 1, frames: 1 },
        6,
        { rotateDelay: 2 }
    );

    // At start, player is rotating, not yet playing Action 1
    assert.strictEqual(player.isActing(), true);
    assert.strictEqual(player._isRotating, true);
    assert.strictEqual(player.direction(), 1);

    // Rotate step 1 (2 frames -> direction 2)
    player.updateAction();
    player.updateAction();
    assert.strictEqual(player.direction(), 2);

    // Rotate step 2 (2 frames -> direction 3)
    player.updateAction();
    player.updateAction();
    assert.strictEqual(player.direction(), 3);

    // Rotate step 3 (2 frames -> direction 6)
    player.updateAction();
    player.updateAction();
    assert.strictEqual(player.direction(), 6);
    assert.strictEqual(player._isRotating, false);

    // Action 1 starts automatically!
    assert.strictEqual(player._action, "sleep_out");
    assert.strictEqual(player._x, 10);

    // Complete Action 1 (duration 1, frames 1 -> 1 frame)
    player.updateAction();

    // Coordinates translated! Action 2 starts!
    assert.strictEqual(player._x, 11);
    assert.strictEqual(player._action, "stand_floor");

    // Complete Action 2
    player.updateAction();
    assert.strictEqual(player.isActing(), false);
    assert.strictEqual(player._action, "walk");
});

// -------------------------------------------------------------
// Suite 4: Action Queue & Repetition Engine
// -------------------------------------------------------------
console.log("\n--- Suite 4: Action Queue & Repetition Engine ---");

it("queueActions executes multiple actions sequentially", () => {
    const player = new MockPlayer();
    const history = [];

    player.queueActions([
        { type: "action", action: "atk", duration: 1, frames: 1, onEnd: () => history.push("atk") },
        { type: "wait", duration: 2 },
        { type: "action", action: "cheer", duration: 1, frames: 1, onEnd: () => history.push("cheer") }
    ]);

    assert.strictEqual(player.isActing(), true);
    assert.strictEqual(player._action, "atk");

    player.updateAction(); // finishes atk
    assert.deepStrictEqual(history, ["atk"]);

    // Wait step (2 frames)
    player.updateAction();
    player.updateAction();

    // Cheer action starts
    assert.strictEqual(player._action, "cheer");
    player.updateAction(); // finishes cheer
    assert.deepStrictEqual(history, ["atk", "cheer"]);
    assert.strictEqual(player.isActing(), false);
});

it("Repeats action N times when repeat: N is specified", () => {
    const player = new MockPlayer();
    let count = 0;

    player.queueAction({
        type: "action",
        action: "punch",
        duration: 1,
        frames: 1,
        repeat: 2, // 2 repeats -> runs 3 times total
        onEnd: () => { count++; }
    });

    player.updateAction(); // Run 1
    assert.strictEqual(count, 1);
    assert.strictEqual(player.isActing(), true);

    player.updateAction(); // Run 2
    assert.strictEqual(count, 2);
    assert.strictEqual(player.isActing(), true);

    player.updateAction(); // Run 3 (final)
    assert.strictEqual(count, 3);
    assert.strictEqual(player.isActing(), false);
});

it("stopActionRepeat() stops infinite repeat gracefully", () => {
    const player = new MockPlayer();
    let loops = 0;

    player.queueAction({
        type: "action",
        action: "idle_smoke",
        duration: 1,
        frames: 1,
        repeat: true, // Infinite repeat
        onEnd: () => { loops++; }
    });

    player.updateAction();
    assert.strictEqual(loops, 1);
    player.updateAction();
    assert.strictEqual(loops, 2);

    // Stop repeat
    player.stopActionRepeat();

    // Next completion ends the repeat
    player.updateAction();
    assert.strictEqual(loops, 3);
    assert.strictEqual(player.isActing(), false);
});

it("Cleans initial pose at end of translate action returning cleanly to walk", () => {
    const player = new MockPlayer();
    player.setPose("standup_bed");
    assert.strictEqual(player.isPoseActive(), true);
    assert.strictEqual(player.pose(), "standup_bed");

    player.playTranslateAction(
        { action: "standup_bed", duration: 1, frames: 1 },
        { action: "realign", duration: 1, frames: 1 },
        6,
        { smoothRotate: false }
    );

    // During action 1
    assert.strictEqual(player._action, "standup_bed");
    player.updateAction();

    // After action 1 -> translated, action 2 starts
    assert.strictEqual(player._action, "realign");
    player.updateAction();

    // After action 2 -> queue executed clearPose automatically!
    assert.strictEqual(player.isPoseActive(), false);
    assert.strictEqual(player.pose(), null);
    assert.strictEqual(player._action, "walk"); // Cleanly in walk!
});

it("Supports custom finalPose in playTranslateAction", () => {
    const player = new MockPlayer();
    player.playTranslateAction(
        { action: "jump_down", duration: 1, frames: 1 },
        { action: "land_kneel", duration: 1, frames: 1 },
        2,
        { smoothRotate: false, finalPose: "kneel" }
    );

    player.updateAction(); // Action 1 ends
    player.updateAction(); // Action 2 ends

    assert.strictEqual(player.isPoseActive(), true);
    assert.strictEqual(player.pose(), "kneel");
    assert.strictEqual(player.action(), "kneel");
});

console.log("\n=================================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("=================================================");

if (failed > 0) {
    process.exit(1);
}
