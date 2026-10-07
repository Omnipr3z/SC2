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
    // 3. Sprite_PlayerHUD (HUD Joueur en haut à gauche : Face 64x64, Nom, PV, MP, TP, XP, Niveau)
    // ========================================================================
    const Sprite_BaseClass = (typeof Sprite !== "undefined") ? Sprite : class {};
    class Sprite_PlayerHUD extends Sprite_BaseClass {
        constructor() {
            super();
            this.bitmap = (typeof Bitmap !== "undefined") ? new Bitmap(144, 150) : null;
            this.x = 20;
            this.y = 20;
            this._lastValues = {};
            this._faceLoaded = false;
        }

        update() {
            super.update();
            const actor = this.leaderActor();
            if (!actor) {
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
            const faceName = (typeof actor.faceName === "function") ? actor.faceName() : "";
            const faceIndex = (typeof actor.faceIndex === "function") ? actor.faceIndex() : 0;
            const faceBitmap = faceName ? ImageManager.loadFace(faceName) : null;
            const faceReady = faceBitmap ? faceBitmap.isReady() : false;

            const hp = actor.hp;
            const mhp = actor.mhp;
            const mp = actor.mp;
            const mmp = actor.mmp;
            const tp = actor.tp;
            const exp = (typeof actor.currentExp === "function") ? actor.currentExp() : 0;
            const level = actor.level;
            const name = (typeof actor.name === "function") ? actor.name() : "";

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
                (!this._faceLoaded && faceReady)
            );

            if (needsRedraw) {
                this._lastValues = { hp, mhp, mp, mmp, tp, exp, level, name, faceName, faceIndex };
                this._faceLoaded = faceReady;
                this.drawHud(actor, faceBitmap);
            }
        }

        drawHud(actor, faceBitmap) {
            const ctx = this.bitmap.context;
            if (!ctx) return;
            this.bitmap.clear();

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

            // Dessin du Faceset si prêt
            if (faceBitmap && faceBitmap.isReady()) {
                const pw = ImageManager.faceWidth || 144;
                const ph = ImageManager.faceHeight || 144;
                const sx = ((typeof actor.faceIndex === "function" ? actor.faceIndex() : 0) % 4) * pw;
                const sy = Math.floor(((typeof actor.faceIndex === "function" ? actor.faceIndex() : 0) / 4)) * ph;
                const img = faceBitmap._image || faceBitmap._canvas;
                if (img) {
                    ctx.drawImage(img, sx, sy, pw, ph, fx, fy, fw, fh);
                }
            }

            // Bordure du Faceset
            ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(fx, fy, fw, fh);

            // 3. Nom du personnage (à moitié à cheval sur le haut du faceset)
            const nameText = typeof actor.name === "function" ? actor.name() : "";
            ctx.font = "bold 11px sans-serif";
            ctx.textBaseline = "middle";
            ctx.textAlign = "center";
            const textWidth = ctx.measureText(nameText).width;
            const badgeW = Math.max(fw, textWidth + 12);
            const badgeX = fx + (fw - badgeW) / 2;
            const badgeY = fy - 8; // Centré à cheval sur fy=18 (donc de 10 à 26)
            const badgeH = 16;

            ctx.fillStyle = "rgba(18, 22, 32, 0.9)";
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
            else ctx.rect(badgeX, badgeY, badgeW, badgeH);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 215, 0, 0.6)"; // Liseré doré
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
            ctx.shadowBlur = 2;
            ctx.fillText(nameText, fx + fw / 2, badgeY + badgeH / 2);
            ctx.shadowBlur = 0;

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
    }

    window.Sprite_PlayerHUD = Sprite_PlayerHUD;

})();
