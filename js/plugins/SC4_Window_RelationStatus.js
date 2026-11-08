//=============================================================================
// SimCraft 4 - Window_RelationStatus
// SC4_Window_RelationStatus.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Volet d'affichage des jauges de relation (Affinité, Obéissance, Menace, Seuil Umbral).
 * @author SimCraft
 * @help SC4_Window_RelationStatus.js
 */

class Window_RelationStatus extends Window_Base {
    constructor(rect) {
        super(rect);
        this._relation = null;
        this._actor = null;
    }

    setRelation(relation, actor = null) {
        this._relation = relation;
        this._actor = actor;
        this.refresh();
    }

    get relation() {
        return this._relation;
    }

    get actor() {
        return this._actor;
    }

    // ========================================================================
    // RECTANGLES & DIMENSIONS (AGENTS.md)
    // ========================================================================

    titleRect() {
        return new Rectangle(12, 8, this.innerWidth - 24, 28);
    }

    affinityRect() {
        return new Rectangle(12, 40, this.innerWidth - 24, 24);
    }

    obedienceRect() {
        return new Rectangle(12, 68, this.innerWidth - 24, 24);
    }

    thresholdRect() {
        return new Rectangle(12, 96, this.innerWidth - 24, 24);
    }

    // ========================================================================
    // DESSIN DES SOUS-COMPOSANTS (AGENTS.md)
    // ========================================================================

    drawTitleBlock() {
        const rect = this.titleRect();
        const actorName = this._actor ? (typeof this._actor.name === "function" ? this._actor.name() : this._actor.name) : null;
        const name = actorName || (this._relation ? `Contact #${this._relation.actorId2}` : "Inconnu");
        this.changeTextColor(ColorManager.systemColor ? ColorManager.systemColor() : "#88aaff");
        this.drawText(name, rect.x, rect.y, rect.width, "left");
    }

    drawAffinityBlock() {
        const rect = this.affinityRect();
        const affinity = this._relation ? this._relation.affinity : 0;
        const color = affinity >= 0 ? "#44ff88" : "#ff4444";
        this.changeTextColor(ColorManager.normalColor ? ColorManager.normalColor() : "#ffffff");
        this.drawText("Affinité :", rect.x, rect.y, 120, "left");
        this.changeTextColor(color);
        this.drawText(`${affinity > 0 ? "+" : ""}${affinity} / 100`, rect.x + 130, rect.y, rect.width - 130, "left");
    }

    drawObedienceBlock() {
        const rect = this.obedienceRect();
        const obedience = this._relation ? this._relation.calculateObedience() : 0;
        const threat = this._relation ? this._relation.threat : 0;
        this.changeTextColor(ColorManager.normalColor ? ColorManager.normalColor() : "#ffffff");
        this.drawText("Obéissance :", rect.x, rect.y, 120, "left");
        this.changeTextColor("#ffbb44");
        this.drawText(`${obedience} (Menace: ${threat})`, rect.x + 130, rect.y, rect.width - 130, "left");
    }

    drawThresholdBlock() {
        const rect = this.thresholdRect();
        const threshold = this._relation ? this._relation.reactionThreshold() : "neutrality";
        const labels = {
            total_hostility: "Hostilité Totale ⚔️",
            hostility: "Hostilité ⚠️",
            neutrality: "Neutralité ⚖️",
            respect: "Respect / Écoute 🤝",
            loyalty: "Loyauté Absolue 🛡️"
        };
        const text = labels[threshold] || threshold;
        this.changeTextColor(ColorManager.systemColor ? ColorManager.systemColor() : "#88aaff");
        this.drawText("Statut :", rect.x, rect.y, 120, "left");
        this.changeTextColor(ColorManager.normalColor ? ColorManager.normalColor() : "#ffffff");
        this.drawText(text, rect.x + 130, rect.y, rect.width - 130, "left");
    }

    // ========================================================================
    // CHEF D'ORCHESTRE REFRESH
    // ========================================================================

    refresh() {
        if (this.contents && typeof this.contents.clear === "function") {
            this.contents.clear();
        }
        if (!this._relation) return;

        this.drawTitleBlock();
        this.drawAffinityBlock();
        this.drawObedienceBlock();
        this.drawThresholdBlock();
    }
}

window.Window_RelationStatus = Window_RelationStatus;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Window_RelationStatus;
}
