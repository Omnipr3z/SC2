//=============================================================================
// RPG Maker MZ - SC4_Sprite_WeaponHUD
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] HUD d'arme, jauge de munitions et réserve en temps réel (Sprite_WeaponHUD).
 * @author SimCraft
 * @base SC4_Sprite_HudBase
 * 
 * @help SC4_Sprite_WeaponHUD.js
 * 
 * Classe Sprite_WeaponHUD (hérite de Sprite_HudBase) :
 * - Positionné en bas à droite de l'écran avec fond glassmorphism sombre sur _bgSprite.
 * - Architecture unifiée : _bgSprite + _contentsLayer + _upperLayerSprite (zéro bitmap racine).
 * - Visibilité et cycle de vie pilotés par $guiManager et cache individualisé Sprite_HudBase.
 */

class Sprite_WeaponHUD extends Sprite_HudBase {
    constructor(data) {
        super(data);
    }

    // ============================================================================
    // 1. INITIALISATION & CYCLE DE VIE
    // ============================================================================

    init(data) {
        super.init(data);
        this._hudType = "weapon";
        this._hudRect = this.calculateHudRect();
    }

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

    createUpperLayer() {
        // Hook prêt pour les calques supérieurs ou filtres d'impact
    }

    clearHudContents() {
        if (this._bgSprite && this._bgSprite.bitmap) {
            this._bgSprite.bitmap.clear();
        }
        super.clearHudContents();
    }

    // ============================================================================
    // 2. GETTERS & EXTRACTION DES DONNÉES
    // ============================================================================

    get actor() {
        return typeof $gameParty !== "undefined" && $gameParty ? $gameParty.leader() : null;
    }

    hasValidData() {
        return Boolean(this.actor);
    }

    get weapon() {
        return this.actor && this.actor.combat ? this.actor.combat.gunfightWeapon() : null;
    }

    get stats() {
        if (this.actor && this.actor.combat) {
            return this.actor.combat.gunfightStats();
        }
        return typeof GunfightManager !== "undefined" && GunfightManager.defaultMeleeStats
            ? GunfightManager.defaultMeleeStats()
            : { name: this.loc("hud.unarmed", "Mains nues"), reload: false, ammoCap: 0, iconIndex: 16 };
    }

    get loadedAmmo() {
        return (this.actor && this.actor.combat)
            ? this.actor.combat.getLoadedAmmo(this.weapon)
            : -1;
    }

    get reserveAmmo() {
        return (this.actor && this.actor.combat)
            ? this.actor.combat.getReserveAmmo(this.weapon)
            : 0;
    }

    get isReloading() {
        return Boolean(typeof $gamePlayer !== "undefined" && $gamePlayer && $gamePlayer.isReloading && $gamePlayer.isReloading());
    }

    get isMelee() {
        return !this.stats.reload;
    }

    resolveIconSetBitmap() {
        if (typeof ImageManager === "undefined") return null;
        const bitmap = ImageManager.loadSystem("IconSet");
        this.watchBitmapReady(bitmap);
        return bitmap;
    }

    getCurrentData() {
        const actor = this.actor;
        if (!actor) {
            return {};
        }
        const weapon = this.weapon;
        const stats = this.stats;
        const iconBitmap = this.resolveIconSetBitmap();

        return {
            actorId: actor.actorId(),
            weaponId: weapon ? weapon.id : 0,
            weaponName: stats.name || this.loc("hud.unarmed", "Mains nues"),
            iconIndex: stats.iconIndex || (weapon ? weapon.iconIndex : 16),
            iconReady: Boolean(iconBitmap && typeof iconBitmap.isReady === "function" ? iconBitmap.isReady() : iconBitmap),
            loaded: this.loadedAmmo,
            reserve: this.reserveAmmo,
            ammoCap: stats.ammoCap || 0,
            isReloading: this.isReloading,
            hasReload: Boolean(stats.reload),
            isMelee: !stats.reload
        };
    }

    // ============================================================================
    // 3. MÉTHODES DE POSITIONNEMENT & DIMENSIONS
    // ============================================================================

    calculateHudRect() {
        const w = 240;
        const h = 68;
        const screenW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
        const screenH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;
        return new Rectangle(screenW - w - 20, screenH - h - 20, w, h);
    }

    get hudRect() {
        return this._hudRect || this.calculateHudRect();
    }

    updatePosition() {
        const rect = this.calculateHudRect();
        this._hudRect = rect;
        this.x = rect.x;
        this.y = rect.y;
    }

    backgroundRect() {
        return new Rectangle(0, 0, this.hudRect.width, this.hudRect.height);
    }

    iconRect() {
        const iconSize = 32;
        const y = Math.floor((this.hudRect.height - iconSize) / 2);
        return new Rectangle(12, y, iconSize, iconSize);
    }

    nameRect() {
        return new Rectangle(54, 22, 170, 20);
    }

    ammoRect() {
        return new Rectangle(54, 50, 60, 24);
    }

    statusRect() {
        return new Rectangle(54, 48, 170, 20);
    }

    // Hooks d'extension prêts pour la refonte (Recovery)
    bulletGaugeRect() {
        return new Rectangle(54, 54, 160, 10);
    }

    reservePacksRect() {
        return new Rectangle(160, 48, 68, 16);
    }

    secondaryWeaponRect() {
        return new Rectangle(0, -36, 120, 32);
    }

    tacticalBeltRect() {
        return new Rectangle(124, -36, 116, 32);
    }

    // ============================================================================
    // 4. MÉTHODES DE STYLE
    // ============================================================================

    styleBackground() {
        const isAlert = this.stats.reload && this.loadedAmmo === 0;
        return {
            fillColor: "rgba(15, 20, 32, 0.82)",
            strokeColor: isAlert ? "rgba(239, 68, 68, 0.7)" : "rgba(70, 110, 160, 0.4)",
            lineWidth: 1.5,
            radius: 8
        };
    }

    styleWeaponName(ctx) {
        ctx.font = "bold 13px sans-serif";
        ctx.fillStyle = "#e2e8f0";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 3;
        ctx.textAlign = "left";
    }

    styleAmmo(ctx, loaded, ammoCap) {
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "left";
        if (loaded === 0) {
            ctx.fillStyle = "#ef4444"; // Rouge alerte
        } else if (loaded <= Math.ceil(ammoCap * 0.25)) {
            ctx.fillStyle = "#f59e0b"; // Orange avertissement
        } else {
            ctx.fillStyle = "#4ade80"; // Vert néon
        }
    }

    styleMaxCapacity(ctx) {
        ctx.font = "14px sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.textAlign = "left";
    }

    styleReserve(ctx) {
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "#38bdf8"; // Cyan réserve
        ctx.textAlign = "left";
    }

    styleStatus(ctx) {
        ctx.font = "bold 15px sans-serif";
        ctx.fillStyle = "#fbbf24"; // Ambre
        ctx.textAlign = "left";
    }

    // ============================================================================
    // 5. BLOCS DE RENDU (DRAW)
    // ============================================================================

    drawHud() {
        this.drawBackground();
        this.drawWeaponIcon();
        this.drawWeaponName();
        this.drawHudContents();
    }

    drawBackground() {
        const ctx = this.bgCtx;
        if (!ctx) return;
        const rect = this.backgroundRect();
        const style = this.styleBackground();
        this.drawRoundedPanel(
            ctx,
            rect.x,
            rect.y,
            rect.width,
            rect.height,
            style.radius,
            style.fillColor,
            style.strokeColor,
            style.lineWidth
        );
    }

    drawRoundedPanel(ctx, x, y, w, h, r, fillColor, strokeColor, lineWidth) {
        ctx.save();
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth || 1;

        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    drawWeaponIcon() {
        const iconIndex = this.stats.iconIndex || (this.weapon ? this.weapon.iconIndex : 16);
        const iconBitmap = this.resolveIconSetBitmap();
        if (iconBitmap && iconBitmap.isReady() && this._contentsLayer && this._contentsLayer.bitmap) {
            const rect = this.iconRect();
            const sx = (iconIndex % 16) * 32;
            const sy = Math.floor(iconIndex / 16) * 32;
            this._contentsLayer.bitmap.blt(iconBitmap, sx, sy, 32, 32, rect.x, rect.y);
        }
    }

    drawWeaponName() {
        const ctx = this.contentCtx;
        if (!ctx) return;
        const rect = this.nameRect();
        const name = this.stats.name || this.loc("hud.unarmed", "Mains nues");

        ctx.save();
        this.styleWeaponName(ctx);
        ctx.fillText(name, rect.x, rect.y);
        ctx.restore();
    }

    drawHudContents() {
        if (this.isReloading) {
            this.drawReloadStatus();
        } else if (this.stats.reload) {
            this.drawRangedAmmo();
        } else {
            this.drawMeleeStatus();
        }
    }

    drawReloadStatus() {
        const ctx = this.contentCtx;
        if (!ctx) return;
        const rect = this.statusRect();

        ctx.save();
        this.styleStatus(ctx);
        ctx.fillText(this.loc("hud.reloading", "RECHARGE..."), rect.x, rect.y);
        ctx.restore();
    }

    drawRangedAmmo() {
        const ctx = this.contentCtx;
        if (!ctx) return;
        const rect = this.ammoRect();
        const loaded = this.loadedAmmo;
        const stats = this.stats;
        const reserve = this.reserveAmmo;

        ctx.save();

        // 1. Munitions chargées
        this.styleAmmo(ctx, loaded, stats.ammoCap);
        const loadedStr = String(loaded);
        ctx.fillText(loadedStr, rect.x, rect.y);
        const loadedWidth = ctx.measureText(loadedStr).width;

        // 2. Capacité max
        this.styleMaxCapacity(ctx);
        const capStr = ` / ${stats.ammoCap}`;
        ctx.fillText(capStr, rect.x + loadedWidth, rect.y);
        const capWidth = ctx.measureText(capStr).width;

        // 3. Réserve d'inventaire
        this.styleReserve(ctx);
        const reserveStr = `  [${reserve}]`;
        ctx.fillText(reserveStr, rect.x + loadedWidth + capWidth, rect.y - 1);

        ctx.restore();

        // Hooks graphiques pour l'évolution Recovery
        this.drawBulletGauge(ctx, rect.x, rect.y + 4);
    }

    drawMeleeStatus() {
        const ctx = this.contentCtx;
        if (!ctx) return;
        const rect = this.statusRect();

        ctx.save();
        this.styleMaxCapacity(ctx);
        ctx.fillText("-- / --", rect.x, rect.y);
        ctx.restore();
    }

    // Prêts pour la refonte Recovery (balles / barillets / combustible)
    drawBulletGauge(ctx, x, y) { }
    drawReservePacks(ctx, x, y) { }

    // ============================================================================
    // 6. VISIBILITÉ & CONTRÔLE GUI_MANAGER
    // ============================================================================

    isSystemVisible() {
        return Boolean(typeof window !== "undefined" && window.$guiManager && window.$guiManager.isWeaponHudVisible());
    }

    update() {
        this.updatePosition();
        super.update();
    }
}

window.Sprite_WeaponHUD = Sprite_WeaponHUD;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Sprite_WeaponHUD;
}
