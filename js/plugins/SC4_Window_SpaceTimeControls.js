//=============================================================================
// SimCraft 4 - Window_SpaceTimeControls
// SC4_Window_SpaceTimeControls.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Fenêtre de contrôle du flux temporel stellaire (Pause, 1x, 5x, 20x).
 * @author SimCraft
 * @help SC4_Window_SpaceTimeControls.js
 */

const _BaseWindowTimeCtrl = (typeof Window_HorzCommand !== "undefined")
    ? Window_HorzCommand
    : ((typeof Window_Command !== "undefined") ? Window_Command : (typeof Window_Base !== "undefined" ? Window_Base : Object));

class Window_SpaceTimeControls extends _BaseWindowTimeCtrl {
    constructor(rect) {
        if (!rect && typeof Rectangle !== "undefined" && typeof Graphics !== "undefined") {
            const w = 320;
            const h = 48;
            const x = Graphics.width - w - 12;
            const y = 0;
            rect = new Rectangle(x, y, w, h);
        }
        super(rect);
        this.opacity = 200;
        this.refresh();
    }

    maxCols() {
        return 4;
    }

    itemHeight() {
        return 32;
    }

    lineHeight() {
        return 32;
    }

    get currentDate() {
        return (typeof $gameDate !== "undefined" && $gameDate)
            ? $gameDate
            : (typeof window !== "undefined" ? window.$gameDate : null);
    }

    currentSpeedMode() {
        return this.currentDate ? this.currentDate.getScrollSpeedMode() : 1;
    }

    makeCommandList() {
        const curMode = this.currentSpeedMode();
        this.addCommand(curMode === 0 ? "⏸️ [0]" : "⏸️", "pause", true);
        this.addCommand(curMode === 1 ? "▶️ [1x]" : "▶️ 1x", "play", true);
        this.addCommand(curMode === 2 ? "⏩ [5x]" : "⏩ 5x", "fast", true);
        this.addCommand(curMode === 3 ? "⚡ [20x]" : "⚡ 20x", "hyper", true);
    }

    drawItem(index) {
        const rect = this.itemRect(index);
        const cmd = this._list && this._list[index];
        if (!cmd) return;

        this.resetFontSettings();
        if (typeof this.contents !== "undefined") {
            this.contents.fontSize = 14;
        }

        const modeMap = { pause: 0, play: 1, fast: 2, hyper: 3 };
        const isCurrent = this.currentSpeedMode() === modeMap[cmd.symbol];

        if (isCurrent && this.contents) {
            this.contents.textColor = "#61afef"; // Cyan néon SC4
        } else if (this.contents) {
            this.contents.textColor = "#abb2bf";
        }

        if (typeof this.drawText === "function") {
            this.drawText(cmd.name, rect.x, rect.y, rect.width, "center");
        }
    }
}

if (typeof window !== "undefined") {
    window.Window_SpaceTimeControls = Window_SpaceTimeControls;
    window.SC4_Window_SpaceTimeControls = Window_SpaceTimeControls;
}
if (typeof global !== "undefined") {
    global.Window_SpaceTimeControls = Window_SpaceTimeControls;
    global.SC4_Window_SpaceTimeControls = Window_SpaceTimeControls;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Window_SpaceTimeControls };
}
