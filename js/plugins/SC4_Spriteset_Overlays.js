//=============================================================================
// SC4_Spriteset_Overlays.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Moteur de rendu graphique bi-calque des overlays de carte (Spriteset_Overlays, Sprite_MapOverlay).
 * @author SimCraft
 * @help
 * ============================================================================
 * SC4_Spriteset_Overlays.js
 * ============================================================================
 * Gère l'affichage graphique sur deux calques natifs :
 *  1. lowerContainer (z = 2) : Ombre au sol (sous les héros z = 3).
 *  2. upperContainer (z = 6) : Halos lumineux, toits, brume (au-dessus des héros z = 3).
 * 
 * Le tri automatique achemine tout overlay de type "shadow" (ou zIndex < 3)
 * vers lowerContainer, et les autres types vers upperContainer.
 * ============================================================================
 */

(() => {
    "use strict";

    //=============================================================================
    // Sprite_MapOverlay
    //=============================================================================
    function Sprite_MapOverlay() {
        this.initialize(...arguments);
    }

    Sprite_MapOverlay.prototype = Object.create(Sprite.prototype);
    Sprite_MapOverlay.prototype.constructor = Sprite_MapOverlay;

    Sprite_MapOverlay.prototype.initialize = function (overlay) {
        if (Sprite.prototype.initialize) {
            Sprite.prototype.initialize.call(this);
        }
        this._overlay = overlay;
        this._currentImgName = "";
        this.z = overlay.zIndex;
        this.blendMode = overlay.blendMode;
        this.anchor = this.anchor || { x: 0, y: 0 };
        this.anchor.x = (overlay.anchorX !== undefined) ? overlay.anchorX : 0;
        this.anchor.y = (overlay.anchorY !== undefined) ? overlay.anchorY : 0;
        if (typeof this.setHue === "function") {
            this.setHue(overlay.hue);
        }
        this.loadBitmap();
    };

    Sprite_MapOverlay.prototype.loadBitmap = function () {
        if (!this._overlay || !this._overlay.imgName) {
            this.bitmap = null;
            this._currentImgName = "";
            return;
        }
        this._currentImgName = this._overlay.imgName;
        const cleanName = this._overlay.imgName.replace(/\.png$/i, "");
        // Charge en priorité depuis img/GUI/overlays/ (ou img/tileset/overlays/)
        this.bitmap = ImageManager.loadBitmap("img/GUI/overlays/", cleanName);
    };

    Sprite_MapOverlay.prototype.update = function () {
        if (Sprite.prototype.update) {
            Sprite.prototype.update.call(this);
        }

        if (!this._overlay || !this._overlay.visible) {
            this.visible = false;
            return;
        }

        // Rechargement d'image si le nom a changé dynamiquement
        if (this._overlay.imgName !== this._currentImgName) {
            this.loadBitmap();
        }

        // 1. Synchronisation de l'opacité
        this.opacity = this._overlay.opacity;
        if (this.opacity <= 0) {
            this.visible = false;
            return;
        }

        // 2. Synchronisation des modes graphiques
        if (this.blendMode !== this._overlay.blendMode) {
            this.blendMode = this._overlay.blendMode;
        }
        if (this._hue !== this._overlay.hue && typeof this.setHue === "function") {
            this.setHue(this._overlay.hue);
        }

        // 3. Synchronisation de l'ancrage (Anchor)
        const targetAnchorX = (this._overlay.anchorX !== undefined) ? this._overlay.anchorX : 0;
        const targetAnchorY = (this._overlay.anchorY !== undefined) ? this._overlay.anchorY : 0;
        if (this.anchor.x !== targetAnchorX) this.anchor.x = targetAnchorX;
        if (this.anchor.y !== targetAnchorY) this.anchor.y = targetAnchorY;

        // 4. Synchronisation du zoom
        this.scale.x = this._overlay.zoomX;
        this.scale.y = this._overlay.zoomY;

        // 5. Calcul des coordonnées écran (Alignement pixel-perfect avec Tilemap de RMMZ)
        // RMMZ Tilemap.prototype.updateTransform utilise :
        // ox = Math.ceil(this.origin.x) où origin.x = $gameMap.displayX() * tileW
        // et chaque tuile mx est dessinée à : mx * tileW - ox.
        // Calculer Math.round(adjustX * tileW) générait un décalage d'1px vers la droite
        // dès que displayX * tileW avait une partie décimale (ex: résolution 1760x990).
        const tileW = (window.$gameMap && typeof window.$gameMap.tileWidth === "function") ? window.$gameMap.tileWidth() : 48;
        const tileH = (window.$gameMap && typeof window.$gameMap.tileHeight === "function") ? window.$gameMap.tileHeight() : 48;
        const extraX = Number(this._overlay.offsetX) || 0;
        const extraY = Number(this._overlay.offsetY) || 0;

        let screenX = 0;
        let screenY = 0;

        if (window.$gameMap && typeof window.$gameMap.adjustX === "function" && typeof window.$gameMap.displayX === "function") {
            const ox = Math.ceil(window.$gameMap.displayX() * tileW);
            const oy = Math.ceil(window.$gameMap.displayY() * tileH);
            const wrappedX = window.$gameMap.adjustX(this._overlay.xMap) + window.$gameMap.displayX();
            const wrappedY = window.$gameMap.adjustY(this._overlay.yMap) + window.$gameMap.displayY();
            screenX = Math.round(wrappedX * tileW) - ox + extraX;
            screenY = Math.round(wrappedY * tileH) - oy + extraY;
        } else if (window.$gameMap && typeof window.$gameMap.adjustX === "function") {
            screenX = Math.round(window.$gameMap.adjustX(this._overlay.xMap) * tileW + extraX);
            screenY = Math.round(window.$gameMap.adjustY(this._overlay.yMap) * tileH + extraY);
        } else {
            screenX = Math.round(this._overlay.xMap * tileW + extraX);
            screenY = Math.round(this._overlay.yMap * tileH + extraY);
        }

        this.x = screenX;
        this.y = screenY;

        // 6. Frustum Culling (Évite de dessiner les overlays situés hors du champ de vision)
        const boxW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
        const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;
        const spriteW = (this.bitmap && this.bitmap.isReady()) ? (this.bitmap.width * this.scale.x) : tileW;
        const spriteH = (this.bitmap && this.bitmap.isReady()) ? (this.bitmap.height * this.scale.y) : tileH;

        const left = screenX - spriteW * this.anchor.x;
        const top = screenY - spriteH * this.anchor.y;
        const margin = 64;

        if (left + spriteW < -margin || left > boxW + margin ||
            top + spriteH < -margin || top > boxH + margin) {
            this.visible = false;
            return;
        }

        this.visible = true;
    };

    //=============================================================================
    // Spriteset_Overlays
    //=============================================================================
    function Spriteset_Overlays() {
        this.initialize(...arguments);
    }

    Spriteset_Overlays.prototype = Object.create(Sprite.prototype);
    Spriteset_Overlays.prototype.constructor = Spriteset_Overlays;

    Spriteset_Overlays.prototype.initialize = function () {
        if (Sprite.prototype.initialize) {
            Sprite.prototype.initialize.call(this);
        }
        this._spriteMap = {}; // id -> Sprite_MapOverlay

        // 1. lowerContainer (z = 2) : Ombres au sol (affichées sous les héros z = 3)
        this.lowerContainer = new Sprite();
        this.lowerContainer.z = 2;
        this.lowerContainer.update = function () { }; // Désactive update automatique pour éviter doublons

        // 2. upperContainer (z = 6) : Lumières, toits, brume (affichés au-dessus des héros z = 3/5)
        this.upperContainer = new Sprite();
        this.upperContainer.z = 6;
        this.upperContainer.update = function () { }; // Désactive update automatique pour éviter doublons

        // Attachement par défaut dans l'arborescence
        this.addChild(this.lowerContainer);
        this.addChild(this.upperContainer);
    };

    /**
     * Attache directement les deux calques au Tilemap pour s'intégrer au tri z natif
     * de RMMZ (z=2 sous les héros, z=6 au-dessus des héros).
     * @param {Tilemap} tilemap
     */
    Spriteset_Overlays.prototype.attachToTilemap = function (tilemap) {
        if (tilemap && typeof tilemap.addChild === "function") {
            if (this.lowerContainer.parent === this) this.removeChild(this.lowerContainer);
            if (this.upperContainer.parent === this) this.removeChild(this.upperContainer);
            tilemap.addChild(this.lowerContainer);
            tilemap.addChild(this.upperContainer);
        }
    };

    /**
     * Détermine si un overlay appartient au calque inférieur (shadows/sol).
     * @param {Game_MapOverlay} overlay
     * @returns {boolean}
     */
    Spriteset_Overlays.prototype.isLowerLayer = function (overlay) {
        if (!overlay) return false;
        const type = String(overlay.type || "").toLowerCase();
        if (type.includes("shadow")) return true;
        if (typeof overlay.zIndex === "number" && overlay.zIndex < 3) return true;
        return false;
    };

    Spriteset_Overlays.prototype.update = function () {
        if (Sprite.prototype.update) {
            Sprite.prototype.update.call(this);
        }

        if (!window.$mapOverlaysManager) return;

        const overlaysData = window.$mapOverlaysManager.getOverlaysData();
        const activeIds = {};

        // 1. Crée, réaffecte de calque ou met à jour les sprites d'overlays
        for (const overlay of overlaysData) {
            if (!overlay || !overlay.id) continue;
            activeIds[overlay.id] = true;

            const isLower = this.isLowerLayer(overlay);
            const targetContainer = isLower ? this.lowerContainer : this.upperContainer;
            let sprite = this._spriteMap[overlay.id];

            if (!sprite) {
                sprite = new Sprite_MapOverlay(overlay);
                this._spriteMap[overlay.id] = sprite;
                targetContainer.addChild(sprite);
                targetContainer._needsSort = true;
            } else {
                // Si l'overlay a changé de calque (ex: type ou zIndex modifié)
                if (sprite.parent !== targetContainer) {
                    if (sprite.parent && typeof sprite.parent.removeChild === "function") {
                        sprite.parent.removeChild(sprite);
                        sprite.parent._needsSort = true;
                    }
                    targetContainer.addChild(sprite);
                    targetContainer._needsSort = true;
                }
                if (sprite.z !== overlay.zIndex) {
                    sprite.z = overlay.zIndex;
                    targetContainer._needsSort = true;
                }
            }
        }

        // 2. Nettoie les sprites des overlays qui ont été retirés
        for (const id in this._spriteMap) {
            if (!activeIds[id]) {
                const sprite = this._spriteMap[id];
                if (sprite) {
                    if (sprite.parent && typeof sprite.parent.removeChild === "function") {
                        sprite.parent.removeChild(sprite);
                        sprite.parent._needsSort = true;
                    }
                    if (sprite.destroy) sprite.destroy();
                }
                delete this._spriteMap[id];
            }
        }

        // 3. Trie les enfants selon zIndex si nécessaire dans chaque conteneur
        if (this.lowerContainer._needsSort && this.lowerContainer.children && this.lowerContainer.children.sort) {
            this.lowerContainer.children.sort((a, b) => (a.z || 0) - (b.z || 0));
            this.lowerContainer._needsSort = false;
        }
        if (this.upperContainer._needsSort && this.upperContainer.children && this.upperContainer.children.sort) {
            this.upperContainer.children.sort((a, b) => (a.z || 0) - (b.z || 0));
            this.upperContainer._needsSort = false;
        }

        // 4. Met à jour individuellement chaque sprite
        for (const id in this._spriteMap) {
            const sprite = this._spriteMap[id];
            if (sprite) {
                sprite.update();
            }
        }
    };

    Spriteset_Overlays.prototype.destroy = function (options) {
        for (const id in this._spriteMap) {
            const sprite = this._spriteMap[id];
            if (sprite && sprite.destroy) {
                sprite.destroy(options);
            }
        }
        this._spriteMap = {};
        if (this.lowerContainer) {
            if (this.lowerContainer.parent) this.lowerContainer.parent.removeChild(this.lowerContainer);
            if (this.lowerContainer.destroy) this.lowerContainer.destroy(options);
        }
        if (this.upperContainer) {
            if (this.upperContainer.parent) this.upperContainer.parent.removeChild(this.upperContainer);
            if (this.upperContainer.destroy) this.upperContainer.destroy(options);
        }
        if (Sprite.prototype.destroy) {
            Sprite.prototype.destroy.call(this, options);
        }
    };

    window.Sprite_MapOverlay = Sprite_MapOverlay;
    window.Spriteset_Overlays = Spriteset_Overlays;

})();
