//=============================================================================
// SimCraft 4 - Game_Relations
// SC4_Game_Relations.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Registre global des relations entre acteurs ($gameRelations).
 * @author SimCraft
 * @help SC4_Game_Relations.js
 * 
 * Registre global des relations indexé par clé normalisée d'acteurs (id_min_id_max).
 * Entièrement prêt pour la V2 (relations PNJ-PNJ) tout en fournissant les helpers
 * dédiés au joueur pour la V1.
 */

class Game_Relations {
    constructor() {
        this._data = {};
    }

    /**
     * Génère la clé canonique unique ordonnée
     * @param {number} id1 
     * @param {number} id2 
     * @returns {string} Ex: "1_4"
     */
    static makeKey(id1, id2) {
        const num1 = Number(id1) || 0;
        const num2 = Number(id2) || 0;
        const min = Math.min(num1, num2);
        const max = Math.max(num1, num2);
        return `${min}_${max}`;
    }

    /**
     * Récupère ou instancie la relation entre deux acteurs
     * @param {number} id1 
     * @param {number} id2 
     * @returns {Game_Relation|null}
     */
    relation(id1, id2) {
        const num1 = Number(id1) || 0;
        const num2 = Number(id2) || 0;
        if (num1 <= 0 || num2 <= 0 || num1 === num2) return null;

        const key = Game_Relations.makeKey(num1, num2);
        if (!this._data[key]) {
            this._data[key] = new Game_Relation({
                actorId1: Math.min(num1, num2),
                actorId2: Math.max(num1, num2)
            });
        }
        return this._data[key];
    }

    /**
     * Vérifie si une relation a déjà été enregistrée
     * @param {number} id1 
     * @param {number} id2 
     * @returns {boolean}
     */
    hasRelation(id1, id2) {
        const key = Game_Relations.makeKey(id1, id2);
        return !!this._data[key];
    }

    /**
     * Helper d'accès direct à la relation entre le joueur et un acteur PNJ
     * @param {number} targetActorId 
     * @returns {Game_Relation|null}
     */
    relationWithPlayer(targetActorId) {
        const playerId = (typeof $gameParty !== "undefined" && $gameParty && $gameParty.leader())
            ? $gameParty.leader().actorId()
            : 1;
        return this.relation(playerId, targetActorId);
    }

    /**
     * Retourne toutes les relations enregistrées
     * @returns {Game_Relation[]}
     */
    all() {
        return Object.values(this._data);
    }

    /**
     * Exporte les données pour la sauvegarde RMMZ
     * @returns {object}
     */
    makeSavefileData() {
        const result = {};
        for (const [key, rel] of Object.entries(this._data)) {
            if (rel && typeof rel.makeSavefileData === "function") {
                result[key] = rel.makeSavefileData();
            }
        }
        return result;
    }

    /**
     * Restaure les données depuis la sauvegarde RMMZ
     * @param {object} data 
     */
    loadSavefileData(data) {
        this._data = {};
        if (!data || typeof data !== "object") return;
        for (const [key, relData] of Object.entries(data)) {
            if (relData) {
                this._data[key] = new Game_Relation(relData);
            }
        }
    }
}

if (typeof module !== "undefined") {
    module.exports = Game_Relations;
}
