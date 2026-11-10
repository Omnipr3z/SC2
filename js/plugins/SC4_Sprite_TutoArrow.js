//=============================================================================
// RPG Maker MZ - SC4_Sprite_TutoArrow
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Flèche indicatrice néon des didacticiels contextuels (Sprite_TutoArrow).
 * @author SimCraft
 * @base SC4_Sprite_NeonArrowBase
 * 
 * @help SC4_Sprite_TutoArrow.js
 * ============================================================================
 * Flèche Cyberpunk Néon de Didacticiel (Hérite de Sprite_NeonArrowBase)
 * ============================================================================
 * Pointeur contextuel guidant le joueur vers les éléments décrits par Window_Tuto.
 * - Style : Vert néon (#00ff88) avec halo lumineux.
 * - Géométrie : Verticale native (30x56, pointant vers le bas v), ancrée à la pointe (0.5, 1.0).
 * - Positionnement : Coordonnées carte ou écran, orientation angulaire libre, clamping 8px.
 * - Flux : Déploiement élastique cyberpunk depuis la pointe lors de l'apparition.
 * ============================================================================
 */

const BaseTutoArrow = (typeof Sprite_NeonArrowBase !== "undefined")
    ? Sprite_NeonArrowBase
    : (typeof require !== "undefined" ? require("./SC4_Sprite_NeonArrowBase") : Sprite);

class Sprite_TutoArrow extends BaseTutoArrow {
    constructor(config = {}) {
        super(Object.assign({
            direction: "down",
            width: 30,
            height: 56,
            neonColor: "#00ff88"
        }, config));
    }

    // =========================================================================
    // 1. MÉTHODES DE FLUX & CYCLE DE VIE (Workflow & Lifecycle)
    // =========================================================================

    initFlow() {
        super.initFlow();
        this.z = 250;
        this._targetData = null;
        this._baseAngle = 0;
    }

    /**
     * Configure la cible de la flèche et déclenche son déploiement élastique.
     * @param {object|null} arrowData { xMap, yMap, x, y, angle }
     */
    setup(arrowData) {
        if (!arrowData) {
            this.hide();
            this._targetData = null;
            return;
        }
        this._targetData = arrowData;
        this._baseAngle = Number(arrowData.angle) || 0;
        this.updatePosition();
        super.deploy(0.14); // ~7 frames de déploiement
    }

    onDeployStart() {
        this.scale.x = 0;
        this.scale.y = 0;
    }

    updateDeploy() {
        super.updateDeploy();
        // Déploiement élastique avec léger overshoot cyberpunk
        const t = this._progress;
        this.scale.x = Math.min(1, t * 1.25);
        if (t < 0.7) {
            this.scale.y = (t / 0.7) * 1.15; // Élongation dynamique jusqu'à 115%
        } else {
            this.scale.y = 1.15 - ((t - 0.7) / 0.3) * 0.15; // Amorti stabilisé à 100%
        }
        if (t >= 1) {
            this.scale.x = 1;
            this.scale.y = 1;
        }
        this.updatePosition();
    }

    onDeployComplete() {
        this.scale.x = 1;
        this.scale.y = 1;
    }

    // =========================================================================
    // 2. MÉTHODES DE STYLE & RENDU (Style & Rendering)
    // =========================================================================

    defaultNeonColor() {
        return "#00ff88"; // Vert néon didacticiel
    }

    // =========================================================================
    // 3. MÉTHODES DE GÉOMÉTRIE & POSITIONNEMENT (Geometry & Positioning)
    // =========================================================================

    initGeometry(config = {}) {
        super.initGeometry(Object.assign({
            direction: "down",
            width: 30,
            height: 56
        }, config));
    }

    initAnchor() {
        // Ancrage fixé exactement à la pointe de la flèche
        this.anchor.x = 0.5;
        this.anchor.y = 1.0;
    }

    /**
     * Calcule la position à l'écran, applique l'oscillation et le clamping bordure.
     */
    updatePosition() {
        if (!this._targetData) return;

        let targetX = 0;
        let targetY = 0;
        let isMapCoord = false;

        if (this._targetData.xMap !== undefined && this._targetData.yMap !== undefined) {
            isMapCoord = true;
            const tileW = (window.$gameMap && typeof window.$gameMap.tileWidth === "function") ? window.$gameMap.tileWidth() : 48;
            const tileH = (window.$gameMap && typeof window.$gameMap.tileHeight === "function") ? window.$gameMap.tileHeight() : 48;
            if (window.$gameMap && typeof window.$gameMap.adjustX === "function") {
                targetX = Math.round(window.$gameMap.adjustX(this._targetData.xMap) * tileW + tileW / 2);
                targetY = Math.round(window.$gameMap.adjustY(this._targetData.yMap) * tileH + tileH / 2);
            } else {
                targetX = this._targetData.xMap * tileW + tileW / 2;
                targetY = this._targetData.yMap * tileH + tileH / 2;
            }
        } else if (this._targetData.x !== undefined && this._targetData.y !== undefined) {
            targetX = Number(this._targetData.x) || 0;
            targetY = Number(this._targetData.y) || 0;
        } else {
            return;
        }

        const boxW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
        const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;
        const margin = 8;
        const minX = margin;
        const maxX = boxW - margin;
        const minY = margin;
        const maxY = boxH - margin;

        const isOffScreen = isMapCoord && (targetX < minX || targetX > maxX || targetY < minY || targetY > maxY);

        if (isOffScreen) {
            const cx = boxW / 2;
            const cy = boxH / 2;
            const dx = targetX - cx;
            const dy = targetY - cy;

            let scaleX = Infinity;
            let scaleY = Infinity;

            if (dx > 0) scaleX = (maxX - cx) / dx;
            else if (dx < 0) scaleX = (minX - cx) / dx;

            if (dy > 0) scaleY = (maxY - cy) / dy;
            else if (dy < 0) scaleY = (minY - cy) / dy;

            const scale = Math.min(scaleX, scaleY);
            const edgeX = cx + dx * scale;
            const edgeY = cy + dy * scale;

            // Angle pointant vers la cible (correction -PI/2 car la flèche pointe nativement vers le bas)
            const dirAngle = Math.atan2(dy, dx);
            const rad = dirAngle - Math.PI / 2;

            // Oscillation le long de la direction de la flèche
            const bounceOffset = -Math.abs(Math.sin(this._tick * 0.1) * 8);
            this.x = edgeX + Math.sin(rad) * bounceOffset;
            this.y = edgeY - Math.cos(rad) * bounceOffset;
            this.rotation = rad;
        } else {
            const rad = (this._baseAngle * Math.PI) / 180;
            // Oscillation le long de l'axe de la flèche (recul puis poussée vers la pointe)
            const bounceOffset = -Math.abs(Math.sin(this._tick * 0.1) * 8);

            this.x = targetX + Math.sin(rad) * bounceOffset;
            this.y = targetY - Math.cos(rad) * bounceOffset;
            this.rotation = rad;
        }
    }
}

window.Sprite_TutoArrow = Sprite_TutoArrow;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Sprite_TutoArrow;
}
