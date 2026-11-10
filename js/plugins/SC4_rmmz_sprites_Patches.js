//=============================================================================
// SC4_rmmz_sprites_Patches.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Surcharges et patches des classes natives de rmmz_sprites.js.
 * @author SimCraft
 * @help
 * ============================================================================
 * NORME DES FICHIERS DE PATCHES :
 * - Nom de la Classe en commentaire (ex: // SPRITESET MAP)
 * - Création de tous les alias nécessaires à la classe au début de sa section, suivis d'une ligne vide
 * - Toutes les méthodes de la classe regroupées ensemble (surcharges et ajouts), sans doublons
 * - Ordre des classes identique au fichier natif vanilla
 * - Pas de commentaires superflus en dehors des méthodes (sauf TODO ou note en header)
 * - Règle "Fail Fast" : pas de fallbacks silencieux masquant les bugs
 * ============================================================================
 * Regroupe tous les patches et surcharges apportés aux classes de rmmz_sprites :
 * 
 * 1. Sprite_Character :
 *    - characterPatternY : repli sur les directions cardinales pour les diagonales.
 *    - updateOther : effet visuel de surcharge (flash rouge).
 * 
 * 2. Sprite_Destination :
 *    - Refonte complète de l'indicateur de destination par clic/tactile.
 *    - Composant bi-calque :
 *      * Ellipse douce au sol (perspective 3/4 plongeante) animée en pulsation/fondu additif.
 *      * Flèche supérieure oscillante (destPointer.png) pointant vers le sol, visible uniquement sur cases passables.
 * 
 * 3. Spriteset_Map :
 *    - createParallax / updateParallax : triple calque parallaxe dynamique en vaisseau (fond, profondeur Stars, planète).
 *    - createCharacterSprite : instancie Sprite_Hero pour les héros et sprites composites.
 *    - createCharacters : création des sprites avec followers().reverseData().
 * ============================================================================
 */

(() => {
    "use strict";

    // SPRITE CHARACTER
    //=============================================================================
    const _Sprite_Character_characterPatternY = Sprite_Character.prototype.characterPatternY;
    const _Sprite_Character_updateOther = Sprite_Character.prototype.updateOther;

    Sprite_Character.prototype.characterPatternY = function () {
        const dir = this._character.direction();
        if ([1, 3, 7, 9].includes(dir)) {
            const fallback = { 1: 2, 3: 2, 7: 8, 9: 8 }[dir] || 2;
            return (fallback - 2) / 2;
        }
        return _Sprite_Character_characterPatternY.call(this);
    };
    Sprite_Character.prototype.updateOther = function () {
        _Sprite_Character_updateOther.call(this);
        if (this._character && this._character._overloadAlertTimer > 0) {
            const alpha = Math.min(220, Math.floor((this._character._overloadAlertTimer / 25) * 220));
            this.setBlendColor([255, 30, 30, alpha]);
        }
    };

    // SPRITE DESTINATION
    //=============================================================================
    const _Sprite_Destination_initialize = Sprite_Destination.prototype.initialize;
    const _Sprite_Destination_destroy = Sprite_Destination.prototype.destroy;

    Sprite_Destination.prototype.initialize = function () {
        if (Sprite.prototype.initialize) {
            Sprite.prototype.initialize.call(this);
        }
        this._frameCount = 0;
        this._floatTimer = 0;
        this._lastDestX = -1;
        this._lastDestY = -1;
        this._isPassable = true;

        this.createGroundSprite();
        this.createPointerSprite();
    };

    Sprite_Destination.prototype.createBitmap = function () {
        // Redéfini : la gestion graphique est assurée par createGroundSprite et createPointerSprite
    };

    Sprite_Destination.prototype.createGroundSprite = function () {
        const tw = (window.$gameMap && typeof window.$gameMap.tileWidth === "function") ? window.$gameMap.tileWidth() : 48;
        const th = (window.$gameMap && typeof window.$gameMap.tileHeight === "function") ? window.$gameMap.tileHeight() : 48;

        // Bitmap dimensionné pour l'ellipse de 72px (avec 12px de débordement autour de la case 48px)
        const bmpW = Math.max(96, tw * 2);
        const bmpH = Math.max(96, th * 2);
        this._groundBitmap = new Bitmap(bmpW, bmpH);

        const ctx = this._groundBitmap.context;
        if (ctx) {
            const cx = bmpW / 2;
            const cy = bmpH / 2;
            // Rayon maximal de 36px (diamètre 72px = 48 + 12*2) et perspective 3/4 plongeante (~ratio 1.85:1)
            const maxRx = 36;
            const maxRy = 19.5;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(1, maxRy / maxRx);

            // Dégradé radial doux s'atténuant vers l'extérieur
            const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, maxRx);
            grad.addColorStop(0, "rgba(255, 255, 255, 0.40)");
            grad.addColorStop(0.45, "rgba(255, 255, 255, 0.22)");
            grad.addColorStop(0.85, "rgba(255, 255, 255, 0.60)");
            grad.addColorStop(1.0, "rgba(255, 255, 255, 0.0)");

            ctx.beginPath();
            ctx.arc(0, 0, maxRx, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Anneau extérieur lumineux s'atténuant vers le bord
            ctx.beginPath();
            ctx.arc(0, 0, maxRx - 1.5, 0, Math.PI * 2);
            ctx.lineWidth = 2.0;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.70)";
            ctx.stroke();

            // Anneau intérieur discret
            ctx.beginPath();
            ctx.arc(0, 0, maxRx * 0.55, 0, Math.PI * 2);
            ctx.lineWidth = 1.0;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.30)";
            ctx.stroke();

            ctx.restore();

            if (this._groundBitmap._baseTexture && typeof this._groundBitmap._baseTexture.update === "function") {
                this._groundBitmap._baseTexture.update();
            }
        }

        this._groundSprite = new Sprite(this._groundBitmap);
        this._groundSprite.anchor.x = 0.5;
        this._groundSprite.anchor.y = 0.5;
        this._groundSprite.blendMode = 1; // Additif pour halo lumineux
        this.addChild(this._groundSprite);
    };

    Sprite_Destination.prototype.createPointerSprite = function () {
        this._pointerSprite = new Sprite();
        this._pointerSprite.bitmap = ImageManager.loadBitmap("img/GUI/cursors/", "destPointer");
        this._pointerSprite.anchor.x = 0.5;
        this._pointerSprite.anchor.y = 1.0; // Pointe de la flèche dirigée vers le sol
        this._pointerSprite.blendMode = 0;
        this.addChild(this._pointerSprite);
    };

    Sprite_Destination.prototype.isDestinationPassable = function (x, y) {
        if (!window.$gameMap || typeof window.$gameMap.isValid !== "function" || !window.$gameMap.isValid(x, y)) {
            return false;
        }
        // 1. Collision avec personnages / événements physiques bloquants
        if (window.$gamePlayer && typeof window.$gamePlayer.isCollidedWithCharacters === "function") {
            if (window.$gamePlayer.isCollidedWithCharacters(x, y)) {
                return false;
            }
        }
        // 2. Praticabilité cartographique de la case
        if (typeof window.$gameMap.isPassable === "function") {
            const canPassAny = [2, 4, 6, 8].some(d => window.$gameMap.isPassable(x, y, d));
            if (!canPassAny) return false;
        }
        return true;
    };

    Sprite_Destination.prototype.update = function () {
        if (Sprite.prototype.update) {
            Sprite.prototype.update.call(this);
        }

        if (window.$gameTemp && typeof window.$gameTemp.isDestinationValid === "function" && window.$gameTemp.isDestinationValid()) {
            this.updatePosition();
            this.updateAnimation();
            this.visible = true;
        } else {
            this._frameCount = 0;
            this._floatTimer = 0;
            this._lastDestX = -1;
            this._lastDestY = -1;
            this.visible = false;
        }
    };

    Sprite_Destination.prototype.updatePosition = function () {
        const tileWidth = (window.$gameMap && typeof window.$gameMap.tileWidth === "function") ? window.$gameMap.tileWidth() : 48;
        const tileHeight = (window.$gameMap && typeof window.$gameMap.tileHeight === "function") ? window.$gameMap.tileHeight() : 48;
        const x = window.$gameTemp.destinationX();
        const y = window.$gameTemp.destinationY();

        this.x = (window.$gameMap.adjustX(x) + 0.5) * tileWidth;
        this.y = (window.$gameMap.adjustY(y) + 0.5) * tileHeight;

        // Mise à jour du test de praticabilité si la case a changé
        if (x !== this._lastDestX || y !== this._lastDestY) {
            this._lastDestX = x;
            this._lastDestY = y;
            this._isPassable = this.isDestinationPassable(x, y);
        }
    };

    Sprite_Destination.prototype.updateAnimation = function () {
        // 1. Animation du cercle au sol : pulsation s'étendant de 48px à 72px tout en baissant d'opacité
        this._frameCount++;
        this._frameCount %= 25;
        const progress = this._frameCount / 25;
        if (this._groundSprite) {
            this._groundSprite.opacity = Math.round((1 - progress) * 220);
            // Échelle de 0.67 (taille 48px de la tuile) à 1.0 (72px, soit 12px de débordement autour)
            const currentScale = 0.67 + progress * 0.33;
            this._groundSprite.scale.x = currentScale;
            this._groundSprite.scale.y = currentScale;
        }

        // 2. Animation de la flèche : oscillation sinusoïdale avec opacité couplée (45% haut à 65% bas)
        if (this._pointerSprite) {
            this._pointerSprite.visible = Boolean(this._isPassable);
            if (this._pointerSprite.visible) {
                this._floatTimer = (this._floatTimer || 0) + 0.12;
                const osc = Math.sin(this._floatTimer); // -1 (haut) à +1 (bas)
                // La pointe oscille doucement entre -12px et -2px au-dessus du centre de la case
                const hoverY = -7 + osc * 5;
                this._pointerSprite.x = 0;
                this._pointerSprite.y = hoverY;

                // Opacité modulée en fonction de la hauteur : plus elle monte, moins elle est opaque
                // max 65% (166) en bas (osc = +1), min 45% (115) en haut (osc = -1)
                const t = (osc + 1) / 2; // 0 en haut, 1 en bas
                const minOp = Math.round(255 * 0.45); // 115
                const maxOp = Math.round(255 * 0.65); // 166
                this._pointerSprite.opacity = Math.round(minOp + t * (maxOp - minOp));
            }
        }
    };

    Sprite_Destination.prototype.destroy = function (options) {
        if (this._groundBitmap && typeof this._groundBitmap.destroy === "function") {
            this._groundBitmap.destroy();
        }
        if (Sprite.prototype.destroy) {
            Sprite.prototype.destroy.call(this, options);
        }
    };

    // SPRITESET MAP
    //=============================================================================
    const _Spriteset_Map_initialize = Spriteset_Map.prototype.initialize;
    const _Spriteset_Map_update = Spriteset_Map.prototype.update;
    const _Spriteset_Map_createParallax = Spriteset_Map.prototype.createParallax;
    const _Spriteset_Map_updateParallax = Spriteset_Map.prototype.updateParallax;
    const _Spriteset_Map_createDestination = Spriteset_Map.prototype.createDestination;

    Spriteset_Map.prototype.initialize = function () {
        this._projectileSprites = [];
        _Spriteset_Map_initialize.call(this);
    };

    // Substitution des ombres carrées natives de RMMZ
    Spriteset_Map.prototype.createShadow = function () {
        this._shadowSprite = new Sprite();
        this._shadowSprite.visible = false;
    };

    // Injection du conteneur d'overlays juste avant l'indicateur de destination
    Spriteset_Map.prototype.createDestination = function () {
        this.createOverlays();
        if (_Spriteset_Map_createDestination) {
            _Spriteset_Map_createDestination.call(this);
        }
    };

    Spriteset_Map.prototype.createOverlays = function () {
        if (typeof Spriteset_Overlays !== "undefined") {
            this._overlaysManager = new Spriteset_Overlays();
            if (this._tilemap && typeof this._tilemap.addChild === "function") {
                this._overlaysManager.attachToTilemap(this._tilemap);
            } else if (this._baseSprite && typeof this._baseSprite.addChild === "function") {
                this._baseSprite.addChild(this._overlaysManager);
            } else if (typeof this.addChild === "function") {
                this.addChild(this._overlaysManager);
            }
            this._overlaysContainer = this._overlaysManager;
        }
    };

    Spriteset_Map.prototype.update = function () {
        if (window.$tutoManager && window.$tutoManager.isBusy()) {
            return;
        }
        _Spriteset_Map_update.call(this);
        this.updateProjectiles();
        if (this._overlaysManager) {
            this._overlaysManager.update();
        } else if (this._overlaysContainer) {
            this._overlaysContainer.update();
        }
    };
    Spriteset_Map.prototype.updateProjectiles = function () {
        this._projectileSprites = this._projectileSprites || [];
        const activeProjectiles = (window.$fightManager && window.$fightManager.projectiles) ? window.$fightManager.projectiles() : [];

        // 1. Instanciation des sprites pour les nouveaux projectiles
        for (const proj of activeProjectiles) {
            if (!proj._hasSprite) {
                proj._hasSprite = true;
                const sprite = new Sprite_Projectile(proj);
                this._projectileSprites.push(sprite);
                if (this._tilemap && typeof this._tilemap.addChild === "function") {
                    this._tilemap.addChild(sprite);
                } else if (typeof this.addChild === "function") {
                    this.addChild(sprite);
                }
            }
        }

        // 2. Nettoyage des sprites des projectiles terminés
        for (let i = this._projectileSprites.length - 1; i >= 0; i--) {
            const s = this._projectileSprites[i];
            if (!s._projectile || !s._projectile.isAlive) {
                if (s.parent && typeof s.parent.removeChild === "function") {
                    s.parent.removeChild(s);
                }
                this._projectileSprites.splice(i, 1);
            }
        }
    };

    Spriteset_Map.prototype.createParallax = function () {
        _Spriteset_Map_createParallax.call(this);
        this.createSpaceParallaxLayers();
    };
    Spriteset_Map.prototype.createSpaceParallaxLayers = function () {
        this._parallaxDepthLayer = new TilingSprite();
        this._parallaxDepthLayer.move(0, 0, Graphics.width, Graphics.height);
        this._parallaxDepthLayer.bitmap = ImageManager.loadParallax("Stars");
        this._parallaxDepthLayer.visible = false;
        this._baseSprite.addChild(this._parallaxDepthLayer);

        const currentSysId = (typeof $gameGalaxy !== "undefined" && $gameGalaxy && typeof $gameGalaxy.currentSystem === "function" && $gameGalaxy.currentSystem())
            ? $gameGalaxy.currentSystem().id
            : null;
        const UpperContainerClass = (typeof Spriteset_UpperLayers !== "undefined")
            ? Spriteset_UpperLayers
            : (typeof window !== "undefined" && window.Spriteset_UpperLayers ? window.Spriteset_UpperLayers : Sprite_ParallaxesUpperLayer);
        this._parallaxUpperLayer = new UpperContainerClass(currentSysId);
        this._baseSprite.addChild(this._parallaxUpperLayer);
    };
    Spriteset_Map.prototype.updateParallax = function () {
        if ($gameMap.isSpaceShip()) {
            this.updateSpaceshipParallaxes();
        } else {
            _Spriteset_Map_updateParallax.call(this);
            if (this._parallaxDepthLayer) {
                this._parallaxDepthLayer.visible = false;
            }
            if (this._parallaxUpperLayer) {
                this._parallaxUpperLayer.visible = false;
            }
        }
    };
    Spriteset_Map.prototype.updateSpaceshipParallaxes = function () {
        const status = SpaceParallaxesManager.getParallaxesStatus($gameMap.spaceShipId());
        if (!status) return;

        if (this._parallaxName !== status.lower.name) {
            this._parallaxName = status.lower.name;
            this._parallax.bitmap = ImageManager.loadParallax(this._parallaxName);
        }
        if (this._parallax.bitmap) {
            if (status.lower.sx !== 0) {
                this._parallax.origin.x += status.lower.sx;
            }
            if (status.lower.sy !== 0) {
                this._parallax.origin.y += status.lower.sy;
            }
        }

        if (this._parallaxDepthLayer && status.mid) {
            this._parallaxDepthLayer.visible = Boolean(status.mid.visible);
            if (this._parallaxDepthLayer.visible && this._parallaxDepthLayer.bitmap) {
                if (status.mid.sx !== 0) {
                    this._parallaxDepthLayer.origin.x += status.mid.sx;
                }
                if (status.mid.sy !== 0) {
                    this._parallaxDepthLayer.origin.y += status.mid.sy;
                }
            }
        }

        if (this._parallaxUpperLayer) {
            this._parallaxUpperLayer.updateState(status.upper);
        }
    };
    Spriteset_Map.prototype.createCharacterSprite = function (character) {
        if (character instanceof Game_Player ||
            character instanceof Game_Follower ||
            character instanceof Game_Event ||
            (character && character.isHero && character.isHero())) {
            return new Sprite_Hero(character);
        }
        return new Sprite_Character(character);
    };
    Spriteset_Map.prototype.createCharacters = function () {
        this._characterSprites = [];
        for (const event of $gameMap.events()) {
            this._characterSprites.push(this.createCharacterSprite(event));
        }
        for (const vehicle of $gameMap.vehicles()) {
            this._characterSprites.push(this.createCharacterSprite(vehicle));
        }
        for (const follower of $gamePlayer.followers().reverseData()) {
            this._characterSprites.push(this.createCharacterSprite(follower));
        }
        this._characterSprites.push(this.createCharacterSprite($gamePlayer));

        for (const sprite of this._characterSprites) {
            this._tilemap.addChild(sprite);
        }
    };

})();
