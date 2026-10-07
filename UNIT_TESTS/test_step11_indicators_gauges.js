/**
 * ============================================================================
 * UNIT TEST : Étape 11 - Indicateurs Visuels, Jauges Ennemies & DebugTool
 * ============================================================================
 * Valide :
 * 1. DEBUGTOOL :
 *    - Mode global et mode sélectif (filtrage par clé).
 *    - Méthode logFormat avec tableaux (%1, %2) et objets (%[prop], [prop]).
 * 2. Mode Hurted pour l'IA (IAManager) :
 *    - Passage en AI_STATE_HURTED lors d'une blessure.
 *    - Suspension complète de l'IA pendant l'animation hurt.
 *    - Restauration de l'état précédent (neutral, engage, search) à la fin de hurt.
 *    - Réinitialisation du délai d'attaque.
 * 3. Sprite_CharacterIndicator :
 *    - Déclenchement automatique sur transition d'état FSM :
 *      * neutral -> engage : Point d'exclamation (ligne 0)
 *      * engage -> search  : Point d'interrogation rouge (ligne 1)
 *      * search -> neutral : Point d'interrogation jaune (ligne 2)
 *    - File d'attente (waitlist) des indicateurs successifs.
 *    - Cycle d'animation 60 frames (15f apparition, 30f maintien, 15f disparition).
 * 4. Spriteset_FightGauges :
 *    - Visibilité conditionnée : uniquement si hostile, vivant et en mode 'engage'.
 *    - Jauge AT (48x2px blanche) liée à attackTimer / attackFrequency.
 *    - Jauge HP (48x8px dégradée) et clignotement rouge sous 10% de PV.
 *    - Jauge MP (48x4px dégradée bleue).
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

console.log("=== RUNNING TESTS FOR STEP 11: INDICATORS, FIGHT GAUGES & DEBUGTOOL ===\n");

// 1. Mock de l'environnement global Node / RMMZ
global.window = global;
global.navigator = { userAgent: 'node' };
global.document = {
    createElement: () => ({
        getContext: () => ({
            drawImage() {},
            getImageData: () => ({ data: [] }),
            putImageData() {},
            clearRect() {},
            fillRect() {},
            createLinearGradient: () => ({ addColorStop() {} })
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
        this.context = {
            fillRect() {},
            createLinearGradient: () => ({ addColorStop() {} })
        };
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
        this.scale = {
            x: 1, y: 1,
            set(x, y) { this.x = x; this.y = y; }
        };
        this.anchor = { x: 0, y: 0 };
        this.x = 0;
        this.y = 0;
        this.children = [];
    }
    addChild(child) {
        child.parent = this;
        this.children.push(child);
    }
    setFrame(x, y, w, h) {
        this._frame = { x, y, width: w, height: h };
    }
    update() {
        for (const child of this.children) {
            child.update();
        }
    }
};

global.Sprite_Character = class Sprite_Character extends Sprite {
    constructor(character) {
        super();
        this._character = character;
        this.initMembers();
        if (character) this.setCharacter(character);
    }
    initMembers() {
        this._frameWidth = 48;
        this._frameHeight = 48;
    }
    setCharacter(character) {
        this._character = character;
    }
    patternWidth() { return this._frameWidth; }
    patternHeight() { return this._frameHeight; }
    update() {
        super.update();
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
global.Utils = { isOptionValid() { return false; }, canPlayOgg() { return true; } };
global.BattleManager = { setup() {}, onEncounter() {} };
global.SoundManager = { playCancel() {}, playRecovery() {}, playActorDamage() {} };
global.ConfigManager = { alwaysDash: false };

Number.prototype.clamp = function(min, max) { return Math.min(Math.max(this, min), max); };
Math.randomInt = function(max) { return Math.floor(max * Math.random()); };
Array.prototype.clone = function() { return this.slice(0); };

// Load core RMMZ classes
const rmmzCode = fs.readFileSync(path.join(ROOT_DIR, 'js/rmmz_objects.js'), 'utf8');
eval(rmmzCode);
Game_Action.prototype.itemHit = function() { return 1.0; };
Game_Action.prototype.itemEva = function() { return 0.0; };

global.PluginManager = {
    parameters(name) {
        if (name === "DEBUGTOOL") {
            return { enabled: "true", selectiveMode: "false", allowedKeys: "[]" };
        }
        return {};
    }
};

// Chargement des plugins du projet
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/DEBUGTOOL.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Hub_Hero.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Bitmap_Composite.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Game_Hero.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Character_Hero.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Sprite_CharacterIndicator.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Spriteset_FightGauges.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Sprite_Hero.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/FightManager.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/IAManager.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/IA_melee.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/IA_range.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Enemy_AI.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_rmmz_objects_Patches.js'), 'utf8'));

// Initialisation de la carte et du joueur
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

$gameMap.setup(1);

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`✅ SUCCÈS : ${message}`);
    } else {
        failed++;
        console.error(`❌ ÉCHEC : ${message}`);
    }
}

// ============================================================================
// TEST 1 : DEBUGTOOL
// ============================================================================
console.log("\n--- TEST 1 : DEBUGTOOL ---");

assert(typeof DEBUGTOOL !== "undefined", "DEBUGTOOL est défini globalement");
assert(DEBUGTOOL.isEnabled() === true, "DEBUGTOOL est activé par défaut");

let lastLog = "";
const origLog = console.log;
console.log = (msg) => { lastLog = msg; };

DEBUGTOOL.log("Test log normal", "TEST");
assert(lastLog.includes("Test log normal"), "DEBUGTOOL.log affiche le message");

DEBUGTOOL.setSelectiveMode(true);
DEBUGTOOL.setAllowedKeys(["COMBAT"]);
lastLog = "";
DEBUGTOOL.log("Ceci doit être ignoré", "HERO");
assert(lastLog === "", "En mode sélectif, les clés non autorisées sont filtrées");

DEBUGTOOL.log("Ceci doit être affiché", "COMBAT");
assert(lastLog.includes("Ceci doit être affiché"), "En mode sélectif, les clés autorisées sont affichées");

// Test format avec array
const formattedArray = DEBUGTOOL.logFormat(["PunchingBall", 200], "Ennemi: %1, PV: %2", "COMBAT");
assert(formattedArray === "Ennemi: PunchingBall, PV: 200", "DEBUGTOOL.logFormat formate correctement les tableaux (%1, %2)");

// Test format avec objet
const formattedObj = DEBUGTOOL.logFormat({ name: "Reid", hp: 450, maxHp: 500 }, "Héros: %[name] (%[hp]/%[maxHp])", "COMBAT");
assert(formattedObj === "Héros: Reid (450/500)", "DEBUGTOOL.logFormat formate correctement les objets (%[prop])");

DEBUGTOOL.setSelectiveMode(false);
console.log = origLog;

// ============================================================================
// TEST 2 : IA MODE HURTED & SUSPENSION
// ============================================================================
console.log("\n--- TEST 2 : IA MODE HURTED & SUSPENSION ---");

$dataMap.events[20] = {
    id: 20,
    x: 5,
    y: 5,
    pages: [{
        conditions: {},
        image: { tileId: 0, characterName: "Actor1", characterIndex: 2, direction: 2, pattern: 1 },
        list: [
            { code: 108, parameters: ["<actor:3>"] },
            { code: 408, parameters: ["<role:hostile>"] },
            { code: 408, parameters: ["<enemy:1>"] },
            { code: 408, parameters: ["<AI_MODE: melee>"] },
            { code: 408, parameters: ["<AI_ATTACK_FREQUENCY: 120>"] }
        ]
    }]
};

const enemyEvent = new Game_Event(1, 20);
enemyEvent.locate(5, 5);
$gameMap._events[20] = enemyEvent;

assert(enemyEvent.ai() instanceof IA_Melee, "L'ennemi possède une IA de mêlée");
assert(enemyEvent.aiState() === "neutral", "L'ennemi démarre en 'neutral'");

// Passage en engage
enemyEvent.setAiState("engage");
assert(enemyEvent.aiState() === "engage", "L'ennemi passe en mode 'engage'");
enemyEvent.ai()._attackTimer = 60;

// Subit un coup (onHurt)
enemyEvent.ai().onHurt();
assert(enemyEvent.aiState() === "hurted", "onHurt() fait basculer l'état de l'IA en 'hurted'");
assert(enemyEvent.ai().attackTimer() === 0, "Le compteur d'attaque est réinitialisé à 0 lors du hurt");
assert(enemyEvent.ai().canAttack() === false, "canAttack() est impossible en état 'hurted'");

// IA suspendue pendant hurt
enemyEvent.playAction({ action: "hurt", duration: 8, frames: 3 });
enemyEvent.updateAI();
assert(enemyEvent.ai().attackTimer() === 0, "L'IA est suspendue : le compteur ne s'incrémente pas pendant hurt");

// Fin du hurt -> reprise de l'état précédent ('engage')
$gamePlayer.locate(5, 6); // Joueur à portée d'engagement (dist 1)
while (enemyEvent.isActing()) {
    enemyEvent.updateAction();
}
enemyEvent.updateAI();
assert(enemyEvent.aiState() === "engage", "À la fin de l'action hurt, l'IA reprend automatiquement son état précédent ('engage')");

// ============================================================================
// TEST 3 : SPRITE_CHARACTERINDICATOR & TRANSITIONS FSM
// ============================================================================
console.log("\n--- TEST 3 : SPRITE_CHARACTERINDICATOR & TRANSITIONS FSM ---");

const enemySprite = new Sprite_Hero(enemyEvent);
assert(enemySprite._indicatorSprite instanceof Sprite_CharacterIndicator, "Sprite_Hero contient un enfant Sprite_CharacterIndicator");
const indicator = enemySprite._indicatorSprite;

// 1. neutral -> engage : Point d'exclamation (ligne 0)
enemyEvent._indicatorQueue = [];
enemyEvent.setAiState("neutral");
enemyEvent.setAiState("engage");
assert(enemyEvent._indicatorQueue.length === 1 && enemyEvent._indicatorQueue[0] === "exclamation", "Transition neutral -> engage ajoute un indicateur 'exclamation'");

// Mise à jour du sprite pour consommer la file d'attente
indicator.update();
assert(indicator.visible === true, "L'indicateur d'exclamation devient visible");
assert(indicator._currentRow === 0, "L'indicateur d'exclamation utilise la ligne 0");
assert(indicator._animTimer === 1, "Le cycle d'animation démarre (timer = 1)");

// Avance de 15 frames (apparition terminée)
for (let f = 0; f < 14; f++) indicator.update();
assert(indicator.opacity === 255, "À 15 frames, l'opacité a atteint 255 (fadeIn complet)");
assert(Math.abs(indicator.scale.x - 1.0) < 0.05, "À 15 frames, le zoom a atteint 1.0");
assert(indicator._offsetY === -10, "À 15 frames, l'élévation est de -10px");

// Avance de 30 frames supplémentaires (maintien terminé, total 45 frames)
for (let f = 0; f < 30; f++) indicator.update();
assert(indicator.opacity === 255, "Pendant la phase de maintien (45 frames), l'opacité reste à 255");
assert(indicator._offsetY === -10, "Pendant le maintien, l'élévation reste à -10px");

// Avance de 15 frames de disparition (total 60 frames)
for (let f = 0; f < 15; f++) indicator.update();
assert(indicator.visible === false, "À 60 frames (1 seconde), l'indicateur disparaît");

// 2. engage -> search : Point d'interrogation rouge (ligne 1)
enemyEvent.setAiState("search");
indicator.update();
assert(indicator.visible === true && indicator._currentRow === 1, "Transition engage -> search active le point d'interrogation rouge (ligne 1)");

// 3. search -> neutral : Point d'interrogation jaune (ligne 2)
while (indicator._active) indicator.update(); // termine le rouge
enemyEvent.setAiState("neutral");
indicator.update();
assert(indicator.visible === true && indicator._currentRow === 2, "Transition search -> neutral active le point d'interrogation jaune (ligne 2)");

// 4. File d'attente (Waitlist)
while (indicator._active) indicator.update();
enemyEvent.requestIndicator("exclamation");
enemyEvent.requestIndicator("question_red");
indicator.update();
assert(indicator._currentRow === 0, "Le premier indicateur en file démarre (exclamation)");
assert(indicator._queue.length === 1 && indicator._queue[0] === 1, "Le second indicateur attend dans la file d'attente (ligne 1)");

// ============================================================================
// TEST 4 : SPRITESET_FIGHTGAUGES (HP, MP, AT)
// ============================================================================
console.log("\n--- TEST 4 : SPRITESET_FIGHTGAUGES (HP, MP, AT) ---");

assert(enemySprite._fightGauges instanceof Spriteset_FightGauges, "Sprite_Hero contient un enfant Spriteset_FightGauges");
const gauges = enemySprite._fightGauges;

// Inactif en neutre
enemyEvent.setAiState("neutral");
gauges.update();
assert(gauges.visible === false, "Les jauges sont invisibles lorsque l'ennemi est en mode 'neutral'");

// Visible en engage
enemyEvent.setAiState("engage");
gauges.update();
assert(gauges.visible === true, "Les jauges deviennent visibles lorsque l'ennemi est en mode 'engage'");

// Vérification de la jauge AT
enemyEvent.ai()._attackFrequency = 100;
enemyEvent.ai()._attackTimer = 50;
gauges.update();
assert(gauges._atSprite._lastRate === 0.5, "La jauge AT affiche un ratio de 50% (50/100)");

// Vérification de la jauge HP (Dégradé par %)
const battler = enemyEvent.battler();
battler.setHp(Math.round(battler.mhp * 0.9)); // 90% (>80%)
gauges.update();
assert(Math.abs(gauges._hpSprite._lastRate - 0.9) < 0.01, "Jauge HP à 90% (vert -> vert)");
let colors = gauges._hpSprite.getGradientColors(0.9);
assert(colors[0] === "#2ecc71" && colors[1] === "#27ae60", "Couleurs de dégradé correctes pour >80% (vert -> vert)");

battler.setHp(Math.round(battler.mhp * 0.7)); // 70% (60-80%)
colors = gauges._hpSprite.getGradientColors(0.7);
assert(colors[0] === "#2ecc71" && colors[1] === "#e67e22", "Couleurs de dégradé correctes pour 60-80% (vert -> orange)");

battler.setHp(Math.round(battler.mhp * 0.5)); // 50% (40-60%)
colors = gauges._hpSprite.getGradientColors(0.5);
assert(colors[0] === "#d35400" && colors[1] === "#f39c12", "Couleurs de dégradé correctes pour 40-60% (orange -> orange)");

battler.setHp(Math.round(battler.mhp * 0.3)); // 30% (20-40%)
colors = gauges._hpSprite.getGradientColors(0.3);
assert(colors[0] === "#e67e22" && colors[1] === "#e74c3c", "Couleurs de dégradé correctes pour 20-40% (orange -> rouge)");

battler.setHp(Math.round(battler.mhp * 0.15)); // 15% (<20%)
colors = gauges._hpSprite.getGradientColors(0.15);
assert(colors[0] === "#962d22" && colors[1] === "#c0392b", "Couleurs de dégradé correctes pour <20% (rouge -> rouge)");

// Clignotement à moins de 10% de PV
battler.setHp(Math.round(battler.mhp * 0.05)); // 5% (<10%)
gauges.update();
assert(gauges._hpSprite._blinkTimer > 0, "Le compteur de clignotement s'active pour HP < 10%");

// Invisibilité si KO
battler.addNewState(1); // KO
gauges.update();
// ============================================================================
// TEST 5 : SAUT DE SURPRISE, EFFETS SONORES (SE) & BGM COMBAT (FONDU 3S)
// ============================================================================
console.log("\n--- TEST 5 : SAUT DE SURPRISE, EFFETS SONORES & BGM COMBAT ---");

// Mock AudioManager
let lastSe = null;
let lastBgm = null;
let lastFadeOut = null;
let lastFadeIn = null;
let replayedBgm = null;

global.AudioManager = {
    _currentBgm: { name: "Theme4", volume: 90, pitch: 100, pan: 0 },
    playSe(se) { lastSe = se; },
    playBgm(bgm) { lastBgm = bgm; this._currentBgm = bgm; },
    saveBgm() { return this._currentBgm ? { ...this._currentBgm, pos: 12.5 } : null; },
    replayBgm(bgm) { replayedBgm = bgm; this._currentBgm = bgm; },
    fadeOutBgm(d) { lastFadeOut = d; },
    fadeInBgm(d) { lastFadeIn = d; }
};

// Réinitialisation de l'état BGM et réanimation du battler
IAManager.resetBgmState();
battler._states = [];
battler.setHp(battler.mhp);

// Positionner joueur à (5, 5) et ennemi à (7, 5) -> dx = +2
$gamePlayer.locate(5, 5);
enemyEvent.locate(7, 5);

let jumped = false;
enemyEvent.jump = (x, y) => {
    if (x === 0 && y === 0) jumped = true;
};

// 1. NEUTRAL -> ENGAGE
enemyEvent.setAiState("neutral");
jumped = false;
lastSe = null;
lastBgm = null;

enemyEvent.setAiState("engage");

assert(jumped === true, "L'ennemi effectue un bond sur place (jump(0,0)) lors du repérage");
assert(lastSe !== null && lastSe.name === "Buzzer2", "SE Buzzer2 joué lors de neutral -> engage");
assert(lastSe.volume === 90 && lastSe.pitch === 130, "SE Buzzer2 volume 90 et pitch 130");
assert(lastSe.pan === 0, "SE Buzzer2 pan constant centré à 0 (non dynamique)");
assert(IAManager._isBattleBgm === true, "IAManager active le mode BGM combat");
assert(lastBgm !== null && lastBgm.name === $dataSystem.battleBgm.name, "La musique de combat (Battle1) est lancée");

// 2. ENGAGE -> SEARCH (le dernier ennemi engagé perd la cible)
lastSe = null;
lastFadeOut = null;

enemyEvent.setAiState("search");

assert(lastSe !== null && lastSe.name === "Cancel2", "SE Cancel2 joué lors de engage -> search");
assert(lastSe.volume === 90 && lastSe.pitch === 80 && lastSe.pan === 0, "SE Cancel2 volume 90, pitch 80, pan 0");
assert(IAManager._isBattleBgm === false, "IAManager quitte le mode BGM combat");
assert(lastFadeOut === 3, "Fondu de sortie (fadeOutBgm) de 3s déclenché sur la musique de combat");
assert(IAManager._bgmFadeOutTimer === 180, "Timer de fondu initialisé à 180 frames (3s à 60 FPS)");

// 3. Déroulement des 3 secondes de fondu
for (let frame = 0; frame < 179; frame++) {
    IAManager.updateBgm();
}
assert(replayedBgm === null, "Pendant les 180 frames de fondu, la musique de map attend");

// 180ème frame : fin du fondu et reprise de la musique de map
lastFadeIn = null;
IAManager.updateBgm();
assert(replayedBgm !== null && replayedBgm.name === "Theme4", "À la fin des 3s, la musique de map est relancée");
assert(lastFadeIn === 3, "Fondu d'entrée (fadeInBgm) de 3s appliqué sur la musique de map");

// 4. SEARCH -> NEUTRAL
lastSe = null;
enemyEvent.setAiState("neutral");
assert(lastSe !== null && lastSe.name === "Blind", "SE Blind joué lors de search -> neutral");
assert(lastSe.volume === 90 && lastSe.pitch === 100 && lastSe.pan === 0, "SE Blind volume 90, pitch 100, pan 0");

// 5. Annulation du fondu si ré-engagement pendant les 3s
enemyEvent.setAiState("engage");
enemyEvent.setAiState("search");
assert(IAManager._bgmFadeOutTimer === 180, "Nouveau fondu de sortie démarré (180 frames)");
for (let f = 0; f < 60; f++) IAManager.updateBgm(); // 1 seconde écoulée
assert(IAManager._bgmFadeOutTimer === 120, "60 frames de fondu écoulées (reste 120)");

// Ré-engagement soudain de l'ennemi
lastBgm = null;
enemyEvent.setAiState("engage");
assert(IAManager._bgmFadeOutTimer === 0, "Le fondu vers la map est annulé lors d'un ré-engagement");
assert(IAManager._isBattleBgm === true, "Le mode combat BGM est réactivé immédiatement");
assert(lastBgm !== null && lastBgm.name === $dataSystem.battleBgm.name, "La musique de combat reprend sans attendre");

// ============================================================================
// TEST 6 : PRÉSERVATION DE LA DIRECTION DE L'ENNEMI LORS DE LA MORT (SWITCH C)
// ============================================================================
console.log("\n--- TEST 6 : PRÉSERVATION DE LA DIRECTION DE L'ENNEMI (SWITCH C) ---");

const deadPages = [
    {
        conditions: { selfSwitchValid: false },
        image: { characterName: "Actor1", characterIndex: 0, direction: 2, pattern: 1 },
        directionFix: false
    },
    {
        conditions: { selfSwitchValid: true, selfSwitchCh: "C" },
        image: { characterName: "composite/died/$3", characterIndex: 0, direction: 6, pattern: 0 },
        directionFix: true
    }
];
$dataMap.events[99] = {
    id: 99,
    x: 10,
    y: 10,
    pages: deadPages
};
const deadTestEvent = new Game_Event(1, 99);
assert(deadTestEvent.findProperPageIndex() === 0, "L'ennemi démarre sur la page 1");

// L'ennemi fait face au Nord (direction 8) avant sa mort
deadTestEvent.setDirection(8);
assert(deadTestEvent.direction() === 8, "L'ennemi fait face au Nord (8) avant de mourir");

// Configuration attaquant et battler mort
if ($gameParty.members().length === 0) $gameParty.addActor(1);
const enemyBattler99 = new Game_Enemy(1, 0, 0);
enemyBattler99.setHp(0);
deadTestEvent._enemyBattler = enemyBattler99;
deadTestEvent.battler = () => enemyBattler99;

// Attaquant positionné au Sud (10, 11) -> l'ennemi va faire face au Sud (2)
$gamePlayer.locate(10, 11);
$fightManager = new FightManager();
const atkResult = $fightManager.executeAttack($gamePlayer, deadTestEvent);
assert(atkResult === true, "L'attaque fatale est exécutée avec succès");

// Avance l'action down
while (deadTestEvent.isActing()) {
    deadTestEvent.updateAction();
}

assert($gameSelfSwitches.value([1, 99, "C"]) === true, "L'interrupteur C est activé pour l'ennemi mort");

// Refresh sur la page 2 (Switch C)
deadTestEvent.refresh();
assert(deadTestEvent._pageIndex === 1, "L'événement est maintenant sur la page 2 (Switch C)");
assert(deadTestEvent.direction() === 2, "La direction du sprite (2) est préservée au lieu de la direction 6 définie dans l'éditeur");
assert(deadTestEvent.isDirectionFixed() === true, "Le directionFix de la page C est bien respecté");

// ============================================================================
// RÉSUMÉ FINAL
// ============================================================================
console.log("\n========================================================");
console.log(`RÉSULTATS DES TESTS : ${passed} RÉUSSIS, ${failed} ÉCHOUÉS`);
console.log("========================================================");

if (failed > 0) process.exit(1);
