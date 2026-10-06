/**
 * ============================================================================
 * SimCraft 4 - Lanceur Global de Tests Unitaires (Test Runner)
 * ============================================================================
 * Exécute successivement tous les tests unitaires du projet et affiche un bilan.
 * Usage : node UNIT_TESTS/run_all_tests.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const testDir = __dirname;
const testFiles = [
    'test_sc4.js',
    'test_movement.js',
    'test_pathfinding.js',
    'test_step2.js',
    'test_step3.js',
    'test_step4.js',
    'test_event_touch.js',
    'test_step5_step6.js',
    'test_followers_paperdoll.js',
    'test_step7.js',
    'test_step8.js',
    'test_step9.js',
    'test_step10.js',
    'test_step11_ai.js'
];

console.log("==============================================================");
console.log("           SIMCRAFT 4 - SUITE DE TESTS UNITAIRES             ");
console.log("==============================================================\n");

let passed = 0;
let failed = 0;
const results = [];

for (const file of testFiles) {
    const fullPath = path.join(testDir, file);
    if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️ Fichier introuvable : ${file}`);
        continue;
    }

    process.stdout.write(`⏳ Exécution de ${file.padEnd(30)} ... `);
    try {
        execSync(`node "${fullPath}"`, { stdio: 'pipe', cwd: path.resolve(__dirname, '..') });
        console.log("✅ SUCCÈS");
        passed++;
        results.push({ file, status: "OK" });
    } catch (err) {
        console.log("❌ ÉCHEC");
        failed++;
        results.push({ file, status: "FAIL", error: err.stdout ? err.stdout.toString() : err.message });
    }
}

console.log("\n==============================================================");
console.log(`RÉSUMÉ FINAL : ${passed} RÉUSSIS, ${failed} ÉCHOUÉS (Total: ${passed + failed})`);
console.log("==============================================================");

if (failed > 0) {
    console.error("\nDétails des échecs :");
    for (const res of results) {
        if (res.status === "FAIL") {
            console.error(`\n--- ${res.file} ---\n${res.error}`);
        }
    }
    process.exit(1);
} else {
    console.log("🎉 TOUTES LES SUITES DE TESTS UNITAIRES ONT ÉTÉ VALIDÉES AVEC SUCCÈS !");
}
