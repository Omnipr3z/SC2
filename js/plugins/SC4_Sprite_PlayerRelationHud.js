class Sprite_PlayerHUD extends Sprite {
    constructor() {
        super();
        this.init();
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
    // Getters
    get refreshLapse() { return 2; }
    get leaderActor() { return $gameParty.leader(); }
    gaugeRefreshStep(type) {
        switch (type) {
            case "hp": return Math.floor(this.leaderActor.mhp / 60);
            case "mp": return Math.floor(this.leaderActor.mmp / 60);
            case "tp": return 1;
            case "exp": return Math.floor(this.leaderActor.nextLvlExp() / 100);
        }
    }
    get hudCtx() { return this.bitmap ? this.bitmap.context : null; }
    get contentCtx() { return this._contentsLayer.bitmap ? this._contentsLayer.bitmap.context : null; }
    isHero(actor) {
        actor = actor || this.leaderActor;
        return actor && actor.isHero();
    }
    // Dimensions
    hudRect() {
        return new Rectangle(20, 20, 260, 260)
    }
    faceRect() {
        return new Rectangle(8, 16, 64, 64);
    }
    nameRect(name, ctx) {
        const txtW = ctx.measureText(name).width;
        const padding = (129 - txtW) / 2;
        const x = 87 + padding;
        const y = 22;
        return new Rectangle(x, y, txtW, 20);
    }
    hpRect() {
        return new Rectangle(93, 26, 56, 9);
    }
    mpRect() {
        const rect = this.hpRect();
        rect.x += rect.width + 5;
        return rect;
    }
    gaugeTxtRect(ctx, gaugeRect, align) {
        ctx.textAlign = align;
        const txtPad = 2;
        let x = gaugeRect.x + txtPad;
        if (align == "center") x += (gaugeRect.width / 2) - txtPad;
        const w = gaugeRect.width - txtPad * 2;
        const y = gaugeRect.y + gaugeRect.height + 14;


        return new Rectangle(x, y, w, gaugeRect.height);
    }
    // style
    nameColor() {
        return this.hpColor()[0];
    }
    hpColor() {
        return ["#e58751", "#e96214ff"];
    }
    mpColor() {
        return ["#5cd0dc", "#0dcee4ff"];
    }
    styleName(ctx) {
        ctx.font = "bold 12px sans-serif";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.textAlign = "left";
        ctx.fillStyle = this.nameColor();
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

    // Methods
    init() {
        this._currentData = {};
        this._cache = {};
        this._faceLoaded = false;
        this._isSpeaking = false;
    }
    create() {
        this.createBgLayer();
        this.createFaceSprite();
        this.createContentsLayer();
        this.createUpperLayer();
        this.setupCache();
    }
    setupCache() {
        if (this.leaderActor)
            this._cache = this.getCurrentData(this.leaderActor);
        this._cache.actorId = -1;
        this._cache.isComposed = false;
    }
    createBgLayer() {
        const rect = this.hudRect();
        this.bitmap = new Bitmap(rect.width, rect.height);
        this.x = rect.x;
        this.y = rect.y;

        const bitmap = ImageManager.loadBitmap("img/GUI/playerHud/", "bg");

        this._bgSprite = new Sprite(bitmap);
        this.addChild(this._bgSprite);

    }
    createFaceSprite() {
        const rect = this.faceRect();
        this._faceSprite = new Sprite_PaperdollFace(null, rect.width, rect.height);
        this._faceSprite.x = rect.x;
        this._faceSprite.y = rect.y;

        this.addChild(this._faceSprite);
    }
    createUpperLayer() {
        const bitmap = ImageManager.loadBitmap("img/GUI/playerHud/", "upperLayer");
        this._upperLayerSprite = new Sprite(bitmap);
        this.addChild(this._upperLayerSprite);
    }
    createContentsLayer() {
        const rect = this.hudRect();
        const bitmap = new Bitmap(rect.width, rect.height);

        this._contentsLayer = new Sprite(bitmap);
        this.addChild(this._contentsLayer);
    }
    update() {
        super.update();
        const actor = this.leaderActor;
        const isSystemVisible = $guiManager.isPlayerHudVisible();

        if (!actor) this.visible = false;
        if (isSystemVisible)
            this.visible = true;
        else
            this.visible = false;
        if (!this.visible) return;
        if (!this.checkHudCache(actor)) return;

        this.refreshHudCache(actor);
        this.refreshHud(actor);
    }
    refreshHudCache(actor) {
        if (this._refreshCounter > this.refreshLapse) {
            this.updateHudCache(actor);
            this._refreshCounter = 0;
        } else {
            this._refreshCounter++;
        }
    }
    updateHudCache(actor) {
        const current = this.getCurrentData(actor);
        const equips = actor.equips();
        this._cache = {
            actorId: actor.actorId(),
            name: actor.name(),

            // BASE STATS
            hp: this.approach(this._cache.hp, current.hp, this.gaugeRefreshStep("hp")),
            mhp: actor.mhp,
            mp: this.approach(this._cache.mp, current.mp, this.gaugeRefreshStep("mp")),
            mmp: actor.mmp,
            tp: this.approach(this._cache.tp, current.tp, this.gaugeRefreshStep("tp")),

            // EXP
            nextLvlExp: actor.nextRequiredExp(),

            //Equips
            equipsKey: equips.map(e => e ? e.id : 0).join("-")
        };

        if (current.lvl > this._cache.lvl) {
            this._cache.lvl = actor.level;
            this._cache.currentExp = 0;
        }
        this._cache.currentExp = this.approach(this._cache.currentExp, current.currentExp, this.gaugeRefreshStep);

    }
    getCurrentData(actor) {
        const equips = actor.equips();

        return {
            actorId: actor.actorId(),
            name: actor.name(),

            // BASE STATS
            hp: actor.hp,
            mhp: actor.mhp,
            mp: actor.mp,
            mmp: actor.mmp,
            tp: actor.tp,

            // EXP
            lvl: actor.level,
            currentExp: actor.currentExp(),
            nextLvlExp: actor.nextRequiredExp(),

            //Equips
            equipsKey: equips.map(e => e ? e.id : 0).join("-")
        };
    }
    checkHudCache(actor) {
        this._currentData = this.getCurrentData(actor);
        let isDirty = false;

        for (const key in this._currentData) {
            if (this._cache[key] !== this._currentData[key]) {
                isDirty = true;
            }
        }

        return isDirty;
    }
    refreshHud(actor) {
        this.drawHud(actor);
    }
    drawBg() {
    }
    drawActorFace() {
        if (this.isHero()) {
            this.updateCompositeFace();
        } else {
            this.drawVanillaFace();
        }
    }
    updateCompositeFace() {
        const actor = this.leaderActor;

        this._faceSprite.setActor(actor);
        this._faceSprite.visible = true;
    }
    drawVanillaFace() {
        const pw = ImageManager.faceWidth || 144;
        const ph = ImageManager.faceHeight || 144;

        const faceIdx = actor.faceIndex();
        const sx = (faceIdx % 4) * pw;
        const sy = Math.floor(faceIdx / 4) * ph;
        const rect = this.faceRect();
        const img = faceBitmap._image || faceBitmap._canvas;

        if (img) {
            this.hudCtx.drawImage(img, sx, sy, pw, ph, fx, fy, fw, fh);
        }
    }

    drawHud() {
        const ctx = this.bitmap ? this.bitmap.context : null;
        if (!ctx) return;
        this.bitmap.clear();
        this.drawActorFace();
        this.drawStats();
    }
    drawStats() {
        this._contentsLayer.bitmap.clear();

        this.drawName();
        this.drawHpGauge();
        this.drawMpGauge();
    }
    drawName() {
        const ctx = this.contentCtx;
        const actor = this.leaderActor;
        const name = actor.name().toUpperCase();
        this.styleName(ctx);
        const rect = this.nameRect(name, ctx);

        ctx.fillText(`${name}`, rect.x, rect.y);

    }
    drawHpGauge() {
        const actor = this.leaderActor;
        const tempHp = this._cache.hp;
        const currentHp = actor.hp;
        const maxHp = actor.mhp;
        const rect = this.hpRect();
        const style = this.styleHpGauge();
        const txtSettings = { value: true, max: false, name: false };

        this.drawDynamicGauge(tempHp, currentHp, maxHp, rect, style, txtSettings, { txt: "hp", align: "left" });
    }
    drawMpGauge() {
        const actor = this.leaderActor;
        const tempMp = this._cache.mp;
        const currentMp = actor.mp;
        const maxMp = actor.mmp;
        const rect = this.mpRect();
        const style = this.styleMpGauge();
        const txtSettings = { value: true, name: false };

        this.drawDynamicGauge(tempMp, currentMp, maxMp, rect, style, txtSettings, { txt: "mp", align: "right" });
    }

    setSpeakingHighlight(active) {
        const bool = Boolean(active);
        if (this._isSpeaking !== bool) {
            this._isSpeaking = bool;
            const actor = this.leaderActor;
            if (actor) {
                const faceName = (typeof actor.faceName === "function") ? actor.faceName() : "";
                const faceBitmap = faceName ? ImageManager.loadFace(faceName) : null;
                this.drawHud(actor, faceBitmap);
            }
        }
    }
}

window.Sprite_PlayerHUD = Sprite_PlayerHUD;