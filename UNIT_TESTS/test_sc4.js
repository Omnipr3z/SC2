/**
 * ============================================================================
 * UNIT TEST : Core SC4 & Sprite Hero Creation
 * ============================================================================
 * Vérifie le chargement initial du plugin SC4_CoreHero.js et l'instanciation
 * automatique des sprites composites personnalisés (Sprite_Hero) pour le joueur.
 */

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Environnement global simulé pour RPG Maker MZ
global.window = global;
global['$dataActors'] = [
    null,
    { id: 1, name: 'Reid', note: '<Hero>\n<Race: Human>\n<Sex: Male>' },
    { id: 2, name: 'Priscilla', note: '' }
];
global.Bitmap = class Bitmap {
    constructor(w = 288, h = 768) { this.width = w; this.height = h; }
    isReady() { return true; }
    resize() {}
    clear() {}
    blt() {}
};
global.ImageManager = {
    loadBitmap: (folder, filename) => new global.Bitmap()
};
global.Game_Actor = class {
    constructor(id) { this.setup(id); }
    setup(id) { this._actorId = id; }
    actorId() { return this._actorId; }
    actor() { return global['$dataActors'][this._actorId]; }
    equips() { return []; }
};
global.Game_Actors = class {
    constructor() { this._data = []; }
    actor(id) {
        if (!this._data[id]) this._data[id] = new Game_Hero(id);
        return this._data[id];
    }
};
global.Game_CharacterBase = class {
    constructor() { this.initMembers(); }
    initMembers() { this._x = 0; this._y = 0; this._direction = 2; }
    canPassDiagonally() { return true; }
    moveDiagonally() {}
    canPass() { return true; }
    moveStraight() {}
    setDirection(d) { this._direction = d; }
    direction() { return this._direction; }
};
global.Game_Character = class extends global.Game_CharacterBase {
    pattern() { return 1; }
    characterName() { return ''; }
};
global.Game_Followers = class {
    constructor() { this._data = []; }
    reverseData() { return this._data.slice().reverse(); }
};
global.Game_Player = class extends global.Game_Character {
    constructor() { super(); this._followers = new global.Game_Followers(); }
    followers() { return this._followers; }
};
global.Sprite_Character = class {
    constructor(char) { this._character = char; this.initMembers(); }
    initMembers() {}
    isImageChanged() { return false; }
    setCharacterBitmap() {}
};
global.Spriteset_Map = class {
    constructor() {
        this._tilemap = { addChild: () => {} };
    }
};
global.Input = { dir8: 3 };
global['$gameMap'] = {
    events: () => [],
    vehicles: () => []
};

// Chargement des plugins SC4
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Hub_Hero.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Bitmap_Composite.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Game_Hero.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Character_Hero.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Sprite_Hero.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_rmmz_sprites_Patches.js'), 'utf8'));

const actors = new Game_Actors();
const hero = actors.actor(1);
const player = new Game_Player();
global['$gamePlayer'] = player;
global['$gameParty'] = { leader: () => hero };

const spriteset = new Spriteset_Map();
spriteset.createCharacters();

console.log('--- TEST SC4 CORE HERO ---');
console.log('Sprites créés :', spriteset._characterSprites.length);
console.log('Classe du sprite joueur :', spriteset._characterSprites[0].constructor.name);

if (spriteset._characterSprites.length > 0 && spriteset._characterSprites[0].constructor.name === 'Sprite_Hero') {
    console.log('✅ TEST SC4 CORE VALIDÉ');
} else {
    console.error('❌ ÉCHEC DU TEST SC4 CORE');
    process.exit(1);
}
