//=============================================================================
// RPG Maker MZ - SC4_Window_SubcomMissedList.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Liste des appels manqués SubCom affichée par-dessus Sprite_SubcomHUD.
 * @author SimCraft
 *
 * @help SC4_Window_SubcomMissedList.js
 * ============================================================================
 * Fenêtre transparente superposée à la zone inférieure de Sprite_SubcomHUD.
 * Regroupe les appels manqués récents par interlocuteur avec date formatée
 * ($gameDate / Game_DateFormatter) et badge de nouveaux appels non consultés.
 * ============================================================================
 */

class Window_SubcomMissedList extends Window_Selectable {
    constructor(rect) {
        super(rect);
        this.opacity = 0;
        this.backOpacity = 0;
        this._cursorVisible = false;
        this._items = [];
        if (typeof this.deactivate === "function") {
            this.deactivate();
        }
        if (typeof this.deselect === "function") {
            this.deselect();
        } else {
            this._index = -1;
        }
        if (typeof this.setCursorRect === "function") {
            this.setCursorRect(0, 0, 0, 0);
        }
        this.refresh();
    }

    isCursorVisible() {
        return false;
    }

    isTouchedInsideFrame() {
        return false;
    }

    hitTest() {
        return -1;
    }

    processTouch() {}

    processHandling() {}

    updateCursor() {
        if (typeof this.setCursorRect === "function") {
            this.setCursorRect(0, 0, 0, 0);
        }
    }

    drawItemBackground() {}

    loc(key, def) {
        return (typeof SC4_Localization !== "undefined" && typeof SC4_Localization.getText === "function")
            ? SC4_Localization.getText(key, def)
            : def;
    }

    maxCols() {
        return 1;
    }

    itemHeight() {
        return 26;
    }

    maxItems() {
        return (this._items && this._items.length > 0) ? this._items.length : 1;
    }

    refreshData() {
        if (typeof $subComManager !== "undefined" && $subComManager && typeof $subComManager.getGroupedMissedCalls === "function") {
            this._items = $subComManager.getGroupedMissedCalls();
        } else {
            this._items = [];
        }
    }

    formatCallerName(entry) {
        if (!entry) return "";
        if (entry.masked) {
            return entry.maskedLabel || this.loc("subcom.masked_signal", "Signal Masqué");
        }
        const actor = (typeof $gameActors !== "undefined" && $gameActors && typeof $gameActors.actor === "function")
            ? $gameActors.actor(entry.actorId)
            : null;
        return actor ? actor.name() : `#${entry.actorId}`;
    }

    formatEntryTimestamp(ts) {
        if (typeof Game_DateFormatter !== "undefined" && typeof Game_DateFormatter.formatShortTimestamp === "function") {
            return Game_DateFormatter.formatShortTimestamp(ts);
        }
        return String(ts || 0);
    }

    resetFontSettings() {
        if (this.contents) {
            this.contents.fontFace = (typeof $gameSystem !== "undefined" && $gameSystem && typeof $gameSystem.mainFontFace === "function")
                ? $gameSystem.mainFontFace()
                : "sans-serif";
            this.contents.fontSize = 14;
            this.contents.textColor = "#cbd5e1";
            this.contents.outlineColor = "#000000";
            this.contents.outlineWidth = 2;
        }
    }

    drawItem(index) {
        const rect = this.itemRectWithPadding ? this.itemRectWithPadding(index) : this.itemRect(index);
        this.resetFontSettings();

        if (!this._items || this._items.length === 0) {
            if (index === 0 && typeof this.drawText === "function") {
                if (typeof this.changePaintOpacity === "function") {
                    this.changePaintOpacity(false);
                }
                if (this.contents) {
                    this.contents.textColor = "#94a3b8";
                }
                this.drawText(this.loc("subcom.no_missed_calls", "(Aucun appel manqué)"), rect.x + 4, rect.y, rect.width - 8, "center");
                if (typeof this.changePaintOpacity === "function") {
                    this.changePaintOpacity(true);
                }
            }
            return;
        }

        const entry = this._items[index];
        if (!entry) return;

        if (typeof this.changePaintOpacity === "function") {
            this.changePaintOpacity(true);
        }

        const callerName = this.formatCallerName(entry);
        const countTag = entry.count > 1 ? ` (${entry.count})` : "";
        const prefix = entry.hasUnseen ? "● " : "";
        const leftText = `${prefix}${callerName}${countTag}`;
        const dateText = this.formatEntryTimestamp(entry.latestTimestamp);

        if (this.contents) {
            this.contents.textColor = entry.hasUnseen ? "#fbbf24" : "#e2e8f0";
        }
        if (typeof this.drawText === "function") {
            const dateColW = 140;
            const leftW = Math.max(80, rect.width - dateColW - 10);
            this.drawText(leftText, rect.x + 4, rect.y, leftW, "left");
            if (this.contents) {
                this.contents.textColor = "#94a3b8";
            }
            this.drawText(dateText, rect.x + rect.width - dateColW - 4, rect.y, dateColW, "right");
        }
    }

    drawAllItems() {
        const total = this.maxItems();
        for (let i = 0; i < total; i++) {
            this.drawItem(i);
        }
    }

    refresh() {
        this.refreshData();
        this._index = -1;
        if (typeof this.setCursorRect === "function") {
            this.setCursorRect(0, 0, 0, 0);
        }
        if (this.contents && typeof this.contents.clear === "function") {
            this.contents.clear();
        }
        this.drawAllItems();
    }
}

if (typeof window !== "undefined") {
    window.Window_SubcomMissedList = Window_SubcomMissedList;
}
if (typeof global !== "undefined") {
    global.Window_SubcomMissedList = Window_SubcomMissedList;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = Window_SubcomMissedList;
}
