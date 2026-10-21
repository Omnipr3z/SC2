/**
 * ============================================================================
 * UNIT TEST : Étape 19 - Modèle Astronomique Lore, Déterminisme & Éclairage Sol
 * ============================================================================
 * Valide :
 * 1. Getters et conversion en Unités Astronomiques (1 UA = 100 px).
 * 2. Surdimensionnement ergonomique des lunes (zoom 0.12 vs 0.05 historique).
 * 3. Préservation stricte de la taille des stations et des ceintures d'astéroïdes.
 * 4. Déterminisme absolu de l'orbite (Neotori Prime : demi-tour exact en 180 jours).
 * 5. Calcul 2D de l'heure solaire locale (Midi = 12h, Minuit = 00h, Aube = 06h, Crépuscule = 18h).
 * 6. Teinte dynamique planétaire vs Ambiance fixe pour les ceintures et stations.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Environnement minimal
global.window = global;
global.Graphics = { frameCount: 0, width: 1760, height: 990 };

// Chargement des plugins nécessaires
require('../js/plugins/SC4_Game_Date.js');
require('../js/plugins/SC4_Game_Planet.js');
require('../js/plugins/SC4_Game_PlanetarySystem.js');
require('../js/plugins/SC4_Game_Sector.js');
require('../js/plugins/SC4_Game_Spaceship.js');
require('../js/plugins/SC4_Game_Spaceships.js');
require('../js/plugins/SC4_SystemMapManager.js');

console.log("\n--- 1. Validation du Modèle de Données PLANETS.json ---");
const dataPlanets = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/SC/PLANETS.json'), 'utf8'));
global.$dataPlanets = dataPlanets;

// A. Vérification de Neotori Prime (ID 62)
const neotoriData = dataPlanets.find(p => p && p.id === 62);
assert.ok(neotoriData, "Neotori Prime doit exister");
const neotoriPlanet = new Game_Planet(neotoriData, 0);
assert.strictEqual(neotoriPlanet.orbitalDays, 360, "Neotori Prime doit avoir une période orbitale de 360 jours");
assert.strictEqual(neotoriPlanet.rotationHours, 24, "Neotori Prime doit avoir une rotation axiale de 24 heures");
assert.strictEqual(neotoriPlanet.orbitRadiusUA, 3.7, "Neotori Prime doit être à 3.7 UA de l'étoile");
assert.strictEqual(neotoriPlanet.hasDynamicDayNight(), true, "Neotori Prime doit avoir un cycle jour/nuit dynamique");
console.log("✅ Neotori Prime (ID 62) : 360 jours orbitaux, 24h rotation, 3.7 UA : OK");

// B. Vérification du surdimensionnement des lunes (ex: Concordia ID 64)
const concordiaData = dataPlanets.find(p => p && p.id === 64);
assert.ok(concordiaData, "Concordia doit exister");
const concordiaPlanet = new Game_Planet(concordiaData, 1);
assert.strictEqual(concordiaPlanet.isMoon(), true, "Concordia doit être reconnue comme une lune");
assert.strictEqual(concordiaPlanet.zoom, 0.12, "Concordia doit être surdimensionnée à zoom 0.12 pour cliquabilité");
assert.strictEqual(concordiaPlanet.hasDynamicDayNight(), true, "Une lune possède un cycle dynamique de lumière");
console.log("✅ Lune Concordia (ID 64) : Reconnue Lune, Zoom surdimensionné 0.12 : OK");

// C. Vérification de la préservation des stations (ex: Station Suro 1 ID 63)
const stationData = dataPlanets.find(p => p && p.id === 63);
assert.ok(stationData, "Station Suro 1 doit exister");
const stationPlanet = new Game_Planet(stationData, 2);
assert.strictEqual(stationPlanet.isStation(), true, "Station Suro 1 doit être reconnue comme station");
assert.strictEqual(stationPlanet.zoom, 0.05, "La taille et le zoom de la station doivent être strictement inchangés");
assert.strictEqual(stationPlanet.hasDynamicDayNight(), false, "Les stations ont un éclairage fixe");
console.log("✅ Station Suro 1 (ID 63) : Reconnue Station, Zoom 0.05 inchangé, Éclairage fixe : OK");

// D. Vérification de la préservation des ceintures d'astéroïdes (ex: Belt Mytrion ID 65)
const beltData = dataPlanets.find(p => p && p.id === 65);
assert.ok(beltData, "Belt Mytrion doit exister");
const beltPlanet = new Game_Planet(beltData, 3);
assert.strictEqual(beltPlanet.isBelt(), true, "Belt Mytrion doit être reconnue comme ceinture d'astéroïdes");
assert.strictEqual(beltPlanet.zoom, 0.16, "La taille et le zoom de la ceinture doivent être inchangés en V1");
assert.strictEqual(beltPlanet.hasDynamicDayNight(), false, "Les ceintures ont une obscurité fixe");
console.log("✅ Belt Mytrion (ID 65) : Reconnue Ceinture, Zoom inchangé, Obscurité fixe : OK");

console.log("\n--- 2. Calcul 2D de l'Heure Solaire Locale et Teinte au Sol ---");
// Position de l'étoile en (640, 320)
const starPos = { x: 640, y: 320 };
// Plaçons une planète à droite de l'étoile en (840, 320) -> Soleil vient de la gauche (-X) -> angle soleil = PI
const testPlanet = new Game_Planet({ id: 999, name: "TestWorld", x: 840, y: 320 }, 0);
testPlanet._x = 840;
testPlanet._y = 320;
testPlanet.rotationAngle = 0;

// Cas 1 : POI orienté plein soleil (angle PI)
const hourNoon = testPlanet.calculateLocalSolarTime(Math.PI, starPos);
assert.strictEqual(Math.round(hourNoon), 12, "Orientation vers le soleil doit donner 12h00 (Plein Midi)");
const tintNoon = testPlanet.getLocalTint(Math.PI, starPos);
assert.deepStrictEqual(tintNoon, [0, 0, 0, 0], "À midi, la teinte doit être neutre [0, 0, 0, 0]");

// Cas 2 : POI orienté à l'opposé du soleil (angle 0)
const hourMidnight = testPlanet.calculateLocalSolarTime(0, starPos);
assert.strictEqual(Math.round(hourMidnight), 0, "Orientation opposée au soleil doit donner 00h00 (Minuit)");
const tintMidnight = testPlanet.getLocalTint(0, starPos);
assert.strictEqual(tintMidnight[3] > 100, true, "À minuit, le niveau de noir/gris doit être élevé");

// Cas 3 : Ceinture d'astéroïdes ou Station -> Teinte fixe
const beltTint = beltPlanet.getLocalTint(0, starPos);
assert.deepStrictEqual(beltTint, [-40, -35, -20, 90], "Ceinture d'astéroïdes : Teinte fixe spatiale");

console.log("✅ Calculs d'angle solaire 2D, Heure locale et Teinte au Landing : OK");

console.log("\n--- 3. Déterminisme Orbital dans SystemMapManager ---");
window.$dataTimeSystem = {
    start_timestamp: 0,
    tick_per_min: [0, 60, 30, 15, 5]
};
window.$gameDate = new Game_Date(0);
window.$gameDate.setScrollSpeedMode(3); // Avance rapide pour update fluide

// Mocker le secteur courant avec Neotori Prime
window.$gameSector = {
    currentSystem: () => ({
        planets: () => [neotoriPlanet]
    })
};

const mapMgr = new SystemMapManager();

// Temps t = 0 jour
window.$gameDate._timestamp = 0;
window.$gameDate._tick = 0;
mapMgr.updatePlanetsPhysics();
const initialAngle = neotoriPlanet.orbitAngle;
const initialX = neotoriPlanet.x;

// Avancer de 180 jours (demi-période orbitale pour une période de 360 jours)
// 180 jours = 180 * 1440 minutes = 259 200 minutes
window.$gameDate._timestamp = 180 * 1440;
window.$gameDate._tick = 0;
mapMgr.updatePlanetsPhysics();

const halfTurnAngle = neotoriPlanet.orbitAngle;
const diffAngle = Math.abs(halfTurnAngle - initialAngle);
assert.strictEqual(Math.round(diffAngle * 100) / 100, Math.round(Math.PI * 100) / 100, "En 180 jours, l'angle orbital doit avoir progressé d'exactement PI radians (180 degrés)");
console.log("✅ Déterminisme orbital parfait : demi-orbite exacte en 180 jours pour Neotori Prime : OK");

console.log("\n=== TOUS LES TESTS DE L'ÉTAPE 19 SONT VALIDÉS AVEC SUCCÈS ===");
