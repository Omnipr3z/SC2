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
 *  - Positionné en haut à droite de l'écran (260x260 conforme à reverseBg_interlocutor.png).
 *  - Cartouche du nom et portrait unifié via Sprite_PaperdollFace.
 *  - Bannière et nom de faction (chargement asynchrone natif RMMZ + fallback banner_blank).
 *  - Statut comportemental, Affinité (jauge 6 cœurs/éclairs), Obéissance, Menace et Agacement (barre graphique).
 */

class Sprite_InterlocutorHUD extends Sprite_ActorHUD {
    constructor(data) {
        super(data);
    }

    init(data) {
        super.init(data);
        const boxW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
        this._dir = "right";
        this._hudRect = new Rectangle(boxW - 280, 20, 260, 260);
        this._hudType = "interlocutor";
    }

    // ========================================================================
    // DIMENSIONS & RECTANGLES
    // ========================================================================

    statLineHeight() {
        return 18;
    }

    bannerRect() {
        const size = 48;
        return new Rectangle(12, 28, size, size);
    }

    statusRect() {
        return new Rectangle(14, 94, 152, 18);
    }

    affinityGaugeRect() {
        return new Rectangle(14, 102, 152, 26);
    }

    obedienceRect() {
        return new Rectangle(14, 148, 152, 18);
    }

    threatRect() {
        return new Rectangle(14, 168, 152, 18);
    }

    agacementLabelRect() {
        return new Rectangle(14, 194, 152, 16);
    }

    agacementGaugeRect() {
        return new Rectangle(14, 202, 152, 10);
    }

    // ========================================================================
    // STYLES
    // ========================================================================

    styleFactionName(ctx) {
        ctx.font = "bold 12px sans-serif";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffffff";
    }

    styleStatLabel(ctx) {
        ctx.font = "normal 12px sans-serif";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.textAlign = "left";
        ctx.fillStyle = "#cbd5e1";
    }

    styleStatValue(ctx, color = "#ffffff") {
        ctx.font = "bold 13px rmmz-numberfont, sans-serif";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.textAlign = "right";
        ctx.fillStyle = color;
    }

    styleThresholdValue(ctx, threshold) {
        ctx.font = "bold 12px sans-serif";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.textAlign = "right";
        switch (threshold) {
            case "total_hostility":
            case "hostility":
                ctx.fillStyle = "#f87171";
                break;
            case "respect":
                ctx.fillStyle = "#38bdf8";
                break;
            case "loyalty":
                ctx.fillStyle = "#fbbf24";
                break;
            default:
                ctx.fillStyle = "#e2e8f0";
                break;
        }
    }

    // ========================================================================
    // GETTERS & CACHE INDIVIDUALISÉ
    // ========================================================================

    get actorId() {
        return (typeof $relationManager !== "undefined" && $relationManager && typeof $relationManager.getInterlocutorId === "function")
            ? ($relationManager.getInterlocutorId() || 0)
            : 0;
    }

    get actor() {
        const id = this.actorId;
        if (!id || typeof $gameActors === "undefined" || !$gameActors) return null;
        return $gameActors.actor(id);
    }

    get relation() {
        const id = this.actorId;
        if (!id || typeof $relationManager === "undefined" || !$relationManager) return null;
        return $relationManager.getRelationWithPlayer(id);
    }

    getActorFaction() {
        const actor = this.actor;
        if (!actor || !actor.social) return null;
        const factionId = actor.social.factionId();
        if (!factionId || factionId <= 0) return null;
        if (typeof $gameFactions === "undefined" || !$gameFactions) return null;
        return $gameFactions.faction(factionId);
    }

    isSystemVisible() {
        return Boolean(typeof $relationManager !== "undefined" && $relationManager && $relationManager.isActiveDialog());
    }

    hasValidData() {
        return Boolean(this.actor && this.relation);
    }

    resolveFactionBannerBitmap(faction) {
        if (!faction || typeof ImageManager === "undefined") return null;
        const reqName = faction.bannerName || "banner_blank";
        let bitmap = ImageManager.loadBitmap("img/GUI/factions/", reqName);
        if (bitmap && typeof bitmap.isError === "function" && bitmap.isError()) {
            if (!this._warnedAssets.has(reqName)) {
                this._warnedAssets.add(reqName);
                if (typeof DEBUGTOOL !== "undefined" && DEBUGTOOL.warn) {
                    DEBUGTOOL.warn("Sprite_InterlocutorHUD", `Bannière de faction manquante (${reqName}), bascule sur banner_blank.`);
                }
            }
            bitmap = ImageManager.loadBitmap("img/GUI/factions/", "banner_blank");
        }
        this.watchBitmapReady(bitmap);
        return bitmap;
    }

    resolveRelationIconBitmap(imgName) {
        if (typeof ImageManager === "undefined") return null;
        const bitmap = ImageManager.loadBitmap("img/GUI/relation/", imgName);
        this.watchBitmapReady(bitmap);
        return bitmap;
    }

    bitmapImageSource(bitmap) {
        if (!bitmap) return null;
        if (typeof bitmap.isReady === "function" && !bitmap.isReady()) return null;
        if (typeof bitmap.isError === "function" && bitmap.isError()) return null;
        return bitmap.canvas || bitmap._canvas || bitmap._image || null;
    }

    getCurrentData() {
        const actor = this.actor;
        const relation = this.relation;
        if (!actor || !relation) return {};

        const equips = actor.equips();
        const faction = this.getActorFaction();
        const bannerBitmap = this.resolveFactionBannerBitmap(faction);
        const type = relation.affinity < 0 ? "thunder" : "heart";
        const iconFull = this.resolveRelationIconBitmap(`affinity_${type}`);
        const iconBlank = this.resolveRelationIconBitmap(`affinity_${type}_blank`);
        const currentTs = (typeof $gameDate !== "undefined" && $gameDate) ? $gameDate.timestamp : 0;

        return {
            actorId: actor.actorId(),
            name: actor.name(),
            equipsKey: equips.map(e => e ? e.id : 0).join("-"),

            factionId: faction ? faction.id : 0,
            factionBanner: faction ? faction.bannerName : "none",
            bannerReady: Boolean(this.bitmapImageSource(bannerBitmap)),

            affinity: relation.affinity,
            obedience: relation.calculateObedience(),
            threat: relation.threat,
            agacement: relation.getAgacement(currentTs),
            threshold: relation.reactionThreshold(),

            iconFullReady: Boolean(this.bitmapImageSource(iconFull)),
            iconBlankReady: Boolean(this.bitmapImageSource(iconBlank))
        };
    }

    // ========================================================================
    // RENDU
    // ========================================================================

    drawHudContents() {
        super.drawHudContents();
        this.drawRelation();
    }

    drawRelation() {
        this.drawFaction();
        const data = this.getRelationData();
        this.drawRelationStats(data);
    }

    drawFaction() {
        const faction = this.getActorFaction();
        if (!faction) return;
        this.drawFactionBanner(faction);
        this.drawFactionData(faction);
    }

    drawFactionBanner(faction) {
        const ctx = this.contentCtx;
        if (!ctx) return;
        const bitmap = this.resolveFactionBannerBitmap(faction);
        const img = this.bitmapImageSource(bitmap);
        if (!img || !img.width || !img.height) return;

        const rect = this.bannerRect();
        ctx.drawImage(img, 0, 0, img.width, img.height, rect.x, rect.y, rect.width, rect.height);
    }

    drawFactionData(faction) {
        const ctx = this.contentCtx;
        if (!ctx) return;
        const rect = this.bannerRect();
        const startX = rect.x + rect.width + 10;
        const maxW = Math.max(40, 174 - startX);
        const lineH = 16;
        const startY = rect.y + lineH;

        ctx.save();
        this.styleFactionName(ctx);
        const words = String(faction.name || "").split(" ");
        const lines = [];
        let current = "";
        for (const word of words) {
            const candidate = current ? `${current} ${word}` : word;
            if (current && ctx.measureText(candidate).width > maxW) {
                lines.push(current);
                current = word;
            } else {
                current = candidate;
            }
        }
        if (current) lines.push(current);

        for (let i = 0; i < Math.min(3, lines.length); i++) {
            ctx.fillText(lines[i], startX, startY + i * lineH);
        }
        ctx.restore();
    }

    drawRelationStats(data) {
        const ctx = this.contentCtx;
        if (!ctx) return;

        // 1. Statut comportemental
        const sRect = this.statusRect();
        ctx.save();
        this.styleStatLabel(ctx);
        ctx.fillText(`${data.terms.threshold}:`, sRect.x, sRect.y);
        this.styleThresholdValue(ctx, data.values.threshold);
        ctx.fillText(data.terms.thresholdValue, sRect.x + sRect.width, sRect.y);
        ctx.restore();

        // 2. Jauge graphique d'affinité (cœurs / éclairs)
        this.drawAffinityGauge(data.values.stat, this.affinityGaugeRect());

        // 3. Obéissance (Domination) & Menace
        this.drawObedienceRow(data);
        this.drawThreatRow(data);

        // 4. Agacement (jauge graphique uniquement, sans chiffres)
        this.drawAgacementGauge(data.values.agacement, data.terms.agacement);
    }

    drawAffinityGauge(value, rect) {
        const ctx = this.contentCtx;
        if (!ctx) return;
        const numIcons = 6;
        const valueRate = Math.min(1, Math.abs(value) / 100);
        const type = value < 0 ? "thunder" : "heart";
        const padX = 2;
        const iconSize = Math.floor((rect.width - padX * (numIcons + 1)) / numIcons);

        const blankBitmap = this.resolveRelationIconBitmap(`affinity_${type}_blank`);
        const fullBitmap = this.resolveRelationIconBitmap(`affinity_${type}`);
        const blankImg = this.bitmapImageSource(blankBitmap);
        const fullImg = this.bitmapImageSource(fullBitmap);
        if (!blankImg || !fullImg) return;

        const numExact = valueRate * numIcons;
        const numComplete = Math.floor(numExact);
        const restPartRate = numExact - numComplete;

        for (let i = 0; i < numIcons; i++) {
            const x = rect.x + padX + i * (iconSize + padX);
            if (i < numComplete) {
                ctx.drawImage(fullImg, 0, 0, fullImg.width, fullImg.height, x, rect.y, iconSize, iconSize);
            } else {
                ctx.drawImage(blankImg, 0, 0, blankImg.width, blankImg.height, x, rect.y, iconSize, iconSize);
                if (i === numComplete && restPartRate > 0) {
                    ctx.drawImage(
                        fullImg,
                        0, 0, fullImg.width * restPartRate, fullImg.height,
                        x, rect.y, iconSize * restPartRate, iconSize
                    );
                }
            }
        }
    }

    drawObedienceRow(data) {
        const ctx = this.contentCtx;
        if (!ctx) return;
        const rect = this.obedienceRect();
        const val = data.values.statSub;
        const color = val > 0 ? "#4ade80" : (val < 0 ? "#f87171" : "#e2e8f0");

        ctx.save();
        this.styleStatLabel(ctx);
        ctx.fillText(`${data.terms.obedience}:`, rect.x, rect.y);
        this.styleStatValue(ctx, color);
        ctx.fillText(`${val > 0 ? "+" : ""}${val}`, rect.x + rect.width, rect.y);
        ctx.restore();
    }

    drawThreatRow(data) {
        const ctx = this.contentCtx;
        if (!ctx) return;
        const rect = this.threatRect();
        const threat = data.values.statSubBuff;
        const color = threat >= 20 ? "#f97316" : (threat > 0 ? "#fbbf24" : "#94a3b8");

        ctx.save();
        this.styleStatLabel(ctx);
        ctx.fillText(`${data.terms.threat}:`, rect.x, rect.y);
        this.styleStatValue(ctx, color);
        ctx.fillText(`${threat}`, rect.x + rect.width, rect.y);
        ctx.restore();
    }

    drawAgacementGauge(agacementValue, label) {
        const ctx = this.contentCtx;
        if (!ctx) return;

        const labelRect = this.agacementLabelRect();
        const gaugeRect = this.agacementGaugeRect();
        const val = Math.max(0, Math.min(100, Number(agacementValue) || 0));
        const rate = val / 100;

        ctx.save();
        // Libellé seul (sans aucun chiffre)
        ctx.font = "normal 11px sans-serif";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.textAlign = "left";
        ctx.fillStyle = val >= 80 ? "#f87171" : "#cbd5e1";
        ctx.fillText(label, labelRect.x, labelRect.y);

        // Fond de jauge
        ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
        ctx.fillRect(gaugeRect.x, gaugeRect.y, gaugeRect.width, gaugeRect.height);

        // Barre remplie (progression de calme -> agacé)
        if (rate > 0) {
            let fillColor = "#38bdf8";
            if (val >= 80) fillColor = "#ef4444";
            else if (val >= 40) fillColor = "#f59e0b";

            ctx.fillStyle = fillColor;
            ctx.fillRect(gaugeRect.x + 1, gaugeRect.y + 1, Math.max(2, (gaugeRect.width - 2) * rate), gaugeRect.height - 2);
        }

        // Liseré discret
        ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
        ctx.lineWidth = 1;
        ctx.strokeRect(gaugeRect.x, gaugeRect.y, gaugeRect.width, gaugeRect.height);
        ctx.restore();
    }

    getRelationData() {
        const relation = this.relation;
        const currentTs = (typeof $gameDate !== "undefined" && $gameDate) ? $gameDate.timestamp : 0;
        const threshold = relation ? (relation.reactionThreshold() || "neutrality") : "neutrality";

        const thresholdFallbacks = {
            total_hostility: "Hostilité Totale",
            hostility: "Hostilité",
            neutrality: "Neutralité",
            respect: "Respect",
            loyalty: "Loyauté"
        };

        const terms = {
            statName: this.loc("hud.affinity", "Affinité"),
            statBonus: this.loc("hud.sympathy", "Sympathie"),
            statMalus: this.loc("hud.antipathy", "Antipathie"),
            statSub: this.loc("hud.authority", "Autorité"),
            obedience: this.loc("hud.obedience", "Obéissance"),
            statSubBonus: this.loc("hud.submission", "Soumission"),
            statSubMalus: this.loc("hud.insubordination", "Insubordination"),
            threat: this.loc("hud.threat", "Menace"),
            agacement: this.loc("hud.agacement", "Agacement"),
            threshold: this.loc("hud.status", "Statut"),
            thresholdValue: this.loc(`relation.threshold_${threshold}`, thresholdFallbacks[threshold] || threshold)
        };

        const values = {
            stat: relation ? (relation.affinity || 0) : 0,
            statMax: 100,
            statSub: relation ? (relation.calculateObedience() || 0) : 0,
            statSubMax: 100,
            statSubBuff: relation ? (relation.threat || 0) : 0,
            agacement: relation ? relation.getAgacement(currentTs) : 0,
            threshold: threshold
        };

        return { terms, values };
    }
}

window.Sprite_InterlocutorHUD = Sprite_InterlocutorHUD;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Sprite_InterlocutorHUD;
}
