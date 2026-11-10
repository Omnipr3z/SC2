//=============================================================================
// UNIT TEST: Sprite_WeaponHUD & GuiManager Integration
// SC4/UNIT_TESTS/test_weapon_hud.js
//=============================================================================

const assert = require("assert");
const path = require("path");
const fs = require("fs");
const vm = require("vm");

console.log("=== RUNNING TESTS FOR SPRITE_WEAPONHUD (HUDBASE & GUIMANAGER) ===\n");

// 1. Mock de l'environnement RMMZ
global.window = global;

global.Rectangle = class Rectangle {
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
};

global.Bitmap = class Bitmap {
    constructor(w = 100, h = 100) {
        this.width = w;
        this.height = h;
        this.context = {
            save() {},
            restore() {},
            beginPath() {},
            closePath() {},
            moveTo() {},
            lineTo() {},
            arcTo() {},
            fill() {},
            stroke() {},
            fillRect() {},
            fillText() {},
            measureText(str) { return { width: (str || "").length * 8 }; },
            font: "",
            fillStyle: "",
            strokeStyle: "",
            lineWidth: 1,
            textAlign: "",
            shadowColor: "",
            shadowBlur: 0
        };
    }
    clear() {}
    blt() {}
};

global.Sprite = class Sprite {
    constructor(bitmap) {
        this.bitmap = bitmap || null;
        this.children = [];
        this.visible = true;
        this.x = 0;
        this.y = 0;
    }
    addChild(child) {
        this.children.push(child);
    }
    update() {}
};

global.Graphics = {
    boxWidth: 1280,
    boxHeight: 720
};

global.ImageManager = {
    loadSystem() { return { isReady: () => false }; },
    loadBitmap() { return new Bitmap(); }
};

global.SC4_Localization = {
    getText(key, def) { return def || key; }
};

// Mock Actor
const mockWeapon = { id: 10, name: "Pistolet Laser", iconIndex: 120 };
const mockStats = { name: "Pistolet Laser", reload: true, ammoCap: 15, iconIndex: 120 };

let currentAmmo = 15;
let currentReserve = 45;
let isPlayerReloading = false;

const mockLeader = {
    actorId: () => 1,
    name: () => "Mosay",
    combat: {
        gunfightWeapon: () => mockWeapon,
        gunfightStats: () => mockStats,
        getLoadedAmmo: () => currentAmmo,
        getReserveAmmo: () => currentReserve
    }
};

global.$gameParty = {
    leader: () => mockLeader
};

global.$gamePlayer = {
    isReloading: () => isPlayerReloading
};

// Chargement des plugins
const pluginsDir = path.resolve(__dirname, "../js/plugins");
[
    "SC4_Sprite_HudBase.js",
    "SC4_GuiManager.js",
    "SC4_Sprite_WeaponHUD.js"
].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(pluginsDir, f), "utf8")));

let passCount = 0;
function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ [PASS] ${name}`);
        passCount++;
    } catch (e) {
        console.error(`  ❌ [FAIL] ${name}:`, e.message);
        throw e;
    }
}

// ============================================================================
// SUITE 1 : HÉRITAGE ET VISIBILITÉ GUIMANAGER
// ============================================================================
console.log("--- 1. Héritage Sprite_HudBase & Visibilité GuiManager ---");

test("Sprite_WeaponHUD hérite bien de Sprite_HudBase", () => {
    const hud = new Sprite_WeaponHUD();
    assert(hud instanceof Sprite_HudBase);
    assert(hud instanceof Sprite);
});

test("Au démarrage, le WeaponHUD est masqué par défaut dans GuiManager", () => {
    assert.strictEqual(global.$guiManager.isWeaponHudVisible(), false);
    const hud = new Sprite_WeaponHUD();
    assert.strictEqual(hud.isSystemVisible(), false);
    assert.strictEqual(hud.needRedraw(), false);
});

test("Activation via $guiManager.showWeaponHud() active needRedraw()", () => {
    global.$guiManager.showWeaponHud();
    assert.strictEqual(global.$guiManager.isWeaponHudVisible(), true);
    const hud = new Sprite_WeaponHUD();
    assert.strictEqual(hud.isSystemVisible(), true);
    assert.strictEqual(hud.needRedraw(), true);
});

test("toggleWeaponHud() bascule l'état proprement", () => {
    global.$guiManager.toggleWeaponHud(); // passe à false
    assert.strictEqual(global.$guiManager.isWeaponHudVisible(), false);
    global.$guiManager.toggleWeaponHud(); // repasse à true
    assert.strictEqual(global.$guiManager.isWeaponHudVisible(), true);
});

test("hideAllHuds() et showAllHuds() contrôlent le WeaponHUD en lot", () => {
    global.$guiManager.hideAllHuds();
    assert.strictEqual(global.$guiManager.isWeaponHudVisible(), false);
    assert.strictEqual(global.$guiManager.isPlayerHudVisible(), false);

    global.$guiManager.showAllHuds();
    assert.strictEqual(global.$guiManager.isWeaponHudVisible(), true);
    assert.strictEqual(global.$guiManager.isPlayerHudVisible(), true);
});

// ============================================================================
// SUITE 2 : POSITIONNEMENT ET DIMENSIONS MODULAIRES
// ============================================================================
console.log("\n--- 2. Positionnement & Rectangles Modulaires ---");

test("Ancrage correct en bas à droite de l'écran avec marge de 20px", () => {
    const hud = new Sprite_WeaponHUD();
    const rect = hud.hudRect;
    assert.strictEqual(rect.width, 240);
    assert.strictEqual(rect.height, 68);
    assert.strictEqual(rect.x, 1280 - 240 - 20); // 1020
    assert.strictEqual(rect.y, 720 - 68 - 20);   // 632
});

test("Méthodes de sous-rectangles modulaires disponibles", () => {
    const hud = new Sprite_WeaponHUD();
    assert(hud.backgroundRect() instanceof Rectangle);
    assert(hud.iconRect() instanceof Rectangle);
    assert(hud.nameRect() instanceof Rectangle);
    assert(hud.ammoRect() instanceof Rectangle);
    assert(hud.statusRect() instanceof Rectangle);

    // Hooks prêts pour l'évolution Recovery
    assert(hud.bulletGaugeRect() instanceof Rectangle);
    assert(hud.reservePacksRect() instanceof Rectangle);
    assert(hud.secondaryWeaponRect() instanceof Rectangle);
    assert(hud.tacticalBeltRect() instanceof Rectangle);
});

// ============================================================================
// SUITE 3 : GESTION DES STYLES ET RENDU DYNAMIQUE
// ============================================================================
console.log("\n--- 3. Styles & Réactivité Graphique ---");

test("styleBackground() bascule en bordure alerte rouge si le chargeur est vide", () => {
    currentAmmo = 10;
    const hud = new Sprite_WeaponHUD();
    let style = hud.styleBackground();
    assert.strictEqual(style.strokeColor, "rgba(70, 110, 160, 0.4)");

    currentAmmo = 0; // vide !
    style = hud.styleBackground();
    assert.strictEqual(style.strokeColor, "rgba(239, 68, 68, 0.7)");
});

test("styleAmmo() adapte la couleur de la munition selon le seuil", () => {
    const hud = new Sprite_WeaponHUD();
    const ctx = hud.bitmap.context;

    hud.styleAmmo(ctx, 15, 15);
    assert.strictEqual(ctx.fillStyle, "#4ade80"); // Vert

    hud.styleAmmo(ctx, 3, 15); // <= 25% (3.75)
    assert.strictEqual(ctx.fillStyle, "#f59e0b"); // Orange

    hud.styleAmmo(ctx, 0, 15);
    assert.strictEqual(ctx.fillStyle, "#ef4444"); // Rouge
});

test("drawHud() s'exécute sans erreur et met à jour le cache", () => {
    currentAmmo = 12;
    const hud = new Sprite_WeaponHUD();
    hud.refreshHud();
    assert.strictEqual(hud._cache.loaded, 12);
    assert.strictEqual(hud._cache.reserve, 45);
    assert.strictEqual(hud._cache.weaponName, "Pistolet Laser");
});

console.log("\n==================================================");
console.log(`RÉSULTAT GLOBAL : ${passCount}/10 tests validés avec succès !`);
console.log("==================================================");

