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
const arrowPath = path.join(__dirname, "../js/plugins/SC4_Sprite_InventoryArrow.js");
const headerPath = path.join(__dirname, "../js/plugins/SC4_Window_InventoryHeader.js");
const actionPath = path.join(__dirname, "../js/plugins/SC4_Window_InventoryAction.js");
const commandPath = path.join(__dirname, "../js/plugins/SC4_Window_InventoryCommand.js");
const listPath = path.join(__dirname, "../js/plugins/SC4_Window_InventoryList.js");
const comparePath = path.join(__dirname, "../js/plugins/SC4_Window_InventoryCompare.js");
const scenePath = path.join(__dirname, "../js/plugins/SC4_Scene_Inventory.js");

eval(fs.readFileSync(arrowPath, "utf8"));
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
    const header = new Window_InventoryHeader(rect, "🎒 Sac du joueur", true);
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
    const header = new Window_InventoryHeader(rect, "🎒 Sac du joueur", true);
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

test("D3: Scene_Inventory onActionEquip depuis le sac du joueur", () => {
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

test("F2: Scene_Inventory.start() enfile automatiquement tuto_inv_transfer et tuto_inv_commands", () => {
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

    assert.strictEqual(global.$tutoManager._queue.length, 2, "Les 2 premiers tutoriels doivent être mis en file");
    assert.strictEqual(global.$tutoManager._queue[0].id, "tuto_inv_transfer");
    assert.strictEqual(global.$tutoManager._queue[0].data.position, "center");
    assert.strictEqual(global.$tutoManager._queue[0].data.arrow.angle, 0);

    assert.strictEqual(global.$tutoManager._queue[1].id, "tuto_inv_commands");
    assert.strictEqual(global.$tutoManager._queue[1].data.position, "top");
    assert.strictEqual(global.$tutoManager._queue[1].data.arrow.angle, 0);
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

console.log(`\n==============================================================`);
console.log(`   RÉSULTAT : ${passed}/22 tests passés avec succès !`);
console.log(`==============================================================\n`);
