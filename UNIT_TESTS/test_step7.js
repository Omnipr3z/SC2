/**
 * ============================================================================
 * UNIT TEST : Étape 7 - Gestion de l'Équipe & Compagnons (Followers)
 * ============================================================================
 * Valide les interactions avec les compagnons :
 * - Orientation vers un compagnon sans déplacement initial au clavier.
 * - Interaction tactile (clic gauche sur le follower ou clic sur le leader).
 * - Interaction clavier / manette (bouton OK en faisant face au follower).
 * - Menu de dialogue avec choix : "Demander de rester", "Ouvrir l'inventaire", "Ne rien faire".
 * - Commande "Demander de rester" avec présence d'événement lié : téléportation,
 *   conversion de l'orientation en direction cardinale, et sortie de l'équipe.
 * - Commande "Demander de rester" sans événement présent : refus poli ("Je ne peux pas rester ici").
 * - Réintégration dans l'équipe via event.joinPlayerParty() et appel d'interpréteur.
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
    constructor(w = 0, h = 0) {
        this.width = w;
        this.height = h;
        this._ready = true;
    }
    isReady() { return this._ready; }
    resize(w, h) { this.width = w; this.height = h; }
    clear() {}
    blt() {}
};

global.ImageManager = {
    loadBitmap() { return new Bitmap(96, 96); },
    loadCharacter() { return new Bitmap(144, 192); },
    isObjectCharacter() { return false; }
};

global.Graphics = { width: 1280, height: 720 };
global.TouchInput = { isTriggered() { return false; }, isRightPressed() { return false; } };
global.Input = {
    _pressed: {},
    dir8: 0,
    dir4: 0,
    isTriggered(key) { return Boolean(this._pressed[key]); }
};

global.Game_Actor = class Game_Actor {
    constructor(actorId) { this.setup(actorId); }
    setup(actorId) { this._actorId = actorId; }
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
            this._data[id] = new Game_Actor(id);
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
    canPassDiagonally() { return true; }
    moveStraight(d) {
        this.setDirection(d);
        if (d === 2) this._y++;
        else if (d === 4) this._x--;
        else if (d === 6) this._x++;
        else if (d === 8) this._y--;
    }
    moveDiagonally(horz, vert) {
        this._x += (horz === 6 ? 1 : -1);
        this._y += (vert === 2 ? 1 : -1);
    }
    distancePerFrame() { return 0.05; }
    update() {
        this._realX = this._x;
        this._realY = this._y;
    }
    refresh() {}
};

global.Game_Character = class Game_Character extends Game_CharacterBase {
    searchLimit() { return 12; }
    findDirectionTo(goalX, goalY) {
        const dx = goalX - this._x;
        const dy = goalY - this._y;
        if (dx === 0 && dy === 0) return 0;
        if (dx > 0 && dy > 0) return 3;
        if (dx < 0 && dy > 0) return 1;
        if (dx > 0 && dy < 0) return 9;
        if (dx < 0 && dy < 0) return 7;
        if (dx > 0) return 6;
        if (dx < 0) return 4;
        if (dy > 0) return 2;
        if (dy < 0) return 8;
        return 0;
    }
};

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
    canMove() { return true; }
    refresh() {}
    startMapEvent() {}
    triggerTouchActionD1() { return false; }
    triggerTouchActionD2() { return false; }
    triggerTouchActionD3() { return false; }
    triggerButtonAction() { return false; }
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
    const fullPath = path.resolve(relPath);
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

console.log("=== RUNNING TESTS FOR STEP 7: PARTY MANAGEMENT ===\n");

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

// -------------------------------------------------------------
// Test 1: Turning towards follower without moving first
// -------------------------------------------------------------
console.log("--- Test 1: Turning towards follower without moving ---");
// Player at (5, 5), facing 2 (Down).
$gamePlayer.locate(5, 5);
$gamePlayer.setDirection(2);

// Add Actor 2 as follower, positioned at (5, 4) (Up, right behind player)
$gameParty.addActor(2);
const follower0 = $gamePlayer.followers().follower(0);
follower0.locate(5, 4);
follower0.setDirection(2);

// Player inputs 8 (Up) towards follower
$gamePlayer.executeMove(8);

assert("Player direction changed to 8 (facing follower)", $gamePlayer.direction() === 8);
assert("Player x position remained 5 (did not step yet)", $gamePlayer.x === 5);
assert("Player y position remained 5 (did not step yet)", $gamePlayer.y === 5);

// -------------------------------------------------------------
// Test 2: Follower interaction via click on follower
// -------------------------------------------------------------
console.log("\n--- Test 2: Left-click on follower triggers interaction ---");
$gameTemp.setDestination(5, 4); // Clic sur le follower
const touchRes = $gamePlayer.triggerTouchAction();

assert("triggerTouchAction handled click on follower", touchRes === true);
assert("Destination cleared", !$gameTemp.isDestinationValid());
assert("Message has choices", $gameMessage.isChoice());
assert("Choice 0 is 'Demander de rester'", $gameMessage._choices[0] === "Demander de rester");
assert("Choice 1 is 'Ouvrir l\'inventaire'", $gameMessage._choices[1] === "Ouvrir l'inventaire");
assert("Choice 2 is 'Ne rien faire'", $gameMessage._choices[2] === "Ne rien faire");
assert("Player faces follower (8)", $gamePlayer.direction() === 8);
assert("Follower faces player (2)", follower0.direction() === 2);

// -------------------------------------------------------------
// Test 3: Clic sur follower sans lui faire face (oriente le joueur d'abord)
// -------------------------------------------------------------
console.log("\n--- Test 3: Clic sur follower sans lui faire face (oriente le joueur sans ouvrir le dialogue) ---");
$gameMessage.clear();
$gamePlayer.setDirection(2); // Le joueur regarde vers le bas (ne fait pas face au follower en 5,4)
$gameTemp.setDestination(5, 4); // Clic sur le follower

const touchTurnRes = $gamePlayer.triggerTouchAction();
assert("triggerTouchAction a géré le clic sur le follower", touchTurnRes === true);
assert("Le joueur s'est tourné vers le follower (direction 8)", $gamePlayer.direction() === 8);
assert("Le dialogue ne s'ouvre PAS au premier clic si le joueur ne lui faisait pas face", !$gameMessage.isChoice());

// Deuxième clic (maintenant que le joueur lui fait face)
$gameTemp.setDestination(5, 4);
const touchFacingRes = $gamePlayer.triggerTouchAction();
assert("Le deuxième clic déclenche l'interaction car le joueur lui fait face", touchFacingRes === true);
assert("Le dialogue s'ouvre avec les choix", $gameMessage.isChoice());
assert("Choix 0 est 'Demander de rester'", $gameMessage._choices[0] === "Demander de rester");

// Clic sur sa propre case (fin de déplacement) ne déclenche plus l'interaction follower
$gameMessage.clear();
$gameTemp.setDestination(5, 5);
$gamePlayer.triggerTouchAction();
assert("Clic sur sa propre case (fin de déplacement) ne déclenche pas le follower", !$gameMessage.isChoice());

// -------------------------------------------------------------
// Test 4: Follower interaction via OK button
// -------------------------------------------------------------
console.log("\n--- Test 4: OK button facing follower triggers interaction ---");
$gameMessage.clear();
Input._pressed["ok"] = true;
const btnRes = $gamePlayer.triggerButtonAction();
Input._pressed["ok"] = false;

assert("triggerButtonAction returned true facing follower", btnRes === true);
assert("Message opened choices via OK button", $gameMessage.isChoice());

// -------------------------------------------------------------
// Test 5: 'Demander de rester' with map event
// -------------------------------------------------------------
console.log("\n--- Test 5: 'Demander de rester' with map event ---");
// Create an event with <actor: 2> elsewhere on map (10, 10)
const eventActor2 = new Game_Event(1, 20, {
    note: "<actor: 2>",
    pages: [{ list: [], image: { characterName: "", characterIndex: 0, direction: 2, pattern: 0 } }]
});
$gameMap._events = [eventActor2];
assert("eventActor2 initially hidden because Actor 2 is in party", eventActor2.isInPartyHidden());

// Follower 0 is at (5, 4), facing 3 (Bas-Droite, diagonal)
follower0.locate(5, 4);
follower0.setDirection(3);

// Execute choice 0: 'Demander de rester'
$gamePlayer.interactWithFollower(follower0);
$gameMessage.onChoice(0);

assert("Actor 2 removed from party", !$gameParty.members().some(a => a.actorId() === 2));
assert("eventActor2 teleported to follower x (5)", eventActor2.x === 5);
assert("eventActor2 teleported to follower y (4)", eventActor2.y === 4);
assert("eventActor2 direction converted to cardinal (2, not diagonal 3)", eventActor2.direction() === 2);
assert("eventActor2 no longer hidden in party", !eventActor2.isInPartyHidden());
assert("eventActor2 not transparent", !eventActor2.isTransparent());
assert("eventActor2 not through", !eventActor2.isThrough());

// -------------------------------------------------------------
// Test 6: 'Demander de rester' without map event
// -------------------------------------------------------------
console.log("\n--- Test 6: 'Demander de rester' without map event ---");
// Add Actor 3 to party. No event on map has <actor: 3>.
$gameParty.addActor(3);
const followerNew = $gamePlayer.followers().follower(0);
assert("followerNew represents Actor 3", followerNew.actor().actorId() === 3);

$gamePlayer.interactWithFollower(followerNew);
$gameMessage.onChoice(0);

assert("Message displayed 'Je ne peux pas rester ici'", $gameMessage._texts.includes("Je ne peux pas rester ici"));
assert("Actor 3 still in party", $gameParty.members().some(a => a.actorId() === 3));

// -------------------------------------------------------------
// Test 7: event.joinPlayerParty()
// -------------------------------------------------------------
console.log("\n--- Test 7: event.joinPlayerParty() ---");
// eventActor2 is currently at (5, 4). Let's move eventActor2 away to (5, 2).
eventActor2.locate(5, 2);
eventActor2.setDirection(2);

// Party currently has Leader (Actor 1 at 5,5 facing 2) and Follower (Actor 3 at 5,6 facing 2).
$gamePlayer.locate(5, 5);
$gamePlayer.setDirection(2);
followerNew.locate(5, 6);
followerNew.setDirection(2);

// Last member is followerNew at (5, 6) facing 2 (Down).
// The slot behind followerNew is (5, 5) which is player, or adjacent (5, 7).
// Let's call joinPlayerParty() on eventActor2
let joinCompleted = false;
const joinStarted = eventActor2.joinPlayerParty(() => {
    joinCompleted = true;
});

assert("joinPlayerParty returned true", joinStarted === true);
assert("eventActor2 is joining party", eventActor2._isJoiningParty === true);

// Update event step by step
let steps = 0;
while (eventActor2._isJoiningParty && steps < 20) {
    eventActor2.update();
    steps++;
}

assert("eventActor2 finished joining party", !eventActor2._isJoiningParty);
assert("joinCompleted callback fired", joinCompleted === true);
assert("Actor 2 is now in party", $gameParty.members().some(a => a.actorId() === 2));
assert("eventActor2 is now hidden in party", eventActor2.isInPartyHidden());

// Check that newly added follower is located at eventActor2's final position
const followerActor2 = $gamePlayer.followers().data().find(f => f.actor() && f.actor().actorId() === 2);
assert("followerActor2 exists", Boolean(followerActor2));
assert("followerActor2 located at event's final position", followerActor2.x === eventActor2.x && followerActor2.y === eventActor2.y);

// Calling joinPlayerParty again when actor is already in party returns false
const alreadyInPartyRes = eventActor2.joinPlayerParty();
assert("joinPlayerParty does nothing when actor already in party", alreadyInPartyRes === false);

// -------------------------------------------------------------
// Test 8: Game_Interpreter joinPlayerParty() script call
// -------------------------------------------------------------
console.log("\n--- Test 8: Game_Interpreter joinPlayerParty() script call ---");
// Remove Actor 2 from party again
$gameParty.removeActor(2);
assert("Actor 2 removed from party for test 8", !$gameParty.members().some(a => a.actorId() === 2));

// Event 20 has <actor: 2>
eventActor2.locate(5, 2);
const interp = new Game_Interpreter(20);
const interpJoinRes = interp.joinPlayerParty();
assert("Interpreter joinPlayerParty started", interpJoinRes === true);
assert("Interpreter set waitMode to joinParty", interp._waitMode === "joinParty");
assert("Interpreter updateWaitMode reports busy while joining", interp.updateWaitMode() === true);

// Update event until arrival
while (eventActor2._isJoiningParty) {
    eventActor2.update();
}

assert("Interpreter updateWaitMode reports done when finished", interp.updateWaitMode() === false);
assert("Interpreter cleared waitMode", interp._waitMode === "");
assert("Actor 2 added to party via interpreter script call", $gameParty.members().some(a => a.actorId() === 2));

console.log(`\n========================================`);
console.log(`STEP 7 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) {
    process.exit(1);
}
