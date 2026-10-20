//=============================================================================
// RPG Maker MZ - SC4_Game_Spaceships
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Registre gestionnaire de flotte de vaisseaux ($gameSpaceships).
 * @author SimCraft
 * @base SC4_Game_Spaceship
 * 
 * @help SC4_Game_Spaceships.js
 */

class Game_Spaceships {
    constructor() {
        this._data = [];
        this.initShips();
    }

    initShips() {
        const rawShips = window.$dataSpaceships || [];
        this._data = [];
        rawShips.forEach((s) => {
            if (s && typeof s === "object") {
                this._data.push(new Game_Spaceship(s));
            }
        });
        this._data.forEach(s => {
            if (s && typeof s.syncHostPosition === "function") {
                s.syncHostPosition();
            }
        });
    }

    spaceships() {
        if (this._data.length === 0 && Array.isArray(window.$dataSpaceships) && window.$dataSpaceships.length > 0) {
            this.initShips();
        }
        return this._data.filter(s => Boolean(s));
    }

    ship(id) {
        if (id === null || id === undefined) return null;
        const numId = Number(id);
        return this.spaceships().find(s => s && s.id === numId) || null;
    }

    playerShip() {
        const ships = this.spaceships();
        if (ships.length === 0) return null;
        if (window.$gameParty && typeof $gameParty.leader === "function" && $gameParty.leader()) {
            const leaderId = $gameParty.leader().actorId();
            const found = ships.find(s => s.captainId === leaderId);
            if (found) return found;
        }
        return ships[0];
    }

    makeSavefileData() {
        return this.spaceships().map(s => s.makeSavefileData());
    }

    loadSavefileData(data) {
        if (Array.isArray(data)) {
            const list = this.spaceships();
            data.forEach((sData, idx) => {
                if (list[idx]) list[idx].loadSavefileData(sData);
            });
            list.forEach(s => {
                if (s && typeof s.syncHostPosition === "function") {
                    s.syncHostPosition();
                }
            });
        }
    }
}
if (typeof window !== "undefined") {
    window.Game_Spaceships = Game_Spaceships;
}

window.Game_Spaceships = Game_Spaceships;
if (typeof global !== "undefined") {
    global.Game_Spaceships = Game_Spaceships;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Game_Spaceships };
}
