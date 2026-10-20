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

    // ========================================================================
    // 1. DONNÉES & GETTERS MÉTIER
    // ========================================================================

    get lineHeight() {
        return 20;
    }

    get maxLines() {
        return Math.floor(this.contentsHeight() / this.lineHeight);
    }

    get hasPending() {
        return this._messages.length > 0;
    }

    get blinkPrompt() {
        return (Math.floor(this._blinkTimer / 30) % 2 === 0) ? "▷ " : "▹ ";
    }

    get recentLogs() {
        const maxOutLines = this.hasPending ? Math.max(1, this.maxLines - 1) : this.maxLines;
        return this._out.slice(-maxOutLines);
    }

    loc(key, def) {
        return typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(key, def) : def;
    }

    // ========================================================================
    // 2. RECTANGLES & GÉOMÉTRIE
    // ========================================================================

    entryRect(index) {
        return new Rectangle(8, index * this.lineHeight, this.contentsWidth() - 16, this.lineHeight);
    }

    pendingRect(index) {
        return new Rectangle(8, index * this.lineHeight, this.contentsWidth() - 16, this.lineHeight);
    }

    // ========================================================================
    // 3. STYLES & TYPOGRAPHIE
    // ========================================================================

    styliseLogText(style) {
        this.contents.fontFace = "monospace";
        this.contents.fontSize = 15;
        this.contents.outlineWidth = 2;
        this.contents.outlineColor = "#000000";

        if (style === "alert") {
            this.contents.textColor = "#fe8019";
        } else if (style === "imperium") {
            this.contents.textColor = "#fabd2f";
        } else if (style === "basicInfos") {
            this.contents.textColor = "#b8bb26";
        } else {
            this.contents.textColor = "#8ec07c";
        }
    }

    stylisePendingText() {
        this.contents.fontFace = "monospace";
        this.contents.fontSize = 14;
        this.contents.outlineWidth = 2;
        this.contents.outlineColor = "#000000";
        this.contents.textColor = (Math.floor(this._blinkTimer / 20) % 2 === 0) ? "#fabd2f" : "#d79921";
    }

    // ========================================================================
    // 4. DESSIN PAR BLOC
    // ========================================================================

    drawLogEntry(item, index, isLast, blinkPrompt) {
        const rect = this.entryRect(index);
        this.styliseLogText(item.style);
        const prefix = isLast ? blinkPrompt : "  ";
        this.drawText(prefix + item.text, rect.x, rect.y, rect.width, "left");
    }

    drawPendingBlock(index) {
        const rect = this.pendingRect(index);
        const dotsCount = (Math.floor(this._blinkTimer / 15) % 4);
        const dots = ".".repeat(dotsCount);
        const loadingText = `⏳ ${this.loc("travel.log_computing", "Calcul des données")}${dots}`;
        this.stylisePendingText();
        this.drawText(loadingText, rect.x, rect.y, rect.width, "left");
    }

    // ========================================================================
    // 5. ORCHESTRATION & RAFRAÎCHISSEMENT
    // ========================================================================

    refresh() {
        this.contents.clear();

        const recent = this.recentLogs;
        const blinkPrompt = this.blinkPrompt;
        const hasPending = this.hasPending;

        recent.forEach((item, index) => {
            const isLast = (index === recent.length - 1) && !hasPending;
            this.drawLogEntry(item, index, isLast, blinkPrompt);
        });

        if (hasPending) {
            this.drawPendingBlock(recent.length);
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
