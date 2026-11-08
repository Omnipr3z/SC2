//=============================================================================
// RPG Maker MZ - SC4_Sprite_InterlocutorHUD.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] HUD de l'interlocuteur / PNJ en dialogue (Sprite_InterlocutorHUD).
 * @author SimCraft 4
 *
 * @help SC4_Sprite_InterlocutorHUD.js
 *
 * Hérite de Sprite_ActorHUD. Affiche les détails du PNJ avec lequel le joueur interagit :
 *  - Positionné en haut à droite de l'écran.
 *  - Cartouche du nom, bannière et réputation de faction.
 *  - Jauges relationnelles (Affinité, Obéissance, Menace, Seuil Umbral).
 *  - Portrait dynamique du PNJ lors des dialogues de bulles ou sous-scènes sociales.
 */

class Sprite_InterlocutorHUD extends Sprite_ActorHUD {
    constructor(data) {
        super(data);
    }
    init(data) {
        super.init(data);
        this._dir = "right";
        this._hudRect = new Rectangle(Graphics.boxWidth - 280, 20, 260, 260);
        this._hudType = "interlocutor";
        this._faceLoaded = false;
        this._isSpeaking = false;
    }
    statLineHeight() {
        return 18;
    }
    bannerRect() {
        const size = 48;
        return new Rectangle(12, 28, size, size);
    }
    relationBlocRect(x, startY, line, w) {
        const lineH = this.statLineHeight();

        return new Rectangle(x, startY + line * lineH, w, lineH * 2)
    }
    styleFactionName(ctx) {
        ctx.font = "bold 14px sans-serif";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.textAlign = "left";
        ctx.fillStyle = "#fff";
    }
    styleRelThresholdTerm(ctx) {
        ctx.font = "normal 12px sans-serif";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.textAlign = "left";
        ctx.fillStyle = "#fff";
    }
    styleRelThresholdValue(ctx) {
        ctx.font = "normal 14px rmmz-numberfont, sans-serif";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";

    }
    //GETTERS
    get actorId() { return $relationManager.getInterlocutorId(); }
    get actor() { return $gameActors.actor(this.actorId); }
    get relation() { return $relationManager.getRelationWithPlayer(this.actorId) }
    isSystemVisible() { return $relationManager.isActiveDialog(); }
    updateHudCache() {

        const actor = this.actor;
        const current = this.getCurrentData();
        const equips = actor.equips();

        this._cache = {
            actorId: this.actorId,
            name: actor.name(),

            // RELATION STATS

            //Equips
            equipsKey: equips.map(e => e ? e.id : 0).join("-")
        };
    }
    getCurrentData() {
        const actor = this.actor;
        const equips = actor.equips();

        return {
            actorId: actor.actorId(),
            name: actor.name(),

            // RELATIONS STATS


            //Equips
            equipsKey: equips.map(e => e ? e.id : 0).join("-")
        };
    }

    drawHudContents() {
        super.drawHudContents();
        this.drawRelation();
    }
    drawRelation() {
        this.drawFaction();
        // Relation Data
        const data = this.getRelationData();
        this.drawRelationStats(data)

    }
    drawFaction() {
        this.drawFactionBanner();
        this.drawFactionData();
    }
    drawFactionBanner() {
        const faction = this.actor.faction();
        if (!faction) return;
        const rect = this.bannerRect();

        const bitmap = ImageManager.loadBitmap("img/GUI/factions/", faction.bannerName);
        const img = bitmap._image;

        console.log(img.width, img.height, rect.x, rect.y, rect.w, rect.h);
        const ctx = this.contentCtx;

        ctx.drawImage(img, 0, 0, img.width, img.height, rect.x, rect.y, rect.width, rect.height);
    }
    drawFactionData() {
        const faction = this.actor.faction();
        if (!faction) return;
        const ctx = this.contentCtx;

        let yLine = 0;
        const lineH = this.statLineHeight();
        const rect = this.bannerRect();
        let startY = rect.y + lineH;
        let startX = rect.x + rect.width + 18;

        //NAME
        const factionNameArr = faction.name.split(" ");

        this.styleFactionName(ctx);
        factionNameArr.forEach((fname, i) => {
            this.contentCtx.fillText(fname, startX, startY + i * lineH);
            yLine = i;
        }, this);
    }
    drawRelationStats(data) {
        const ctx = this.contentCtx;
        const bannerRect = this.bannerRect();
        const lineH = this.statLineHeight();
        const startY = bannerRect.y + bannerRect.height + lineH;
        const startX = bannerRect.x + 6;
        const innerW = 180 - 48;
        const rect = this.relationBlocRect(startX, startY, 0, innerW);

        this.styleRelThresholdTerm(ctx);
        let txt = `${data.terms.threshold}:`;
        ctx.fillText(txt, rect.x, rect.y);

        this.styleRelThresholdValue(ctx);
        ctx.fillText(data.values.threshold, rect.x + rect.width, rect.y);

        rect.y += 8;
        this.drawAffinityGauge(data.values.stat, rect);
    }
    drawAffinityGauge(value, rect) {
        const ctx = this.contentCtx;
        const numIcons = 6;
        let valueRate = 0;
        let type = "heart";
        const padX = 2;
        const iconSize = (rect.width - padX * 2) / numIcons;


        if (value >= 0) {
            valueRate = value / 100;
        } else if (value < 0) {
            valueRate = Math.abs(value) / 100;
            type = "thunder";
        }

        const numExact = valueRate * numIcons;
        const numComplete = Math.floor(numExact);
        const restPartRate = numExact - numComplete;

        for (let i = 0; i < numIcons; i++) {
            const x = rect.x + (i * (padX + iconSize)) + padX;
            let imgName = `affinity_${type}_blank`;

            if (i < numComplete) {
                imgName = `affinity_${type}`;
            }
            const bitmap = ImageManager.loadBitmap("img/GUI/relation/", imgName);
            const img = bitmap._image;

            ctx.drawImage(img, 0, 0, img.width, img.height, x, rect.y, iconSize, iconSize);
            if (i == numComplete && restPartRate > 0) {
                const bitmap = ImageManager.loadBitmap("img/GUI/relation/", `affinity_${type}`);
                const img = bitmap._image;
                ctx.drawImage(img, 0, 0, img.width * restPartRate, img.height, x, rect.y, iconSize * restPartRate, iconSize);

            }


        }
    }
    getRelationData() {
        const relation = this.relation;

        const terms = {
            statName: "Affinity",
            statBonus: "Sympathy",
            statMalus: "Antipathy",
            statSub: "Autority",
            statSubBonus: "Submission",
            statSubMalus: "Insubordination",
            statSubBuff: "Menace",
            threshold: "Status"
        };
        const values = {
            stat: relation.affinity || 0,
            statMax: 100,
            statSub: relation.calculateObedience() || 0,
            statSubMax: 100,
            statSubBuff: relation.threat || 0,
            threshold: relation.reactionThreshold() || "neutrality"
        }

        return { terms: terms, values: values };
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
}

window.Sprite_InterlocutorHUD = Sprite_InterlocutorHUD;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Sprite_InterlocutorHUD;
}