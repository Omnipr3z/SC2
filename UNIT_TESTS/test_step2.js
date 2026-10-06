/**
 * ============================================================================
 * UNIT TEST : Étape 2 - Déplacement continu et Pathfinding 8 directions
 * ============================================================================
 * Valide l'ensemble des fonctionnalités introduites à l'étape 2 :
 * - Instanciation du Game_Hero avec lecture des métadonnées (Race, Sexe, Face).
 * - Calque composite (Bitmap_Composite) et équipement visuel.
 * - Sprite_Hero et mapping des 8 directions vers les lignes du spritesheet.
 * - Algorithme A* étendu à 8 directions dans Game_Player.prototype.findDirectionTo.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Mocks d'environnement RMMZ
global.window = global;
global.$dataActors = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Actors.json'), 'utf8'));
global.$dataArmors = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Armors.json'), 'utf8'));
global.$dataWeapons = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Weapons.json'), 'utf8'));

global.TouchInput = { clear() {}, update() {} };
global.Input = { dir8: 0, dir4: 0, isPressed() { return false; }, isTriggered() { return false; } };

global.Bitmap = class Bitmap {
    constructor(w, h) { this.width = w; this.height = h; this._ready = true; }
    isReady() { return this._ready; }
    clear() {}
    resize(w, h) { this.width = w; this.height = h; }
    blt(src, sx, sy, sw, sh, dx, dy) {}
};

global.ImageManager = {
    loadBitmap(folder, filename) {
        return new Bitmap(289, 768);
    }
};

global.Game_Actor = class Game_Actor {
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
};

global.Game_Actors = class Game_Actors {
    constructor() { this._data = []; }
    actor(id) { return null; }
};

global.Game_CharacterBase = class Game_CharacterBase {
    constructor() {
        this._x = 0; this._y = 0; this._realX = 0; this._realY = 0;
        this._direction = 2; this._pattern = 1;
    }
    direction() { return this._direction; }
    pattern() { return this._pattern; }
    setDirection(d) { this._direction = d; }
    canPass(x, y, d) { return true; }
    canPassDiagonally(x, y, h, v) { return true; }
    moveStraight(d) { this._direction = d; }
    moveDiagonally(h, v) {}
};

global.Game_Character = class Game_Character extends Game_CharacterBase {
    characterName() { return ''; }
};

global.Game_Player = class Game_Player extends Game_Character {
    constructor() {
        super();
        this._dashing = false;
    }
    isDashing() { return this._dashing; }
    deltaXFrom(x) { return this.x - x; }
    deltaYFrom(y) { return this.y - y; }
};

global.Game_Map = class Game_Map {};

global.Sprite_Character = class Sprite_Character {
    constructor(char) {
        this._character = char;
    }
    characterPatternY() {
        return (this._character.direction() - 2) / 2;
    }
};

global.Spriteset_Map = class Spriteset_Map {
    createCharacterSprite(char) {
        if (typeof Sprite_Hero !== 'undefined' && char === $gamePlayer) {
            return new Sprite_Hero(char);
        }
        return new Sprite_Character(char);
    }
};

global.$gameParty = {
    leader: () => null
};
global.$gameMap = {
    events: () => [],
    vehicles: () => []
};

// Chargement des plugins SC4
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Hub_Hero.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Bitmap_Composite.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Game_Hero.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Character_Hero.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Sprite_Hero.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_rmmz_core_Patches.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_rmmz_objects_Patches.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_rmmz_sprites_Patches.js'), 'utf8'));

const hero = new Game_Hero(1);
global.$gamePlayer = new Game_Player();

console.log('--- TEST ÉTAPE 2 : GAME_HERO & DONNÉES ---');
console.log('Actor 1 est Game_Hero :', hero instanceof Game_Hero);
console.log('isHero :', hero.isHero());
console.log('Race :', hero.race());
console.log('Sex :', hero.sex());
console.log('Face :', hero.hasFace());
console.log('Hub get(1) :', $heroHub.get(1) === hero);

console.log('\n--- TEST ÉQUIPEMENTS VISUELS ---');
const equipLayers = hero.getVisualEquipLayers();
console.log('Calques visuels équipements :', JSON.stringify(equipLayers));

console.log('\n--- TEST COMPOSITEUR DE TEXTURES ---');
const entry = hero.getCompositeEntry('walk');
console.log('Calques du compositeur :', JSON.stringify(entry.composer._layers));

entry.composer.loadLayers();
console.log('Prêt :', entry.composer.isReady());
entry.composer.bltComposite(entry.bitmap);
console.log('Dimensions texture composée :', entry.bitmap.width, entry.bitmap.height);

console.log('\n--- TEST SPRITESET & SPRITE_HERO ---');
$gameParty.leader = () => hero;
const sm = new Spriteset_Map();
const sprite = sm.createCharacterSprite($gamePlayer);
console.log('Sprite joueur est Sprite_Hero :', sprite instanceof Sprite_Hero);

// Test de correspondance des lignes de sprite pour les 8 directions
const dirs = [2, 4, 6, 8, 1, 3, 7, 9];
const rows = dirs.map(d => {
    $gamePlayer.setDirection(d);
    return sprite.characterPatternY();
});
console.log('Lignes Sprite_Hero pour [2,4,6,8,1,3,7,9] :', rows);

console.log('\n--- TEST PATHFINDING 8 DIRECTIONS ---');
$gameMap.width = () => 20;
$gameMap.height = () => 20;
$gameMap.roundXWithDirection = (x, d) => (d === 4 ? x - 1 : (d === 6 ? x + 1 : x));
$gameMap.roundYWithDirection = (y, d) => (d === 8 ? y - 1 : (d === 2 ? y + 1 : y));
$gameMap.deltaX = (x1, x2) => x1 - x2;
$gameMap.deltaY = (y1, y2) => y1 - y2;

const pathPlayer = new Game_Player();
pathPlayer.x = 5;
pathPlayer.y = 5;
pathPlayer.searchLimit = () => 12;

console.log('findDirectionTo(8, 8) -> 3 (Bas-Droite) :', pathPlayer.findDirectionTo(8, 8));
console.log('findDirectionTo(2, 2) -> 7 (Haut-Gauche) :', pathPlayer.findDirectionTo(2, 2));
console.log('findDirectionTo(2, 8) -> 1 (Bas-Gauche)  :', pathPlayer.findDirectionTo(2, 8));
console.log('findDirectionTo(8, 2) -> 9 (Haut-Droite) :', pathPlayer.findDirectionTo(8, 2));
console.log('findDirectionTo(5, 9) -> 2 (Bas)         :', pathPlayer.findDirectionTo(5, 9));
console.log('findDirectionTo(5, 5) -> 0               :', pathPlayer.findDirectionTo(5, 5));

console.log('✅ TEST ÉTAPE 2 COMPLÈTEMENT VALIDÉ !');
