/**
 * ============================================================================
 * TEST UNITAIRE : SCENE_LOADING, CACHE PERSISTANT _SYSTEM & ANTI-FLASH HERO
 * ============================================================================
 */

global.window = global;
const assert = require("assert");
const path = require("path");

const pluginsDir = path.resolve(__dirname, "../js/plugins");

// ============================================================================
// 1. MOCKS RMMZ & ENVIRONNEMENT HEADLESS
// ============================================================================

const infoLogs = [];
const warnLogs = [];
const errorLogs = [];

global.DEBUGTOOL = {
    log: () => {},
    info: (msg, key) => infoLogs.push({ msg, key }),
    warn: (msg, key) => warnLogs.push({ msg, key }),
    error: (msg, key) => errorLogs.push({ msg, key })
};

global.PluginManager = {
    parameters: () => ({}),
    registerCommand: () => {}
};

global.Utils = {
    encodeURI: (str) => encodeURIComponent(str).replace(/%2F/gi, "/")
};

global.Rectangle = class Rectangle {
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
};

class MockContext2D {
    constructor(bitmap) {
        this.bitmap = bitmap;
        this.fillStyle = "#ffffff";
        this.strokeStyle = "#ffffff";
        this.lineWidth = 1;
        this.shadowColor = "transparent";
        this.shadowBlur = 0;
        this.globalCompositeOperation = "source-over";
        this.font = "18px sans-serif";
        this.textAlign = "left";
        this.paths = [];
        this.drawnImages = [];
    }
    save() {}
    restore() {}
    beginPath() { this._currentPath = []; }
    moveTo(x, y) { this._currentPath && this._currentPath.push({ op: "M", x, y }); }
    lineTo(x, y) { this._currentPath && this._currentPath.push({ op: "L", x, y }); }
    closePath() { this._currentPath && this.paths.push(this._currentPath); }
    fill() {}
    stroke() {}
    fillRect() {}
    strokeRect() {}
    clearRect() {}
    drawImage(img) { this.drawnImages.push(img); }
    fillText() {}
    strokeText() {}
    measureText(s) { return { width: String(s || "").length * 10 }; }
}

class MockBitmap {
    constructor(w = 288, h = 768) {
        this.width = w;
        this.height = h;
        this.url = "";
        this._canvas = { width: w, height: h };
        this._image = { width: w, height: h };
        this.context = new MockContext2D(this);
        this._baseTexture = { update: () => {}, destroy: () => {} };
        this._loadingState = "loaded";
        this._destroyed = false;
        this._recordedTexts = [];
        this.fontSize = 20;
        this.fontFace = "rmmz-mainfont";
        this.textColor = "#ffffff";
        this.outlineColor = "rgba(0,0,0,0.8)";
        this.outlineWidth = 3;
        this.smooth = true;
    }
    static load(url) {
        const b = new MockBitmap(288, 768);
        b.url = url;
        b._loadingState = "loading";
        return b;
    }
    isReady() { return this._loadingState === "loaded" || this._loadingState === "none"; }
    isError() { return this._loadingState === "error"; }
    clear() { this.context.clearRect(0, 0, this.width, this.height); }
    fillAll() {}
    drawText(txt) { this._recordedTexts.push(txt); }
    resize(w, h) {
        this.width = w;
        this.height = h;
        this._canvas.width = w;
        this._canvas.height = h;
    }
    blt(src) {
        this.context.drawImage(src);
    }
    destroy() {
        this._destroyed = true;
    }
}
global.Bitmap = MockBitmap;

global.Sprite = class Sprite {
    constructor(bitmap = null) {
        this.initialize(bitmap);
    }
    initialize(bitmap = null) {
        this.bitmap = bitmap;
        this.x = 0;
        this.y = 0;
        this.rotation = 0;
        this.opacity = 255;
        this.visible = true;
        this.children = [];
        this.anchor = { x: 0, y: 0, set(ax, ay) { this.x = ax; this.y = ay; } };
        this.scale = { x: 1, y: 1, set(sx, sy) { this.x = sx; this.y = sy; } };
        this._frame = { x: 0, y: 0, width: 96, height: 96 };
    }
    addChild(child) { this.children.push(child); }
    setFrame(x, y, w, h) { this._frame = { x, y, width: w, height: h }; }
    update() {}
};

global.Sprite_Character = class Sprite_Character extends global.Sprite {
    initMembers() {
        this._character = null;
        this._characterName = "";
        this._characterIndex = 0;
        this._tileId = 0;
        this._tilesetId = 0;
    }
    initialize(character) {
        super.initialize(null);
        this.initMembers();
        this.setCharacter(character);
    }
    setCharacter(c) { this._character = c; }
    update() {
        super.update();
        this.updateBitmap();
        this.updateFrame();
    }
    isImageChanged() { return false; }
    updateBitmap() {}
    setCharacterBitmap() {}
    updateFrame() { this._frameUpdatedCount = (this._frameUpdatedCount || 0) + 1; }
    patternWidth() { return 48; }
    patternHeight() { return 48; }
    characterBlockX() { return 0; }
    characterBlockY() { return 0; }
    characterPatternX() { return 1; }
    characterPatternY() { return 0; }
};

global.Scene_Base = class Scene_Base {
    constructor() { this.initialize(...arguments); }
    initialize() { this.children = []; }
    addChild(c) { this.children.push(c); }
    create() {}
    start() {}
    update() {}
    terminate() {}
};

global.Scene_Splash = class Scene_Splash extends global.Scene_Base {};
global.Scene_Title = class Scene_Title extends global.Scene_Base {};
global.Scene_Map = class Scene_Map extends global.Scene_Base {};
global.Scene_Battle = class Scene_Battle extends global.Scene_Base {};

let titleSkipFlag = false;
global.DataManager = {
    isBattleTest: () => false,
    isEventTest: () => false,
    isTitleSkip: () => titleSkipFlag,
    setupBattleTest: () => {},
    setupEventTest: () => {},
    setupNewGame: () => {}
};

global.SoundManager = { preloadImportantSounds: () => {} };
global.ConfigManager = {
    applyFullscreen: () => {},
    applyData: () => {},
    makeData: () => ({}),
    save: () => {}
};
global.TextManager = {
    basic: () => "",
    param: () => "",
    command: () => "",
    message: () => ""
};
global.SC4_Localization = {
    parse: (s) => s,
    getText: (k, d) => d
};
global.Input = { keyMapper: {} };
global.TouchInput = {
    clear: () => {},
    update: () => {},
    _onLeftButtonDown: () => {},
    _onMouseMove: () => {},
    _onMouseUp: () => {},
    _onLostFocus: () => {},
    isPressed: () => false,
    isTriggered: () => false
};
global.Tilemap = class Tilemap { update() {} };

global.SceneManager = {
    _nextScene: null,
    goto(SceneClass) {
        this._nextScene = SceneClass ? new SceneClass() : null;
    },
    push() {}
};

const mockSpinnerImg = { id: "loadingSpinnerImage", style: {} };
const mockSpinnerRoot = {
    id: "loadingSpinner",
    querySelector: (sel) => (sel === "#loadingSpinnerImage" ? mockSpinnerImg : null)
};
global.document = {
    getElementById: (id) => (id === "loadingSpinner" ? mockSpinnerRoot : null)
};

global.Graphics = {
    width: 1760,
    height: 990,
    boxWidth: 1752,
    boxHeight: 982,
    _loadingSpinner: null,
    _createLoadingSpinner() {
        this._loadingSpinner = mockSpinnerRoot;
    },
    _isFullScreen: () => false
};

global.ImageManager = {
    _cache: {},
    _system: {},
    _emptyBitmap: new MockBitmap(0, 0),
    loadSystem(filename) {
        return this.loadBitmap("img/system/", filename);
    },
    loadBitmap(folder, filename) {
        if (!filename) return this._emptyBitmap;
        const url = folder + Utils.encodeURI(filename) + ".png";
        return this.loadBitmapFromUrl(url);
    },
    loadBitmapFromUrl(url) {
        const cache = url.includes("/system/") ? this._system : this._cache;
        if (!cache[url]) {
            cache[url] = Bitmap.load(url);
        }
        return cache[url];
    },
    clear() {
        for (const url in this._cache) {
            this._cache[url].destroy();
        }
        this._cache = {};
    }
};

global.Scene_Boot = class Scene_Boot extends global.Scene_Base {
    loadSystemImages() {}
    loadCustomFonts() {}
    checkPlayerLocation() {}
    resizeScreen() {}
    updateDocumentTitle() {}
    startNormalGame() {
        this.checkPlayerLocation();
        DataManager.setupNewGame();
        SceneManager.goto(Scene_Splash);
    }
    start() {
        if (DataManager.isTitleSkip()) {
            this.checkPlayerLocation();
            DataManager.setupNewGame();
            SceneManager.goto(Scene_Map);
        } else {
            this.startNormalGame();
        }
    }
};

// Stubs minimaux requis par rmmz_scenes_Patches
global.Scene_Message = class Scene_Message extends global.Scene_Base {};
global.Scene_Menu = class Scene_Menu extends global.Scene_Base {};
global.Scene_Item = class Scene_Item extends global.Scene_Base {};
global.Scene_File = class Scene_File extends global.Scene_Base {};
global.Scene_GameEnd = class Scene_GameEnd extends global.Scene_Base {};
global.Scene_Options = class Scene_Options extends global.Scene_Base {};

// ============================================================================
// 2. CHARGEMENT DES PLUGINS TESTÉS
// ============================================================================

require(path.join(pluginsDir, "SC4_Bitmap_Composite.js"));
require(path.join(pluginsDir, "SC4_Sprite_NeonArrowBase.js"));
require(path.join(pluginsDir, "SC4_Sprite_Hero.js"));
require(path.join(pluginsDir, "SC4_Sprite_PaperdollFace.js"));
require(path.join(pluginsDir, "SC4_Scene_Loading.js"));
require(path.join(pluginsDir, "SC4_rmmz_core_Patches.js"));
require(path.join(pluginsDir, "SC4_rmmz_scenes_Patches.js"));

// ============================================================================
// 3. EXÉCUTION DES TESTS
// ============================================================================

console.log("====================================================================");
console.log(" TEST UNITAIRE : SCENE_LOADING, CACHE _SYSTEM & ANTI-FLASH HERO ");
console.log("====================================================================\n");

let passed = 0;
function test(name, fn) {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
}

test("ImageManager route /characters/composite/ vers _system et survit à ImageManager.clear()", () => {
    const compBmp = ImageManager.loadBitmap("img/characters/composite/human/male/bodies/", "walk");
    const charBmp = ImageManager.loadBitmap("img/characters/", "Actors1");
    const guiBmp = ImageManager.loadBitmap("img/GUI/ship/", "planet_0");

    assert.strictEqual(ImageManager._system["img/characters/composite/human/male/bodies/walk.png"], compBmp);
    assert.strictEqual(ImageManager._cache["img/characters/Actors1.png"], charBmp);
    assert.strictEqual(ImageManager._cache["img/GUI/ship/planet_0.png"], guiBmp);

    ImageManager.clear();
    assert.strictEqual(compBmp._destroyed, false, "La brique composite en _system ne doit pas être détruite");
    assert.strictEqual(charBmp._destroyed, true, "Les autres assets en _cache doivent rester détruits au clear()");
    assert.strictEqual(guiBmp._destroyed, true, "Les images GUI/ship en _cache restent purgées au clear()");
});

test("Graphics._createLoadingSpinner adapte le spinner vanilla avec img/system/screwLoading.png", () => {
    Graphics._createLoadingSpinner();
    assert.ok(mockSpinnerImg.style.backgroundImage.includes("img/system/screwLoading.png"));
    assert.strictEqual(mockSpinnerImg.style.border, "none");
    assert.strictEqual(mockSpinnerImg.style.width, "64px");
    assert.strictEqual(mockSpinnerImg.style.height, "64px");
    assert.strictEqual(mockSpinnerImg.style.imageRendering, "pixelated");
});

test("Scene_Loading.scanCompositeEntries scanne réellement img/characters/composite/ et remplit _fileExistsCache", () => {
    Bitmap_Composite._fileExistsCache.clear();
    const entries = Scene_Loading.scanCompositeEntries();
    assert.ok(entries.length >= 100, `Attendu >= 100 assets composites réels, reçu ${entries.length}`);
    assert.ok(entries.every(e => e.url.startsWith("img/characters/composite/") && e.url.endsWith(".png")));
    assert.strictEqual(
        Bitmap_Composite._fileExistsCache.get(entries[0].folder + entries[0].filename),
        true,
        "_fileExistsCache doit être pré-rempli pendant le scan"
    );
});

test("Scene_Loading exécute création UI, chargement par lots, rotation screw, flèche néon sans écraser la pointe et transition", () => {
    Scene_Loading.resetPreloadState();
    ImageManager._system = {};
    errorLogs.length = 0;
    infoLogs.length = 0;

    const syntheticEntries = Array.from({ length: 12 }, (_, idx) => ({
        folder: "img/characters/composite/test/",
        filename: `sprite_${idx}`,
        url: `img/characters/composite/test/sprite_${idx}.png`
    }));
    Scene_Loading._customEntriesProvider = () => syntheticEntries;
    Scene_Loading.setNextSceneClass(Scene_Title);

    const loadingScene = new Scene_Loading();
    loadingScene.create();

    assert.strictEqual(loadingScene._queueIndex, 0, "create() ne doit pas lancer les requêtes avant start()");
    assert.strictEqual(loadingScene._screwSprite.x, 1760 - 68);
    assert.strictEqual(loadingScene._screwSprite.y, 990 - 68);

    loadingScene.start();
    assert.strictEqual(loadingScene._totalCount, 12);

    // Tick 1 : premier lot mis en file + rotation du logo
    loadingScene.update();
    assert.ok(loadingScene._screwSprite.rotation > 0, "screwLoading doit tourner à chaque frame");
    assert.ok(loadingScene._bitmaps.length >= 6, "Le premier lot doit être en file d'attente");

    // Marquer progressivement prêts (dont 1 en erreur pour vérifier Fail Fast sans blocage)
    for (let tick = 0; tick < 10; tick++) {
        loadingScene.update();
        loadingScene._bitmaps.forEach((bmp, i) => {
            bmp._loadingState = (i === 3) ? "error" : "loaded";
        });
    }

    assert.ok(errorLogs.some(e => e.msg.includes("sprite_3.png")), "Une image en erreur doit déclencher DEBUGTOOL.error");
    assert.ok(loadingScene._arrowBitmap.context.paths.length > 0, "La flèche néon doit être tracée sur le canvas");
    const lastPath = loadingScene._arrowBitmap.context.paths[loadingScene._arrowBitmap.context.paths.length - 1];
    const tipX = lastPath[0].x;
    const baseHeadX = lastPath[1].x;
    assert.strictEqual(tipX - baseHeadX, 16, "La pointe de la flèche néon doit rester exactement 16px sans écrasement");

    // Laisser écouler les frames de maintien jusqu'à finishLoading()
    for (let tick = 0; tick < 20 && !loadingScene._completed; tick++) {
        loadingScene.update();
    }

    assert.strictEqual(loadingScene._completed, true);
    assert.strictEqual(Scene_Loading.hasPreloadedComposites(), true);
    assert.ok(SceneManager._nextScene instanceof Scene_Title, "Doit transitionner vers _nextSceneClass (Scene_Title)");
    const texts = loadingScene._labelBitmap._recordedTexts;
    assert.ok(texts[texts.length - 1].includes("12 / 12   (100 %)"));

    loadingScene.terminate();
    assert.strictEqual(loadingScene._bgBitmap, null);
    assert.strictEqual(loadingScene._arrowBitmap, null);
    assert.strictEqual(loadingScene._screwSprite.bitmap._destroyed, false, "screwLoading.png en _system ne doit pas être détruit");

    Scene_Loading._customEntriesProvider = null;
});

test("Scene_Boot redirige le démarrage (normal et TitleSkip) vers Scene_Loading une seule fois", () => {
    Scene_Loading.resetPreloadState();
    ImageManager._system = {};

    const boot = new Scene_Boot();
    boot.loadSystemImages();
    assert.ok(ImageManager._system["img/system/screwLoading.png"], "Scene_Boot.loadSystemImages doit précharger screwLoading");

    // Mode Normal -> Scene_Loading -> Scene_Splash
    titleSkipFlag = false;
    boot.start();
    assert.ok(SceneManager._nextScene instanceof Scene_Loading);
    assert.strictEqual(Scene_Loading._nextSceneClass, Scene_Splash);

    // Mode TitleSkip -> Scene_Loading -> Scene_Map
    Scene_Loading.resetPreloadState();
    titleSkipFlag = true;
    boot.start();
    assert.ok(SceneManager._nextScene instanceof Scene_Loading);
    assert.strictEqual(Scene_Loading._nextSceneClass, Scene_Map);

    // Une fois déjà préchargé -> plus de redirection
    Scene_Loading._preloaded = true;
    titleSkipFlag = false;
    boot.start();
    assert.ok(SceneManager._nextScene instanceof Scene_Splash);
});

test("Sprite_Hero assemble immédiatement frame 0 si briques prêtes, ou garde l'ancien bitmap si asynchrone", () => {
    const walkBmp = new MockBitmap(288, 768);
    const atkBmp = new MockBitmap(384, 768);

    const readyComposer = {
        isReady: () => true,
        bltComposite: (dst) => { dst.resize(384, 768); }
    };
    const pendingComposer = {
        _ready: false,
        isReady() { return this._ready; },
        bltComposite: (dst) => { dst.resize(288, 768); }
    };

    const entries = {
        atk: { bitmap: atkBmp, composer: readyComposer, isComposed: false },
        hurt: { bitmap: new MockBitmap(288, 768), composer: pendingComposer, isComposed: false }
    };

    let currentAction = "walk";
    const mockHero = {
        character: {
            getCompositeCacheKey: (act) => `1_human_male_true_${act}_41`,
            getCompositeEntry: (act) => entries[act]
        }
    };
    const mockChar = {
        hero: () => mockHero,
        characterName: () => "",
        action: () => currentAction
    };

    const sprite = new Sprite_Hero(mockChar);
    sprite.bitmap = walkBmp;

    // 1. Transition atk avec briques déjà prêtes -> 0 frame vide
    currentAction = "atk";
    sprite._frame.width = 96;
    sprite.setHeroBitmap();
    assert.strictEqual(entries.atk.isComposed, true, "setHeroBitmap doit passer isComposed=true immédiatement");
    assert.strictEqual(sprite.bitmap, atkBmp);
    assert.strictEqual(sprite._frame.width, 0, "Le reset _frame.width=0 doit se déclencher avant updateFrame()");

    // 2. Transition hurt avec briques non prêtes -> conserve l'ancien sprite sans flash invisible
    currentAction = "hurt";
    sprite.setHeroBitmap();
    assert.strictEqual(entries.hurt.isComposed, false);
    assert.strictEqual(sprite.bitmap, atkBmp, "L'ancien bitmap doit rester visible tant que !isComposed");

    pendingComposer._ready = true;
    const prevUpdates = sprite._frameUpdatedCount || 0;
    sprite.updateCompositeAssembly();
    assert.strictEqual(entries.hurt.isComposed, true);
    assert.strictEqual(sprite.bitmap, entries.hurt.bitmap);
    assert.ok((sprite._frameUpdatedCount || 0) > prevUpdates, "updateFrame() doit rafraîchir le sprite dès la composition");
});

test("Alertes DEBUGTOOL.warn se déclenchent sans spam au dépassement des seuils cache", () => {
    warnLogs.length = 0;
    Bitmap_Composite._cache.clear();
    Bitmap_Composite._nextWarnEntryThreshold = 150;
    Bitmap_Composite._nextWarnRamMB = 250;

    for (let i = 0; i < 155; i++) {
        Bitmap_Composite._cache.set(`key_${i}`, { bitmap: new MockBitmap(288, 768), isComposed: true });
    }
    Bitmap_Composite.checkCacheWeightAlert();
    assert.strictEqual(warnLogs.length, 1, "Une alerte DEBUGTOOL.warn doit être émise au dépassement du seuil");

    Bitmap_Composite.checkCacheWeightAlert();
    assert.strictEqual(warnLogs.length, 1, "L'alerte ne doit pas spammer au tick suivant sous le prochain palier");

    // Vérification seuil Scene_Loading > 400 fichiers
    warnLogs.length = 0;
    const loading = new Scene_Loading();
    loading._totalCount = 420;
    loading._readyCount = 420;
    loading._errorCount = 0;
    loading._bitmaps = [new MockBitmap(288, 768)];
    loading.reportPreloadMemoryStats(250);
    assert.strictEqual(warnLogs.length, 1, "Scene_Loading doit alerter si >= 400 fichiers composites");
});

console.log("\n====================================================================");
console.log(`🎉 TOUS LES TESTS SCENE_LOADING / _SYSTEM VALIDÉS : ${passed}/${passed} !`);
console.log("====================================================================");

