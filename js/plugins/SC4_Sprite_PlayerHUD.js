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
 *  - Positionné en haut à gauche de l'écran (222x97 conforme à bg_player.png).
 *  - Jauges de vitalité (PV, PM) avec interpolation fluide pilotée par le cache de Sprite_HudBase.
 *  - Portrait dynamique unifié via Sprite_PaperdollFace.
 *  - Visibilité contrôlée par $guiManager.
 */

class Sprite_PlayerHUD extends Sprite_ActorHUD {
    constructor(data) {
        super(data);
    }

    init(data) {
        super.init(data);
        this._dir = "left";
        this._hudRect = new Rectangle(20, 20, 222, 97);
        this._hudType = "player";
    }

    // ========================================================================
    // GETTERS & DIMENSIONS
    // ========================================================================

    get actor() {
        return (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.leader === "function")
            ? $gameParty.leader()
            : null;
    }

    hpRect() {
        return new Rectangle(93, 26, 56, 9);
    }

    mpRect() {
        const rect = this.hpRect();
        rect.x += rect.width + 5;
        return rect;
    }

    isSystemVisible() {
        return Boolean(typeof $guiManager !== "undefined" && $guiManager && $guiManager.isPlayerHudVisible());
    }

    // ========================================================================
    // CACHE INDIVIDUALISÉ & LISSAGE DES JAUGES
    // ========================================================================

    getCurrentData() {
        const actor = this.actor;
        if (!actor) return {};
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

            // Equips
            equipsKey: equips.map(e => e ? e.id : 0).join("-")
        };
    }

    shouldThrottleRedraw() {
        if (!this._hasDrawn || this._dirty || !this._cache) return false;
        const cur = this._currentData;
        return (
            this._cache.actorId === cur.actorId &&
            this._cache.name === cur.name &&
            this._cache.mhp === cur.mhp &&
            this._cache.mmp === cur.mmp &&
            this._cache.lvl === cur.lvl &&
            this._cache.nextLvlExp === cur.nextLvlExp &&
            this._cache.equipsKey === cur.equipsKey
        );
    }

    updateHudCache() {
        const current = (this._currentData && this._currentData.actorId) ? this._currentData : this.getCurrentData();
        if (!current || !current.actorId) return;

        const sameActor = this._hasDrawn && this._cache && this._cache.actorId === current.actorId;
        if (!sameActor) {
            this._cache = Object.assign({}, current);
            return;
        }

        const expOrigin = (current.lvl > this._cache.lvl) ? 0 : this._cache.currentExp;
        this._cache = {
            actorId: current.actorId,
            name: current.name,

            hp: this.approach(this._cache.hp, current.hp, this.gaugeRefreshStep("hp")),
            mhp: current.mhp,
            mp: this.approach(this._cache.mp, current.mp, this.gaugeRefreshStep("mp")),
            mmp: current.mmp,
            tp: this.approach(this._cache.tp, current.tp, this.gaugeRefreshStep("tp")),

            lvl: current.lvl,
            nextLvlExp: current.nextLvlExp,
            currentExp: this.approach(expOrigin, current.currentExp, this.gaugeRefreshStep("exp")),

            equipsKey: current.equipsKey
        };
    }

    // ========================================================================
    // RENDU
    // ========================================================================

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
        if (!actor) return;
        const tempHp = this._cache.hp !== undefined ? this._cache.hp : actor.hp;
        const rect = this.hpRect();
        const style = this.styleHpGauge();
        const txtSettings = { value: true, max: false, name: false };

        this.drawDynamicGauge(tempHp, actor.hp, actor.mhp, rect, style, txtSettings, { txt: "hp", align: "left" });
    }

    drawMpGauge() {
        const actor = this.actor;
        if (!actor) return;
        const tempMp = this._cache.mp !== undefined ? this._cache.mp : actor.mp;
        const rect = this.mpRect();
        const style = this.styleMpGauge();
        const txtSettings = { value: true, name: false };

        this.drawDynamicGauge(tempMp, actor.mp, actor.mmp, rect, style, txtSettings, { txt: "mp", align: "right" });
    }
}

window.Sprite_PlayerHUD = Sprite_PlayerHUD;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Sprite_PlayerHUD;
}
