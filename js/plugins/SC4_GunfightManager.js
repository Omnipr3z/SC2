//=============================================================================
// RPG Maker MZ - SC4_GunfightManager
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Gestionnaire statique d'analyse des armes à distance et balistique (GunfightManager).
 * @author SimCraft
 * 
 * @help SC4_GunfightManager.js
 * 
 * Module GunfightManager :
 * - Parsing et mise en cache des statistiques d'armes via notetags.
 * - Statistiques de repli au corps-à-corps (defaultMeleeStats).
 * - Lecture des bruitages de tir, rechargement et percuteur à sec (playSe).
 */

class GunfightManager {
    /**
     * Extrait et met en cache les statistiques de combat à distance d'une arme.
     * @param {object} weapon Objet d'arme RMMZ ($dataWeapons[id])
     * @returns {object} Statistiques complètes du Gunfight
     */
    static parseWeaponStats(weapon) {
        if (!weapon) {
            return this.defaultMeleeStats();
        }
        if (weapon._gunfightStats) {
            return weapon._gunfightStats;
        }

        const note = weapon.note || "";

        const cleanVal = (val) => {
            if (!val) return "";
            return String(val).replace(/^[\[\s]+|[\]\s]+$/g, "").trim();
        };

        const parseTag = (tag, defaultVal = null) => {
            const regex = new RegExp(`<${tag}:\\s*([^>]+)>`, "i");
            const match = note.match(regex);
            return match ? cleanVal(match[1]) : defaultVal;
        };

        const hasTag = (tag) => {
            const regex = new RegExp(`<${tag}(?::|>|\\s)`, "i");
            return regex.test(note);
        };

        const parseAudioTag = (tag) => {
            const raw = parseTag(tag);
            if (!raw) return null;
            const parts = raw.split(",").map(p => cleanVal(p));
            return {
                name: parts[0] || "",
                volume: parts[1] ? parseInt(parts[1], 10) : 90,
                pitch: parts[2] ? parseInt(parts[2], 10) : 100
            };
        };

        // 1. Portée (range)
        const rawRange = parseTag("range");
        let range = 0;
        if (rawRange !== null && rawRange !== "" && rawRange !== "false") {
            range = Math.max(0, parseFloat(rawRange) || 0);
        }

        // 2. Skill d'impact
        const rawSkill = parseTag("skillId");
        const skillId = rawSkill ? (parseInt(rawSkill, 10) || 1) : 1;

        // 3. Cadence de tir (rate of fire)
        const rawRof = parseTag("rateOfFire");
        const rateOfFire = rawRof ? Math.max(1, parseInt(rawRof, 10)) : 20;

        // 4. Flags de tir
        const heavy = hasTag("heavy");
        const snipe = hasTag("snipe");
        const burst = hasTag("burst");
        const specialAnim = parseTag("specialAnim", null);

        // 5. Audio de tir
        const shootSe = parseAudioTag("shootSe");

        // 6. Système de reload
        const rawReload = parseTag("reload");
        const reload = (rawReload !== null && rawReload.toLowerCase() === "true") || hasTag("reload");
        const rawReloadAction = parseTag("reloadAction", null);
        const reloadAction = rawReloadAction || specialAnim;
        const rawReloadMove = parseTag("reloadMove");
        const reloadMove = rawReloadMove !== null ? (rawReloadMove.toLowerCase() === "true") : false;

        const rawAmmoId = parseTag("ammoId");
        const ammoId = (rawAmmoId && rawAmmoId !== "false") ? parseInt(rawAmmoId, 10) : 0;

        const rawAmmoCap = parseTag("ammoCap");
        const ammoCap = rawAmmoCap ? Math.max(1, parseInt(rawAmmoCap, 10)) : 6;

        const rawReloadMode = parseTag("reloadMode", "total");
        const reloadMode = rawReloadMode.toLowerCase() === "1by1" ? "1by1" : "total";

        const rawRechargeTime = parseTag("rechargeTime");
        const rechargeTime = rawRechargeTime ? Math.max(1, parseInt(rawRechargeTime, 10)) : 60;

        const reloadSe = parseAudioTag("reloadSe");
        const outOfAmmo = parseAudioTag("outOfAmmo");
        const emptySe = parseAudioTag("emptySe");

        // 7. Balistique du projectile
        const projectileImg = parseTag("projectileImg", null);
        const rawProjSpeed = parseTag("projectileSpeed");
        const projectileSpeed = rawProjSpeed ? Math.max(1, parseFloat(rawProjSpeed)) : 16;

        const stats = {
            id: weapon.id,
            name: weapon.name || "Arme",
            iconIndex: weapon.iconIndex || 0,
            range: range,
            isRanged: range > 0,
            skillId: skillId,
            rateOfFire: rateOfFire,
            specialAnim: specialAnim,
            heavy: heavy,
            snipe: snipe,
            burst: burst,
            shootSe: shootSe,
            reload: reload,
            reloadAction: reloadAction,
            reloadMove: reloadMove,
            ammoId: ammoId,
            ammoCap: ammoCap,
            reloadMode: reloadMode,
            rechargeTime: rechargeTime,
            reloadSe: reloadSe,
            outOfAmmo: outOfAmmo,
            emptySe: emptySe,
            projectileImg: projectileImg,
            projectileSpeed: projectileSpeed
        };

        weapon._gunfightStats = stats;
        DEBUGTOOL.log(`📋 Notetags analysés pour "${stats.name}" (ID ${stats.id}) : Portée=${stats.range}, Cadence=${stats.rateOfFire}, Burst=${stats.burst}, Heavy=${stats.heavy}, Snipe=${stats.snipe}, Reload=${stats.reload} (Mode=${stats.reloadMode}, Cap=${stats.ammoCap}, ItemMunition=${stats.ammoId})`, "gunfight");
        return stats;
    }

    /**
     * Statistiques par défaut pour le combat au corps-à-corps / mains nues.
     */
    static defaultMeleeStats() {
        return {
            id: 0,
            name: "Mains nues",
            iconIndex: 16,
            range: 0,
            isRanged: false,
            skillId: 1,
            rateOfFire: 20,
            specialAnim: null,
            heavy: false,
            snipe: false,
            burst: false,
            shootSe: null,
            reload: false,
            reloadAction: null,
            reloadMove: false,
            ammoId: 0,
            ammoCap: 0,
            reloadMode: "total",
            rechargeTime: 0,
            reloadSe: null,
            outOfAmmo: null,
            emptySe: null,
            projectileImg: null,
            projectileSpeed: 16
        };
    }

    /**
     * Joue un effet sonore défini par { name, volume, pitch }.
     * @param {{ name: string, volume: number, pitch: number }} seConfig 
     */
    static playSe(seConfig) {
        if (!seConfig || !seConfig.name) return;
        AudioManager.playSe({
            name: seConfig.name,
            volume: Number(seConfig.volume) || 90,
            pitch: Number(seConfig.pitch) || 100,
            pan: 0
        });
    }
}

window.GunfightManager = GunfightManager;
if (typeof module !== "undefined" && module.exports) {
    module.exports = GunfightManager;
}

