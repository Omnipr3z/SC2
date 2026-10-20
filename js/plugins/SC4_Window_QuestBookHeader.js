//=============================================================================
// RPG Maker MZ - SC4_Window_QuestBookHeader
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] En-tête du Datapad stellaire avec fil d'Ariane et horloge Neotori.
 * @author SimCraft
 * 
 * @help SC4_Window_QuestBookHeader.js
 */

class Window_QuestBookHeader extends Window_Base {
    constructor(rect) {
        super(rect);
        this.opacity = 240;
        this.refresh();
    }

    loadWindowskin() {
        if (ImageManager.loadSystem) {
            this.windowskin = ImageManager.loadSystem("Prompt") || ImageManager.loadSystem("Window");
        }
    }

    // ========================================================================
    // 1. DONNÉES & GETTERS MÉTIER
    // ========================================================================

    get headerTitle() {
        return this.loc("quest.header", "DATAPAD IMPÉRIAL ▷ REGISTRE DES MISSIONS & TRANSMISSIONS");
    }

    get timeString() {
        return window.$gameDate ? Game_DateFormatter.format40K($gameDate) : "";
    }

    loc(key, def) {
        return typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(key, def) : def;
    }

    // ========================================================================
    // 2. RECTANGLES & GÉOMÉTRIE
    // ========================================================================

    titleRect() {
        return new Rectangle(12, 0, this.contentsWidth() - 320, typeof this.lineHeight === "function" ? this.lineHeight() : 36);
    }

    clockRect() {
        return new Rectangle(this.contentsWidth() - 300, 0, 280, typeof this.lineHeight === "function" ? this.lineHeight() : 36);
    }

    // ========================================================================
    // 3. STYLES & TYPOGRAPHIE
    // ========================================================================

    resetFontSettings() {
        this.contents.fontFace = $gameSystem ? $gameSystem.mainFontFace() : "sans-serif";
        this.contents.fontSize = 18;
        this.contents.textColor = "#e0e0e0";
        this.contents.outlineColor = "#000000";
        this.contents.outlineWidth = 3;
    }

    styliseTitle() {
        this.contents.textColor = "#8ec07c";
    }

    styliseClock() {
        this.contents.textColor = "#fabd2f";
    }

    // ========================================================================
    // 4. DESSIN PAR BLOC
    // ========================================================================

    drawTitleBlock() {
        const rect = this.titleRect();
        this.styliseTitle();
        this.drawText(this.headerTitle, rect.x, rect.y, rect.width, "left");
    }

    drawClockBlock() {
        const rect = this.clockRect();
        this.styliseClock();
        this.drawText(this.timeString, rect.x, rect.y, rect.width, "right");
    }

    // ========================================================================
    // 5. ORCHESTRATION & RAFRAÎCHISSEMENT
    // ========================================================================

    refresh() {
        this.contents.clear();
        this.resetFontSettings();
        this.drawTitleBlock();
        this.drawClockBlock();
    }
}

window.Window_QuestBookHeader = Window_QuestBookHeader;
if (typeof global !== "undefined") {
    global.Window_QuestBookHeader = Window_QuestBookHeader;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Window_QuestBookHeader };
}
