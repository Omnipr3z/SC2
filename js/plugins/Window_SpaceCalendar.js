//=============================================================================
// RPG Maker MZ - Window_SpaceCalendar
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] En-tête spatial affichant le fil d'Ariane et l'horloge stellaire Neotori.
 * @author SimCraft
 *
 * @help Window_SpaceCalendar.js
 */

class Window_SpaceCalendar extends Window_Base {
    constructor(rect) {
        super(rect);
        this.opacity = 0;
        this._lastTimeText = "";
    }

    resetFontSettings() {
        this.contents.fontFace = $gameSystem ? $gameSystem.mainFontFace() : "sans-serif";
        this.contents.fontSize = 18;
        this.contents.textColor = "#e0e0e0";
        this.contents.outlineColor = "#000000";
        this.contents.outlineWidth = 3;
    }

    refresh(locationTitle = "") {
        this.contents.clear();
        this.resetFontSettings();

        const timeStr = window.$gameDate ? Game_DateFormatter.format40K($gameDate) : "";
        const sector = window.$gameSector ? window.$gameSector.currentSectorData() : null;
        const system = window.$gameSector ? window.$gameSector.currentSystem() : null;

        const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
        const seg = sector ? (sector.segmentum || "ULTIMA-SEGMENTUM") : "GALAXIE";
        const secName = sector ? sector.name : loc("travel.sector_default", "Secteur");
        const sysName = system ? system.name : loc("travel.system_default", "Système");

        const breadcrumb = `${seg} ▷ ${secName} ▹ ${sysName}${locationTitle ? " ▹ " + locationTitle : ""}`;

        // Fil d'Ariane à gauche
        this.contents.textColor = "#8ec07c";
        this.drawText(breadcrumb, 12, 0, this.contentsWidth() - 320, "left");

        // Horloge 40K à droite
        this.contents.textColor = "#fabd2f";
        this.drawText(timeStr, this.contentsWidth() - 300, 0, 280, "right");
    }
}

window.Window_SpaceCalendar = Window_SpaceCalendar;
if (typeof global !== 'undefined') {
    global.Window_SpaceCalendar = Window_SpaceCalendar;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Window_SpaceCalendar };
}
