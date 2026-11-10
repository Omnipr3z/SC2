//=============================================================================
// SC4_Game_ScActorLocation.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Sous-composant de localisation spatiale pour Game_ScActor.
 * @author SimCraft
 * @help
 * ============================================================================
 * Game_ScActorLocation.js
 * ============================================================================
 * Composant délégué gérant l'ancrage spatial et hiérarchique d'un acteur :
 * - Coordonnées galactiques : Secteur, Système planétaire, Astre/Planète, POI.
 * - Synchronisation avec la position du groupe ($gameGalaxy) si l'acteur est présent.
 * ============================================================================
 */

const _scActorLocationMap = new WeakMap();

class Game_ScActorLocation {
    /**
     * @param {Game_ScActor} actor Acteur parent
     */
    constructor(actor) {
        this.setActor(actor);
        this._sectorId = null;
        this._systemId = null;
        this._planetId = null;
        this._poiId = null;
    }

    /**
     * Définit ou ré-associe l'acteur parent sans créer de référence circulaire énumérable.
     * @param {Game_ScActor|number} actor 
     */
    setActor(actor) {
        this._actorId = (typeof actor === "number") ? actor : (actor && typeof actor.actorId === "function" ? actor.actorId() : 0);
        if (actor && typeof actor === "object") {
            _scActorLocationMap.set(this, actor);
        }
    }

    /**
     * @returns {Game_ScActor} Acteur parent
     */
    actor() {
        const mapped = _scActorLocationMap.get(this);
        if (mapped) return mapped;
        if (this._actorId && typeof $gameActors !== "undefined" && $gameActors && typeof $gameActors.actor === "function") {
            return $gameActors.actor(this._actorId);
        }
        return null;
    }

    /**
     * Indique si l'acteur fait actuellement partie de l'équipe active.
     * @returns {boolean}
     */
    isInParty() {
        if (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.members === "function") {
            const a = this.actor();
            return a ? $gameParty.members().includes(a) : false;
        }
        return false;
    }

    /**
     * Identifiant du secteur spatial où se situe l'acteur.
     * @returns {number}
     */
    sectorId() {
        if (this._sectorId !== null) return this._sectorId;
        if (typeof $gameGalaxy !== "undefined" && $gameGalaxy && typeof $gameGalaxy.currentSectorId === "function") {
            return $gameGalaxy.currentSectorId();
        }
        return 1;
    }

    /**
     * Identifiant du système planétaire où se situe l'acteur.
     * @returns {number}
     */
    systemId() {
        if (this._systemId !== null) return this._systemId;
        if (typeof $gameGalaxy !== "undefined" && $gameGalaxy && typeof $gameGalaxy.currentSystemId === "function") {
            return $gameGalaxy.currentSystemId();
        }
        return 1;
    }

    /**
     * Identifiant de la planète ou de l'astre où se situe l'acteur.
     * @returns {number|null}
     */
    planetId() {
        if (this._planetId !== null) return this._planetId;
        if (typeof $gameGalaxy !== "undefined" && $gameGalaxy && typeof $gameGalaxy.currentPlanetId === "function") {
            return $gameGalaxy.currentPlanetId();
        }
        return null;
    }

    /**
     * Identifiant du point d'intérêt (POI) où se situe l'acteur.
     * @returns {number|null}
     */
    poiId() {
        if (this._poiId !== null) return this._poiId;
        if (typeof $gameGalaxy !== "undefined" && $gameGalaxy && typeof $gameGalaxy.currentPOIId === "function") {
            return $gameGalaxy.currentPOIId();
        }
        return null;
    }

    /**
     * Définit explicitement une localisation pour cet acteur (décrochage du groupe).
     * @param {number} sectorId 
     * @param {number} systemId 
     * @param {number|null} planetId 
     * @param {number|null} poiId 
     */
    setLocation(sectorId, systemId, planetId = null, poiId = null) {
        this._sectorId = Number(sectorId) || 1;
        this._systemId = Number(systemId) || 1;
        this._planetId = planetId ? Number(planetId) : null;
        this._poiId = poiId ? Number(poiId) : null;
    }

    /**
     * Supprime la localisation explicite et se synchronise de nouveau avec $gameGalaxy.
     */
    clearExplicitLocation() {
        this._sectorId = null;
        this._systemId = null;
        this._planetId = null;
        this._poiId = null;
    }

    /**
     * Résumé complet des coordonnées spatiales de l'acteur.
     * @returns {{ sectorId: number, systemId: number, planetId: number|null, poiId: number|null }}
     */
    summary() {
        return {
            sectorId: this.sectorId(),
            systemId: this.systemId(),
            planetId: this.planetId(),
            poiId: this.poiId()
        };
    }

    /**
     * Sérialisation whitelistée (déléguée depuis Game_ScActor).
     * @returns {object}
     */
    makeSavefileData() {
        return {
            sectorId: this._sectorId,
            systemId: this._systemId,
            planetId: this._planetId,
            poiId: this._poiId
        };
    }

    /**
     * Désérialisation ciblée de la localisation.
     * @param {object} data 
     */
    loadSavefileData(data) {
        if (!data || typeof data !== "object") return;
        this._sectorId = data.sectorId !== undefined ? data.sectorId : null;
        this._systemId = data.systemId !== undefined ? data.systemId : null;
        this._planetId = data.planetId !== undefined ? data.planetId : null;
        this._poiId = data.poiId !== undefined ? data.poiId : null;
    }
}

if (typeof window !== "undefined") {
    window.Game_ScActorLocation = Game_ScActorLocation;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game_ScActorLocation;
}

