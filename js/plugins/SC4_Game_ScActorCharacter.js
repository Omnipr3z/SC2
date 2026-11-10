//=============================================================================
// SC4_Game_ScActorCharacter.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Sous-composant d'incarnation physique et graphique sur carte pour Game_ScActor.
 * @author SimCraft
 * @help
 * ============================================================================
 * Game_ScActorCharacter.js
 * ============================================================================
 * Composant délégué gérant l'incarnation physique et visuelle d'un acteur sur la carte :
 * - Liaison avec l'entité cartographique concrète ($gamePlayer, Game_Follower, Game_Event).
 * - Spécificités de rendu Paperdoll (Race, Sexe, Visage, caches et bitmaps composites).
 * - Coordonnées, postures et synchronisation d'apparence.
 *
 * Ce composant n'est chargé (lazy-load) que pour les acteurs manifestés sur carte.
 * Les factions, IAs de vaisseau ou contacts distants n'en possèdent pas (null).
 * ============================================================================
 */

const _scActorCharacterMap = new WeakMap();

class Game_ScActorCharacter {
    /**
     * @param {Game_ScActor} actor Acteur parent
     */
    constructor(actor) {
        this.setActor(actor);
        Object.defineProperty(this, "_entity", {
            value: null,
            writable: true,
            configurable: true,
            enumerable: false
        });

        // Métadonnées d'apparence
        this._race = (actor && actor.meta) ? actor.meta("race", "Human") : "Human";
        this._sex = (actor && actor.meta) ? actor.meta("sex", "Male") : "Male";
        this._hasFace = (actor && actor.hasMeta) ? actor.hasMeta("face") : false;

        this._pose = null;
        this._poseOptions = {};
    }

    /**
     * Définit ou ré-associe l'acteur parent sans créer de référence circulaire énumérable.
     * @param {Game_ScActor|number} actor 
     */
    setActor(actor) {
        this._actorId = (typeof actor === "number") ? actor : (actor && typeof actor.actorId === "function" ? actor.actorId() : 0);
        if (actor && typeof actor === "object") {
            _scActorCharacterMap.set(this, actor);
        }
    }

    /**
     * @returns {Game_ScActor} Acteur parent
     */
    actor() {
        const mapped = _scActorCharacterMap.get(this);
        if (mapped) return mapped;
        if (this._actorId && typeof $gameActors !== "undefined" && $gameActors && typeof $gameActors.actor === "function") {
            return $gameActors.actor(this._actorId);
        }
        return null;
    }

    // ========================================================================
    // LIAISON AVEC L'ENTITÉ CARTOGRAPHIQUE CONCRÈTE (GAME_CHARACTER)
    // ========================================================================

    /**
     * Associe cet acteur à son entité physique sur la carte sans référence circulaire énumérable.
     * @param {Game_Character} characterEntity 
     */
    bindEntity(characterEntity) {
        Object.defineProperty(this, "_entity", {
            value: characterEntity || null,
            writable: true,
            configurable: true,
            enumerable: false
        });
    }

    /**
     * Dissocie l'acteur de son entité physique (ex: lors d'un déchargement de carte).
     */
    unbindEntity() {
        this._entity = null;
    }

    /**
     * @returns {Game_Character|null}
     */
    entity() {
        return this._entity;
    }

    /**
     * Indique si l'acteur est actuellement incarné physiquement sur la carte active.
     * @returns {boolean}
     */
    isSpawned() {
        return Boolean(this._entity);
    }

    // ========================================================================
    // COORDONNÉES & DIRECTIONS RAPIDES (Délégation à l'entité si liée)
    // ========================================================================

    x() {
        return this._entity ? this._entity.x : 0;
    }

    y() {
        return this._entity ? this._entity.y : 0;
    }

    direction() {
        return this._entity ? this._entity.direction() : 2;
    }

    screenX() {
        return this._entity ? this._entity.screenX() : 0;
    }

    screenY() {
        return this._entity ? this._entity.screenY() : 0;
    }

    // ========================================================================
    // PROPRIÉTÉS PAPERDOLL (RACE, SEXE, VISAGE)
    // ========================================================================

    race() {
        return this._race;
    }

    setRace(val) {
        this._race = String(val);
        const a = this.actor();
        if (a && typeof a.setMeta === "function") {
            a.setMeta("race", this._race);
        }
    }

    sex() {
        return this._sex;
    }

    setSex(val) {
        this._sex = String(val);
        const a = this.actor();
        if (a && typeof a.setMeta === "function") {
            a.setMeta("sex", this._sex);
        }
    }

    hasFace() {
        return Boolean(this._hasFace);
    }

    setHasFace(val) {
        this._hasFace = Boolean(val);
        const a = this.actor();
        if (a && typeof a.setMeta === "function") {
            a.setMeta("face", this._hasFace);
        }
    }

    // ========================================================================
    // COMPOSITE PAPERDOLL & CACHE VISUEL
    // ========================================================================

    /**
     * Calcule la clé de cache composite représentant l'apparence corporelle sur carte.
     * @param {string} [action="walk"]
     * @returns {string}
     */
    getCompositeCacheKey(action = "walk") {
        let act = (action || "walk").toLowerCase();
        if (act === "dash") act = "run";
        if (act.startsWith("dash_")) act = "run_" + act.substring(5);
        const a = this.actor();
        const equips = (a && typeof a.equips === "function") ? a.equips() : [];
        const equipIds = equips.map(e => e ? e.id : 0).join("-");
        const aId = (a && typeof a.actorId === "function") ? a.actorId() : this._actorId;
        return `${aId}_${this._race}_${this._sex}_${this._hasFace}_${act}_${equipIds}`;
    }

    /**
     * Récupère l'entrée composite via Bitmap_Composite.
     * @param {string} [action="walk"]
     * @returns {{ bitmap: Bitmap, composer: Bitmap_Composite, isComposed: boolean }|null}
     */
    getCompositeEntry(action = "walk") {
        const a = this.actor();
        if (a && typeof Bitmap_Composite !== "undefined" && typeof Bitmap_Composite.getCompositeEntry === "function") {
            return Bitmap_Composite.getCompositeEntry(a, action);
        }
        return null;
    }

    /**
     * Calcule la clé de cache composite représentant le portrait faceset.
     * @returns {string}
     */
    getCompositeFaceCacheKey() {
        const a = this.actor();
        const equips = (a && typeof a.equips === "function") ? a.equips() : [];
        const equipIds = equips.map(e => e ? e.id : 0).join("-");
        const aId = (a && typeof a.actorId === "function") ? a.actorId() : this._actorId;
        return `face_${aId}_${this._race}_${this._sex}_${equipIds}`;
    }

    /**
     * Récupère l'entrée composite faceset via Bitmap_Composite.
     * @returns {{ bitmap: Bitmap, composer: Bitmap_Composite, isComposed: boolean }|null}
     */
    getCompositeFaceEntry() {
        const a = this.actor();
        if (a && typeof Bitmap_Composite !== "undefined" && typeof Bitmap_Composite.getCompositeFaceEntry === "function") {
            return Bitmap_Composite.getCompositeFaceEntry(a);
        }
        return null;
    }

    // ========================================================================
    // POSTURES & POSES
    // ========================================================================

    setPose(poseName, options = {}) {
        this._pose = poseName || null;
        this._poseOptions = options || {};
        if (this._entity && typeof this._entity.setPose === "function") {
            this._entity.setPose(poseName, options);
        }
    }

    clearPose() {
        this._pose = null;
        this._poseOptions = {};
        if (this._entity && typeof this._entity.clearPose === "function") {
            this._entity.clearPose();
        }
    }

    pose() {
        return this._pose;
    }

    isPoseActive() {
        return Boolean(this._pose);
    }
    /**
     * Sérialisation whitelistée (déléguée depuis Game_ScActor).
     * @returns {object}
     */
    makeSavefileData() {
        return {
            race: this._race,
            sex: this._sex,
            hasFace: this._hasFace,
            pose: this._pose,
            poseOptions: Object.assign({}, this._poseOptions)
        };
    }

    /**
     * Désérialisation ciblée des données physiques / paperdoll.
     * @param {object} data 
     */
    loadSavefileData(data) {
        if (!data || typeof data !== "object") return;
        if (data.race !== undefined) this._race = data.race;
        if (data.sex !== undefined) this._sex = data.sex;
        if (data.hasFace !== undefined) this._hasFace = Boolean(data.hasFace);
        if (data.pose !== undefined) this._pose = data.pose;
        if (data.poseOptions) this._poseOptions = Object.assign({}, data.poseOptions);
    }
}

if (typeof window !== "undefined") {
    window.Game_ScActorCharacter = Game_ScActorCharacter;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game_ScActorCharacter;
}

