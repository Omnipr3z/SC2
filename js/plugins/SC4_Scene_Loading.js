//=============================================================================
// SC4_Scene_Loading.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Écran de démarrage et préchargement persistant des assets composites Paperdoll (Scene_Loading).
 * @author SimCraft
 * @base SC4_Sprite_NeonArrowBase
 * @help
 * ============================================================================
 * SC4_Scene_Loading.js
 * ============================================================================
 * Scène de préchargement exécutée une fois après Scene_Boot (avant
 * Scene_Splash / Scene_Title, ou Scene_Map en mode test sans écran-titre).
 *
 * Fonctionnalités :
 * - Scanne dynamiquement img/characters/composite/ (NW.js fs, .png & .png_).
 * - Charge tous les assets composites par lots vers ImageManager._system.
 * - Pré-remplit Bitmap_Composite._fileExistsCache.
 * - Affiche un écran noir avec logo rotatif img/system/screwLoading.png
 *   en bas à droite et une flèche néon cyan qui grandit jusqu'à 100 % avec
 *   le compteur (chargés / total • %).
 * - Émet une alerte DEBUGTOOL.warn si la empreinte mémoire dépasse le seuil.
 * ============================================================================
 */

class Scene_Loading extends Scene_Base {
    static COMPOSITE_FOLDER = "img/characters/composite/";
    static WARN_COMPOSITE_FILES = 400;
    static WARN_COMPOSITE_RAM_MB = 350;
    static SCREW_IMAGE_NAME = "screwLoading";

    static _preloaded = false;
    static _nextSceneClass = null;
    static _preloadStats = null;
    static _customEntriesProvider = null;

    static hasPreloadedComposites() {
        return Boolean(this._preloaded);
    }

    static setNextSceneClass(sceneClass) {
        this._nextSceneClass = sceneClass || null;
    }

    static getPreloadStats() {
        return this._preloadStats ? Object.assign({}, this._preloadStats) : null;
    }

    static resetPreloadState() {
        this._preloaded = false;
        this._nextSceneClass = null;
        this._preloadStats = null;
    }

    static resolveBaseDir() {
        if (typeof require !== "function" || typeof process !== "object") {
            return ".";
        }
        const path = require("path");
        if (process.mainModule && process.mainModule.filename) {
            return path.dirname(process.mainModule.filename);
        }
        return typeof process.cwd === "function" ? process.cwd() : ".";
    }

    static resolveCompositeFolderPath(normalizedBase) {
        if (typeof require !== "function" || typeof process !== "object") {
            return null;
        }
        const fs = require("fs");
        const path = require("path");
        const candidates = [this.resolveBaseDir()];
        if (typeof process.cwd === "function") {
            candidates.push(process.cwd());
        }
        if (typeof __dirname === "string") {
            candidates.push(path.resolve(__dirname, "../.."));
        }
        for (const rootDir of candidates) {
            if (!rootDir) continue;
            const candidatePath = path.join(rootDir, normalizedBase);
            if (fs.existsSync(candidatePath)) {
                return candidatePath;
            }
        }
        return null;
    }

    /**
     * Scanne récursivement img/characters/composite/ pour obtenir toutes les briques PNG.
     * Pré-remplit également Bitmap_Composite._fileExistsCache pour éviter des fs.existsSync en jeu.
     * @param {string} [baseFolder="img/characters/composite/"]
     * @returns {Array<{ folder: string, filename: string, url: string }>}
     */
    static scanCompositeEntries(baseFolder = Scene_Loading.COMPOSITE_FOLDER) {
        if (typeof this._customEntriesProvider === "function") {
            return this._customEntriesProvider(baseFolder) || [];
        }

        const normalizedBase = baseFolder.endsWith("/") ? baseFolder : `${baseFolder}/`;
        const entries = [];

        if (typeof require !== "function" || typeof process !== "object") {
            return entries;
        }

        try {
            const fs = require("fs");
            const path = require("path");
            const absRoot = this.resolveCompositeFolderPath(normalizedBase);
            if (!absRoot) {
                return entries;
            }

            const encodeUri = (typeof Utils !== "undefined" && typeof Utils.encodeURI === "function")
                ? Utils.encodeURI.bind(Utils)
                : (str => encodeURIComponent(str));

            const walk = (absDir, relFolder) => {
                const dirents = fs.readdirSync(absDir, { withFileTypes: true });
                dirents.sort((a, b) => a.name.localeCompare(b.name));
                for (const dirent of dirents) {
                    const absChild = path.join(absDir, dirent.name);
                    if (dirent.isDirectory()) {
                        walk(absChild, `${relFolder}${dirent.name}/`);
                    } else if (/\.png_?$/i.test(dirent.name)) {
                        const filename = dirent.name.replace(/\.png_?$/i, "");
                        const url = `${relFolder}${encodeUri(filename)}.png`;
                        entries.push({ folder: relFolder, filename, url });
                        if (typeof Bitmap_Composite !== "undefined" && Bitmap_Composite._fileExistsCache) {
                            Bitmap_Composite._fileExistsCache.set(`${relFolder}${filename}`, true);
                        }
                    }
                }
            };

            walk(absRoot, normalizedBase);
        } catch (err) {
            if (typeof DEBUGTOOL !== "undefined" && typeof DEBUGTOOL.error === "function") {
                DEBUGTOOL.error(`[Scene_Loading] Erreur scan ${normalizedBase}: ${err && err.message ? err.message : err}`, "LOADING");
            }
        }

        entries.sort((a, b) => a.url.localeCompare(b.url));
        return entries;
    }

    initialize() {
        super.initialize();
        this._entries = [];
        this._bitmaps = [];
        this._queueIndex = 0;
        this._batchSize = 10;
        this._totalCount = 0;
        this._readyCount = 0;
        this._errorCount = 0;
        this._holdFrames = 0;
        this._completed = false;
        this._startTime = 0;

        this._lastDrawnArrowWidth = -1;
        this._lastDrawnDone = -1;
        this._lastDrawnTotal = -1;
        this._lastDrawnPercent = -1;

        this._bgSprite = null;
        this._bgBitmap = null;
        this._screwSprite = null;
        this._trackSprite = null;
        this._trackBitmap = null;
        this._arrowSprite = null;
        this._arrowBitmap = null;
        this._labelSprite = null;
        this._labelBitmap = null;
    }

    create() {
        super.create();
        this.createBackground();
        this.createScrewSprite();
        this.createProgressDisplay();
    }

    createBackground() {
        const w = (typeof Graphics !== "undefined" && Graphics.width) ? Graphics.width : 1760;
        const h = (typeof Graphics !== "undefined" && Graphics.height) ? Graphics.height : 990;
        this._bgBitmap = new Bitmap(w, h);
        this._bgBitmap.fillAll("#000000");
        this._bgSprite = new Sprite(this._bgBitmap);
        this.addChild(this._bgSprite);
    }

    createScrewSprite() {
        const w = (typeof Graphics !== "undefined" && Graphics.width) ? Graphics.width : 1760;
        const h = (typeof Graphics !== "undefined" && Graphics.height) ? Graphics.height : 990;
        const bitmap = (typeof ImageManager !== "undefined" && typeof ImageManager.loadSystem === "function")
            ? ImageManager.loadSystem(Scene_Loading.SCREW_IMAGE_NAME)
            : null;
        if (bitmap) {
            bitmap.smooth = false;
        }
        this._screwSprite = new Sprite(bitmap);
        if (this._screwSprite.anchor && typeof this._screwSprite.anchor.set === "function") {
            this._screwSprite.anchor.set(0.5, 0.5);
        } else {
            this._screwSprite.anchor = { x: 0.5, y: 0.5 };
        }
        if (this._screwSprite.scale && typeof this._screwSprite.scale.set === "function") {
            this._screwSprite.scale.set(2, 2);
        } else {
            this._screwSprite.scale = { x: 2, y: 2 };
        }
        this._screwSprite.x = w - 68;
        this._screwSprite.y = h - 68;
        this._screwSprite.opacity = 230;
        this.addChild(this._screwSprite);
    }

    progressBarRect() {
        const screenW = (typeof Graphics !== "undefined" && Graphics.width) ? Graphics.width : 1760;
        const screenH = (typeof Graphics !== "undefined" && Graphics.height) ? Graphics.height : 990;
        const boxW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : screenW;
        const width = Math.min(760, Math.max(320, Math.floor(boxW * 0.52)));
        const height = 36;
        const x = Math.floor((screenW - width) / 2);
        const y = screenH - 86;
        return new Rectangle(x, y, width, height);
    }

    createProgressDisplay() {
        const rect = this.progressBarRect();

        this._trackBitmap = new Bitmap(rect.width, rect.height);
        this.drawProgressTrack(this._trackBitmap, rect.width, rect.height);
        this._trackSprite = new Sprite(this._trackBitmap);
        this._trackSprite.x = rect.x;
        this._trackSprite.y = rect.y;
        this.addChild(this._trackSprite);

        this._arrowBitmap = new Bitmap(rect.width, rect.height);
        this._arrowSprite = new Sprite(this._arrowBitmap);
        this._arrowSprite.x = rect.x;
        this._arrowSprite.y = rect.y;
        this.addChild(this._arrowSprite);

        const labelHeight = 36;
        this._labelBitmap = new Bitmap(rect.width, labelHeight);
        this._labelSprite = new Sprite(this._labelBitmap);
        this._labelSprite.x = rect.x;
        this._labelSprite.y = rect.y - labelHeight - 6;
        this.addChild(this._labelSprite);
    }

    drawProgressTrack(bitmap, width, height) {
        if (!bitmap) return;
        const ctx = bitmap.context;
        if (!ctx) return;
        const cy = height / 2;
        ctx.save();
        ctx.fillStyle = "rgba(8, 20, 28, 0.9)";
        ctx.strokeStyle = "rgba(0, 238, 255, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(width - 2, cy);
        ctx.lineTo(width - 18, 4);
        ctx.lineTo(width - 18, cy - 5);
        ctx.lineTo(2, cy - 5);
        ctx.lineTo(2, cy + 5);
        ctx.lineTo(width - 18, cy + 5);
        ctx.lineTo(width - 18, height - 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        if (bitmap._baseTexture && typeof bitmap._baseTexture.update === "function") {
            bitmap._baseTexture.update();
        }
    }

    drawProgressArrow(ratio) {
        const bmp = this._arrowBitmap;
        if (!bmp) return;
        const maxW = bmp.width;
        const h = bmp.height;
        const clamped = Math.max(0, Math.min(1, ratio));
        const targetW = clamped <= 0 ? 0 : Math.min(maxW, Math.max(22, Math.round(maxW * clamped)));

        if (targetW === this._lastDrawnArrowWidth) return;
        this._lastDrawnArrowWidth = targetW;

        bmp.clear();
        if (targetW <= 0) return;

        const ctx = bmp.context;
        if (!ctx) return;

        ctx.save();
        ctx.fillStyle = "rgba(0, 238, 255, 0.85)";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#00eeff";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        if (typeof Sprite_NeonArrowBase !== "undefined" &&
            Sprite_NeonArrowBase.prototype &&
            typeof Sprite_NeonArrowBase.prototype.drawArrowPolygon === "function") {
            Sprite_NeonArrowBase.prototype.drawArrowPolygon(ctx, targetW, h, "right");
        } else {
            const cy = h / 2;
            ctx.moveTo(targetW - 2, cy);
            ctx.lineTo(targetW - 18, 4);
            ctx.lineTo(targetW - 18, cy - 5);
            ctx.lineTo(2, cy - 5);
            ctx.lineTo(2, cy + 5);
            ctx.lineTo(targetW - 18, cy + 5);
            ctx.lineTo(targetW - 18, h - 4);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        if (bmp._baseTexture && typeof bmp._baseTexture.update === "function") {
            bmp._baseTexture.update();
        }
    }

    drawProgressLabel(doneCount, totalCount, percent) {
        if (
            doneCount === this._lastDrawnDone &&
            totalCount === this._lastDrawnTotal &&
            percent === this._lastDrawnPercent
        ) {
            return;
        }
        this._lastDrawnDone = doneCount;
        this._lastDrawnTotal = totalCount;
        this._lastDrawnPercent = percent;

        const bmp = this._labelBitmap;
        if (!bmp) return;
        bmp.clear();
        bmp.fontSize = 18;
        bmp.fontFace = (typeof $gameSystem !== "undefined" && $gameSystem && typeof $gameSystem.mainFontFace === "function")
            ? $gameSystem.mainFontFace()
            : "rmmz-mainfont, sans-serif";
        bmp.textColor = "#d9fbff";
        bmp.outlineColor = "rgba(0, 0, 0, 0.9)";
        bmp.outlineWidth = 4;

        const text = `CHARGEMENT COMPOSITES   ${doneCount} / ${totalCount}   (${percent} %)`;
        bmp.drawText(text, 0, 0, bmp.width, bmp.height, "center");
    }

    start() {
        super.start();
        this._startTime = Date.now();
        this._entries = Scene_Loading.scanCompositeEntries();
        this._totalCount = this._entries.length;
        this._batchSize = Math.max(6, Math.ceil(this._totalCount / 18));
        this.refreshProgressDisplay();
    }

    enqueueNextBatch() {
        if (this._queueIndex >= this._totalCount) return;
        const limit = Math.min(this._totalCount, this._queueIndex + this._batchSize);
        while (this._queueIndex < limit) {
            const entry = this._entries[this._queueIndex++];
            if (typeof ImageManager !== "undefined" && typeof ImageManager.loadBitmap === "function") {
                const bitmap = ImageManager.loadBitmap(entry.folder, entry.filename);
                this._bitmaps.push(bitmap);
            }
        }
    }

    collectProgressCounts() {
        let ready = 0;
        let errors = 0;
        for (const bmp of this._bitmaps) {
            if (!bmp) {
                errors++;
                continue;
            }
            if (typeof bmp.isError === "function" && bmp.isError()) {
                errors++;
                if (!bmp._sc4LoadingErrorLogged) {
                    bmp._sc4LoadingErrorLogged = true;
                    if (typeof DEBUGTOOL !== "undefined" && typeof DEBUGTOOL.error === "function") {
                        DEBUGTOOL.error(`[Scene_Loading] Échec de chargement asset composite : ${bmp.url || "inconnu"}`, "LOADING");
                    }
                }
            } else if (typeof bmp.isReady === "function" ? bmp.isReady() : true) {
                ready++;
            }
        }
        this._readyCount = ready;
        this._errorCount = errors;
        return ready + errors;
    }

    refreshProgressDisplay() {
        const total = this._totalCount;
        const done = total === 0 ? 0 : Math.min(total, this._readyCount + this._errorCount);
        const ratio = total === 0 ? 1 : done / total;
        const percent = Math.round(ratio * 100);
        this.drawProgressArrow(ratio);
        this.drawProgressLabel(done, total, percent);
    }

    update() {
        super.update();

        if (this._screwSprite) {
            this._screwSprite.rotation += 0.08;
        }

        if (this._completed) return;

        this.enqueueNextBatch();
        const doneCount = this.collectProgressCounts();
        this.refreshProgressDisplay();

        if (this._queueIndex >= this._totalCount && doneCount >= this._totalCount) {
            this._holdFrames++;
            if (this._holdFrames >= 12) {
                this.finishLoading();
            }
        }
    }

    reportPreloadMemoryStats(elapsedMs) {
        let totalPixels = 0;
        for (const bmp of this._bitmaps) {
            if (bmp && bmp.width > 0 && bmp.height > 0) {
                totalPixels += bmp.width * bmp.height;
            }
        }
        const ramMB = (totalPixels * 4) / 1048576;
        const stats = {
            fileCount: this._totalCount,
            loadedCount: this._readyCount,
            errorCount: this._errorCount,
            ramMB: Number(ramMB.toFixed(2)),
            elapsedMs
        };
        Scene_Loading._preloadStats = stats;

        if (typeof DEBUGTOOL !== "undefined") {
            if (stats.fileCount >= Scene_Loading.WARN_COMPOSITE_FILES || stats.ramMB >= Scene_Loading.WARN_COMPOSITE_RAM_MB) {
                if (typeof DEBUGTOOL.warn === "function") {
                    DEBUGTOOL.warn(
                        `[Scene_Loading] Préchargement _system lourd : ${stats.fileCount} fichiers (~${stats.ramMB} Mo RAM). Envisager un dégraissage ou cache partiel.`,
                        "CACHE"
                    );
                }
            } else if (typeof DEBUGTOOL.info === "function") {
                DEBUGTOOL.info(
                    `[Scene_Loading] Préchargement composite terminé : ${stats.loadedCount}/${stats.fileCount} fichiers (~${stats.ramMB} Mo RAM) en ${elapsedMs} ms.`,
                    "CACHE"
                );
            }
        }
    }

    finishLoading() {
        if (this._completed) return;
        this._completed = true;
        Scene_Loading._preloaded = true;

        const elapsedMs = Math.max(0, Date.now() - this._startTime);
        this.reportPreloadMemoryStats(elapsedMs);

        const targetScene = Scene_Loading._nextSceneClass || (typeof Scene_Splash !== "undefined" ? Scene_Splash : Scene_Title);
        Scene_Loading._nextSceneClass = null;

        if (typeof SceneManager !== "undefined" && typeof SceneManager.goto === "function") {
            SceneManager.goto(targetScene);
        }
    }

    terminate() {
        super.terminate();
        const ownBitmaps = [this._bgBitmap, this._trackBitmap, this._arrowBitmap, this._labelBitmap];
        for (const bmp of ownBitmaps) {
            if (bmp && typeof bmp.destroy === "function") {
                bmp.destroy();
            }
        }
        this._bgBitmap = null;
        this._trackBitmap = null;
        this._arrowBitmap = null;
        this._labelBitmap = null;
    }
}

window.Scene_Loading = Scene_Loading;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Scene_Loading;
}
