//=============================================================================
// RPG Maker MZ - SC4_GUI_Utils
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Boîte à outils utilitaires statiques pour l'interface graphique (GUI) sans altérer Window_Base.
 * @author SimCraft
 * 
 * @help SC4_GUI_Utils.js
 * ============================================================================
 * SC4_GUI_Utils
 * ============================================================================
 * Fournit des méthodes statiques réutilisables par les fenêtres et scènes :
 * - fitContain : Calcul de mise à l'échelle 'contain' centrée (style CSS).
 * - adjustSpriteContain : Ajuste dynamiquement l'échelle et la position d'un Sprite
 *   dans une boîte donnée dès que son bitmap est chargé.
 * - drawContainBitmap : Dessine un bitmap dans un rectangle de Window.contents en contain.
 * ============================================================================
 */

class SC4_GUI_Utils {
    /**
     * Calcule le facteur d'échelle et les coordonnées de centrage pour insérer
     * une boîte source (srcW x srcH) dans un rectangle cible (maxW x maxH)
     * en préservant strictement le ratio d'aspect (contain CSS).
     * @param {number} srcW Largeur source
     * @param {number} srcH Hauteur source
     * @param {number} maxW Largeur maximale cible
     * @param {number} maxH Hauteur maximale cible
     * @returns {{width: number, height: number, scale: number, x: number, y: number}}
     */
    static fitContain(srcW, srcH, maxW, maxH) {
        if (!srcW || !srcH || srcW <= 0 || srcH <= 0 || !maxW || !maxH || maxW <= 0 || maxH <= 0) {
            return { width: maxW || 0, height: maxH || 0, scale: 1, x: 0, y: 0 };
        }
        const scale = Math.min(maxW / srcW, maxH / srcH);
        const w = srcW * scale;
        const h = srcH * scale;
        return {
            width: w,
            height: h,
            scale: scale,
            x: (maxW - w) / 2,
            y: (maxH - h) / 2
        };
    }

    /**
     * Ajuste dynamiquement un Sprite (scale et coordonnées) pour qu'il tienne
     * parfaitement dans une boîte (boxX, boxY, boxW, boxH) en mode 'contain' centré.
     * Gère automatiquement le chargement asynchrone du Bitmap s'il n'est pas encore prêt.
     * @param {Sprite} sprite Le sprite à ajuster
     * @param {number} boxX Coordonnée X de la boîte
     * @param {number} boxY Coordonnée Y de la boîte
     * @param {number} boxW Largeur de la boîte
     * @param {number} boxH Hauteur de la boîte
     */
    static adjustSpriteContain(sprite, boxX, boxY, boxW, boxH) {
        if (!sprite) return;
        const apply = () => {
            const bmp = sprite.bitmap;
            if (!bmp || !bmp.width || !bmp.height) return;
            const fit = this.fitContain(bmp.width, bmp.height, boxW, boxH);
            sprite.anchor.x = 0.5;
            sprite.anchor.y = 0.5;
            sprite.scale.x = fit.scale;
            sprite.scale.y = fit.scale;
            sprite.x = boxX + (boxW / 2);
            sprite.y = boxY + (boxH / 2);
        };

        if (sprite.bitmap && typeof sprite.bitmap.isReady === "function" && sprite.bitmap.isReady()) {
            apply();
        } else if (sprite.bitmap && typeof sprite.bitmap.addLoadListener === "function") {
            sprite.bitmap.addLoadListener(apply);
        } else {
            apply();
        }
    }

    /**
     * Dessine un Bitmap directement dans le canvas de Window.contents en mode contain centré.
     * @param {Window_Base} win La fenêtre cible
     * @param {Bitmap} bitmap Le bitmap source
     * @param {number} destX X destination
     * @param {number} destY Y destination
     * @param {number} destW Largeur destination
     * @param {number} destH Hauteur destination
     */
    static drawContainBitmap(win, bitmap, destX, destY, destW, destH) {
        if (!win || !win.contents || !bitmap) return;
        const apply = () => {
            if (!bitmap.width || !bitmap.height) return;
            const fit = this.fitContain(bitmap.width, bitmap.height, destW, destH);
            win.contents.blt(bitmap, 0, 0, bitmap.width, bitmap.height, destX + fit.x, destY + fit.y, fit.width, fit.height);
        };

        if (typeof bitmap.isReady === "function" && bitmap.isReady()) {
            apply();
        } else if (typeof bitmap.addLoadListener === "function") {
            bitmap.addLoadListener(apply);
        } else {
            apply();
        }
    }
}

// Export universel
if (typeof window !== "undefined") {
    window.SC4_GUI_Utils = SC4_GUI_Utils;
    window.GUI_Utils = SC4_GUI_Utils;
    if (window.SC4) {
        window.SC4.GUI = SC4_GUI_Utils;
    }
}
if (typeof global !== "undefined") {
    global.SC4_GUI_Utils = SC4_GUI_Utils;
    global.GUI_Utils = SC4_GUI_Utils;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { SC4_GUI_Utils, GUI_Utils: SC4_GUI_Utils };
}
