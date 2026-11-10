//=============================================================================
// SC4_MapOverlaysManager.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Gestionnaire d'overlays cartographiques, toits, fogs, lumières et décors sticky ($mapOverlaysManager).
 * @author SimCraft
 * @help
 * ============================================================================
 * SC4_MapOverlaysManager.js
 * ============================================================================
 * Gère l'état logique, l'interpolation et la persistance des couches d'images
 * graphiques ancrées à la carte (Toits escamotables, fogs, ombres, lumières).
 * 
 * Syntaxe Notetag de Carte :
 * <overlay: id, imgName, type, zIndex, xMap, yMap, opacity, persistant, blendMode, hue, regionTrigger>
 * 
 * Exemples :
 * <overlay: roof_1, roof_barracks, static, 5, 14, 8, 255, false, 0, 0, 15>
 * <overlay: fog_alien, mist_green, fog, 6, 0, 0, 120, false, 1, 90>
 * ============================================================================
 */

(() => {
    "use strict";

    const clamp = (val, min, max) => Math.min(Math.max(Number(val) || 0, min), max);

    //=============================================================================
    // Game_MapOverlay
    //=============================================================================
    class Game_MapOverlay {
        constructor(data = {}) {
            this.initialize(data);
        }

        initialize(data = {}) {
            this._id = String(data.id || "overlay_" + Math.random().toString(36).substr(2, 6));
            this._imgName = String(data.imgName || "");
            this._type = String(data.type || "static").toLowerCase();
            this._zIndex = (data.zIndex !== undefined) ? Number(data.zIndex) : 4;
            this._xMap = (data.xMap !== undefined) ? Number(data.xMap) : 0;
            this._yMap = (data.yMap !== undefined) ? Number(data.yMap) : 0;
            this._opacity = (data.opacity !== undefined) ? clamp(data.opacity, 0, 255) : 255;
            this._targetOpacity = this._opacity;
            this._baseOpacity = this._opacity;
            this._persistant = Boolean(data.persistant);
            this._blendMode = (data.blendMode !== undefined) ? Number(data.blendMode) : 0;
            this._hue = (data.hue !== undefined) ? Number(data.hue) : 0;
            this._regionTrigger = (data.regionTrigger !== undefined) ? Number(data.regionTrigger) : 0;
            this._anchorX = (data.anchorX !== undefined) ? Number(data.anchorX) : 0;
            this._anchorY = (data.anchorY !== undefined) ? Number(data.anchorY) : 0;

            // Flicker / Scintillement
            this._flickerType = data.flickerType || null;
            this._flickerSpeed = (data.flickerSpeed !== undefined) ? Number(data.flickerSpeed) : 0.04;
            this._flickerTimer = 0;

            // Interpolation / Vitesses (Durée par défaut : 80 frames pour les toits, 16 frames pour les fogs/standards)
            const isRoof = String(this._type || "").toLowerCase().includes("roof");
            const defaultFadeSpeed = isRoof ? (this._baseOpacity / 80) : 16;
            if (data.fadeDuration !== undefined && Number(data.fadeDuration) > 0) {
                this._fadeSpeed = this._baseOpacity / Number(data.fadeDuration);
            } else if (data.fadeSpeed !== undefined) {
                this._fadeSpeed = Number(data.fadeSpeed);
            } else {
                this._fadeSpeed = defaultFadeSpeed;
            }

            this._zoomX = (data.zoomX !== undefined) ? Number(data.zoomX) : 1.0;
            this._zoomY = (data.zoomY !== undefined) ? Number(data.zoomY) : 1.0;
            this._targetZoomX = this._zoomX;
            this._targetZoomY = this._zoomY;
            this._zoomSpeed = 0.05;

            this._targetXMap = null;
            this._targetYMap = null;
            this._moveSpeed = 0.1;

            this._visible = (data.visible !== undefined) ? Boolean(data.visible) : true;
        }

        get id() { return this._id; }
        get imgName() { return this._imgName; }
        get type() { return this._type; }
        get zIndex() { return this._zIndex; }
        get xMap() { return this._xMap; }
        get yMap() { return this._yMap; }
        get opacity() { return this._opacity; }
        get targetOpacity() { return this._targetOpacity; }
        get baseOpacity() { return this._baseOpacity; }
        get persistant() { return this._persistant; }
        get blendMode() { return this._blendMode; }
        get hue() { return this._hue; }
        get regionTrigger() { return this._regionTrigger; }
        get anchorX() { return this._anchorX; }
        get anchorY() { return this._anchorY; }
        get flickerType() { return this._flickerType; }
        get zoomX() { return this._zoomX; }
        get zoomY() { return this._zoomY; }
        get visible() { return this._visible; }

        set zIndex(val) { this._zIndex = Number(val) || 4; }
        set visible(val) { this._visible = Boolean(val); }
        set persistant(val) { this._persistant = Boolean(val); }
        set anchorX(val) { this._anchorX = Number(val) || 0; }
        set anchorY(val) { this._anchorY = Number(val) || 0; }
        set flickerType(val) { this._flickerType = val || null; }

        get fadeSpeed() { return this._fadeSpeed; }
        set fadeSpeed(val) { this._fadeSpeed = Math.max(0.01, Number(val) || 16); }
        get fadeDuration() {
            return this._fadeSpeed > 0 ? Math.round(this._baseOpacity / this._fadeSpeed) : 0;
        }
        set fadeDuration(frames) {
            const f = Number(frames) || 0;
            if (f > 0) this._fadeSpeed = this._baseOpacity / f;
        }

        /**
         * Déclenche une disparition progressive (fade out).
         * @param {number|null} [speed=null] 
         */
        fadeOut(speed = null) {
            if (speed !== null) this._fadeSpeed = Number(speed);
            this._targetOpacity = 0;
        }

        /**
         * Déclenche une réapparition progressive (fade in vers baseOpacity).
         * @param {number|null} [speed=null] 
         */
        fadeIn(speed = null) {
            if (speed !== null) this._fadeSpeed = Number(speed);
            this._targetOpacity = this._baseOpacity;
        }

        /**
         * Règle l'opacité cible.
         * @param {number} val 0..255
         * @param {number|null} [speed=null]
         */
        setTargetOpacity(val, speed = null) {
            if (speed !== null) this._fadeSpeed = Number(speed);
            this._targetOpacity = clamp(val, 0, 255);
        }

        /**
         * Règle l'opacité instantanément sans interpolation.
         * @param {number} val 
         */
        setOpacity(val) {
            this._opacity = clamp(val, 0, 255);
            this._targetOpacity = this._opacity;
        }

        /**
         * Position cible pour translation progressive.
         * @param {number} xMap 
         * @param {number} yMap 
         * @param {number|null} [speed=null]
         */
        setTargetPosition(xMap, yMap, speed = null) {
            if (speed !== null) this._moveSpeed = Number(speed);
            this._targetXMap = Number(xMap);
            this._targetYMap = Number(yMap);
        }

        setPosition(xMap, yMap) {
            this._xMap = Number(xMap);
            this._yMap = Number(yMap);
            this._targetXMap = null;
            this._targetYMap = null;
        }

        setTargetZoom(zx, zy = null, speed = null) {
            if (speed !== null) this._zoomSpeed = Number(speed);
            this._targetZoomX = Number(zx);
            this._targetZoomY = (zy !== null) ? Number(zy) : Number(zx);
        }

        setZoom(zx, zy = null) {
            this._zoomX = Number(zx);
            this._zoomY = (zy !== null) ? Number(zy) : Number(zx);
            this._targetZoomX = this._zoomX;
            this._targetZoomY = this._zoomY;
        }

        setHue(hue) {
            this._hue = Number(hue) || 0;
        }

        setBlendMode(mode) {
            this._blendMode = Number(mode) || 0;
        }

        isBusy() {
            return (this._opacity !== this._targetOpacity) ||
                (this._zoomX !== this._targetZoomX) ||
                (this._zoomY !== this._targetZoomY) ||
                (this._targetXMap !== null);
        }

        /**
         * Réinitialise l'overlay sur les valeurs par défaut issues du notetag.
         * @param {object} def 
         */
        restoreDefaults(def) {
            this._imgName = String(def.imgName || this._imgName);
            this._type = String(def.type || this._type).toLowerCase();
            this._zIndex = (def.zIndex !== undefined) ? Number(def.zIndex) : this._zIndex;
            this._xMap = (def.xMap !== undefined) ? Number(def.xMap) : this._xMap;
            this._yMap = (def.yMap !== undefined) ? Number(def.yMap) : this._yMap;
            this._baseOpacity = (def.opacity !== undefined) ? clamp(def.opacity, 0, 255) : 255;
            this._opacity = this._baseOpacity;
            this._targetOpacity = this._baseOpacity;
            this._blendMode = (def.blendMode !== undefined) ? Number(def.blendMode) : 0;
            this._hue = (def.hue !== undefined) ? Number(def.hue) : 0;
            this._regionTrigger = (def.regionTrigger !== undefined) ? Number(def.regionTrigger) : 0;
            const isRoof = this._type.includes("roof");
            const defaultFadeSpeed = isRoof ? (this._baseOpacity / 80) : 16;
            if (def.fadeDuration !== undefined && Number(def.fadeDuration) > 0) {
                this._fadeSpeed = this._baseOpacity / Number(def.fadeDuration);
            } else if (def.fadeSpeed !== undefined) {
                this._fadeSpeed = Number(def.fadeSpeed);
            } else {
                this._fadeSpeed = defaultFadeSpeed;
            }
            this._visible = true;
            this._targetXMap = null;
            this._targetYMap = null;
        }

        /**
         * Mise à jour de la logique métier, du trigger de région et des interpolations.
         */
        update() {
            // 1. Déclenchement automatique par Region ID (Smart Roof / Zone)
            if (this._regionTrigger > 0 && typeof $gamePlayer !== "undefined" && typeof $gameMap !== "undefined") {
                const isSceneFading = typeof SceneManager !== "undefined" && SceneManager._scene &&
                    typeof SceneManager._scene.isFading === "function" && SceneManager._scene.isFading();

                if (!isSceneFading) {
                    const playerRegion = $gameMap.regionId($gamePlayer.x, $gamePlayer.y);
                    if (playerRegion === this._regionTrigger) {
                        this.setTargetOpacity(0);
                    } else {
                        this.setTargetOpacity(this._baseOpacity);
                    }
                }
            }

            // 2. Interpolation progressive de l'opacité
            if (this._opacity !== this._targetOpacity) {
                if (this._opacity < this._targetOpacity) {
                    this._opacity = Math.min(this._targetOpacity, this._opacity + this._fadeSpeed);
                } else {
                    this._opacity = Math.max(this._targetOpacity, this._opacity - this._fadeSpeed);
                }
            }

            // 3. Interpolation progressive du zoom
            if (this._zoomX !== this._targetZoomX) {
                const deltaX = this._targetZoomX - this._zoomX;
                if (Math.abs(deltaX) <= this._zoomSpeed) {
                    this._zoomX = this._targetZoomX;
                } else {
                    this._zoomX += Math.sign(deltaX) * this._zoomSpeed;
                }
            }
            if (this._zoomY !== this._targetZoomY) {
                const deltaY = this._targetZoomY - this._zoomY;
                if (Math.abs(deltaY) <= this._zoomSpeed) {
                    this._zoomY = this._targetZoomY;
                } else {
                    this._zoomY += Math.sign(deltaY) * this._zoomSpeed;
                }
            }

            // 4. Interpolation progressive de position
            if (this._targetXMap !== null && this._targetYMap !== null) {
                const dx = this._targetXMap - this._xMap;
                const dy = this._targetYMap - this._yMap;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= this._moveSpeed) {
                    this._xMap = this._targetXMap;
                    this._yMap = this._targetYMap;
                    this._targetXMap = null;
                    this._targetYMap = null;
                } else {
                    this._xMap += (dx / dist) * this._moveSpeed;
                    this._yMap += (dy / dist) * this._moveSpeed;
                }
            }

            // 5. Scintillement synchronisé (lumières et ombres en miroir)
            if (this._flickerType) {
                this._flickerTimer = (this._flickerTimer || 0) + this._flickerSpeed;
                const osc = Math.sin(this._flickerTimer);
                if (this._type.includes("shadow")) {
                    const deltaOpacity = osc * (this._baseOpacity * 0.15);
                    this._opacity = clamp(Math.round(this._opacity + deltaOpacity), 0, 255);
                } else if (this._type.includes("light")) {
                    const currentZoom = 1.0 + (osc * 0.04);
                    this._zoomX = currentZoom;
                    this._zoomY = currentZoom;
                    const deltaOpacity = osc * (this._baseOpacity * 0.1);
                    this._opacity = clamp(Math.round(this._opacity + deltaOpacity), 0, 255);
                }
            }
        }

        makeSaveData() {
            return {
                id: this._id,
                imgName: this._imgName,
                type: this._type,
                zIndex: this._zIndex,
                xMap: this._xMap,
                yMap: this._yMap,
                opacity: this._opacity,
                targetOpacity: this._targetOpacity,
                baseOpacity: this._baseOpacity,
                persistant: this._persistant,
                blendMode: this._blendMode,
                hue: this._hue,
                regionTrigger: this._regionTrigger,
                anchorX: this._anchorX,
                anchorY: this._anchorY,
                flickerType: this._flickerType,
                fadeSpeed: this._fadeSpeed,
                zoomX: this._zoomX,
                zoomY: this._zoomY,
                visible: this._visible
            };
        }

        loadSaveData(data) {
            if (!data) return;
            this._id = data.id;
            this._imgName = data.imgName || this._imgName;
            this._type = data.type || this._type;
            this._zIndex = data.zIndex !== undefined ? data.zIndex : this._zIndex;
            this._xMap = data.xMap !== undefined ? data.xMap : this._xMap;
            this._yMap = data.yMap !== undefined ? data.yMap : this._yMap;
            this._opacity = data.opacity !== undefined ? data.opacity : this._opacity;
            this._targetOpacity = data.targetOpacity !== undefined ? data.targetOpacity : this._targetOpacity;
            this._baseOpacity = data.baseOpacity !== undefined ? data.baseOpacity : this._baseOpacity;
            this._persistant = Boolean(data.persistant);
            this._blendMode = data.blendMode !== undefined ? data.blendMode : this._blendMode;
            this._hue = data.hue !== undefined ? data.hue : this._hue;
            this._regionTrigger = data.regionTrigger !== undefined ? data.regionTrigger : this._regionTrigger;
            this._anchorX = data.anchorX !== undefined ? data.anchorX : this._anchorX;
            this._anchorY = data.anchorY !== undefined ? data.anchorY : this._anchorY;
            this._flickerType = data.flickerType !== undefined ? data.flickerType : this._flickerType;
            this._fadeSpeed = data.fadeSpeed !== undefined ? Number(data.fadeSpeed) : this._fadeSpeed;
            this._zoomX = data.zoomX !== undefined ? data.zoomX : this._zoomX;
            this._zoomY = data.zoomY !== undefined ? data.zoomY : this._zoomY;
            this._visible = data.visible !== undefined ? Boolean(data.visible) : this._visible;
        }
    }

    //=============================================================================
    // Game_MapFogOverlay (Brouillard / Nuages en défilement continu)
    //=============================================================================
    class Game_MapFogOverlay extends Game_MapOverlay {
        initialize(data = {}) {
            super.initialize(data);
            this._scrollSpeedX = (data.scrollSpeedX !== undefined) ? Number(data.scrollSpeedX) : 0.2;
            this._scrollSpeedY = (data.scrollSpeedY !== undefined) ? Number(data.scrollSpeedY) : 0.0;
            this._offsetX = 0;
            this._offsetY = 0;
        }

        get scrollSpeedX() { return this._scrollSpeedX; }
        get scrollSpeedY() { return this._scrollSpeedY; }
        get offsetX() { return this._offsetX; }
        get offsetY() { return this._offsetY; }

        update() {
            super.update();
            this._offsetX += this._scrollSpeedX;
            this._offsetY += this._scrollSpeedY;
        }

        makeSaveData() {
            const data = super.makeSaveData();
            data.scrollSpeedX = this._scrollSpeedX;
            data.scrollSpeedY = this._scrollSpeedY;
            data.offsetX = this._offsetX;
            data.offsetY = this._offsetY;
            return data;
        }

        loadSaveData(data) {
            super.loadSaveData(data);
            if (!data) return;
            this._scrollSpeedX = data.scrollSpeedX !== undefined ? data.scrollSpeedX : this._scrollSpeedX;
            this._scrollSpeedY = data.scrollSpeedY !== undefined ? data.scrollSpeedY : this._scrollSpeedY;
            this._offsetX = data.offsetX !== undefined ? data.offsetX : this._offsetX;
            this._offsetY = data.offsetY !== undefined ? data.offsetY : this._offsetY;
        }
    }

    //=============================================================================
    // Game_MapLightOverlay (Halo / Lumière pulsante ou scintillante)
    //=============================================================================
    class Game_MapLightOverlay extends Game_MapOverlay {
        initialize(data = {}) {
            super.initialize(data);
            // Par défaut les lumières utilisent le mode de fusion Additif (1) et centrage (0.5, 0.5)
            if (data.blendMode === undefined) this._blendMode = 1;
            if (data.anchorX === undefined) this._anchorX = 0.5;
            if (data.anchorY === undefined) this._anchorY = 0.5;
            this._pulse = (data.pulse !== undefined) ? Boolean(data.pulse) : true;
            this._pulseTimer = 0;
            this._pulseSpeed = (data.pulseSpeed !== undefined) ? Number(data.pulseSpeed) : 0.05;
            this._pulseMin = (data.pulseMin !== undefined) ? Number(data.pulseMin) : 0.95;
            this._pulseMax = (data.pulseMax !== undefined) ? Number(data.pulseMax) : 1.05;
        }

        update() {
            super.update();
            if (this._pulse) {
                this._pulseTimer += this._pulseSpeed;
                const factor = (Math.sin(this._pulseTimer) + 1) / 2;
                const currentScale = this._pulseMin + factor * (this._pulseMax - this._pulseMin);
                this._zoomX = currentScale;
                this._zoomY = currentScale;
            }
        }
    }

    //=============================================================================
    // MapOverlaysManager
    //=============================================================================
    class MapOverlaysManager {
        constructor() {
            // Structure : _data[mapId] = { [overlayId]: Game_MapOverlay }
            this._data = {};
            this._skipRefresh = false;
            this._forceRefresh = false;
            this._lastMapId = 0;
        }

        get skipRefresh() { return this._skipRefresh; }
        set skipRefresh(val) { this._skipRefresh = Boolean(val); }
        get forceRefresh() { return this._forceRefresh; }
        set forceRefresh(val) { this._forceRefresh = Boolean(val); }
        get lastMapId() { return this._lastMapId || 0; }
        set lastMapId(val) { this._lastMapId = Number(val) || 0; }

        /**
         * Initialise et synchronise les overlays lors du chargement de la carte.
         * @param {number|null} [mapId=null]
         * @param {Array|null} [notetagOverlays=null]
         * @param {object} [options={}] - Options (skipRefresh: true pour préserver l'état lors de transferts internes ou retours de sous-scènes)
         */
        onMapInit(mapId = null, notetagOverlays = null, options = {}) {
            const currentMapId = mapId || (window.$gameMap ? window.$gameMap.mapId() : 0);
            if (!currentMapId) return;

            // Détection automatique du retour d'une scène fille / pushée (inventaire, menu) sur la même carte
            const isTransferring = (window.$gamePlayer && typeof window.$gamePlayer.isTransferring === "function")
                ? window.$gamePlayer.isTransferring()
                : false;
            const isSameMapSceneReturn = (options.skipRefresh === undefined && !this._skipRefresh &&
                this._lastMapId === currentMapId && !isTransferring);

            let skipRefresh = options.skipRefresh || this._skipRefresh || isSameMapSceneReturn || false;
            if (this._forceRefresh || options.forceRefresh) {
                skipRefresh = false;
                this._forceRefresh = false;
            }
            this._skipRefresh = false;

            const notetagsList = notetagOverlays || (window.$gameMap ? (window.$gameMap._overlays || []) : []);
            this._data[currentMapId] = this._data[currentMapId] || {};
            const mapCollection = this._data[currentMapId];

            const seenNotetagIds = {};

            // 1. Synchronise les overlays issus des notetags
            for (const def of notetagsList) {
                if (!def || !def.id) continue;
                const id = def.id;
                seenNotetagIds[id] = true;

                if (mapCollection[id]) {
                    if (!mapCollection[id].persistant && !skipRefresh) {
                        mapCollection[id].restoreDefaults(def);
                    }
                } else {
                    mapCollection[id] = this.createOverlay(def, currentMapId);
                }
            }

            // 2. Nettoie les overlays créés à la volée qui n'ont pas le flag persistant
            for (const id in mapCollection) {
                if (!seenNotetagIds[id]) {
                    const overlay = mapCollection[id];
                    if (overlay && !overlay.persistant && !skipRefresh) {
                        delete mapCollection[id];
                    }
                }
            }

            this._lastMapId = currentMapId;
        }

        /**
         * Réinitialise immédiatement les overlays d'une carte sur leurs valeurs d'origine (notetags).
         * Idéal pour tests en console développeur ou transitions spécifiques.
         * @param {number|null} [mapId=null]
         */
        restoreMapDefaults(mapId = null) {
            const currentMapId = mapId || (window.$gameMap ? window.$gameMap.mapId() : 0);
            const mapCollection = this._data[currentMapId];
            if (!mapCollection) return;

            const notetagsList = window.$gameMap ? (window.$gameMap._overlays || []) : [];
            for (const def of notetagsList) {
                if (def && def.id && mapCollection[def.id]) {
                    mapCollection[def.id].restoreDefaults(def);
                }
            }
        }

        /**
         * Crée et enregistre une instance de Game_MapOverlay (ou classe fille).
         * @param {object} data
         * @param {number|null} [mapId=null]
         * @returns {Game_MapOverlay}
         */
        createOverlay(data = {}, mapId = null) {
            const type = String(data.type || "static").toLowerCase();
            let overlay = null;

            if (type === "fog") {
                overlay = new Game_MapFogOverlay(data);
            } else if (type === "light") {
                overlay = new Game_MapLightOverlay(data);
            } else {
                overlay = new Game_MapOverlay(data);
            }

            const targetMapId = mapId || (window.$gameMap ? window.$gameMap.mapId() : 0);
            if (targetMapId) {
                this._data[targetMapId] = this._data[targetMapId] || {};
                this._data[targetMapId][overlay.id] = overlay;
            }

            return overlay;
        }

        /**
         * Alias pour createOverlay.
         */
        addOverlay(data, mapId = null) {
            return this.createOverlay(data, mapId);
        }

        /**
         * Supprime un overlay existant sur la carte courante ou spécifiée.
         * @param {string} id
         * @param {number|null} [mapId=null]
         */
        removeOverlay(id, mapId = null) {
            const targetMapId = mapId || (window.$gameMap ? window.$gameMap.mapId() : 0);
            if (this._data[targetMapId] && this._data[targetMapId][id]) {
                delete this._data[targetMapId][id];
                return true;
            }
            return false;
        }

        /**
         * Récupère un overlay par son identifiant.
         * @param {string} id
         * @param {number|null} [mapId=null]
         * @returns {Game_MapOverlay|null}
         */
        getOverlay(id, mapId = null) {
            const targetMapId = mapId || (window.$gameMap ? window.$gameMap.mapId() : 0);
            return (this._data[targetMapId] && this._data[targetMapId][id]) ? this._data[targetMapId][id] : null;
        }

        /**
         * Retourne la liste des overlays de la carte ordonnée par zIndex croissant.
         * @param {number|null} [mapId=null]
         * @returns {Game_MapOverlay[]}
         */
        getOverlaysData(mapId = null) {
            const targetMapId = mapId || (window.$gameMap ? window.$gameMap.mapId() : 0);
            const collection = this._data[targetMapId];
            if (!collection) return [];

            const list = Object.values(collection);
            list.sort((a, b) => a.zIndex - b.zIndex);
            return list;
        }

        /**
         * Mise à jour de tous les overlays actifs sur la carte courante.
         */
        update(mapId = null) {
            const targetMapId = mapId || (window.$gameMap ? window.$gameMap.mapId() : 0);
            const collection = this._data[targetMapId];
            if (!collection) return;

            for (const id in collection) {
                const overlay = collection[id];
                if (overlay) {
                    overlay.update();
                }
            }
        }

        makeSavefileData() {
            const savedData = {};
            for (const mapId in this._data) {
                const collection = this._data[mapId];
                if (!collection) continue;
                savedData[mapId] = {};
                for (const id in collection) {
                    const overlay = collection[id];
                    // On ne sauvegarde que les overlays persistants
                    if (overlay && overlay.persistant) {
                        savedData[mapId][id] = overlay.makeSaveData();
                    }
                }
            }
            return {
                overlaysData: savedData
            };
        }

        loadSavefileData(data) {
            this._data = {};
            if (!data || !data.overlaysData) return;

            for (const mapId in data.overlaysData) {
                const collection = data.overlaysData[mapId];
                this._data[mapId] = {};
                for (const id in collection) {
                    const itemData = collection[id];
                    const overlay = this.createOverlay(itemData, Number(mapId));
                    overlay.loadSaveData(itemData);
                }
            }
        }
    }

    // Exportations
    window.Game_MapOverlay = Game_MapOverlay;
    window.Game_MapFogOverlay = Game_MapFogOverlay;
    window.Game_MapLightOverlay = Game_MapLightOverlay;
    window.MapOverlaysManager = MapOverlaysManager;

    if (!window.$mapOverlaysManager) {
        window.$mapOverlaysManager = new MapOverlaysManager();
    }

})();
