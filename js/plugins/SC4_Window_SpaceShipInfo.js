//=============================================================================
// RPG Maker MZ - SC4_Window_SpaceShipInfo
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Volet d'informations télémétriques du vaisseau et flotte à bord.
 * @author SimCraft
 *
 * @help SC4_Window_SpaceShipInfo.js
 */

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
        this._shipSprite.x = this.getPadX() + 50;
        this._shipSprite.y = 48 + 25;
        this.addChild(this._shipSprite);
    }

    setShip(ship) {
        this._ship = ship;
        if (this._ship && this._shipSprite) {
            this._shipSprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", this._ship.bitmapName);
            const gui = (typeof SC4_GUI_Utils !== "undefined") ? SC4_GUI_Utils : (typeof GUI_Utils !== "undefined" ? GUI_Utils : null);
            if (gui) {
                gui.adjustSpriteContain(this._shipSprite, this.getPadX(), 48, 100, 50);
            }
        }
        this.refresh();
    }

    // ========================================================================
    // 1. DONNÉES (GETTERS MÉTIER)
    // ========================================================================

    get ship() {
        return this._ship;
    }

    get capActor() {
        if (!this.ship) return null;
        const capActorId = this.ship.captainId || this.ship.actorId || 1;
        return window.$gameActors ? window.$gameActors.actor(capActorId) : null;
    }

    get motor() {
        return this.ship ? this.ship.motor : null;
    }

    getPadX() {
        return 24;
    }

    get paddingX() {
        return this.getPadX();
    }

    loc(key, def) {
        return typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(key, def) : def;
    }

    // ========================================================================
    // 2. RECTANGLES & DIMENSIONNEMENT
    // ========================================================================

    titleRect() {
        const padX = this.getPadX();
        const width = this.contentsWidth();
        const contentW = width - (padX * 2);
        const titleWidth = contentW - 90;
        return {
            nameRect: new Rectangle(padX, 2, titleWidth, 24),
            classRect: new Rectangle(padX, 24, titleWidth, 20)
        };
    }

    captainRect() {
        const width = this.contentsWidth();
        const padX = this.getPadX();
        const faceSize = 64;
        const faceX = width - padX - faceSize;
        const faceY = 22;
        return {
            titleRect: new Rectangle(faceX - 10, faceY - 18, faceSize + 20, 18),
            faceRect: new Rectangle(faceX, faceY, faceSize, faceSize),
            nameRect: new Rectangle(faceX - 15, faceY + faceSize + 2, faceSize + 30, 20)
        };
    }

    statusRect() {
        const padX = this.getPadX();
        const width = this.contentsWidth();
        const textW = width - (padX * 2) - 110 - 75;
        return {
            factionRect: new Rectangle(padX + 110, 50, textW, 20),
            statusRect: new Rectangle(padX + 110, 72, textW, 20)
        };
    }

    propulsionRect() {
        const padX = this.getPadX();
        const contentW = this.contentsWidth() - (padX * 2);
        return {
            headerRect: new Rectangle(padX, 114, contentW, 20),
            motorRect: new Rectangle(padX, 138, contentW, 20),
            speedRect: new Rectangle(padX, 160, contentW, 20),
            fuelLabelRect: new Rectangle(padX, 184, contentW, 20),
            fuelGaugeRect: new Rectangle(padX, 208, contentW, 10),
            fuelValueRect: new Rectangle(padX, 220, contentW, 18),
            coordsRect: new Rectangle(padX, 236, contentW, 18)
        };
    }

    fleetRect(gaugeY) {
        const padX = this.getPadX();
        const contentW = this.contentsWidth() - (padX * 2);
        const fleetY = gaugeY + 48;
        return {
            headerRect: new Rectangle(padX, fleetY, contentW, 20),
            itemsStartY: fleetY + 18,
            itemWidth: contentW - 16
        };
    }

    // ========================================================================
    // 3. STYLES & TYPOGRAPHIE
    // ========================================================================

    styliseCaptainTitle() {
        this.contents.fontSize = 11;
        this.contents.textColor = "#fabd2f";
    }

    styliseCaptainName() {
        this.contents.fontSize = 11;
        this.contents.textColor = "#ebdbb2";
    }

    styliseTitle() {
        this.contents.fontSize = 18;
        this.contents.textColor = "#fabd2f";
    }

    styliseSubtitle() {
        this.contents.fontSize = 12;
        this.contents.textColor = "#a89984";
    }

    styliseHeader() {
        this.contents.fontSize = 14;
        this.contents.textColor = "#fabd2f";
    }

    styliseBody() {
        this.contents.fontSize = 13;
        this.contents.textColor = "#ebdbb2";
    }

    styliseSmall() {
        this.contents.fontSize = 11;
        this.contents.textColor = "#ebdbb2";
    }

    // ========================================================================
    // 4. MÉTHODES DE RENDU PAR BLOC
    // ========================================================================

    drawTitleBlock() {
        const rects = this.titleRect();
        this.styliseTitle();
        this.drawText(this.ship.name, rects.nameRect.x, rects.nameRect.y, rects.nameRect.width, "left");

        this.styliseSubtitle();
        this.drawText(`${this.ship.shipClass} • ${this.ship.category}`, rects.classRect.x, rects.classRect.y, rects.classRect.width, "left");
    }

    drawCaptainBlock() {
        const rects = this.captainRect();
        const actor = this.capActor;

        // 1. Fond du portrait
        this.contents.fillRect(rects.faceRect.x, rects.faceRect.y, rects.faceRect.width, rects.faceRect.height, "#111111");

        // 2. Faceset
        if (actor) {
            this.drawFace(actor.faceName(), actor.faceIndex(), rects.faceRect.x, rects.faceRect.y, rects.faceRect.width, rects.faceRect.height);
        }

        // 3. Cadre doré
        this.contents.strokeStyle = "#fabd2f";
        this.contents.lineWidth = 1.5;
        this.contents.strokeRect(rects.faceRect.x, rects.faceRect.y, rects.faceRect.width, rects.faceRect.height);

        // 4. Titre 'Capitaine' (au-dessus du portrait)
        this.styliseCaptainTitle();
        this.drawText(this.loc("travel.captain", "Capitaine"), rects.titleRect.x, rects.titleRect.y, rects.titleRect.width, "center");

        // 5. Nom du capitaine (en-dessous du portrait, dessiné après le faceset selon l'ordre souhaité)
        const capName = actor ? actor.name() : this.loc("travel.captain", "Capitaine");
        this.styliseCaptainName();
        this.drawText(capName, rects.nameRect.x, rects.nameRect.y, rects.nameRect.width, "center");
    }

    drawShipSpriteBlock() {
        if (this._shipSprite && this._shipSprite.bitmap) {
            const gui = (typeof SC4_GUI_Utils !== "undefined") ? SC4_GUI_Utils : (typeof GUI_Utils !== "undefined" ? GUI_Utils : null);
            if (gui) {
                gui.adjustSpriteContain(this._shipSprite, this.getPadX(), 48, 100, 50);
            }
        }
    }

    drawStatusBlock() {
        const rects = this.statusRect();

        // Faction
        this.styliseBody();
        this.drawText(`${this.loc("travel.ship_faction", "Faction")}: ${this.ship.faction}`, rects.factionRect.x, rects.factionRect.y, rects.factionRect.width, "left");

        // Statut & Onboarding
        const statusColor = this.ship.isMoving() ? "#83a598" : "#b8bb26";
        this.contents.textColor = statusColor;
        let stTxt = this.ship.status;

        if (this.ship.isOnBoard && this.ship.isOnBoard() !== null) {
            const host = window.$gameSpaceships ? window.$gameSpaceships.ship(this.ship.isOnBoard()) : null;
            const hName = host ? host.name : ("#" + this.ship.isOnBoard());
            stTxt = this.loc("travel.onboard_vessel", "À bord de %1").replace("%1", hName);
        } else if (this.ship.isDocked && this.ship.isDocked() !== null) {
            const host = window.$gameSpaceships ? window.$gameSpaceships.ship(this.ship.isDocked()) : null;
            const hName = host ? host.name : ("#" + this.ship.isDocked());
            stTxt = this.loc("travel.docked_vessel", "Amarré à %1").replace("%1", hName);
        } else if (this.ship.isLanded && this.ship.isLanded() !== null) {
            const pId = this.ship.isLanded();
            const curSys = window.$gameSector ? window.$gameSector.currentSystem() : null;
            const planet = curSys ? curSys.planet(pId) : null;
            const pName = planet ? (typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(planet.name) : planet.name) : ("#" + pId);
            stTxt = this.loc("travel.landed_planet", "Posé sur %1").replace("%1", pName);
        } else if (this.ship.status === "Orbiting" && this.ship.orbitingPlanet) {
            const isStation = this.ship.orbitingPlanet.isStation && this.ship.orbitingPlanet.isStation();
            const prefix = isStation ? this.loc("travel.in_contact", "En contact") : this.loc("travel.in_orbit", "En orbite");
            stTxt = `${prefix} (${this.ship.orbitingPlanet.name})`;
        } else if (this.ship.status === "MoveToOrbit" && this.ship.orbitingPlanet) {
            const isStation = this.ship.orbitingPlanet.isStation && this.ship.orbitingPlanet.isStation();
            const prefix = isStation ? this.loc("travel.approaching_contact", "Approche pour contact avec") : this.loc("travel.approaching", "Approche de");
            stTxt = `${prefix} ${this.ship.orbitingPlanet.name}`;
        } else if (this.ship.status === "InContact" && this.ship.contactShip) {
            stTxt = `${this.loc("travel.in_contact", "En contact")} (${this.ship.contactShip.name})`;
        } else if (this.ship.status === "MoveToContact" && this.ship.contactShip) {
            stTxt = `${this.loc("travel.approaching", "Approche de")} ${this.ship.contactShip.name}`;
        } else if (this.ship.status === "InterSystemJump") {
            stTxt = this.loc("travel.warp_transit", "Transit Warp FTL");
        }

        this.drawText(`${this.loc("travel.ship_status", "Statut")}: ${stTxt}`, rects.statusRect.x, rects.statusRect.y, rects.statusRect.width, "left");
    }

    drawPropulsionBlock() {
        const motor = this.motor;
        if (!motor) return;

        const rects = this.propulsionRect();

        // En-tête propulsion
        this.styliseHeader();
        this.drawText(this.loc("travel.ship_propulsion", "◈ Propulsion & Carburant"), rects.headerRect.x, rects.headerRect.y, rects.headerRect.width, "left");

        // Moteur
        this.styliseBody();
        this.drawText(`${this.loc("travel.ship_motor", "Moteur")}: ${motor.name}`, rects.motorRect.x, rects.motorRect.y, rects.motorRect.width, "left");

        // Vitesse
        const spdVal = Math.round(this.ship.speed * 100);
        const hdText = this.ship.isHyperdrive() ? this.loc("travel.hyperdrive_on", " [HYPERDRIVE]") : "";
        this.contents.textColor = this.ship.isHyperdrive() ? "#fe8019" : "#8ec07c";
        this.drawText(`${this.loc("travel.ship_speed", "Vitesse")}: ${spdVal} u/s${hdText}`, rects.speedRect.x, rects.speedRect.y, rects.speedRect.width, "left");

        // Carburant
        const maxFuel = motor.capacity === -1 ? 9999 : motor.capacity;
        const curFuel = Math.round(this.ship.fuel);
        const rate = motor.capacity === -1 ? 1.0 : (curFuel / maxFuel);

        this.styliseBody();
        this.drawText(`${this.loc("travel.ship_fuel", "Carburant")} (${motor.fuelname}):`, rects.fuelLabelRect.x, rects.fuelLabelRect.y, rects.fuelLabelRect.width, "left");

        // Jauge de carburant
        this.contents.fillRect(rects.fuelGaugeRect.x, rects.fuelGaugeRect.y, rects.fuelGaugeRect.width, rects.fuelGaugeRect.height, "#3c3836");
        this.contents.fillRect(rects.fuelGaugeRect.x, rects.fuelGaugeRect.y, Math.round(rects.fuelGaugeRect.width * rate), rects.fuelGaugeRect.height, rate > 0.25 ? "#b8bb26" : "#fb4934");

        this.styliseSmall();
        this.drawText(motor.capacity === -1 ? this.loc("travel.ship_unlimited", "ILLIMITÉ") : `${curFuel} / ${maxFuel}`, rects.fuelValueRect.x, rects.fuelValueRect.y, rects.fuelValueRect.width, "right");

        // Coordonnées
        this.contents.textColor = "#928374";
        this.drawText(`${this.loc("travel.ship_coords", "Coords")}: ${Math.round(this.ship.x)} : ${Math.round(this.ship.y)}`, rects.coordsRect.x, rects.coordsRect.y, rects.coordsRect.width, "left");
    }

    drawFleetBlock() {
        const allShips = window.$gameSpaceships ? window.$gameSpaceships.spaceships() : [];
        const onboardFleet = allShips.filter(s => s && s.id !== this.ship.id && s.isOnBoard && s.isOnBoard() !== null && s.isOnBoard() === this.ship.id);

        if (onboardFleet.length > 0) {
            const rects = this.fleetRect(208);
            this.styliseHeader();
            this.drawText(this.loc("travel.fleet_onboard", "◈ Flotte à bord"), rects.headerRect.x, rects.headerRect.y, rects.headerRect.width, "left");

            this.contents.fontSize = 12;
            this.contents.textColor = "#8ec07c";
            onboardFleet.slice(0, 3).forEach((sub, idx) => {
                this.drawText(`• ${sub.name} (${sub.shipClass || sub.category})`, this.getPadX() + 8, rects.itemsStartY + (idx * 16), rects.itemWidth, "left");
            });
        }
    }

    // ========================================================================
    // 5. CHEF D'ORCHESTRE GLOBAL (REFRESH)
    // ========================================================================

    refresh() {
        this.contents.clear();
        if (!this.ship) return;

        this.drawTitleBlock();
        this.drawCaptainBlock();
        this.drawShipSpriteBlock();
        this.drawStatusBlock();
        this.drawPropulsionBlock();
        this.drawFleetBlock();
    }
}

window.Window_SpaceShipInfo = Window_SpaceShipInfo;
if (typeof global !== 'undefined') {
    global.Window_SpaceShipInfo = Window_SpaceShipInfo;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Window_SpaceShipInfo };
}
