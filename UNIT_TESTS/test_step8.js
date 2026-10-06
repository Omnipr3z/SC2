/**
 * ============================================================================
 * UNIT TEST : Étape 8 - Course / Sprint & Poses de Course (Run / Dash)
 * ============================================================================
 * Valide la gestion de la course pour le joueur, les compagnons et les événements :
 * - Résolution des calques composites pour l'action 'dash' / 'run' (_run.png).
 * - Cache de composite avec clé normalisée ('dash' -> 'run').
 * - Détection de l'état de course : le joueur immobile reste en 'walk' (idle),
 *   mais passe en 'dash' dès qu'il est en mouvement avec Shift / Dash enfoncé.
 * - Priorité des actions : les actions temporaires ('atk') prévalent sur 'dash'.
 * - Synchronisation des compagnons : adoptent 'dash' et la vitesse du joueur.
 * - Vitesse des événements : événements de vitesse 5 ("Rapide") ou 6 ("Plus rapide")
 *   passent en 'dash' pendant leur déplacement.
 * - Basculement dynamique du bitmap dans Sprite_Hero.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Mock browser / RMMZ global objects
global.window = global;
global.navigator = { userAgent: 'node' };
global.document = {
    createElement: () => ({
        getContext: () => ({
            drawImage() {},
            getImageData: () => ({ data: [] }),
            putImageData() {},
            clearRect() {}
        })
    })
};

global.$dataSystem = {
    optTransparent: false,
    optFollowers: true
};

global.$dataArmors = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Armors.json'), 'utf8'));
global.$dataWeapons = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Weapons.json'), 'utf8'));
global.$dataActors = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Actors.json'), 'utf8'));

global.Bitmap = class Bitmap {
    constructor(w = 288, h = 768) {
        this.width = w;
        this.height = h;
        this._ready = true;
    }
    isReady() { return this._ready; }
    resize(w, h) { this.width = w; this.height = h; }
    clear() {}
    blt(source, sx, sy, sw, sh, dx, dy) {}
};

global.ImageManager = {
    loadBitmap(folder, filename) {
        const b = new Bitmap(96, 96);
        b._folder = folder;
        b._filename = filename;
        return b;
    },
    loadCharacter() { return new Bitmap(144, 192); },
    isObjectCharacter() { return false; }
};

global.Graphics = { width: 1280, height: 720 };
global.TouchInput = { isTriggered() { return false; }, isRightPressed() { return false; } };
global.Input = {
    _pressed: {},
    dir8: 0,
    dir4: 0,
    isPressed(key) { return Boolean(this._pressed[key]); }
};

global.SoundManager = { playCancel() {} };
global.ConfigManager = { alwaysDash: false };

global.Game_Actor = class Game_Actor {
    constructor(actorId) {
        this.setup(actorId);
    }
    setup(actorId) {
        this._actorId = actorId;
    }
    actorId() { return this._actorId; }
    actor() { return $dataActors[this._actorId]; }
    equips() {
        const actorData = this.actor();
        if (!actorData || !actorData.equips) return [];
        return actorData.equips.map((id, slot) => {
            if (id === 0) return null;
            return slot === 0 ? $dataWeapons[id] : $dataArmors[id];
        });
    }
    weapons() {
        const eq = this.equips();
        return eq[0] ? [eq[0]] : [];
    }
    characterName() { return this.actor() ? this.actor().characterName : ""; }
    characterIndex() { return this.actor() ? this.actor().characterIndex : 0; }
    isHero() { return false; }
};

global.Game_Actors = class Game_Actors {
    constructor() { this._data = []; }
    actor(id) {
        if (!this._data[id]) {
            this._data[id] = new (global.Game_Hero || Game_Actor)(id);
        }
        return this._data[id];
    }
};

global.Game_Message = class Game_Message {
    constructor() { this.clear(); }
    clear() {
        this._texts = [];
        this._choices = [];
        this._choiceCallback = null;
    }
    add(text) { this._texts.push(text); }
    hasText() { return this._texts.length > 0; }
    allText() { return this._texts.join("\n"); }
    isChoice() { return this._choices.length > 0; }
    setChoices(choices, defaultType, cancelType) {
        this._choices = choices;
        this._defaultType = defaultType;
        this._cancelType = cancelType;
    }
    setChoiceCallback(cb) { this._choiceCallback = cb; }
    onChoice(n) { if (this._choiceCallback) this._choiceCallback(n); }
    isBusy() { return this.hasText() || this.isChoice(); }
};

global.Game_CharacterBase = class Game_CharacterBase {
    constructor() { this.initMembers(); }
    initMembers() {
        this._x = 0;
        this._y = 0;
        this._realX = 0;
        this._realY = 0;
        this._direction = 2;
        this._pattern = 0;
        this._transparent = false;
        this._through = false;
        this._characterName = "";
        this._characterIndex = 0;
        this._moveSpeed = 4;
    }
    get x() { return this._x; }
    get y() { return this._y; }
    pos(x, y) { return this._x === x && this._y === y; }
    direction() { return this._direction; }
    setDirection(d) { this._direction = d; }
    pattern() { return this._pattern; }
    setPattern(p) { this._pattern = p; }
    resetPattern() { this._pattern = 0; }
    characterName() { return this._characterName; }
    characterIndex() { return this._characterIndex; }
    setImage(name, index) { this._characterName = name; this._characterIndex = index; }
    locate(x, y) { this._x = x; this._y = y; this._realX = x; this._realY = y; }
    isTransparent() { return this._transparent; }
    setTransparent(t) { this._transparent = t; }
    isThrough() { return this._through; }
    setThrough(t) { this._through = t; }
    isMoving() { return this._realX !== this._x || this._realY !== this._y; }
    isMovementSucceeded() { return true; }
    canPass() { return true; }
    moveSpeed() { return this._moveSpeed; }
    setMoveSpeed(s) { this._moveSpeed = s; }
    isDashing() { return false; }
    realMoveSpeed() { return this._moveSpeed + (this.isDashing() ? 1 : 0); }
    distancePerFrame() { return Math.pow(2, this.realMoveSpeed()) / 256; }
    checkStop() {}
};

global.Game_Character = class Game_Character extends Game_CharacterBase {
    searchLimit() { return 12; }
    findDirectionTo(goalX, goalY) { return 2; }
};

global.Game_Player = class Game_Player extends Game_Character {
    constructor() {
        super();
        this._dashing = false;
        this._followers = new Game_Followers();
    }
    followers() { return this._followers; }
    hero() {
        const actor = typeof $gameParty !== "undefined" ? $gameParty.leader() : null;
        return (actor && actor.isHero && actor.isHero()) ? actor : null;
    }
    isHero() { return Boolean(this.hero()); }
    aimDirection() { return 6; }
    isAiming() { return false; }
    canMove() { return true; }
    refresh() {}
    isDashing() { return this._dashing; }
    setDashing(val) { this._dashing = val; }
};

global.Game_Follower = class Game_Follower extends Game_Character {
    constructor(memberIndex) {
        super();
        this._memberIndex = memberIndex;
    }
    actor() {
        return $gameParty.battleMembers()[this._memberIndex];
    }
    isVisible() {
        return Boolean(this.actor());
    }
};

global.Game_Followers = class Game_Followers {
    constructor() {
        this._data = [];
        for (let i = 1; i < 4; i++) {
            this._data.push(new Game_Follower(i));
        }
    }
    data() { return this._data; }
    visibleFollowers() { return this._data.filter(f => f.isVisible()); }
    follower(i) { return this._data[i]; }
};

global.Game_Event = class Game_Event extends Game_Character {
    constructor(mapId, eventId, eventData) {
        super();
        this._mapId = mapId;
        this._eventId = eventId;
        this._eventData = eventData || { note: "", pages: [{ list: [], image: { characterName: "", characterIndex: 0, direction: 2, pattern: 0 } }] };
        this._pageIndex = 0;
        this.setupPage();
    }
    event() { return this._eventData; }
    page() { return this._eventData.pages[this._pageIndex]; }
    setupPage() {
        this.setupPageSettings();
        this.refresh();
    }
    setupPageSettings() {
        const page = this.page();
        if (page && page.image) {
            this.setImage(page.image.characterName, page.image.characterIndex);
        }
    }
    start() {
        this._started = true;
    }
};

global.Game_Party = class Game_Party {
    constructor() {
        this._actors = [1];
    }
    leader() { return $gameActors.actor(this._actors[0]); }
    members() { return this._actors.map(id => $gameActors.actor(id)); }
    battleMembers() { return this.members().slice(0, 4); }
    addActor(id) {
        if (!this._actors.includes(id)) {
            this._actors.push(id);
            $gamePlayer.refresh();
        }
    }
    removeActor(id) {
        const idx = this._actors.indexOf(id);
        if (idx >= 0) {
            this._actors.splice(idx, 1);
            $gamePlayer.refresh();
        }
    }
};

global.Game_Map = class Game_Map {
    constructor() {
        this._events = [];
    }
    events() { return this._events; }
    event(id) { return this._events.find(e => e._eventId === id); }
    eventsXy(x, y) { return this._events.filter(e => e.pos(x, y)); }
    width() { return 20; }
    height() { return 20; }
    isLoopHorizontal() { return false; }
    isLoopVertical() { return false; }
    isValid(x, y) { return x >= 0 && x < 20 && y >= 0 && y < 20; }
    isPassable() { return true; }
    deltaX(x1, x2) { return x1 - x2; }
    deltaY(y1, y2) { return y1 - y2; }
    roundX(x) { return x; }
    roundY(y) { return y; }
    roundXWithDirection(x, d) { return x + (d === 6 || d === 3 || d === 9 ? 1 : d === 4 || d === 1 || d === 7 ? -1 : 0); }
    roundYWithDirection(y, d) { return y + (d === 2 || d === 1 || d === 3 ? 1 : d === 8 || d === 7 || d === 9 ? -1 : 0); }
    isAnyEventStarting() { return false; }
    setupStartingEvent() { return false; }
    isDashDisabled() { return false; }
};

global.Game_Temp = class Game_Temp {
    constructor() {
        this._destValid = false;
        this._destX = 0;
        this._destY = 0;
    }
    isDestinationValid() { return this._destValid; }
    destinationX() { return this._destX; }
    destinationY() { return this._destY; }
    setDestination(x, y) { this._destValid = true; this._destX = x; this._destY = y; }
    clearDestination() { this._destValid = false; }
};

global.Game_Interpreter = class Game_Interpreter {
    constructor(eventId = 0) {
        this._eventId = eventId;
        this._waitMode = "";
    }
    character(param) {
        if (param > 0) return $gameMap.event(param);
        if (param === 0) return $gameMap.event(this._eventId);
        return $gamePlayer;
    }
    setWaitMode(mode) { this._waitMode = mode; }
    updateWaitMode() { return false; }
};

global.Sprite = class Sprite {
    constructor() {
        this.visible = true;
        this.opacity = 255;
    }
    update() {}
};

global.Sprite_Character = class Sprite_Character extends Sprite {
    constructor(character) {
        super();
        this._character = character;
        this.initMembers();
    }
    initMembers() {}
    isImageChanged() { return false; }
    setCharacterBitmap() { this.bitmap = new Bitmap(144, 192); }
    patternWidth() { return 48; }
    patternHeight() { return 48; }
    characterBlockX() { return 0; }
    characterBlockY() { return 0; }
    characterPatternX() { return 1; }
    characterPatternY() { return 0; }
    isEmptyCharacter() { return false; }
    update() {
        super.update();
        this.updateBitmap();
        this.visible = !this.isEmptyCharacter() && !this._character.isTransparent();
    }
    updateBitmap() {}
};

global.Spriteset_Map = class Spriteset_Map {
    createCharacterSprite(character) {
        return new Sprite_Character(character);
    }
};

// Global singletons
global.$gameActors = new Game_Actors();
global.$gameParty = new Game_Party();
global.$gamePlayer = new Game_Player();
global.$gameMap = new Game_Map();
global.$gameTemp = new Game_Temp();
global.$gameMessage = new Game_Message();

// Load plugins
function loadPlugin(relPath) {
    const fullPath = path.join(ROOT_DIR, relPath);
    const code = fs.readFileSync(fullPath, 'utf8');
    eval(code);
}

loadPlugin('js/plugins/Hub_Hero.js');
loadPlugin('js/plugins/Bitmap_Composite.js');
loadPlugin('js/plugins/Game_Hero.js');
loadPlugin('js/plugins/Character_Hero.js');
loadPlugin('js/plugins/Sprite_Hero.js');
loadPlugin('js/plugins/SC4_rmmz_core_Patches.js');
loadPlugin('js/plugins/SC4_rmmz_objects_Patches.js');
loadPlugin('js/plugins/SC4_rmmz_sprites_Patches.js');

console.log("=== RUNNING TESTS FOR STEP 8: COURSE / RUNNING ===\n");

let passed = 0;
let failed = 0;

function assert(desc, condition) {
    if (condition) {
        console.log(`[PASS] ${desc}`);
        passed++;
    } else {
        console.error(`[FAIL] ${desc}`);
        failed++;
    }
}

// ----------------------------------------------------
// Test 1: Action candidate resolution in Bitmap_Composite
// ----------------------------------------------------
console.log("--- Test 1: Bitmap_Composite resolveActionCandidates ---");
const dashCandidates = Bitmap_Composite.resolveActionCandidates("dash");
assert("dash candidates include 'dash' then 'run'", dashCandidates[0] === "dash" && dashCandidates[1] === "run");

const runCandidates = Bitmap_Composite.resolveActionCandidates("run");
assert("run candidates include 'run' then 'dash'", runCandidates[0] === "run" && runCandidates[1] === "dash");

const walkCandidates = Bitmap_Composite.resolveActionCandidates("walk");
assert("walk candidate is ['walk']", walkCandidates.length === 1 && walkCandidates[0] === "walk");

// ----------------------------------------------------
// Test 2: Composite layer resolution for 'dash' (maps to _run files)
// ----------------------------------------------------
console.log("\n--- Test 2: Bitmap_Composite layer resolution for 'dash' ---");
const actor1 = $gameActors.actor(1);
const entryDash = Bitmap_Composite.getCompositeEntry(actor1, "dash");
assert("Composite entry for 'dash' exists", Boolean(entryDash));
assert("Composer exists on entry", Boolean(entryDash.composer));

const layers = entryDash.composer._layers;
const baseLayer = layers.find(l => l.z === 50);
assert("Base layer loaded 'human_male_run'", baseLayer && baseLayer.filename === "human_male_run");

const faceLayer = layers.find(l => l.z === 60);
assert("Face layer loaded '1_run'", faceLayer && faceLayer.filename === "1_run");

const equipLayer = layers.find(l => l.filename.includes("flak"));
assert("Visual equip layer loaded 'human_male_flak_run'", equipLayer && equipLayer.filename === "human_male_flak_run");

// ----------------------------------------------------
// Test 3: Cache key equivalence for 'dash' and 'run'
// ----------------------------------------------------
console.log("\n--- Test 3: Game_Hero cache key normalization ---");
const keyDash = actor1.getCompositeCacheKey("dash");
const keyRun = actor1.getCompositeCacheKey("run");
assert("Cache key for 'dash' equals 'run'", keyDash === keyRun);
assert("Cache key contains '_dash_'", keyDash.includes("_dash_"));

// ----------------------------------------------------
// Test 4: Game_Player course / running behavior
// ----------------------------------------------------
console.log("\n--- Test 4: Game_Player course / running behavior ---");
const player = $gamePlayer;

// 4.1 Idle (stationary)
player._x = 5; player._realX = 5;
player._y = 5; player._realY = 5;
player.setDashing(false);
assert("Stationary player returns 'walk'", player.action() === "walk");

// 4.2 Stationary while holding dash
player.setDashing(true);
assert("Stationary player holding dash returns 'walk' (idle pose)", player.action() === "walk");

// 4.3 Walking (moving without dash)
player.setDashing(false);
player._x = 6; player._realX = 5; // isMoving() = true
assert("Player is moving", player.isMoving());
assert("Walking player returns 'walk'", player.action() === "walk");

// 4.4 Running (moving with dash)
player.setDashing(true);
assert("Running player returns 'dash'", player.action() === "dash");

// 4.5 Acting overrides dashing
player.playAction("atk");
assert("Player action during playAction is 'atk'", player.action() === "atk");
while (player.isActing()) {
    player.updateAction();
}
// playAction halts movement (aligns _realX = _x)
assert("Player returns to 'walk' after attack completes since movement stopped", player.action() === "walk");

// Resuming movement while dash is active
player._x = 8; player._realX = 7;
assert("Player returns to 'dash' upon resuming movement with dash active", player.action() === "dash");

// 4.6 Stopping returns to 'walk'
player._realX = player._x;
assert("Player returns to 'walk' after stopping", player.action() === "walk");

// ----------------------------------------------------
// Test 5: Game_Follower course / running behavior
// ----------------------------------------------------
console.log("\n--- Test 5: Game_Follower course / running behavior ---");
$gameParty.addActor(2);
const follower = player.followers().follower(0);
assert("Follower exists and is linked to Actor 2", Boolean(follower && follower.actor() && follower.actor().actorId() === 2));

// 5.1 Player walking -> follower walking
player.setDashing(false);
assert("Follower isDashing is false when player is not dashing", follower.isDashing() === false);

// 5.2 Player dashing -> follower dashing
player.setDashing(true);
assert("Follower isDashing is true when player is dashing", follower.isDashing() === true);

// 5.3 Follower speed matches player speed exactly
assert("Follower realMoveSpeed matches player realMoveSpeed", follower.realMoveSpeed() === player.realMoveSpeed());

// 5.4 Follower moving while player dashing
follower._x = 5; follower._realX = 4;
assert("Follower action is 'dash' when moving and dashing", follower.action() === "dash");

// 5.5 Follower stopping
follower._realX = follower._x;
assert("Follower action is 'walk' when stopped", follower.action() === "walk");

// ----------------------------------------------------
// Test 6: Game_Event course / running behavior based on speed
// ----------------------------------------------------
console.log("\n--- Test 6: Game_Event course / running behavior ---");
// Event with normal speed (4)
const eventNormal = new Game_Event(1, 10, {
    note: "<actor: 2>",
    pages: [{ moveSpeed: 4, list: [], image: { characterName: "", characterIndex: 0, direction: 2, pattern: 0 } }]
});
eventNormal.setMoveSpeed(4);
assert("Event with speed 4 isDashing is false", eventNormal.isDashing() === false);
eventNormal._x = 5; eventNormal._realX = 4;
assert("Event with speed 4 action is 'walk' when moving", eventNormal.action() === "walk");
eventNormal._realX = eventNormal._x;
assert("Event with speed 4 action is 'walk' when stopped", eventNormal.action() === "walk");

// Event with speed 5 ("Rapide")
const eventFast = new Game_Event(1, 11, {
    note: "<actor: 2>",
    pages: [{ moveSpeed: 5, list: [], image: { characterName: "", characterIndex: 0, direction: 2, pattern: 0 } }]
});
eventFast.setMoveSpeed(5);
assert("Event with speed 5 (Rapide) isDashing is true", eventFast.isDashing() === true);
assert("Event with speed 5 realMoveSpeed is 5 (no double increment)", eventFast.realMoveSpeed() === 5);
eventFast._x = 5; eventFast._realX = 4;
assert("Event with speed 5 action is 'dash' when moving", eventFast.action() === "dash");
eventFast._realX = eventFast._x;
assert("Event with speed 5 action is 'walk' when stopped", eventFast.action() === "walk");

// Event with speed 6 ("Plus rapide / Plus vite")
const eventFaster = new Game_Event(1, 12, {
    note: "<actor: 2>",
    pages: [{ moveSpeed: 6, list: [], image: { characterName: "", characterIndex: 0, direction: 2, pattern: 0 } }]
});
eventFaster.setMoveSpeed(6);
assert("Event with speed 6 (Plus rapide) isDashing is true", eventFaster.isDashing() === true);
assert("Event with speed 6 realMoveSpeed is 6", eventFaster.realMoveSpeed() === 6);
eventFaster._x = 5; eventFaster._realX = 4;
assert("Event with speed 6 action is 'dash' when moving", eventFaster.action() === "dash");

// ----------------------------------------------------
// Test 7: Sprite_Hero dynamic switching
// ----------------------------------------------------
console.log("\n--- Test 7: Sprite_Hero dynamic switching ---");
const spritePlayer = new Sprite_Hero(player);
spritePlayer.setHeroBitmap();
assert("Sprite initial action is 'walk'", spritePlayer._currentAction === "walk");
const walkBitmap = spritePlayer.bitmap;

// Player starts running
player._x = 10; player._realX = 9;
player.setDashing(true);
assert("Player action is 'dash'", player.action() === "dash");
assert("Sprite detects image change", spritePlayer.isImageChanged() === true);

spritePlayer.updateBitmap();
assert("Sprite action updated to 'dash'", spritePlayer._currentAction === "dash");
const dashBitmap = spritePlayer.bitmap;
assert("Dash bitmap is different from walk bitmap", dashBitmap !== walkBitmap);

// Player stops running
player._realX = player._x;
player.setDashing(false);
assert("Player action is 'walk' when stopped", player.action() === "walk");
assert("Sprite detects image change when stopping", spritePlayer.isImageChanged() === true);

spritePlayer.updateBitmap();
assert("Sprite action restored to 'walk'", spritePlayer._currentAction === "walk");
assert("Sprite restored walk bitmap", spritePlayer.bitmap === walkBitmap);

console.log("\n========================================");
console.log(`STEP 8 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("========================================");

if (failed > 0) process.exit(1);
