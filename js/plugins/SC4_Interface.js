//=============================================================================
// RPG Maker MZ - SC4_Interface
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Façade d'interface globale, API publique et commandes de plugin SimCraft 4.
 * @author SimCraft
 * 
 * @help
 * ============================================================================
 * SC4_Interface.js
 * ============================================================================
 * Point d'entrée centralisé de toutes les commandes de plugin et de l'API
 * publique de SimCraft 4.
 * 
 * Toutes les fonctions sont documentées en JSDoc et accessibles via :
 *   - L'objet global : window.SC4.*
 *   - Les commandes de plugin RPG Maker MZ (catégorie SC4_Interface).
 * 
 * ----------------------------------------------------------------------------
 * COMMANDES DE PLUGIN DISPONIBLES :
 * ----------------------------------------------------------------------------
 * 
 * @command openSector
 * @text Ouvrir Secteur (Galaxie FTL)
 * @desc Ouvre la scène de voyage à l'échelle galactique / secteur FTL.
 * 
 * @command openSystem
 * @text Ouvrir Système Solaire
 * @desc Ouvre la vue temps réel du système planétaire et orbites.
 * 
 * @command openHangar
 * @text Ouvrir Hangar (Débarquement)
 * @desc Ouvre le sous-système planétaire en mode atterrissage hangar.
 * @arg nefId
 * @text ID de la Nef
 * @desc ID du vaisseau pour le débarquement (défaut 2).
 * @type number
 * @default 2
 * 
 * @command openQuestBook
 * @text Ouvrir Journal de Quêtes
 * @desc Ouvre le Datapad / Journal des quêtes et contrats.
 * 
 * @command openInventory
 * @text Ouvrir Inventaire
 * @desc Ouvre la scène d'inventaire secondaire ou de stockage.
 * @arg invId
 * @text ID Inventaire
 * @desc ID de l'inventaire à ouvrir (défaut 1).
 * @type number
 * @default 1
 * 
 * @command setHeroPose
 * @text Définir Pose Héros
 * @desc Fixe une pose persistante (ex: sit, lay, sneak, rampe) pour un héros.
 * @arg actorId
 * @text ID Acteur
 * @type number
 * @default 1
 * @arg pose
 * @text Nom de la Pose
 * @type string
 * @default sit
 * 
 * @command clearHeroPose
 * @text Réinitialiser Pose Héros
 * @desc Termine la pose courante et rétablit la locomotion normale.
 * @arg actorId
 * @text ID Acteur
 * @type number
 * @default 1
 * ============================================================================
 */

// Initialisation du Namespace Universel SimCraft 4
window.SC4 = window.SC4 || {};

/**
 * ============================================================================
 * API PUBLIQUE SIMCRAFT 4 (JSDoc)
 * ============================================================================
 */

/**
 * Ouvre la scène de carte galactique / secteur stellaire (Niveau 1 : Sauts FTL).
 * @example
 * // En Script Call RMMZ :
 * SC4.openSector();
 */
SC4.openSector = function() {
    if (typeof Scene_SectorTravel !== "undefined") {
        SceneManager.push(Scene_SectorTravel);
    } else {
        console.warn("[SC4_Interface] Scene_SectorTravel introuvable.");
    }
};

/**
 * Ouvre la vue temps réel du système solaire en cours (Niveau 2 : Orbites et vol libre).
 * @example
 * // En Script Call RMMZ :
 * SC4.openSystem();
 */
SC4.openSystem = function() {
    if (typeof Scene_SpaceTravel !== "undefined") {
        SceneManager.push(Scene_SpaceTravel);
    } else {
        console.warn("[SC4_Interface] Scene_SpaceTravel introuvable.");
    }
};

/**
 * Ouvre la scène de sous-système planétaire en mode Atterrissage Hangar (Niveau 3).
 * Nécessite que le vaisseau soit en orbite stationnaire autour d'un astre.
 * @param {number} [nefId=2] - Identifiant de la nef / navette de débarquement.
 * @example
 * // En Script Call RMMZ :
 * SC4.openHangar(2);
 */
SC4.openHangar = function(nefId = 2) {
    const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
    const planet = ship ? ship.orbitingPlanet : null;

    if (planet) {
        SoundManager.playOk();
        if (typeof Scene_SubsystemTravel !== "undefined") {
            Scene_SubsystemTravel.prepareContext(planet, true, nefId);
            SceneManager.push(Scene_SubsystemTravel);
        }
    } else {
        SoundManager.playBuzzer();
        if (window.$gameMessage) {
            const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
            window.$gameMessage.add(loc("travel.hangar_not_orbiting", "\\C[2]Contrôle Hangar\\C[0] : Le vaisseau n'est pas en orbite stationnaire."));
        }
    }
};

// Alias de rétrocompatibilité RMMZ
SceneManager.openHangar = SC4.openHangar;

/**
 * Ouvre le Datapad / Journal des quêtes du joueur.
 * @example
 * // En Script Call RMMZ :
 * SC4.openQuestBook();
 */
SC4.openQuestBook = function() {
    if (typeof Scene_QuestBook !== "undefined") {
        SceneManager.push(Scene_QuestBook);
    } else {
        console.warn("[SC4_Interface] Scene_QuestBook introuvable.");
    }
};

/**
 * Ouvre la scène d'inventaire secondaire ou de stockage.
 * @param {number} [invId=1] - ID de l'inventaire secondaire.
 * @example
 * // En Script Call RMMZ :
 * SC4.openInventory(1);
 */
SC4.openInventory = function(invId = 1) {
    if (typeof Scene_Inventory !== "undefined") {
        if (typeof Scene_Inventory.prepareInventory === "function") {
            Scene_Inventory.prepareInventory(invId);
        }
        SceneManager.push(Scene_Inventory);
    } else {
        console.warn("[SC4_Interface] Scene_Inventory introuvable.");
    }
};

/**
 * Définit une pose persistante sur un héros (ex: sit, lay, sneak, rampe).
 * @param {number} actorId - ID du héros dans la base de données.
 * @param {string} pose - Nom de la pose.
 * @example
 * SC4.setHeroPose(1, "sit");
 */
SC4.setHeroPose = function(actorId, pose, options = {}) {
    if (window.$heroHub && typeof window.$heroHub.setPose === "function") {
        window.$heroHub.setPose(actorId, pose, options);
    } else if (actorId === 1 && window.$gamePlayer && typeof window.$gamePlayer.setPose === "function") {
        window.$gamePlayer.setPose(pose, options);
    }
};

/**
 * Réinitialise la pose d'un héros et rétablit sa locomotion standard.
 * @param {number} actorId - ID du héros dans la base de données.
 * @example
 * SC4.clearHeroPose(1);
 */
SC4.clearHeroPose = function(actorId) {
    if (window.$heroHub && typeof window.$heroHub.clearPose === "function") {
        window.$heroHub.clearPose(actorId);
    } else if (actorId === 1 && window.$gamePlayer && typeof window.$gamePlayer.clearPose === "function") {
        window.$gamePlayer.clearPose();
    }
};

/**
 * Vérifie si la carte courante est en Zone Sécurisée (armes rengainées, tir désactivé).
 * @returns {boolean}
 */
SC4.isSafeZone = function() {
    return (typeof $gameMap !== "undefined" && $gameMap && typeof $gameMap.isSafeZone === "function") ? $gameMap.isSafeZone() : false;
};

/**
 * Vérifie si la carte courante est en Mode Combat actif.
 * @returns {boolean}
 */
SC4.isCombatMode = function() {
    return (typeof $gameMap !== "undefined" && $gameMap && typeof $gameMap.isCombatMode === "function") ? $gameMap.isCombatMode() : false;
};

/**
 * Force ou modifie l'état de Combat de la carte courante.
 * @param {boolean} active 
 */
SC4.setCombatMode = function(active) {
    if (typeof $gameMap !== "undefined" && $gameMap && typeof $gameMap.setCombatMode === "function") {
        $gameMap.setCombatMode(active);
    }
};

/**
 * Déclenche manuellement une quête par son ID.
 * @param {number} questId - ID de la quête.
 */
SC4.triggerQuest = function(questId) {
    if (window.$gameQuests && typeof window.$gameQuests.startQuest === "function") {
        window.$gameQuests.startQuest(questId);
    }
};

/**
 * Valide et termine une quête par son ID.
 * @param {number} questId - ID de la quête.
 */
SC4.completeQuest = function(questId) {
    if (window.$gameQuests && typeof window.$gameQuests.completeQuest === "function") {
        window.$gameQuests.completeQuest(questId);
    }
};

/**
 * Ouvre la navigation stellaire (Système solaire / Secteur).
 */
SC4.openNavigation = function() {
    SC4.openSystem();
};

/**
 * Ouvre la console de commande de la passerelle du vaisseau spatial.
 * @param {number} [shipId] - ID explicite du vaisseau ciblé (optionnel, prioritaire sur le mapId de la carte)
 */
SC4.openBridgeConsole = function(shipId) {
    if (typeof SceneManager !== "undefined" && SceneManager._scene && typeof SceneManager._scene.openBridgeConsole === "function") {
        SceneManager._scene.openBridgeConsole(shipId);
    } else if (typeof $gameSystem !== "undefined" && $gameSystem) {
        $gameSystem._bridgeConsoleOpen = true;
        $gameSystem._bridgeConsoleShipId = (shipId !== undefined && shipId !== null) ? Number(shipId) : null;
    }
};

/**
 * Vérifie si l'atterrissage est autorisé pour une planète ou un POI donné.
 * @param {string|number} planetOrPoiId 
 * @returns {boolean}
 */
SC4.isLandingAuthorized = function(planetOrPoiId) {
    if (typeof $gameSystem !== "undefined" && $gameSystem && typeof $gameSystem.isLandingAuthorized === "function") {
        return $gameSystem.isLandingAuthorized(planetOrPoiId);
    }
    return false;
};

/**
 * Définit l'autorisation d'atterrissage pour une planète ou un POI donné.
 * @param {string|number} planetOrPoiId 
 * @param {boolean} [authorized=true] 
 */
SC4.setLandingAuthorized = function(planetOrPoiId, authorized = true) {
    if (typeof $gameSystem !== "undefined" && $gameSystem && typeof $gameSystem.setLandingAuthorized === "function") {
        $gameSystem.setLandingAuthorized(planetOrPoiId, authorized);
    }
};

/**
 * Exécute la séquence scénarisée d'atterrissage V1 (SE, overlay de fondu, transfert et maj du statut vaisseau).
 * @param {string} [targetPoiId] - ID du point d'intérêt cible (ex: 'prime_spatioport').
 */
SC4.performLandingSequence = function(targetPoiId) {
    const ship = (typeof window !== "undefined" && window.$gameSpaceships) ? window.$gameSpaceships.playerShip() : null;
    let poi = null;
    if (typeof window !== "undefined" && window.$gamePOIs && typeof window.$gamePOIs.get === "function") {
        if (targetPoiId) {
            poi = window.$gamePOIs.get(targetPoiId);
        } else if (ship && ship.orbitingPlanetId) {
            const allPois = typeof window.$gamePOIs.getAll === "function" ? window.$gamePOIs.getAll() : [];
            poi = allPois.find(p => p && p.planetId === ship.orbitingPlanetId && p.landingMapId > 0);
        }
    }
    // Fallback par défaut sur prime_spatioport
    if (!poi && typeof window !== "undefined" && window.$gamePOIs && typeof window.$gamePOIs.get === "function") {
        poi = window.$gamePOIs.get("prime_spatioport");
    }

    const planetId = poi ? poi.planetId : (ship && ship.orbitingPlanetId ? ship.orbitingPlanetId : 5);
    const mapId = poi && poi.landingMapId ? poi.landingMapId : 37;
    const lx = poi && typeof poi.landingX === "number" ? poi.landingX : 127;
    const ly = poi && typeof poi.landingY === "number" ? poi.landingY : 58;

    // 1. Audio SE Atterrissage / Réacteurs
    if (typeof AudioManager !== "undefined" && typeof AudioManager.playSe === "function") {
        AudioManager.playSe({ name: "FIREWIND2", volume: 90, pitch: 90, pan: 0 });
    }

    // 2. Affichage image Landing_placeholder
    if (typeof $gameScreen !== "undefined" && $gameScreen && typeof $gameScreen.showPicture === "function") {
        $gameScreen.showPicture(1, "Landing_placeholder", 0, 0, 0, 100, 100, 255, 0);
    }

    // 3. Mise à jour de l'état du vaisseau spatial (Amarré / Atterri sur la planète)
    if (ship) {
        if (typeof ship.aboard === "function") {
            ship.aboard(planetId, "P");
        }
        ship._status = "Static";
    }

    // 4. Transfert silencieux du joueur
    if (typeof $gamePlayer !== "undefined" && $gamePlayer && typeof $gamePlayer.reserveTransfer === "function") {
        $gamePlayer.reserveTransfer(mapId, lx, ly, 2, 2);
    }

    // 5. Fondu sortant progressif de l'image de transition
    if (typeof $gameScreen !== "undefined" && $gameScreen && typeof $gameScreen.movePicture === "function") {
        $gameScreen.movePicture(1, 0, 0, 0, 100, 100, 0, 0, 60);
        setTimeout(() => {
            if (typeof $gameScreen !== "undefined" && $gameScreen && typeof $gameScreen.erasePicture === "function") {
                $gameScreen.erasePicture(1);
            }
        }, 1200);
    }
};

/**
 * Exécute la séquence scénarisée de décollage V1 (SE, overlay de fondu, transfert et retour en orbite).
 */
SC4.performTakeoffSequence = function() {
    const ship = (typeof window !== "undefined" && window.$gameSpaceships) ? window.$gameSpaceships.playerShip() : null;
    const previousPlanetId = (ship && typeof ship.isLanded === "function") ? ship.isLanded() : null;

    // 1. Audio SE Décollage / Propulsion
    if (typeof AudioManager !== "undefined" && typeof AudioManager.playSe === "function") {
        AudioManager.playSe({ name: "ShipJump", volume: 90, pitch: 100, pan: 0 });
    }

    // 2. Affichage image Landing_placeholder
    if (typeof $gameScreen !== "undefined" && $gameScreen && typeof $gameScreen.showPicture === "function") {
        $gameScreen.showPicture(1, "Landing_placeholder", 0, 0, 0, 100, 100, 255, 0);
    }

    // 3. Quitte l'état d'atterrissage et replace le vaisseau en orbite autour de l'astre
    if (ship) {
        if (typeof ship.leaveHost === "function") {
            ship.leaveHost();
        }
        if (previousPlanetId && typeof ship.setOrbitingPlanet === "function") {
            ship.setOrbitingPlanet(previousPlanetId);
        } else {
            ship._status = "Static";
        }
    }

    // 4. Transfert du joueur vers la passerelle / intérieur du vaisseau
    const shipMapId = ship && ship.mapId ? ship.mapId : 31;
    const shipX = ship && typeof ship.landingX === "number" ? ship.landingX : 10;
    const shipY = ship && typeof ship.landingY === "number" ? ship.landingY : 10;

    if (typeof $gamePlayer !== "undefined" && $gamePlayer && typeof $gamePlayer.reserveTransfer === "function") {
        $gamePlayer.reserveTransfer(shipMapId, shipX, shipY, 2, 2);
    }

    // 5. Fondu sortant progressif de l'image
    if (typeof $gameScreen !== "undefined" && $gameScreen && typeof $gameScreen.movePicture === "function") {
        $gameScreen.movePicture(1, 0, 0, 0, 100, 100, 0, 0, 60);
        setTimeout(() => {
            if (typeof $gameScreen !== "undefined" && $gameScreen && typeof $gameScreen.erasePicture === "function") {
                $gameScreen.erasePicture(1);
            }
        }, 1200);
    }
};

// ============================================================================
// ENREGISTREMENT DES COMMANDES DE PLUGIN RPG MAKER MZ
// ============================================================================

(() => {
    "use strict";

    if (typeof PluginManager === "undefined" || !PluginManager.registerCommand) return;

    // Enregistrement sur le plugin SC4_Interface et alias rétrocompatible SC4_SpaceScenes
    const pluginTargets = ["SC4_Interface", "SC4_SpaceScenes"];

    pluginTargets.forEach(target => {
        PluginManager.registerCommand(target, "openSector", () => {
            SC4.openSector();
        });

        PluginManager.registerCommand(target, "openSystem", () => {
            SC4.openSystem();
        });

        PluginManager.registerCommand(target, "openHangar", (args) => {
            const nefId = args && args.nefId ? Number(args.nefId) : 2;
            SC4.openHangar(nefId);
        });

        PluginManager.registerCommand(target, "openQuestBook", () => {
            SC4.openQuestBook();
        });

        PluginManager.registerCommand(target, "openInventory", (args) => {
            const invId = args && args.invId ? Number(args.invId) : 1;
            SC4.openInventory(invId);
        });

        PluginManager.registerCommand(target, "setHeroPose", (args) => {
            const actorId = args && args.actorId ? Number(args.actorId) : 1;
            const pose = args && args.pose ? String(args.pose) : "sit";
            const options = {
                canMove: args && args.canMove !== undefined ? Boolean(args.canMove) : true,
                allowDash: args && args.allowDash !== undefined ? Boolean(args.allowDash) : false,
                speedMod: args && args.speedMod !== undefined ? Number(args.speedMod) : 0,
                onAlert: args && args.onAlert !== undefined ? Boolean(args.onAlert) : true
            };
            SC4.setHeroPose(actorId, pose, options);
        });

        PluginManager.registerCommand(target, "clearHeroPose", (args) => {
            const actorId = args && args.actorId ? Number(args.actorId) : 1;
            SC4.clearHeroPose(actorId);
        });

        PluginManager.registerCommand(target, "setCombatMode", (args) => {
            const active = args && args.active !== undefined ? Boolean(args.active) : true;
            SC4.setCombatMode(active);
        });

        PluginManager.registerCommand(target, "openBridgeConsole", (args) => {
            const shipId = args && args.shipId ? Number(args.shipId) : undefined;
            SC4.openBridgeConsole(shipId);
        });

        PluginManager.registerCommand(target, "performLanding", (args) => {
            const poiId = args && args.poiId ? String(args.poiId) : undefined;
            SC4.performLandingSequence(poiId);
        });

        PluginManager.registerCommand(target, "performTakeoff", () => {
            SC4.performTakeoffSequence();
        });

        PluginManager.registerCommand(target, "setLandingAuthorized", (args) => {
            const targetId = args && args.id !== undefined ? args.id : (args && args.planetId !== undefined ? args.planetId : 5);
            const authorized = args && args.authorized !== undefined ? Boolean(args.authorized) : true;
            SC4.setLandingAuthorized(targetId, authorized);
        });
    });

})();

if (typeof module !== "undefined" && module.exports) {
    module.exports = { SC4 };
}
