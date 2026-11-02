class Sprite_InterlocutorHUD extends Sprite {
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

window.Sprite_InterlocutorHUD = Sprite_InterlocutorHUD;