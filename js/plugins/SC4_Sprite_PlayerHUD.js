//=============================================================================
// RPG Maker MZ - SC4_Sprite_PlayerHUD.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] HUD du joueur sur la carte (Sprite_PlayerHUD).
 * @author SimCraft 4
 *
 * @help SC4_Sprite_PlayerHUD.js
 *
 * Hérite de Sprite_ActorHUD. Affiche les constantes vitales du leader du groupe ($gameParty.leader()) :
 *  - Positionné en haut à gauche de l'écran.
 *  - Jauges de vitalité (PV, PM) avec interpolation fluide.
 *  - Portrait dynamique du héros avec rétro-éclairage lors de la parole.
 *  - Visibilité contrôlée par $guiManager.
 */

class Sprite_PlayerHUD extends Sprite_ActorHUD {
    constructor(data) {


        super(data);
    }
    init(data) {
        super.init(data);
        this._dir = "left";
        this._hudRect = new Rectangle(20, 20, 260, 260);
        this._hudType = "player";
        this._faceLoaded = false;
        this._isSpeaking = false;
    }
    //UTILS
    // Getters
    get actor() { return $gameParty.leader(); }
    // Dimensions
    hpRect() {
        return new Rectangle(93, 26, 56, 9);
    }
    mpRect() {
        const rect = this.hpRect();
        rect.x += rect.width + 5;
        return rect;
    }
    needRedraw() {
        if (!$guiManager.isPlayerHudVisible()) return false;
        return super.needRedraw();
    }

    isSystemVisible() {
        return $guiManager._isPlayerHudVisible;
    }
    //UPDATE
    updateHudCache() {
        const current = this.getCurrentData();
        const actor = this.actor;
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
    getCurrentData() {
        const actor = this.actor;
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

    drawHudContents() {
        super.drawHudContents();
        this.drawStats();
    }
    drawStats() {
        this.drawHpGauge();
        this.drawMpGauge();
    }
    drawHpGauge() {
        const actor = this.actor;
        const tempHp = this._cache.hp;
        const currentHp = actor.hp;
        const maxHp = actor.mhp;
        const rect = this.hpRect();
        const style = this.styleHpGauge();
        const txtSettings = { value: true, max: false, name: false };

        this.drawDynamicGauge(tempHp, currentHp, maxHp, rect, style, txtSettings, { txt: "hp", align: "left" });
    }
    drawMpGauge() {
        const actor = this.actor;
        const tempMp = this._cache.mp;
        const currentMp = actor.mp;
        const maxMp = actor.mmp;
        const rect = this.mpRect();
        const style = this.styleMpGauge();
        const txtSettings = { value: true, name: false };

        this.drawDynamicGauge(tempMp, currentMp, maxMp, rect, style, txtSettings, { txt: "mp", align: "right" });
    }
}

window.Sprite_PlayerHUD = Sprite_PlayerHUD;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Sprite_PlayerHUD;
}