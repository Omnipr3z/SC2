//=============================================================================
// RPG Maker MZ - SC4_Window_BridgeConsole
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Console de commande de la passerelle du vaisseau spatial (Bridge Console).
 * @author SimCraft
 * 
 * @help SC4_Window_BridgeConsole.js
 * 
 * Fenêtre de commande contextuelle pour la passerelle de commandement du vaisseau.
 * Conforme au standard d'architecture 5 sections SimCraft.
 */

const _BaseWindowBridgeConsole = typeof Window_Command !== "undefined" ? Window_Command : (typeof Window_Base !== "undefined" ? Window_Base : Object);

class Window_BridgeConsole extends _BaseWindowBridgeConsole {
    /**
     * @param {Rectangle} [rect]
     */
    constructor(rect) {
        if (!rect && typeof Rectangle !== "undefined" && typeof Graphics !== "undefined") {
            const w = 480;
            const h = 420;
            const x = Math.floor((Graphics.boxWidth - w) / 2);
            const y = Math.floor((Graphics.boxHeight - h) / 2);
            rect = new Rectangle(x, y, w, h);
        }
        super(rect);
        this.opacity = 240;
        this._headerHeight = 70;
        this._shipId = null;
        this._mode = "main";
        this.refresh();
    }

    setMode(mode) {
        this._mode = mode || "main";
        this.select(0);
        this.refresh();
    }

    close() {
        this._mode = "main";
        if (typeof super.close === "function") {
            super.close();
        }
    }

    loadWindowskin() {
        if (typeof ImageManager !== "undefined" && ImageManager.loadSystem) {
            this.windowskin = ImageManager.loadSystem("Prompt") || ImageManager.loadSystem("Window");
        }
    }

    // ========================================================================
    // 1. DONNÉES & GETTERS MÉTIER
    // ========================================================================

    setShipId(shipId) {
        this._shipId = (shipId !== undefined && shipId !== null) ? Number(shipId) : null;
    }

    get targetShip() {
        const spaceships = (typeof $gameSpaceships !== "undefined" && $gameSpaceships)
            ? $gameSpaceships
            : (typeof window !== "undefined" ? window.$gameSpaceships : null);
        if (!spaceships) return null;
        // Priorité 1 : ID explicite passé en argument (prise de contrôle à distance, piratage, etc.)
        if (this._shipId !== null && typeof spaceships.ship === "function") {
            const explicitShip = spaceships.ship(this._shipId);
            if (explicitShip) return explicitShip;
        }
        // Priorité 2 : Vaisseau associé à la carte courante (mapId)
        const gameMap = (typeof $gameMap !== "undefined" && $gameMap)
            ? $gameMap
            : (typeof window !== "undefined" ? window.$gameMap : null);
        if (gameMap && typeof gameMap.mapId === "function") {
            const curMapId = gameMap.mapId();
            const mapShip = typeof spaceships.shipByMapId === "function"
                ? spaceships.shipByMapId(curMapId)
                : (typeof spaceships.spaceships === "function" ? spaceships.spaceships().find(s => s && s.mapId === curMapId) : null);
            if (mapShip) return mapShip;
        }
        // Priorité 3 : Repli sur le vaisseau principal du joueur
        return typeof spaceships.playerShip === "function" ? spaceships.playerShip() : null;
    }

    get playerShip() {
        return this.targetShip;
    }

    get isLanded() {
        const ship = this.playerShip;
        return !!(ship && typeof ship.isLanded === "function" && ship.isLanded() !== null);
    }

    get orbitingPlanetId() {
        const ship = this.playerShip;
        return (ship && typeof ship.orbitingPlanetId !== "undefined") ? ship.orbitingPlanetId : null;
    }

    get orbitingPlanet() {
        const ship = this.playerShip;
        return (ship && typeof ship.orbitingPlanet !== "undefined") ? ship.orbitingPlanet : null;
    }

    get landingPois() {
        const ship = this.playerShip;
        if (!ship) return [];
        const planetId = this.orbitingPlanetId;
        if (planetId === null || planetId === undefined) return [];

        let pois = [];
        const gamePOIs = (typeof $gamePOIs !== "undefined" && $gamePOIs)
            ? $gamePOIs
            : (typeof window !== "undefined" ? window.$gamePOIs : null);
        const dataPois = (typeof $dataPois !== "undefined" && $dataPois)
            ? $dataPois
            : (typeof window !== "undefined" ? window.$dataPois : null);

        if (gamePOIs && typeof gamePOIs.getAll === "function") {
            pois = gamePOIs.getAll();
        } else if (dataPois) {
            pois = dataPois;
        }
        return (pois || []).filter(p => p && p.planetId === planetId && p.landingMapId > 0);
    }

    isPoiAuthorized(poi) {
        if (!poi) return false;
        const planetId = this.orbitingPlanetId;
        if (typeof SC4 !== "undefined" && typeof SC4.isLandingAuthorized === "function") {
            if (poi.id && SC4.isLandingAuthorized(poi.id)) return true;
            if (planetId !== null && planetId !== undefined && SC4.isLandingAuthorized(planetId)) return true;
        }
        if (typeof $gameSystem !== "undefined" && $gameSystem && typeof $gameSystem.isLandingAuthorized === "function") {
            if (poi.id && $gameSystem.isLandingAuthorized(poi.id)) return true;
            if (planetId !== null && planetId !== undefined && $gameSystem.isLandingAuthorized(planetId)) return true;
        }
        return false;
    }

    get hasAnyAuthorizedPoi() {
        const pois = this.landingPois;
        return pois.some(p => this.isPoiAuthorized(p));
    }

    get isLandingAuthorized() {
        const ship = this.playerShip;
        if (!ship) return false;
        const planetId = this.orbitingPlanetId;
        if (planetId === null || planetId === undefined) return false;

        if (typeof SC4 !== "undefined" && typeof SC4.isLandingAuthorized === "function") {
            if (SC4.isLandingAuthorized(planetId)) return true;
        } else if (typeof $gameSystem !== "undefined" && $gameSystem && typeof $gameSystem.isLandingAuthorized === "function") {
            if ($gameSystem.isLandingAuthorized(planetId)) return true;
        }
        return this.hasAnyAuthorizedPoi;
    }

    get landingPoi() {
        const pois = this.landingPois;
        const authorizedPoi = pois.find(p => this.isPoiAuthorized(p));
        return authorizedPoi || (pois.length > 0 ? pois[0] : null);
    }

    getPoiName(poi) {
        if (!poi) return "";
        if (poi.name) return poi.name;
        const dataPois = (typeof $dataPois !== "undefined" && $dataPois)
            ? $dataPois
            : (typeof window !== "undefined" ? window.$dataPois : null);
        if (dataPois) {
            const dp = dataPois.find(p => p && p.id === poi.id);
            if (dp && dp.name) return dp.name;
        }
        return String(poi.id).replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    }

    get canLand() {
        const ship = this.playerShip;
        if (!ship || this.isLanded) return false;
        const planetId = this.orbitingPlanetId;
        if (planetId === null || planetId === undefined) return false;

        const planet = this.orbitingPlanet;
        if (planet && planet.landingAllowed === false) return false;
        return this.landingPois.length > 0;
    }

    loc(key, def) {
        return typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(key, def) : def;
    }

    // ========================================================================
    // 2. RECTANGLES & GÉOMÉTRIE
    // ========================================================================

    maxCols() {
        return 1;
    }

    itemHeight() {
        return 48;
    }

    headerHeight() {
        return this._headerHeight || 70;
    }

    itemRect(index) {
        if (typeof super.itemRect === "function") {
            const rect = super.itemRect(index);
            rect.y += this.headerHeight();
            return rect;
        }
        return new Rectangle(0, this.headerHeight() + index * this.itemHeight(), this.innerWidth || 440, this.itemHeight());
    }

    titleRect() {
        return new Rectangle(12, 6, (this.innerWidth || 440) - 24, 30);
    }

    statusRect() {
        return new Rectangle(12, 36, (this.innerWidth || 440) - 24, 26);
    }

    // ========================================================================
    // 3. STYLES & TYPOGRAPHIE
    // ========================================================================

    resetFontSettings() {
        if (this.contents) {
            this.contents.fontFace = (typeof $gameSystem !== "undefined" && $gameSystem) ? $gameSystem.mainFontFace() : "sans-serif";
            this.contents.fontSize = 18;
            this.contents.textColor = "#e0e0e0";
            this.contents.outlineColor = "#000000";
            this.contents.outlineWidth = 3;
        }
    }

    styliseTitle() {
        if (this.contents) {
            this.contents.textColor = "#61afef";
            this.contents.fontSize = 18;
        }
    }

    styliseStatus() {
        if (this.contents) {
            this.contents.fontSize = 14;
            if (this.isLanded) {
                this.contents.textColor = "#e5c07b";
            } else if (this.orbitingPlanetId !== null && this.orbitingPlanetId !== undefined) {
                this.contents.textColor = "#98c379";
            } else {
                this.contents.textColor = "#abb2bf";
            }
        }
    }

    // ========================================================================
    // 4. DESSIN PAR BLOC
    // ========================================================================

    drawTitleBlock() {
        const rect = this.titleRect();
        this.styliseTitle();
        if (this._mode === "land_sites") {
            const titleText = this.loc("bridge.title_land_sites", "SÉLECTION DU SITE D'ATTERRISSAGE");
            if (typeof this.drawText === "function") {
                this.drawText(titleText, rect.x, rect.y, rect.width, "left");
            }
            return;
        }
        const ship = this.playerShip;
        const shipName = ship ? (ship.name || "Dawn Of Faith") : "Vaisseau";
        const titleText = this.loc("bridge.title", `CONSOLE DE PASSERELLE ▷ ${shipName.toUpperCase()}`);
        if (typeof this.drawText === "function") {
            this.drawText(titleText, rect.x, rect.y, rect.width, "left");
        }
    }

    drawStatusBlock() {
        const rect = this.statusRect();
        this.styliseStatus();
        let statusText = "";
        if (this._mode === "land_sites") {
            const planet = this.orbitingPlanet;
            const pName = planet ? (planet.name || `Astre #${planet.id}`) : `Astre #${this.orbitingPlanetId}`;
            statusText = this.loc("bridge.status_land_sites", `[ASTRE] ${pName} ▷ Choisissez votre zone d'approche`);
            if (typeof this.drawText === "function") {
                this.drawText(statusText, rect.x, rect.y, rect.width, "left");
            }
            return;
        }
        if (this.isLanded) {
            const pId = this.playerShip.isLanded();
            statusText = this.loc("bridge.status_landed", `[STATUT] Amarré au sol / Spatioport (Astre #${pId})`);
        } else if (this.orbitingPlanetId !== null && this.orbitingPlanetId !== undefined) {
            const planet = this.orbitingPlanet;
            const pName = planet ? (planet.name || `Astre #${planet.id}`) : `Astre #${this.orbitingPlanetId}`;
            const authTag = this.isLandingAuthorized ? " [Atterrissage Autorisé]" : " [Autorisation Requise]";
            statusText = this.loc("bridge.status_orbiting", `[STATUT] En orbite stationnaire autour de ${pName}${authTag}`);
        } else {
            statusText = this.loc("bridge.status_space", "[STATUT] En vol libre dans l'espace sidéral");
        }
        if (typeof this.drawText === "function") {
            this.drawText(statusText, rect.x, rect.y, rect.width, "left");
        }
    }

    drawItem(index) {
        const rect = this.itemRectWithPadding ? this.itemRectWithPadding(index) : this.itemRect(index);
        const cmd = this._list && this._list[index] ? this._list[index] : null;
        if (!cmd) return;

        this.resetFontSettings();
        if (this.changePaintOpacity) {
            this.changePaintOpacity(cmd.enabled);
        }

        const iconMap = {
            navigation: "🛰️",
            land: "🛬",
            select_poi: "🛬",
            back_main: "◀",
            takeoff: "🛫",
            dock: "⚓",
            subcom: "📡",
            quit: "❌"
        };
        const icon = iconMap[cmd.symbol] || "▶";
        const fullText = (cmd.symbol === "back_main") ? `${cmd.name}` : `${icon}  ${cmd.name}`;

        if (typeof this.drawText === "function") {
            this.drawText(fullText, rect.x + 8, rect.y, rect.width - 16, "left");
        }
    }

    // ========================================================================
    // 5. ORCHESTRATION & GESTION DES COMMANDES / ENTRÉES
    // ========================================================================

    makeCommandList() {
        if (this._mode === "land_sites") {
            const pois = this.landingPois;
            if (pois.length === 0) {
                this.addCommand(this.loc("bridge.no_sites", "(Aucun site répertorié)"), "back_main", false);
            } else {
                pois.forEach(poi => {
                    const authorized = this.isPoiAuthorized(poi);
                    const tag = authorized
                        ? this.loc("bridge.poi_authorized", "[Autorisé]")
                        : this.loc("bridge.poi_unauthorized", "[Autorisation requise]");
                    const name = this.getPoiName(poi);
                    this.addCommand(`${name}  ${tag}`, "select_poi", authorized, poi);
                });
            }
            this.addCommand(this.loc("bridge.back", "◀ Retour au menu"), "back_main", true);
            return;
        }

        const landed = this.isLanded;
        const canLand = this.canLand;
        const authorized = this.isLandingAuthorized;

        this.addCommand(this.loc("bridge.cmd_navigation", "Navigation Stellaire"), "navigation", !landed);
        this.addCommand(this.loc("bridge.cmd_land", "Atterrir"), "land", !landed && canLand && authorized);
        this.addCommand(this.loc("bridge.cmd_takeoff", "Décoller"), "takeoff", landed);
        this.addCommand(this.loc("bridge.cmd_dock", "Amarrage / Sas (WIP)"), "dock", false);
        this.addCommand(this.loc("bridge.cmd_subcom", "Subcom (WIP)"), "subcom", false);
        this.addCommand(this.loc("bridge.cmd_quit", "Quitter la console"), "quit", true);
    }

    refresh() {
        if (typeof this.clearCommandList === "function") {
            this.clearCommandList();
        }
        this.makeCommandList();
        if (typeof super.refresh === "function") {
            super.refresh();
        }
        this.drawTitleBlock();
        this.drawStatusBlock();
    }
}

// ============================================================================
// INTÉGRATION SCENE_MAP & PERSISTANCE
// ============================================================================
if (typeof Scene_Map !== "undefined") {
    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        if (_Scene_Map_createAllWindows) {
            _Scene_Map_createAllWindows.call(this);
        }
        this.createBridgeConsoleWindow();
    };

    Scene_Map.prototype.createBridgeConsoleWindow = function() {
        this._bridgeConsoleWindow = new Window_BridgeConsole();
        this._bridgeConsoleWindow.setHandler("navigation", this.onBridgeConsoleNavigation.bind(this));
        this._bridgeConsoleWindow.setHandler("land", this.onBridgeConsoleLand.bind(this));
        this._bridgeConsoleWindow.setHandler("select_poi", this.onBridgeConsoleSelectPoi.bind(this));
        this._bridgeConsoleWindow.setHandler("back_main", this.onBridgeConsoleBackMain.bind(this));
        this._bridgeConsoleWindow.setHandler("takeoff", this.onBridgeConsoleTakeoff.bind(this));
        this._bridgeConsoleWindow.setHandler("dock", this.onBridgeConsoleDock.bind(this));
        this._bridgeConsoleWindow.setHandler("subcom", this.onBridgeConsoleSubcom.bind(this));
        this._bridgeConsoleWindow.setHandler("quit", this.onBridgeConsoleQuit.bind(this));
        this._bridgeConsoleWindow.setHandler("cancel", this.onBridgeConsoleCancel.bind(this));
        this._bridgeConsoleWindow.close();
        this._bridgeConsoleWindow.deactivate();
        this.addWindow(this._bridgeConsoleWindow);
    };

    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        if (_Scene_Map_start) {
            _Scene_Map_start.call(this);
        }
        const gs = (typeof $gameSystem !== "undefined" && $gameSystem) ? $gameSystem : (typeof window !== "undefined" ? window.$gameSystem : null);
        if (gs && gs._bridgeConsoleOpen) {
            const shipId = gs._bridgeConsoleShipId;
            this.openBridgeConsole(shipId);
        }
    };

    Scene_Map.prototype.openBridgeConsole = function(shipId) {
        const gs = (typeof $gameSystem !== "undefined" && $gameSystem) ? $gameSystem : (typeof window !== "undefined" ? window.$gameSystem : null);
        if (gs) {
            gs._bridgeConsoleOpen = true;
            gs._bridgeConsoleShipId = (shipId !== undefined && shipId !== null) ? Number(shipId) : null;
        }
        if (this._bridgeConsoleWindow) {
            this._bridgeConsoleWindow.setShipId(shipId);
            this._bridgeConsoleWindow.setMode("main");
            this._bridgeConsoleWindow.refresh();
            this._bridgeConsoleWindow.select(0);
            this._bridgeConsoleWindow.open();
            this._bridgeConsoleWindow.activate();
        }
    };

    Scene_Map.prototype.closeBridgeConsole = function() {
        const gs = (typeof $gameSystem !== "undefined" && $gameSystem) ? $gameSystem : (typeof window !== "undefined" ? window.$gameSystem : null);
        if (gs) {
            gs._bridgeConsoleOpen = false;
            gs._bridgeConsoleShipId = null;
        }
        if (this._bridgeConsoleWindow) {
            this._bridgeConsoleWindow.close();
            this._bridgeConsoleWindow.deactivate();
        }
    };

    Scene_Map.prototype.onBridgeConsoleNavigation = function() {
        if (this._bridgeConsoleWindow) {
            this._bridgeConsoleWindow.close();
            this._bridgeConsoleWindow.deactivate();
        }
        // Conserve $gameSystem._bridgeConsoleOpen = true pour la réouverture automatique au pop()
        if (typeof SC4 !== "undefined" && typeof SC4.openNavigation === "function") {
            SC4.openNavigation();
        } else if (typeof Scene_SpaceTravel !== "undefined" && typeof SceneManager !== "undefined") {
            SceneManager.push(Scene_SpaceTravel);
        }
    };

    Scene_Map.prototype.onBridgeConsoleLand = function() {
        if (this._bridgeConsoleWindow) {
            this._bridgeConsoleWindow.setMode("land_sites");
            this._bridgeConsoleWindow.activate();
        }
    };

    Scene_Map.prototype.onBridgeConsoleSelectPoi = function() {
        const poi = this._bridgeConsoleWindow ? this._bridgeConsoleWindow.currentExt() : null;
        this.closeBridgeConsole();
        if (typeof SC4 !== "undefined" && typeof SC4.performLandingSequence === "function") {
            SC4.performLandingSequence(poi ? poi.id : undefined);
        }
    };

    Scene_Map.prototype.onBridgeConsoleBackMain = function() {
        if (this._bridgeConsoleWindow) {
            this._bridgeConsoleWindow.setMode("main");
            this._bridgeConsoleWindow.activate();
        }
    };

    Scene_Map.prototype.onBridgeConsoleCancel = function() {
        if (this._bridgeConsoleWindow && this._bridgeConsoleWindow._mode === "land_sites") {
            this._bridgeConsoleWindow.setMode("main");
            this._bridgeConsoleWindow.activate();
        } else {
            this.closeBridgeConsole();
        }
    };

    Scene_Map.prototype.onBridgeConsoleTakeoff = function() {
        this.closeBridgeConsole();
        if (typeof SC4 !== "undefined" && typeof SC4.performTakeoffSequence === "function") {
            SC4.performTakeoffSequence();
        }
    };

    Scene_Map.prototype.onBridgeConsoleDock = function() {
        if (this._bridgeConsoleWindow) {
            this._bridgeConsoleWindow.activate();
        }
    };

    Scene_Map.prototype.onBridgeConsoleSubcom = function() {
        if (this._bridgeConsoleWindow) {
            this._bridgeConsoleWindow.activate();
        }
    };

    Scene_Map.prototype.onBridgeConsoleQuit = function() {
        this.closeBridgeConsole();
    };

    const _Scene_Map_isMenuEnabled = Scene_Map.prototype.isMenuEnabled;
    Scene_Map.prototype.isMenuEnabled = function() {
        const gs = (typeof $gameSystem !== "undefined" && $gameSystem) ? $gameSystem : (typeof window !== "undefined" ? window.$gameSystem : null);
        if (gs && gs._bridgeConsoleOpen) {
            return false;
        }
        return _Scene_Map_isMenuEnabled ? _Scene_Map_isMenuEnabled.call(this) : true;
    };
}

// ============================================================================
// BLOCAGE DU DÉPLACEMENT JOUEUR TANT QUE LA CONSOLE EST ACTIVE
// ============================================================================
if (typeof Game_Player !== "undefined") {
    const _Game_Player_canMove = Game_Player.prototype.canMove;
    Game_Player.prototype.canMove = function() {
        if (window.$gameSystem && window.$gameSystem._bridgeConsoleOpen) {
            return false;
        }
        return _Game_Player_canMove ? _Game_Player_canMove.call(this) : true;
    };
}

// Export universel
if (typeof window !== "undefined") {
    window.Window_BridgeConsole = Window_BridgeConsole;
}
if (typeof global !== "undefined") {
    global.Window_BridgeConsole = Window_BridgeConsole;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Window_BridgeConsole };
}
