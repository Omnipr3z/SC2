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
 * Acteurs, Relations (`actor.social._opinions`) et à l'écoulement du Temps.
 *
 * ----------------------------------------------------------------------------
 * RÉFÉRENTIEL ORIENTÉ DES OPINIONS :
 *   `getOpinionToSubjectFromHolder(subjectActorId, holderActorId)`
 *   délègue à `subjectActor.social.opinionFrom(holderActorId)` et désigne :
 *   « L'opinion que `holderActorId` porte envers `subjectActorId` ».
 *   Dans le Game_Relation retourné :
 *   - `actorId1` = subjectActorId (sujet évalué / propriétaire de `_opinions`)
 *   - `actorId2` = holderActorId (détenteur / interlocuteur qui juge)
 * ----------------------------------------------------------------------------
 */

class RelationManager {
    constructor() {
        this._lastUpdateTimestamp = 0;
        this._decayInterval = 86400; // 24h galactiques en secondes
        this._tickCounter = 0;
        this._simulationCursor = 0;
        this._tickDelay = 1;
        this._batchBudget = 15;
    }
    get currentSubScene() {
        return (typeof SceneManager !== "undefined" && SceneManager && SceneManager._scene)
            ? (SceneManager._scene._currentSubScene || null)
            : null;
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
     * Résout l'ID de faction associé à un acteur (source unique : Game_ScActorSocial)
     * @param {number} actorId 
     * @returns {number} ID de faction (1..8) ou 0 si neutre/inconnu
     */
    getActorFactionId(actorId) {
        if (typeof $gameActors === "undefined" || !$gameActors) {
            if (typeof DEBUGTOOL !== "undefined" && DEBUGTOOL.error) {
                DEBUGTOOL.error("RelationManager.getActorFactionId", "$gameActors introuvable !", { actorId });
            }
            return 0;
        }
        const actor = $gameActors.actor(actorId);
        if (!actor || !actor.social) {
            if (typeof DEBUGTOOL !== "undefined" && DEBUGTOOL.error) {
                DEBUGTOOL.error("RelationManager.getActorFactionId", "Acteur ou composant .social introuvable !", { actorId });
            }
            return 0;
        }
        return Number(actor.social.factionId()) || 0;
    }

    /**
     * Définit l'allégeance de faction d'un acteur
     * @param {number} actorId 
     * @param {number} factionId 
     */
    setActorFactionId(actorId, factionId) {
        if (typeof $gameActors === "undefined" || !$gameActors) {
            if (typeof DEBUGTOOL !== "undefined" && DEBUGTOOL.error) {
                DEBUGTOOL.error("RelationManager.setActorFactionId", "$gameActors introuvable !", { actorId, factionId });
            }
            return;
        }
        const actor = $gameActors.actor(actorId);
        if (!actor || !actor.social) {
            if (typeof DEBUGTOOL !== "undefined" && DEBUGTOOL.error) {
                DEBUGTOOL.error("RelationManager.setActorFactionId", "Acteur ou composant .social introuvable !", { actorId, factionId });
            }
            return;
        }
        actor.social.setFactionId(factionId);
    }

    /**
     * Retourne l'identifiant du leader du groupe (acteur sujet du joueur).
     * @returns {number}
     */
    playerActorId() {
        if (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.leader === "function") {
            const leader = $gameParty.leader();
            if (leader && typeof leader.actorId === "function") {
                return leader.actorId();
            }
        }
        if (typeof DEBUGTOOL !== "undefined" && DEBUGTOOL.error) {
            DEBUGTOOL.error("RelationManager.playerActorId", "$gameParty.leader() introuvable !");
        }
        return 0;
    }

    /**
     * Vérifie sans lazy-loading intempestif si `holderActorId` possède déjà une opinion envers `subjectActorId`.
     * @param {number} subjectActorId ID de l'acteur évalué (propriétaire du registre _opinions)
     * @param {number} holderActorId ID de l'acteur détenteur / émetteur de l'opinion
     * @returns {boolean}
     */
    hasOpinionToSubjectFromHolder(subjectActorId, holderActorId) {
        if (typeof $gameActors === "undefined" || !$gameActors) return false;
        const subject = $gameActors.actor(subjectActorId);
        if (!subject) return false;
        if (typeof subject.hasSocial === "function" && !subject.hasSocial()) return false;
        if (!subject.social || typeof subject.social.hasOpinionFrom !== "function") return false;
        return subject.social.hasOpinionFrom(holderActorId);
    }

    /**
     * Récupère ou instancie l'opinion que `holderActorId` porte envers `subjectActorId`.
     * Exemple : `getOpinionToSubjectFromHolder(playerId, ibanId)` = l'opinion qu'Iban porte envers le joueur.
     * @param {number} subjectActorId ID de l'acteur évalué (propriétaire du registre _opinions)
     * @param {number} holderActorId ID de l'acteur détenteur / émetteur de l'opinion
     * @returns {Game_Relation|null}
     */
    getOpinionToSubjectFromHolder(subjectActorId, holderActorId) {
        if (typeof $gameActors === "undefined" || !$gameActors) {
            if (typeof DEBUGTOOL !== "undefined" && DEBUGTOOL.error) {
                DEBUGTOOL.error("RelationManager.getOpinionToSubjectFromHolder", "$gameActors introuvable !", { subjectActorId, holderActorId });
            }
            return null;
        }
        const subject = $gameActors.actor(subjectActorId);
        if (!subject || !subject.social) {
            if (typeof DEBUGTOOL !== "undefined" && DEBUGTOOL.error) {
                DEBUGTOOL.error("RelationManager.getOpinionToSubjectFromHolder", "Acteur sujet ou composant .social introuvable !", { subjectActorId, holderActorId });
            }
            return null;
        }
        return subject.social.opinionFrom(holderActorId);
    }

    /**
     * Récupère l'opinion qu'un PNJ (`targetActorId`) porte envers le joueur (`leader`),
     * avec initialisation d'héritage de l'affinité de faction lors du premier contact.
     * @param {number} targetActorId ID du PNJ interlocuteur (holder)
     * @returns {Game_Relation|null}
     */
    getRelationWithPlayer(targetActorId) {
        const playerId = this.playerActorId();
        if (!playerId) return null;

        const isNew = !this.hasOpinionToSubjectFromHolder(playerId, targetActorId);
        const relation = this.getOpinionToSubjectFromHolder(playerId, targetActorId);
        if (relation && isNew) {
            // Héritage direct de la Faction du PNJ lors de la première rencontre
            const factionId = this.getActorFactionId(targetActorId);
            if (factionId > 0 && typeof $gameFactions !== "undefined" && $gameFactions) {
                const factionAffinity = $gameFactions.affinity(factionId);
                relation.affinity = factionAffinity;
            }
        }
        return relation;
    }

    /**
     * Retourne toutes les opinions portées envers le joueur (leader).
     * Utilisé par le Carnet Diplomatique (Window_RelationList).
     * @returns {Game_Relation[]}
     */
    getPlayerOpinions() {
        const playerId = this.playerActorId();
        if (!playerId || typeof $gameActors === "undefined" || !$gameActors) return [];
        const player = $gameActors.actor(playerId);
        if (!player) return [];
        if (typeof player.hasSocial === "function" && !player.hasSocial()) return [];
        if (!player.social || typeof player.social.allOpinions !== "function") return [];
        return player.social.allOpinions();
    }

    /**
     * Collecte l'ensemble des opinions sociales déjà instanciées sur les acteurs actifs
     * (sans déclencher le lazy-loading sur les acteurs dont `.social` n'a jamais été sollicité).
     * @returns {Game_Relation[]}
     */
    allActiveRelations() {
        if (typeof $gameActors === "undefined" || !$gameActors || !Array.isArray($gameActors._data)) {
            return [];
        }
        const relations = [];
        for (let i = 1; i < $gameActors._data.length; i++) {
            const actor = $gameActors._data[i];
            if (!actor) continue;
            if (typeof actor.hasSocial === "function" && !actor.hasSocial()) continue;
            if (actor.social && typeof actor.social.allOpinions === "function") {
                relations.push(...actor.social.allOpinions());
            }
        }
        return relations;
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
        const relations = this.allActiveRelations();
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
                // 1. Apaisement progressif de l'agacement avec le temps
                rel.getAgacement(time);

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
        const relations = this.allActiveRelations();

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
                // À 100 d'agacement, l'action est complètement grisée
                if (relation.getAgacement(currentTimestamp) >= 100) {
                    list.push("chat_saturated");
                } else {
                    // Entre 80 et 99 : dernier clic possible qui déclenche la réaction de lassitude
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
        const relation = this.getOpinionToSubjectFromHolder(interaction.actorId1, interaction.actorId2);

        if (relation) {
            // 1. Mise à jour de l'affinité et de la menace
            if (reaction.affinityDelta) {
                relation.changeAffinity(reaction.affinityDelta);
            }
            if (reaction.threatDelta) {
                relation.changeThreat(reaction.threatDelta);
            }

            // 2. Escalade de l'agacement (répétition / coût de base)
            relation.addAgacement(interaction.id, 8, currentTimestamp);

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
