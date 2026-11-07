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
 * 
 * @command openRelationDialog
 * @text Ouvrir Dialogue Social
 * @desc Ouvre la sous-scène de dialogue social avec un acteur cible.
 * @arg targetActorId
 * @text ID Acteur Cible
 * @type number
 * @default 2
 * 
 * @arg targetEventId
 * @text ID Événement Cible (Optionnel)
 * @type number
 * @desc ID de l'événement sur la carte pour ancrer la bulle (0 pour auto-détecter l'événement appelant).
 * @default 0
 * 
 * @command openMenuRelations
 * @text Ouvrir Carnet Relations
 * @desc Ouvre la scène plein écran du carnet diplomatique et relationnel.
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
SC4.openSector = function () {
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
SC4.openSystem = function () {
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
SC4.openHangar = function (nefId = 2) {
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
SC4.openQuestBook = function () {
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
SC4.openInventory = function (invId = 1) {
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
SC4.setHeroPose = function (actorId, pose, options = {}) {
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
SC4.clearHeroPose = function (actorId) {
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
SC4.isSafeZone = function () {
    return (typeof $gameMap !== "undefined" && $gameMap && typeof $gameMap.isSafeZone === "function") ? $gameMap.isSafeZone() : false;
};

/**
 * Vérifie si la carte courante est en Mode Combat actif.
 * @returns {boolean}
 */
SC4.isCombatMode = function () {
    return (typeof $gameMap !== "undefined" && $gameMap && typeof $gameMap.isCombatMode === "function") ? $gameMap.isCombatMode() : false;
};

/**
 * Force ou modifie l'état de Combat de la carte courante.
 * @param {boolean} active 
 */
SC4.setCombatMode = function (active) {
    if (typeof $gameMap !== "undefined" && $gameMap && typeof $gameMap.setCombatMode === "function") {
        $gameMap.setCombatMode(active);
    }
};

/**
 * Déclenche manuellement une quête par son ID.
 * @param {number} questId - ID de la quête.
 */
SC4.triggerQuest = function (questId) {
    if (window.$gameQuests && typeof window.$gameQuests.startQuest === "function") {
        window.$gameQuests.startQuest(questId);
    }
};

/**
 * Valide et termine une quête par son ID.
 * @param {number} questId - ID de la quête.
 */
SC4.completeQuest = function (questId) {
    if (window.$gameQuests && typeof window.$gameQuests.completeQuest === "function") {
        window.$gameQuests.completeQuest(questId);
    }
};

/**
 * Ouvre la navigation stellaire (Système solaire / Secteur).
 */
SC4.openNavigation = function () {
    SC4.openSystem();
};

/**
 * Ouvre la console de commande de la passerelle du vaisseau spatial.
 * @param {number} [shipId] - ID explicite du vaisseau ciblé (optionnel, prioritaire sur le mapId de la carte)
 */
SC4.openBridgeConsole = function (shipId) {
    if (typeof SceneManager !== "undefined" && SceneManager._scene && typeof SceneManager._scene.openBridgeConsole === "function") {
        SceneManager._scene.openBridgeConsole(shipId);
    } else if (typeof $gameSystem !== "undefined" && $gameSystem) {
        $gameSystem._bridgeConsoleOpen = true;
        $gameSystem._bridgeConsoleShipId = (shipId !== undefined && shipId !== null) ? Number(shipId) : null;
    }
};

/**
 * Ouvre la sous-scène de dialogue social avec un acteur cible.
 * @param {number} [targetActorId=2] 
 * @param {number|null} [targetEventId=null] ID optionnel de l'événement cible pour ancrer la bulle (null pour auto-détection)
 */
SC4.openRelationDialog = function (targetActorId = 2, targetEventId = null) {
    $relationManager.openRelationDialog(targetActorId, targetEventId);
};

/**
 * Ouvre la scène plein écran du carnet diplomatique et relationnel.
 */
SC4.openMenuRelations = function () {
    if (typeof SceneManager !== "undefined") {
        const MenuSceneClass = (typeof Scene_MenuRelations !== "undefined")
            ? Scene_MenuRelations
            : (typeof window !== "undefined" ? window.Scene_MenuRelations : null);
        if (MenuSceneClass) {
            SceneManager.push(MenuSceneClass);
        }
    }
};

/**
 * Vérifie si l'atterrissage est physiquement possible (landingAllowed) pour une planète ou un POI donné.
 * @param {string|number} [planetOrPoiId] 
 * @returns {boolean}
 */
SC4.isLandingAllowed = function (planetOrPoiId) {
    const gal = (typeof window !== "undefined" && window.$gameGalaxy) ? window.$gameGalaxy : null;
    if (!gal) return false;

    if (planetOrPoiId !== undefined && planetOrPoiId !== null) {
        const poi = gal.getPOI(planetOrPoiId);
        if (poi) return typeof poi.isLandingAuthorized === "function" ? poi.isLandingAuthorized() : Boolean(poi.landingAuthorized);
        const planet = gal.getPlanet(planetOrPoiId);
        if (planet) return typeof planet.isLandingAllowed === "function" ? planet.isLandingAllowed() : Boolean(planet.landingAllowed);
        return false;
    }

    const curPlanet = gal.currentPlanet();
    return curPlanet && typeof curPlanet.isLandingAllowed === "function" ? curPlanet.isLandingAllowed() : false;
};

/**
 * Vérifie si l'atterrissage est autorisé pour une planète ou un POI donné.
 * @param {string|number} [planetOrPoiId] 
 * @returns {boolean}
 */
SC4.isLandingAuthorized = function (planetOrPoiId) {
    const gal = (typeof window !== "undefined" && window.$gameGalaxy) ? window.$gameGalaxy : null;
    if (!gal) return false;

    if (planetOrPoiId !== undefined && planetOrPoiId !== null) {
        const poi = gal.getPOI(planetOrPoiId);
        if (poi) return typeof poi.isLandingAuthorized === "function" ? poi.isLandingAuthorized() : false;
        const planet = gal.getPlanet(planetOrPoiId);
        if (planet) return typeof planet.isLandingAllowed === "function" ? planet.isLandingAllowed() : false;
    }

    const curPoi = gal.currentPOI();
    if (curPoi) return curPoi.isLandingAuthorized();
    const curPlanet = gal.currentPlanet();
    return curPlanet && typeof curPlanet.isLandingAllowed === "function" ? curPlanet.isLandingAllowed() : false;
};

/**
 * Définit l'autorisation d'atterrissage pour une planète ou un POI donné.
 * @param {string|number} planetOrPoiId 
 * @param {boolean} [authorized=true] 
 */
SC4.setLandingAuthorized = function (planetOrPoiId, authorized = true) {
    const gal = (typeof window !== "undefined" && window.$gameGalaxy) ? window.$gameGalaxy : null;
    if (!gal) return;

    const poi = gal.getPOI(planetOrPoiId);
    if (poi && typeof poi.setLandingAuthorized === "function") {
        poi.setLandingAuthorized(authorized);
    }
    const planet = gal.getPlanet(planetOrPoiId);
    if (planet && typeof planet.setLandingAllowed === "function") {
        planet.setLandingAllowed(authorized);
    }
};

/**
 * Exécute la séquence scénarisée d'atterrissage V1 (SE, overlay de fondu, transfert et maj du statut vaisseau).
 * @param {string} [targetPoiId] - ID du point d'intérêt cible (ex: 'prime_spatioport').
 */
SC4.performLandingSequence = function (targetPoiId) {
    const gal = (typeof window !== "undefined" && window.$gameGalaxy) ? window.$gameGalaxy : null;
    const ship = (typeof window !== "undefined" && window.$gameSpaceships) ? window.$gameSpaceships.playerShip() : null;
    let poi = null;

    if (gal) {
        if (targetPoiId) {
            poi = gal.getPOI(targetPoiId);
        } else if (ship && ship.orbitingPlanetId) {
            const planet = gal.getPlanet(ship.orbitingPlanetId);
            if (planet) {
                const pois = typeof planet.pois === "function" ? planet.pois() : planet.pois;
                poi = (pois || []).find(p => p && p.landingMapId > 0) || null;
            }
        }
        if (!poi) {
            poi = gal.currentPOI();
        }
    }

    if (!poi) {
        if (typeof DEBUGTOOL !== "undefined") {
            DEBUGTOOL.error(`[SC4.performLandingSequence] Impossible d'atterrir : POI introuvable (targetPoiId: "${targetPoiId}").`);
        }
        return;
    }

    const planetId = poi.planetId || (ship && ship.orbitingPlanetId ? ship.orbitingPlanetId : null);
    const mapId = poi.landingMapId;
    const lx = typeof poi.landingX === "number" ? poi.landingX : 10;
    const ly = typeof poi.landingY === "number" ? poi.landingY : 10;

    if (!mapId) {
        if (typeof DEBUGTOOL !== "undefined") {
            DEBUGTOOL.error(`[SC4.performLandingSequence] Le POI "${poi.id}" ne possède pas de landingMapId valide.`);
        }
        return;
    }

    // 1. Audio SE Atterrissage / Réacteurs
    if (typeof AudioManager !== "undefined" && typeof AudioManager.playSe === "function") {
        AudioManager.playSe({ name: "FIREWIND2", volume: 90, pitch: 90, pan: 0 });
    }

    // 2. Affichage image Landing_placeholder
    if (typeof $gameScreen !== "undefined" && $gameScreen && typeof $gameScreen.showPicture === "function") {
        $gameScreen.showPicture(1, "Landing_placeholder", 0, 0, 0, 100, 100, 255, 0);
    }

    // 3. Mise à jour de l'état du vaisseau spatial (Amarré / Atterri sur la planète)
    if (ship && planetId) {
        if (typeof ship.aboard === "function") {
            ship.aboard(planetId, "P");
        }
        ship._status = "Static";
    }

    // 4. Déclenchement Self-Switch A sur l'événement d'atterrissage et transfert silencieux du joueur
    const landingEventId = typeof poi.landingEventId === "number" ? poi.landingEventId : 1;
    if (typeof $gameSelfSwitches !== "undefined" && $gameSelfSwitches && typeof $gameSelfSwitches.setValue === "function") {
        $gameSelfSwitches.setValue([mapId, landingEventId, "A"], true);
    }
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
SC4.performTakeoffSequence = function () {
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

        PluginManager.registerCommand(target, "openRelationDialog", function (args) {
            const targetActorId = args && args.targetActorId ? Number(args.targetActorId) : 2;
            const explicitEventId = (args && args.targetEventId !== undefined && args.targetEventId !== null && args.targetEventId !== "" && Number(args.targetEventId) > 0)
                ? Number(args.targetEventId)
                : null;
            const callingEventId = (this && typeof this.eventId === "function" && this.eventId() > 0)
                ? this.eventId()
                : null;
            const targetEventId = explicitEventId !== null ? explicitEventId : callingEventId;
            SC4.openRelationDialog(targetActorId, targetEventId);
        });

        PluginManager.registerCommand(target, "openMenuRelations", () => {
            SC4.openMenuRelations();
        });
    });

})();
// Namespace global pour accès rapide (console, scripts, dev)
window.SC4 = window.SC4 || {};
window.SC4.setHudVisible = function (visible) {
    if (visible)
        $guiManger.showPlayerHud();
    else
        $guiManager.hidePlayerHud();
}
window.SC4.setHud = window.SC4.setHudVisible;
window.SC4.showHud = function () { window.SC4.setHudVisible(true); };
window.SC4.hideHud = function () { window.SC4.setHudVisible(false); };
window.SC4.toggleHud = function () {
    if (typeof $gameSystem !== "undefined" && $gameSystem) {
        return $gameSystem.toggleHud();
    }
    return false;
};

window.SC4.setPlayerHudVisible = function (visible) {
    if (typeof $gameSystem !== "undefined" && $gameSystem) {
        $gameSystem.setPlayerHudVisible(visible);
    }
};
window.SC4.setPlayerHud = window.SC4.setPlayerHudVisible;
window.SC4.showPlayerHud = function () { window.SC4.setPlayerHudVisible(true); };
window.SC4.hidePlayerHud = function () { window.SC4.setPlayerHudVisible(false); };
window.SC4.togglePlayerHud = function () {
    if (typeof $gameSystem !== "undefined" && $gameSystem) {
        return $gameSystem.togglePlayerHud();
    }
    return false;
};

window.SC4.setWeaponHudVisible = function (visible) {
    if (typeof $gameSystem !== "undefined" && $gameSystem) {
        $gameSystem.setWeaponHudVisible(visible);
    }
};
window.SC4.setWeaponHud = window.SC4.setWeaponHudVisible;
window.SC4.showWeaponHud = function () { window.SC4.setWeaponHudVisible(true); };
window.SC4.hideWeaponHud = function () { window.SC4.setWeaponHudVisible(false); };
window.SC4.toggleWeaponHud = function () {
    if (typeof $gameSystem !== "undefined" && $gameSystem) {
        return $gameSystem.toggleWeaponHud();
    }
    return false;
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = { SC4 };
}
