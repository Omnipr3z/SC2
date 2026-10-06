/**
 * ============================================================================
 * UNIT TEST : Étape 10 - Système Multi-Inventaires ($inventories)
 * ============================================================================
 * Valide l'architecture complète des inventaires secondaires indépendants :
 * - Hub global $inventories (Game_Inventories) et instanciation à la volée (Game_Inventory).
 * - Préchargement des inventaires initiaux depuis data/SC/INVENTORIES.json ($dataInventories).
 * - Inventaires de héros ("A_[ID]"), conteneurs ("C_[ID]") et ennemis ("E_[ID]").
 * - Génération de butin vanilla ($inventories.initEnnemyInventory) selon probabilités (dropItems).
 * - Sauvegarde / Chargement : sérialisation (makeSaveContents) et extraction (extractSaveContents).
 * - Vidage de cadavre / conteneur et suppression de la liste ($inventories.unset).
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Mock d'environnement RMMZ
global.window = global;
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

global.$dataItems = [
    null,
    { id: 1, name: 'Reserve', _itype: 'item' },
    { id: 2, name: 'Empty', _itype: 'item' },
    { id: 3, name: '', _itype: 'item' },
    { id: 4, name: '', _itype: 'item' },
    { id: 5, name: '', _itype: 'item' },
    { id: 6, name: '', _itype: 'item' },
    { id: 7, name: 'Potion', _itype: 'item' },
    { id: 8, name: 'Super potion', _itype: 'item' },
    { id: 9, name: 'Hyper potion', _itype: 'item' },
    { id: 10, name: 'Eau magique', _itype: 'item' },
    { id: 11, name: 'Stimulant', _itype: 'item' },
    { id: 12, name: 'Herbe apaisante', _itype: 'item' },
    { id: 13, name: 'Antidote', _itype: 'item' }
];

global.$dataWeapons = [
    null,
    { id: 1, name: 'Epee courte', _itype: 'weapon' },
    { id: 2, name: 'Epee longue', _itype: 'weapon' }
];

global.$dataArmors = [
    null,
    { id: 1, name: 'Bouclier', _itype: 'armor' }
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

// Chargement des plugins
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Game_Inventory.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Game_Inventories.js'), 'utf8'));

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

// Réinitialisation puis restauration
const newInventories = new Game_Inventories();
newInventories.loadSavefileData(saveData);
assert("A_1 restauré avec 10 Potions", newInventories.inventory('A_1').numItems($dataItems[7]) === 10);

console.log('\n--- TEST 5 : Transfert et Vidage de cadavre ---');
const testInv = new Game_Inventory('TEST_DROP');
testInv.gainItem($dataItems[7], 2);
assert("testInv n'est pas vide initialement", !testInv.isEmpty());

// Retrait de tous les items
testInv.loseItem($dataItems[7], 2);
assert("testInv est vide après retrait", testInv.isEmpty());

$inventories.unset('E_1');
assert("E_1 n'est plus présent dans le hub d'inventaires", !$inventories.hasInventory('E_1'));

console.log('\n✅ TOUS LES TESTS UNITAIRES ÉTAPE 10 SONT VALIDÉS AVEC SUCCÈS !');
