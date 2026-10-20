//=============================================================================
// SC4_Sprite_PaperdollFace.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Portrait de personnage dynamique (paperdoll face composite 144x144) pour les héros.
 * @author SimCraft
 * @help
 * ============================================================================
 * Sprite_PaperdollFace.js
 * ============================================================================
 * Ce plugin gère l'affichage dynamique des visages Paperdoll pour les héros (<Hero>).
 * Au lieu d'utiliser le faceset vanilla 4x2 découpé en tuiles, il compose
 * un unique tile de 144x144px à partir de la couche de base (1.png) et des
 * couches d'équipement (<face:[EQUIP_FILENAME],[Z_INDEX],[UNISEX]>).
 *
 * Fonctionnalités :
 * - Sprite_PaperdollFace : Sprite autonome gérant l'assemblage et la mise à l'échelle.
 * - drawDynamicFace(actorId, x, y, width, height) : ajout du sprite en enfant de la fenêtre.
 * - Surcharge de drawActorFace dans Window_StatusBase et Window_Base pour basculer
 *   automatiquement sur le portrait paperdoll pour les héros.
 * ============================================================================
 */

(() => {
    "use strict";

    const Sprite_BaseClass = (typeof Sprite !== "undefined") ? Sprite : class {};

    /**
     * Sprite affichant le portrait paperdoll dynamique (144x144 composite).
     */
    class Sprite_PaperdollFace extends Sprite_BaseClass {
        constructor(actorOrId = null, targetWidth = 144, targetHeight = 144) {
            super();
            this._actor = null;
            this._actorId = 0;
            this._targetWidth = targetWidth || 144;
            this._targetHeight = targetHeight || 144;
            this._compositeEntry = null;
            this._lastCacheKey = "";
            this._vanillaFaceLoaded = false;

            if (actorOrId) {
                this.setActor(actorOrId);
            }
        }

        /**
         * Associe un acteur ou ID d'acteur au sprite.
         * @param {Game_Actor|Game_Hero|number} actorOrId 
         */
        setActor(actorOrId) {
            if (typeof actorOrId === "number") {
                this._actorId = actorOrId;
                this._actor = (typeof $gameActors !== "undefined" && $gameActors)
                    ? $gameActors.actor(actorOrId)
                    : null;
            } else {
                this._actor = actorOrId;
                this._actorId = (actorOrId && typeof actorOrId.actorId === "function")
                    ? actorOrId.actorId()
                    : (actorOrId ? (actorOrId._actorId || 0) : 0);
            }
            this.refresh();
        }

        /**
         * @returns {Game_Actor|Game_Hero|null}
         */
        actor() {
            if (!this._actor && this._actorId > 0 && typeof $gameActors !== "undefined" && $gameActors) {
                this._actor = $gameActors.actor(this._actorId);
            }
            return this._actor;
        }

        /**
         * @returns {number}
         */
        actorId() {
            return this._actorId || (this._actor && typeof this._actor.actorId === "function" ? this._actor.actorId() : 0);
        }

        /**
         * Définit la taille cible en pixels (ex: 144x144, 64x64, etc.).
         * @param {number} width 
         * @param {number} height 
         */
        setTargetSize(width, height) {
            this._targetWidth = width || 144;
            this._targetHeight = height || 144;
            this.updateScale();
        }

        /**
         * Indique si l'acteur est un héros (<Hero>).
         * @returns {boolean}
         */
        isHero() {
            const act = this.actor();
            if (!act) return false;
            if (typeof act.isHero === "function") return act.isHero();
            if (typeof act.hasNotetag === "function") return act.hasNotetag("Hero");
            const data = (typeof act.actor === "function") ? act.actor() : act;
            return Boolean(data && data.note && /<Hero>/i.test(data.note));
        }

        /**
         * Calcule la clé de cache du visage de l'acteur.
         * @returns {string}
         */
        currentCacheKey() {
            const act = this.actor();
            if (!act) return "";
            if (this.isHero() && typeof act.getCompositeFaceCacheKey === "function") {
                return act.getCompositeFaceCacheKey();
            }
            const equips = (typeof act.equips === "function") ? act.equips() : [];
            const equipIds = equips.map(e => e ? e.id : 0).join("-");
            return `face_${this.actorId()}_${equipIds}`;
        }

        /**
         * Rafraîchit l'entrée composite ou l'image vanilla.
         */
        refresh() {
            const act = this.actor();
            if (!act) {
                this.bitmap = null;
                this._compositeEntry = null;
                this._lastCacheKey = "";
                return;
            }

            if (this.isHero() && typeof Bitmap_Composite !== "undefined") {
                this._compositeEntry = Bitmap_Composite.getCompositeFaceEntry(act);
                this._lastCacheKey = this.currentCacheKey();
                if (this._compositeEntry && this._compositeEntry.bitmap) {
                    this.bitmap = this._compositeEntry.bitmap;
                }
            } else {
                // Fallback vanilla faceset
                this._compositeEntry = null;
                this._lastCacheKey = this.currentCacheKey();
                const faceName = (typeof act.faceName === "function") ? act.faceName() : "";
                if (faceName && typeof ImageManager !== "undefined") {
                    this.bitmap = ImageManager.loadFace(faceName);
                } else {
                    this.bitmap = null;
                }
            }
            this.updateScale();
        }

        /**
         * Met à jour l'échelle pour respecter les dimensions cibles.
         */
        updateScale() {
            if (this.isHero()) {
                // Pour le portrait composite, le canvas natif est 144x144
                const baseW = 144;
                const baseH = 144;
                if (this.scale) {
                    this.scale.x = this._targetWidth / baseW;
                    this.scale.y = this._targetHeight / baseH;
                }
            } else if (this.bitmap && typeof ImageManager !== "undefined") {
                const pw = ImageManager.faceWidth || 144;
                const ph = ImageManager.faceHeight || 144;
                if (this.scale) {
                    this.scale.x = this._targetWidth / pw;
                    this.scale.y = this._targetHeight / ph;
                }
            }
        }

        update() {
            super.update();

            const act = this.actor();
            if (!act) return;

            // Vérification de changement d'équipement ou d'apparence
            const key = this.currentCacheKey();
            if (key !== this._lastCacheKey) {
                this.refresh();
            }

            if (this.isHero()) {
                if (this._compositeEntry) {
                    const { composer, bitmap, isComposed } = this._compositeEntry;
                    if (composer && composer.isReady() && !this._compositeEntry.isComposed) {
                        composer.bltComposite(bitmap);
                        this._compositeEntry.isComposed = true;
                    }
                    if (this.bitmap !== bitmap) {
                        this.bitmap = bitmap;
                    }
                }
            } else {
                // Vanilla frame setup (4 colonnes x 2 lignes dans le faceset natif)
                if (this.bitmap && this.bitmap.isReady()) {
                    const pw = ImageManager.faceWidth || 144;
                    const ph = ImageManager.faceHeight || 144;
                    const faceIdx = (typeof act.faceIndex === "function") ? act.faceIndex() : 0;
                    const sx = (faceIdx % 4) * pw;
                    const sy = Math.floor(faceIdx / 4) * ph;
                    this.setFrame(sx, sy, pw, ph);
                }
            }

            this.updateScale();
        }
    }

    window.Sprite_PaperdollFace = Sprite_PaperdollFace;

    // ========================================================================
    // Surcharges Window_Base & Window_StatusBase (Étape 13 - Portraits Paperdoll)
    // ========================================================================

    if (typeof Window_Base !== "undefined") {
        /**
         * Ajoute ou réutilise un sprite de portrait dynamique dans la fenêtre.
         * @param {Game_Actor|Game_Hero|number} actorOrId 
         * @param {number} x 
         * @param {number} y 
         * @param {number} [width] 
         * @param {number} [height] 
         * @returns {Sprite_PaperdollFace|null}
         */
        Window_Base.prototype.drawDynamicFace = function(actorOrId, x, y, width, height) {
            const actor = (typeof actorOrId === "number")
                ? ((typeof $gameActors !== "undefined" && $gameActors) ? $gameActors.actor(actorOrId) : null)
                : actorOrId;
            if (!actor) return null;

            const actorId = (typeof actor.actorId === "function") ? actor.actorId() : 0;
            width = width || (typeof ImageManager !== "undefined" ? ImageManager.faceWidth : 144) || 144;
            height = height || (typeof ImageManager !== "undefined" ? ImageManager.faceHeight : 144) || 144;

            this._additionalSprites = this._additionalSprites || {};
            const key = `dynamicFace_${actorId}_${x}_${y}`;
            let sprite = this._additionalSprites[key];

            if (!sprite) {
                sprite = new Sprite_PaperdollFace(actor, width, height);
                this._additionalSprites[key] = sprite;
                if (typeof this.addInnerChild === "function") {
                    this.addInnerChild(sprite);
                } else if (typeof this.addChild === "function") {
                    this.addChild(sprite);
                }
            } else {
                sprite.setTargetSize(width, height);
                sprite.setActor(actor);
            }

            if (typeof sprite.move === "function") {
                sprite.move(x, y);
            } else {
                sprite.x = x;
                sprite.y = y;
            }

            if (typeof sprite.show === "function") {
                sprite.show();
            } else {
                sprite.visible = true;
            }
            sprite._inUse = true;

            return sprite;
        };

        if (!Window_Base.prototype.drawActorFace) {
            Window_Base.prototype.drawActorFace = function(actor, x, y, width, height) {
                const isHero = actor && (
                    (typeof actor.isHero === "function" && actor.isHero()) ||
                    (actor.hasNotetag && actor.hasNotetag("Hero")) ||
                    (actor.actor && actor.actor() && /<Hero>/i.test(actor.actor().note))
                );
                if (isHero) {
                    this.drawDynamicFace(actor, x, y, width, height);
                } else if (typeof this.drawFace === "function") {
                    this.drawFace(actor.faceName(), actor.faceIndex(), x, y, width, height);
                }
            };
        }
    }

    if (typeof Window_StatusBase !== "undefined") {
        const _Window_StatusBase_drawActorFace = Window_StatusBase.prototype.drawActorFace;
        Window_StatusBase.prototype.drawActorFace = function(actor, x, y, width, height) {
            const isHero = actor && (
                (typeof actor.isHero === "function" && actor.isHero()) ||
                (actor.hasNotetag && actor.hasNotetag("Hero")) ||
                (actor.actor && actor.actor() && /<Hero>/i.test(actor.actor().note))
            );
            if (isHero) {
                this.drawDynamicFace(actor, x, y, width, height);
            } else {
                _Window_StatusBase_drawActorFace.call(this, actor, x, y, width, height);
            }
        };

        const _Window_StatusBase_hideAdditionalSprites = Window_StatusBase.prototype.hideAdditionalSprites;
        Window_StatusBase.prototype.hideAdditionalSprites = function() {
            if (_Window_StatusBase_hideAdditionalSprites) {
                _Window_StatusBase_hideAdditionalSprites.call(this);
            }
            if (this._additionalSprites) {
                for (const sprite of Object.values(this._additionalSprites)) {
                    if (sprite && typeof sprite.hide === "function") {
                        sprite.hide();
                    } else if (sprite) {
                        sprite.visible = false;
                    }
                }
            }
        };
    }

})();
