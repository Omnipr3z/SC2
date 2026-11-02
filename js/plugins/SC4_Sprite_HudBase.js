//=============================================================================
// Sprite_HudBase.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SimCraft] Classe de base pour les modules du HUD de la carte.
 * @author PAHernandez
 *
 * @help
 */

class Sprite_HudBase extends Sprite {
    initialize(rect) {
        super.initialize();
        this._cache = {};
        this.bitmap = new Bitmap(rect.width, rect.height);
        this.initContents();
        this.setupSprites();
        this.fullRefresh();
    }
    setupSprites() { }
    initContents() { }
    getCurrentData() { return {}; }
    update() {
        super.update();
        if (this.visible && this.bitmap) {
            this.checkCacheAndRefresh();
        }
    }
    checkCacheAndRefresh() {
        const currentData = this.getCurrentData();
        let isDirty = false;

        for (const key in currentData) {
            if (this._cache[key] !== currentData[key]) {
                isDirty = true;
                this._cache[key] = currentData[key];
            }
        }

        if (isDirty) {
            this.fullRefresh();
        }
    }
    forceDirty() {
        this._cache = {};
    }
    fullRefresh() {
        if (this.bitmap) {
            this.bitmap.clear();
            this.drawContent();
        }
    }
    drawContent() { }
    drawText(text, x, y, maxWidth, align) {
        this.bitmap.drawText(text, x, y, maxWidth, this.bitmap.fontSize || 32, align);
    }
}