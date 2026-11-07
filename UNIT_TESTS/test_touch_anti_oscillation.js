//=============================================================================
// UNIT TEST : Touch Move Anti-Oscillation Memory & 8-Dir Facing
// SC4/UNIT_TESTS/test_touch_anti_oscillation.js
//=============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("==============================================================");
console.log("   TEST : Touch Move Anti-Oscillation Memory & 8-Dir Facing   ");
console.log("==============================================================");

const ROOT_DIR = path.resolve(__dirname, "..");

// 1. Mock minimal RPG Maker MZ environment
global.window = global;
global.Graphics = { width: 1280, height: 720, boxWidth: 1280, boxHeight: 720 };
global.TouchInput = { clear() {}, isTriggered() { return false; } };
global.Input = { _pressed: {}, dir8: 0, dir4: 0, isPressed(k) { return false; } };
global.SoundManager = { playCancel() {}, playBuzzer() {}, playOk() {} };
global.ConfigManager = { alwaysDash: false };
global.BattleManager = { setup() {}, onEncounter() {} };
global.PluginManager = { parameters: () => ({}) };
global.Utils = { isOptionValid() { return false; } };
global.ImageManager = { isObjectCharacter() { return false; } };

Number.prototype.clamp = function(min, max) { return Math.min(Math.max(this, min), max); };
Math.randomInt = function(max) { return Math.floor(max * Math.random()); };
Array.prototype.clone = function() { return this.slice(0); };

global.$dataSystem = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "data/System.json"), "utf8"));
global.$dataActors = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "data/Actors.json"), "utf8"));
global.$dataClasses = [null];
global.$dataSkills = [null];
global.$dataItems = [null];
global.$dataWeapons = [null];
global.$dataArmors = [null];
global.$dataEnemies = [null];
global.$dataTroops = [null];
global.$dataStates = [null];
global.$dataAnimations = [null];
global.$dataTilesets = [null];
global.$dataCommonEvents = [null];
global.$dataMap = { width: 50, height: 50, data: new Array(50 * 50 * 6).fill(0), events: [] };

// 2. Load rmmz_objects.js
const rmmzCode = fs.readFileSync(path.join(ROOT_DIR, "js/rmmz_objects.js"), "utf8");
vm.runInThisContext(rmmzCode);

// 3. Singletons
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

// Mock Game_Map dimensions and wrapping
global.$gameMap.width = () => 50;
global.$gameMap.height = () => 50;
global.$gameMap.eventsXy = () => [];
global.$gameMap._tileEvents = [];
global.$gameMap._events = [];

// 4. Load Patches
require("../js/plugins/SC4_rmmz_objects_Patches.js");

const player = global.$gamePlayer;

// ----------------------------------------------------------------------------
// TEST 1: directionToPosition 8-axis calculations
// ----------------------------------------------------------------------------
console.log("\n--- Test 1: directionToPosition 8-axis calculations ---");
player.locate(10, 10);

assert.strictEqual(player.directionToPosition(15, 10), 6, "Right (Est -> 6)");
assert.strictEqual(player.directionToPosition(15, 15), 3, "Down-Right (Sud-Est -> 3)");
assert.strictEqual(player.directionToPosition(10, 15), 2, "Down (Sud -> 2)");
assert.strictEqual(player.directionToPosition(5, 15), 1, "Down-Left (Sud-Ouest -> 1)");
assert.strictEqual(player.directionToPosition(5, 10), 4, "Left (Ouest -> 4)");
assert.strictEqual(player.directionToPosition(5, 5), 7, "Up-Left (Nord-Ouest -> 7)");
assert.strictEqual(player.directionToPosition(10, 5), 8, "Up (Nord -> 8)");
assert.strictEqual(player.directionToPosition(15, 5), 9, "Up-Right (Nord-Est -> 9)");
console.log("✓ directionToPosition calcule fidèlement les 8 octants cardinaux et diagonaux.");

// ----------------------------------------------------------------------------
// TEST 2: recordTouchMove buffer (capping at 4 items)
// ----------------------------------------------------------------------------
console.log("\n--- Test 2: recordTouchMove buffer ---");
player.clearTouchMoveHistory();
assert.strictEqual(player._touchMoveHistory.length, 0, "History starts empty");

player.recordTouchMove(4);
player.recordTouchMove(6);
player.recordTouchMove(4);
player.recordTouchMove(6);
assert.strictEqual(player._touchMoveHistory.length, 4, "History stores 4 moves");

player.recordTouchMove(8);
assert.strictEqual(player._touchMoveHistory.length, 4, "History capped strictly at 4 moves");
assert.strictEqual(player._touchMoveHistory[3].direction, 8, "Newest move pushed at index 3");
console.log("✓ Buffer d'historique borné à 4 entrées maximum.");

// ----------------------------------------------------------------------------
// TEST 3: isTouchMoveOscillating detection
// ----------------------------------------------------------------------------
console.log("\n--- Test 3: isTouchMoveOscillating detection ---");

// Test normal walking (progressing)
player._touchMoveHistory = [
    { direction: 6, x: 1, y: 5 },
    { direction: 6, x: 2, y: 5 },
    { direction: 6, x: 3, y: 5 },
    { direction: 6, x: 4, y: 5 }
];
assert.strictEqual(player.isTouchMoveOscillating(), false, "Straight walk is not oscillating");

// Test normal diagonal walking
player._touchMoveHistory = [
    { direction: 9, x: 1, y: 5 },
    { direction: 9, x: 2, y: 4 },
    { direction: 9, x: 3, y: 3 },
    { direction: 9, x: 4, y: 2 }
];
assert.strictEqual(player.isTouchMoveOscillating(), false, "Diagonal walk is not oscillating");

// Test normal staircase walking around obstacle
player._touchMoveHistory = [
    { direction: 8, x: 1, y: 5 },
    { direction: 6, x: 1, y: 4 },
    { direction: 8, x: 2, y: 4 },
    { direction: 6, x: 2, y: 3 }
];
assert.strictEqual(player.isTouchMoveOscillating(), false, "Staircase progression is not oscillating");

// Test horizontal oscillation [4, 6, 4, 6]
player._touchMoveHistory = [
    { direction: 4, x: 5, y: 5 },
    { direction: 6, x: 4, y: 5 },
    { direction: 4, x: 5, y: 5 },
    { direction: 6, x: 4, y: 5 }
];
assert.strictEqual(player.isTouchMoveOscillating(), true, "Horizontal oscillation [4, 6, 4, 6] detected");

// Test vertical oscillation [8, 2, 8, 2]
player._touchMoveHistory = [
    { direction: 8, x: 5, y: 5 },
    { direction: 2, x: 5, y: 4 },
    { direction: 8, x: 5, y: 5 },
    { direction: 2, x: 5, y: 4 }
];
assert.strictEqual(player.isTouchMoveOscillating(), true, "Vertical oscillation [8, 2, 8, 2] detected");

// Test diagonal oscillation [7, 3, 7, 3] (Up-Left, Down-Right)
player._touchMoveHistory = [
    { direction: 7, x: 5, y: 5 },
    { direction: 3, x: 4, y: 4 },
    { direction: 7, x: 5, y: 5 },
    { direction: 3, x: 4, y: 4 }
];
assert.strictEqual(player.isTouchMoveOscillating(), true, "Diagonal oscillation [7, 3, 7, 3] detected");

// Test diagonal oscillation [9, 1, 9, 1] (Up-Right, Down-Left)
player._touchMoveHistory = [
    { direction: 9, x: 5, y: 5 },
    { direction: 1, x: 6, y: 4 },
    { direction: 9, x: 5, y: 5 },
    { direction: 1, x: 6, y: 4 }
];
assert.strictEqual(player.isTouchMoveOscillating(), true, "Diagonal oscillation [9, 1, 9, 1] detected");

// Test position loop (ping-pong between 2 coordinates)
player._touchMoveHistory = [
    { direction: 8, x: 10, y: 20 },
    { direction: 2, x: 10, y: 19 },
    { direction: 8, x: 10, y: 20 },
    { direction: 2, x: 10, y: 19 }
];
assert.strictEqual(player.isTouchMoveOscillating(), true, "Position loop between 2 tiles detected");
console.log("✓ Détection parfaite des allers-retours cardinaux, diagonaux et boucles de positions sans faux positif.");

// ----------------------------------------------------------------------------
// TEST 4: executeMove interruption & orientation towards unreachable target
// ----------------------------------------------------------------------------
console.log("\n--- Test 4: executeMove Interruption & Target Facing ---");
player.locate(5, 5);
player.setDirection(2);
player.clearTouchMoveHistory();

// Intercepter executeMove8Dir pour vérifier l'interruption
let executedCount = 0;
const origExecuteMove8Dir = player.executeMove8Dir;
player.executeMove8Dir = function(d) {
    executedCount++;
    origExecuteMove8Dir.call(this, d);
};

// Clic sur une case inaccessible vers le Nord-Est (10, 2)
global.$gameTemp.setDestination(10, 2);

// Pas 1 : Déplacement vers 9 (Up-Right)
player.executeMove(9);
assert.strictEqual(executedCount, 1, "Move 1 executed");

// Pas 2 : Déplacement vers 1 (Down-Left)
player.executeMove(1);
assert.strictEqual(executedCount, 2, "Move 2 executed");

// Pas 3 : Déplacement vers 9 (Up-Right)
player.executeMove(9);
assert.strictEqual(executedCount, 3, "Move 3 executed");

// Pas 4 : Déplacement vers 1 (Down-Left) -> Boucle d'aller-retour détectée !
player.executeMove(1);

// Vérifications :
assert.strictEqual(global.$gameTemp.isDestinationValid(), false, "Destination annulée immédiatement ($gameTemp.clearDestination)");
assert.strictEqual(player._touchMoveHistory.length, 0, "Historique vidé");
assert.strictEqual(executedCount, 3, "Le 4e mouvement a été interrompu et n'a pas été exécuté");
assert.strictEqual(player.direction(), 9, "Le joueur s'est tourné face à la destination (10, 2) -> direction 9");
console.log("✓ executeMove interrompt la boucle, annule le clic et tourne le joueur face à la cible.");

// ----------------------------------------------------------------------------
// TEST 5: Game_Temp.setDestination purges history on new click
// ----------------------------------------------------------------------------
console.log("\n--- Test 5: Game_Temp.setDestination Purges History ---");
player.recordTouchMove(4);
player.recordTouchMove(6);
assert.strictEqual(player._touchMoveHistory.length, 2, "History has 2 items");

global.$gameTemp.setDestination(12, 12);
assert.strictEqual(player._touchMoveHistory.length, 0, "New click purges touch history cleanly");
console.log("✓ Tout nouveau clic réinitialise instantanément la mémoire de déplacement.");

console.log("\n==============================================================");
console.log("  TOUS LES TESTS D'ANTI-OSCILLATION TACTILE SONT VALIDÉS !    ");
console.log("==============================================================");
