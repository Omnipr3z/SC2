//=============================================================================
// SimCraft 4 - SubScene RelationDialog
// SC4_SubScene_RelationDialog.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Sous-scène d'interaction et de dialogue social superposée sur Scene_Map.
 * @author SimCraft
 * @help SC4_SubScene_RelationDialog.js
 * 
 * Orchestre les fenêtres d'échange social sur la carte sans décharger Scene_Map :
 * - Volet Faction PJ (gauche)
 * - Volet Faction PNJ (droite)
 * - Statut Relationnel (centre haut)
 * - Commandes d'Interaction (centre bas)
 * - Bulle de dialogue retour
 * 
 * Appel script :
 *   SceneManager._scene.openSubScene(SubScene_RelationDialog, [targetActorId]);
 */

class SubScene_RelationDialog extends SubScene_Base {
    constructor(parentScene, ...args) {
        super(parentScene, ...args);
        if (this._targetActorId === undefined) {
            this.initMembers(...args);
        }
    }

    initMembers(targetActorId, targetEventId = null) {
        if (Array.isArray(targetActorId)) {
            targetEventId = targetActorId[1];
            targetActorId = targetActorId[0];
        }
        this._targetActorId = Number(targetActorId) || 0;

        const explicitId = (targetEventId !== undefined && targetEventId !== null && Number(targetEventId) > 0)
            ? Number(targetEventId)
            : null;
        const interpreterId = (typeof $gameMap !== "undefined" && $gameMap && $gameMap._interpreter && typeof $gameMap._interpreter.eventId === "function")
            ? $gameMap._interpreter.eventId()
            : 0;

        this._targetEventId = explicitId !== null ? explicitId : (interpreterId > 0 ? interpreterId : 0);
        this._playerFactionWindow = null;
        this._npcFactionWindow = null;
        this._relationStatusWindow = null;
        this._commandWindow = null;
        this._bubbleWindow = null;
        this._dialogueSequenceQueue = [];
        this._onDialogueSequenceComplete = null;
        this._waitingForMessage = false;
    }

    get targetActorId() { return this._targetActorId; }
    get targetEventId() { return this._targetEventId; }
    set targetEventId(v) { this._targetEventId = Math.max(0, Number(v) || 0); }

    dialRect() {
        const dialogW = Graphics.boxWidth;
        const dialogH = Graphics.boxHeight;
        const startX = 0;
        const startY = 0;

        return new Rectangle(startX, startY, dialogW, dialogH);
    }
    playerFactionRect() {
        const rect = this.dialRect();

        return new Rectangle(rect.x, rect.y, 260, 160);
    }
    npcFactionRect() {
        const rect = this.dialRect();

        return new Rectangle(rect.x + 260, rect.y, 260, 160);
    }
    relationStatusRect() {
        const rect = this.dialRect();

        return new Rectangle(rect.x + 260 * 2, rect.y, 420, 160);
    }
    commandWindowRect() {
        const rect = this.dialRect();

        return new Rectangle(rect.x + 260 * 2, rect.y + 180, 420, 140);
    }

    createPlayerFactionWindow() {
        const playerFactionId = $relationManager.getActorFactionId(1);
        const pRect = this.playerFactionRect();

        this._playerFactionWindow = new Window_FactionInfo(pRect);
        this._playerFactionWindow.setFaction(playerFactionId, "Votre Faction");
        this.addWindow(this._playerFactionWindow);
    }
    createNpcFactionRect() {
        const npcFactionId = $relationManager.getActorFactionId(this._targetActorId);
        const nRect = this.npcFactionRect();

        this._npcFactionWindow = new Window_FactionInfo(nRect);
        this._npcFactionWindow.setFaction(npcFactionId, "Faction Cible");
        this.addWindow(this._npcFactionWindow);
    }
    createRelationStatusWindow(session) {
        const relation = session.relation;
        const sRect = this.relationStatusRect();
        const targetActor = $gameActors.actor(this._targetActorId);

        this._relationStatusWindow = new Window_RelationStatus(sRect);
        this._relationStatusWindow.setRelation(relation, targetActor);
        this.addWindow(this._relationStatusWindow);
    }
    createCommandWindowRect(session) {
        const cRect = this.commandWindowRect();

        this._commandWindow = new Window_InteractionCommand(cRect);
        this._commandWindow.setAvailableInteractions(session.availableInteractions || ["chat"]);
        this._commandWindow.setHandler("chat", this.onCommandChat.bind(this));
        this._commandWindow.setHandler("cancel", this.onCommandCancel.bind(this));
        this.addWindow(this._commandWindow);
    }
    createDisplayObjects() {
        const session = $relationDialogManager.startExchange(this._targetActorId);
        const relation = session.relation;

        this.createPlayerFactionWindow();
        this.createNpcFactionRect();
        this.createRelationStatusWindow(session, relation);
        this.createCommandWindowRect(session);
    }

    onCommandChat() {
        if (typeof $relationDialogManager === "undefined" || !$relationDialogManager) return;

        $relationDialogManager.selectInteraction("chat");
        const reaction = $relationDialogManager.executeCurrentInteraction();
        $relationDialogManager.confirmReaction();

        // Rafraîchir les fenêtres avec les nouvelles stats
        if (this._relationStatusWindow) {
            this._relationStatusWindow.refresh();
        }

        // Afficher la bulle de réplique ou message sonore (simple ou séquence)
        if (reaction && reaction.dialogueText) {
            if (typeof SoundManager !== "undefined" && SoundManager.playOk) {
                SoundManager.playOk();
            }

            const sequence = (typeof reaction.dialogueSequence === "function")
                ? reaction.dialogueSequence()
                : (Array.isArray(reaction.dialogueText)
                    ? reaction.dialogueText.map(t => ({ target: "npc", text: t }))
                    : [{ target: "npc", text: reaction.dialogueText }]);

            this.playDialogueSequence(sequence, () => {
                // Clôture automatique si demandée par la réaction (ex: PNJ agacé, hostile ou congédiement)
                if (reaction && reaction.shouldCloseScene) {
                    this.onCommandCancel();
                } else if (this._commandWindow && typeof this._commandWindow.activate === "function") {
                    this._commandWindow.activate();
                }
            });
        } else if (reaction && reaction.shouldCloseScene) {
            this.onCommandCancel();
        }

        // Réactualiser les commandes disponibles (ex: saturation / cooldown)
        if (this._commandWindow && typeof $relationManager !== "undefined") {
            const updated = $relationManager.getAvailableInteractions(this._targetActorId);
            this._commandWindow.setAvailableInteractions(updated);
        }
    }

    /**
     * Lance la lecture d'une séquence de répliques (monologue ou ping-pong PNJ/Joueur)
     * @param {Array<{target: string|number, text: string}>} sequence 
     * @param {Function} onComplete 
     */
    playDialogueSequence(sequence, onComplete) {
        if (!sequence || sequence.length === 0) {
            if (onComplete) onComplete();
            return;
        }
        if (this._commandWindow && typeof this._commandWindow.deactivate === "function") {
            this._commandWindow.deactivate();
        }
        this._dialogueSequenceQueue = sequence.slice();
        this._onDialogueSequenceComplete = onComplete;
        this._waitingForMessage = false;
        this.processNextDialogueMessage();
    }

    /**
     * Traite et injecte le prochain message de la séquence dans $gameMessage
     */
    processNextDialogueMessage() {
        if (!this._dialogueSequenceQueue || this._dialogueSequenceQueue.length === 0) {
            this._waitingForMessage = false;
            if (this._onDialogueSequenceComplete) {
                const cb = this._onDialogueSequenceComplete;
                this._onDialogueSequenceComplete = null;
                cb();
            }
            return;
        }

        const step = this._dialogueSequenceQueue.shift();
        const rawText = (step && step.text) ? String(step.text) : "";
        let targetTag = "";

        if (!rawText.startsWith("\\A") && !rawText.startsWith("\\E[")) {
            if (step.target === "player" || step.target === "pj" || step.target === 0) {
                targetTag = "\\A";
            } else if (typeof step.target === "number" && step.target > 0) {
                targetTag = `\\E[${step.target}]`;
            } else {
                targetTag = (this._targetEventId > 0) ? `\\E[${this._targetEventId}]` : "";
            }
        }

        if (typeof $gameMessage !== "undefined" && $gameMessage) {
            $gameMessage.add(`${targetTag}\\C[15]${rawText}\\C[0]`);
        }
        this._waitingForMessage = true;
    }

    update() {
        if (typeof super.update === "function") {
            super.update();
        } else {
            this.updateMain();
        }
    }

    updateMain() {
        if (typeof super.updateMain === "function") {
            super.updateMain();
        }
        if (this._waitingForMessage) {
            const isBusy = (typeof $gameMessage !== "undefined" && $gameMessage && typeof $gameMessage.isBusy === "function")
                ? $gameMessage.isBusy()
                : false;
            if (!isBusy) {
                this._waitingForMessage = false;
                this.processNextDialogueMessage();
            }
        }
    }

    onCommandCancel() {
        if (typeof $relationDialogManager !== "undefined" && $relationDialogManager) {
            $relationDialogManager.endExchange();
        }
        this.close();
    }
}

if (typeof window !== "undefined") {
    window.SubScene_RelationDialog = SubScene_RelationDialog;
}
if (typeof module !== "undefined") {
    module.exports = SubScene_RelationDialog;
}
