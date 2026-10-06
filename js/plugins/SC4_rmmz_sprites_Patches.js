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
    Sprite_Character.prototype.characterPatternY = function() {
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
    Spriteset_Map.prototype.createCharacterSprite = function(character) {
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
    Spriteset_Map.prototype.createCharacters = function() {
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
