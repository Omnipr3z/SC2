/**
 * ============================================================================
 * UNIT TEST : Étape 11 - IA des Ennemis (Enemy AI)
 * ============================================================================
 * Valide l'architecture complète de l'intelligence artificielle des ennemis :
 * 1. Extraction et héritage des notetags d'IA :
 *    - <AI_MODE: melee>
 *    - <AI_BASE_SPEED: 2>
 *    - <AI_ATTACK_RANGE: 1>
 *    - <AI_ENGAGE_RANGE: 4>
 *    - <AI_ENGAGE_SPEED: 4>
 *    - <AI_SEARCH_RANGE: 10>
 *    - <AI_SEARCH_TIME: 60> / <AI_FORGET_TIME: 60>
 *    - <AI_ATTACK_FREQUENCY: 240>
 *    - <AI_BASE_POSITION: [x],[y]>
 *    - <AI_ZONE_ENGAEMENT_RANGE: [VALUE]>
 * 2. Machine à états finis (FSM) :
 *    - MODE_NEUTRE ("neutral")   : vitesse de base, patrouille normale, détection à distance d'engagement.
 *    - MODE_ENGAGE ("engage")    : accélération à engage speed, poursuite par pathfinding 8-dir.
 *    - MODE_RECHERCHE ("search") : temporisation search time, alterne 70% ciblage / 30% aléatoire.
 *    - MODE_RETOUR_BASE ("return"): repli vers la base en pathfinding en cas de leash ou d'abandon.
 * 3. Combat au corps-à-corps initié par l'ennemi (FightManager.executeEnemyAttack) :
 *    - Déclenchement à portée d'attaque (1 case).
 *    - Animation "atk" de l'ennemi, résolution native Game_Action.
 *    - Animation "hurt", knockback 1 case et direction fixe sur la cible.
 *    - Cooldown d'attaque respectant AI_ATTACK_FREQUENCY.
 *    - Défaite du joueur (isDead) : animation "down" et transition Game Over.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

console.log("=== RUNNING TESTS FOR STEP 11: ENEMY AI & FINITE STATE MACHINE ===\n");

// 1. Mock de l'environnement global Node / RMMZ
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
global.$dataTroops = fs.existsSync(path.join(ROOT_DIR, 'data/Troops.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Troops.json'), 'utf8')) : [];
global.$dataStates = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/States.json'), 'utf8'));
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
    }
};

global.Spriteset_Map = class Spriteset_Map {
    createCharacterSprite(character) {
        return new Sprite_Character(character);
    }
};

global.SoundManager = {
    playRecovery() {},
    playEquip() {},
    playActorDamage() {},
    playActorCollapse() {},
    playEnemyDamage() {},
    playEnemyCollapse() {},
    playCancel() {}
};

global.ConfigManager = { alwaysDash: false };
global.TextManager = { currencyUnit: "G" };
global.Graphics = { boxWidth: 1280, boxHeight: 720, width: 1280, height: 720 };
global.Input = { _pressed: {}, dir8: 0, dir4: 0, isPressed: () => false, isTriggered: () => false };
global.TouchInput = { clear() {}, isTriggered: () => false, isPressed: () => false, isRightPressed: () => false, x: 0, y: 0 };
global.Utils = { isOptionValid() { return false; }, canPlayOgg() { return true; } };

let gameOverTriggered = false;
global.Scene_Gameover = class Scene_Gameover {};
global.SceneManager = {
    _scene: null,
    goto(sceneClass) {
        if (sceneClass === Scene_Gameover) {
            gameOverTriggered = true;
        }
    }
};

Number.prototype.clamp = function(min, max) {
    return Math.min(Math.max(this, min), max);
};
Math.randomInt = function(max) {
    return Math.floor(max * Math.random());
};
Array.prototype.clone = function() {
    return this.slice(0);
};
Array.prototype.remove = function(element) {
    const index = this.indexOf(element);
    if (index >= 0) {
        this.splice(index, 1);
    }
    return this;
};

// 2. Évaluation de rmmz_objects.js
const rmmzCode = fs.readFileSync(path.join(ROOT_DIR, 'js/rmmz_objects.js'), 'utf8');
eval(rmmzCode);
Game_Action.prototype.itemHit = function() { return 1.0; };
Game_Action.prototype.itemEva = function() { return 0.0; };

// 3. Helper pour charger les plugins
function loadPlugin(relPath) {
    const fullPath = path.join(ROOT_DIR, relPath);
    const code = fs.readFileSync(fullPath, 'utf8');
    eval(code);
}

// Singletons
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

// Chargement des plugins SimCraft 4
loadPlugin('js/plugins/Hub_Hero.js');
loadPlugin('js/plugins/Bitmap_Composite.js');
loadPlugin('js/plugins/Game_Hero.js');
loadPlugin('js/plugins/Character_Hero.js');
loadPlugin('js/plugins/Sprite_Hero.js');
loadPlugin('js/plugins/FightManager.js');
loadPlugin('js/plugins/IAManager.js');
loadPlugin('js/plugins/IA_melee.js');
loadPlugin('js/plugins/IA_range.js');
loadPlugin('js/plugins/Enemy_AI.js');
loadPlugin('js/plugins/SC4_rmmz_core_Patches.js');
loadPlugin('js/plugins/SC4_rmmz_objects_Patches.js');
loadPlugin('js/plugins/SC4_rmmz_sprites_Patches.js');

$gameMap.setup(1);
$gameParty.setupStartingMembers();

// Helper d'assertion
function assert(condition, message) {
    if (!condition) {
        console.error("❌ ÉCHEC : " + message);
        process.exit(1);
    } else {
        console.log("✅ SUCCÈS : " + message);
    }
}

// ============================================================================
// TEST 1 : Extraction des notetags d'IA et valeurs par défaut
// ============================================================================
console.log("\n--- TEST 1 : EXTRACTION DES NOTETAGS ET VALEURS PAR DÉFAUT ---");

const evData1 = {
    id: 10,
    name: "Ennemi Melee Basique",
    x: 5,
    y: 5,
    note: "<role: hostile>\n<enemy: 1>\n<AI_MODE: melee>",
    pages: [{
        conditions: {},
        image: { tileId: 0, characterName: "Actor1", characterIndex: 2, direction: 2, pattern: 1 },
        list: [{ code: 0, indent: 0, parameters: [] }]
    }]
};
$dataMap.events[10] = evData1;
$gameMap._events[10] = new Game_Event(1, 10);
const event1 = $gameMap._events[10];
event1.extractActorNotetag();
event1.extractAiNotetags();

assert(event1.ai() instanceof IAManager, "event1.ai() hérite de IAManager");
assert(event1.ai() instanceof IA_Melee, "event1.ai() est une instance spécialisée de IA_Melee");
assert(event1.aiMode() === "melee", "AI Mode est correctement configuré à 'melee'");
assert(event1._aiBaseSpeed === 2, "AI Base Speed par défaut est 2");
assert(event1._aiAttackRange === 1, "AI Attack Range par défaut est 1");
assert(event1._aiEngageRange === 4, "AI Engage Range par défaut est 4");
assert(event1._aiEngageSpeed === 4, "AI Engage Speed par défaut est 4");
assert(event1._aiSearchRange === 10, "AI Search Range par défaut est 10");
assert(event1._aiSearchTime === 60, "AI Search Time par défaut est 60 frames (1s)");
assert(event1._aiAttackFrequency === 240, "AI Attack Frequency par défaut est 240 frames (4s)");
assert(event1._aiBasePosition.x === 5 && event1._aiBasePosition.y === 5, "AI Base Position par défaut correspond aux coordonnées de l'event (5,5)");
assert(event1._aiZoneEngagementRange === null, "AI Zone Leash par défaut est désactivé (null)");
assert(event1.aiState() === "neutral", "L'état initial de l'IA est 'neutral'");
assert(event1.moveSpeed() === 2, "La vitesse de déplacement initiale correspond à AI_BASE_SPEED (2)");

// ============================================================================
// TEST 2 : Surcharges personnalisées des paramètres d'IA
// ============================================================================
console.log("\n--- TEST 2 : SURCHARGES PERSONNALISÉES DES PARAMÈTRES D'IA ---");

const evData2 = {
    id: 11,
    name: "Ennemi Rapide avec Leash",
    x: 10,
    y: 10,
    note: "<role: hostile>\n<enemy: 1>",
    pages: [{
        conditions: {},
        image: { tileId: 0, characterName: "Actor1", characterIndex: 2, direction: 2, pattern: 1 },
        list: [
            { code: 108, indent: 0, parameters: ["<AI_MODE: melee>"] },
            { code: 408, indent: 0, parameters: ["<AI_BASE_SPEED: 3>"] },
            { code: 408, indent: 0, parameters: ["<AI_ENGAGE_SPEED: 5>"] },
            { code: 408, indent: 0, parameters: ["<AI_ENGAGE_RANGE: 6>"] },
            { code: 408, indent: 0, parameters: ["<AI_ATTACK_RANGE: 2>"] },
            { code: 408, indent: 0, parameters: ["<AI_SEARCH_RANGE: 12>"] },
            { code: 408, indent: 0, parameters: ["<AI_SEARCH_TIME: 120>"] },
            { code: 408, indent: 0, parameters: ["<AI_ATTACK_FREQUENCY: 180>"] },
            { code: 408, indent: 0, parameters: ["<AI_BASE_POSITION: [8],[9]>"] },
            { code: 408, indent: 0, parameters: ["<AI_ZONE_ENGAEMENT_RANGE: 15>"] },
            { code: 0, indent: 0, parameters: [] }
        ]
    }]
};
$dataMap.events[11] = evData2;
$gameMap._events[11] = new Game_Event(1, 11);
const event2 = $gameMap._events[11];
event2.extractActorNotetag();
event2.extractAiNotetags();

assert(event2._aiBaseSpeed === 3, "AI Base Speed personnalisé à 3");
assert(event2._aiEngageSpeed === 5, "AI Engage Speed personnalisé à 5");
assert(event2._aiEngageRange === 6, "AI Engage Range personnalisé à 6");
assert(event2._aiAttackRange === 2, "AI Attack Range personnalisé à 2");
assert(event2._aiSearchRange === 12, "AI Search Range personnalisé à 12");
assert(event2._aiSearchTime === 120, "AI Search Time personnalisé à 120");
assert(event2._aiAttackFrequency === 180, "AI Attack Frequency personnalisé à 180");
assert(event2._aiBasePosition.x === 8 && event2._aiBasePosition.y === 9, "AI Base Position personnalisé à (8,9)");
assert(event2._aiZoneEngagementRange === 15, "AI Zone Leash personnalisé à 15");

// Instanciation de IA_Range pour un ennemi à distance
const evDataRange = {
    id: 12,
    name: "Ennemi Archer (Range)",
    x: 12,
    y: 12,
    note: "<role: hostile>\n<enemy: 1>\n<AI_MODE: range>",
    pages: [{
        conditions: {},
        image: { tileId: 0, characterName: "Actor1", characterIndex: 2, direction: 2, pattern: 1 },
        list: [{ code: 0, indent: 0, parameters: [] }]
    }]
};
$dataMap.events[12] = evDataRange;
$gameMap._events[12] = new Game_Event(1, 12);
const eventRange = $gameMap._events[12];
eventRange.extractActorNotetag();
eventRange.extractAiNotetags();
assert(eventRange.ai() instanceof IAManager, "eventRange.ai() hérite de IAManager");
assert(eventRange.ai() instanceof IA_Range, "eventRange.ai() est une instance spécialisée de IA_Range");
assert(eventRange.ai()._attackRange === 4, "Portée par défaut de IA_Range est 4");

// ============================================================================
// TEST 3 : Machine à états - Détection et Transition Neutre -> Engage
// ============================================================================
console.log("\n--- TEST 3 : TRANSITION NEUTRE -> ENGAGE SUR PROXIMITÉ ---");

event1.locate(10, 10);
event1._aiBasePosition = { x: 10, y: 10 };
$gamePlayer.locate(10, 20);

event1.updateAI();
assert(event1.aiState() === "neutral", "L'ennemi reste en 'neutral' tant que le joueur est à distance 10 (> engageRange 4)");
assert(event1.moveSpeed() === 2, "Vitesse en neutre = AI_BASE_SPEED (2)");

// Le joueur s'approche à distance 3 (dans les 4 cases d'engage range)
$gamePlayer.locate(10, 13);
event1.updateAI();

assert(event1.aiState() === "engage", "Transition en 'engage' réussie lorsque le joueur entre dans le rayon d'action (dist 3 <= 4)");
assert(event1.moveSpeed() === 4, "Vitesse en engage accélérée à AI_ENGAGE_SPEED (4)");
assert(event1._aiLastKnownX === 10 && event1._aiLastKnownY === 13, "Dernière position connue du joueur mémorisée");

// ============================================================================
// TEST 4 : Machine à états - Poursuite en Engage et Pathfinding
// ============================================================================
console.log("\n--- TEST 4 : DÉPLACEMENT VERS LE JOUEUR EN MODE ENGAGE ---");

const initialY = event1.y;
event1.updateAI();
assert(event1.y > initialY || event1.isMoving(), "L'ennemi a amorcé un pas vers le joueur via pathfinding 8-dir");

// ============================================================================
// TEST 5 : Transition Engage -> Recherche lorsque le joueur s'échappe
// ============================================================================
console.log("\n--- TEST 5 : TRANSITION ENGAGE -> RECHERCHE LORSQUE LE JOUEUR S'ÉLOIGNE ---");

$gamePlayer.locate(10, 17);
event1.updateAI();

assert(event1.aiState() === "search", "Transition en 'search' réussie lorsque le joueur quitte engageRange mais reste en searchRange");
assert(event1._aiSearchTimer === 60, "Search timer initialisé à AI_SEARCH_TIME (60)");

event1.updateAI();
assert(event1._aiSearchTimer === 59, "Search timer décrémente correctement (59/60)");

// Si le joueur revient à portée d'engagement, l'ennemi ré-engage immédiatement
$gamePlayer.locate(10, 12);
event1.updateAI();
assert(event1.aiState() === "engage", "Ré-engagement immédiat lorsque le joueur revient dans engageRange pendant la recherche");

// ============================================================================
// TEST 6 : Recherche expirée -> Retour à la Base
// ============================================================================
console.log("\n--- TEST 6 : EXPIRATION DU TEMPS DE RECHERCHE -> RETOUR BASE ---");

$gamePlayer.locate(10, 25);
event1.updateAI();
assert(event1.aiState() === "search", "Retour en mode search");

event1._aiSearchTimer = 1;
event1.updateAI();

assert(event1.aiState() === "return", "Transition vers 'return' après expiration du search timer");
assert(event1.moveSpeed() === 2, "Vitesse en mode return = AI_BASE_SPEED (2)");

event1.locate(10, 10);
event1.updateAI();

assert(event1.aiState() === "neutral", "Retour au mode 'neutral' dès que l'ennemi a regagné sa position de base");
assert(event1.moveSpeed() === 2, "Vitesse rétablie à AI_BASE_SPEED (2)");

// ============================================================================
// TEST 7 : Zone de Leash (AI_ZONE_ENGAEMENT_RANGE)
// ============================================================================
console.log("\n--- TEST 7 : LEASH / RUPTURE DE POURSUITE HORS DE ZONE ---");

event1._aiZoneEngagementRange = 5;
event1._aiBasePosition = { x: 10, y: 10 };
event1.locate(10, 10);

// Joueur dans engageRange mais HORS de la zone de leash par rapport à la base
$gamePlayer.locate(10, 16);
event1.locate(10, 14);

event1.updateAINeutral($gamePlayer);
assert(event1.aiState() === "neutral", "L'ennemi refuse d'engager si la cible est en dehors du rayon de leash de la base");

// Joueur dans la zone de leash : dist à la base = 4 (<= 5)
$gamePlayer.locate(10, 14);
event1.locate(10, 12);
event1.updateAINeutral($gamePlayer);
assert(event1.aiState() === "engage", "L'ennemi engage la cible lorsqu'elle est dans le rayon de leash");

// En mode engage, si l'ennemi est entraîné au-delà du leash :
event1.locate(10, 16);
event1.updateAI();
assert(event1.aiState() === "return", "L'ennemi abandonne la poursuite et passe en 'return' si le leash est dépassé");

// ============================================================================
// TEST 8 : CHARGE D'ATTAQUE, GÈLE PENDANT ATK, RESET À 0, ET INTERRUPTION EN HURT
// ============================================================================
console.log("\n--- TEST 8 : CHARGE D'ATTAQUE, GÈLE PENDANT ATK, RESET À 0, ET INTERRUPTION EN HURT ---");

event1.locate(10, 10);
event1._aiZoneEngagementRange = null;
event1.setAiState("engage");
event1._aiAttackTimer = 0;
event1._aiAttackFrequency = 240;

$gamePlayer.locate(10, 9);
$gamePlayer.setDirection(2);
const leaderActor = $gameParty.leader();

$fightManager.clearHistory();

// 1. Compteur à 0 : pas encore prêt à attaquer
assert(!event1.ai().canAttack(), "L'ennemi ne peut pas attaquer tant que le compteur n'a pas atteint la fréquence");
event1.updateAI();
assert($fightManager.lastResult() === null, "Aucune attaque déclenchée tant que le compteur charge");
assert(event1._aiAttackTimer === 1, "Le compteur d'attaque s'est incrémenté de 1");

// 2. Compteur chargé à 240 : attaque déclenchée
event1._aiAttackTimer = 240;
assert(event1.ai().canAttack(), "canAttack() est vrai une fois le compteur chargé");
event1.updateAI();

const lastFight = $fightManager.lastResult();
assert(lastFight !== null, "Une attaque ennemie a été résolue par FightManager");
assert(lastFight.attacker === event1, "L'attaquant enregistré est l'événement ennemi");
assert(lastFight.target === $gamePlayer, "La cible enregistrée est le joueur ($gamePlayer)");
assert(lastFight.damage > 0, `Dégâts infligés au joueur : ${lastFight.damage} HP (reste: ${leaderActor.hp}/${leaderActor.mhp})`);
assert(event1._action === "atk", "L'ennemi a déclenché l'action 'atk'");
assert($gamePlayer._action === "hurt", "Le joueur survivant a déclenché l'action 'hurt'");
assert($gamePlayer.isDirectionFixed(), "La direction du joueur est fixée pendant le recul / hurt");

// 3. Pendant l'animation 'atk' : le compteur est gelé (ne défile pas)
const timerDuringAtk = event1._aiAttackTimer;
event1.updateAI();
assert(event1._aiAttackTimer === timerDuringAtk, "Pendant l'anim d'attaque, le compteur ne défile pas (gelé)");

// 4. Fin de l'animation 'atk' : le compteur est remis à zéro
if (typeof event1._actionOnEnd === "function") {
    event1._actionOnEnd();
}
assert(event1._aiAttackTimer === 0, "À la fin de l'anim d'attaque, le compteur est remis à zéro (0)");
event1._isActing = false;

// 5. Interruption par dégâts ("hurt") : remise à zéro immédiate du compteur
event1._aiAttackTimer = 150;
event1.ai().onHurt();
assert(event1._aiAttackTimer === 0, "onHurt() réinitialise immédiatement le compteur à 0");

// ============================================================================
// TEST 9 : Attaque létale sur le joueur (Game Over)
// ============================================================================
console.log("\n--- TEST 9 : ATTAQUE LÉTALE SUR LE JOUEUR ET GAME OVER ---");

// Réinitialise les actions terminées et repositionne le joueur au contact (distance 1)
event1._isActing = false;
$gamePlayer._isActing = false;
$gamePlayer.locate(10, 9);
leaderActor.setHp(1);
event1._aiAttackTimer = 240;
gameOverTriggered = false;

event1.updateAI();

const lethalFight = $fightManager.lastResult();
assert(lethalFight.isDead === true, "L'attaque ennemie a mis le joueur KO (0 HP / isDead)");
assert($gamePlayer._action === "down", "Le joueur vaincu a déclenché l'action 'down'");

if (typeof $gamePlayer._actionOnEnd === "function") {
    $gamePlayer._actionOnEnd();
}
assert(gameOverTriggered === true, "La scène Scene_Gameover a été appelée suite à la défaite du joueur");

// ============================================================================
// TEST 10 : L'ennemi vaincu n'agit plus
// ============================================================================
console.log("\n--- TEST 10 : ENNEMI KO NE FAIT PLUS D'ACTION ---");

const enemyBattler = event1.battler();
enemyBattler.addNewState(1);
assert(enemyBattler.isDead() === true, "Le battler ennemi est maintenant KO");

const prevAction = event1._action;
event1._aiAttackTimer = 240;
event1.updateAI();
assert(event1._action === prevAction, "L'ennemi KO n'exécute aucune mise à jour ni attaque");

// ============================================================================
// TEST 11 : Optimisation performance - Ennemi hors écran mis en attente
// ============================================================================
console.log("\n--- TEST 11 : OPTIMISATION PERFORMANCE - ENNEMI HORS ÉCRAN ---");

enemyBattler.removeState(1);
const evOffScreen = new Game_Event(1, 10);
evOffScreen.extractActorNotetag();
evOffScreen.extractAiNotetags();
evOffScreen.setAiState("engage");
evOffScreen.isNearTheScreen = () => false;
evOffScreen.updateAI();
assert(evOffScreen.aiState() === "neutral", "L'ennemi hors écran est automatiquement basculé en MODE_NEUTRE");

// ============================================================================
// RÉSUMÉ DU TEST
// ============================================================================
console.log("\n==============================================================");
console.log("🎉 TOUS LES TESTS DE L'ÉTAPE 11 (IA DES ENNEMIS) SONT VALIDÉS !");
console.log("==============================================================");
