//=============================================================================
// RPG Maker MZ - SC4_Sprite_ActorHUD.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Classe intermédiaire de HUD dédiée aux acteurs et héros (Sprite_ActorHUD).
 * @author SimCraft 4
 *
 * @help SC4_Sprite_ActorHUD.js
 *
 * Hérite de Sprite_HudBase. Spécialisée pour l'affichage des informations d'un acteur :
 *  - Intégration unifiée du portrait via Sprite_PaperdollFace (Héros composite ET faceset vanilla).
 *  - Gestion de l'orientation gauche/droite (_dir: "left" | "right").
 *  - Couches dédiées (_bgSprite, _faceSprite, _contentsLayer, _upperLayerSprite) sans bitmap racine superflu.
 */

class Sprite_ActorHUD extends Sprite_HudBase {
    constructor(data) {
        super(data);
    }

    /* a reflechir besoin de data externe ??? :
    init(data) {
        super.init(data);
        this._dir = data.dir;
        this._hudRect = data.rect;
        this._hudType = data.hudType;

        if (data.actorId)
            this.setActor(data.actorId);

        this._faceLoaded = false;
        this._isSpeaking = false;

    }
    */

    init(data) {
        super.init(data);
        this._actorId = 0;
        this._dir = "left";
        this._hudRect = new Rectangle(0, 0, 222, 97);
        this._hudType = "player";
        this._faceSprite = null;
    }

    setActor(actorId) {
        this._actorId = actorId;
        this.forceDirty();
    }

    // ========================================================================
    // GETTERS & DIMENSIONS
    // ========================================================================

    get actor() {
        return (typeof $gameActors !== "undefined" && $gameActors)
            ? $gameActors.actor(this._actorId)
            : null;
    }

    hasValidData() {
        return Boolean(this.actor);
    }

    isHero() {
        return Boolean(this.actor && typeof this.actor.isHero === "function" && this.actor.isHero());
    }

    get hudRect() {
        return this._hudRect;
    }

    faceRect() {
        const y = 16;
        const faceSize = 64;
        const padding = 8;
        let x;

        if (!this._dir || this._dir === "left") {
            x = padding;
        } else {
            x = this.hudRect.width - padding - faceSize;
        }

        return new Rectangle(x, y, faceSize, faceSize);
    }

    nameRect(name, ctx) {
        const txtW = ctx.measureText(name).width;
        const contentsW = (!this._dir || this._dir === "left") ? 130 : 180;
        const padding = (contentsW - txtW) / 2;
        const y = 22;
        let x;

        if (!this._dir || this._dir === "left") {
            x = 87 + padding;
        } else {
            x = padding;
        }
        return new Rectangle(x, y, txtW, 20);
    }

    // ========================================================================
    // STYLES
    // ========================================================================

    nameColor() {
        return this.hpColor()[0];
    }

    styleName(ctx) {
        ctx.font = "bold 12px sans-serif";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.textAlign = "left";
        ctx.fillStyle = this.nameColor();
    }

    // ========================================================================
    // CONSTRUCTION DES COUCHES & RENDU
    // ========================================================================

    create() {
        const rect = this.hudRect;
        this.x = rect.x;
        this.y = rect.y;
        super.create();
    }

    createBgLayer() {
        const filename = (!this._dir || this._dir === "left") ? "bg" : "reverseBg";
        const bitmap = ImageManager.loadBitmap("img/GUI/actorHud/", `${filename}_${this._hudType.toLowerCase()}`);
        this._bgSprite = new Sprite(bitmap);
        this.addChild(this._bgSprite);
    }

    createHudContents() {
        this.createFaceSprite();
        this.createContentsLayer();
    }

    createUpperLayer() {
        const filename = (!this._dir || this._dir === "left") ? "upperLayer" : "reverseUpperLayer";
        const bitmap = ImageManager.loadBitmap("img/GUI/actorHud/", `${filename}_${this._hudType.toLowerCase()}`);
        this._upperLayerSprite = new Sprite(bitmap);
        this.addChild(this._upperLayerSprite);
    }

    createFaceSprite() {
        const rect = this.faceRect();
        this._faceSprite = new Sprite_PaperdollFace(null, rect.width, rect.height);
        this._faceSprite.x = rect.x;
        this._faceSprite.y = rect.y;
        this._faceSprite.visible = false;
        this.addChild(this._faceSprite);
    }

    onHudHide() {
        super.onHudHide();
        if (this._faceSprite) {
            this._faceSprite.visible = false;
        }
    }

    drawActorFace() {
        const actor = this.actor;
        if (!this._faceSprite) return;
        if (!actor) {
            this._faceSprite.visible = false;
            return;
        }
        if (typeof this._faceSprite.actor === "function" && this._faceSprite.actor() !== actor) {
            this._faceSprite.setActor(actor);
        }
        this._faceSprite.visible = true;
    }

    drawHud() {
        this.drawActorFace();
        this.drawName();
        this.drawHudContents();
    }

    drawHudContents() { }

    drawName() {
        const ctx = this.contentCtx;
        const actor = this.actor;
        if (!ctx || !actor) return;
        const name = actor.name().toUpperCase();
        ctx.save();
        this.styleName(ctx);
        const rect = this.nameRect(name, ctx);
        ctx.fillText(`${name}`, rect.x, rect.y);
        ctx.restore();
    }
}

window.Sprite_ActorHUD = Sprite_ActorHUD;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Sprite_ActorHUD;
}
