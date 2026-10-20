//=============================================================================
// SC4_Game_Date.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Modèle d'horloge galactique, progression temporelle et ticks ($gameDate).
 * @author SimCraft
 * 
 * @param enableMapTicks
 * @text Écoulement du temps sur la carte
 * @desc Si vrai, le temps avance en continu pendant l'exploration sur Scene_Map.
 * @type boolean
 * @default true
 * 
 * @param defaultSpeedMode
 * @text Vitesse temporelle initiale
 * @desc Mode de vitesse par défaut (0: Arrêt, 1: Normal, 2: x2, 3: x4, 4: x12).
 * @type number
 * @min 0
 * @max 4
 * @default 1
 * 
 * @help
 * ============================================================================
 * SC4_Game_Date.js
 * ============================================================================
 * Gère l'horloge interne, le calendrier galactique et la progression temporelle
 * pour SimCraft 4.
 * 
 * • Fournit l'objet global : $gameDate (instance de Game_Date)
 * • Sauvegarde automatique dans le fichier de sauvegarde (via SC_DataManager).
 * • Supporte les modes de vitesse (0: pause, 1: standard, 4: hyperdrive).
 * ============================================================================
 */

class Game_Date {
    constructor(timestamp = null) {
        this.initMembers(timestamp);
    }

    initMembers(timestamp) {
        const config = window.$dataTimeSystem || {};
        this._timestamp = timestamp !== null ? timestamp : (config.start_timestamp || 55657647);
        this._tick = 0;
        this._scrollSpeedMode = 1;
        this._oldScrollSpeed = 1;
    }

    get timestamp() {
        return this._timestamp;
    }

    set timestamp(value) {
        this._timestamp = Math.max(0, Math.floor(value));
    }

    get config() {
        return window.$dataTimeSystem || {
            minutes_per_hour: 60,
            hours_per_day: 24,
            days_per_month: 30,
            months_per_year: 12,
            tick_per_min: [0, 60, 30, 15, 5],
            months_of_year: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
            days_of_decade: ["Primus", "Secundus", "Tertius", "Quartus", "Quintus", "Sextus", "Septimus", "Octavus", "Nonus", "Decimus"],
            seasons_global: ["Printemps", "Été", "Automne", "Hiver"]
        };
    }

    getScrollSpeedMode() {
        return this._scrollSpeedMode;
    }

    setScrollSpeedMode(val) {
        this._scrollSpeedMode = Math.max(0, Math.min(4, Math.floor(val)));
    }

    isStopped() {
        return this._scrollSpeedMode === 0;
    }

    getTickPerMin() {
        const table = this.config.tick_per_min || [0, 60, 30, 15, 5];
        return table[this._scrollSpeedMode] || 60;
    }

    passTick() {
        if (this._scrollSpeedMode > 0) {
            this._tick++;
            if (this._tick >= this.getTickPerMin()) {
                this.passMin(1);
                this._tick = 0;
            }
        }
    }

    passMin(minutes = 1) {
        this._timestamp += minutes;
        this.onTimeChanged();
    }

    passHour(hours = 1) {
        const mph = this.config.minutes_per_hour || 60;
        this.passMin(hours * mph);
    }

    passDay(days = 1) {
        const hpd = this.config.hours_per_day || 24;
        this.passHour(days * hpd);
    }

    onTimeChanged() {
        // Notification pour StoryManager ou refresh de fenêtres
        if (window.$storyManager && typeof window.$storyManager.update === "function") {
            window.$storyManager.update();
        }
    }

    getMin() {
        const mph = this.config.minutes_per_hour || 60;
        return this._timestamp % mph;
    }

    getHr() {
        const mph = this.config.minutes_per_hour || 60;
        const hpd = this.config.hours_per_day || 24;
        return Math.floor(this._timestamp / mph) % hpd;
    }

    getDay() {
        const minPerDay = (this.config.hours_per_day || 24) * (this.config.minutes_per_hour || 60);
        return Math.floor(this._timestamp / minPerDay);
    }

    getDayMonth() {
        const dpm = this.config.days_per_month || 30;
        return this.getDay() % dpm;
    }

    getMonth() {
        const minPerMonth = (this.config.days_per_month || 30) * (this.config.hours_per_day || 24) * (this.config.minutes_per_hour || 60);
        const mpy = this.config.months_per_year || 12;
        return (Math.floor(this._timestamp / minPerMonth) % mpy) + 1;
    }

    getYear() {
        const minPerYear = (this.config.months_per_year || 12) * (this.config.days_per_month || 30) * (this.config.hours_per_day || 24) * (this.config.minutes_per_hour || 60);
        return Math.floor(this._timestamp / minPerYear);
    }

    getDecadeIndex() {
        return Math.ceil((this.getDayMonth() + 1) / 10);
    }

    getPartOfDayIndex() {
        const mph = this.config.minutes_per_hour || 60;
        const minutes = this._timestamp % ((this.config.hours_per_day || 24) * mph);
        if (minutes >= 360 && minutes < 480) return 1;  // Aube
        if (minutes >= 480 && minutes < 660) return 2;  // Matin
        if (minutes >= 660 && minutes < 780) return 3;  // Midi
        if (minutes >= 780 && minutes < 1020) return 4; // Après-midi
        if (minutes >= 1020 && minutes < 1200) return 5;// Soir
        if (minutes >= 1200 && minutes < 1320) return 6;// Crépuscule
        return 7; // Nuit
    }

    isNightTime() {
        const part = this.getPartOfDayIndex();
        return part === 7 || part === 0 || part === 1;
    }

    getSeasonIndex() {
        return Math.floor((this.getMonth() - 1) / 3);
    }

    makeSavefileData() {
        return {
            timestamp: this._timestamp,
            scrollSpeedMode: this._scrollSpeedMode
        };
    }

    loadSavefileData(data) {
        if (data) {
            this._timestamp = typeof data.timestamp === "number" ? data.timestamp : (this.config.start_timestamp || 55657647);
            this._scrollSpeedMode = typeof data.scrollSpeedMode === "number" ? data.scrollSpeedMode : 1;
        }
    }
}

// ============================================================================
// Hooks RMMZ pour le déroulement continu du temps
// ============================================================================
(() => {
    "use strict";

    const pluginName = "SC4_Game_Date";
    const parameters = typeof PluginManager !== "undefined" ? PluginManager.parameters(pluginName) : {};
    const enableMapTicks = parameters["enableMapTicks"] !== "false";

    // Écoulement du temps sur Scene_Map
    if (typeof Scene_Map !== "undefined") {
        const _Scene_Map_update = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            _Scene_Map_update.call(this);
            if (enableMapTicks && window.$gameDate) {
                window.$gameDate.passTick();
            }
        };
    }
})();

if (typeof window !== "undefined") {
    window.Game_Date = Game_Date;
}
if (typeof global !== "undefined") {
    global.Game_Date = Game_Date;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Game_Date };
}
