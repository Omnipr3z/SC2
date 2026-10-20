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
SC4.setHeroPose = function(actorId, pose) {
    if (window.$heroHub && typeof window.$heroHub.setPose === "function") {
        window.$heroHub.setPose(actorId, pose);
    } else if (actorId === 1 && window.$gamePlayer && typeof window.$gamePlayer.setPose === "function") {
        window.$gamePlayer.setPose(pose);
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
            SC4.setHeroPose(actorId, pose);
        });

        PluginManager.registerCommand(target, "clearHeroPose", (args) => {
            const actorId = args && args.actorId ? Number(args.actorId) : 1;
            SC4.clearHeroPose(actorId);
        });
    });

})();

if (typeof module !== "undefined" && module.exports) {
    module.exports = { SC4 };
}
