//=============================================================================
// SC4_TitleScreen.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Écran titre cinématique animé, transitions et menus étendus.
 * @author SimCraft
 * 
 * @param titleFontFace
 * @text Police de l'écran titre
 * @desc Nom de famille ou fichier de police dans fonts/ (ex: Neuropol.otf ou BD.ttf).
 * @default Neuropol.otf
 * 
 * @param titleFontSize
 * @text Taille de police de l'écran titre
 * @type number
 * @desc Taille de la police en pixels (0 pour la taille standard).
 * @default 0
 * 
 * @help
 * ============================================================================
 * SC4_TitleScreen.js - Étape 14
 * ============================================================================
 * Ce plugin personnalise l'écran titre de SimCraft 4 :
 * 
 * 1. Superposition et animation cinématique des calques :
 *    - Titles1/Parralaxe.png (z: 0)  : Défilement continu horizontal
 *    - Titles1/Bg_0.png      (z: 1)  : Fade in d'introduction
 *    - Titles1/Bg_1.png      (z: 2)  : Fade in synchronisé
 *    - Titles2/Station.png   (z: 4)  : Zoom 0.1 -> 1.0 à (x:406, y:225)
 *    - Titles2/screw.png     (z: 5)  : Rotation & fade in en bas à droite
 *    - Titles1/Bg_2.png      (z: 10) : Calque de transition immersion
 *    - Titles2/Game_logo.png (z: 11) : Fade in 1.5s centré -> translation haut
 *    - Titles2/LogoSC.png    (z: 12) : Remplacement du screw en fondu
 *    - Titles2/Left.png      (z: 13) : Transition cinématique gauche
 *    - Titles2/Right.png     (z: 14) : Transition cinématique droite
 * 
 * 2. Menu de commande étendu (fond transparent) :
 *    - Débuter
 *    - Continuer
 *    - Mode libre (Scene_FreeGameStart)
 *    - Options
 *    - Codex (Scene_Codex)
 *    - Crédits (Scene_Credits)
 *    - Quitter
 * 
 * 3. Transition cinématique immersion (Débuter / Continuer / Mode libre) :
 *    - Fondu sur Bg_2, extinction des autres calques
 *    - Animation Left & Right vers (0,0) avec zoom
 *    - Musique 03Z_MystFallOut.ogg
 *    - Temporisation 2s avant entrée en jeu.
 * ============================================================================
 */

(() => {
    "use strict";

    const pluginName = "SC4_TitleScreen";
    const parameters = PluginManager.parameters(pluginName);
    const titleFontFaceParam = (parameters["titleFontFace"] || "Neuropol.otf").trim();
    const titleFontSize = parseInt(parameters["titleFontSize"] || 0, 10);

    function resolveFontFace(fontFace) {
        if (!fontFace || typeof fontFace !== "string") return "";
        const trimmed = fontFace.trim();
        let family = trimmed;
        let filename = trimmed;

        const extMatch = trimmed.match(/\.(ttf|otf|woff|woff2)$/i);
        if (extMatch) {
            family = trimmed.slice(0, -extMatch[0].length);
        } else {
            filename = trimmed + ".ttf";
        }

        if (typeof FontManager !== "undefined" && FontManager.load) {
            FontManager.load(family, filename);
        }

        if (typeof FontFace !== "undefined" && typeof document !== "undefined" && document.fonts) {
            try {
                if (!document.fonts.check(`12px "${family}"`)) {
                    const font = new FontFace(family, `url(fonts/${filename})`);
                    font.load().then(loaded => {
                        document.fonts.add(loaded);
                    }).catch(() => {});
                }
            } catch (e) {}
        }
        return family;
    }

    const titleFontFamily = resolveFontFace(titleFontFaceParam);

    // ========================================================================
    // 1. Extension de Window_TitleCommand (Menu étendu & Fond transparent)
    // ========================================================================
    const _Window_TitleCommand_initialize = Window_TitleCommand.prototype.initialize;
    Window_TitleCommand.prototype.initialize = function (rect) {
        _Window_TitleCommand_initialize.call(this, rect);
        // Fond et cadre totalement transparents
        this.setBackgroundType(2);
        this.opacity = 0;
    };

    Window_TitleCommand.prototype.standardFontFace = function () {
        if (titleFontFamily) {
            return titleFontFamily;
        }
        return Window_Base.prototype.standardFontFace.call(this);
    };

    if (titleFontSize > 0) {
        Window_TitleCommand.prototype.standardFontSize = function () {
            return titleFontSize;
        };
    }

    Window_TitleCommand.prototype.makeCommandList = function () {
        const continueEnabled = this.isContinueEnabled();
        const t = (k, def) => (typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def);
        this.addCommand(t("title.newGame", TextManager.newGame || "Débuter"), "newGame");
        this.addCommand(t("title.continue", TextManager.continue_ || "Continuer"), "continue", continueEnabled);
        this.addCommand(t("title.freeGame", "Mode libre"), "freeGame", true);
        this.addCommand(t("title.options", TextManager.options || "Options"), "options");
        this.addCommand(t("title.codex", "Codex"), "codex", true);
        this.addCommand(t("title.credits", "Crédits"), "credits", true);
        this.addCommand(t("title.exit", "Quitter"), "exit", true);
    };

    // ========================================================================
    // 2. Personnalisation de Scene_Title
    // ========================================================================
    const _Scene_Title_initialize = Scene_Title.prototype.initialize;
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
        // Conteneur de calques
        this._titleLayers = [];

        // 1. Helpers pour charger les bitmaps
        const loadT1 = (name) => {
            return (ImageManager.loadTitle1) ? ImageManager.loadTitle1(name) : ImageManager.loadBitmap("img/titles1/", name);
        };
        const loadT2 = (name) => {
            return (ImageManager.loadTitle2) ? ImageManager.loadTitle2(name) : ImageManager.loadBitmap("img/titles2/", name);
        };

        // z-[0] : Parralaxe.png (TilingSprite ou Sprite si indisponible)
        const paraBitmap = loadT1("Parralaxe");
        const boxW = (typeof Graphics !== "undefined" && Graphics.width) ? Graphics.width : 1280;
        const boxH = (typeof Graphics !== "undefined" && Graphics.height) ? Graphics.height : 720;

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

        // z-[1] : Bg_0.png
        this._bg0Sprite = new Sprite(loadT1("Bg_0"));
        this._bg0Sprite.z = 1;
        this._bg0Sprite.opacity = 0;
        this.addChild(this._bg0Sprite);
        this._titleLayers.push(this._bg0Sprite);

        // z-[2] : Bg_1.png
        this._bg1Sprite = new Sprite(loadT1("Bg_1"));
        this._bg1Sprite.z = 2;
        this._bg1Sprite.opacity = 0;
        this.addChild(this._bg1Sprite);
        this._titleLayers.push(this._bg1Sprite);

        // z-[4] : Station.png (centré à x:406, y:225)
        this._stationSprite = new Sprite(loadT2("Station"));
        this._stationSprite.z = 4;
        this._stationSprite.opacity = 0;
        if (this._stationSprite.anchor) this._stationSprite.anchor.set(0.5, 0.5);
        this._stationSprite.x = 1115;
        this._stationSprite.y = 100;
        if (this._stationSprite.scale) this._stationSprite.scale.set(1, 1);
        this.addChild(this._stationSprite);
        this._titleLayers.push(this._stationSprite);

        // z-[5] : Screw.png / screw.png (rotation & fade in en bas à droite)
        this._screwSprite = new Sprite(loadT2("screw"));
        this._screwSprite.z = 5;
        this._screwSprite.opacity = 0;
        if (this._screwSprite.anchor) this._screwSprite.anchor.set(0.5, 0.5);
        this._screwSprite.x = boxW - 130;
        this._screwSprite.y = boxH - 130;
        this.addChild(this._screwSprite);
        this._titleLayers.push(this._screwSprite);

        // z-[10] : Bg_2.png (calque de transition immersion)
        this._bg2Sprite = new Sprite(loadT1("Bg_2"));
        this._bg2Sprite.z = 10;
        this._bg2Sprite.opacity = 0;
        this._bg2Sprite.visible = false;
        this.addChild(this._bg2Sprite);
        this._titleLayers.push(this._bg2Sprite);

        // z-[11] : Game_logo.png
        this._gameLogoSprite = new Sprite(loadT2("Game_logo"));
        this._gameLogoSprite.z = 11;
        this._gameLogoSprite.opacity = 0;
        this.addChild(this._gameLogoSprite);
        this._titleLayers.push(this._gameLogoSprite);

        // z-[12] : Sc_logo.png / LogoSC.png
        this._scLogoSprite = new Sprite(loadT2("LogoSC"));
        this._scLogoSprite.z = 12;
        this._scLogoSprite.opacity = 0;
        if (this._scLogoSprite.anchor) this._scLogoSprite.anchor.set(0.5, 0.5);
        this._scLogoSprite.x = this._screwSprite.x;
        this._scLogoSprite.y = this._screwSprite.y;
        this.addChild(this._scLogoSprite);
        this._titleLayers.push(this._scLogoSprite);

        // z-[13] : Left.png
        this._leftSprite = new Sprite(loadT2("Left"));
        this._leftSprite.z = 13;
        this._leftSprite.opacity = 0;
        this._leftSprite.visible = false;
        this.addChild(this._leftSprite);
        this._titleLayers.push(this._leftSprite);

        // z-[14] : Right.png
        this._rightSprite = new Sprite(loadT2("Right"));
        this._rightSprite.z = 14;
        this._rightSprite.opacity = 0;
        this._rightSprite.visible = false;
        this.addChild(this._rightSprite);
        this._titleLayers.push(this._rightSprite);
    };

    Scene_Title.prototype.createForeground = function () {
        // Pas de titre textuel vanilla par défaut : Game_logo.png assure l'affichage du logo
        // Fournit un bitmap vide pour éviter tout TypeError lors de Scene_Title.terminate()
        const boxW = (typeof Graphics !== "undefined" && Graphics.width) ? Graphics.width : 1;
        const boxH = (typeof Graphics !== "undefined" && Graphics.height) ? Graphics.height : 1;
        this._gameTitleSprite = new Sprite(new Bitmap(boxW, boxH));
        this.addChild(this._gameTitleSprite);
    };

    Scene_Title.prototype.terminate = function () {
        Scene_Base.prototype.terminate.call(this);
        if (typeof SceneManager !== "undefined" && SceneManager.snapForBackground) {
            SceneManager.snapForBackground();
        }
        if (this._gameTitleSprite && this._gameTitleSprite.bitmap && typeof this._gameTitleSprite.bitmap.destroy === "function") {
            this._gameTitleSprite.bitmap.destroy();
        }
    };

    Scene_Title.prototype.commandWindowRect = function () {
        const offsetX = (typeof $dataSystem !== "undefined" && $dataSystem && $dataSystem.titleCommandWindow) ? $dataSystem.titleCommandWindow.offsetX : 0;
        const offsetY = (typeof $dataSystem !== "undefined" && $dataSystem && $dataSystem.titleCommandWindow) ? $dataSystem.titleCommandWindow.offsetY : 0;
        const ww = 260;
        const numCommands = 7;
        const wh = (this.calcWindowHeight) ? this.calcWindowHeight(numCommands, true) : (numCommands * 44 + 20);
        const boxW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
        const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;
        const wx = (boxW - ww) / 2 + offsetX;
        const wy = boxH - wh + offsetY - 144;
        return new Rectangle(wx, wy, ww, wh);
    };

    const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
    Scene_Title.prototype.createCommandWindow = function () {
        _Scene_Title_createCommandWindow.call(this);
        // Configuration des gestionnaires d'actions du menu
        this._commandWindow.setHandler("newGame", this.commandNewGame.bind(this));
        this._commandWindow.setHandler("continue", this.commandContinue.bind(this));
        this._commandWindow.setHandler("freeGame", this.commandFreeGame.bind(this));
        this._commandWindow.setHandler("options", this.commandOptions.bind(this));
        this._commandWindow.setHandler("codex", this.commandCodex.bind(this));
        this._commandWindow.setHandler("credits", this.commandCredits.bind(this));
        this._commandWindow.setHandler("exit", this.commandExit.bind(this));

        // Le menu reste fermé jusqu'à la fin complète de l'animation d'ouverture
        this._commandWindow.close();
        this._commandWindow.deactivate();
    };

    Scene_Title.prototype.adjustBackground = function () {
        // Redimensionnement standard sans déformer les calques
    };

    Scene_Title.prototype.update = function () {
        // 1. Défilement continu du fond étoilé / parallaxe
        if (this._paralaxeSprite) {
            if (this._paralaxeSprite.origin) {
                this._paralaxeSprite.origin.x += 0.4;
            } else if (this._paralaxeSprite.tilePosition) {
                this._paralaxeSprite.tilePosition.x += 0.4;
            }
        }

        // 2. Gestion de la cinématique d'ouverture ou de transition
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

    /**
     * Animation d'ouverture selon les spécifications de l'Étape 14.
     */
    Scene_Title.prototype.updateOpeningAnimation = function () {
        const boxW = (typeof Graphics !== "undefined" && Graphics.width) ? Graphics.width : 1280;
        const boxH = (typeof Graphics !== "undefined" && Graphics.height) ? Graphics.height : 720;

        switch (this._titleAnimPhase) {
            case 0: // Attente du préchargement des images
                const allReady = this._titleLayers.every(s => s && s.bitmap && s.bitmap.isReady());
                if (allReady) {
                    // Positionnement initial centré pour le logo du jeu
                    const logoW = this._gameLogoSprite.bitmap ? this._gameLogoSprite.bitmap.width : 400;
                    const logoH = this._gameLogoSprite.bitmap ? this._gameLogoSprite.bitmap.height : 150;
                    this._gameLogoSprite.x = (boxW - logoW) / 2;
                    this._gameLogoCenterY = (boxH - logoH) / 2;
                    this._gameLogoSprite.y = this._gameLogoCenterY;
                    this._titleAnimPhase = 1;
                    this._titleAnimTimer = 0;
                }
                break;

            case 1: // Parralaxe & Bg_0 fade in progressif
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

            case 2: // Game_logo fade in centré jusqu'à opacity 0.5 (128 / 255) en 1.5s (~90 frames)
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

            case 3: // Game_logo monte jusqu'à être aligné en haut (y=0) et opaque (1.0), Bg_1 fade in en parallèle
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

            case 4: // Screw en bas à droite (rotation + fade in) & Station (x:406, y:225, zoom 0.1 -> 1.0, fade in)

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

            case 5: // LogoSC apparaît en fade in à la même place, Screw disparaît en fondu
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

            case 6: // Fin de l'animation d'ouverture -> Ouverture de la fenêtre de commande
                this._openingDone = true;
                if (this._commandWindow) {
                    this._commandWindow.open();
                    this._commandWindow.activate();
                }
                break;
        }
    };

    /**
     * Lance la transition cinématique vers le mode histoire ou libre.
     * @param {Function} onFinish 
     */
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

    /**
     * Animation de transition immersion selon WALKTROUGHT Étape 14 :
     * 1. Bg_2 fade in, les autres calques s'effacent.
     * 2. Left apparaît en (x:0, y:990, zoom 1.2) et Right en (x:1780, y:600, zoom 0.6).
     * 3. Musique transitionne vers bgm/03Z_MystFallOut.ogg.
     * 4. Les deux bougent simultanément vers (0,0) avec zoom 1.
     * 5. Attente 2s puis déclenchement de la scène suivante.
     */
    Scene_Title.prototype.updateTransitionAnimation = function () {
        switch (this._transitionPhase) {
            case 1: // Fondu de Bg_2 et effacement des autres calques
                this._bg2Sprite.visible = true;
                this._bg2Sprite.opacity = Math.min(255, this._bg2Sprite.opacity + 6);

                this._paralaxeSprite.opacity = Math.max(0, this._paralaxeSprite.opacity - 6);
                this._bg0Sprite.opacity = Math.max(0, this._bg0Sprite.opacity - 6);
                this._bg1Sprite.opacity = Math.max(0, this._bg1Sprite.opacity - 6);
                this._stationSprite.opacity = Math.max(0, this._stationSprite.opacity - 6);
                this._scLogoSprite.opacity = Math.max(0, this._scLogoSprite.opacity - 6);
                this._gameLogoSprite.opacity = Math.max(0, this._gameLogoSprite.opacity - 6);

                if (this._bg2Sprite.opacity >= 255) {
                    // Initialisation des calques cinématiques Left et Right
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

                    // Changement de BGM vers 03Z_MystFallOut.ogg
                    if (typeof AudioManager !== "undefined" && AudioManager.playBgm) {
                        AudioManager.playBgm({ name: "03Z_MystFallOut", volume: 90, pitch: 100, pan: 0 });
                    }

                    this._transitionPhase = 2;
                }
                break;

            case 2: // Déplacement simultané vers (0, 0) et zoom 1.0
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
                    this._transitionTimer = 120; // 2 secondes à 60 FPS
                }
                break;

            case 3: // Temporisation de 2 secondes
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

    // ------------------------------------------------------------------------
    // Gestionnaires de commandes du menu
    // ------------------------------------------------------------------------
    Scene_Title.prototype.commandNewGame = function () {
        this.startImmersionTransition(() => {
            if (typeof DataManager !== "undefined") {
                DataManager.setupNewGame();
            }
            if (typeof SceneManager !== "undefined") {
                SceneManager.goto(Scene_Map);
            }
        });
    };

    Scene_Title.prototype.commandContinue = function () {
        this.startImmersionTransition(() => {
            if (typeof SceneManager !== "undefined") {
                SceneManager.push(Scene_Load);
            }
        });
    };

    Scene_Title.prototype.commandFreeGame = function () {
        this.startImmersionTransition(() => {
            if (typeof SceneManager !== "undefined") {
                SceneManager.push(Scene_FreeGameStart);
            }
        });
    };

    Scene_Title.prototype.commandCodex = function () {
        if (this._commandWindow) this._commandWindow.close();
        if (typeof SceneManager !== "undefined") {
            SceneManager.push(Scene_Codex);
        }
    };

    Scene_Title.prototype.commandCredits = function () {
        if (this._commandWindow) this._commandWindow.close();
        if (typeof SceneManager !== "undefined") {
            SceneManager.push(Scene_Credits);
        }
    };

    Scene_Title.prototype.commandExit = function () {
        if (this._commandWindow) this._commandWindow.close();
        if (typeof SceneManager !== "undefined" && SceneManager.exit) {
            SceneManager.exit();
        }
    };

    // ========================================================================
    // 3. Scene_FreeGameStart (Mode Libre - Étape 14)
    // ========================================================================
    const Scene_MenuBaseClass = (typeof Scene_MenuBase !== "undefined") ? Scene_MenuBase : Scene_Base;

    class Scene_FreeGameStart extends Scene_MenuBaseClass {
        create() {
            super.create();
            this.createBackgroundLayer();
            this.createInfoWindow();
        }

        createBackgroundLayer() {
            const loadT1 = (name) => {
                return (ImageManager.loadTitle1) ? ImageManager.loadTitle1(name) : ImageManager.loadBitmap("img/titles1/", name);
            };
            this._bg = new Sprite(loadT1("Bg_2"));
            this.addChild(this._bg);
        }

        createInfoWindow() {
            const boxW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
            const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;
            const rect = new Rectangle((boxW - 640) / 2, (boxH - 260) / 2, 640, 260);

            this._infoWindow = new Window_Base(rect);
            this._infoWindow.opacity = 220;

            const text1 = "SIMCRAFT 4 - MODE LIBRE";
            const text2 = "Ce mode permettra d'explorer les secteurs en toute autonomie,";
            const text3 = "de lancer des expéditions et d'aménager vos bases.";
            const text4 = "[ Fonctionnalité en cours de préparation ]";
            const text5 = "Appuyez sur Échap ou Annuler pour revenir au titre.";

            this._infoWindow.contents.fontSize = 22;
            this._infoWindow.drawText(text1, 0, 15, rect.width - 36, "center");
            this._infoWindow.contents.fontSize = 16;
            this._infoWindow.drawText(text2, 0, 65, rect.width - 36, "center");
            this._infoWindow.drawText(text3, 0, 95, rect.width - 36, "center");
            this._infoWindow.changeTextColor(ColorManager ? ColorManager.systemColor() : "#ffd700");
            this._infoWindow.drawText(text4, 0, 140, rect.width - 36, "center");
            this._infoWindow.resetTextColor();
            this._infoWindow.drawText(text5, 0, 185, rect.width - 36, "center");

            this.addWindow(this._infoWindow);
        }

        update() {
            super.update();
            if (Input.isTriggered("cancel") || TouchInput.isCancelled()) {
                if (SoundManager && SoundManager.playCancel) SoundManager.playCancel();
                SceneManager.pop();
            }
        }
    }
    window.Scene_FreeGameStart = Scene_FreeGameStart;

    // ========================================================================
    // 4. Scene_Codex (Base de connaissances & Accomplishments - Étape 14)
    // ========================================================================
    class Scene_Codex extends Scene_MenuBaseClass {
        create() {
            super.create();
            this.createBackgroundLayer();
            this.createCategoryWindow();
            this.createDetailWindow();
        }

        createBackgroundLayer() {
            const loadT1 = (name) => {
                return (ImageManager.loadTitle1) ? ImageManager.loadTitle1(name) : ImageManager.loadBitmap("img/titles1/", name);
            };
            this._bg = new Sprite(loadT1("Bg_0"));
            this._bg.opacity = 180;
            this.addChild(this._bg);
        }

        createCategoryWindow() {
            const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;
            const rect = new Rectangle(40, 50, 320, boxH - 100);

            this._categoryWindow = new Window_Command(rect);
            this._categoryWindow.makeCommandList = function () {
                this.addCommand("L'Univers SimCraft", "universe");
                this.addCommand("Les Araknavores", "arakna");
                this.addCommand("Cogitateurs & Stations", "cogitator");
                this.addCommand("Arsenal & Équipements", "arsenal");
                this.addCommand("Accomplissements", "achievements");
            };
            this._categoryWindow.setHandler("cancel", this.popScene.bind(this));
            this._categoryWindow.setHandler("ok", () => {
                if (this._categoryWindow) this._categoryWindow.activate();
            });
            this.addWindow(this._categoryWindow);
        }

        createDetailWindow() {
            const boxW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
            const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;
            const rect = new Rectangle(380, 50, boxW - 420, boxH - 100);

            this._detailWindow = new Window_Base(rect);
            this.addWindow(this._detailWindow);
            this.refreshDetail();
        }

        update() {
            super.update();
            const symbol = this._categoryWindow ? this._categoryWindow.currentSymbol() : null;
            if (this._lastSymbol !== symbol) {
                this._lastSymbol = symbol;
                this.refreshDetail();
            }
        }

        refreshDetail() {
            if (!this._detailWindow) return;
            this._detailWindow.contents.clear();
            const symbol = this._lastSymbol || "universe";
            const w = this._detailWindow.contentsWidth();

            this._detailWindow.contents.fontSize = 24;
            let title = "";
            let description = [];

            switch (symbol) {
                case "universe":
                    title = "L'UNIVERS DE SIMCRAFT";
                    description = [
                        "Dans les confins de la station orbitale et des ruines d'Inral,",
                        "l'humanité tente de survivre face aux créatures de l'Ombre.",
                        "Chaque zone regorge de technologies oubliées et de ressources précieuses."
                    ];
                    break;
                case "arakna":
                    title = "LES ARAKNAVORES";
                    description = [
                        "Formes de vie hostiles adaptées aux environnements hostiles.",
                        "Leur comportement varie entre patrouilles neutres et assauts coordonnés.",
                        "Leur détection s'effectue par champ visuel et couverture de terrain."
                    ];
                    break;
                case "cogitator":
                    title = "COGITATEURS ET TERMINAUX";
                    description = [
                        "Systèmes informatiques centraux de la station.",
                        "Permettent d'ouvrir des sas, de transférer des inventaires",
                        "et de consulter les journaux de bord de l'expédition."
                    ];
                    break;
                case "arsenal":
                    title = "ARSENAL ET ÉQUIPEMENTS";
                    description = [
                        "Combinaisons tactiques, gilets flak et armes de combat.",
                        "Le système Paperdoll reflète chaque pièce d'armure",
                        "en temps réel sur votre personnage et dans le portrait dynamique."
                    ];
                    break;
                case "achievements":
                    title = "ACCOMPLISSEMENTS";
                    description = [
                        "• Premier Pas : Entrer dans le complexe Inral.",
                        "• Bagarreur : Éliminer un premier Araknavore.",
                        "• Intendant : Découvrir un conteneur secret.",
                        "• Équipe Tactique : Recruter un premier compagnon."
                    ];
                    break;
            }

            this._detailWindow.drawText(title, 20, 20, w - 40, "left");
            this._detailWindow.contents.fontSize = 18;
            let y = 80;
            for (const line of description) {
                this._detailWindow.drawText(line, 20, y, w - 40, "left");
                y += 35;
            }
        }
    }
    window.Scene_Codex = Scene_Codex;

    // ========================================================================
    // 5. Scene_Credits (Générique défilant - Étape 14)
    // ========================================================================
    const Scene_BaseClass = (typeof Scene_Base !== "undefined") ? Scene_Base : class { };

    class Scene_Credits extends Scene_BaseClass {
        create() {
            super.create();
            this._scrollTimer = 0;
            this._duration = 600; // 10 secondes par défaut (60 FPS)
            this.createBackgroundLayer();
            this.createCreditsText();
            this.playCreditsMusic();
        }

        createBackgroundLayer() {
            const loadT1 = (name) => {
                return (ImageManager.loadTitle1) ? ImageManager.loadTitle1(name) : ImageManager.loadBitmap("img/titles1/", name);
            };
            this._bg = new Sprite(loadT1("Bg_1"));
            this.addChild(this._bg);
        }

        createCreditsText() {
            const boxW = (typeof Graphics !== "undefined" && Graphics.width) ? Graphics.width : 1280;
            const boxH = (typeof Graphics !== "undefined" && Graphics.height) ? Graphics.height : 720;
            const textH = 1200;

            this._creditsBitmap = new Bitmap(boxW, textH);
            this._creditsSprite = new Sprite(this._creditsBitmap);
            this._creditsSprite.y = boxH;
            this.addChild(this._creditsSprite);

            const lines = [
                { text: "SIMCRAFT 4", size: 36, color: "#ffd700" },
                { text: "", size: 20 },
                { text: "CRÉATION ET DÉVELOPPEMENT", size: 22, color: "#61afef" },
                { text: "SimCraft Development Team", size: 20, color: "#ffffff" },
                { text: "", size: 20 },
                { text: "DIRECTION ARTISTIQUE ET ASSETS", size: 22, color: "#61afef" },
                { text: "Univers graphique SimCraft & Modules SCE", size: 20, color: "#ffffff" },
                { text: "", size: 20 },
                { text: "MUSIQUES ET AMBIANCES SONORES", size: 22, color: "#61afef" },
                { text: "03Z_MystFallOut & SimCraft Audio Collection", size: 20, color: "#ffffff" },
                { text: "", size: 20 },
                { text: "MOTEUR ET TECHNOLOGIES", size: 22, color: "#61afef" },
                { text: "RPG Maker MZ Core Engine", size: 20, color: "#ffffff" },
                { text: "SimCraft ARPG Real-Time Architecture", size: 20, color: "#ffffff" },
                { text: "", size: 30 },
                { text: "MERCI D'AVOIR JOUÉ À CETTE DÉMO !", size: 26, color: "#98c379" }
            ];

            let curY = 0;
            for (const item of lines) {
                if (item.text) {
                    this._creditsBitmap.fontSize = item.size;
                    this._creditsBitmap.textColor = item.color || "#ffffff";
                    this._creditsBitmap.drawText(item.text, 0, curY, boxW, item.size + 8, "center");
                }
                curY += (item.size || 20) + 16;
            }
        }

        playCreditsMusic() {
            if (typeof AudioManager !== "undefined" && AudioManager.playBgm) {
                AudioManager.playBgm({ name: "03Z_MystFallOut", volume: 90, pitch: 100, pan: 0 });
            }
        }

        update() {
            super.update();
            this._scrollTimer++;

            // Défilement vertical fluide
            if (this._creditsSprite) {
                this._creditsSprite.y -= 1.8;
            }

            // Retour automatique après durée impartie ou appui touche/clic
            const finished = this._scrollTimer >= this._duration || (this._creditsSprite && this._creditsSprite.y < -1200);
            const userSkipped = Input.isTriggered("ok") || Input.isTriggered("cancel") || TouchInput.isTriggered() || TouchInput.isCancelled();

            if (finished || userSkipped) {
                if (SoundManager && SoundManager.playCancel) SoundManager.playCancel();
                // Rétablir la musique du titre
                if (typeof Scene_Title !== "undefined" && Scene_Title.prototype.playTitleMusic) {
                    Scene_Title.prototype.playTitleMusic.call(this);
                }
                SceneManager.pop();
            }
        }
    }
    window.Scene_Credits = Scene_Credits;

})();
