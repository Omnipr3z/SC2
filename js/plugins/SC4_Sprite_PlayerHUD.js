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
            ctx.textAlign = "left";
            ctx.fillStyle = "#fff";
            ctx.fillText(SC4_Localisation.getText(key, `notxt:${key}`), gaugeRect.x, gaugeRect.y);
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
    drawDynamicGauge(start, target, max, rect, style, txtSettings) {
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
        const y = 20;
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
    hpColor() {
        return "#e58751";
    }
    mpColor() {
        return "#5cd0dc";
    }
    styleName(ctx) {
        ctx.font = "bold 12px sans-serif";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.textAlign = "left";
        ctx.fillStyle = this.hpColor();
    }
    styleMpGauge() {
        const style = this.styleHpGauge();
        style.fillColor = this.mpColor();

        return style;
    }
    styleHpGauge() {
        return {
            bgColor: "rgba(0, 0, 0, 0.8)",
            growColor: "rgba(39, 174, 96, .6)",
            fillColor: this.hpColor(),
            malusColor: "#c0392b",
            txt: {
                align: "center",
                font: "normal 18px rmmz-numberfont, sans-serif",
                color: "#fff"
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

        this.drawDynamicGauge(tempHp, currentHp, maxHp, rect, style, txtSettings);
    }
    drawMpGauge() {
        const actor = this.leaderActor;
        const tempMp = this._cache.mp;
        const currentMp = actor.mp;
        const maxMp = actor.mmp;
        const rect = this.mpRect();
        const style = this.styleMpGauge();
        const txtSettings = { value: true, name: false };

        this.drawDynamicGauge(tempMp, currentMp, maxMp, rect, style, txtSettings);
    }
    //  this.drawUpperLayer();
    //  this.drawContents();

    // const isHero = ;

    // // Dessin du faceset vanilla si non-héros
    // if (!isHero && faceBitmap && faceBitmap.isReady()) {
    //     this.drawPlayerNormalFace();
    // }

    // // 3. Dessin du cadre et du badge de nom
    // const bCtx = (this._badgeSprite && this._badgeSprite.bitmap) ? this._badgeSprite.bitmap.context : null;

    // const drawBorderAndBadge = (targetCtx) => {
    //     if (!targetCtx) return;
    //     // Bordure du Faceset (surbrillance rouge 2px si le joueur parle !)
    //     if (this._isSpeaking) {
    //         targetCtx.strokeStyle = "#ff3333";
    //         targetCtx.lineWidth = 2;
    //         targetCtx.strokeRect(fx + 1, fy + 1, fw - 2, fh - 2);
    //     } else {
    //         targetCtx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    //         targetCtx.lineWidth = 1.5;
    //         targetCtx.strokeRect(fx, fy, fw, fh);
    //     }

    //     // Nom du personnage (à moitié à cheval sur le haut du faceset)
    //     const nameText = typeof actor.name === "function" ? actor.name() : "";
    //     targetCtx.font = "bold 11px sans-serif";
    //     targetCtx.textBaseline = "middle";
    //     targetCtx.textAlign = "center";
    //     const textWidth = targetCtx.measureText(nameText).width;
    //     const badgeW = Math.max(fw, textWidth + 12);
    //     const badgeX = fx + (fw - badgeW) / 2;
    //     const badgeY = fy - 8; // Centré à cheval sur fy=18 (donc de 10 à 26)
    //     const badgeH = 16;

    //     targetCtx.fillStyle = "rgba(18, 22, 32, 0.9)";
    //     targetCtx.beginPath();
    //     if (targetCtx.roundRect) targetCtx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
    //     else targetCtx.rect(badgeX, badgeY, badgeW, badgeH);
    //     targetCtx.fill();
    //     targetCtx.strokeStyle = "rgba(255, 215, 0, 0.6)"; // Liseré doré
    //     targetCtx.lineWidth = 1;
    //     targetCtx.stroke();

    //     targetCtx.fillStyle = "#ffffff";
    //     targetCtx.shadowColor = "rgba(0, 0, 0, 0.8)";
    //     targetCtx.shadowBlur = 2;
    //     targetCtx.fillText(nameText, fx + fw / 2, badgeY + badgeH / 2);
    //     targetCtx.shadowBlur = 0;
    // };

    // drawBorderAndBadge(ctx);
    // if (bCtx && bCtx !== ctx) {
    //     drawBorderAndBadge(bCtx);
    // }

    // // 4. Jauges PV, MP, TP (en dessous du faceset, y >= 88)
    // const gx = 10;
    // const gw = 120;

    // // --- Jauge HP ---
    // const hy = 88;
    // const hh = 9;
    // const hpRate = actor.mhp > 0 ? Math.max(0, Math.min(1, actor.hp / actor.mhp)) : 0;
    // ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    // ctx.fillRect(gx, hy, gw, hh);

    // const hpGrad = ctx.createLinearGradient(gx, hy, gx + gw, hy);
    // if (hpRate > 0.5) {
    //     hpGrad.addColorStop(0, "#2ecc71");
    //     hpGrad.addColorStop(1, "#27ae60");
    // } else if (hpRate > 0.2) {
    //     hpGrad.addColorStop(0, "#f39c12");
    //     hpGrad.addColorStop(1, "#e67e22");
    // } else {
    //     hpGrad.addColorStop(0, "#e74c3c");
    //     hpGrad.addColorStop(1, "#c0392b");
    // }
    // ctx.fillStyle = hpGrad;
    // ctx.fillRect(gx, hy, Math.floor(gw * hpRate), hh);

    // // Texte HP
    // ctx.font = "bold 8px sans-serif";
    // ctx.textAlign = "left";
    // ctx.fillStyle = "#ffffff";
    // ctx.fillText("HP", gx + 2, hy + hh / 2);
    // ctx.textAlign = "right";
    // ctx.fillText(`${actor.hp}/${actor.mhp}`, gx + gw - 2, hy + hh / 2);

    // // --- Jauge MP ---
    // const my = 100;
    // const mh = 8;
    // const mpRate = actor.mmp > 0 ? Math.max(0, Math.min(1, actor.mp / actor.mmp)) : 0;
    // ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    // ctx.fillRect(gx, my, gw, mh);

    // const mpGrad = ctx.createLinearGradient(gx, my, gx + gw, my);
    // mpGrad.addColorStop(0, "#3498db");
    // mpGrad.addColorStop(1, "#2980b9");
    // ctx.fillStyle = mpGrad;
    // ctx.fillRect(gx, my, Math.floor(gw * mpRate), mh);

    // ctx.textAlign = "left";
    // ctx.fillStyle = "#ffffff";
    // ctx.fillText("MP", gx + 2, my + mh / 2);
    // ctx.textAlign = "right";
    // ctx.fillText(`${actor.mp}/${actor.mmp}`, gx + gw - 2, my + mh / 2);

    // // --- Jauge TP ---
    // const ty = 111;
    // const th = 7;
    // const maxTp = typeof actor.maxTp === "function" ? actor.maxTp() : 100;
    // const tpRate = maxTp > 0 ? Math.max(0, Math.min(1, actor.tp / maxTp)) : 0;
    // ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    // ctx.fillRect(gx, ty, gw, th);

    // const tpGrad = ctx.createLinearGradient(gx, ty, gx + gw, ty);
    // tpGrad.addColorStop(0, "#f1c40f");
    // tpGrad.addColorStop(1, "#e67e22");
    // ctx.fillStyle = tpGrad;
    // ctx.fillRect(gx, ty, Math.floor(gw * tpRate), th);

    // ctx.textAlign = "left";
    // ctx.fillStyle = "#ffffff";
    // ctx.fillText("TP", gx + 2, ty + th / 2);
    // ctx.textAlign = "right";
    // ctx.fillText(`${Math.floor(actor.tp)}`, gx + gw - 2, ty + th / 2);

    // // 5. Jauge d'XP & Niveau (en dessous des jauges PV, MP, TP)
    // const xy = 124;
    // const xh = 6;
    // let expRate = 1.0;
    // if (typeof actor.isMaxLevel === "function" && !actor.isMaxLevel()) {
    //     const cur = (typeof actor.currentExp === "function" ? actor.currentExp() : 0) - (typeof actor.currentLevelExp === "function" ? actor.currentLevelExp() : 0);
    //     const req = (typeof actor.nextLevelExp === "function" ? actor.nextLevelExp() : 1) - (typeof actor.currentLevelExp === "function" ? actor.currentLevelExp() : 0);
    //     expRate = req > 0 ? Math.max(0, Math.min(1, cur / req)) : 0;
    // }

    // ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    // ctx.fillRect(gx, xy, gw, xh);

    // const xpGrad = ctx.createLinearGradient(gx, xy, gx + gw, xy);
    // xpGrad.addColorStop(0, "#9b59b6");
    // xpGrad.addColorStop(1, "#8e44ad");
    // ctx.fillStyle = xpGrad;
    // ctx.fillRect(gx, xy, Math.floor(gw * expRate), xh);

    // // Indication du niveau
    // ctx.textAlign = "left";
    // ctx.fillStyle = "#ffd700"; // Or pour le niveau
    // ctx.fillText(`Nv. ${actor.level}`, gx + 2, xy + xh / 2);
    // ctx.textAlign = "right";
    // ctx.fillStyle = "#dddddd";
    // ctx.fillText(`${Math.floor(expRate * 100)}%`, gx + gw - 2, xy + xh / 2);

    /*
    refreshFaceSprite() {
        const faceEntry = this.redrawFace(actor);
        const faceName = actor.faceName();
        const faceIndex = actor.faceIndex();
        const faceBitmap = ImageManager.loadFace(faceName);
        const isComposed = faceEntry.isComposed;
        const faceReady = isComposed || (faceBitmap ? faceBitmap.isReady() : false);
    }
    
    redrawFace(actor) {
        const isHero = this.isHero(actor);
    
        if (this._faceSprite) {
            if (isHero) {
                this._faceSprite.setActor(actor);
                this._faceSprite.visible = true;
            } else {
                this._faceSprite.visible = false;
            }
        }
    
        let faceEntry = null;
        if (isHero) {
            faceEntry = Bitmap_Composite.getCompositeFaceEntry(actor);
            if (faceEntry && faceEntry.composer && faceEntry.composer.isReady() && !faceEntry.isComposed) {
                faceEntry.composer.bltComposite(faceEntry.bitmap);
                faceEntry.isComposed = true;
            }
        }
        return faceEntry;
    }
    drawPlayerNormalFace() {
        const pw = ImageManager.faceWidth || 144;
        const ph = ImageManager.faceHeight || 144;
        const faceIdx = (typeof actor.faceIndex === "function") ? actor.faceIndex() : 0;
        const sx = (faceIdx % 4) * pw;
        const sy = Math.floor(faceIdx / 4) * ph;
        const img = faceBitmap._image || faceBitmap._canvas;
        if (img) {
            ctx.drawImage(img, sx, sy, pw, ph, fx, fy, fw, fh);
        }
    }
    
    drawDefaultDesign() {
        // 1. Fond général HUD (design sombre, légèrement transparent avec bordure douce)
        ctx.fillStyle = "rgba(12, 16, 24, 0.75)";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(0, 8, 140, 138, 6);
        else ctx.rect(0, 8, 140, 138);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1;
        ctx.stroke();
    
        // 2. Cadre du Faceset (64x64px)
        const fx = 10;
        const fy = 18;
        const fw = 64;
        const fh = 64;
    
        // Fond du cadre de face
        ctx.fillStyle = "#111111";
        ctx.fillRect(fx, fy, fw, fh);
    }
    */

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