/**
 * ============================================================================
 * UNIT TEST : Étape 10 - Système Multi-Inventaires ($inventories) & Gestion du Poids
 * ============================================================================
 * Valide l'architecture complète des inventaires secondaires et du système de poids :
 * 1. Hub global $inventories et instanciation à la volée.
 * 2. Préchargement et restrictions configurées dans data/SC/INVENTORIES.json.
 * 3. Restrictions de conteneurs (onlyWeapons, onlyItems, onlyAmmo, allowedItemIds, blockedItemIds, maxSlots, maxWeight).
 * 4. API simple de gestion ($inventories.create, $inventories.remove).
 * 5. Système de poids des objets (notetag <weight: X> / <height: X>, défaut = 1).
 * 6. Équipement à poids négatif (bonus de capacité lorsqu'équipé, annulé au retrait).
 * 7. Capacité de poids d'équipe basée sur la force (atk) et ajustement dynamique.
 * 8. Détection de surcharge, blocage du déplacement du joueur et alerte rouge.
 * 9. Option de jeter des objets (drop 1, drop all) pour alléger l'inventaire.
 * 10. Automatisation de l'interrupteur local B pour les événements conteneurs.
 * 11. Règles de dépôt : interdit dans les cadavres (E_) ou éphémères, autorisé dans les conteneurs persistants (C_) et alliés (A_).
 * 12. Persistance Sauvegarde / Chargement intégrale.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Mock d'environnement RMMZ
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

global.DataManager = {
    isItem: (item) => Boolean(item && item._itype === 'item'),
    isWeapon: (item) => Boolean(item && item._itype === 'weapon'),
    isArmor: (item) => Boolean(item && item._itype === 'armor'),
    loadDatabase: () => {},
    isDatabaseLoaded: () => true,
    createGameObjects: () => {},
    makeSaveContents: () => ({}),
    extractSaveContents: () => {}
};

global.SoundManager = {
    playBuzzer: () => { global._soundPlayed = 'buzzer'; },
    playEquip: () => { global._soundPlayed = 'equip'; },
    playUseItem: () => { global._soundPlayed = 'useItem'; },
    playCancel: () => { global._soundPlayed = 'cancel'; },
    playOk: () => { global._soundPlayed = 'ok'; }
};

global.ColorManager = {
    systemColor: () => '#ffffa0',
    dimColor1: () => 'rgba(0, 0, 0, 0.6)'
};

global.$dataItems = [
    null,
    { id: 1, name: 'Munition 9mm', _itype: 'item', note: '<ammo>' },
    { id: 2, name: 'Empty', _itype: 'item' },
    { id: 3, name: '', _itype: 'item' },
    { id: 4, name: '', _itype: 'item' },
    { id: 5, name: '', _itype: 'item' },
    { id: 6, name: '', _itype: 'item' },
    { id: 7, name: 'Potion', _itype: 'item', note: '<height: 0.5>' },
    { id: 8, name: 'Super potion', _itype: 'item', note: '<weight: 1>' },
    { id: 9, name: 'Hyper potion', _itype: 'item', note: '<weight: 1.5>' },
    { id: 10, name: 'Eau magique', _itype: 'item' },
    { id: 11, name: 'Stimulant', _itype: 'item' },
    { id: 12, name: 'Herbe apaisante', _itype: 'item' },
    { id: 13, name: 'Antidote', _itype: 'item', note: '<weight: 0.8>' }
];

global.$dataWeapons = [
    null,
    { id: 1, name: 'Epee courte', _itype: 'weapon', note: '<weight: 3>' },
    { id: 2, name: 'Epee longue', _itype: 'weapon', note: '<weight: 5>' },
    { id: 3, name: 'Fusil tactique', _itype: 'weapon', note: '<weight: 4>\n<ammoId: 1>' }
];

global.$dataArmors = [
    null,
    { id: 1, name: 'Bouclier', _itype: 'armor', note: '<weight: 4>' },
    { id: 2, name: 'Sac à dos militaire', _itype: 'armor', note: '<weight: -15>' }
];

global.$dataEnemies = [
    null,
    {
        id: 1,
        name: 'Gobelin',
        dropItems: [
            { kind: 1, dataId: 7, denominator: 1 } // Drop garanti : Potion (id 7)
        ]
    }
];

// Mock Map et SelfSwitches
global.$gameSelfSwitches = {
    _data: {},
    value: function(key) {
        return Boolean(this._data[key.join(',')]);
    },
    setValue: function(key, val) {
        this._data[key.join(',')] = Boolean(val);
    }
};

global.$gameMap = {
    _mapId: 1,
    mapId: () => 1,
    events: () => [
        {
            eventId: () => 1,
            event: () => ({ note: '<inventory: C_1>' })
        },
        {
            eventId: () => 2,
            event: () => ({ note: '<inventory: C_ARMORY>' })
        }
    ],
    event: function(id) {
        return this.events().find(e => e.eventId() === id) || null;
    }
};

global.Game_Actors = class Game_Actors {};
global.Game_Map = class Game_Map {};
global.Game_Actor = class Game_Actor {
    constructor(id) {
        this._actorId = id;
        this.atk = 10;
        this._equips = [];
    }
    actorId() { return this._actorId; }
    equips() {
        return this._equips.map(e => (e && typeof e.object === 'function') ? e.object() : e);
    }
    name() { return 'Hero_' + this._actorId; }
};
global.Game_Action = class Game_Action {};
global.Game_CharacterBase = class Game_CharacterBase {};
global.Game_Character = class Game_Character extends global.Game_CharacterBase {};
global.Game_Player = class Game_Player extends global.Game_Character {
    constructor() {
        super();
        this._overloadAlertTimer = 0;
        this._overloadAlertCooldown = 0;
    }
    canMove() { return true; }
    isMoving() { return false; }
    getInputDirection() { return 2; }
};
global.Game_Follower = class Game_Follower {};
global.Game_Event = class Game_Event {};
global.Game_Interpreter = class Game_Interpreter {};
global.Sprite_Character = class Sprite_Character {
    constructor(character) {
        this._character = character;
        this._blendColor = [0, 0, 0, 0];
    }
    setBlendColor(color) { this._blendColor = color; }
    updateOther() {}
};
global.Game_Party = class Game_Party {
    constructor() {
        this._actors = [];
        this._items = {};
        this._weapons = {};
        this._armors = {};
    }
    members() {
        return this._actors.map(id => (typeof $gameActors !== 'undefined' ? $gameActors.actor(id) : null)).filter(Boolean);
    }
    leader() {
        const m = this.members();
        return m.length > 0 ? m[0] : null;
    }
    allItems() {
        const list = [];
        for (const id of Object.keys(this._items)) {
            if ($dataItems[id]) list.push($dataItems[id]);
        }
        for (const id of Object.keys(this._weapons)) {
            if ($dataWeapons[id]) list.push($dataWeapons[id]);
        }
        for (const id of Object.keys(this._armors)) {
            if ($dataArmors[id]) list.push($dataArmors[id]);
        }
        return list;
    }
    numItems(item) {
        if (!item) return 0;
        if (DataManager.isItem(item)) return this._items[item.id] || 0;
        if (DataManager.isWeapon(item)) return this._weapons[item.id] || 0;
        if (DataManager.isArmor(item)) return this._armors[item.id] || 0;
        return 0;
    }
    gainItem(item, amount) {
        if (!item) return;
        const current = this.numItems(item);
        const newTotal = Math.max(0, current + amount);
        let dict = null;
        if (DataManager.isItem(item)) dict = this._items;
        else if (DataManager.isWeapon(item)) dict = this._weapons;
        else if (DataManager.isArmor(item)) dict = this._armors;
        if (dict) {
            if (newTotal > 0) dict[item.id] = newTotal;
            else delete dict[item.id];
        }
    }
    loseItem(item, amount) {
        this.gainItem(item, -amount);
    }
};

global.Window_Base = class Window_Base {
    constructor(rect) {
        this.x = rect ? rect.x : 0;
        this.y = rect ? rect.y : 0;
        this.width = rect ? rect.width : 0;
        this.height = rect ? rect.height : 0;
        this.contents = {
            clear: () => {},
            fillRect: () => {}
        };
    }
    lineHeight() { return 36; }
    itemHeight() { return 36; }
    calcWindowHeight(numLines, selectable) { return numLines * 36 + 24; }
    mainAreaTop() { return 0; }
    resetTextColor() {}
    changeTextColor() {}
    changePaintOpacity() {}
    drawText() {}
    innerWidth() { return this.width - 24; }
    innerHeight() { return this.height - 24; }
};
global.Window_Selectable = class Window_Selectable extends global.Window_Base {
    constructor(rect) {
        super(rect);
        this.active = false;
        this._index = -1;
        this._handlers = {};
    }
    activate() { this.active = true; }
    deactivate() { this.active = false; }
    select(i) { this._index = i; }
    index() { return this._index; }
    setHandler(sym, fn) { this._handlers[sym] = fn; }
    setHelpWindow(hw) { this._helpWindow = hw; }
    refresh() {}
    drawAllItems() {}
    itemLineRect(i) { return new Rectangle(0, i * 36, this.width, 36); }
    drawItemName() {}
};
global.Window_Command = class Window_Command extends global.Window_Selectable {
    constructor(rect) {
        super(rect);
        this._list = [];
    }
    clearCommandList() { this._list = []; }
    addCommand(name, symbol, enabled = true) {
        this._list.push({ name, symbol, enabled });
    }
    open() { this.openness = 255; }
    close() { this.openness = 0; }
    refresh() { this.clearCommandList(); this.makeCommandList(); }
    makeCommandList() {}
};
global.Window_HorzCommand = class Window_HorzCommand extends global.Window_Command {};
global.Window_Help = class Window_Help extends global.Window_Base {
    setItem() {}
    setText() {}
};
global.Scene_Base = class Scene_Base {
    popScene() {}
    addWindow(w) {}
};
global.Scene_MenuBase = class Scene_MenuBase extends global.Scene_Base {
    calcWindowHeight(lines, sel) { return lines * 36 + 24; }
    mainAreaTop() { return 0; }
};
global.LocalisationManager = {
    getText: (key, fallback) => fallback
};
global.SC4 = {};

// Chargement des plugins
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Game_Inventory.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Game_Inventories.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_rmmz_objects_Patches.js'), 'utf8'));

// Chargement de data/SC/INVENTORIES.json
global.$dataInventories = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/SC/INVENTORIES.json'), 'utf8'));

function assert(desc, condition) {
    if (!condition) {
        console.error(`❌ ÉCHEC : ${desc}`);
        process.exit(1);
    }
    console.log(`[PASS] ${desc}`);
}

console.log('--- TEST 1 : Initialisation & Accès à la volée ---');
const invA1 = $inventories.inventory('A_1');
assert("A_1 a le bon identifiant", invA1.id() === 'A_1');
assert("A_1 contient 10 Potions", invA1.numItems($dataItems[7]) === 10);
assert("A_1 contient 5 Super potions", invA1.numItems($dataItems[8]) === 5);

console.log('\n--- TEST 2 : Conteneur C_1 ---');
const invC1 = $inventories.inventory('C_1');
assert("C_1 a le bon identifiant", invC1.id() === 'C_1');
assert("C_1 contient 10 Potions", invC1.numItems($dataItems[7]) === 10);
assert("C_1 contient 5 Antidotes", invC1.numItems($dataItems[13]) === 5);

console.log('\n--- TEST 3 : Ennemi E_1 avec Butin Vanilla ---');
$inventories.initEnnemyInventory(1);
const invE1 = $inventories.inventory('E_1');
assert("E_1 a le bon identifiant", invE1.id() === 'E_1');
assert("E_1 contient au moins 1 Potion issue du butin", invE1.numItems($dataItems[7]) >= 1);

console.log('\n--- TEST 4 : Persistance Sauvegarde / Chargement ---');
const saveData = $inventories.makeSavefileData();
assert("Les données de sauvegarde contiennent A_1, C_1 et E_1", 
    Boolean(saveData.A_1 && saveData.C_1 && saveData.E_1));

const newInventories = new Game_Inventories();
newInventories.loadSavefileData(saveData);
assert("A_1 restauré avec 10 Potions", newInventories.inventory('A_1').numItems($dataItems[7]) === 10);

console.log('\n--- TEST 5 : Transfert et Vidage de cadavre ---');
const testInv = new Game_Inventory('TEST_DROP');
testInv.gainItem($dataItems[7], 2);
assert("testInv n'est pas vide initialement", !testInv.isEmpty());
testInv.loseItem($dataItems[7], 2);
assert("testInv est vide après retrait", testInv.isEmpty());

$inventories.unset('E_1');
assert("E_1 n'est plus présent dans le hub d'inventaires", !$inventories.hasInventory('E_1'));

console.log('\n--- TEST 6 : Support des Armes et Armures ---');
const armoryInv = new Game_Inventory('C_ARMORY_TEST');
armoryInv.loadData([
    { weapon_id: 1, quantity: 2 },
    { armor_id: 1, quantity: 1 },
    { item_id: 7, quantity: 5 }
]);
assert("Contient 2 Épées courtes (weapon)", armoryInv.numItems($dataWeapons[1]) === 2);
assert("Contient 1 Bouclier (armor)", armoryInv.numItems($dataArmors[1]) === 1);
assert("Contient 5 Potions (item)", armoryInv.numItems($dataItems[7]) === 5);
assert("items() retourne bien 3 entrées distinctes", armoryInv.items().length === 3);

console.log('\n--- TEST 7 : Conteneur Persistant & Non-Duplication Save/Load ---');
const chest = $inventories.inventory('C_CHEST');
chest.setPersistent(true);
assert("C_CHEST est configuré persistant", chest.isPersistent());
chest.gainItem($dataWeapons[2], 1);
chest.gainItem($dataItems[8], 3);
chest.clear();
assert("C_CHEST est maintenant vide", chest.isEmpty());

const saveState = $inventories.makeSavefileData();
const loadedHub = new Game_Inventories();
loadedHub.loadSavefileData(saveState);
const loadedChest = loadedHub.inventory('C_CHEST');
assert("C_CHEST reste persistant après chargement", loadedChest.isPersistent());
assert("C_CHEST reste vide après chargement", loadedChest.isEmpty());
loadedChest.gainItem($dataArmors[1], 2);
assert("C_CHEST accepte de nouveaux objets après rechargement", loadedChest.numItems($dataArmors[1]) === 2);

console.log('\n--- TEST 8 : Restrictions de Conteneurs (INVENTORIES.json & canAcceptItem) ---');
const cArmory = $inventories.inventory('C_ARMORY');
assert("C_ARMORY est réservé aux armes", cArmory._onlyWeapons === true);
assert("C_ARMORY accepte une épée", cArmory.canAcceptItem($dataWeapons[1]));
assert("C_ARMORY refuse une potion", !cArmory.canAcceptItem($dataItems[7]));

const cAmmo = $inventories.inventory('C_AMMO_BOX');
assert("C_AMMO_BOX est réservé aux munitions", cAmmo._onlyAmmo === true);
assert("C_AMMO_BOX accepte les munitions 9mm (<ammo>)", cAmmo.canAcceptItem($dataItems[1]));
assert("C_AMMO_BOX refuse une arme", !cAmmo.canAcceptItem($dataWeapons[1]));
assert("C_AMMO_BOX refuse une potion", !cAmmo.canAcceptItem($dataItems[7]));

const cRestricted = $inventories.inventory('C_RESTRICTED');
assert("C_RESTRICTED autorise la potion 7", cRestricted.canAcceptItem($dataItems[7]));
assert("C_RESTRICTED interdit l'antidote 13 (blocked)", !cRestricted.canAcceptItem($dataItems[13]));
assert("C_RESTRICTED interdit le stimulant 11 (hors allowedItemIds)", !cRestricted.canAcceptItem($dataItems[11]));

// Test maxSlots
cRestricted.gainItem($dataItems[7], 1);
cRestricted.gainItem($dataItems[8], 1);
cRestricted.gainItem($dataItems[10], 1);
assert("C_RESTRICTED a 3 slots occupés", cRestricted.items().length === 3);
// Empilage d'un objet déjà présent : autorisé
assert("C_RESTRICTED autorise d'ajouter plus de potion 7 déjà présente", cRestricted.canAcceptItem($dataItems[7]));
// Nouvel objet qui dépasserait 3 slots : refusé
const newItem = { id: 88, name: 'Item88', _itype: 'item' };
assert("C_RESTRICTED refuse un 4ème slot", !cRestricted.canAcceptItem(newItem));

console.log('\n--- TEST 9 : API Simple ($inventories.create & $inventories.remove) ---');
const customInv = $inventories.create('C_CUSTOM', {
    persistent: true,
    maxSlots: 2,
    maxWeight: 10,
    onlyItems: true,
    items: [{ item_id: 7, quantity: 2 }]
});
assert("C_CUSTOM créé via l'API", customInv && customInv.id() === 'C_CUSTOM');
assert("C_CUSTOM contient 2 potions", customInv.numItems($dataItems[7]) === 2);
assert("C_CUSTOM refuse une arme (onlyItems)", !customInv.canAcceptItem($dataWeapons[1]));

$inventories.remove('C_CUSTOM');
assert("C_CUSTOM supprimé via remove()", !$inventories.hasInventory('C_CUSTOM'));

console.log('\n--- TEST 10 : Système de Poids des Objets (<height: X>, <weight: X>) ---');
assert("Potion note <height: 0.5> -> poids 0.5", DataManager.itemWeight($dataItems[7]) === 0.5);
assert("Super potion note <weight: 1> -> poids 1", DataManager.itemWeight($dataItems[8]) === 1);
assert("Hyper potion note <weight: 1.5> -> poids 1.5", DataManager.itemWeight($dataItems[9]) === 1.5);
assert("Objet sans notetag -> poids par défaut 1", DataManager.itemWeight($dataItems[10]) === 1);
assert("Épée courte note <weight: 3> -> poids 3", DataManager.itemWeight($dataWeapons[1]) === 3);
assert("Sac à dos note <weight: -15> -> rawWeight -15", DataManager.itemRawWeight($dataArmors[2]) === -15);
assert("Sac à dos dans le sac -> itemWeight >= 0 (pas de poids négatif en sac)", DataManager.itemWeight($dataArmors[2]) === 0);

console.log('\n--- TEST 11 : Capacité d\'Acteur & Bonus d\'Équipement Négatif ---');
const actor1 = new Game_Actor(1);
actor1.atk = 20; // Force de base
actor1._equips = []; // Aucun équipement
assert("Capacité de base acteur (atk 20 * 2.5) = 50", actor1.weightCapacity() === 50);

// Équipement du sac à dos militaire (<weight: -15>)
actor1._equips = [ { isItem: () => false, object: () => $dataArmors[2] } ];
assert("Bonus de capacité conféré par le sac équipé = +15", actor1.equipmentWeightCapacityBonus() === 15);
assert("Capacité totale avec sac à dos équipé = 65", actor1.weightCapacity() === 65);

// Retrait de l'équipement
actor1._equips = [];
assert("Retrait du sac : bonus retombe à 0", actor1.equipmentWeightCapacityBonus() === 0);
assert("Capacité retombe à 50", actor1.weightCapacity() === 50);

console.log('\n--- TEST 12 : Poids du Groupe ($gameParty) & Surcharge ---');
const actor2 = new Game_Actor(2);
actor2.atk = 10; // Capacité de base = 25
actor2._equips = [];

global.$gameParty = new Game_Party();
global.$gameParty._actors = [1, 2];
global.$gameActors = { actor: (id) => id === 1 ? actor1 : actor2 };

assert("Capacité du groupe (50 + 25) = 75", $gameParty.maxWeight() === 75);

// Remplissage du sac du groupe
$gameParty._items = {};
$gameParty._weapons = {};
$gameParty._armors = {};
$gameParty.gainItem($dataWeapons[1], 10); // 10 épées courtes * 3kg = 30kg
$gameParty.gainItem($dataItems[7], 20);   // 20 potions * 0.5kg = 10kg
assert("Poids total du groupe = 40kg", $gameParty.totalWeight() === 40);
assert("Groupe non surchargé (40 <= 75)", !$gameParty.isOverloaded());

// Ajout d'objets menant à la surcharge
$gameParty.gainItem($dataWeapons[2], 8); // 8 épées longues * 5kg = +40kg -> Total 80kg
assert("Poids total du groupe = 80kg", $gameParty.totalWeight() === 80);
assert("Groupe surchargé (80 > 75)", $gameParty.isOverloaded());

console.log('\n--- TEST 13 : Blocage du Déplacement & Alerte Rouge en Surcharge ---');
global.$gamePlayer = new Game_Player();
assert("Joueur ne peut pas se déplacer quand le groupe est surchargé", $gamePlayer.canMove() === false);

// Tentative de mouvement simulée
global._soundPlayed = null;
$gamePlayer.triggerOverloadAlert();
assert("Alerte sonore buzzer déclenchée", global._soundPlayed === 'buzzer');
assert("Timer d'alerte visuelle activé pour le flash rouge", $gamePlayer._overloadAlertTimer > 0);

console.log('\n--- TEST 14 : Action Jeter des Objets (Drop) pour Alléger le Sac ---');
// Le joueur jette 4 épées longues (4 * 5kg = -20kg) -> Total 60kg
$gameParty.loseItem($dataWeapons[2], 4);
assert("Poids total après avoir jeté 4 épées = 60kg", $gameParty.totalWeight() === 60);
assert("Groupe n'est plus surchargé (60 <= 75)", !$gameParty.isOverloaded());
assert("Joueur peut de nouveau se déplacer", $gamePlayer.canMove() === true);

console.log('\n--- TEST 15 : Automatisation de l\'Interrupteur Local B (Conteneurs) ---');
const c1 = $inventories.inventory('C_1');
// Initialement non vide
$inventories.updateEventSelfSwitchB('C_1');
assert("Interrupteur local B est à FALSE quand C_1 n'est pas vide", $gameSelfSwitches.value([1, 1, 'B']) === false);

// Vidage de C_1
c1.clear();
$inventories.updateEventSelfSwitchB('C_1');
assert("Interrupteur local B passe à TRUE quand C_1 est vidé", $gameSelfSwitches.value([1, 1, 'B']) === true);

// Remplissage de C_1
c1.gainItem($dataItems[7], 1);
$inventories.updateEventSelfSwitchB('C_1');
assert("Interrupteur local B repasse à FALSE quand C_1 est re-rempli", $gameSelfSwitches.value([1, 1, 'B']) === false);

console.log('\n--- TEST 16 : Règles de Dépôt dans Scene_Inventory ---');
// Mock minimal de Scene_Inventory pour tester isTargetPersistent
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Scene_Inventory.js'), 'utf8'));

const sceneInv = new Scene_Inventory();
sceneInv._targetId = 'E_1'; // Cadavre
assert("Dépôt strictement interdit dans un cadavre d'ennemi (E_)", sceneInv.isTargetPersistent() === false);

sceneInv._targetId = 'A_2'; // Allié
assert("Dépôt autorisé dans le sac d'un allié (A_)", sceneInv.isTargetPersistent() === true);

sceneInv._targetId = 'C_ARMORY'; // Conteneur persistant
sceneInv._targetInventory = $inventories.inventory('C_ARMORY');
assert("Dépôt autorisé dans un conteneur persistant (C_)", sceneInv.isTargetPersistent() === true);

sceneInv._targetId = 'C_EPHEMERAL'; // Conteneur éphémère auto_erase
sceneInv._targetInventory = $inventories.inventory('C_EPHEMERAL');
assert("Dépôt interdit dans un conteneur éphémère (auto_erase)", sceneInv.isTargetPersistent() === false);

console.log('\n🎉 TOUS LES 16 TESTS UNITAIRES DE L\'ÉTAPE 10 SONT VALIDÉS AVEC SUCCÈS !');
