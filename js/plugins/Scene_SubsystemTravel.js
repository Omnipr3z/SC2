//=============================================================================
// RPG Maker MZ - Scene_SubsystemTravel
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Scène de navigation à l'échelle du sous-système (POIs, mode hangar).
 * @author SimCraft
 *
 * @help Scene_SubsystemTravel.js
 */

class Scene_SubsystemTravel extends Scene_Base {
    static prepareContext(planet, isHangarMode = false, nefId = 2) {
        Scene_SubsystemTravel._contextPlanet = planet;
        Scene_SubsystemTravel._contextHangarMode = isHangarMode;
        Scene_SubsystemTravel._contextNefId = nefId;
    }

    constructor() {
        super();
        this._planet = Scene_SubsystemTravel._contextPlanet || null;
        this._isHangarMode = Scene_SubsystemTravel._contextHangarMode || false;
        this._nefId = Scene_SubsystemTravel._contextNefId || 2;
        this._selectedPoi = null;
    }

    create() {
        super.create();
        this.createBackground();
        this.createPlanetView();
        this.createPois();
        this.createWindowLayer();
        this.createWindows();

        // Initialisation de la fenêtre d'info en mode Subsystem avec consignes d'accueil
        this._selectedPoi = null;
        this._infoWindow.setContext("subsystem");
        this._infoWindow.setTarget("poi", null);
        this.updateControls();
    }

    start() {
        super.start();
        this.startFadeIn(24, false);
    }

    createBackground() {
        this._bgSprite = new Sprite();
        this._bgSprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", "travelScreenBg");
        this.addChild(this._bgSprite);

        this._spaceSprite = new Sprite();
        this._spaceSprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", "space");
        this._spaceSprite.opacity = 230;
        this.addChild(this._spaceSprite);
    }

    createPlanetView() {
        this._planetSprite = new Sprite();
        const bmpName = this._planet ? this._planet.bitmapName : "planet_0";
        this._planetSprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", bmpName);
        this._planetSprite.anchor.x = 0.5;
        this._planetSprite.anchor.y = 0.5;
        this._planetSprite.x = 12 + 640;
        this._planetSprite.y = 12 + 360;
        this._planetSprite.scale.x = 0.65;
        this._planetSprite.scale.y = 0.65;
        this.addChild(this._planetSprite);

        // Vaisseau du joueur ou navette selon le mode
        const displayedShip = this._isHangarMode
            ? (window.$gameSpaceships ? window.$gameSpaceships.ship(this._nefId) : null)
            : (window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null);
        this._shipSprite = new Sprite();
        this._shipSprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", displayedShip ? displayedShip.bitmapName : "B");
        this._shipSprite.anchor.x = 0.5;
        this._shipSprite.anchor.y = 0.5;
        this._shipSprite.scale.x = 0.06;
        this._shipSprite.scale.y = 0.06;
        this.addChild(this._shipSprite);
    }

    createPois() {
        this._poiSprites = [];
        this._poiQuestPins = [];
        if (!this._planet || !Array.isArray(this._planet.pois)) return;

        const visiblePois = this._planet.pois.filter(poi => {
            return window.$gameSystem && typeof window.$gameSystem.isPoiLocated === "function"
                ? window.$gameSystem.isPoiLocated(poi.id)
                : (poi.located !== false);
        });

        visiblePois.forEach(poi => {
            const qm = window.$gameQuests;
            const hasQuest = qm && qm.hasIndicatorForPoi(poi.id);

            // Sprite d'alerte / POI standard (masqué si un indicateur de quête s'y trouve déjà)
            const spr = new Sprite();
            spr.bitmap = ImageManager.loadBitmap("img/GUI/ship/", "mapIcon_alert");
            spr.anchor.x = 0.5;
            spr.anchor.y = 0.5;
            spr.scale.x = 0.25; // POI à 0.25 (Revue 3)
            spr.scale.y = 0.25;
            spr.poiData = poi;
            spr.visible = !hasQuest; // Masqué si quête présente !

            // Coordonnées polaires relatives pour suivre la rotation de la planète
            const relX = (poi.mapX - 0.5) * 380;
            const relY = (poi.mapY - 0.5) * 380;
            spr.radius = Math.hypot(relX, relY);
            spr.initialAngle = Math.atan2(relY, relX);

            const px = this._planetSprite.x + relX;
            const py = this._planetSprite.y + relY;
            spr.x = px;
            spr.y = py;
            this.addChild(spr);
            this._poiSprites.push(spr);

            // Balise de quête si active
            const pin = new Sprite();
            pin.bitmap = ImageManager.loadBitmap("img/GUI/ship/", "mapIcon_qust");
            pin.anchor.x = 0.5;
            pin.anchor.y = 0.5;
            pin.x = px;
            pin.y = py;
            pin.scale.x = 0.25;
            pin.scale.y = 0.25;
            pin.visible = !!hasQuest;
            this.addChild(pin);
            this._poiQuestPins.push({ poiId: poi.id, sprite: pin, targetSprite: spr });
        });
    }

    createWindows() {
        const pName = this._planet ? this._planet.name : "Planète";
        this._calendarWindow = new Window_SpaceCalendar(new Rectangle(0, 0, Graphics.width, 48));
        this.addWindow(this._calendarWindow);

        // Terminal d'événements CRT (bas gauche) relié au vaisseau principal
        const logRect = new Rectangle(12, 744, 388, 234);
        this._logWindow = new Window_SpaceEventLog(logRect);
        this.addWindow(this._logWindow);

        // Volet d'infos POI sélectionné (bas centre)
        const infoRect = new Rectangle(412, 744, 880, 150);
        this._infoWindow = new Window_SpaceTargetInfo(infoRect);
        this._infoWindow.setContext("subsystem");
        this.addWindow(this._infoWindow);

        // Barre d'actions (bas droite)
        const ctrlRect = new Rectangle(412, 906, 1336, 72);
        this._controlsWindow = new Window_SpaceControls(ctrlRect);
        this._controlsWindow.setHandler("land", this.onLand.bind(this));
        this._controlsWindow.setHandler("zoomOut", this.onZoomOut.bind(this));
        this._controlsWindow.setHandler("cancel", this.onExitScene.bind(this));
        this.addWindow(this._controlsWindow);

        // Volet d'infos vaisseau (droite) : Affiche la nef en mode hangar, sinon le vaisseau joueur
        const shipRect = new Rectangle(1304, 90, 444, 380);
        this._shipWindow = new Window_SpaceShipInfo(shipRect);
        const displayedShip = this._isHangarMode
            ? (window.$gameSpaceships ? window.$gameSpaceships.ship(this._nefId) : null)
            : (window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null);
        this._shipWindow.setShip(displayedShip);
        this.addWindow(this._shipWindow);

        this.updateControls();
    }

    update() {
        super.update();
        if (window.$systemMapManager) {
            window.$systemMapManager.update(false);
            const logs = window.$systemMapManager.pullLogs();
            logs.forEach(l => this._logWindow.addMessage(l.style, l.txt));
        }
        if (this._shipWindow) {
            this._shipWindow.refresh();
        }

        // Alignement de la rotation de la planète sur $gameDate
        if (this._planetSprite) {
            const rot = this._planet ? this._planet.rotationAngle : (window.$gameDate ? (window.$gameDate.timestamp * 60 + window.$gameDate._tick) * 0.0006 : 0);
            this._planetSprite.rotation = rot;
        }

        // Vaisseau du joueur à côté de la planète avec léger flottement orbital
        if (this._shipSprite && this._planetSprite) {
            const bobY = Math.sin(Graphics.frameCount * 0.03) * 4;
            const bobX = Math.cos(Graphics.frameCount * 0.02) * 2;
            this._shipSprite.x = this._planetSprite.x + 230 + bobX;
            this._shipSprite.y = this._planetSprite.y - 40 + bobY;
        }

        // Les POIs suivent la rotation de la planète
        if (this._poiSprites && this._planetSprite) {
            const pRot = this._planetSprite.rotation;
            const cx = this._planetSprite.x;
            const cy = this._planetSprite.y;
            this._poiSprites.forEach(spr => {
                const curAngle = spr.initialAngle + pRot;
                spr.x = cx + Math.cos(curAngle) * spr.radius;
                spr.y = cy + Math.sin(curAngle) * spr.radius;
            });
        }

        // Animation pulsée des balises de quête sur les POIs avec support Hotspot
        if (this._poiQuestPins && this._poiQuestPins.length > 0) {
            const osc = (Math.sin(Graphics.frameCount * 0.04) + 1) / 2;
            const scale = 0.20 + osc * 0.08;
            const opacity = Math.round(80 + osc * 175);
            this._poiQuestPins.forEach(item => {
                const indicators = window.$gameQuests ? window.$gameQuests.getIndicatorsForPoi(item.poiId) : [];
                const count = indicators.length;
                item.sprite.visible = count > 0;
                if (count > 0) {
                    item.sprite.x = item.targetSprite.x;
                    item.sprite.y = item.targetSprite.y;
                    item.sprite.scale.x = scale;
                    item.sprite.scale.y = scale;
                    item.sprite.opacity = opacity;

                    this.updateHotspotBadge(item.sprite, count);
                }
            });
        }

        if (TouchInput.isTriggered()) {
            this.checkPoiClick(TouchInput.x, TouchInput.y);
        }

        if (!this._isHangarMode && Input.isTriggered("pageup")) {
            this.onZoomOut();
        }

        if (Input.isTriggered("cancel")) {
            this.onExitScene();
        }

        const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
        const pName = this._planet ? this._planet.name : loc("travel.planet_default", "Planète");
        const hangarTitle = loc("travel.hangar_mode_title", "Hangar de Débarquement");
        const subTitle = loc("travel.subsystem_mode_title", "Sous-système");
        const modeTitle = this._isHangarMode ? `${hangarTitle} : ${pName}` : `${subTitle} : ${pName}`;
        this._calendarWindow.refresh(modeTitle);
    }

    checkPoiClick(screenX, screenY) {
        for (const spr of this._poiSprites) {
            const dist = Math.hypot(screenX - spr.x, screenY - spr.y);
            if (dist <= 26) {
                this._selectedPoi = spr.poiData;
                this._infoWindow.setTarget("poi", spr.poiData);
                SoundManager.playCursor();
                this.updateControls();
                break;
            }
        }
    }

    updateControls() {
        const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
        const cmds = [];
        if (this._isHangarMode) {
            if (this._selectedPoi) {
                cmds.push({ name: `${loc("travel.cmd_land", "⬇ Atterrir")} : ${this._selectedPoi.name}`, symbol: "land", enabled: true });
            } else {
                cmds.push({ name: loc("travel.cmd_land_choose", "⬇ Choisir un POI d'atterrissage"), symbol: "land", enabled: false });
            }
        }

        if (!this._isHangarMode) {
            cmds.push({ name: loc("travel.cmd_system_view", "▲ Système Solaire (PgUp)"), symbol: "zoomOut", enabled: true });
        }

        const cancelLabel = this._isHangarMode ? loc("travel.cmd_exit_hangar", "Quitter le Hangar (Échap)") : loc("travel.cmd_back_bridge", "Retour au Pont (Échap)");
        cmds.push({ name: cancelLabel, symbol: "cancel", enabled: true });
        this._controlsWindow.setCommands(cmds);
    }

    onLand() {
        if (!this._selectedPoi) return;
        const poi = this._selectedPoi;

        SoundManager.playOk();
        this.startFadeOut(25, false);

        setTimeout(() => {
            // Stockage de l'ID de la nef dans la variable RMMZ dédiée
            const nefVarId = (window.SC4 && window.SC4.nefVariableId) ? window.SC4.nefVariableId : 41;
            if ($gameVariables) {
                $gameVariables.setValue(nefVarId, this._nefId || 2);
            }

            if (poi.landingMapId && $gamePlayer) {
                // 1. Rendre le joueur invisible
                $gamePlayer.setTransparent(true);
                // 2. Activer le selfswitch A de l'event spécifié dans les data du POI (défaut 1)
                const eventId = poi.landingEventId || 1;
                const switchKey = [poi.landingMapId, eventId, "A"];
                $gameSelfSwitches.setValue(switchKey, true);
                // 3. Téléporter sur la carte indiquée
                $gamePlayer.reserveTransfer(poi.landingMapId, poi.landingX || 10, poi.landingY || 10, 2, 0);
                SceneManager.goto(Scene_Map);
            } else {
                SceneManager.pop();
            }
        }, 400);
    }

    onZoomOut() {
        SoundManager.playCancel();
        this.startFadeOut(20, false);
        setTimeout(() => {
            SceneManager.goto(Scene_SpaceTravel);
        }, 350);
    }

    onExitScene() {
        SoundManager.playCancel();
        this.startFadeOut(20, false);
        setTimeout(() => {
            if (this._isHangarMode) {
                SceneManager.pop();
            } else {
                this.onZoomOut();
            }
        }, 350);
    }

    updateHotspotBadge(parentSprite, count) {
        if (count > 1) {
            if (!parentSprite._hotspotBadge) {
                const bSpr = new Sprite(new Bitmap(40, 40));
                bSpr.anchor.x = 0;
                bSpr.anchor.y = 1;
                bSpr.x = 8;
                bSpr.y = -8;
                parentSprite.addChild(bSpr);
                parentSprite._hotspotBadge = bSpr;
            }
            if (parentSprite._badgeCount !== count) {
                parentSprite._badgeCount = count;
                const bmp = parentSprite._hotspotBadge.bitmap;
                bmp.clear();
                const ctx = bmp.context;
                ctx.beginPath();
                ctx.arc(20, 20, 16, 0, Math.PI * 2);
                ctx.fillStyle = "#fabd2f";
                ctx.shadowColor = "#fabd2f";
                ctx.shadowBlur = 8;
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.lineWidth = 3;
                ctx.strokeStyle = "#1d2021";
                ctx.stroke();

                bmp.textColor = "#1d2021";
                bmp.fontSize = 20;
                bmp.fontFace = "sans-serif";
                bmp.drawText(String(count), 0, 4, 40, 32, "center");
            }
            parentSprite._hotspotBadge.visible = true;
        } else if (parentSprite._hotspotBadge) {
            parentSprite._hotspotBadge.visible = false;
        }
    }
}

window.Scene_SubsystemTravel = Scene_SubsystemTravel;
if (typeof global !== 'undefined') {
    global.Scene_SubsystemTravel = Scene_SubsystemTravel;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Scene_SubsystemTravel };
}
