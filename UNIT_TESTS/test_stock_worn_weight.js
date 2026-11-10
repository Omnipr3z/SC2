//=============================================================================
// TEST : Poids en Stock vs Poids Équipé (Charge Négative & Poids Résiduel)
//=============================================================================

const assert = require("assert");
const path = require("path");
const fs = require("fs");

console.log("==============================================================");
console.log("   TEST : Poids en Stock vs Poids Porté (SC4)                 ");
console.log("==============================================================");

// ----------------------------------------------------------------------------
// 1. MOCKS ENVIRONNEMENT
// ----------------------------------------------------------------------------
global.Graphics = { boxWidth: 1280, boxHeight: 720 };
global.Rectangle = class {
    constructor(x, y, w, h) { this.x = x || 0; this.y = y || 0; this.width = w || 0; this.height = h || 0; }
};
global.Bitmap = class {
    constructor(w, h) { this.width = w || 0; this.height = h || 0; }
    clear() {}
    drawText() {}
};
global.Window_Base = class {
    constructor(rect) {
        this.x = rect.x; this.y = rect.y; this.width = rect.width; this.height = rect.height;
        this.padding = 12;
        this.contents = new global.Bitmap(this.innerWidth, this.innerHeight);
    }
    get innerWidth() { return this.width - this.padding * 2; }
    get innerHeight() { return this.height - this.padding * 2; }
    changeTextColor() {}
    resetTextColor() {}
    drawText() {}
    hide() { this.visible = false; }
    show() { this.visible = true; }
};
global.DataManager = {
    isWeapon: item => item && item.wtypeId !== undefined,
    isArmor: item => item && item.atypeId !== undefined
};
global.TextManager = { param: id => `Param_${id}` };
global.ColorManager = { systemColor: () => "#b4dcff" };
global.JsonEx = { makeDeepCopy: obj => JSON.parse(JSON.stringify(obj)) };
global.window = global;

// ----------------------------------------------------------------------------
// 2. CHARGEMENT DU CODE SOUS TEST
// ----------------------------------------------------------------------------
const dmPath = path.join(__dirname, "../js/plugins/SC4_DataManager.js");
const comparePath = path.join(__dirname, "../js/plugins/SC4_Window_InventoryCompare.js");

const dmCode = fs.readFileSync(dmPath, "utf8");
eval(dmCode);

const compareCode = fs.readFileSync(comparePath, "utf8");
eval(compareCode);

let passed = 0;
function test(name, fn) {
    try {
        fn();
        console.log(`  [OK] ${name}`);
        passed++;
    } catch (e) {
        console.error(`  [FAIL] ${name}:`, e.message);
        throw e;
    }
}

// ----------------------------------------------------------------------------
// Section A: Résolution des Poids dans DataManager
// ----------------------------------------------------------------------------
console.log("\n--- Section A: Notetags & Méthodes DataManager ---");

test("A1: itemStockWeight résout le poids de stockage", () => {
    // 1. Sans notetag -> 1 UM par défaut
    assert.strictEqual(DataManager.itemStockWeight({}), 1);

    // 2. Notetag <weight: 4> standard
    assert.strictEqual(DataManager.itemStockWeight({ note: "<weight: 4>" }), 4);

    // 3. Notetag <stockWeight: 2> explicite
    assert.strictEqual(DataManager.itemStockWeight({ note: "<stockWeight: 2> <weight: -5>" }), 2);

    // 4. Notetag négatif seul <weight: -5> -> 1 UM en stock (poids matière)
    assert.strictEqual(DataManager.itemStockWeight({ note: "<weight: -5>" }), 1);
});

test("A2: itemWornWeight résout le poids résiduel sur le corps", () => {
    // 1. Équipement standard sans wornWeight -> 0 UM (annulé sur le corps)
    assert.strictEqual(DataManager.itemWornWeight({ note: "<weight: 10>" }), 0);

    // 2. Armure avec <wornWeight: 3>
    assert.strictEqual(DataManager.itemWornWeight({ note: "<weight: 12> <wornWeight: 3>" }), 3);

    // 3. Armure avec <equippedWeight: 2.5>
    assert.strictEqual(DataManager.itemWornWeight({ note: "<equippedWeight: 2.5>" }), 2.5);
});

test("A3: itemWeightBonus résout l'allègement ou l'augmentation de capacité", () => {
    // 1. Sac avec <weightBonus: 10>
    assert.strictEqual(DataManager.itemWeightBonus({ note: "<stockWeight: 2> <weightBonus: 10>" }), 10);

    // 2. Harnais avec <weightCapacityBonus: 8>
    assert.strictEqual(DataManager.itemWeightBonus({ note: "<weightCapacityBonus: 8>" }), 8);

    // 3. Exosquelette avec charge négative <weight: -6>
    assert.strictEqual(DataManager.itemWeightBonus({ note: "<weight: -6>" }), 6);

    // 4. Armure standard -> 0 bonus
    assert.strictEqual(DataManager.itemWeightBonus({ note: "<weight: 12>" }), 0);
});

// ----------------------------------------------------------------------------
// Section B: Prévisualisation dans Window_InventoryCompare
// ----------------------------------------------------------------------------
console.log("\n--- Section B: Window_InventoryCompare Prévisualisation ---");

test("B1: Compare affiche les données d'armure lourde avec poids résiduel", () => {
    const win = new Window_InventoryCompare(new Rectangle(0, 0, 400, 144));
    const hero = {
        name: () => "Mosay",
        equips: () => [null],
        equipSlots: () => [2],
        param: () => 10,
        equipment: {
            findSlotFor: () => 0,
            itemAt: () => null
        }
    };
    global.$gameParty = { leader: () => hero };

    const heavyArmor = {
        atypeId: 2,
        name: "Armure Flak Lourde",
        note: "<weight: 14> <wornWeight: 3.5>",
        params: [0, 0, 0, 15, 0, 0, 0, 0]
    };

    assert.doesNotThrow(() => win.setItem(heavyArmor));
    assert.strictEqual(win._item, heavyArmor);
});

test("B2: Compare affiche les données de sac avec bonus de capacité", () => {
    const win = new Window_InventoryCompare(new Rectangle(0, 0, 400, 144));
    const drawnTexts = [];
    win.drawText = (text) => drawnTexts.push(text);

    const backpack = {
        atypeId: 2,
        name: "Sac à dos Tactique",
        note: "<stockWeight: 2> <weightBonus: 12>",
        params: [0, 0, 0, 0, 0, 0, 0, 0]
    };

    win.setItem(backpack);
    assert.ok(drawnTexts.some(t => t.includes("Capacité port")), "Doit afficher la ligne Capacité port");
    assert.ok(drawnTexts.some(t => t.includes("+12 UM")), "Doit afficher le bonus +12 UM");
    assert.ok(drawnTexts.some(t => t.includes("Stock: 2 UM")), "Doit afficher le poids en stock (2 UM)");
});

test("B3: Compare affiche la séparation poids en stock / résiduel pour une armure lourde", () => {
    const win = new Window_InventoryCompare(new Rectangle(0, 0, 400, 144));
    const drawnTexts = [];
    win.drawText = (text) => drawnTexts.push(text);

    const heavyArmor = {
        atypeId: 2,
        name: "Armure Lourde",
        note: "<weight: 14> <wornWeight: 3.5>",
        params: [0, 0, 0, 15, 0, 0, 0, 0]
    };

    win.setItem(heavyArmor);
    assert.ok(drawnTexts.some(t => t.includes("Poids résiduel")), "Doit afficher la ligne Poids résiduel");
    assert.ok(drawnTexts.some(t => t.includes("0 → 3.5 UM")), "Doit afficher la variation 0 -> 3.5 UM");
    assert.ok(drawnTexts.some(t => t.includes("Stock: 14 UM")), "Doit afficher le poids en stock (14 UM)");
});

test("B4: Compare affiche l'annulation complète pour un équipement standard", () => {
    const win = new Window_InventoryCompare(new Rectangle(0, 0, 400, 144));
    const drawnTexts = [];
    win.drawText = (text) => drawnTexts.push(text);

    const lightArmor = {
        atypeId: 2,
        name: "Tenue Standard",
        note: "<weight: 4>",
        params: [0, 0, 0, 2, 0, 0, 0, 0]
    };

    win.setItem(lightArmor);
    assert.ok(drawnTexts.some(t => t.includes("Poids en stock")), "Doit afficher Poids en stock");
    assert.ok(drawnTexts.some(t => t.includes("0 UM porté")), "Doit indiquer que le poids porté devient nul");
});

console.log("\n==============================================================");
console.log(`   RÉSULTAT : ${passed}/7 tests passés avec succès !`);
console.log("==============================================================");
