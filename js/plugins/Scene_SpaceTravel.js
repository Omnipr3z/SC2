//=============================================================================
// RPG Maker MZ - Scene_SpaceTravel
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Scène de navigation à l'échelle du système solaire (orbites, vol libre).
 * @author SimCraft
 *
 * @help Scene_SpaceTravel.js
 */

class Scene_SpaceTravel extends Scene_Base {
    constructor() {
        super();
        this._selectedPlanetId = -1;
        this._lastShipStatus = null;
        this._lastOrbitingId = null;
        this._lastHyperdrive = false;
        this._hyperdriveBgsPlaying = false;
        this._savedBgs = null;
    }

    create() {
        super.create();
        this.createBackground();
        this.createSystemObjects();
        this.createWindowLayer();
        this.createWindows();
    }

    createBackground() {
        this._bgSprite = new Sprite();
        this._bgSprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", "travelScreenBg");
        this.addChild(this._bgSprite);

        this._spaceSprite = new Sprite();
        this._spaceSprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", "space");
        this._spaceSprite.opacity = 210;
        this.addChild(this._spaceSprite);
    }

    createSystemObjects() {
        this._planetSprites = [];
        this._questPinSprites = [];
        const currentSys = window.$gameSector ? window.$gameSector.currentSystem() : null;
        if (!currentSys) return;

        currentSys.planets().forEach((planet, index) => {
            const spr = new Sprite();
            spr.bitmap = ImageManager.loadBitmap("img/GUI/ship/", planet.bitmapName);
            spr.anchor.x = 0.5;
            spr.anchor.y = 0.5;
            spr.x = planet.x;
            spr.y = planet.y;
            spr.scale.x = planet.zoom || 1.0;
            spr.scale.y = planet.zoom || 1.0;
            spr.planetData = planet;
            spr.planetIndex = index;
            this.addChild(spr);
            this._planetSprites.push(spr);

            // Balise de quête (centrée et dimensionnée)
            const pin = new Sprite();
            pin.bitmap = ImageManager.loadBitmap("img/GUI/ship/", "mapIcon_qust");
            pin.anchor.x = 0.5;
            pin.anchor.y = 0.5;
            pin.scale.x = 0.25;
            pin.scale.y = 0.25;
            pin.visible = false;
            this.addChild(pin);
            this._questPinSprites.push({ planetDbId: planet.dbId, sprite: pin, planetSprite: spr });
        });

        // Vaisseau du joueur
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        this._shipSprite = new Sprite();
        this._shipSprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", ship ? ship.bitmapName : "B");
        this._shipSprite.anchor.x = 0.5;
        this._shipSprite.anchor.y = 0.5;
        this._shipSprite.scale.x = 0.05;
        this._shipSprite.scale.y = 0.05;
        this.addChild(this._shipSprite);

        // Vaisseaux tiers présents dans le système
        this._npcShipSprites = [];
        const allShips = window.$gameSpaceships ? window.$gameSpaceships.spaceships() : [];
        const currentSysId = window.$gameSector ? window.$gameSector.currentSystemId : 1;

        allShips.forEach(s => {
            if (s === ship || s.systemId !== currentSysId) return;
            if (s.isOnBoard && s.isOnBoard() !== null) return;
            if (s.isLanded && s.isLanded() !== null) return;
            const nSpr = new Sprite();
            nSpr.bitmap = ImageManager.loadBitmap("img/GUI/ship/", s.bitmapName || "B");
            nSpr.anchor.x = 0.5;
            nSpr.anchor.y = 0.5;
            nSpr.scale.x = 0.05;
            nSpr.scale.y = 0.05;
            nSpr.shipData = s;
            this.addChild(nSpr);
            this._npcShipSprites.push(nSpr);
        });
    }

    createWindows() {
        // Fil d'Ariane
        this._calendarWindow = new Window_SpaceCalendar(new Rectangle(0, 0, Graphics.width, 48));
        this.addWindow(this._calendarWindow);

        // Terminal d'événements CRT (bas gauche)
        const logRect = new Rectangle(12, 744, 388, 234);
        this._logWindow = new Window_SpaceEventLog(logRect);
        this.addWindow(this._logWindow);

        // Volet d'infos vaisseau (droite)
        const shipRect = new Rectangle(1304, 90, 444, 380);
        this._shipWindow = new Window_SpaceShipInfo(shipRect);
        const playerShip = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        this._shipWindow.setShip(playerShip);
        this.addWindow(this._shipWindow);

        // Volet cible (bas centre)
        const targetRect = new Rectangle(412, 744, 880, 150);
        this._targetWindow = new Window_SpaceTargetInfo(targetRect);
        this._targetWindow.setContext("system");
        this.addWindow(this._targetWindow);

        // Barre d'actions (bas droite)
        const ctrlRect = new Rectangle(412, 906, 1336, 72);
        this._controlsWindow = new Window_SpaceControls(ctrlRect);
        this._controlsWindow.setHandler("zoomOut", this.onZoomOut.bind(this));
        this._controlsWindow.setHandler("zoomSub", this.onZoomSubsystem.bind(this));
        this._controlsWindow.setHandler("hyperdrive", this.onToggleHyperdrive.bind(this));
        this._controlsWindow.setHandler("cancel", this.onExitScene.bind(this));
        this.addWindow(this._controlsWindow);

        this.updateControls();
    }

    update() {
        super.update();
        if (window.$systemMapManager) {
            window.$systemMapManager.update(false);
            const logs = window.$systemMapManager.pullLogs();
            logs.forEach(l => this._logWindow.addMessage(l.style, l.txt));
        }

        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        const curStatus = ship ? ship.status : null;
        const curOrbitId = (ship && ship.orbitingPlanet) ? ship.orbitingPlanet.id : null;
        const curHd = ship ? ship.isHyperdrive() : false;

        // Détection réactive de changement d'orbite ou de mode de vol pour rafraîchir les boutons
        if (this._lastShipStatus !== curStatus || this._lastOrbitingId !== curOrbitId || this._lastHyperdrive !== curHd) {
            this._lastShipStatus = curStatus;
            this._lastOrbitingId = curOrbitId;
            this._lastHyperdrive = curHd;
            this.updateControls();
            if (ship && ship.status === "Orbiting" && ship.orbitingPlanet && this._selectedPlanetId === -1 && this._targetWindow) {
                this._targetWindow.setTarget("planet", ship.orbitingPlanet);
            }
        }

        // BGS Hyperdrive automatique si fuel vide ou arrêt
        if (this._hyperdriveBgsPlaying && ship && !ship.isHyperdrive()) {
            this.stopHyperdriveBgs();
        }

        this.updatePlanetsGraphics();
        this.updateShipGraphics();
        this.updateQuestPins();
        this.updateInput();

        const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
        this._calendarWindow.refresh(loc("travel.target_system_solar", "Système Solaire"));
        this._shipWindow.refresh();
    }

    updatePlanetsGraphics() {
        const offX = window.$systemMapManager ? window.$systemMapManager.mapOffsetX : 0;
        const offY = window.$systemMapManager ? window.$systemMapManager.mapOffsetY : 0;

        this._planetSprites.forEach(spr => {
            const planet = spr.planetData;
            spr.x = planet.x + offX;
            spr.y = planet.y + offY;

            // Rotation propre synchronisée avec $gameDate
            spr.rotation = planet.rotationAngle;
        });
    }

    updateShipGraphics() {
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        if (!ship || !this._shipSprite) return;

        const offX = window.$systemMapManager ? window.$systemMapManager.mapOffsetX : 0;
        const offY = window.$systemMapManager ? window.$systemMapManager.mapOffsetY : 0;

        this._shipSprite.x = ship.x + offX;
        this._shipSprite.y = ship.y + offY;

        // Orientation
        if (ship.targetX > ship.x) {
            this._shipSprite.scale.x = -Math.abs(this._shipSprite.scale.x);
        } else if (ship.targetX < ship.x) {
            this._shipSprite.scale.x = Math.abs(this._shipSprite.scale.x);
        }

        // Vaisseaux tiers
        if (this._npcShipSprites) {
            this._npcShipSprites.forEach(spr => {
                const s = spr.shipData;
                spr.x = s.x + offX;
                spr.y = s.y + offY;
            });
        }
    }

    updateQuestPins() {
        const qm = window.$gameQuests;
        if (!qm || !this._questPinSprites) return;

        // Pulsation douce : oscillation coordonnée (taille + fade-in/fade-out)
        const osc = (Math.sin(Graphics.frameCount * 0.04) + 1) / 2;
        const scale = 0.20 + osc * 0.08;
        const opacity = Math.round(80 + osc * 175);

        this._questPinSprites.forEach(item => {
            const indicators = qm.getIndicatorsForPlanet(item.planetDbId);
            const count = indicators.length;
            item.sprite.visible = count > 0;
            if (count > 0) {
                item.sprite.x = item.planetSprite.x;
                item.sprite.y = item.planetSprite.y;
                item.sprite.scale.x = scale;
                item.sprite.scale.y = scale;
                item.sprite.opacity = opacity;

                this.updateHotspotBadge(item.sprite, count);
            }
        });
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

    updateInput() {
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        if (!ship) return;

        if (TouchInput.isTriggered()) {
            if (!this.checkShipClick(TouchInput.x, TouchInput.y) && !this.checkPlanetClick(TouchInput.x, TouchInput.y)) {
                this.checkTravelClick(TouchInput.x, TouchInput.y);
            }
        }

        // Hyperdrive au maintien de Shift ou appui long sur l'espace (hors fenêtre UI)
        const isTouchOnControls = this._controlsWindow && this._controlsWindow.isTouchedInsideFrame();
        const isLongPressOnMap = TouchInput.isLongPressed() && !isTouchOnControls;
        if (Input.isPressed("shift") || isLongPressOnMap) {
            if (!ship.isHyperdrive()) this.activateHyperdrive();
        } else if (ship.isHyperdrive()) {
            this.deactivateHyperdrive();
        }

        // Raccourcis navigation
        if (Input.isTriggered("pageup")) {
            this.onZoomOut();
        }
        if (Input.isTriggered("pagedown")) {
            this.onZoomSubsystem();
        }
        if (Input.isTriggered("cancel")) {
            this.onExitScene();
        }
    }

    checkShipClick(screenX, screenY) {
        if (!this._npcShipSprites) return false;
        const playerShip = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        for (const spr of this._npcShipSprites) {
            const dist = Math.hypot(screenX - spr.x, screenY - spr.y);
            if (dist <= 24) {
                const s = spr.shipData;
                if (this._selectedTargetShipId === s.id && playerShip) {
                    playerShip.setContactShip(s.id);
                    SoundManager.playOk();
                    if (window.$systemMapManager) {
                        const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
                        const msg = loc("travel.log_contact_course", "Cap engagé pour entrer en contact avec le %1.").replace("%1", s.name);
                        window.$systemMapManager.log("basicInfos", msg);
                    }
                } else {
                    this._selectedTargetShipId = s.id;
                    this._selectedPlanetId = -1;
                    const capName = s.captain ? (typeof s.captain.name === "function" ? s.captain.name() : s.captain.name) : "Inconnu";
                    const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
                    const shipLbl = loc("travel.ship_label", "Vaisseau");
                    const catLbl = loc("travel.ship_category", "Catégorie");
                    const facLbl = loc("travel.ship_faction", "Faction");
                    const capLbl = loc("travel.ship_captain", "Capitaine");
                    this._targetWindow.setTarget("ship", {
                        name: s.name,
                        type: `${shipLbl} • ${s.shipClass}`,
                        description: `${catLbl} : ${s.category}\n${facLbl} : ${s.faction}\n${capLbl} : ${capName}`
                    });
                    SoundManager.playCursor();
                }
                this.updateControls();
                return true;
            }
        }
        return false;
    }

    checkPlanetClick(screenX, screenY) {
        for (const spr of this._planetSprites) {
            if (spr.planetData && spr.planetData.interactive === false) continue;
            const dist = Math.hypot(screenX - spr.x, screenY - spr.y);
            const radius = Math.max(20, (spr.width * spr.scale.x * 0.5));
            if (dist <= radius) {
                this.selectPlanet(spr.planetIndex, spr.planetData);
                return true;
            }
        }
        return false;
    }

    selectPlanet(index, planetData) {
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        this._selectedTargetShipId = null;
        if (this._selectedPlanetId === index && ship) {
            // Deuxième clic -> Mise en orbite ou contact station
            ship.setOrbitingPlanet(index);
            SoundManager.playOk();
            if (window.$systemMapManager) {
                const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
                const isStation = planetData && (planetData.isStation ? planetData.isStation() : (planetData.type && (planetData.type.toLowerCase().includes("station") || planetData.type.toLowerCase().includes("base"))));
                if (isStation) {
                    const msg = loc("travel.log_station_course", "Cap engagé pour entrer en contact avec %1.").replace("%1", planetData.name);
                    window.$systemMapManager.log("basicInfos", msg);
                } else {
                    const msg = loc("travel.log_orbit_course", "Cap engagé vers l'orbite de %1.").replace("%1", planetData.name);
                    window.$systemMapManager.log("basicInfos", msg);
                }
            }
        } else {
            // Premier clic -> Sélection et télémesure
            this._selectedPlanetId = index;
            this._targetWindow.setTarget("planet", planetData);
            SoundManager.playCursor();
        }
        this.updateControls();
    }

    checkTravelClick(screenX, screenY) {
        // Vérifie qu'on clique bien dans la zone de la carte (1280x720 décalée de 12px) et sous le calendrier
        if (screenY > 732 || screenX > 1292 || screenX < 12 || screenY < 48) return;

        const offX = window.$systemMapManager ? window.$systemMapManager.mapOffsetX : 12;
        const offY = window.$systemMapManager ? window.$systemMapManager.mapOffsetY : 0;
        const logicalX = screenX - offX;
        const logicalY = screenY - offY;

        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        if (ship) {
            ship.setTarget(logicalX, logicalY);
            this.playSpaceShipSe("movingSE");
            if (window.$systemMapManager) {
                const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
                window.$systemMapManager.log("basicInfos", `${loc("travel.new_coords", "Nouvelles coordonnées de cap")} : ${Math.round(logicalX)}:${Math.round(logicalY)}.`);
            }
        }
    }

    start() {
        super.start();
        this.startFadeIn(24, false);
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        if (ship && ship.orbitingPlanet && this._targetWindow) {
            this._targetWindow.setTarget("planet", ship.orbitingPlanet);
            this.updateControls();
        }
    }

    updateControls() {
        const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        const cmds = [];

        cmds.push({ name: loc("travel.cmd_zoom_sector", "▲ Secteur Galaxie (PgUp)"), symbol: "zoomOut", enabled: true });

        // Sous-système accessible en orbite uniquement
        const isOrbiting = !!(ship && ship.status === "Orbiting" && ship.orbitingPlanet);
        const subName = isOrbiting ? ` [${ship.orbitingPlanet.name}]` : "";
        cmds.push({ name: `${loc("travel.cmd_zoom_subsystem", "▼ Sous-système")}${subName} (PgDown)`, symbol: "zoomSub", enabled: isOrbiting });

        const hdLabel = ship && ship.isHyperdrive() ? loc("travel.cmd_hyperdrive_on", "★ Hyperdrive [ON]") : loc("travel.cmd_hyperdrive", "☆ Hyperdrive (Shift)");
        cmds.push({ name: hdLabel, symbol: "hyperdrive", enabled: !!(ship && ship.canActivateHyperdrive()) });
        cmds.push({ name: loc("travel.cmd_exit_bridge", "Quitter le Pont (Échap)"), symbol: "cancel", enabled: true });

        this._controlsWindow.setCommands(cmds);
    }

    onZoomOut() {
        SoundManager.playCancel();
        this.startFadeOut(20, false);
        setTimeout(() => {
            SceneManager.goto(Scene_SectorTravel);
        }, 350);
    }

    onZoomSubsystem() {
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        if (!ship || ship.status !== "Orbiting" || !ship.orbitingPlanet) {
            SoundManager.playBuzzer();
            return;
        }
        SoundManager.playOk();
        this.startFadeOut(20, false);
        setTimeout(() => {
            Scene_SubsystemTravel.prepareContext(ship.orbitingPlanet, false);
            SceneManager.goto(Scene_SubsystemTravel);
        }, 350);
    }

    playSpaceShipSe(seType = "movingSE", overrideParams = null) {
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        let seData = null;
        if (ship) {
            if (seType === "movingSE") seData = Object.assign({}, ship.movingSE);
            else if (seType === "warpjumpSE") seData = Object.assign({}, ship.warpjumpSE);
            else if (ship[seType]) seData = Object.assign({}, ship[seType]);
        }
        if (!seData) {
            seData = { name: "Collapse3", volume: 90, pitch: 80 };
        }
        if (overrideParams) {
            Object.assign(seData, overrideParams);
        }
        if (typeof AudioManager !== "undefined" && typeof AudioManager.playSe === "function") {
            AudioManager.playSe(seData);
        }
    }

    activateHyperdrive() {
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        if (!ship || !ship.canActivateHyperdrive() || ship.isHyperdrive()) return;
        ship.activeHyperdrive();
        this.startHyperdriveBgs(ship);
    }

    deactivateHyperdrive() {
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        if (!ship || !ship.isHyperdrive()) return;
        ship.deactivateHyperdrive();
        this.stopHyperdriveBgs();
    }

    startHyperdriveBgs(ship) {
        if (this._hyperdriveBgsPlaying) return;
        if (typeof AudioManager !== "undefined") {
            if (typeof AudioManager.saveBgs === "function") {
                this._savedBgs = AudioManager.saveBgs();
            }
            const bgsData = ship ? ship.hyperdriveBGS : { name: "FIREWIND2", volume: 90, pitch: 100 };
            if (typeof AudioManager.playBgs === "function") {
                AudioManager.playBgs(bgsData);
            }
        }
        this._hyperdriveBgsPlaying = true;
    }

    stopHyperdriveBgs() {
        if (!this._hyperdriveBgsPlaying) return;
        if (typeof AudioManager !== "undefined") {
            if (this._savedBgs && this._savedBgs.name && typeof AudioManager.replayBgs === "function") {
                AudioManager.replayBgs(this._savedBgs);
            } else if (typeof AudioManager.stopBgs === "function") {
                AudioManager.stopBgs();
            }
        }
        this._savedBgs = null;
        this._hyperdriveBgsPlaying = false;
    }

    terminate() {
        if (this._hyperdriveBgsPlaying) {
            this.stopHyperdriveBgs();
        }
        if (window.$gameDate) {
            window.$gameDate.setScrollSpeedMode(1);
        }
        super.terminate();
    }

    onToggleHyperdrive() {
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        if (!ship) return;
        if (ship.isHyperdrive()) {
            this.deactivateHyperdrive();
        } else {
            this.activateHyperdrive();
        }
        this.updateControls();
    }

    onExitScene() {
        SoundManager.playCancel();
        this.startFadeOut(20, false);
        setTimeout(() => {
            SceneManager.pop();
        }, 350);
    }
}

window.Scene_SpaceTravel = Scene_SpaceTravel;
if (typeof global !== 'undefined') {
    global.Scene_SpaceTravel = Scene_SpaceTravel;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Scene_SpaceTravel };
}
