//=============================================================================
// SimCraft 4 - Unit Tests : Allégeance de faction (Acteurs, Planètes, Vaisseaux)
// test_step24_faction_allegiance.js
//=============================================================================
// Couvre :
//  - Game_Actor.factionId() via notetag <factionId: X> (0/absent = null)
//  - Game_Actor.setFactionId() (défection runtime)
//  - Game_Planet.governorId / spaceControllerId / governorFactionId()
//  - Game_Spaceship.setActorProperty() (propriétaire ≠ capitaine) + persistance
//  - SC4_RelationManager.getActorFactionId() délègue à Game_Actor.factionId()
//  - Intégrité des données : Actors.json (51/52) et PLANETS.json (Ankaros Prime)
//=============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("==============================================================");
console.log("   TEST STEP 24: Allégeance de faction (Acteurs/Planètes/Vaisseaux)");
console.log("==============================================================\n");

// 1. Mocks minimaux RMMZ (même harnais que test_step20)
global.window = global;
global.Graphics = { frameCount: 0, width: 1760, height: 990 };
global.DEBUGTOOL = { log: () => {} };

global.Game_CharacterBase = class { constructor() { this.initMembers(); } initMembers() {} };
global.Game_Character = class extends global.Game_CharacterBase {};
global.Game_Player = class extends global.Game_Character {};
global.Game_Follower = class extends global.Game_Character { actor() { return null; } };
global.Game_Event = class extends global.Game_Character {};
global.Game_Map = class {};
global.Game_Actor = class {
    constructor(id) { this._actorId = id; }
    actorId() { return this._actorId; }
    actor() { return $dataActors[this._actorId]; }
};
global.Game_Actors = class {
    constructor() { this._data = []; }
    actor(id) { return this._data[id]; }
};
global.Game_Action = class {};
global.Game_Hero = class extends global.Game_Actor {};
global.Game_Interpreter = class {};
global.PluginManager = { registerCommand: () => {} };
global.SceneManager = { push: () => {}, pop: () => {} };
global.TouchInput = { isRightPressed: () => false };

global.$dataActors = [
    null,
    { id: 1, name: "Héros", note: "<Hero>" },
    { id: 2, name: "Sans tag", note: "" },
    { id: 3, name: "Tag zéro", note: "<factionId: 0>" },
    { id: 4, name: "Saurien", note: "<Race: Saurion>\n<factionId: 3>" }
];
$dataActors[51] = { id: 51, name: "Gouverneur", note: "<factionId: 1>" };
$dataActors[52] = { id: 52, name: "Contrôleur", note: "<factionId: 1>" };

require("../js/plugins/SC4_rmmz_objects_Patches.js");

// Après le patch, Game_Actors.actor instancie les acteurs à partir de $dataActors
global.$gameActors = new Game_Actors();

require("../js/plugins/SC4_Game_Planet.js");
require("../js/plugins/SC4_Game_Spaceship.js");
require("../js/plugins/SC4_RelationManager.js");

let passed = 0;
function test(name, fn) {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
}

// ----------------------------------------------------------------------------
// A. Game_Actor
// ----------------------------------------------------------------------------
console.log("A. Game_Actor.factionId()");

test("Notetag <factionId: 3> lu correctement", () => {
    assert.strictEqual($gameActors.actor(4).factionId(), 3);
});
test("Notetag absent → null (sans allégeance)", () => {
    assert.strictEqual($gameActors.actor(2).factionId(), null);
});
test("Notetag <factionId: 0> → null (sans allégeance)", () => {
    assert.strictEqual($gameActors.actor(3).factionId(), null);
});
test("setFactionId() change l'allégeance (défection) et 0 la retire", () => {
    const a = $gameActors.actor(4);
    a.setFactionId(5);
    assert.strictEqual(a.factionId(), 5);
    a.setFactionId(0);
    assert.strictEqual(a.factionId(), null);
    a.setFactionId(3);
});

// ----------------------------------------------------------------------------
// B. Game_Planet
// ----------------------------------------------------------------------------
console.log("B. Game_Planet gouverneur / contrôleur spatial");

test("governorId / spaceControllerId lus depuis les données", () => {
    const p = new Game_Planet({ id: 5, name: "Ankaros Prime", governorId: 51, spaceControllerId: 52 }, 0);
    assert.strictEqual(p.governorId, 51);
    assert.strictEqual(p.spaceControllerId, 52);
    assert.strictEqual(p.governor().actorId(), 51);
    assert.strictEqual(p.spaceController().actorId(), 52);
});
test("governorFactionId() = factionId de l'acteur gouverneur", () => {
    const p = new Game_Planet({ id: 5, governorId: 51 }, 0);
    assert.strictEqual(p.governorFactionId(), 1);
});
test("Planète sans gouverneur → null partout", () => {
    const p = new Game_Planet({ id: 9, governorId: null }, 0);
    assert.strictEqual(p.governorId, null);
    assert.strictEqual(p.spaceControllerId, null);
    assert.strictEqual(p.governor(), null);
    assert.strictEqual(p.governorFactionId(), null);
});

// ----------------------------------------------------------------------------
// C. Game_Spaceship.setActorProperty
// ----------------------------------------------------------------------------
console.log("C. Game_Spaceship.setActorProperty()");

test("Le vaisseau prend la faction du propriétaire, le capitaine est inchangé", () => {
    const s = new Game_Spaceship({ id: 1, name: "Test", captainId: 1, factionId: 1 });
    s.setActorProperty(4);
    assert.strictEqual(s.ownerActorId, 4);
    assert.strictEqual(s.factionId, 3);
    assert.strictEqual(s.captainId, 1);
});
test("Propriétaire sans allégeance → factionId null (pas de fallback texte)", () => {
    const s = new Game_Spaceship({ id: 2, name: "Test", faction: "Flotte humaine" });
    s.setActorProperty(2);
    assert.strictEqual(s.factionId, null);
    assert.strictEqual(s.faction, "Sans allégeance");
});
test("setActorProperty(0) retire le propriétaire", () => {
    const s = new Game_Spaceship({ id: 3, name: "Test" });
    s.setActorProperty(51);
    s.setActorProperty(0);
    assert.strictEqual(s.ownerActorId, null);
    assert.strictEqual(s.owner, null);
});
test("Propriétaire et faction persistés (save/load)", () => {
    const s = new Game_Spaceship({ id: 4, name: "Test" });
    s.setActorProperty(4);
    const save = JSON.parse(JSON.stringify(s.makeSavefileData()));
    const s2 = new Game_Spaceship({ id: 4, name: "Test", factionId: 1 });
    s2.loadSavefileData(save);
    assert.strictEqual(s2.ownerActorId, 4);
    assert.strictEqual(s2.factionId, 3);
});
test("Ancienne sauvegarde sans ownerActorId → valeurs des données conservées", () => {
    const s = new Game_Spaceship({ id: 5, name: "Test", factionId: 2 });
    s.loadSavefileData({ x: 10, y: 10 });
    assert.strictEqual(s.ownerActorId, null);
    assert.strictEqual(s.factionId, 2);
});

// ----------------------------------------------------------------------------
// D. RelationManager
// ----------------------------------------------------------------------------
console.log("D. SC4_RelationManager délègue à Game_Actor");

test("getActorFactionId() utilise Game_Actor.factionId()", () => {
    const RM = global.RelationManager || global.SC4_RelationManager;
    const mgr = (typeof RM === "function") ? new RM() : (global.$relationManager || RM);
    assert.ok(mgr && typeof mgr.getActorFactionId === "function", "RelationManager introuvable");
    assert.strictEqual(mgr.getActorFactionId(51), 1);
    assert.strictEqual(mgr.getActorFactionId(2), 0);
    mgr.setActorFactionId(52, 4);
    assert.strictEqual($gameActors.actor(52).factionId(), 4);
    assert.strictEqual(mgr.getActorFactionId(52), 4);
});

// ----------------------------------------------------------------------------
// E. Intégrité des données réelles
// ----------------------------------------------------------------------------
console.log("E. Intégrité des données (Actors.json / PLANETS.json)");

const root = path.resolve(__dirname, "..");
const actors = JSON.parse(fs.readFileSync(path.join(root, "data/Actors.json"), "utf8"));
const planets = JSON.parse(fs.readFileSync(path.join(root, "data/SC/PLANETS.json"), "utf8"));

test("Actors.json : tableau contigu, id === index", () => {
    actors.forEach((a, i) => { if (i > 0) assert.strictEqual(a && a.id, i, `Acteur index ${i}`); });
});
test("Actors.json : gouverneur 51 et contrôleur 52 avec <factionId: 1>", () => {
    assert.ok(/<factionId:\s*1>/.test(actors[51].note));
    assert.ok(/<factionId:\s*1>/.test(actors[52].note));
});
test("PLANETS.json : chaque planète a governorId et spaceControllerId", () => {
    planets.forEach(p => {
        if (!p) return;
        assert.ok("governorId" in p && "spaceControllerId" in p, `Planète ${p.id}`);
    });
});
test("PLANETS.json : Ankaros Prime (5) → gouverneur 51 / contrôleur 52", () => {
    const p = planets.find(e => e && e.id === 5);
    assert.strictEqual(p.governorId, 51);
    assert.strictEqual(p.spaceControllerId, 52);
});

console.log(`\n🎉 ${passed} tests réussis.`);
