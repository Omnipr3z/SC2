//=============================================================================
// SC4_rmmz_scenes_Patches.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Surcharges et patches des classes natives de rmmz_scenes.js.
 * @author SimCraft
 * @help
 * ============================================================================
 * NORME DES FICHIERS DE PATCHES :
 * - Nom de la Classe en commentaire (ex: // SCENE MAP)
 * - Création de tous les alias nécessaires à la classe au début de sa section, suivis d'une ligne vide
 * - Toutes les méthodes de la classe regroupées ensemble (surcharges et ajouts), sans doublons
 * - Ordre des classes identique au fichier natif vanilla
 * - Pas de commentaires superflus en dehors des méthodes (sauf TODO ou note en header)
 * - Règle "Fail Fast" : pas de fallbacks silencieux masquant les bugs
 * ============================================================================
 * Regroupe tous les patches et surcharges apportés aux classes de rmmz_scenes :
 * 
 * 1. Scene_Title :
 *    - Écran titre cinématique (calques parallaxe, station, screw, logo, transition).
 *    - Menu étendu et gestion des sous-scènes (Codex, Crédits, Mode libre).
 * 
 * 2. Scene_Map :
 *    - isMenuCalled / onMapTouch / update : intégration combat et tir au curseur.
 *    - createDisplayObjects / createPlayerHud : affichage des HUDs joueur et interlocuteur.
 *    - Gestion centralisée de la pile des sous-scènes (openSubScene, closeSubScene).
 * 
 * 3. Scene_Menu :
 *    - createCommandWindow / commandInventory : intégration du bouton inventaire.
 * 
 * 4. Scene_Item :
 *    - Intégration de la jauge de charge d'inventaire et du menu contextuel d'action.
 * ============================================================================
 * 
 * @command SetHudVisibility
 * @text Visibilité des HUDs
 * @desc Affiche, masque ou bascule l'affichage des HUDs (Acteur et/ou Arme).
 *
 * @arg target
 * @text Cible
 * @type select
 * @option Tous les HUDs
 * @value all
 * @option HUD Acteur (Joueur)
 * @value player
 * @option HUD Arme (Munitions)
 * @value weapon
 * @default all
 *
 * @arg visible
 * @text Action
 * @type select
 * @option Basculer (On/Off)
 * @value toggle
 * @option Afficher
 * @value true
 * @option Masquer
 * @value false
 * @default toggle
 * ============================================================================
 *
 * @param defaultHudVisible
 * @text HUDs visibles au départ
 * @type boolean
 * @desc Active ou masque l'ensemble des HUDs de la carte au début d'une nouvelle partie.
 * @default true
 *
 * @param defaultPlayerHud
 * @text HUD Joueur visible au départ
 * @type boolean
 * @desc Active ou masque spécifiquement le HUD Joueur (portrait, jauges) au départ.
 * @default true
 *
 * @param defaultWeaponHud
 * @text HUD Arme visible au départ
 * @type boolean
 * @desc Active ou masque spécifiquement le HUD Arme (munitions) au départ.
 * @default true
 * ============================================================================
 */

(() => {
    "use strict";

    // SCENE BOOT
    //=============================================================================
    const _Scene_Boot_loadCustomFonts = Scene_Boot.prototype.loadCustomFonts;

    Scene_Boot.prototype.loadCustomFonts = function () {
        if (_Scene_Boot_loadCustomFonts) {
            _Scene_Boot_loadCustomFonts.call(this);
        }
        if (typeof Window_BubbleMsg !== "undefined" && Window_BubbleMsg.preloadConfiguredFonts) {
            Window_BubbleMsg.preloadConfiguredFonts();
        }
    };

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function () {
        _Scene_Boot_start.call(this);
        if (typeof ConfigManager !== "undefined" && typeof ConfigManager.applyFullscreen === "function") {
            ConfigManager.applyFullscreen();
        }
    };

    // SCENE TITLE
    //=============================================================================
    const _Scene_Title_initialize = Scene_Title.prototype.initialize;
    const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;

    Scene_Title.prototype.initialize = function () {
        _Scene_Title_initialize.call(this);
        this._titleAnimPhase = 0;
        this._titleAnimTimer = 0;
        this._openingDone = false;
        this._inTransition = false;
        this._transitionPhase = 0;
        this._transitionTimer = 0;
        this._transitionAction = null;
        this._isPlayingSeLogoAppears = false;
        this._isPlayingSeLogo = false;
        this._isPlayingGrowl = false;
        this._isPlayingSeScrew = false;
    };
    Scene_Title.prototype.createBackground = function () {
        this._titleLayers = [];

        const loadT1 = (name) => ImageManager.loadTitle1 ? ImageManager.loadTitle1(name) : ImageManager.loadBitmap("img/titles1/", name);
        const loadT2 = (name) => ImageManager.loadTitle2 ? ImageManager.loadTitle2(name) : ImageManager.loadBitmap("img/titles2/", name);

        const paraBitmap = loadT1("Parralaxe");
        const boxW = Graphics.width || 1280;
        const boxH = Graphics.height || 720;

        if (typeof TilingSprite !== "undefined") {
            this._paralaxeSprite = new TilingSprite(paraBitmap);
            this._paralaxeSprite.move(0, 0, boxW, boxH);
        } else {
            this._paralaxeSprite = new Sprite(paraBitmap);
        }
        this._paralaxeSprite.z = 0;
        this._paralaxeSprite.opacity = 0;
        this.addChild(this._paralaxeSprite);
        this._titleLayers.push(this._paralaxeSprite);

        this._bg0Sprite = new Sprite(loadT1("Bg_0"));
        this._bg0Sprite.z = 1;
        this._bg0Sprite.opacity = 0;
        this.addChild(this._bg0Sprite);
        this._titleLayers.push(this._bg0Sprite);

        this._bg1Sprite = new Sprite(loadT1("Bg_1"));
        this._bg1Sprite.z = 2;
        this._bg1Sprite.opacity = 0;
        this.addChild(this._bg1Sprite);
        this._titleLayers.push(this._bg1Sprite);

        this._stationSprite = new Sprite(loadT2("Station"));
        this._stationSprite.z = 4;
        this._stationSprite.opacity = 0;
        if (this._stationSprite.anchor) this._stationSprite.anchor.set(0.5, 0.5);
        this._stationSprite.x = 1115;
        this._stationSprite.y = 100;
        if (this._stationSprite.scale) this._stationSprite.scale.set(1, 1);
        this.addChild(this._stationSprite);
        this._titleLayers.push(this._stationSprite);

        this._screwSprite = new Sprite(loadT2("screw"));
        this._screwSprite.z = 5;
        this._screwSprite.opacity = 0;
        if (this._screwSprite.anchor) this._screwSprite.anchor.set(0.5, 0.5);
        this._screwSprite.x = boxW - 130;
        this._screwSprite.y = boxH - 130;
        this.addChild(this._screwSprite);
        this._titleLayers.push(this._screwSprite);

        this._bg2Sprite = new Sprite(loadT1("Bg_2"));
        this._bg2Sprite.z = 10;
        this._bg2Sprite.opacity = 0;
        this._bg2Sprite.visible = false;
        this.addChild(this._bg2Sprite);
        this._titleLayers.push(this._bg2Sprite);

        this._gameLogoSprite = new Sprite(loadT2("Game_logo"));
        this._gameLogoSprite.z = 11;
        this._gameLogoSprite.opacity = 0;
        this.addChild(this._gameLogoSprite);
        this._titleLayers.push(this._gameLogoSprite);

        this._scLogoSprite = new Sprite(loadT2("LogoSC"));
        this._scLogoSprite.z = 12;
        this._scLogoSprite.opacity = 0;
        if (this._scLogoSprite.anchor) this._scLogoSprite.anchor.set(0.5, 0.5);
        this._scLogoSprite.x = this._screwSprite.x;
        this._scLogoSprite.y = this._screwSprite.y;
        this.addChild(this._scLogoSprite);
        this._titleLayers.push(this._scLogoSprite);

        this._leftSprite = new Sprite(loadT2("Left"));
        this._leftSprite.z = 13;
        this._leftSprite.opacity = 0;
        this._leftSprite.visible = false;
        this.addChild(this._leftSprite);
        this._titleLayers.push(this._leftSprite);

        this._rightSprite = new Sprite(loadT2("Right"));
        this._rightSprite.z = 14;
        this._rightSprite.opacity = 0;
        this._rightSprite.visible = false;
        this.addChild(this._rightSprite);
        this._titleLayers.push(this._rightSprite);
    };
    Scene_Title.prototype.createForeground = function () {
        const boxW = Graphics.width || 1;
        const boxH = Graphics.height || 1;
        this._gameTitleSprite = new Sprite(new Bitmap(boxW, boxH));
        this.addChild(this._gameTitleSprite);
    };
    Scene_Title.prototype.terminate = function () {
        Scene_Base.prototype.terminate.call(this);
        SceneManager.snapForBackground();
        if (this._gameTitleSprite && this._gameTitleSprite.bitmap && typeof this._gameTitleSprite.bitmap.destroy === "function") {
            this._gameTitleSprite.bitmap.destroy();
        }
    };
    Scene_Title.prototype.commandWindowRect = function () {
        const offsetX = ($dataSystem && $dataSystem.titleCommandWindow) ? $dataSystem.titleCommandWindow.offsetX : 0;
        const offsetY = ($dataSystem && $dataSystem.titleCommandWindow) ? $dataSystem.titleCommandWindow.offsetY : 0;
        const ww = 260;
        const numCommands = 7;
        const wh = this.calcWindowHeight ? this.calcWindowHeight(numCommands, true) : (numCommands * 44 + 20);
        const boxW = Graphics.boxWidth || 1280;
        const boxH = Graphics.boxHeight || 720;
        const wx = (boxW - ww) / 2 + offsetX;
        const wy = boxH - wh + offsetY - 144;
        return new Rectangle(wx, wy, ww, wh);
    };
    Scene_Title.prototype.createCommandWindow = function () {
        _Scene_Title_createCommandWindow.call(this);
        this._commandWindow.setHandler("newGame", this.commandNewGame.bind(this));
        this._commandWindow.setHandler("continue", this.commandContinue.bind(this));
        this._commandWindow.setHandler("freeGame", this.commandFreeGame.bind(this));
        this._commandWindow.setHandler("options", this.commandOptions.bind(this));
        this._commandWindow.setHandler("codex", this.commandCodex.bind(this));
        this._commandWindow.setHandler("credits", this.commandCredits.bind(this));
        this._commandWindow.setHandler("exit", this.commandExit.bind(this));

        this._commandWindow.close();
        this._commandWindow.deactivate();
    };
    Scene_Title.prototype.adjustBackground = function () {
    };
    Scene_Title.prototype.update = function () {
        if (this._paralaxeSprite) {
            if (this._paralaxeSprite.origin) {
                this._paralaxeSprite.origin.x += 0.4;
            } else if (this._paralaxeSprite.tilePosition) {
                this._paralaxeSprite.tilePosition.x += 0.4;
            }
        }

        if (this._inTransition) {
            this.updateTransitionAnimation();
        } else if (!this._openingDone) {
            this.updateOpeningAnimation();
        } else {
            if (!this.isBusy() && !this._commandWindow.isOpen() && !this._commandWindow.isOpening()) {
                this._commandWindow.open();
                this._commandWindow.activate();
            }
        }

        Scene_Base.prototype.update.call(this);
    };
    Scene_Title.prototype.updateOpeningAnimation = function () {
        const boxW = Graphics.width || 1280;
        const boxH = Graphics.height || 720;

        switch (this._titleAnimPhase) {
            case 0:
                const allReady = this._titleLayers.every(s => s && s.bitmap && s.bitmap.isReady());
                if (allReady) {
                    const logoW = this._gameLogoSprite.bitmap ? this._gameLogoSprite.bitmap.width : 400;
                    const logoH = this._gameLogoSprite.bitmap ? this._gameLogoSprite.bitmap.height : 150;
                    this._gameLogoSprite.x = (boxW - logoW) / 2;
                    this._gameLogoCenterY = (boxH - logoH) / 2;
                    this._gameLogoSprite.y = this._gameLogoCenterY;
                    this._titleAnimPhase = 1;
                    this._titleAnimTimer = 0;
                }
                break;

            case 1:
                this._titleAnimTimer++;
                this._paralaxeSprite.opacity = Math.min(255, this._paralaxeSprite.opacity + 4);
                if (this._titleAnimTimer >= 15) {
                    this._bg0Sprite.opacity = Math.min(255, this._bg0Sprite.opacity + 4);
                }
                if (this._bg0Sprite.opacity >= 255) {
                    this._titleAnimPhase = 2;
                    this._titleAnimTimer = 0;
                }
                break;

            case 2:
                if (!this._isPlayingSeLogoAppears) {
                    AudioManager.playSe({ name: "Barrier", volume: 100, pitch: 80, pan: 0 });
                    this._isPlayingSeLogoAppears = true;
                }
                this._titleAnimTimer++;
                this._gameLogoSprite.opacity = Math.min(128, this._gameLogoSprite.opacity + (128 / 90));
                if (this._gameLogoSprite.opacity >= 128) {
                    this._titleAnimPhase = 3;
                    this._titleAnimTimer = 0;
                }
                break;

            case 3:
                if (!this._isPlayingSeLogo) {
                    AudioManager.playSe({ name: "Autodoor", volume: 100, pitch: 100, pan: 0 });
                    this._isPlayingSeLogo = true;
                }
                this._titleAnimTimer++;
                const moveSpeed = Math.max(1, (this._gameLogoCenterY || 200) / 60);
                this._gameLogoSprite.y = Math.max(0, this._gameLogoSprite.y - moveSpeed);
                this._gameLogoSprite.opacity = Math.min(255, this._gameLogoSprite.opacity + (127 / 60));
                this._bg1Sprite.opacity = Math.min(255, this._bg1Sprite.opacity + (255 / 60));

                if (this._gameLogoSprite.y <= 0 && this._bg1Sprite.opacity >= 255) {
                    AudioManager.playSe({ name: "Growl", volume: 50, pitch: 120 });
                    this._gameLogoSprite.y = 0;
                    this._gameLogoSprite.opacity = 255;
                    this._bg1Sprite.opacity = 255;
                    this._titleAnimPhase = 4;
                    this._titleAnimTimer = 0;
                }
                break;

            case 4:
                if (!this._isPlayingSeScrew) {
                    AudioManager.playSe({ name: "Alien", volume: 100, pitch: 100, pan: 0 });
                    this._isPlayingSeScrew = true;
                }
                this._screwSprite.opacity = Math.min(255, this._screwSprite.opacity + 5);
                this._screwSprite.rotation += 0.05;

                const curScale = this._stationSprite.scale ? this._stationSprite.scale.x : 1;
                const nextScale = Math.min(1.0, curScale + 0.018);
                if (this._stationSprite.scale) this._stationSprite.scale.set(nextScale, nextScale);
                this._stationSprite.opacity = Math.min(255, this._stationSprite.opacity + 5);

                if (nextScale >= 1.0 && this._stationSprite.opacity >= 255) {
                    this._stationSprite.opacity = 255;
                    if (this._stationSprite.scale) this._stationSprite.scale.set(1.0, 1.0);
                    this._titleAnimPhase = 5;
                }
                break;

            case 5:
                this._screwSprite.rotation += 0.05;
                this._screwSprite.opacity = Math.max(0, this._screwSprite.opacity - 6);
                this._scLogoSprite.opacity = Math.min(255, this._scLogoSprite.opacity + 6);

                if (this._scLogoSprite.opacity >= 255 && this._screwSprite.opacity <= 0) {
                    AudioManager.playSe({ name: "03Z_omniprez", volume: 80, pitch: 100, pan: 0 });
                    this._scLogoSprite.opacity = 255;
                    this._screwSprite.opacity = 0;
                    this._screwSprite.visible = false;
                    this._titleAnimPhase = 6;
                }
                break;

            case 6:
                this._openingDone = true;
                if (this._commandWindow) {
                    this._commandWindow.open();
                    this._commandWindow.activate();
                }
                break;
        }
    };
    Scene_Title.prototype.startImmersionTransition = function (onFinish) {
        this._inTransition = true;
        this._transitionPhase = 1;
        this._transitionTimer = 0;
        this._transitionAction = onFinish;

        if (this._commandWindow) {
            this._commandWindow.close();
            this._commandWindow.deactivate();
        }
    };
    Scene_Title.prototype.updateTransitionAnimation = function () {
        switch (this._transitionPhase) {
            case 1:
                this._bg2Sprite.visible = true;
                this._bg2Sprite.opacity = Math.min(255, this._bg2Sprite.opacity + 6);

                this._paralaxeSprite.opacity = Math.max(0, this._paralaxeSprite.opacity - 6);
                this._bg0Sprite.opacity = Math.max(0, this._bg0Sprite.opacity - 6);
                this._bg1Sprite.opacity = Math.max(0, this._bg1Sprite.opacity - 6);
                this._stationSprite.opacity = Math.max(0, this._stationSprite.opacity - 6);
                this._scLogoSprite.opacity = Math.max(0, this._scLogoSprite.opacity - 6);
                this._gameLogoSprite.opacity = Math.max(0, this._gameLogoSprite.opacity - 6);

                if (this._bg2Sprite.opacity >= 255) {
                    this._leftSprite.visible = true;
                    this._leftSprite.opacity = 255;
                    this._leftSprite.x = 0;
                    this._leftSprite.y = 990;
                    if (this._leftSprite.scale) this._leftSprite.scale.set(1.2, 1.2);

                    this._rightSprite.visible = true;
                    this._rightSprite.opacity = 255;
                    this._rightSprite.x = 1780;
                    this._rightSprite.y = 600;
                    if (this._rightSprite.scale) this._rightSprite.scale.set(0.6, 0.6);

                    AudioManager.playBgm({ name: "03Z_MystFallOut", volume: 90, pitch: 100, pan: 0 });
                    this._transitionPhase = 2;
                }
                break;

            case 2:
                const leftDx = (0 - this._leftSprite.x) * 0.08;
                const leftDy = (0 - this._leftSprite.y) * 0.08;
                const leftScaleDiff = (1.0 - (this._leftSprite.scale ? this._leftSprite.scale.x : 1)) * 0.08;

                const rightDx = (0 - this._rightSprite.x) * 0.08;
                const rightDy = (0 - this._rightSprite.y) * 0.08;
                const rightScaleDiff = (1.0 - (this._rightSprite.scale ? this._rightSprite.scale.x : 1)) * 0.08;

                this._leftSprite.x += leftDx;
                this._leftSprite.y += leftDy;
                if (this._leftSprite.scale) {
                    const ls = this._leftSprite.scale.x + leftScaleDiff;
                    this._leftSprite.scale.set(ls, ls);
                }

                this._rightSprite.x += rightDx;
                this._rightSprite.y += rightDy;
                if (this._rightSprite.scale) {
                    const rs = this._rightSprite.scale.x + rightScaleDiff;
                    this._rightSprite.scale.set(rs, rs);
                }

                if (Math.abs(this._leftSprite.y) < 1.5 && Math.abs(this._rightSprite.x) < 1.5) {
                    this._leftSprite.x = 0;
                    this._leftSprite.y = 0;
                    if (this._leftSprite.scale) this._leftSprite.scale.set(1.0, 1.0);

                    this._rightSprite.x = 0;
                    this._rightSprite.y = 0;
                    if (this._rightSprite.scale) this._rightSprite.scale.set(1.0, 1.0);

                    this._transitionPhase = 3;
                    this._transitionTimer = 120;
                }
                break;

            case 3:
                this._transitionTimer--;
                if (this._transitionTimer <= 0) {
                    this._transitionPhase = 4;
                    if (this._transitionAction) {
                        this._transitionAction();
                    }
                }
                break;
        }
    };
    Scene_Title.prototype.commandNewGame = function () {
        this.startImmersionTransition(() => {
            DataManager.setupNewGame();
            SceneManager.goto(Scene_Map);
        });
    };
    Scene_Title.prototype.commandContinue = function () {
        this.startImmersionTransition(() => {
            SceneManager.push(Scene_Load);
        });
    };
    Scene_Title.prototype.commandFreeGame = function () {
        this.startImmersionTransition(() => {
            SceneManager.push(Scene_FreeGameStart);
        });
    };
    Scene_Title.prototype.commandCodex = function () {
        if (this._commandWindow) this._commandWindow.close();
        SceneManager.push(Scene_Codex);
    };
    Scene_Title.prototype.commandCredits = function () {
        if (this._commandWindow) this._commandWindow.close();
        SceneManager.push(Scene_Credits);
    };
    Scene_Title.prototype.commandExit = function () {
        if (this._commandWindow) this._commandWindow.close();
        SceneManager.exit();
    };

    // SCENE MESSAGE
    //=============================================================================
    const _Scene_Message_createMessageWindow = Scene_Message.prototype.createMessageWindow;

    Scene_Message.prototype.createMessageWindow = function () {
        const rect = this.messageWindowRect();
        this._messageWindow = new Window_BubbleMsg(rect);
        this.addWindow(this._messageWindow);
    };

    // SCENE MAP
    //=============================================================================
    const _Scene_Map_initialize = Scene_Map.prototype.initialize;
    const _Scene_Map_onMapTouch = Scene_Map.prototype.onMapTouch;
    const _Scene_Map_start = Scene_Map.prototype.start;
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    const _Scene_Map_update = Scene_Map.prototype.update;
    const _Scene_Map_updateMain = Scene_Map.prototype.updateMain;
    const _Scene_Map_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    const _Scene_Map_isMapTouchOk = Scene_Map.prototype.isMapTouchOk;
    const _Scene_Map_processMapTouch = Scene_Map.prototype.processMapTouch;
    const _Scene_Map_isMenuEnabled = Scene_Map.prototype.isMenuEnabled;
    const _Scene_Map_isPlayerActive = Scene_Map.prototype.isPlayerActive;
    const _Scene_Map_terminate = Scene_Map.prototype.terminate;

    Scene_Map.prototype.initialize = function () {
        _Scene_Map_initialize.call(this);
        this._touchCooldown = 0;
        this._touchReleaseGuard = false;
    };

    Scene_Map.prototype.onMapLoaded = function () {
        let skipOverlayRefresh = false;
        const currentMapId = window.$gameMap ? window.$gameMap.mapId() : 0;
        const lastOverlayMapId = (window.$mapOverlaysManager && typeof window.$mapOverlaysManager.lastMapId === "number")
            ? window.$mapOverlaysManager.lastMapId : 0;

        if (this._transfer && typeof $gamePlayer !== "undefined") {
            const targetMapId = typeof $gamePlayer.newMapId === "function" ? $gamePlayer.newMapId() : 0;
            const isSameMap = (targetMapId > 0 && targetMapId === currentMapId);
            const isNoFade = (typeof $gamePlayer.fadeType === "function" && $gamePlayer.fadeType() === 2);
            if (isSameMap && isNoFade) {
                skipOverlayRefresh = true;
            }
            $gamePlayer.performTransfer();
        } else if (!this._transfer && currentMapId > 0 && lastOverlayMapId === currentMapId) {
            // Retour d'une scène fille/pushée (Inventaire, Menu, etc.) sans transfert : préservation de l'état
            skipOverlayRefresh = true;
        }

        // Si une réinitialisation a été forcée manuellement via la console
        if (window.$mapOverlaysManager && window.$mapOverlaysManager.forceRefresh) {
            skipOverlayRefresh = false;
            window.$mapOverlaysManager.forceRefresh = false;
        }

        if (window.$mapOverlaysManager) {
            window.$mapOverlaysManager.onMapInit(null, null, { skipRefresh: skipOverlayRefresh });
        }
        this.createDisplayObjects();
    };

    Scene_Map.prototype.start = function () {
        _Scene_Map_start.call(this);
        if (typeof SubSceneManager !== "undefined") {
            SubSceneManager.resume(this);
        }
        if (typeof TouchInput !== "undefined" && TouchInput.isPressed && TouchInput.isPressed()) {
            this.activateTouchReleaseGuard();
        }
    };

    Scene_Map.prototype.isMenuCalled = function () {
        return Input.isTriggered("menu");
    };
    Scene_Map.prototype.onMapTouch = function () {
        if ($gamePlayer && $gamePlayer.isAiming && $gamePlayer.isAiming()) {
            if ($gamePlayer.onAimAction) {
                $gamePlayer.onAimAction();
            }
            return;
        }
        _Scene_Map_onMapTouch.call(this);
    };
    Scene_Map.prototype.update = function () {
        _Scene_Map_update.call(this);
        if (window.$tutoManager && typeof window.$tutoManager.update === "function") {
            window.$tutoManager.update();
        }
        this.updateRingCommandTrigger();

        const isTutoBusy = Boolean(window.$tutoManager && window.$tutoManager.isBusy());

        if (window.$mapOverlaysManager && !isTutoBusy) {
            window.$mapOverlaysManager.update();
        }

        if (!isTutoBusy) {
            if (window.$gameDate && (!window.SC4 || window.SC4._enableMapTicks !== false)) {
                window.$gameDate.passTick();
            }
            if (window.$systemMapManager) {
                window.$systemMapManager.update(true);
            }
            const time = $gameDate.timestamp;

            if ($gamePlayer) {
                if (typeof $gamePlayer.adjustCenterScroll === "function") {
                    $gamePlayer.adjustCenterScroll();
                }
                if (typeof $gamePlayer.isAiming === "function" && $gamePlayer.isAiming()) {
                    if ($gameTemp && typeof $gameTemp.isDestinationValid === "function" && $gameTemp.isDestinationValid()) {
                        $gameTemp.clearDestination();
                    }
                }
                if (this._currentSubScene && this._currentSubScene.isActive()) {
                    this._currentSubScene.update();
                }
                $relationManager.updateTick(time);
            }

            const isActive = this.isActive();
            const isSceneChanging = SceneManager.isSceneChanging();
            if (isActive && !isSceneChanging && Input.isTriggered("inventory")) {
                if (!$gameMap.isEventRunning() && $gameParty.leader()) {
                    const targetId = "A_" + $gameParty.leader().actorId();
                    SoundManager.playOk();
                    if (typeof $inventories !== "undefined" && $inventories) {
                        $inventories.open(targetId);
                    } else {
                        Scene_Inventory.prepare(targetId);
                        SceneManager.push(Scene_Inventory);
                    }
                }
            }
            if (isActive && !isSceneChanging && Input.isTriggered("toggleHud")) {
                $gameSystem.toggleHud();
            }
            if (window.$fightManager && typeof window.$fightManager.updateProjectiles === "function") {
                window.$fightManager.updateProjectiles();
            }
        }
    };
    Scene_Map.prototype.updateMain = function () {
        if (window.$tutoManager && window.$tutoManager.isBusy()) {
            return;
        }
        _Scene_Map_updateMain.call(this);
    };
    Scene_Map.prototype.createAllWindows = function () {
        _Scene_Map_createAllWindows.call(this);
        this.createTutoWindow();
        this.createRingCommandWindow();
    };
    Scene_Map.prototype.createTutoWindow = function () {
        if (typeof Window_Tuto !== "undefined" && !this._tutoWindow) {
            if (typeof Sprite_TutoArrow !== "undefined" && !this._tutoArrowSprite) {
                this._tutoArrowSprite = new Sprite_TutoArrow();
                this.addChild(this._tutoArrowSprite);
            }
            this._tutoWindow = new Window_Tuto(this._tutoArrowSprite);
            this.addWindow(this._tutoWindow);
            if (this._tutoWindow._confirmWindow) {
                this.addWindow(this._tutoWindow._confirmWindow);
            }

            if (window.$tutoManager && window.$tutoManager.currentTuto()) {
                this._tutoWindow.openTuto(window.$tutoManager.currentTuto());
            }
        }
    };
    Scene_Map.prototype.createRingCommandWindow = function () {
        if (typeof Window_RingCommand === "undefined") return;
        const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;
        const size = Math.min(boxH, 440);
        const rect = new Rectangle(0, 0, size, size);

        this._ringCommandWindow = new Window_RingCommand(rect);
        this._ringCommandWindow.setHandler("cancel", this.onRingCommandCancel.bind(this));

        this.addWindow(this._ringCommandWindow);
        this._ringCommandWindow.close();
        this._ringCommandWindow.deactivate();
        this._ringCommandWindow.hide();
    };
    Scene_Map.prototype.onRingCommandCancel = function () {
        this.closeRingMenu();
    };
    Scene_Map.prototype.onRingCommandOk = function (symbol) {
        if (typeof DEBUGTOOL !== "undefined" && DEBUGTOOL.log) {
            DEBUGTOOL.log(`[RingMenu] Commande sélectionnée : ${symbol}`, "ui");
        }
        if (typeof SoundManager !== "undefined" && SoundManager.playOk) {
            SoundManager.playOk();
        }
        this.closeRingMenu();
    };
    Scene_Map.prototype.openRingMenu = function (commands, onSelect) {
        if (!this._ringCommandWindow) return;

        if (commands && Array.isArray(commands)) {
            this._ringCommandWindow.setCommands(commands);
            commands.forEach(cmd => {
                const handler = onSelect || this.onRingCommandOk.bind(this, cmd.symbol);
                this._ringCommandWindow.setHandler(cmd.symbol, handler);
            });
        }

        this._ringCommandWindow.show();
        this._ringCommandWindow.open();
        this._ringCommandWindow.activate();
        this._ringCommandWindow._radius = 0;
    };
    Scene_Map.prototype.closeRingMenu = function () {
        if (!this._ringCommandWindow) return;
        this._ringCommandWindow.close();
        this._ringCommandWindow.deactivate();
        if (typeof TouchInput !== "undefined" && TouchInput.clear) {
            TouchInput.clear();
        }
    };
    Scene_Map.prototype.openRingMenuAtPlayer = function (commands, onSelect) {
        if (!this._ringCommandWindow) return;

        const defaultCommands = commands || [
            { name: "\\L[menu.item]", symbol: "item", enabled: true, icon: "🎒" },
            { name: "\\L[menu.skill]", symbol: "skill", enabled: true, icon: "✨" },
            { name: "\\L[menu.equip]", symbol: "equip", enabled: true, icon: "⚔️" },
            { name: "\\L[menu.status]", symbol: "status", enabled: true, icon: "📊" },
            { name: "\\L[options.language]", symbol: "options", enabled: true, icon: "⚙️" }
        ];

        this._ringCommandWindow.setCommands(defaultCommands);

        defaultCommands.forEach(cmd => {
            const handler = onSelect || this.onRingCommandOk.bind(this, cmd.symbol);
            this._ringCommandWindow.setHandler(cmd.symbol, handler);
        });

        this._ringCommandWindow.openAtTarget(typeof $gamePlayer !== "undefined" ? $gamePlayer : null);

        if (typeof DEBUGTOOL !== "undefined" && DEBUGTOOL.log) {
            DEBUGTOOL.log("[RingMenu] Menu circulaire ouvert sur le héros", "ui");
        }
        if (typeof TouchInput !== "undefined" && TouchInput.clear) {
            TouchInput.clear();
        }
    };
    Scene_Map.prototype.updateRingCommandTrigger = function () {
        // Menu circulaire sur clic joueur désactivé pour le moment sur demande utilisateur
        return;
    };
    Scene_Map.prototype.isTouchOnPlayer = function () {
        if (typeof $gamePlayer === "undefined" || !$gamePlayer) return false;
        const px = $gamePlayer.screenX();
        const py = $gamePlayer.screenY();
        const tx = TouchInput.x;
        const ty = TouchInput.y;
        // Empreinte standard 48x48 centrée au pied
        return (tx >= px - 24 && tx <= px + 24 && ty >= py - 48 && ty <= py);
    };
    Scene_Map.prototype.createDisplayObjects = function () {
        _Scene_Map_createDisplayObjects.call(this);
        this.createPlayerHud();
        this.createWeaponHud();
    };
    Scene_Map.prototype.createPlayerHud = function () {
        if (typeof Sprite_PlayerHUD !== "undefined") {
            this._playerHud = new Sprite_PlayerHUD();
            this.addChild(this._playerHud);
        }
        this._interlocutorHud = new Sprite_InterlocutorHUD();
        this.addChild(this._interlocutorHud);
    };
    Scene_Map.prototype.createWeaponHud = function () {
        if (!this._weaponHud && typeof Sprite_WeaponHUD !== "undefined") {
            this._weaponHud = new Sprite_WeaponHUD();
            this.addChild(this._weaponHud);
        }
    };
    Scene_Map.prototype.terminate = function () {
        if (window.$fightManager && typeof window.$fightManager.clearProjectiles === "function") {
            window.$fightManager.clearProjectiles();
        }

        // Masquer le joueur avant le snap si la prochaine scène est Scene_Inventory
        let restorePlayer = null;
        if (typeof Scene_Inventory !== "undefined" && SceneManager.isNextScene(Scene_Inventory)) {
            const playerChar = (typeof $gamePlayer !== "undefined") ? $gamePlayer : null;
            const wasTransparent = playerChar ? playerChar.isTransparent() : false;
            const hiddenSprites = [];

            if (playerChar) {
                playerChar.setTransparent(true);
            }
            if (this._spriteset && Array.isArray(this._spriteset._characterSprites)) {
                for (const s of this._spriteset._characterSprites) {
                    if (s && s._character === playerChar && s.visible) {
                        s.visible = false;
                        hiddenSprites.push(s);
                    }
                }
            }
            restorePlayer = () => {
                if (playerChar) playerChar.setTransparent(wasTransparent);
                for (const s of hiddenSprites) s.visible = true;
            };
        }

        _Scene_Map_terminate.call(this);

        if (restorePlayer) {
            restorePlayer();
        }
    };
    Scene_Map.prototype.openSubScene = function (subSceneClass, ...args) {
        this._subSceneStack = this._subSceneStack || [];

        let caller = null;
        if (this._currentSubScene) {
            caller = this._currentSubScene;
            if (typeof caller.deactivate === "function") {
                caller.deactivate();
            }
            this._subSceneStack.push(caller);
        }

        const subScene = new subSceneClass(this, ...args);
        subScene.callerSubScene = caller;
        this._currentSubScene = subScene;
        this.addChild(subScene);
        subScene.create();
        subScene.start();
        this.onSubSceneOpen(subScene);
        return subScene;
    };
    Scene_Map.prototype.closeSubScene = function (result = null) {
        if (this._currentSubScene) {
            const closingSubScene = this._currentSubScene;
            closingSubScene.stop();
            closingSubScene.terminate();
            this.removeChild(closingSubScene);
            this._currentSubScene = null;

            this._subSceneStack = this._subSceneStack || [];
            if (this._subSceneStack.length > 0) {
                const previousSubScene = this._subSceneStack.pop();
                this._currentSubScene = previousSubScene;
                if (typeof previousSubScene.reactivate === "function") {
                    previousSubScene.reactivate();
                }
                if (typeof previousSubScene.onSubSceneResume === "function") {
                    previousSubScene.onSubSceneResume(closingSubScene, result);
                }
            } else {
                this.onSubSceneClose(closingSubScene);
            }
        }
    };
    Scene_Map.prototype.closeAllSubScenes = function () {
        while (this._currentSubScene || (this._subSceneStack && this._subSceneStack.length > 0)) {
            this.closeSubScene();
        }
    };
    Scene_Map.prototype.currentSubScene = function () {
        return this._currentSubScene;
    };
    Scene_Map.prototype.subSceneStackDepth = function () {
        return (this._subSceneStack ? this._subSceneStack.length : 0) + (this._currentSubScene ? 1 : 0);
    };
    Scene_Map.prototype.onSubSceneOpen = function (subScene) {
        this._subSceneInputBlocked = true;
    };
    Scene_Map.prototype.onSubSceneClose = function (subScene) {
        this._subSceneInputBlocked = false;
    };
    Scene_Map.prototype.setTouchCoolDown = function (frames) {
        this._touchCooldown = Math.max(0, Number(frames) || 0);
    };
    Scene_Map.prototype.isTouchCoolDownOk = function () {
        if (this._touchCooldown && this._touchCooldown > 0) {
            this._touchCooldown--;
            return false;
        }
        return true;
    };
    Scene_Map.prototype.activateTouchReleaseGuard = function (deadTimeFrames = 0) {
        this._touchReleaseGuard = true;
        if (deadTimeFrames > 0) {
            this.setTouchCoolDown(deadTimeFrames);
        }
    };
    Scene_Map.prototype.isTouchReleaseGuardOk = function () {
        if (!this._touchReleaseGuard) {
            return true;
        }
        if (typeof TouchInput !== "undefined" && TouchInput.isPressed && TouchInput.isPressed()) {
            return false;
        }
        this._touchReleaseGuard = false;
        return true;
    };
    Scene_Map.prototype.isMapTouchOk = function () {
        if (window.$tutoManager && window.$tutoManager.isBusy()) {
            return false;
        }
        if (!this.isTouchCoolDownOk()) {
            return false;
        }
        if (!this.isTouchReleaseGuardOk()) {
            return false;
        }
        return _Scene_Map_isMapTouchOk.call(this);
    };
    Scene_Map.prototype.processMapTouch = function () {
        if (this._currentSubScene && this._currentSubScene.isActive()) {
            return;
        }
        if (!this.isTouchCoolDownOk()) {
            return;
        }
        if (!this.isTouchReleaseGuardOk()) {
            return;
        }
        _Scene_Map_processMapTouch.call(this);
    };
    Scene_Map.prototype.isMenuEnabled = function () {
        if (window.$tutoManager && window.$tutoManager.isBusy()) {
            return false;
        }
        if (this._currentSubScene && this._currentSubScene.isActive()) {
            return false;
        }
        return _Scene_Map_isMenuEnabled.call(this);
    };
    Scene_Map.prototype.isPlayerActive = function () {
        if (window.$tutoManager && window.$tutoManager.isBusy()) {
            return false;
        }
        return _Scene_Map_isPlayerActive.call(this);
    };

    // SCENE MENU
    //=============================================================================
    const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;

    Scene_Menu.prototype.createCommandWindow = function () {
        _Scene_Menu_createCommandWindow.call(this);
        this._commandWindow.setHandler("inventory", this.commandInventory.bind(this));
    };
    Scene_Menu.prototype.commandInventory = function () {
        const leader = $gameParty.leader();
        const targetId = "A_" + (leader ? leader.actorId() : 1);
        if (typeof $inventories !== "undefined" && $inventories) {
            $inventories.open(targetId);
        } else {
            Scene_Inventory.prepare(targetId);
            SceneManager.push(Scene_Inventory);
        }
    };

    // SCENE ITEM
    //=============================================================================
    const _Scene_Item_create = Scene_Item.prototype.create;
    const _Scene_Item_useItem = Scene_Item.prototype.useItem;

    Scene_Item.prototype.create = function () {
        _Scene_Item_create.call(this);
        this.createWeightWindow();
        this.createItemActionWindow();
    };
    Scene_Item.prototype.categoryWindowRect = function () {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = Graphics.boxWidth - 220;
        const wh = this.calcWindowHeight(1, true);
        return new Rectangle(wx, wy, ww, wh);
    };
    Scene_Item.prototype.createWeightWindow = function () {
        const ww = 220;
        const wh = this.calcWindowHeight(1, true);
        const wx = Graphics.boxWidth - ww;
        const wy = this.mainAreaTop();
        const rect = new Rectangle(wx, wy, ww, wh);
        this._weightWindow = new Window_ItemWeight(rect);
        this.addWindow(this._weightWindow);
    };
    Scene_Item.prototype.createItemActionWindow = function () {
        const ww = 280;
        const wh = this.calcWindowHeight(4, true);
        const wx = Math.floor((Graphics.boxWidth - ww) / 2);
        const wy = Math.floor((Graphics.boxHeight - wh) / 2);
        const rect = new Rectangle(wx, wy, ww, wh);
        this._itemActionWindow = new Window_ItemAction(rect);
        this._itemActionWindow.setHandler("use", this.onActionUse.bind(this));
        this._itemActionWindow.setHandler("drop_one", this.onActionDropOne.bind(this));
        this._itemActionWindow.setHandler("drop_all", this.onActionDropAll.bind(this));
        this._itemActionWindow.setHandler("cancel", this.onActionCancel.bind(this));
        this.addWindow(this._itemActionWindow);
    };
    Scene_Item.prototype.onItemOk = function () {
        const item = this.item();
        if (!item) {
            this._itemWindow.activate();
            return;
        }
        this._itemWindow.deactivate();
        this._itemActionWindow.setup(item);
    };
    Scene_Item.prototype.onActionUse = function () {
        this._itemActionWindow.close();
        this._itemActionWindow.deactivate();
        $gameParty.setLastItem(this.item());
        this.determineItem();
    };
    Scene_Item.prototype.onActionDropOne = function () {
        const item = this.item();
        if (item) {
            $gameParty.loseItem(item, 1);
            SoundManager.playUseItem();
            this._itemWindow.refresh();
            if (this._weightWindow) this._weightWindow.refresh();
        }
        this._itemActionWindow.close();
        this._itemActionWindow.deactivate();
        this._itemWindow.activate();
    };
    Scene_Item.prototype.onActionDropAll = function () {
        const item = this.item();
        if (item) {
            const total = $gameParty.numItems(item);
            $gameParty.loseItem(item, total);
            SoundManager.playUseItem();
            this._itemWindow.refresh();
            if (this._weightWindow) this._weightWindow.refresh();
        }
        this._itemActionWindow.close();
        this._itemActionWindow.deactivate();
        this._itemWindow.activate();
    };
    Scene_Item.prototype.onActionCancel = function () {
        this._itemActionWindow.close();
        this._itemActionWindow.deactivate();
        this._itemWindow.activate();
    };
    Scene_Item.prototype.useItem = function () {
        _Scene_Item_useItem.call(this);
        if (this._weightWindow) this._weightWindow.refresh();
    };

    //=============================================================================
    // SCENE OPTIONS
    //=============================================================================
    const _Scene_Options_createOptionsWindow = Scene_Options.prototype.createOptionsWindow;

    Scene_Options.prototype.maxCommands = function () {
        return 30; // Accueille confortablement toutes les options natives et SC4
    };

    Scene_Options.prototype.maxVisibleCommands = function () {
        const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 990;
        const maxH = boxH - 32;
        return Math.max(7, Math.floor((maxH - 24) / 36));
    };

    Scene_Options.prototype.optionsWindowRect = function () {
        const boxW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1760;
        const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 990;
        const maxH = boxH - 32; // Marge max de 16px en haut et en bas
        const ww = Math.min(560, boxW - 32);
        const n = Math.min(this.maxCommands(), this.maxVisibleCommands());
        const contentH = this.calcWindowHeight(n, true);
        const wh = Math.min(maxH, contentH);
        const wx = Math.round((boxW - ww) / 2);
        const wy = Math.round((boxH - wh) / 2);
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Options.prototype.createOptionsWindow = function () {
        _Scene_Options_createOptionsWindow.call(this);
        if (this._optionsWindow) {
            const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 990;
            const maxH = boxH - 32;
            const realCount = (typeof this._optionsWindow.maxItems === "function") ? this._optionsWindow.maxItems() : this.maxCommands();
            const exactH = Math.min(maxH, this.calcWindowHeight(realCount, true));
            if (exactH !== this._optionsWindow.height) {
                const wy = Math.round((boxH - exactH) / 2);
                this._optionsWindow.move(this._optionsWindow.x, wy, this._optionsWindow.width, exactH);
            }
        }
    };

})();
