//=============================================================================
// SC4_rmmz_sprites_Patches.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Surcharges et patches des classes natives de rmmz_sprites.js.
 * @author SimCraft
 * @help
 * ============================================================================
 * SC4_rmmz_sprites_Patches.js
 * ============================================================================
 * Regroupe tous les patches et surcharges apportés aux classes de rmmz_sprites :
 * 
 * 1. Sprite_Character :
 *    - characterPatternY : fallback sécurisé sur les directions cardinales pour
 *      les sprites standards RMMZ 4 directions lorsqu'ils font face à une
 *      diagonale (1, 3, 7, 9).
 * 
 * 2. Spriteset_Map :
 *    - createCharacterSprite : fabrique retournant Sprite_Hero si le personnage
 *      est un Hero (character.isHero()), ou Sprite_Character sinon.
 *    - createCharacters : création des sprites avec support natif RMMZ
 *      (followers().reverseData()).
 * ============================================================================
 */

(() => {
    "use strict";

    // ========================================================================
    // 1. Patches pour Sprite_Character
    // ========================================================================
    const _Sprite_Character_characterPatternY = Sprite_Character.prototype.characterPatternY;
    Sprite_Character.prototype.characterPatternY = function () {
        const dir = this._character.direction();
        if ([1, 3, 7, 9].includes(dir)) {
            // Mappage de repli vers la direction cardinale pour les sprites 4 directions
            const fallback = { 1: 2, 3: 2, 7: 8, 9: 8 }[dir] || 2;
            return (fallback - 2) / 2;
        }
        return _Sprite_Character_characterPatternY.call(this);
    };

    // ========================================================================
    // 2. Patches pour Spriteset_Map
    // ========================================================================
    /**
     * Crée le sprite adapté (Sprite_Hero ou Sprite_Character standard).
     * @param {Game_Character} character 
     * @returns {Sprite_Character}
     */
    Spriteset_Map.prototype.createCharacterSprite = function (character) {
        if ((typeof Game_Player !== "undefined" && character instanceof Game_Player) ||
            (typeof Game_Follower !== "undefined" && character instanceof Game_Follower) ||
            (typeof Game_Event !== "undefined" && character instanceof Game_Event) ||
            (character && typeof character.actorId === "function" && character.actorId() > 0) ||
            (character && character.isHero && character.isHero())) {
            return new Sprite_Hero(character);
        }
        return new Sprite_Character(character);
    };

    /**
     * Surcharge standard de createCharacters pour instancier Sprite_Hero si requis.
     */
    Spriteset_Map.prototype.createCharacters = function () {
        this._characterSprites = [];
        for (const event of $gameMap.events()) {
            this._characterSprites.push(this.createCharacterSprite(event));
        }
        for (const vehicle of $gameMap.vehicles()) {
            this._characterSprites.push(this.createCharacterSprite(vehicle));
        }
        for (const follower of $gamePlayer.followers().reverseData()) {
            this._characterSprites.push(this.createCharacterSprite(follower));
        }
        this._characterSprites.push(this.createCharacterSprite($gamePlayer));

        for (const sprite of this._characterSprites) {
            this._tilemap.addChild(sprite);
        }
    };

    // ========================================================================
    // 5. Surcharges Window_Base & Window_StatusBase (Étape 13)
    // ========================================================================
    if (typeof Window_Base !== "undefined") {
        if (!Window_Base.prototype.drawDynamicFace) {
            Window_Base.prototype.drawDynamicFace = function (actorOrId, x, y, width, height) {
                const actor = (typeof actorOrId === "number")
                    ? ((typeof $gameActors !== "undefined" && $gameActors) ? $gameActors.actor(actorOrId) : null)
                    : actorOrId;
                if (!actor) return null;

                const actorId = (typeof actor.actorId === "function") ? actor.actorId() : 0;
                width = width || (typeof ImageManager !== "undefined" ? ImageManager.faceWidth : 144) || 144;
                height = height || (typeof ImageManager !== "undefined" ? ImageManager.faceHeight : 144) || 144;

                this._additionalSprites = this._additionalSprites || {};
                const key = `dynamicFace_${actorId}_${x}_${y}`;
                let sprite = this._additionalSprites[key];

                if (!sprite) {
                    sprite = new (window.Sprite_PaperdollFace || Sprite_BaseClass)(actor, width, height);
                    this._additionalSprites[key] = sprite;
                    if (typeof this.addInnerChild === "function") {
                        this.addInnerChild(sprite);
                    } else if (typeof this.addChild === "function") {
                        this.addChild(sprite);
                    }
                } else {
                    if (typeof sprite.setTargetSize === "function") sprite.setTargetSize(width, height);
                    if (typeof sprite.setActor === "function") sprite.setActor(actor);
                }

                if (typeof sprite.move === "function") sprite.move(x, y);
                else { sprite.x = x; sprite.y = y; }

                if (typeof sprite.show === "function") sprite.show();
                else sprite.visible = true;

                sprite._inUse = true;
                return sprite;
            };
        }

        if (!Window_Base.prototype.drawActorFace) {
            Window_Base.prototype.drawActorFace = function (actor, x, y, width, height) {
                const isHero = actor && (
                    (typeof actor.isHero === "function" && actor.isHero()) ||
                    (actor.hasNotetag && actor.hasNotetag("Hero")) ||
                    (actor.actor && actor.actor() && /<Hero>/i.test(actor.actor().note))
                );
                if (isHero && typeof this.drawDynamicFace === "function") {
                    this.drawDynamicFace(actor, x, y, width, height);
                } else if (typeof this.drawFace === "function") {
                    this.drawFace(actor.faceName(), actor.faceIndex(), x, y, width, height);
                }
            };
        }

        if (!Window_Base.prototype.drawActorPicture) {
            Window_Base.prototype.drawActorPicture = function (actor, x, y, width, height) {
                this.drawActorFace(actor, x, y, width, height);
            };
        }
    }

    if (typeof Window_StatusBase !== "undefined") {
        const _Window_StatusBase_drawActorFace = Window_StatusBase.prototype.drawActorFace;
        Window_StatusBase.prototype.drawActorFace = function (actor, x, y, width, height) {
            const isHero = actor && (
                (typeof actor.isHero === "function" && actor.isHero()) ||
                (actor.hasNotetag && actor.hasNotetag("Hero")) ||
                (actor.actor && actor.actor() && /<Hero>/i.test(actor.actor().note))
            );
            if (isHero && typeof this.drawDynamicFace === "function") {
                this.drawDynamicFace(actor, x, y, width, height);
            } else if (_Window_StatusBase_drawActorFace) {
                _Window_StatusBase_drawActorFace.call(this, actor, x, y, width, height);
            } else if (typeof this.drawFace === "function") {
                this.drawFace(actor.faceName(), actor.faceIndex(), x, y, width, height);
            }
        };

        const _Window_StatusBase_hideAdditionalSprites = Window_StatusBase.prototype.hideAdditionalSprites;
        Window_StatusBase.prototype.hideAdditionalSprites = function () {
            if (_Window_StatusBase_hideAdditionalSprites) {
                _Window_StatusBase_hideAdditionalSprites.call(this);
            }
            if (this._additionalSprites) {
                for (const sprite of Object.values(this._additionalSprites)) {
                    if (sprite && typeof sprite.hide === "function") {
                        sprite.hide();
                    } else if (sprite) {
                        sprite.visible = false;
                    }
                }
            }
        };
    }

})();
