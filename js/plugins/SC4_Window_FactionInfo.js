//=============================================================================
// SimCraft 4 - Window_FactionInfo
// SC4_Window_FactionInfo.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Volet d'affichage des détails et emblème d'une faction (Window_FactionInfo).
 * @author SimCraft
 * @help SC4_Window_FactionInfo.js
 */

class Window_FactionInfo extends Window_Base {
    constructor(rect) {
        super(rect);
        this._factionId = 0;
        this._titlePrefix = "";
    }

    setFaction(factionId, titlePrefix = "") {
        this._factionId = Number(factionId) || 0;
        this._titlePrefix = titlePrefix;
        this.refresh();
    }

    get factionData() {
        if (!this._factionId) return null;
        const df = (typeof $dataFactions !== "undefined" && $dataFactions)
            ? $dataFactions[this._factionId]
            : null;
        return df || null;
    }

    get gameFaction() {
        if (!this._factionId) return null;
        return (typeof $gameFactions !== "undefined" && $gameFactions && typeof $gameFactions.faction === "function")
            ? $gameFactions.faction(this._factionId)
            : null;
    }

    // ========================================================================
    // RECTANGLES (AGENTS.md)
    // ========================================================================

    headerRect() {
        return new Rectangle(8, 4, this.innerWidth - 16, 26);
    }

    affinityRect() {
        return new Rectangle(8, 32, this.innerWidth - 16, 22);
    }

    descRect() {
        return new Rectangle(8, 56, this.innerWidth - 16, this.innerHeight - 60);
    }

    // ========================================================================
    // DESSIN DES BLOCS (AGENTS.md)
    // ========================================================================

    drawHeaderBlock() {
        const rect = this.headerRect();
        const data = this.factionData;
        const gf = this.gameFaction;
        const name = gf ? gf.name : (data ? data.name : "Indépendant / Neutre");
        const color = (data && data.color) ? data.color : "#aaaacc";

        this.changeTextColor(color);
        const prefix = this._titlePrefix ? `${this._titlePrefix} : ` : "";
        this.drawText(`${prefix}${name}`, rect.x, rect.y, rect.width, "left");
    }

    drawAffinityBlock() {
        const rect = this.affinityRect();
        if (!this._factionId) {
            this.changeTextColor("#888888");
            this.drawText("Aucune allégeance", rect.x, rect.y, rect.width, "left");
            return;
        }

        const gf = this.gameFaction;
        const aff = gf ? gf.affinity : 0;
        const color = aff >= 0 ? "#44ff88" : "#ff4444";

        this.changeTextColor(ColorManager.normalColor ? ColorManager.normalColor() : "#ffffff");
        this.drawText("Affinité Faction :", rect.x, rect.y, 140, "left");
        this.changeTextColor(color);
        this.drawText(`${aff > 0 ? "+" : ""}${aff}`, rect.x + 145, rect.y, rect.width - 145, "left");
    }

    drawDescBlock() {
        const rect = this.descRect();
        const gf = this.gameFaction;
        const data = this.factionData;
        const desc = gf ? gf.description : (data ? (data.description || "") : "");
        if (!desc) return;

        this.changeTextColor(ColorManager.systemColor ? ColorManager.systemColor() : "#aaaaaa");
        this.drawText(desc, rect.x, rect.y, rect.width, "left");
    }

    // ========================================================================
    // CHEF D'ORCHESTRE REFRESH
    // ========================================================================

    refresh() {
        if (this.contents && typeof this.contents.clear === "function") {
            this.contents.clear();
        }
        this.drawHeaderBlock();
        this.drawAffinityBlock();
        this.drawDescBlock();
    }
}

window.Window_FactionInfo = Window_FactionInfo;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Window_FactionInfo;
}
