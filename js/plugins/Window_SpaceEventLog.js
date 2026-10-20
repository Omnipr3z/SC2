//=============================================================================
// RPG Maker MZ - Window_SpaceEventLog
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Terminal CRT de télémétrie, contacts et alertes spatiales.
 * @author SimCraft
 *
 * @help SC4_Window_SpaceEventLog.js
 */

class Window_SpaceEventLog extends Window_Base {
    constructor(rect) {
        super(rect);
        this._messages = [];
        this._out = [];

        // Restauration de l'historique depuis $gameSystem
        if (typeof $gameSystem !== "undefined" && $gameSystem && typeof $gameSystem.getSpaceTravelLogs === "function") {
            const history = $gameSystem.getSpaceTravelLogs();
            if (Array.isArray(history) && history.length > 0) {
                this._out = history.slice(-20).map(item => ({ style: item.style || "info", text: item.text || item.txt }));
            }
        }

        this._outTimer = 0;
        this._blinkTimer = 0;
        this.loadWindowskin();
        this.refresh();
    }

    loadWindowskin() {
        if (ImageManager.loadSystem) {
            this.windowskin = ImageManager.loadSystem("Prompt") || ImageManager.loadSystem("Window");
        }
    }

    addMessage(style, text) {
        this._messages.push({ style: style || "info", text });
        if (this._messages.length > 50) this._messages.shift();
        if (typeof $gameSystem !== "undefined" && $gameSystem && typeof $gameSystem.addSpaceTravelLog === "function") {
            $gameSystem.addSpaceTravelLog(style, text);
        }
    }

    update() {
        super.update();
        this._blinkTimer++;
        if (this._outTimer <= 0 && this._messages.length > 0) {
            const nextMsg = this._messages.shift();
            this._out.push(nextMsg);
            if (this._out.length > 20) this._out.shift();
            this._outTimer = 180;
            this.refresh();
        } else if (this._outTimer > 0) {
            this._outTimer--;
        }

        if (this._blinkTimer % 30 === 0) {
            this.refresh();
        }
    }

    refresh() {
        this.contents.clear();
        const lineHeight = 20;
        const maxLines = Math.floor(this.contentsHeight() / lineHeight);
        const blinkPrompt = (Math.floor(this._blinkTimer / 30) % 2 === 0) ? "▷ " : "▹ ";

        const hasPending = this._messages.length > 0;
        const maxOutLines = hasPending ? Math.max(1, maxLines - 1) : maxLines;
        const recent = this._out.slice(-maxOutLines);

        recent.forEach((item, index) => {
            const y = index * lineHeight;
            this.contents.fontFace = "monospace";
            this.contents.fontSize = 15;
            this.contents.outlineWidth = 2;
            this.contents.outlineColor = "#000000";

            if (item.style === "alert") {
                this.contents.textColor = "#fe8019";
            } else if (item.style === "imperium") {
                this.contents.textColor = "#fabd2f";
            } else if (item.style === "basicInfos") {
                this.contents.textColor = "#b8bb26";
            } else {
                this.contents.textColor = "#8ec07c";
            }

            const prefix = index === recent.length - 1 && !hasPending ? blinkPrompt : "  ";
            this.drawText(prefix + item.text, 8, y, this.contentsWidth() - 16, "left");
        });

        // Ligne animée si des logs sont en attente de calcul
        if (hasPending) {
            const dotsCount = (Math.floor(this._blinkTimer / 15) % 4);
            const dots = ".".repeat(dotsCount);
            const loadingText = `⏳ Calcul des données${dots}`;
            const loadingY = recent.length * lineHeight;
            this.contents.fontFace = "monospace";
            this.contents.fontSize = 14;
            this.contents.outlineWidth = 2;
            this.contents.outlineColor = "#000000";
            this.contents.textColor = (Math.floor(this._blinkTimer / 20) % 2 === 0) ? "#fabd2f" : "#d79921";
            this.drawText(loadingText, 8, loadingY, this.contentsWidth() - 16, "left");
        }
    }
}

window.Window_SpaceEventLog = Window_SpaceEventLog;
if (typeof global !== 'undefined') {
    global.Window_SpaceEventLog = Window_SpaceEventLog;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Window_SpaceEventLog };
}
