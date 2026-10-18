//=============================================================================
// SC4_Gunfight.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Système d'armes à feu, balistique, rechargement et HUD d'arme (Gunfight).
 * @author SimCraft
 * @help
 * ============================================================================
 * SC4_Gunfight.js
 * ============================================================================
 * Implémente le système de combat à distance et d'armes à feu pour SimCraft 4 :
 *
 * 1. Statistiques des armes via notetags :
 *    <skillId: NUMBER>          : Compétence RMMZ exécutée à l'impact
 *    <range: VALUE>             : Portée en cases (absent/0/false = corps-à-corps)
 *    <rateOfFire: NUMBER>       : Délai minimum en frames entre chaque tir
 *    <specialAnim: NAME>        : Pose/locomotion custom [race]_[sex]_guard_[Name]
 *    <heavy>                    : Ne peut pas bouger et tirer en même temps
 *    <snipe>                    : Ne peut pas viser (clic droit) et bouger
 *    <burst>                    : Tir automatique continu au clic gauche maintenu
 *    <shootSe: FILENAME, V, P>  : Bruitage de détonation/tir
 *
 * 2. Système de rechargement (Touche R) :
 *    <reload: true/false>       : Active le système de munitions et de recharge
 *    <reloadAction: NAME>       : Animations _reload_[NAME] et _walkreload_[NAME]
 *    <reloadMove: true/false>   : Autorise ou interdit de marcher en rechargeant
 *    <ammoId: ID_ITEM>          : Item consommé dans l'inventaire
 *    <ammoCap: NUMBER>          : Capacité maximale du chargeur
 *    <reloadMode: 1by1|total>   : Rechargement balle par balle (maintien R) ou complet
 *    <rechargeTime: NUMBER>     : Durée en frames (par balle ou chargeur complet)
 *    <reloadSe: FILENAME, V, P> : Son joué à chaque balle/chargeur chargé
 *    <outOfAmmo: FILENAME, V, P>: Son au tir à sec (chargeur vide)
 *    <emptySe: FILENAME, V, P>  : Son au rechargement sans munitions dans l'inventaire
 *
 * 3. Balistique et Projectiles :
 *    <projectileImg: NAME>      : Nom du sprite dans composite/projectiles/
 *    <projectileSpeed: NUMBER>  : Vitesse de déplacement en px/frame (défaut: 16)
 *    - Raycast et déplacement continu en 8 directions.
 *    - Traversée des zones d'eau (lacs, rivières, océans) même bloquantes à pied.
 *    - Collision avec les obstacles infranchissables solides (murs, falaises).
 *    - Détection d'impact sur les événements ennemis et résolution de dégâts.
 *
 * 4. HUD d'arme en bas à droite :
 *    - Affiche l'icône et le nom de l'arme équipée.
 *    - Affiche les munitions chargées et la réserve d'inventaire.
 *    - Alerte visuelle rouge/clignotante à chargeur vide ou faible.
 * ============================================================================
 */

(function () {
    "use strict";

    if (typeof DEBUGTOOL === "undefined") {
        if (typeof window !== "undefined" && window.DEBUGTOOL) {
            globalThis.DEBUGTOOL = window.DEBUGTOOL;
        } else {
            globalThis.DEBUGTOOL = {
                log: (msg, key) => console.log(`[${(key || "DEBUG").toUpperCase()}] ${msg}`)
            };
        }
    }

    // ========================================================================
    // 1. Module GunfightManager : Parsing et Utilitaires
    // ========================================================================
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
            if (typeof AudioManager !== "undefined" && AudioManager.playSe) {
                AudioManager.playSe({
                    name: seConfig.name,
                    volume: Number(seConfig.volume) || 90,
                    pitch: Number(seConfig.pitch) || 100,
                    pan: 0
                });
            }
        }
    }

    window.GunfightManager = GunfightManager;

    // ========================================================================
    // 2. Extensions Game_Map : Détection des zones d'eau
    // ========================================================================
    if (typeof Game_Map !== "undefined") {
        /**
         * Détermine si une case (x, y) est une surface d'eau (franchissable par les balles).
         * @param {number} x
         * @param {number} y
         * @returns {boolean}
         */
        const _Game_Map_isWater = Game_Map.prototype.isWater;
        Game_Map.prototype.isWater = function (x, y) {
            if (_Game_Map_isWater && _Game_Map_isWater.call(this, x, y)) return true;
            if (!this.isValid(x, y)) return false;

            // 1. Passage bateau ou navire natif RMMZ
            if (typeof this.isBoatPassable === "function" && this.isBoatPassable(x, y)) return true;
            if (typeof this.isShipPassable === "function" && this.isShipPassable(x, y)) return true;

            // 2. Drapeaux 0x0200 (bateau) et 0x0400 (navire)
            if (typeof this.checkPassage === "function") {
                if (this.checkPassage(x, y, 0x0200) || this.checkPassage(x, y, 0x0400)) {
                    return true;
                }
            }

            // 3. Détection des tuiles d'eau A1 via Tilemap
            if (typeof Tilemap !== "undefined" && typeof this.layeredTiles === "function") {
                const tiles = this.layeredTiles(x, y);
                for (const tileId of tiles) {
                    if (typeof Tilemap.isWaterTile === "function" && Tilemap.isWaterTile(tileId)) {
                        return true;
                    }
                    if (typeof Tilemap.isWaterfallTile === "function" && Tilemap.isWaterfallTile(tileId)) {
                        return true;
                    }
                }
            }

            return false;
        };
    }

    // ========================================================================
    // 3. Extensions Game_Actor : Persistance des Munitions par Arme
    // ========================================================================
    const _Game_Actor_setup = Game_Actor.prototype.setup;
    Game_Actor.prototype.setup = function (actorId) {
        _Game_Actor_setup.call(this, actorId);
        this._weaponAmmo = this._weaponAmmo || {};
    };

    /**
     * Retourne l'arme principale actuellement équipée (slot 0).
     * @returns {object|null}
     */
    Game_Actor.prototype.gunfightWeapon = function () {
        const weapons = (typeof this.weapons === "function") ? this.weapons() : [];
        return weapons[0] || null;
    };

    /**
     * Retourne les statistiques de Gunfight pour l'arme principale équipée.
     * @returns {object}
     */
    Game_Actor.prototype.gunfightStats = function () {
        const weapon = this.gunfightWeapon();
        return GunfightManager.parseWeaponStats(weapon);
    };

    /**
     * Retourne le nombre de munitions chargées pour l'arme donnée (ou arme active).
     * Le chargeur est plein par défaut lors du premier équipement de l'arme.
     * @param {object} [weapon]
     * @returns {number}
     */
    Game_Actor.prototype.getLoadedAmmo = function (weapon = null) {
        const wp = weapon || this.gunfightWeapon();
        if (!wp) return -1;
        const stats = GunfightManager.parseWeaponStats(wp);
        if (!stats.reload) return -1;

        this._weaponAmmo = this._weaponAmmo || {};
        if (this._weaponAmmo[wp.id] === undefined) {
            // Chargeur plein par défaut au premier équipement
            this._weaponAmmo[wp.id] = stats.ammoCap;
        }
        return this._weaponAmmo[wp.id];
    };

    /**
     * Met à jour le nombre de munitions chargées pour une arme.
     * @param {object} weapon
     * @param {number} count
     */
    Game_Actor.prototype.setLoadedAmmo = function (weapon, count) {
        const wp = weapon || this.gunfightWeapon();
        if (!wp) return;
        const stats = GunfightManager.parseWeaponStats(wp);
        this._weaponAmmo = this._weaponAmmo || {};
        this._weaponAmmo[wp.id] = Math.max(0, Math.min(stats.ammoCap, count));
    };

    /**
     * Consomme une ou plusieurs munitions du chargeur.
     * @param {object} weapon
     * @param {number} [count=1]
     */
    Game_Actor.prototype.consumeLoadedAmmo = function (weapon, count = 1) {
        const current = this.getLoadedAmmo(weapon);
        if (current > 0) {
            this.setLoadedAmmo(weapon, current - count);
        }
    };

    /**
     * Retourne le stock de munitions en réserve dans l'inventaire du groupe.
     * @param {object} [weapon]
     * @returns {number}
     */
    Game_Actor.prototype.getReserveAmmo = function (weapon = null) {
        const wp = weapon || this.gunfightWeapon();
        if (!wp) return 0;
        const stats = GunfightManager.parseWeaponStats(wp);
        if (!stats.reload) return 999;
        if (!stats.ammoId || stats.ammoId <= 0) return 999; // Munitions infinies si aucun item requis

        if (typeof $gameParty !== "undefined" && $gameParty && typeof $dataItems !== "undefined") {
            const item = $dataItems[stats.ammoId];
            return item ? $gameParty.numItems(item) : 0;
        }
        return 0;
    };

    // ========================================================================
    // 4. Classe Game_Projectile : Entité balistique
    // ========================================================================
    class Game_Projectile {
        /**
         * @param {object} options
         */
        constructor(options = {}) {
            this.attacker = options.attacker || null;
            this.startX = options.x !== undefined ? options.x : 0;
            this.startY = options.y !== undefined ? options.y : 0;
            this.realX = options.realX !== undefined ? options.realX : this.startX;
            this.realY = options.realY !== undefined ? options.realY : this.startY;
            this.direction = options.direction || 2;
            this.range = options.range !== undefined ? options.range : 10;
            this.speed = options.speed !== undefined ? options.speed : 16; // px/frame
            this.image = options.image || null;
            this.skillId = options.skillId || 1;

            this.traveledTiles = 0;
            this.isAlive = true;

            // Calcul du vecteur unitaire selon les 8 directions
            this.setupVector();
        }

        setupVector() {
            let dx = 0;
            let dy = 0;
            switch (this.direction) {
                case 2: dy = 1; break; // Bas
                case 4: dx = -1; break; // Gauche
                case 6: dx = 1; break; // Droite
                case 8: dy = -1; break; // Haut
                case 1: dx = -0.7071; dy = 0.7071; break; // Bas-Gauche
                case 3: dx = 0.7071; dy = 0.7071; break; // Bas-Droite
                case 7: dx = -0.7071; dy = -0.7071; break; // Haut-Gauche
                case 9: dx = 0.7071; dy = -0.7071; break; // Haut-Droite
                default: dy = 1; break;
            }

            this.angle = Math.atan2(dy, dx);
            const distPerFrame = this.speed / 48; // Conversion px -> cases de 48px
            this.vx = dx * distPerFrame;
            this.vy = dy * distPerFrame;
            this.stepDistance = distPerFrame;
        }

        /**
         * Mise à jour de la trajectoire, détection de collision et d'impact.
         */
        update() {
            if (!this.isAlive) return;

            const prevTileX = Math.round(this.realX);
            const prevTileY = Math.round(this.realY);

            this.realX += this.vx;
            this.realY += this.vy;
            this.traveledTiles += this.stepDistance;

            const curTileX = Math.round(this.realX);
            const curTileY = Math.round(this.realY);

            // 1. Dépassement de la portée maximale
            if (this.traveledTiles >= this.range) {
                DEBUGTOOL.log(`💨 Projectile dissipé : portée maximale atteinte (${this.range} cases)`, "gunfight");
                this.destroy();
                return;
            }

            // 2. Collision avec obstacle / mur de la carte (l'eau est survolée librement)
            if (typeof $gameMap !== "undefined" && $gameMap) {
                if (!$gameMap.isValid(curTileX, curTileY)) {
                    DEBUGTOOL.log(`🧱 Projectile sorti des limites de la carte en (${curTileX}, ${curTileY})`, "gunfight");
                    this.destroy();
                    return;
                }

                // Si transition vers une nouvelle tuile, vérifier la franchissabilité
                if (curTileX !== prevTileX || curTileY !== prevTileY) {
                    if (typeof $gameMap.isPassable === "function") {
                        const canLeave = $gameMap.isPassable(prevTileX, prevTileY, this.direction);
                        const canEnter = $gameMap.isPassable(curTileX, curTileY, 10 - this.direction);
                        if (!canLeave || !canEnter) {
                            // Vérifie si la case est de l'eau (franchissable par les balles)
                            const isWaterDest = typeof $gameMap.isWater === "function" && $gameMap.isWater(curTileX, curTileY);
                            const isWaterOrigin = typeof $gameMap.isWater === "function" && $gameMap.isWater(prevTileX, prevTileY);

                            if (isWaterDest || isWaterOrigin) {
                                DEBUGTOOL.log(`🌊 Projectile survole l'eau en (${curTileX}, ${curTileY})`, "gunfight");
                            } else {
                                DEBUGTOOL.log(`🧱 Projectile arrêté net par un mur/obstacle solide en (${curTileX}, ${curTileY})`, "gunfight");
                                this.destroy();
                                return;
                            }
                        }
                    }
                }
            }

            // 3. Détection d'impact sur un ennemi hostile
            if (window.$fightManager && typeof window.$fightManager.findHostileTargetAt === "function") {
                const target = window.$fightManager.findHostileTargetAt(curTileX, curTileY, this.realX, this.realY);
                if (target) {
                    const evId = target.eventId ? target.eventId() : (target._eventId || 0);
                    DEBUGTOOL.log(`🎯 Impact projectile sur ennemi #${evId} en (${curTileX}, ${curTileY}) avec skill ID ${this.skillId} !`, "gunfight");
                    window.$fightManager.executeAttack(this.attacker, target, this.skillId);
                    this.destroy();
                    return;
                }
            }
        }

        destroy() {
            this.isAlive = false;
        }

        screenX() {
            if (typeof $gameMap === "undefined" || !$gameMap) return 0;
            const tw = $gameMap.tileWidth ? $gameMap.tileWidth() : 48;
            return Math.round($gameMap.adjustX(this.realX) * tw + tw / 2);
        }

        screenY() {
            if (typeof $gameMap === "undefined" || !$gameMap) return 0;
            const th = $gameMap.tileHeight ? $gameMap.tileHeight() : 48;
            return Math.round($gameMap.adjustY(this.realY) * th + th / 2) + this.offsetY();
        }

        /**
         * Décalage vertical en pixels pour aligner visuellement le projectile avec l'arme du sprite.
         * Directions :
         * - Latérales (4, 6) & diagonales haut (7, 9) : -26px
         * - Diagonales bas (1, 3) : -36px
         * - Verticales (2, 8) : 0px
         * @returns {number}
         */
        offsetY() {
            switch (this.direction) {
                case 4: // Gauche (latérale)
                case 6: // Droite (latérale)
                    return -30;
                case 7: // Haut-Gauche (diagonale)
                case 9: // Haut-Droite (diagonale)
                    return -20;
                case 1: // Bas-Gauche (diagonale)
                case 3: // Bas-Droite (diagonale)
                    return -38;
                case 2: // Bas (verticale)
                    return 24;
                case 8: // Haut (verticale)
                default:
                    return 0;
            }
        }

        /**
         * Distance totale parcourue en pixels.
         * @returns {number}
         */
        traveledPixels() {
            const tw = (typeof $gameMap !== "undefined" && $gameMap && $gameMap.tileWidth) ? $gameMap.tileWidth() : 48;
            return this.traveledTiles * tw;
        }

        /**
         * Z-index écran du projectile.
         * Inférieur au Z-index standard des personnages (z=3 pour les héros et ennemis normaux),
         * pour s'afficher en-dessous du sprite du personnage.
         * @returns {number}
         */
        screenZ() {
            return 2;
        }
    }

    window.Game_Projectile = Game_Projectile;

    // ========================================================================
    // 5. Classe Sprite_Projectile : Affichage graphique du projectile
    // ========================================================================
    const Sprite_Base = (typeof Sprite !== "undefined") ? Sprite : class { };

    class Sprite_Projectile extends Sprite_Base {
        constructor(projectile) {
            super();
            this._projectile = projectile;
            this.anchor = (this.anchor && typeof this.anchor.set === "function") ? this.anchor : { set: () => { } };
            this.anchor.set(0.5, 0.5);
            this.z = (projectile && typeof projectile.screenZ === "function") ? projectile.screenZ() : 2;
            this.rotation = projectile ? projectile.angle : 0;
            this.loadBitmap();
            this.updatePosition();
            this.updateOpacity();
        }

        loadBitmap() {
            if (!this._projectile) return;
            const imgName = this._projectile.image;
            if (imgName && typeof Bitmap_Composite !== "undefined" && typeof ImageManager !== "undefined") {
                if (Bitmap_Composite.fileExists("img/characters/composite/projectiles/", imgName)) {
                    this.bitmap = ImageManager.loadBitmap("img/characters/composite/projectiles/", imgName);
                } else {
                    this.bitmap = ImageManager.loadBitmap("img/characters/composite/projectile/", imgName);
                }
            } else if (typeof Bitmap !== "undefined") {
                // Traceur lumineux par défaut si aucun sprite n'est spécifié
                const bmp = new Bitmap(16, 6);
                const ctx = bmp.context;
                if (ctx) {
                    const grad = ctx.createLinearGradient(0, 0, 16, 0);
                    grad.addColorStop(0, "rgba(255, 200, 50, 0)");
                    grad.addColorStop(0.7, "rgba(255, 240, 150, 1)");
                    grad.addColorStop(1, "rgba(255, 255, 255, 1)");
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, 1, 16, 4);
                }
                this.bitmap = bmp;
            }
        }

        update() {
            if (typeof super.update === "function") {
                super.update();
            }
            if (this._projectile && this._projectile.isAlive) {
                this.updatePosition();
                this.updateOpacity();
            } else {
                this.visible = false;
                if (this.parent && typeof this.parent.removeChild === "function") {
                    this.parent.removeChild(this);
                }
            }
        }

        /**
         * Met à jour la transparence pour un fondu progressif sur les 64 premiers pixels de déplacement.
         */
        updateOpacity() {
            if (!this._projectile) return;
            const FADE_DISTANCE = 180; // Fondu sur les 64 premiers pixels
            const traveledPx = (typeof this._projectile.traveledPixels === "function")
                ? this._projectile.traveledPixels()
                : (this._projectile.traveledTiles * 48);
            if (traveledPx < FADE_DISTANCE) {
                this.opacity = Math.min(255, Math.max(0, Math.round((traveledPx / FADE_DISTANCE) * 255)));
            } else {
                this.opacity = 255;
            }
        }

        offsetY() {
            return (this._projectile && typeof this._projectile.offsetY === "function")
                ? this._projectile.offsetY()
                : 0;
        }

        updatePosition() {
            if (!this._projectile) return;
            this.x = this._projectile.screenX();
            this.y = this._projectile.screenY();
            this.z = (typeof this._projectile.screenZ === "function") ? this._projectile.screenZ() : 2;
        }
    }

    window.Sprite_Projectile = Sprite_Projectile;

    // ========================================================================
    // 6. Intégration FightManager : Gestionnaire des Projectiles
    // ========================================================================
    if (typeof FightManager !== "undefined") {
        FightManager.prototype.spawnProjectile = function (options) {
            this._projectiles = this._projectiles || [];
            const proj = new Game_Projectile(options);
            this._projectiles.push(proj);
            return proj;
        };

        FightManager.prototype.projectiles = function () {
            this._projectiles = this._projectiles || [];
            return this._projectiles;
        };

        FightManager.prototype.updateProjectiles = function () {
            if (!this._projectiles || this._projectiles.length === 0) return;
            for (let i = this._projectiles.length - 1; i >= 0; i--) {
                const proj = this._projectiles[i];
                proj.update();
                if (!proj.isAlive) {
                    this._projectiles.splice(i, 1);
                }
            }
        };

        FightManager.prototype.clearProjectiles = function () {
            this._projectiles = [];
        };

        /**
         * Recherche un événement ennemi hostile sur ou à proximité de la case (x, y).
         * @param {number} tileX 
         * @param {number} tileY 
         * @param {number} [realX] 
         * @param {number} [realY] 
         * @returns {Game_Event|null}
         */
        FightManager.prototype.findHostileTargetAt = function (tileX, tileY, realX = null, realY = null) {
            if (typeof $gameMap === "undefined" || !$gameMap) return null;

            const isValidTarget = (ev) => {
                if (!ev || ev._erased) return false;
                const hostile = typeof ev.isHostile === "function" ? ev.isHostile() : false;
                if (!hostile) return false;
                const b = typeof ev.battler === "function" ? ev.battler() : null;
                return b ? !b.isDead() : true;
            };

            // 1. Vérification directe sur la tuile exacte
            const onTile = $gameMap.eventsXy(tileX, tileY).find(isValidTarget);
            if (onTile) return onTile;

            // 2. Si des coordonnées réelles continues sont fournies, détection de hitbox (rayon 0.6)
            if (realX !== null && realY !== null) {
                const events = (typeof this.actorEvents === "function") ? this.actorEvents() : $gameMap.events();
                for (const ev of events) {
                    if (!isValidTarget(ev)) continue;
                    const evX = ev._realX !== undefined ? ev._realX : ev.x;
                    const evY = ev._realY !== undefined ? ev._realY : ev.y;
                    const dist = Math.hypot(evX - realX, evY - realY);
                    if (dist < 0.6) {
                        return ev;
                    }
                }
            }

            return null;
        };

        // Permet de passer un skillId personnalisé à executeAttack
        const _FightManager_executeAttack = FightManager.prototype.executeAttack;
        FightManager.prototype.executeAttack = function (attackerChar, targetEvent, overrideSkillId = null) {
            if (overrideSkillId && attackerChar && typeof attackerChar.actor === "function") {
                const actor = attackerChar.actor() || (attackerChar.hero ? attackerChar.hero() : null);
                if (actor) {
                    const originalAttackSkillId = actor.attackSkillId;
                    actor.attackSkillId = () => overrideSkillId;
                    const result = _FightManager_executeAttack.call(this, attackerChar, targetEvent, overrideSkillId);
                    actor.attackSkillId = originalAttackSkillId;
                    return result;
                }
            }
            return _FightManager_executeAttack.call(this, attackerChar, targetEvent, overrideSkillId);
        };
    }

    // ========================================================================
    // 7. Patches Game_Player : Visée, Tir Coup par Coup, Burst et Reload
    // ========================================================================
    if (typeof Game_Player !== "undefined") {
        // Garantit que le joueur a toujours accès à son acteur leader
        Game_Player.prototype.actor = function () {
            return (typeof $gameParty !== "undefined" && $gameParty) ? $gameParty.leader() : null;
        };

        const _Game_Player_initMembers = Game_Player.prototype.initMembers;
        Game_Player.prototype.initMembers = function () {
            if (_Game_Player_initMembers) {
                _Game_Player_initMembers.call(this);
            }
            this._shootCooldown = 0;
            this._isReloading = false;
            this._reloadTimer = 0;
            this._reloadMode = "";
        };

        Game_Player.prototype.isReloading = function () {
            return Boolean(this._isReloading);
        };

        /**
         * Déclenche ou débute le rechargement de l'arme équipée.
         */
        Game_Player.prototype.startReload = function () {
            const actor = (typeof this.actor === "function" ? this.actor() : null) ||
                (typeof this.hero === "function" ? this.hero() : null) ||
                (typeof $gameParty !== "undefined" && $gameParty ? $gameParty.leader() : null);
            if (!actor) return;
            const weapon = actor.gunfightWeapon();
            const stats = actor.gunfightStats();

            if (!stats.reload) {
                DEBUGTOOL.log(`ℹ️ L'arme "${stats.name}" n'utilise pas de système de recharge.`, "gunfight");
                return;
            }

            const loaded = actor.getLoadedAmmo(weapon);
            if (loaded >= stats.ammoCap) {
                DEBUGTOOL.log(`ℹ️ Chargeur déjà plein (${loaded}/${stats.ammoCap})`, "gunfight");
                return;
            }

            const reserve = actor.getReserveAmmo(weapon);
            if (stats.ammoId > 0 && reserve <= 0) {
                DEBUGTOOL.log(`❌ Recharge impossible : aucune munition en réserve dans l'inventaire (item ID ${stats.ammoId})`, "gunfight");
                GunfightManager.playSe(stats.emptySe);
                return;
            }

            DEBUGTOOL.log(`🔄 Début de la recharge - Mode: ${stats.reloadMode}, Actuel: ${loaded}/${stats.ammoCap}, Réserve: ${reserve}`, "gunfight");
            this._isReloading = true;
            this._reloadTimer = 0;
            this._reloadMode = stats.reloadMode;
        };

        /**
         * Interrompt le rechargement en cours (dégâts reçus ou action).
         */
        Game_Player.prototype.interruptReload = function () {
            if (this._isReloading) {
                DEBUGTOOL.log("⚠️ Rechargement interrompu !", "gunfight");
                this._isReloading = false;
                this._reloadTimer = 0;
            }
        };

        /**
         * Met à jour la progression du rechargement à chaque frame.
         */
        Game_Player.prototype.updateReload = function () {
            if (!this._isReloading) return;
            const actor = (typeof this.actor === "function" ? this.actor() : null) ||
                (typeof this.hero === "function" ? this.hero() : null) ||
                (typeof $gameParty !== "undefined" && $gameParty ? $gameParty.leader() : null);
            if (!actor) {
                this._isReloading = false;
                return;
            }
            const weapon = actor.gunfightWeapon();
            const stats = actor.gunfightStats();

            if (this._reloadMode === "1by1") {
                // En mode 1by1, le joueur doit maintenir R enfoncé
                const rHeld = (typeof Input !== "undefined" && Input.isPressed) ? Input.isPressed("reload") : false;
                if (rHeld) {
                    this._reloadTimer++;
                    if (this._reloadTimer >= stats.rechargeTime) {
                        // Chargement d'une balle
                        if (stats.ammoId > 0 && typeof $gameParty !== "undefined") {
                            $gameParty.loseItem($dataItems[stats.ammoId], 1);
                        }
                        const cur = actor.getLoadedAmmo(weapon);
                        const next = cur + 1;
                        actor.setLoadedAmmo(weapon, next);
                        GunfightManager.playSe(stats.reloadSe);
                        this._reloadTimer = 0;
                        DEBUGTOOL.log(`➕ 1 balle chargée (${next}/${stats.ammoCap}), réserve restante: ${actor.getReserveAmmo(weapon)}`, "gunfight");

                        // Vérifier si le chargeur est plein ou la réserve vide
                        if (next >= stats.ammoCap || actor.getReserveAmmo(weapon) <= 0) {
                            DEBUGTOOL.log(`✅ Recharge 1by1 terminée (Chargeur plein ou réserve épuisée)`, "gunfight");
                            this._isReloading = false;
                        }
                    }
                } else {
                    // R relâché : le rechargement s'interrompt en conservant les balles déjà chargées
                    DEBUGTOOL.log(`⏹️ Touche R relâchée : arrêt de la recharge 1by1. Chargeur conservé à ${actor.getLoadedAmmo(weapon)}/${stats.ammoCap}`, "gunfight");
                    this._isReloading = false;
                    this._reloadTimer = 0;
                }
            } else {
                // En mode total, un simple appui suffit et recharge après rechargeTime frames
                this._reloadTimer++;
                if (this._reloadTimer >= stats.rechargeTime) {
                    if (stats.ammoId > 0 && typeof $gameParty !== "undefined") {
                        $gameParty.loseItem($dataItems[stats.ammoId], 1);
                    }
                    actor.setLoadedAmmo(weapon, stats.ammoCap);
                    GunfightManager.playSe(stats.reloadSe);
                    DEBUGTOOL.log(`✅ Chargeur plein complet rechargé (${stats.ammoCap}/${stats.ammoCap})`, "gunfight");
                    this._isReloading = false;
                    this._reloadTimer = 0;
                }
            }
        };

        // Course (dash) interdite pendant la recharge et la visée
        const _Game_Player_isDashing = Game_Player.prototype.isDashing;
        Game_Player.prototype.isDashing = function () {
            if (this.isReloading()) return false;
            return _Game_Player_isDashing ? _Game_Player_isDashing.call(this) : false;
        };

        // Animation pas à pas (step anime) active pendant la recharge statique
        const _Game_Player_hasStepAnime = Game_Player.prototype.hasStepAnime;
        Game_Player.prototype.hasStepAnime = function () {
            if (this.isReloading()) return true;
            return _Game_Player_hasStepAnime ? _Game_Player_hasStepAnime.call(this) : (this._stepAnime || false);
        };

        // Résolution de l'action pour les poses et spritesheets composites
        const _Game_Player_action = Game_Player.prototype.action;
        Game_Player.prototype.action = function () {
            if (this.isActing()) {
                return _Game_Player_action ? _Game_Player_action.call(this) : (this._action || "walk");
            }

            const actor = (typeof this.actor === "function" ? this.actor() : null) ||
                (typeof this.hero === "function" ? this.hero() : null) ||
                (typeof $gameParty !== "undefined" && $gameParty ? $gameParty.leader() : null);
            const stats = actor ? actor.gunfightStats() : null;

            // 1. Rechargement en cours
            if (this.isReloading()) {
                const actionName = (stats && (stats.reloadAction || stats.specialAnim)) ? (stats.reloadAction || stats.specialAnim) : "";
                if (this.isMoving()) {
                    return actionName ? `walkreload_${actionName}` : "walkreload";
                }
                return actionName ? `reload_${actionName}` : "reload";
            }

            // 1.5. Maintien de la posture de tir en rafale tant que les deux clics sont maintenus
            if (this.isBurstShooting && this.isBurstShooting()) {
                if (this._lastShootAction) {
                    return this._lastShootAction;
                }
                if (stats && stats.specialAnim) {
                    return `shot_${stats.specialAnim}`;
                }
                return "shot";
            }

            // 2. Posture de visée / garde (clic droit enfoncé)
            if (this.isAiming && this.isAiming()) {
                if (stats && stats.specialAnim) {
                    return `guard_${stats.specialAnim}`;
                }
                return "guard";
            }

            // 3. Locomotion personnalisée avec l'arme équipée (marche / course)
            if (stats && stats.specialAnim) {
                const isDashing = typeof this.isDashing === "function" && this.isDashing();
                const isMoving = typeof this.isMoving === "function" && this.isMoving();
                if (isDashing && isMoving) {
                    return `run_${stats.specialAnim}`;
                }
                return `walk_${stats.specialAnim}`;
            }

            return _Game_Player_action ? _Game_Player_action.call(this) : (this.isDashing() ? "run" : "walk");
        };

        if (typeof Game_Follower !== "undefined") {
            const _Game_Follower_action = Game_Follower.prototype.action;
            Game_Follower.prototype.action = function () {
                if (this.isActing && this.isActing()) {
                    return _Game_Follower_action ? _Game_Follower_action.call(this) : (this._action || "walk");
                }
                const actor = (typeof this.actor === "function" ? this.actor() : null) ||
                    (typeof this.hero === "function" ? this.hero() : null);
                const stats = actor && typeof actor.gunfightStats === "function" ? actor.gunfightStats() : null;
                if (stats && stats.specialAnim) {
                    const isDashing = typeof this.isDashing === "function" && this.isDashing();
                    const isMoving = typeof this.isMoving === "function" && this.isMoving();
                    if (isDashing && isMoving) {
                        return `run_${stats.specialAnim}`;
                    }
                    return `walk_${stats.specialAnim}`;
                }
                return _Game_Follower_action ? _Game_Follower_action.call(this) : (this.isDashing() ? "run" : "walk");
            };
        }

        // Blocage de déplacement si arme <snipe> en visée ou si recharge sans <reloadMove>
        const _Game_Player_moveByInput = Game_Player.prototype.moveByInput;
        Game_Player.prototype.moveByInput = function () {
            const actor = (typeof this.actor === "function" ? this.actor() : null) ||
                (typeof this.hero === "function" ? this.hero() : null) ||
                (typeof $gameParty !== "undefined" && $gameParty ? $gameParty.leader() : null);
            const stats = actor ? actor.gunfightStats() : null;

            if (stats) {
                // Snipe : immobile pendant la visée
                if (stats.snipe && this.isAiming && this.isAiming()) {
                    return;
                }
                // Reload : immobile si reloadMove n'est pas autorisé
                if (this.isReloading() && !stats.reloadMove) {
                    return;
                }
            }

            if (_Game_Player_moveByInput) {
                _Game_Player_moveByInput.call(this);
            }
        };

        /**
         * Déclenche l'attaque du joueur :
         * Si une arme à distance est équipée, bascule directement sur performGunfightShoot.
         * Sinon, conserve l'attaque de contact standard.
         */
        const _Game_Player_performAttack = Game_Player.prototype.performAttack;
        Game_Player.prototype.performAttack = function () {
            const actor = (typeof this.actor === "function" ? this.actor() : null) ||
                (typeof this.hero === "function" ? this.hero() : null) ||
                (typeof $gameParty !== "undefined" && $gameParty ? $gameParty.leader() : null);
            const stats = actor ? actor.gunfightStats() : null;

            if (stats && stats.isRanged) {
                DEBUGTOOL.log(`🎯 performAttack (coup par coup) délégué au tir à distance : "${stats.name}"`, "gunfight");
                return this.performGunfightShoot();
            }

            return _Game_Player_performAttack ? _Game_Player_performAttack.call(this) : false;
        };

        /**
         * Exécute le tir à distance du joueur avec balistique, cooldown et audio.
         */
        Game_Player.prototype.performGunfightShoot = function () {
            const actor = (typeof this.actor === "function" ? this.actor() : null) ||
                (typeof this.hero === "function" ? this.hero() : null) ||
                (typeof $gameParty !== "undefined" && $gameParty ? $gameParty.leader() : null);
            if (!actor) {
                DEBUGTOOL.log("⚠️ Aucun acteur actif trouvé pour effectuer le tir", "gunfight");
                return false;
            }
            const weapon = actor.gunfightWeapon();
            const stats = actor.gunfightStats();

            // S'il s'agit d'une arme de mêlée (range <= 0), repli sur l'attaque standard
            if (!stats.isRanged) {
                return _Game_Player_performAttack ? _Game_Player_performAttack.call(this) : false;
            }

            // Vérifications d'interdiction
            if (this._shootCooldown > 0) {
                DEBUGTOOL.log(`⏳ Tir en cooldown (${this._shootCooldown} frames restantes)`, "gunfight");
                return false;
            }
            if (this.isReloading()) {
                DEBUGTOOL.log("⚠️ Tir impossible : rechargement en cours", "gunfight");
                return false;
            }
            if (stats.heavy && this.isMoving()) {
                DEBUGTOOL.log("⚠️ Tir impossible : arme lourde en mouvement", "gunfight");
                return false;
            }

            // Arrêt immédiat de la destination
            if (typeof $gameTemp !== "undefined" && $gameTemp.clearDestination) {
                $gameTemp.clearDestination();
            }

            // Vérification des munitions
            if (stats.reload) {
                const loaded = actor.getLoadedAmmo(weapon);
                if (loaded <= 0) {
                    if (typeof $gameTemp !== "undefined" && $gameTemp.clearDestination) {
                        $gameTemp.clearDestination();
                    }
                    this._lastShootAction = null;
                    DEBUGTOOL.log(`⚠️ Tir à sec ! Chargeur vide (0/${stats.ammoCap})`, "gunfight");
                    GunfightManager.playSe(stats.outOfAmmo);
                    if (typeof ConfigManager !== "undefined" && ConfigManager.autoReload) {
                        DEBUGTOOL.log("💡 Option B (Recharge auto) : déclenchement automatique", "gunfight");
                        this.startReload();
                    }
                    return false;
                }
                actor.consumeLoadedAmmo(weapon, 1);
                DEBUGTOOL.log(`💥 Pan ! Balle consommée. Reste ${actor.getLoadedAmmo(weapon)}/${stats.ammoCap}`, "gunfight");
            } else {
                DEBUGTOOL.log(`💥 Pan ! Tir sans munition requise (${stats.name})`, "gunfight");
            }

            // Réinitialisation du délai entre chaque tir
            this._shootCooldown = stats.rateOfFire;

            // Bruitage de détonation
            GunfightManager.playSe(stats.shootSe);

            // Orientation vers la cible
            const aimDir = this.aimDirection ? this.aimDirection() : this.direction();
            this.setDirection(aimDir);

            // Déclenchement de l'action d'animation d'attaque (<visual_attack> de la compétence ou arme)
            this.playAction({
                skillId: stats.skillId,
                direction: aimDir,
                skipMelee: true
            });
            this._lastShootAction = this._action;

            if (typeof this.adjustCenterScroll === "function") {
                this.adjustCenterScroll();
            }

            // Création et projection de la balle / projectile
            if (window.$fightManager && typeof window.$fightManager.spawnProjectile === "function") {
                const proj = window.$fightManager.spawnProjectile({
                    attacker: this,
                    x: this.x,
                    y: this.y,
                    realX: this._realX !== undefined ? this._realX : this.x,
                    realY: this._realY !== undefined ? this._realY : this.y,
                    direction: aimDir,
                    range: stats.range,
                    speed: stats.projectileSpeed,
                    image: stats.projectileImg,
                    skillId: stats.skillId
                });
                DEBUGTOOL.log(`🚀 Projectile propulsé en direction ${aimDir} (vitesse: ${stats.projectileSpeed}px/f, portée: ${stats.range} cases)`, "gunfight");
            }

            return true;
        };

        /**
         * Détermine si le joueur est activement en train de tirer en rafale
         * (visée maintenue + clic gauche maintenu + arme à rafale avec munitions disponibles).
         * @returns {boolean}
         */
        Game_Player.prototype.isBurstShooting = function () {
            if (!this.isAiming || !this.isAiming()) return false;
            if (!TouchInput || !TouchInput.isPressed || !TouchInput.isPressed()) return false;
            const actor = (typeof this.actor === "function" ? this.actor() : null) ||
                (typeof this.hero === "function" ? this.hero() : null) ||
                (typeof $gameParty !== "undefined" && $gameParty ? $gameParty.leader() : null);
            if (!actor) return false;
            const stats = actor.gunfightStats ? actor.gunfightStats() : null;
            if (!stats || !stats.isRanged || !stats.burst) return false;
            if (this.isReloading && this.isReloading()) return false;
            if (stats.reload) {
                const weapon = actor.gunfightWeapon ? actor.gunfightWeapon() : null;
                const loaded = actor.getLoadedAmmo ? actor.getLoadedAmmo(weapon) : 0;
                if (loaded <= 0) return false;
            }
            return true;
        };

        /**
         * Réajuste automatiquement et en continu le défilement de la carte si le joueur
         * se retrouve décentré (suite à un déplacement, un tir, un snap balistique ou un changement d'action),
         * sauf s'il se trouve sur les bordures infranchissables de la carte.
         */
        Game_Player.prototype.adjustCenterScroll = function () {
            if (typeof $gameMap === "undefined" || !$gameMap) return;
            if (typeof $gameMap.isScrolling === "function" && $gameMap.isScrolling()) return;

            const cx = this.centerX();
            const cy = this.centerY();
            const curX = this.scrolledX();
            const curY = this.scrolledY();

            const diffX = curX - cx;
            const diffY = curY - cy;

            if (Math.abs(diffX) > 0.005) {
                if (diffX > 0) {
                    const maxDisplayX = $gameMap.isLoopHorizontal() ? Infinity : Math.max(0, $gameMap.width() - $gameMap.screenTileX());
                    const canScroll = $gameMap.isLoopHorizontal() ? diffX : Math.max(0, maxDisplayX - $gameMap._displayX);
                    const scrollAmt = Math.min(diffX, canScroll);
                    if (scrollAmt > 0.001) {
                        const step = (this.isMoving && this.isMoving()) ? scrollAmt : Math.min(scrollAmt, Math.max(0.08, scrollAmt * 0.35));
                        $gameMap.scrollRight(step);
                    }
                } else {
                    const canScroll = $gameMap.isLoopHorizontal() ? -diffX : Math.max(0, $gameMap._displayX);
                    const scrollAmt = Math.min(-diffX, canScroll);
                    if (scrollAmt > 0.001) {
                        const step = (this.isMoving && this.isMoving()) ? scrollAmt : Math.min(scrollAmt, Math.max(0.08, scrollAmt * 0.35));
                        $gameMap.scrollLeft(step);
                    }
                }
            }

            if (Math.abs(diffY) > 0.005) {
                if (diffY > 0) {
                    const maxDisplayY = $gameMap.isLoopVertical() ? Infinity : Math.max(0, $gameMap.height() - $gameMap.screenTileY());
                    const canScroll = $gameMap.isLoopVertical() ? diffY : Math.max(0, maxDisplayY - $gameMap._displayY);
                    const scrollAmt = Math.min(diffY, canScroll);
                    if (scrollAmt > 0.001) {
                        const step = (this.isMoving && this.isMoving()) ? scrollAmt : Math.min(scrollAmt, Math.max(0.08, scrollAmt * 0.35));
                        $gameMap.scrollDown(step);
                    }
                } else {
                    const canScroll = $gameMap.isLoopVertical() ? -diffY : Math.max(0, $gameMap._displayY);
                    const scrollAmt = Math.min(-diffY, canScroll);
                    if (scrollAmt > 0.001) {
                        const step = (this.isMoving && this.isMoving()) ? scrollAmt : Math.min(scrollAmt, Math.max(0.08, scrollAmt * 0.35));
                        $gameMap.scrollUp(step);
                    }
                }
            }
        };

        const _Game_Player_updateScroll = Game_Player.prototype.updateScroll;
        Game_Player.prototype.updateScroll = function (lastScrolledX, lastScrolledY) {
            if (_Game_Player_updateScroll) {
                _Game_Player_updateScroll.call(this, lastScrolledX, lastScrolledY);
            }
            this.adjustCenterScroll();
        };

        // Mise à jour de la boucle de combat du joueur
        const _Game_Player_update = Game_Player.prototype.update;
        Game_Player.prototype.update = function (sceneActive) {
            if (this._shootCooldown > 0) {
                this._shootCooldown--;
            }

            if (sceneActive) {
                // 1. Touche R de rechargement
                if (typeof Input !== "undefined" && Input.isTriggered && Input.isTriggered("reload")) {
                    if (!this.isReloading()) {
                        this.startReload();
                    }
                }

                // 2. Progression du rechargement
                if (this.isReloading()) {
                    this.updateReload();
                }

                // 3. Tir continu automatique (Burst) : quand le clic gauche reste maintenu en visée
                if (this.isAiming && this.isAiming() && (this.canAttack() || (this.isBurstShooting && this.isBurstShooting()))) {
                    const actor = (typeof this.actor === "function" ? this.actor() : null) ||
                        (typeof this.hero === "function" ? this.hero() : null) ||
                        (typeof $gameParty !== "undefined" && $gameParty ? $gameParty.leader() : null);
                    const stats = actor ? actor.gunfightStats() : null;

                    if (stats && stats.isRanged && stats.burst) {
                        if (TouchInput && TouchInput.isPressed && TouchInput.isPressed() && this._shootCooldown <= 0) {
                            this.performGunfightShoot();
                        }
                    }
                }

                // 4. Fin de rafale : si le joueur ne tire plus en rafale, rétablir la posture
                if (this._lastShootAction && !this.isActing()) {
                    if (!this.isBurstShooting || !this.isBurstShooting()) {
                        this._action = "walk";
                        this._lastShootAction = null;
                        this._actionPattern = 0;
                        this._actionTimer = 0;
                        if (typeof this.resetPattern === "function") {
                            this.resetPattern();
                        }
                    }
                }
            }

            // Exécute la mise à jour parente (qui déclenche performAttack sur TouchInput.isTriggered)
            if (_Game_Player_update) {
                _Game_Player_update.call(this, sceneActive);
            }

            // Réajuste le scroll de la caméra pour maintenir le centrage du joueur
            this.adjustCenterScroll();
        };
    }

    // ========================================================================
    // 8. Classe Sprite_WeaponHUD : HUD Arme & Munitions (Bas-Droite)
    // ========================================================================
    class Sprite_WeaponHUD extends Sprite_Base {
        constructor() {
            super();
            this.setupDimensions();
            this._lastState = {};
            this._pulseTimer = 0;
            this.refresh();
        }

        setupDimensions() {
            this._hudWidth = 240;
            this._hudHeight = 68;
            this.bitmap = (typeof Bitmap !== "undefined") ? new Bitmap(this._hudWidth, this._hudHeight) : null;
            this.updatePosition();
        }

        updatePosition() {
            const screenW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
            const screenH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;
            this.x = screenW - this._hudWidth - 20;
            this.y = screenH - this._hudHeight - 20;
        }

        currentActor() {
            if (typeof $gameParty !== "undefined" && $gameParty && $gameParty.leader) {
                return $gameParty.leader();
            }
            return null;
        }

        update() {
            if (typeof super.update === "function") {
                super.update();
            }
            this.updatePosition();

            const isSystemVisible = (typeof $gameSystem !== "undefined" && typeof $gameSystem.isWeaponHudVisible === "function")
                ? $gameSystem.isWeaponHudVisible()
                : true;

            if (!isSystemVisible) {
                this.visible = false;
                return;
            }
            this.visible = true;

            const actor = this.currentActor();
            if (!actor) return;
            const weapon = actor.gunfightWeapon();
            const stats = actor.gunfightStats();
            const loaded = actor.getLoadedAmmo(weapon);
            const reserve = actor.getReserveAmmo(weapon);
            const isReloading = typeof $gamePlayer !== "undefined" && $gamePlayer && $gamePlayer.isReloading && $gamePlayer.isReloading();

            this._pulseTimer++;

            // Détection de changement d'état pour rafraîchir l'affichage
            if (this._lastState.weaponId !== (weapon ? weapon.id : 0) ||
                this._lastState.loaded !== loaded ||
                this._lastState.reserve !== reserve ||
                this._lastState.isReloading !== isReloading ||
                (loaded === 0 && this._pulseTimer % 30 === 0)) {

                this._lastState = {
                    weaponId: weapon ? weapon.id : 0,
                    loaded: loaded,
                    reserve: reserve,
                    isReloading: isReloading
                };
                this.refresh();
            }
        }

        refresh() {
            if (!this.bitmap) return;
            const ctx = this.bitmap.context;
            if (!ctx) return;

            this.bitmap.clear();
            const w = this._hudWidth;
            const h = this._hudHeight;

            const actor = this.currentActor();
            const weapon = actor ? actor.gunfightWeapon() : null;
            const stats = actor ? actor.gunfightStats() : GunfightManager.defaultMeleeStats();
            const loaded = actor ? actor.getLoadedAmmo(weapon) : -1;
            const reserve = actor ? actor.getReserveAmmo(weapon) : 0;
            const isReloading = typeof $gamePlayer !== "undefined" && $gamePlayer && $gamePlayer.isReloading && $gamePlayer.isReloading();

            // 1. Fond Glassmorphism semi-transparent sombre
            ctx.save();
            ctx.fillStyle = "rgba(15, 20, 32, 0.82)";
            ctx.strokeStyle = (loaded === 0 && stats.reload) ? "rgba(239, 68, 68, 0.7)" : "rgba(70, 110, 160, 0.4)";
            ctx.lineWidth = 1.5;

            // Tracé arrondi
            const r = 8;
            ctx.beginPath();
            ctx.moveTo(r, 0);
            ctx.lineTo(w - r, 0);
            ctx.arcTo(w, 0, w, r, r);
            ctx.lineTo(w, h - r);
            ctx.arcTo(w, h, w - r, h, r);
            ctx.lineTo(r, h);
            ctx.arcTo(0, h, 0, h - r, r);
            ctx.lineTo(0, r);
            ctx.arcTo(0, 0, r, 0, r);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // 2. Icône de l'arme
            const iconIndex = stats.iconIndex || (weapon ? weapon.iconIndex : 16);
            if (typeof ImageManager !== "undefined" && ImageManager.loadSystem) {
                const iconBitmap = ImageManager.loadSystem("IconSet");
                if (iconBitmap && iconBitmap.isReady()) {
                    const sx = (iconIndex % 16) * 32;
                    const sy = Math.floor(iconIndex / 16) * 32;
                    this.bitmap.blt(iconBitmap, sx, sy, 32, 32, 12, (h - 32) / 2);
                }
            }

            // 3. Nom de l'arme
            ctx.save();
            ctx.font = "bold 13px sans-serif";
            ctx.fillStyle = "#e2e8f0";
            ctx.shadowColor = "rgba(0,0,0,0.8)";
            ctx.shadowBlur = 3;
            const weaponName = stats.name || "Mains nues";
            ctx.fillText(weaponName, 54, 22);

            // 4. Munitions & Statut
            if (isReloading) {
                ctx.font = "bold 15px sans-serif";
                ctx.fillStyle = "#fbbf24"; // Ambre
                ctx.fillText("RECHARGE...", 54, 48);
            } else if (stats.reload) {
                // Munitions chargées
                ctx.font = "bold 20px sans-serif";
                if (loaded === 0) {
                    ctx.fillStyle = "#ef4444"; // Rouge alerte
                } else if (loaded <= Math.ceil(stats.ammoCap * 0.25)) {
                    ctx.fillStyle = "#f59e0b"; // Orange avertissement
                } else {
                    ctx.fillStyle = "#4ade80"; // Vert néon
                }
                ctx.fillText(String(loaded), 54, 50);

                // Capacité max
                const loadedWidth = ctx.measureText(String(loaded)).width;
                ctx.font = "14px sans-serif";
                ctx.fillStyle = "#94a3b8";
                ctx.fillText(` / ${stats.ammoCap}`, 54 + loadedWidth, 50);

                // Réserve d'inventaire
                const capWidth = ctx.measureText(` / ${stats.ammoCap}`).width;
                ctx.font = "12px sans-serif";
                ctx.fillStyle = "#38bdf8"; // Cyan réserve
                const reserveText = `  [${reserve}]`;
                ctx.fillText(reserveText, 54 + loadedWidth + capWidth, 49);
            } else {
                // Arme de corps-à-corps ou munitions infinies
                ctx.font = "14px sans-serif";
                ctx.fillStyle = "#94a3b8";
                ctx.fillText("-- / --", 54, 48);
            }
            ctx.restore();
        }
    }

    window.Sprite_WeaponHUD = Sprite_WeaponHUD;

    // ========================================================================
    // 9. Intégration Scènes et Spritesets : Affichage Map du HUD et Projectiles
    // ========================================================================
    if (typeof Scene_Map !== "undefined") {
        const _Scene_Map_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
        Scene_Map.prototype.createDisplayObjects = function () {
            if (_Scene_Map_createDisplayObjects) {
                _Scene_Map_createDisplayObjects.call(this);
            }
            this.createWeaponHud();
        };

        Scene_Map.prototype.createWeaponHud = function () {
            if (!this._weaponHud && typeof Sprite_WeaponHUD !== "undefined") {
                this._weaponHud = new Sprite_WeaponHUD();
                this.addChild(this._weaponHud);
            }
        };

        const _Scene_Map_update = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function () {
            if (_Scene_Map_update) {
                _Scene_Map_update.call(this);
            }
            if (window.$fightManager && typeof window.$fightManager.updateProjectiles === "function") {
                window.$fightManager.updateProjectiles();
            }
        };

        const _Scene_Map_terminate = Scene_Map.prototype.terminate;
        Scene_Map.prototype.terminate = function () {
            if (window.$fightManager && typeof window.$fightManager.clearProjectiles === "function") {
                window.$fightManager.clearProjectiles();
            }
            if (_Scene_Map_terminate) {
                _Scene_Map_terminate.call(this);
            }
        };
    }

    if (typeof Spriteset_Map !== "undefined") {
        const _Spriteset_Map_initialize = Spriteset_Map.prototype.initialize;
        Spriteset_Map.prototype.initialize = function () {
            this._projectileSprites = [];
            if (_Spriteset_Map_initialize) {
                _Spriteset_Map_initialize.call(this);
            }
        };

        const _Spriteset_Map_update = Spriteset_Map.prototype.update;
        Spriteset_Map.prototype.update = function () {
            if (_Spriteset_Map_update) {
                _Spriteset_Map_update.call(this);
            }
            this.updateProjectiles();
        };

        Spriteset_Map.prototype.updateProjectiles = function () {
            this._projectileSprites = this._projectileSprites || [];
            const activeProjectiles = (window.$fightManager && window.$fightManager.projectiles) ? window.$fightManager.projectiles() : [];

            // 1. Instanciation des sprites pour les nouveaux projectiles
            for (const proj of activeProjectiles) {
                if (!proj._hasSprite) {
                    proj._hasSprite = true;
                    const sprite = new Sprite_Projectile(proj);
                    this._projectileSprites.push(sprite);
                    if (this._tilemap && typeof this._tilemap.addChild === "function") {
                        this._tilemap.addChild(sprite);
                    } else if (typeof this.addChild === "function") {
                        this.addChild(sprite);
                    }
                }
            }

            // 2. Nettoyage des sprites des projectiles terminés
            for (let i = this._projectileSprites.length - 1; i >= 0; i--) {
                const s = this._projectileSprites[i];
                if (!s._projectile || !s._projectile.isAlive) {
                    if (s.parent && typeof s.parent.removeChild === "function") {
                        s.parent.removeChild(s);
                    }
                    this._projectileSprites.splice(i, 1);
                }
            }
        };
    }

})();
