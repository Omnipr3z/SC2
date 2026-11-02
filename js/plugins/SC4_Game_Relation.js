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
 * Modèle unitaire représentant l'état relationnel entre deux entités (acteurs).
 * Entièrement découplé de la vue et sérialisable pour les sauvegardes RMMZ.
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
        this._patience = typeof data.patience === "number" ? Math.max(0, Math.min(100, data.patience)) : 100;
        this._lastPatienceTimestamp = Number(data.lastPatienceTimestamp) || 0;
        this._data = data.data ? JSON.parse(JSON.stringify(data.data)) : {};
    }

    /**
     * Clé canonique ordonnée unique : minId_maxId
     */
    get key() {
        const min = Math.min(this._actorId1, this._actorId2);
        const max = Math.max(this._actorId1, this._actorId2);
        return `${min}_${max}`;
    }

    get actorId1() {
        return this._actorId1;
    }

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

    get patience() {
        return this._patience;
    }

    set patience(val) {
        this._patience = Math.max(0, Math.min(100, Math.round(Number(val) || 0)));
    }

    get lastPatienceTimestamp() {
        return this._lastPatienceTimestamp;
    }

    set lastPatienceTimestamp(val) {
        this._lastPatienceTimestamp = Math.max(0, Number(val) || 0);
    }

    /**
     * Calcule la patience actuelle en appliquant la régénération avec le temps écoulé
     * @param {number|null} currentTimestamp
     * @param {number} regenPerHour Points régénérés par heure (défaut 25)
     * @returns {number}
     */
    getPatience(currentTimestamp = null, regenPerHour = 25) {
        const time = (typeof currentTimestamp === "number" && currentTimestamp > 0)
            ? currentTimestamp
            : ((typeof $gameDate !== "undefined" && $gameDate) ? $gameDate.timestamp : 0);

        if (time > 0 && this._lastPatienceTimestamp > 0 && time > this._lastPatienceTimestamp) {
            const elapsed = time - this._lastPatienceTimestamp;
            const hoursPassed = Math.floor(elapsed / 3600);
            if (hoursPassed > 0) {
                this._patience = Math.min(100, this._patience + hoursPassed * regenPerHour);
                this._lastPatienceTimestamp += hoursPassed * 3600;
            }
        } else if (this._lastPatienceTimestamp === 0 && time > 0) {
            this._lastPatienceTimestamp = time;
        }

        return this._patience;
    }

    /**
     * Consomme de la patience sociale (fatigue/boredom suite à une interaction)
     * @param {number} amount
     * @param {number|null} currentTimestamp
     */
    consumePatience(amount = 25, currentTimestamp = null) {
        this.getPatience(currentTimestamp);
        this._patience = Math.max(0, this._patience - (Number(amount) || 0));
        const time = (typeof currentTimestamp === "number" && currentTimestamp > 0)
            ? currentTimestamp
            : ((typeof $gameDate !== "undefined" && $gameDate) ? $gameDate.timestamp : 0);
        if (time > 0) {
            this._lastPatienceTimestamp = time;
        }
    }

    /**
     * Vérifie si le PNJ est saturé / agacé par les bavardages répétitifs
     * @param {number|null} currentTimestamp
     * @param {number} threshold Seuil de saturation (défaut 20)
     * @returns {boolean}
     */
    isSaturated(currentTimestamp = null, threshold = 20) {
        return this.getPatience(currentTimestamp) < threshold;
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
            patience: this._patience,
            lastPatienceTimestamp: this._lastPatienceTimestamp,
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
        this._patience = typeof data.patience === "number" ? data.patience : 100;
        this._lastPatienceTimestamp = Number(data.lastPatienceTimestamp) || 0;
        this._data = data.data ? JSON.parse(JSON.stringify(data.data)) : this._data;
    }
}

if (typeof module !== "undefined") {
    module.exports = Game_Relation;
}
