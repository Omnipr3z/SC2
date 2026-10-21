//=============================================================================
// SimCraft 4 - Game_Faction
// SC4_Game_Faction.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Modèle d'instance unitaire de Faction (Affinité, Balance de Pouvoir, Diplomatie).
 * @author SimCraft
 * @help SC4_Game_Faction.js
 */

class Game_Faction {
    constructor(data = {}) {
        this._id = data.id || 0;
        this._affinity = (typeof data.affinity === "number") ? data.affinity : 0;
        this._powerBalance = (typeof data.powerBalance === "number") ? data.powerBalance : 0;
        this._diplomacy = data.diplomacy ? JSON.parse(JSON.stringify(data.diplomacy)) : {};
    }

    get id() {
        return this._id;
    }

    get name() {
        const dataFactions = (typeof $dataFactions !== "undefined" && $dataFactions)
            ? $dataFactions
            : (typeof window !== "undefined" ? window.$dataFactions : null);
        if (dataFactions) {
            const df = dataFactions[this._id];
            if (df && df.name) return df.name;
        }
        return `Faction #${this._id}`;
    }

    get description() {
        const dataFactions = (typeof $dataFactions !== "undefined" && $dataFactions)
            ? $dataFactions
            : (typeof window !== "undefined" ? window.$dataFactions : null);
        if (dataFactions) {
            const df = dataFactions[this._id];
            if (df && df.description) return df.description;
        }
        return "";
    }

    get affinity() {
        return this._affinity;
    }

    set affinity(val) {
        this._affinity = Math.max(-100, Math.min(100, Number(val) || 0));
    }

    get powerBalance() {
        return this._powerBalance;
    }

    set powerBalance(val) {
        this._powerBalance = Math.max(-100, Math.min(100, Number(val) || 0));
    }

    get diplomacy() {
        return this._diplomacy;
    }

    changeAffinity(delta) {
        this.affinity = this._affinity + (Number(delta) || 0);
        return this._affinity;
    }

    changePowerBalance(delta) {
        this.powerBalance = this._powerBalance + (Number(delta) || 0);
        return this._powerBalance;
    }

    relationWith(targetFactionId) {
        const key = String(targetFactionId);
        return this._diplomacy[key] || { affinity: 0, powerBalance: 0 };
    }

    setRelationWith(targetFactionId, affinity, powerBalance) {
        const key = String(targetFactionId);
        const aff = Math.max(-100, Math.min(100, Number(affinity) || 0));
        const pow = Math.max(-100, Math.min(100, Number(powerBalance) || 0));
        this._diplomacy[key] = { affinity: aff, powerBalance: pow };
    }
}

if (typeof window !== "undefined") {
    window.Game_Faction = Game_Faction;
    window.SC4_Game_Faction = Game_Faction;
}
if (typeof global !== "undefined") {
    global.Game_Faction = Game_Faction;
    global.SC4_Game_Faction = Game_Faction;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Game_Faction };
}
