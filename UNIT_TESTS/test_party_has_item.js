//=============================================================================
// UNIT TEST : Game_Party.prototype.hasItem (Multi-Inventaires Membres A_<id>)
//=============================================================================
// Vérifie que :
// 1. $gameParty.hasItem(item, includeEquip) détecte :
//    - l'inventaire commun ($gameParty)
//    - les équipements portés si includeEquip === true
//    - les sacs personnels (A_<actorId>) des membres actifs du groupe
//    sans inclure les sacs d'acteurs hors groupe ni les conteneurs C_ / E_.
// 2. Les Conditions de l'éditeur RMMZ (command111 cas 8/9/10 et meetsConditions)
//    bénéficient automatiquement du patch.
// 3. $gameParty.numItems(item) et allItems() restent strictement centrés sur
//    l'inventaire commun ($gameParty) pour préserver Scene_Inventory & le poids.
// 4. tradeItemWithParty et consumeItem retirent proprement depuis A_<id> si
//    absent de $gameParty (zéro duplication) et hasItem(id) alerte sans deviner.
//=============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT_DIR = path.resolve(__dirname, "..");

const warnMessages = [];
const sandbox = {
    console
};
sandbox.window = sandbox;
sandbox.global = sandbox;

sandbox.DEBUGTOOL = {
    log: () => {},
    info: () => {},
    warn: (msg, key) => warnMessages.push({ msg, key }),
    error: () => {}
};
sandbox.SC4_Localization = {
    parse: s => s,
    getText: (_k, d) => d
};
sandbox.PluginManager = {
    parameters: () => ({}),
    registerCommand: () => {}
};
sandbox.Utils = {
    RPGMAKER_NAME: "MZ",
    isOptionValid: () => false
};
sandbox.SoundManager = {};
sandbox.TextManager = { partyName: "%1's Party" };
sandbox.ConfigManager = {};
sandbox.StorageManager = {};
sandbox.ImageManager = { loadSystem: () => {}, isObjectCharacter: () => false };
sandbox.AudioManager = {};
sandbox.SceneManager = { _scene: null };
sandbox.TouchInput = {};
sandbox.Input = { isPressed: () => false, isTriggered: () => false, isRepeated: () => false };
sandbox.Graphics = { width: 1760, height: 990, boxWidth: 1760, boxHeight: 990 };

// Stubs minimaux requis par SC4_rmmz_objects_Patches.js hors classes testées
sandbox.Color = { WHITE: 0 };
sandbox.Point = class Point { constructor(x = 0, y = 0) { this.x = x; this.y = y; } };
sandbox.Rectangle = class Rectangle { constructor(x = 0, y = 0, w = 0, h = 0) { this.x = x; this.y = y; this.width = w; this.height = h; } };
sandbox.Spriteset_Map = class {};
sandbox.Sprite_Character = class {};

// Chargement de DataManager minimal (sans dépendance DOM/NW)
sandbox.DataManager = {
    isSkill: item => Boolean(item && item.stypeId !== undefined),
    isItem: item => Boolean(item && item.itypeId !== undefined),
    isWeapon: item => Boolean(item && item.wtypeId !== undefined),
    isArmor: item => Boolean(item && item.atypeId !== undefined),
    isBattleTest: () => false,
    isEventTest: () => false,
    itemWeight: () => 1,
    itemStockWeight: () => 1,
    itemWornWeight: () => 0,
    itemWeightBonus: () => 0
};

// Charge les classes vanilla rmmz_objects.js (Game_Party, Game_Actor, Game_Interpreter, Game_Event, etc.)
vm.createContext(sandbox);
vm.runInContext(`
    Number.prototype.clamp = function(min, max) {
        return Math.min(Math.max(this, min), max);
    };
    Array.prototype.remove = function(element) {
        const idx = this.indexOf(element);
        if (idx >= 0) this.splice(idx, 1);
        return this;
    };
`, sandbox);
const loadPlugin = (relPath) => {
    const code = fs.readFileSync(path.join(ROOT_DIR, relPath), "utf8");
    vm.runInContext(code, sandbox, { filename: relPath });
};

loadPlugin("js/rmmz_objects.js");
loadPlugin("js/plugins/SC4_Game_Inventory.js");
loadPlugin("js/plugins/SC4_Game_Inventories.js");
loadPlugin("js/plugins/SC4_Game_ScActorEquipment.js");
loadPlugin("js/plugins/SC4_Game_ScActorInventory.js");
loadPlugin("js/plugins/SC4_Game_ScActor.js");
loadPlugin("js/plugins/SC4_rmmz_objects_Patches.js");

// Jeu de données minimal
sandbox.$dataSystem = {
    partyMembers: [1, 2],
    equipTypes: ["", "Arme", "Bouclier", "Tête", "Corps", "Accessoire"],
    boat: { startMapId: 0, startX: 0, startY: 0, characterName: "", characterIndex: 0 },
    ship: { startMapId: 0, startX: 0, startY: 0, characterName: "", characterIndex: 0 },
    airship: { startMapId: 0, startX: 0, startY: 0, characterName: "", characterIndex: 0 }
};
sandbox.$dataClasses = [null, { id: 1, name: "Soldat", expParams: [30, 20, 30, 30], learnings: [], traits: [{ code: 51, dataId: 1, value: 1 }, { code: 52, dataId: 1, value: 1 }], params: [[0, 100], [0, 10], [0, 10], [0, 10], [0, 10], [0, 10], [0, 10], [0, 10]] }];
sandbox.$dataActors = [
    null,
    { id: 1, name: "Héros", nickname: "", profile: "", classId: 1, initialLevel: 1, maxLevel: 99, equips: [0, 0, 0, 0, 0], note: "<Hero>", traits: [], characterName: "", characterIndex: 0, faceName: "", faceIndex: 0, battlerName: "" },
    { id: 2, name: "Compagnon", nickname: "", profile: "", classId: 1, initialLevel: 1, maxLevel: 99, equips: [0, 0, 0, 0, 0], note: "", traits: [], characterName: "", characterIndex: 0, faceName: "", faceIndex: 0, battlerName: "" },
    { id: 3, name: "Externe", nickname: "", profile: "", classId: 1, initialLevel: 1, maxLevel: 99, equips: [0, 0, 0, 0, 0], note: "", traits: [], characterName: "", characterIndex: 0, faceName: "", faceIndex: 0, battlerName: "" }
];
sandbox.$dataItems = [
    null,
    { id: 1, name: "Badge Commun", itypeId: 1, consumable: false, note: "" },
    { id: 2, name: "Carte Accès A_1", itypeId: 1, consumable: false, note: "" },
    { id: 3, name: "Stimulant A_2", itypeId: 1, consumable: true, note: "" },
    { id: 4, name: "Objet Coffre/Externe", itypeId: 1, consumable: false, note: "" }
];
sandbox.$dataWeapons = [
    null,
    { id: 1, name: "Pistolet Laser", wtypeId: 1, etypeId: 1, traits: [], params: [0, 0, 10, 0, 0, 0, 0, 0], note: "" },
    { id: 2, name: "Fusil Équipé", wtypeId: 1, etypeId: 1, traits: [], params: [0, 0, 20, 0, 0, 0, 0, 0], note: "" }
];
sandbox.$dataArmors = [
    null,
    { id: 1, name: "Gilet Tactique", atypeId: 1, etypeId: 4, traits: [], params: [0, 0, 0, 10, 0, 0, 0, 0], note: "" },
    { id: 2, name: "Casque Équipé", atypeId: 1, etypeId: 3, traits: [], params: [0, 0, 0, 5, 0, 0, 0, 0], note: "" }
];
sandbox.$dataInventories = {
    A_1: [{ item_id: 2, quantity: 1 }],
    A_2: [{ item_id: 3, quantity: 2 }, { weapon_id: 1, quantity: 1 }, { armor_id: 1, quantity: 1 }],
    A_3: [{ item_id: 4, quantity: 5 }],
    C_1: [{ item_id: 4, quantity: 3 }]
};

vm.runInContext(`
    $gameSystem = new Game_System();
    $gameTemp = new Game_Temp();
    $gameSwitches = new Game_Switches();
    $gameVariables = new Game_Variables();
    $gameSelfSwitches = new Game_SelfSwitches();
    $gameActors = new Game_Actors();
    $gameParty = new Game_Party();
    $gamePlayer = new Game_Player();
    $gameMap = new Game_Map();
    $inventories = new Game_Inventories();
    $gameParty.setupStartingMembers();
`, sandbox);

let passed = 0;
function runTest(label, fn) {
    try {
        fn();
        console.log(`  ✅ ${label}`);
        passed++;
    } catch (err) {
        console.error(`  ❌ ${label}: ${err.message}`);
        throw err;
    }
}

console.log("====================================================================");
console.log(" TEST UNITAIRE : PATCH Game_Party.prototype.hasItem (A_<actorId>)   ");
console.log("====================================================================");

runTest("hasItem détecte l'inventaire commun ($gameParty) ainsi que les équipements portés si includeEquip=true", () => {
    const commonItem = sandbox.$dataItems[1];
    const eqWeapon = sandbox.$dataWeapons[2];
    const eqArmor = sandbox.$dataArmors[2];

    assert.strictEqual(sandbox.$gameParty.hasItem(commonItem, false), false);
    sandbox.$gameParty.gainItem(commonItem, 1);
    assert.strictEqual(sandbox.$gameParty.hasItem(commonItem, false), true);

    const hero = sandbox.$gameActors.actor(1);
    hero.forceChangeEquip(0, eqWeapon);
    hero.forceChangeEquip(2, eqArmor);

    assert.strictEqual(sandbox.$gameParty.hasItem(eqWeapon, false), false);
    assert.strictEqual(sandbox.$gameParty.hasItem(eqWeapon, true), true);
    assert.strictEqual(sandbox.$gameParty.hasItem(eqArmor, false), false);
    assert.strictEqual(sandbox.$gameParty.hasItem(eqArmor, true), true);
    assert.strictEqual(sandbox.$gameParty.hasItem(null, true), false);
});

runTest("hasItem détecte les objets, armes et armures dans les sacs A_<id> des membres du groupe uniquement", () => {
    const itemA1 = sandbox.$dataItems[2];
    const itemA2 = sandbox.$dataItems[3];
    const weaponA2 = sandbox.$dataWeapons[1];
    const armorA2 = sandbox.$dataArmors[1];
    const itemOutside = sandbox.$dataItems[4];

    // A_1 (leader) & A_2 (membre actif)
    assert.strictEqual(sandbox.$gameParty.hasItem(itemA1, false), true);
    assert.strictEqual(sandbox.$gameParty.hasItem(itemA2, false), true);
    assert.strictEqual(sandbox.$gameParty.hasItem(weaponA2, false), true);
    assert.strictEqual(sandbox.$gameParty.hasItem(armorA2, false), true);

    // A_3 (acteur hors groupe) et C_1 (coffre) NE doivent PAS être comptés
    sandbox.$inventories.inventory("C_1");
    assert.strictEqual(sandbox.$gameParty.hasItem(itemOutside, false), false);
    assert.strictEqual(sandbox.$gameParty.hasItem(itemOutside, true), false);

    // Si on retire l'objet de A_1, hasItem repasse à false
    sandbox.$inventories.inventory("A_1").loseItem(itemA1, 1);
    assert.strictEqual(sandbox.$gameParty.hasItem(itemA1, false), false);
});

runTest("numItems et allItems restent strictement centrés sur l'inventaire commun (intégrité Scene_Inventory)", () => {
    const itemA2 = sandbox.$dataItems[3];
    assert.strictEqual(sandbox.$gameParty.numItems(itemA2), 0);
    assert.strictEqual(sandbox.$gameParty.allItems().includes(itemA2), false);
});

runTest("Les Conditions éditeur (command111 Item/Arme/Armure & meetsConditions) détectent A_<id>", () => {
    const interp = new sandbox.Game_Interpreter();
    interp.setup([
        { code: 111, indent: 0, parameters: [] },
        { code: 0, indent: 0, parameters: [] }
    ]);

    // Case 8 : Objet 3 (dans A_2)
    interp._index = 0;
    interp._branch = {};
    interp._indent = 0;
    interp.command111([8, 3]);
    assert.strictEqual(interp._branch[0], true);

    // Case 9 : Arme 1 (dans A_2), includeEquip = false
    interp._index = 0;
    interp._branch = {};
    interp._indent = 0;
    interp.command111([9, 1, false]);
    assert.strictEqual(interp._branch[0], true);

    // Case 10 : Armure 1 (dans A_2), includeEquip = false
    interp._index = 0;
    interp._branch = {};
    interp._indent = 0;
    interp.command111([10, 1, false]);
    assert.strictEqual(interp._branch[0], true);

    // Case 8 : Objet 4 (uniquement A_3 / C_1 -> hors groupe) -> false
    interp._index = 0;
    interp._branch = {};
    interp._indent = 0;
    interp.command111([8, 4]);
    assert.strictEqual(interp._branch[0], false);

    // Condition de page d'événement (meetsConditions -> itemValid)
    const ev = Object.create(sandbox.Game_Event.prototype);
    ev._mapId = 1;
    ev._eventId = 1;
    const page = { conditions: { itemValid: true, itemId: 3 } };
    assert.strictEqual(ev.meetsConditions(page), true);
    assert.strictEqual(ev.meetsConditions({ conditions: { itemValid: true, itemId: 4 } }), false);
});

runTest("hasItem(idNumérique) avertit via DEBUGTOOL.warn et retourne false (Fail Fast sans deviner)", () => {
    warnMessages.length = 0;
    const res = sandbox.$gameParty.hasItem(4, false);
    assert.strictEqual(res, false);
    assert.ok(warnMessages.some(w => w.key === "INVENTORY" && w.msg.includes("4")));
});

runTest("consumeItem et tradeItemWithParty consomment dans A_<id> sans duplication si absent de $gameParty", () => {
    const stim = sandbox.$dataItems[3]; // 2 unités dans A_2, 0 dans $gameParty
    const laser = sandbox.$dataWeapons[1]; // 1 unité dans A_2, 0 dans $gameParty
    const oldWeapon = sandbox.$dataWeapons[2]; // Équipé sur acteur 1

    assert.strictEqual(sandbox.$inventories.inventory("A_2").numItems(stim), 2);
    sandbox.$gameParty.consumeItem(stim);
    assert.strictEqual(sandbox.$inventories.inventory("A_2").numItems(stim), 1);

    const hero = sandbox.$gameActors.actor(1);
    const traded = hero.tradeItemWithParty(laser, oldWeapon);
    assert.strictEqual(traded, true);
    assert.strictEqual(sandbox.$inventories.inventory("A_2").numItems(laser), 0);
    assert.strictEqual(sandbox.$gameParty.numItems(oldWeapon), 1);

    // Intégration complète avec Game_ScActorEquipment.equip() depuis A_1 du leader
    const armorA1 = sandbox.$dataArmors[1];
    const oldArmor = sandbox.$dataArmors[2]; // Équipé en tête (slot 2) ; armureA1 va en corps (slot 3)
    sandbox.$inventories.inventory("A_1").gainItem(armorA1, 1);
    assert.strictEqual(sandbox.$gameParty.numItems(armorA1), 0);
    assert.strictEqual(sandbox.$inventories.inventory("A_1").numItems(armorA1), 1);
    const equippedOk = hero.equipment.equip(armorA1);
    assert.strictEqual(equippedOk, true);
    assert.strictEqual(hero.equips()[3], armorA1);
    assert.strictEqual(sandbox.$inventories.inventory("A_1").numItems(armorA1), 0);
    assert.strictEqual(sandbox.$gameParty.numItems(armorA1), 0);
    // Remplacement sur même slot remet l'ancien objet dans $gameParty sans duplication
    sandbox.$inventories.inventory("A_1").gainItem(oldArmor, 1);
    const swapOk = hero.equipment.equip(oldArmor);
    assert.strictEqual(swapOk, true);
    assert.strictEqual(hero.equips()[2], oldArmor);
    assert.strictEqual(sandbox.$inventories.inventory("A_1").numItems(oldArmor), 0);
});

console.log(`\n🎉 TOUS LES TESTS PATCH Game_Party.hasItem VALIDÉS : ${passed}/${passed} !\n`);
