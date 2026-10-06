//=============================================================================
// Character_Hero.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Contrôleur d'animation et de déplacement pour les personnages Hero.
 * @author SimCraft
 * @help
 * ============================================================================
 * Character_Hero.js
 * ============================================================================
 * Hérite de Game_Character. Sert de contrôleur logique et animateur pour les
 * héros sur la carte (Game_Player, PNJ Hero, événements custom).
 *
 * Gère :
 * - La liaison avec le Game_Hero associé.
 * - Le déplacement 8 directions et le glissement contre les murs.
 * - L'action actuelle (ex: "walk").
 * ============================================================================
 */

/**
 * Contrôleur logique pour un personnage Hero sur la carte.
 */
class Character_Hero extends Game_Character {
    initMembers() {
        super.initMembers();
        this._heroActorId = 0;
    }

    /**
     * Associe ce personnage à un acteur Hero via son ID.
     * @param {number} actorId 
     */
    setHeroActorId(actorId) {
        this._heroActorId = actorId;
    }

    /**
     * Récupère le Game_Hero associé.
     * @returns {Game_Hero|null}
     */
    hero() {
        return window.$heroHub ? window.$heroHub.get(this._heroActorId) : null;
    }

    /**
     * @returns {boolean}
     */
    isHero() {
        return Boolean(this.hero());
    }

    /**
     * Déclenche l'action d'attaque en déléguant au moteur d'actions centralisé.
     * @param {number} [direction] Direction vers laquelle attaquer.
     * @returns {boolean}
     */
    performAttack(direction) {
        return this.playAction({ action: "atk", direction: direction });
    }
}

window.Character_Hero = Character_Hero;
