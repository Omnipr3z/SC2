//=============================================================================
// SC4_SubComManager.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Gestionnaire centralisé des communications temps réel SubCom ($subComManager).
 * @author SimCraft
 *
 * @help SC4_SubComManager.js
 * ============================================================================
 * Orchestrateur des appels SubCom en temps réel :
 * - File d'attente des appels entrants (`_pendingCalls`) et appel actif unique (`_activeCall`).
 * - Journal des 20 derniers appels manqués (`_missedCalls`: {actorId, timestamp, see, masked, maskedLabel}).
 * - Expirations temporelles basées sur `$gameDate.timestamp` et callbacks sérialisables (`recallAt-[X](min|hr|jr|dec)`).
 * - Purge automatique des acteurs décédés dans les files et listes de contacts.
 * - Alerte sonore (`Ship_msg`) uniquement lorsque le joueur est à bord de son vaisseau.
 * - Persistance JSON complète via SC_DataManager.
 * ============================================================================
 */

class SubComManager {
    constructor() {
        this.init();
    }

    init() {
        this._nextCallSeq = 1;
        this._activeCall = null;
        this._currentDialogCall = null;
        this._pendingCalls = [];
        this._missedCalls = [];
    }

    static get MAX_MISSED_CALLS() {
        return 20;
    }

    // ========================================================================
    // 1. ACCESSEURS & UTILITAIRES TEMPS / ÉTAT
    // ========================================================================

    get activeCall() {
        return this._activeCall;
    }

    get pendingCalls() {
        return this._pendingCalls.slice();
    }

    get missedCalls() {
        return this._missedCalls.slice();
    }

    get currentDialogCall() {
        return this._currentDialogCall;
    }

    currentTimestamp() {
        return (typeof $gameDate !== "undefined" && $gameDate && typeof $gameDate.timestamp === "number")
            ? $gameDate.timestamp
            : 0;
    }

    dateConfig() {
        if (typeof $gameDate !== "undefined" && $gameDate && $gameDate.config) {
            return $gameDate.config;
        }
        return {
            minutes_per_hour: 60,
            hours_per_day: 24,
            days_per_month: 30,
            months_per_year: 12
        };
    }

    /**
     * Convertit une expression de durée recallAt (ex: "500", "4hr", "2jr", "1dec") en minutes virtuelles.
     * @param {string|number} rawExpr
     * @returns {number}
     */
    parseRecallOffset(rawExpr) {
        if (typeof rawExpr === "number") {
            return Math.max(1, Math.round(rawExpr));
        }
        const match = String(rawExpr || "").trim().match(/^(\d+(?:\.\d+)?)\s*(dec|jr|hr|min|mn)?$/i);
        if (!match) {
            if (typeof DEBUGTOOL !== "undefined" && typeof DEBUGTOOL.warn === "function") {
                DEBUGTOOL.warn("SubComManager.parseRecallOffset", `Format recallAt invalide : "${rawExpr}"`, { rawExpr });
            }
            return 1;
        }
        const value = parseFloat(match[1]);
        const unit = (match[2] || "").toLowerCase();
        const cfg = this.dateConfig();
        const mph = Number(cfg.minutes_per_hour) || 60;
        const hpd = Number(cfg.hours_per_day) || 24;
        const jrMins = mph * hpd;
        const decMins = 10 * jrMins;

        let factor = 1;
        if (unit === "hr") factor = mph;
        else if (unit === "jr") factor = jrMins;
        else if (unit === "dec") factor = decMins;

        return Math.max(1, Math.round(value * factor));
    }

    isActorDead(actorId) {
        const id = Number(actorId) || 0;
        if (id <= 0) return false;
        if (typeof $gameActors === "undefined" || !$gameActors || typeof $gameActors.actor !== "function") {
            return false;
        }
        const actor = $gameActors.actor(id);
        return Boolean(actor && typeof actor.isDead === "function" && actor.isDead());
    }

    leaderActor() {
        if (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.leader === "function") {
            return $gameParty.leader();
        }
        return null;
    }

    registerKnownContact(actorId) {
        const id = Number(actorId) || 0;
        if (id <= 0 || this.isActorDead(id)) return false;
        const leader = this.leaderActor();
        if (leader && leader.subCom && typeof leader.subCom.addContact === "function") {
            return leader.subCom.addContact(id);
        }
        return false;
    }

    isPlayerOnOwnShipMap() {
        if (typeof $gameSpaceships === "undefined" || !$gameSpaceships || typeof $gameSpaceships.playerShip !== "function") {
            return false;
        }
        const ship = $gameSpaceships.playerShip();
        if (!ship || !ship.mapId) return false;
        if (typeof $gameMap === "undefined" || !$gameMap || typeof $gameMap.mapId !== "function") {
            return false;
        }
        return $gameMap.mapId() === ship.mapId;
    }

    hasActiveCall() {
        return Boolean(this._activeCall);
    }

    hasNavigationBlockingCall() {
        const now = this.currentTimestamp();
        if (this._activeCall && this._activeCall.blocksNavigation) return true;
        if (this._currentDialogCall && this._currentDialogCall.blocksNavigation) return true;
        return this._pendingCalls.some(c => c && c.blocksNavigation && c.startTimestamp <= now);
    }

    // ========================================================================
    // 2. FILE D'APPELS (pushCall / merge / activation / expiration)
    // ========================================================================

    sanitizeCallback(onMissedCall) {
        if (onMissedCall === undefined || onMissedCall === null) return null;
        if (typeof onMissedCall === "function") {
            if (typeof DEBUGTOOL !== "undefined" && typeof DEBUGTOOL.error === "function") {
                DEBUGTOOL.error("SubComManager.sanitizeCallback", "Les callbacks JS ne sont pas sérialisables : utilisez une clé (ex: 'recallAt-500').");
            }
            return null;
        }
        if (typeof onMissedCall === "object") {
            return JSON.parse(JSON.stringify(onMissedCall));
        }
        return String(onMissedCall);
    }

    normalizeCallData(calldata, onMissedCall = null) {
        if (!calldata || typeof calldata !== "object") {
            if (typeof DEBUGTOOL !== "undefined" && typeof DEBUGTOOL.error === "function") {
                DEBUGTOOL.error("SubComManager.normalizeCallData", "calldata doit être un objet { actorId, ... }.");
            }
            return null;
        }
        const actorId = Number(calldata.actorId) || 0;
        if (actorId <= 0) {
            if (typeof DEBUGTOOL !== "undefined" && typeof DEBUGTOOL.error === "function") {
                DEBUGTOOL.error("SubComManager.normalizeCallData", "actorId invalide dans calldata.", calldata);
            }
            return null;
        }

        const now = this.currentTimestamp();
        const startTimestamp = (calldata.startTimestamp !== undefined && calldata.startTimestamp !== null)
            ? Number(calldata.startTimestamp)
            : now;
        const limitTimestamp = (calldata.limitTimestamp !== undefined && calldata.limitTimestamp !== null)
            ? Number(calldata.limitTimestamp)
            : null;
        const duration = (calldata.duration !== undefined && calldata.duration !== null)
            ? Math.max(0, Number(calldata.duration))
            : ((limitTimestamp !== null && limitTimestamp > startTimestamp) ? (limitTimestamp - startTimestamp) : null);

        const rawCallback = (onMissedCall !== undefined && onMissedCall !== null)
            ? onMissedCall
            : calldata.onMissedCall;

        return {
            id: Number(calldata.id) > 0 ? Number(calldata.id) : this._nextCallSeq++,
            actorId: actorId,
            startTimestamp: startTimestamp,
            limitTimestamp: limitTimestamp,
            duration: duration,
            onMissedCall: this.sanitizeCallback(rawCallback),
            blocksNavigation: Boolean(calldata.blocksNavigation),
            masked: Boolean(calldata.masked),
            maskedLabel: calldata.maskedLabel ? String(calldata.maskedLabel) : null,
            revealOnAnswer: Boolean(calldata.revealOnAnswer),
            eventId: (calldata.eventId !== undefined && calldata.eventId !== null && Number(calldata.eventId) > 0)
                ? Number(calldata.eventId)
                : null,
            options: (calldata.options && typeof calldata.options === "object")
                ? JSON.parse(JSON.stringify(calldata.options))
                : null
        };
    }

    mergeCallEntry(existing, incoming) {
        if (!existing || !incoming) return existing;
        existing.limitTimestamp = incoming.limitTimestamp;
        if (incoming.duration !== null) {
            existing.duration = incoming.duration;
        }
        if (incoming.onMissedCall !== null) {
            existing.onMissedCall = incoming.onMissedCall;
        }
        existing.blocksNavigation = Boolean(existing.blocksNavigation || incoming.blocksNavigation);
        existing.masked = Boolean(incoming.masked);
        existing.maskedLabel = incoming.maskedLabel !== null ? incoming.maskedLabel : existing.maskedLabel;
        existing.revealOnAnswer = Boolean(incoming.revealOnAnswer);
        if (incoming.eventId !== null) existing.eventId = incoming.eventId;
        if (incoming.options !== null) existing.options = incoming.options;
        return existing;
    }

    /**
     * Enregistre un appel entrant dans SubCom.
     * Fusionne avec un appel existant pour le même actorId uniquement si les deux appels
     * ont startTimestamp <= $gameDate.timestamp.
     * @param {object} calldata
     * @param {string|object|null} [onMissedCall=null]
     * @returns {object|null}
     */
    pushCall(calldata, onMissedCall = null) {
        const entry = this.normalizeCallData(calldata, onMissedCall);
        if (!entry) return null;
        if (this.isActorDead(entry.actorId)) {
            return null;
        }

        const now = this.currentTimestamp();
        if (entry.startTimestamp <= now) {
            if (this._activeCall && this._activeCall.actorId === entry.actorId && this._activeCall.startTimestamp <= now) {
                return this.mergeCallEntry(this._activeCall, entry);
            }
            const readyExisting = this._pendingCalls.find(c => c && c.actorId === entry.actorId && c.startTimestamp <= now);
            if (readyExisting) {
                return this.mergeCallEntry(readyExisting, entry);
            }
        }

        this._pendingCalls.push(entry);
        return entry;
    }

    /**
     * Supprime les acteurs décédés des files d'attente, de l'appel actif et des carnets de contacts chargés.
     */
    pruneDeadActors() {
        if (this._activeCall && this.isActorDead(this._activeCall.actorId)) {
            this._activeCall = null;
        }
        if (this._currentDialogCall && this.isActorDead(this._currentDialogCall.actorId)) {
            this._currentDialogCall = null;
        }
        if (this._pendingCalls.length > 0) {
            this._pendingCalls = this._pendingCalls.filter(c => c && !this.isActorDead(c.actorId));
        }

        if (typeof $gameActors !== "undefined" && $gameActors && Array.isArray($gameActors._data)) {
            for (let i = 1; i < $gameActors._data.length; i++) {
                const actor = $gameActors._data[i];
                if (actor && typeof actor.hasSubCom === "function" && actor.hasSubCom() && actor.subCom && typeof actor.subCom.pruneDeadContacts === "function") {
                    actor.subCom.pruneDeadContacts();
                }
            }
        }
        const leader = this.leaderActor();
        if (leader && typeof leader.hasSubCom === "function" && leader.hasSubCom() && leader.subCom) {
            leader.subCom.pruneDeadContacts();
        }
    }

    /**
     * Boucle temps réel appelée depuis Scene_Map.prototype.update.
     * @param {number|null} [currentTimestamp=null]
     */
    update(currentTimestamp = null) {
        const now = (typeof currentTimestamp === "number") ? currentTimestamp : this.currentTimestamp();

        // 1. Purge des acteurs décédés
        this.pruneDeadActors();

        // 2. Expiration de l'appel actif si le délai limite est atteint
        if (this._activeCall && this._activeCall.limitTimestamp !== null && now >= this._activeCall.limitTimestamp) {
            const expired = this._activeCall;
            this._activeCall = null;
            this.recordMissedCall(expired, now);
            this.checkCallback(expired, now);
        }

        // 3. Expiration des appels encore en file ayant déjà dépassé leur limite
        if (this._pendingCalls.length > 0) {
            const stillPending = [];
            const expiredPending = [];
            for (const c of this._pendingCalls) {
                if (c && c.limitTimestamp !== null && now >= c.limitTimestamp) {
                    expiredPending.push(c);
                } else if (c) {
                    stillPending.push(c);
                }
            }
            this._pendingCalls = stillPending;
            for (const expired of expiredPending) {
                this.recordMissedCall(expired, now);
                this.checkCallback(expired, now);
            }
        }

        // 4. Promotion du prochain appel prêt si aucun appel actif en cours
        if (!this._activeCall && this._pendingCalls.length > 0) {
            let bestIdx = -1;
            for (let i = 0; i < this._pendingCalls.length; i++) {
                const c = this._pendingCalls[i];
                if (!c || c.startTimestamp > now) continue;
                if (bestIdx < 0) {
                    bestIdx = i;
                } else {
                    const best = this._pendingCalls[bestIdx];
                    if (c.startTimestamp < best.startTimestamp || (c.startTimestamp === best.startTimestamp && c.id < best.id)) {
                        bestIdx = i;
                    }
                }
            }
            if (bestIdx >= 0) {
                const nextCall = this._pendingCalls.splice(bestIdx, 1)[0];
                this._activeCall = nextCall;
                this.onCallActivated(nextCall);
            }
        }
    }

    onCallActivated(call) {
        if (!call) return;
        if (this.isPlayerOnOwnShipMap()) {
            if (typeof AudioManager !== "undefined" && typeof AudioManager.playSe === "function") {
                AudioManager.playSe({ name: "Ship_msg", volume: 90, pitch: 100, pan: 0 });
            }
        }
    }

    /**
     * Traite le callback d'un appel manqué / rejeté (ex: "recallAt-500", "recallAt-4hr", "recallAt-2jr", "recallAt-1dec").
     * @param {object} data
     * @returns {any}
     */
    checkCallback(data, currentTimestamp = null) {
        if (!data || !data.onMissedCall) return null;
        if (this.isActorDead(data.actorId)) return null;

        const cb = data.onMissedCall;
        let recallExpr = null;

        if (typeof cb === "string") {
            const m = cb.trim().match(/^recallAt-(.+)$/i);
            if (m) {
                recallExpr = m[1];
            }
        } else if (cb && typeof cb === "object" && String(cb.type || "").toLowerCase() === "recallat") {
            recallExpr = cb.value !== undefined ? cb.value : cb.delay;
        }

        if (recallExpr !== null) {
            const offset = this.parseRecallOffset(recallExpr);
            const now = (typeof currentTimestamp === "number") ? currentTimestamp : this.currentTimestamp();
            const nextStart = now + offset;
            const nextLimit = (data.duration !== null && data.duration !== undefined && data.duration > 0)
                ? (nextStart + data.duration)
                : null;
            return this.pushCall({
                actorId: data.actorId,
                startTimestamp: nextStart,
                limitTimestamp: nextLimit,
                duration: data.duration,
                blocksNavigation: data.blocksNavigation,
                masked: data.masked,
                maskedLabel: data.maskedLabel,
                revealOnAnswer: data.revealOnAnswer,
                eventId: data.eventId,
                options: data.options
            }, data.onMissedCall);
        }

        // Hook extensible pour futurs callbacks scénaristiques / quêtes
        return null;
    }

    // ========================================================================
    // 3. APPELS MANQUÉS & RÉPONSES JOUEUR
    // ========================================================================

    recordMissedCall(call, timestamp = null) {
        if (!call || !call.actorId) return null;
        const entry = {
            actorId: Number(call.actorId),
            timestamp: Number(timestamp !== null && timestamp !== undefined ? timestamp : this.currentTimestamp()),
            see: false,
            masked: Boolean(call.masked),
            maskedLabel: call.maskedLabel ? String(call.maskedLabel) : null
        };
        this._missedCalls.push(entry);
        const max = SubComManager.MAX_MISSED_CALLS;
        if (this._missedCalls.length > max) {
            this._missedCalls.splice(0, this._missedCalls.length - max);
        }
        return entry;
    }

    getMissedCalls() {
        return this._missedCalls.slice();
    }

    getUnseenMissedCount() {
        return this._missedCalls.reduce((acc, item) => acc + (item && !item.see ? 1 : 0), 0);
    }

    markMissedCallsSeen() {
        let changed = 0;
        for (const item of this._missedCalls) {
            if (item && !item.see) {
                item.see = true;
                changed++;
            }
        }
        return changed;
    }

    /**
     * Regroupe les appels manqués par interlocuteur (ou signal masqué) pour affichage dans Window_SubcomMissedList :
     * [{ actorId, masked, maskedLabel, latestTimestamp, count, hasUnseen }]
     */
    getGroupedMissedCalls() {
        const groups = new Map();
        for (const entry of this._missedCalls) {
            if (!entry) continue;
            const key = entry.masked
                ? `masked:${entry.maskedLabel || ""}:${entry.actorId}`
                : `actor:${entry.actorId}`;
            let grp = groups.get(key);
            if (!grp) {
                grp = {
                    actorId: entry.actorId,
                    masked: Boolean(entry.masked),
                    maskedLabel: entry.maskedLabel || null,
                    latestTimestamp: entry.timestamp,
                    count: 1,
                    hasUnseen: !entry.see
                };
                groups.set(key, grp);
            } else {
                grp.count += 1;
                if (entry.timestamp >= grp.latestTimestamp) {
                    grp.latestTimestamp = entry.timestamp;
                }
                if (!entry.see) {
                    grp.hasUnseen = true;
                }
            }
        }
        return Array.from(groups.values()).sort((a, b) => b.latestTimestamp - a.latestTimestamp);
    }

    /**
     * Répond à l'appel actif en cours et l'extrait de la file d'attente active.
     * @returns {object|null}
     */
    answerActiveCall() {
        if (!this._activeCall) return null;
        const call = this._activeCall;
        this._activeCall = null;
        this._currentDialogCall = call;
        if (!call.masked || call.revealOnAnswer) {
            if (call.masked && call.revealOnAnswer) {
                call.masked = false;
            }
            this.registerKnownContact(call.actorId);
        }
        return call;
    }

    /**
     * Rejette l'appel actif : enregistre un appel manqué et évalue son callback (recallAt...).
     * @returns {object|null}
     */
    rejectActiveCall() {
        if (!this._activeCall) return null;
        const call = this._activeCall;
        this._activeCall = null;
        this.recordMissedCall(call, this.currentTimestamp());
        this.checkCallback(call);
        return call;
    }

    /**
     * Démarre une session d'appel sortant vers un contact connu.
     * @param {number} actorId
     * @returns {object|null}
     */
    startOutgoingCall(actorId) {
        const id = Number(actorId) || 0;
        if (id <= 0 || this.isActorDead(id)) return null;
        this._currentDialogCall = {
            id: 0,
            actorId: id,
            startTimestamp: this.currentTimestamp(),
            limitTimestamp: null,
            duration: null,
            onMissedCall: null,
            blocksNavigation: false,
            masked: false,
            maskedLabel: null,
            revealOnAnswer: false,
            eventId: null,
            options: null,
            isOutgoing: true
        };
        return this._currentDialogCall;
    }

    endActiveDialog() {
        this._currentDialogCall = null;
    }

    /**
     * Révèle l'identité d'un appelant masqué en cours d'échange et l'ajoute aux contacts du joueur.
     * @param {number} [actorId]
     * @returns {boolean}
     */
    revealCaller(actorId = null) {
        const targetId = (actorId !== null && actorId !== undefined)
            ? Number(actorId)
            : (this._currentDialogCall ? this._currentDialogCall.actorId : (this._activeCall ? this._activeCall.actorId : 0));
        if (!targetId || targetId <= 0) return false;

        if (this._currentDialogCall && this._currentDialogCall.actorId === targetId) {
            this._currentDialogCall.masked = false;
        }
        if (this._activeCall && this._activeCall.actorId === targetId) {
            this._activeCall.masked = false;
        }
        for (const m of this._missedCalls) {
            if (m && m.actorId === targetId && m.masked) {
                m.masked = false;
                m.maskedLabel = null;
            }
        }
        this.registerKnownContact(targetId);
        return true;
    }

    // ========================================================================
    // 4. PERSISTANCE JSON (SC_DataManager)
    // ========================================================================

    cloneCall(call) {
        if (!call || typeof call !== "object") return null;
        return {
            id: Number(call.id) || 0,
            actorId: Number(call.actorId) || 0,
            startTimestamp: Number(call.startTimestamp) || 0,
            limitTimestamp: (call.limitTimestamp !== undefined && call.limitTimestamp !== null) ? Number(call.limitTimestamp) : null,
            duration: (call.duration !== undefined && call.duration !== null) ? Number(call.duration) : null,
            onMissedCall: this.sanitizeCallback(call.onMissedCall),
            blocksNavigation: Boolean(call.blocksNavigation),
            masked: Boolean(call.masked),
            maskedLabel: call.maskedLabel ? String(call.maskedLabel) : null,
            revealOnAnswer: Boolean(call.revealOnAnswer),
            eventId: (call.eventId !== undefined && call.eventId !== null) ? Number(call.eventId) : null,
            options: (call.options && typeof call.options === "object") ? JSON.parse(JSON.stringify(call.options)) : null
        };
    }

    makeSavefileData() {
        return {
            nextCallSeq: this._nextCallSeq,
            activeCall: this._activeCall ? this.cloneCall(this._activeCall) : null,
            pendingCalls: this._pendingCalls.map(c => this.cloneCall(c)).filter(Boolean),
            missedCalls: this._missedCalls.slice(-SubComManager.MAX_MISSED_CALLS).map(m => ({
                actorId: Number(m.actorId) || 0,
                timestamp: Number(m.timestamp) || 0,
                see: Boolean(m.see),
                masked: Boolean(m.masked),
                maskedLabel: m.maskedLabel ? String(m.maskedLabel) : null
            }))
        };
    }

    loadSavefileData(data) {
        this.init();
        if (!data || typeof data !== "object") return;
        if (typeof data.nextCallSeq === "number" && data.nextCallSeq > 0) {
            this._nextCallSeq = data.nextCallSeq;
        }
        if (data.activeCall) {
            this._activeCall = this.cloneCall(data.activeCall);
        }
        if (Array.isArray(data.pendingCalls)) {
            this._pendingCalls = data.pendingCalls.map(c => this.cloneCall(c)).filter(Boolean);
        }
        if (Array.isArray(data.missedCalls)) {
            this._missedCalls = data.missedCalls.slice(-SubComManager.MAX_MISSED_CALLS).map(m => ({
                actorId: Number(m.actorId) || 0,
                timestamp: Number(m.timestamp) || 0,
                see: Boolean(m.see),
                masked: Boolean(m.masked),
                maskedLabel: m.maskedLabel ? String(m.maskedLabel) : null
            }));
        }
    }
}

const _defaultSubComManager = new SubComManager();
if (typeof window !== "undefined") {
    window.SubComManager = SubComManager;
    window.$subComManager = _defaultSubComManager;
}
if (typeof global !== "undefined") {
    global.SubComManager = SubComManager;
    global.$subComManager = _defaultSubComManager;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = SubComManager;
}
