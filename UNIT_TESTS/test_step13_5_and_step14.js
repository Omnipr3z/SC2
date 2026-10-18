//=============================================================================
// test_step13_5_and_step14.js
// Tests unitaires pour l'Étape 13.5 (Guard & Dash) et l'Étape 14 (Écran Titre)
//=============================================================================

const fs = require('fs');
const path = require('path');

// Configuration de l'environnement global simulé
global.window = global;

global.Graphics = { width: 1280, height: 720, boxWidth: 1280, boxHeight: 720 };
global.Rectangle = class Rectangle {
    constructor(x, y, width, height) {
        this.x = x || 0;
        this.y = y || 0;
        this.width = width || 0;
        this.height = height || 0;
    }
};

global.Bitmap = class Bitmap {
    constructor(w, h) {
        this.width = w || 1280;
        this.height = h || 720;
        this._ready = true;
        this.fontSize = 16;
        this.textColor = "#ffffff";
    }
    isReady() { return this._ready; }
    drawText(t, x, y, w, h, align) {}
    clear() {}
};

global.Sprite = class Sprite {
    constructor(bitmap) {
        this.bitmap = bitmap || new global.Bitmap();
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.opacity = 255;
        this.visible = true;
        this.rotation = 0;
        this.scale = {
            x: 1,
            y: 1,
            set: function(x, y) { this.x = x; this.y = y; }
        };
        this.anchor = {
            x: 0,
            y: 0,
            set: function(x, y) { this.x = x; this.y = y; }
        };
    }
    move(x, y, w, h) {
        this.x = x;
        this.y = y;
    }
};

global.TilingSprite = class TilingSprite extends global.Sprite {
    constructor(bitmap) {
        super(bitmap);
        this.origin = { x: 0, y: 0 };
    }
};

global.Stage = function Stage() {
    this.children = [];
};
global.Stage.prototype.addChild = function(child) {
    this.children.push(child);
    return child;
};
global.Stage.prototype.updateChildren = function() {};

global.Scene_Base = function Scene_Base() {
    this.initialize();
};
global.Scene_Base.prototype = Object.create(global.Stage.prototype);
global.Scene_Base.prototype.constructor = global.Scene_Base;
global.Scene_Base.prototype.initialize = function() {
    global.Stage.call(this);
};
global.Scene_Base.prototype.create = function() {};
global.Scene_Base.prototype.start = function() {};
global.Scene_Base.prototype.update = function() {};
global.Scene_Base.prototype.isBusy = function() { return false; };
global.Scene_Base.prototype.popScene = function() {};
global.Scene_Base.prototype.addWindow = function(window) { this.addChild(window); };

global.Scene_MenuBase = function Scene_MenuBase() {
    this.initialize();
};
global.Scene_MenuBase.prototype = Object.create(global.Scene_Base.prototype);
global.Scene_MenuBase.prototype.constructor = global.Scene_MenuBase;

global.Window_Base = class Window_Base {
    constructor(rect) {
        this.rect = rect || new global.Rectangle(0, 0, 100, 100);
        this.contents = new global.Bitmap(this.rect.width, this.rect.height);
        this.contentsWidth = () => this.rect.width - 36;
        this.opacity = 255;
    }
    drawText() {}
    changeTextColor() {}
    resetTextColor() {}
};

global.Window_Command = function Window_Command(rect) {
    this.initialize(rect);
};
global.Window_Command.prototype = Object.create(global.Window_Base.prototype);
global.Window_Command.prototype.constructor = global.Window_Command;
global.Window_Command.prototype.initialize = function(rect) {
    this.rect = rect || new global.Rectangle(0, 0, 100, 100);
    this.contents = new global.Bitmap(this.rect.width, this.rect.height);
    this.contentsWidth = () => this.rect.width - 36;
    this.opacity = 255;
    this._handlers = {};
    this._commands = [];
    this._index = 0;
    this._openness = 255;
    this._active = true;
    this.makeCommandList();
};
global.Window_Command.prototype.makeCommandList = function() {};
global.Window_Command.prototype.addCommand = function(name, symbol, enabled = true) {
    this._commands.push({ name, symbol, enabled });
};
global.Window_Command.prototype.commandList = function() { return this._commands; };
global.Window_Command.prototype.commandSymbol = function(index) { return this._commands[index] ? this._commands[index].symbol : null; };
global.Window_Command.prototype.currentSymbol = function() { return this.commandSymbol(this._index); };
global.Window_Command.prototype.setHandler = function(symbol, handler) { this._handlers[symbol] = handler; };
global.Window_Command.prototype.callHandler = function(symbol) { if (this._handlers[symbol]) this._handlers[symbol](); };
global.Window_Command.prototype.setBackgroundType = function(type) { this._backgroundType = type; };
global.Window_Command.prototype.open = function() { this._openness = 255; };
global.Window_Command.prototype.close = function() { this._openness = 0; };
global.Window_Command.prototype.isOpen = function() { return this._openness === 255; };
global.Window_Command.prototype.isOpening = function() { return false; };
global.Window_Command.prototype.activate = function() { this._active = true; };
global.Window_Command.prototype.deactivate = function() { this._active = false; };

global.Window_TitleCommand = function Window_TitleCommand(rect) {
    this.initialize(rect);
};
global.Window_TitleCommand.prototype = Object.create(global.Window_Command.prototype);
global.Window_TitleCommand.prototype.constructor = global.Window_TitleCommand;
global.Window_TitleCommand.prototype.initialize = function(rect) {
    global.Window_Command.prototype.initialize.call(this, rect);
};
global.Window_TitleCommand.prototype.isContinueEnabled = function() { return true; };

global.TextManager = {
    newGame: "Débuter",
    continue_: "Continuer",
    options: "Options"
};

global.$dataSystem = {
    titleCommandWindow: { offsetX: 0, offsetY: 0 }
};

global.ColorManager = {
    systemColor: () => "#ffd700"
};

global.SoundManager = {
    playCancel: () => {},
    playOk: () => {}
};

global.AudioManager = {
    _currentBgm: null,
    playBgm: function(bgm) { this._currentBgm = bgm; },
    stopBgs: function() {},
    stopMe: function() {}
};

global.SceneManager = {
    _stack: [],
    _currentScene: null,
    goto: function(sceneClass) { this._currentScene = new sceneClass(); },
    push: function(sceneClass) { this._stack.push(sceneClass); },
    pop: function() { return this._stack.pop(); },
    exit: function() { this._exited = true; }
};

global.DataManager = {
    setupNewGame: function() { this._newGameSetup = true; }
};

global.ImageManager = {
    loadTitle1: (name) => new global.Bitmap(),
    loadTitle2: (name) => new global.Bitmap(),
    loadBitmap: (folder, name) => new global.Bitmap()
};

global.Input = {
    _keys: {},
    isTriggered: function(key) { return Boolean(this._keys[key]); }
};

global.TouchInput = {
    _rightPressed: false,
    _leftTriggered: false,
    _cancelled: false,
    isRightPressed: function() { return this._rightPressed; },
    isTriggered: function() { return this._leftTriggered; },
    isCancelled: function() { return this._cancelled; }
};

global.Scene_Title = function Scene_Title() {
    this.initialize();
};
global.Scene_Title.prototype = Object.create(global.Scene_Base.prototype);
global.Scene_Title.prototype.constructor = global.Scene_Title;
global.Scene_Title.prototype.initialize = function() {
    global.Scene_Base.prototype.initialize.call(this);
};
global.Scene_Title.prototype.create = function() {
    this.createBackground();
    this.createForeground();
    this.createCommandWindow();
};
global.Scene_Title.prototype.createBackground = function() {};
global.Scene_Title.prototype.createForeground = function() {};
global.Scene_Title.prototype.createCommandWindow = function() {
    this._commandWindow = new global.Window_TitleCommand(this.commandWindowRect());
};
global.Scene_Title.prototype.commandWindowRect = function() {
    return new global.Rectangle(0, 0, 280, 300);
};
global.Scene_Title.prototype.commandNewGame = function() {};
global.Scene_Title.prototype.commandContinue = function() {};
global.Scene_Title.prototype.commandOptions = function() {};
global.Scene_Title.prototype.playTitleMusic = function() {};

// Simulation des classes RPG Maker MZ de base
global.Game_Actor = class Game_Actor {
    constructor(actorId) { this._actorId = actorId; }
    actorId() { return this._actorId; }
    actor() { return { note: "" }; }
};
global.Game_Actors = class Game_Actors {
    constructor() { this._data = []; }
    actor(id) {
        if (!this._data[id]) this._data[id] = new global.Game_Actor(id);
        return this._data[id];
    }
};
global.$gameActors = new global.Game_Actors();

global.Game_CharacterBase = class Game_CharacterBase {
    constructor() {
        this._x = 5; this._y = 5; this._realX = 5; this._realY = 5;
        this.x = 5; this.y = 5;
        this._direction = 2;
        this._action = "walk";
        this._isActing = false;
        this._dashing = false;
        this._moving = false;
    }
    direction() { return this._direction; }
    setDirection(d) { this._direction = d; }
    isActing() { return this._isActing; }
    isDashing() { return this._dashing; }
    isMoving() { return this._moving; }
    action() {
        if (this.isActing()) return this._action || "walk";
        if (this.isDashing() && this.isMoving()) return "run";
        return this._action || "walk";
    }
    screenX() { return 200; }
    screenY() { return 200; }
};

global.Game_Character = class Game_Character extends global.Game_CharacterBase {
    characterName() { return ''; }
};

global.Game_Follower = class Game_Follower extends global.Game_Character {
    actor() { return null; }
    isVisible() { return false; }
};

global.Game_Followers = class Game_Followers {
    constructor() { this._data = []; }
    data() { return this._data; }
    forEach() {}
};

global.Game_Player = class Game_Player extends global.Game_Character {
    constructor() {
        super();
        this._dashButtonPressed = false;
        this._followers = new global.Game_Followers();
    }
    followers() { return this._followers; }
    isDashing() {
        return this._dashButtonPressed;
    }
};

global.Game_Event = class Game_Event extends global.Game_Character {
    constructor(mapId, eventId) {
        super();
        this._eventId = eventId;
    }
    eventId() { return this._eventId; }
    list() { return []; }
};

global.Game_Party = class Game_Party {
    constructor() { this._actors = []; }
    members() { return []; }
    addActor(id) { this._actors.push(id); }
    leader() { return null; }
};
global.$gameParty = new global.Game_Party();

global.Game_Map = class Game_Map {
    constructor() { this._events = []; }
    events() { return []; }
    vehicles() { return []; }
    eventsXy() { return []; }
    roundXWithDirection(x, d) { return x; }
    roundYWithDirection(y, d) { return y; }
    deltaX(x1, x2) { return x1 - x2; }
    deltaY(y1, y2) { return y1 - y2; }
    isAnyEventStarting() { return false; }
    setupStartingEvent() { return false; }
};
global.$gameMap = new global.Game_Map();

global.Game_Temp = class Game_Temp {
    constructor() { this._destinationX = null; this._destinationY = null; }
    isDestinationValid() { return this._destinationX !== null; }
    clearDestination() { this._destinationX = null; this._destinationY = null; }
};
global.$gameTemp = new global.Game_Temp();

global.Game_Interpreter = class Game_Interpreter {
    constructor() { this._waitMode = ""; }
    setWaitMode(mode) { this._waitMode = mode; }
    character() { return null; }
};

const ROOT_DIR = path.resolve(__dirname, '..');

global.Sprite_Character = class Sprite_Character extends global.Sprite {
    constructor(character) {
        super();
        this._character = character;
    }
    characterPatternX() { return this._character ? this._character.pattern() : 0; }
    characterPatternY() { return 0; }
    isImageChanged() { return false; }
    setCharacterBitmap() {}
    isEmptyCharacter() { return false; }
};

// Chargement des plugins à tester
const objectsCode = fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_rmmz_objects_Patches.js'), 'utf8');
eval(objectsCode);

const heroSpriteCode = fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Sprite_Hero.js'), 'utf8');
eval(heroSpriteCode);

const titleScreenCode = fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_TitleScreen.js'), 'utf8');
eval(titleScreenCode);

console.log("==============================================================");
console.log("--- TEST ÉTAPE 13.5 : GARDE & BLOCAGE DE COURSE (CLIC DROIT) ---");
console.log("==============================================================");

const player = new global.Game_Player();

// 1. Déplacement normal (sans clic droit)
TouchInput._rightPressed = false;
player._dashButtonPressed = true;
player._moving = true;

if (!player.isDashing()) {
    console.error("❌ Le joueur devrait pouvoir courir quand le clic droit n'est pas enfoncé");
    process.exit(1);
}
if (player.action() !== "run" && player.action() !== "dash") {
    console.error(`❌ L'action devrait être 'run' en déplacement avec dashButtonPressed, obtenu: ${player.action()}`);
    process.exit(1);
}
console.log("✅ 1. Déplacement avec dash normal : OK");

// 2. Clic droit enfoncé (visée/garde) -> Course bloquée
TouchInput._rightPressed = true;
if (player.isDashing()) {
    console.error("❌ Le joueur NE DOIT PAS pouvoir courir quand le clic droit est enfoncé");
    process.exit(1);
}
if (player.action() !== "guard") {
    console.error(`❌ L'action doit être 'guard' quand le clic droit est enfoncé, obtenu: ${player.action()}`);
    process.exit(1);
}
console.log("✅ 2. Clic droit enfoncé -> Dash bloqué et action 'guard' : OK");

// 3. Clic droit enfoncé + Attaque déclenchée -> L'action 'atk' est prioritaire
player._isActing = true;
player._action = "atk";
if (player.action() !== "atk") {
    console.error(`❌ Lors d'une attaque, l'action doit être 'atk', obtenu: ${player.action()}`);
    process.exit(1);
}
console.log("✅ 3. Action 'atk' prioritaire même avec clic droit maintenu : OK");

player._isActing = false;

// 3.5 Test du cycle d'animation 3-frame en mode guard
player._action = "guard";
player.pattern = function() { return this._pattern < 3 ? this._pattern : 1; };

const spriteHero = new global.Sprite_Hero(player);
player._pattern = 0;
if (spriteHero.characterPatternX() !== 0) {
    console.error(`❌ Frame 0 attendue pour pattern 0 en guard, obtenu: ${spriteHero.characterPatternX()}`);
    process.exit(1);
}
player._pattern = 2;
if (spriteHero.characterPatternX() !== 2) {
    console.error(`❌ Frame 2 attendue pour pattern 2 en guard, obtenu: ${spriteHero.characterPatternX()}`);
    process.exit(1);
}
player._pattern = 1; // frame de repos
if (spriteHero.characterPatternX() !== 1) {
    console.error(`❌ Frame 1 (repos) attendue pour pattern 1 en guard, obtenu: ${spriteHero.characterPatternX()}`);
    process.exit(1);
}
console.log("✅ 3.5. Animation 3 frames préservée en mode guard : OK");

TouchInput._rightPressed = false;

console.log("\n==============================================================");
console.log("--- TEST ÉTAPE 14 : ÉCRAN TITRE, CALQUES, MENUS & SCÈNES ---");
console.log("==============================================================");

// 4. Test de Window_TitleCommand
const titleCmd = new global.Window_TitleCommand(new global.Rectangle(0, 0, 280, 300));
const commands = titleCmd.commandList();
const expectedSymbols = ["newGame", "continue", "freeGame", "options", "codex", "credits", "exit"];

for (const sym of expectedSymbols) {
    const found = commands.find(c => c.symbol === sym);
    if (!found) {
        console.error(`❌ Commande manquante dans Window_TitleCommand : ${sym}`);
        process.exit(1);
    }
}
if (titleCmd.opacity !== 0 || titleCmd._backgroundType !== 2) {
    console.error("❌ La fenêtre Window_TitleCommand doit avoir un fond transparent (opacity=0, backgroundType=2)");
    process.exit(1);
}
console.log(`✅ 4. Window_TitleCommand contient les 7 commandes (${expectedSymbols.join(', ')}) et est transparente : OK`);

// 5. Test de Scene_Title et de la création des calques
const titleScene = new global.Scene_Title();
titleScene.initialize();
titleScene.create();

const layers = titleScene._titleLayers;
if (!layers || layers.length < 10) {
    console.error(`❌ Scene_Title doit instancier les 10 calques requis, trouvé: ${layers ? layers.length : 0}`);
    process.exit(1);
}

// Vérification des z-indices
const expectedLayers = [
    { name: "_paralaxeSprite", z: 0 },
    { name: "_bg0Sprite", z: 1 },
    { name: "_bg1Sprite", z: 2 },
    { name: "_stationSprite", z: 4 },
    { name: "_screwSprite", z: 5 },
    { name: "_bg2Sprite", z: 10 },
    { name: "_gameLogoSprite", z: 11 },
    { name: "_scLogoSprite", z: 12 },
    { name: "_leftSprite", z: 13 },
    { name: "_rightSprite", z: 14 }
];

for (const exp of expectedLayers) {
    const sprite = titleScene[exp.name];
    if (!sprite) {
        console.error(`❌ Calque manquant sur Scene_Title : ${exp.name}`);
        process.exit(1);
    }
    if (sprite.z !== exp.z) {
        console.error(`❌ Calque ${exp.name} a un z-index de ${sprite.z}, attendu : ${exp.z}`);
        process.exit(1);
    }
}
console.log("✅ 5. Les 10 calques de Scene_Title sont instanciés avec les z-indices corrects : OK");

// 6. Test de la cinématique d'ouverture
titleScene.updateOpeningAnimation(); // Phase 0 -> Phase 1
if (titleScene._titleAnimPhase !== 1) {
    console.error(`❌ Phase d'ouverture attendue: 1, obtenu: ${titleScene._titleAnimPhase}`);
    process.exit(1);
}

// Simuler la complétion de la cinématique d'ouverture
titleScene._titleAnimPhase = 6;
titleScene.updateOpeningAnimation();
if (!titleScene._openingDone) {
    console.error("❌ _openingDone devrait être vrai à la fin de la cinématique d'ouverture");
    process.exit(1);
}
if (!titleScene._commandWindow.isOpen()) {
    console.error("❌ La fenêtre de commande doit s'ouvrir à la fin de la cinématique");
    process.exit(1);
}
console.log("✅ 6. Cinématique d'ouverture et ouverture du menu : OK");

// 7. Test de la transition immersion (Débuter)
titleScene.startImmersionTransition(() => {
    titleScene._transitionCallbackExecuted = true;
});

if (!titleScene._inTransition || titleScene._transitionPhase !== 1) {
    console.error("❌ La transition immersion n'a pas démarré correctement");
    process.exit(1);
}

// Simulation du fade de Bg_2 vers Phase 2
titleScene._bg2Sprite.opacity = 255;
titleScene.updateTransitionAnimation(); // Passe à Phase 2
if (titleScene._transitionPhase !== 2) {
    console.error(`❌ Transition phase attendue: 2, obtenu: ${titleScene._transitionPhase}`);
    process.exit(1);
}
if (!AudioManager._currentBgm || AudioManager._currentBgm.name !== "03Z_MystFallOut") {
    console.error(`❌ La musique de transition doit être 03Z_MystFallOut, obtenu: ${JSON.stringify(AudioManager._currentBgm)}`);
    process.exit(1);
}

// Fin de la transition
titleScene._transitionPhase = 3;
titleScene._transitionTimer = 1;
titleScene.updateTransitionAnimation(); // Phase 3 termine -> appelle callback
if (!titleScene._transitionCallbackExecuted) {
    console.error("❌ Le callback de transition vers la scène suivante n'a pas été exécuté");
    process.exit(1);
}
console.log("✅ 7. Transition immersion avec Bg_2, Left, Right et musique 03Z_MystFallOut : OK");

// 8. Test de Scene_FreeGameStart, Scene_Codex et Scene_Credits
const freeGameScene = new global.Scene_FreeGameStart();
freeGameScene.create();
if (!freeGameScene._infoWindow) {
    console.error("❌ Scene_FreeGameStart doit posséder une fenêtre d'information");
    process.exit(1);
}

const codexScene = new global.Scene_Codex();
codexScene.create();
if (!codexScene._categoryWindow || !codexScene._detailWindow) {
    console.error("❌ Scene_Codex doit posséder une fenêtre de catégories et de détails");
    process.exit(1);
}

const creditsScene = new global.Scene_Credits();
creditsScene.create();
if (!creditsScene._creditsSprite) {
    console.error("❌ Scene_Credits doit posséder un sprite de défilement de texte");
    process.exit(1);
}
console.log("✅ 8. Instanciation et interface de Scene_FreeGameStart, Scene_Codex et Scene_Credits : OK");

console.log("\n==============================================================");
console.log("🎉 TOUS LES TESTS DE L'ÉTAPE 13.5 ET DE L'ÉTAPE 14 SONT VALIDÉS !");
console.log("==============================================================");
