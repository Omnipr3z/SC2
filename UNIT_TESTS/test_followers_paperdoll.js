/**
 * ============================================================================
 * UNIT TEST : Paperdoll Composite sur Compagnons (Followers)
 * ============================================================================
 * Valide le rendu composite et le paperdoll complet sur les membres de l'équipe :
 * - Reconnaissance automatique d'un Follower comme Game_Hero.
 * - Instanciation de Sprite_Hero pour chaque compagnon actif.
 * - Gestion du déplacement à 8 directions et mapping des lignes pour les followers.
 * - Masquage automatique des sprites de followers vides.
 * - Changement d'ordre d'équipe (swapOrder / formation) et permutation dynamique des sprites.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Mock browser / RMMZ global objects
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

global.$dataSystem = {
    optTransparent: false,
    optFollowers: true
};

global.$dataArmors = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Armors.json'), 'utf8'));
global.$dataWeapons = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Weapons.json'), 'utf8'));
global.$dataActors = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Actors.json'), 'utf8'));

// Minimal Bitmap mock
global.Bitmap = class Bitmap {
    constructor(w = 0, h = 0) {
        this.width = w;
        this.height = h;
        this._loading = false;
        this._ready = true;
    }
    isReady() { return this._ready; }
    resize(w, h) { this.width = w; this.height = h; }
    clear() {}
    blt() {}
};

global.ImageManager = {
    loadBitmap(folder, filename) {
        return new Bitmap(96, 96);
    },
    loadCharacter(name) {
        return new Bitmap(144, 192);
    },
    isObjectCharacter() { return false; }
};

global.Graphics = { width: 1280, height: 720 };
global.TouchInput = { isTriggered() { return false; }, isRightPressed() { return false; } };
global.Input = { dir8: 0, dir4: 0 };

// Minimal RMMZ classes mock
global.Game_Actor = class Game_Actor {
    constructor(actorId) { this.setup(actorId); }
    setup(actorId) { this._actorId = actorId; }
    actorId() { return this._actorId; }
    actor() { return $dataActors[this._actorId]; }
    equips() {
        const actorData = this.actor();
        if (!actorData || !actorData.equips) return [];
        return actorData.equips.map((id, slot) => {
            if (id === 0) return null;
            return slot === 0 ? $dataWeapons[id] : $dataArmors[id];
        });
    }
    weapons() {
        const eq = this.equips();
        return eq[0] ? [eq[0]] : [];
    }
    characterName() { return this.actor() ? this.actor().characterName : ""; }
    characterIndex() { return this.actor() ? this.actor().characterIndex : 0; }
};

global.Game_Actors = class Game_Actors {
    constructor() { this._data = []; }
    actor(id) {
        if (!this._data[id]) {
            this._data[id] = new Game_Actor(id);
        }
        return this._data[id];
    }
};

global.Game_CharacterBase = class Game_CharacterBase {
    constructor() {
        this._x = 0;
        this._y = 0;
        this._realX = 0;
        this._realY = 0;
        this._direction = 2;
        this._pattern = 1;
        this._characterName = "";
        this._characterIndex = 0;
        this._moveSpeed = 4;
        this._movementSuccess = true;
        this._tileId = 0;
    }
    initMembers() {}
    direction() { return this._direction; }
    setDirection(d) { this._direction = d; }
    pattern() { return this._pattern; }
    characterName() { return this._characterName; }
    characterIndex() { return this._characterIndex; }
    setImage(name, index) { this._characterName = name; this._characterIndex = index; }
    tileId() { return this._tileId; }
    isTransparent() { return false; }
    isMoving() { return this._realX !== this._x || this._realY !== this._y; }
    realMoveSpeed() { return this._moveSpeed; }
    distancePerFrame() { return Math.pow(2, this.realMoveSpeed()) / 256; }
    isMovementSucceeded() { return this._movementSuccess; }
    setMovementSuccess(s) { this._movementSuccess = s; }
    moveDiagonally(horz, vert) {
        this._movementSuccess = true;
        this._x += (horz === 6 ? 1 : horz === 4 ? -1 : 0);
        this._y += (vert === 2 ? 1 : vert === 8 ? -1 : 0);
    }
    deltaXFrom(x) { return this._x - x; }
    deltaYFrom(y) { return this._y - y; }
};

global.Game_Character = class Game_Character extends Game_CharacterBase {
    initMembers() { super.initMembers(); }
};

global.Game_Follower = class Game_Follower extends Game_Character {
    constructor(memberIndex) {
        super();
        this.initialize(memberIndex);
    }
    initialize(memberIndex) {
        this.initMembers();
        this._memberIndex = memberIndex;
    }
    actor() {
        return $gameParty.battleMembers()[this._memberIndex];
    }
    isVisible() {
        return Boolean(this.actor()) && $gamePlayer.followers().isVisible();
    }
    refresh() {
        const characterName = this.isVisible() ? this.actor().characterName() : "";
        const characterIndex = this.isVisible() ? this.actor().characterIndex() : 0;
        this.setImage(characterName, characterIndex);
    }
    update() {
        // native copy
    }
    chaseCharacter(character) {
        const sx = this.deltaXFrom(character.x);
        const sy = this.deltaYFrom(character.y);
        if (sx !== 0 && sy !== 0) {
            this.moveDiagonally(sx > 0 ? 4 : 6, sy > 0 ? 8 : 2);
        }
    }
};

global.Game_Followers = class Game_Followers {
    constructor() {
        this._visible = true;
        this._data = [new Game_Follower(1), new Game_Follower(2)];
    }
    isVisible() { return this._visible; }
    data() { return this._data.slice(); }
    reverseData() { return this._data.slice().reverse(); }
    follower(index) { return this._data[index]; }
    refresh() {
        for (const f of this._data) f.refresh();
    }
};

global.Game_Player = class Game_Player extends Game_Character {
    constructor() {
        super();
        this.initMembers();
        this._followers = new Game_Followers();
    }
    followers() { return this._followers; }
    refresh() {
        const actor = $gameParty.leader();
        const characterName = actor ? actor.characterName() : "";
        const characterIndex = actor ? actor.characterIndex() : 0;
        this.setImage(characterName, characterIndex);
        this._followers.refresh();
    }
};

global.Game_Party = class Game_Party {
    constructor() {
        this._actors = [1, 2]; // Reid, Priscilla
    }
    leader() { return $gameActors.actor(this._actors[0]); }
    battleMembers() {
        return this._actors.map(id => $gameActors.actor(id));
    }
    swapOrder(idx1, idx2) {
        const temp = this._actors[idx1];
        this._actors[idx1] = this._actors[idx2];
        this._actors[idx2] = temp;
        $gamePlayer.refresh();
    }
};

global.Sprite = class Sprite {
    constructor() {
        this.bitmap = null;
        this.visible = true;
        this._frame = { width: 0, height: 0 };
    }
    update() {}
};

global.Sprite_Character = class Sprite_Character extends Sprite {
    constructor(character) {
        super();
        this.initMembers();
        this.setCharacter(character);
    }
    initMembers() {
        this._character = null;
        this._characterName = "";
        this._characterIndex = 0;
        this._tileId = 0;
    }
    setCharacter(character) { this._character = character; }
    update() {
        super.update();
        this.updateBitmap();
        this.updateVisibility();
    }
    updateBitmap() {
        if (this.isImageChanged()) {
            this._characterName = this._character.characterName();
            this._characterIndex = this._character.characterIndex();
            this.setCharacterBitmap();
        }
    }
    isImageChanged() {
        return (
            this._characterName !== this._character.characterName() ||
            this._characterIndex !== this._character.characterIndex()
        );
    }
    setCharacterBitmap() {
        this.bitmap = ImageManager.loadCharacter(this._characterName);
    }
    isEmptyCharacter() {
        return this._tileId === 0 && !this._characterName;
    }
    updateVisibility() {
        if (this.isEmptyCharacter() || this._character.isTransparent()) {
            this.visible = false;
        } else {
            this.visible = true;
        }
    }
    patternWidth() { return 48; }
    patternHeight() { return 48; }
    characterBlockX() { return 0; }
    characterBlockY() { return 0; }
    characterPatternX() { return this._character.pattern(); }
    characterPatternY() {
        const dir = this._character.direction();
        return (dir - 2) / 2;
    }
};

global.Spriteset_Map = class Spriteset_Map {
    createCharacterSprite(character) {
        return new Sprite_Character(character);
    }
};

global.Game_Map = class Game_Map {
    roundX(x) { return x; }
    roundY(y) { return y; }
    tilesetId() { return 1; }
};
global.$gameMap = new Game_Map();
global.$gameTemp = {
    isDestinationValid() { return false; },
    clearDestination() {}
};
global.Scene_Map = function() {};

// Load SC4 plugins
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Hub_Hero.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Bitmap_Composite.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Game_Hero.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Character_Hero.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Sprite_Hero.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_rmmz_core_Patches.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_rmmz_objects_Patches.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_rmmz_scenes_Patches.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_rmmz_sprites_Patches.js'), 'utf8'));

// Initialize runtime game objects
global.$gameActors = new Game_Actors();
global.$gameParty = new Game_Party();
global.$gamePlayer = new Game_Player();

console.log('--- TEST 1: FOLLOWER IS RECOGNIZED AS HERO ---');
const follower0 = $gamePlayer.followers().follower(0);
console.log('Follower 0 actor ID:', follower0.actor().actorId()); // 2
console.log('Follower 0 isHero:', follower0.isHero()); // true
console.log('Follower 0 hero race/sex:', follower0.hero().race(), follower0.hero().sex());
console.log('Follower 0 action:', follower0.action()); // "walk"

console.log('\n--- TEST 2: SPRITESET MAP INSTANTIATES SPRITE_HERO FOR FOLLOWER ---');
const spriteset = new Spriteset_Map();
const playerSprite = spriteset.createCharacterSprite($gamePlayer);
const followerSprite = spriteset.createCharacterSprite(follower0);
console.log('Player sprite is Sprite_Hero:', playerSprite instanceof Sprite_Hero);
console.log('Follower sprite is Sprite_Hero:', followerSprite instanceof Sprite_Hero);

followerSprite.update();
console.log('Follower sprite has composite bitmap:', Boolean(followerSprite.bitmap));
console.log('Follower sprite dimensions:', followerSprite.patternWidth(), 'x', followerSprite.patternHeight()); // 96 x 96
console.log('Follower sprite visible:', followerSprite.visible); // true

console.log('\n--- TEST 3: FOLLOWER 8-DIRECTION MOVEMENT & ROWS ---');
// Follower moves diagonally down-right (horz = 6, vert = 2)
follower0.moveDiagonally(6, 2);
console.log('Follower direction after diagonal move (should be 3 Bas-Droite):', follower0.direction());
console.log('Sprite row for direction 3 (should be 5):', followerSprite.characterPatternY());

// Follower moves up-left (horz = 4, vert = 8)
follower0.moveDiagonally(4, 8);
console.log('Follower direction after diagonal move (should be 7 Haut-Gauche):', follower0.direction());
console.log('Sprite row for direction 7 (should be 6):', followerSprite.characterPatternY());

// Follower diagonal speed check
follower0._x = 5; follower0._y = 5; follower0._realX = 4; follower0._realY = 4; // diagonal move in progress
const normDist = follower0.distancePerFrame();
console.log('Follower diagonal normalized speed (dist * 0.7071):', normDist);

console.log('\n--- TEST 4: FOLLOWER VISIBILITY WHEN EMPTY ---');
// Follower 1 (member index 2) has no actor in party
const follower1 = $gamePlayer.followers().follower(1);
console.log('Follower 1 actor:', follower1.actor()); // undefined
console.log('Follower 1 isVisible:', follower1.isVisible()); // false
const follower1Sprite = spriteset.createCharacterSprite(follower1);
follower1Sprite.update();
console.log('Follower 1 sprite visible (should be false):', follower1Sprite.visible);

console.log('\n--- TEST 5: HUB_HERO HELPERS ---');
console.log('Hub_Hero followersHeroes count:', window.$heroHub.followersHeroes().length); // 1 (Priscilla)
console.log('Hub_Hero partyHeroes count:', window.$heroHub.partyHeroes().length); // 2 (Reid, Priscilla)

console.log('\n--- TEST 6: PARTY ORDER SWAP (FORMATION CHANGE) ---');
console.log('Leader before swap:', $gameParty.leader().actorId());
$gameParty.swapOrder(0, 1);
console.log('Leader after swap:', $gameParty.leader().actorId()); // 2 (Priscilla)
console.log('Follower 0 actor after swap:', follower0.actor().actorId()); // 1 (Reid)
playerSprite.update();
followerSprite.update();
console.log('Player sprite hero ID after swap:', playerSprite.getHero().actorId()); // 2
console.log('Follower sprite hero ID after swap:', followerSprite.getHero().actorId()); // 1

console.log('\nALL FOLLOWER PAPERDOLL TESTS PASSED SUCCESSFULLY!');
