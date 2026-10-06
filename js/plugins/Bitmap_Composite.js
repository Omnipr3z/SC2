//=============================================================================
// Bitmap_Composite.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Compositeur d'images multi-couches pour le système Paperdoll.
 * @author SimCraft
 * @help
 * ============================================================================
 * Bitmap_Composite.js
 * ============================================================================
 * Cette classe gère l'assemblage dynamique des couches graphiques du Paperdoll
 * (corps de base, visage, équipements/vêtements) selon leur z-index.
 *
 * Fonctionnalités :
 * - Gestion ordonnée des couches par z-index.
 * - Chargement asynchrone non-bloquant des images via ImageManager.
 * - Fusion (blt) sur un Bitmap composite de destination.
 * - Gestion d'un cache centralisé pour des performances optimales (60 FPS).
 * ============================================================================
 */

/**
 * Composeur de Bitmap multi-couches pour Paperdoll.
 */
class Bitmap_Composite {
    constructor() {
        this._layers = [];
        this._bitmaps = [];
        this._isReady = false;
    }

    /**
     * Ajoute une couche à composer.
     * @param {string} folder Chemin du dossier (ex: "img/characters/composite/")
     * @param {string} filename Nom de l'image sans extension
     * @param {number} z Ordre de superposition (plus grand = au-dessus)
     */
    addLayer(folder, filename, z = 0) {
        if (!filename) return;
        this._layers.push({ folder, filename, z: Number(z) || 0 });
        this._layers.sort((a, b) => a.z - b.z);
    }

    /**
     * Réinitialise les couches.
     */
    clear() {
        this._layers = [];
        this._bitmaps = [];
        this._isReady = false;
    }

    /**
     * Lance le chargement asynchrone de toutes les couches via ImageManager.
     */
    loadLayers() {
        this._bitmaps = this._layers.map(layer => {
            return ImageManager.loadBitmap(layer.folder, layer.filename);
        });
    }

    /**
     * Indique si toutes les images ont fini d'être chargées.
     * @returns {boolean}
     */
    isReady() {
        if (this._layers.length === 0) return true;
        if (this._bitmaps.length === 0) return false;
        return this._bitmaps.every(bitmap => bitmap && bitmap.isReady());
    }

    /**
     * Fusionne (blt) toutes les couches dans le bitmap de destination.
     * @param {Bitmap} destinationBitmap 
     */
    bltComposite(destinationBitmap) {
        if (!this.isReady() || !destinationBitmap) return;

        // Ajuste automatiquement la taille du canvas à la taille maximale des calques
        let maxWidth = 0;
        let maxHeight = 0;
        for (const b of this._bitmaps) {
            if (b && b.width > 0) {
                if (b.width > maxWidth) maxWidth = b.width;
                if (b.height > maxHeight) maxHeight = b.height;
            }
        }

        if (maxWidth > 0 && (destinationBitmap.width !== maxWidth || destinationBitmap.height !== maxHeight)) {
            destinationBitmap.resize(maxWidth, maxHeight);
        }

        destinationBitmap.clear();
        for (const bitmap of this._bitmaps) {
            if (bitmap && bitmap.width > 0 && bitmap.height > 0) {
                destinationBitmap.blt(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0);
            }
        }
    }

    // ========================================================================
    // Méthodes statiques d'assistance & Cache
    // ========================================================================

    /**
     * Cache global des composites : cacheKey -> { bitmap, composer, isComposed }
     */
    static _cache = new Map();

    /**
     * Cache des vérifications d'existence de fichiers pour préserver les 60 FPS.
     */
    static _fileExistsCache = new Map();

    /**
     * Vérifie si un fichier image existe sur le disque (NW.js) ou via serveur (navigateur).
     * @param {string} folder 
     * @param {string} filename 
     * @returns {boolean}
     */
    static fileExists(folder, filename) {
        if (!filename) return false;
        const key = `${folder}${filename}`;
        if (this._fileExistsCache.has(key)) {
            return this._fileExistsCache.get(key);
        }

        let exists = false;
        if (typeof require === "function" && typeof process === "object") {
            try {
                const fs = require("fs");
                const path = require("path");
                const baseDir = (process.mainModule && process.mainModule.filename)
                    ? path.dirname(process.mainModule.filename)
                    : (typeof process.cwd === "function" ? process.cwd() : ".");
                let fullPath = path.join(baseDir, folder, filename + ".png");
                exists = fs.existsSync(fullPath);
                if (!exists && typeof process.cwd === "function") {
                    exists = fs.existsSync(path.join(process.cwd(), folder, filename + ".png"));
                }
            } catch (e) {
                exists = false;
            }
        } else if (typeof XMLHttpRequest !== "undefined") {
            try {
                const xhr = new XMLHttpRequest();
                xhr.open("HEAD", folder + filename + ".png", false);
                xhr.send();
                exists = (xhr.status >= 200 && xhr.status < 300);
            } catch (e) {
                exists = false;
            }
        } else {
            exists = true;
        }

        this._fileExistsCache.set(key, exists);
        return exists;
    }

    /**
     * Résout les suffixes d'actions candidats pour la recherche de fichiers d'images.
     * Mappe de façon transparente "dash" <-> "run" pour garantir la compatibilité
     * entre les actions du code et les suffixes d'assets sur le disque.
     * @param {string} action 
     * @returns {string[]}
     */
    static resolveActionCandidates(action) {
        const act = (action || "walk").toLowerCase();
        if (act === "dash") {
            return ["dash", "run", "walk"];
        }
        if (act === "run") {
            return ["run", "dash", "walk"];
        }
        if (act !== "walk") {
            return [act, "walk"];
        }
        return ["walk"];
    }

    /**
     * Détermine le dossier pour les équipements (supporte equipments/ et equips/).
     * @param {string} filename 
     * @returns {string}
     */
    static resolveEquipFolder(filename) {
        if (this.fileExists("img/characters/composite/equipments/", filename)) {
            return "img/characters/composite/equipments/";
        }
        return "img/characters/composite/equips/";
    }

    /**
     * Génère ou récupère l'entrée de cache composite pour un héros donné.
     * @param {Game_Hero} hero 
     * @param {string} action (défaut: "walk")
     * @returns {{ bitmap: Bitmap, composer: Bitmap_Composite, isComposed: boolean }}
     */
    static getCompositeEntry(hero, action = "walk") {
        if (!hero) return null;

        const cacheKey = hero.getCompositeCacheKey(action);
        if (this._cache.has(cacheKey)) {
            return this._cache.get(cacheKey);
        }

        const composer = new Bitmap_Composite();
        const race = (hero.race() || "human").toLowerCase();
        const sex = (hero.sex() || "male").toLowerCase();
        const act = (action || "walk").toLowerCase();
        const actionCandidates = this.resolveActionCandidates(act);

        // 1. Couche du corps de base (z-index: 50 par défaut)
        let baseFilename = "";
        for (const candidate of actionCandidates) {
            const fn = `${race}_${sex}_${candidate}`;
            if (this.fileExists("img/characters/composite/", fn)) {
                baseFilename = fn;
                break;
            }
        }
        if (baseFilename) {
            composer.addLayer("img/characters/composite/", baseFilename, 50);
        }

        // 2. Couche du visage (z-index: 60) si <Face> est présent
        let faceFilename = "";
        if (hero.hasFace()) {
            for (const candidate of actionCandidates) {
                const fn = `${hero.actorId()}_${candidate}`;
                if (this.fileExists("img/characters/composite/faces/", fn)) {
                    faceFilename = fn;
                    break;
                }
            }
            if (faceFilename) {
                composer.addLayer("img/characters/composite/faces/", faceFilename, 60);
            }
        }

        // 3. Couches d'équipements (<visual_equip: FILENAME, ZINDEX>)
        const equipLayers = hero.getVisualEquipLayers();
        for (const eq of equipLayers) {
            let eqFilename = "";
            let folder = "";
            for (const candidate of actionCandidates) {
                const fn = `${race}_${sex}_${eq.filename.toLowerCase()}_${candidate}`;
                const resolvedFolder = this.resolveEquipFolder(fn);
                if (this.fileExists(resolvedFolder, fn)) {
                    eqFilename = fn;
                    folder = resolvedFolder;
                    break;
                }
            }
            if (eqFilename) {
                composer.addLayer(folder, eqFilename, eq.zindex);
            }
        }

        // Planche 96x96 pixels : 3 colonnes de frames x 8 lignes de direction
        const destinationBitmap = new Bitmap(288, 768);
        composer.loadLayers();

        const entry = {
            bitmap: destinationBitmap,
            composer: composer,
            isComposed: false
        };

        this._cache.set(cacheKey, entry);
        return entry;
    }
}

window.Bitmap_Composite = Bitmap_Composite;
