//=============================================================================
// RPG Maker MZ - SC4_Sprite_InventoryArrow
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Flèche indicatrice animée reliant l'item sélectionné à la modale contextuelle d'inventaire.
 * @author SimCraft
 * @base SC4_Sprite_NeonArrowBase
 * 
 * @help SC4_Sprite_InventoryArrow.js
 * ============================================================================
 * Flèche Cyberpunk Néon d'Inventaire (Hérite de Sprite_NeonArrowBase)
 * ============================================================================
 * Relie l'item sélectionné dans la liste d'inventaire à la modale d'action.
 * - Style : Cyan néon (#00eeff) avec halo lumineux.
 * - Géométrie : Horizontale (56x30), pointant vers la gauche (<==) ou la droite (==>).
 * - Flux : Déploiement élastique horizontal depuis l'origine jusqu'à la modale.
 * ============================================================================
 */

const BaseInventoryArrow = (typeof Sprite_NeonArrowBase !== "undefined")
    ? Sprite_NeonArrowBase
    : (typeof require !== "undefined" ? require("./SC4_Sprite_NeonArrowBase") : Sprite);

class Sprite_InventoryArrow extends BaseInventoryArrow {
    constructor(config = {}) {
        super(Object.assign({
            direction: "left",
            width: 56,
            height: 30,
            neonColor: "#00eeff"
        }, config));
    }

    // =========================================================================
    // 1. MÉTHODES DE FLUX & CYCLE DE VIE (Workflow & Lifecycle)
    // =========================================================================

    initFlow() {
        super.initFlow();
        this._originX = 0;
        this._targetX = 0;
        this._targetY = 0;
    }

    /**
     * Déclenche l'animation de déploiement de la flèche d'inventaire.
     * @param {number} originX X de départ sur le bord de la liste d'inventaire
     * @param {number} originY Y aligné avec la ligne d'item
     * @param {number} targetX X de destination vers la modale
     * @param {string} [direction="left"] "left" ou "right"
     */
    deploy(originX, originY, targetX, direction = "left") {
        this._direction = direction;
        this._originX = originX;
        this._targetX = targetX;
        this.y = originY;
        this.redraw();
        super.deploy(0.16);
    }

    onDeployStart() {
        this.scale.x = 0;
        this.scale.y = 1;
        this.x = this._originX;
    }

    updateDeploy() {
        super.updateDeploy();
        this.scale.x = this._progress;
        this.x = this._originX + (this._targetX - this._originX) * this._progress;
    }

    // =========================================================================
    // 2. MÉTHODES DE STYLE & RENDU (Style & Rendering)
    // =========================================================================

    defaultNeonColor() {
        return "#00eeff";
    }

    // =========================================================================
    // 3. MÉTHODES DE GÉOMÉTRIE & POSITIONNEMENT (Geometry & Positioning)
    // =========================================================================

    initGeometry(config = {}) {
        super.initGeometry(Object.assign({
            direction: "left",
            width: 56,
            height: 30
        }, config));
    }

    initAnchor() {
        this.anchor.x = 0.5;
        this.anchor.y = 0.5;
    }

    updatePosition() {
        if (this._isDeploying) return;

        // Légère oscillation le long de l'axe X une fois déployée
        const pulse = this.calculateBounceOffset(0.15, 3);
        if (this._direction === "left") {
            this.x = this._targetX - pulse;
        } else {
            this.x = this._targetX + pulse;
        }
    }
}

window.Sprite_InventoryArrow = Sprite_InventoryArrow;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Sprite_InventoryArrow;
}
