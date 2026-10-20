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
 * 
 * @command openSector
 * @text Ouvrir Secteur
 * @desc Ouvre la carte stellaire FTL du secteur.
 * 
 * @command openSystem
 * @text Ouvrir Système
 * @desc Ouvre la vue temps réel du système planétaire.
 * 
 * @command openHangar
 * @text Ouvrir Hangar
 * @desc Ouvre le sous-système planétaire en mode atterrissage hangar.
 * 
 * @arg nefId
 * @text ID de la Nef
 * @desc ID du vaisseau/navette pour le débarquement (défaut 2).
 * @type number
 * @default 2
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

        const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
        const seg = sector ? (sector.segmentum || "ULTIMA-SEGMENTUM") : "GALAXIE";
        const secName = sector ? sector.name : loc("travel.sector_default", "Secteur");
        const sysName = system ? system.name : loc("travel.system_default", "Système");

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

        // Restauration de l'historique depuis $gameSystem
        if (typeof $gameSystem !== "undefined" && $gameSystem && typeof $gameSystem.getSpaceTravelLogs === "function") {
            const history = $gameSystem.getSpaceTravelLogs();
            if (Array.isArray(history) && history.length > 0) {
                this._out = history.slice(-20).map(item => ({ style: item.style || "info", text: item.text || item.txt }));
            }
        }

        this._outTimer = 0;
        this._blinkTimer = 0;
        this.loadWindowskin();
        this.refresh();
    }

    loadWindowskin() {
        if (ImageManager.loadSystem) {
            this.windowskin = ImageManager.loadSystem("Prompt") || ImageManager.loadSystem("Window");
        }
    }

    addMessage(style, text) {
        this._messages.push({ style: style || "info", text });
        if (this._messages.length > 50) this._messages.shift();
        if (typeof $gameSystem !== "undefined" && $gameSystem && typeof $gameSystem.addSpaceTravelLog === "function") {
            $gameSystem.addSpaceTravelLog(style, text);
        }
    }

    update() {
        super.update();
        this._blinkTimer++;
        if (this._outTimer <= 0 && this._messages.length > 0) {
            const nextMsg = this._messages.shift();
            this._out.push(nextMsg);
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

        const hasPending = this._messages.length > 0;
        const maxOutLines = hasPending ? Math.max(1, maxLines - 1) : maxLines;
        const recent = this._out.slice(-maxOutLines);

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

            const prefix = index === recent.length - 1 && !hasPending ? blinkPrompt : "  ";
            this.drawText(prefix + item.text, 8, y, this.contentsWidth() - 16, "left");
        });

        // Ligne animée si des logs sont en attente de calcul
        if (hasPending) {
            const dotsCount = (Math.floor(this._blinkTimer / 15) % 4);
            const dots = ".".repeat(dotsCount);
            const loadingText = `⏳ Calcul des données${dots}`;
            const loadingY = recent.length * lineHeight;
            this.contents.fontFace = "monospace";
            this.contents.fontSize = 14;
            this.contents.outlineWidth = 2;
            this.contents.outlineColor = "#000000";
            this.contents.textColor = (Math.floor(this._blinkTimer / 20) % 2 === 0) ? "#fabd2f" : "#d79921";
            this.drawText(loadingText, 8, loadingY, this.contentsWidth() - 16, "left");
        }
    }
}

class Window_SpaceShipInfo extends Window_Base {
    constructor(rect) {
        super(rect);
        this._ship = null;
        this._shipSprite = null;
        this.createShipSprite();
    }

    get paddingX() {
        return 24;
    }

    createShipSprite() {
        this._shipSprite = new Sprite();
        this._shipSprite.anchor.x = 0.5;
        this._shipSprite.anchor.y = 0.5;
        this._shipSprite.x = 24 + 48;
        this._shipSprite.y = 80;
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

        const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
        const ship = this._ship;
        const padX = 24;
        const width = this.contentsWidth();
        const contentW = width - (padX * 2);

        // Portrait du Capitaine en haut à droite
        const capActorId = ship.captainId || ship.actorId || 1;
        const capActor = window.$gameActors ? window.$gameActors.actor(capActorId) : null;
        const faceSize = 64;
        const faceX = width - padX - faceSize;
        const faceY = 22;

        this.contents.fontSize = 11;
        this.contents.textColor = "#fabd2f";
        this.drawText(loc("travel.captain", "Capitaine"), faceX - 10, faceY - 18, faceSize + 20, "center");

        this.contents.fillRect(faceX, faceY, faceSize, faceSize, "#111111");
        if (capActor) {
            this.drawFace(capActor.faceName(), capActor.faceIndex(), faceX, faceY, faceSize, faceSize);
        }
        this.contents.strokeStyle = "#fabd2f";
        this.contents.lineWidth = 1.5;
        this.contents.strokeRect(faceX, faceY, faceSize, faceSize);

        const capName = capActor ? capActor.name() : loc("travel.captain", "Capitaine");
        this.contents.fontSize = 11;
        this.contents.textColor = "#ebdbb2";
        this.drawText(capName, faceX - 15, faceY + faceSize + 2, faceSize + 30, "center");

        // 1. Titre & Classe
        this.contents.fontSize = 18;
        this.contents.textColor = "#fabd2f";
        this.drawText(ship.name, padX, 2, width - padX * 2 - 90, "left");

        this.contents.fontSize = 12;
        this.contents.textColor = "#a89984";
        this.drawText(`${ship.shipClass} • ${ship.category}`, padX, 24, width - padX * 2 - 90, "left");

        // 2. Faction
        this.contents.fontSize = 13;
        this.contents.textColor = "#ebdbb2";
        this.drawText(`${loc("travel.ship_faction", "Faction")}: ${ship.faction}`, padX + 105, 52, width - padX * 2 - 105 - 75, "left");

        // 3. Statut & Onboarding
        const statusColor = ship.isMoving() ? "#83a598" : "#b8bb26";
        this.contents.textColor = statusColor;
        let stTxt = ship.status;
        if (ship.isOnBoard && ship.isOnBoard() !== null) {
            const host = window.$gameSpaceships ? window.$gameSpaceships.ship(ship.isOnBoard()) : null;
            const hName = host ? host.name : ("#" + ship.isOnBoard());
            stTxt = loc("travel.onboard_vessel", "À bord de %1").replace("%1", hName);
        } else if (ship.isDocked && ship.isDocked() !== null) {
            const host = window.$gameSpaceships ? window.$gameSpaceships.ship(ship.isDocked()) : null;
            const hName = host ? host.name : ("#" + ship.isDocked());
            stTxt = loc("travel.docked_vessel", "Amarré à %1").replace("%1", hName);
        } else if (ship.isLanded && ship.isLanded() !== null) {
            const pId = ship.isLanded();
            const curSys = window.$gameSector ? window.$gameSector.currentSystem() : null;
            const planet = curSys ? curSys.planet(pId) : null;
            const pName = planet ? (typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(planet.name) : planet.name) : ("#" + pId);
            stTxt = loc("travel.landed_planet", "Posé sur %1").replace("%1", pName);
        } else if (ship.status === "Orbiting" && ship.orbitingPlanet) {
            const isStation = ship.orbitingPlanet.isStation && ship.orbitingPlanet.isStation();
            const prefix = isStation ? loc("travel.in_contact", "En contact") : loc("travel.in_orbit", "En orbite");
            stTxt = `${prefix} (${ship.orbitingPlanet.name})`;
        } else if (ship.status === "MoveToOrbit" && ship.orbitingPlanet) {
            const isStation = ship.orbitingPlanet.isStation && ship.orbitingPlanet.isStation();
            const prefix = isStation ? loc("travel.approaching_contact", "Approche pour contact avec") : loc("travel.approaching", "Approche de");
            stTxt = `${prefix} ${ship.orbitingPlanet.name}`;
        } else if (ship.status === "InContact" && ship.contactShip) {
            stTxt = `${loc("travel.in_contact", "En contact")} (${ship.contactShip.name})`;
        } else if (ship.status === "MoveToContact" && ship.contactShip) {
            stTxt = `${loc("travel.approaching", "Approche de")} ${ship.contactShip.name}`;
        } else if (ship.status === "InterSystemJump") {
            stTxt = loc("travel.warp_transit", "Transit Warp FTL");
        }
        this.drawText(`${loc("travel.ship_status", "Statut")}: ${stTxt}`, padX + 105, 74, width - padX * 2 - 105 - 75, "left");

        // 4. Moteur & Vitesse
        const motor = ship.motor;
        this.contents.textColor = "#fabd2f";
        this.contents.fontSize = 14;
        this.drawText(loc("travel.ship_propulsion", "◈ Propulsion & Carburant"), padX, 114, contentW, "left");

        this.contents.fontSize = 13;
        this.contents.textColor = "#ebdbb2";
        this.drawText(`${loc("travel.ship_motor", "Moteur")}: ${motor.name}`, padX, 138, contentW, "left");

        const spdVal = Math.round(ship.speed * 100);
        const hdText = ship.isHyperdrive() ? loc("travel.hyperdrive_on", " [HYPERDRIVE]") : "";
        this.contents.textColor = ship.isHyperdrive() ? "#fe8019" : "#8ec07c";
        this.drawText(`${loc("travel.ship_speed", "Vitesse")}: ${spdVal} u/s${hdText}`, padX, 160, contentW, "left");

        // Jauge de Fuel
        const maxFuel = motor.capacity === -1 ? 9999 : motor.capacity;
        const curFuel = Math.round(ship.fuel);
        const rate = motor.capacity === -1 ? 1.0 : (curFuel / maxFuel);

        this.contents.textColor = "#ebdbb2";
        this.drawText(`${loc("travel.ship_fuel", "Carburant")} (${motor.fuelname}):`, padX, 184, contentW, "left");

        const gaugeY = 208;
        const gaugeW = contentW;
        this.contents.fillRect(padX, gaugeY, gaugeW, 10, "#3c3836");
        this.contents.fillRect(padX, gaugeY, Math.round(gaugeW * rate), 10, rate > 0.25 ? "#b8bb26" : "#fb4934");

        this.contents.fontSize = 11;
        this.drawText(motor.capacity === -1 ? loc("travel.ship_unlimited", "ILLIMITÉ") : `${curFuel} / ${maxFuel}`, padX, gaugeY + 12, gaugeW, "right");

        // Coordonnées
        this.contents.textColor = "#928374";
        this.drawText(`${loc("travel.ship_coords", "Coords")}: ${Math.round(ship.x)} : ${Math.round(ship.y)}`, padX, gaugeY + 28, gaugeW, "left");

        // 5. Flotte à bord
        const allShips = window.$gameSpaceships ? window.$gameSpaceships.spaceships() : [];
        const onboardFleet = allShips.filter(s => s && s.id !== ship.id && s.isOnBoard && s.isOnBoard() !== null && s.isOnBoard() === ship.id);
        if (onboardFleet.length > 0) {
            const fleetY = gaugeY + 48;
            this.contents.textColor = "#fabd2f";
            this.contents.fontSize = 13;
            this.drawText(loc("travel.fleet_onboard", "◈ Flotte à bord"), padX, fleetY, contentW, "left");
            this.contents.fontSize = 12;
            this.contents.textColor = "#8ec07c";
            onboardFleet.slice(0, 3).forEach((sub, idx) => {
                this.drawText(`• ${sub.name} (${sub.shipClass || sub.category})`, padX + 8, fleetY + 18 + (idx * 16), contentW - 16, "left");
            });
        }
    }
}

class Window_SpaceTargetInfo extends Window_Base {
    constructor(rect) {
        super(rect);
        this._targetData = null;
        this._targetType = ""; // system | planet | poi
        this._contextScene = "system"; // sector | system | subsystem
        this._scrollY = 0;
        this._maxScrollY = 0;
    }

    setContext(ctx) {
        this._contextScene = ctx;
        this.refresh();
    }

    setTarget(type, data) {
        this._targetType = type;
        this._targetData = data;
        this._scrollY = 0;
        this.refresh();
    }

    update() {
        super.update();
        this.processWheel();
    }

    processWheel() {
        if (this.isOpen() && this.visible && this._maxScrollY > 0) {
            const threshold = 15;
            if (TouchInput.wheelY >= threshold && this._scrollY < this._maxScrollY) {
                this._scrollY = Math.min(this._maxScrollY, this._scrollY + 20);
                this.refresh();
            } else if (TouchInput.wheelY <= -threshold && this._scrollY > 0) {
                this._scrollY = Math.max(0, this._scrollY - 20);
                this.refresh();
            }
        }
    }

    refresh() {
        this.contents.clear();
        const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
        const width = this.contentsWidth();
        const height = this.contentsHeight();

        // 1. AUCUNE CIBLE SÉLECTIONNÉE : AFFICHAGE DU TUTO CONTEXTUEL
        if (!this._targetData) {
            this._maxScrollY = 0;
            let tutoRaw = "";
            let headerTitle = "";
            if (this._contextScene === "sector") {
                headerTitle = loc("travel.tuto_sector_header", "◈ NAVIGATION SECTORIELLE & SAUTS WARP FTL");
                tutoRaw = loc("travel.tuto_sector", "");
            } else if (this._contextScene === "subsystem") {
                headerTitle = loc("travel.tuto_subsystem_header", "◈ DÉBARQUEMENT & COMMUNICATIONS SUBCOM");
                tutoRaw = loc("travel.tuto_subsystem", "");
            } else {
                headerTitle = loc("travel.tuto_system_header", "◈ CONSOLE DE NAVIGATION STELLAIRE & PROPULSION");
                tutoRaw = loc("travel.tuto_system", "");
            }

            this.contents.fontSize = 14;
            this.contents.textColor = "#fabd2f";
            this.drawText(headerTitle, 16, 6, width - 32, "left");

            const lines = tutoRaw.split("\n");
            let y = 30;
            this.contents.fontSize = 12;
            this.contents.textColor = "#d5c4a1";
            lines.forEach(l => {
                this.drawText(l, 16, y, width - 32, "left");
                y += 20;
            });
            return;
        }

        // 2. CIBLE SÉLECTIONNÉE : AFFICHAGE DÉTAILLÉ AVEC IMAGE/ICÔNE ET SCROLL Y
        const data = this._targetData;
        const originY = -this._scrollY;

        let textX = 16;
        if (this._targetType === "poi") {
            const iconIndex = (data.icon && typeof data.icon === "number") ? data.icon : 16;
            this.drawIcon(iconIndex, 16, 12 + originY);
            textX = 64;
        } else if (this._targetType === "planet" || this._targetType === "system") {
            const bmpName = data.bitmapName || (this._targetType === "system" ? "sun" : "planet_0");
            const bmp = ImageManager.loadBitmap("img/GUI/ship/", bmpName);
            if (bmp && bmp.isReady()) {
                const img = bmp._image || bmp._canvas;
                if (img && this.contents.context) {
                    this.contents.context.drawImage(img, 0, 0, img.width, img.height, 16, 10 + originY, 56, 56);
                }
            } else {
                this.contents.fillRect(16, 10 + originY, 56, 56, "#1d2021");
                this.contents.strokeStyle = "#8ec07c";
                this.contents.strokeRect(16, 10 + originY, 56, 56);
            }
            textX = 84;
        }

        const textW = width - textX - 16;

        this.contents.fontSize = 18;
        this.contents.textColor = "#fabd2f";
        const targetTitle = data.name ? (typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(data.name) : data.name) : loc("travel.target_default", "Cible");
        this.drawText(targetTitle, textX, 4 + originY, textW, "left");

        this.contents.fontSize = 12;
        this.contents.textColor = "#8ec07c";
        const typeStr = data.type || (this._targetType === "system" ? loc("travel.target_system_solar", "Système Solaire") : loc("travel.target_poi", "Point d'Intérêt"));
        this.drawText(`${loc("travel.target_type", "Type")}: ${typeStr}`, textX, 26 + originY, textW, "left");

        this.contents.fontSize = 12;
        this.contents.textColor = "#ebdbb2";
        const desc = data.description || loc("travel.no_telemetry", "Aucune télémesure disponible.");
        const descLines = String(desc).split("\n");
        let curY = 46 + originY;
        descLines.forEach(line => {
            this.drawText(line, textX, curY, textW, "left");
            curY += 18;
        });
        curY += 6;

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
            this.contents.fontSize = 12;
            this.contents.textColor = "#fe8019";
            this.drawText(`${loc("travel.active_quest_badge", "★ Quête Active")} : ${questInfo.quest.name}`, textX, curY, textW, "left");
            this.contents.textColor = "#fabd2f";
            const qDesc = (questInfo.location && questInfo.location.description) || questInfo.quest.description;
            this.drawText(qDesc, textX, curY + 18, textW, "left");
            curY += 38;
        }

        const totalH = curY - originY + 10;
        this._maxScrollY = Math.max(0, totalH - height);

        if (this._maxScrollY > 0) {
            const scrollBarH = Math.max(16, Math.round((height / totalH) * height));
            const scrollBarY = Math.round((this._scrollY / this._maxScrollY) * (height - scrollBarH));
            this.contents.fillRect(width - 6, scrollBarY, 4, scrollBarH, "rgba(250, 189, 47, 0.6)");
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
        const lastSymbol = this.currentSymbol();
        this._commandsConfig = cmds || [];
        this.refresh();
        const newIndex = this.findSymbol(lastSymbol);
        this.select(newIndex >= 0 ? newIndex : 0);
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

// ============================================================================
// 3. SCÈNE NIVEAU 2 : SCENE_SPACETRAVEL (SYSTÈME SOLAIRE EN TEMPS RÉEL)
// ============================================================================

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

// ============================================================================
// 4. SCÈNE NIVEAU 3 : SCENE_SUBSYSTEMTRAVEL (SOUS-SYSTÈME PLANÉTAIRE & HANGAR)
// ============================================================================

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

SC4.openHangar = function(nefId = 2) {
    const ship = window.$gameSpaceships ? window.$gameSpaceships.playerShip() : null;
    const planet = ship ? ship.orbitingPlanet : null;

    if (planet) {
        SoundManager.playOk();
        Scene_SubsystemTravel.prepareContext(planet, true, nefId); // true = Hangar Landing Mode
        SceneManager.push(Scene_SubsystemTravel);
    } else {
        SoundManager.playBuzzer();
        if ($gameMessage) {
            const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
            $gameMessage.add(loc("travel.hangar_not_orbiting", "\\C[2]Contrôle Hangar\\C[0] : Le vaisseau n'est pas en orbite stationnaire."));
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

    PluginManager.registerCommand("SC4_SpaceScenes", "openHangar", (args) => {
        const nefId = args && args.nefId ? Number(args.nefId) : 2;
        SC4.openHangar(nefId);
    });

})();
