//=============================================================================
// RPG Maker MZ - Window_SpaceShipInfo
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

window.Window_SpaceShipInfo = Window_SpaceShipInfo;
if (typeof global !== 'undefined') {
    global.Window_SpaceShipInfo = Window_SpaceShipInfo;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Window_SpaceShipInfo };
}
