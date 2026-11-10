//=============================================================================
// RPG Maker MZ - SC4_Sprite_InventoryArrow
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Flèche indicatrice animée reliant l'item sélectionné à la modale contextuelle d'inventaire.
 * @author SimCraft
 * 
 * @help SC4_Sprite_InventoryArrow.js
 */

class Sprite_InventoryArrow extends Sprite {
    constructor() {
        super();
        this._direction = "left"; // "left" (pointe vers la gauche) ou "right" (pointe vers la droite)
        this._arrowWidth = 56;
        this._arrowHeight = 30;
        this._progress = 0; // 0 (replié) à 1 (totalement déployé)
        this._isDeploying = false;
        this._targetX = 0;
        this._targetY = 0;
        this._originX = 0;
        this._tick = 0;
        this.visible = false;
        this.createBitmap();
    }

    createBitmap() {
        this.bitmap = new Bitmap(this._arrowWidth, this._arrowHeight);
        this.anchor.x = 0.5;
        this.anchor.y = 0.5;
        this.redraw();
    }

    redraw() {
        const bmp = this.bitmap;
        if (!bmp) return;
        bmp.clear();

        const ctx = bmp.context;
        const w = this._arrowWidth;
        const h = this._arrowHeight;
        const cy = h / 2;

        ctx.save();
        ctx.fillStyle = "rgba(0, 238, 255, 0.75)";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#00eeff";
        ctx.shadowBlur = 8;

        ctx.beginPath();
        if (this._direction === "left") {
            // Pointe vers la gauche : <==
            ctx.moveTo(2, cy); // Pointe gauche
            ctx.lineTo(18, 4); // Aile haute
            ctx.lineTo(18, cy - 5); // Retour corps
            ctx.lineTo(w - 2, cy - 5); // Queue haute
            ctx.lineTo(w - 2, cy + 5); // Queue basse
            ctx.lineTo(18, cy + 5); // Retour corps bas
            ctx.lineTo(18, h - 4); // Aile basse
        } else {
            // Pointe vers la droite : ==>
            ctx.moveTo(w - 2, cy); // Pointe droite
            ctx.lineTo(w - 18, 4); // Aile haute
            ctx.lineTo(w - 18, cy - 5); // Retour corps
            ctx.lineTo(2, cy - 5); // Queue gauche haute
            ctx.lineTo(2, cy + 5); // Queue gauche basse
            ctx.lineTo(w - 18, cy + 5); // Retour corps bas
            ctx.lineTo(w - 18, h - 4); // Aile basse
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Déclenche l'animation de déploiement de la flèche.
     * @param {number} originX X de départ sur le bord de la liste d'inventaire
     * @param {number} originY Y aligné avec la ligne d'item
     * @param {number} targetX X de destination vers la modale
     * @param {string} direction "left" ou "right"
     */
    deploy(originX, originY, targetX, direction = "left") {
        this._direction = direction;
        this._originX = originX;
        this._targetX = targetX;
        this.y = originY;
        this._progress = 0;
        this._isDeploying = true;
        this._tick = 0;
        this.visible = true;
        this.scale.x = 0;
        this.scale.y = 1;
        this.x = originX;
        this.redraw();
    }

    hide() {
        this.visible = false;
        this._isDeploying = false;
        this._progress = 0;
    }

    update() {
        super.update();
        if (!this.visible) return;

        this._tick++;

        if (this._isDeploying) {
            this._progress = Math.min(1, this._progress + 0.16); // ~6-7 frames
            this.scale.x = this._progress;
            this.x = this._originX + (this._targetX - this._originX) * this._progress;
            if (this._progress >= 1) {
                this._isDeploying = false;
            }
        } else {
            // Légère oscillation le long de l'axe X une fois déployée
            const pulse = Math.sin(this._tick * 0.15) * 3;
            if (this._direction === "left") {
                this.x = this._targetX - pulse;
            } else {
                this.x = this._targetX + pulse;
            }
        }
    }
}

window.Sprite_InventoryArrow = Sprite_InventoryArrow;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Sprite_InventoryArrow;
}

