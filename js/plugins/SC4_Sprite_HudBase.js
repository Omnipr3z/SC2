//=============================================================================
// RPG Maker MZ - SC4_Sprite_HudBase.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Classe de base abstraite pour le rendu graphique des HUDs (Sprite_HudBase).
 * @author SimCraft 4
 *
 * @help SC4_Sprite_HudBase.js
 *
 * Classe parente pour tous les éléments d'interface tête haute (HUD).
 * Fournit les primitives graphiques universelles :
 *  - Interpolation fluide des jauges (approach).
 *  - Dessin des jauges (HP, MP, jauges personnalisées avec étiquettes localisées).
 *  - Gestion unifiée du cache individualisé par sous-classe (getCurrentData / updateHudCache).
 *  - Surveillance asynchrone du chargement des bitmaps RMMZ (watchBitmapReady).
 */

class Sprite_HudBase extends Sprite {

    constructor(data) {
        super();
        this._listenedBitmaps = typeof WeakSet !== "undefined" ? new WeakSet() : null;
        this._warnedAssets = new Set();
        this.init(data);
        this.create();
    }

    // ========================================================================
    // UTILS
    // ========================================================================

    approach(origin, target, step) {
        if (typeof origin !== "number" || Number.isNaN(origin)) {
            return target;
        }
        const s = Math.max(1, Number(step) || 1);
        const dir = target - origin;
        if (dir > 0) {
            return Math.min(target, origin + s);
        } else {
            return Math.max(target, origin - s);
        }
    }

    loc(key, fallback = "") {
        if (typeof SC4_Localization !== "undefined" && typeof SC4_Localization.getText === "function") {
            return SC4_Localization.getText(key, fallback);
        }
        return fallback;
    }

    forceDirty() {
        this._dirty = true;
        this._cache = {};
    }

    watchBitmapReady(bitmap) {
        if (!bitmap || (typeof bitmap.isReady === "function" && bitmap.isReady())) {
            return;
        }
        if (this._listenedBitmaps && this._listenedBitmaps.has(bitmap)) {
            return;
        }
        if (this._listenedBitmaps) {
            this._listenedBitmaps.add(bitmap);
        }
        if (typeof bitmap.addLoadListener === "function") {
            bitmap.addLoadListener(() => {
                this.forceDirty();
            });
        }
    }

    drawGaugeText(ctx, txt, gaugeRect, style, key) {
        ctx.save();
        if (key) {
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = key.align;
            ctx.fillStyle = "#fff";
            let x = gaugeRect.x + 2;
            if (key.align === "right") x += gaugeRect.width - 4;
            const label = this.loc(`terms.${key.txt}`, key.txt);
            ctx.fillText(label, x, gaugeRect.y - 2);
        }

        ctx.font = style.font;
        const rect = this.gaugeTxtRect(ctx, gaugeRect, style.align);
        ctx.fillStyle = style.color;
        ctx.fillText(txt, rect.x, rect.y);
        ctx.restore();
    }

    drawHudGauge(ctx, x, y, width, height, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width, height);
    }

    drawDynamicGauge(start, target, max, rect, style, txtSettings, key) {
        const ctx = this.contentCtx;
        if (!ctx) return;
        const safeMax = Math.max(1, Number(max) || 1);
        const actual = Math.min(Number(start) || 0, safeMax);
        const targetVal = Math.min(Number(target) || 0, safeMax);
        const targetRate = Math.max(0, targetVal / safeMax);
        const targetW = rect.width * targetRate;
        const actualRate = Math.max(0, actual / safeMax);
        const actualW = rect.width * actualRate;

        // bg
        this.drawHudGauge(ctx, rect.x, rect.y, rect.width, rect.height, style.bgColor);
        if (targetVal > actual) {
            // grow gauge
            this.drawHudGauge(ctx, rect.x, rect.y, targetW, rect.height, style.growColor);
        }
        // Actual
        this.drawHudGauge(ctx, rect.x, rect.y, actualW, rect.height, style.fillColor);
        if (targetVal < actual) {
            // malus gauge
            const malusW = actualW - targetW;
            const malusX = rect.x + actualW - malusW;
            this.drawHudGauge(ctx, malusX, rect.y, malusW, rect.height, style.malusColor);
        }
        // text
        if (txtSettings && txtSettings.value) {
            let txt = "";
            if (txtSettings.name) txt += `${txtSettings.name}: `;
            txt += actual;
            if (txtSettings.max) txt += ` / ${safeMax}`;
            this.drawGaugeText(ctx, txt, rect, style.txt, key);
        }
    }

    // ========================================================================
    // GETTERS
    // ========================================================================

    get refreshLapse() { return 2; }

    gaugeRefreshStep(type) {
        if (!this.actor) return 1;
        switch (type) {
            case "hp": return Math.max(1, Math.floor((this.actor.mhp || 0) / 60));
            case "mp": return Math.max(1, Math.floor((this.actor.mmp || 0) / 60));
            case "tp": return 1;
            case "exp": {
                const req = typeof this.actor.nextRequiredExp === "function" ? this.actor.nextRequiredExp() : 100;
                return Math.max(1, Math.floor(req / 100));
            }
            default: return 1;
        }
    }

    get hudRect() {
        return this._hudRect || new Rectangle(0, 0, 222, 97);
    }

    get bgCtx() { return (this._bgSprite && this._bgSprite.bitmap) ? this._bgSprite.bitmap.context : null; }
    get contentCtx() { return (this._contentsLayer && this._contentsLayer.bitmap) ? this._contentsLayer.bitmap.context : null; }

    gaugeTxtRect(ctx, gaugeRect, align) {
        ctx.textAlign = align;
        const txtPad = 2;
        let x = gaugeRect.x + txtPad;
        if (align === "center") x += (gaugeRect.width / 2) - txtPad;
        else if (align === "right") x = gaugeRect.x + gaugeRect.width - txtPad;
        const w = gaugeRect.width - txtPad * 2;
        const y = gaugeRect.y + gaugeRect.height + 14;
        return new Rectangle(x, y, w, gaugeRect.height);
    }

    getCurrentData() {
        return {};
    }

    isSystemVisible() {
        return true;
    }

    hasValidData() {
        return true;
    }

    shouldThrottleRedraw() {
        return false;
    }

    // ========================================================================
    // STYLES
    // ========================================================================

    hpColor() {
        return ["#e58751", "#e96214ff"];
    }

    mpColor() {
        return ["#5cd0dc", "#0dcee4ff"];
    }

    styleMpGauge() {
        const style = this.styleHpGauge();
        style.fillColor = this.mpColor()[0];
        style.txt.color = this.mpColor()[1];
        return style;
    }

    styleHpGauge() {
        return {
            bgColor: "rgba(0, 0, 0, 0.8)",
            growColor: "rgba(39, 174, 96, .6)",
            fillColor: this.hpColor()[0],
            malusColor: "#c0392b",
            txt: {
                align: "center",
                font: "normal 18px rmmz-numberfont, sans-serif",
                color: this.hpColor()[1]
            }
        };
    }

    // ========================================================================
    // LIFECYCLE & CACHE INDIVIDUALISÉ
    // ========================================================================

    init(data) {
        this._currentData = {};
        this._cache = {};
        this._dirty = true;
        this._hasDrawn = false;
        this._refreshCounter = 0;
        this._bgSprite = null;
        this._contentsLayer = null;
        this._upperLayerSprite = null;
    }

    create() {
        this.createBgLayer();
        this.createHudContents();
        this.createUpperLayer();
        this.setupCache();
    }

    createBgLayer() { }
    createHudContents() { }
    createUpperLayer() { }

    createContentsLayer() {
        const rect = this.hudRect;
        const bitmap = new Bitmap(rect.width, rect.height);
        this._contentsLayer = new Sprite(bitmap);
        this.addChild(this._contentsLayer);
    }

    setupCache() {
        this._cache = {};
        this._dirty = true;
        this._hasDrawn = false;
    }

    isDataEqual(a, b) {
        if (!a || !b) return false;
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        for (let i = 0; i < keysA.length; i++) {
            const k = keysA[i];
            if (!Object.is(a[k], b[k])) {
                return false;
            }
        }
        return true;
    }

    checkHudCache() {
        this._currentData = this.getCurrentData() || {};
        if (this._dirty || !this._hasDrawn) {
            return true;
        }
        return !this.isDataEqual(this._currentData, this._cache);
    }

    needRedraw() {
        if (!this.contentCtx) return false;
        if (!this.isSystemVisible()) return false;
        if (!this.hasValidData()) return false;
        return this.checkHudCache();
    }

    onHudHide() {
        this._hasDrawn = false;
        this._refreshCounter = 0;
    }

    onHudShow() {
        this.forceDirty();
        this._refreshCounter = 0;
    }

    update() {
        super.update();
        const shouldShow = this.isSystemVisible() && this.hasValidData();
        if (!shouldShow) {
            if (this.visible) {
                this.visible = false;
                this.onHudHide();
            }
            return;
        }

        if (!this.visible) {
            this.visible = true;
            this.onHudShow();
        }

        if (!this.needRedraw()) {
            return;
        }

        if (this.shouldThrottleRedraw()) {
            if (this._refreshCounter < this.refreshLapse) {
                this._refreshCounter++;
                return;
            }
            this._refreshCounter = 0;
        } else {
            this._refreshCounter = 0;
        }

        this.refreshHud();
    }

    clearHudContents() {
        if (this._contentsLayer && this._contentsLayer.bitmap) {
            this._contentsLayer.bitmap.clear();
        }
    }

    refreshHud() {
        this._currentData = this.getCurrentData() || {};
        this.updateHudCache();
        this.clearHudContents();
        this.drawHud();
        this._dirty = false;
        this._hasDrawn = true;
    }

    updateHudCache() {
        this._cache = Object.assign({}, this._currentData);
    }

    drawHud() { }
}

window.Sprite_HudBase = Sprite_HudBase;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Sprite_HudBase;
}
