/**
 * ============================================================================
 * UNIT TEST : Étape 9 - Combat ARPG en Temps Réel & FightManager
 * ============================================================================
 * Valide l'ensemble du système de combat en temps réel au corps-à-corps :
 * - Singleton FightManager et indexation des ActorEvents sur la carte active.
 * - Notetags d'acteur (<attackId: SKILL_ID>) et condition d'attaque mains nues (hasNoWeapons).
 * - Notetags d'événement (<actor: ID>, <role: hostile/neutral/ally>, <enemy: ID>).
 * - Détection chirurgicale de cible hostile au contact direct (case devant ou collapse).
 * - Résolution des dégâts via Game_Action et formules natives RMMZ.
 * - Réactions physiques et visuelles de l'ennemi : orientation face à l'attaquant,
 *   knockback (recul d'1 case), action 'hurt' avec direction fixe.
 * - Défaite de l'ennemi (isDead) : action 'down', verrouillage, et activation de SelfSwitch C.
 * - Refus d'attaque à mains nues si une arme est équipée.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

console.log("=== RUNNING TESTS FOR STEP 9: ARPG COMBAT & FIGHTMANAGER ===\n");

// 1. Mock browser / RMMZ global objects
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

global.$dataSystem = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/System.json'), 'utf8'));
global.$dataArmors = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Armors.json'), 'utf8'));
global.$dataWeapons = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Weapons.json'), 'utf8'));
global.$dataActors = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Actors.json'), 'utf8'));
global.$dataClasses = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Classes.json'), 'utf8'));
global.$dataSkills = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Skills.json'), 'utf8'));
global.$dataEnemies = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Enemies.json'), 'utf8'));
global.$dataMap = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Map001.json'), 'utf8'));
global.$dataTilesets = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Tilesets.json'), 'utf8'));
global.$dataItems = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Items.json'), 'utf8'));
global.$dataCommonEvents = fs.existsSync(path.join(ROOT_DIR, 'data/CommonEvents.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/CommonEvents.json'), 'utf8')) : [];
global.$dataStates = fs.existsSync(path.join(ROOT_DIR, 'data/States.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/States.json'), 'utf8')) : [null, { id: 1, name: "Knockout" }];
global.$dataTroops = fs.existsSync(path.join(ROOT_DIR, 'data/Troops.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Troops.json'), 'utf8')) : [];
global.$dataAnimations = [null, { id: 1, name: "Hit Physical" }, { id: 2, name: "Hit Special" }];

global.DataManager = {
    isWeapon(item) { return item && $dataWeapons.includes(item); },
    isArmor(item) { return item && $dataArmors.includes(item); },
    isItem(item) { return item && $dataItems.includes(item); },
    isSkill(item) { return item && $dataSkills.includes(item); }
};

global.Bitmap = class Bitmap {
    constructor(w = 288, h = 768) {
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
    isObjectCharacter() { return false; },
    isZeroParallax() { return false; }
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

global.Graphics = { width: 1280, height: 720 };
global.TouchInput = {
    clear() {},
    isTriggered() { return false; },
    isRightPressed() { return false; }
};
global.Input = {
    _pressed: {},
    dir8: 0,
    dir4: 0,
    isPressed(key) { return Boolean(this._pressed[key]); }
};

global.Utils = {
    isOptionValid() { return false; },
    canPlayOgg() { return true; }
};

global.BattleManager = {
    setup() {},
    onEncounter() {}
};

global.SoundManager = { playCancel() {}, playRecovery() {}, playActorDamage() {} };
global.ConfigManager = { alwaysDash: false };

Number.prototype.clamp = function(min, max) {
    return Math.min(Math.max(this, min), max);
};
Math.randomInt = function(max) {
    return Math.floor(max * Math.random());
};
Array.prototype.clone = function() {
    return this.slice(0);
};

// Load core RMMZ classes from rmmz_objects.js
// We require or mock the exact necessary RMMZ classes
const rmmzCode = fs.readFileSync(path.join(ROOT_DIR, 'js/rmmz_objects.js'), 'utf8');

// Load Battle & Battler classes using node eval
eval(rmmzCode);
Game_Action.prototype.itemHit = function() { return 1.0; };
Game_Action.prototype.itemEva = function() { return 0.0; };

// Helper to load plugins with cwd resolution
function loadPlugin(relPath) {
    const fullPath = path.join(ROOT_DIR, relPath);
    const code = fs.readFileSync(fullPath, 'utf8');
    eval(code);
}

// Global Singletons
global.$gameTemp = new Game_Temp();
global.$gameSystem = new Game_System();
global.$gameScreen = new Game_Screen();
global.$gameTimer = new Game_Timer();
global.$gameMessage = new Game_Message();
global.$gameSwitches = new Game_Switches();
global.$gameVariables = new Game_Variables();
global.$gameSelfSwitches = new Game_SelfSwitches();
global.$gameActors = new Game_Actors();
global.$gameParty = new Game_Party();
global.$gameTroop = new Game_Troop();
global.$gameMap = new Game_Map();
global.$gamePlayer = new Game_Player();

// Load SC4 Plugins
loadPlugin('js/plugins/Hub_Hero.js');
loadPlugin('js/plugins/Bitmap_Composite.js');
loadPlugin('js/plugins/Game_Hero.js');
loadPlugin('js/plugins/Character_Hero.js');
loadPlugin('js/plugins/Sprite_Hero.js');
loadPlugin('js/plugins/FightManager.js');
loadPlugin('js/plugins/SC4_rmmz_core_Patches.js');
loadPlugin('js/plugins/SC4_rmmz_objects_Patches.js');
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

// Setup Map with Events
$gameMap.setup(1);
$gameParty.addActor(1);

console.log("--- Test 1: Actor notetag <attackId: 1> and hasNoWeapons() ---");
const actor1 = $gameActors.actor(1);
assert("Actor 1 is a Game_Hero instance", actor1 instanceof Game_Hero);
assert("Actor 1 has attackSkillId = 1", actor1.attackSkillId() === 1);

// Équiper une arme dans le test pour valider hasNoWeapons()
actor1.forceChangeEquip(0, $dataWeapons[2]);
assert("Actor 1 has weapon equipped", actor1.hasNoWeapons() === false);

// Unequip weapon to test bare-handed
actor1.forceChangeEquip(0, null);
assert("Actor 1 hasNoWeapons is true after unequipping", actor1.hasNoWeapons() === true);

console.log("\n--- Test 2: Game_Event role and enemy notetags ---");
// Create a hostile punching-ball event
const eventHostile = new Game_Event(1, 2);
eventHostile._eventData = {
    id: 2,
    name: "PunchingBall",
    note: "",
    pages: [{
        list: [
            { code: 108, parameters: ["<actor:3>"] },
            { code: 408, parameters: ["<role:hostile>"] },
            { code: 408, parameters: ["<enemy:1>"] }
        ],
        image: { characterName: "Actor1", characterIndex: 2 }
    }]
};
eventHostile.setupPage();

assert("Event 2 actorId is 3", eventHostile.actorId() === 3);
assert("Event 2 role is 'hostile'", eventHostile.role() === "hostile");
assert("Event 2 isHostile() is true", eventHostile.isHostile() === true);
assert("Event 2 isAlly() is false", eventHostile.isAlly() === false);
assert("Event 2 enemyId is 1", eventHostile.enemyId() === 1);
const enemyMhp = eventHostile.battler().mhp;
assert("Enemy battler max HP is > 0", enemyMhp > 0);
assert("Enemy battler current HP equals mhp", eventHostile.battler().hp === enemyMhp);

console.log("\n--- Test 3: Neutral and Ally event roles ---");
$dataMap.events[3] = {
    id: 3,
    x: 0,
    y: 0,
    pages: [{
        conditions: {},
        image: { tileId: 0, characterName: "", characterIndex: 0, direction: 2, pattern: 1 },
        list: [
            { code: 108, parameters: ["<actor:4>"] },
            { code: 408, parameters: ["<role:neutral>"] }
        ]
    }]
};
const eventNeutral = new Game_Event(1, 3);
assert("Event 3 role is 'neutral'", eventNeutral.role() === "neutral");
assert("Event 3 isHostile() is false", eventNeutral.isHostile() === false);
assert("Event 3 isNeutral() is true", eventNeutral.isNeutral() === true);

console.log("\n--- Test 4: FightManager ActorEvent indexing ---");
// Add events to game map
$gameMap._events[2] = eventHostile;
$gameMap._events[3] = eventNeutral;

const indexedEvents = $fightManager.actorEvents();
const expectedActorCount = $gameMap.events().filter(e => e && typeof e.actorId === "function" && e.actorId() > 0).length;
assert("FightManager found all actor events on map", indexedEvents.length === expectedActorCount);
assert("FightManager includes eventHostile", indexedEvents.includes(eventHostile));
assert("FightManager includes eventNeutral", indexedEvents.includes(eventNeutral));

console.log("\n--- Test 5: Target detection in front (Contact direct) ---");
// Place player at (5, 5), facing East (direction 6)
$gamePlayer.locate(5, 5);
$gamePlayer.setDirection(6);

// Place hostile event at (6, 5) -> directly in front
eventHostile.locate(6, 5);
eventNeutral.locate(5, 6); // south

const targetFront = $fightManager.findHostileTargetInFront($gamePlayer, 6);
assert("Hostile target found directly in front at (6, 5)", targetFront === eventHostile);

// Facing other directions should not find hostile
const targetNorth = $fightManager.findHostileTargetInFront($gamePlayer, 8);
assert("No hostile target in front facing North", targetNorth === null);

const targetSouth = $fightManager.findHostileTargetInFront($gamePlayer, 2);
assert("Target to the south is neutral, so not hostile", targetSouth === null);

// Hostile 2 tiles away -> not at direct contact
eventHostile.locate(7, 5);
const targetTooFar = $fightManager.findHostileTargetInFront($gamePlayer, 6);
assert("Hostile 2 tiles away is not at direct contact", targetTooFar === null);

console.log("\n--- Test 6: Melee attack execution (Hostile survives: Hurt + Knockback) ---");
// Bring hostile back to (6, 5)
eventHostile.locate(6, 5);
eventHostile.setDirection(2); // initially facing south
$gamePlayer.locate(5, 5);
$gamePlayer.setDirection(6);

// Ensure player has bare hands
actor1.changeEquip(0, null);
assert("Player is bare-handed", actor1.hasNoWeapons() === true);

// Listen for animation request
let requestedAnimId = 0;
let requestedTargets = null;
const origRequestAnimation = $gameTemp.requestAnimation;
$gameTemp.requestAnimation = function(targets, animId) {
    requestedTargets = targets;
    requestedAnimId = animId;
    origRequestAnimation.call(this, targets, animId);
};

// Player attacks East
const attackSuccess = $fightManager.onPlayerAttack($gamePlayer, 6);
assert("Melee attack executed successfully", attackSuccess === true);

// Verify visual orientation
assert("Event turned to face player (direction 4: West)", eventHostile.direction() === 4);
assert("Event direction is fixed during hurt", eventHostile.isDirectionFixed() === true);

// Verify animation
assert("Animation was requested for eventHostile", requestedTargets && requestedTargets[0] === eventHostile);
assert("Animation ID > 0 was requested", requestedAnimId > 0);

// Verify damage and combat record
const lastFight = $fightManager.lastResult();
assert("FightManager recorded the attack", Boolean(lastFight));
assert("Damage dealt is > 0", lastFight.damage > 0);
assert("Enemy HP decreased by damage amount", eventHostile.battler().hp === enemyMhp - lastFight.damage);
assert("Enemy is still alive", lastFight.isDead === false && !eventHostile.battler().isDead());

// Verify hurt action played
assert("Event is playing 'hurt' action", eventHostile.action() === "hurt");

// Verify knockback (jumped 1 tile East, away from player at 5,5)
// Player at 5,5 facing 6 -> Hostile facing 4 (West) -> Opposite is 6 (East) -> x goes from 6 to 7
assert("Event jumped 1 tile East away from player (x: 7)", eventHostile.x === 7);

// Advance action until hurt ends
while (eventHostile.isActing()) {
    eventHostile.updateAction();
}

assert("Event directionFix unlocked after hurt", eventHostile.isDirectionFixed() === false);
assert("Event action restored to 'walk'", eventHostile.action() === "walk");
assert("Event pattern reset to 1 (idle)", eventHostile.pattern() === 1);

console.log("\n--- Test 7: Melee attack execution (Hostile defeated: Down + SelfSwitch C) ---");
// Reduce enemy HP to 1 so the next hit will defeat it
eventHostile.battler().setHp(1);
assert("Enemy HP set to 1", eventHostile.battler().hp === 1);

// Move hostile back in front of player
eventHostile.locate(6, 5);
$gamePlayer.locate(5, 5);
$gamePlayer.setDirection(6);

// Reset self-switch C
const switchKey = [1, eventHostile.eventId(), "C"];
$gameSelfSwitches.setValue(switchKey, false);

const killSuccess = $fightManager.onPlayerAttack($gamePlayer, 6);
assert("Finishing blow executed successfully", killSuccess === true);

const killFight = $fightManager.lastResult();
assert("Enemy is marked dead in fight record", killFight.isDead === true);
assert("Enemy battler isDead() is true", eventHostile.battler().isDead() === true);
assert("Event is playing 'down' action", eventHostile.action() === "down");

// Advance action until down ends
while (eventHostile.isActing()) {
    eventHostile.updateAction();
}

assert("SelfSwitch C is turned on after down action finishes", $gameSelfSwitches.value(switchKey) === true);
assert("Event directionFix unlocked", eventHostile.isDirectionFixed() === false);

console.log("\n--- Test 8: Attack WITH weapon equipped ---");
// Give Actor 1 a weapon (weapon 2)
actor1.forceChangeEquip(0, $dataWeapons[2]);
assert("Actor 1 now has a weapon equipped", actor1.hasNoWeapons() === false);

// Spawn another fresh hostile enemy at (6, 5)
$dataMap.events[4] = {
    id: 4,
    x: 6,
    y: 5,
    pages: [{
        conditions: {},
        image: { tileId: 0, characterName: "Actor1", characterIndex: 2, direction: 2, pattern: 1 },
        list: [
            { code: 108, parameters: ["<actor:3>"] },
            { code: 408, parameters: ["<role:hostile>"] },
            { code: 408, parameters: ["<enemy:1>"] }
        ]
    }]
};
const eventHostile2 = new Game_Event(1, 4);
eventHostile2.locate(6, 5);
$gameMap._events[4] = eventHostile2;

$fightManager.clearHistory();
const armedAttack = $fightManager.onPlayerAttack($gamePlayer, 6);
assert("Attack DOES trigger when weapon is equipped", armedAttack === true);
assert("Attack record created in FightManager", $fightManager.lastResult() !== null);
assert("Hostile 2 took damage and HP < mhp", eventHostile2.battler().hp < eventHostile2.battler().mhp);

console.log("\n========================================================");
console.log(`STEP 9 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("========================================================");

if (failed > 0) process.exit(1);
