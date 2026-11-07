class Sprite_HudBase extends Sprite {

    constructor(data) {
        super();
        this.init(data);
        this.create();
        this._refreshCounter = 0;
    }
    //UTILS
    approach(origin, target, step) {
        const dir = target - origin;
        if (dir > 0) {
            return Math.min(target, origin + step);
        } else {
            return Math.max(target, origin - step);
        }
    }
    forceDirty() {
        this._cache = {};
    }
    drawGaugeText(ctx, txt, gaugeRect, style, key) {
        if (key) {
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = key.align;
            ctx.fillStyle = "#fff";
            let x = gaugeRect.x + 2;
            if (key.align == "right") x += gaugeRect.width - 4;
            ctx.fillText(SC4_Localization.getText(`terms.${key.txt}`, `notxt:${key.txt}`), x, gaugeRect.y - 2);
        }

        ctx.font = style.font;
        ctx.textAlign = "left";
        const rect = this.gaugeTxtRect(ctx, gaugeRect, style.align, txt);
        ctx.fillStyle = style.color;
        ctx.fillText(txt, rect.x, rect.y);
    }
    drawHudGauge(ctx, x, y, width, height, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width, height);
    }
    drawDynamicGauge(start, target, max, rect, style, txtSettings, key) {
        const actual = Math.min(start, max);
        const ctx = this.contentCtx;
        const targetRate = target / max;
        const targetW = rect.width * targetRate;
        const actualRate = actual / max;
        const actualW = rect.width * actualRate;


        //bg
        this.drawHudGauge(ctx, rect.x, rect.y, rect.width, rect.height, style.bgColor, key);
        if (target > actual) {
            //grow gauge
            this.drawHudGauge(ctx, rect.x, rect.y, targetW, rect.height, style.growColor);
        }
        //Actual
        this.drawHudGauge(ctx, rect.x, rect.y, actualW, rect.height, style.fillColor);
        if (target < actual) {
            // malus gauge
            const malusW = actualW - targetW;
            const malusX = rect.x + actualW - malusW;
            this.drawHudGauge(ctx, malusX, rect.y, malusW, rect.height, style.malusColor);
        }
        //text
        if (txtSettings.value) {
            let txt = "";

            if (txtSettings.name) txt += `${txtSettings.name}: `;
            txt += actual;
            if (txtSettings.max) txt += ` / ${max}`;
            this.drawGaugeText(ctx, txt, rect, style.txt, key);
        }
    }
    drawVanillaFace(x, y, size) {
        const pw = ImageManager.faceWidth || 144;
        const ph = ImageManager.faceHeight || 144;

        const faceIdx = actor.faceIndex();
        const sx = (faceIdx % 4) * pw;
        const sy = Math.floor(faceIdx / 4) * ph;
        const rect = this.faceRect();
        const img = faceBitmap._image || faceBitmap._canvas;

        if (img) {
            this.hudCtx.drawImage(img, sx, sy, pw, ph, x, y, size, size);
        }
    }
    //GETTERS
    get refreshLapse() { return 2; }
    gaugeRefreshStep(type) {
        switch (type) {
            case "hp": return Math.floor(this.actor.mhp / 60);
            case "mp": return Math.floor(this.actor.mmp / 60);
            case "tp": return 1;
            case "exp": return Math.floor(this.actor.nextLvlExp() / 100);
        }
    }
    get hudCtx() { return this.bitmap ? this.bitmap.context : null; }
    get contentCtx() { return this._contentsLayer.bitmap ? this._contentsLayer.bitmap.context : null; }
    gaugeTxtRect(ctx, gaugeRect, align) {
        ctx.textAlign = align;
        const txtPad = 2;
        let x = gaugeRect.x + txtPad;
        if (align == "center") x += (gaugeRect.width / 2) - txtPad;
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
    //STYLES
    hpColor() {
        return ["#e58751", "#e96214ff"];
    }
    mpColor() {
        return ["#5cd0dc", "#0dcee4ff"];
    }
    styleMpGauge() {
        const style = this.styleHpGauge();
        style.fillColor = this.mpColor()[0];
        style.txt.color = this.mpColor()[1]

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
        }
    }

    //METHODS
    init(data) {
        this._currentData = {};
        this._cache = {};
    }
    create() {
        this.createBgLayer();
        this.createHudContents();
        this.createUpperLayer();
        this.setupCache();
    }
    createBgLayer() { }
    createContentsLayer() {
        const rect = this.hudRect;
        const bitmap = new Bitmap(rect.width, rect.height);

        this._contentsLayer = new Sprite(bitmap);
        this.addChild(this._contentsLayer);
    }
    createUpperLayer() { }
    update() {
        super.update();
        if (!this.needRedraw()) {
            if (!this.isSystemVisible()) this.visible = false;
            return;
        } else {
            this.clearHudContents();
            this.visible = true;
        }
        this.refreshHud();
    }
    clearHudContents() {
        this.bitmap.clear();
        this._contentsLayer.bitmap.clear();
    }
    needRedraw() {
        if (!this.hudCtx) return false;
        if (!this.isSystemVisible()) return false;
        return true;
    }
    checkHudCache() {
        this._currentData = this.getCurrentData();
        let isDirty = false;

        for (const key in this._currentData) {
            if (this._cache[key] !== this._currentData[key]) {
                isDirty = true;
            }
        }

        return isDirty;
    }
    refreshHud() {
        this.refreshHudCache();
        this.drawHud();
    }
    refreshHudCache() {
        if (this._refreshCounter > this.refreshLapse) {
            this.updateHudCache();
            this._refreshCounter = 0;
        } else {
            this._refreshCounter++;
        }
    }
    updateHudCache() { }

}

window.Sprite_HudBase = Sprite_HudBase;