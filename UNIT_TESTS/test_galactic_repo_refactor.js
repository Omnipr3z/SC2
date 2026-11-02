//=============================================================================
// TEST UNITAIRE : Refonte de la hiérarchie spatiale (Game_GalacticRepoBase)
//=============================================================================
"use strict";

const fs = require("fs");
const path = require("path");

console.log("==============================================================");
console.log("   TEST : Refonte Hiérarchie Spatiale & Game_GalacticRepoBase ");
console.log("==============================================================\n");

// 1. Initialisation de l'environnement global Node.js
global.window = global;

// Charger DEBUGTOOL
require("../js/plugins/SC4_DEBUGTOOL.js");

// Charger les données physiques
const sectorsRaw = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/SC/SECTORS.json"), "utf8"));
const planetsRaw = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/SC/PLANETS.json"), "utf8"));
const poisRaw = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/SC/POIS.json"), "utf8"));

global.$dataSectors = sectorsRaw;
global.$dataPlanets = planetsRaw;
global.$dataPois = poisRaw;

// Charger les classes spatiales dans l'ordre d'héritage
require("../js/plugins/SC4Space_Game_GalacticRepoBase.js");
require("../js/plugins/SC4Space_Game_POIs.js");
require("../js/plugins/SC4Space_Game_Planet.js");
require("../js/plugins/SC4Space_Game_PlanetarySystem.js");
require("../js/plugins/SC4Space_Game_Sector.js");
require("../js/plugins/SC4Space_Game_Galaxy.js");

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        console.log(`  ✅ [PASS] ${message}`);
        passedTests++;
    } else {
        console.error(`  ❌ [FAIL] ${message}`);
    }
}

// ----------------------------------------------------------------------------
console.log("--- 1. Vérification DEBUGTOOL (info, warn, error) ---");
let errorLogged = false;
let warnLogged = false;
let infoLogged = false;

const origError = console.error;
const origWarn = console.warn;
const origInfo = console.info;

console.error = () => { errorLogged = true; };
console.warn = () => { warnLogged = true; };
console.info = () => { infoLogged = true; };

DEBUGTOOL.info("Message info");
DEBUGTOOL.warn("Message warn");
DEBUGTOOL.error("Message error");

console.error = origError;
console.warn = origWarn;
console.info = origInfo;

assert(infoLogged, "DEBUGTOOL.info fonctionne correctement");
assert(warnLogged, "DEBUGTOOL.warn fonctionne correctement");
assert(errorLogged, "DEBUGTOOL.error fonctionne correctement");

// ----------------------------------------------------------------------------
console.log("\n--- 2. Instanciation & Arbre Galactique ($gameGalaxy) ---");
const galaxy = new Game_Galaxy();
global.$gameGalaxy = galaxy;

assert(galaxy instanceof Game_GalacticRepoBase, "Game_Galaxy hérite de Game_GalacticRepoBase");
assert(galaxy.sectors.length > 0, `Game_Galaxy contient ${galaxy.sectors.length} secteurs instanciés`);
assert(galaxy.sectors[0] instanceof Game_Sector, "Les sous-objets de Galaxy sont des Game_Sector");

// ----------------------------------------------------------------------------
console.log("\n--- 3. Cascade Descendante Complète (Galaxy -> Sectors -> Systems -> Planets -> POIs) ---");
const sector1 = galaxy.getSector(1);
assert(sector1 !== null, "getSector(1) retourne le secteur 1");
assert(sector1.systems.length > 0, `Secteur 1 contient ${sector1.systems.length} systèmes instanciés`);

const system1 = sector1.getSystem(1);
assert(system1 instanceof Game_PlanetarySystem, "getSystem(1) retourne une instance de Game_PlanetarySystem");
assert(system1.planets.length > 0, `Système 1 contient ${system1.planets.length} planètes instanciées`);

const planet1 = system1.getPlanet(1);
assert(planet1 instanceof Game_Planet, "getPlanet(1) retourne une instance de Game_Planet");
assert(planet1.pois.length > 0, `Planète 1 contient ${planet1.pois.length} POIs instanciés`);

const poi1 = planet1.pois[0];
assert(poi1 instanceof Game_POI, "Les sous-objets de Planet sont des Game_POI");
assert(poi1.id === "ankaros_helios", `POI 1 est bien "${poi1.id}"`);

// ----------------------------------------------------------------------------
console.log("\n--- 4. Hub Ascendant vers les Parents (poi -> planet -> system -> sector -> galaxy) ---");
assert(poi1.planet === planet1, "poi.planet pointe vers planet1");
assert(poi1.system === system1, "poi.system pointe vers system1");
assert(poi1.sector === sector1, "poi.sector pointe vers sector1");
assert(poi1.galaxy === galaxy, "poi.galaxy pointe vers galaxy");

assert(planet1.system === system1, "planet.system pointe vers system1");
assert(planet1.sector === sector1, "planet.sector pointe vers sector1");
assert(planet1.galaxy === galaxy, "planet.galaxy pointe vers galaxy");

assert(system1.sector === sector1, "system.sector pointe vers sector1");
assert(system1.galaxy === galaxy, "system.galaxy pointe vers galaxy");

assert(sector1.galaxy === galaxy, "sector.galaxy pointe vers galaxy");

// ----------------------------------------------------------------------------
console.log("\n--- 5. Hub Descendant Global (allPlanetarySystems, allPlanets, allPOIs) ---");
assert(galaxy.allPlanetarySystems.length >= sector1.systems.length, "allPlanetarySystems agrège l'ensemble des systèmes");
assert(galaxy.allPlanets.length >= system1.planets.length, "allPlanets agrège l'ensemble des planètes");
assert(galaxy.allPOIs.length >= planet1.pois.length, "allPOIs agrège l'ensemble des POIs");

assert(galaxy.getSystem(1) === system1, "galaxy.getSystem(1) résout system1");
assert(galaxy.getPlanet(1) === planet1, "galaxy.getPlanet(1) résout planet1");
assert(galaxy.getPOI("ankaros_helios") === poi1, "galaxy.getPOI('ankaros_helios') résout poi1");

// ----------------------------------------------------------------------------
console.log("\n--- 6. États Dynamiques des POIs & Persistance ---");
assert(poi1.isLocated() === true, "POI initialement découvert");
poi1.setLocated(false);
assert(poi1.isLocated() === false, "setLocated(false) met à jour l'état dynamique");

assert(poi1.isLandingAuthorized() === false, "Atterrissage initialement refusé");
poi1.setLandingAuthorized(true);
assert(poi1.isLandingAuthorized() === true, "setLandingAuthorized(true) met à jour l'autorisation");

// Test de sauvegarde / rechargement
const saveData = galaxy.makeSavefileData();
assert(saveData !== null && typeof saveData === "object", "makeSavefileData génère un objet");

// Modifier l'état en mémoire
poi1.setLocated(true);
poi1.setLandingAuthorized(false);

// Restaurer la sauvegarde
galaxy.loadSavefileData(saveData);
assert(poi1.isLocated() === false, "loadSavefileData restaure l'état de découverte (false)");
assert(poi1.isLandingAuthorized() === true, "loadSavefileData restaure l'autorisation d'atterrissage (true)");

// ----------------------------------------------------------------------------
console.log("\n--- 7. Assertions Fail-Fast avec DEBUGTOOL ---");
let failFastErrorLogged = false;
console.error = () => { failFastErrorLogged = true; };

// Recherche d'un sous-objet inexistant sur planet1
const unknownPoi = planet1.getSubObject("poi_qui_n_existe_pas");
console.error = origError;

assert(unknownPoi === null, "Recherche d'un sous-objet inconnu retourne null");
assert(failFastErrorLogged, "DEBUGTOOL.error a bien été appelé lors de la tentative d'accès à un ID inexistant");

// ----------------------------------------------------------------------------
console.log("\n--- 8. Localisation Spatiale Déportée sur l'Acteur ($gameParty.leader) ---");
const mockLeader = {
    _actorId: 1,
    name: () => "Wesword",
    _currentSectorId: 1,
    _currentSystemId: 1,
    _currentPlanetId: 1,
    _currentPOIId: "ankaros_helios"
};

global.$gameParty = {
    leader: () => mockLeader
};

assert(galaxy.currentSectorId() === 1, "galaxy.currentSectorId() lit leader._currentSectorId (1)");
assert(galaxy.currentSector() === sector1, "galaxy.currentSector() résout sector1");
assert(galaxy.currentSystemId() === 1, "galaxy.currentSystemId() lit leader._currentSystemId (1)");
assert(galaxy.currentSystem() === system1, "galaxy.currentSystem() résout system1");
assert(galaxy.currentPlanetId() === 1, "galaxy.currentPlanetId() lit leader._currentPlanetId (1)");
assert(galaxy.currentPlanet() === planet1, "galaxy.currentPlanet() résout planet1");
assert(galaxy.currentPOIId() === "ankaros_helios", "galaxy.currentPOIId() lit leader._currentPOIId");
assert(galaxy.currentPOI() === poi1, "galaxy.currentPOI() résout poi1");

// Vérification de la délégation depuis Sector et PlanetarySystem
assert(sector1.currentSystemId() === 1, "sector.currentSystemId() délègue à galaxy (1)");
assert(sector1.currentSystem() === system1, "sector.currentSystem() délègue à galaxy (system1)");
assert(system1.currentPlanetId() === 1, "system.currentPlanetId() délègue à galaxy (1)");
assert(system1.currentPlanet() === planet1, "system.currentPlanet() délègue à galaxy (planet1)");

// Changement de position via galaxy -> doit modifier l'acteur et cascader
galaxy.setCurrentPosition(1, 2, 10, null);
assert(mockLeader._currentSystemId === 2, "galaxy.setCurrentPosition met à jour leader._currentSystemId (2)");
assert(mockLeader._currentPlanetId === 10, "galaxy.setCurrentPosition met à jour leader._currentPlanetId (10)");
assert(galaxy.currentSystemId() === 2, "galaxy.currentSystemId() renvoie désormais 2");
assert(sector1.currentSystemId() === 2, "sector1.currentSystemId() renvoie désormais 2");
assert(sector1.currentSystem().id === 2, "sector1.currentSystem() résout le système 2");

// ----------------------------------------------------------------------------
console.log("\n==============================================================");
console.log(`RÉSULTAT : ${passedTests} / ${totalTests} tests réussis`);
console.log("==============================================================");

if (passedTests !== totalTests) {
    process.exit(1);
}

