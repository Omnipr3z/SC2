//=============================================================================
// SC4_Localization.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Système de localisation dynamique (\L[KEY]), dictionnaires multi-langues et options.
 * @author SimCraft
 * @help
 * ============================================================================
 * SC4_Localization.js
 * ============================================================================
 * Ce plugin gère la localisation dynamique et le multi-langue de SimCraft 4 :
 * 
 * 1. Flag \L[KEY] :
 *    - Remplacement à la volée dans les fenêtres de message (Window_Message,
 *      Window_Base) par la valeur définie dans data/SC/Localisation_[LANG].json.
 *    - Exécuté en priorité pour permettre l'expansion d'autres escape codes
 *      (\N[1], \V[5], etc.) contenus dans les textes traduits.
 *    - Fonctionne également sur les méthodes de TextManager (vocables, commandes).
 *    - Fonctionne sur les noms et descriptions de tous les objets de jeu
 *      ($dataItems, $dataWeapons, $dataArmors, $dataSkills, $dataStates, etc.).
 * 
 * 2. Dictionnaires de localisation :
 *    - data/SC/Localisation_FR.json (Français)
 *    - data/SC/Localisation_EN.json (Anglais)
 *    - Supporte les clés plates (ex: "newgame") et hiérarchiques (ex: "title.newGame").
 * 
 * 3. Configuration et persistance :
 *    - Option de langue dans le menu des Options (Français / English).
 *    - Sauvegarde automatique dans ConfigManager (config.locale).
 *    - Le jeu se lance avec le dernier paramètre sauvegardé.
 *    - Accessible via $gameSystem.locale ("FR" / "EN").
 * ============================================================================
 */

class SC4_Localization {
    static _dictionaries = {};
    static _locEntities = {};
    static _defaultLocale = "FR";

    /**
     * Lit un fichier JSON de manière synchrone (compatible Node.js / NW.js et Navigateur).
     * @param {string} filePath Chemin relatif (ex: "data/SC/loc/UI_FR.json")
     * @returns {any|null}
     */
    static readJsonSync(filePath) {
        if (typeof require === "function") {
            try {
                const fs = require("fs");
                const p = require("path");
                let fullPath = filePath;
                if (!p.isAbsolute(fullPath)) {
                    fullPath = p.resolve(fullPath);
                }
                if (fs.existsSync(fullPath)) {
                    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
                }
            } catch (e) {
                // Fallback vers XHR
            }
        }
        if (typeof XMLHttpRequest !== "undefined") {
            try {
                const xhr = new XMLHttpRequest();
                xhr.open("GET", filePath, false);
                xhr.send();
                if (xhr.status === 200 || xhr.status === 0) {
                    return JSON.parse(xhr.responseText);
                }
            } catch (e) {}
        }
        return null;
    }

    /**
     * Retourne la langue active en majuscules ("FR" ou "EN").
     * @returns {string}
     */
    static locale() {
        if (typeof ConfigManager !== "undefined" && ConfigManager.locale) {
            return String(ConfigManager.locale).trim().toUpperCase();
        }
        if (typeof $gameSystem !== "undefined" && $gameSystem && $gameSystem._locale) {
            return String($gameSystem._locale).trim().toUpperCase();
        }
        return this._defaultLocale;
    }

    /**
     * Modifie la langue active, sauvegarde la configuration et synchronise $gameSystem.
     * @param {string} lang ("FR" ou "EN")
     */
    static setLocale(lang) {
        const upper = (lang || this._defaultLocale).trim().toUpperCase();
        if (typeof ConfigManager !== "undefined") {
            ConfigManager.locale = upper;
            if (typeof ConfigManager.save === "function") {
                ConfigManager.save();
            }
        }
        if (typeof $gameSystem !== "undefined" && $gameSystem) {
            $gameSystem._locale = upper;
        }
        if (!this._dictionaries[upper]) {
            this.loadDictionary(upper);
        }
        this.applyToDatabase(upper);
        if (typeof window !== "undefined") {
            if (window.$gameQuests && typeof window.$gameQuests.onLocaleChanged === "function") {
                window.$gameQuests.onLocaleChanged(upper);
            }
        }
    }

    /**
     * Charge les dictionnaires et textes d'entités depuis data/SC/loc/ (UI, DIALOGUES, TUTOS, entités).
     * @param {string} lang ("FR" ou "EN")
     */
    static loadDictionary(lang) {
        const upper = (lang || this._defaultLocale).trim().toUpperCase();
        let dict = {};

        // 1. Dictionnaires modulaires dans data/SC/loc/
        const ui = this.readJsonSync(`data/SC/loc/UI_${upper}.json`);
        if (ui && typeof ui === "object") {
            Object.assign(dict, ui);
        }

        const dial = this.readJsonSync(`data/SC/loc/DIALOGUES_${upper}.json`);
        if (dial && typeof dial === "object") {
            Object.assign(dict, dial);
        }

        const tutos = this.readJsonSync(`data/SC/loc/TUTOS_${upper}.json`);
        if (tutos && typeof tutos === "object") {
            for (const [k, v] of Object.entries(tutos)) {
                if (k === "travel" && typeof v === "object" && v !== null) {
                    dict.travel = Object.assign(dict.travel || {}, v);
                } else {
                    dict[k] = v;
                }
            }
        }

        // Repli / Rétro-compatibilité sur Localisation_[LANG].json
        if (Object.keys(dict).length === 0) {
            const legacy = this.readJsonSync(`data/SC/loc/Localisation_${upper}.json`) || this.readJsonSync(`data/SC/Localisation_${upper}.json`);
            if (legacy && typeof legacy === "object") {
                Object.assign(dict, legacy);
            }
        }

        this._dictionaries[upper] = dict;

        // 2. Fichiers de localisation d'entités (Secteurs, Planètes, POIs, Quêtes)
        this._locEntities[upper] = {
            sectors: this.readJsonSync(`data/SC/loc/SECTORS_${upper}.json`),
            planets: this.readJsonSync(`data/SC/loc/PLANETS_${upper}.json`),
            pois: this.readJsonSync(`data/SC/loc/POIS_${upper}.json`),
            quests: this.readJsonSync(`data/SC/loc/QUESTS_${upper}.json`)
        };
    }

    /**
     * Fusionne les données physiques de base avec les textes de la langue choisie.
     */
    static buildLocalizedData(type, lang) {
        const upper = (lang || this.locale()).toUpperCase();
        if (!this._locEntities[upper]) {
            this.loadDictionary(upper);
        }
        const loc = this._locEntities[upper] || {};

        if (type === "planets") {
            const rawPhys = window.$dataPlanets_PHYSICAL || window.$dataPlanets || [];
            const locList = loc.planets || [];
            const res = [null];
            rawPhys.forEach(p => {
                if (!p || typeof p !== "object") return;
                const text = (Array.isArray(locList) ? locList.find(l => l && l.id === p.id) : null) || {};
                const planetObj = {
                    ...p,
                    name: text.name || p.name || `Planète ${p.id}`,
                    type: text.type || p.type || "Astre",
                    description: text.description || p.description || ""
                };
                res[p.id] = planetObj;
            });
            for (let i = 0; i < res.length; i++) {
                if (res[i] === undefined) res[i] = null;
            }
            return res;
        }

        if (type === "sectors") {
            const rawPhys = window.$dataSectors_PHYSICAL || window.$dataSectors || [];
            const locSectors = loc.sectors || [];
            const res = [null];
            rawPhys.forEach(sec => {
                if (!sec || typeof sec !== "object") return;
                const secLoc = (Array.isArray(locSectors) ? locSectors.find(l => l && l.id === sec.id) : null) || {};
                const locSysList = secLoc.systems || [];
                const systems = (sec.systems || []).map(sys => {
                    const sysLoc = (Array.isArray(locSysList) ? locSysList.find(s => s && s.id === sys.id) : null) || {};
                    return {
                        ...sys,
                        name: sysLoc.name || sys.name || `Système ${sys.id}`,
                        description: sysLoc.description || sys.description || ""
                    };
                });
                res[sec.id] = {
                    ...sec,
                    name: secLoc.name || sec.name || `Secteur ${sec.id}`,
                    description: secLoc.description || sec.description || "",
                    systems: systems
                };
            });
            for (let i = 0; i < res.length; i++) {
                if (res[i] === undefined) res[i] = null;
            }
            return res;
        }

        if (type === "pois") {
            const rawPhys = window.$dataPois_PHYSICAL || window.$dataPois || [];
            const locPois = loc.pois || [];
            const res = [null];
            rawPhys.forEach(poi => {
                if (!poi || typeof poi !== "object") return;
                const poiLoc = (Array.isArray(locPois) ? locPois.find(l => l && l.id === poi.id) : null) || {};
                res.push({
                    ...poi,
                    name: poiLoc.name || poi.name || poi.id,
                    description: poiLoc.description || poi.description || ""
                });
            });
            return res;
        }

        if (type === "quests") {
            const rawPhys = window.$dataQuests_PHYSICAL || window.$dataQuests || [];
            const locQuests = loc.quests || [];
            const res = [null];
            rawPhys.forEach(q => {
                if (!q || typeof q !== "object") return;
                const qLoc = (Array.isArray(locQuests) ? locQuests.find(l => l && l.id === q.id) : null) || {};
                const locLocations = qLoc.locations || [];
                const locations = (q.locations || []).map(locItem => {
                    const locText = (Array.isArray(locLocations) ? locLocations.find(l => l && l.id === locItem.id) : null) || {};
                    return {
                        ...locItem,
                        name: locText.name || locItem.name || locItem.id,
                        description: locText.description || locItem.description || ""
                    };
                });
                res[q.id] = {
                    ...q,
                    name: qLoc.name || q.name || `Quête ${q.id}`,
                    description: qLoc.description || q.description || "",
                    alertTxt: qLoc.alertTxt || q.alertTxt || [],
                    locations: locations
                };
            });
            for (let i = 0; i < res.length; i++) {
                if (res[i] === undefined) res[i] = null;
            }
            return res;
        }
        return [];
    }

    /**
     * Applique la localisation courante à l'ensemble des données spatiales globales.
     */
    static applyToDatabase(lang) {
        if (typeof window === "undefined") return;
        const targetLocale = (lang || this.locale()).toUpperCase();

        if (window.$dataPlanets_PHYSICAL || window.$dataPlanets) {
            window.$dataPlanets_FR = this.buildLocalizedData("planets", "FR");
            window.$dataPlanets_EN = this.buildLocalizedData("planets", "EN");
            window.$dataPlanets = targetLocale === "EN" ? window.$dataPlanets_EN : window.$dataPlanets_FR;
        }

        if (window.$dataSectors_PHYSICAL || window.$dataSectors) {
            window.$dataSectors_FR = this.buildLocalizedData("sectors", "FR");
            window.$dataSectors_EN = this.buildLocalizedData("sectors", "EN");
            window.$dataSectors = targetLocale === "EN" ? window.$dataSectors_EN : window.$dataSectors_FR;
        }

        if (window.$dataPois_PHYSICAL || window.$dataPois) {
            window.$dataPois_FR = this.buildLocalizedData("pois", "FR");
            window.$dataPois_EN = this.buildLocalizedData("pois", "EN");
            window.$dataPois = targetLocale === "EN" ? window.$dataPois_EN : window.$dataPois_FR;
        }

        if (window.$dataQuests_PHYSICAL || window.$dataQuests) {
            window.$dataQuests_FR = this.buildLocalizedData("quests", "FR");
            window.$dataQuests_EN = this.buildLocalizedData("quests", "EN");
            window.$dataQuests = targetLocale === "EN" ? window.$dataQuests_EN : window.$dataQuests_FR;
        }
    }

    /**
     * Charge tous les dictionnaires disponibles (FR et EN).
     */
    static loadAll() {
        this.loadDictionary("FR");
        this.loadDictionary("EN");
    }

    /**
     * Vérifie si les dictionnaires sont prêts.
     * @returns {boolean}
     */
    static isLoaded() {
        return Boolean(this._dictionaries["FR"] && this._dictionaries["EN"]);
    }

    /**
     * Récupère le texte traduit pour une clé donnée dans la langue active.
     * @param {string} key Clé de localisation (ex: "newgame" ou "title.newGame")
     * @param {string} [defaultValue=""] Valeur de repli si la clé est introuvable
     * @returns {string}
     */
    static getText(key, defaultValue = "") {
        if (!key) return defaultValue;
        const currentLang = this.locale();
        const fallbackLang = currentLang === "FR" ? "EN" : "FR";

        const val = this._lookupInDict(this._dictionaries[currentLang], key);
        if (val !== undefined && val !== null) {
            return String(val);
        }

        const fallbackVal = this._lookupInDict(this._dictionaries[fallbackLang], key);
        if (fallbackVal !== undefined && fallbackVal !== null) {
            return String(fallbackVal);
        }

        return defaultValue || key;
    }

    /**
     * Recherche une clé dans un dictionnaire (supporte les clés plates, les chemins pointés et l'insensibilité à la casse).
     * @private
     */
    static _lookupInDict(dict, key) {
        if (!dict || typeof dict !== "object") return undefined;

        // 1. Recherche directe exacte
        if (dict[key] !== undefined) {
            return dict[key];
        }

        // 2. Recherche par chemin pointé (ex: "title.newGame")
        if (key.includes(".")) {
            const parts = key.split(".");
            let cur = dict;
            for (const part of parts) {
                if (cur && typeof cur === "object" && cur[part] !== undefined) {
                    cur = cur[part];
                } else {
                    cur = undefined;
                    break;
                }
            }
            if (cur !== undefined && typeof cur !== "object") {
                return cur;
            }
        }

        // 3. Recherche insensible à la casse
        const lowerKey = key.toLowerCase();
        if (dict[lowerKey] !== undefined) {
            return dict[lowerKey];
        }

        for (const k of Object.keys(dict)) {
            if (k.toLowerCase() === lowerKey) {
                return dict[k];
            }
        }

        return undefined;
    }

    /**
     * Parse une chaîne de texte et remplace tous les drapeaux \L[KEY] par leur traduction.
     * @param {string} text Texte source
     * @returns {string}
     */
    static parse(text) {
        if (typeof text !== "string") return text;
        if (!text.includes("\\L[") && !text.includes("\\l[") && !text.includes("\x1bL[") && !text.includes("\x1bl[")) {
            return text;
        }

        // Remplace les occurrences de \L[KEY] ou \x1bL[KEY] (insensible à la casse)
        return text.replace(/(?:\x1b|\\)[Ll]\[([^\]]+)\]/g, (match, key) => {
            const trimmedKey = String(key).trim();
            return this.getText(trimmedKey, match);
        });
    }

    /**
     * Installe des getters dynamiques sur les propriétés name et description d'un objet de données.
     * @param {object} obj Objet RMMZ ($dataItems, $dataSkills, etc.)
     */
    static hookDatabaseObject(obj) {
        if (!obj || typeof obj !== "object") return;
        if (obj._sc4LocalizedHooked) return;
        obj._sc4LocalizedHooked = true;

        if (typeof obj.name === "string" && (obj.name.includes("\\L[") || obj.name.includes("\\l["))) {
            let rawName = obj.name;
            Object.defineProperty(obj, "name", {
                get: () => SC4_Localization.parse(rawName),
                set: (v) => { rawName = v; },
                configurable: true,
                enumerable: true
            });
        }

        if (typeof obj.description === "string" && (obj.description.includes("\\L[") || obj.description.includes("\\l["))) {
            let rawDesc = obj.description;
            Object.defineProperty(obj, "description", {
                get: () => SC4_Localization.parse(rawDesc),
                set: (v) => { rawDesc = v; },
                configurable: true,
                enumerable: true
            });
        }
    }

    /**
     * Parcourt et connecte tous les objets de la base de données RMMZ chargée.
     */
    static hookAllDatabaseObjects() {
        const dbArrays = [
            typeof $dataItems !== "undefined" ? $dataItems : null,
            typeof $dataWeapons !== "undefined" ? $dataWeapons : null,
            typeof $dataArmors !== "undefined" ? $dataArmors : null,
            typeof $dataSkills !== "undefined" ? $dataSkills : null,
            typeof $dataStates !== "undefined" ? $dataStates : null,
            typeof $dataEnemies !== "undefined" ? $dataEnemies : null,
            typeof $dataClasses !== "undefined" ? $dataClasses : null,
            typeof $dataActors !== "undefined" ? $dataActors : null
        ];

        for (const arr of dbArrays) {
            if (Array.isArray(arr)) {
                for (const item of arr) {
                    if (item) {
                        this.hookDatabaseObject(item);
                    }
                }
            }
        }
    }
    static get(key, defaultValue = "") {
        return this.getText(key, defaultValue);
    }
}

window.SC4_Localization = SC4_Localization;
window.SC4 = window.SC4 || {};
window.SC4.Localization = SC4_Localization;

// ============================================================================
// 1. Initialisation et chargement des données
// ============================================================================
(() => {
    "use strict";

    // Pré-chargement immédiat des dictionnaires
    SC4_Localization.loadAll();

    // Hook DataManager
    if (typeof DataManager !== "undefined") {
        const _DataManager_loadDatabase = DataManager.loadDatabase;
        DataManager.loadDatabase = function () {
            _DataManager_loadDatabase.call(this);
            SC4_Localization.loadAll();
        };

        const _DataManager_onLoad = DataManager.onLoad;
        DataManager.onLoad = function (object) {
            _DataManager_onLoad.call(this, object);
            if (Array.isArray(object)) {
                for (const item of object) {
                    if (item) {
                        SC4_Localization.hookDatabaseObject(item);
                    }
                }
            }
        };
    }

    // ========================================================================
    // 2. Persistance dans ConfigManager et Game_System
    // ========================================================================
    if (typeof ConfigManager !== "undefined") {
        ConfigManager.locale = "FR";

        const _ConfigManager_makeData = ConfigManager.makeData;
        ConfigManager.makeData = function () {
            const config = _ConfigManager_makeData.call(this);
            config.locale = this.locale || "FR";
            return config;
        };

        const _ConfigManager_applyData = ConfigManager.applyData;
        ConfigManager.applyData = function (config) {
            _ConfigManager_applyData.call(this, config);
            this.locale = (config && config.locale) ? String(config.locale).toUpperCase() : "FR";
            if (typeof $gameSystem !== "undefined" && $gameSystem) {
                $gameSystem._locale = this.locale;
            }
        };
    }

    if (typeof Game_System !== "undefined") {
        Object.defineProperty(Game_System.prototype, "locale", {
            get: function () {
                if (typeof ConfigManager !== "undefined" && ConfigManager.locale) {
                    return String(ConfigManager.locale).toUpperCase();
                }
                return this._locale || "FR";
            },
            set: function (val) {
                const upper = String(val || "FR").toUpperCase();
                this._locale = upper;
                if (typeof ConfigManager !== "undefined") {
                    ConfigManager.locale = upper;
                    if (typeof ConfigManager.save === "function") {
                        ConfigManager.save();
                    }
                }
            },
            configurable: true
        });
    }

    // ========================================================================
    // 3. Traitement prioritaire de \L[KEY] dans les fenêtres de texte
    // ========================================================================
    if (typeof Window_Base !== "undefined") {
        const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
        Window_Base.prototype.convertEscapeCharacters = function (text) {
            // \L[KEY] est converti AVANT les autres flags pour que les textes traduits
            // puissent à leur tour contenir des escape codes (\N[1], \V[5], \C[2], etc.)
            const localized = SC4_Localization.parse(text);
            return _Window_Base_convertEscapeCharacters.call(this, localized);
        };
    }

    if (typeof Window_Command !== "undefined") {
        const _Window_Command_commandName = Window_Command.prototype.commandName;
        Window_Command.prototype.commandName = function (index) {
            const raw = _Window_Command_commandName ? _Window_Command_commandName.call(this, index) : (this._list && this._list[index] ? this._list[index].name : "");
            return SC4_Localization.parse(raw);
        };
    }

    if (typeof Window_NameBox !== "undefined") {
        const _Window_NameBox_setName = Window_NameBox.prototype.setName;
        Window_NameBox.prototype.setName = function (name) {
            const localized = typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(name) : name;
            _Window_NameBox_setName.call(this, localized);
        };
    }

    // ========================================================================
    // 4. Hook TextManager (vocables, commandes, termes et messages)
    // ========================================================================
    if (typeof TextManager !== "undefined") {
        const _TextManager_basic = TextManager.basic;
        TextManager.basic = function (basicId) {
            const raw = _TextManager_basic.call(this, basicId);
            return SC4_Localization.parse(raw);
        };

        const _TextManager_param = TextManager.param;
        TextManager.param = function (paramId) {
            const raw = _TextManager_param.call(this, paramId);
            return SC4_Localization.parse(raw);
        };

        const _TextManager_command = TextManager.command;
        TextManager.command = function (commandId) {
            const raw = _TextManager_command.call(this, commandId);
            const parsed = SC4_Localization.parse(raw);
            if (parsed !== raw) return parsed;

            // Remplacement automatique des commandes vanilla courantes par la langue active
            const cmdKeys = {
                0: "terms.fight",
                1: "terms.escape",
                2: "terms.attack",
                3: "terms.guard",
                4: "menu.item",
                5: "menu.skill",
                6: "menu.equip",
                7: "menu.status",
                8: "menu.formation",
                9: "menu.save",
                10: "menu.gameEnd",
                11: "title.options",
                12: "terms.weapon",
                13: "terms.armor",
                14: "terms.keyItem",
                15: "terms.equip2",
                16: "terms.optimize",
                17: "terms.clear",
                18: "title.newGame",
                19: "title.continue",
                21: "title.exit",
                22: "terms.cancel",
                24: "terms.buy",
                25: "terms.sell"
            };

            const key = cmdKeys[commandId];
            if (key) {
                return SC4_Localization.getText(key, raw);
            }
            return raw;
        };

        const _TextManager_message = TextManager.message;
        TextManager.message = function (messageId) {
            const raw = _TextManager_message.call(this, messageId);
            const parsed = SC4_Localization.parse(raw);
            if (parsed !== raw) return parsed;

            // Messages d'options courants
            const msgKeys = {
                alwaysDash: "options.alwaysDash",
                commandRemember: "options.commandRemember",
                touchUI: "options.touchUI",
                bgmVolume: "options.bgmVolume",
                bgsVolume: "options.bgsVolume",
                meVolume: "options.meVolume",
                seVolume: "options.seVolume"
            };

            const key = msgKeys[messageId];
            if (key) {
                return SC4_Localization.getText(key, raw);
            }
            return raw;
        };
    }

    // ========================================================================
    // 5. Ajout de l'Option de Langue dans Window_Options
    // ========================================================================
    if (typeof Window_Options !== "undefined") {
        const _Window_Options_addGeneralOptions = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function () {
            this.addCommand(SC4_Localization.getText("options.language", "Langue"), "locale");
            if (_Window_Options_addGeneralOptions) {
                _Window_Options_addGeneralOptions.call(this);
            }
        };

        const _Window_Options_statusText = Window_Options.prototype.statusText;
        Window_Options.prototype.statusText = function (index) {
            const symbol = this.commandSymbol(index);
            if (symbol === "locale") {
                const loc = SC4_Localization.locale();
                return loc === "EN" ? "English" : "Français";
            }
            return _Window_Options_statusText ? _Window_Options_statusText.call(this, index) : "";
        };

        const _Window_Options_processOk = Window_Options.prototype.processOk;
        Window_Options.prototype.processOk = function () {
            const index = this.index();
            const symbol = this.commandSymbol(index);
            if (symbol === "locale") {
                this.toggleLocale();
                return;
            }
            if (_Window_Options_processOk) {
                _Window_Options_processOk.call(this);
            }
        };

        const _Window_Options_cursorRight = Window_Options.prototype.cursorRight;
        Window_Options.prototype.cursorRight = function (wrap) {
            const index = this.index();
            const symbol = this.commandSymbol(index);
            if (symbol === "locale") {
                this.toggleLocale();
                return;
            }
            if (_Window_Options_cursorRight) {
                _Window_Options_cursorRight.call(this, wrap);
            }
        };

        const _Window_Options_cursorLeft = Window_Options.prototype.cursorLeft;
        Window_Options.prototype.cursorLeft = function (wrap) {
            const index = this.index();
            const symbol = this.commandSymbol(index);
            if (symbol === "locale") {
                this.toggleLocale();
                return;
            }
            if (_Window_Options_cursorLeft) {
                _Window_Options_cursorLeft.call(this, wrap);
            }
        };

        Window_Options.prototype.toggleLocale = function () {
            const current = SC4_Localization.locale();
            const next = current === "FR" ? "EN" : "FR";
            SC4_Localization.setLocale(next);
            if (typeof SoundManager !== "undefined" && SoundManager.playCursor) {
                SoundManager.playCursor();
            }
            // Rafraîchit les libellés de commandes immédiatement avec la nouvelle langue
            this.refresh();
        };
    }

    // ========================================================================
    // 6. Hook entités vivantes (Game_Actor, Game_Enemy)
    // ========================================================================
    if (typeof Game_Actor !== "undefined") {
        const _Game_Actor_name = Game_Actor.prototype.name;
        Game_Actor.prototype.name = function () {
            return SC4_Localization.parse(_Game_Actor_name.call(this));
        };

        const _Game_Actor_nickname = Game_Actor.prototype.nickname;
        Game_Actor.prototype.nickname = function () {
            return SC4_Localization.parse(_Game_Actor_nickname.call(this));
        };

        const _Game_Actor_profile = Game_Actor.prototype.profile;
        Game_Actor.prototype.profile = function () {
            return SC4_Localization.parse(_Game_Actor_profile.call(this));
        };
    }

    if (typeof Game_Enemy !== "undefined") {
        const _Game_Enemy_name = Game_Enemy.prototype.name;
        Game_Enemy.prototype.name = function () {
            return SC4_Localization.parse(_Game_Enemy_name.call(this));
        };
    }
})();
