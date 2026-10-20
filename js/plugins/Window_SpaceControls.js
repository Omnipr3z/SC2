//=============================================================================
// RPG Maker MZ - Window_SpaceControls
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Barre de commandes d'actions spatiales et navigation multi-échelles.
 * @author SimCraft
 *
 * @help Window_SpaceControls.js
 */

const _BaseWindowControls = typeof Window_HorzCommand !== "undefined" ? Window_HorzCommand : (typeof Window_Command !== "undefined" ? Window_Command : (typeof Window_Base !== "undefined" ? Window_Base : Object));

class Window_SpaceControls extends _BaseWindowControls {
    constructor(rect) {
        super(rect);
        this.opacity = 0;
    }

    setCommands(cmds) {
        const lastSymbol = typeof this.currentSymbol === "function" ? this.currentSymbol() : null;
        this._commandsConfig = cmds || [];
        if (typeof this.refresh === "function") this.refresh();
        const newIndex = (lastSymbol && typeof this.findSymbol === "function") ? this.findSymbol(lastSymbol) : 0;
        if (typeof this.select === "function") this.select(newIndex >= 0 ? newIndex : 0);
        if (typeof this.activate === "function") this.activate();
    }

    makeCommandList() {
        if (!Array.isArray(this._commandsConfig)) return;
        this._commandsConfig.forEach(cmd => {
            this.addCommand(cmd.name, cmd.symbol, cmd.enabled !== false);
        });
    }

    maxCols() {
        return Math.max(1, (this._commandsConfig ? this._commandsConfig.length : 1));
    }
}

window.Window_SpaceControls = Window_SpaceControls;
if (typeof global !== 'undefined') {
    global.Window_SpaceControls = Window_SpaceControls;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Window_SpaceControls };
}
