//=============================================================================
// SimCraft 4 - Game_Factions
// SC4_Game_Factions.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Registre gestionnaire de l'ensemble des factions ($gameFactions).
 * @author SimCraft
 * @help SC4_Game_Factions.js
 */

class Game_Factions {
    constructor() {
        this._data = {};
        this.initialize();
    }

    initialize() {
        this._data = {};
        const dataFactions = (typeof $dataFactions_PHYSICAL !== "undefined" && $dataFactions_PHYSICAL)
            ? $dataFactions_PHYSICAL
            : ((typeof $dataFactions !== "undefined" && $dataFactions)
                ? $dataFactions
                : (typeof window !== "undefined" ? (window.$dataFactions_PHYSICAL || window.$dataFactions) : null));

        if (Array.isArray(dataFactions)) {
            for (let i = 1; i < dataFactions.length; i++) {
                const df = dataFactions[i];
                if (df && df.id) {
                    this._data[df.id] = new Game_Faction(df);
                }
            }
        }
    }

    faction(id) {
        let numId = Number(id);
        if (numId == 0) numId = 1;
        if (!this._data[numId]) {
            this._data[numId] = new Game_Faction({ id: numId });
        }
        return this._data[numId];
    }

    all() {
        return Object.values(this._data);
    }

    affinity(factionId) {
        const f = this.faction(factionId);
        return f ? f.affinity : 0;
    }

    setAffinity(factionId, val) {
        const f = this.faction(factionId);
        if (f) f.affinity = val;
    }

    changeAffinity(factionId, delta) {
        const f = this.faction(factionId);
        return f ? f.changeAffinity(delta) : 0;
    }

    powerBalance(factionId) {
        const f = this.faction(factionId);
        return f ? f.powerBalance : 0;
    }

    setPowerBalance(factionId, val) {
        const f = this.faction(factionId);
        if (f) f.powerBalance = val;
    }

    changePowerBalance(factionId, delta) {
        const f = this.faction(factionId);
        return f ? f.changePowerBalance(delta) : 0;
    }

    makeSavefileData() {
        const save = {};
        for (const [id, f] of Object.entries(this._data)) {
            save[id] = {
                affinity: f.affinity,
                powerBalance: f.powerBalance,
                diplomacy: f.diplomacy
            };
        }
        return save;
    }

    extractSavefileData(save) {
        if (!save || typeof save !== "object") return;
        for (const [id, data] of Object.entries(save)) {
            const f = this.faction(id);
            if (f) {
                if (typeof data.affinity === "number") f.affinity = data.affinity;
                if (typeof data.powerBalance === "number") f.powerBalance = data.powerBalance;
                if (data.diplomacy) f._diplomacy = JSON.parse(JSON.stringify(data.diplomacy));
            }
        }
    }
}

// Initialisation globale
window.Game_Factions = Game_Factions;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game_Factions;
}
