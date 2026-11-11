//=============================================================================
// SimCraft 4 - Game_Relation
// SC4_Game_Relation.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Modèle d'instance unitaire de Relation (Affinité, Menace, Obéissance, Seuils Umbral).
 * @author SimCraft
 * @help SC4_Game_Relation.js
 * 
 * Modèle unitaire représentant l'opinion relationnelle portée par un acteur détenteur
 * (`actorId2` / holder) envers un acteur sujet (`actorId1` / subject), stockée dans
 * `subjectActor.social._opinions[holderActorId]`.
 * Entièrement découplé de la vue et sérialisable via `Game_ScActorSocial`.
 */

class Game_Relation {
    constructor(data = {}) {
        this._actorId1 = Number(data.actorId1) || 0;
        this._actorId2 = Number(data.actorId2) || 0;
        this._affinity = typeof data.affinity === "number" ? data.affinity : 0;
        this._threat = typeof data.threat === "number" ? data.threat : 0;
        this._notoriety = typeof data.notoriety === "number" ? data.notoriety : 1;
        this._lastInteractionTimestamp = Number(data.lastInteractionTimestamp) || 0;
        this._cooldowns = data.cooldowns ? JSON.parse(JSON.stringify(data.cooldowns)) : {};
        this._agacement = typeof data.agacement === "number" ? Math.max(0, Math.min(100, data.agacement)) : 0;
        this._lastAgacementTimestamp = Number(data.lastAgacementTimestamp) || 0;
        this._lastInteractionType = typeof data.lastInteractionType === "string" ? data.lastInteractionType : "";
        this._consecutiveSameCount = Number(data.consecutiveSameCount) || 0;
        this._data = data.data ? JSON.parse(JSON.stringify(data.data)) : {};
    }

    /** ID de l'acteur sujet évalué (propriétaire du registre _opinions) */
    get actorId1() {
        return this._actorId1;
    }

    /** ID de l'acteur détenteur / émetteur de cette opinion envers actorId1 */
    get actorId2() {
        return this._actorId2;
    }

    get affinity() {
        return this._affinity;
    }

    set affinity(val) {
        this._affinity = Math.max(-100, Math.min(100, Math.round(Number(val) || 0)));
    }

    get threat() {
        return this._threat;
    }

    set threat(val) {
        this._threat = Math.max(0, Math.min(100, Math.round(Number(val) || 0)));
    }

    get notoriety() {
        return this._notoriety;
    }

    set notoriety(val) {
        this._notoriety = Math.max(0, Math.min(10, Number(val) || 0));
    }

    get lastInteractionTimestamp() {
        return this._lastInteractionTimestamp;
    }

    set lastInteractionTimestamp(val) {
        this._lastInteractionTimestamp = Math.max(0, Number(val) || 0);
    }

    get agacement() {
        return this._agacement;
    }

    set agacement(val) {
        this._agacement = Math.max(0, Math.min(100, Math.round(Number(val) || 0)));
    }

    get lastAgacementTimestamp() {
        return this._lastAgacementTimestamp;
    }

    set lastAgacementTimestamp(val) {
        this._lastAgacementTimestamp = Math.max(0, Number(val) || 0);
    }

    get lastInteractionType() {
        return this._lastInteractionType;
    }

    get consecutiveSameCount() {
        return this._consecutiveSameCount;
    }

    /**
     * Calcule l'agacement actuel en appliquant l'apaisement temporel via $gameDate.
     * @param {number|null} currentTimestamp
     * @param {number} decayPerHour Points apaisés par heure (défaut 25)
     * @returns {number}
     */
    getAgacement(currentTimestamp = null, decayPerHour = 25) {
        const time = (typeof currentTimestamp === "number" && currentTimestamp > 0)
            ? currentTimestamp
            : ((typeof $gameDate !== "undefined" && $gameDate) ? $gameDate.timestamp : 0);

        if (time > 0 && this._lastAgacementTimestamp > 0 && time > this._lastAgacementTimestamp) {
            const elapsed = time - this._lastAgacementTimestamp;
            const decay = Math.floor((elapsed * decayPerHour) / 3600);
            if (decay > 0) {
                this._agacement = Math.max(0, this._agacement - decay);
                this._lastAgacementTimestamp += Math.floor((decay * 3600) / decayPerHour);
            }
            if (elapsed >= 1800) {
                this._consecutiveSameCount = 0;
                this._lastInteractionType = "";
            }
        } else if (this._lastAgacementTimestamp === 0 && time > 0) {
            this._lastAgacementTimestamp = time;
        }

        return this._agacement;
    }

    /**
     * Augmente l'agacement en fonction du type d'interaction et de sa répétition consécutive.
     * La répétition rapide du même type d'action escalade plus vite ; l'alternance ou le temps calme modère l'augmentation.
     * @param {string} interactionType
     * @param {number} baseCost
     * @param {number|null} currentTimestamp
     * @returns {number}
     */
    addAgacement(interactionType = "chat", baseCost = 8, currentTimestamp = null) {
        const time = (typeof currentTimestamp === "number" && currentTimestamp > 0)
            ? currentTimestamp
            : ((typeof $gameDate !== "undefined" && $gameDate) ? $gameDate.timestamp : 0);

        this.getAgacement(time);

        const action = String(interactionType || "chat");
        const elapsedSinceLast = (time > 0 && this._lastAgacementTimestamp > 0)
            ? Math.max(0, time - this._lastAgacementTimestamp)
            : 0;

        if (action === this._lastInteractionType && elapsedSinceLast < 300) {
            this._consecutiveSameCount += 1;
        } else {
            this._consecutiveSameCount = 1;
        }
        this._lastInteractionType = action;

        const cost = Number(baseCost);
        if (cost > 0) {
            const streakFactor = 1 + Math.min(2.5, (this._consecutiveSameCount - 1) * 0.65);
            const delta = Math.max(1, Math.round(cost * streakFactor));
            this._agacement = Math.max(0, Math.min(100, this._agacement + delta));
        }

        if (time > 0) {
            this._lastAgacementTimestamp = time;
        }
        return this._agacement;
    }

    /**
     * Vérifie si le PNJ est saturé / agacé par les interactions répétitives
     * @param {number|null} currentTimestamp
     * @param {number} threshold Seuil de saturation (défaut 80)
     * @returns {boolean}
     */
    isSaturated(currentTimestamp = null, threshold = 80) {
        return this.getAgacement(currentTimestamp) >= threshold;
    }

    /**
     * Calcul du score d'obéissance dynamique :
     * Obéissance = Affinité + (Menace * Notoriété * facteurAléatoire)
     * @param {number} randomFactor Facteur de variation (défaut 0.5)
     * @returns {number} Score d'obéissance borné [-100, 100]
     */
    calculateObedience(randomFactor = 0.5) {
        const factor = typeof randomFactor === "number" ? randomFactor : 0.5;
        const threatComponent = (this._threat * this._notoriety * factor);
        const rawScore = this._affinity + threatComponent;
        return Math.max(-100, Math.min(100, Math.round(rawScore)));
    }

    /**
     * Qualification du palier d'affinité textuel
     * @returns {string} Tranche qualitative
     */
    getAffinityBracket() {
        const a = this._affinity;
        if (a <= -70) return "total_hate";
        if (a <= -40) return "hostile";
        if (a <= -10) return "cold";
        if (a <= 10)  return "neutral";
        if (a <= 40)  return "lukewarm";
        if (a <= 70)  return "friendly";
        return "loyal";
    }

    /**
     * Résolution du seuil comportemental (Umbral Thresholds)
     * @param {number} threatThresholdModifier Seuil de menace (-20 ou +20)
     * @returns {string} 'total_hostility' | 'hostility' | 'neutrality' | 'respect' | 'loyalty'
     */
    reactionThreshold(threatThresholdModifier = 0) {
        const bracket = this.getAffinityBracket();
        const hasHighThreat = (this._threat + threatThresholdModifier) >= 20;

        switch (bracket) {
            case "total_hate":
                return "total_hostility";
            case "hostile":
                return "hostility";
            case "cold":
                return hasHighThreat ? "hostility" : "neutrality";
            case "neutral":
                return "neutrality";
            case "lukewarm":
                return hasHighThreat ? "respect" : "neutrality";
            case "friendly":
                return "respect";
            case "loyal":
                return "loyalty";
            default:
                return "neutrality";
        }
    }

    /**
     * Fait varier l'affinité
     * @param {number} delta 
     */
    changeAffinity(delta) {
        this.affinity = this._affinity + (Number(delta) || 0);
    }

    /**
     * Fait varier la menace perçue
     * @param {number} delta 
     */
    changeThreat(delta) {
        this.threat = this._threat + (Number(delta) || 0);
    }

    /**
     * Vérifie si une interaction est disponible sous cooldown
     * @param {string} actionType Nom de l'action ('chat', etc.)
     * @param {number} currentTimestamp Horodatage actuel Game_Date
     * @param {number} cooldownDuration Durée minimale requise en secondes
     * @returns {boolean}
     */
    canInteract(actionType, currentTimestamp, cooldownDuration = 3600) {
        if (!currentTimestamp || typeof currentTimestamp !== "number") return true;
        if (!this._cooldowns[actionType]) return true;
        return (currentTimestamp - this._cooldowns[actionType]) >= cooldownDuration;
    }

    /**
     * Enregistre l'horodatage d'une interaction
     * @param {string} actionType 
     * @param {number} timestamp 
     */
    recordInteraction(actionType, timestamp) {
        const t = Math.max(0, Number(timestamp) || 0);
        this._cooldowns[actionType] = t;
        this._lastInteractionTimestamp = t;
    }

    /**
     * Export pour sauvegarde RMMZ
     */
    makeSavefileData() {
        return {
            actorId1: this._actorId1,
            actorId2: this._actorId2,
            affinity: this._affinity,
            threat: this._threat,
            notoriety: this._notoriety,
            lastInteractionTimestamp: this._lastInteractionTimestamp,
            cooldowns: this._cooldowns,
            agacement: this._agacement,
            lastAgacementTimestamp: this._lastAgacementTimestamp,
            lastInteractionType: this._lastInteractionType,
            consecutiveSameCount: this._consecutiveSameCount,
            data: this._data
        };
    }

    /**
     * Restauration depuis la sauvegarde RMMZ
     * @param {object} data 
     */
    loadSavefileData(data) {
        if (!data) return;
        this._actorId1 = Number(data.actorId1) || this._actorId1;
        this._actorId2 = Number(data.actorId2) || this._actorId2;
        this._affinity = typeof data.affinity === "number" ? data.affinity : this._affinity;
        this._threat = typeof data.threat === "number" ? data.threat : this._threat;
        this._notoriety = typeof data.notoriety === "number" ? data.notoriety : this._notoriety;
        this._lastInteractionTimestamp = Number(data.lastInteractionTimestamp) || this._lastInteractionTimestamp;
        this._cooldowns = data.cooldowns ? JSON.parse(JSON.stringify(data.cooldowns)) : this._cooldowns;
        this._agacement = typeof data.agacement === "number" ? Math.max(0, Math.min(100, data.agacement)) : 0;
        this._lastAgacementTimestamp = Number(data.lastAgacementTimestamp) || 0;
        this._lastInteractionType = typeof data.lastInteractionType === "string" ? data.lastInteractionType : "";
        this._consecutiveSameCount = Number(data.consecutiveSameCount) || 0;
        this._data = data.data ? JSON.parse(JSON.stringify(data.data)) : this._data;
    }
}

window.Game_Relation = Game_Relation;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game_Relation;
}
