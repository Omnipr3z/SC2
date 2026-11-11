//=============================================================================
// RPG Maker MZ - SC4_Window_SubcomCommand.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Fenêtre principale de commandes du terminal SubCom (Répondre / Rejeter / Appeler / Quitter).
 * @author SimCraft
 *
 * @help SC4_Window_SubcomCommand.js
 * ============================================================================
 * Fenêtre droite de SubScene_Subcom (460x420), alignée sur l'emplacement
 * de Window_BridgeConsole.
 * Gère les actions :
 * - answer : Répondre à l'appel actif
 * - reject : Rejeter l'appel actif
 * - call   : Activer la sélection d'un contact connu
 * - quit   : Fermer le terminal SubCom
 * ============================================================================
 */

class Window_SubcomCommand extends Window_Command {
    constructor(rect) {
        super(rect);
        this.opacity = 240;
        this._headerHeight = 70;
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
    // 1. DONNÉES MÉTIER
    // ========================================================================

    get activeCall() {
        return (typeof $subComManager !== "undefined" && $subComManager && $subComManager.activeCall)
            ? $subComManager.activeCall
            : null;
    }

    get hasActiveCall() {
        return Boolean(this.activeCall);
    }

    get hasCallableContacts() {
        const leader = (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.leader === "function")
            ? $gameParty.leader()
            : null;
        if (!leader || !leader.subCom || typeof leader.subCom.contacts !== "function") {
            return false;
        }
        const ids = leader.subCom.contacts();
        if (!Array.isArray(ids) || ids.length === 0) return false;
        if (typeof $gameActors === "undefined" || !$gameActors || typeof $gameActors.actor !== "function") {
            return false;
        }
        return ids.some(id => {
            const actor = $gameActors.actor(id);
            return Boolean(actor && actor.subCom && typeof actor.subCom.canBeCalledByPlayer === "function" && actor.subCom.canBeCalledByPlayer());
        });
    }

    getCallerDisplayName(call) {
        if (!call) return "";
        if (call.masked) {
            return call.maskedLabel || this.loc("subcom.masked_signal", "Signal Masqué");
        }
        const actor = (typeof $gameActors !== "undefined" && $gameActors && typeof $gameActors.actor === "function")
            ? $gameActors.actor(call.actorId)
            : null;
        return actor ? actor.name() : `#${call.actorId}`;
    }

    // ========================================================================
    // 2. GÉOMÉTRIE
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
        return new Rectangle(0, this.headerHeight() + index * this.itemHeight(), this.innerWidth || 436, this.itemHeight());
    }

    titleRect() {
        return new Rectangle(12, 6, (this.innerWidth || 436) - 24, 30);
    }

    statusRect() {
        return new Rectangle(12, 36, (this.innerWidth || 436) - 24, 26);
    }

    // ========================================================================
    // 3. STYLES & DESSIN
    // ========================================================================

    resetFontSettings() {
        if (this.contents) {
            this.contents.fontFace = (typeof $gameSystem !== "undefined" && $gameSystem && typeof $gameSystem.mainFontFace === "function")
                ? $gameSystem.mainFontFace()
                : "sans-serif";
            this.contents.fontSize = 18;
            this.contents.textColor = "#e0e0e0";
            this.contents.outlineColor = "#000000";
            this.contents.outlineWidth = 3;
        }
    }

    drawTitleBlock() {
        const rect = this.titleRect();
        this.resetFontSettings();
        if (this.contents) {
            this.contents.textColor = "#61afef";
            this.contents.fontSize = 18;
        }
        const title = this.loc("subcom.terminal_title", "TERMINAL SUBCOM");
        if (typeof this.drawText === "function") {
            this.drawText(`📡 ${title}`, rect.x, rect.y, rect.width, "left");
        }
    }

    drawStatusBlock() {
        const rect = this.statusRect();
        this.resetFontSettings();
        if (this.contents) {
            this.contents.fontSize = 14;
            this.contents.textColor = this.hasActiveCall ? "#f87171" : "#98c379";
        }
        let statusText = "";
        if (this.hasActiveCall) {
            const caller = this.getCallerDisplayName(this.activeCall);
            const prefix = this.loc("subcom.status_incoming", "APPEL ENTRANT :");
            statusText = `${prefix} ${caller}`;
        } else {
            statusText = this.loc("subcom.status_idle", "Fréquence libre — En attente");
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
        if (typeof this.changePaintOpacity === "function") {
            this.changePaintOpacity(cmd.enabled);
        }

        const iconMap = {
            answer: "📞",
            reject: "📵",
            call: "📲",
            quit: "❌"
        };
        const icon = iconMap[cmd.symbol] || "▶";
        if (typeof this.drawText === "function") {
            this.drawText(`${icon}  ${cmd.name}`, rect.x + 8, rect.y, rect.width - 16, "left");
        }
    }

    // ========================================================================
    // 4. ORCHESTRATION COMMANDES
    // ========================================================================

    makeCommandList() {
        const hasActive = this.hasActiveCall;
        const canCall = !hasActive && this.hasCallableContacts;

        this.addCommand(this.loc("subcom.cmd_answer", "Répondre"), "answer", hasActive);
        this.addCommand(this.loc("subcom.cmd_reject", "Rejeter"), "reject", hasActive);
        this.addCommand(this.loc("subcom.cmd_call", "Appeler"), "call", canCall);
        this.addCommand(this.loc("subcom.cmd_quit", "Quitter"), "quit", true);
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
        this.drawStatusBlock();
    }
}

if (typeof window !== "undefined") {
    window.Window_SubcomCommand = Window_SubcomCommand;
}
if (typeof global !== "undefined") {
    global.Window_SubcomCommand = Window_SubcomCommand;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = Window_SubcomCommand;
}
