//=============================================================================
// SC4_Game_Hero.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v2.0.0] Alias de rétrocompatibilité : Game_Hero unifié dans Game_ScActor.
 * @author SimCraft
 * @help
 * ============================================================================
 * Game_Hero.js
 * ============================================================================
 * Dans SC4 Niveau 2, Game_Hero a été entièrement absorbé dans Game_ScActor.
 * Cette classe hérite directement de Game_ScActor pour garantir une rétrocompatibilité
 * totale avec l'existant.
 * ============================================================================
 */

const ScActorBase = (typeof Game_ScActor !== "undefined") ? Game_ScActor : (typeof Game_Actor !== "undefined" ? Game_Actor : Object);
class Game_Hero extends ScActorBase {}

if (typeof window !== "undefined") {
    window.Game_Hero = Game_Hero;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game_Hero;
}
