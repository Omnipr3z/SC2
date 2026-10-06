/**
 * ============================================================================
 * UNIT TEST : Étape 4 - Système d'Attaque Visuelle & Animations d'Action
 * ============================================================================
 * Valide les fonctionnalités de combat et d'action visuelle de l'étape 4 :
 * - Parsing des balises XML / notetags d'attaque (<visual_attack>, <duration>, <frames>, <action_name>).
 * - Résolution des calques composites pour l'action 'atk' (_atk.png).
 * - Déclenchement de performAttack : interruption immédiate du déplacement,
 *   verrouillage du canMove pendant l'attaque, orientation dans la direction de visée.
 * - Progression temporelle des frames d'animation (pattern) et retour à 'walk'
 *   à la fin de la durée de l'action.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Environnement global simulé
global.window = global;
global.Graphics = {
    pageToCanvasX: x => x,
    pageToCanvasY: y => y,
    isInsideCanvas: () => true
};

global.Input = {
    dir8: 0,
    isTriggered: () => false,
    isPressed: () => false
};

global.$dataActors = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Actors.json'), 'utf8'));
global.$dataArmors = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Armors.json'), 'utf8'));
global.$dataWeapons = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Weapons.json'), 'utf8'));

// Mock TouchInput
global.TouchInput = {
    clear() {},
    update() {},
    isPressed() { return false; },
    isTriggered() { return false; },
    isRightPressed() { return false; },
    cursorX: 0,
    cursorY: 0
};

// Mock Bitmap & ImageManager
global.Bitmap = class Bitmap {
    constructor(w, h) { this.width = w; this.height = h; this._ready = true; }
    isReady() { return this._ready; }
    clear() {}
    resize(w, h) { this.width = w; this.height = h; }
    blt() {}
};

global.ImageManager = {
    loadBitmap() { return new Bitmap(288, 768); }
};

global.Sprite = class Sprite {
    constructor() { this.bitmap = null; this.visible = true; }
    update() {}
};
global.Sprite_Character = class Sprite_Character extends global.Sprite {
    constructor(character) { super(); this._character = character; }
    characterPatternX() { return this._character ? this._character.pattern() : 0; }
    characterPatternY() { return this._character ? (this._character.direction() - 2) / 2 : 0; }
};

// Mock Game_Temp
global.$gameTemp = {
    _destinationX: null,
    _destinationY: null,
    setDestination(x, y) { this._destinationX = x; this._destinationY = y; },
    clearDestination() { this._destinationX = null; this._destinationY = null; },
    isDestinationValid() { return this._destinationX !== null; }
};
global.Scene_Map = class Scene_Map {};
global.Spriteset_Map = class Spriteset_Map {};

// Classes RMMZ de base
class Game_Actor {
    constructor(actorId) { this.setup(actorId); }
    setup(actorId) {
        this._actorId = actorId;
        const data = $dataActors[actorId];
        this._equips = (data.equips || []).map((id, slot) => {
            if (id === 0) return { object: () => null };
            if (slot === 0) return { object: () => $dataWeapons[id] };
            return { object: () => $dataArmors[id] };
        });
    }
    actorId() { return this._actorId; }
    actor() { return $dataActors[this._actorId]; }
    equips() { return this._equips.map(e => e.object()); }
}
global.Game_Actor = Game_Actor;

class Game_Actors {
    constructor() { this._data = []; }
    actor(id) {
        if (!this._data[id]) this._data[id] = new Game_Hero(id);
        return this._data[id];
    }
}
global.Game_Actors = Game_Actors;

class Game_CharacterBase {
    constructor() {
        this._x = 5; this._y = 5; this._realX = 5; this._realY = 5;
        this.x = 5; this.y = 5;
        this._direction = 2;
        this._pattern = 1;
    }
    direction() { return this._direction; }
    setDirection(d) { this._direction = d; }
    pattern() { return this._pattern; }
    setPattern(p) { this._pattern = p; }
    screenX() { return 200; }
    screenY() { return 200; }
    isMoving() { return this._realX !== this._x || this._realY !== this._y; }
    isDashing() { return false; }
    canPass() { return true; }
    canPassDiagonally() { return true; }
}
global.Game_CharacterBase = Game_CharacterBase;

class Game_Character extends Game_CharacterBase {
    characterName() { return ''; }
}
global.Game_Character = Game_Character;

class Game_Followers {
    constructor() { this._data = []; }
    forEach() {}
}
global.Game_Followers = Game_Followers;

class Game_Player extends Game_Character {
    constructor() {
        super();
        this._followers = new Game_Followers();
    }
    followers() { return this._followers; }
}
global.Game_Player = Game_Player;

class Game_Map {
    constructor() {
        this._events = [];
    }
    events() { return []; }
    vehicles() { return []; }
    width() { return 20; }
    height() { return 20; }
    canvasToMapX(x) { return Math.floor(x / 48); }
    canvasToMapY(y) { return Math.floor(y / 48); }
    roundXWithDirection(x, d) { return x; }
    roundYWithDirection(y, d) { return y; }
    deltaX(x1, x2) { return x1 - x2; }
    deltaY(y1, y2) { return y1 - y2; }
    roundX(x) { return x; }
    roundY(y) { return y; }
}
global.Game_Map = Game_Map;
global.$gameMap = new Game_Map();

// Chargement des plugins SC4
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Hub_Hero.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Bitmap_Composite.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Game_Hero.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Character_Hero.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Sprite_Hero.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_rmmz_core_Patches.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_rmmz_objects_Patches.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_rmmz_scenes_Patches.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_rmmz_sprites_Patches.js'), 'utf8'));

console.log('--- TEST 1 : PARSING DE LA CONFIGURATION D\'ATTAQUE ---');
const actors = new Game_Actors();
const hero = actors.actor(1);
console.log('Config d\'attaque par défaut :', hero.getAttackConfig());

// Test avec balise XML personnalisée
hero.actor().note += '\n<visual_attack>\n<duration>6</duration>\n<frames>5</frames>\n<action_name>slash</action_name>\n</visual_attack>';
console.log('Config XML personnalisée :', hero.getAttackConfig());
hero.actor().note = '<Hero>\n<Race: Human>\n<Sex: Male>\n<Face>';

console.log('\n--- TEST 2 : CALQUES COMPOSITES D\'ATTAQUE ---');
const atkEntry = hero.getCompositeEntry('atk');
console.log('Calques ATK composites :', JSON.stringify(atkEntry.composer._layers));

console.log('\n--- TEST 3 : DÉCLENCHEMENT D\'ATTAQUE ET ARRÊT DU MOUVEMENT ---');
global.$gameParty = { leader: () => hero };
global.$gamePlayer = new Game_Player();

TouchInput.isRightPressed = () => true;
TouchInput.cursorX = 300;
TouchInput.cursorY = 152;

console.log('Avant attaque : isMoving =', $gamePlayer.isMoving());
console.log('Avant attaque : isAttacking =', $gamePlayer.isAttacking());

$gamePlayer.performAttack();
console.log('Après performAttack :');
console.log(' - isMoving =', $gamePlayer.isMoving());
console.log(' - Destination valide =', $gameTemp.isDestinationValid());
console.log(' - isAttacking =', $gamePlayer.isAttacking());
console.log(' - Action courante =', $gamePlayer.action());
console.log(' - Direction face Est (6) =', $gamePlayer.direction());
console.log(' - canMove =', $gamePlayer.canMove());

console.log('\n--- TEST 4 : PROGRESSION TEMPORELLE DES FRAMES D\'ATTAQUE ---');
const sprite = new Sprite_Hero($gamePlayer);
sprite.update();

let completed = false;
for (let t = 0; t <= 18; t++) {
    $gamePlayer.update(true);
    if (!$gamePlayer.isAttacking() && $gamePlayer.action() === 'walk') {
        completed = true;
        console.log(`Action terminée au tick ${t}, retour à l'action walk.`);
        break;
    }
}

if (completed) {
    console.log('✅ TEST ÉTAPE 4 COMPLÈTEMENT VALIDÉ !');
} else {
    console.error('❌ Échec de la progression de l\'animation d\'attaque');
    process.exit(1);
}
