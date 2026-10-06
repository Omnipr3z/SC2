/**
 * ============================================================================
 * UNIT TEST : Étapes 5 & 6 - Personnages Composites, Compagnons et Événements
 * ============================================================================
 * Valide les fonctionnalités d'intégration des acteurs et compagnons :
 * - Gestion des animations d'action sur les compagnons (playAction, durées, callbacks).
 * - Routage des actions via $heroHub.findActorCharacter et playAction({ actorId }).
 * - Parsing des métadonnées d'événements PNJ liés (<actor: ID>, <actor_visible>).
 * - Invisibilité et perméabilité (through) automatique des événements lorsque
 *   leur acteur associé est présent dans la party du joueur.
 * - Appels de script Game_Interpreter.prototype.playAction.
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

// Minimal Bitmap mock
global.Bitmap = class Bitmap {
    constructor(w = 0, h = 0) {
        this.width = w;
        this.height = h;
        this._loading = false;
        this._ready = true;
    }
    isReady() { return this._ready; }
    resize(w, h) { this.width = w; this.height = h; }
    clear() {}
    blt() {}
};

global.ImageManager = {
    loadBitmap(folder, filename) {
        return new Bitmap(96, 96);
    },
    loadCharacter(name) {
        return new Bitmap(144, 192);
    },
    isObjectCharacter() { return false; }
};

global.Graphics = { width: 1280, height: 720 };
global.TouchInput = { isTriggered() { return false; }, isRightPressed() { return false; } };
global.Input = { dir8: 0, dir4: 0 };

// Minimal RMMZ classes mock
global.Game_Actor = class Game_Actor {
    constructor(actorId) { this.setup(actorId); }
    setup(actorId) { this._actorId = actorId; }
    actorId() { return this._actorId; }
    actor() { return $dataActors[this._actorId]; }
    characterName() { return this.actor() ? (this.actor().characterName || "") : ""; }
    characterIndex() { return this.actor() ? (this.actor().characterIndex || 0) : 0; }
    equips() { return []; }
};

global.Game_Actors = class Game_Actors {
    constructor() {
        this._data = [];
    }
    actor(id) {
        if (!this._data[id]) {
            this._data[id] = new Game_Hero(id);
        }
        return this._data[id];
    }
};

global.Game_CharacterBase = class Game_CharacterBase {
    constructor() {
        this.initMembers();
    }
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
    }
    pos(x, y) { return this._x === x && this._y === y; }
    screenX() { return this._x * 48; }
    screenY() { return this._y * 48; }
    direction() { return this._direction; }
    setDirection(d) { this._direction = d; }
    pattern() { return this._pattern; }
    setPattern(p) { this._pattern = p; }
    characterName() { return this._characterName; }
    characterIndex() { return this._characterIndex; }
    setImage(characterName, characterIndex) {
        this._characterName = characterName;
        this._characterIndex = characterIndex;
    }
    isTransparent() { return this._transparent; }
    setTransparent(t) { this._transparent = t; }
    isThrough() { return this._through; }
    setThrough(t) { this._through = t; }
    isMoving() { return false; }
    isDashing() { return false; }
    distancePerFrame() { return 0.05; }
    update() {}
    refresh() {}
};

global.Game_Character = class Game_Character extends Game_CharacterBase {};

global.Game_Player = class Game_Player extends Game_Character {
    constructor() {
        super();
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
    refresh() {}
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
    reverseData() { return this._data.slice().reverse(); }
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
    list() { return this.page() ? this.page().list : []; }
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
    requestRefresh() {}
};

global.Game_Interpreter = class Game_Interpreter {
    constructor(eventId = 0) {
        this._eventId = eventId;
    }
    eventId() { return this._eventId; }
    character(param) {
        if (param > 0) return $gameMap.event(param);
        if (param === 0) return $gameMap.event(this._eventId);
        return $gamePlayer;
    }
    isOnCurrentMap() { return true; }
};

global.Scene_Map = class Scene_Map {};

// Sprites mocks
global.Sprite = class Sprite {
    constructor() {
        this.bitmap = null;
        this.visible = true;
        this.opacity = 255;
    }
    update() {}
};

global.Sprite_Character = class Sprite_Character extends Sprite {
    constructor(character) {
        super();
        this._character = character;
    }
    isEmptyCharacter() {
        return !this._character.characterName();
    }
    update() {
        super.update();
        if (this.isEmptyCharacter() || (this._character && this._character.isTransparent())) {
            this.visible = false;
        } else {
            this.visible = true;
        }
    }
    characterPatternX() { return this._character.pattern(); }
    characterPatternY() { return (this._character.direction() - 2) / 2; }
};

global.Spriteset_Map = class Spriteset_Map {
    createCharacterSprite(character) {
        if (character && character.isHero && character.isHero()) {
            return new Sprite_Hero(character);
        }
        return new Sprite_Character(character);
    }
};

// Chargeur de plugins
function loadPlugin(relPath) {
    const fullPath = path.join(ROOT_DIR, relPath);
    const code = fs.readFileSync(fullPath, 'utf8');
    eval(code);
}

// Initialisation globale
global.$gameActors = new Game_Actors();
global.$gameParty = new Game_Party();
global.$gamePlayer = new Game_Player();
global.$gameMap = new Game_Map();

// Chargement des plugins SC4
loadPlugin('js/plugins/Hub_Hero.js');
loadPlugin('js/plugins/Bitmap_Composite.js');
loadPlugin('js/plugins/Game_Hero.js');
loadPlugin('js/plugins/Character_Hero.js');
loadPlugin('js/plugins/Sprite_Hero.js');
loadPlugin('js/plugins/SC4_rmmz_core_Patches.js');
loadPlugin('js/plugins/SC4_rmmz_objects_Patches.js');
loadPlugin('js/plugins/SC4_rmmz_scenes_Patches.js');
loadPlugin('js/plugins/SC4_rmmz_sprites_Patches.js');

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

console.log("=== RUNNING TESTS FOR STEPS 5 & 6 ===");

// Test 1: Action animation on standalone character
console.log("\n--- Test 1: Character_Hero Action Animation API ---");
const char = new Game_Character();

assert("Char starts in walk action", char.action() === "walk");
assert("Char is not acting", !char.isActing());
assert("Char can act", char.canAct());

let endFired = false;
const played = char.playAction({
    action: "atk",
    direction: 6,
    duration: 3,
    frames: 4,
    onEnd: () => { endFired = true; }
});

assert("playAction returned true", played === true);
assert("Char is acting", char.isActing());
assert("Char is attacking", char.isAttacking());
assert("Char action is atk", char.action() === "atk");
assert("Char direction is 6", char.direction() === 6);
assert("Initial pattern is 0", char.actionPattern() === 0);

char.updateAction();
assert("Pattern after 1 tick is 0", char.actionPattern() === 0);
char.updateAction();
char.updateAction();
assert("Pattern after 3 ticks is 1", char.actionPattern() === 1);
char.updateAction();
char.updateAction();
char.updateAction();
assert("Pattern after 6 ticks is 2", char.actionPattern() === 2);
char.updateAction();
char.updateAction();
char.updateAction();
assert("Pattern after 9 ticks is 3", char.actionPattern() === 3);

char.updateAction();
char.updateAction();
char.updateAction();
assert("Char is no longer acting after 12 ticks", !char.isActing());
assert("Char action returned to walk", char.action() === "walk");
assert("Char pattern reset to 0", char.actionPattern() === 0);
assert("Char direction preserved (6)", char.direction() === 6);
assert("onEnd callback fired", endFired === true);

// Test 2: Follower Action Control
console.log("\n--- Test 2: Follower action control (Step 5) ---");
$gameParty.addActor(2);
const follower0 = $gamePlayer.followers().follower(0);
assert("Follower 0 represents actor 2", follower0.actor() && follower0.actor().actorId() === 2);
assert("Follower hero() matches actor isHero", follower0.isHero());

const fPlayed = follower0.playAction({ action: "atk", duration: 2, frames: 3 });
assert("Follower playAction returns true", fPlayed === true);
assert("Follower is acting", follower0.isActing());
assert("Follower action is atk", follower0.action() === "atk");

for (let i = 0; i < 6; i++) {
    follower0.updateAction();
}
assert("Follower finishes action after 6 ticks", !follower0.isActing());
assert("Follower action reset to walk", follower0.action() === "walk");

// Test 3: $heroHub.findActorCharacter routing
console.log("\n--- Test 3: $heroHub.findActorCharacter routing ---");
assert("findActorCharacter(1) returns $gamePlayer", $heroHub.findActorCharacter(1) === $gamePlayer);
assert("findActorCharacter(2) returns follower0", $heroHub.findActorCharacter(2) === follower0);

const eventActor3 = new Game_Event(1, 10, {
    note: "<actor: 3>",
    pages: [{ list: [], image: { characterName: "", characterIndex: 0, direction: 2, pattern: 0 } }]
});
$gameMap._events.push(eventActor3);

assert("eventActor3 actorId is 3", eventActor3.actorId() === 3);
assert("findActorCharacter(3) returns eventActor3 (since not in party)", $heroHub.findActorCharacter(3) === eventActor3);
assert("findActorCharacter(99) returns null", $heroHub.findActorCharacter(99) === null);

// Test 4: playAction({ actorId }) routing
console.log("\n--- Test 4: playAction({ actorId: ID, ... }) routing ---");
const pRes2 = $gamePlayer.playAction({ actorId: 2, action: "atk", duration: 2, frames: 2 });
assert("playAction targeting in-party actor 2 returns true", pRes2 === true);
assert("Follower is acting", follower0.isActing());
assert("$gamePlayer itself is NOT acting", !$gamePlayer.isActing());
for (let i = 0; i < 4; i++) follower0.updateAction();

const pRes3 = $gamePlayer.playAction({ actorId: 3, action: "atk", duration: 2, frames: 2 });
assert("playAction targeting out-of-party actor 3 returns true", pRes3 === true);
assert("eventActor3 is acting", eventActor3.isActing());
assert("eventActor3 action is atk", eventActor3.action() === "atk");
assert("$gamePlayer is not acting", !$gamePlayer.isActing());
for (let i = 0; i < 4; i++) eventActor3.updateAction();
assert("eventActor3 finished action", !eventActor3.isActing());

const pResFail = $gamePlayer.playAction({ actorId: 99, action: "atk" });
assert("playAction targeting non-existent actor returns false", pResFail === false);

// Test 5: Event Actor Notetags & Appearance
console.log("\n--- Test 5: Event Actor Notetags & Appearance (Step 6) ---");
const eventActor1 = new Game_Event(1, 11, {
    note: "",
    pages: [{
        list: [
            { code: 108, parameters: ["Commentaire"] },
            { code: 408, parameters: ["<actor: 1>"] }
        ],
        image: { characterName: "", characterIndex: 0, direction: 2, pattern: 0 }
    }]
});
$gameMap._events.push(eventActor1);

assert("Event 11 parsed actorId from continuation comment 408", eventActor1.actorId() === 1);
assert("Event 11 took actor 1 characterName", eventActor1.characterName() === ($dataActors[1].characterName || "Actor1"));

// Test 6: Invisibility & Through on Party Change
console.log("\n--- Test 6: Event Invisibility & Through on party change ---");
assert("Event 11 actor is in party", eventActor1.isActorInParty());
assert("Event 11 is hidden in party", eventActor1.isInPartyHidden());
assert("Event 11 is transparent", eventActor1.isTransparent());
assert("Event 11 is through", eventActor1.isThrough());

const spriteset = new Spriteset_Map();
const spriteActor1 = spriteset.createCharacterSprite(eventActor1);
assert("spriteActor1 is an instance of Sprite_Hero", spriteActor1 instanceof Sprite_Hero);
spriteActor1.update();
assert("spriteActor1 isEmptyCharacter is true", spriteActor1.isEmptyCharacter() === true);
assert("spriteActor1 is not visible", spriteActor1.visible === false);

eventActor1._started = false;
eventActor1.start();
assert("eventActor1 start() is blocked when hidden", eventActor1._started === false);

// Event with <actor_visible>
const eventActor1Visible = new Game_Event(1, 12, {
    note: "",
    pages: [{
        list: [
            { code: 108, parameters: ["<actor: 1>"] },
            { code: 108, parameters: ["<actor_visible>"] }
        ],
        image: { characterName: "", characterIndex: 0, direction: 2, pattern: 0 }
    }]
});
assert("Event 12 has _actorVisible true", eventActor1Visible._actorVisible === true);
assert("Event 12 is NOT hidden even though Actor 1 is in party", eventActor1Visible.isInPartyHidden() === false);
assert("Event 12 is NOT transparent", eventActor1Visible.isTransparent() === false);
assert("Event 12 is NOT through", eventActor1Visible.isThrough() === false);

// Event 13 for Actor 4
const eventActor4 = new Game_Event(1, 13, {
    note: "<actor: 4>",
    pages: [{ list: [], image: { characterName: "", characterIndex: 0, direction: 2, pattern: 0 } }]
});
$gameMap._events.push(eventActor4);

assert("Actor 4 not in party initially", !eventActor4.isActorInParty());
assert("Event 4 initially visible", !eventActor4.isInPartyHidden());
assert("Event 4 not transparent", !eventActor4.isTransparent());

$gameParty.addActor(4);
assert("Actor 4 now in party", eventActor4.isActorInParty());
assert("Event 4 now hidden in party", eventActor4.isInPartyHidden());
assert("Event 4 now transparent", eventActor4.isTransparent());
assert("Event 4 now through", eventActor4.isThrough());

$gameParty.removeActor(4);
assert("Actor 4 removed from party", !eventActor4.isActorInParty());
assert("Event 4 visible again", !eventActor4.isInPartyHidden());
assert("Event 4 solid again", !eventActor4.isThrough());

// Test 7: Game_Interpreter playAction
console.log("\n--- Test 7: Game_Interpreter playAction script calls ---");
const interpreter = new Game_Interpreter(13);

const interpFollowerRes = interpreter.playAction({ actorId: 2, action: "atk", duration: 3, frames: 3 });
assert("Interpreter playAction({ actorId: 2, ... }) routes to follower", interpFollowerRes === true);
assert("Follower is acting", follower0.isActing());
for (let i = 0; i < 9; i++) follower0.updateAction();

const interpEventRes = interpreter.playAction({ actorId: 3, action: "atk", duration: 3, frames: 3 });
assert("Interpreter playAction({ actorId: 3, ... }) routes to event 10", interpEventRes === true);
assert("Event 10 is acting", eventActor3.isActing());
for (let i = 0; i < 9; i++) eventActor3.updateAction();

const interpSelfRes = interpreter.playAction({ action: "atk", duration: 3, frames: 3 });
assert("Interpreter playAction without actorId targets self (event 13)", interpSelfRes === true);
assert("Event 13 is acting", eventActor4.isActing());
for (let i = 0; i < 9; i++) eventActor4.updateAction();
assert("Event 13 finished action", !eventActor4.isActing());

console.log(`\n========================================`);
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) {
    process.exit(1);
}
console.log("✅ TOUS LES TESTS ÉTAPES 5 & 6 SONT VALIDÉS !");
