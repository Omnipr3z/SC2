//=============================================================================
// RPG Maker MZ - SC4_Window_SubcomContactCommand.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Liste des contacts enregistrés pour appels sortants SubCom.
 * @author SimCraft
 *
 * @help SC4_Window_SubcomContactCommand.js
 * ============================================================================
 * Fenêtre inférieure gauche de SubScene_Subcom (420x202).
 * Affiche le carnet de contacts SubCom du leader ($gameParty.leader().subCom).
 * Désactive et grise les contacts injoignables (indisponibles, présents à bord
 * ou décédés). Reste visible en permanence dans SubScene_Subcom et s'active
 * lorsque le joueur sélectionne "Appeler".
 * ============================================================================
 */

class Window_SubcomContactCommand extends Window_Command {
    constructor(rect) {
        super(rect);
        this.opacity = 240;
        this._headerHeight = 40;
        this.refresh();
    }

    loadWindowskin() {
        if (typeof ImageManager !== "undefined" && ImageManager.loadSystem) {
            this.windowskin = ImageManager.loadSystem("Prompt") || ImageManager.loadSystem("Window");
        }
    }

    loc(key, def) {
        return (typeof SC4_Localization !== "undefined" && typeof SC4_Localization.getText === "function")
            ? SC4_Localization.getText(key, def)
            : def;
    }

    // ========================================================================
    // 1. DONNÉES & CONTACTS
    // ========================================================================

    leaderActor() {
        return (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.leader === "function")
            ? $gameParty.leader()
            : null;
    }

    getContactIds() {
        const leader = this.leaderActor();
        if (!leader || !leader.subCom || typeof leader.subCom.contacts !== "function") {
            return [];
        }
        return leader.subCom.contacts();
    }

    canCallActor(actorId) {
        if (typeof $gameActors === "undefined" || !$gameActors || typeof $gameActors.actor !== "function") {
            return false;
        }
        const actor = $gameActors.actor(actorId);
        if (!actor) return false;
        if (actor.subCom && typeof actor.subCom.canBeCalledByPlayer === "function") {
            return actor.subCom.canBeCalledByPlayer();
        }
        return false;
    }

    hasCallableContacts() {
        return this.getContactIds().some(id => this.canCallActor(id));
    }

    firstCallableIndex() {
        if (!Array.isArray(this._list)) return 0;
        const idx = this._list.findIndex(c => c && c.symbol === "contact" && c.enabled);
        return idx >= 0 ? idx : 0;
    }

    // ========================================================================
    // 2. GÉOMÉTRIE
    // ========================================================================

    maxCols() {
        return 1;
    }

    itemHeight() {
        return 34;
    }

    headerHeight() {
        return this._headerHeight || 40;
    }

    overallHeight() {
        const base = typeof super.overallHeight === "function"
            ? super.overallHeight()
            : (this.maxItems() * this.itemHeight());
        return base + this.headerHeight();
    }

    itemRect(index) {
        if (typeof super.itemRect === "function") {
            const rect = super.itemRect(index);
            rect.y += this.headerHeight();
            return rect;
        }
        return new Rectangle(0, this.headerHeight() + index * this.itemHeight(), this.innerWidth || 396, this.itemHeight());
    }

    titleRect() {
        return new Rectangle(10, 4, (this.innerWidth || 396) - 20, 28);
    }

    ensureCursorVisible(smooth) {
        if (this._cursorAll) {
            if (typeof this.scrollTo === "function") this.scrollTo(0, 0);
            return;
        }
        if (this.innerHeight > 0 && typeof this.row === "function" && this.row() >= 0) {
            const scrollY = (typeof this.scrollY === "function") ? this.scrollY() : (this._scrollY || 0);
            const itemTop = this.row() * this.itemHeight();
            const itemBottom = itemTop + this.itemHeight() + this.headerHeight();
            const scrollMin = itemBottom - this.innerHeight;
            if (scrollY > itemTop) {
                if (smooth && typeof this.smoothScrollTo === "function") {
                    this.smoothScrollTo(0, itemTop);
                } else if (typeof this.scrollTo === "function") {
                    this.scrollTo(0, itemTop);
                }
            } else if (scrollY < scrollMin) {
                if (smooth && typeof this.smoothScrollTo === "function") {
                    this.smoothScrollTo(0, scrollMin);
                } else if (typeof this.scrollTo === "function") {
                    this.scrollTo(0, scrollMin);
                }
            }
        }
    }

    hitTest(x, y) {
        if (typeof super.hitTest !== "function") return -1;
        if (y - (this.padding || 0) < this.headerHeight()) {
            return -1;
        }
        return super.hitTest(x, y);
    }

    // ========================================================================
    // 3. STYLES & DESSIN
    // ========================================================================

    resetFontSettings() {
        if (this.contents) {
            this.contents.fontFace = (typeof $gameSystem !== "undefined" && $gameSystem && typeof $gameSystem.mainFontFace === "function")
                ? $gameSystem.mainFontFace()
                : "sans-serif";
            this.contents.fontSize = 16;
            this.contents.textColor = "#e0e0e0";
            this.contents.outlineColor = "#000000";
            this.contents.outlineWidth = 2;
        }
    }

    drawTitleBlock() {
        const rect = this.titleRect();
        const oy = (this.origin && typeof this.origin.y === "number") ? this.origin.y : 0;
        if (this.contents && typeof this.contents.clearRect === "function") {
            this.contents.clearRect(0, oy, this.innerWidth || 396, this.headerHeight());
        }
        if (this.contentsBack && typeof this.contentsBack.clearRect === "function") {
            this.contentsBack.clearRect(0, oy, this.innerWidth || 396, this.headerHeight());
        }
        this.resetFontSettings();
        if (this.contents) {
            this.contents.textColor = "#61afef";
            this.contents.fontSize = 15;
        }
        const title = this.loc("subcom.contacts_title", "📇 CONTACTS ENREGISTRÉS");
        if (typeof this.drawText === "function") {
            this.drawText(title, rect.x, rect.y + oy, rect.width, "left");
        }
    }

    paint() {
        if (typeof super.paint === "function") {
            super.paint();
        }
        this.drawTitleBlock();
    }

    drawItem(index) {
        const rect = this.itemRectWithPadding ? this.itemRectWithPadding(index) : this.itemRect(index);
        const cmd = this._list && this._list[index] ? this._list[index] : null;
        if (!cmd) return;

        this.resetFontSettings();
        if (typeof this.changePaintOpacity === "function") {
            this.changePaintOpacity(cmd.enabled);
        }
        if (this.contents) {
            this.contents.textColor = cmd.enabled ? "#e2e8f0" : "#64748b";
        }
        const icon = cmd.symbol === "contact" ? (cmd.enabled ? "📡 " : "◌ ") : "";
        if (typeof this.drawText === "function") {
            this.drawText(`${icon}${cmd.name}`, rect.x + 6, rect.y, rect.width - 12, "left");
        }
    }

    // ========================================================================
    // 4. LISTE DE COMMANDES
    // ========================================================================

    makeCommandList() {
        const ids = this.getContactIds();
        if (ids.length === 0) {
            this.addCommand(this.loc("subcom.no_contacts", "(Aucun contact)"), "empty", false, null);
            return;
        }

        const unavailableTag = this.loc("subcom.contact_unavailable", "(indisponible)");
        for (const id of ids) {
            const actor = (typeof $gameActors !== "undefined" && $gameActors && typeof $gameActors.actor === "function")
                ? $gameActors.actor(id)
                : null;
            if (!actor) continue;
            const callable = this.canCallActor(id);
            const name = actor.name();
            const label = callable ? name : `${name} ${unavailableTag}`;
            this.addCommand(label, "contact", callable, id);
        }

        if (this._list.length === 0) {
            this.addCommand(this.loc("subcom.no_contacts", "(Aucun contact)"), "empty", false, null);
        }
    }

    refresh() {
        const prevIndex = (typeof this._index === "number") ? this._index : 0;
        if (typeof this.clearCommandList === "function") {
            this.clearCommandList();
        }
        this.makeCommandList();
        if (typeof super.refresh === "function") {
            super.refresh();
        }
        if (this._list && this._list.length > 0 && typeof this.select === "function") {
            this.select(Math.max(0, Math.min(prevIndex, this._list.length - 1)));
        }
        this.drawTitleBlock();
    }
}

if (typeof window !== "undefined") {
    window.Window_SubcomContactCommand = Window_SubcomContactCommand;
}
if (typeof global !== "undefined") {
    global.Window_SubcomContactCommand = Window_SubcomContactCommand;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = Window_SubcomContactCommand;
}
