//=============================================================================
// SimCraft 4 - Unit Tests : Inventory Layout & Action Verification
// test_inventory_layout.js
//=============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("==============================================================");
console.log("   TEST : Inventory Layout (Headers, Arrow, Scene_Inventory)  ");
console.log("==============================================================");

// ----------------------------------------------------------------------------
// 1. MOCKS RPG MAKER MZ / PIXI
// ----------------------------------------------------------------------------
global.Graphics = {
    boxWidth: 1280,
    boxHeight: 720,
    width: 1280,
    height: 720
};

global.Rectangle = class {
    constructor(x, y, width, height) {
        this.x = x || 0;
        this.y = y || 0;
        this.width = width || 0;
        this.height = height || 0;
    }
};

global.Bitmap = class {
    constructor(w, h) {
        this.width = w || 0;
        this.height = h || 0;
        this.context = {
            createRadialGradient: () => ({ addColorStop: () => {} }),
            createLinearGradient: () => ({ addColorStop: () => {} }),
            save: () => {},
            restore: () => {},
            fillRect: () => {},
            strokeRect: () => {},
            clearRect: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            closePath: () => {},
            fill: () => {},
            stroke: () => {}
        };
    }
    clear() {}
    fillRect() {}
    strokeRect() {}
    clearRect() {}
    gradientFillRect() {}
    fillAll() {}
    drawText() {}
    measureTextWidth() { return 50; }
    blt() {}
};

global.Sprite = class {
    constructor(bitmap) {
        this.bitmap = bitmap || null;
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.scale = { x: 1, y: 1 };
        this.anchor = { x: 0, y: 0 };
        this.opacity = 255;
        this.visible = true;
        this.children = [];
    }
    update() {}
    addChild(c) {
        this.children.push(c);
        return c;
    }
    removeChild(c) {
        const idx = this.children.indexOf(c);
        if (idx >= 0) this.children.splice(idx, 1);
        return c;
    }
};

global.Window_Base = class {
    constructor(rect) {
        this.x = rect ? rect.x : 0;
        this.y = rect ? rect.y : 0;
        this.width = rect ? rect.width : 0;
        this.height = rect ? rect.height : 0;
        this.padding = 12;
        this.contents = new Bitmap(this.innerWidth, this.innerHeight);
        this.visible = true;
        this.openness = 255;
        this._handlers = {};
        this._helpWindow = null;
    }
    get innerWidth() { return Math.max(0, this.width - this.padding * 2); }
    get innerHeight() { return Math.max(0, this.height - this.padding * 2); }
    lineHeight() { return 36; }
    update() {}
    refresh() {}
    show() { this.visible = true; }
    hide() { this.visible = false; }
    open() { this.openness = 255; }
    close() { this.openness = 0; }
    activate() { this._active = true; }
    deactivate() { this._active = false; }
    setHandler(symbol, method) { this._handlers[symbol] = method; }
    callHandler(symbol) { if (this._handlers[symbol]) this._handlers[symbol](); }
    setHelpWindow(hw) { this._helpWindow = hw; }
    drawFace() {}
    drawIcon() {}
    drawText() {}
    drawTextEx() {}
    textSizeEx() { return { width: 50, height: 24 }; }
    changeTextColor() {}
    resetTextColor() {}
    changePaintOpacity() {}
    systemColor() { return "#ffffff"; }
    normalColor() { return "#ffffff"; }
    crisisColor() { return "#ffaa00"; }
    powerUpColor() { return "#00ff00"; }
    powerDownColor() { return "#ff0000"; }
    fittingHeight(numLines) { return numLines * 36 + this.padding * 2; }
    itemRectWithPadding(index) { return new Rectangle(0, index * 36, this.innerWidth, 36); }
};

global.Window_Selectable = class extends Window_Base {
    constructor(rect) {
        super(rect);
        this._index = -1;
    }
    index() { return this._index; }
    select(i) { this._index = i; }
    maxItems() { return 0; }
    drawAllItems() {}
};

global.Window_Command = class extends Window_Selectable {
    constructor(rect) {
        super(rect);
        this._list = [];
        this.makeCommandList();
    }
    clearCommandList() {
        this._list = [];
    }
    refresh() {
        this.clearCommandList();
        this.makeCommandList();
        super.refresh();
    }
    makeCommandList() {}
    addCommand(name, symbol, enabled = true, ext = null) {
        this._list.push({ name, symbol, enabled, ext });
    }
    maxItems() { return this._list.length; }
    commandName(index) { return this._list[index] ? this._list[index].name : ""; }
    commandSymbol(index) { return this._list[index] ? this._list[index].symbol : null; }
    isCommandEnabled(index) { return this._list[index] ? this._list[index].enabled : false; }
    findSymbol(symbol) { return this._list.findIndex(c => c.symbol === symbol); }
    selectSymbol(symbol) {
        const idx = this.findSymbol(symbol);
        if (idx >= 0) this.select(idx);
    }
};

global.Window_HorzCommand = class extends Window_Command {};

global.Window_Help = class extends Window_Base {
    constructor(rect) {
        super(rect);
        this._text = "";
    }
    setText(t) { this._text = t; }
    clear() { this._text = ""; }
};

global.Scene_Base = class {
    constructor() {
        this.children = [];
        this._windowLayer = { children: [], addChild: c => this.children.push(c) };
    }
    create() {}
    start() {}
    update() {}
    stop() {}
    terminate() {}
    update() {}
    addChild(c) { this.children.push(c); return c; }
    addWindow(w) { this.children.push(w); return w; }
    popScene() { this._popped = true; }
    calcWindowHeight(numLines, selectable) { return numLines * 36 + 24; }
};

global.Scene_MenuBase = class extends Scene_Base {};

global.SoundManager = {
    playShop: () => {},
    playEquip: () => {},
    playBuzzer: () => {},
    playCursor: () => {},
    playOk: () => {},
    playCancel: () => {}
};

global.ImageManager = {
    loadBitmap: (dir, name) => ({ isReady: () => false, isError: () => false, addLoadListener: () => {} }),
    loadSystem: name => ({ isReady: () => false, isError: () => false, addLoadListener: () => {} })
};

global.DataManager = {
    isWeapon: item => item && item.wtypeId !== undefined,
    isArmor: item => item && item.etypeId !== undefined && item.wtypeId === undefined,
    itemWeight: item => (item && item.weight) ? item.weight : 1.0,
    itemRawWeight: item => (item && item.weight) ? item.weight : 1.0,
    itemScTypeInfo: function(item) {
        if (!item) return { key: "misc", label: "Divers" };
        if (item.note) {
            const match = item.note.match(/<sc_type:\s*([^>]+)>/i);
            if (match) {
                const raw = match[1].trim().toLowerCase();
                if (raw === "consumable" || raw === "consommable") return { key: "consumable", label: "Consommable" };
                if (raw === "ingredient" || raw === "ingrédient" || raw === "material" || raw === "matériau") return { key: "material", label: "Ingrédient / Matériau" };
                if (raw === "equipment" || raw === "équipement" || raw === "equipement" || raw === "armor" || raw === "armure") return { key: "equipment", label: "Équipement" };
                if (raw === "weapon" || raw === "arme" || raw === "ammo" || raw === "munition") return { key: "weapon_ammo", label: "Arme & Munitions" };
                if (raw === "quest" || raw === "quete" || raw === "quête" || raw === "key" || raw === "clé") return { key: "quest", label: "Objet Clé" };
                if (raw === "datapad" || raw === "archive" || raw === "livre" || raw === "book") return { key: "datapad", label: "Datapad / Archive" };
                if (raw === "medical" || raw === "médical") return { key: "medical", label: "Biomédical" };
                if (raw === "tool" || raw === "outil") return { key: "tool", label: "Outil" };
                if (raw === "misc" || raw === "divers") return { key: "misc", label: "Divers" };
                return { key: raw, label: match[1].trim() };
            }
        }
        if (this.isWeapon(item)) return { key: "weapon_ammo", label: "Arme & Munitions" };
        if (this.isArmor(item)) return { key: "equipment", label: "Équipement" };
        if (item.itypeId === 2) return { key: "quest", label: "Objet Clé" };
        if (item.itypeId === 3 || item.itypeId === 4) return { key: "datapad", label: "Datapad / Archive" };
        if (item.consumable === true && item.itypeId === 1) return { key: "consumable", label: "Consommable" };
        return { key: "misc", label: "Divers" };
    }
};

global.Sprite_TutoArrow = class extends global.Sprite {
    constructor() {
        super();
        this.setupCalledWith = null;
    }
    setup(data) {
        this.setupCalledWith = data;
        this.visible = Boolean(data);
    }
};

global.Window_Tuto = class extends global.Window_Base {
    constructor(arrow) {
        super(new Rectangle(0, 0, 520, 200));
        this._arrow = arrow;
        this._confirmWindow = null;
        this.openTutoCalledWith = null;
    }
    openTuto(data) {
        this.openTutoCalledWith = data;
        this.visible = true;
    }
    close() {
        this.visible = false;
    }
};

global.Input = {
    clear: () => {}
};

global.TouchInput = {
    clear: () => {}
};

global.JsonEx = {
    makeDeepCopy: obj => (obj ? Object.assign(Object.create(Object.getPrototypeOf(obj)), obj) : obj)
};

global.window = global;

// ----------------------------------------------------------------------------
// 2. CHARGEMENT DES CLASSES TESTÉES
// ----------------------------------------------------------------------------
const baseArrowPath = path.join(__dirname, "../js/plugins/SC4_Sprite_NeonArrowBase.js");
const arrowPath = path.join(__dirname, "../js/plugins/SC4_Sprite_InventoryArrow.js");
const tutoArrowPath = path.join(__dirname, "../js/plugins/SC4_Sprite_TutoArrow.js");
const headerPath = path.join(__dirname, "../js/plugins/SC4_Window_InventoryHeader.js");
const actionPath = path.join(__dirname, "../js/plugins/SC4_Window_InventoryAction.js");
const commandPath = path.join(__dirname, "../js/plugins/SC4_Window_InventoryCommand.js");
const listPath = path.join(__dirname, "../js/plugins/SC4_Window_InventoryList.js");
const comparePath = path.join(__dirname, "../js/plugins/SC4_Window_InventoryCompare.js");
const scenePath = path.join(__dirname, "../js/plugins/SC4_Scene_Inventory.js");

eval(fs.readFileSync(baseArrowPath, "utf8"));
eval(fs.readFileSync(arrowPath, "utf8"));
eval(fs.readFileSync(tutoArrowPath, "utf8"));
eval(fs.readFileSync(headerPath, "utf8"));
eval(fs.readFileSync(actionPath, "utf8"));
eval(fs.readFileSync(commandPath, "utf8"));
eval(fs.readFileSync(listPath, "utf8"));
eval(fs.readFileSync(comparePath, "utf8"));
eval(fs.readFileSync(scenePath, "utf8"));

let passed = 0;
function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  [OK] ${name}`);
    } catch (e) {
        console.error(`  [FAIL] ${name}`);
        console.error(e);
        process.exit(1);
    }
}

// ----------------------------------------------------------------------------
// 3. TESTS UNITAIRES
// ----------------------------------------------------------------------------

console.log("\n--- Section A: Window_InventoryHeader ---");

test("A1: Window_InventoryHeader instanciation et géométrie", () => {
    const rect = new Rectangle(0, 0, 358, 76);
    const header = new Window_InventoryHeader(rect, "🎒 Inventaire partagé", true);
    assert.strictEqual(header.x, 0);
    assert.strictEqual(header.y, 0);
    assert.strictEqual(header.width, 358);
    assert.strictEqual(header.height, 76);
    assert.strictEqual(header._isParty, true);
});

test("A2: Window_InventoryHeader calcul de poids party", () => {
    global.$gameParty = {
        leader: () => ({ name: () => "Hero", faceName: () => "", faceIndex: () => 0 }),
        totalWeight: () => 14.5,
        maxWeight: () => 48.0
    };
    const rect = new Rectangle(0, 0, 358, 76);
    const header = new Window_InventoryHeader(rect, "🎒 Inventaire partagé", true);
    assert.strictEqual(header.currentWeight, 14.5);
    assert.strictEqual(header.maxWeight, 48.0);
    assert.strictEqual(header.isOverloaded, false);
});

test("A3: Window_InventoryHeader conteneur cible et surcharge", () => {
    const mockContainer = {
        totalWeight: () => 60.0,
        maxWeight: () => 50.0,
        name: () => "Armoire perso"
    };
    const rect = new Rectangle(922, 0, 358, 76);
    const header = new Window_InventoryHeader(rect, "📦 Armoire perso", false);
    header.setTargetInventory(mockContainer);
    assert.strictEqual(header.currentWeight, 60.0);
    assert.strictEqual(header.maxWeight, 50.0);
    assert.strictEqual(header.isOverloaded, true);
});

console.log("\n--- Section B: Sprite_InventoryArrow ---");

test("B1: Sprite_InventoryArrow instanciation et déploiement droit", () => {
    const arrow = new Sprite_InventoryArrow();
    assert.strictEqual(arrow.visible, false);
    assert.strictEqual(arrow._isDeploying, false);

    arrow.deploy(358, 200, 386, "right");
    assert.strictEqual(arrow.visible, true);
    assert.strictEqual(arrow._isDeploying, true);
    assert.strictEqual(arrow._direction, "right");
    assert.strictEqual(arrow._originX, 358);
    assert.strictEqual(arrow.y, 200);

    // Simulation de plusieurs updates
    for (let i = 0; i < 10; i++) {
        arrow.update();
    }
    assert.strictEqual(arrow._isDeploying, false);
    assert.strictEqual(arrow._progress, 1);
    assert(Math.abs(arrow.x - 386) <= 4, "La position X de la flèche doit être autour de la cible avec pulsation");
});

test("B2: Sprite_InventoryArrow déploiement gauche", () => {
    const arrow = new Sprite_InventoryArrow();
    arrow.deploy(922, 300, 894, "left");
    assert.strictEqual(arrow.visible, true);
    assert.strictEqual(arrow._direction, "left");
    assert.strictEqual(arrow._originX, 922);

    for (let i = 0; i < 10; i++) {
        arrow.update();
    }
    assert.strictEqual(arrow._progress, 1);
    assert(Math.abs(arrow.x - 894) <= 4, "La position X de la flèche gauche doit être autour de la cible avec pulsation");
});

console.log("\n--- Section C: Scene_Inventory Géométrie & Composants ---");

test("C1: Scene_Inventory calculs de colonnes et layout avec marges 16px", () => {
    const scene = new Scene_Inventory();
    const m = scene.margin();
    assert.strictEqual(m, 16);
    const colW = scene.columnWidth(); // 28% of 1280 = 358
    assert.strictEqual(colW, 358);
    assert.strictEqual(scene.headerHeight(), 168);

    const helpRect = scene.helpWindowRect();
    assert.strictEqual(helpRect.x, 16 + 358 + 16); // 390
    assert.strictEqual(helpRect.y, 16);
    assert.strictEqual(helpRect.width, 1280 - 358 * 2 - 64); // 500
    assert.strictEqual(helpRect.height, 168);

    const cmdRect = scene.commandWindowRect();
    assert.strictEqual(cmdRect.x, 16);
    assert.strictEqual(cmdRect.width, 1280 - 32); // 1248
    assert.strictEqual(cmdRect.y, 720 - 16 - cmdRect.height);

    const partyRect = scene.partyWindowRect();
    assert.strictEqual(partyRect.x, 16);
    assert.strictEqual(partyRect.y, 16 + 168 + 16); // 200
    assert.strictEqual(partyRect.width, 358);
    assert.strictEqual(partyRect.height, 720 - 168 - cmdRect.height - 64);

    const targetRect = scene.targetWindowRect();
    assert.strictEqual(targetRect.x, 1280 - 16 - 358); // 906
    assert.strictEqual(targetRect.y, 16 + 168 + 16); // 200
    assert.strictEqual(targetRect.width, 358);
    assert.strictEqual(targetRect.height, 720 - 168 - cmdRect.height - 64);
});

test("C2: Scene_Inventory initialisation des fenêtres et focus vignette", () => {
    global.$gameParty = {
        leader: () => ({ name: () => "Hero", faceName: () => "", faceIndex: () => 0 }),
        totalWeight: () => 14.5,
        maxWeight: () => 48.0,
        allItems: () => [],
        numItems: () => 0
    };
    const mockContainer = {
        totalWeight: () => 10,
        maxWeight: () => 100,
        items: () => [{ id: 4, name: "Armure Flak", etypeId: 2 }],
        numItems: () => 1,
        isEmpty: () => false,
        isPersistent: () => true
    };
    global.$inventories = {
        inventory: () => mockContainer
    };

    Scene_Inventory.prepare("C_1", { persistent: true });
    const scene = new Scene_Inventory();
    scene.create();

    assert(scene._helpWindow, "Help window créée");
    assert(scene._compareWindow, "Compare window créée");
    assert.strictEqual(scene.needsCancelButton(), false, "needsCancelButton doit être false (bouton retour supprimé)");
    assert(scene._partyHeaderWindow, "Party Header créé");
    assert(scene._targetHeaderWindow, "Target Header créé");
    assert(scene._partyWindow, "Party Window créée");
    assert(scene._targetWindow, "Target Window créée");
    assert(scene._commandWindow, "Command Window créée");
    assert(scene._actionWindow, "Action Window créée");
    assert(scene._arrowSprite, "Arrow Sprite créé");
});

test("C3: Scene_Inventory sélection OK déploie la flèche et bascule Help/Compare", () => {
    const mockItem = { id: 4, name: "Armure Flak", etypeId: 2, params: [0, 0, 0, 10, 0, 0, 0, 0] };
    const mockContainer = {
        totalWeight: () => 10,
        maxWeight: () => 100,
        items: () => [mockItem],
        numItems: () => 1,
        isEmpty: () => false,
        isPersistent: () => true
    };
    global.$inventories = {
        inventory: () => mockContainer
    };
    global.$gameParty = {
        leader: () => ({
            name: () => "Hero",
            faceName: () => "",
            faceIndex: () => 0,
            canEquip: () => true,
            param: () => 10,
            equipSlots: () => [1, 2, 3]
        }),
        allItems: () => [],
        numItems: () => 0,
        totalWeight: () => 10,
        maxWeight: () => 48
    };

    Scene_Inventory.prepare("C_1", { persistent: true });
    const scene = new Scene_Inventory();
    scene.create();

    // Simule sélection sur _targetWindow
    scene._targetWindow.item = () => mockItem;
    scene._targetWindow.index = () => 0;
    scene.onTargetListOk();

    assert.strictEqual(scene._arrowSprite.visible, true, "La flèche doit être visible");
    assert.strictEqual(scene._arrowSprite._direction, "left", "La flèche pointe vers la modale à gauche de la liste droite");
    assert.strictEqual(scene._actionWindow.openness, 255, "La modale action est ouverte");
    assert.strictEqual(scene._actionWindow._mode, "target");
    assert.strictEqual(scene._actionWindow.canEquip, true, "Armure Flak doit activer l'option Équiper");
    assert.strictEqual(scene._compareWindow.visible, true, "Compare window doit être visible");
    assert.strictEqual(scene._helpWindow.visible, false, "Help window doit être masquée");

    // Annulation
    scene.onActionCancel();
    assert.strictEqual(scene._compareWindow.visible, false, "Compare window masquée après annulation");
    assert.strictEqual(scene._helpWindow.visible, true, "Help window visible après annulation");
});

console.log("\n--- Section D: Action Contextuelle Équiper (Étape 3) ---");

test("D1: Window_InventoryAction liste des commandes avec canEquip", () => {
    const rect = new Rectangle(0, 0, 200, 200);
    const actWin = new Window_InventoryAction(rect);

    // Mode Target avec canEquip
    actWin.setup("target", true, true);
    assert.strictEqual(actWin.maxItems(), 4);
    assert.strictEqual(actWin.commandSymbol(0), "take_one");
    assert.strictEqual(actWin.commandSymbol(1), "take_all");
    assert.strictEqual(actWin.commandSymbol(2), "equip");
    assert.strictEqual(actWin.commandSymbol(3), "cancel");

    // Mode Party avec canEquip
    actWin.setup("party", true, true);
    assert.strictEqual(actWin.maxItems(), 6);
    assert.strictEqual(actWin.commandSymbol(0), "equip");
    assert.strictEqual(actWin.commandSymbol(1), "deposit_one");
    assert.strictEqual(actWin.commandSymbol(2), "deposit_all");
    assert.strictEqual(actWin.commandSymbol(3), "drop_one");
    assert.strictEqual(actWin.commandSymbol(4), "drop_all");
    assert.strictEqual(actWin.commandSymbol(5), "cancel");
});

test("D2: Scene_Inventory onActionEquip depuis conteneur vers le héros", () => {
    let equippedItem = null;
    let playerRefreshed = false;
    let gainedInParty = false;
    let lostFromContainer = false;

    const mockItem = { id: 4, name: "Armure Flak", etypeId: 2 };
    const mockContainer = {
        totalWeight: () => 10,
        maxWeight: () => 100,
        items: () => [mockItem],
        numItems: () => 1,
        isEmpty: () => false,
        isPersistent: () => true,
        loseItem: (it, amt) => {
            if (it === mockItem && amt === 1) lostFromContainer = true;
        }
    };

    global.$inventories = { inventory: () => mockContainer };

    const mockLeader = {
        name: () => "Hero",
        faceName: () => "",
        faceIndex: () => 0,
        canEquip: it => true,
        equipment: {
            equip: it => { equippedItem = it; return true; },
            findSlotFor: it => 1
        }
    };

    global.$gameParty = {
        leader: () => mockLeader,
        gainItem: (it, amt) => { if (it === mockItem && amt === 1) gainedInParty = true; },
        totalWeight: () => 5,
        maxWeight: () => 48,
        allItems: () => [],
        numItems: () => 0
    };

    global.$gamePlayer = {
        refresh: () => { playerRefreshed = true; }
    };

    Scene_Inventory.prepare("C_1", { persistent: true });
    const scene = new Scene_Inventory();
    scene.create();

    scene._targetWindow.item = () => mockItem;
    scene._targetWindow.index = () => 0;
    scene.onTargetListOk();

    // Déclenchement de l'action équiper
    scene.onActionEquip();

    assert.strictEqual(lostFromContainer, true, "Le conteneur doit perdre 1 pièce d'armure");
    assert.strictEqual(gainedInParty, true, "Le groupe reçoit la pièce avant équipement");
    assert.strictEqual(equippedItem, mockItem, "Le leader doit avoir équipé l'armure Flak");
    assert.strictEqual(playerRefreshed, true, "$gamePlayer.refresh() doit être invoqué");
    assert.strictEqual(scene._actionWindow.openness, 0, "La modale action doit être fermée");
});

test("D3: Scene_Inventory onActionEquip depuis l'inventaire partagé", () => {
    let equippedItem = null;
    let playerRefreshed = false;

    const mockWeapon = { id: 2, name: "Pistolet Laser", wtypeId: 1 };
    const mockLeader = {
        name: () => "Hero",
        faceName: () => "",
        faceIndex: () => 0,
        canEquip: it => true,
        equipment: {
            equip: it => { equippedItem = it; return true; },
            findSlotFor: it => 0
        }
    };

    global.$gameParty = {
        leader: () => mockLeader,
        gainItem: () => {},
        totalWeight: () => 5,
        maxWeight: () => 48,
        allItems: () => [mockWeapon],
        numItems: () => 1
    };

    global.$gamePlayer = {
        refresh: () => { playerRefreshed = true; }
    };

    Scene_Inventory.prepare("C_1", { persistent: true });
    const scene = new Scene_Inventory();
    scene.create();

    scene._partyWindow.item = () => mockWeapon;
    scene._partyWindow.index = () => 0;
    scene.onPartyListOk();

    scene.onActionEquip();

    assert.strictEqual(equippedItem, mockWeapon, "Le pistolet doit être équipé directement sur le héros");
    assert.strictEqual(playerRefreshed, true, "$gamePlayer.refresh() doit être notifié");
    assert.strictEqual(scene._actionWindow.openness, 0, "La modale action est fermée après équipement");
});

console.log("\n--- Section E: Système de Tri Adaptatif & Typage Notetag ---");

test("E1: DataManager.itemScTypeInfo résolution et repli sur Divers", () => {
    const taggedMed = { id: 1, name: "Medipack", note: "<sc_type: medical>" };
    const untypedItem = { id: 2, name: "Bout de ferraille", note: "", itypeId: 1, consumable: false };
    const armor = { id: 3, name: "Gilet Pare-balles", etypeId: 2 };
    const weapon = { id: 4, name: "Fusil Gauss", wtypeId: 1 };
    const datapad = { id: 5, name: "Journal de bord", itypeId: 3 };

    assert.strictEqual(DataManager.itemScTypeInfo(taggedMed).key, "medical");
    assert.strictEqual(DataManager.itemScTypeInfo(taggedMed).label, "Biomédical");

    // L'objet sans type défini DOIT renvoyer Divers pour que le dev le repère immédiatement
    assert.strictEqual(DataManager.itemScTypeInfo(untypedItem).key, "misc");
    assert.strictEqual(DataManager.itemScTypeInfo(untypedItem).label, "Divers");

    assert.strictEqual(DataManager.itemScTypeInfo(armor).key, "equipment");
    assert.strictEqual(DataManager.itemScTypeInfo(weapon).key, "weapon_ammo");
    assert.strictEqual(DataManager.itemScTypeInfo(datapad).key, "datapad");
});

test("E2: Window_InventoryCommand tri adaptatif aux restrictions du conteneur", () => {
    const rect = new Rectangle(0, 0, 1280, 50);
    const cmd = new Window_InventoryCommand(rect);

    // Conteneur d'armurerie restreint aux armes uniquement
    const mockArmory = {
        isEmpty: () => false,
        totalWeight: () => 10,
        isCategoryAllowed: cat => (cat === "all" || cat === "weapon_ammo")
    };

    cmd.setTargetContext(mockArmory, true);
    const filters = cmd.availableFilters();
    assert.strictEqual(filters.length, 2, "Seuls 'all' et 'weapon_ammo' doivent être autorisés");
    assert.strictEqual(filters[0].key, "all");
    assert.strictEqual(filters[1].key, "weapon_ammo");

    // Cycle du filtre
    assert.strictEqual(cmd.currentFilter().key, "all");
    cmd.cycleFilter();
    assert.strictEqual(cmd.currentFilter().key, "weapon_ammo");
    cmd.cycleFilter();
    assert.strictEqual(cmd.currentFilter().key, "all");
});

test("E3: Scene_Inventory onCommandFilter trie les deux fenêtres simultanément", () => {
    const item1 = { id: 1, name: "Medipack", note: "<sc_type: medical>", weight: 1 };
    const item2 = { id: 2, name: "Fusil", wtypeId: 1, weight: 4 };

    const mockContainer = {
        totalWeight: () => 5,
        maxWeight: () => 50,
        items: () => [item1, item2],
        numItems: it => 1,
        isEmpty: () => false,
        isCategoryAllowed: () => true
    };
    global.$inventories = { inventory: () => mockContainer };

    global.$gameParty = {
        leader: () => ({ name: () => "Hero", faceName: () => "", faceIndex: () => 0 }),
        totalWeight: () => 5,
        maxWeight: () => 48,
        allItems: () => [item1, item2],
        numItems: it => 1
    };

    Scene_Inventory.prepare("C_1", { persistent: true });
    const scene = new Scene_Inventory();
    scene.create();

    // Filtre initial : all -> les 2 fenêtres ont 2 items
    assert.strictEqual(scene._partyWindow._data.length, 2);
    assert.strictEqual(scene._targetWindow._data.length, 2);

    // Bascule de filtre vers "medical"
    scene._commandWindow.setFilterCategory("medical");
    scene._partyWindow.setCategory("medical");
    scene._targetWindow.setCategory("medical");

    assert.strictEqual(scene._partyWindow._data.length, 1);
    assert.strictEqual(scene._partyWindow._data[0].name, "Medipack");
    assert.strictEqual(scene._targetWindow._data.length, 1);
    assert.strictEqual(scene._targetWindow._data[0].name, "Medipack");
});

test("E4: Window_InventoryList updateHelp affiche le Type et prévient en cas de surcharge", () => {
    const heavyItem = { id: 4, name: "Blindage Lourd", etypeId: 2, description: "Plaque d'acier", weight: 30 };
    const helpWin = new Window_Help(new Rectangle(0, 0, 500, 76));

    global.$gameParty = {
        totalWeight: () => 25,
        maxWeight: () => 48 // 25 + 30 = 55 > 48 -> Surcharge !
    };

    const targetList = new Window_InventoryList(new Rectangle(0, 0, 300, 400), "Caisse", false);
    targetList.setHelpWindow(helpWin);
    targetList.item = () => heavyItem;

    targetList.updateHelp();

    assert(helpWin._text.includes("[ TYPE : ÉQUIPEMENT ]"), "Doit afficher le type Équipement");
    assert(helpWin._text.includes("SURCHARGE"), "Doit afficher l'alerte rouge de surcharge");
    assert(helpWin._text.includes("Plaque d'acier"), "Doit afficher la description sur la 2ème ligne");
});

test("E5: Window_InventoryAction affiche l'alerte surcharge sur Prendre 1 et Prendre Tout", () => {
    const actWin = new Window_InventoryAction(new Rectangle(0, 0, 200, 200));
    // Surcharge détectée pour Prendre Tout
    actWin.setup("target", true, false, false, true);

    assert.strictEqual(actWin.isOverloadOne, false);
    assert.strictEqual(actWin.isOverloadAll, true);
    assert(actWin.commandName(1).includes("⚠️"), "Prendre Tout doit arborer l'icône d'alerte");
});

test("E6: Window_InventoryCommand filtre adaptatif au contenu réel présent", () => {
    const rect = new Rectangle(0, 0, 1280, 50);
    const cmd = new Window_InventoryCommand(rect);

    const potion = { id: 1, name: "Potion", note: "<sc_type: consumable>" };
    const armor = { id: 2, name: "Armure", etypeId: 2 };

    global.$gameParty = {
        allItems: () => [potion],
        numItems: it => 1
    };

    const mockContainer = {
        isEmpty: () => false,
        items: () => [armor],
        numItems: it => 1,
        totalWeight: () => 10,
        isCategoryAllowed: () => true
    };

    cmd.setTargetContext(mockContainer, true);
    const available = cmd.availableFilters();
    const keys = available.map(f => f.key);

    // Seuls 'all', 'consumable' (dans le sac) et 'equipment' (dans le meuble) doivent être proposés
    assert(keys.includes("all"), "Tout doit être inclus");
    assert(keys.includes("consumable"), "Consommable présent dans le sac doit être inclus");
    assert(keys.includes("equipment"), "Équipement présent dans le meuble doit être inclus");
    assert(!keys.includes("weapon_ammo"), "Armes absentes du sac et du meuble doivent être ignorées");
    assert(!keys.includes("quest"), "Objets clés absents doivent être ignorés");
});

test("E7: Conteneur plein bloque Déposer et affiche la mention (Plein !)", () => {
    const rect = new Rectangle(0, 0, 1280, 50);
    const cmd = new Window_InventoryCommand(rect);

    const mockFullContainer = {
        isEmpty: () => false,
        totalWeight: () => 100,
        maxWeight: () => 100,
        isFull: () => true,
        isCategoryAllowed: () => true
    };

    global.$gameParty = {
        allItems: () => [{ id: 1, name: "Objet" }],
        numItems: () => 1
    };

    cmd.setTargetContext(mockFullContainer, true);
    assert.strictEqual(cmd.canDeposit, false, "Déposer doit être bloqué si le conteneur est plein");
    const depIndex = cmd.findSymbol("deposit");
    assert(cmd.commandName(depIndex).includes("Plein !"), "Le bouton Déposer doit arborer la mention Plein !");

    // Test dans Window_InventoryAction (mode party vers conteneur plein)
    const actWin = new Window_InventoryAction(new Rectangle(0, 0, 200, 200));
    // canDeposit = true (persistant), canEquip = false, overload = false, canAcceptOne = false, canAcceptAll = false
    actWin.setup("party", true, false, false, false, false, false);
    assert.strictEqual(actWin.isCommandEnabled(actWin.findSymbol("deposit_one")), false);
    assert(actWin.commandName(actWin.findSymbol("deposit_one")).includes("Plein !"));
});

console.log("\n--- Section F: Didacticiels Contextuels dans Scene_Inventory ---");

function setupPartyMock() {
    global.$gameParty = {
        leader: () => ({
            name: () => "Hero",
            faceName: () => "",
            faceIndex: () => 0,
            canEquip: () => true,
            param: () => 10,
            equipSlots: () => [1, 2, 3]
        }),
        allItems: () => [],
        numItems: () => 0,
        totalWeight: () => 10,
        maxWeight: () => 48
    };
    global.$inventories = {
        inventory: () => ({
            totalWeight: () => 10,
            maxWeight: () => 100,
            items: () => [],
            numItems: () => 0,
            isEmpty: () => true,
            isPersistent: () => true
        })
    };
}

test("F1: Scene_Inventory instancie _tutoArrowSprite et _tutoWindow", () => {
    setupPartyMock();
    Scene_Inventory.prepare("C_1", { persistent: true });
    const scene = new Scene_Inventory();
    scene.create();

    assert(scene._tutoArrowSprite, "Sprite_TutoArrow doit être instancié");
    assert(scene._tutoWindow, "Window_Tuto doit être instanciée");
    assert(scene.children.includes(scene._tutoArrowSprite), "La flèche doit être ajoutée aux enfants de la scène");
});

test("F2: Scene_Inventory.start() enfile tuto_inv_transfer -> tuto_inv_interact (Tuto 10) -> tuto_inv_commands", () => {
    setupPartyMock();
    global.$tutoManager = {
        _seen: {},
        _queue: [],
        _busy: false,
        isSeen(id) { return Boolean(this._seen[id]); },
        show(id, data = {}) {
            if (this.isSeen(id)) return false;
            this._queue.push({ id, data });
            this._seen[id] = true;
            this._busy = true;
            return true;
        },
        isBusy() { return this._busy; }
    };

    Scene_Inventory.prepare("C_1", { persistent: true });
    const scene = new Scene_Inventory();
    scene.create();
    scene.start();

    assert.strictEqual(global.$tutoManager._queue.length, 3, "Les 3 tutoriels initiaux doivent être mis en file (6 -> 10 -> 7)");
    assert.strictEqual(global.$tutoManager._queue[0].id, "tuto_inv_transfer");
    assert.strictEqual(global.$tutoManager._queue[0].data.position, "center");
    assert.strictEqual(global.$tutoManager._queue[0].data.arrow.angle, 0);

    assert.strictEqual(global.$tutoManager._queue[1].id, "tuto_inv_interact");
    assert.strictEqual(global.$tutoManager._queue[1].data.position, "center");
    assert.strictEqual(global.$tutoManager._queue[1].data.arrow.angle, 0);

    assert.strictEqual(global.$tutoManager._queue[2].id, "tuto_inv_commands");
    assert.strictEqual(global.$tutoManager._queue[2].data.position, "top");
    assert.strictEqual(global.$tutoManager._queue[2].data.arrow.angle, 0);
});

test("F3: Clic item déclenche tuto_inv_action et tuto_inv_compare si équipable", () => {
    global.$tutoManager = {
        _seen: {},
        _queue: [],
        _busy: false,
        isSeen(id) { return Boolean(this._seen[id]); },
        show(id, data = {}) {
            if (this.isSeen(id)) return false;
            this._queue.push({ id, data });
            this._seen[id] = true;
            this._busy = true;
            return true;
        },
        isBusy() { return this._busy; }
    };

    const armor = { id: 4, name: "Armure Flak", etypeId: 2, params: [0, 0, 0, 10, 0, 0, 0, 0] };
    const mockContainer = {
        totalWeight: () => 10,
        maxWeight: () => 100,
        items: () => [armor],
        numItems: () => 1,
        isEmpty: () => false,
        isPersistent: () => true
    };
    global.$inventories = { inventory: () => mockContainer };
    global.$gameParty = {
        leader: () => ({
            name: () => "Hero",
            faceName: () => "",
            faceIndex: () => 0,
            canEquip: () => true,
            param: () => 10,
            equipSlots: () => [1, 2, 3]
        }),
        allItems: () => [],
        numItems: () => 0,
        totalWeight: () => 10,
        maxWeight: () => 48
    };

    Scene_Inventory.prepare("C_1", { persistent: true });
    const scene = new Scene_Inventory();
    scene.create();

    // Sélection d'un équipement
    scene._targetWindow.item = () => armor;
    scene._targetWindow.index = () => 0;
    scene.onTargetListOk();

    // Tuto 8 (action) et Tuto 9 (compare) doivent être dans la queue
    const queueIds = global.$tutoManager._queue.map(q => q.id);
    assert(queueIds.includes("tuto_inv_action"), "Tuto action doit être déclenché");
    assert(queueIds.includes("tuto_inv_compare"), "Tuto compare doit être déclenché pour un équipement");

    const compareTuto = global.$tutoManager._queue.find(q => q.id === "tuto_inv_compare");
    assert.strictEqual(compareTuto.data.arrow.angle, 180, "La flèche du comparateur doit pointer vers le haut (180)");
});

test("F4: updateTutoInputGuard désactive les fenêtres d'inventaire pendant le didacticiel et les restaure après", () => {
    let tutoBusy = true;
    let inputCleared = false;
    let touchCleared = false;
    global.Input.clear = () => { inputCleared = true; };
    global.TouchInput.clear = () => { touchCleared = true; };

    global.$tutoManager = {
        isBusy() { return tutoBusy; },
        update() {}
    };

    Scene_Inventory.prepare("C_1", { persistent: true });
    const scene = new Scene_Inventory();
    scene.create();
    scene._commandWindow.activate();
    assert.strictEqual(scene._commandWindow._active, true);

    // Frame avec tuto actif -> les fenêtres doivent être désactivées
    scene.update();
    assert.strictEqual(scene._commandWindow._active, false, "La fenêtre de commande doit être désactivée pendant le tuto");

    // Fermeture du tuto
    tutoBusy = false;
    scene.update();
    assert.strictEqual(inputCleared, true, "Input.clear doit être appelé pour purger la validation");
    assert.strictEqual(touchCleared, true, "TouchInput.clear doit être appelé pour purger le clic");
    assert.strictEqual(scene._commandWindow._active, true, "Le focus doit être restauré sur la fenêtre précédente");
});

console.log("\n--- Section G: Agrégation ($gameParty + A_<leaderId>) & TransfertsMultiContainers ---");

function createMockContainer(id, initialMap = new Map()) {
    const counts = new Map(initialMap);
    return {
        _id: id,
        id: () => id,
        items: () => Array.from(counts.entries()).filter(([, q]) => q > 0).map(([it]) => it),
        numItems: (it) => counts.get(it) || 0,
        gainItem: (it, amt) => {
            if (!it || !amt) return;
            const next = Math.max(0, (counts.get(it) || 0) + amt);
            if (next > 0) counts.set(it, next);
            else counts.delete(it);
        },
        loseItem: (it, amt) => {
            if (!it || !amt) return;
            const next = Math.max(0, (counts.get(it) || 0) - amt);
            if (next > 0) counts.set(it, next);
            else counts.delete(it);
        },
        isEmpty: () => Array.from(counts.values()).every(q => q <= 0),
        totalWeight: () => {
            let sum = 0;
            for (const [it, q] of counts.entries()) {
                if (q > 0) sum += (DataManager.itemWeight(it) || 1) * q;
            }
            return sum;
        },
        maxWeight: () => 100,
        isPersistent: () => id.startsWith("C_") || id.startsWith("A_"),
        isCategoryAllowed: () => true
    };
}

test("G1: Fenêtre de gauche agrège $gameParty + A_<leaderId> (sans A_2 compagnon)", () => {
    const medipack = { id: 7, name: "Potion", itypeId: 1, consumable: true, note: "<sc_type: medical>", weight: 1 };
    const tool = { id: 20, name: "Clé", itypeId: 1, consumable: false, note: "<sc_type: tool>", weight: 2 };
    const followerOnly = { id: 99, name: "Ration Compagnon", itypeId: 1, consumable: true, note: "<sc_type: consumable>", weight: 1 };

    const partyStore = createMockContainer("PARTY", new Map([[medipack, 2]]));
    const leaderBag = createMockContainer("A_1", new Map([[medipack, 5], [tool, 3]]));
    const followerBag = createMockContainer("A_2", new Map([[followerOnly, 4]]));
    const wardrobe = createMockContainer("C_1", new Map());

    global.$inventories = {
        inventory: (id) => {
            if (id === "A_1") return leaderBag;
            if (id === "A_2") return followerBag;
            return wardrobe;
        }
    };

    const leader = {
        actorId: () => 1,
        name: () => "Wesword",
        faceName: () => "",
        faceIndex: () => 0,
        inventory: { container: () => leaderBag }
    };
    const follower = {
        actorId: () => 2,
        name: () => "Kael",
        inventory: { container: () => followerBag }
    };
    global.$gameParty = {
        leader: () => leader,
        members: () => [leader, follower],
        allItems: () => partyStore.items(),
        numItems: (it) => partyStore.numItems(it),
        gainItem: (it, a) => partyStore.gainItem(it, a),
        loseItem: (it, a) => partyStore.loseItem(it, a),
        totalWeight: () => partyStore.totalWeight(),
        maxWeight: () => 48
    };

    Scene_Inventory.prepare("C_1", { persistent: true });
    const scene = new Scene_Inventory();
    scene.create();

    // Gauche = medipack (2+5 = 7) + tool (3). Jamais followerOnly !
    const leftItems = scene._partyWindow._data;
    assert.strictEqual(leftItems.length, 2, "Inventaire partagé doit agréger 2 objets uniques ($gameParty + A_1)");
    assert(!leftItems.includes(followerOnly), "L'inventaire d'un compagnon (A_2) ne doit jamais être inclus");
    assert.strictEqual(scene._partyWindow.itemQuantity(medipack), 7, "Les piles de Potion ($gameParty + A_1) doivent être additionnées (7)");
    assert.strictEqual(scene._partyWindow.itemQuantity(tool), 3, "La quantité d'outil dans A_1 doit être 3");

    // Poids header/liste : 2*1 (Party) + 5*1 + 3*2 (A_1) = 13 UM
    assert.strictEqual(scene._partyHeaderWindow.currentWeight, 13);
    assert.strictEqual(scene._partyWindow.currentWeight, 13);

    // Barre de commande : Déposer actif & filtre "tool" (présent seulement dans A_1) inclus !
    assert.strictEqual(scene._commandWindow.hasPartyItems, true);
    assert.strictEqual(scene._commandWindow.canDeposit, true);
    const filterKeys = scene._commandWindow.availableFilters().map(f => f.key);
    assert(filterKeys.includes("tool"), "La catégorie présente uniquement dans A_1 doit apparaître dans les filtres");
    assert(!filterKeys.includes("consumable"), "La catégorie présente uniquement dans A_2 ne doit pas apparaître");
});

test("G2: Ouverture directe de A_<leaderId> (touche I) n'auto-duplique pas A_1 à gauche", () => {
    const armor = { id: 4, name: "Armure", etypeId: 2, weight: 4 };
    const potion = { id: 7, name: "Potion", itypeId: 1, consumable: true, weight: 1 };
    const partyStore = createMockContainer("PARTY", new Map([[armor, 1]]));
    const leaderBag = createMockContainer("A_1", new Map([[potion, 10]]));

    global.$inventories = {
        inventory: (id) => leaderBag
    };
    const leader = {
        actorId: () => 1,
        name: () => "Wesword",
        faceName: () => "",
        faceIndex: () => 0,
        inventory: { container: () => leaderBag }
    };
    global.$gameParty = {
        leader: () => leader,
        allItems: () => partyStore.items(),
        numItems: (it) => partyStore.numItems(it),
        totalWeight: () => partyStore.totalWeight(),
        maxWeight: () => 48
    };

    Scene_Inventory.prepare("A_1", { persistent: true });
    const scene = new Scene_Inventory();
    scene.create();

    assert.deepStrictEqual(scene._partyWindow._data, [armor], "À gauche : uniquement $gameParty quand A_1 est inspecté à droite");
    assert.deepStrictEqual(scene._targetWindow._data, [potion], "À droite : uniquement A_1");
    assert.strictEqual(scene._partyHeaderWindow.currentWeight, 4);
    assert.strictEqual(scene._targetHeaderWindow.currentWeight, 10);
});

test("G3: Transferts (Déposer / Jeter / Prendre) déduisent et créditent les bons conteneurs", () => {
    const potion = { id: 7, name: "Potion", itypeId: 1, consumable: true, weight: 1 };
    const leaderOnlyArmor = { id: 4, name: "Armure Perso", etypeId: 2, weight: 5 };
    const partyStore = createMockContainer("PARTY", new Map([[potion, 2]]));
    const leaderBag = createMockContainer("A_1", new Map([[potion, 3], [leaderOnlyArmor, 1]]));
    const wardrobe = createMockContainer("C_1", new Map());

    global.$inventories = {
        inventory: (id) => (id === "A_1" ? leaderBag : wardrobe)
    };
    const leader = {
        actorId: () => 1,
        name: () => "Wesword",
        faceName: () => "",
        faceIndex: () => 0,
        inventory: { container: () => leaderBag }
    };
    global.$gameParty = {
        leader: () => leader,
        allItems: () => partyStore.items(),
        numItems: (it) => partyStore.numItems(it),
        gainItem: (it, a) => partyStore.gainItem(it, a),
        loseItem: (it, a) => partyStore.loseItem(it, a),
        totalWeight: () => partyStore.totalWeight(),
        maxWeight: () => 10,
        canAcceptItem: (it, a) => (partyStore.totalWeight() + DataManager.itemWeight(it) * a) <= 10
    };

    Scene_Inventory.prepare("C_1", { persistent: true });
    const scene = new Scene_Inventory();
    scene.create();

    // 1. Déposer 1 objet qui existe uniquement dans A_1
    const idxArmor = scene._partyWindow._data.indexOf(leaderOnlyArmor);
    scene._partyWindow.select(idxArmor);
    scene.onActionDepositOne();
    assert.strictEqual(leaderBag.numItems(leaderOnlyArmor), 0, "A_1 doit perdre l'armure déposée");
    assert.strictEqual(wardrobe.numItems(leaderOnlyArmor), 1, "C_1 doit recevoir l'armure déposée");

    // 2. Prendre Tout refuse si poids agrégé ($gameParty + A_1) + item > maxWeight (10)
    // Actuellement : $gameParty=2 (2*1), A_1=3 (3*1) => 5 UM + 5 UM armure = 10 <= 10 OK ; mais si on ajoute 1 poids dans C_1 (6 > 10)
    const heavyItem = { id: 88, name: "Bloc", itypeId: 1, weight: 6 };
    wardrobe.gainItem(heavyItem, 1);
    scene.refreshAll();
    scene._targetWindow.select(scene._targetWindow._data.indexOf(heavyItem));
    scene.executeTake(1);
    assert.strictEqual(wardrobe.numItems(heavyItem), 1, "executeTake doit refuser si ($gameParty + A_1 + objet) dépasse maxWeight (5 + 6 > 10)");

    // 3. Jeter Tout sur la pile mixte (2 dans $gameParty + 3 dans A_1 = 5)
    scene._partyWindow.select(scene._partyWindow._data.indexOf(potion));
    scene.onActionDropAll();
    assert.strictEqual(partyStore.numItems(potion), 0, "$gameParty vidé de ses 2 potions");
    assert.strictEqual(leaderBag.numItems(potion), 0, "A_1 vidé de ses 3 potions");
});

console.log("\n--- Section H: Commande Consommer & Intégrité TUTOS/UI ---");

test("H1: Window_InventoryAction expose la commande 'consume' avec canConsume=true", () => {
    const actWin = new Window_InventoryAction(new Rectangle(0, 0, 250, 200));

    actWin.setup("target", true, false, false, false, true, true, true);
    assert.strictEqual(actWin.canConsume, true);
    assert.strictEqual(actWin.maxItems(), 4);
    assert.strictEqual(actWin.commandSymbol(2), "consume");
    assert.strictEqual(actWin.commandSymbol(3), "cancel");

    actWin.setup("party", true, false, false, false, true, true, true);
    assert.strictEqual(actWin.maxItems(), 6);
    assert.strictEqual(actWin.commandSymbol(0), "consume");
    assert.strictEqual(actWin.commandSymbol(1), "deposit_one");
});

test("H2: Scene_Inventory.canConsumeItem vérifie consumable, occasion, scope et testApply", () => {
    const healingPotion = { id: 7, name: "Potion", itypeId: 1, consumable: true, occasion: 0, scope: 7, effects: [{ code: 11, dataId: 0, value1: 0, value2: 500 }] };
    const grenade = { id: 90, name: "Grenade", itypeId: 1, consumable: true, occasion: 0, scope: 1, effects: [] };
    const battleOnly = { id: 91, name: "Stim Combat", itypeId: 1, consumable: true, occasion: 1, scope: 7, effects: [] };
    const keyTool = { id: 92, name: "Clé Pass", itypeId: 1, consumable: false, occasion: 0, scope: 7, effects: [] };
    const commonEvItem = { id: 93, name: "Ration Event", itypeId: 1, consumable: true, occasion: 0, scope: 0, effects: [{ code: 44, dataId: 5 }] };

    const savedGameAction = global.Game_Action;
    const savedDMIsItem = global.DataManager.isItem;
    try {
        global.DataManager.isItem = (it) => Boolean(it && it.itypeId !== undefined && !global.DataManager.isWeapon(it) && !global.DataManager.isArmor(it));

        let mockLeaderHp = 500;
        const leader = {
            actorId: () => 1,
            name: () => "Wesword",
            faceName: () => "",
            faceIndex: () => 0,
            hp: 500,
            mhp: 500,
            meetsUsableItemConditions: (it) => (it.occasion === 0 || it.occasion === 2)
        };
        Object.defineProperty(leader, "hp", { get: () => mockLeaderHp, set: v => { mockLeaderHp = v; }, configurable: true });

        global.Game_Action = class {
            constructor(sub) { this._subject = sub; this._item = null; }
            setItemObject(it) { this._item = it; }
            isForOpponent() { return this._item && this._item.scope >= 1 && this._item.scope <= 6; }
            isForFriend() { return this._item && this._item.scope >= 7; }
            testApply(target) {
                if (this._item === healingPotion) return target.hp < target.mhp;
                return true;
            }
        };

        global.$gameParty = {
            leader: () => leader,
            allItems: () => [],
            numItems: () => 0,
            totalWeight: () => 0,
            maxWeight: () => 48
        };
        global.$inventories = { inventory: () => createMockContainer("C_1") };

        Scene_Inventory.prepare("C_1", { persistent: true });
        const scene = new Scene_Inventory();
        scene.create();

        assert.strictEqual(scene.canConsumeItem(healingPotion), false, "Potion refusée quand PV au max (500/500)");
        mockLeaderHp = 250;
        assert.strictEqual(scene.canConsumeItem(healingPotion), true, "Potion autorisée quand blessé (250/500)");
        assert.strictEqual(scene.canConsumeItem(grenade), false, "Objet offensif (scope ennemi) interdit");
        assert.strictEqual(scene.canConsumeItem(battleOnly), false, "Objet occasion=combat uniquement interdit hors combat");
        assert.strictEqual(scene.canConsumeItem(keyTool), false, "Objet non consommable refusé");
        assert.strictEqual(scene.canConsumeItem(commonEvItem), true, "Objet scope=0 avec effet événement commun autorisé");
    } finally {
        global.Game_Action = savedGameAction;
        global.DataManager.isItem = savedDMIsItem;
    }
});

test("H3: Scene_Inventory.onActionConsume depuis le conteneur cible ET le sac leader (A_1)", () => {
    const healingPotion = { id: 7, name: "Potion", itypeId: 1, consumable: true, occasion: 0, scope: 7, weight: 1, effects: [{ code: 11, dataId: 0, value2: 100 }] };
    const savedGameAction = global.Game_Action;
    const savedDMIsItem = global.DataManager.isItem;
    const savedPlayUseItem = global.SoundManager.playUseItem;
    let useSePlayed = 0;

    try {
        global.DataManager.isItem = (it) => Boolean(it && it.itypeId !== undefined && !global.DataManager.isWeapon(it) && !global.DataManager.isArmor(it));
        global.SoundManager.playUseItem = () => { useSePlayed++; };

        const leaderBag = createMockContainer("A_1", new Map([[healingPotion, 2]]));
        const wardrobe = createMockContainer("C_1", new Map([[healingPotion, 1]]));
        const partyStore = createMockContainer("PARTY", new Map());

        const leader = {
            actorId: () => 1,
            name: () => "Wesword",
            faceName: () => "",
            faceIndex: () => 0,
            hp: 100,
            mhp: 500,
            inventory: { container: () => leaderBag },
            meetsUsableItemConditions: () => true,
            refresh: () => {}
        };

        global.Game_Action = class {
            constructor(sub) { this._subject = sub; this._item = null; }
            setItemObject(it) { this._item = it; }
            isForOpponent() { return false; }
            isForFriend() { return true; }
            numRepeats() { return 1; }
            testApply(t) { return t.hp < t.mhp; }
            apply(t) { t.hp = Math.min(t.mhp, t.hp + 100); }
            applyGlobal() {}
        };

        global.$inventories = {
            inventory: (id) => (id === "A_1" ? leaderBag : wardrobe)
        };
        global.$gameParty = {
            leader: () => leader,
            allItems: () => partyStore.items(),
            numItems: (it) => partyStore.numItems(it),
            gainItem: (it, a) => partyStore.gainItem(it, a),
            loseItem: (it, a) => partyStore.loseItem(it, a),
            totalWeight: () => partyStore.totalWeight(),
            maxWeight: () => 48
        };

        Scene_Inventory.prepare("C_1", { persistent: true });
        const scene = new Scene_Inventory();
        scene.create();

        // 1. Consommer la dernière potion directement depuis C_1
        scene._targetWindow.select(0);
        scene.onTargetListOk();
        assert.strictEqual(scene._actionWindow.canConsume, true);
        scene.onActionConsume();

        assert.strictEqual(wardrobe.numItems(healingPotion), 0, "C_1 doit perdre 1 potion consommée");
        assert.strictEqual(wardrobe.isEmpty(), true, "C_1 doit devenir vide");
        assert.strictEqual(leader.hp, 200, "Le leader doit être soigné de +100 PV");
        assert.strictEqual(useSePlayed, 1, "Le SE d'utilisation doit être joué");

        // 2. Consommer 1 potion depuis le sac gauche (qui provient uniquement de A_1)
        scene._partyWindow.select(0);
        scene.onPartyListOk();
        assert.strictEqual(scene._actionWindow.canConsume, true);
        scene.onActionConsume();

        assert.strictEqual(leaderBag.numItems(healingPotion), 1, "A_1 doit passer de 2 à 1 potion");
        assert.strictEqual(leader.hp, 300, "Le leader doit être soigné une 2ème fois (300/500)");
        assert.strictEqual(useSePlayed, 2);
    } finally {
        global.Game_Action = savedGameAction;
        global.DataManager.isItem = savedDMIsItem;
        global.SoundManager.playUseItem = savedPlayUseItem;
    }
});

test("H4: Cohérence JSON pour tuto_10 (tuto_inv_interact) et clé UI inventory.consume", () => {
    const tutos = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/SC/TUTOS.json"), "utf8"));
    const tutosFr = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/SC/loc/TUTOS_FR.json"), "utf8"));
    const tutosEn = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/SC/loc/TUTOS_EN.json"), "utf8"));
    const uiFr = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/SC/loc/UI_FR.json"), "utf8"));
    const uiEn = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/SC/loc/UI_EN.json"), "utf8"));

    const t10 = tutos.find(t => t && t.id === 10);
    assert(t10, "TUTOS.json doit contenir l'entrée id=10");
    assert.strictEqual(t10.key, "tuto_inv_interact");
    assert(tutosFr.tutoName_10 && tutosFr.tuto_inv_interact, "TUTOS_FR.json doit définir tutoName_10 et tuto_inv_interact");
    assert(tutosEn.tutoName_10 && tutosEn.tuto_inv_interact, "TUTOS_EN.json doit définir tutoName_10 et tuto_inv_interact");
    assert.strictEqual(uiFr.inventory.consume, "Consommer");
    assert.strictEqual(uiEn.inventory.consume, "Consume");
});

test("H5: Rollback sur échec d'équipement cible + CommonEvent sur Consommer", () => {
    const sealedArmor = { id: 4, name: "Armure Scellée", etypeId: 2, weight: 2 };
    const eventRation = { id: 94, name: "Ration Event", itypeId: 1, consumable: true, occasion: 0, scope: 0, weight: 1, effects: [{ code: 44, dataId: 9 }] };

    const wardrobe = createMockContainer("C_1", new Map([[sealedArmor, 1], [eventRation, 1]]));
    const partyStore = createMockContainer("PARTY", new Map());

    const savedGameAction = global.Game_Action;
    const savedDMIsItem = global.DataManager.isItem;
    const savedGameTemp = global.$gameTemp;
    const savedSceneManager = global.SceneManager;
    const savedSceneMap = global.Scene_Map;
    let commonEventReserved = false;
    let gotoScene = null;

    try {
        global.DataManager.isItem = (it) => Boolean(it && it.itypeId !== undefined && !global.DataManager.isWeapon(it) && !global.DataManager.isArmor(it));
        global.$gameTemp = { isCommonEventReserved: () => commonEventReserved };
        global.Scene_Map = class Scene_Map {};
        global.SceneManager = { goto: (sc) => { gotoScene = sc; } };
        global.Game_Action = class {
            constructor(sub) { this._item = null; }
            setItemObject(it) { this._item = it; }
            isForOpponent() { return false; }
            isForFriend() { return this._item && this._item.scope >= 7; }
            applyGlobal() {
                if (this._item === eventRation) commonEventReserved = true;
            }
        };

        const leader = {
            actorId: () => 1,
            name: () => "Wesword",
            faceName: () => "",
            faceIndex: () => 0,
            canEquip: () => true,
            meetsUsableItemConditions: () => true,
            equipment: {
                equip: () => false,
                findSlotFor: () => 1
            }
        };

        global.$inventories = { inventory: () => wardrobe };
        global.$gameParty = {
            leader: () => leader,
            allItems: () => partyStore.items(),
            numItems: (it) => partyStore.numItems(it),
            gainItem: (it, a) => partyStore.gainItem(it, a),
            loseItem: (it, a) => partyStore.loseItem(it, a),
            totalWeight: () => partyStore.totalWeight(),
            maxWeight: () => 48
        };

        Scene_Inventory.prepare("C_1", { persistent: true });
        const scene = new Scene_Inventory();
        scene.create();

        // 1. Échec d'équipement depuis C_1 -> armure remise dans C_1 (pas perdue ni volée en $gameParty)
        scene._targetWindow.select(scene._targetWindow._data.indexOf(sealedArmor));
        scene.onTargetListOk();
        scene.onActionEquip();
        assert.strictEqual(wardrobe.numItems(sealedArmor), 1, "Armure doit rester dans C_1 si equip() retourne false");
        assert.strictEqual(partyStore.numItems(sealedArmor), 0, "Armure ne doit pas fuiter dans $gameParty si equip() échoue");

        // 2. Consommation d'un objet déclenchant un Common Event -> bascule sur Scene_Map
        scene._targetWindow.select(scene._targetWindow._data.indexOf(eventRation));
        scene.onTargetListOk();
        scene.onActionConsume();
        assert.strictEqual(wardrobe.numItems(eventRation), 0, "L'objet consommé est retiré de C_1");
        assert.strictEqual(gotoScene, global.Scene_Map, "SceneManager.goto(Scene_Map) doit être déclenché si Common Event réservé");
    } finally {
        global.Game_Action = savedGameAction;
        global.DataManager.isItem = savedDMIsItem;
        global.$gameTemp = savedGameTemp;
        global.SceneManager = savedSceneManager;
        global.Scene_Map = savedSceneMap;
    }
});

console.log(`\n--- Section I: Double Jauge Partagée / Perso & Tuto 11 ---`);

test("I1: Sur-jauge sans fond superposée pour A_<leaderId> et absente quand A_<leaderId> ouvert à droite", () => {
    const sharedPotion = { id: 7, name: "Potion", weight: 2 };
    const personalKit = { id: 8, name: "Kit", weight: 3 };
    const partyStore = createMockContainer("PARTY", new Map([[sharedPotion, 6]])); // 12 UM
    const leaderBag = createMockContainer("A_1", new Map([[personalKit, 4]]));     // 12 UM
    const wardrobe = createMockContainer("C_1", new Map());

    global.$inventories = {
        inventory: (id) => (id === "A_1" ? leaderBag : wardrobe)
    };
    const leader = {
        actorId: () => 1,
        name: () => "Wesword",
        faceName: () => "",
        faceIndex: () => 0,
        inventory: { container: () => leaderBag }
    };
    global.$gameParty = {
        leader: () => leader,
        totalWeight: () => partyStore.totalWeight(),
        maxWeight: () => 48
    };

    const fillCalls = [];
    const header = new Window_InventoryHeader(new Rectangle(0, 0, 358, 168), "🎒 Inventaire partagé", true);
    const origFillRect = header.contents.fillRect;
    header.contents.fillRect = (x, y, w, h, color) => {
        fillCalls.push({ x, y, w, h, color });
        return origFillRect.call(header.contents, x, y, w, h, color);
    };

    // 1. Cas agrégé (C_1 ouvert à droite) : total = 24/48 (50%), perso = 12/48 (25%)
    header.setExcludeInventory(wardrobe);
    fillCalls.length = 0;
    header.refresh();

    assert.strictEqual(header.sharedWeight, 12);
    assert.strictEqual(header.personalWeight, 12);
    assert.strictEqual(header.currentWeight, 24);
    assert.strictEqual(header.hasDifferentiatedWeight(), true);
    assert.strictEqual(fillCalls.length, 3, "Uniquement fond + jauge commune + sur-jauge sans second fond");
    assert.strictEqual(fillCalls[1].color, "#00b4d8", "Jauge commune doit être cyan #00b4d8");
    assert.strictEqual(fillCalls[2].color, "#a855f7", "Sur-jauge perso doit être violet #a855f7");
    assert.strictEqual(fillCalls[2].y, fillCalls[1].y, "Sur-jauge dessinée exactement par-dessus le rectangle de la jauge commune");
    assert.strictEqual(fillCalls[2].h, fillCalls[1].h);
    assert(fillCalls[2].w < fillCalls[1].w, "Largeur sur-jauge (12/48) < jauge totale (24/48) pour laisser apparaître le cyan");

    // 2. Cas surpoids (partagé 36 + perso 24 = 60 > 48 max) : rouge #ef4444 en base + violet 24/60 = 40% en sur-jauge
    partyStore.gainItem(sharedPotion, 12); // +24 => shared = 36
    leaderBag.gainItem(personalKit, 4);   // +12 => personal = 24
    fillCalls.length = 0;
    header.refresh();
    assert.strictEqual(header.currentWeight, 60);
    assert.strictEqual(fillCalls[1].color, "#ef4444");
    assert.strictEqual(fillCalls[2].color, "#a855f7");
    assert(Math.abs(header._lastGaugeData.personalRate - (24 / 60)) < 0.001, "En surpoids, la sur-jauge préserve la proportion perso/total");

    // 3. Cas acteur ouvert à droite (_excludeInventory === A_1) : plus de sur-jauge ni agrégation
    header.setExcludeInventory(leaderBag);
    fillCalls.length = 0;
    header.refresh();
    assert.strictEqual(header.personalWeight, 0);
    assert.strictEqual(header.currentWeight, 36);
    assert.strictEqual(header.hasDifferentiatedWeight(), false);
    assert.strictEqual(fillCalls.length, 2, "Aucune sur-jauge dessinée quand A_1 est ouvert directement à droite");
});

test("I2: Tuto 11 s'insère immédiatement après Tuto 6 (6 -> 11 -> 10 -> 7) si poids différencié présent", () => {
    const sharedPotion = { id: 7, name: "Potion", weight: 2 };
    const personalKit = { id: 8, name: "Kit", weight: 3 };
    const partyStore = createMockContainer("PARTY", new Map([[sharedPotion, 2]])); // shared = 4 > 0
    const leaderBag = createMockContainer("A_1", new Map([[personalKit, 2]]));    // personal = 6 > 0
    const wardrobe = createMockContainer("C_1", new Map());

    global.$inventories = {
        inventory: (id) => (id === "A_1" ? leaderBag : wardrobe)
    };
    const leader = {
        actorId: () => 1,
        name: () => "Wesword",
        faceName: () => "",
        faceIndex: () => 0,
        inventory: { container: () => leaderBag }
    };
    global.$gameParty = {
        leader: () => leader,
        allItems: () => partyStore.items(),
        numItems: (it) => partyStore.numItems(it),
        totalWeight: () => partyStore.totalWeight(),
        maxWeight: () => 48
    };
    global.$tutoManager = {
        _seen: {},
        _queue: [],
        _busy: false,
        isSeen(id) { return Boolean(this._seen[id]); },
        show(id, data = {}) {
            if (this.isSeen(id)) return false;
            this._queue.push({ id, data });
            this._seen[id] = true;
            this._busy = true;
            return true;
        },
        isBusy() { return this._busy; },
        update() {}
    };

    Scene_Inventory.prepare("C_1", { persistent: true });
    const scene = new Scene_Inventory();
    scene.create();
    scene.start();

    assert.deepStrictEqual(
        global.$tutoManager._queue.map(q => q.id),
        ["tuto_inv_transfer", "tuto_inv_weight_gauge", "tuto_inv_interact", "tuto_inv_commands"],
        "Ordre attendu quand poids différencié présent : 6 -> 11 -> 10 -> 7"
    );
    const t11 = global.$tutoManager._queue[1];
    assert.strictEqual(t11.data.arrow.angle, 180, "La flèche du Tuto 11 doit pointer vers le haut sur la jauge");
});

test("I3: Tuto 11 différé jusqu'à différenciation par transfert/update (jamais si A_1 à droite)", () => {
    const sharedPotion = { id: 7, name: "Potion", weight: 2 };
    const personalKit = { id: 8, name: "Kit", weight: 3 };
    const partyStore = createMockContainer("PARTY", new Map()); // shared = 0 au départ !
    const leaderBag = createMockContainer("A_1", new Map([[personalKit, 2]])); // personal = 6 > 0
    const wardrobe = createMockContainer("C_1", new Map([[sharedPotion, 2]]));

    global.$inventories = {
        inventory: (id) => (id === "A_1" ? leaderBag : wardrobe)
    };
    const leader = {
        actorId: () => 1,
        name: () => "Wesword",
        faceName: () => "",
        faceIndex: () => 0,
        inventory: { container: () => leaderBag }
    };
    global.$gameParty = {
        leader: () => leader,
        allItems: () => partyStore.items(),
        numItems: (it) => partyStore.numItems(it),
        gainItem: (it, a) => partyStore.gainItem(it, a),
        loseItem: (it, a) => partyStore.loseItem(it, a),
        totalWeight: () => partyStore.totalWeight(),
        maxWeight: () => 48
    };
    global.$tutoManager = {
        _seen: {},
        _queue: [],
        _busy: false,
        isSeen(id) { return Boolean(this._seen[id]); },
        show(id, data = {}) {
            if (this.isSeen(id)) return false;
            this._queue.push({ id, data });
            this._seen[id] = true;
            return true;
        },
        isBusy() { return this._busy; },
        update() {}
    };

    // 1. Démarrage sur C_1 avec shared=0, personal=6 -> Tuto 11 ne doit PAS se lancer
    Scene_Inventory.prepare("C_1", { persistent: true });
    const scene = new Scene_Inventory();
    scene.create();
    scene.start();

    assert.deepStrictEqual(
        global.$tutoManager._queue.map(q => q.id),
        ["tuto_inv_transfer", "tuto_inv_interact", "tuto_inv_commands"],
        "Sans poids partagé (>0), Tuto 11 ne doit pas s'afficher après Tuto 6"
    );
    assert.strictEqual(global.$tutoManager.isSeen("tuto_inv_weight_gauge"), false);

    // 2. Un transfert ("Prendre 1" depuis C_1 vers $gameParty) crée shared=2 ET personal=6 -> Tuto 11 se déclenche !
    scene._targetWindow.select(0);
    scene.executeTake(1);
    assert.strictEqual(global.$tutoManager.isSeen("tuto_inv_weight_gauge"), true);
    assert.strictEqual(global.$tutoManager._queue[global.$tutoManager._queue.length - 1].id, "tuto_inv_weight_gauge");

    // 3. Vérification aussi via scene.update() si la différenciation arrive hors executeTake
    global.$tutoManager._seen = { tuto_inv_transfer: true, tuto_inv_interact: true, tuto_inv_commands: true };
    global.$tutoManager._queue = [];
    partyStore.loseItem(sharedPotion, 1); // shared repasse à 0
    const sceneUpd = new Scene_Inventory();
    sceneUpd.create();
    sceneUpd.start();
    assert.strictEqual(global.$tutoManager.isSeen("tuto_inv_weight_gauge"), false);
    partyStore.gainItem(sharedPotion, 1); // shared=2, personal=6
    sceneUpd.update();
    assert.strictEqual(global.$tutoManager.isSeen("tuto_inv_weight_gauge"), true, "scene.update() doit déclencher Tuto 11 dès différenciation");

    // 4. Vérification que A_1 ouvert à droite ne déclenche jamais Tuto 11 (pas de double jauge à gauche)
    global.$tutoManager._seen = { tuto_inv_transfer: true, tuto_inv_interact: true, tuto_inv_commands: true };
    global.$tutoManager._queue = [];
    Scene_Inventory.prepare("A_1", { persistent: true });
    const sceneSelf = new Scene_Inventory();
    sceneSelf.create();
    sceneSelf.start();
    sceneSelf.update();
    assert.strictEqual(global.$tutoManager.isSeen("tuto_inv_weight_gauge"), false, "A_1 ouvert à droite n'agrège pas à gauche et ne déclenche pas Tuto 11");
});

test("I4: Cohérence JSON tuto_11 + renommage Inventaire partagé / Shared Inventory", () => {
    const tutos = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/SC/TUTOS.json"), "utf8"));
    const tutosFr = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/SC/loc/TUTOS_FR.json"), "utf8"));
    const tutosEn = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/SC/loc/TUTOS_EN.json"), "utf8"));
    const uiFr = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/SC/loc/UI_FR.json"), "utf8"));
    const uiEn = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/SC/loc/UI_EN.json"), "utf8"));
    const locFr = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/SC/loc/Localisation_FR.json"), "utf8"));
    const locEn = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/SC/loc/Localisation_EN.json"), "utf8"));

    const t11 = tutos.find(t => t && t.id === 11);
    assert(t11, "TUTOS.json doit contenir l'entrée id=11");
    assert.strictEqual(t11.key, "tuto_inv_weight_gauge");
    assert(tutosFr.tutoName_11 && tutosFr.tuto_inv_weight_gauge, "TUTOS_FR.json doit définir tutoName_11 et tuto_inv_weight_gauge");
    assert(tutosEn.tutoName_11 && tutosEn.tuto_inv_weight_gauge, "TUTOS_EN.json doit définir tutoName_11 et tuto_inv_weight_gauge");
    assert(tutosFr.tuto_inv_weight_gauge.includes("\\c[23]") && tutosFr.tuto_inv_weight_gauge.includes("\\c[30]"));
    assert(!/\d+\s*UM/i.test(tutosFr.tuto_inv_weight_gauge), "Tuto 11 ne doit pas mentionner de valeurs chiffrées UM");
    assert.strictEqual(uiFr.inventory.player_bag, "🎒 Inventaire partagé");
    assert.strictEqual(uiEn.inventory.player_bag, "🎒 Shared Inventory");
    assert.strictEqual(locFr.inventory.player_bag, "🎒 Inventaire partagé");
    assert.strictEqual(locEn.inventory.player_bag, "🎒 Shared Inventory");

    // Vérification du titre dans Scene_Inventory via SC4_Localization mocké
    const savedLoc = global.SC4_Localization;
    try {
        global.SC4_Localization = { getText: (k, d) => (k === "inventory.player_bag" ? uiFr.inventory.player_bag : d) };
        setupPartyMock();
        Scene_Inventory.prepare("C_1", { persistent: true });
        const scene = new Scene_Inventory();
        scene.create();
        assert.strictEqual(scene._partyHeaderWindow._title, "🎒 Inventaire partagé");
        assert.strictEqual(scene._partyWindow._title, "🎒 Inventaire partagé");
    } finally {
        global.SC4_Localization = savedLoc;
    }
});

console.log(`\n--- Section J: Portrait Composite (<Hero> sans <Face>) & Refresh Equipement ---`);

test("J1: Window_InventoryHeader compose le visage Hero même sans notetag <Face>", () => {
    const savedBC = global.Bitmap_Composite;
    const savedParty = global.$gameParty;
    try {
        const composedBitmaps = new Map();
        const flakEquip = { id: 4, name: "Armure Flak", etypeId: 5, note: "<face:flak,1>" };
        let currentEquips = [];
        let readyState = true;

        const makeEntry = (key, label) => {
            const bmp = new Bitmap(144, 144);
            bmp._label = label;
            return {
                bitmap: bmp,
                isComposed: false,
                composer: {
                    isReady: () => readyState,
                    bltComposite: (dest) => {
                        dest._composedLabel = label;
                    }
                }
            };
        };

        global.Bitmap_Composite = {
            getCompositeFaceEntry: (actor) => {
                const eqKey = actor.equips().map(e => (e ? e.id : 0)).join("-");
                const key = `face_${actor.actorId()}_human_male_${eqKey}`;
                if (!composedBitmaps.has(key)) {
                    composedBitmaps.set(key, makeEntry(key, eqKey === "4" ? "hero_flak" : "hero_base"));
                }
                return composedBitmaps.get(key);
            }
        };

        const heroLeader = {
            actorId: () => 1,
            name: () => "Mosay",
            faceName: () => "Actor1",
            faceIndex: () => 0,
            race: () => "Human",
            sex: () => "Male",
            isHero: () => true,
            hasFace: () => false, // Mosay n'a PAS <Face>, uniquement <Hero>
            equips: () => currentEquips
        };

        global.$gameParty = {
            leader: () => heroLeader,
            totalWeight: () => 0,
            maxWeight: () => 48
        };

        const bltDraws = [];
        let vanillaDrawFaceCount = 0;
        const header = new Window_InventoryHeader(new Rectangle(0, 0, 358, 168), "Inventaire partagé", true);
        header.drawFace = () => { vanillaDrawFaceCount++; };
        header.contents.blt = (src) => {
            if (src && src._composedLabel) {
                bltDraws.push(src._composedLabel);
            }
        };

        // 1. Premier rendu sans armure Flak -> doit dessiner "hero_base", JAMAIS vanilla Actor1
        header.refresh();
        assert.strictEqual(vanillaDrawFaceCount, 0, "Un acteur <Hero> sans <Face> ne doit pas retomber sur drawFace(Actor1)");
        assert.strictEqual(bltDraws[bltDraws.length - 1], "hero_base");

        // 2. Équipement Flak avec chargement asynchrone : aucun flash vanilla tant que !isReady()
        currentEquips = [flakEquip];
        readyState = false;
        header.refresh();
        assert.strictEqual(vanillaDrawFaceCount, 0, "Pendant le chargement async du visage équipé, ne pas flasher Actor1");
        assert.strictEqual(bltDraws[bltDraws.length - 1], "hero_base", "Conserve le portrait prêt précédent durant le chargement");

        // 3. Fin de chargement async au update() suivant -> compose et rafraîchit sur "hero_flak"
        readyState = true;
        header.update();
        assert.strictEqual(bltDraws[bltDraws.length - 1], "hero_flak", "Le visage composite mis à jour avec Armure Flak doit s'afficher");

        // 4. Retrait d'équipement détecté automatiquement via update() même sans refresh() explicite
        currentEquips = [];
        header.update();
        assert.strictEqual(bltDraws[bltDraws.length - 1], "hero_base", "Le retrait d'équipement met à jour le portrait via update()");
    } finally {
        global.Bitmap_Composite = savedBC;
        global.$gameParty = savedParty;
    }
});

test("J2: Scene_Inventory.onActionEquip met à jour le portrait du header gauche après équipement", () => {
    const savedBC = global.Bitmap_Composite;
    const savedParty = global.$gameParty;
    const savedInv = global.$inventories;
    const savedPlayer = global.$gamePlayer;
    try {
        const flakArmor = { id: 4, name: "Armure Flak", etypeId: 5, params: [0, 0, 0, 5, 0, 0, 0, 0], note: "<face:flak,1>" };
        const chest = createMockContainer("C_1", new Map([[flakArmor, 1]]));
        const partyStore = createMockContainer("PARTY", new Map());
        let equipped = [null, null, null, null, null];
        const cache = new Map();

        global.Bitmap_Composite = {
            getCompositeFaceEntry: (actor) => {
                const eqKey = actor.equips().map(e => (e ? e.id : 0)).join("-");
                const key = `face_${actor.actorId()}_${eqKey}`;
                if (!cache.has(key)) {
                    const hasFlak = actor.equips().some(e => e && e.id === 4);
                    const bmp = new Bitmap(144, 144);
                    cache.set(key, {
                        bitmap: bmp,
                        isComposed: false,
                        composer: {
                            isReady: () => true,
                            bltComposite: (dest) => {
                                dest._variant = hasFlak ? "flak_portrait" : "base_portrait";
                            }
                        }
                    });
                }
                return cache.get(key);
            }
        };

        const bltVariants = [];
        const origBlt = Bitmap.prototype.blt;
        Bitmap.prototype.blt = function (src, ...args) {
            if (src && src._variant) {
                bltVariants.push(src._variant);
            }
            return origBlt.call(this, src, ...args);
        };

        try {
            const leader = {
                actorId: () => 1,
                name: () => "Mosay",
                faceName: () => "Actor1",
                faceIndex: () => 0,
                race: () => "Human",
                sex: () => "Male",
                isHero: () => true,
                hasFace: () => false,
                canEquip: () => true,
                equips: () => equipped,
                equipSlots: () => [1, 2, 3, 4, 5],
                param: () => 10,
                equipment: {
                    findSlotFor: () => 4,
                    itemAt: (s) => equipped[s] || null,
                    equip: (it) => {
                        equipped[4] = it;
                        return true;
                    }
                }
            };

            global.$inventories = { inventory: () => chest };
            global.$gameParty = {
                leader: () => leader,
                allItems: () => partyStore.items(),
                numItems: (it) => partyStore.numItems(it),
                gainItem: (it, a) => partyStore.gainItem(it, a),
                loseItem: (it, a) => partyStore.loseItem(it, a),
                totalWeight: () => partyStore.totalWeight(),
                maxWeight: () => 48
            };
            global.$gamePlayer = { refresh: () => {} };

            Scene_Inventory.prepare("C_1", { persistent: true });
            const scene = new Scene_Inventory();
            scene.create();
            scene.start();

            assert.strictEqual(bltVariants[bltVariants.length - 1], "base_portrait");

            scene._targetWindow.select(0);
            scene.onTargetListOk();
            scene.onActionEquip();

            assert.strictEqual(bltVariants[bltVariants.length - 1], "flak_portrait", "Le header gauche doit redessiner le nouveau visage équipé dès onActionEquip()");
        } finally {
            Bitmap.prototype.blt = origBlt;
        }
    } finally {
        global.Bitmap_Composite = savedBC;
        global.$gameParty = savedParty;
        global.$inventories = savedInv;
        global.$gamePlayer = savedPlayer;
    }
});

console.log(`\n==============================================================`);
console.log(`   RÉSULTAT : ${passed}/${passed} tests passés avec succès !`);
console.log(`==============================================================\n`);
