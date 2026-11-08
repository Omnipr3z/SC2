//=============================================================================
// SimCraft 4 - Window_FactionStatus
// SC4_Window_FactionStatus.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Volet d'affichage diplomatique des factions ($gameFactions).
 * @author SimCraft
 * @help SC4_Window_FactionStatus.js
 */

class Window_FactionStatus extends Window_Base {
    constructor(rect) {
        super(rect);
        this.refresh();
    }

    refresh() {
        if (this.contents && typeof this.contents.clear === "function") {
            this.contents.clear();
        }

        this.changeTextColor(ColorManager.systemColor ? ColorManager.systemColor() : "#88aaff");
        this.drawText("État Diplomatique Galactique", 12, 8, this.innerWidth - 24, "left");

        if (typeof $gameFactions === "undefined" || !$gameFactions) return;

        const factions = typeof $gameFactions.all === "function" ? $gameFactions.all() : [];
        let y = 40;
        const lineHeight = 28;

        for (const f of factions) {
            if (!f || f.id <= 0) continue;
            if (y + lineHeight > this.innerHeight) break;

            const name = f.name || `Faction #${f.id}`;
            const aff = f.affinity;
            const affColor = aff >= 0 ? "#44ff88" : "#ff4444";

            this.changeTextColor(ColorManager.normalColor ? ColorManager.normalColor() : "#ffffff");
            this.drawText(name, 12, y, 220, "left");

            this.changeTextColor(affColor);
            this.drawText(`Affinité: ${aff > 0 ? "+" : ""}${aff}`, 240, y, 140, "left");

            this.changeTextColor("#ffbb44");
            this.drawText(`Pouvoir: ${f.powerBalance}`, 390, y, 140, "left");

            y += lineHeight;
        }
    }
}

window.Window_FactionStatus = Window_FactionStatus;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Window_FactionStatus;
}
