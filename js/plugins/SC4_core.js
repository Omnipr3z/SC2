//=============================================================================
// RPG Maker MZ - SC4_core
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Fonctions utilitaires du noyau SimCraft, parsing, conversion et commandes de test console.
 * @author SimCraft
 * 
 * @help SC4_core.js
 * 
 * Fournit les fonctions utilitaires globales pour les plugins SimCraft 4 :
 * - Parsing et conversion typée (parseNumber, parseString, parseBoolean, parsePreloadFonts).
 * - Commandes de test interactives en console (testBubbleMsg, testBubbleMsgEvent, testBubbleMsgCoords, clearBubbleTarget).
 */

function parseNumber(val, defaultVal) {
    if (val === undefined || val === null || val === "") return defaultVal;
    const n = Number(val);
    return isNaN(n) ? defaultVal : n;
}

function parseString(val, defaultVal) {
    if (val === undefined || val === null || val === "") return defaultVal;
    return String(val).trim();
}

function parseBoolean(val, defaultVal) {
    if (val === undefined || val === null || val === "") return defaultVal;
    if (typeof val === "boolean") return val;
    const s = String(val).trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
    if (s === "false" || s === "0" || s === "no" || s === "off") return false;
    return defaultVal;
}

function parsePreloadFonts(raw) {
    if (!raw) return ["BD.ttf"];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(s => String(s).trim()).filter(Boolean);
    } catch (e) {}
    if (typeof raw === "string") {
        return raw.split(",").map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    }
    return ["BD.ttf"];
}

// ============================================================================
// Outils de test console interactifs
// ============================================================================

function testBubbleMsg(message = "Message de test", positionType = 0) {
    if (!SceneManager._scene || !SceneManager._scene._messageWindow) {
        console.warn("[SC4_core] Aucune fenêtre de message active.");
        return;
    }
    const win = SceneManager._scene._messageWindow;
    win.setMapTarget($gamePlayer);
    $gameMessage.setBackground(0);
    $gameMessage.setPositionType(positionType);
    $gameMessage.add(message);
}

function testBubbleMsgEvent(eventId = 1, message = "Message événement", positionType = 0) {
    if (!SceneManager._scene || !SceneManager._scene._messageWindow) {
        console.warn("[SC4_core] Aucune fenêtre de message active.");
        return;
    }
    const event = $gameMap.event(eventId);
    if (!event) {
        console.warn(`[SC4_core] Événement ID ${eventId} introuvable.`);
        return;
    }
    const win = SceneManager._scene._messageWindow;
    win.setMapTarget(event);
    $gameMessage.setBackground(0);
    $gameMessage.setPositionType(positionType);
    $gameMessage.add(message);
}

function testBubbleMsgCoords(x = 400, y = 300, message = "Message coordonnées", positionType = 1) {
    if (!SceneManager._scene || !SceneManager._scene._messageWindow) {
        console.warn("[SC4_core] Aucune fenêtre de message active.");
        return;
    }
    const win = SceneManager._scene._messageWindow;
    win.setMapTarget({ x, y });
    $gameMessage.setBackground(0);
    $gameMessage.setPositionType(positionType);
    $gameMessage.add(message);
}

function clearBubbleTarget() {
    if (SceneManager._scene && SceneManager._scene._messageWindow) {
        SceneManager._scene._messageWindow.setMapTarget(null);
    }
}

// Exports globaux
window.parseNumber = parseNumber;
window.parseString = parseString;
window.parseBoolean = parseBoolean;
window.parsePreloadFonts = parsePreloadFonts;

window.testBubbleMsg = testBubbleMsg;
window.testBubbleMsgEvent = testBubbleMsgEvent;
window.testBubbleMsgCoords = testBubbleMsgCoords;
window.clearBubbleTarget = clearBubbleTarget;

window.SC4_Core = {
    parseNumber,
    parseString,
    parseBoolean,
    parsePreloadFonts,
    testBubbleMsg,
    testBubbleMsgEvent,
    testBubbleMsgCoords,
    clearBubbleTarget
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = window.SC4_Core;
}

