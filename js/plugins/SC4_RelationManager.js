//=============================================================================
// SimCraft 4 - RelationManager
// SC4_RelationManager.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Façade orchestratrice du système relationnel ($relationManager).
 * @author SimCraft
 * 
 * @param tickDelay
 * @text Délai entre itérations (Ticks)
 * @type number
 * @min 1
 * @default 1
 * @desc Nombre de ticks d'horloge entre chaque passage de simulation.
 * 
 * @param batchBudget
 * @text Budget par lot (Relations)
 * @type number
 * @min 1
 * @default 15
 * @desc Nombre maximal de relations traitées par itération (Round-Robin).
 * 
 * @help SC4_RelationManager.js
 * 
 * Façade centrale du système de relations, diplomatie et interactions sociales.
 * Évite les enchevêtrements en offrant un point d'accès unifié aux Factions,
 * Acteurs, Relations et à l'écoulement du Temps.
 */

class RelationManager {
    constructor() {
        this._lastUpdateTimestamp = 0;
        this._actorFactions = {};
        this._decayInterval = 86400; // 24h galactiques en secondes
        this._tickCounter = 0;
        this._simulationCursor = 0;
        this._tickDelay = 1;
        this._batchBudget = 15;
    }
    get currentSubScene() {
        return SceneManager._scene._currentSubScene;
    }

    isActiveDialog() {
        if (!this.currentSubScene) return false;
        return this.currentSubScene.constructor.name == "SubScene_RelationDialog";
    }

    getInterlocutorId() {
        if (this.isActiveDialog())
            return this.currentSubScene._targetActorId;
    }

    openRelationDialog(targetActorId = 2, targetEventId = null) {
        if (typeof SubSceneManager !== "undefined") {
            return SubSceneManager.open(SubScene_RelationDialog, targetActorId, targetEventId);
        }
        if (SceneManager._scene && typeof SceneManager._scene.openSubScene === "function") {
            return SceneManager._scene.openSubScene(SubScene_RelationDialog, targetActorId, targetEventId);
        }
        return null;
    }

    /**
     * Résout l'ID de faction associé à un acteur
     * @param {number} actorId 
     * @returns {number} ID de faction (1..8) ou 0 si neutre/inconnu
     */
    getActorFactionId(actorId) {
        if (this._actorFactions[actorId]) {
            return this._actorFactions[actorId];
        }
        if (typeof $gameActors !== "undefined" && $gameActors) {
            const actor = $gameActors.actor(actorId);
            if (actor && actor.social) {
                // Source unique : Game_ScActorSocial.factionId() (<factionId: X>)
                return Number(actor.social.factionId()) || 0;
            }
        }
        if (typeof $dataActors !== "undefined" && $dataActors && $dataActors[actorId]) {
            const meta = $dataActors[actorId].meta;
            if (meta && (meta.faction || meta.factionId)) {
                return Number(meta.faction || meta.factionId);
            }
        }
        return 0;
    }

    /**
     * Définit l'allégeance de faction d'un acteur
     * @param {number} actorId 
     * @param {number} factionId 
     */
    setActorFactionId(actorId, factionId) {
        if (typeof $gameActors !== "undefined" && $gameActors) {
            const actor = $gameActors.actor(actorId);
            if (actor && actor.social) {
                actor.social.setFactionId(factionId);
                delete this._actorFactions[actorId];
                return;
            }
        }
        this._actorFactions[actorId] = Number(factionId) || 0;
    }

    /**
     * Récupère ou instancie la relation entre deux acteurs quelconques
     * @param {number} actorId1 
     * @param {number} actorId2 
     * @returns {Game_Relation|null}
     */
    getRelation(actorId1, actorId2) {
        if (typeof $gameRelations === "undefined" || !$gameRelations) return null;
        return $gameRelations.relation(actorId1, actorId2);
    }

    /**
     * Récupère la relation entre le joueur et un PNJ, avec initialisation d'héritage
     * de l'affinité de faction lors du premier contact.
     * @param {number} targetActorId 
     * @returns {Game_Relation|null}
     */
    getRelationWithPlayer(targetActorId) {
        if (typeof $gameRelations === "undefined" || !$gameRelations) return null;

        const isNew = !$gameRelations.hasRelation(
            (typeof $gameParty !== "undefined" && $gameParty && $gameParty.leader()) ? $gameParty.leader().actorId() : 1,
            targetActorId
        );

        const relation = $gameRelations.relationWithPlayer(targetActorId);
        if (relation && isNew) {
            // Héritage direct de la Faction lors de la première rencontre
            const factionId = this.getActorFactionId(targetActorId);
            if (factionId > 0 && typeof $gameFactions !== "undefined" && $gameFactions) {
                const factionAffinity = $gameFactions.affinity(factionId);
                relation.affinity = factionAffinity;
            }
        }
        return relation;
    }

    /**
     * Délai en ticks entre chaque cycle de simulation
     * Priorité : data/SC/SCE_SYSTEM.json > Paramètres du plugin > valeur interne
     * @returns {number}
     */
    getSimulationTickDelay() {
        if (typeof window !== "undefined" && window.$dataSceSystem && window.$dataSceSystem.relationship_simulation && typeof window.$dataSceSystem.relationship_simulation.tick_delay === "number") {
            return window.$dataSceSystem.relationship_simulation.tick_delay;
        }
        if (typeof PluginManager !== "undefined") {
            const params = PluginManager.parameters("SC4_RelationManager");
            if (params && params["tickDelay"]) {
                return Number(params["tickDelay"]) || 1;
            }
        }
        return this._tickDelay;
    }

    setSimulationTickDelay(val) {
        this._tickDelay = Math.max(1, Math.round(Number(val) || 1));
    }

    /**
     * Budget par lot (nombre de relations traitées par itération)
     * Priorité : data/SC/SCE_SYSTEM.json > Paramètres du plugin > valeur interne
     * @returns {number}
     */
    getSimulationBatchBudget() {
        if (typeof window !== "undefined" && window.$dataSceSystem && window.$dataSceSystem.relationship_simulation && typeof window.$dataSceSystem.relationship_simulation.batch_budget === "number") {
            return window.$dataSceSystem.relationship_simulation.batch_budget;
        }
        if (typeof PluginManager !== "undefined") {
            const params = PluginManager.parameters("SC4_RelationManager");
            if (params && params["batchBudget"]) {
                return Number(params["batchBudget"]) || 15;
            }
        }
        return this._batchBudget;
    }

    setSimulationBatchBudget(val) {
        this._batchBudget = Math.max(1, Math.round(Number(val) || 15));
    }

    /**
     * Pulsation d'horloge appelée à chaque tick (Scene_Map ou Game_Date)
     * Déclenche un lot de simulation dès que le délai (tickDelay) est atteint.
     * @param {number} currentTimestamp 
     */
    updateTick(currentTimestamp) {
        this._tickCounter++;
        const requiredDelay = this.getSimulationTickDelay();

        if (this._tickCounter >= requiredDelay) {
            this._tickCounter = 0;
            const budget = this.getSimulationBatchBudget();
            this.updateSimulationBatch(currentTimestamp, budget);
        }
    }

    /**
     * Traite un lot (batch) de relations en anneau (Round-Robin) pour la simulation de fond
     * Sans aucun pic CPU (Flat Framerate constant).
     * @param {number} currentTimestamp 
     * @param {number} batchBudget 
     */
    updateSimulationBatch(currentTimestamp, batchBudget = 15) {
        if (typeof $gameRelations === "undefined" || !$gameRelations) return;
        const relations = $gameRelations.all();
        const total = relations.length;
        if (total === 0) return;

        const budget = Math.min(batchBudget, total);
        const time = (typeof currentTimestamp === "number" && currentTimestamp > 0)
            ? currentTimestamp
            : ((typeof $gameDate !== "undefined" && $gameDate) ? $gameDate.timestamp : 0);

        for (let i = 0; i < budget; i++) {
            const idx = (this._simulationCursor + i) % total;
            const rel = relations[idx];
            if (rel) {
                // 1. Régénération de la patience sociale avec le temps
                rel.getPatience(time);

                // 2. Érosion progressive vers la base de faction si 24h écoulées
                if (rel.lastInteractionTimestamp > 0 && (time - rel.lastInteractionTimestamp) >= this._decayInterval) {
                    const factionId = this.getActorFactionId(rel.actorId2);
                    let targetBase = 0;
                    if (factionId > 0 && typeof $gameFactions !== "undefined" && $gameFactions) {
                        targetBase = $gameFactions.affinity(factionId);
                    }
                    if (rel.affinity > targetBase) {
                        rel.affinity = Math.max(targetBase, rel.affinity - 1);
                    } else if (rel.affinity < targetBase) {
                        rel.affinity = Math.min(targetBase, rel.affinity + 1);
                    }
                }
            }
        }

        this._simulationCursor = (this._simulationCursor + budget) % total;
    }

    /**
     * Mise à jour globale temporelle (sauts de temps / Game_Date)
     * Applique l'érosion progressive vers le neutre/base de faction.
     * @param {number} currentTimestamp 
     */
    update(currentTimestamp) {
        const time = typeof currentTimestamp === "number" ? currentTimestamp : (
            (typeof $gameDate !== "undefined" && $gameDate) ? $gameDate.timestamp : 0
        );

        if (!this._lastUpdateTimestamp) {
            this._lastUpdateTimestamp = time;
            return;
        }

        const elapsed = time - this._lastUpdateTimestamp;
        if (elapsed >= this._decayInterval) {
            const daysPassed = Math.floor(elapsed / this._decayInterval);
            this.applyTemporalDecay(daysPassed);
            this._lastUpdateTimestamp += daysPassed * this._decayInterval;
        }
    }

    /**
     * Érosion progressive de l'affinité vers l'affinité de base de faction
     * @param {number} steps Nombre de crans temporels écoulés
     */
    applyTemporalDecay(steps = 1) {
        if (typeof $gameRelations === "undefined" || !$gameRelations) return;
        const relations = $gameRelations.all();

        for (const rel of relations) {
            const factionId = this.getActorFactionId(rel.actorId2);
            let targetBase = 0;
            if (factionId > 0 && typeof $gameFactions !== "undefined" && $gameFactions) {
                targetBase = $gameFactions.affinity(factionId);
            }

            if (rel.affinity > targetBase) {
                rel.affinity = Math.max(targetBase, rel.affinity - steps);
            } else if (rel.affinity < targetBase) {
                rel.affinity = Math.min(targetBase, rel.affinity + steps);
            }
        }
    }

    /**
     * Retourne la liste des types d'interactions disponibles pour cet interlocuteur
     * @param {number} targetActorId 
     * @returns {string[]} Liste des identifiants d'interaction (ex: ['chat'])
     */
    getAvailableInteractions(targetActorId) {
        const currentTimestamp = (typeof $gameDate !== "undefined" && $gameDate) ? $gameDate.timestamp : 0;
        const relation = this.getRelationWithPlayer(targetActorId);
        const list = [];

        if (relation) {
            const isSaturated = relation.isSaturated(currentTimestamp);
            if (!isSaturated) {
                list.push("chat");
            } else {
                // Si la patience est à 0, l'action est complètement grisée
                if (relation.patience === 0) {
                    list.push("chat_saturated");
                } else {
                    // Dernier clic possible qui déclenche la réaction de refus/saturation
                    list.push("chat");
                }
            }
        }
        return list;
    }

    /**
     * Applique les conséquences d'une interaction et de sa réaction
     * @param {Game_InteractionBase} interaction 
     * @param {Game_ReactionBase} reaction 
     */
    applyInteractionResult(interaction, reaction) {
        if (!interaction || !reaction) return;

        const currentTimestamp = (typeof $gameDate !== "undefined" && $gameDate) ? $gameDate.timestamp : 0;
        const relation = this.getRelation(interaction.actorId1, interaction.actorId2);

        if (relation) {
            // 1. Mise à jour de l'affinité et de la menace
            if (reaction.affinityDelta) {
                relation.changeAffinity(reaction.affinityDelta);
            }
            if (reaction.threatDelta) {
                relation.changeThreat(reaction.threatDelta);
            }

            // 2. Consommation de la patience sociale (fatigue/boredom)
            relation.consumePatience(30, currentTimestamp);

            // 3. Enregistrement du cooldown
            relation.recordInteraction(interaction.id, currentTimestamp);
        }

        // 3. Application d'état RMMZ sur l'acteur PNJ
        if (typeof $gameActors !== "undefined" && $gameActors) {
            const targetActor = $gameActors.actor(interaction.actorId2);
            if (targetActor) {
                if (reaction.stateIdToAdd && typeof targetActor.addState === "function") {
                    targetActor.addState(reaction.stateIdToAdd);
                }
                if (reaction.stateIdToRemove && typeof targetActor.removeState === "function") {
                    targetActor.removeState(reaction.stateIdToRemove);
                }
            }
        }

        // 4. Déclenchement de selfSwitch si prescrit
        if (reaction.selfSwitch && typeof $gameSelfSwitches !== "undefined" && $gameSelfSwitches) {
            const { mapId, eventId, switchKey, value } = reaction.selfSwitch;
            if (mapId && eventId && switchKey) {
                const key = [mapId, eventId, switchKey];
                $gameSelfSwitches.setValue(key, !!value);
            }
        }
    }

    /**
     * Sauvegarde d'état du manager
     */
    makeSavefileData() {
        return {
            lastUpdateTimestamp: this._lastUpdateTimestamp,
            actorFactions: this._actorFactions,
            simulationCursor: this._simulationCursor,
            tickCounter: this._tickCounter,
            tickDelay: this._tickDelay,
            batchBudget: this._batchBudget
        };
    }

    /**
     * Restauration d'état du manager
     * @param {object} data 
     */
    loadSavefileData(data) {
        if (!data) return;
        this._lastUpdateTimestamp = Number(data.lastUpdateTimestamp) || 0;
        this._actorFactions = data.actorFactions ? JSON.parse(JSON.stringify(data.actorFactions)) : {};
        this._simulationCursor = Number(data.simulationCursor) || 0;
        this._tickCounter = Number(data.tickCounter) || 0;
        this._tickDelay = typeof data.tickDelay === "number" ? data.tickDelay : 1;
        this._batchBudget = typeof data.batchBudget === "number" ? data.batchBudget : 15;
    }
}


window.RelationManager = RelationManager;
if (typeof module !== "undefined" && module.exports) {
    module.exports = RelationManager;
}
