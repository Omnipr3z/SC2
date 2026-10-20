//=============================================================================
// test_dial_review.js
// Tests unitaires validant l'ensemble des points de la revue DIAL_with_AI
//=============================================================================

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Environnement global simulé
global.window = global;
global.Graphics = { width: 1280, height: 720, boxWidth: 1280, boxHeight: 720 };
global.Rectangle = class Rectangle {
    constructor(x, y, width, height) {
        this.x = x || 0;
        this.y = y || 0;
        this.width = width || 0;
        this.height = height || 0;
    }
};
global.Bitmap = class Bitmap {};
global.Sprite = class Sprite { constructor() { this.scale = { x: 1, y: 1 }; } };
global.ImageManager = { loadSystem: () => ({}), loadBitmap: () => ({ addLoadListener: () => {} }) };

global.ConfigManager = { locale: "FR" };
global.Game_System = class Game_System {
    constructor() { this._locale = "FR"; }
    mainFontFace() { return "sans-serif"; }
};
global.$gameSystem = new global.Game_System();

global.PluginManager = {
    parameters: () => ({}),
    registerCommand: () => {}
};
global.Input = { isPressed: () => false, isTriggered: () => false };
global.TouchInput = { isTriggered: () => false, isLongPressed: () => false };
global.SceneManager = { goto: () => {}, push: () => {}, pop: () => {} };
global.SoundManager = { playOk: () => {}, playCancel: () => {}, playCursor: () => {}, playBuzzer: () => {} };

global.Window_Base = class Window_Base {
    constructor(rect) {
        this.x = rect ? rect.x : 0;
        this.y = rect ? rect.y : 0;
        this.width = rect ? rect.width : 0;
        this.height = rect ? rect.height : 0;
        this.contents = {
            clear: () => {},
            fillRect: () => {},
            drawText: () => {}
        };
    }
    contentsWidth() { return this.width; }
    textWidth(str) { return (str || "").length * 8; }
    convertEscapeCharacters(text) {
        text = text.replace(/\\/g, "\x1b");
        text = text.replace(/\x1b\x1b/g, "\\");
        text = text.replace(/\x1bN\[(\d+)\]/gi, (_, n) => this.actorName(parseInt(n)));
        return text;
    }
    actorName(n) {
        if (n === 2) return "Gouverneur Malakor";
        return `Actor_${n}`;
    }
    drawText() {}
};

global.Window_Scrollable = class Window_Scrollable extends global.Window_Base {
    constructor(rect) {
        super(rect);
        this.innerHeight = rect ? rect.height : 600;
        this.innerWidth = rect ? rect.width : 500;
    }
    scrollTo() {}
};

global.Window_Selectable = class Window_Selectable extends global.Window_Base {
    constructor(rect) { super(rect); }
    refresh() {}
    select() {}
};
global.Window_Command = class Window_Command extends global.Window_Selectable {
    constructor(rect) { super(rect); }
};
global.Window_HorzCommand = class Window_HorzCommand extends global.Window_Command {
    constructor(rect) { super(rect); }
};

global.Scene_Base = class Scene_Base {
    constructor() {}
    addWindow() {}
    startFadeOut() {}
};
global.Scene_Map = class Scene_Map extends global.Scene_Base { update() {} };
global.Scene_MenuBase = class Scene_MenuBase extends global.Scene_Base {};

// Simulation Audio
global.playedSeList = [];
global.playedBgsList = [];
global.savedBgs = null;
global.AudioManager = {
    playSe: (se) => { global.playedSeList.push(se); },
    playBgs: (bgs) => { global.playedBgsList.push(bgs); },
    saveBgs: () => ({ name: "vaisseau", volume: 80, pitch: 100 }),
    replayBgs: (bgs) => { global.playedBgsList.push({ replay: true, ...bgs }); },
    stopBgs: () => { global.playedBgsList.push({ stopped: true }); }
};

// Simulation Inventaires et Party
global.mockPartyGold = 0;
global.mockPartyItems = {};
global.mockContainerItems = {};

global.$gameParty = {
    leader: () => ({
        actor: () => ({ note: "<stock: C_ARMORY>" })
    }),
    members: () => [
        { actor: () => ({ note: "<stock: C_ARMORY>" }) }
    ],
    gainGold: (n) => { global.mockPartyGold += n; },
    gainItem: (it, q) => { global.mockPartyItems[it.id] = (global.mockPartyItems[it.id] || 0) + q; }
};

global.$inventories = {
    _invs: {},
    inventory: (id) => {
        if (!global.$inventories._invs[id]) {
            global.$inventories._invs[id] = {
                id,
                items: {},
                gainItem: function(it, q) {
                    this.items[it.id] = (this.items[it.id] || 0) + q;
                }
            };
        }
        return global.$inventories._invs[id];
    }
};

global.$dataItems = { 7: { id: 7, name: "Ration de Survie" } };
global.$dataWeapons = { 1: { id: 1, name: "Fusil Laser" } };
global.$dataArmors = { 4: { id: 4, name: "Armure Flak" } };

// Chargement des plugins
const vm = require('vm');
const ROOT_DIR = path.resolve(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Localization.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_SpaceTravel.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_SpaceScenes.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_QuestManager.js'), 'utf8'));

console.log("==============================================================");
console.log("--- TEST VALIDATION REVUE DIAL_with_AI ---");
console.log("==============================================================");

// 1. Test Game_Planet.isStation()
const planet1 = new Game_Planet({ id: 4, name: "Ankaros Prime", type: "Hive World" }, 0);
const station1 = new Game_Planet({ id: 8, name: "Station Altus", type: "Orbital Station" }, 1);
const relay1 = new Game_Planet({ id: 13, name: "Station Relais Mortis", type: "Orbital Station" }, 2);

assert.strictEqual(planet1.isStation(), false, "Ankaros Prime ne doit pas être une station");
assert.strictEqual(station1.isStation(), true, "Station Altus doit être une station");
assert.strictEqual(relay1.isStation(), true, "Station Relais Mortis doit être une station");
console.log("✅ 1. Détection dynamique Game_Planet.isStation() : OK");

// 2. Test Game_Spaceship Audio attributes & defaults
const shipData = { id: 0, name: "Dawn Of Faith", x: 100, y: 100 };
const testShip = new Game_Spaceship(shipData);
assert.deepStrictEqual(testShip.movingSE, { name: "Collapse3", volume: 90, pitch: 80 }, "movingSE default invalide");
assert.deepStrictEqual(testShip.hyperdriveBGS, { name: "FIREWIND2", volume: 90, pitch: 100 }, "hyperdriveBGS default invalide");
assert.deepStrictEqual(testShip.warpjumpSE, { name: "ShipJump", volume: 90, pitch: 100 }, "warpjumpSE default invalide");
console.log("✅ 2. Valeurs et getters audio par défaut de Game_Spaceship : OK");

// 3. Test Scene_SectorTravel.playSpaceShipSe() avec override saut warp
global.$gameSpaceships = { playerShip: () => testShip };
const sectorScene = new Scene_SectorTravel();
sectorScene._controlsWindow = { setCommands: () => {} };
sectorScene._selectedSystemId = 1;
sectorScene.onEngageJump();

assert(global.playedSeList.length > 0, "Aucun SE joué lors du saut warp");
const lastSe = global.playedSeList[global.playedSeList.length - 1];
assert.strictEqual(lastSe.name, "ShipJump");
assert.strictEqual(lastSe.volume, 90);
assert.strictEqual(lastSe.pitch, 110);
console.log("✅ 3. Scene_SectorTravel.playSpaceShipSe() au saut warp (vol 90, pitch 110) : OK");

// 4. Test Hyperdrive BGS dans Scene_SpaceTravel
const spaceScene = new Scene_SpaceTravel();
spaceScene.activateHyperdrive();
assert(spaceScene._hyperdriveBgsPlaying, "Hyperdrive BGS doit être marqué en cours");
const lastBgs = global.playedBgsList[global.playedBgsList.length - 1];
assert.strictEqual(lastBgs.name, "FIREWIND2");

spaceScene.deactivateHyperdrive();
assert.strictEqual(spaceScene._hyperdriveBgsPlaying, false, "Hyperdrive BGS doit être désactivé");
const replayBgs = global.playedBgsList[global.playedBgsList.length - 1];
assert(replayBgs.replay, "Le BGS initial n'a pas été rejoué");
assert.strictEqual(replayBgs.name, "vaisseau");
console.log("✅ 4. Scene_SpaceTravel : bascule et restauration propre du BGS Hyperdrive : OK");

// 5. Test Récompenses de Quête et distribution dans <stock: C_ARMORY>
const questData = {
    id: 0,
    name: "Livraison spéciale",
    description: "Le gouverneur \\n[2] vous a demandé de transporter un colis.",
    rewardVisible: true,
    rewards: {
        gold: 500,
        items: [{ id: 7, quantity: 3 }],
        armors: [{ id: 4, quantity: 1 }]
    }
};

const quest = new Game_Quest(questData);
assert.strictEqual(quest.rewardVisible, true);
assert.deepStrictEqual(quest.rewards.gold, 500);
assert.strictEqual(quest.rewards.items.length, 2);

// Complétion de la quête -> distribution
quest.complete();
assert.strictEqual(global.mockPartyGold, 500, "L'or de la récompense doit aller à la party");

const armoryInv = global.$inventories.inventory("C_ARMORY");
assert.strictEqual(armoryInv.items[7], 3, "Les items doivent être livrés dans le stock C_ARMORY du leader");
assert.strictEqual(armoryInv.items[4], 1, "L'armure doit être livrée dans le stock C_ARMORY du leader");
console.log("✅ 5. Distribution des récompenses de quête (Gold -> Party, Items -> <stock:[ID]>) : OK");

// 6. Test Window_QuestDetail convertEscapeCharacters et affichage
const detailWin = new Window_QuestDetail(new Rectangle(0, 0, 600, 600));
detailWin.setQuest(quest);

let wrappedOutput = [];
detailWin.drawText = (text) => { wrappedOutput.push(text); };
detailWin.drawWrappedText(quest.description, 0, 0, 500);

assert(wrappedOutput.some(line => line.includes("Gouverneur Malakor")), "La variable \\n[2] aurait dû être résolue vers 'Gouverneur Malakor'");
console.log("✅ 6. Résolution dynamique des caractères d'échappement (\\n[2] -> Nom de l'acteur) : OK");

// 7. Test Quest avec rewardVisible = false
const secretQuest = new Game_Quest({
    id: 1,
    name: "Mission Secrète",
    rewardVisible: false,
    rewards: { gold: 1000 }
});
assert.strictEqual(secretQuest.rewardVisible, false);
console.log("✅ 7. Attribut rewardVisible = false bien pris en compte : OK");

console.log("\n==============================================================");
console.log("🎉 TOUTES LES FONCTIONNALITÉS DE LA REVUE DIAL SONT VALIDÉES !");
console.log("==============================================================");
