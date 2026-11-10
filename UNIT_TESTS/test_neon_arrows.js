//=============================================================================
// TEST : Architecture DRY Sprite_NeonArrowBase, Sprite_InventoryArrow & Sprite_TutoArrow
//=============================================================================

const assert = require("assert");
const path = require("path");
const fs = require("fs");

console.log("==============================================================");
console.log("   TEST : Architecture DRY des Flèches Néon Cyberpunk (SC4)  ");
console.log("==============================================================");

// ----------------------------------------------------------------------------
// 1. MOCKS ENVIRONNEMENT
// ----------------------------------------------------------------------------
global.Graphics = { boxWidth: 1280, boxHeight: 720 };

global.Bitmap = class {
    constructor(w, h) {
        this.width = w || 0;
        this.height = h || 0;
        this.context = {
            save: () => {},
            restore: () => {},
            beginPath: () => {},
            closePath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            fill: () => {},
            stroke: () => {}
        };
    }
    clear() {}
};

global.Sprite = class {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.scale = { x: 1, y: 1 };
        this.anchor = { x: 0, y: 0, set(x, y) { this.x = x; this.y = y; } };
        this.visible = false;
        this.rotation = 0;
    }
    initialize() {}
    update() {}
};

global.window = global;

// ----------------------------------------------------------------------------
// 2. CHARGEMENT DES CLASSES
// ----------------------------------------------------------------------------
const basePath = path.join(__dirname, "../js/plugins/SC4_Sprite_NeonArrowBase.js");
const invPath = path.join(__dirname, "../js/plugins/SC4_Sprite_InventoryArrow.js");
const tutoPath = path.join(__dirname, "../js/plugins/SC4_Sprite_TutoArrow.js");

eval(fs.readFileSync(basePath, "utf8"));
eval(fs.readFileSync(invPath, "utf8"));
eval(fs.readFileSync(tutoPath, "utf8"));

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
// Section A: Sprite_NeonArrowBase (Classe Parente & Contrat)
// ----------------------------------------------------------------------------
console.log("\n--- Section A: Sprite_NeonArrowBase ---");

test("A1: Instanciation et initialisation du style néon", () => {
    const base = new Sprite_NeonArrowBase({ neonColor: "#ff0055", lineWidth: 3, shadowBlur: 10 });
    assert.strictEqual(base.neonColor(), "#ff0055");
    assert.strictEqual(base.lineWidth(), 3);
    assert.strictEqual(base.shadowBlur(), 10);
    assert.strictEqual(base.strokeColor(), "#ffffff");
    assert.strictEqual(base.fillColor(), "rgba(255, 0, 85, 0.8)");
});

test("A2: Géométrie et dimensions selon orientation", () => {
    const horizontal = new Sprite_NeonArrowBase({ direction: "right" });
    assert.strictEqual(horizontal._arrowWidth, 56);
    assert.strictEqual(horizontal._arrowHeight, 30);
    assert.strictEqual(horizontal.anchor.x, 0.5);
    assert.strictEqual(horizontal.anchor.y, 0.5);

    const vertical = new Sprite_NeonArrowBase({ direction: "down" });
    assert.strictEqual(vertical._arrowWidth, 30);
    assert.strictEqual(vertical._arrowHeight, 56);
});

test("A3: Tracé vectoriel polygonale multi-directionnel sans erreur", () => {
    const directions = ["left", "right", "down", "up"];
    for (const dir of directions) {
        const arrow = new Sprite_NeonArrowBase({ direction: dir });
        assert.doesNotThrow(() => arrow.redraw(), `Le tracé pour ${dir} ne doit lever aucune exception`);
    }
});

test("A4: Machine à états de déploiement (deploy, updateDeploy, onDeployComplete)", () => {
    const arrow = new Sprite_NeonArrowBase();
    assert.strictEqual(arrow.visible, false);
    assert.strictEqual(arrow._isDeploying, false);

    arrow.deploy(0.25);
    assert.strictEqual(arrow.visible, true);
    assert.strictEqual(arrow._isDeploying, true);
    assert.strictEqual(arrow._progress, 0);

    // Progression frame 1
    arrow.update();
    assert.strictEqual(arrow._progress, 0.25);
    assert.strictEqual(arrow._isDeploying, true);

    // Progression frame 2, 3, 4 -> Terminé
    arrow.update();
    arrow.update();
    arrow.update();
    assert.strictEqual(arrow._progress, 1);
    assert.strictEqual(arrow._isDeploying, false);
});

// ----------------------------------------------------------------------------
// Section B: Sprite_InventoryArrow (Héritier Inventaire)
// ----------------------------------------------------------------------------
console.log("\n--- Section B: Sprite_InventoryArrow ---");

test("B1: Filiation et configuration par défaut d'inventaire", () => {
    const arrow = new Sprite_InventoryArrow();
    assert.ok(arrow instanceof Sprite_NeonArrowBase, "Doit dériver de Sprite_NeonArrowBase");
    assert.strictEqual(arrow.neonColor(), "#00eeff", "Cyan cyberpunk");
    assert.strictEqual(arrow._arrowWidth, 56);
    assert.strictEqual(arrow._arrowHeight, 30);
    assert.strictEqual(arrow.anchor.x, 0.5);
    assert.strictEqual(arrow.anchor.y, 0.5);
});

test("B2: Déploiement élastique horizontal (originX -> targetX)", () => {
    const arrow = new Sprite_InventoryArrow();
    arrow.deploy(100, 200, 300, "left");

    assert.strictEqual(arrow.visible, true);
    assert.strictEqual(arrow._isDeploying, true);
    assert.strictEqual(arrow.y, 200);
    assert.strictEqual(arrow.scale.x, 0);
    assert.strictEqual(arrow.x, 100);

    // Frame 1
    arrow.update();
    assert.ok(arrow.scale.x > 0);
    assert.ok(arrow.x > 100);

    // Fin du déploiement
    while (arrow._isDeploying) {
        arrow.update();
    }
    assert.strictEqual(arrow.scale.x, 1);
    assert.strictEqual(arrow.x, 300);

    // Phase oscillation post-déploiement
    arrow.update();
    assert.notStrictEqual(arrow.x, 300, "Oscille autour de targetX");
});

// ----------------------------------------------------------------------------
// Section C: Sprite_TutoArrow (Héritier Didacticiels)
// ----------------------------------------------------------------------------
console.log("\n--- Section C: Sprite_TutoArrow ---");

test("C1: Filiation et configuration par défaut de didacticiel", () => {
    const arrow = new Sprite_TutoArrow();
    assert.ok(arrow instanceof Sprite_NeonArrowBase, "Doit dériver de Sprite_NeonArrowBase");
    assert.strictEqual(arrow.neonColor(), "#00ff88", "Vert néon cyberpunk");
    assert.strictEqual(arrow._arrowWidth, 30);
    assert.strictEqual(arrow._arrowHeight, 56);
    assert.strictEqual(arrow.anchor.x, 0.5);
    assert.strictEqual(arrow.anchor.y, 1.0, "Ancrage à la pointe de la flèche");
});

test("C2: Déploiement élastique axial lors du setup", () => {
    const arrow = new Sprite_TutoArrow();
    arrow.setup({ x: 500, y: 400, angle: 0 });

    assert.strictEqual(arrow.visible, true);
    assert.strictEqual(arrow._isDeploying, true);
    assert.strictEqual(arrow.scale.x, 0);
    assert.strictEqual(arrow.scale.y, 0);

    // Déploiement progressif
    arrow.update();
    assert.ok(arrow.scale.x > 0, "Échelle X grandit");
    assert.ok(arrow.scale.y > 0, "Échelle Y grandit");

    // Fin de déploiement
    while (arrow._isDeploying) {
        arrow.update();
    }
    assert.strictEqual(arrow.scale.x, 1);
    assert.strictEqual(arrow.scale.y, 1);
});

test("C3: Clamping d'écran et orientation angulaire préservés", () => {
    global.$gameMap = { tileWidth: () => 48, tileHeight: () => 48, adjustX: x => x, adjustY: y => y };
    const arrow = new Sprite_TutoArrow();
    arrow.setup({ xMap: 50, yMap: 7 }); // Hors écran à droite (> 1280)
    arrow.update();

    assert.ok(arrow.x >= 1260 && arrow.x <= 1280, `Doit être sur le bord droit de l'écran (~1272): actuel ${arrow.x}`);
});

// ----------------------------------------------------------------------------
// Section D: Extensibilité (Création d'une Flèche Jaune de Quête en 3 lignes)
// ----------------------------------------------------------------------------
console.log("\n--- Section D: Extensibilité DRY ---");

test("D1: Surcharge immédiate pour créer une flèche de quête jaune", () => {
    class Sprite_QuestArrow extends Sprite_NeonArrowBase {
        defaultNeonColor() { return "#ffcc00"; }
    }
    const questArrow = new Sprite_QuestArrow({ direction: "up" });
    assert.strictEqual(questArrow.neonColor(), "#ffcc00");
    assert.strictEqual(questArrow.fillColor(), "rgba(255, 204, 0, 0.8)");
    assert.strictEqual(questArrow._direction, "up");
    assert.doesNotThrow(() => questArrow.redraw());
});

console.log("\n==============================================================");
console.log(`   RÉSULTAT : ${passed}/10 tests passés avec succès !`);
console.log("==============================================================");
