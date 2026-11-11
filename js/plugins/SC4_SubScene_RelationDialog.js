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
 * Orchestre l'échange social sur la carte sans décharger Scene_Map ni dimmer :
 * - HUD Interlocuteur + Allégeance Joueur pilotés directement par $guiManager / $relationManager
 * - Window_RingCommand centré sur le joueur, déployé en arc opposé à son regard
 * - Séquence de bulles de dialogue flottantes (Window_BubbleMsg)
 * 
 * Appel script :
 *   SceneManager._scene.openSubScene(SubScene_RelationDialog, [targetActorId, targetEventId]);
 */

class SubScene_RelationDialog extends SubScene_Base {
    constructor(parentScene, ...args) {
        super(parentScene, ...args);
        if (this._targetActorId === undefined) {
            this.initMembers(...args);
        }
    }

    initMembers(targetActorId, targetEventId = null, options = {}) {
        if (Array.isArray(targetActorId)) {
            options = targetActorId[2] || options;
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
        this._options = (options && typeof options === "object") ? options : {};
        this._canCancel = (this._options.canCancel !== undefined) ? Boolean(this._options.canCancel) : true;
        this._commandWindow = null;
        this._dialogueSequenceQueue = [];
        this._onDialogueSequenceComplete = null;
        this._waitingForMessage = false;
    }

    get targetActorId() { return this._targetActorId; }
    get targetEventId() { return this._targetEventId; }
    set targetEventId(v) { this._targetEventId = Math.max(0, Number(v) || 0); }

    commandRingRect() {
        const size = 420;
        return new Rectangle(0, 0, size, size);
    }

    buildRingCommands(availableInteractions = []) {
        const interactions = Array.isArray(availableInteractions) ? availableInteractions : [];
        const cmds = [];

        if (interactions.includes("chat")) {
            cmds.push({ name: "\\L[relation.cmd_chat]", symbol: "chat", enabled: true, icon: "💬" });
        } else if (interactions.includes("chat_saturated")) {
            cmds.push({ name: "\\L[relation.cmd_chat_saturated]", symbol: "chat", enabled: false, icon: "💬" });
        } else {
            cmds.push({ name: "\\L[relation.cmd_chat_cooldown]", symbol: "chat", enabled: false, icon: "💬" });
        }

        if (interactions.includes("intimidate")) {
            cmds.push({ name: "\\L[relation.cmd_intimidate]", symbol: "intimidate", enabled: true, icon: "⚡" });
        }
        if (interactions.includes("recruit")) {
            cmds.push({ name: "\\L[relation.cmd_recruit]", symbol: "recruit", enabled: true, icon: "🤝" });
        }

        if (this._canCancel) {
            cmds.push({ name: "\\L[relation.cmd_leave]", symbol: "cancel", enabled: true, icon: "❌" });
        }

        return cmds;
    }

    createCommandWindow(session) {
        const rect = this.commandRingRect();
        this._commandWindow = new Window_RingCommand(rect);
        if (typeof this._commandWindow.setCanCancel === "function") {
            this._commandWindow.setCanCancel(this._canCancel);
        }

        const available = (session && session.availableInteractions) ? session.availableInteractions : ["chat"];
        this.applyAvailableCommands(available);

        this._commandWindow.setHandler("chat", this.onCommandChat.bind(this));
        this._commandWindow.setHandler("cancel", this.onCommandCancel.bind(this));
        this.addWindow(this._commandWindow);
        this.openCommandRing();
    }

    applyAvailableCommands(availableInteractions = []) {
        if (!this._commandWindow || typeof this._commandWindow.setCommands !== "function") return;
        const cmds = this.buildRingCommands(availableInteractions);
        this._commandWindow.setCommands(cmds);
    }

    openCommandRing() {
        if (!this._commandWindow) return;
        const facingDir = (typeof $gamePlayer !== "undefined" && $gamePlayer && typeof $gamePlayer.direction === "function")
            ? $gamePlayer.direction()
            : 2;
        if (typeof this._commandWindow.setArcFromFacing === "function") {
            this._commandWindow.setArcFromFacing(facingDir);
        }
        const target = (typeof $gamePlayer !== "undefined" && $gamePlayer)
            ? $gamePlayer
            : { x: Math.floor(((typeof Graphics !== "undefined" ? Graphics.boxWidth : 1280) || 1280) / 2), y: Math.floor(((typeof Graphics !== "undefined" ? Graphics.boxHeight : 720) || 720) / 2) };
        if (typeof this._commandWindow.openAtTarget === "function") {
            this._commandWindow.openAtTarget(target);
        } else if (typeof this._commandWindow.activate === "function") {
            this._commandWindow.activate();
        }
    }

    hideCommandRing() {
        if (!this._commandWindow) return;
        if (typeof this._commandWindow.deactivate === "function") {
            this._commandWindow.deactivate();
        }
        if (typeof this._commandWindow.hide === "function") {
            this._commandWindow.hide();
        }
    }

    createDisplayObjects() {
        const session = $relationDialogManager.startExchange(this._targetActorId);
        this.createCommandWindow(session);
    }

    onCommandChat() {
        if (typeof $relationDialogManager === "undefined" || !$relationDialogManager) return;

        $relationDialogManager.selectInteraction("chat");
        const reaction = $relationDialogManager.executeCurrentInteraction();
        $relationDialogManager.confirmReaction();

        // Réactualiser les commandes disponibles (agacement / saturation / cooldown)
        if (this._commandWindow && typeof $relationManager !== "undefined") {
            const updated = $relationManager.getAvailableInteractions(this._targetActorId);
            this.applyAvailableCommands(updated);
        }

        // Afficher la bulle de réplique ou séquence ping-pong
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
                if (reaction && reaction.shouldCloseScene) {
                    this.onCommandCancel();
                } else {
                    this.openCommandRing();
                }
            });
        } else if (reaction && reaction.shouldCloseScene) {
            this.onCommandCancel();
        } else {
            this.openCommandRing();
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
        this.hideCommandRing();
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

    // ========================================================================
    // PERSISTANCE & CYCLE DE VIE (SubSceneManager)
    // ========================================================================

    resumeArgs() {
        return [this._targetActorId, this._targetEventId, this._options];
    }

    onSuspend() {
        // La session de dialogue reste préservée pour le retour
    }

    onResume(resumeData = null) {
        if (this._waitingForMessage) {
            this.hideCommandRing();
        } else {
            this.openCommandRing();
        }
    }

    onCommandCancel() {
        if (typeof SubSceneManager !== "undefined") {
            SubSceneManager.clear();
        }
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
