
/**
 * Ajoute ou réutilise un sprite de portrait dynamique dans la fenêtre.
 * @param {Game_Actor|Game_Hero|number} actorOrId 
 * @param {number} x 
 * @param {number} y 
 * @param {number} [width] 
 * @param {number} [height] 
 * @returns {Sprite_PaperdollFace|null}
 */
Window_Base.prototype.drawDynamicFace = function (actorOrId, x, y, width, height) {
    const actor = (typeof actorOrId === "number")
        ? ((typeof $gameActors !== "undefined" && $gameActors) ? $gameActors.actor(actorOrId) : null)
        : actorOrId;
    if (!actor) return null;

    const actorId = (typeof actor.actorId === "function") ? actor.actorId() : 0;
    width = width || (typeof ImageManager !== "undefined" ? ImageManager.faceWidth : 144) || 144;
    height = height || (typeof ImageManager !== "undefined" ? ImageManager.faceHeight : 144) || 144;

    this._additionalSprites = this._additionalSprites || {};
    const key = `dynamicFace_${actorId}_${x}_${y}`;
    let sprite = this._additionalSprites[key];

    if (!sprite) {
        sprite = new Sprite_PaperdollFace(actor, width, height);
        this._additionalSprites[key] = sprite;
        if (typeof this.addInnerChild === "function") {
            this.addInnerChild(sprite);
        } else if (typeof this.addChild === "function") {
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
    } else if (typeof this.drawFace === "function") {
        this.drawFace(actor.faceName(), actor.faceIndex(), x, y, width, height);
    }
};

const _Window_StatusBase_drawActorFace = Window_StatusBase.prototype.drawActorFace;
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

const _Window_StatusBase_hideAdditionalSprites = Window_StatusBase.prototype.hideAdditionalSprites;
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
const _Window_Options_addGeneralOptions = Window_Options.prototype.addGeneralOptions;
Window_Options.prototype.addGeneralOptions = function () {
    this.addCommand(SC4_Localization.getText("options.language", "Langue"), "locale");
    if (_Window_Options_addGeneralOptions) {
        _Window_Options_addGeneralOptions.call(this);
    }
};

const _Window_Options_statusText = Window_Options.prototype.statusText;
Window_Options.prototype.statusText = function (index) {
    const symbol = this.commandSymbol(index);
    if (symbol === "locale") {
        const loc = SC4_Localization.locale();
        return loc === "EN" ? "English" : "Français";
    }
    return _Window_Options_statusText ? _Window_Options_statusText.call(this, index) : "";
};

const _Window_Options_processOk = Window_Options.prototype.processOk;
Window_Options.prototype.processOk = function () {
    const index = this.index();
    const symbol = this.commandSymbol(index);
    if (symbol === "locale") {
        this.toggleLocale();
        return;
    }
    if (_Window_Options_processOk) {
        _Window_Options_processOk.call(this);
    }
};

const _Window_Options_cursorRight = Window_Options.prototype.cursorRight;
Window_Options.prototype.cursorRight = function (wrap) {
    const index = this.index();
    const symbol = this.commandSymbol(index);
    if (symbol === "locale") {
        this.toggleLocale();
        return;
    }
    if (_Window_Options_cursorRight) {
        _Window_Options_cursorRight.call(this, wrap);
    }
};

const _Window_Options_cursorLeft = Window_Options.prototype.cursorLeft;
Window_Options.prototype.cursorLeft = function (wrap) {
    const index = this.index();
    const symbol = this.commandSymbol(index);
    if (symbol === "locale") {
        this.toggleLocale();
        return;
    }
    if (_Window_Options_cursorLeft) {
        _Window_Options_cursorLeft.call(this, wrap);
    }
};

Window_Options.prototype.toggleLocale = function () {
    const current = SC4_Localization.locale();
    const next = current === "FR" ? "EN" : "FR";
    SC4_Localization.setLocale(next);
    if (typeof SoundManager !== "undefined" && SoundManager.playCursor) {
        SoundManager.playCursor();
    }
    // Rafraîchit les libellés de commandes immédiatement avec la nouvelle langue
    this.refresh();
};
if (typeof Window_Base !== "undefined") {
    const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
    Window_Base.prototype.convertEscapeCharacters = function (text) {
        // \L[KEY] est converti AVANT les autres flags pour que les textes traduits
        // puissent à leur tour contenir des escape codes (\N[1], \V[5], \C[2], etc.)
        const localized = SC4_Localization.parse(text);
        return _Window_Base_convertEscapeCharacters.call(this, localized);
    };
}

if (typeof Window_Command !== "undefined") {
    const _Window_Command_commandName = Window_Command.prototype.commandName;
    Window_Command.prototype.commandName = function (index) {
        const raw = _Window_Command_commandName ? _Window_Command_commandName.call(this, index) : (this._list && this._list[index] ? this._list[index].name : "");
        return SC4_Localization.parse(raw);
    };
}

if (typeof Window_NameBox !== "undefined") {
    const _Window_NameBox_setName = Window_NameBox.prototype.setName;
    Window_NameBox.prototype.setName = function (name) {
        const localized = typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(name) : name;
        _Window_NameBox_setName.call(this, localized);
    };
}