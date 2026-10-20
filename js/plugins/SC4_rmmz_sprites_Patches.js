//=============================================================================
// SC4_rmmz_sprites_Patches.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Surcharges et patches des classes natives de rmmz_sprites.js.
 * @author SimCraft
 * @help
 * ============================================================================
 * SC4_rmmz_sprites_Patches.js
 * ============================================================================
 * Regroupe tous les patches et surcharges apportés aux classes de rmmz_sprites :
 * 
 * 1. Sprite_Character :
 *    - characterPatternY : fallback sécurisé sur les directions cardinales pour
 *      les sprites standards RMMZ 4 directions lorsqu'ils font face à une
 *      diagonale (1, 3, 7, 9).
 * 
 * 2. Spriteset_Map :
 *    - createCharacterSprite : fabrique retournant Sprite_Hero si le personnage
 *      est un Hero (character.isHero()), ou Sprite_Character sinon.
 *    - createCharacters : création des sprites avec support natif RMMZ
 *      (followers().reverseData()).
 * ============================================================================
 */

(() => {
    "use strict";

    // ========================================================================
    // 1. Patches pour Sprite_Character
    // ========================================================================
    const _Sprite_Character_characterPatternY = Sprite_Character.prototype.characterPatternY;
    Sprite_Character.prototype.characterPatternY = function() {
        const dir = this._character.direction();
        if ([1, 3, 7, 9].includes(dir)) {
            // Mappage de repli vers la direction cardinale pour les sprites 4 directions
            const fallback = { 1: 2, 3: 2, 7: 8, 9: 8 }[dir] || 2;
            return (fallback - 2) / 2;
        }
        return _Sprite_Character_characterPatternY.call(this);
    };

    // ========================================================================
    // 2. Patches pour Spriteset_Map
    // ========================================================================
    /**
     * Crée le sprite adapté (Sprite_Hero ou Sprite_Character standard).
     * @param {Game_Character} character 
     * @returns {Sprite_Character}
     */
    Spriteset_Map.prototype.createCharacterSprite = function(character) {
        if ((typeof Game_Player !== "undefined" && character instanceof Game_Player) ||
            (typeof Game_Follower !== "undefined" && character instanceof Game_Follower) ||
            (typeof Game_Event !== "undefined" && character instanceof Game_Event) ||
            (character && typeof character.actorId === "function" && character.actorId() > 0) ||
            (character && character.isHero && character.isHero())) {
            return new Sprite_Hero(character);
        }
        return new Sprite_Character(character);
    };

    /**
     * Surcharge standard de createCharacters pour instancier Sprite_Hero si requis.
     */
    Spriteset_Map.prototype.createCharacters = function() {
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

    // ========================================================================
    // 3. Sprite_PaperdollFace (Portrait dynamique Étape 13)
    // ========================================================================
    const Sprite_BaseClass = (typeof Sprite !== "undefined") ? Sprite : class {};

    let FaceSpriteClass = (typeof Sprite_PaperdollFace !== "undefined") ? Sprite_PaperdollFace : null;
    if (!FaceSpriteClass) {
        FaceSpriteClass = class Sprite_PaperdollFace extends Sprite_BaseClass {
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

            actor() {
                if (!this._actor && this._actorId > 0 && typeof $gameActors !== "undefined" && $gameActors) {
                    this._actor = $gameActors.actor(this._actorId);
                }
                return this._actor;
            }

            actorId() {
                return this._actorId || (this._actor && typeof this._actor.actorId === "function" ? this._actor.actorId() : 0);
            }

            setTargetSize(width, height) {
                this._targetWidth = width || 144;
                this._targetHeight = height || 144;
                this.updateScale();
            }

            isHero() {
                const act = this.actor();
                if (!act) return false;
                if (typeof act.isHero === "function") return act.isHero();
                if (typeof act.hasNotetag === "function") return act.hasNotetag("Hero");
                const data = (typeof act.actor === "function") ? act.actor() : act;
                return Boolean(data && data.note && /<Hero>/i.test(data.note));
            }

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
                    } else {
                        const faceName = (typeof act.faceName === "function") ? act.faceName() : "";
                        this.bitmap = faceName && typeof ImageManager !== "undefined" ? ImageManager.loadFace(faceName) : null;
                    }
                } else {
                    this._compositeEntry = null;
                    this._lastCacheKey = this.currentCacheKey();
                    const faceName = (typeof act.faceName === "function") ? act.faceName() : "";
                    this.bitmap = faceName && typeof ImageManager !== "undefined" ? ImageManager.loadFace(faceName) : null;
                }
                this.updateScale();
            }

            updateScale() {
                if (this.isHero() && this._compositeEntry && this._compositeEntry.isComposed) {
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

                const key = this.currentCacheKey();
                if (key !== this._lastCacheKey) {
                    this.refresh();
                }

                if (this.isHero() && this._compositeEntry) {
                    const { composer, bitmap, isComposed } = this._compositeEntry;
                    if (composer && composer.isReady() && !this._compositeEntry.isComposed) {
                        composer.bltComposite(bitmap);
                        this._compositeEntry.isComposed = true;
                    }
                    if (this.bitmap !== bitmap) {
                        this.bitmap = bitmap;
                    }
                } else {
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
        };
        window.Sprite_PaperdollFace = FaceSpriteClass;
    }

    // ========================================================================
    // 4. Sprite_PlayerHUD (HUD Joueur en haut à gauche : Face 64x64, Nom, PV, MP, TP, XP, Niveau)
    // ========================================================================
    class Sprite_PlayerHUD extends Sprite_BaseClass {
        constructor() {
            super();
            this.bitmap = (typeof Bitmap !== "undefined") ? new Bitmap(144, 150) : null;
            this.x = 20;
            this.y = 20;
            this._lastValues = {};
            this._faceLoaded = false;
            this._isSpeaking = false;

            // Portrait Paperdoll dynamique (Étape 13)
            this._faceSprite = new Sprite_PaperdollFace(null, 64, 64);
            this._faceSprite.x = 10;
            this._faceSprite.y = 18;
            if (typeof this.addChild === "function") {
                this.addChild(this._faceSprite);
            }

            // Calque d'overlay (bordure du faceset et badge du nom au-dessus du visage)
            this._badgeSprite = new Sprite_BaseClass();
            this._badgeSprite.bitmap = (typeof Bitmap !== "undefined") ? new Bitmap(144, 150) : null;
            if (typeof this.addChild === "function") {
                this.addChild(this._badgeSprite);
            }
        }

        update() {
            super.update();
            const actor = this.leaderActor();
            const isSystemVisible = (typeof $gameSystem !== "undefined" && typeof $gameSystem.isPlayerHudVisible === "function")
                ? $gameSystem.isPlayerHudVisible()
                : true;

            if (!actor || !isSystemVisible) {
                this.visible = false;
                return;
            }
            this.visible = true;
            this.updateRedraw(actor);
        }

        leaderActor() {
            if (typeof $gameParty !== "undefined" && $gameParty) {
                return $gameParty.leader();
            }
            return null;
        }

        updateRedraw(actor) {
            const isHero = actor && (
                (typeof actor.isHero === "function" && actor.isHero()) ||
                (actor.hasNotetag && actor.hasNotetag("Hero")) ||
                (actor.actor && actor.actor() && /<Hero>/i.test(actor.actor().note))
            );

            if (this._faceSprite) {
                if (isHero) {
                    this._faceSprite.setActor(actor);
                    this._faceSprite.visible = true;
                } else {
                    this._faceSprite.visible = false;
                }
            }

            let faceEntry = null;
            if (isHero && typeof Bitmap_Composite !== "undefined") {
                faceEntry = Bitmap_Composite.getCompositeFaceEntry(actor);
                if (faceEntry && faceEntry.composer && faceEntry.composer.isReady() && !faceEntry.isComposed) {
                    faceEntry.composer.bltComposite(faceEntry.bitmap);
                    faceEntry.isComposed = true;
                }
            }

            const faceName = (typeof actor.faceName === "function") ? actor.faceName() : "";
            const faceIndex = (typeof actor.faceIndex === "function") ? actor.faceIndex() : 0;
            const faceBitmap = faceName ? ImageManager.loadFace(faceName) : null;
            const isComposed = faceEntry ? Boolean(faceEntry.isComposed) : false;
            const faceReady = isComposed || (faceBitmap ? faceBitmap.isReady() : false);

            const hp = actor.hp;
            const mhp = actor.mhp;
            const mp = actor.mp;
            const mmp = actor.mmp;
            const tp = actor.tp;
            const exp = (typeof actor.currentExp === "function") ? actor.currentExp() : 0;
            const level = actor.level;
            const name = (typeof actor.name === "function") ? actor.name() : "";

            const equips = (typeof actor.equips === "function") ? actor.equips() : [];
            const equipKey = equips.map(e => e ? e.id : 0).join("-");

            const last = this._lastValues;
            const needsRedraw = (
                last.hp !== hp ||
                last.mhp !== mhp ||
                last.mp !== mp ||
                last.mmp !== mmp ||
                last.tp !== tp ||
                last.exp !== exp ||
                last.level !== level ||
                last.name !== name ||
                last.faceName !== faceName ||
                last.faceIndex !== faceIndex ||
                last.equipKey !== equipKey ||
                last.isComposed !== isComposed ||
                (!this._faceLoaded && faceReady)
            );

            if (needsRedraw) {
                this._lastValues = { hp, mhp, mp, mmp, tp, exp, level, name, faceName, faceIndex, equipKey, isComposed };
                this._faceLoaded = faceReady;
                this.drawHud(actor, faceBitmap);
            }
        }

        drawHud(actor, faceBitmap) {
            const ctx = this.bitmap ? this.bitmap.context : null;
            if (!ctx) return;
            this.bitmap.clear();

            if (this._badgeSprite && this._badgeSprite.bitmap) {
                this._badgeSprite.bitmap.clear();
            }

            // 1. Fond général HUD (design sombre, légèrement transparent avec bordure douce)
            ctx.fillStyle = "rgba(12, 16, 24, 0.75)";
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(0, 8, 140, 138, 6);
            else ctx.rect(0, 8, 140, 138);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
            ctx.lineWidth = 1;
            ctx.stroke();

            // 2. Cadre du Faceset (64x64px)
            const fx = 10;
            const fy = 18;
            const fw = 64;
            const fh = 64;

            // Fond du cadre de face
            ctx.fillStyle = "#111111";
            ctx.fillRect(fx, fy, fw, fh);

            const isHero = actor && (
                (typeof actor.isHero === "function" && actor.isHero()) ||
                (actor.hasNotetag && actor.hasNotetag("Hero")) ||
                (actor.actor && actor.actor() && /<Hero>/i.test(actor.actor().note))
            );

            // Dessin du faceset vanilla si non-héros
            if (!isHero && faceBitmap && faceBitmap.isReady()) {
                const pw = ImageManager.faceWidth || 144;
                const ph = ImageManager.faceHeight || 144;
                const faceIdx = (typeof actor.faceIndex === "function") ? actor.faceIndex() : 0;
                const sx = (faceIdx % 4) * pw;
                const sy = Math.floor(faceIdx / 4) * ph;
                const img = faceBitmap._image || faceBitmap._canvas;
                if (img) {
                    ctx.drawImage(img, sx, sy, pw, ph, fx, fy, fw, fh);
                }
            }

            // 3. Dessin du cadre et du badge de nom
            const bCtx = (this._badgeSprite && this._badgeSprite.bitmap) ? this._badgeSprite.bitmap.context : null;

            const drawBorderAndBadge = (targetCtx) => {
                if (!targetCtx) return;
                // Bordure du Faceset (surbrillance rouge 2px si le joueur parle !)
                if (this._isSpeaking) {
                    targetCtx.strokeStyle = "#ff3333";
                    targetCtx.lineWidth = 2;
                    targetCtx.strokeRect(fx + 1, fy + 1, fw - 2, fh - 2);
                } else {
                    targetCtx.strokeStyle = "rgba(255, 255, 255, 0.35)";
                    targetCtx.lineWidth = 1.5;
                    targetCtx.strokeRect(fx, fy, fw, fh);
                }

                // Nom du personnage (à moitié à cheval sur le haut du faceset)
                const nameText = typeof actor.name === "function" ? actor.name() : "";
                targetCtx.font = "bold 11px sans-serif";
                targetCtx.textBaseline = "middle";
                targetCtx.textAlign = "center";
                const textWidth = targetCtx.measureText(nameText).width;
                const badgeW = Math.max(fw, textWidth + 12);
                const badgeX = fx + (fw - badgeW) / 2;
                const badgeY = fy - 8; // Centré à cheval sur fy=18 (donc de 10 à 26)
                const badgeH = 16;

                targetCtx.fillStyle = "rgba(18, 22, 32, 0.9)";
                targetCtx.beginPath();
                if (targetCtx.roundRect) targetCtx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
                else targetCtx.rect(badgeX, badgeY, badgeW, badgeH);
                targetCtx.fill();
                targetCtx.strokeStyle = "rgba(255, 215, 0, 0.6)"; // Liseré doré
                targetCtx.lineWidth = 1;
                targetCtx.stroke();

                targetCtx.fillStyle = "#ffffff";
                targetCtx.shadowColor = "rgba(0, 0, 0, 0.8)";
                targetCtx.shadowBlur = 2;
                targetCtx.fillText(nameText, fx + fw / 2, badgeY + badgeH / 2);
                targetCtx.shadowBlur = 0;
            };

            drawBorderAndBadge(ctx);
            if (bCtx && bCtx !== ctx) {
                drawBorderAndBadge(bCtx);
            }

            // 4. Jauges PV, MP, TP (en dessous du faceset, y >= 88)
            const gx = 10;
            const gw = 120;

            // --- Jauge HP ---
            const hy = 88;
            const hh = 9;
            const hpRate = actor.mhp > 0 ? Math.max(0, Math.min(1, actor.hp / actor.mhp)) : 0;
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.fillRect(gx, hy, gw, hh);

            const hpGrad = ctx.createLinearGradient(gx, hy, gx + gw, hy);
            if (hpRate > 0.5) {
                hpGrad.addColorStop(0, "#2ecc71");
                hpGrad.addColorStop(1, "#27ae60");
            } else if (hpRate > 0.2) {
                hpGrad.addColorStop(0, "#f39c12");
                hpGrad.addColorStop(1, "#e67e22");
            } else {
                hpGrad.addColorStop(0, "#e74c3c");
                hpGrad.addColorStop(1, "#c0392b");
            }
            ctx.fillStyle = hpGrad;
            ctx.fillRect(gx, hy, Math.floor(gw * hpRate), hh);

            // Texte HP
            ctx.font = "bold 8px sans-serif";
            ctx.textAlign = "left";
            ctx.fillStyle = "#ffffff";
            ctx.fillText("HP", gx + 2, hy + hh / 2);
            ctx.textAlign = "right";
            ctx.fillText(`${actor.hp}/${actor.mhp}`, gx + gw - 2, hy + hh / 2);

            // --- Jauge MP ---
            const my = 100;
            const mh = 8;
            const mpRate = actor.mmp > 0 ? Math.max(0, Math.min(1, actor.mp / actor.mmp)) : 0;
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.fillRect(gx, my, gw, mh);

            const mpGrad = ctx.createLinearGradient(gx, my, gx + gw, my);
            mpGrad.addColorStop(0, "#3498db");
            mpGrad.addColorStop(1, "#2980b9");
            ctx.fillStyle = mpGrad;
            ctx.fillRect(gx, my, Math.floor(gw * mpRate), mh);

            ctx.textAlign = "left";
            ctx.fillStyle = "#ffffff";
            ctx.fillText("MP", gx + 2, my + mh / 2);
            ctx.textAlign = "right";
            ctx.fillText(`${actor.mp}/${actor.mmp}`, gx + gw - 2, my + mh / 2);

            // --- Jauge TP ---
            const ty = 111;
            const th = 7;
            const maxTp = typeof actor.maxTp === "function" ? actor.maxTp() : 100;
            const tpRate = maxTp > 0 ? Math.max(0, Math.min(1, actor.tp / maxTp)) : 0;
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.fillRect(gx, ty, gw, th);

            const tpGrad = ctx.createLinearGradient(gx, ty, gx + gw, ty);
            tpGrad.addColorStop(0, "#f1c40f");
            tpGrad.addColorStop(1, "#e67e22");
            ctx.fillStyle = tpGrad;
            ctx.fillRect(gx, ty, Math.floor(gw * tpRate), th);

            ctx.textAlign = "left";
            ctx.fillStyle = "#ffffff";
            ctx.fillText("TP", gx + 2, ty + th / 2);
            ctx.textAlign = "right";
            ctx.fillText(`${Math.floor(actor.tp)}`, gx + gw - 2, ty + th / 2);

            // 5. Jauge d'XP & Niveau (en dessous des jauges PV, MP, TP)
            const xy = 124;
            const xh = 6;
            let expRate = 1.0;
            if (typeof actor.isMaxLevel === "function" && !actor.isMaxLevel()) {
                const cur = (typeof actor.currentExp === "function" ? actor.currentExp() : 0) - (typeof actor.currentLevelExp === "function" ? actor.currentLevelExp() : 0);
                const req = (typeof actor.nextLevelExp === "function" ? actor.nextLevelExp() : 1) - (typeof actor.currentLevelExp === "function" ? actor.currentLevelExp() : 0);
                expRate = req > 0 ? Math.max(0, Math.min(1, cur / req)) : 0;
            }

            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.fillRect(gx, xy, gw, xh);

            const xpGrad = ctx.createLinearGradient(gx, xy, gx + gw, xy);
            xpGrad.addColorStop(0, "#9b59b6");
            xpGrad.addColorStop(1, "#8e44ad");
            ctx.fillStyle = xpGrad;
            ctx.fillRect(gx, xy, Math.floor(gw * expRate), xh);

            // Indication du niveau
            ctx.textAlign = "left";
            ctx.fillStyle = "#ffd700"; // Or pour le niveau
            ctx.fillText(`Nv. ${actor.level}`, gx + 2, xy + xh / 2);
            ctx.textAlign = "right";
            ctx.fillStyle = "#dddddd";
            ctx.fillText(`${Math.floor(expRate * 100)}%`, gx + gw - 2, xy + xh / 2);
        }

        setSpeakingHighlight(active) {
            const bool = Boolean(active);
            if (this._isSpeaking !== bool) {
                this._isSpeaking = bool;
                const actor = this.leaderActor();
                if (actor) {
                    const faceName = (typeof actor.faceName === "function") ? actor.faceName() : "";
                    const faceBitmap = faceName ? ImageManager.loadFace(faceName) : null;
                    this.drawHud(actor, faceBitmap);
                }
            }
        }
    }

    window.Sprite_PlayerHUD = Sprite_PlayerHUD;

    // ========================================================================
    // 4b. Sprite_InterlocutorHUD (Portrait de dialogue PNJ/Interlocuteur en haut à droite)
    // ========================================================================
    class Sprite_InterlocutorHUD extends Sprite_BaseClass {
        constructor() {
            super();
            this.bitmap = (typeof Bitmap !== "undefined") ? new Bitmap(144, 96) : null;
            this.x = (typeof Graphics !== "undefined" ? Graphics.boxWidth : 1760) - 164;
            this.y = 20;
            this.visible = false;

            this._faceSprite = new (window.Sprite_PaperdollFace || Sprite_BaseClass)(null, 64, 64);
            this._faceSprite.x = 10;
            this._faceSprite.y = 18;
            this._faceSprite.visible = false;
            if (typeof this.addChild === "function") {
                this.addChild(this._faceSprite);
            }

            this._badgeSprite = new Sprite_BaseClass();
            this._badgeSprite.bitmap = (typeof Bitmap !== "undefined") ? new Bitmap(144, 96) : null;
            if (typeof this.addChild === "function") {
                this.addChild(this._badgeSprite);
            }

            this._currentKey = "";
        }

        update() {
            super.update();
            const screenW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1760;
            this.x = screenW - 164;

            if (typeof $gameMessage === "undefined" || !$gameMessage.isBusy()) {
                this.visible = false;
                this._currentKey = "";
            }
        }

        hideInterlocutor() {
            this.visible = false;
            this._currentKey = "";
            if (this._faceSprite) this._faceSprite.visible = false;
        }

        showInterlocutor(faceName, faceIndex, speakerName, heroActor = null) {
            this.visible = true;
            const heroId = heroActor ? (typeof heroActor.actorId === "function" ? heroActor.actorId() : (heroActor.id || 0)) : 0;
            const key = `${faceName}_${faceIndex}_${speakerName}_${heroId}`;
            if (this._currentKey === key) return;
            this._currentKey = key;

            const ctx = this.bitmap ? this.bitmap.context : null;
            if (!ctx) return;
            this.bitmap.clear();
            if (this._badgeSprite && this._badgeSprite.bitmap) {
                this._badgeSprite.bitmap.clear();
            }

            // Fond sombre identique au HUD joueur
            ctx.fillStyle = "rgba(12, 16, 24, 0.85)";
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(0, 8, 140, 80, 6);
            else ctx.rect(0, 8, 140, 80);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
            ctx.lineWidth = 1;
            ctx.stroke();

            // Cadre 64x64 du visage
            const fx = 10;
            const fy = 18;
            const fw = 64;
            const fh = 64;

            ctx.fillStyle = "#111111";
            ctx.fillRect(fx, fy, fw, fh);

            if (heroActor && this._faceSprite) {
                this._faceSprite.setActor(heroActor);
                this._faceSprite.visible = true;
            } else {
                if (this._faceSprite) this._faceSprite.visible = false;
                if (faceName) {
                    const faceBitmap = ImageManager.loadFace(faceName);
                    const drawImg = () => {
                        const pw = ImageManager.faceWidth || 144;
                        const ph = ImageManager.faceHeight || 144;
                        const sx = (faceIndex % 4) * pw;
                        const sy = Math.floor(faceIndex / 4) * ph;
                        const img = faceBitmap._image || faceBitmap._canvas;
                        if (img && ctx) {
                            ctx.drawImage(img, sx, sy, pw, ph, fx, fy, fw, fh);
                            this.drawBadge(speakerName);
                        }
                    };
                    if (faceBitmap.isReady()) {
                        drawImg();
                    } else {
                        faceBitmap.addLoadListener(drawImg);
                    }
                }
            }

            this.drawBadge(speakerName);
        }

        drawBadge(speakerName) {
            const fx = 10;
            const fy = 18;
            const fw = 64;
            const fh = 64;

            const targetCtx = (this._badgeSprite && this._badgeSprite.bitmap) ? this._badgeSprite.bitmap.context : (this.bitmap ? this.bitmap.context : null);
            if (!targetCtx) return;

            targetCtx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            targetCtx.lineWidth = 1.5;
            targetCtx.strokeRect(fx, fy, fw, fh);

            const parsedName = typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(speakerName || "") : (speakerName || "");
            if (parsedName) {
                targetCtx.font = "bold 11px sans-serif";
                targetCtx.textBaseline = "middle";
                targetCtx.textAlign = "center";
                const textWidth = targetCtx.measureText(parsedName).width;
                const badgeW = Math.max(fw, textWidth + 12);
                const badgeX = fx + (fw - badgeW) / 2;
                const badgeY = fy - 8;
                const badgeH = 16;

                targetCtx.fillStyle = "rgba(18, 22, 32, 0.95)";
                targetCtx.beginPath();
                if (targetCtx.roundRect) targetCtx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
                else targetCtx.rect(badgeX, badgeY, badgeW, badgeH);
                targetCtx.fill();
                targetCtx.strokeStyle = "rgba(255, 215, 0, 0.7)";
                targetCtx.lineWidth = 1;
                targetCtx.stroke();

                targetCtx.fillStyle = "#ffffff";
                targetCtx.shadowColor = "rgba(0, 0, 0, 0.8)";
                targetCtx.shadowBlur = 2;
                targetCtx.fillText(parsedName, fx + fw / 2, badgeY + badgeH / 2);
                targetCtx.shadowBlur = 0;
            }
        }
    }

    window.Sprite_InterlocutorHUD = Sprite_InterlocutorHUD;

    // ========================================================================
    // 5. Surcharges Window_Base & Window_StatusBase (Étape 13)
    // ========================================================================
    if (typeof Window_Base !== "undefined") {
        if (!Window_Base.prototype.drawDynamicFace) {
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
                    sprite = new (window.Sprite_PaperdollFace || Sprite_BaseClass)(actor, width, height);
                    this._additionalSprites[key] = sprite;
                    if (typeof this.addInnerChild === "function") {
                        this.addInnerChild(sprite);
                    } else if (typeof this.addChild === "function") {
                        this.addChild(sprite);
                    }
                } else {
                    if (typeof sprite.setTargetSize === "function") sprite.setTargetSize(width, height);
                    if (typeof sprite.setActor === "function") sprite.setActor(actor);
                }

                if (typeof sprite.move === "function") sprite.move(x, y);
                else { sprite.x = x; sprite.y = y; }

                if (typeof sprite.show === "function") sprite.show();
                else sprite.visible = true;

                sprite._inUse = true;
                return sprite;
            };
        }

        if (!Window_Base.prototype.drawActorFace) {
            Window_Base.prototype.drawActorFace = function(actor, x, y, width, height) {
                const isHero = actor && (
                    (typeof actor.isHero === "function" && actor.isHero()) ||
                    (actor.hasNotetag && actor.hasNotetag("Hero")) ||
                    (actor.actor && actor.actor() && /<Hero>/i.test(actor.actor().note))
                );
                if (isHero && typeof this.drawDynamicFace === "function") {
                    this.drawDynamicFace(actor, x, y, width, height);
                } else if (typeof this.drawFace === "function") {
                    this.drawFace(actor.faceName(), actor.faceIndex(), x, y, width, height);
                }
            };
        }

        if (!Window_Base.prototype.drawActorPicture) {
            Window_Base.prototype.drawActorPicture = function(actor, x, y, width, height) {
                this.drawActorFace(actor, x, y, width, height);
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
            if (isHero && typeof this.drawDynamicFace === "function") {
                this.drawDynamicFace(actor, x, y, width, height);
            } else if (_Window_StatusBase_drawActorFace) {
                _Window_StatusBase_drawActorFace.call(this, actor, x, y, width, height);
            } else if (typeof this.drawFace === "function") {
                this.drawFace(actor.faceName(), actor.faceIndex(), x, y, width, height);
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
