//=============================================================================
// Hub_Hero.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Hub central d'accès et d'association pour les entités Hero.
 * @author SimCraft
 * @help
 * ============================================================================
 * Hub_Hero.js
 * ============================================================================
 * Fournit une instance globale $heroHub (Hub_Hero) qui sert de point d'accès
 * unique pour enregistrer et retrouver les instances de Game_Hero associées
 * aux acteurs du jeu.
 * ============================================================================
 */

/**
 * Hub central de gestion des héros de SC4.
 */
class Hub_Hero {
    constructor() {
        this._heroes = new Map(); // actorId -> Game_Hero
    }

    /**
     * Enregistre une instance de Game_Hero pour un ID d'acteur.
     * @param {number} actorId 
     * @param {Game_Hero} hero 
     */
    register(actorId, hero) {
        this._heroes.set(actorId, hero);
    }

    /**
     * Récupère le Game_Hero associé à un actorId.
     * @param {number} actorId 
     * @returns {Game_Hero|null}
     */
    get(actorId) {
        return this._heroes.get(actorId) || null;
    }

    /**
     * Raccourci vers le héros du joueur (leader du groupe).
     * @returns {Game_Hero|null}
     */
    playerHero() {
        const leader = (typeof $gameParty !== "undefined" && $gameParty) ? $gameParty.leader() : null;
        return (leader && leader.isHero && leader.isHero()) ? leader : null;
    }

    /**
     * Raccourci vers les héros des followers dans l'équipe.
     * @returns {Game_Hero[]}
     */
    followersHeroes() {
        if (typeof $gamePlayer === "undefined" || !$gamePlayer || !$gamePlayer.followers) return [];
        return $gamePlayer.followers().data()
            .map(f => (f && f.hero ? f.hero() : null))
            .filter(Boolean);
    }

    /**
     * Raccourci vers tous les héros présents dans l'équipe de combat (leader + followers).
     * @returns {Game_Hero[]}
     */
    partyHeroes() {
        const heroes = [];
        const leader = this.playerHero();
        if (leader) heroes.push(leader);
        return heroes.concat(this.followersHeroes());
    }

    /**
     * Trouve le personnage actif sur la carte (Game_Player, Game_Follower ou Game_Event)
     * incarnant un acteur :
     * 1. Le joueur si l'acteur est leader de l'équipe
     * 2. Le suiveur (Game_Follower) si l'acteur est dans l'équipe
     * 3. L'événement (Game_Event) si l'acteur n'est pas dans l'équipe mais possède un event dédié (<actor: ID>)
     * @param {number} actorId 
     * @returns {Game_Character|null}
     */
    findActorCharacter(actorId) {
        if (!actorId) return null;

        // 1. Acteur dans l'équipe
        if (typeof $gameParty !== "undefined" && $gameParty) {
            const leader = $gameParty.leader();
            if (leader && leader.actorId() === actorId) {
                return (typeof $gamePlayer !== "undefined") ? $gamePlayer : null;
            }
            if (typeof $gamePlayer !== "undefined" && $gamePlayer && $gamePlayer.followers) {
                const follower = $gamePlayer.followers().data().find(f => {
                    const a = f.actor();
                    return a && a.actorId() === actorId;
                });
                if (follower) {
                    return follower;
                }
            }
        }

        // 2. Acteur hors équipe : recherche d'un Game_Event avec <actor: actorId>
        if (typeof $gameMap !== "undefined" && $gameMap && $gameMap.events) {
            for (const event of $gameMap.events()) {
                if (event && typeof event.actorId === "function" && event.actorId() === actorId) {
                    return event;
                }
            }
        }

        return null;
    }

    /**
     * Exécute une action sur le personnage lié à l'acteur ou au joueur par défaut.
     * @param {{ actorId?: number, action?: string, duration?: number, frames?: number }} options 
     * @returns {boolean}
     */
    playAction(options = {}) {
        if (typeof options === "string") {
            options = { action: options };
        }
        const actorId = options.actorId || (options.id ? Number(options.id) : 0);
        const target = actorId > 0 ? this.findActorCharacter(actorId) : (typeof $gamePlayer !== "undefined" ? $gamePlayer : null);
        if (target && typeof target.playAction === "function") {
            return target.playAction(options);
        }
        return false;
    }
}

window.Hub_Hero = Hub_Hero;
window.$heroHub = new Hub_Hero();
