//=============================================================================
// RPG Maker MZ - SC4_Sprite_PlayerRelationHud.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] HUD social & allégeance du joueur (Sprite_PlayerRelationHud).
 * @author SimCraft 4
 *
 * @help SC4_Sprite_PlayerRelationHud.js
 *
 * Hérite de Sprite_HudBase.
 * Positionné à droite de Sprite_PlayerHUD avec une marge de 16px (x = 258, y = 20),
 * réservant l'espace sous Sprite_PlayerHUD aux futurs FollowerHUDs.
 * Affiche l'allégeance de faction du leader et sa réputation associée
 * (extensible pour charisme et réputation globale).
 */

class Sprite_PlayerRelationHud extends Sprite_HudBase {
    constructor(data) {
        super(data);
    }

    init(data) {
        super.init(data);
        this._hudType = "playerRelation";
        this._hudRect = this.calculateHudRect();
    }

    // ========================================================================
    // DIMENSIONS & POSITIONNEMENT
    // ========================================================================

    calculateHudRect() {
        const playerHudX = 20;
        const playerHudW = 222;
        const gap = 16;
        return new Rectangle(playerHudX + playerHudW + gap, 20, 216, 68);
    }

    get hudRect() {
        return this._hudRect || this.calculateHudRect();
    }

    bannerRect() {
        return new Rectangle(10, 12, 44, 44);
    }

    headerRect() {
        return new Rectangle(62, 18, 144, 14);
    }

    factionNameRect() {
        return new Rectangle(62, 37, 144, 18);
    }

    standingRect() {
        return new Rectangle(62, 56, 144, 16);
    }

    // Hooks d'extension pour Charisme & Réputation globale
    charismaRect() {
        return new Rectangle(62, 56, 70, 16);
    }

    reputationRect() {
        return new Rectangle(136, 56, 70, 16);
    }

    // ========================================================================
    // COUCHES
    // ========================================================================

    create() {
        const rect = this.hudRect;
        this.x = rect.x;
        this.y = rect.y;
        super.create();
    }

    createBgLayer() {
        const rect = this.hudRect;
        this._bgSprite = new Sprite(new Bitmap(rect.width, rect.height));
        this.addChild(this._bgSprite);
    }

    createHudContents() {
        this.createContentsLayer();
    }

    clearHudContents() {
        if (this._bgSprite && this._bgSprite.bitmap) {
            this._bgSprite.bitmap.clear();
        }
        super.clearHudContents();
    }

    // ========================================================================
    // GETTERS & CACHE INDIVIDUALISÉ
    // ========================================================================

    get actor() {
        return (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.leader === "function")
            ? $gameParty.leader()
            : null;
    }

    getPlayerFaction() {
        const actor = this.actor;
        if (!actor || !actor.social) return null;
        const factionId = actor.social.factionId();
        if (!factionId || factionId <= 0) return null;
        if (typeof $gameFactions === "undefined" || !$gameFactions) return null;
        return $gameFactions.faction(factionId);
    }

    isSystemVisible() {
        const manualVisible = Boolean(
            typeof $guiManager !== "undefined" &&
            $guiManager &&
            typeof $guiManager.isPlayerRelationHudVisible === "function" &&
            $guiManager.isPlayerRelationHudVisible()
        );
        const dialogActive = Boolean(
            typeof $relationManager !== "undefined" &&
            $relationManager &&
            typeof $relationManager.isActiveDialog === "function" &&
            $relationManager.isActiveDialog()
        );
        return manualVisible || dialogActive;
    }

    hasValidData() {
        return Boolean(this.actor);
    }

    resolveFactionBannerBitmap(faction) {
        if (typeof ImageManager === "undefined") return null;
        const reqName = (faction && faction.bannerName) ? faction.bannerName : "banner_blank";
        let bitmap = ImageManager.loadBitmap("img/GUI/factions/", reqName);
        if (bitmap && typeof bitmap.isError === "function" && bitmap.isError()) {
            if (!this._warnedAssets.has(reqName)) {
                this._warnedAssets.add(reqName);
                if (typeof DEBUGTOOL !== "undefined" && DEBUGTOOL.warn) {
                    DEBUGTOOL.warn("Sprite_PlayerRelationHud", `Bannière de faction manquante (${reqName}), bascule sur banner_blank.`);
                }
            }
            bitmap = ImageManager.loadBitmap("img/GUI/factions/", "banner_blank");
        }
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
        if (!actor) return {};
        const faction = this.getPlayerFaction();
        const bannerBitmap = this.resolveFactionBannerBitmap(faction);

        return {
            actorId: actor.actorId(),
            factionId: faction ? faction.id : 0,
            factionName: faction ? faction.name : "",
            factionAffinity: faction ? faction.affinity : 0,
            bannerReady: Boolean(this.bitmapImageSource(bannerBitmap))
        };
    }

    // ========================================================================
    // RENDU
    // ========================================================================

    styleBackground() {
        return {
            fillColor: "rgba(18, 26, 38, 0.86)",
            strokeColor: "rgba(130, 155, 180, 0.55)",
            lineWidth: 1.5,
            radius: 6
        };
    }

    drawHud() {
        this.drawBackground();
        const faction = this.getPlayerFaction();
        this.drawFactionBanner(faction);
        this.drawFactionInfo(faction);
        this.drawSocialExtras(faction);
    }

    drawBackground() {
        const ctx = this.bgCtx;
        if (!ctx) return;
        const rect = this.hudRect;
        const style = this.styleBackground();
        const r = style.radius;
        const w = rect.width;
        const h = rect.height;

        ctx.save();
        ctx.fillStyle = style.fillColor;
        ctx.strokeStyle = style.strokeColor;
        ctx.lineWidth = style.lineWidth;

        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(w - r, 0);
        ctx.arcTo(w, 0, w, r, r);
        ctx.lineTo(w, h - r);
        ctx.arcTo(w, h, w - r, h, r);
        ctx.lineTo(r, h);
        ctx.arcTo(0, h, 0, h - r, r);
        ctx.lineTo(0, r);
        ctx.arcTo(0, 0, r, 0, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
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

    drawFactionInfo(faction) {
        const ctx = this.contentCtx;
        if (!ctx) return;

        const hRect = this.headerRect();
        const nRect = this.factionNameRect();
        const sRect = this.standingRect();

        ctx.save();
        // En-tête localisé
        ctx.font = "bold 10px sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.textAlign = "left";
        ctx.fillText(this.loc("hud.playerFaction", "Allégeance").toUpperCase(), hRect.x, hRect.y);

        // Nom de la faction
        const factionName = faction ? faction.name : this.loc("hud.noFaction", "Indépendant");
        ctx.font = "bold 13px sans-serif";
        ctx.fillStyle = "#e2e8f0";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.fillText(factionName, nRect.x, nRect.y, nRect.width);

        // Réputation / Affinité de faction
        if (faction) {
            const aff = faction.affinity || 0;
            const standingLabel = `${this.loc("hud.factionStanding", "Réputation")}: `;
            ctx.font = "normal 11px sans-serif";
            ctx.fillStyle = "#cbd5e1";
            ctx.fillText(standingLabel, sRect.x, sRect.y);

            const labelW = ctx.measureText(standingLabel).width;
            ctx.font = "bold 12px rmmz-numberfont, sans-serif";
            ctx.fillStyle = aff > 0 ? "#4ade80" : (aff < 0 ? "#f87171" : "#e2e8f0");
            ctx.fillText(`${aff > 0 ? "+" : ""}${aff}`, sRect.x + labelW, sRect.y);
        }
        ctx.restore();
    }

    drawSocialExtras(faction) {
        // Extensible plus tard pour Charisme et Réputation globale
    }
}

window.Sprite_PlayerRelationHud = Sprite_PlayerRelationHud;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Sprite_PlayerRelationHud;
}
