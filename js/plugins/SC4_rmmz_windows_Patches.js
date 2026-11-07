//=============================================================================
// SC4_rmmz_windows_Patches.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Surcharges et patches des classes natives de rmmz_windows.js.
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
 * NORME DES FICHIERS DE PATCHES :
 * - Nom de la Classe en commentaire (ex: // WINDOW BASE)
 * - Création de tous les alias nécessaires à la classe au début de sa section, suivis d'une ligne vide
 * - Toutes les méthodes de la classe regroupées ensemble (surcharges et ajouts), sans doublons
 * - Ordre des classes identique au fichier natif vanilla
 * - Pas de commentaires superflus en dehors des méthodes (sauf TODO ou note en header)
 * - Règle "Fail Fast" : pas de fallbacks silencieux masquant les bugs
 * ============================================================================
 * Regroupe tous les patches et surcharges apportés aux classes de rmmz_windows :
 * 
 * 1. Window_Base :
 *    - drawDynamicFace / drawActorFace / drawActorPicture : support Paperdoll composite.
 *    - convertEscapeCharacters : traduction préalable des balises \L[KEY].
 * 
 * 2. Window_Command :
 *    - commandName : traduction dynamique via SC4_Localization.
 * 
 * 3. Window_StatusBase :
 *    - drawActorFace : support Paperdoll dynamique pour les héros.
 *    - hideAdditionalSprites : masquage propre des sprites composites.
 * 
 * 4. Window_MenuCommand :
 *    - addOriginalCommands : commande d'accès rapide Inventaire.
 * 
 * 5. Window_Options :
 *    - Options Langue (FR/EN), Clavier (AZERTY/QWERTY) et Recharge auto.
 * 
 * 6. Window_NameBox :
 *    - setName : traduction dynamique du nom de l'interlocuteur.
 * 
 * 7. Window_TitleCommand :
 *    - Personnalisation visuelle (transparence, police) et commandes SimCraft 4.
 * 
 * 8. Fenêtres personnalisées :
 *    - Window_ItemWeight : affichage de la jauge de charge d'inventaire.
 *    - Window_ItemAction : menu contextuel d'objet (utiliser, jeter 1, jeter tout).
 * ============================================================================
 */

const pluginName = "SC4_rmmz_windows_Patches";
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
                }).catch(() => { });
            }
        } catch (e) { }
    }
    return family;
}

const titleFontFamily = resolveFontFace(titleFontFaceParam);

(() => {
    "use strict";

    // WINDOW BASE
    //=============================================================================
    const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;

    Window_Base.prototype.drawDynamicFace = function (actorOrId, x, y, width, height) {
        const actor = (typeof actorOrId === "number") ? $gameActors.actor(actorOrId) : actorOrId;
        if (!actor) return null;

        const actorId = actor.actorId();
        width = width || ImageManager.faceWidth || 144;
        height = height || ImageManager.faceHeight || 144;

        this._additionalSprites = this._additionalSprites || {};
        const key = `dynamicFace_${actorId}_${x}_${y}`;
        let sprite = this._additionalSprites[key];

        if (!sprite) {
            sprite = new Sprite_PaperdollFace(actor, width, height);
            this._additionalSprites[key] = sprite;
            if (typeof this.addInnerChild === "function") {
                this.addInnerChild(sprite);
            } else {
                this.addChild(sprite);
            }
        } else {
            sprite.setTargetSize(width, height);
            sprite.setActor(actor);
        }

        if (typeof sprite.move === "function") {
            sprite.move(x, y);
        } else {
            sprite.x = x;
            sprite.y = y;
        }

        if (typeof sprite.show === "function") {
            sprite.show();
        } else {
            sprite.visible = true;
        }
        sprite._inUse = true;

        return sprite;
    };
    Window_Base.prototype.drawActorFace = function (actor, x, y, width, height) {
        const isHero = actor && (
            (typeof actor.isHero === "function" && actor.isHero()) ||
            (actor.hasNotetag && actor.hasNotetag("Hero")) ||
            (actor.actor && actor.actor() && /<Hero>/i.test(actor.actor().note))
        );
        if (isHero) {
            this.drawDynamicFace(actor, x, y, width, height);
        } else {
            this.drawFace(actor.faceName(), actor.faceIndex(), x, y, width, height);
        }
    };
    Window_Base.prototype.drawActorPicture = function (actor, x, y, width, height) {
        this.drawActorFace(actor, x, y, width, height);
    };
    Window_Base.prototype.convertEscapeCharacters = function (text) {
        const localized = SC4_Localization.parse(text);
        return _Window_Base_convertEscapeCharacters.call(this, localized);
    };

    // WINDOW COMMAND
    //=============================================================================
    const _Window_Command_commandName = Window_Command.prototype.commandName;

    Window_Command.prototype.commandName = function (index) {
        const raw = _Window_Command_commandName.call(this, index);
        return SC4_Localization.parse(raw);
    };

    // WINDOW STATUS BASE
    //=============================================================================
    const _Window_StatusBase_drawActorFace = Window_StatusBase.prototype.drawActorFace;
    const _Window_StatusBase_hideAdditionalSprites = Window_StatusBase.prototype.hideAdditionalSprites;

    Window_StatusBase.prototype.drawActorFace = function (actor, x, y, width, height) {
        const isHero = actor && (
            (typeof actor.isHero === "function" && actor.isHero()) ||
            (actor.hasNotetag && actor.hasNotetag("Hero")) ||
            (actor.actor && actor.actor() && /<Hero>/i.test(actor.actor().note))
        );
        if (isHero) {
            this.drawDynamicFace(actor, x, y, width, height);
        } else {
            _Window_StatusBase_drawActorFace.call(this, actor, x, y, width, height);
        }
    };
    Window_StatusBase.prototype.hideAdditionalSprites = function () {
        if (_Window_StatusBase_hideAdditionalSprites) {
            _Window_StatusBase_hideAdditionalSprites.call(this);
        }
        if (this._additionalSprites) {
            for (const sprite of Object.values(this._additionalSprites)) {
                if (sprite && typeof sprite.hide === "function") {
                    sprite.hide();
                } else if (sprite) {
                    sprite.visible = false;
                }
            }
        }
    };

    // WINDOW MENU COMMAND
    //=============================================================================
    const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;

    Window_MenuCommand.prototype.addOriginalCommands = function () {
        _Window_MenuCommand_addOriginalCommands.call(this);
        this.addCommand("Inventaire", "inventory", true);
    };

    // WINDOW OPTIONS
    //=============================================================================
    const _Window_Options_addGeneralOptions = Window_Options.prototype.addGeneralOptions;
    const _Window_Options_statusText = Window_Options.prototype.statusText;
    const _Window_Options_processOk = Window_Options.prototype.processOk;
    const _Window_Options_cursorRight = Window_Options.prototype.cursorRight;
    const _Window_Options_cursorLeft = Window_Options.prototype.cursorLeft;

    Window_Options.prototype.addGeneralOptions = function () {
        _Window_Options_addGeneralOptions.call(this);
        this.addCommand(SC4_Localization.getText("options.language", "Langue"), "locale");
        this.addCommand("Clavier", "keyboardLayout");
        this.addCommand("Recharge auto", "autoReload");
    };
    Window_Options.prototype.statusText = function (index) {
        const symbol = this.commandSymbol(index);
        if (symbol === "locale") {
            return SC4_Localization.locale() === "EN" ? "English" : "Français";
        }
        if (symbol === "keyboardLayout") {
            return this.getConfigValue(symbol) === "qwerty" ? "QWERTY" : "AZERTY";
        }
        return _Window_Options_statusText.call(this, index);
    };
    Window_Options.prototype.processOk = function () {
        const symbol = this.commandSymbol(this.index());
        if (symbol === "locale") {
            this.toggleLocale();
            return;
        }
        if (symbol === "keyboardLayout") {
            const next = this.getConfigValue(symbol) === "qwerty" ? "azerty" : "qwerty";
            this.changeValue(symbol, next);
            ConfigManager.applyKeyboardLayout();
            return;
        }
        _Window_Options_processOk.call(this);
    };
    Window_Options.prototype.cursorRight = function (wrap) {
        const symbol = this.commandSymbol(this.index());
        if (symbol === "locale") {
            this.toggleLocale();
            return;
        }
        if (symbol === "keyboardLayout") {
            this.changeValue(symbol, "qwerty");
            ConfigManager.applyKeyboardLayout();
            return;
        }
        _Window_Options_cursorRight.call(this, wrap);
    };
    Window_Options.prototype.cursorLeft = function (wrap) {
        const symbol = this.commandSymbol(this.index());
        if (symbol === "locale") {
            this.toggleLocale();
            return;
        }
        if (symbol === "keyboardLayout") {
            this.changeValue(symbol, "azerty");
            ConfigManager.applyKeyboardLayout();
            return;
        }
        _Window_Options_cursorLeft.call(this, wrap);
    };
    Window_Options.prototype.toggleLocale = function () {
        const current = SC4_Localization.locale();
        const next = current === "FR" ? "EN" : "FR";
        SC4_Localization.setLocale(next);
        SoundManager.playCursor();
        this.refresh();
    };

    // WINDOW NAME BOX
    //=============================================================================
    const _Window_NameBox_setName = Window_NameBox.prototype.setName;

    Window_NameBox.prototype.setName = function (name) {
        _Window_NameBox_setName.call(this, SC4_Localization.parse(name));
    };

    // WINDOW TITLE COMMAND
    //=============================================================================
    const _Window_TitleCommand_initialize = Window_TitleCommand.prototype.initialize;

    Window_TitleCommand.prototype.initialize = function (rect) {
        _Window_TitleCommand_initialize.call(this, rect);
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
        const t = (k, def) => SC4_Localization.getText(k, def);
        this.addCommand(t("title.newGame", TextManager.newGame || "Débuter"), "newGame");
        this.addCommand(t("title.continue", TextManager.continue_ || "Continuer"), "continue", continueEnabled);
        this.addCommand(t("title.freeGame", "Mode libre"), "freeGame", true);
        this.addCommand(t("title.options", TextManager.options || "Options"), "options");
        this.addCommand(t("title.codex", "Codex"), "codex", true);
        this.addCommand(t("title.credits", "Crédits"), "credits", true);
        this.addCommand(t("title.exit", "Quitter"), "exit", true);
    };

    // WINDOW ITEM WEIGHT
    //=============================================================================
    class Window_ItemWeight extends Window_Base {
        constructor(rect) {
            super(rect);
            this.refresh();
        }
        refresh() {
            this.contents.clear();
            const curWeight = $gameParty.totalWeight();
            const maxWeight = $gameParty.maxWeight();
            const isOverloaded = curWeight > maxWeight;
            const label = LocalisationManager.getText("inventory.weight", "Poids");
            const maxStr = (maxWeight === Infinity || isNaN(maxWeight)) ? "∞" : maxWeight;
            const text = `${label}: ${curWeight}/${maxStr}`;
            if (isOverloaded) {
                this.changeTextColor("#ff4d4d");
            } else {
                this.changeTextColor(ColorManager.systemColor());
            }
            this.drawText(text, 0, 0, this.innerWidth, "center");
            this.resetTextColor();
        }
    }
    window.Window_ItemWeight = Window_ItemWeight;

    // WINDOW ITEM ACTION
    //=============================================================================
    class Window_ItemAction extends Window_Command {
        constructor(rect) {
            super(rect);
            this.openness = 0;
            this.deactivate();
            this._item = null;
        }
        setup(item) {
            this._item = item;
            this.refresh();
            this.select(0);
            this.open();
            this.activate();
        }
        makeCommandList() {
            const item = this._item;
            const getTxt = (key, fallback) => LocalisationManager.getText(key, fallback);
            if (item && $gameParty.canUse(item)) {
                this.addCommand(getTxt("inventory.use", "Utiliser"), "use", true);
            }
            this.addCommand(getTxt("inventory.drop_one", "Jeter 1"), "drop_one", true);
            this.addCommand(getTxt("inventory.drop_all", "Jeter Tout"), "drop_all", true);
            this.addCommand(getTxt("inventory.cancel", "Annuler"), "cancel", true);
        }
    }
    window.Window_ItemAction = Window_ItemAction;

})();
