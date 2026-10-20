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

    resetFontSettings() {
        this.contents.fontFace = $gameSystem ? $gameSystem.mainFontFace() : "sans-serif";
        this.contents.fontSize = 18;
        this.contents.textColor = "#e0e0e0";
        this.contents.outlineColor = "#000000";
        this.contents.outlineWidth = 3;
    }

    refresh() {
        this.contents.clear();
        this.resetFontSettings();

        // Titre Datapad
        this.contents.textColor = "#8ec07c";
        const titleText = typeof SC4_Localization !== "undefined" ? SC4_Localization.getText("quest.header", "DATAPAD IMPÉRIAL ▷ REGISTRE DES MISSIONS & TRANSMISSIONS") : "DATAPAD IMPÉRIAL ▷ REGISTRE DES MISSIONS & TRANSMISSIONS";
        this.drawText(titleText, 12, 0, this.contentsWidth() - 320, "left");

        // Horloge 40K
        const timeStr = window.$gameDate ? Game_DateFormatter.format40K($gameDate) : "";
        this.contents.textColor = "#fabd2f";
        this.drawText(timeStr, this.contentsWidth() - 300, 0, 280, "right");
    }
}

window.Window_QuestBookHeader = Window_QuestBookHeader;
if (typeof global !== "undefined") {
    global.Window_QuestBookHeader = Window_QuestBookHeader;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Window_QuestBookHeader };
}
