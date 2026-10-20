//=============================================================================
// RPG Maker MZ - SC4_Game_Quests
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Registre gestionnaire des quêtes du joueur ($gameQuests).
 * @author SimCraft
 * @base SC4_Game_Quest
 * 
 * @help SC4_Game_Quests.js
 */

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

window.Game_Quests = Game_Quests;
if (typeof global !== "undefined") {
    global.Game_Quests = Game_Quests;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Game_Quests };
}
