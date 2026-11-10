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
                if (!fs.existsSync(fullPath) && fs.existsSync(p.join(process.cwd(), "SC4", filePath))) {
                    fullPath = p.join(process.cwd(), "SC4", filePath);
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
            } catch (e) { }
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

        // 2. Fichiers de localisation d'entités (Secteurs, Planètes, POIs, Quêtes, Factions, Catégories)
        this._locEntities[upper] = {
            sectors: this.readJsonSync(`data/SC/loc/SECTORS_${upper}.json`),
            planets: this.readJsonSync(`data/SC/loc/PLANETS_${upper}.json`),
            pois: this.readJsonSync(`data/SC/loc/POIS_${upper}.json`),
            quests: this.readJsonSync(`data/SC/loc/QUESTS_${upper}.json`),
            factions: this.readJsonSync(`data/SC/loc/FACTIONS_${upper}.json`),
            shipCategories: this.readJsonSync(`data/SC/loc/SHIP_CATEGORIES_${upper}.json`),
            tutos: this.readJsonSync(`data/SC/loc/TUTOS_${upper}.json`)
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

        if (type === "factions") {
            const rawPhys = window.$dataFactions_PHYSICAL || window.$dataFactions || [];
            const locFactions = loc.factions || [];
            const res = [null];
            rawPhys.forEach(f => {
                if (!f || typeof f !== "object") return;
                const fLoc = (Array.isArray(locFactions) ? locFactions.find(l => l && l.id === f.id) : null) || {};
                res[f.id] = {
                    ...f,
                    name: fLoc.name || f.name || `Faction #${f.id}`,
                    description: fLoc.description || f.description || ""
                };
            });
            for (let i = 0; i < res.length; i++) {
                if (res[i] === undefined) res[i] = null;
            }
            return res;
        }

        if (type === "shipCategories") {
            const rawPhys = window.$dataShipCategories_PHYSICAL || window.$dataShipCategories || [];
            const locCats = loc.shipCategories || [];
            const res = [null];
            rawPhys.forEach(c => {
                if (!c || typeof c !== "object") return;
                const cLoc = (Array.isArray(locCats) ? locCats.find(l => l && l.id === c.id) : null) || {};
                res.push({
                    ...c,
                    name: cLoc.name || c.name || c.id,
                    description: cLoc.description || c.description || ""
                });
            });
            return res;
        }

        if (type === "tutos") {
            const rawPhys = window.$dataTutos_PHYSICAL || window.$dataTutos || [];
            const locTutos = loc.tutos || {};
            const res = [null];
            rawPhys.forEach(t => {
                if (!t || typeof t !== "object") return;
                const txt = (locTutos[t.key] !== undefined) ? locTutos[t.key] : (t.txt || "");
                const idKey = `tutoName_${t.id !== undefined ? t.id : t.key}`;
                const name = locTutos[idKey] || (t.key ? locTutos[`tutoName_${t.key}`] : null) || idKey;
                res.push({
                    ...t,
                    name: name,
                    txt: txt
                });
            });
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

        if (window.$dataFactions_PHYSICAL || window.$dataFactions) {
            window.$dataFactions_FR = this.buildLocalizedData("factions", "FR");
            window.$dataFactions_EN = this.buildLocalizedData("factions", "EN");
            window.$dataFactions = targetLocale === "EN" ? window.$dataFactions_EN : window.$dataFactions_FR;
        }

        if (window.$dataShipCategories_PHYSICAL || window.$dataShipCategories) {
            window.$dataShipCategories_FR = this.buildLocalizedData("shipCategories", "FR");
            window.$dataShipCategories_EN = this.buildLocalizedData("shipCategories", "EN");
            window.$dataShipCategories = targetLocale === "EN" ? window.$dataShipCategories_EN : window.$dataShipCategories_FR;
        }

        if (window.$dataTutos_PHYSICAL || window.$dataTutos) {
            window.$dataTutos_FR = this.buildLocalizedData("tutos", "FR");
            window.$dataTutos_EN = this.buildLocalizedData("tutos", "EN");
            window.$dataTutos = targetLocale === "EN" ? window.$dataTutos_EN : window.$dataTutos_FR;
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
        if (!this._dictionaries["FR"] || !this._dictionaries["EN"]) {
            this.loadAll();
        }
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

if (typeof module !== "undefined" && module.exports) {
    module.exports = SC4_Localization;
}
