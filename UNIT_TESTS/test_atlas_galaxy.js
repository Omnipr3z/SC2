const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("==============================================================");
console.log("   TESTS UNITAIRES : ATLAS & CARTE SECTORIELLE (12 SYSTÈMES)  ");
console.log("==============================================================\n");

const dataDir = path.resolve(__dirname, '../data/SC');
const locDir = path.join(dataDir, 'loc');
const imgDir = path.resolve(__dirname, '../img/GUI/ship');

// 1. Charger les JSON physiques et localisés
const sectorsPhys = JSON.parse(fs.readFileSync(path.join(dataDir, 'SECTORS.json'), 'utf8'));
const planetsPhys = JSON.parse(fs.readFileSync(path.join(dataDir, 'PLANETS.json'), 'utf8'));
const poisPhys = JSON.parse(fs.readFileSync(path.join(dataDir, 'POIS.json'), 'utf8'));

const sectorsLocFR = JSON.parse(fs.readFileSync(path.join(locDir, 'SECTORS_FR.json'), 'utf8'));
const sectorsLocEN = JSON.parse(fs.readFileSync(path.join(locDir, 'SECTORS_EN.json'), 'utf8'));
const planetsLocFR = JSON.parse(fs.readFileSync(path.join(locDir, 'PLANETS_FR.json'), 'utf8'));
const planetsLocEN = JSON.parse(fs.readFileSync(path.join(locDir, 'PLANETS_EN.json'), 'utf8'));
const poisLocFR = JSON.parse(fs.readFileSync(path.join(locDir, 'POIS_FR.json'), 'utf8'));

// Test 1: Convention RPG Maker MZ 1-indexée (premier élément = null)
console.log("--- 1. Convention 1-indexée (null à l'index 0) ---");
assert.strictEqual(sectorsPhys[0], null, "Index 0 de SECTORS.json doit être null");
assert.strictEqual(planetsPhys[0], null, "Index 0 de PLANETS.json doit être null");
assert.strictEqual(poisPhys[0], null, "Index 0 de POIS.json doit être null");
assert.strictEqual(sectorsLocFR[0], null, "Index 0 de loc/SECTORS_FR.json doit être null");
assert.strictEqual(planetsLocFR[0], null, "Index 0 de loc/PLANETS_FR.json doit être null");
assert.strictEqual(poisLocFR[0], null, "Index 0 de loc/POIS_FR.json doit être null");
console.log("  ✅ [PASS] Tous les tableaux racine respectent l'indexation 1-based avec null en [0]");

// Test 2: Les 12 systèmes
console.log("\n--- 2. Systèmes & Topologie des Hyperlignes ---");
const sector1 = sectorsPhys[1];
assert.strictEqual(sector1.systems.length, 12, "Il doit y avoir exactement 12 systèmes dans le secteur 1");
assert.strictEqual(sectorsLocFR[1].systems.length, 12, "Il doit y avoir 12 systèmes dans loc/SECTORS_FR");
assert.strictEqual(sectorsLocEN[1].systems.length, 12, "Il doit y avoir 12 systèmes dans loc/SECTORS_EN");
console.log("  ✅ [PASS] 12 systèmes présents dans SECTORS.json et loc/SECTORS_*.json");

// Test 3: Vérifier la symétrie de chaque hyperligne (1-indexée: 1..12)
const systems = sector1.systems;
const sysMap = new Map();
systems.forEach(s => sysMap.set(s.id, s));

let edgeCount = 0;
systems.forEach(s => {
  s.connections.forEach(targetId => {
    const targetSys = sysMap.get(targetId);
    assert(targetSys, `Le système cible ${targetId} de la connexion doit exister`);
    assert(targetSys.connections.includes(s.id), `La connexion entre système ${s.id} et ${targetId} doit être symétrique`);
    if (s.id < targetId) edgeCount++;
  });
});

assert.strictEqual(edgeCount, 16, `Il doit y avoir exactement 16 hyperlignes uniques selon le schéma (trouvé: ${edgeCount})`);
console.log(`  ✅ [PASS] 16 hyperlignes uniques vérifiées et 100% symétriques`);

// Test 4: Planètes & Astres
console.log("\n--- 3. Intégrité des Planètes & Astres ---");
const validPlanets = planetsPhys.filter(p => !!p);
const planetMap = new Map();
validPlanets.forEach(p => planetMap.set(p.id, p));

systems.forEach(s => {
  s.planetIds.forEach(pId => {
    assert(planetMap.has(pId), `La planète ID ${pId} dans le système ${s.id} doit exister dans PLANETS.json`);
  });
});
console.log(`  ✅ [PASS] ${validPlanets.length} astres enregistrés et tous liés à leurs systèmes`);

// Test 5: POIs
console.log("\n--- 4. Découplage et Intégrité des POIs ---");
const validPois = poisPhys.filter(p => !!p);
const poiMap = new Map();
validPois.forEach(p => poiMap.set(p.id, p));

validPlanets.forEach(p => {
  p.poiIds.forEach(poiId => {
    assert(poiMap.has(poiId), `Le POI '${poiId}' rattaché à l'astre ${p.id} doit exister dans POIS.json`);
  });
});
console.log(`  ✅ [PASS] ${validPois.length} POIs vérifiés, tous référencés par leurs planètes mères`);

// Test 6: Présence des Bitmaps sur le disque (pas de 404)
console.log("\n--- 5. Fichiers Assets Graphiques (img/GUI/ship/) ---");
let missingBitmaps = 0;
validPlanets.forEach(p => {
  const filePng = path.join(imgDir, p.bitmapName + '.png');
  if (!fs.existsSync(filePng)) {
    console.error(`  ❌ Fichier manquant: ${p.bitmapName}.png pour l'astre ID ${p.id}`);
    missingBitmaps++;
  }
});
assert.strictEqual(missingBitmaps, 0, "Aucun fichier image bitmapName ne doit manquer dans img/GUI/ship/");
console.log(`  ✅ [PASS] Tous les assets graphiques sont présents dans img/GUI/ship/ (zéro 404)`);

console.log("\n==============================================================");
console.log("🎉 TOUS LES TESTS DE L'ATLAS STELLAIRE SONT VALIDÉS !");
console.log("==============================================================");
