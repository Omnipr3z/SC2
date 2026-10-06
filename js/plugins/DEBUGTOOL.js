//=============================================================================
// RPG Maker MZ - DEBUGTOOL.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Outil statique de débogage et logs conditionnels.
 * @author SimCraft
 * 
 * @param enabled
 * @text Activer les logs
 * @type boolean
 * @default true
 * 
 * @param selectiveMode
 * @text Mode sélectif
 * @type boolean
 * @default false
 * 
 * @param allowedKeys
 * @text Clés autorisées (mode sélectif)
 * @type string[]
 * @default []
 * 
 * @help DEBUGTOOL.js
 * 
 * Gestionnaire statique de débogage pour SimCraft 4.
 * 
 * Utilisation :
 *   DEBUGTOOL.log("Message de test", "COMBAT");
 *   DEBUGTOOL.logFormat(["Reid", 42], "Nom: %1, Niveau: %2", "HERO");
 *   DEBUGTOOL.logFormat({ hp: 100, maxHp: 200 }, "PV: %[hp]/%[maxHp]", "GAUGE");
 */

(() => {
    "use strict";

    const pluginName = "DEBUGTOOL";
    const rawParams = (typeof PluginManager !== "undefined" && PluginManager.parameters)
        ? PluginManager.parameters(pluginName)
        : {};

    class DEBUGTOOL {
        static _enabled = rawParams["enabled"] !== undefined ? rawParams["enabled"] === "true" || rawParams["enabled"] === true : true;
        static _selectiveMode = rawParams["selectiveMode"] !== undefined ? rawParams["selectiveMode"] === "true" || rawParams["selectiveMode"] === true : false;
        static _allowedKeys = (() => {
            try {
                const parsed = JSON.parse(rawParams["allowedKeys"] || "[]");
                return Array.isArray(parsed) ? parsed.map(k => String(k).trim().toUpperCase()) : [];
            } catch (e) {
                return [];
            }
        })();

        static isEnabled() {
            return this._enabled;
        }

        static setEnabled(val) {
            this._enabled = Boolean(val);
        }

        static isSelectiveMode() {
            return this._selectiveMode;
        }

        static setSelectiveMode(val) {
            this._selectiveMode = Boolean(val);
        }

        static allowedKeys() {
            return this._allowedKeys;
        }

        static setAllowedKeys(keys) {
            this._allowedKeys = Array.isArray(keys) ? keys.map(k => String(k).trim().toUpperCase()) : [];
        }

        /**
         * Extrait le fichier et la ligne de l'appelant via Error().stack.
         * @returns {string} e.g. "FightManager.js:142"
         */
        static getCallerLocation() {
            try {
                const err = new Error();
                if (!err.stack) return "";
                const lines = err.stack.split("\n");
                // Ligne 0 : Error, Ligne 1 : getCallerLocation, Ligne 2 : log/logFormat, Ligne 3 : Appelant réel
                for (let i = 2; i < lines.length; i++) {
                    const line = lines[i];
                    if (!line) continue;
                    if (line.includes("DEBUGTOOL.js") || line.includes("getCallerLocation")) continue;
                    
                    // Match pattern "at ... (path/filename.js:line:col)" ou "at path/filename.js:line:col"
                    const match = line.match(/([a-zA-Z0-9_\-\.]+\.js):(\d+)(?::\d+)?\)?$/);
                    if (match) {
                        return `${match[1]}:${match[2]}`;
                    }
                }
            } catch (e) {
                // Ignore stack errors
            }
            return "";
        }

        /**
         * Écrit un log de débogage conditionnel dans la console.
         * @param {*} message Message ou données à afficher
         * @param {string} [key=null] Clé de filtrage optionnelle
         */
        static log(message, key = null) {
            if (!this._enabled) return;

            const normalizedKey = key ? String(key).trim().toUpperCase() : null;
            if (this._selectiveMode) {
                if (!normalizedKey || !this._allowedKeys.includes(normalizedKey)) {
                    return;
                }
            }

            const caller = this.getCallerLocation();
            const prefix = caller ? `[${caller}]` : "[DEBUG]";
            const keyTag = normalizedKey ? `[${normalizedKey}]` : "";

            console.log(`${prefix}${keyTag} ${message}`);
        }

        /**
         * Formate un message à partir d'un Array ou d'un Object, puis l'affiche.
         * - Array : remplace %1, %2, etc. ou %0, %1, etc.
         * - Object : remplace %[paramName] ou [paramName]
         * @param {Array|Object} data Données sources
         * @param {string} formatMessage Chaîne avec placeholders
         * @param {string} [key=null] Clé optionnelle
         * @returns {string} Le message formaté
         */
        static logFormat(data, formatMessage, key = null) {
            if (typeof formatMessage !== "string") {
                this.log(data, key);
                return String(data);
            }

            let formatted = formatMessage;

            if (Array.isArray(data)) {
                // Remplacement %1, %2 (1-indexé)
                for (let i = 0; i < data.length; i++) {
                    const val = data[i] !== undefined ? String(data[i]) : "";
                    formatted = formatted.replace(new RegExp(`%${i + 1}\\b`, "g"), val);
                    // Remplacement %0, %1 si index 0
                    formatted = formatted.replace(new RegExp(`%${i}\\b`, "g"), val);
                }
            } else if (data && typeof data === "object") {
                // Remplacement %[prop] et [prop]
                for (const prop of Object.keys(data)) {
                    const val = data[prop] !== undefined ? String(data[prop]) : "";
                    formatted = formatted.replace(new RegExp(`%\\[${prop}\\]`, "g"), val);
                    formatted = formatted.replace(new RegExp(`\\[${prop}\\]`, "g"), val);
                }
            }

            this.log(formatted, key);
            return formatted;
        }
    }

    window.DEBUGTOOL = DEBUGTOOL;
})();
