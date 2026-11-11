//=============================================================================
// SimCraft 4 - SubScene Console (Bridge Cockpit)
// SC4_SubScene_Console.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Sous-scène orchestratrice du cockpit de passerelle (Fiche Télémétrique + Console de Pilotage).
 * @author SimCraft 4 Core Team
 * @help
 * ============================================================================
 * ■ SC4_SubScene_Console : Pupitre de Commandement Bi-Écran
 * ============================================================================
 * Cette sous-scène hérite de SubScene_Base et orchestre deux fenêtres coordonnées
 * sur la carte du pont sans interruption du rendu de la carte :
 * 1. Volet Gauche : Window_SpaceShipInfo (portrait capitaine, jauges, statut, flotte)
 * 2. Volet Droit  : Window_BridgeConsole (ordres, atterrissage Option A, décollage)
 *
 * Utilisation :
 * - SC4.openBridgeConsole([shipId]);
 * - SceneManager._scene.openSubScene(SubScene_Console, [shipId]);
 * ============================================================================
 */

// ========================================================================
// 1. CLASSE SUBSCENE_CONSOLE
// ========================================================================
class SubScene_Console extends SubScene_Base {
        initMembers(shipId, targetEventId = null) {
            if (Array.isArray(shipId)) {
                targetEventId = shipId[1];
                shipId = shipId[0];
            }
            this._shipId = (shipId !== undefined && shipId !== null) ? Number(shipId) : null;
            const explicitEv = (targetEventId !== undefined && targetEventId !== null && Number(targetEventId) > 0)
                ? Number(targetEventId)
                : null;
            const interpEv = (typeof $gameMap !== "undefined" && $gameMap && $gameMap._interpreter && typeof $gameMap._interpreter.eventId === "function")
                ? $gameMap._interpreter.eventId()
                : 0;
            this._targetEventId = explicitEv !== null ? explicitEv : (interpEv > 0 ? interpEv : 0);
            this._shipInfoWindow = null;
            this._consoleWindow = null;
            this._lastSnapshot = null;
        }

        captureLiveSnapshot() {
            const ship = this.targetShip;
            const shipStatus = ship
                ? (ship.status !== undefined ? ship.status : (ship._status !== undefined ? ship._status : null))
                : null;
            const orbitingPlanetId = (ship && ship.orbitingPlanetId !== undefined) ? ship.orbitingPlanetId : null;
            const isLanded = (ship && typeof ship.isLanded === "function") ? ship.isLanded() : null;
            const navLocked = Boolean(
                (typeof $guiManager !== "undefined" && $guiManager && $guiManager.isNavigationLocked) ||
                (typeof $subComManager !== "undefined" && $subComManager && typeof $subComManager.hasNavigationBlockingCall === "function" && $subComManager.hasNavigationBlockingCall())
            );
            const activeCall = (typeof $subComManager !== "undefined" && $subComManager) ? $subComManager.activeCall : null;
            const unseenMissed = (typeof $subComManager !== "undefined" && $subComManager && typeof $subComManager.getUnseenMissedCount === "function")
                ? $subComManager.getUnseenMissedCount()
                : 0;

            return {
                shipStatus: shipStatus,
                orbitingPlanetId: orbitingPlanetId,
                isLanded: isLanded,
                navLocked: navLocked,
                activeCallId: activeCall ? activeCall.id : 0,
                activeCallActorId: activeCall ? activeCall.actorId : 0,
                activeCallMasked: activeCall ? Boolean(activeCall.masked) : false,
                unseenMissed: unseenMissed
            };
        }

        isSnapshotEqual(a, b) {
            if (!a || !b) return false;
            return (
                a.shipStatus === b.shipStatus &&
                a.orbitingPlanetId === b.orbitingPlanetId &&
                a.isLanded === b.isLanded &&
                a.navLocked === b.navLocked &&
                a.activeCallId === b.activeCallId &&
                a.activeCallActorId === b.activeCallActorId &&
                a.activeCallMasked === b.activeCallMasked &&
                a.unseenMissed === b.unseenMissed
            );
        }

        get targetShip() {
            const spaceships = (typeof $gameSpaceships !== "undefined" && $gameSpaceships)
                ? $gameSpaceships
                : (typeof window !== "undefined" ? window.$gameSpaceships : null);
            if (!spaceships) return null;
            if (this._shipId !== null && typeof spaceships.ship === "function") {
                const s = spaceships.ship(this._shipId);
                if (s) return s;
            }
            if (typeof spaceships.playerShip === "function") {
                return spaceships.playerShip();
            }
            return null;
        }

        // ====================================================================
        // 2. CRÉATION DES FENÊTRES JUMELLES (DUAL-SCREEN)
        // ====================================================================

        createDisplayObjects() {
            const boxW = (typeof Graphics !== "undefined") ? Graphics.boxWidth : 1280;
            const boxH = (typeof Graphics !== "undefined") ? Graphics.boxHeight : 720;

            const shipW = 420;
            const consoleW = 460;
            const spacing = 20;
            const totalW = shipW + spacing + consoleW; // 900
            const totalH = 420;

            const startX = Math.floor((boxW - totalW) / 2);
            const startY = Math.floor((boxH - totalH) / 2);

            const ship = this.targetShip;

            // 1. Volet Gauche : Fiche d'Informations et Télémétrie du Vaisseau
            if (typeof Window_SpaceShipInfo !== "undefined") {
                const shipRect = new Rectangle(startX, startY, shipW, totalH);
                this._shipInfoWindow = new Window_SpaceShipInfo(shipRect);
                this._shipInfoWindow.setShip(ship);
                this.addWindow(this._shipInfoWindow);
            }

            // 2. Volet Droit : Console de Commandement de Passerelle
            if (typeof Window_BridgeConsole !== "undefined") {
                const consoleRect = new Rectangle(startX + shipW + spacing, startY, consoleW, totalH);
                this._consoleWindow = new Window_BridgeConsole(consoleRect);
                this._consoleWindow.setShipId(this._shipId);

                // Handlers de la console
                this._consoleWindow.setHandler("navigation", this.onNavigation.bind(this));
                this._consoleWindow.setHandler("land", this.onLand.bind(this));
                this._consoleWindow.setHandler("select_poi", this.onSelectPoi.bind(this));
                this._consoleWindow.setHandler("back_main", this.onBackMain.bind(this));
                this._consoleWindow.setHandler("takeoff", this.onTakeoff.bind(this));
                this._consoleWindow.setHandler("dock", this.onDock.bind(this));
                this._consoleWindow.setHandler("subcom", this.onSubcom.bind(this));
                this._consoleWindow.setHandler("quit", this.onQuit.bind(this));
                this._consoleWindow.setHandler("cancel", this.onCancel.bind(this));

                this.addWindow(this._consoleWindow);
            }
        }

        onStart() {
            super.onStart();
            if (this._shipInfoWindow) {
                if (typeof this._shipInfoWindow.show === "function") this._shipInfoWindow.show();
                this._shipInfoWindow.open();
                if (typeof this._shipInfoWindow.deactivate === "function") this._shipInfoWindow.deactivate();
            }
            if (this._consoleWindow) {
                this._consoleWindow.setMode("main");
                this._consoleWindow.refresh();
                this._consoleWindow.select(0);
                if (typeof this._consoleWindow.show === "function") this._consoleWindow.show();
                this._consoleWindow.open();
                this._consoleWindow.activate();
            }
            this._lastSnapshot = this.captureLiveSnapshot();
        }

        updateMain() {
            super.updateMain();
            const current = this.captureLiveSnapshot();
            if (!this.isSnapshotEqual(current, this._lastSnapshot)) {
                this._lastSnapshot = current;
                if (this._shipInfoWindow && typeof this._shipInfoWindow.refresh === "function") {
                    this._shipInfoWindow.refresh();
                }
                if (this._consoleWindow && typeof this._consoleWindow.refresh === "function") {
                    this._consoleWindow.refresh();
                }
            }
        }

        onDeactivate() {
            super.onDeactivate();
            if (this._shipInfoWindow) {
                if (typeof this._shipInfoWindow.deactivate === "function") this._shipInfoWindow.deactivate();
                if (typeof this._shipInfoWindow.hide === "function") this._shipInfoWindow.hide();
            }
            if (this._consoleWindow) {
                if (typeof this._consoleWindow.deactivate === "function") this._consoleWindow.deactivate();
                if (typeof this._consoleWindow.hide === "function") this._consoleWindow.hide();
            }
        }

        onReactivate() {
            super.onReactivate();
            if (this._shipInfoWindow) {
                if (typeof this._shipInfoWindow.show === "function") this._shipInfoWindow.show();
                if (typeof this._shipInfoWindow.open === "function") this._shipInfoWindow.open();
                if (typeof this._shipInfoWindow.deactivate === "function") this._shipInfoWindow.deactivate();
                if (typeof this._shipInfoWindow.refresh === "function") this._shipInfoWindow.refresh();
            }
            if (this._consoleWindow) {
                if (typeof this._consoleWindow.show === "function") this._consoleWindow.show();
                if (typeof this._consoleWindow.open === "function") this._consoleWindow.open();
                if (typeof this._consoleWindow.refresh === "function") this._consoleWindow.refresh();
                this._consoleWindow.activate();
            }
            this._lastSnapshot = this.captureLiveSnapshot();
        }

        onSubSceneResume(childSubScene, result = null) {
            super.onSubSceneResume(childSubScene, result);
            this._lastSnapshot = this.captureLiveSnapshot();
        }

        onDestroy() {
            this._shipInfoWindow = null;
            this._consoleWindow = null;
        }

        // ====================================================================
        // 3. HANDLERS D'ACTIONS & PERSISTANCE
        // ====================================================================

        resumeArgs() {
            return (this._targetEventId && this._targetEventId > 0)
                ? [this._shipId, this._targetEventId]
                : [this._shipId];
        }

        onResume(resumeData) {
            if (resumeData && resumeData.mode && this._consoleWindow) {
                this._consoleWindow.setMode(resumeData.mode);
                this._consoleWindow.refresh();
                this._consoleWindow.select(0);
                this._consoleWindow.activate();
            }
        }

        onNavigation() {
            this.suspend({ mode: "main" });
            if (typeof SC4 !== "undefined" && typeof SC4.openNavigation === "function") {
                SC4.openNavigation();
            } else if (typeof Scene_SpaceTravel !== "undefined" && typeof SceneManager !== "undefined") {
                SceneManager.push(Scene_SpaceTravel);
            }
        }

        onLand() {
            if (this._consoleWindow) {
                this._consoleWindow.setMode("land_sites");
                this._consoleWindow.activate();
            }
        }

        onSelectPoi() {
            const poi = this._consoleWindow ? this._consoleWindow.currentExt() : null;
            if (typeof SubSceneManager !== "undefined") {
                SubSceneManager.clear();
            }
            this.close();
            if (typeof SC4 !== "undefined" && typeof SC4.performLandingSequence === "function") {
                SC4.performLandingSequence(poi ? poi.id : undefined);
            }
        }

        onBackMain() {
            if (this._consoleWindow) {
                this._consoleWindow.setMode("main");
                this._consoleWindow.activate();
            }
        }

        onTakeoff() {
            if (typeof SubSceneManager !== "undefined") {
                SubSceneManager.clear();
            }
            this.close();
            if (typeof SC4 !== "undefined" && typeof SC4.performTakeoffSequence === "function") {
                SC4.performTakeoffSequence();
            }
        }

        onDock() {
            if (this._consoleWindow) {
                this._consoleWindow.activate();
            }
        }

        onSubcom() {
            if (typeof SubScene_Subcom === "undefined") {
                if (typeof DEBUGTOOL !== "undefined" && typeof DEBUGTOOL.error === "function") {
                    DEBUGTOOL.error("SubScene_Console.onSubcom", "SubScene_Subcom introuvable !");
                }
                if (this._consoleWindow) {
                    this._consoleWindow.activate();
                }
                return;
            }
            this.openChildSubScene(SubScene_Subcom, this._shipId, this._targetEventId);
        }

        onQuit() {
            if (typeof SubSceneManager !== "undefined") {
                SubSceneManager.clear();
            }
            this.close();
        }

        onCancel() {
            if (this._consoleWindow && this._consoleWindow._mode === "land_sites") {
                this._consoleWindow.setMode("main");
                this._consoleWindow.activate();
            } else {
                if (typeof SubSceneManager !== "undefined") {
                    SubSceneManager.clear();
                }
                this.close();
            }
        }
    }

    // Export global (avec alias pour BridgeConsole)
    if (typeof window !== "undefined") {
        window.SubScene_Console = SubScene_Console;
        window.SubScene_BridgeConsole = SubScene_Console;
        window.SC4_SubScene_Console = SubScene_Console;
    }
    if (typeof global !== "undefined") {
        global.SubScene_Console = SubScene_Console;
        global.SubScene_BridgeConsole = SubScene_Console;
        global.SC4_SubScene_Console = SubScene_Console;
    }

    // ========================================================================
    // 4. BINDING SUR SC4 & SCENE_MAP
    // ========================================================================
    if (typeof SC4 !== "undefined") {
        SC4.openBridgeConsole = function (shipId, targetEventId = null) {
            const scene = (typeof SceneManager !== "undefined") ? SceneManager._scene : null;
            if (scene && typeof scene.openSubScene === "function") {
                return scene.openSubScene(SubScene_Console, shipId, targetEventId);
            } else if (scene && typeof scene.openBridgeConsole === "function") {
                return scene.openBridgeConsole(shipId, targetEventId);
            }
        };
    }

    if (typeof Scene_Map !== "undefined") {
        Scene_Map.prototype.openBridgeConsole = function (shipId, targetEventId = null) {
            return this.openSubScene(SubScene_Console, shipId, targetEventId);
        };
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = SubScene_Console;
    }
