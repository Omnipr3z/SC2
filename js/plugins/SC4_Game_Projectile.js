//=============================================================================
// RPG Maker MZ - SC4_Game_Projectile
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Entité balistique et rendu visuel du projectile (Game_Projectile & Sprite_Projectile).
 * @author SimCraft
 * 
 * @help SC4_Game_Projectile.js
 * 
 * 1. Classe Game_Projectile :
 *    - Trajectoire balistique en 8 directions (vx, vy).
 *    - Traversée des zones d'eau (lacs, rivières, océans).
 *    - Détection de collision contre obstacles solides.
 *    - Détection d'impact sur ennemis hostiles via FightManager.
 * 
 * 2. Classe Sprite_Projectile :
 *    - Affichage graphique, rotation selon l'angle de trajectoire.
 *    - Fondu progressif à l'apparition.
 *    - Décalage vertical offsetY selon l'arme et la direction.
 */

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

        // 3. Détection d'impact sur un ennemi hostile
        if (window.$fightManager && typeof window.$fightManager.findHostileTargetAt === "function") {
            const target = window.$fightManager.findHostileTargetAt(curTileX, curTileY, this.realX, this.realY);
            if (target) {
                const evId = typeof target.eventId === "function" ? target.eventId() : (target._eventId || 0);
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
     */
    traveledPixels() {
        const tw = (typeof $gameMap !== "undefined" && $gameMap && $gameMap.tileWidth) ? $gameMap.tileWidth() : 48;
        return this.traveledTiles * tw;
    }

    /**
     * Z-index écran du projectile.
     */
    screenZ() {
        return 2;
    }
}

class Sprite_Projectile extends Sprite {
    constructor(projectile) {
        super();
        this._projectile = projectile;
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
        super.update();
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
     * Met à jour la transparence pour un fondu progressif sur les premiers pixels de déplacement.
     */
    updateOpacity() {
        if (!this._projectile) return;
        const FADE_DISTANCE = 180;
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

window.Game_Projectile = Game_Projectile;
window.Sprite_Projectile = Sprite_Projectile;
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Game_Projectile, Sprite_Projectile };
}

