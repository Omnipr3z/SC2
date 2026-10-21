//=============================================================================
// UNIT TEST - Test Step 20: Safe Zones, Automatic Combat Mode & Pose System
//=============================================================================

const assert = require("assert");

// 1. Mock minimal environment
global.window = global;
global.Graphics = { frameCount: 120, width: 1760, height: 990 };
global.DEBUGTOOL = { log: () => {} };

// Mocks RMMZ
class MockCharacterBase {
    constructor() {
        this.initMembers();
    }
    initMembers() {
        this._x = 0;
        this._y = 0;
        this._direction = 2;
        this._moveSpeed = 4;
        this._action = "walk";
        this._isActing = false;
    }
    direction() { return this._direction; }
    setDirection(d) { this._direction = d; }
    isMoving() { return false; }
    resetPattern() {}
    canPass() { return true; }
    canPassDiagonally() { return true; }
    moveStraight() {}
    moveDiagonally() {}
}

global.Game_CharacterBase = MockCharacterBase;

global.Game_Character = class extends global.Game_CharacterBase {
    pattern() { return 1; }
    characterName() { return ''; }
};

global.Game_Player = class extends global.Game_Character {
    constructor() {
        super();
        this._followers = [];
    }
    followers() {
        return { data: () => this._followers };
    }
    canMove() { return true; }
    isDashButtonPressed() { return true; }
    isMoveRouteForcing() { return false; }
    isInVehicle() { return false; }
    checkEventTriggerHere() { return false; }
};

global.Game_Follower = class extends global.Game_Character {
    constructor() {
        super();
        this._actor = null;
    }
    actor() { return this._actor; }
};

global.Game_Event = class extends global.Game_Character {};

class MockMap {
    constructor() {
        this._events = [];
    }
    events() {
        return this._events;
    }
    roundX(x) { return x; }
    roundY(y) { return y; }
}

global.Game_Map = MockMap;
global.Game_Actor = class {
    constructor(id) {
        this._id = id;
    }
    actorId() { return this._id; }
    gunfightStats() {
        return { isRanged: true, name: "Laser Carbine", reload: true };
    }
    gunfightWeapon() {
        return { id: 1 };
    }
};

global.Game_Actors = class {
    constructor() { this._data = []; }
    actor(id) { return this._data[id]; }
};
global.Game_Action = class {};
global.Game_Hero = class {};
global.Game_Event = class {};
global.Game_Interpreter = class {};
global.SoundManager = { playBuzzer: () => {} };
global.DataManager = { itemRawWeight: () => 0 };
global.PluginManager = { registerCommand: () => {} };
global.SceneManager = { push: () => {}, pop: () => {} };
global.TouchInput = { isRightPressed: () => false };
global.$dataActors = [];
global.$gameActors = new global.Game_Actors();

global.$dataMap = { disableDashing: true, meta: {} };
global.$gameMap = new Game_Map();
global.$gamePlayer = new Game_Player();
global.$gameParty = {
    leader: () => new Game_Actor(1),
    isOverloaded: () => false
};

// Charger les plugins sous test
require("../js/plugins/SC4_IAManager.js");
require("../js/plugins/SC4_rmmz_objects_Patches.js");
require("../js/plugins/SC4_Gunfight.js");
require("../js/plugins/SC4_Hub_Hero.js");
require("../js/plugins/SC4_Interface.js");

console.log("=== Début du Test Step 20 : Safe Zones, Combat Mode & Pose System ===");

// ----------------------------------------------------------------------------
// Test 1 : Safe Zone par défaut via disableDashing natif
// ----------------------------------------------------------------------------
console.log("\n--- 1. Test Détection Safe Zone & Dash Bloqué ---");
$dataMap.disableDashing = true;
$dataMap.meta = {};
$gameMap.setup(1);

assert.strictEqual($gameMap.isNaturallySafe(), true, "La map doit être naturellement sûre via disableDashing: true");
assert.strictEqual($gameMap.isCombatMode(), false, "Le combat mode doit être inactif par défaut");
assert.strictEqual($gameMap.isSafeZone(), true, "La map doit être reconnue comme Safe Zone");
assert.strictEqual($gameMap.isDashDisabled(), true, "Le dash doit être désactivé en Safe Zone");

// En Safe Zone : tirs et recharges bloqués
assert.strictEqual($gamePlayer.performAttack(), false, "L'attaque doit être bloquée en Safe Zone");
assert.strictEqual($gamePlayer.performGunfightShoot(), false, "Le tir à distance doit être bloqué en Safe Zone");
assert.strictEqual($gamePlayer.action(), "walk", "L'action du joueur doit être walk sans posture d'arme en Safe Zone");

console.log("✅ 1. Safe Zone & Verrouillage d'armes : OK");

// ----------------------------------------------------------------------------
// Test 2 : Bascule Automatique en Combat Mode si ennemis hostiles
// ----------------------------------------------------------------------------
console.log("\n--- 2. Test Bascule Automatique vers Mode Combat ---");
// Simuler un événement ennemi en alerte 'engage'
const mockEnemyEvent = {
    _ai: {
        state: () => "engage"
    },
    battler: () => ({ isDead: () => false })
};
$gameMap._events = [mockEnemyEvent];

assert.strictEqual(IAManager.countActiveHostileEnemies(), 1, "Il doit y avoir 1 ennemi actif");

// Mise à jour de la map
$gameMap.updateCombatMode();
assert.strictEqual($gameMap.isCombatMode(), true, "La map doit basculer automatiquement en Combat Mode");
assert.strictEqual($gameMap.isSafeZone(), false, "La map n'est plus en Safe Zone");
assert.strictEqual($gameMap.isDashDisabled(), false, "Le dash / sprint doit être DÉBLOQUÉ en priorité en Combat Mode !");

// Quand l'ennemi redevient neutre / inactif
mockEnemyEvent._ai.state = () => "neutral";
assert.strictEqual(IAManager.countActiveHostileEnemies(), 0, "Il doit y avoir 0 ennemi actif");
$gameMap.updateCombatMode();
assert.strictEqual($gameMap.isCombatMode(), false, "La map doit repasser automatiquement en Safe Zone");
assert.strictEqual($gameMap.isSafeZone(), true, "La map est à nouveau une Safe Zone");
assert.strictEqual($gameMap.isDashDisabled(), true, "Le dash est à nouveau désactivé");

console.log("✅ 2. Bascule Automatique Safe Zone <-> Combat Mode : OK");

// ----------------------------------------------------------------------------
// Test 3 : Système de Poses Héro (setPose, canMove, allowDash, speedMod)
// ----------------------------------------------------------------------------
console.log("\n--- 3. Test Système de Poses Héro (canMove, allowDash, speedMod) ---");
$gamePlayer.clearPose();
assert.strictEqual($gamePlayer.pose(), null, "Aucune pose active par défaut");
assert.strictEqual($gamePlayer.isPoseActive(), false, "isPoseActive doit retourner false");

// Assigner une pose assise avec canMove: false
$gamePlayer.setPose("sit", { canMove: false, allowDash: false });
assert.strictEqual($gamePlayer.pose(), "sit", "La pose doit être 'sit'");
assert.strictEqual($gamePlayer.isPoseActive(), true, "isPoseActive doit retourner true");
assert.strictEqual($gamePlayer.canMove(), false, "canMove() doit être bloqué");
assert.strictEqual($gamePlayer.isDashing(), false, "allowDash: false doit empêcher de courir");

// Assigner une pose de déplacement furtif 'sneak' avec speedMod
$gamePlayer.setPose("sneak", { canMove: true, allowDash: false, speedMod: -1 });
assert.strictEqual($gamePlayer.pose(), "sneak", "La pose doit être 'sneak'");
assert.strictEqual($gamePlayer.canMove(), true, "canMove() doit être autorisé");
assert.strictEqual($gamePlayer.realMoveSpeed(), 3, "La vitesse doit être réduite de 1 (4 - 1 = 3)");
assert.strictEqual($gamePlayer.isDashing(), false, "Dash interdit en sneak");

console.log("✅ 3. Options de pose canMove, allowDash, speedMod : OK");

// ----------------------------------------------------------------------------
// Test 4 : Réveil automatique onAlert lors du passage en Combat Mode
// ----------------------------------------------------------------------------
console.log("\n--- 4. Test Patch onAlert (Réveil automatique en Mode Combat) ---");
// Le joueur dort
$gamePlayer.setPose("lay", { canMove: false, onAlert: true });
assert.strictEqual($gamePlayer.pose(), "lay", "Le joueur est allongé");

// Déclenchement d'une alerte combat sur la map
$gameMap.setCombatMode(true);
assert.strictEqual($gamePlayer.pose(), null, "Le passage en Mode Combat doit réveiller le joueur (clearPose automatique)");
assert.strictEqual($gamePlayer.action(), "walk", "Le joueur doit être debout en posture walk");

console.log("✅ 4. Réveil onAlert : OK");

// ----------------------------------------------------------------------------
// Test 5 : Point d'accès SC4_Interface
// ----------------------------------------------------------------------------
console.log("\n--- 5. Test Méthodes SC4_Interface ---");
assert.strictEqual(typeof SC4.isSafeZone, "function", "SC4.isSafeZone doit exister");
assert.strictEqual(typeof SC4.isCombatMode, "function", "SC4.isCombatMode doit exister");
assert.strictEqual(typeof SC4.setCombatMode, "function", "SC4.setCombatMode doit exister");
assert.strictEqual(typeof SC4.setHeroPose, "function", "SC4.setHeroPose doit exister");
assert.strictEqual(typeof SC4.clearHeroPose, "function", "SC4.clearHeroPose doit exister");

SC4.setCombatMode(false);
assert.strictEqual(SC4.isCombatMode(), false, "Combat mode doit être false");
assert.strictEqual(SC4.isSafeZone(), true, "Safe zone doit être true");

SC4.setHeroPose(1, "sit", { canMove: false });
assert.strictEqual($gamePlayer.pose(), "sit", "SC4.setHeroPose doit configurer la pose");
SC4.clearHeroPose(1);
assert.strictEqual($gamePlayer.pose(), null, "SC4.clearHeroPose doit effacer la pose");

console.log("✅ 5. Méthodes SC4_Interface : OK");

console.log("\n🎉 TEST STEP 20 RÉUSSI AVEC SUCCÈS (100%) !");
