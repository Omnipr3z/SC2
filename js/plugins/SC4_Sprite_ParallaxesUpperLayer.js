//=============================================================================
// SimCraft 4 - Sprite Parallaxes Upper Layer
// SC4_Sprite_ParallaxesUpperLayer.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Sprite de couche haute de parallaxe pour l'affichage dynamique des planètes en vue hublot.
 * @author SimCraft 4 Core Team
 * @help
 * ============================================================================
 * ■ SC4_Sprite_ParallaxesUpperLayer : Astre en hublot spatial
 * ============================================================================
 * Sprite compagnon affiché dans Spriteset_Map entre le fond étoilé et le tilemap
 * du vaisseau. Met à jour la position, la rotation et l'échelle de l'astre
 * selon les données du SpaceParallaxesManager.
 * ============================================================================
 */

class Sprite_ParallaxesUpperLayer extends Sprite {
        constructor() {
            super();
            this.anchor.x = 0.5;
            this.anchor.y = 0.5;
            this.visible = false;
            this._cachedBitmapName = null;
        }

        /**
         * Précharge et assigne la texture bitmap de l'astre.
         * @param {string} bitmapName 
         */
        preloadBitmap(bitmapName) {
            if (!bitmapName) return;
            const cleanName = String(bitmapName).replace(/\.png$/i, "");
            this._cachedBitmapName = cleanName;
            this.bitmap = ImageManager.loadBitmap("img/GUI/ship/", cleanName);
        }

        /**
         * Applique l'état calculé par le SpaceParallaxesManager.
         * @param {object} state 
         */
        updateState(state) {
            if (!state || !state.visible) {
                this.visible = false;
                return;
            }

            this.visible = true;

            // Mise à jour de la texture si spécifiée ou différente
            if (state.bitmapName) {
                const cleanName = String(state.bitmapName).replace(/\.png$/i, "");
                if (this._cachedBitmapName !== cleanName) {
                    this.preloadBitmap(cleanName);
                }
            }

            this.x = state.screenX;
            this.y = state.screenY;
            this.rotation = state.rotation || 0;

            const zoom = state.zoom || 1.0;
            this.scale.x = zoom;
            this.scale.y = zoom;
        }
    }

    // Export global
    window.Sprite_ParallaxesUpperLayer = Sprite_ParallaxesUpperLayer;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = Sprite_ParallaxesUpperLayer;
    }
