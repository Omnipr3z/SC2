//=============================================================================
// SC4_QuestManager.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Gestionnaire de quêtes multi-échelles, balises galactiques et StoryManager.
 * @author SimCraft
 * 
 * @command openQuestBook
 * @text Ouvrir le Livre de Quêtes
 * @desc Ouvre le Datapad / Livre de Quêtes affichant toutes les missions, objectifs et transmissions.
 * 
 * @help
 * ============================================================================
 * SC4_QuestManager.js
 * ============================================================================
 * Fournit la séparation stricte des responsabilités demandée :
 * 
 * 1. Game_Quests ($gameQuests) :
 *    - Registre de quêtes et suivi de progression.
 *    - Localisations hiérarchiques et multiples :
 *      Secteur -> Système -> Planète/Sous-système -> Point d'intérêt (POI).
 *    - Filtrage des balises visuelles selon l'échelle :
 *      • hasIndicatorForSystem(systemId) (Carte Galactique)
 *      • hasIndicatorForPlanet(planetId) (Carte du Système)
 *      • hasIndicatorForPoi(poiId)       (Carte du Sous-système)
 *    - Activation / Désactivation dynamique d'objectifs intermédiaires.
 * 
 * 2. StoryManager ($storyManager) :
 *    - Déclencheur temporel et scénaristique.
 *    - Écoute $gameDate.timestamp pour amorcer les transmissions et quêtes.
 *    - Envoie les messages au terminal CRT de vol via $systemMapManager.log().
 * 
 * 3. Livre de Quêtes / Datapad (Scene_QuestBook) :
 *    - Interface complète de consultation des missions (actives, terminées, toutes).
 *    - Affichage des briefings, journaux de transmission et objectifs géolocalisés.
 *    - Accès rapide par script : SC4.openQuestBook() ou SceneManager.openQuestBook().
 *    - Commande d'événement RMMZ : openQuestBook.
 * 
 * 4. Persistance complète dans les sauvegardes via SC_DataManager.
 * ============================================================================
 */

// ============================================================================
// 1. MODÈLES : LOCALISATION & QUÊTE
// ============================================================================

class Game_QuestLocation {
    constructor(data) {
        this._id = data.id || "loc_0";
        this._name = data.name || "Objectif";
        this._description = data.description || "";
        this._sectorId = typeof data.sectorId === "number" ? data.sectorId : 0;
        this._systemId = typeof data.systemId === "number" ? data.systemId : 0;
        this._planetId = data.planetId !== undefined ? data.planetId : null;
        this._poiId = data.poiId || null;
        this._active = data.active !== false;
        this._completed = data.completed === true;
    }

    get id() { return this._id; }
    get name() {
        const def = typeof SC4_Localization !== "undefined" ? SC4_Localization.getText("quest.default_objective", "Objectif") : "Objectif";
        const raw = this._name || def;
        return typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(raw) : raw;
    }
    get description() {
        const raw = this._description || "";
        return typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(raw) : raw;
    }
    get sectorId() { return this._sectorId; }
    get systemId() { return this._systemId; }
    get planetId() { return this._planetId; }
    get poiId() { return this._poiId; }
    get active() { return this._active && !this._completed; }
    get completed() { return this._completed; }

    activate() { this._active = true; }
    deactivate() { this._active = false; }
    complete() { this._completed = true; }

    makeSavefileData() {
        return {
            id: this._id,
            active: this._active,
            completed: this._completed
        };
    }

    loadSavefileData(data) {
        if (data) {
            if (typeof data.active === "boolean") this._active = data.active;
            if (typeof data.completed === "boolean") this._completed = data.completed;
        }
    }
}

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

class Game_Quests {
    constructor() {
        this._quests = [];
        this.initQuests();
    }

    initQuests() {
        const raw = window.$dataQuests || [];
        this._quests = [];
        this._questMap = new Map();
        raw.forEach((q, idx) => {
            if (q && typeof q === "object") {
                const quest = new Game_Quest(q);
                this._quests.push(quest);
                this._questMap.set(quest.id, quest);
            }
        });
    }

    onLocaleChanged(lang) {
        const upper = (lang || (typeof SC4_Localization !== "undefined" ? SC4_Localization.locale() : "FR")).toUpperCase();
        const raw = (upper === "EN" ? window.$dataQuests_EN : window.$dataQuests_FR) || window.$dataQuests || [];
        if (Array.isArray(raw)) {
            raw.forEach(qData => {
                if (!qData || typeof qData !== "object") return;
                const q = this.quest(qData.id);
                if (q) {
                    q.updateLocaleData(qData);
                }
            });
        }
    }

    quests() {
        if (this._quests.length === 0 && Array.isArray(window.$dataQuests) && window.$dataQuests.length > 0) {
            this.initQuests();
        }
        return this._quests;
    }

    quest(questId) {
        if (questId === null || questId === undefined) return null;
        if (this._quests.length === 0 && Array.isArray(window.$dataQuests) && window.$dataQuests.length > 0) {
            this.initQuests();
        }
        return this._questMap ? (this._questMap.get(questId) || null) : (this.quests().find(q => q && q.id === questId) || null);
    }

    activeQuests() {
        return this.quests().filter(q => q.active);
    }

    // --- RECHERCHE MULTI-ÉCHELLES DES BALISES (FILTRÉES PAR SUIVI ACTIF) ---

    /**
     * Vérifie si un système solaire contient au moins un objectif actif et suivi.
     */
    hasIndicatorForSystem(systemId) {
        return this.activeQuests().some(q =>
            q.isTracking && q.activeLocations().some(loc => loc.systemId === systemId)
        );
    }

    getIndicatorsForSystem(systemId) {
        const indicators = [];
        this.activeQuests().forEach(q => {
            if (!q.isTracking) return;
            q.activeLocations().forEach(loc => {
                if (loc.systemId === systemId) {
                    indicators.push({ quest: q, location: loc });
                }
            });
        });
        return indicators;
    }

    /**
     * Vérifie si une planète contient au moins un objectif actif et suivi.
     */
    hasIndicatorForPlanet(planetId) {
        return this.activeQuests().some(q =>
            q.isTracking && q.activeLocations().some(loc => loc.planetId === planetId)
        );
    }

    getIndicatorsForPlanet(planetId) {
        const indicators = [];
        this.activeQuests().forEach(q => {
            if (!q.isTracking) return;
            q.activeLocations().forEach(loc => {
                if (loc.planetId === planetId) {
                    indicators.push({ quest: q, location: loc });
                }
            });
        });
        return indicators;
    }

    /**
     * Vérifie si un POI précis contient un objectif actif et suivi.
     */
    hasIndicatorForPoi(poiId) {
        if (!poiId) return false;
        if (window.$gameSystem && typeof window.$gameSystem.isPoiLocated === "function") {
            if (!window.$gameSystem.isPoiLocated(poiId)) return false;
        }
        return this.activeQuests().some(q =>
            q.isTracking && q.activeLocations().some(loc => loc.poiId === poiId)
        );
    }

    getIndicatorsForPoi(poiId) {
        if (!poiId) return [];
        const indicators = [];
        this.activeQuests().forEach(q => {
            if (!q.isTracking) return;
            q.activeLocations().forEach(loc => {
                if (loc.poiId === poiId) {
                    indicators.push({ quest: q, location: loc });
                }
            });
        });
        return indicators;
    }

    makeSavefileData() {
        return this.quests().map(q => q.makeSavefileData());
    }

    loadSavefileData(data) {
        if (Array.isArray(data)) {
            data.forEach(qData => {
                const quest = this.quest(qData.id);
                if (quest) quest.loadSavefileData(qData);
            });
        }
    }
}

// ============================================================================
// 3. STORY MANAGER : DÉCLENCHEUR TEMPOREL & SCÉNARISTIQUE
// ============================================================================

class StoryManager {
    constructor() {
        this._triggeredQuests = new Set();
    }

    update() {
        if (!window.$gameDate || !window.$gameQuests) return;
        const currentTimestamp = window.$gameDate.timestamp;

        window.$gameQuests.quests().forEach(quest => {
            // Échéance calendaire & Auto-échec si délai expiré
            if (quest.active && quest.hasDeadline()) {
                quest.checkDeadline();
            }

            // Déclenchement automatique selon conditions temporelles et cartographiques
            if (!quest.active && !quest.completed && !quest.failed && !this._triggeredQuests.has(quest.id)) {
                let timeOk = !quest.triggerTimestamp || currentTimestamp >= quest.triggerTimestamp;
                let poiOk = true;
                if (quest.triggerPoiLocated) {
                    poiOk = window.$gameSystem && typeof window.$gameSystem.isPoiLocated === "function"
                        ? window.$gameSystem.isPoiLocated(quest.triggerPoiLocated)
                        : false;
                }
                if (timeOk && poiOk) {
                    this.startQuest(quest.id);
                }
            }
        });
    }

    startQuest(questId) {
        const quest = window.$gameQuests ? window.$gameQuests.quest(questId) : null;
        if (!quest) return;

        this._triggeredQuests.add(questId);
        quest.activate();

        // Envoi des alertes radio / astropathiques au terminal de vol
        if (quest.alertTxt && Array.isArray(quest.alertTxt) && window.$systemMapManager) {
            quest.alertTxt.forEach(item => {
                window.$systemMapManager.log(item.style || "info", item.txt);
            });
        }
    }

    makeSavefileData() {
        return {
            triggeredQuests: Array.from(this._triggeredQuests)
        };
    }

    loadSavefileData(data) {
        this._triggeredQuests.clear();
        if (data && Array.isArray(data.triggeredQuests)) {
            data.triggeredQuests.forEach(id => this._triggeredQuests.add(id));
        }
    }
}

// Instances globales
window.$gameQuests = new Game_Quests();
window.$storyManager = new StoryManager();

// ============================================================================
// 4. INTERFACE GRAPHIQUE : LIVRE DE QUÊTES & DATAPAD (Scene_QuestBook)
// ============================================================================

class Window_QuestBookHeader extends Window_Base {
    constructor(rect) {
        super(rect);
        this.opacity = 240;
        this.refresh();
    }

    loadWindowskin() {
        if (ImageManager.loadSystem) {
            this.windowskin = ImageManager.loadSystem("Prompt") || ImageManager.loadSystem("Window");
        }
    }

    resetFontSettings() {
        this.contents.fontFace = $gameSystem ? $gameSystem.mainFontFace() : "sans-serif";
        this.contents.fontSize = 18;
        this.contents.textColor = "#e0e0e0";
        this.contents.outlineColor = "#000000";
        this.contents.outlineWidth = 3;
    }

    refresh() {
        this.contents.clear();
        this.resetFontSettings();

        // Titre Datapad
        this.contents.textColor = "#8ec07c";
        const titleText = typeof SC4_Localization !== "undefined" ? SC4_Localization.getText("quest.header", "DATAPAD IMPÉRIAL ▷ REGISTRE DES MISSIONS & TRANSMISSIONS") : "DATAPAD IMPÉRIAL ▷ REGISTRE DES MISSIONS & TRANSMISSIONS";
        this.drawText(titleText, 12, 0, this.contentsWidth() - 320, "left");

        // Horloge 40K
        const timeStr = window.$gameDate ? Game_DateFormatter.format40K($gameDate) : "";
        this.contents.textColor = "#fabd2f";
        this.drawText(timeStr, this.contentsWidth() - 300, 0, 280, "right");
    }
}

class Window_QuestFilter extends Window_HorzCommand {
    constructor(rect) {
        super(rect);
    }

    maxCols() {
        return 4;
    }

    makeCommandList() {
        const qm = window.$gameQuests;
        const allQuests = qm ? qm.quests() : [];
        const activeCount = allQuests.filter(q => q.active).length;
        const recurringCount = allQuests.filter(q => q.recurring).length;
        const completedCount = allQuests.filter(q => q.completed).length;
        const totalCount = allQuests.length;

        const loc = (key, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(key, def) : def;
        const activeLbl = loc("quest.filter_active", "En cours");
        const recLbl = loc("quest.filter_recurring", "Contrats");
        const compLbl = loc("quest.filter_completed", "Terminées");
        const allLbl = loc("quest.filter_all", "Toutes");

        this.addCommand(`${activeLbl} (${activeCount})`, "active");
        this.addCommand(`${recLbl} (${recurringCount})`, "recurring");
        this.addCommand(`${compLbl} (${completedCount})`, "completed");
        this.addCommand(`${allLbl} (${totalCount})`, "all");
    }
}

class Window_QuestList extends Window_Selectable {
    constructor(rect) {
        super(rect);
        this._filter = "active";
        this._data = [];
        this._detailWindow = null;
        this._onCycleFilter = null;
        this.refresh();
    }

    setDetailWindow(detailWindow) {
        this._detailWindow = detailWindow;
        this.updateDetail();
    }

    setFilter(filter) {
        if (this._filter !== filter) {
            this._filter = filter;
            this.refresh();
            this.select(0);
        }
    }

    maxItems() {
        return this._data ? this._data.length : 0;
    }

    item() {
        return this._data && this.index() >= 0 ? this._data[this.index()] : null;
    }

    itemHeight() {
        return 48;
    }

    makeItemList() {
        const qm = window.$gameQuests;
        const all = qm ? qm.quests() : [];
        if (this._filter === "active") {
            this._data = all.filter(q => q.active);
        } else if (this._filter === "recurring") {
            this._data = all.filter(q => q.recurring);
        } else if (this._filter === "completed") {
            this._data = all.filter(q => q.completed);
        } else {
            this._data = [...all];
        }
    }

    refresh() {
        this.makeItemList();
        super.refresh();
        this.updateDetail();
    }

    drawItem(index) {
        const quest = this._data[index];
        if (!quest) return;

        const rect = this.itemLineRect(index);
        this.contents.fontFace = $gameSystem ? $gameSystem.mainFontFace() : "sans-serif";
        this.contents.outlineColor = "#000000";
        this.contents.outlineWidth = 3;

        // Détermination du code couleur par catégorie / état
        let itemColor = "#ebdbb2";
        let marker = "◈";
        if (quest.failed) {
            itemColor = "#fb4934";
            marker = "✖";
        } else if (quest.completed) {
            itemColor = "#8ec07c";
            marker = "✔";
        } else if (quest.recurring) {
            itemColor = "#b8bb26"; // Vert émeraude contrat récurrent
            marker = "🔄";
        } else if (quest.category === "secondary" || quest.category === "side") {
            itemColor = "#83a598"; // Cyan quête secondaire
            marker = "📜";
        } else if (quest.category === "bounty") {
            itemColor = "#fe8019"; // Orange prime de recherche
            marker = "🎯";
        } else {
            itemColor = "#fabd2f"; // Doré quête principale
            marker = "👑";
        }

        // Puce et Pin de suivi
        const trackPin = quest.isTracking ? "📌" : "◌";
        this.contents.fontSize = 13;
        this.contents.textColor = quest.isTracking ? "#8ec07c" : "#7c6f64";
        this.drawText(trackPin, rect.x, rect.y + 4, 18, "center");

        this.contents.fontSize = 14;
        this.contents.textColor = itemColor;
        this.drawText(marker, rect.x + 20, rect.y + 4, 20, "center");

        // Titre + compteur de répétition
        let titleTxt = quest.name;
        if (quest.recurring && quest.completedCount > 0) {
            titleTxt += ` (x${quest.completedCount})`;
        }
        this.contents.fontSize = 14;
        this.contents.textColor = quest.completed ? "#a89984" : itemColor;
        const titleW = rect.width - 150;
        this.drawText(titleTxt, rect.x + 44, rect.y + 4, titleW, "left");

        // Badge objectifs ou délai restant
        this.contents.fontSize = 11;
        if (quest.hasDeadline() && quest.active) {
            const remStr = quest.remainingTimeString();
            const remMin = quest.remainingTime();
            this.contents.textColor = remMin <= 60 ? "#fb4934" : (remMin <= 360 ? "#fe8019" : "#b8bb26");
            this.drawText(`⏱ ${remStr}`, rect.x + rect.width - 100, rect.y + 4, 95, "right");
        } else {
            const completedLocs = quest.locations.filter(l => l.completed).length;
            const totalLocs = quest.locations.length;
            this.contents.textColor = quest.completed ? "#8ec07c" : "#83a598";
            const badgeLbl = typeof SC4_Localization !== "undefined" ? SC4_Localization.getText("quest.obj_badge", "obj.") : "obj.";
            const objTxt = totalLocs > 0 ? `${completedLocs}/${totalLocs} ${badgeLbl}` : "";
            this.drawText(objTxt, rect.x + rect.width - 70, rect.y + 4, 65, "right");
        }
    }

    select(index) {
        super.select(index);
        this.updateDetail();
    }

    updateDetail() {
        if (this._detailWindow) {
            this._detailWindow.setQuest(this.item());
        }
    }

    cursorRight() {
        if (this._onCycleFilter) this._onCycleFilter(1);
    }

    cursorLeft() {
        if (this._onCycleFilter) this._onCycleFilter(-1);
    }
}

class Window_QuestDetail extends Window_Scrollable {
    constructor(rect) {
        super(rect);
        this._quest = null;
        this.refresh();
    }

    setQuest(quest) {
        if (this._quest !== quest) {
            this._quest = quest;
            this.scrollTo(0, 0);
            this.refresh();
        }
    }

    overallHeight() {
        if (!this._quest) return this.innerHeight;
        let h = 100;
        h += 30;
        if (this._quest.hasDeadline()) h += 40;
        const descWords = (this._quest.description || "").split(" ").length;
        h += Math.max(30, Math.ceil(descWords / 12) * 22) + 20;
        if (this._quest.alertTxt && this._quest.alertTxt.length > 0) {
            h += 30 + this._quest.alertTxt.length * 26 + 20;
        }
        if (this._quest.locations && this._quest.locations.length > 0) {
            h += 30 + this._quest.locations.length * 76 + 20;
        }
        if (this._quest.rewards) {
            const r = this._quest.rewards;
            const lines = (this._quest.rewardVisible === false) ? 1 : ((r.gold > 0 ? 1 : 0) + (r.items ? r.items.length : 0));
            h += 34 + Math.max(1, lines) * 30 + 20;
        }
        return Math.max(this.innerHeight, h);
    }

    paint() {
        this.contents.clear();
        const width = this.innerWidth;
        this.contents.fontFace = $gameSystem ? $gameSystem.mainFontFace() : "sans-serif";
        this.contents.outlineColor = "#000000";
        this.contents.outlineWidth = 3;

        const loc = (key, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(key, def) : def;

        if (!this._quest) {
            this.contents.fontSize = 15;
            this.contents.textColor = "#928374";
            this.drawText(loc("quest.no_selection", "Sélectionnez une mission dans la liste à gauche."), 20, 40, width - 40, "center");
            return;
        }

        const q = this._quest;
        let curY = 8;

        // 1. Titre & Badge Catégorie
        this.contents.fontSize = 20;
        let titleColor = "#fabd2f";
        let catPill = loc("quest.category_main", "[ 👑 QUÊTE PRINCIPALE ]");
        if (q.recurring) {
            titleColor = "#b8bb26";
            catPill = loc("quest.category_recurring", "[ 🔄 CONTRAT RÉCURRENT ]");
        } else if (q.category === "secondary" || q.category === "side") {
            titleColor = "#83a598";
            catPill = loc("quest.category_secondary", "[ 📜 QUÊTE SECONDAIRE ]");
        } else if (q.category === "bounty") {
            titleColor = "#fe8019";
            catPill = loc("quest.category_bounty", "[ 🎯 AVIS DE RECHERCHE ]");
        }
        this.contents.textColor = titleColor;
        this.drawText(q.name, 16, curY, width - 32, "left");
        curY += 28;

        // Statut d'exécution & Badge Suivi & Date
        this.contents.fontSize = 13;
        let stText = loc("quest.status_not_started", "NON DÉCLENCHÉE");
        let stColor = "#928374";
        if (q.completed) {
            stText = loc("quest.status_completed", "[ MISSION ACCOMPLIE ]");
            stColor = "#8ec07c";
        } else if (q.active) {
            stText = loc("quest.status_active", "[ EN COURS D'EXÉCUTION ]");
            stColor = "#4da6ff";
        } else if (q.failed) {
            stText = loc("quest.status_failed", "[ ÉCHOUÉE ]");
            stColor = "#fb4934";
        }

        // Ligne de statut + catégorie + suivi
        this.contents.textColor = stColor;
        this.drawText(stText, 16, curY, 200, "left");

        this.contents.textColor = titleColor;
        this.drawText(catPill, 220, curY, 220, "left");

        const trackText = q.isTracking ? loc("quest.tracking_active", "[ 📌 SUIVI ACTIF ]") : loc("quest.tracking_inactive", "[ ◌ SUIVI MASQUÉ ]");
        this.contents.textColor = q.isTracking ? "#8ec07c" : "#928374";
        this.drawText(trackText, 440, curY, 180, "left");

        this.contents.textColor = "#a89984";
        const dateStr = window.$gameDate ? Game_DateFormatter.format40K($gameDate) : "";
        const dateLbl = loc("quest.date", "Date stellaire");
        this.drawText(`${dateLbl} : ${dateStr}`, width - 260, curY, 240, "right");
        curY += 22;

        // Information de récurrence si applicable
        if (q.recurring) {
            this.contents.fontSize = 12;
            this.contents.textColor = "#b8bb26";
            const recLbl = loc("quest.recurring_completed_count", "Accomplie");
            const timesLbl = loc("quest.recurring_times", "fois");
            this.drawText(`🔄 ${recLbl} : ${q.completedCount} ${timesLbl}`, 16, curY, 260, "left");
            this.contents.textColor = "#928374";
            this.drawText(loc("quest.toggle_tracking_hint", "(Entrée / Clic pour basculer le suivi)"), 280, curY, width - 296, "left");
            curY += 20;
        } else {
            this.contents.fontSize = 12;
            this.contents.textColor = "#928374";
            this.drawText(loc("quest.toggle_tracking_hint", "(Entrée / Clic pour basculer le suivi)"), 16, curY, width - 32, "left");
            curY += 20;
        }

        // 2. Encadré d'échéance & Délai limite si présent
        if (q.hasDeadline()) {
            this.contents.fillRect(16, curY + 4, width - 32, 28, "#282828");
            const remMin = q.remainingTime();
            const remStr = q.remainingTimeString();
            const isLate = remMin <= 0 || q.failed;
            const dColor = isLate ? "#fb4934" : (remMin <= 60 ? "#fb4934" : (remMin <= 360 ? "#fe8019" : "#b8bb26"));
            this.contents.fontSize = 13;
            this.contents.textColor = dColor;
            const titleDead = loc("quest.deadline_title", "◈ ÉCHÉANCE & COMPTE À REBOURS");
            const deadTxt = isLate ? `⚠ ${loc("quest.deadline_failed", "Délai expiré : Mission échouée")}` : `⏱ ${loc("quest.deadline_remaining", "Temps restant")} : ${remStr}`;
            this.drawText(`${titleDead} ▷ ${deadTxt}`, 28, curY + 6, width - 56, "left");
            curY += 36;
        }

        // Séparateur
        this.contents.fillRect(16, curY, width - 32, 2, "#504945");
        curY += 14;

        // 3. Ordres de Mission & Briefing
        this.contents.fontSize = 14;
        this.contents.textColor = "#83a598";
        this.drawText(loc("quest.briefing_title", "◈ ORDRES DE MISSION & BRIEFING TACTIQUE"), 16, curY, width - 32, "left");
        curY += 22;

        this.contents.fontSize = 13;
        this.contents.textColor = "#ebdbb2";
        curY = this.drawWrappedText(q.description || loc("quest.no_desc", "Aucun détail complémentaire fourni."), 24, curY, width - 48, 20);
        curY += 16;

        // 4. Transmissions Radio Interceptées (alertTxt)
        if (q.alertTxt && Array.isArray(q.alertTxt) && q.alertTxt.length > 0) {
            this.contents.fontSize = 14;
            this.contents.textColor = "#fe8019";
            this.drawText(loc("quest.alerts_title", "◈ COMMUNICATIONS ASTROPATHIQUES & LOGS"), 16, curY, width - 32, "left");
            curY += 22;

            q.alertTxt.forEach(item => {
                this.contents.fillRect(24, curY + 9, width - 48, 22, "#1d2021");
                this.contents.fontSize = 12;
                this.contents.textColor = item.style === "alert" ? "#fb4934" : "#b8bb26";
                this.drawText(`▶ ${item.txt}`, 30, curY, width - 60, "left");
                curY += 24;
            });
            curY += 14;
        }

        // 5. Objectifs Tactiques & Géolocalisation
        if (q.locations && Array.isArray(q.locations) && q.locations.length > 0) {
            this.contents.fontSize = 14;
            this.contents.textColor = "#8ec07c";
            this.drawText(loc("quest.objectives_title", "◈ OBJECTIFS TACTIQUES & GÉOLOCALISATION"), 16, curY, width - 32, "left");
            curY += 24;

            const sector = window.$gameSector ? window.$gameSector.currentSectorData() : null;
            const secName = sector ? (typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(sector.name) : sector.name) : loc("travel.sector_default", "Secteur");
            const planets = window.$dataPlanets || [];

            q.locations.forEach(locItem => {
                // Fond de l'objectif
                this.contents.fillRect(24, curY + 8, width - 48, 68, "#282828");

                // Badge d'état
                let badge = loc("quest.obj_in_progress", "[► EN COURS]");
                let badgeColor = "#fabd2f";
                if (locItem.completed) {
                    badge = loc("quest.obj_completed", "[✔ TERMINÉ]");
                    badgeColor = "#8ec07c";
                } else if (!locItem.active) {
                    badge = loc("quest.obj_pending", "[🔒 EN ATTENTE]");
                    badgeColor = "#7c6f64";
                }

                this.contents.fontSize = 13;
                this.contents.textColor = badgeColor;
                this.drawText(badge, 32, curY + 6, 120, "left");

                // Nom de l'objectif
                this.contents.textColor = locItem.completed ? "#a89984" : "#fbf1c7";
                this.drawText(locItem.name, 160, curY + 6, width - 210, "left");

                // Description
                this.contents.fontSize = 12;
                this.contents.textColor = "#d5c4a1";
                this.drawText(locItem.description || loc("quest.default_reach", "Rejoindre la zone indiquée."), 32, curY + 26, width - 64, "left");

                // Breadcrumb géographique
                const sys = sector && sector.systems ? sector.systems.find(s => s && s.id === locItem.systemId) : null;
                const sysName = sys ? (typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(sys.name) : sys.name) : `${loc("travel.system_default", "Système")} ${locItem.systemId}`;
                const pl = planets.find(p => p && (p.dbId === locItem.planetId || p.id === locItem.planetId));
                const bodyLbl = loc("travel.body_default", loc("travel.celestial_body", "Corps"));
                const plName = pl ? (typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(pl.name) : pl.name) : (locItem.planetId !== null && locItem.planetId !== undefined ? `${bodyLbl} ${locItem.planetId}` : "");
                const allPois = window.$dataPois || [];
                const poi = allPois.find(p => p && p.id === locItem.poiId) || (pl && Array.isArray(pl.pois) ? pl.pois.find(p => p && p.id === locItem.poiId) : null);
                const isLocated = !locItem.poiId || (window.$gameSystem && typeof window.$gameSystem.isPoiLocated === "function" ? window.$gameSystem.isPoiLocated(locItem.poiId) : true);

                let poiDisplayName = "";
                if (locItem.poiId) {
                    if (isLocated) {
                        poiDisplayName = poi ? (typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(poi.name) : poi.name) : locItem.poiId;
                    } else {
                        poiDisplayName = loc("quest.unknown_poi", "??? [Site non découvert]");
                    }
                }

                const breadcrumb = `📍 ${secName} ▹ ${sysName}${plName ? " ▹ " + plName : ""}${poiDisplayName ? " ▹ " + poiDisplayName : ""}`;
                this.contents.textColor = isLocated ? "#83a598" : "#fe8019";
                this.drawText(breadcrumb, 32, curY + 46, width - 64, "left");

                if (!isLocated) {
                    this.contents.fontSize = 12;
                    this.contents.textColor = "#fb4934";
                    this.drawText(`⚠ ${loc("quest.poi_unlocated_task", "À localiser : Coordonnées du site inconnues")}`, 32, curY + 64, width - 64, "left");
                    curY += 20;
                }

                curY += 74;
            });
        }

        // 6. Récompenses de Mission
        const rewards = q.rewards;
        if (rewards) {
            this.contents.fontSize = 14;
            this.contents.textColor = "#fabd2f";
            this.drawText(loc("quest.rewards_title", "◈ RÉCOMPENSES DE MISSION"), 16, curY, width - 32, "left");
            curY += 24;

            if (q.rewardVisible === false) {
                this.contents.fillRect(24, curY + 4, width - 48, 26, "#1d2021");
                this.contents.fontSize = 13;
                this.contents.textColor = "#fb4934";
                this.drawText(loc("quest.rewards_hidden", "??? [DONNÉES CLASSIFIÉES / INCONNUES]"), 32, curY + 6, width - 64, "left");
                curY += 34;
            } else {
                if (rewards.gold > 0) {
                    this.contents.fillRect(24, curY + 4, width - 48, 26, "#1d2021");
                    this.contents.fontSize = 13;
                    this.contents.textColor = "#fabd2f";
                    const creditsLbl = loc("quest.reward_credits", loc("quest.credits", "Crédits"));
                    this.drawText(`🪙 ${rewards.gold} ${creditsLbl}`, 32, curY + 6, width - 64, "left");
                    curY += 30;
                }
                if (Array.isArray(rewards.items)) {
                    rewards.items.forEach(it => {
                        let itemObj = null;
                        if (it.type === "item" && typeof $dataItems !== "undefined") itemObj = $dataItems[it.id];
                        else if (it.type === "weapon" && typeof $dataWeapons !== "undefined") itemObj = $dataWeapons[it.id];
                        else if (it.type === "armor" && typeof $dataArmors !== "undefined") itemObj = $dataArmors[it.id];

                        let itName = `${it.type} #${it.id}`;
                        if (itemObj && itemObj.name) {
                            itName = typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(itemObj.name) : itemObj.name;
                        }

                        this.contents.fillRect(24, curY + 4, width - 48, 26, "#1d2021");
                        this.contents.fontSize = 13;
                        this.contents.textColor = "#ebdbb2";
                        this.drawText(`📦 ${itName} x${it.quantity}`, 32, curY + 6, width - 64, "left");
                        curY += 30;
                    });
                }
            }
        }
    }

    refresh() {
        this.paint();
    }

    drawWrappedText(text, x, y, maxWidth, lineHeight = 20) {
        if (!text) return y;
        const converted = (typeof this.convertEscapeCharacters === "function") 
            ? this.convertEscapeCharacters(text) 
            : text;
        const paragraphs = converted.split("\n");
        let curY = y;
        for (const p of paragraphs) {
            const words = p.split(" ");
            let line = "";
            for (const w of words) {
                const testLine = line ? `${line} ${w}` : w;
                if (this.textWidth(testLine) > maxWidth && line) {
                    this.drawText(line, x, curY, maxWidth, "left");
                    line = w;
                    curY += lineHeight;
                } else {
                    line = testLine;
                }
            }
            if (line) {
                this.drawText(line, x, curY, maxWidth, "left");
                curY += lineHeight;
            }
        }
        return curY;
    }
}

class Scene_QuestBook extends Scene_MenuBase {
    create() {
        super.create();
        //this.createBackground();
        this.createHeaderWindow();
        this.createFilterWindow();
        this.createListWindow();
        this.createDetailWindow();
    }

    createBackground() {
        this._bgSprite = new Sprite();
        this._bgSprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", "travelScreenBg");
        this.addChild(this._bgSprite);

        this._spaceSprite = new Sprite();
        this._spaceSprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", "space");
        this._spaceSprite.opacity = 210;
        this.addChild(this._spaceSprite);
    }

    createHeaderWindow() {
        const rect = new Rectangle(20, 12, Graphics.width - 40, 52);
        this._headerWindow = new Window_QuestBookHeader(rect);
        this.addWindow(this._headerWindow);
    }

    createFilterWindow() {
        const rect = new Rectangle(20, 68, 430, 50);
        this._filterWindow = new Window_QuestFilter(rect);
        this._filterWindow.setHandler("active", this.onFilterChange.bind(this, "active"));
        this._filterWindow.setHandler("recurring", this.onFilterChange.bind(this, "recurring"));
        this._filterWindow.setHandler("completed", this.onFilterChange.bind(this, "completed"));
        this._filterWindow.setHandler("all", this.onFilterChange.bind(this, "all"));
        this._filterWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._filterWindow);
    }

    createListWindow() {
        const rect = new Rectangle(20, 122, 430, Graphics.height - 134);
        this._listWindow = new Window_QuestList(rect);
        this._listWindow.setHandler("cancel", this.popScene.bind(this));
        this._listWindow.setHandler("ok", () => {
            const q = this._listWindow.item();
            if (q) {
                q.toggleTracking();
                SoundManager.playOk();
                this._listWindow.refresh();
                this._detailWindow.refresh();
            }
            this._listWindow.activate();
        });

        // Navigation par flèches gauche/droite pour cycler les filtres
        this._listWindow._onCycleFilter = (dir) => {
            const symbols = ["active", "recurring", "completed", "all"];
            let idx = symbols.indexOf(this._filterWindow.currentSymbol());
            idx = (idx + dir + symbols.length) % symbols.length;
            this._filterWindow.select(idx);
            this.onFilterChange(symbols[idx]);
        };

        this.addWindow(this._listWindow);
        this._listWindow.activate();
        this._listWindow.select(0);
    }

    createDetailWindow() {
        const rect = new Rectangle(460, 68, Graphics.width - 480, Graphics.height - 80);
        this._detailWindow = new Window_QuestDetail(rect);
        this.addWindow(this._detailWindow);
        this._listWindow.setDetailWindow(this._detailWindow);
    }

    onFilterChange(filterKey) {
        if (this._listWindow) {
            this._listWindow.setFilter(filterKey);
            this._listWindow.activate();
            this._listWindow.select(0);
        }
    }
}

// Export global et Commandes RMMZ
window.Scene_QuestBook = Scene_QuestBook;
window.SC4 = window.SC4 || {};

/**
 * Ouvre directement l'interface du Livre de Quêtes (Datapad).
 * Utilisable partout en script RMMZ : SC4.openQuestBook() ou SceneManager.openQuestBook().
 */
SC4.openQuestBook = function () {
    SceneManager.push(Scene_QuestBook);
};
SceneManager.openQuestBook = SC4.openQuestBook;

// Enregistrement de la commande de plugin pour les événements RMMZ
PluginManager.registerCommand("SC4_QuestManager", "openQuestBook", () => {
    SC4.openQuestBook();
});
