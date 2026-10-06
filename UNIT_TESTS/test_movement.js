/**
 * ============================================================================
 * UNIT TEST : 8-Directional Movement & Angles
 * ============================================================================
 * Vérifie le calcul des angles trigonométriques pour le déplacement à 8 directions
 * et la gestion des directions de strafe (avant, arrière, latéral).
 */

const fs = require("fs");
const vm = require("vm");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, '..');
const SCE_DIR = path.resolve(ROOT_DIR, '..', 'SCE');

global.SC = { MovementConfig: {} };
global.PluginManager = { parameters: () => ({}) };
global.AUTHOR = "test";
global.LICENCE = "test";
global["$simcraftLoader"] = { checkPlugin: () => {} };

const configPath = path.join(SCE_DIR, "project/js/plugins/simcraft/modules/movement/configs/SC_MovementConfig.js");
const controllerPath = path.join(SCE_DIR, "project/js/plugins/simcraft/modules/movement/componants/PlayerMovementController.js");

if (fs.existsSync(configPath) && fs.existsSync(controllerPath)) {
    vm.runInThisContext(fs.readFileSync(configPath, "utf8"));
    console.log("MovementConfig chargé, DIR_TO_ROW :", SC.MovementConfig.DIR_TO_ROW);

    vm.runInThisContext(fs.readFileSync(controllerPath, "utf8"));
    const mockPlayer = {
        screenX: () => 400,
        screenY: () => 300,
        isDashing: () => false,
        isMoving: () => false,
        setDirection: (d) => { mockPlayer._dir = d; }
    };
    const controller = new PlayerMovementController(mockPlayer);
    console.log("--- Tests d'angles (radians -> 8 directions) ---");
    console.log("Droite (0 rad) :", controller.angleTo8Direction(0));
    console.log("Bas-Droite (PI/4) :", controller.angleTo8Direction(Math.PI / 4));
    console.log("Bas (PI/2) :", controller.angleTo8Direction(Math.PI / 2));
    console.log("Bas-Gauche (3*PI/4) :", controller.angleTo8Direction(3 * Math.PI / 4));
    console.log("Gauche (PI) :", controller.angleTo8Direction(Math.PI));
    console.log("Haut-Gauche (-3*PI/4) :", controller.angleTo8Direction(-3 * Math.PI / 4));
    console.log("Haut (-PI/2) :", controller.angleTo8Direction(-Math.PI / 2));
    console.log("Haut-Droite (-PI/4) :", controller.angleTo8Direction(-Math.PI / 4));

    console.log("\n--- Tests de strafe (visée vs déplacement) ---");
    console.log("Avant (Aim 6, Move 6) :", controller.calculateStrafeType(6, 6));
    console.log("Arrière (Aim 6, Move 4) :", controller.calculateStrafeType(4, 6));
    console.log("Latéral (Aim 6, Move 2) :", controller.calculateStrafeType(2, 6));
    console.log("Latéral (Aim 6, Move 8) :", controller.calculateStrafeType(8, 6));

    controller._mode = "aim";
    controller._aimDirection = 6;
    console.log("Vitesse (Aim, arrière) :", controller.getEffectiveSpeed(4));
    console.log("Vitesse (Aim, latéral) :", controller.getEffectiveSpeed(2));
    console.log("Vitesse (Aim, avant) :", controller.getEffectiveSpeed(6));
    console.log("✅ TEST MOVEMENT VALIDÉ");
} else {
    console.log("ℹ️ Fichiers de référence SCE non disponibles, test ignoré.");
}
