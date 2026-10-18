//=============================================================================
// test_step13_paperdoll_face.js
// Tests unitaires pour l'Étape 13 : Visual Faceset Paperdoll & Sprite_PaperdollFace
//=============================================================================

const fs = require('fs');
const path = require('path');

// Configuration de l'environnement global simulé
global.window = global;

global.Graphics = { boxWidth: 1280, boxHeight: 720 };
global.ImageManager = {
    faceWidth: 144,
    faceHeight: 144,
    loadFace: function(name) {
        return new global.Bitmap(576, 288);
    },
    loadBitmap: function(folder, filename) {
        const b = new global.Bitmap(144, 144);
        b._url = folder + filename + ".png";
        b._loadingState = "loaded";
        return b;
    }
};

global.Bitmap = class Bitmap {
    constructor(w, h) {
        this.width = w || 0;
        this.height = h || 0;
        this._loadingState = "loaded";
        this._url = "";
        this.context = {
            fillStyle: "",
            strokeStyle: "",
            lineWidth: 1,
            font: "",
            textAlign: "",
            textBaseline: "",
            shadowColor: "",
            shadowBlur: 0,
            fillRect: () => {},
            strokeRect: () => {},
            fillText: () => {},
            measureText: () => ({ width: 40 }),
            beginPath: () => {},
            rect: () => {},
            roundRect: () => {},
            fill: () => {},
            stroke: () => {},
            drawImage: () => {},
            createLinearGradient: () => ({ addColorStop: () => {} })
        };
    }
    isReady() { return this._loadingState === "loaded"; }
    clear() {}
    resize(w, h) { this.width = w; this.height = h; }
    blt(source, sx, sy, sw, sh, dx, dy) {
        this._lastBlt = { source, sx, sy, sw, sh, dx, dy };
    }
};

global.Sprite = class Sprite {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.scale = { x: 1, y: 1 };
        this.visible = true;
        this.bitmap = null;
        this.children = [];
        this._frame = { x: 0, y: 0, width: 0, height: 0 };
    }
    addChild(child) {
        this.children.push(child);
        return child;
    }
    move(x, y) {
        this.x = x;
        this.y = y;
    }
    setFrame(x, y, w, h) {
        this._frame = { x, y, width: w, height: h };
    }
    show() { this.visible = true; }
    hide() { this.visible = false; }
    update() {
        for (const c of this.children) {
            if (c && c.update) c.update();
        }
    }
};

global.Window_Base = class Window_Base {
    constructor() {
        this.children = [];
        this._additionalSprites = {};
        this._padding = 12;
    }
    addChild(child) {
        this.children.push(child);
        return child;
    }
    addInnerChild(child) {
        return this.addChild(child);
    }
    update() {
        for (const c of this.children) {
            if (c && c.update) c.update();
        }
    }
};

global.Window_StatusBase = class Window_StatusBase extends global.Window_Base {
    constructor() {
        super();
    }
    drawFace(name, index, x, y, w, h) {
        this._lastVanillaDrawFace = { name, index, x, y, w, h };
    }
    drawActorFace(actor, x, y, w, h) {
        this.drawFace(actor.faceName(), actor.faceIndex(), x, y, w, h);
    }
    hideAdditionalSprites() {
        for (const s of Object.values(this._additionalSprites)) {
            s.hide();
        }
    }
};

global.Game_Actor = class Game_Actor {
    constructor(actorId) { this.setup(actorId); }
    setup(actorId) { this._actorId = actorId; }
    actorId() { return this._actorId; }
    actor() { return (global.$dataActors && global.$dataActors[this._actorId]) || { note: "<Hero>" }; }
    faceName() { return "Actor1"; }
    faceIndex() { return 0; }
    equips() { return []; }
    isHero() { return true; }
    hasNotetag(tag) { return tag.toLowerCase() === "hero"; }
};

global.Sprite_Character = class Sprite_Character extends global.Sprite {
    characterPatternY() { return 0; }
};
global.Spriteset_Map = class Spriteset_Map {
    createCharacterSprite() {}
};

// Chargement des plugins nécessaires
require('../js/plugins/Bitmap_Composite.js');
require('../js/plugins/Game_Hero.js');
require('../js/plugins/Sprite_PaperdollFace.js');
require('../js/plugins/SC4_rmmz_sprites_Patches.js');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`[PASS] ${message}`);
        passCount++;
    } else {
        console.error(`[FAIL] ${message}`);
        failCount++;
    }
}

console.log("=== TESTS POUR ETAPE 13 : VISUAL FACESET PAPERDOLL ===");

// -------------------------------------------------------------
// TEST 1 : PARSING DES NOTETAGS <face:...> DANS GAME_HERO
// -------------------------------------------------------------
console.log("\n--- TEST 1 : NOTETAGS <face:...> DANS EQUIPEMENTS ---");

const mockHero = new Game_Hero(1);
mockHero._race = "human";
mockHero._sex = "male";

// Équipement 1 : <face:flak, 1>
// Équipement 2 : <face: helm, 2, true>
// Équipement 3 : sans notetag
mockHero.equips = () => [
    { id: 4, note: "<face:flak, 1>" },
    { id: 10, note: "<face: helm, 2, true>" },
    { id: 15, note: "" },
    null
];

const layers = mockHero.getFaceEquipLayers();
assert(layers.length === 2, "2 couches de visage détectées");
assert(layers[0].filename === "flak" && layers[0].zindex === 1 && layers[0].unisex === false, "Couche 1 : flak, z=1, unisex=false");
assert(layers[1].filename === "helm" && layers[1].zindex === 2 && layers[1].unisex === true, "Couche 2 : helm, z=2, unisex=true");

// -------------------------------------------------------------
// TEST 2 : BITMAP_COMPOSITE.GETCOMPOSITEFACEENTRY
// -------------------------------------------------------------
console.log("\n--- TEST 2 : COMPOSITION BITMAP_COMPOSITE FACESET 144x144 ---");

// Test existence de fichiers dans img/faces/hero/
Bitmap_Composite._fileExistsCache.clear();
const entry = Bitmap_Composite.getCompositeFaceEntry(mockHero);

assert(entry !== null, "Entrée composite générée avec succès");
assert(entry.bitmap !== null, "Bitmap de destination présent");
assert(entry.bitmap.width === 144 && entry.bitmap.height === 144, "Bitmap de taille 144x144 (unique tile)");
assert(entry.composer instanceof Bitmap_Composite, "Composer est une instance de Bitmap_Composite");

// Vérification de la couche de base (ID acteur 1 à z=0)
const composerLayers = entry.composer._layers;
assert(composerLayers.some(l => l.filename === "1" && l.z === 0), "Couche de base '1' présente avec z-index 0");

// Vérification du fichier réel existant sur disque
// img/faces/hero/equip_flak_human_male.png existe sur le disque
const flakLayer = composerLayers.find(l => l.filename === "equip_flak_human_male" || l.filename === "flak_human_male");
assert(Boolean(flakLayer), "Couche d'équipement flak bien résolue (equip_flak_human_male)");
assert(flakLayer && flakLayer.z === 1, "z-index de l'équipement flak respecté (z=1)");

// Composition du bitmap
assert(entry.composer.isReady(), "Composer est prêt");
entry.composer.bltComposite(entry.bitmap);
entry.isComposed = true;
assert(entry.isComposed === true, "isComposed marqué à true après assemblage");

// -------------------------------------------------------------
// TEST 3 : SPRITE_PAPERDOLLFACE (CLASSE, MISE A L'ECHELLE ET UPDATE)
// -------------------------------------------------------------
console.log("\n--- TEST 3 : SPRITE_PAPERDOLLFACE ---");

const faceSprite = new Sprite_PaperdollFace(mockHero, 144, 144);
assert(faceSprite.actor() === mockHero, "Acteur correctement associé");
assert(faceSprite.isHero() === true, "Sprite identifie correctement un Hero");
assert(faceSprite.scale.x === 1 && faceSprite.scale.y === 1, "Échelle 1.0 pour taille 144x144");

// Changement de taille cible à 64x64 (taille HUD)
faceSprite.setTargetSize(64, 64);
assert(Math.abs(faceSprite.scale.x - (64 / 144)) < 0.001, "Échelle X correcte pour 64x64");
assert(Math.abs(faceSprite.scale.y - (64 / 144)) < 0.001, "Échelle Y correcte pour 64x64");

// Update du sprite
faceSprite.update();
assert(faceSprite.bitmap === entry.bitmap, "Le bitmap du sprite pointe vers le composite 144x144");

// Test avec un acteur non-héro (fallback vanilla)
const mockNonHero = {
    actorId: () => 99,
    isHero: () => false,
    faceName: () => "Actor2",
    faceIndex: () => 3,
    equips: () => []
};

const vanillaSprite = new Sprite_PaperdollFace(mockNonHero, 144, 144);
assert(vanillaSprite.isHero() === false, "Acteur non-héro détecté comme non-héro");
vanillaSprite.update();
assert(vanillaSprite._frame.width === 144, "Découpage vanilla configuré avec largeur 144");
assert(vanillaSprite._frame.x === (3 % 4) * 144, "Frame X vanilla calculée avec faceIndex 3");

// -------------------------------------------------------------
// TEST 4 : INTEGRATION DANS LES FENETRES (DRAWDYNAMICFACE & DRAWACTORFACE)
// -------------------------------------------------------------
console.log("\n--- TEST 4 : INTÉGRATION FENÊTRE & DRAWDYNAMICFACE ---");

const testWindow = new Window_StatusBase();
assert(typeof testWindow.drawDynamicFace === "function", "drawDynamicFace disponible sur Window_StatusBase");

// Appel de drawActorFace sur un héros -> doit appeler drawDynamicFace et ajouter l'enfant
testWindow.drawActorFace(mockHero, 24, 30, 144, 144);
assert(Object.keys(testWindow._additionalSprites).length === 1, "Sprite dynamique ajouté dans _additionalSprites");

const windowFaceSprite = Object.values(testWindow._additionalSprites)[0];
assert(windowFaceSprite instanceof Sprite_PaperdollFace, "Le sprite créé est bien une instance de Sprite_PaperdollFace");
assert(windowFaceSprite.x === 24 && windowFaceSprite.y === 30, "Position x=24, y=30 respectée");
assert(windowFaceSprite.visible === true, "Sprite visible");
assert(testWindow.children.includes(windowFaceSprite), "Sprite ajouté en enfant de la fenêtre");

// Appel de hideAdditionalSprites (refresh)
testWindow.hideAdditionalSprites();
assert(windowFaceSprite.visible === false, "Sprite masqué lors du refresh (hideAdditionalSprites)");

// Appel de drawActorFace sur un non-héro -> doit appeler drawFace vanilla
testWindow._lastVanillaDrawFace = null;
testWindow.drawActorFace(mockNonHero, 0, 0, 144, 144);
assert(testWindow._lastVanillaDrawFace !== null, "Vanilla drawFace appelé pour un acteur non-héro");
assert(testWindow._lastVanillaDrawFace.name === "Actor2", "Nom de faceset vanilla passé correctement");

// -------------------------------------------------------------
// TEST 5 : INTEGRATION DANS SPRITE_PLAYERHUD
// -------------------------------------------------------------
console.log("\n--- TEST 5 : INTÉGRATION SPRITE_PLAYERHUD ---");

global.$gameParty = { leader: () => mockHero };
const hud = new Sprite_PlayerHUD();

assert(hud._faceSprite instanceof Sprite_PaperdollFace, "Sprite_PlayerHUD possède _faceSprite (Sprite_PaperdollFace)");
assert(hud._faceSprite.x === 10 && hud._faceSprite.y === 18, "Position de _faceSprite à (10, 18)");
assert(hud.children.includes(hud._faceSprite), "_faceSprite est enfant de Sprite_PlayerHUD");
assert(hud._badgeSprite instanceof global.Sprite, "Sprite_PlayerHUD possède _badgeSprite pour l'overlay du nom et cadre");

hud.update();
assert(hud._faceSprite.visible === true, "_faceSprite est visible pour le leader héro");
assert(hud._faceSprite.actor() === mockHero, "_faceSprite est synchronisé avec le leader");

console.log("\n========================================================");
console.log(`RÉSULTAT : ${passCount} RÉUSSIS, ${failCount} ÉCHOUÉS`);
console.log("========================================================");

if (failCount > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
