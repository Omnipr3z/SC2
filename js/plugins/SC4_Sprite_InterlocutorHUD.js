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

/*class Sprite_InterlocutorHUD extends Sprite {
    constructor() {
        super();
        this.setup();


        this._faceSprite = new Sprite_PaperdollFace(null, 64, 64);
        this._faceSprite.x = 10;
        this._faceSprite.y = 18;
        this._faceSprite.visible = false;
        this.addChild(this._faceSprite);

        this._badgeSprite = new Sprite();
        this._badgeSprite.bitmap = (typeof Bitmap !== "undefined") ? new Bitmap(144, 96) : nu
        this.addChild(this._badgeSprite);
        this._currentKey = "";
    }
    setup() {
        this.bitmap = new Bitmap(260, 260);
        this.x = (typeof Graphics !== "undefined" ? Graphics.boxWidth : 1760) - 164;
        this.y = 20;
        this.visible = false;
    }

    update() {
        super.update();
        const screenW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1760;
        this.x = screenW - 164;

        if (typeof $gameMessage === "undefined" || !$gameMessage.isBusy()) {
            this.visible = false;
            this._currentKey = "";
        }
    }

    hideInterlocutor() {
        this.visible = false;
        this._currentKey = "";
        if (this._faceSprite) this._faceSprite.visible = false;
    }

    showInterlocutor(faceName, faceIndex, speakerName, heroActor = null) {
        this.visible = true;
        const heroId = heroActor ? (typeof heroActor.actorId === "function" ? heroActor.actorId() : (heroActor.id || 0)) : 0;
        const key = `${faceName}_${faceIndex}_${speakerName}_${heroId}`;
        if (this._currentKey === key) return;
        this._currentKey = key;

        const ctx = this.bitmap ? this.bitmap.context : null;
        if (!ctx) return;
        this.bitmap.clear();
        if (this._badgeSprite && this._badgeSprite.bitmap) {
            this._badgeSprite.bitmap.clear();
        }

        // Fond sombre identique au HUD joueur
        ctx.fillStyle = "rgba(12, 16, 24, 0.85)";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(0, 8, 140, 80, 6);
        else ctx.rect(0, 8, 140, 80);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Cadre 64x64 du visage
        const fx = 10;
        const fy = 18;
        const fw = 64;
        const fh = 64;

        ctx.fillStyle = "#111111";
        ctx.fillRect(fx, fy, fw, fh);

        if (heroActor && this._faceSprite) {
            this._faceSprite.setActor(heroActor);
            this._faceSprite.visible = true;
        } else {
            if (this._faceSprite) this._faceSprite.visible = false;
            if (faceName) {
                const faceBitmap = ImageManager.loadFace(faceName);
                const drawImg = () => {
                    const pw = ImageManager.faceWidth || 144;
                    const ph = ImageManager.faceHeight || 144;
                    const sx = (faceIndex % 4) * pw;
                    const sy = Math.floor(faceIndex / 4) * ph;
                    const img = faceBitmap._image || faceBitmap._canvas;
                    if (img && ctx) {
                        ctx.drawImage(img, sx, sy, pw, ph, fx, fy, fw, fh);
                        this.drawBadge(speakerName);
                    }
                };
                if (faceBitmap.isReady()) {
                    drawImg();
                } else {
                    faceBitmap.addLoadListener(drawImg);
                }
            }
        }

        this.drawBadge(speakerName);
    }

    drawBadge(speakerName) {
        const fx = 10;
        const fy = 18;
        const fw = 64;
        const fh = 64;

        const targetCtx = (this._badgeSprite && this._badgeSprite.bitmap) ? this._badgeSprite.bitmap.context : (this.bitmap ? this.bitmap.context : null);
        if (!targetCtx) return;

        targetCtx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        targetCtx.lineWidth = 1.5;
        targetCtx.strokeRect(fx, fy, fw, fh);

        const parsedName = typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(speakerName || "") : (speakerName || "");
        if (parsedName) {
            targetCtx.font = "bold 11px sans-serif";
            targetCtx.textBaseline = "middle";
            targetCtx.textAlign = "center";
            const textWidth = targetCtx.measureText(parsedName).width;
            const badgeW = Math.max(fw, textWidth + 12);
            const badgeX = fx + (fw - badgeW) / 2;
            const badgeY = fy - 8;
            const badgeH = 16;

            targetCtx.fillStyle = "rgba(18, 22, 32, 0.95)";
            targetCtx.beginPath();
            if (targetCtx.roundRect) targetCtx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
            else targetCtx.rect(badgeX, badgeY, badgeW, badgeH);
            targetCtx.fill();
            targetCtx.strokeStyle = "rgba(255, 215, 0, 0.7)";
            targetCtx.lineWidth = 1;
            targetCtx.stroke();

            targetCtx.fillStyle = "#ffffff";
            targetCtx.shadowColor = "rgba(0, 0, 0, 0.8)";
            targetCtx.shadowBlur = 2;
            targetCtx.fillText(parsedName, fx + fw / 2, badgeY + badgeH / 2);
            targetCtx.shadowBlur = 0;
        }
    }
}

window.Sprite_InterlocutorHUD = Sprite_InterlocutorHUD;*/