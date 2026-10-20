//=============================================================================
// RPG Maker MZ - Scene_SectorTravel
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Scène de navigation à l'échelle du secteur / galaxie (Sauts FTL).
 * @author SimCraft
 *
 * @help SC4_Scene_SectorTravel.js
 */

class Scene_SectorTravel extends Scene_Base {
    constructor() {
        super();
        this._selectedSystemId = null;
    }

    create() {
        super.create();
        this.createBackground();
        this.createConstellationLayer();
        this.createWindowLayer();
        this.createWindows();
    }

    createBackground() {
        this._bgSprite = new Sprite();
        this._bgSprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", "travelScreenBg");
        this.addChild(this._bgSprite);

        this._starsSprite = new Sprite();
        this._starsSprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", "space");
        this._starsSprite.opacity = 200;
        this.addChild(this._starsSprite);
    }

    createConstellationLayer() {
        this._constellationSprite = new Sprite();
        this._constellationSprite.bitmap = new Bitmap(Graphics.width, Graphics.height);
        this.addChild(this._constellationSprite);

        this._starSprites = [];
        this._indicatorSprites = [];

        const sector = window.$gameSector ? window.$gameSector.currentSectorData() : null;
        if (!sector || !Array.isArray(sector.systems)) return;

        // Tracé des lignes FTL
        const offX = window.$systemMapManager ? window.$systemMapManager.mapOffsetX : 12;
        const offY = window.$systemMapManager ? window.$systemMapManager.mapOffsetY : 12;

        const bmp = this._constellationSprite.bitmap;
        bmp.paintOpacity = 120;
        sector.systems.forEach(sys => {
            if (Array.isArray(sys.connections)) {
                sys.connections.forEach(connId => {
                    const other = sector.systems.find(s => s.id === connId);
                    if (other && sys.id < other.id) {
                        bmp.drawLine(sys.pos.x + offX, sys.pos.y + offY, other.pos.x + offX, other.pos.y + offY, "#4da6ff", 2);
                    }
                });
            }
        });

        // Sprites des étoiles
        const dbPlanets = window.$dataPlanets || [];
        sector.systems.forEach(sys => {
            const star = new Sprite();
            star.anchor.x = 0.5;
            star.anchor.y = 0.5;
            star.x = sys.pos.x + offX;
            star.y = sys.pos.y + offY;
            star.systemData = sys;

            const capitalPlanetId = sys.capital || (sys.capitalPlanetId !== undefined ? sys.capitalPlanetId : null);
            const capitalPlanet = capitalPlanetId ? dbPlanets.find(p => p && p.id === capitalPlanetId) : null;

            if (capitalPlanet && capitalPlanet.bitmapName) {
                // Halo lumineux subtil sous la planète capitale
                const halo = new Sprite();
                halo.bitmap = new Bitmap(48, 48);
                halo.anchor.x = 0.5;
                halo.anchor.y = 0.5;
                const hCtx = halo.bitmap.context;
                hCtx.beginPath();
                hCtx.arc(24, 24, 14, 0, Math.PI * 2);
                hCtx.fillStyle = sys.starColor || "#ffffff";
                hCtx.shadowColor = sys.starColor || "#ffffff";
                hCtx.shadowBlur = 16;
                hCtx.globalAlpha = 0.45;
                hCtx.fill();
                star.addChild(halo);

                const pSpr = new Sprite();
                pSpr.bitmap = ImageManager.loadBitmap("img/GUI/ship/", capitalPlanet.bitmapName);
                pSpr.anchor.x = 0.5;
                pSpr.anchor.y = 0.5;
                pSpr.scale.x = 0.07;
                pSpr.scale.y = 0.07;
                star.addChild(pSpr);

                star.bitmap = new Bitmap(48, 48);
            } else {
                star.bitmap = new Bitmap(48, 48);
                // Dessin classique de l'étoile
                const ctx = star.bitmap.context;
                ctx.beginPath();
                ctx.arc(24, 24, 10, 0, Math.PI * 2);
                ctx.fillStyle = sys.starColor || "#ffffff";
                ctx.shadowColor = sys.starColor || "#ffffff";
                ctx.shadowBlur = 14;
                ctx.fill();
            }

            this.addChild(star);
            this._starSprites.push(star);

            // Balise de quête si active (centrée et dimensionnée)
            const indSprite = new Sprite();
            indSprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", "mapIcon_qust");
            indSprite.anchor.x = 0.5;
            indSprite.anchor.y = 0.5;
            indSprite.x = sys.pos.x + offX;
            indSprite.y = sys.pos.y + offY;
            indSprite.scale.x = 0.25;
            indSprite.scale.y = 0.25;
            indSprite.visible = false;
            this.addChild(indSprite);
            this._indicatorSprites.push({ systemId: sys.id, sprite: indSprite, starSprite: star });
        });

        // Vaisseau du joueur
        this._shipIcon = new Sprite();
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        this._shipIcon.bitmap = ImageManager.loadBitmap("img/GUI/ship/", ship ? ship.bitmapName : "C");
        this._shipIcon.anchor.x = 0.5;
        this._shipIcon.anchor.y = 0.5;
        this._shipIcon.scale.x = 0.04;
        this._shipIcon.scale.y = 0.04;
        this.addChild(this._shipIcon);
    }

    createWindows() {
        // Barre supérieure
        this._calendarWindow = new Window_SpaceCalendar(new Rectangle(0, 0, Graphics.width, 48));
        this.addWindow(this._calendarWindow);

        // Terminal d'événements CRT (bas gauche)
        const logRect = new Rectangle(12, 744, 388, 234);
        this._logWindow = new Window_SpaceEventLog(logRect);
        this.addWindow(this._logWindow);

        // Volet d'infos système sélectionné (bas centre)
        const targetRect = new Rectangle(412, 744, 880, 150);
        this._targetWindow = new Window_SpaceTargetInfo(targetRect);
        this._targetWindow.setContext("sector");
        this.addWindow(this._targetWindow);

        // Barre d'actions (bas droite)
        const ctrlRect = new Rectangle(412, 906, 1336, 72);
        this._controlsWindow = new Window_SpaceControls(ctrlRect);
        this._controlsWindow.setHandler("zoomIn", this.onZoomIn.bind(this));
        this._controlsWindow.setHandler("jump", this.onEngageJump.bind(this));
        this._controlsWindow.setHandler("cancel", this.onExitScene.bind(this));
        this.addWindow(this._controlsWindow);

        // Volet d'infos vaisseau (droite)
        const shipRect = new Rectangle(1304, 90, 444, 380);
        this._shipWindow = new Window_SpaceShipInfo(shipRect);
        const playerShip = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        this._shipWindow.setShip(playerShip);
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

        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        const curStatus = ship ? ship.status : "";
        if (this._lastShipStatus !== curStatus) {
            this._lastShipStatus = curStatus;
            this.updateControls();
        }

        this.updateShipPosition();
        this.updateQuestIndicators();
        this.updateInput();
        const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
        this._calendarWindow.refresh(loc("travel.sector_map_title", "Carte Stellaire du Secteur"));
        if (this._shipWindow) {
            this._shipWindow.refresh();
        }
    }

    updateShipPosition() {
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        if (!ship || !this._shipIcon) return;

        const offX = window.$systemMapManager ? window.$systemMapManager.mapOffsetX : 12;
        const offY = window.$systemMapManager ? window.$systemMapManager.mapOffsetY : 12;

        const sector = window.$gameSector;
        const currentSys = sector ? sector.system(ship.systemId) : null;

        if (ship.status === "InterSystemJump") {
            const targetSys = sector ? sector.system(ship.jumpTargetSystemId) : null;
            if (currentSys && targetSys) {
                const totalDur = Math.max(1, ship.jumpDuration);
                const t = Math.min(1.0, Math.max(0.0, ship.jumpProgress / totalDur));
                const sx = currentSys.pos.x + offX;
                const sy = currentSys.pos.y + offY;
                const tx = targetSys.pos.x + offX;
                const ty = targetSys.pos.y + offY;

                this._shipIcon.x = sx + (tx - sx) * t;
                this._shipIcon.y = sy + (ty - sy) * t;

                const dx = tx - sx;
                const dy = ty - sy;
                // L'image source du vaisseau est orientée vers la gauche (PI radians).
                // On compense par + Math.PI pour aligner le nez avec le vecteur de déplacement.
                this._shipIcon.rotation = Math.atan2(dy, dx) + Math.PI;

                // Pulsation d'énergie Warp
                const pulse = Math.sin(Graphics.frameCount * 0.25) * 0.008;
                this._shipIcon.scale.x = 0.045 + pulse;
                this._shipIcon.scale.y = 0.045 + pulse;
                return;
            }
        }

        if (currentSys) {
            this._shipIcon.x = currentSys.pos.x + offX;
            this._shipIcon.y = currentSys.pos.y + offY;
            this._shipIcon.rotation = 0;
            this._shipIcon.scale.x = 0.04;
            this._shipIcon.scale.y = 0.04;
        }
    }

    updateQuestIndicators() {
        const qm = window.$gameQuests;
        if (!qm || !this._indicatorSprites) return;

        // Pulsation douce : oscillation coordonnée (taille + fade-in/fade-out)
        const osc = (Math.sin(Graphics.frameCount * 0.04) + 1) / 2;
        const scale = 0.20 + osc * 0.08;
        const opacity = Math.round(80 + osc * 175);

        this._indicatorSprites.forEach(item => {
            const indicators = qm.getIndicatorsForSystem(item.systemId);
            const count = indicators.length;
            item.sprite.visible = count > 0;
            if (count > 0) {
                item.sprite.x = item.starSprite.x;
                item.sprite.y = item.starSprite.y;
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

    start() {
        super.start();
        this.startFadeIn(24, false);
    }

    updateInput() {
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        if (ship && ship.status === "InterSystemJump") {
            return; // Bloque toute interaction ou raccourci en plein saut FTL
        }

        if (TouchInput.isTriggered()) {
            this.checkStarClick(TouchInput.x, TouchInput.y);
        }

        // Raccourci Page Bas -> Zoom In
        if (Input.isTriggered("pagedown")) {
            this.onZoomIn();
        }

        if (Input.isTriggered("cancel")) {
            this.onExitScene();
        }
    }

    checkStarClick(x, y) {
        for (const star of this._starSprites) {
            const dist = Math.hypot(x - star.x, y - star.y);
            if (dist <= 24) {
                this.selectSystem(star.systemData);
                SoundManager.playCursor();
                break;
            }
        }
    }

    selectSystem(sysData) {
        this._selectedSystemId = sysData.id;
        this._targetWindow.setTarget("system", sysData);
        this.updateControls();
    }

    updateControls() {
        const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;

        // Si en plein saut inter-systèmes : commandes verrouillées avec indicateur
        if (ship && ship.status === "InterSystemJump") {
            const transitCmds = [{ name: loc("travel.cmd_in_transit", "⏳ Transit FTL en cours..."), symbol: "inTransit", enabled: false }];
            this._controlsWindow.setCommands(transitCmds);
            this._controlsWindow.deactivate();
            return;
        }

        const currentSysId = ship ? ship.systemId : 0;
        const isCurrent = this._selectedSystemId === currentSysId || this._selectedSystemId === null;

        const sector = window.$gameSector ? window.$gameSector.currentSectorData() : null;
        const currentSys = sector ? sector.systems.find(s => s && s.id === currentSysId) : null;
        const isConnected = currentSys && Array.isArray(currentSys.connections) && currentSys.connections.includes(this._selectedSystemId);

        const cmds = [];
        if (isCurrent) {
            cmds.push({ name: loc("travel.cmd_zoom_system", "▶ Entrer dans le Système (PgDown)"), symbol: "zoomIn", enabled: true });
        } else if (isConnected) {
            let warpEnabled = false;
            let warpLabel = loc("travel.cmd_warp_jump", "⚡ Saut FTL / Warp");

            if (!ship || !ship.isWarpAllowed || !ship.isWarpAllowed()) {
                warpEnabled = false;
                warpLabel = loc("travel.warp_motor_missing", "⚡ Saut Warp (Moteur non équipé)");
            } else if (ship.motor && ship.motor.capacity !== -1 && ship.fuel < 500) {
                warpEnabled = false;
                warpLabel = loc("travel.warp_fuel_low", "⚡ Saut Warp (Carburant insuffisant)");
            } else if (ship.status === "InterSystemJump") {
                warpEnabled = false;
                warpLabel = loc("travel.cmd_warp_jump", "⚡ Saut FTL / Warp");
            } else {
                warpEnabled = true;
            }

            cmds.push({ name: warpLabel, symbol: "jump", enabled: warpEnabled });
        }
        cmds.push({ name: loc("travel.cmd_exit_bridge", "Quitter le Pont (Échap)"), symbol: "cancel", enabled: true });

        this._controlsWindow.setCommands(cmds);
    }

    onZoomIn() {
        SoundManager.playOk();
        this.startFadeOut(20, false);
        setTimeout(() => {
            SceneManager.goto(Scene_SpaceTravel);
        }, 350);
    }

    playSpaceShipSe(seType = "warpjumpSE", overrideParams = null) {
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        let seData = null;
        if (ship) {
            if (seType === "warpjumpSE") seData = Object.assign({}, ship.warpjumpSE);
            else if (seType === "movingSE") seData = Object.assign({}, ship.movingSE);
            else if (ship[seType]) seData = Object.assign({}, ship[seType]);
        }
        if (!seData) {
            seData = { name: "ShipJump", volume: 90, pitch: 100 };
        }
        if (overrideParams) {
            Object.assign(seData, overrideParams);
        }
        if (typeof AudioManager !== "undefined" && typeof AudioManager.playSe === "function") {
            AudioManager.playSe(seData);
        }
    }

    onEngageJump() {
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        if (!ship || this._selectedSystemId === null) return;

        this.playSpaceShipSe("warpjumpSE", { pitch: 110, volume: 90 });
        ship.startInterSystemJump(this._selectedSystemId);
        if (window.$systemMapManager) {
            const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
            window.$systemMapManager.log("alert", loc("travel.warp_engaged", "Saut Warp engagé vers le système cible."));
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

window.Scene_SectorTravel = Scene_SectorTravel;
if (typeof global !== 'undefined') {
    global.Scene_SectorTravel = Scene_SectorTravel;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Scene_SectorTravel };
}
