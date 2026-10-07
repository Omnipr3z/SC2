//=============================================================================
// test_step11_5_and_step12.js
// Tests unitaires pour Étape 11.5 (Audio & Fixes) et Étape 12 (Contrôles avancés & GUI)
//=============================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '..');

// Environnement Mock global
global.window = global;
global.Graphics = {
    boxWidth: 816,
    boxHeight: 624,
    pageToCanvasX: x => x,
    pageToCanvasY: y => y
};

global.ImageManager = {
    faceWidth: 144,
    faceHeight: 144,
    loadFace: name => ({
        isReady: () => true,
        _image: {},
        _canvas: {}
    })
};

global.Bitmap = class Bitmap {
    constructor(w, h) {
        this.width = w;
        this.height = h;
        this.context = {
            fillStyle: "",
            strokeStyle: "",
            lineWidth: 1,
            font: "",
            textAlign: "",
            textBaseline: "",
            shadowColor: "",
            shadowBlur: 0,
            beginPath: () => {},
            fill: () => {},
            stroke: () => {},
            rect: () => {},
            roundRect: () => {},
            fillRect: () => {},
            strokeRect: () => {},
            drawImage: () => {},
            fillText: () => {},
            measureText: text => ({ width: text.length * 6 }),
            createLinearGradient: () => ({
                addColorStop: () => {}
            })
        };
    }
    clear() {}
};

global.Sprite = class Sprite {
    constructor() {
        this.children = [];
        this.visible = true;
        this.x = 0;
        this.y = 0;
        this.bitmap = null;
        this.opacity = 255;
    }
    addChild(child) { this.children.push(child); }
    removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx >= 0) this.children.splice(idx, 1);
    }
    update() {
        for (const c of this.children) {
            if (c.update) c.update();
        }
    }
};

global.Sprite_Character = class Sprite_Character extends Sprite {
    initMembers() {
        this._character = null;
    }
    setCharacter(c) { this._character = c; }
};

global.Spriteset_Map = class Spriteset_Map {
    createCharacters() {}
};

global.TouchInput = {
    isPressed: () => false,
    isTriggered: () => false
};

global.Input = {
    keyMapper: {
        9: "tab",
        13: "ok",
        16: "shift",
        17: "control",
        18: "control",
        27: "escape",
        32: "ok",
        33: "pageup",
        34: "pagedown",
        37: "left",
        38: "up",
        39: "right",
        40: "down",
        45: "escape",
        81: "pageup",
        87: "pagedown",
        88: "escape",
        90: "ok",
        96: "escape",
        98: "down",
        100: "left",
        102: "right",
        104: "up",
        120: "debug"
    },
    _currentState: {},
    isTriggered(key) { return Boolean(this._currentState[key]); },
    setTriggered(key, val) { this._currentState[key] = Boolean(val); }
};

global.ConfigManager = {
    makeData() { return {}; },
    applyData(c) {}
};

global.Window_Base = class Window_Base {};
global.Window_Command = class Window_Command extends Window_Base {
    constructor() {
        super();
        this._list = [];
        this._index = 0;
    }
    addCommand(name, symbol, enabled = true, ext = null) {
        this._list.push({ name, symbol, enabled, ext });
    }
    commandSymbol(index) {
        return this._list[index] ? this._list[index].symbol : null;
    }
    index() { return this._index; }
    select(i) { this._index = i; }
};

global.Window_Options = class Window_Options extends Window_Command {
    addGeneralOptions() {}
    getConfigValue(symbol) {
        return ConfigManager[symbol];
    }
    setConfigValue(symbol, value) {
        ConfigManager[symbol] = value;
    }
    changeValue(symbol, value) {
        this.setConfigValue(symbol, value);
    }
    statusText(index) { return ""; }
    processOk() {}
    cursorRight() {}
    cursorLeft() {}
};

global.Scene_Base = class Scene_Base {
    constructor() { this.children = []; }
    addChild(c) { this.children.push(c); }
    isActive() { return true; }
};
global.Scene_Map = class Scene_Map extends Scene_Base {
    update() {}
    createDisplayObjects() {}
};

global.SceneManager = {
    isSceneChanging: () => false,
    _stack: [],
    push(scene) { this._stack.push(scene); }
};

global.SoundManager = {
    playOk() {}
};

let playedSe = [];
let playedBgm = null;
global.AudioManager = {
    playSe(se) { playedSe.push(se); },
    playBgm(bgm) { playedBgm = bgm; },
    fadeOutBgm(d) {},
    saveBgm() { return playedBgm; },
    replayBgm(bgm) { playedBgm = bgm; },
    fadeInBgm(d) {}
};

global.$dataSystem = {
    battleBgm: { name: "Battle1", volume: 90, pitch: 100, pan: 0 }
};
global.$gameSystem = {
    battleBgm: () => global.$dataSystem.battleBgm,
    _eventDeathDirections: {}
};
global.$dataMap = {
    bgm: { name: "Theme1", volume: 90, pitch: 100, pan: 0 },
    events: []
};

// Chargement des plugins SC4 nécessaires
function loadPlugin(relPath) {
    const file = path.join(ROOT_DIR, relPath);
    const code = fs.readFileSync(file, 'utf8');
    vm.runInThisContext(code, { filename: file });
}

loadPlugin('js/plugins/SC4_rmmz_core_Patches.js');
loadPlugin('js/plugins/SC4_rmmz_sprites_Patches.js');
loadPlugin('js/plugins/SC4_rmmz_scenes_Patches.js');
loadPlugin('js/plugins/IAManager.js');
loadPlugin('js/plugins/FightManager.js');

let passed = 0;
let failed = 0;
function assert(desc, cond) {
    if (cond) {
        console.log(`[PASS] ${desc}`);
        passed++;
    } else {
        console.error(`[FAIL] ${desc}`);
        failed++;
    }
}

console.log("=== TESTS POUR ETAPE 11.5 & ETAPE 12 ===\n");

// ============================================================================
// PARTIE 1 : ETAPE 11.5 (Audio, Notetags, XP de mort, Fondu de course)
// ============================================================================
console.log("--- TEST 1 : NOTETAGS SE DES INDICATORS & MULTI-LIGNES 108/408 ---");

// Test du parsing de notetags dans une page contenant plusieurs blocs 108 et 408 (> 6 lignes)
const dummyEvent = {
    _enemyId: 1,
    note: "<se_engage:Monster1_A, 100, 150>",
    page: () => ({
        list: [
            { code: 108, parameters: ["<se_search:Monster1_A, 90, 100>"] },
            { code: 408, parameters: ["<se_forget:Monster1_B, 90, 100>"] },
            { code: 408, parameters: ["<dummy_comment>"] },
            { code: 108, parameters: ["<se_hurted:Monster1_C, 100, 150>"] },
            { code: 408, parameters: ["<se_death:Monster1_C, 90, 100>"] }
        ]
    }),
    enemyId: () => 1
};

global.$dataEnemies = [null, { note: "" }];
const ai = new IAManager(dummyEvent, { mode: "patrol" });

assert("SE engage parsé correctement", ai._customSe.engage && ai._customSe.engage.name === "Monster1_A" && ai._customSe.engage.volume === 100 && ai._customSe.engage.pitch === 150);
assert("SE search parsé depuis code 108", ai._customSe.search && ai._customSe.search.name === "Monster1_A" && ai._customSe.search.volume === 90 && ai._customSe.search.pitch === 100);
assert("SE forget parsé depuis code 408", ai._customSe.forget && ai._customSe.forget.name === "Monster1_B" && ai._customSe.forget.volume === 90);
assert("SE hurted parsé depuis second bloc 108", ai._customSe.hurted && ai._customSe.hurted.name === "Monster1_C" && ai._customSe.hurted.volume === 100 && ai._customSe.hurted.pitch === 150);
assert("SE death parsé depuis second bloc 408", ai._customSe.death && ai._customSe.death.name === "Monster1_C" && ai._customSe.death.volume === 90 && ai._customSe.death.pitch === 100);

// Test lecture sonore avec pan constant 0
playedSe = [];
ai.playCustomSe("engage");
assert("SE joué utilise pan constant 0", playedSe.length === 1 && playedSe[0].pan === 0 && playedSe[0].name === "Monster1_A");

console.log("\n--- TEST 2 : EXP GAIN LORS DE LA MORT DE L'ENNEMI ---");

let gainedExp = 0;
const testActor = {
    isActor: () => true,
    actorId: () => 1,
    gainExp: exp => { gainedExp += exp; }
};
global.$gameParty = {
    members: () => [testActor],
    leader: () => testActor
};

const deadBattler = {
    isDead: () => true,
    isAlive: () => false,
    exp: () => 450,
    result: () => ({ hpDamage: 100, critical: false })
};

const deadCharEvent = {
    _ai: ai,
    battler: () => deadBattler,
    direction: () => 2,
    setDirectionFix: () => {},
    playAction: () => {}
};

const attacker = {
    isActor: () => true,
    actorId: () => 1,
    direction: () => 8
};

const fm = new FightManager();
// Création d'une action factice
global.Game_Action = class {
    setSkill() {}
    apply() {}
};

playedSe = [];
fm.executeAttack(attacker, deadCharEvent);

assert("L'EXP de l'ennemi (450) a été attribuée au groupe", gainedExp === 450);
assert("Le SE de mort personnalisé a été joué lors de la mort", playedSe.some(s => s.name === "Monster1_C" && s.pitch === 100));

// ============================================================================
// PARTIE 2 : ETAPE 12 (Clavier AZERTY / QWERTY, Contrôles & GUI)
// ============================================================================
console.log("\n--- TEST 3 : GESTION DES DISPOSITIONS DU CLAVIER (AZERTY & QWERTY) ---");

// 1. Disposition par défaut : AZERTY
ConfigManager.applyData({ keyboardLayout: "azerty" });
assert("Disposition par défaut est azerty", ConfigManager.keyboardLayout === "azerty");
assert("AZERTY: Z (90) mappe sur 'up'", Input.keyMapper[90] === "up");
assert("AZERTY: Z n'est plus 'ok'", Input.keyMapper[90] !== "ok");
assert("AZERTY: Q (81) mappe sur 'left'", Input.keyMapper[81] === "left");
assert("AZERTY: S (83) mappe sur 'down'", Input.keyMapper[83] === "down");
assert("AZERTY: D (68) mappe sur 'right'", Input.keyMapper[68] === "right");
assert("AZERTY: A (65) mappe sur 'special'", Input.keyMapper[65] === "special");
assert("AZERTY: E (69) mappe sur 'ok'", Input.keyMapper[69] === "ok");
assert("AZERTY: I (73) mappe sur 'inventory'", Input.keyMapper[73] === "inventory");
assert("AZERTY: R (82) mappe sur 'reload'", Input.keyMapper[82] === "reload");
assert("AZERTY: Esc (27) mappe sur 'escape'", Input.keyMapper[27] === "escape");
assert("AZERTY: Num0 (96) mappe sur 'escape'", Input.keyMapper[96] === "escape");

// 2. Bascule vers QWERTY
ConfigManager.applyData({ keyboardLayout: "qwerty" });
assert("Disposition basculée sur qwerty", ConfigManager.keyboardLayout === "qwerty");
assert("QWERTY: W (87) mappe sur 'up'", Input.keyMapper[87] === "up");
assert("QWERTY: A (65) mappe sur 'left'", Input.keyMapper[65] === "left");
assert("QWERTY: S (83) mappe sur 'down'", Input.keyMapper[83] === "down");
assert("QWERTY: D (68) mappe sur 'right'", Input.keyMapper[68] === "right");
assert("QWERTY: Q (81) mappe sur 'special'", Input.keyMapper[81] === "special");
assert("QWERTY: Z (90) est supprimé", Input.keyMapper[90] === undefined);
assert("QWERTY: E (69) mappe sur 'ok'", Input.keyMapper[69] === "ok");
assert("QWERTY: I (73) mappe sur 'inventory'", Input.keyMapper[73] === "inventory");

console.log("\n--- TEST 4 : MENU DES OPTIONS (WINDOW_OPTIONS) ---");

const winOptions = new Window_Options();
winOptions.addGeneralOptions();

const cmdIdx = winOptions._list.findIndex(c => c.symbol === "keyboardLayout");
assert("L'option 'Clavier' est présente dans Window_Options", cmdIdx >= 0);

winOptions.select(cmdIdx);
assert("Statut initial en QWERTY affiche 'QWERTY'", winOptions.statusText(cmdIdx) === "QWERTY");

// Bascule via touche OK / validation
winOptions.processOk();
assert("Après processOk(), ConfigManager est 'azerty'", ConfigManager.keyboardLayout === "azerty");
assert("Après processOk(), statusText affiche 'AZERTY'", winOptions.statusText(cmdIdx) === "AZERTY");
assert("Input.keyMapper a basculé sur ZQSD", Input.keyMapper[90] === "up");

// Curseur Droite -> QWERTY
winOptions.cursorRight();
assert("cursorRight() active 'qwerty'", ConfigManager.keyboardLayout === "qwerty");
assert("Input.keyMapper a basculé sur WASD", Input.keyMapper[87] === "up");

// Curseur Gauche -> AZERTY
winOptions.cursorLeft();
assert("cursorLeft() active 'azerty'", ConfigManager.keyboardLayout === "azerty");
assert("Input.keyMapper a basculé sur ZQSD", Input.keyMapper[90] === "up");

console.log("\n--- TEST 5 : OUVERTURE INVENTAIRE DANS SCENE_MAP VIA TOUCHE 'I' ---");

global.$gameMap = { isEventRunning: () => false };
let openedInventoryId = null;
global.$inventories = {
    open: id => { openedInventoryId = id; }
};

const sceneMap = new Scene_Map();
Input.setTriggered("inventory", true);
sceneMap.update();

assert("Appui sur la touche 'I' ouvre l'inventaire pour le leader (A_1)", openedInventoryId === "A_1");

console.log("\n--- TEST 6 : PLAYER HUD GUI (SPRITE_PLAYERHUD) ---");

const hudActor = {
    name: () => "Héros Test",
    faceName: () => "Actor1",
    faceIndex: () => 0,
    hp: 450,
    mhp: 500,
    mp: 80,
    mmp: 100,
    tp: 65,
    maxTp: () => 100,
    level: 12,
    currentExp: () => 3500,
    currentLevelExp: () => 3000,
    nextLevelExp: () => 4000,
    isMaxLevel: () => false
};
global.$gameParty.leader = () => hudActor;

const hud = new Sprite_PlayerHUD();
assert("Sprite_PlayerHUD instancié avec succès", hud !== null);
assert("HUD positionné en haut à gauche (x=20, y=20)", hud.x === 20 && hud.y === 20);

// Mise à jour et premier rendu
hud.update();
assert("HUD est visible quand le leader est présent", hud.visible === true);
assert("Dernières valeurs enregistrées pour dirty-check", hud._lastValues.hp === 450 && hud._lastValues.level === 12);

// Vérification de la méthode drawHud
let filledTexts = [];
hud.bitmap.context.fillText = (text, x, y) => {
    filledTexts.push(text);
};
hud.drawHud(hudActor, ImageManager.loadFace("Actor1"));

assert("Nom du héros rendu sur le badge", filledTexts.includes("Héros Test"));
assert("Valeurs HP rendues", filledTexts.includes("450/500"));
assert("Valeurs MP rendues", filledTexts.includes("80/100"));
assert("Valeurs TP rendues", filledTexts.includes("65"));
assert("Niveau rendu", filledTexts.includes("Nv. 12"));
assert("Pourcentage XP rendu (50%)", filledTexts.includes("50%"));

// Intégration dans Scene_Map
sceneMap.createPlayerHud();
assert("Scene_Map possède l'instance _playerHud", sceneMap._playerHud instanceof Sprite_PlayerHUD);

console.log("\n========================================================");
console.log(`RÉSULTATS DES TESTS : ${passed} RÉUSSIS, ${failed} ÉCHOUÉS`);
console.log("========================================================");

if (failed > 0) process.exit(1);
