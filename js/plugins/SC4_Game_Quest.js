//=============================================================================
// RPG Maker MZ - SC4_Game_Quest
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Modèle unitaire de quête, contrat et prime.
 * @author SimCraft
 * @base SC4_Game_QuestLocation
 * 
 * @help SC4_Game_Quest.js
 */

class Game_Quest {
    constructor(data) {
        this._id = data.id;
        this._name = data.name || "Quête sans nom";
        this._description = data.description || "";
        this._iconName = data.iconName || "mapIcon_qust";
        this._triggerTimestamp = typeof data.triggerTimestamp === "number" ? data.triggerTimestamp : 0;
        this._triggerPoiLocated = data.triggerPoiLocated || null;
        this._alertTxt = Array.isArray(data.alertTxt) ? [...data.alertTxt] : [];
        this._active = data.active === true;
        this._completed = false;
        this._failed = false;

        // Classification & Récurrence
        this._recurring = data.recurring === true || data.repeatable === true;
        this._category = data.category || (this._recurring ? "recurring" : (data.id === 1 ? "main" : "secondary"));
        this._completedCount = typeof data.completedCount === "number" ? data.completedCount : (typeof data.completionsCount === "number" ? data.completionsCount : 0);
        this._lastCompletedTimestamp = typeof data.lastCompletedTimestamp === "number" ? data.lastCompletedTimestamp : null;

        // Délais calendaires & Compte à rebours
        this._deadlineDuration = typeof data.deadlineDuration === "number" ? data.deadlineDuration : (typeof data.timeLimit === "number" ? data.timeLimit : null);
        this._deadlineTimestamp = typeof data.deadlineTimestamp === "number" ? data.deadlineTimestamp : null;
        if (!this._deadlineTimestamp && this._deadlineDuration && this._active) {
            const now = window.$gameDate ? window.$gameDate.timestamp : (this._triggerTimestamp || 0);
            this._deadlineTimestamp = now + this._deadlineDuration;
        }

        // Suivi de quête activé / désactivé sur carte
        this._isTracking = data.isTracking !== false;

        // Récompenses de mission & visibilité
        this._rewards = data.rewards || null;
        this._rewardVisible = data.rewardVisible !== false;
        this._rewardsDistributed = false;

        this._locations = [];
        if (Array.isArray(data.locations)) {
            this._locations = data.locations.map(loc => new Game_QuestLocation(loc));
        }
    }

    get id() { return this._id; }
    get name() {
        const def = typeof SC4_Localization !== "undefined" ? SC4_Localization.getText("quest.default_name", "Quête sans nom") : "Quête sans nom";
        const raw = this._name || def;
        return typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(raw) : raw;
    }
    get description() {
        const raw = this._description || "";
        return typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(raw) : raw;
    }
    get iconName() { return this._iconName; }
    get triggerTimestamp() { return this._triggerTimestamp; }
    get triggerPoiLocated() { return this._triggerPoiLocated; }
    get alertTxt() {
        if (!Array.isArray(this._alertTxt)) return [];
        return this._alertTxt.map(item => {
            if (typeof item === "string") {
                return { style: "info", txt: typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(item) : item };
            }
            return {
                style: item.style || "info",
                txt: typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(item.txt) : item.txt
            };
        });
    }
    get active() { return this._active && !this._completed && !this._failed; }
    get completed() { return this._completed; }
    get failed() { return this._failed; }
    get category() { return this._category; }
    set category(val) { this._category = val; }
    get recurring() { return this._recurring; }
    isRecurring() { return this._recurring; }
    get completedCount() { return this._completedCount; }
    get isTracking() { return this._isTracking; }
    get deadlineTimestamp() { return this._deadlineTimestamp; }
    get deadlineDuration() { return this._deadlineDuration; }

    hasDeadline() {
        return typeof this._deadlineTimestamp === "number" && this._deadlineTimestamp > 0;
    }

    remainingTime() {
        if (!this.hasDeadline()) return null;
        const cur = window.$gameDate ? window.$gameDate.timestamp : 0;
        return Math.max(0, this._deadlineTimestamp - cur);
    }

    remainingTimeString() {
        const rem = this.remainingTime();
        if (rem === null) return "";
        if (rem <= 0) {
            return typeof SC4_Localization !== "undefined" ? SC4_Localization.getText("quest.expired", "Expiré") : "Expiré";
        }
        const days = Math.floor(rem / 1440);
        const hours = Math.floor((rem % 1440) / 60);
        const mins = rem % 60;
        if (days > 0) return `${days}j ${String(hours).padStart(2, "0")}h`;
        return `${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`;
    }

    toggleTracking() {
        this._isTracking = !this._isTracking;
        return this._isTracking;
    }

    setTracking(val) {
        this._isTracking = !!val;
    }

    checkDeadline() {
        if (this.hasDeadline() && this.active) {
            const cur = window.$gameDate ? window.$gameDate.timestamp : 0;
            if (cur >= this._deadlineTimestamp) {
                this.fail();
                const loc = (k, d) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, d) : d;
                if (window.$systemMapManager) {
                    window.$systemMapManager.log("alert", `⚠️ ${loc("quest.deadline_failed", "Délai expiré : Mission échouée")} [${this.name}]`);
                }
                return true;
            }
        }
        return false;
    }

    get locations() { return this._locations; }
    get rewardVisible() { return this._rewardVisible; }
    get rewards() { return this.normalizeRewards(this._rewards); }

    normalizeRewards(raw) {
        if (!raw) return null;
        let gold = 0;
        const items = [];
        const list = Array.isArray(raw) ? raw : [raw];

        list.forEach(entry => {
            if (!entry || typeof entry !== "object") return;
            if (typeof entry.gold === "number") gold += entry.gold;
            if (typeof entry.credits === "number") gold += entry.credits;

            if (Array.isArray(entry.items)) {
                entry.items.forEach(it => {
                    const id = it.itemId !== undefined ? it.itemId : (it.item_id !== undefined ? it.item_id : it.id);
                    const qty = it.quantity || it.amount || it.count || it.nombre || 1;
                    if (id !== undefined) items.push({ type: "item", id: Number(id), quantity: Number(qty) });
                });
            }
            if (Array.isArray(entry.weapons)) {
                entry.weapons.forEach(it => {
                    const id = it.weaponId !== undefined ? it.weaponId : (it.weapon_id !== undefined ? it.weapon_id : it.id);
                    const qty = it.quantity || it.amount || it.count || it.nombre || 1;
                    if (id !== undefined) items.push({ type: "weapon", id: Number(id), quantity: Number(qty) });
                });
            }
            if (Array.isArray(entry.armors)) {
                entry.armors.forEach(it => {
                    const id = it.armorId !== undefined ? it.armorId : (it.armor_id !== undefined ? it.armor_id : it.id);
                    const qty = it.quantity || it.amount || it.count || it.nombre || 1;
                    if (id !== undefined) items.push({ type: "armor", id: Number(id), quantity: Number(qty) });
                });
            }

            if (entry.itemId !== undefined || entry.item_id !== undefined) {
                const id = entry.itemId !== undefined ? entry.itemId : entry.item_id;
                const qty = entry.quantity || entry.amount || entry.count || entry.nombre || 1;
                items.push({ type: "item", id: Number(id), quantity: Number(qty) });
            }
            if (entry.weaponId !== undefined || entry.weapon_id !== undefined) {
                const id = entry.weaponId !== undefined ? entry.weaponId : entry.weapon_id;
                const qty = entry.quantity || entry.amount || entry.count || entry.nombre || 1;
                items.push({ type: "weapon", id: Number(id), quantity: Number(qty) });
            }
            if (entry.armorId !== undefined || entry.armor_id !== undefined) {
                const id = entry.armorId !== undefined ? entry.armorId : entry.armor_id;
                const qty = entry.quantity || entry.amount || entry.count || entry.nombre || 1;
                items.push({ type: "armor", id: Number(id), quantity: Number(qty) });
            }
        });

        if (gold === 0 && items.length === 0) return null;
        return { gold, items };
    }

    activate() {
        this._active = true;
        if (this._deadlineDuration && !this._deadlineTimestamp) {
            const now = window.$gameDate ? window.$gameDate.timestamp : 0;
            this._deadlineTimestamp = now + this._deadlineDuration;
        }
    }

    deactivate() { this._active = false; }

    complete() {
        if (this._completed) return;
        this._completed = true;
        this._completedCount++;
        if (window.$gameDate) {
            this._lastCompletedTimestamp = window.$gameDate.timestamp;
        }
        this._locations.forEach(loc => loc.complete());
        this.distributeRewards();
    }

    restart() {
        if (!this._recurring) return false;
        this._completed = false;
        this._failed = false;
        this._active = true;
        this._rewardsDistributed = false;
        if (this._deadlineDuration) {
            const now = window.$gameDate ? window.$gameDate.timestamp : 0;
            this._deadlineTimestamp = now + this._deadlineDuration;
        }
        this._locations.forEach(loc => {
            loc._completed = false;
            loc._active = true;
        });
        return true;
    }

    distributeRewards() {
        if (this._rewardsDistributed) return;
        const r = this.rewards;
        if (!r) {
            this._rewardsDistributed = true;
            return;
        }

        // 1. Crédits / Or vers la party
        if (r.gold > 0 && window.$gameParty && typeof $gameParty.gainGold === "function") {
            $gameParty.gainGold(r.gold);
        }

        // 2. Point de livraison <stock:[INVENTORY_ID]> sur l'acteur leader (défaut 'C_1')
        let stockId = "C_1";
        if (window.$gameParty && typeof $gameParty.leader === "function") {
            const leader = $gameParty.leader();
            if (leader && leader.actor()) {
                const note = leader.actor().note || "";
                const match = note.match(/<stock:\s*([^>]+)>/i);
                if (match) stockId = match[1].trim();
            }
            if (stockId === "C_1" && typeof $gameParty.members === "function") {
                for (const actor of $gameParty.members()) {
                    if (actor && actor.actor()) {
                        const note = actor.actor().note || "";
                        const match = note.match(/<stock:\s*([^>]+)>/i);
                        if (match) {
                            stockId = match[1].trim();
                            break;
                        }
                    }
                }
            }
        }

        // 3. Objets délivrés au container de stock
        const container = (window.$inventories && typeof $inventories.inventory === "function") 
            ? $inventories.inventory(stockId) 
            : null;

        if (Array.isArray(r.items)) {
            r.items.forEach(it => {
                let itemObj = null;
                if (it.type === "item" && typeof $dataItems !== "undefined") itemObj = $dataItems[it.id];
                else if (it.type === "weapon" && typeof $dataWeapons !== "undefined") itemObj = $dataWeapons[it.id];
                else if (it.type === "armor" && typeof $dataArmors !== "undefined") itemObj = $dataArmors[it.id];

                if (itemObj) {
                    if (container && typeof container.gainItem === "function") {
                        container.gainItem(itemObj, it.quantity);
                    } else if (window.$gameParty && typeof $gameParty.gainItem === "function") {
                        $gameParty.gainItem(itemObj, it.quantity);
                    }
                }
            });
        }

        this._rewardsDistributed = true;
    }

    fail() {
        this._failed = true;
    }

    activeLocations() {
        if (!this.active) return [];
        return this._locations.filter(loc => loc.active);
    }

    location(locId) {
        return this._locations.find(l => l.id === locId) || null;
    }

    makeSavefileData() {
        return {
            id: this._id,
            category: this._category,
            recurring: this._recurring,
            completedCount: this._completedCount,
            lastCompletedTimestamp: this._lastCompletedTimestamp,
            deadlineTimestamp: this._deadlineTimestamp,
            deadlineDuration: this._deadlineDuration,
            isTracking: this._isTracking,
            active: this._active,
            completed: this._completed,
            failed: this._failed,
            rewardsDistributed: this._rewardsDistributed,
            locations: this._locations.map(l => l.makeSavefileData())
        };
    }

    loadSavefileData(data) {
        if (!data) return;
        if (data.category) this._category = data.category;
        if (typeof data.recurring === "boolean") this._recurring = data.recurring;
        if (typeof data.completedCount === "number") this._completedCount = data.completedCount;
        if (typeof data.lastCompletedTimestamp === "number") this._lastCompletedTimestamp = data.lastCompletedTimestamp;
        if (typeof data.deadlineTimestamp === "number") this._deadlineTimestamp = data.deadlineTimestamp;
        if (typeof data.deadlineDuration === "number") this._deadlineDuration = data.deadlineDuration;
        if (typeof data.isTracking === "boolean") this._isTracking = data.isTracking;
        if (typeof data.active === "boolean") this._active = data.active;
        if (typeof data.completed === "boolean") this._completed = data.completed;
        if (typeof data.failed === "boolean") this._failed = data.failed;
        if (typeof data.rewardsDistributed === "boolean") this._rewardsDistributed = data.rewardsDistributed;
        if (Array.isArray(data.locations)) {
            data.locations.forEach(lData => {
                const loc = this.location(lData.id);
                if (loc) loc.loadSavefileData(lData);
            });
        }
    }

    updateLocaleData(data) {
        if (!data) return;
        if (data.name) this._name = data.name;
        if (data.description) this._description = data.description;
        if (data.category) this._category = data.category;
        if (typeof data.recurring === "boolean") this._recurring = data.recurring;
        if (data.rewards !== undefined) this._rewards = data.rewards;
        if (data.rewardVisible !== undefined) this._rewardVisible = data.rewardVisible;
        if (Array.isArray(data.alertTxt)) this._alertTxt = [...data.alertTxt];
        if (Array.isArray(data.locations)) {
            data.locations.forEach(lData => {
                const loc = this.location(lData.id);
                if (loc) {
                    if (lData.name) loc._name = lData.name;
                    if (lData.description) loc._description = lData.description;
                }
            });
        }
    }
}

// ============================================================================
// 2. GESTIONNAIRE DE QUÊTES ($gameQuests)
// ============================================================================

window.Game_Quest = Game_Quest;
if (typeof global !== "undefined") {
    global.Game_Quest = Game_Quest;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Game_Quest };
}
