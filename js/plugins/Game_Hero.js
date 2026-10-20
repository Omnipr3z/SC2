//=============================================================================
// SC4_Game_Hero.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Classe acteur personnalisée pour les héros (Paperdoll & Notetags).
 * @author SimCraft
 * @help
 * ============================================================================
 * Game_Hero.js
 * ============================================================================
 * Hérite de Game_Actor. Instancié automatiquement pour tout acteur possédant
 * le notetag <Hero> dans la base de données.
 *
 * Gère :
 * - La race : <Race: [RACE]> (ex: Human)
 * - Le sexe : <Sex: [SEX]> (ex: Male)
 * - Le visage composite : <Face>
 * - Les couches d'équipements visuels : <visual_equip: [FILENAME], [zindex]>
 * - La génération de la clé de cache et du Bitmap composite.
 * ============================================================================
 */

/**
 * Représente un héros personnalisé dans SC4 (Paperdoll, custom spritesheet).
 */
class Game_Hero extends Game_Actor {
    setup(actorId) {
        super.setup(actorId);
        this._race = this.parseNotetag("Race", "Human");
        this._sex = this.parseNotetag("Sex", "Male");
        this._hasFace = this.hasNotetag("Face");

        if (typeof window.$heroHub !== "undefined" && window.$heroHub) {
            window.$heroHub.register(actorId, this);
        }

        // Précharge les planches composites indispensables
        this.getCompositeEntry("walk");
        this.getCompositeEntry("run");
        this.getCompositeEntry("atk");
        this.getCompositeEntry("hurt");
        this.getCompositeEntry("down");
    }

    /**
     * Identifie cette entité comme un héros custom.
     * @returns {boolean}
     */
    isHero() {
        return true;
    }

    /**
     * @returns {string} Race de l'acteur (ex: "Human")
     */
    race() {
        return this._race;
    }

    /**
     * @returns {string} Sexe de l'acteur (ex: "Male")
     */
    sex() {
        return this._sex;
    }

    /**
     * Indique si l'acteur utilise une couche de visage composite.
     * @returns {boolean}
     */
    hasFace() {
        return Boolean(this._hasFace);
    }

    /**
     * Recherche une valeur dans les notetags de l'acteur.
     * Format : <Key: Value>
     */
    parseNotetag(key, defaultValue) {
        const actorData = this.actor();
        if (!actorData || !actorData.note) return defaultValue;
        const regex = new RegExp(`<${key}:\\s*([^>]+)>`, "i");
        const match = actorData.note.match(regex);
        return match ? match[1].trim() : defaultValue;
    }

    /**
     * Vérifie la présence d'un flag simple dans les notetags.
     * Format : <Flag>
     */
    hasNotetag(flag) {
        const actorData = this.actor();
        if (!actorData || !actorData.note) return false;
        const regex = new RegExp(`<${flag}>`, "i");
        return regex.test(actorData.note);
    }

    /**
     * Extrait toutes les couches d'équipements visuels équipés par le héros.
     * Lit les notetags <visual_equip: FILENAME, [zindex]> sur chaque équipement.
     * @returns {Array<{ filename: string, zindex: number }>}
     */
    getVisualEquipLayers() {
        const layers = [];
        const equips = this.equips();

        for (const item of equips) {
            if (!item || !item.note) continue;

            const regex = /<visual_equip:\s*([^,>]+)(?:,\s*(\d+))?>/gi;
            let match;
            while ((match = regex.exec(item.note)) !== null) {
                const filename = match[1].trim();
                const zindex = match[2] ? parseInt(match[2], 10) : 55;
                layers.push({ filename, zindex });
            }
        }

        return layers;
    }

    /**
     * Calcule une clé unique de cache représentant l'apparence actuelle du héros.
     * @param {string} action (défaut: "walk")
     * @returns {string}
     */
    getCompositeCacheKey(action = "walk") {
        let act = (action || "walk").toLowerCase();
        if (act === "dash") act = "run";
        if (act.startsWith("dash_")) act = "run_" + act.substring(5);
        const equipIds = this.equips().map(e => e ? e.id : 0).join("-");
        return `${this.actorId()}_${this._race}_${this._sex}_${this._hasFace}_${act}_${equipIds}`;
    }

    /**
     * Récupère l'entrée composite via Bitmap_Composite.
     * @param {string} action (défaut: "walk")
     * @returns {{ bitmap: Bitmap, composer: Bitmap_Composite, isComposed: boolean }}
     */
    getCompositeEntry(action = "walk") {
        return Bitmap_Composite.getCompositeEntry(this, action);
    }

    /**
     * Extrait toutes les couches de portrait faceset d'équipements équipées par le héros.
     * Lit les notetags <face: FILENAME, [zindex], [unisex]> sur chaque équipement.
     * @returns {Array<{ filename: string, zindex: number, unisex: boolean }>}
     */
    getFaceEquipLayers() {
        const layers = [];
        const equips = this.equips ? this.equips() : [];

        for (const item of equips) {
            if (!item || !item.note) continue;

            const regex = /<face:\s*([^,>]+)(?:,\s*(\d+))?(?:,\s*(true|false))?\s*>/gi;
            let match;
            while ((match = regex.exec(item.note)) !== null) {
                const filename = match[1].trim();
                const zindex = match[2] ? parseInt(match[2], 10) : 10;
                const unisex = match[3] ? (match[3].toLowerCase() === "true") : false;
                layers.push({ filename, zindex, unisex });
            }
        }

        return layers;
    }

    /**
     * Calcule une clé unique de cache représentant le visage actuel du héros.
     * @returns {string}
     */
    getCompositeFaceCacheKey() {
        const equipIds = (this.equips ? this.equips() : []).map(e => e ? e.id : 0).join("-");
        return `face_${this.actorId()}_${this._race}_${this._sex}_${equipIds}`;
    }

    /**
     * Récupère l'entrée composite faceset via Bitmap_Composite.
     * @returns {{ bitmap: Bitmap, composer: Bitmap_Composite, isComposed: boolean }}
     */
    getCompositeFaceEntry() {
        return Bitmap_Composite.getCompositeFaceEntry(this);
    }

    /**
     * Récupère la configuration d'attaque de la compétence utilisée, de l'arme ou de l'acteur.
     * Lit les balises XML <visual_attack>...</visual_attack> en priorité dans la compétence d'attaque.
     * @param {number} [skillId] ID optionnel de la compétence d'attaque
     * @returns {{ actionName: string, frames: number, duration: number }}
     */
    getAttackConfig(skillId = null) {
        let note = "";

        // 1. Détermination de la compétence d'attaque (priorité absolue)
        let targetSkillId = skillId;
        if (!targetSkillId) {
            if (typeof this.attackSkillId === "function") {
                targetSkillId = this.attackSkillId();
            } else {
                const actorData = typeof this.actor === "function" ? this.actor() : null;
                if (actorData && actorData.note) {
                    const match = actorData.note.match(/<attackId:\s*(\d+)>/i);
                    if (match) targetSkillId = Number(match[1]);
                }
            }
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
            const weapon = (typeof this.weapons === "function") ? this.weapons()[0] : null;
            if (weapon && weapon.note && /<visual_attack>/i.test(weapon.note)) {
                note = weapon.note;
            }
        }

        // 4. Repli sur les notes de l'acteur (pour rétrocompatibilité)
        if (!note) {
            const actorData = typeof this.actor === "function" ? this.actor() : null;
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
            const weapon = (typeof this.weapons === "function") ? this.weapons()[0] : null;
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
}

window.Game_Hero = Game_Hero;
