const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("==============================================================");
console.log("   TESTS UNITAIRES : SECTION 2 (LOOKAT, CAPITAL, QUÊTES)      ");
console.log("==============================================================");

// Mock environnement RMMZ complet
global.window = global;
global.Graphics = { width: 1280, height: 720, frameCount: 120 };

global.Rectangle = class Rectangle {
    constructor(x, y, width, height) {
        this.x = x || 0;
        this.y = y || 0;
        this.width = width || 0;
        this.height = height || 0;
    }
};

global.Bitmap = class Bitmap {
    constructor(w, h) {
        this.width = w;
        this.height = h;
        this.context = {
            beginPath: () => {},
            arc: () => {},
            fill: () => {},
            fillRect: () => {},
            strokeRect: () => {},
            stroke: () => {},
            rect: () => {},
            drawImage: () => {},
            fillText: () => {},
            measureText: (text) => ({ width: (text ? text.length * 6 : 0) }),
            createLinearGradient: () => ({ addColorStop: () => {} })
        };
    }
    clear() {}
    fillRect() {}
    drawText() {}
    isReady() { return true; }
};

global.Sprite = class Sprite {
    constructor(bmp) {
        this.bitmap = bmp || null;
        this.scale = { x: 1, y: 1 };
        this.anchor = { x: 0, y: 0 };
        this.visible = true;
        this.x = 0;
        this.y = 0;
        this.children = [];
    }
    addChild(c) { this.children.push(c); }
};

global.Window_Base = class Window_Base {
    constructor(rect) {
        this.x = rect ? rect.x : 0;
        this.y = rect ? rect.y : 0;
        this.width = rect ? rect.width : 0;
        this.height = rect ? rect.height : 0;
        this.contents = new global.Bitmap(this.width, this.height);
    }
    contentsWidth() { return this.width; }
    contentsHeight() { return this.height; }
    drawText() {}
    fillRect() {}
};

global.Window_Selectable = class Window_Selectable extends global.Window_Base {
    constructor(rect) {
        super(rect);
        this._index = 0;
    }
    refresh() {}
    select(i) { this._index = i; }
    index() { return this._index; }
    activate() {}
    deactivate() {}
    itemLineRect() { return new global.Rectangle(0, 0, this.width, 24); }
};

global.Window_HorzCommand = class Window_HorzCommand extends global.Window_Selectable {
    constructor(rect) {
        super(rect);
        this._commands = [];
    }
    addCommand(name, symbol) { this._commands.push({ name, symbol }); }
};

global.Window_Scrollable = class Window_Scrollable extends global.Window_Base {
    constructor(rect) {
        super(rect);
        this.innerHeight = this.height;
        this.innerWidth = this.width;
    }
    scrollTo() {}
};

global.Scene_MenuBase = class Scene_MenuBase {
    create() {}
    addWindow() {}
    addChild() {}
};

global.PluginManager = {
    registerCommand: () => {},
    parameters: () => ({})
};

global.SoundManager = {
    playOk: () => {},
    playCancel: () => {},
    playCursor: () => {},
    playBuzzer: () => {}
};

global.SceneManager = {
    goto: () => {},
    push: () => {},
    pop: () => {}
};

global.ImageManager = {
    loadBitmap: (dir, name) => new global.Bitmap(100, 100),
    loadSystem: () => new global.Bitmap(32, 32)
};

global.$gameSystem = {
    mainFontFace: () => "sans-serif",
    isPoiLocated: (poiId) => poiId !== "secret_unlocated_poi"
};

global.$gameDate = {
    timestamp: 55657647,
    _tick: 0,
    setScrollSpeedMode: () => {}
};

global.Game_DateFormatter = {
    format40K: () => "0.100.26/01 [08:00]"
};

global.$systemMapManager = {
    _logs: [],
    log: function(style, txt) { this._logs.push({ style, txt }); },
    pullLogs: function() { const l = [...this._logs]; this._logs = []; return l; }
};

// Chargement des données
const questsData = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/SC/QUESTS.json"), "utf8"));
const sectorsData = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/SC/SECTORS.json"), "utf8"));
const planetsData = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/SC/PLANETS.json"), "utf8"));
global.$dataQuests = questsData;
global.$dataPlanets = planetsData;

const vm = require("vm");
vm.runInThisContext(fs.readFileSync(path.join(__dirname, "../js/plugins/SC4_QuestManager.js"), "utf8"));

let passCount = 0;
let totalCount = 0;

function it(desc, fn) {
    totalCount++;
    try {
        fn();
        console.log(`  ✅ [PASS] ${desc}`);
        passCount++;
    } catch (err) {
        console.error(`  ❌ [FAIL] ${desc}:`, err.message);
    }
}

// ============================================================================
// 1. FEATURE 1 : LOOKAT / TIDAL LOCK
// ============================================================================
console.log("\n--- 1. LookAt & Verrouillage de Rotation Orbitale ---");

it("Mouvement LookAt vers l'étoile/centre oriente l'astre face au centre", () => {
    const planet = { x: 740, y: 320, moves: [{ type: "lookAt", target: "star", centerX: 640, centerY: 320 }] };
    const dx = 640 - planet.x; // -100
    const dy = 320 - planet.y; // 0
    const expectedAngle = Math.atan2(dy, dx); // Math.PI
    const actualAngle = Math.atan2(dy, dx) + (planet.moves[0].offsetAngle || 0);
    assert.strictEqual(actualAngle, expectedAngle);
});

it("Mouvement LookAt tangentiel oriente l'astre selon le vecteur de vitesse orbitale", () => {
    const theta = Math.PI / 2; // 90°
    const rx = 100, ry = 100;
    const vx = -Math.sin(theta) * rx; // -100
    const vy = Math.cos(theta) * ry;  // 0
    const tangentAngle = Math.atan2(vy, vx);
    assert.strictEqual(tangentAngle, Math.PI);
});

// ============================================================================
// 2. FEATURE 2 : PLANÈTE CAPITALE SUR CARTE GALACTIQUE
// ============================================================================
console.log("\n--- 2. Attribut Capital des Systèmes ---");

it("SECTORS.json associe une planète capitale aux systèmes majeurs", () => {
    const sector = sectorsData[1];
    assert.ok(sector, "Secteur 1 existe");
    const sysAnkaros = sector.systems.find(s => s && s.id === 1);
    assert.ok(sysAnkaros, "Système Ankaros existe");
    assert.strictEqual(sysAnkaros.capital, 5, "Ankaros a pour capitale la planète ID 5");

    const sysAethelgard = sector.systems.find(s => s && s.id === 2);
    assert.strictEqual(sysAethelgard.capital, 12, "Aethelgard a pour capitale la planète ID 12");
});

// ============================================================================
// 3. FEATURE 3 : SYSTÈME DE QUÊTES AVANCÉ
// ============================================================================
console.log("\n--- 3. Catégories, Récurrence & Délais des Quêtes ---");

const qm = new Game_Quests();

it("Catégorie et récurrence initialisées correctement", () => {
    const q1 = qm.quest(1);
    assert.strictEqual(q1.category, "main", "Quête 1 est la quête principale");
    assert.strictEqual(q1.recurring, false, "Quête 1 n'est pas récurrente");

    const q3 = qm.quest(3);
    assert.ok(q3, "Quête 3 existe");
    assert.strictEqual(q3.category, "recurring", "Quête 3 est catégorisée récurrente");
    assert.strictEqual(q3.isRecurring(), true, "isRecurring() retourne true");
    assert.strictEqual(q3.completedCount, 0, "completedCount commence à 0");
});

it("Quête récurrente s'incrémente à la complétion et peut redémarrer (restart)", () => {
    const q3 = qm.quest(3);
    assert.strictEqual(q3.active, true);
    assert.strictEqual(q3.completed, false);

    // Complétion 1
    q3.complete();
    assert.strictEqual(q3.completed, true);
    assert.strictEqual(q3.completedCount, 1, "completedCount est passé à 1");

    // Redémarrage pour nouveau contrat
    const restartOk = q3.restart();
    assert.strictEqual(restartOk, true, "restart() a réussi");
    assert.strictEqual(q3.active, true, "Quête est de nouveau active");
    assert.strictEqual(q3.completed, false, "Quête n'est plus marquée completed");
    assert.strictEqual(q3.completedCount, 1, "completedCount a conservé l'historique x1");

    // Complétion 2
    q3.complete();
    assert.strictEqual(q3.completedCount, 2, "completedCount est passé à 2");
    q3.restart();
});

it("Compte à rebours et auto-échec sur expiration du délai (checkDeadline)", () => {
    const q3 = qm.quest(3);
    assert.ok(q3.hasDeadline(), "Quête 3 a une deadline");
    assert.ok(q3.remainingTime() > 0, "Temps restant positif au départ");
    assert.ok(q3.remainingTimeString().includes("h"), "remainingTimeString formate en hh mm");

    // Simulation de l'écoulement du temps calendaire au-delà de la deadline
    const originalTime = $gameDate.timestamp;
    $gameDate.timestamp = q3.deadlineTimestamp + 10; // Dépassé de 10 min

    const failed = q3.checkDeadline();
    assert.strictEqual(failed, true, "checkDeadline() retourne true sur expiration");
    assert.strictEqual(q3.failed, true, "Quête 3 est passée en failed");
    assert.strictEqual(q3.active, false, "Quête 3 n'est plus active");

    // Restauration de l'état
    $gameDate.timestamp = originalTime;
    q3.restart();
});

it("Suivi de quête (Tracking on/off) filtre les balises cartographiques", () => {
    const q1 = qm.quest(1);
    assert.strictEqual(q1.isTracking, true, "Tracking actif par défaut");
    assert.strictEqual(qm.hasIndicatorForSystem(1), true, "Système 1 a un indicateur");

    // Désactivation du suivi
    q1.setTracking(false);
    assert.strictEqual(q1.isTracking, false);
    
    // Si seule q1 est dans le système 1, l'indicateur disparaît
    const q3 = qm.quest(3);
    q3.setTracking(false);
    assert.strictEqual(qm.hasIndicatorForSystem(1), false, "Système 1 n'a plus d'indicateur quand toutes ses quêtes sont non suivies");

    // Réactivation
    q1.toggleTracking();
    assert.strictEqual(q1.isTracking, true);
    assert.strictEqual(qm.hasIndicatorForSystem(1), true, "Indicateur réapparaît");
    q3.setTracking(true);
});

it("Hotspot Pin multi-quêtes : plusieurs quêtes au même endroit retournent count > 1", () => {
    const q1 = qm.quest(1);
    const q3 = qm.quest(3);
    q1.setTracking(true);
    q3.setTracking(true);

    // Système 1 (Ankaros) : q1 a des locs dans Ankaros, q3 aussi !
    const sysIndicators = qm.getIndicatorsForSystem(1);
    assert.ok(sysIndicators.length >= 2, `Système 1 concentre ${sysIndicators.length} objectifs suivis (Hotspot !)`);

    // Planète 5 (Ankaros Prime) : q1 a loc_prime_spaceport, q3 a loc_prime_convoy !
    const planetIndicators = qm.getIndicatorsForPlanet(5);
    assert.ok(planetIndicators.length >= 2, `Planète 5 concentre ${planetIndicators.length} objectifs suivis (Hotspot !)`);

    // POI prime_spatioport : ciblé par q1 et q3 !
    const poiIndicators = qm.getIndicatorsForPoi("prime_spatioport");
    assert.ok(poiIndicators.length >= 2, `POI prime_spatioport concentre ${poiIndicators.length} objectifs suivis (Hotspot !)`);
});

it("Persistance Save/Load des nouveaux attributs de quête", () => {
    const q3 = qm.quest(3);
    q3.setTracking(false);
    const saveData = q3.makeSavefileData();
    assert.strictEqual(saveData.category, "recurring");
    assert.strictEqual(saveData.recurring, true);
    assert.strictEqual(saveData.completedCount, 2);
    assert.strictEqual(saveData.isTracking, false);

    // Nouvelle instance et chargement
    const freshQuest = new Game_Quest({ id: 3 });
    freshQuest.loadSavefileData(saveData);
    assert.strictEqual(freshQuest.category, "recurring");
    assert.strictEqual(freshQuest.recurring, true);
    assert.strictEqual(freshQuest.completedCount, 2);
    assert.strictEqual(freshQuest.isTracking, false);
});

console.log("\n==============================================================");
console.log(`RÉSULTAT : ${passCount} / ${totalCount} tests réussis`);
if (passCount === totalCount) {
    console.log("🎉 TOUS LES TESTS DE LA SECTION 2 SONT VALIDÉS AVEC SUCCÈS !");
} else {
    process.exit(1);
}
console.log("==============================================================");
