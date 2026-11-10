//=============================================================================
// SC4_Game_ScActorCombat.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Sous-composant de combat et balistique pour Game_ScActor.
 * @author SimCraft
 * @help
 * ============================================================================
 * Game_ScActorCombat.js
 * ============================================================================
 * Composant délégué gérant le profil de combat d'un acteur :
 * - Arme de gunfight active et parsing des statistiques d'armement.
 * - Suivi des munitions chargées dans le chargeur par arme.
 * - Réserve de munitions disponible dans le groupe ($gameParty) ou l'inventaire.
 * - Configuration d'attaque visuelle (<visual_attack>...).
 * - Cible active (_target) et profil d'IA tactique (_aiType).
 * ============================================================================
 */

const _scActorCombatMap = new WeakMap();

class Game_ScActorCombat {
    /**
     * @param {Game_ScActor} actor Acteur parent
     */
    constructor(actor) {
        this.setActor(actor);
        this._weaponAmmo = {};
        Object.defineProperty(this, "_target", {
            value: null,
            writable: true,
            configurable: true,
            enumerable: false
        });
        this._aiType = (actor && actor.meta) ? actor.meta("ai", null) : null;
        this._cooldowns = {};
    }

    /**
     * Définit ou ré-associe l'acteur parent sans créer de référence circulaire énumérable.
     * @param {Game_ScActor|number} actor 
     */
    setActor(actor) {
        this._actorId = (typeof actor === "number") ? actor : (actor && typeof actor.actorId === "function" ? actor.actorId() : 0);
        if (actor && typeof actor === "object") {
            _scActorCombatMap.set(this, actor);
        }
    }

    /**
     * @returns {Game_ScActor} Acteur parent
     */
    actor() {
        const mapped = _scActorCombatMap.get(this);
        if (mapped) return mapped;
        if (this._actorId && typeof $gameActors !== "undefined" && $gameActors && typeof $gameActors.actor === "function") {
            return $gameActors.actor(this._actorId);
        }
        return null;
    }

    // ========================================================================
    // CIBLE TACTIQUE & IA
    // ========================================================================

    /**
     * Cible active de combat (Game_Character ou Game_Battler).
     * @returns {object|null}
     */
    target() {
        return this._target;
    }

    /**
     * Définit la cible active sans référence circulaire énumérable.
     * @param {object|null} targetEntity 
     */
    setTarget(targetEntity) {
        Object.defineProperty(this, "_target", {
            value: targetEntity || null,
            writable: true,
            configurable: true,
            enumerable: false
        });
    }

    /**
     * Profil ou type d'IA assigné à cet acteur (ex: "melee", "range", "boss").
     * @returns {string|null}
     */
    aiType() {
        return this._aiType;
    }

    /**
     * Modifie le type d'IA tactique.
     * @param {string|null} type 
     */
    setAiType(type) {
        this._aiType = type ? String(type).trim().toLowerCase() : null;
    }

    // ========================================================================
    // ARMEMENTS & MUNITIONS
    // ========================================================================

    /**
     * Arme principale équipée utilisée pour le gunfight.
     * @returns {object|null}
     */
    gunfightWeapon() {
        const a = this.actor();
        const weapons = (a && typeof a.weapons === "function") ? a.weapons() : [];
        return weapons[0] || null;
    }

    /**
     * Statistiques d'arme parsées via GunfightManager.
     * @returns {object|null}
     */
    gunfightStats() {
        const weapon = this.gunfightWeapon();
        if (typeof GunfightManager !== "undefined" && GunfightManager && typeof GunfightManager.parseWeaponStats === "function") {
            return GunfightManager.parseWeaponStats(weapon);
        }
        return null;
    }

    /**
     * Munitions actuellement engagées dans le chargeur de l'arme.
     * @param {object|null} weapon 
     * @returns {number} Nombre de balles restantes (-1 si non rechargeable)
     */
    getLoadedAmmo(weapon = null) {
        const wp = weapon || this.gunfightWeapon();
        if (!wp) return -1;

        const stats = (typeof GunfightManager !== "undefined" && GunfightManager && typeof GunfightManager.parseWeaponStats === "function")
            ? GunfightManager.parseWeaponStats(wp)
            : null;

        if (!stats || !stats.reload) return -1;

        this._weaponAmmo = this._weaponAmmo || {};
        if (this._weaponAmmo[wp.id] === undefined) {
            this._weaponAmmo[wp.id] = stats.ammoCap;
        }
        return this._weaponAmmo[wp.id];
    }

    /**
     * Fixe le nombre de munitions chargées pour l'arme.
     * @param {object} weapon 
     * @param {number} count 
     */
    setLoadedAmmo(weapon, count) {
        const wp = weapon || this.gunfightWeapon();
        if (!wp) return;

        const stats = (typeof GunfightManager !== "undefined" && GunfightManager && typeof GunfightManager.parseWeaponStats === "function")
            ? GunfightManager.parseWeaponStats(wp)
            : null;

        const cap = stats ? stats.ammoCap : 999;
        this._weaponAmmo = this._weaponAmmo || {};
        this._weaponAmmo[wp.id] = Math.max(0, Math.min(cap, count));
    }

    /**
     * Consomme des munitions du chargeur.
     * @param {object} weapon 
     * @param {number} count 
     */
    consumeLoadedAmmo(weapon, count = 1) {
        const current = this.getLoadedAmmo(weapon);
        if (current > 0) {
            this.setLoadedAmmo(weapon, current - count);
        }
    }

    /**
     * Calcule la réserve de munitions disponible dans l'inventaire du groupe (ou du sac).
     * @param {object|null} weapon 
     * @returns {number}
     */
    getReserveAmmo(weapon = null) {
        const wp = weapon || this.gunfightWeapon();
        if (!wp) return 0;

        const stats = (typeof GunfightManager !== "undefined" && GunfightManager && typeof GunfightManager.parseWeaponStats === "function")
            ? GunfightManager.parseWeaponStats(wp)
            : null;

        if (!stats || !stats.reload) return 999;
        if (!stats.ammoId || stats.ammoId <= 0) return 999;

        // 1. Vérification dans l'inventaire de groupe vanilla
        if (typeof $gameParty !== "undefined" && $gameParty && typeof $dataItems !== "undefined") {
            const item = $dataItems[stats.ammoId];
            if (item) {
                const partyCount = $gameParty.numItems(item);
                if (partyCount > 0) return partyCount;
            }
        }

        // 2. Repli sur l'inventaire personnel secondaire de l'acteur
        const a = this.actor();
        if (a && a.hasInventory && a.hasInventory() && typeof $dataItems !== "undefined") {
            const item = $dataItems[stats.ammoId];
            if (item) {
                return a.inventory.numItems(item);
            }
        }

        return 0;
    }

    /**
     * Identifiant de la compétence d'attaque de l'acteur (<attackId: X>).
     * @returns {number}
     */
    attackSkillId() {
        const a = this.actor();
        if (a && typeof a.meta === "function") {
            const val = a.meta("attackid");
            if (val !== null) return Number(val);
        }
        const actorData = (a && typeof a.actor === "function") ? a.actor() : null;
        if (actorData && actorData.note) {
            const match = actorData.note.match(/<attackId:\s*(\d+)>/i);
            if (match) {
                return Number(match[1]);
            }
        }
        return 1;
    }

    /**
     * Indique si l'acteur ne possède aucune arme équipée.
     * @returns {boolean}
     */
    hasNoWeapons() {
        const a = this.actor();
        const w = (a && typeof a.weapons === "function") ? a.weapons() : [];
        return w.filter(Boolean).length === 0;
    }

    /**
     * Récupère la configuration d'attaque visuelle (nom d'action, frames, durée).
     * Priorité : 1. Compétence d'attaque (<visual_attack>)
     *            2. Arme équipée (<visual_attack> ou <specialAnim: ...>)
     *            3. Notetag de l'acteur
     * @param {number} [skillId] ID optionnel de la compétence d'attaque
     * @returns {{ actionName: string, frames: number, duration: number }}
     */
    getAttackConfig(skillId = null) {
        let note = "";

        // 1. Détermination de la compétence d'attaque (priorité absolue)
        let targetSkillId = skillId;
        if (!targetSkillId) {
            targetSkillId = this.attackSkillId();
        }
        if (!targetSkillId) targetSkillId = 1;

        // 2. Recherche prioritaire dans les notes de la compétence
        if (typeof $dataSkills !== "undefined" && $dataSkills && $dataSkills[targetSkillId]) {
            const skill = $dataSkills[targetSkillId];
            if (skill && skill.note && /<visual_attack>/i.test(skill.note)) {
                note = skill.note;
            }
        }

        // 3. Repli sur l'arme équipée
        if (!note) {
            const weapon = this.gunfightWeapon();
            if (weapon && weapon.note && /<visual_attack>/i.test(weapon.note)) {
                note = weapon.note;
            }
        }

        // 4. Repli sur les notes de l'acteur
        if (!note) {
            const a = this.actor();
            const actorData = (a && typeof a.actor === "function") ? a.actor() : null;
            if (actorData && actorData.note && /<visual_attack>/i.test(actorData.note)) {
                note = actorData.note;
            }
        }

        let actionName = "atk";
        let frames = 4;
        let duration = 4;

        if (note) {
            const blockMatch = note.match(/<visual_attack>([\s\S]*?)<\/visual_attack>/i);
            const content = blockMatch ? blockMatch[1] : note;

            const nameMatch = content.match(/<action_name>([^<]+)<\/action_name>/i);
            if (nameMatch) actionName = nameMatch[1].trim();

            const framesMatch = content.match(/<frames>(\d+)<\/frames>/i);
            if (framesMatch) frames = parseInt(framesMatch[1], 10);

            const durationMatch = content.match(/<duration>(\d+)<\/duration>/i);
            if (durationMatch) duration = parseInt(durationMatch[1], 10);
        } else {
            const weapon = this.gunfightWeapon();
            if (weapon && weapon.note) {
                const matchAnim = weapon.note.match(/<specialAnim:\s*([^>]+)>/i);
                if (matchAnim) {
                    actionName = `shot_${matchAnim[1].trim()}`;
                }
            }
        }

        return {
            actionName: actionName || "atk",
            frames: frames || 4,
            duration: duration || 4
        };
    }
    /**
     * Sérialisation whitelistée (déléguée depuis Game_ScActor).
     * @returns {object}
     */
    makeSavefileData() {
        return {
            weaponAmmo: Object.assign({}, this._weaponAmmo),
            aiType: this._aiType,
            cooldowns: Object.assign({}, this._cooldowns)
        };
    }

    /**
     * Désérialisation ciblée de l'état de combat.
     * @param {object} data 
     */
    loadSavefileData(data) {
        if (!data || typeof data !== "object") return;
        if (data.weaponAmmo) {
            this._weaponAmmo = Object.assign({}, data.weaponAmmo);
        }
        if (data.aiType !== undefined) {
            this._aiType = data.aiType;
        }
        if (data.cooldowns) {
            this._cooldowns = Object.assign({}, data.cooldowns);
        }
    }
}

if (typeof window !== "undefined") {
    window.Game_ScActorCombat = Game_ScActorCombat;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game_ScActorCombat;
}
