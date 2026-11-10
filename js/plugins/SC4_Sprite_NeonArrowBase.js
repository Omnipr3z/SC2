//=============================================================================
// RPG Maker MZ - SC4_Sprite_NeonArrowBase
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Classe de base abstraite des flèches néon cyberpunk (Sprite_NeonArrowBase).
 * @author SimCraft
 * 
 * @help SC4_Sprite_NeonArrowBase.js
 * ============================================================================
 * Architecture DRY des Flèches Cyberpunk Néon (SC4)
 * ============================================================================
 * Fournit le socle commun pour toutes les flèches indicatrices néon du jeu :
 * 
 * 1. MÉTHODES DE STYLE & RENDU (Style & Rendering) :
 *    - Rendu vectoriel dynamique sur Canvas Bitmap sans dépendance d'image.
 *    - Couleurs néon configurables (neonColor, strokeColor, lineWidth, shadowBlur).
 *    - Tracé polygonal cyberpunk symétrique (left, right, down, up).
 * 
 * 2. MÉTHODES DE GÉOMÉTRIE & POSITIONNEMENT (Geometry & Positioning) :
 *    - Gestion normalisée des dimensions (_arrowWidth, _arrowHeight).
 *    - Ancrage par défaut ou personnalisé (initAnchor).
 *    - Calcul d'oscillation flottante (calculateBounceOffset).
 *    - Contrat de positionnement par frame (updatePosition).
 * 
 * 3. MÉTHODES DE FLUX & CYCLE DE VIE (Workflow & Lifecycle) :
 *    - Machine à états d'apparition (deploy, hide, show).
 *    - Animation de déploiement élastique (updateDeploy, onDeployComplete).
 *    - Orchestration de boucle de mise à jour (update).
 * ============================================================================
 */

class Sprite_NeonArrowBase extends Sprite {
    constructor(config = {}) {
        super();
        this.initialize(config);
    }

    // =========================================================================
    // 1. MÉTHODES DE FLUX & CYCLE DE VIE (Workflow & Lifecycle)
    // =========================================================================

    initialize(config = {}) {
        if (Sprite.prototype.initialize) {
            Sprite.prototype.initialize.call(this);
        }
        this.scale = this.scale || { x: 1, y: 1 };
        this.initGeometry(config);
        this.initStyle(config);
        this.initAnchor();
        this.initFlow();
        this.createBitmap();
    }

    /**
     * Initialise les variables de flux et d'états d'animation.
     */
    initFlow() {
        this._tick = 0;
        this._progress = 0;
        this._isDeploying = false;
        this._deploySpeed = 0.16; // ~6 à 7 frames à 60 FPS
        this.visible = false;
    }

    /**
     * Déclenche la phase de déploiement élastique.
     * @param {number} [speed=0.16] Vitesse de progression par frame
     */
    deploy(speed = 0.16) {
        this._deploySpeed = speed > 0 ? speed : 0.16;
        this._progress = 0;
        this._isDeploying = true;
        this._tick = 0;
        this.visible = true;
        this.onDeployStart();
    }

    /**
     * Hook appelé au lancement du déploiement.
     */
    onDeployStart() {
        // Surchargeable par les classes héritières
    }

    /**
     * Calcule la progression du déploiement élastique avec effet cyberpunk.
     */
    updateDeploy() {
        this._progress = Math.min(1, this._progress + this._deploySpeed);
        if (this._progress >= 1) {
            this._isDeploying = false;
            this.onDeployComplete();
        }
    }

    /**
     * Hook appelé lorsque le déploiement élastique est achevé.
     */
    onDeployComplete() {
        // Surchargeable par les classes héritières
    }

    /**
     * Masque la flèche et réinitialise son état.
     */
    hide() {
        this.visible = false;
        this._isDeploying = false;
        this._progress = 0;
    }

    /**
     * Révèle la flèche sans forcer de redéploiement.
     */
    show() {
        this.visible = true;
    }

    /**
     * Boucle principale de mise à jour (Template Method).
     */
    update() {
        if (Sprite.prototype.update) {
            Sprite.prototype.update.call(this);
        }
        if (!this.visible) return;

        this._tick++;

        if (this._isDeploying) {
            this.updateDeploy();
        } else {
            this.updatePosition();
        }
    }

    // =========================================================================
    // 2. MÉTHODES DE STYLE & RENDU (Style & Rendering)
    // =========================================================================

    /**
     * Initialise les paramètres esthétiques du néon.
     * @param {object} config
     */
    initStyle(config = {}) {
        this._neonColor = config.neonColor || this.defaultNeonColor();
        this._strokeColor = config.strokeColor || "#ffffff";
        this._lineWidth = Number(config.lineWidth) || 2;
        this._shadowBlur = Number(config.shadowBlur) || 8;
        this._fillAlpha = Number(config.fillAlpha) || 0.8;
    }

    defaultNeonColor() {
        return "#00eeff"; // Cyan cyberpunk par défaut
    }

    neonColor() {
        return this._neonColor;
    }

    setNeonColor(color) {
        this._neonColor = color;
        this.redraw();
    }

    strokeColor() {
        return this._strokeColor;
    }

    lineWidth() {
        return this._lineWidth;
    }

    shadowBlur() {
        return this._shadowBlur;
    }

    fillAlpha() {
        return this._fillAlpha;
    }

    /**
     * Convertit une couleur hexadécimale (#rrggbb) en chaîne rgba(r, g, b, alpha).
     * @param {string} hex
     * @param {number} alpha
     */
    hexToRgba(hex, alpha) {
        if (!hex || typeof hex !== "string" || !hex.startsWith("#")) {
            return `rgba(0, 238, 255, ${alpha})`;
        }
        let cleanHex = hex.slice(1);
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split("").map(c => c + c).join("");
        }
        const num = parseInt(cleanHex, 16);
        if (isNaN(num)) return `rgba(0, 238, 255, ${alpha})`;
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    fillColor() {
        return this.hexToRgba(this.neonColor(), this.fillAlpha());
    }

    createBitmap() {
        const BmpClass = (typeof Bitmap !== "undefined") ? Bitmap : (window.Bitmap || null);
        if (BmpClass) {
            this.bitmap = new BmpClass(this._arrowWidth, this._arrowHeight);
            this.redraw();
        }
    }

    /**
     * Applique les paramètres graphiques néon sur le contexte Canvas 2D.
     * @param {CanvasRenderingContext2D} ctx
     */
    applyNeonContext(ctx) {
        ctx.fillStyle = this.fillColor();
        ctx.strokeStyle = this.strokeColor();
        ctx.lineWidth = this.lineWidth();
        ctx.shadowColor = this.neonColor();
        ctx.shadowBlur = this.shadowBlur();
    }

    /**
     * Redessine la flèche sur son bitmap Canvas.
     */
    redraw() {
        const bmp = this.bitmap;
        if (!bmp) return;
        if (typeof bmp.clear === "function") {
            bmp.clear();
        }

        const ctx = bmp.context;
        if (!ctx) return;

        const w = this._arrowWidth;
        const h = this._arrowHeight;

        ctx.save();
        this.applyNeonContext(ctx);

        ctx.beginPath();
        this.drawArrowPolygon(ctx, w, h, this._direction);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
        ctx.restore();

        if (bmp._baseTexture && typeof bmp._baseTexture.update === "function") {
            bmp._baseTexture.update();
        }
    }

    /**
     * Tracé géométrique vectoriel du polygone cyberpunk selon la direction.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} w Largeur
     * @param {number} h Hauteur
     * @param {string} direction "left" | "right" | "down" | "up"
     */
    drawArrowPolygon(ctx, w, h, direction) {
        const cy = h / 2;
        const cx = w / 2;

        if (direction === "left") {
            // Pointe vers la gauche : <==
            ctx.moveTo(2, cy);
            ctx.lineTo(18, 4);
            ctx.lineTo(18, cy - 5);
            ctx.lineTo(w - 2, cy - 5);
            ctx.lineTo(w - 2, cy + 5);
            ctx.lineTo(18, cy + 5);
            ctx.lineTo(18, h - 4);
        } else if (direction === "down") {
            // Pointe vers le bas : v
            ctx.moveTo(cx - 5, 2);
            ctx.lineTo(cx + 5, 2);
            ctx.lineTo(cx + 5, h - 18);
            ctx.lineTo(w - 4, h - 18);
            ctx.lineTo(cx, h - 2);
            ctx.lineTo(4, h - 18);
            ctx.lineTo(cx - 5, h - 18);
        } else if (direction === "up") {
            // Pointe vers le haut : ^
            ctx.moveTo(cx - 5, h - 2);
            ctx.lineTo(cx + 5, h - 2);
            ctx.lineTo(cx + 5, 18);
            ctx.lineTo(w - 4, 18);
            ctx.lineTo(cx, 2);
            ctx.lineTo(4, 18);
            ctx.lineTo(cx - 5, 18);
        } else {
            // Pointe vers la droite par défaut : ==>
            ctx.moveTo(w - 2, cy);
            ctx.lineTo(w - 18, 4);
            ctx.lineTo(w - 18, cy - 5);
            ctx.lineTo(2, cy - 5);
            ctx.lineTo(2, cy + 5);
            ctx.lineTo(w - 18, cy + 5);
            ctx.lineTo(w - 18, h - 4);
        }
    }

    // =========================================================================
    // 3. MÉTHODES DE GÉOMÉTRIE & POSITIONNEMENT (Geometry & Positioning)
    // =========================================================================

    /**
     * Configure les dimensions et la direction géométrique de départ.
     * @param {object} config
     */
    initGeometry(config = {}) {
        this._direction = config.direction || "right";
        this._arrowWidth = Number(config.width) || (this.isVertical() ? 30 : 56);
        this._arrowHeight = Number(config.height) || (this.isVertical() ? 56 : 30);
    }

    isVertical() {
        return this._direction === "down" || this._direction === "up";
    }

    /**
     * Initialise l'ancrage par défaut (centré).
     */
    initAnchor() {
        this.anchor.x = 0.5;
        this.anchor.y = 0.5;
    }

    /**
     * Calcule une oscillation sinusoïdale flottante.
     * @param {number} [speed=0.15]
     * @param {number} [amplitude=3]
     * @returns {number}
     */
    calculateBounceOffset(speed = 0.15, amplitude = 3) {
        return Math.sin(this._tick * speed) * amplitude;
    }

    /**
     * Contrat de positionnement par frame (à surcharger par les enfants).
     */
    updatePosition() {
        // Comportement par défaut : oscillation flottante le long de la direction
        const pulse = this.calculateBounceOffset();
        if (this._direction === "left") {
            this.x -= pulse;
        } else if (this._direction === "right") {
            this.x += pulse;
        } else if (this._direction === "down") {
            this.y += pulse;
        } else if (this._direction === "up") {
            this.y -= pulse;
        }
    }
}

window.Sprite_NeonArrowBase = Sprite_NeonArrowBase;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Sprite_NeonArrowBase;
}
