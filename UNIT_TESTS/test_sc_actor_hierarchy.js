//=============================================================================
// test_sc_actor_hierarchy.js
// Test unitaire : Architecture SC4 Niveau 2 (Game_ScActor, Lazy Loading, _meta, _character)
//=============================================================================

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");

// 1. Mocks RMMZ de base
global.window = global;
global.Graphics = { frameCount: 0, width: 1760, height: 990 };
global.DEBUGTOOL = { log: () => {} };
global.PluginManager = { registerCommand: () => {} };
global.SceneManager = { push: () => {}, pop: () => {} };
global.TouchInput = { isRightPressed: () => false };

global.Game_Temp = class { setDestination() {} };
global.Game_System = class { isRingMenuEnabled() { return true; } };
global.Game_CharacterBase = class { constructor() { this.initMembers(); } initMembers() {} };
global.Game_Character = class extends global.Game_CharacterBase {
    constructor() {
        super();
        this.x = 10;
        this.y = 15;
        this._direction = 2;
    }
    direction() { return this._direction; }
};
global.Game_Player = class extends global.Game_Character {};
global.Game_Follower = class extends global.Game_Character { actor() { return null; } };
global.Game_Followers = class { forEach() {} };
global.Game_Vehicle = class extends global.Game_Character {};
global.Game_Event = class extends global.Game_Character {};
global.Game_Map = class {};
global.Game_BattlerBase = class { xparam() { return 0; } };
global.Game_Battler = class extends global.Game_BattlerBase {};
global.Game_Enemy = class extends global.Game_Battler {};
global.Game_Unit = class {};
global.Game_Party = class extends global.Game_Unit {
    constructor() {
        super();
        this._items = { 1: 50 };
        this._members = [];
    }
    numItems(item) {
        return item ? (this._items[item.id] || 0) : 0;
    }
    members() {
        return this._members;
    }
    setLeader(actor) {
        this._members = [actor];
    }
};
global.Game_Troop = class extends global.Game_Unit {};
global.Game_Action = class {};
global.Game_Interpreter = class {};

global.Game_Relation = class Game_Relation {
    constructor(data = {}) {
        this.actor1Id = data.actorId1 || 0;
        this.actor2Id = data.actorId2 || 0;
        this.affinity = data.affinity || 50;
        this.trust = data.trust || 50;
    }
};

global.$dataActors = [
    null,
    { id: 1, name: "Mosay", nickname: "Reload_RMMZ_41", profile: "Pilote", note: "<Hero>\n<Race: Human>\n<Sex: Male>\n<Face>\n<factionId: 1>\n<attackId: 2>" },
    { id: 2, name: "Soldat PNJ", nickname: "Recrue", profile: "Garde", note: "<factionId: 2>\n<attackId: 1>" },
    { id: 3, name: "Civil", nickname: "Colon", profile: "Ouvrier", note: "" },
    { id: 4, name: "Corporation Neotori", nickname: "Firme", profile: "Mégacorporation", note: "<Faction>\n<factionId: 4>" }
];

global.$dataSystem = {
    equipTypes: ["", "Arme", "Tête", "Visage", "Dessus", "Tenue", "Dessous", "Dos", "Ceinture", "Tactique", "Consomable", "Arme Secondaire"]
};

global.$dataSkills = [
    null,
    { id: 1, name: "Attaque de base", note: "<visual_attack><action_name>atk</action_name><frames>4</frames><duration>4</duration></visual_attack>" },
    { id: 2, name: "Tir Visé", note: "<visual_attack><action_name>shot_aim</action_name><frames>6</frames><duration>8</duration></visual_attack>" }
];

global.$dataItems = [
    null,
    { id: 1, name: "Munitions 9mm", note: "<weight: 0.1>" }
];

global.DataManager = {
    isWeapon: (item) => Boolean(item && item.wtypeId !== undefined),
    isArmor: (item) => Boolean(item && item.etypeId !== undefined),
    isItem: (item) => Boolean(item && item.itypeId !== undefined),
    itemRawWeight: (item) => {
        if (!item || !item.note) return 0;
        const m = item.note.match(/<weight:\s*(-?[\d.]+)\s*>/i);
        return m ? parseFloat(m[1]) : 0;
    }
};

global.SC4_Localization = {
    parse: (text) => text
};

global.GunfightManager = {
    parseWeaponStats: (weapon) => {
        if (!weapon) return null;
        return {
            reload: true,
            ammoCap: 12,
            ammoId: 1
        };
    }
};

global.$gameFactions = {
    _factions: {
        1: { id: 1, name: "Neo-Terran", affinity: 50 },
        2: { id: 2, name: "Pirates", affinity: -80 },
        4: { id: 4, name: "Corporation Neotori", affinity: 20 }
    },
    faction: function(id) {
        return this._factions[id] || null;
    }
};

global.$gameRelations = {
    getRelation: (a1, a2) => ({ actor1Id: a1, actor2Id: a2, value: 25 })
};

global.$gameGalaxy = {
    currentSectorId: () => 3,
    currentSystemId: () => 5,
    currentPlanetId: () => 2,
    currentPOIId: () => 10
};

global.$gameParty = new Game_Party();

// Simulation Game_Inventory
class MockGame_Inventory {
    constructor(id) {
        this._id = id;
        this._items = {};
        this._maxWeight = 25;
    }
    id() { return this._id; }
    items() { return Object.keys(this._items).map(k => ({ id: Number(k.split("_")[1]) })); }
    numItems(item) { return this._items["i_" + item.id] || 0; }
    addItem(item, amount = 1) {
        const k = "i_" + item.id;
        this._items[k] = (this._items[k] || 0) + amount;
        return amount;
    }
    removeItem(item, amount = 1) {
        const k = "i_" + item.id;
        const cur = this._items[k] || 0;
        const rem = Math.min(cur, amount);
        this._items[k] = cur - rem;
        return rem;
    }
    hasItem(item, amount = 1) { return this.numItems(item) >= amount; }
    currentWeight() {
        let total = 0;
        for (const k in this._items) {
            total += this._items[k] * 0.5;
        }
        return total;
    }
    setMaxWeight(w) { this._maxWeight = w; }
}

global.$inventories = {
    _data: {},
    inventory: function(id) {
        if (!this._data[id]) this._data[id] = new MockGame_Inventory(id);
        return this._data[id];
    }
};

global.Bitmap_Composite = {
    getCompositeEntry: (actor, action) => ({ key: `${actor.actorId()}_${action}`, bitmap: {} }),
    getCompositeFaceEntry: (actor) => ({ key: `face_${actor.actorId()}`, bitmap: {} })
};

// Simulation Game_Actor vanilla
global.Game_Actor = class Game_Actor extends Game_Battler {
    constructor(actorId) {
        super();
        this._actorId = actorId;
        this._equips = [];
        this.setup(actorId);
    }
    actorId() { return this._actorId; }
    actor() { return $dataActors[this._actorId]; }
    setup(actorId) {
        this._actorId = actorId;
        this._name = $dataActors[actorId] ? $dataActors[actorId].name : "";
        this._nickname = $dataActors[actorId] ? $dataActors[actorId].nickname : "";
        this._profile = $dataActors[actorId] ? $dataActors[actorId].profile : "";
        this.atk = 12;
        this._equips = [null, null, null, null, null, null, null, null, null, null, null];
    }
    name() { return this._name; }
    nickname() { return this._nickname; }
    profile() { return this._profile; }
    equipSlots() { return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; }
    equips() { return this._equips; }
    weapons() { return this._equips.filter(e => e && DataManager.isWeapon(e)); }
    armors() { return this._equips.filter(e => e && DataManager.isArmor(e)); }
    changeEquip(slotId, item) { this._equips[slotId] = item; }
    forceChangeEquip(slotId, item) { this._equips[slotId] = item; }
    clearEquipments() { this._equips = this._equips.map(() => null); }
    isEquipChangeOk(slotId) { return true; }
    canEquip(item) { return true; }
    attackSkillId() { return 1; }
};

global.Game_Actors = class Game_Actors {
    constructor() {
        this._data = [];
    }
    actor(actorId) {
        return null;
    }
};

// Chargement des classes de l'architecture SC4 Niveau 2
require("../js/plugins/SC4_Game_ScActorEquipment.js");
require("../js/plugins/SC4_Game_ScActorInventory.js");
require("../js/plugins/SC4_Game_ScActorCombat.js");
require("../js/plugins/SC4_Game_ScActorSocial.js");
require("../js/plugins/SC4_Game_ScActorLocation.js");
require("../js/plugins/SC4_Game_ScActorCharacter.js");
require("../js/plugins/SC4_Game_ScActor.js");
require("../js/plugins/SC4_Game_Hero.js");

// Chargement du patch Game_Actors.prototype.actor
require("../js/plugins/SC4_rmmz_objects_Patches.js");

// ============================================================================
// EXÉCUTION DE LA SUITE DE TESTS
// ============================================================================

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ ${message}`);
        passed++;
    } else {
        console.error(`  ❌ ÉCHEC: ${message}`);
        failed++;
    }
}

console.log("=================================================");
console.log("  TEST SUITE: SC4 Niveau 2 - Game_ScActor Architecture");
console.log("=================================================\n");

// --- Suite 1: Parsing Unique des Notetags (_meta) ---
console.log("--- Suite 1: Parsing Unique des Notetags (_meta) ---");
const actor1 = new Game_ScActor(1);
assert(actor1.hasMeta("hero") === true, "hasMeta('hero') extrait le drapeau <Hero>");
assert(actor1.hasMeta("face") === true, "hasMeta('face') extrait le drapeau <Face>");
assert(actor1.meta("race") === "Human", "meta('race') extrait la valeur 'Human'");
assert(actor1.meta("sex") === "Male", "meta('sex') extrait la valeur 'Male'");
assert(actor1.meta("attackid") === "2", "meta('attackid') extrait la valeur '2'");
assert(actor1.meta("unknownKey", "defaultVal") === "defaultVal", "meta() renvoie la valeur de repli si absente");

actor1.setMeta("race", "Cyborg");
assert(actor1.meta("race") === "Cyborg", "setMeta permet de modifier dynamiquement une métadonnée");

// --- Suite 2: Lazy Loading Pur des Sous-Composants ---
console.log("\n--- Suite 2: Lazy Loading Pur des Sous-Composants ---");
const freshActor = new Game_ScActor(3);
assert(freshActor.hasEquipment() === false, "freshActor n'a pas encore chargé equipment (null)");
assert(freshActor.hasInventory() === false, "freshActor n'a pas encore chargé inventory (null)");
assert(freshActor.hasCombat() === false, "freshActor n'a pas encore chargé combat (null)");
assert(freshActor.hasSocial() === false, "freshActor n'a pas encore chargé social (null)");
assert(freshActor.hasLocation() === false, "freshActor n'a pas encore chargé location (null)");
assert(freshActor.hasCharacter() === false, "freshActor n'a pas encore chargé character (null)");

// Déclenchement à la demande uniquement
const inv = freshActor.inventory;
assert(freshActor.hasInventory() === true, "freshActor.inventory instancié à la première demande");
assert(freshActor.hasEquipment() === false, "freshActor.equipment reste null et non sollicité");
assert(freshActor.hasCombat() === false, "freshActor.combat reste null et non sollicité");

// --- Suite 3: Game_ScActorCharacter & Paperdoll ---
console.log("\n--- Suite 3: Game_ScActorCharacter & Paperdoll ---");
const charComp = actor1.character;
assert(charComp instanceof Game_ScActorCharacter, "actor1.character instancie Game_ScActorCharacter");
assert(charComp.race() === "Cyborg", "charComp lit la race depuis l'acteur ('Cyborg')");
assert(charComp.sex() === "Male", "charComp lit le sexe depuis l'acteur ('Male')");
assert(charComp.hasFace() === true, "charComp confirme la présence du visage composite");

const mockCharEntity = new Game_Character();
charComp.bindEntity(mockCharEntity);
assert(charComp.isSpawned() === true, "isSpawned() confirme la liaison avec une entité carte");
assert(charComp.x() === 10 && charComp.y() === 15, "Coordonnées de l'entité déléguées avec succès (10, 15)");

const cacheKey = actor1.character.getCompositeCacheKey("walk");
assert(cacheKey.startsWith("1_Cyborg_Male_true_walk_"), `Clé composite Paperdoll générée : ${cacheKey}`);
assert(typeof actor1.getCompositeCacheKey === "undefined", "actor1 n'a plus de façade getCompositeCacheKey (Fail Fast -> actor.character)");

// --- Suite 4: Game_ScActorSocial & Registre des Opinions (_opinions) ---
console.log("\n--- Suite 4: Game_ScActorSocial & Registre des Opinions (_opinions) ---");
const socialComp = actor1.social;
assert(socialComp instanceof Game_ScActorSocial, "actor1.social instancie Game_ScActorSocial");
assert(socialComp.factionId() === 1, "factionId résolu depuis _meta (1)");

// Enregistrement d'une relation représentant le sentiment de l'interlocuteur 2 envers actor1
const op2 = socialComp.opinionOf(2);
assert(op2 instanceof Game_Relation, "opinionOf(2) retourne une instance de Game_Relation");
assert(op2.affinity === 50, "Affinité initiale à 50");
op2.affinity = 75;

// Vérification de la persistance de l'opinion
assert(socialComp.opinionOf(2).affinity === 75, "opinionOf(2) conserve la mise à jour (affinité 75)");
assert(socialComp.allOpinions().length === 1, "allOpinions() recense correctement les opinions actives");
assert(typeof actor1.opinionOf === "undefined", "actor1 n'a plus de façade opinionOf (Fail Fast -> actor.social)");
assert(typeof actor1.factionId === "undefined", "actor1 n'a plus de façade factionId (Fail Fast -> actor.social)");
assert(typeof actor1.gunfightWeapon === "undefined", "actor1 n'a plus de façade gunfightWeapon (Fail Fast -> actor.combat)");
assert(typeof actor1.weightCapacity === "undefined", "actor1 n'a plus de façade weightCapacity (Fail Fast -> actor.inventory)");

// --- Suite 5: Factions comme Acteurs (<Faction>) ---
console.log("\n--- Suite 5: Factions comme Acteurs (<Faction>) ---");
const factionActor = new Game_ScActor(4);
assert(factionActor.isFaction() === true, "factionActor.isFaction() détecte le tag <Faction>");
assert(factionActor.isHero() === false, "factionActor n'est pas un héros");
assert(factionActor.social.factionId() === 4, "factionActor.social.factionId() retourne son ID de faction");
assert(factionActor.hasCharacter() === false, "Une faction n'a pas de corps physique sur la carte (hasCharacter === false)");

// Une faction peut stocker des ressources dans son inventaire
factionActor.inventory.addItem({ id: 1 }, 100);
assert(factionActor.inventory.numItems({ id: 1 }) === 100, "Une faction dispose de son propre stock / coffre (100 munitions)");

// --- Suite 6: Game_ScActorCombat (Balistique, Munitions, IA) ---
console.log("\n--- Suite 6: Game_ScActorCombat (Balistique, Munitions, IA) ---");
const combatComp = actor1.combat;
assert(combatComp.attackSkillId() === 2, "attackSkillId résolu depuis _meta (<attackId: 2>)");
combatComp.setAiType("range");
assert(combatComp.aiType() === "range", "setAiType configure le comportement tactique");

combatComp.setTarget(mockCharEntity);
assert(combatComp.target() === mockCharEntity, "setTarget enregistre l'entité cible");

// --- Suite 7: Rétrocompatibilité Totale avec Game_Hero ---
console.log("\n--- Suite 7: Rétrocompatibilité Totale avec Game_Hero ---");
const heroInstance = new Game_Hero(1);
assert(heroInstance instanceof Game_Hero, "new Game_Hero(1) est une instance de Game_Hero");
assert(heroInstance instanceof Game_ScActor, "new Game_Hero(1) est AUSSI une instance de Game_ScActor");
assert(heroInstance instanceof Game_Actor, "new Game_Hero(1) est AUSSI une instance de Game_Actor");
assert(heroInstance.isHero() === true, "heroInstance.isHero() renvoie true");

// --- Suite 8: Sérialisation Sans Cycle & JsonEx.makeDeepCopy ---
console.log("\n--- Suite 8: Sérialisation Sans Cycle & JsonEx.makeDeepCopy ---");

// Chargement de l'implémentation JsonEx native de RMMZ
const rmmzCoreCode = fs.readFileSync(path.join(ROOT_DIR, "js/rmmz_core.js"), "utf8");
const jsonExSlice = rmmzCoreCode.substring(rmmzCoreCode.indexOf("function JsonEx()"));
eval(jsonExSlice);

// Instancier tous les sous-composants sur un acteur
const fullActor = new Game_ScActor(1);
fullActor.equipment;
fullActor.inventory;
fullActor.combat;
fullActor.social;
fullActor.location;
fullActor.character;
fullActor.character.bindEntity(mockCharEntity);
fullActor.combat.setTarget(mockCharEntity);

let deepCopySuccess = false;
let clonedActor = null;
try {
    clonedActor = JsonEx.makeDeepCopy(fullActor);
    deepCopySuccess = true;
} catch (err) {
    console.error("Deep copy failed with:", err.message);
    deepCopySuccess = false;
}

assert(deepCopySuccess === true, "JsonEx.makeDeepCopy réussit sans erreur 'Object too deep' même avec tous les sous-composants instanciés");
assert(clonedActor instanceof Game_ScActor || (clonedActor && clonedActor._actorId === 1), "L'acteur cloné conserve son identité actorId");
assert(clonedActor.equipment !== undefined, "L'acteur cloné peut accéder à ses sous-composants sans exception");

// --- Suite 9: Sérialisation Whitelistée & Restauration (makeSavefileData / loadSavefileData) ---
console.log("\n--- Suite 9: Sérialisation Whitelistée & Restauration (makeSavefileData / loadSavefileData) ---");
fullActor.setMeta("customStatus", "elite");
fullActor.inventory.setExhaustion(15);
fullActor.combat.setAiType("sniper");
fullActor.social.setFactionId(2);
fullActor.social.opinionOf(3).affinity = 90;
fullActor.character.setPose("kneel", { angle: 45 });

const savedData = fullActor.makeSavefileData();
let jsonStringified = false;
let parsedSavedData = null;
try {
    const jsonStr = JSON.stringify(savedData);
    parsedSavedData = JSON.parse(jsonStr);
    jsonStringified = true;
} catch (e) {
    console.error("JSON.stringify failed:", e.message);
    jsonStringified = false;
}

assert(jsonStringified === true, "makeSavefileData produit une structure 100% JSON sérialisable sans cycle");
assert(parsedSavedData.meta.customstatus === "elite", "Méta sauvegardée et présente");
assert(parsedSavedData.inventory.exhaustion === 15, "Inventaire : exhaustion sauvegardée");
assert(parsedSavedData.combat.aiType === "sniper", "Combat : aiType sauvegardé");
assert(parsedSavedData.social.factionId === 2, "Social : factionId sauvegardé");
assert(parsedSavedData.social.opinions["3"].affinity === 90, "Social : opinion affinity 90 sauvegardée");
assert(parsedSavedData.character.pose === "kneel", "Character : posture sauvegardée");

// Restauration dans un nouvel acteur
const reloadedActor = new Game_ScActor(1);
reloadedActor.loadSavefileData(parsedSavedData);
assert(reloadedActor.meta("customStatus") === "elite", "Rechargement : méta restaurée");
assert(reloadedActor.inventory.exhaustion() === 15, "Rechargement : inventory exhaustion restauré");
assert(reloadedActor.combat.aiType() === "sniper", "Rechargement : combat aiType restauré");
assert(reloadedActor.social.factionId() === 2, "Rechargement : social factionId restauré");
assert(reloadedActor.social.opinionOf(3).affinity === 90, "Rechargement : social opinion restaurée");
assert(reloadedActor.character._pose === "kneel", "Rechargement : character pose restaurée");

console.log("\n=================================================");
console.log(`RÉSUMÉ FINAL : ${passed} RÉUSSIS, ${failed} ÉCHOUÉS (Total: ${passed + failed})`);
console.log("=================================================");

if (failed > 0) {
    process.exit(1);
}
