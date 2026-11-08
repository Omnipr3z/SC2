//=============================================================================
// RPG Maker MZ - SC4_StoryManager
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Moteur scénaristique, Nœuds Narratifs, Dualité Ordre/Liberté et Nexus ($storyManager).
 * @author SimCraft
 * @base SC4_Game_Factions
 * 
 * @help SC4_StoryManager.js
 * 
 * Architecture Narrative à Fins Multiples (La Saga du Nexus) :
 * 
 * 1. Dualité Fondamentale :
 *    - Le joueur choisit ultimement sa posture majeure : ORDRE (Fédération / SFI) vs LIBERTÉ (Rébellion).
 *    - Son objectif diplomatique est de rallier les factions satellites à sa cause :
 *      Elions, Atrons, Gentech, Consortium Saurion, Draks, ou Culte (voie chaotique).
 * 
 * 2. Les 5 Nœuds Majeurs vers le Nexus :
 *    - Nœud 1 : La Conférence de Neotori (Diplomatie, découverte du Nexus, porteur d'énergie, fuite incognito).
 *    - Nœud 2 : Le Réveil des Atrons (Dilemme philosophique de reZero, éradication vs éveil vs médiation Elionne).
 *    - Nœud 3 : La Bataille d'Ankaros (Contrôle du Nexus via le Héros, alliance Gentech ou Saurion/Culte).
 *    - Nœud 4 : La Bataille d'Arakna (Menace du mutagène du Culte sur la Reine Pondeuse, chaos vs endiguement).
 *    - Nœud 5 : La Conquête du Nexus (Bataille majeure finale scellant la domination du secteur).
 * 
 * 3. After Main Quest :
 *    - Une fois le Nexus contrôlé, transition vers la phase 4X du secteur spatial.
 */

class StoryManager {
    constructor() {
        this._currentChapter = 1;
        this._storyFlags = {};

        // Les 5 Nœuds Narratifs Majeurs
        this._majorNodes = {
            node1: {
                id: "node1",
                resolved: false,
                choice: null,
                title: "La Conférence de Neotori",
                desc: "Conflit diplomatique, découverte du Nexus, fuite en porteur d'énergie incognito"
            },
            node2: {
                id: "node2",
                resolved: false,
                choice: null,
                title: "Le Réveil des Atrons",
                desc: "Dilemme philosophique de reZero, éradication vs éveil conscient vs médiation Elionne"
            },
            node3: {
                id: "node3",
                resolved: false,
                choice: null,
                title: "La Bataille d'Ankaros",
                desc: "Révélation du contrôle du Nexus via le Héros, super-arme du Culte, défense Gentech ou assaut Saurions"
            },
            node4: {
                id: "node4",
                resolved: false,
                choice: null,
                title: "La Bataille d'Arakna",
                desc: "Mutagène du Culte sur la Reine Pondeuse, chaos toxique vs endiguement héroïque"
            },
            node5: {
                id: "node5",
                resolved: false,
                choice: null,
                title: "La Conquête du Nexus",
                desc: "Bataille spatiale majeure finale pour la domination du secteur et passage en mode 4X"
            }
        };

        // Dualité Majeure : Ordre vs Liberté
        this._coreAlignment = {
            order: 0,    // Fédération Humaine / SFI
            liberty: 0   // Rébellion / Alliances Libres
        };

        // Alignement et réputation des factions satellites
        this._narrativeAlignment = {
            rebellion: 0,
            federation: 0,
            gentech: 0,
            saurions: 0,
            elions: 0,
            atrons: 0,
            draks: 0,
            culte: 0,
            syndicate: 0
        };

        // Relations & Compagnons clés
        this._companionStates = {
            reZero: {
                bugPreserved: true, // Si true : croit à l'intelligence organique ; si false : renie son bug
                relationship: 0
            }
        };

        // État de convergence du Nexus et Post-Main-Quest (4X)
        this._nexusState = {
            unlocked: false,
            resolved: false,
            carrierEnergyAwakened: false,
            dominantFaction: null,
            playerTitle: null,
            postGame4XActive: false
        };
    }

    // --- ACCÈS AUX ÉTATS NARRATIFS ---

    chapter() {
        return this._currentChapter;
    }

    setChapter(chapter) {
        this._currentChapter = Number(chapter);
    }

    getFlag(flagName) {
        return Boolean(this._storyFlags[flagName]);
    }

    setFlag(flagName, value = true) {
        this._storyFlags[flagName] = Boolean(value);
    }

    node(nodeId) {
        return this._majorNodes[nodeId] || null;
    }

    isNodeResolved(nodeId) {
        const n = this.node(nodeId);
        return n ? Boolean(n.resolved) : false;
    }

    resolveNode(nodeId, choice, outcomeData = {}) {
        const n = this.node(nodeId);
        if (!n) return;
        n.resolved = true;
        n.choice = choice;
        n.resolvedAt = window.$gameDate ? window.$gameDate.timestamp : 0;
        Object.assign(n, outcomeData);

        this.evaluateNexusConvergence();
    }

    // --- DUALITÉ FONDAMENTALE : ORDRE VS LIBERTÉ ---

    coreAlignment(type) {
        return this._coreAlignment[type] || 0;
    }

    modifyCoreAlignment(type, delta) {
        if (this._coreAlignment[type] !== undefined) {
            this._coreAlignment[type] += Number(delta);
        }
    }

    mainStance() {
        return this._coreAlignment.order >= this._coreAlignment.liberty ? "order" : "liberty";
    }

    // --- ALIGNEMENT DES FACTIONS SATELLITES ---

    alignment(factionKey) {
        return this._narrativeAlignment[factionKey] || 0;
    }

    modifyAlignment(factionKey, delta) {
        if (this._narrativeAlignment[factionKey] === undefined) {
            this._narrativeAlignment[factionKey] = 0;
        }
        this._narrativeAlignment[factionKey] += Number(delta);
        this.evaluateNexusConvergence();
    }

    // --- ÉTATS DES COMPAGNONS CLÉS ---

    isReZeroBugPreserved() {
        return Boolean(this._companionStates.reZero.bugPreserved);
    }

    setReZeroBugPreserved(preserved = true) {
        this._companionStates.reZero.bugPreserved = Boolean(preserved);
    }

    // --- CONVERGENCE VERS LE NEXUS & AFTER MAIN QUEST ---

    resolvedNodesCount() {
        return Object.values(this._majorNodes).filter(n => n.resolved).length;
    }

    isNexusUnlocked() {
        return this._nexusState.unlocked;
    }

    isAfterMainQuest() {
        return Boolean(this._nexusState.postGame4XActive);
    }

    evaluateNexusConvergence() {
        const resolved = this.resolvedNodesCount();
        if (resolved >= 5 && !this._nexusState.unlocked) {
            this._nexusState.unlocked = true;
            this.calculateDominantFaction();
            if (window.$systemMapManager) {
                window.$systemMapManager.log("alert", "NEXUS BATTLE: La convergence des 5 noeuds a déverrouillé la conquête finale.");
            }
        }
    }

    calculateDominantFaction() {
        let maxScore = -Infinity;
        let dominant = "neutral";
        for (const [faction, score] of Object.entries(this._narrativeAlignment)) {
            if (score > maxScore) {
                maxScore = score;
                dominant = faction;
            }
        }
        this._nexusState.dominantFaction = dominant;
        return dominant;
    }

    resolveNexus(finalOutcome, playerTitle) {
        this._nexusState.resolved = true;
        this._nexusState.finalOutcome = finalOutcome;
        this._nexusState.postGame4XActive = true;
        this._nexusState.playerTitle = playerTitle || this.computeDefaultPlayerTitle();

        if (window.$systemMapManager) {
            window.$systemMapManager.log("success", "NEXUS CONQUÉRANT: Contrôle établi. Transition vers la phase 4X du secteur.");
        }
    }

    computeDefaultPlayerTitle() {
        const dom = this._nexusState.dominantFaction;
        switch (dom) {
            case "rebellion": return "Commandeur de la Libération";
            case "federation": return "Haut Légat Fédéral";
            case "gentech": return "Directeur Général Gentech";
            case "saurions":
            case "syndicate": return "Baron du Cartel";
            case "culte": return "Héraut du Néant";
            default: return "Souverain Indépendant";
        }
    }

    // --- ÉCOUTEURS D'ÉVÉNEMENTS DE QUÊTE (RUISSELLEMENT) ---

    onQuestStarted(questId) {
        // Enregistre l'activation de la quête dans l'historique narratif
    }

    onQuestStepAdvanced(questId, stepIndex) {
        // Avancement d'étape
    }

    onQuestCompleted(questId, outcome = "default") {
        // Hook de ruissellement pour les quêtes majeures
    }

    onQuestFailed(questId) {
        // Conséquences d'échec
    }

    // --- SAUVEGARDE & PERSISTANCE ---

    makeSavefileData() {
        return {
            chapter: this._currentChapter,
            flags: this._storyFlags,
            nodes: this._majorNodes,
            coreAlignment: this._coreAlignment,
            alignment: this._narrativeAlignment,
            companionStates: this._companionStates,
            nexus: this._nexusState
        };
    }

    loadSavefileData(data) {
        if (!data) return;
        this._currentChapter = data.chapter || 1;
        this._storyFlags = data.flags || {};
        this._majorNodes = data.nodes || this._majorNodes;
        this._coreAlignment = data.coreAlignment || this._coreAlignment;
        this._narrativeAlignment = data.alignment || this._narrativeAlignment;
        this._companionStates = data.companionStates || this._companionStates;
        this._nexusState = data.nexus || this._nexusState;
    }
}

window.StoryManager = StoryManager;
if (typeof module !== "undefined" && module.exports) {
    module.exports = StoryManager;
}
