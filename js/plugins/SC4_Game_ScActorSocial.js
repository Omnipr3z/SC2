//=============================================================================
// SC4_Game_ScActorSocial.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Sous-composant social, relations et allégeance pour Game_ScActor.
 * @author SimCraft
 * @help
 * ============================================================================
 * Game_ScActorSocial.js
 * ============================================================================
 * Composant délégué gérant le profil social d'un acteur :
 * - Allégeance de faction (<factionId: X>) et accès à l'entité Faction ($gameFactions).
 * - Registre local des opinions / appréciations portées par les autres acteurs (_opinions).
 * - Intégration rétrocompatible avec le registre global $gameRelations.
 * ============================================================================
 */

const _scActorSocialMap = new WeakMap();

class Game_ScActorSocial {
    /**
     * @param {Game_ScActor} actor Acteur parent
     */
    constructor(actor) {
        this.setActor(actor);
        this._factionId = undefined;
        this._opinions = {}; // { [interlocutorId]: Game_Relation }
    }

    /**
     * Définit ou ré-associe l'acteur parent sans créer de référence circulaire énumérable.
     * @param {Game_ScActor|number} actor 
     */
    setActor(actor) {
        this._actorId = (typeof actor === "number") ? actor : (actor && typeof actor.actorId === "function" ? actor.actorId() : 0);
        if (actor && typeof actor === "object") {
            _scActorSocialMap.set(this, actor);
        }
    }

    /**
     * @returns {Game_ScActor} Acteur parent
     */
    actor() {
        const mapped = _scActorSocialMap.get(this);
        if (mapped) return mapped;
        if (this._actorId && typeof $gameActors !== "undefined" && $gameActors && typeof $gameActors.actor === "function") {
            return $gameActors.actor(this._actorId);
        }
        return null;
    }

    /**
     * Identifiant de faction de l'acteur (notetag <factionId: X> par défaut).
     * @returns {number|null} ID numérique ou null
     */
    factionId() {
        if (this._factionId === undefined) {
            let id = 0;
            const a = this.actor();
            if (a && typeof a.meta === "function") {
                const metaId = a.meta("factionid");
                if (metaId !== null) id = Number(metaId);
            }
            if (!id && a) {
                const actorData = (typeof a.actor === "function") ? a.actor() : null;
                if (actorData && actorData.note) {
                    const match = actorData.note.match(/<factionId:\s*(\d+)\s*>/i);
                    if (match) id = Number(match[1]);
                }
            }
            this._factionId = id > 0 ? id : null;
        }
        return this._factionId;
    }

    /**
     * Modifie l'allégeance de faction de l'acteur.
     * @param {number|null} factionId 
     */
    setFactionId(factionId) {
        const id = Number(factionId) || 0;
        this._factionId = id > 0 ? id : null;
        const a = this.actor();
        if (a && typeof a.setMeta === "function") {
            a.setMeta("factionid", this._factionId);
        }
    }

    /**
     * Instance de faction associée via le registre global $gameFactions.
     * @returns {Game_Faction|null}
     */
    faction() {
        if (typeof $gameFactions !== "undefined" && $gameFactions && typeof $gameFactions.faction === "function") {
            return $gameFactions.faction(this.factionId());
        }
        return null;
    }

    /**
     * Récupère ou instancie la relation représentant le sentiment / l'opinion d'un
     * interlocuteur envers cet acteur.
     * @param {number} actorId ID de l'autre acteur
     * @returns {Game_Relation|null}
     */
    opinionOf(actorId) {
        const id = Number(actorId) || 0;
        const myActorId = this._actorId || (this.actor() ? this.actor().actorId() : 0);
        if (id <= 0 || id === myActorId) return null;

        if (!this._opinions[id]) {
            if (typeof Game_Relation !== "undefined") {
                this._opinions[id] = new Game_Relation({
                    actorId1: myActorId,
                    actorId2: id
                });
            } else if (typeof $gameRelations !== "undefined" && $gameRelations && typeof $gameRelations.relation === "function") {
                this._opinions[id] = $gameRelations.relation(myActorId, id);
            }
        }
        return this._opinions[id] || null;
    }

    /**
     * Liste de toutes les opinions enregistrées envers cet acteur.
     * @returns {Array<Game_Relation>}
     */
    allOpinions() {
        return Object.values(this._opinions);
    }

    /**
     * Récupère la relation avec un autre acteur via le registre global $gameRelations
     * (ou via le registre local d'opinions).
     * @param {number} targetActorId 
     * @returns {Game_Relation|null}
     */
    relationWith(targetActorId) {
        const myActorId = this._actorId || (this.actor() ? this.actor().actorId() : 0);
        if (typeof $gameRelations !== "undefined" && $gameRelations && typeof $gameRelations.getRelation === "function") {
            return $gameRelations.getRelation(myActorId, targetActorId);
        }
        return this.opinionOf(targetActorId);
    }

    /**
     * Sérialisation whitelistée (déléguée depuis Game_ScActor).
     * @returns {object}
     */
    makeSavefileData() {
        const opinions = {};
        for (const [k, v] of Object.entries(this._opinions)) {
            if (v && typeof v.makeSavefileData === "function") {
                opinions[k] = v.makeSavefileData();
            } else if (v) {
                opinions[k] = {
                    actor1Id: v.actor1Id,
                    actor2Id: v.actor2Id,
                    affinity: v.affinity,
                    trust: v.trust
                };
            }
        }
        return {
            factionId: this._factionId,
            opinions: opinions
        };
    }

    /**
     * Désérialisation ciblée des relations et opinions sociales.
     * @param {object} data 
     */
    loadSavefileData(data) {
        if (!data || typeof data !== "object") return;
        if (data.factionId !== undefined) {
            this._factionId = data.factionId;
        }
        if (data.opinions) {
            this._opinions = {};
            for (const [k, opData] of Object.entries(data.opinions)) {
                if (typeof Game_Relation !== "undefined") {
                    const rel = new Game_Relation(opData);
                    if (typeof rel.loadSavefileData === "function") {
                        rel.loadSavefileData(opData);
                    }
                    this._opinions[k] = rel;
                } else {
                    this._opinions[k] = opData;
                }
            }
        }
    }
}

if (typeof window !== "undefined") {
    window.Game_ScActorSocial = Game_ScActorSocial;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game_ScActorSocial;
}
