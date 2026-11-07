//=============================================================================
// SC4_rmmz_sprites_Patches.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Surcharges et patches des classes natives de rmmz_sprites.js.
 * @author SimCraft
 * @help
 * ============================================================================
 * NORME DES FICHIERS DE PATCHES :
 * - Nom de la Classe en commentaire (ex: // SPRITESET MAP)
 * - Création de tous les alias nécessaires à la classe au début de sa section, suivis d'une ligne vide
 * - Toutes les méthodes de la classe regroupées ensemble (surcharges et ajouts), sans doublons
 * - Ordre des classes identique au fichier natif vanilla
 * - Pas de commentaires superflus en dehors des méthodes (sauf TODO ou note en header)
 * - Règle "Fail Fast" : pas de fallbacks silencieux masquant les bugs
 * ============================================================================
 * Regroupe tous les patches et surcharges apportés aux classes de rmmz_sprites :
 * 
 * 1. Sprite_Character :
 *    - characterPatternY : repli sur les directions cardinales pour les diagonales.
 *    - updateOther : effet visuel de surcharge (flash rouge).
 * 
 * 2. Spriteset_Map :
 *    - createParallax / updateParallax : triple calque parallaxe dynamique en vaisseau (fond, profondeur Stars, planète).
 *    - createCharacterSprite : instancie Sprite_Hero pour les héros et sprites composites.
 *    - createCharacters : création des sprites avec followers().reverseData().
 * ============================================================================
 */

(() => {
    "use strict";

    // SPRITE CHARACTER
    //=============================================================================
    const _Sprite_Character_characterPatternY = Sprite_Character.prototype.characterPatternY;
    const _Sprite_Character_updateOther = Sprite_Character.prototype.updateOther;

    Sprite_Character.prototype.characterPatternY = function () {
        const dir = this._character.direction();
        if ([1, 3, 7, 9].includes(dir)) {
            const fallback = { 1: 2, 3: 2, 7: 8, 9: 8 }[dir] || 2;
            return (fallback - 2) / 2;
        }
        return _Sprite_Character_characterPatternY.call(this);
    };
    Sprite_Character.prototype.updateOther = function () {
        _Sprite_Character_updateOther.call(this);
        if (this._character && this._character._overloadAlertTimer > 0) {
            const alpha = Math.min(220, Math.floor((this._character._overloadAlertTimer / 25) * 220));
            this.setBlendColor([255, 30, 30, alpha]);
        }
    };

    // SPRITESET MAP
    //=============================================================================
    const _Spriteset_Map_createParallax = Spriteset_Map.prototype.createParallax;
    const _Spriteset_Map_updateParallax = Spriteset_Map.prototype.updateParallax;

    Spriteset_Map.prototype.createParallax = function () {
        _Spriteset_Map_createParallax.call(this);
        this.createSpaceParallaxLayers();
    };
    Spriteset_Map.prototype.createSpaceParallaxLayers = function () {
        this._parallaxDepthLayer = new TilingSprite();
        this._parallaxDepthLayer.move(0, 0, Graphics.width, Graphics.height);
        this._parallaxDepthLayer.bitmap = ImageManager.loadParallax("Stars");
        this._parallaxDepthLayer.visible = false;
        this._baseSprite.addChild(this._parallaxDepthLayer);

        this._parallaxUpperLayer = new Sprite_ParallaxesUpperLayer();
        this._baseSprite.addChild(this._parallaxUpperLayer);
    };
    Spriteset_Map.prototype.updateParallax = function () {
        if ($gameMap.isSpaceShip()) {
            this.updateSpaceshipParallaxes();
        } else {
            _Spriteset_Map_updateParallax.call(this);
            if (this._parallaxDepthLayer) {
                this._parallaxDepthLayer.visible = false;
            }
            if (this._parallaxUpperLayer) {
                this._parallaxUpperLayer.visible = false;
            }
        }
    };
    Spriteset_Map.prototype.updateSpaceshipParallaxes = function () {
        const status = SpaceParallaxesManager.getParallaxesStatus($gameMap.spaceShipId());
        if (!status) return;

        if (this._parallaxName !== status.lower.name) {
            this._parallaxName = status.lower.name;
            this._parallax.bitmap = ImageManager.loadParallax(this._parallaxName);
        }
        if (this._parallax.bitmap) {
            if (status.lower.sx !== 0) {
                this._parallax.origin.x += status.lower.sx;
            }
            if (status.lower.sy !== 0) {
                this._parallax.origin.y += status.lower.sy;
            }
        }

        if (this._parallaxDepthLayer && status.mid) {
            this._parallaxDepthLayer.visible = Boolean(status.mid.visible);
            if (this._parallaxDepthLayer.visible && this._parallaxDepthLayer.bitmap) {
                if (status.mid.sx !== 0) {
                    this._parallaxDepthLayer.origin.x += status.mid.sx;
                }
                if (status.mid.sy !== 0) {
                    this._parallaxDepthLayer.origin.y += status.mid.sy;
                }
            }
        }

        if (this._parallaxUpperLayer) {
            this._parallaxUpperLayer.updateState(status.upper);
        }
    };
    Spriteset_Map.prototype.createCharacterSprite = function (character) {
        if (character instanceof Game_Player ||
            character instanceof Game_Follower ||
            character instanceof Game_Event ||
            (character && character.isHero && character.isHero())) {
            return new Sprite_Hero(character);
        }
        return new Sprite_Character(character);
    };
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

})();
