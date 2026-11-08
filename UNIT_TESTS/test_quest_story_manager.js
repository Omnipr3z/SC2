//=============================================================================
// UNIT TEST: QuestManager & StoryManager Architecture
// SC4/UNIT_TESTS/test_quest_story_manager.js
//=============================================================================

const assert = require("assert");
const path = require("path");
const fs = require("fs");
const vm = require("vm");

console.log("=== RUNNING TESTS FOR QUESTMANAGER & STORYMANAGER (NEXUS ARCHITECTURE) ===\n");

// 1. Environnement Mock RMMZ
global.window = global;

global.$gameDate = {
    timestamp: 1000,
    currentDate: () => ({ year: 1, month: 1, day: 1, hour: 12, minute: 0 })
};

global.$systemMapManager = {
    logs: [],
    log(style, txt) {
        this.logs.push({ style, txt });
    }
};

global.$gameSystem = {
    _poiLocated: {},
    isPoiLocated(id) {
        return Boolean(this._poiLocated[id]);
    },
    setPoiLocated(id, val = true) {
        this._poiLocated[id] = val;
    }
};

global.$dataItems = {
    10: { id: 10, name: "Cristal d'Éleris" }
};

let partyGold = 0;
let membersExp = 0;
let partyItems = {};

global.$gameParty = {
    gainGold(amt) { partyGold += amt; },
    gold() { return partyGold; },
    allMembers() {
        return [{ gainExp(exp) { membersExp += exp; } }];
    },
    gainItem(item, amt) {
        partyItems[item.id] = (partyItems[item.id] || 0) + amt;
    }
};

// Mock Quests
class MockQuest {
    constructor(data) {
        this.id = data.id;
        this.active = Boolean(data.active);
        this.completed = false;
        this.failed = false;
        this.currentStep = 0;
        this.triggerTimestamp = data.triggerTimestamp || null;
        this.triggerPoiLocated = data.triggerPoiLocated || null;
        this.deadlineTimestamp = data.deadlineTimestamp || null;
        this.alertTxt = data.alertTxt || null;
        this.rewards = data.rewards || null;
    }

    activate() { this.active = true; }
    nextStep() { this.currentStep++; }
    complete() { this.active = false; this.completed = true; }
    fail() { this.active = false; this.failed = true; }
    hasDeadline() { return Boolean(this.deadlineTimestamp); }
    checkDeadline() {
        if (this.hasDeadline() && global.$gameDate.timestamp >= this.deadlineTimestamp) {
            this.fail();
        }
    }
}

const mockQuestsList = [
    new MockQuest({ id: 1, active: false, triggerTimestamp: 500, alertTxt: [{ style: "info", txt: "Alerte Quete 1" }] }),
    new MockQuest({ id: 2, active: false, triggerPoiLocated: "POI_ALPHA" }),
    new MockQuest({ id: 3, active: true, deadlineTimestamp: 1500 }),
    new MockQuest({ id: 4, active: false, rewards: { gold: 250, exp: 500, items: [{ id: 10, amount: 2 }] } })
];

global.$gameQuests = {
    quests() { return mockQuestsList; },
    quest(id) { return mockQuestsList.find(q => q.id === id) || null; }
};

// Chargement des fichiers
const pluginsDir = path.resolve(__dirname, "../js/plugins");
[
    "SC4_StoryManager.js",
    "SC4_QuestManager.js"
].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(pluginsDir, f), "utf8")));

global.$storyManager = new StoryManager();
global.$questManager = new QuestManager();

let passCount = 0;
function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ [PASS] ${name}`);
        passCount++;
    } catch (e) {
        console.error(`  ❌ [FAIL] ${name}:`, e.message);
        throw e;
    }
}

// ============================================================================
// SUITE 1 : CYCLE DE VIE QUESTMANAGER (DÉCLENCHEURS & DÉLAIS)
// ============================================================================
console.log("--- 1. QuestManager : Cycle de Vie & Déclencheurs Automatiques ---");

test("update() active automatiquement la quête dont le timestamp est atteint", () => {
    assert.strictEqual(global.$gameQuests.quest(1).active, false);
    global.$questManager.update();
    assert.strictEqual(global.$gameQuests.quest(1).active, true);
    assert(global.$systemMapManager.logs.some(l => l.txt === "Alerte Quete 1"));
});

test("update() n'active pas la quête sur POI si le POI n'est pas découvert", () => {
    assert.strictEqual(global.$gameQuests.quest(2).active, false);
    global.$questManager.update();
    assert.strictEqual(global.$gameQuests.quest(2).active, false);
});

test("Découverte du POI déclenche la quête liée via update()", () => {
    global.$gameSystem.setPoiLocated("POI_ALPHA", true);
    global.$questManager.update();
    assert.strictEqual(global.$gameQuests.quest(2).active, true);
});

test("Expiration du délai entraîne l'échec automatique de la quête active", () => {
    const q3 = global.$gameQuests.quest(3);
    assert.strictEqual(q3.active, true);
    global.$gameDate.timestamp = 2000;
    global.$questManager.update(); // timestamp 2000 >= deadline 1500
    assert.strictEqual(q3.active, false);
    assert.strictEqual(q3.failed, true);
});

// ============================================================================
// SUITE 2 : MANIPULATION DIRECTE & RÉCOMPENSES
// ============================================================================
console.log("\n--- 2. QuestManager : Actions & Distribution des Récompenses ---");

test("start() active la quête manuellement", () => {
    const q4 = global.$gameQuests.quest(4);
    assert.strictEqual(q4.active, false);
    global.$questManager.start(4);
    assert.strictEqual(q4.active, true);
});

test("advanceStep() incrémente l'étape courante", () => {
    const q4 = global.$gameQuests.quest(4);
    assert.strictEqual(q4.currentStep, 0);
    global.$questManager.advanceStep(4);
    assert.strictEqual(q4.currentStep, 1);
});

test("complete() clôture la quête et distribue l'or, l'XP et les items", () => {
    global.$questManager.complete(4);
    const q4 = global.$gameQuests.quest(4);
    assert.strictEqual(q4.completed, true);
    assert.strictEqual(q4.active, false);
    assert.strictEqual(global.$gameParty.gold(), 250);
    assert.strictEqual(membersExp, 500);
    assert.strictEqual(partyItems[10], 2);
});

test("Sauvegarde et restauration de QuestManager", () => {
    const saved = global.$questManager.makeSavefileData();
    assert(saved.triggeredQuests.includes(1));
    assert(saved.triggeredQuests.includes(2));
    assert(saved.triggeredQuests.includes(4));

    const newQM = new QuestManager();
    newQM.loadSavefileData(saved);
    assert(newQM._triggeredQuests.has(1));
    assert(newQM._triggeredQuests.has(4));
});

// ============================================================================
// SUITE 3 : STORYMANAGER & ARCHITECTURE DES 5 NŒUDS / NEXUS
// ============================================================================
console.log("\n--- 3. StoryManager : 5 Nœuds Narratifs, Factions & Nexus ---");

test("Initialisation avec 5 nœuds majeurs non résolus et Nexus verrouillé", () => {
    assert.strictEqual(global.$storyManager.chapter(), 1);
    assert.strictEqual(global.$storyManager.resolvedNodesCount(), 0);
    assert.strictEqual(global.$storyManager.isNexusUnlocked(), false);
});

test("Résolution des Nœuds 1 à 4 avec choix de factions", () => {
    // Noeud 1 : Pro-Rebelles
    global.$storyManager.resolveNode("node1", "support_rebels");
    global.$storyManager.modifyAlignment("rebellion", 20);
    assert.strictEqual(global.$storyManager.isNodeResolved("node1"), true);
    assert.strictEqual(global.$storyManager.alignment("rebellion"), 20);

    // Noeud 2 : Pro-Rebelles
    global.$storyManager.resolveNode("node2", "furia_liberation");
    global.$storyManager.modifyAlignment("rebellion", 25);

    // Noeud 3 : Pro-Gentech
    global.$storyManager.resolveNode("node3", "gentech_alliance");
    global.$storyManager.modifyAlignment("gentech", 15);

    // Noeud 4 : Pro-Fédération
    global.$storyManager.resolveNode("node4", "defend_relais");
    global.$storyManager.modifyAlignment("federation", 10);

    assert.strictEqual(global.$storyManager.resolvedNodesCount(), 4);
    assert.strictEqual(global.$storyManager.isNexusUnlocked(), false);
});

test("Résolution du 5e Nœud déverrouille automatiquement le Nexus et calcule la faction dominante", () => {
    // Noeud 5 : Climax préliminaire
    global.$storyManager.resolveNode("node5", "orbital_siege_victory");
    global.$storyManager.modifyAlignment("rebellion", 10); // Total: rebellion=55, federation=10, gentech=15

    assert.strictEqual(global.$storyManager.resolvedNodesCount(), 5);
    assert.strictEqual(global.$storyManager.isNexusUnlocked(), true);
    assert.strictEqual(global.$storyManager._nexusState.dominantFaction, "rebellion");
});

test("Résolution du Nexus confère le statut post-main-quest selon l'alignement", () => {
    global.$storyManager.resolveNexus("liberation_complete");
    assert.strictEqual(global.$storyManager._nexusState.resolved, true);
    assert.strictEqual(global.$storyManager._nexusState.playerTitle, "Commandeur de la Libération");
});

test("Sauvegarde et restauration de StoryManager", () => {
    const saved = global.$storyManager.makeSavefileData();
    assert.strictEqual(saved.nodes.node1.resolved, true);
    assert.strictEqual(saved.nexus.unlocked, true);
    assert.strictEqual(saved.nexus.dominantFaction, "rebellion");

    const newSM = new StoryManager();
    newSM.loadSavefileData(saved);
    assert.strictEqual(newSM.isNodeResolved("node1"), true);
    assert.strictEqual(newSM.isNexusUnlocked(), true);
    assert.strictEqual(newSM._nexusState.playerTitle, "Commandeur de la Libération");
});

console.log("\n==================================================");
console.log(`RÉSULTAT GLOBAL : ${passCount}/12 tests validés avec succès !`);
console.log("==================================================");
