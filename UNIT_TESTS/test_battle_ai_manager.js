/**
 * ============================================================================
 * UNIT TEST : BattleAIManager - Architecture d'Orchestration Tactique de Combat
 * ============================================================================
 * Valide l'architecture unifiée du gestionnaire d'IA de combat :
 * 1. Cycle de vie et Registre centralisé ($battleAIManager, register, unregister)
 * 2. Suivi réactif O(1) du niveau de menace (engagedCount, hostileCount, isCombatActive)
 * 3. Tactique collective & Pack Alert (Alerte des alliés proches lors de l'engagement)
 * 4. Spatial Culling & Détection spatiale (distance8, findEnemiesInRadius, findNearestHostile)
 * 5. Orchestration BGM de combat et fondu audio automatique
 * 6. Intégration avec FightManager (onEnemyHurt, onEnemyDeath)
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

console.log("=== RUNNING TESTS FOR BATTLE_AI_MANAGER ARCHITECTURE ===\n");

// 1. Environnement global Mock
global.window = global;
global.navigator = { userAgent: 'node' };
global.document = { createElement: () => ({ getContext: () => ({}) }) };

// Mock des structures RMMZ
global.$dataSystem = { battleBgm: { name: "Battle1", volume: 90, pitch: 100 } };
global.$dataMap = { bgm: { name: "Theme1", volume: 90, pitch: 100 } };
global.$dataEnemies = [null, { id: 1, name: "Goblin", note: "<AI_MODE: melee>" }, { id: 2, name: "Archer", note: "<AI_MODE: range>" }];
global.$dataSkills = [null, { id: 1, name: "Attack", animationId: 1, note: "" }];

global.PluginManager = {
    registerCommand() {},
    parameters() { return {}; }
};

global.AudioManager = {
    _currentBgm: null,
    _fadeTimer: 0,
    playBgm(bgm) { this._currentBgm = bgm; },
    saveBgm() { return this._currentBgm; },
    replayBgm(bgm) { this._currentBgm = bgm; },
    fadeOutBgm(duration) { this._fadingOut = true; },
    fadeInBgm(duration) { this._fadingIn = true; },
    playSe() {}
};

global.Graphics = { frameCount: 1 };

function loadPlugin(relPath) {
    const fullPath = path.join(ROOT_DIR, relPath);
    const code = fs.readFileSync(fullPath, 'utf8');
    eval(code);
}

// Chargement des dépendances
loadPlugin('js/plugins/SC4_BattleAIManager.js');
loadPlugin('js/plugins/SC4_IAManager.js');
loadPlugin('js/plugins/SC4_IA_Melee.js');
loadPlugin('js/plugins/SC4_IA_Range.js');
loadPlugin('js/plugins/SC4_Enemy_AI.js');

// Mock Game_Map
global.$gameMap = {
    _events: [],
    deltaX(x1, x2) { return x1 - x2; },
    deltaY(y1, y2) { return y1 - y2; },
    events() { return this._events; },
    isNaturallySafe() { return true; },
    _combatMode: false,
    isCombatMode() { return this._combatMode; },
    setCombatMode(v) { this._combatMode = v; }
};

// Mock Game_Player
global.$gamePlayer = {
    x: 5,
    y: 5,
    isDead() { return false; },
    battler() { return { isDead: () => false }; }
};

// Mock constructeur d'événement
class MockEvent {
    constructor(id, x, y, note = "") {
        this._eventId = id;
        this.x = x;
        this.y = y;
        this.note = note;
        this._erased = false;
        this._ai = null;
        this._moveSpeed = 2;
    }
    eventId() { return this._eventId; }
    event() { return { x: this.x, y: this.y, note: this.note }; }
    enemyId() { return 0; }
    page() { return { list: [] }; }
    battler() { return { isDead: () => false }; }
    moveSpeed() { return this._moveSpeed; }
    setMoveSpeed(s) { this._moveSpeed = s; }
    turnTowardCharacter() {}
    jump() {}
    requestIndicator() {}
    isNearTheScreen() { return true; }
    isMoving() { return false; }
}

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ [PASS] ${message}`);
    } else {
        console.error(`  ❌ [FAIL] ${message}`);
    }
}

// ============================================================================
// TEST SUITE 1 : Registre et Cycle de Vie
// ============================================================================
console.log("--- 1. Registre et Cycle de Vie ---");

const manager = new BattleAIManager();
window.$battleAIManager = manager;

const ev1 = new MockEvent(101, 8, 5, "<AI_MODE: melee>");
const ev2 = new MockEvent(102, 12, 5, "<AI_MODE: range>");
const ev3 = new MockEvent(103, 30, 30, "<AI_MODE: melee>");

$gameMap._events = [ev1, ev2, ev3];
manager.onMapLoaded(1);

assert(manager.enemyCount() === 3, "Le registre contient les 3 ennemis après onMapLoaded");
assert(manager.hasEnemy(101), "Ennemi 101 est bien présent dans le registre");
assert(manager.getEnemyAI(101) instanceof IA_Melee, "Ennemi 101 possède bien une instance de IA_Melee");
assert(manager.getEnemyAI(102) instanceof IA_Range, "Ennemi 102 possède bien une instance de IA_Range");
assert(manager.engagedCount() === 0, "Compteur initial d'ennemis engagés à 0");
assert(manager.hostileCount() === 0, "Compteur initial d'ennemis hostiles à 0");
assert(!manager.isCombatActive(), "Le mode combat n'est pas actif initialement");

// Test unregisterEnemy
manager.unregisterEnemy(103);
assert(manager.enemyCount() === 2, "unregisterEnemy retire l'ennemi du registre");
assert(!manager.hasEnemy(103), "Ennemi 103 n'est plus présent dans le registre");

// ============================================================================
// TEST SUITE 2 : Suivi Réactif O(1) du Niveau de Menace
// ============================================================================
console.log("\n--- 2. Suivi Réactif O(1) de Menace ---");

const ai1 = manager.getEnemyAI(101);
const ai2 = manager.getEnemyAI(102);

// Éloigner ev2 pour isoler ev1 lors du test individuel
ev2.x = 30; ev2.y = 30;

// Ennemi 101 s'engage contre le joueur
ai1.setState("engage");
assert(manager.engagedCount() === 1, "engagedCount passe à 1 après setState('engage')");
assert(manager.hostileCount() >= 1, "hostileCount est >= 1 après engagement");
assert(manager.isCombatActive(), "isCombatActive() est true");
assert($gameMap.isCombatMode() === true, "$gameMap.isCombatMode() bascule automatiquement à true");

// Ennemi 101 passe en recherche ("search")
ai1.setState("search");
assert(manager.engagedCount() === 0, "engagedCount repasse à 0 quand aucun ennemi n'est en engage direct");
assert(manager.hostileCount() === 1, "hostileCount reste à 1 pendant la recherche (search)");
assert($gameMap.isCombatMode() === true, "$gameMap reste en combat mode pendant la recherche");

// Ennemi 101 retourne à sa base ("return" puis "neutral")
ai1.setState("return");
ai1.setState("neutral");
assert(manager.engagedCount() === 0, "engagedCount est à 0 en neutral");
assert(manager.hostileCount() === 0, "hostileCount repasse à 0 quand tous les ennemis sont en neutral");
assert($gameMap.isCombatMode() === false, "$gameMap.isCombatMode() repasse à false");

// ============================================================================
// TEST SUITE 3 : Tactique Collective & Alerte de Meute (Pack Alert)
// ============================================================================
console.log("\n--- 3. Tactique Collective & Pack Alert ---");

// Réinitialiser les états
ai1.setState("neutral");
ai2.setState("neutral");
ev1.x = 10; ev1.y = 10; // Ennemi 1 à (10, 10)
ev2.x = 13; ev2.y = 10; // Ennemi 2 à (13, 10) -> distance = 3 (dans le rayon de 6)

// Enregistrons un 3ème ennemi très éloigné
const evDistant = new MockEvent(104, 50, 50, "<AI_MODE: melee>");
manager.registerEnemy(evDistant);
const aiDistant = manager.getEnemyAI(104);
aiDistant.setState("neutral");

// Ennemi 1 repère le joueur et entre en engage
ai1.setTarget($gamePlayer);
ai1.setState("engage");

// Pack Alert doit avoir alerté Ennemi 2 (distance 3 <= 6), mais PAS Ennemi 4 (distance 40 > 6)
assert(ai1.state() === "engage", "Ennemi 1 est en engage");
assert(ai2.state() === "engage", "Pack Alert : Ennemi 2 à proximité a été alerté et est passé en engage");
assert(aiDistant.state() === "neutral", "Pack Alert : Ennemi éloigné (> 6 tuiles) reste en neutral");

// ============================================================================
// TEST SUITE 4 : Détection Spatiale & Culling
// ============================================================================
console.log("\n--- 4. Détection Spatiale & Culling ---");

// Distance Chebyshev 8-dir
assert(manager.distance8(0, 0, 5, 5) === 5, "distance8 diagonale (0,0) -> (5,5) = 5");
assert(manager.distance8(0, 0, 10, 3) === 10, "distance8 orthogonale dominante (0,0) -> (10,3) = 10");

// Recherche dans un rayon
const enemiesInRadius = manager.findEnemiesInRadius(10, 10, 5);
assert(enemiesInRadius.length === 2, "findEnemiesInRadius(10,10, 5) trouve les 2 ennemis locaux (101 et 102)");
assert(enemiesInRadius[0].event.eventId() === 101, "L'ennemi le plus proche est le 101 (distance 0)");

// Recherche de l'ennemi le plus proche
const nearest = manager.findNearestHostile({ x: 12, y: 10 }, 10);
assert(nearest && nearest.eventId() === 102, "findNearestHostile trouve l'ennemi 102 (distance 1)");

// ============================================================================
// TEST SUITE 5 : Orchestration Audio BGM
// ============================================================================
console.log("\n--- 5. Orchestration Audio BGM ---");

// Reset BGM
manager.resetBgmState();
AudioManager._currentBgm = { name: "PeacefulVillage" };

// Au premier engagement, la BGM de combat démarre
manager.triggerBattleBgm();
assert(manager._isBattleBgm === true, "La musique de combat est activée");
assert(manager._savedMapBgm && manager._savedMapBgm.name === "PeacefulVillage", "La musique de carte a été mémorisée");
assert(AudioManager._currentBgm.name === "Battle1", "AudioManager joue maintenant la musique de combat");

// Lancement du fondu de sortie
manager.startBattleBgmFadeOut();
assert(manager._isBattleBgm === false, "Désengagement de la musique de combat");
assert(manager._bgmFadeOutTimer === 180, "Le timer de fondu est initialisé à 180 frames (3 secondes)");

// Avancement du timer
for (let i = 0; i < 180; i++) {
    manager.updateBgm();
}
assert(manager._bgmFadeOutTimer === 0, "Le timer de fondu s'est écoulé");
assert(AudioManager._currentBgm.name === "PeacefulVillage", "La musique de carte originale a été restaurée");

// ============================================================================
// TEST SUITE 6 : Intégration Combat (onEnemyHurt & onEnemyDeath)
// ============================================================================
console.log("\n--- 6. Intégration Combat (onEnemyHurt & onEnemyDeath) ---");

// Test onEnemyHurt réveille un ennemi neutre
ai1.setState("neutral");
manager.onEnemyHurt(ev1, $gamePlayer);
assert(ai1.state() === "engage" || ai1.state() === "hurted", "onEnemyHurt réveille l'ennemi et l'engage");
assert(ai1.target() === $gamePlayer, "La cible de l'ennemi blessé est l'assaillant");

// Test onEnemyDeath
manager.onEnemyDeath(ev1, $gamePlayer);
assert(!manager.hasEnemy(101), "onEnemyDeath retire l'ennemi vaincu du registre");

console.log(`\n==================================================`);
console.log(`RÉSULTAT GLOBAL : ${passedTests}/${totalTests} tests validés avec succès !`);
console.log(`==================================================\n`);

if (passedTests !== totalTests) {
    process.exit(1);
}
