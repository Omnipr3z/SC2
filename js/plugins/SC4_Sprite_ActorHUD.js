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
 *  - Intégration du portrait dynamique (Faceset vanilla ou Paperdoll composite Hero).
 *  - Cadre oratoire / prise de parole (_isSpeaking).
 *  - Gestion de l'orientation gauche/droite (_dir: "left" | "right").
 */

class Sprite_ActorHUD extends Sprite_HudBase {
    constructor(data) {
        super(data);
    }
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
    setActor(actorId) {
        this._actorId = actorId;
    }
    //UTILS
    // Getters
    get actor() { return $gameActors.actor(this._actorId) }
    isHero() {
        return this.actor && this.actor.isHero();
    }
    // Dimensions
    get hudRect() {
        return this._hudRect;
    }
    faceRect() {
        const y = 16, faceSize = 64, padding = 8;
        let x;

        if (!this._dir || this._dir == "left") {
            x = padding;
        } else {
            x = this.hudRect.width - padding - faceSize;
        }

        return new Rectangle(x, y, faceSize, faceSize);
    }
    nameRect(name, ctx) {
        const txtW = ctx.measureText(name).width;
        const contentsW = (!this._dir || this._dir == "left") ? 130 : 180;
        const padding = (contentsW - txtW) / 2;
        const y = 22;
        let x;


        if (!this._dir || this._dir == "left") {
            x = 87 + padding;
        } else {
            x = padding;
        }
        return new Rectangle(x, y, txtW, 20);
    }
    // STYLES
    nameColor() {
        return this.hpColor()[0];
    }
    styleName(ctx) {
        ctx.font = "bold 12px sans-serif";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.textAlign = "left";
        ctx.fillStyle = this.nameColor();
    }

    // Methods
    init() {
        super.init();
        this._faceLoaded = false;
        this._isSpeaking = false;
    }
    createHudContents() {
        this.createFaceSprite();
        this.createContentsLayer();
    }
    setupCache() {
        if (!this.actor) return;
        this._cache = this.getCurrentData();
        this._cache.actorId = -1;
        this._cache.isComposed = false;
    }
    createBgLayer() {
        const rect = this.hudRect;
        this.bitmap = new Bitmap(rect.width, rect.height);
        this.x = rect.x;
        this.y = rect.y;

        let filename = "reverseBg";
        if (!this._dir || this._dir == "left") filename = "bg";

        const bitmap = ImageManager.loadBitmap("img/GUI/actorHud/", `${filename}_${this._hudType.toLowerCase()}`);

        this._bgSprite = new Sprite(bitmap);
        this.addChild(this._bgSprite);

    }
    createUpperLayer() {
        const rect = this.hudRect;
        this.bitmap = new Bitmap(rect.width, rect.height);
        this.x = rect.x;
        this.y = rect.y;

        let filename = "reverseUpperLayer";
        if (!this._dir || this._dir == "left") filename = "upperLayer";

        const bitmap = ImageManager.loadBitmap("img/GUI/actorHud/", `${filename}_${this._hudType.toLowerCase()}`);

        this._upperLayerSprite = new Sprite(bitmap);
        this.addChild(this._upperLayerSprite);

    }
    createFaceSprite() {
        const rect = this.faceRect();
        this._faceSprite = new Sprite_PaperdollFace(null, rect.width, rect.height);
        this._faceSprite.x = rect.x;
        this._faceSprite.y = rect.y;

        this.addChild(this._faceSprite);
    }
    needRedraw() {
        if (!this.actor) {
            this._faceSprite.visible = false;
            return false;
        }

        return super.needRedraw();
    }
    drawActorFace() {
        if (this.isHero()) {
            this.updateCompositeFace();
        } else {
            const rect = this.faceRect();
            this.drawVanillaFace(rect.x, rect.y, rect.width);
        }
    }
    updateCompositeFace() {
        const actor = this.actor;

        this._faceSprite.setActor(actor);
        this._faceSprite.visible = true;
    }
    drawHud() {
        this.drawActorFace();
        this.drawName();
        this.drawHudContents();
    }
    drawHudContents() {

    }
    drawName() {
        const ctx = this.contentCtx;
        const name = this.actor.name().toUpperCase();
        this.styleName(ctx);
        const rect = this.nameRect(name, ctx);

        ctx.fillText(`${name}`, rect.x, rect.y);

    }
}

window.Sprite_ActorHUD = Sprite_ActorHUD;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Sprite_ActorHUD;
}