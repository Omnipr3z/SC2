//=============================================================================
// UNIT TEST - Test Step 18: Mode Testing Fixes
// (GUI_Utils, OnBoard Ship Position Tracking & Continuous Orbital Physics)
//=============================================================================

const assert = require("assert");

// 1. Mock minimal environment
global.window = global;
global.Graphics = { frameCount: 120, width: 1760, height: 990 };
global.Utils = { approach: (c, t, s) => c + (t - c) * 0.1 };

// Charger les classes nécessaires
require("../js/plugins/SC4_GUI_Utils.js");
require("../js/plugins/SC4_Game_Spaceship.js");
require("../js/plugins/SC4_Game_Spaceships.js");
require("../js/plugins/SC4_Game_Date.js");
require("../js/plugins/SC4_Game_Planet.js");
require("../js/plugins/SC4_Game_PlanetarySystem.js");
require("../js/plugins/SC4_Game_Sector.js");
require("../js/plugins/SC4_SystemMapManager.js");

console.log("=== Début du Test Step 18 : Correctifs Mode Testing ===");

// ----------------------------------------------------------------------------
// Test 1 : SC4_GUI_Utils & fitContain
// ----------------------------------------------------------------------------
console.log("\n--- 1. Test SC4_GUI_Utils (contain centré) ---");
assert.ok(global.SC4_GUI_Utils, "SC4_GUI_Utils doit être défini");
assert.ok(global.GUI_Utils, "Alias GUI_Utils doit être défini");

// Image 1000x500 dans une boîte 100x50 (ratio identique)
const fit1 = SC4_GUI_Utils.fitContain(1000, 500, 100, 50);
assert.strictEqual(fit1.scale, 0.1, "L'échelle doit être 0.1");
assert.strictEqual(fit1.width, 100, "Largeur finale 100");
assert.strictEqual(fit1.height, 50, "Hauteur finale 50");
assert.strictEqual(fit1.x, 0, "Centrage X = 0");
assert.strictEqual(fit1.y, 0, "Centrage Y = 0");

// Image carrée 500x500 dans une boîte 100x50 (contraint par la hauteur)
const fit2 = SC4_GUI_Utils.fitContain(500, 500, 100, 50);
assert.strictEqual(fit2.scale, 0.1, "L'échelle doit être 0.1 (50/500)");
assert.strictEqual(fit2.width, 50, "Largeur finale 50");
assert.strictEqual(fit2.height, 50, "Hauteur finale 50");
assert.strictEqual(fit2.x, 25, "Centrage X = 25");
assert.strictEqual(fit2.y, 0, "Centrage Y = 0");

// Image large 1000x200 dans une boîte 100x50 (contraint par la largeur)
const fit3 = SC4_GUI_Utils.fitContain(1000, 200, 100, 50);
assert.strictEqual(fit3.scale, 0.1, "L'échelle doit être 0.1 (100/1000)");
assert.strictEqual(fit3.width, 100, "Largeur finale 100");
assert.strictEqual(fit3.height, 20, "Hauteur finale 20");
assert.strictEqual(fit3.x, 0, "Centrage X = 0");
assert.strictEqual(fit3.y, 15, "Centrage Y = (50 - 20) / 2 = 15");

console.log("✅ 1. Calculs contain et centrage SC4_GUI_Utils : OK");

// ----------------------------------------------------------------------------
// Test 2 : Synchronisation dynamique temps réel de la navette à bord (OnBoard)
// ----------------------------------------------------------------------------
console.log("\n--- 2. Synchronisation de position OnBoard ---");
const carrier = new Game_Spaceship({
    id: 2,
    name: "Vigilance Prime",
    category: "Patrol Cruiser",
    x: 480,
    y: 380,
    systemId: 1,
    sectorId: 1
});

const shuttle = new Game_Spaceship({
    id: 3,
    name: "Navette Test",
    category: "Shuttle",
    onBoard: "V2",
    x: 580,
    y: 380,
    systemId: 1,
    sectorId: 1
});

// Mock registre global
window.$gameSpaceships = {
    spaceships: () => [carrier, shuttle],
    ship: (id) => id === 2 ? carrier : (id === 3 ? shuttle : null)
};

// Vérification de la délégation dynamique en direct
assert.strictEqual(shuttle.x, 480, "La coordonnée X de la navette doit refléter celle du transporteur (480)");
assert.strictEqual(shuttle.y, 380, "La coordonnée Y de la navette doit refléter celle du transporteur (380)");

// Déplacement du transporteur
carrier.x = 920;
carrier.y = 640;
carrier.systemId = 4;
carrier.sectorId = 2;

assert.strictEqual(shuttle.x, 920, "Quand le transporteur bouge en X, la navette s'aligne immédiatement");
assert.strictEqual(shuttle.y, 640, "Quand le transporteur bouge en Y, la navette s'aligne immédiatement");
assert.strictEqual(shuttle.systemId, 4, "Quand le transporteur saute de système, la navette suit immédiatement");
assert.strictEqual(shuttle.sectorId, 2, "Quand le transporteur change de secteur, la navette suit immédiatement");

// Test de syncHostPosition pour synchroniser les attributs internes
shuttle.syncHostPosition();
assert.strictEqual(shuttle._x, 920, "L'attribut interne _x doit être synchronisé");
assert.strictEqual(shuttle._y, 640, "L'attribut interne _y doit être synchronisé");
assert.strictEqual(shuttle._systemId, 4, "L'attribut interne _systemId doit être synchronisé");

console.log("✅ 2. Synchronisation temps réel de position OnBoard : OK");

// ----------------------------------------------------------------------------
// Test 3 : Continuité mathématique des ticks orbitaux (zéro saccade)
// ----------------------------------------------------------------------------
console.log("\n--- 3. Continuité temporelle orbitale des planètes ---");
window.$dataTimeSystem = {
    start_timestamp: 100,
    tick_per_min: [0, 60, 30, 15, 5]
};
window.$gameDate = new Game_Date(100);
window.$gameDate.setScrollSpeedMode(2); // Vitesse x2 = 30 ticks par minute

const manager = new SystemMapManager();

// Simuler les ticks juste avant la bascule de minute
window.$gameDate._tick = 28;
const tickPerMin = window.$gameDate.getTickPerMin();
const progress28 = (window.$gameDate.timestamp + window.$gameDate._tick / tickPerMin) * 60;

// Frame suivante (tick 29)
window.$gameDate.passTick(); // _tick devient 29
const progress29 = (window.$gameDate.timestamp + window.$gameDate._tick / tickPerMin) * 60;
const diff28_29 = progress29 - progress28;
assert.strictEqual(Math.round(diff28_29), 2, "La progression doit être de 2 ticks par frame");

// Frame suivante (tick 30 -> minute passée, _tick réinitialisé à 0)
window.$gameDate.passTick(); // _tick passe à 30 -> passMin(1) -> timestamp = 101, _tick = 0
const progress30 = (window.$gameDate.timestamp + window.$gameDate._tick / tickPerMin) * 60;
const diff29_30 = progress30 - progress29;

assert.strictEqual(Math.round(diff29_30), 2, "La bascule de minute doit progresser d'exactement 2 ticks (aucune discontinuité !)");

console.log("✅ 3. Continuité des ticks orbitaux sans aucun bond/saccade : OK");

console.log("\n=== Tous les tests du Step 18 ont réussi avec succès ! ===");
