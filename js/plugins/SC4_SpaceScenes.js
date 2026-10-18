//=============================================================================
// SC4_SpaceScenes.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Scènes graphiques de voyage spatial multi-échelles (Secteur, Système, Sous-système).
 * @author SimCraft
 * 
 * @help
 * ============================================================================
 * SC4_SpaceScenes.js
 * ============================================================================
 * Implémente l'interface et les 3 niveaux de navigation spatiale :
 * 
 * 1. Scene_SectorTravel (Niveau 1 : Secteur / Galaxie FTL) :
 *    - Carte stellaire avec constellations et liaisons de saut FTL.
 *    - Balises de quêtes au-dessus des systèmes concernés.
 *    - Saut Warp entre systèmes avec durée et consommation de fuel.
 *    - Zoom In vers la carte du Système (touche Page Bas / pagedown).
 * 
 * 2. Scene_SpaceTravel (Niveau 2 : Système Solaire temps réel) :
 *    - Étoile centrale, planètes et satellites en orbite.
 *    - Navigation libre au clic et mise en orbite stationnaire.
 *    - Mode Hyperdrive (touche Shift ou appui long).
 *    - Zoom Out vers le Secteur (touche Page Haut / pageup).
 *    - Zoom In vers le Sous-système planétaire (touche Page Bas / pagedown).
 * 
 * 3. Scene_SubsystemTravel (Niveau 3 : Sous-système & Mode Hangar) :
 *    - Vue détaillée de la planète, de ses lunes et de ses POIs.
 *    - Mode Consultation : observation des POIs et retour au Système.
 *    - Mode Hangar : sélection d'un POI pour atterrir directement sur la carte.
 * 
 * Commandes de plugin disponibles :
 *   - SC4_SpaceScenes openSector   : Ouvre la carte galactique / secteur.
 *   - SC4_SpaceScenes openSystem   : Ouvre le système solaire actuel.
 *   - SC4_SpaceScenes openHangar   : Ouvre le sous-système en mode atterrissage hangar.
 * ============================================================================
 */

// ============================================================================
// 1. COMPOSANTS DE BASE : FENÊTRES HUD SPATIALES
// ============================================================================

class Window_SpaceCalendar extends Window_Base {
    constructor(rect) {
        super(rect);
        this.opacity = 0;
        this._lastTimeText = "";
    }

    resetFontSettings() {
        this.contents.fontFace = $gameSystem ? $gameSystem.mainFontFace() : "sans-serif";
        this.contents.fontSize = 18;
        this.contents.textColor = "#e0e0e0";
        this.contents.outlineColor = "#000000";
        this.contents.outlineWidth = 3;
    }

    refresh(locationTitle = "") {
        this.contents.clear();
        this.resetFontSettings();

        const timeStr = window.$gameDate ? Game_DateFormatter.format40K($gameDate) : "";
        const sector = window.$gameSector ? window.$gameSector.currentSectorData() : null;
        const system = window.$gameSector ? window.$gameSector.currentSystem() : null;

        const seg = sector ? (sector.segmentum || "ULTIMA-SEGMENTUM") : "GALAXIE";
        const secName = sector ? sector.name : "Secteur";
        const sysName = system ? system.name : "Système";

        const breadcrumb = `${seg} ▷ ${secName} ▹ ${sysName}${locationTitle ? " ▹ " + locationTitle : ""}`;

        // Fil d'Ariane à gauche
        this.contents.textColor = "#8ec07c";
        this.drawText(breadcrumb, 12, 0, this.contentsWidth() - 320, "left");

        // Horloge 40K à droite
        this.contents.textColor = "#fabd2f";
        this.drawText(timeStr, this.contentsWidth() - 300, 0, 280, "right");
    }
}

class Window_SpaceEventLog extends Window_Base {
    constructor(rect) {
        super(rect);
        this._messages = [];
        this._out = [];
        this._outTimer = 0;
        this._blinkTimer = 0;
        this.loadWindowskin();
    }

    loadWindowskin() {
        if (ImageManager.loadSystem) {
            this.windowskin = ImageManager.loadSystem("Prompt") || ImageManager.loadSystem("Window");
        }
    }

    addMessage(style, text) {
        this._messages.push({ style: style || "info", text });
        if (this._messages.length > 50) this._messages.shift();
    }

    update() {
        super.update();
        this._blinkTimer++;
        if (this._outTimer <= 0 && this._messages.length > 0) {
            this._out.push(this._messages.shift());
            if (this._out.length > 20) this._out.shift();
            this._outTimer = 180;
            this.refresh();
        } else if (this._outTimer > 0) {
            this._outTimer--;
        }

        if (this._blinkTimer % 30 === 0) {
            this.refresh();
        }
    }

    refresh() {
        this.contents.clear();
        const lineHeight = 20;
        const maxLines = Math.floor(this.contentsHeight() / lineHeight);
        const blinkPrompt = (Math.floor(this._blinkTimer / 30) % 2 === 0) ? "▷ " : "▹ ";

        const recent = this._out.slice(-maxLines);
        recent.forEach((item, index) => {
            const y = index * lineHeight;
            this.contents.fontFace = "monospace";
            this.contents.fontSize = 15;
            this.contents.outlineWidth = 2;
            this.contents.outlineColor = "#000000";

            if (item.style === "alert") {
                this.contents.textColor = "#fe8019";
            } else if (item.style === "imperium") {
                this.contents.textColor = "#fabd2f";
            } else if (item.style === "basicInfos") {
                this.contents.textColor = "#b8bb26";
            } else {
                this.contents.textColor = "#8ec07c";
            }

            const prefix = index === recent.length - 1 ? blinkPrompt : "  ";
            this.drawText(prefix + item.text, 8, y, this.contentsWidth() - 16, "left");
        });
    }
}

class Window_SpaceShipInfo extends Window_Base {
    constructor(rect) {
        super(rect);
        this._ship = null;
        this._shipSprite = null;
        this.createShipSprite();
    }

    createShipSprite() {
        this._shipSprite = new Sprite();
        this._shipSprite.anchor.x = 0.5;
        this._shipSprite.anchor.y = 0.5;
        this._shipSprite.x = 80;
        this._shipSprite.y = 90;
        this._shipSprite.scale.x = 0.08;
        this._shipSprite.scale.y = 0.08;
        this.addChild(this._shipSprite);
    }

    setShip(ship) {
        this._ship = ship;
        if (this._ship && this._shipSprite) {
            this._shipSprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", this._ship.bitmapName);
        }
        this.refresh();
    }

    refresh() {
        this.contents.clear();
        if (!this._ship) return;

        const ship = this._ship;
        const width = this.contentsWidth();

        // 1. Titre & Classe
        this.contents.fontSize = 20;
        this.contents.textColor = "#fabd2f";
        this.drawText(ship.name, 0, 4, width, "left");

        this.contents.fontSize = 13;
        this.contents.textColor = "#a89984";
        this.drawText(`${ship.shipClass} • ${ship.category}`, 0, 26, width, "left");

        // 2. Faction
        this.contents.fontSize = 14;
        this.contents.textColor = "#ebdbb2";
        this.drawText(`Faction: ${ship.faction}`, 150, 60, width - 150, "left");

        // 3. Statut
        const statusColor = ship.isMoving() ? "#83a598" : "#b8bb26";
        this.contents.textColor = statusColor;
        let stTxt = ship.status;
        if (ship.status === "Orbiting" && ship.orbitingPlanet) {
            stTxt = `En orbite (${ship.orbitingPlanet.name})`;
        } else if (ship.status === "MoveToOrbit" && ship.orbitingPlanet) {
            stTxt = `Approche de ${ship.orbitingPlanet.name}`;
        } else if (ship.status === "InContact" && ship.contactShip) {
            stTxt = `En contact (${ship.contactShip.name})`;
        } else if (ship.status === "MoveToContact" && ship.contactShip) {
            stTxt = `Approche de ${ship.contactShip.name}`;
        } else if (ship.status === "InterSystemJump") {
            stTxt = `Transit Warp FTL`;
        }
        this.drawText(`Statut: ${stTxt}`, 150, 84, width - 150, "left");

        // 4. Moteur & Vitesse
        const motor = ship.motor;
        this.contents.textColor = "#fabd2f";
        this.contents.fontSize = 15;
        this.drawText("◈ Propulsion & Carburant", 0, 140, width, "left");

        this.contents.fontSize = 14;
        this.contents.textColor = "#ebdbb2";
        this.drawText(`Moteur: ${motor.name}`, 12, 168, width - 24, "left");

        const spdVal = Math.round(ship.speed * 100);
        const hdText = ship.isHyperdrive() ? " [HYPERDRIVE]" : "";
        this.contents.textColor = ship.isHyperdrive() ? "#fe8019" : "#8ec07c";
        this.drawText(`Vitesse: ${spdVal} u/s${hdText}`, 12, 192, width - 24, "left");

        // Jauge de Fuel
        const maxFuel = motor.capacity === -1 ? 9999 : motor.capacity;
        const curFuel = Math.round(ship.fuel);
        const rate = motor.capacity === -1 ? 1.0 : (curFuel / maxFuel);

        this.contents.textColor = "#ebdbb2";
        this.drawText(`Carburant (${motor.fuelname}):`, 12, 220, width - 24, "left");

        const gaugeY = 246;
        const gaugeW = width - 24;
        this.contents.fillRect(12, gaugeY, gaugeW, 12, "#3c3836");
        this.contents.fillRect(12, gaugeY, Math.round(gaugeW * rate), 12, rate > 0.25 ? "#b8bb26" : "#fb4934");

        this.contents.fontSize = 12;
        this.drawText(motor.capacity === -1 ? "ILLIMITÉ" : `${curFuel} / ${maxFuel}`, 12, gaugeY + 16, gaugeW, "right");

        // Coordonnées
        this.contents.textColor = "#928374";
        this.drawText(`Coords: ${Math.round(ship.x)} : ${Math.round(ship.y)}`, 12, gaugeY + 40, gaugeW, "left");
    }
}

class Window_SpaceTargetInfo extends Window_Base {
    constructor(rect) {
        super(rect);
        this._targetData = null;
        this._targetType = ""; // system | planet | poi
    }

    setTarget(type, data) {
        this._targetType = type;
        this._targetData = data;
        this.refresh();
    }

    refresh() {
        this.contents.clear();
        if (!this._targetData) {
            this.contents.fontSize = 15;
            this.contents.textColor = "#928374";
            this.drawText("Aucune cible sélectionnée.", 16, 20, this.contentsWidth() - 32, "center");
            return;
        }

        const data = this._targetData;
        const width = this.contentsWidth();

        this.contents.fontSize = 19;
        this.contents.textColor = "#fabd2f";
        this.drawText(data.name || "Cible", 16, 8, width - 32, "left");

        this.contents.fontSize = 14;
        this.contents.textColor = "#8ec07c";
        const typeStr = data.type || (this._targetType === "system" ? "Système Solaire" : "Point d'Intérêt");
        this.drawText(`Type: ${typeStr}`, 16, 32, width - 32, "left");

        this.contents.fontSize = 13;
        this.contents.textColor = "#ebdbb2";
        const desc = data.description || "Aucune télémesure disponible.";
        this.drawText(desc, 16, 56, width - 32, "left");

        // Quête active liée
        const qm = window.$gameQuests;
        let questInfo = null;
        if (qm) {
            if (this._targetType === "poi" && data.id) {
                const indicators = qm.getIndicatorsForPoi(data.id);
                if (indicators && indicators.length > 0) questInfo = indicators[0];
            } else if (this._targetType === "planet" && data.dbId !== undefined) {
                const indicators = qm.getIndicatorsForPlanet(data.dbId);
                if (indicators && indicators.length > 0) questInfo = indicators[0];
            } else if (this._targetType === "system" && data.id !== undefined) {
                const indicators = qm.getIndicatorsForSystem(data.id);
                if (indicators && indicators.length > 0) questInfo = indicators[0];
            }
        }

        if (questInfo) {
            this.contents.fontSize = 13;
            this.contents.textColor = "#fe8019";
            this.drawText(`★ Quête Active : ${questInfo.quest.name}`, 16, 84, width - 32, "left");
            this.contents.textColor = "#fabd2f";
            const qDesc = (questInfo.location && questInfo.location.description) || questInfo.quest.description;
            this.drawText(qDesc, 16, 106, width - 32, "left");
        }
    }
}

// Barre d'actions & navigation multi-niveaux
class Window_SpaceControls extends Window_HorzCommand {
    constructor(rect) {
        super(rect);
        this.opacity = 0;
    }

    setCommands(cmds) {
        this._commandsConfig = cmds || [];
        this.refresh();
        this.select(0);
        this.activate();
    }

    makeCommandList() {
        if (!Array.isArray(this._commandsConfig)) return;
        this._commandsConfig.forEach(cmd => {
            this.addCommand(cmd.name, cmd.symbol, cmd.enabled !== false);
        });
    }

    maxCols() {
        return Math.max(1, (this._commandsConfig ? this._commandsConfig.length : 1));
    }
}

if (!Bitmap.prototype.drawLine) {
    Bitmap.prototype.drawLine = function(x1, y1, x2, y2, color, lineWidth = 1) {
        const context = this.context;
        context.save();
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.strokeStyle = color || "#ffffff";
        context.lineWidth = lineWidth;
        context.stroke();
        context.restore();
        if (this._baseTexture) this._baseTexture.update();
    };
}

// ============================================================================
// 2. SCÈNE NIVEAU 1 : SCENE_SECTORTRAVEL (CARTE GALACTIQUE / FTL)
// ============================================================================

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
        const bmp = this._constellationSprite.bitmap;
        bmp.paintOpacity = 120;
        sector.systems.forEach(sys => {
            if (Array.isArray(sys.connections)) {
                sys.connections.forEach(connId => {
                    const other = sector.systems.find(s => s.id === connId);
                    if (other && sys.id < other.id) {
                        bmp.drawLine(sys.pos.x, sys.pos.y, other.pos.x, other.pos.y, "#4da6ff", 2);
                    }
                });
            }
        });

        // Sprites des étoiles
        sector.systems.forEach(sys => {
            const star = new Sprite();
            star.bitmap = new Bitmap(48, 48);
            star.anchor.x = 0.5;
            star.anchor.y = 0.5;
            star.x = sys.pos.x;
            star.y = sys.pos.y;
            star.systemData = sys;

            // Dessin de l'étoile
            const ctx = star.bitmap.context;
            ctx.beginPath();
            ctx.arc(24, 24, 10, 0, Math.PI * 2);
            ctx.fillStyle = sys.starColor || "#ffffff";
            ctx.shadowColor = sys.starColor || "#ffffff";
            ctx.shadowBlur = 14;
            ctx.fill();

            this.addChild(star);
            this._starSprites.push(star);

            // Balise de quête si active (centrée et dimensionnée)
            const indSprite = new Sprite();
            indSprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", "mapIcon_qust");
            indSprite.anchor.x = 0.5;
            indSprite.anchor.y = 0.5;
            indSprite.x = sys.pos.x;
            indSprite.y = sys.pos.y;
            indSprite.scale.x = 0.25;
            indSprite.scale.y = 0.25;
            indSprite.visible = false;
            this.addChild(indSprite);
            this._indicatorSprites.push({ systemId: sys.id, sprite: indSprite, starSprite: star });
        });

        // Vaisseau du joueur
        this._shipIcon = new Sprite();
        this._shipIcon.bitmap = ImageManager.loadBitmap("img/GUI/ship/", "B");
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

        // Volet d'infos système sélectionné (bas gauche)
        const targetRect = new Rectangle(16, Graphics.height - 180, 420, 160);
        this._targetWindow = new Window_SpaceTargetInfo(targetRect);
        this.addWindow(this._targetWindow);

        // Barre d'actions (bas droite)
        const ctrlRect = new Rectangle(450, Graphics.height - 80, Graphics.width - 466, 64);
        this._controlsWindow = new Window_SpaceControls(ctrlRect);
        this._controlsWindow.setHandler("zoomIn", this.onZoomIn.bind(this));
        this._controlsWindow.setHandler("jump", this.onEngageJump.bind(this));
        this._controlsWindow.setHandler("cancel", this.onExitScene.bind(this));
        this.addWindow(this._controlsWindow);

        this.updateControls();
    }

    update() {
        super.update();
        if (window.$systemMapManager) {
            window.$systemMapManager.update(false);
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
        this._calendarWindow.refresh("Carte Stellaire du Secteur");
    }

    updateShipPosition() {
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        if (!ship || !this._shipIcon) return;

        const sector = window.$gameSector;
        const currentSys = sector ? sector.system(ship.systemId) : null;

        if (ship.status === "InterSystemJump") {
            const targetSys = sector ? sector.system(ship.jumpTargetSystemId) : null;
            if (currentSys && targetSys) {
                const totalDur = Math.max(1, ship.jumpDuration);
                const t = Math.min(1.0, Math.max(0.0, ship.jumpProgress / totalDur));
                const sx = currentSys.pos.x;
                const sy = currentSys.pos.y;
                const tx = targetSys.pos.x;
                const ty = targetSys.pos.y;

                this._shipIcon.x = sx + (tx - sx) * t;
                this._shipIcon.y = sy + (ty - sy) * t;

                const dx = tx - sx;
                const dy = ty - sy;
                this._shipIcon.rotation = Math.atan2(dy, dx) + Math.PI / 2;

                // Pulsation d'énergie Warp
                const pulse = Math.sin(Graphics.frameCount * 0.25) * 0.008;
                this._shipIcon.scale.x = 0.045 + pulse;
                this._shipIcon.scale.y = 0.045 + pulse;
                return;
            }
        }

        if (currentSys) {
            this._shipIcon.x = currentSys.pos.x;
            this._shipIcon.y = currentSys.pos.y;
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
            const hasQuest = qm.hasIndicatorForSystem(item.systemId);
            item.sprite.visible = hasQuest;
            if (hasQuest) {
                item.sprite.x = item.starSprite.x;
                item.sprite.y = item.starSprite.y;
                item.sprite.scale.x = scale;
                item.sprite.scale.y = scale;
                item.sprite.opacity = opacity;
            }
        });
    }

    updateInput() {
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
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        const currentSysId = ship ? ship.systemId : 0;
        const isCurrent = this._selectedSystemId === currentSysId || this._selectedSystemId === null;

        const sector = window.$gameSector ? window.$gameSector.currentSectorData() : null;
        const currentSys = sector ? sector.systems.find(s => s.id === currentSysId) : null;
        const isConnected = currentSys && Array.isArray(currentSys.connections) && currentSys.connections.includes(this._selectedSystemId);

        const cmds = [];
        if (isCurrent) {
            cmds.push({ name: "▶ Entrer dans le Système (PgDown)", symbol: "zoomIn", enabled: true });
        } else if (isConnected) {
            cmds.push({ name: "⚡ Saut FTL / Warp", symbol: "jump", enabled: ship && ship.status !== "InterSystemJump" });
        }
        cmds.push({ name: "Quitter le Pont (Échap)", symbol: "cancel", enabled: true });

        this._controlsWindow.setCommands(cmds);
    }

    onZoomIn() {
        SoundManager.playOk();
        this.startFadeOut(20, false);
        setTimeout(() => {
            SceneManager.goto(Scene_SpaceTravel);
        }, 350);
    }

    onEngageJump() {
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        if (!ship || this._selectedSystemId === null) return;

        SoundManager.playEquip();
        ship.startInterSystemJump(this._selectedSystemId);
        if (window.$systemMapManager) {
            window.$systemMapManager.log("alert", `Saut Warp engagé vers le système cible.`);
        }
        this.updateControls();
    }

    onExitScene() {
        SoundManager.playCancel();
        SceneManager.pop();
    }
}

// ============================================================================
// 3. SCÈNE NIVEAU 2 : SCENE_SPACETRAVEL (SYSTÈME SOLAIRE EN TEMPS RÉEL)
// ============================================================================

class Scene_SpaceTravel extends Scene_Base {
    constructor() {
        super();
        this._selectedPlanetId = -1;
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
        const currentSysId = window.$gameSector ? window.$gameSector.currentSystemId : 0;

        allShips.forEach(s => {
            if (s === ship || s.systemId !== currentSysId) return;
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
        const logRect = new Rectangle(16, Graphics.height - 210, 380, 194);
        this._logWindow = new Window_SpaceEventLog(logRect);
        this.addWindow(this._logWindow);

        // Volet d'infos vaisseau (droite)
        const shipRect = new Rectangle(Graphics.width - 340, 56, 324, 380);
        this._shipWindow = new Window_SpaceShipInfo(shipRect);
        const playerShip = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        this._shipWindow.setShip(playerShip);
        this.addWindow(this._shipWindow);

        // Volet cible (bas centre)
        const targetRect = new Rectangle(410, Graphics.height - 210, Graphics.width - 410 - 356, 120);
        this._targetWindow = new Window_SpaceTargetInfo(targetRect);
        this.addWindow(this._targetWindow);

        // Barre d'actions (bas droite)
        const ctrlRect = new Rectangle(410, Graphics.height - 80, Graphics.width - 410 - 356, 64);
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

        this.updatePlanetsGraphics();
        this.updateShipGraphics();
        this.updateQuestPins();
        this.updateInput();

        this._calendarWindow.refresh("Système Solaire");
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
            const active = qm.hasIndicatorForPlanet(item.planetDbId);
            item.sprite.visible = active;
            if (active) {
                item.sprite.x = item.planetSprite.x;
                item.sprite.y = item.planetSprite.y;
                item.sprite.scale.x = scale;
                item.sprite.scale.y = scale;
                item.sprite.opacity = opacity;
            }
        });
    }

    updateInput() {
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        if (!ship) return;

        if (TouchInput.isTriggered()) {
            if (!this.checkShipClick(TouchInput.x, TouchInput.y) && !this.checkPlanetClick(TouchInput.x, TouchInput.y)) {
                this.checkTravelClick(TouchInput.x, TouchInput.y);
            }
        }

        // Hyperdrive au maintien de Shift
        if (Input.isPressed("shift") || TouchInput.isLongPressed()) {
            if (!ship.isHyperdrive()) ship.activeHyperdrive();
        } else if (ship.isHyperdrive()) {
            ship.deactivateHyperdrive();
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
                        window.$systemMapManager.log("basicInfos", `Cap engagé pour entrer en contact avec le ${s.name}.`);
                    }
                } else {
                    this._selectedTargetShipId = s.id;
                    this._selectedPlanetId = -1;
                    const capName = s.captain ? (typeof s.captain.name === "function" ? s.captain.name() : s.captain.name) : "Inconnu";
                    this._targetWindow.setTarget("ship", {
                        name: s.name,
                        type: `Vaisseau • ${s.shipClass}`,
                        description: `Catégorie : ${s.category}\nFaction : ${s.faction}\nCapitaine : ${capName}`
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
            // Deuxième clic -> Mise en orbite
            ship.setOrbitingPlanet(index);
            SoundManager.playOk();
            if (window.$systemMapManager) {
                window.$systemMapManager.log("basicInfos", `Cap engagé vers l'orbite de ${planetData.name}.`);
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
        // Vérifie qu'on ne clique pas sur les fenêtres
        if (screenY > Graphics.height - 220 || screenX > Graphics.width - 350 || screenY < 50) return;

        const offX = window.$systemMapManager ? window.$systemMapManager.mapOffsetX : 0;
        const offY = window.$systemMapManager ? window.$systemMapManager.mapOffsetY : 0;
        const logicalX = screenX - offX;
        const logicalY = screenY - offY;

        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        if (ship) {
            ship.setTarget(logicalX, logicalY);
            SoundManager.playEquip();
            if (window.$systemMapManager) {
                window.$systemMapManager.log("basicInfos", `Nouvelles coordonnées de cap : ${Math.round(logicalX)}:${Math.round(logicalY)}.`);
            }
        }
    }

    start() {
        super.start();
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        if (ship && ship.orbitingPlanet && this._targetWindow) {
            this._targetWindow.setTarget("planet", ship.orbitingPlanet);
            this.updateControls();
        }
    }

    updateControls() {
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        const cmds = [];

        cmds.push({ name: "▲ Secteur Galaxie (PgUp)", symbol: "zoomOut", enabled: true });

        // Sous-système accessible en orbite uniquement
        const isOrbiting = !!(ship && ship.status === "Orbiting" && ship.orbitingPlanet);
        const subName = isOrbiting ? ` [${ship.orbitingPlanet.name}]` : "";
        cmds.push({ name: `▼ Sous-système${subName} (PgDown)`, symbol: "zoomSub", enabled: isOrbiting });

        cmds.push({ name: ship && ship.isHyperdrive() ? "★ Hyperdrive [ON]" : "☆ Hyperdrive (Shift)", symbol: "hyperdrive", enabled: !!(ship && ship.canActivateHyperdrive()) });
        cmds.push({ name: "Quitter le Pont (Échap)", symbol: "cancel", enabled: true });

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

    onToggleHyperdrive() {
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        if (!ship) return;
        if (ship.isHyperdrive()) {
            ship.deactivateHyperdrive();
        } else {
            ship.activeHyperdrive();
        }
        this.updateControls();
    }

    onExitScene() {
        SoundManager.playCancel();
        SceneManager.pop();
    }
}

// ============================================================================
// 4. SCÈNE NIVEAU 3 : SCENE_SUBSYSTEMTRAVEL (SOUS-SYSTÈME PLANÉTAIRE & HANGAR)
// ============================================================================

class Scene_SubsystemTravel extends Scene_Base {
    static prepareContext(planet, isHangarMode = false) {
        Scene_SubsystemTravel._contextPlanet = planet;
        Scene_SubsystemTravel._contextHangarMode = isHangarMode;
    }

    constructor() {
        super();
        this._planet = Scene_SubsystemTravel._contextPlanet || null;
        this._isHangarMode = Scene_SubsystemTravel._contextHangarMode || false;
        this._selectedPoi = null;
    }

    create() {
        super.create();
        this.createBackground();
        this.createPlanetView();
        this.createPois();
        this.createWindowLayer();
        this.createWindows();

        // Sélection initiale du premier POI (ou du POI avec quête active)
        if (this._planet && Array.isArray(this._planet.pois) && this._planet.pois.length > 0) {
            const qm = window.$gameQuests;
            const questPoi = this._planet.pois.find(p => qm && qm.hasIndicatorForPoi(p.id));
            this._selectedPoi = questPoi || this._planet.pois[0];
            this._infoWindow.setTarget("poi", this._selectedPoi);
            this.updateControls();
        }
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
        this._planetSprite.x = Graphics.width * 0.42;
        this._planetSprite.y = Graphics.height * 0.50;
        this._planetSprite.scale.x = 0.65;
        this._planetSprite.scale.y = 0.65;
        this.addChild(this._planetSprite);

        // Vaisseau du joueur en orbite stationnaire à côté de la planète (Revue 3)
        const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
        this._shipSprite = new Sprite();
        this._shipSprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", ship ? ship.bitmapName : "B");
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

        this._planet.pois.forEach(poi => {
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

        // Volet d'infos POI sélectionné
        const infoRect = new Rectangle(Graphics.width - 380, 60, 360, 320);
        this._infoWindow = new Window_SpaceTargetInfo(infoRect);
        this.addWindow(this._infoWindow);

        // Barre d'actions
        const ctrlRect = new Rectangle(Graphics.width - 380, Graphics.height - 100, 360, 72);
        this._controlsWindow = new Window_SpaceControls(ctrlRect);
        this._controlsWindow.setHandler("land", this.onLand.bind(this));
        this._controlsWindow.setHandler("zoomOut", this.onZoomOut.bind(this));
        this._controlsWindow.setHandler("cancel", this.onExitScene.bind(this));
        this.addWindow(this._controlsWindow);

        this.updateControls();
    }

    update() {
        super.update();
        if (window.$systemMapManager) {
            window.$systemMapManager.update(false);
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

        // Animation pulsée des balises de quête sur les POIs
        if (this._poiQuestPins && this._poiQuestPins.length > 0) {
            const osc = (Math.sin(Graphics.frameCount * 0.04) + 1) / 2;
            const scale = 0.20 + osc * 0.08;
            const opacity = Math.round(80 + osc * 175);
            this._poiQuestPins.forEach(item => {
                const active = window.$gameQuests ? window.$gameQuests.hasIndicatorForPoi(item.poiId) : false;
                item.sprite.visible = active;
                if (active) {
                    item.sprite.x = item.targetSprite.x;
                    item.sprite.y = item.targetSprite.y;
                    item.sprite.scale.x = scale;
                    item.sprite.scale.y = scale;
                    item.sprite.opacity = opacity;
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

        const pName = this._planet ? this._planet.name : "Planète";
        const modeTitle = this._isHangarMode ? `Hangar de Débarquement : ${pName}` : `Sous-système : ${pName}`;
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
        const cmds = [];
        if (this._isHangarMode) {
            if (this._selectedPoi) {
                cmds.push({ name: `⬇ Atterrir : ${this._selectedPoi.name}`, symbol: "land", enabled: true });
            } else {
                cmds.push({ name: "⬇ Choisir un POI d'atterrissage", symbol: "land", enabled: false });
            }
        }

        if (!this._isHangarMode) {
            cmds.push({ name: "▲ Système Solaire (PgUp)", symbol: "zoomOut", enabled: true });
        }

        cmds.push({ name: this._isHangarMode ? "Quitter le Hangar (Échap)" : "Retour au Pont (Échap)", symbol: "cancel", enabled: true });
        this._controlsWindow.setCommands(cmds);
    }

    onLand() {
        if (!this._selectedPoi) return;
        const poi = this._selectedPoi;

        SoundManager.playOk();
        this.startFadeOut(25, false);

        setTimeout(() => {
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
        if (this._isHangarMode) {
            SceneManager.pop();
        } else {
            this.onZoomOut();
        }
    }
}

// ============================================================================
// 5. COMMANDES DE PLUGIN & EXPORT GLOBAL
// ============================================================================

window.Scene_SectorTravel = Scene_SectorTravel;
window.Scene_SpaceTravel = Scene_SpaceTravel;
window.Scene_SubsystemTravel = Scene_SubsystemTravel;

// ============================================================================
// 5. INTERFACE HANGAR & COMMANDES DE PLUGIN
// ============================================================================

window.SC4 = window.SC4 || {};

SC4.openHangar = function() {
    const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
    const planet = ship ? ship.orbitingPlanet : null;

    if (planet) {
        SoundManager.playOk();
        Scene_SubsystemTravel.prepareContext(planet, true); // true = Hangar Landing Mode
        SceneManager.push(Scene_SubsystemTravel);
    } else {
        SoundManager.playBuzzer();
        if ($gameMessage) {
            $gameMessage.add("\\C[2]Contrôle Hangar\\C[0] : Le vaisseau n'est pas en orbite stationnaire.");
        }
    }
};

SceneManager.openHangar = SC4.openHangar;

(() => {
    "use strict";

    // Commandes de Plugin
    PluginManager.registerCommand("SC4_SpaceScenes", "openSector", () => {
        SceneManager.push(Scene_SectorTravel);
    });

    PluginManager.registerCommand("SC4_SpaceScenes", "openSystem", () => {
        SceneManager.push(Scene_SpaceTravel);
    });

    PluginManager.registerCommand("SC4_SpaceScenes", "openHangar", () => {
        SC4.openHangar();
    });

})();
