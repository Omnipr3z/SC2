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
 * - Window_InteractionRingCommand centré sur le joueur, déployé en arc opposé à l'interlocuteur
 * - Séquence de bulles de dialogue flottantes (Window_BubbleMsg) et restauration du mode visuel
 * 
 * Appel script :
 *   SceneManager._scene.openSubScene(SubScene_RelationDialog, [targetActorId, targetEventId, modeOrOptions]);
 */

class SubScene_RelationDialog extends SubScene_Base {
    constructor(parentScene, ...args) {
        super(parentScene, ...args);
        if (this._targetActorId === undefined) {
            this.initMembers(...args);
        }
    }

    initMembers(targetActorId, targetEventId = null, modeOrOptions = undefined, extraOptions = {}) {
        if (Array.isArray(targetActorId)) {
            if (targetActorId[2] !== undefined) modeOrOptions = targetActorId[2];
            if (targetActorId[3] !== undefined) extraOptions = targetActorId[3];
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

        let options = {};
        let hasExplicitMode = false;
        if (typeof modeOrOptions === "number") {
            options = (extraOptions && typeof extraOptions === "object") ? Object.assign({}, extraOptions) : {};
            options.mode = Math.max(0, Math.floor(modeOrOptions || 0));
            hasExplicitMode = true;
        } else if (modeOrOptions && typeof modeOrOptions === "object") {
            options = Object.assign({}, modeOrOptions);
            hasExplicitMode = (options.mode !== undefined && options.mode !== null);
        }

        const guiMode = (typeof $guiManager !== "undefined" && $guiManager)
            ? ($guiManager.bubbleMode || 0)
            : 0;
        const resolvedMode = hasExplicitMode
            ? Math.max(0, Math.floor(Number(options.mode) || 0))
            : guiMode;

        this._options = options;
        this._bubbleMode = resolvedMode;
        this._bubbleModeRestored = false;
        this._canCancel = (this._options.canCancel !== undefined) ? Boolean(this._options.canCancel) : true;
        this._commandWindow = null;
        this._dialogueSequenceQueue = [];
        this._onDialogueSequenceComplete = null;
        this._waitingForMessage = false;

        if (hasExplicitMode) {
            this.syncBubbleMode();
        }
    }

    get targetActorId() { return this._targetActorId; }
    get targetEventId() { return this._targetEventId; }
    set targetEventId(v) { this._targetEventId = Math.max(0, Number(v) || 0); }
    get bubbleMode() { return this._bubbleMode; }

    syncBubbleMode() {
        if (typeof $guiManager !== "undefined" && $guiManager && typeof $guiManager.setBubbleMode === "function") {
            $guiManager.setBubbleMode(this._bubbleMode);
        }
    }

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
        if (typeof Window_InteractionRingCommand === "undefined") {
            if (typeof DEBUGTOOL !== "undefined" && DEBUGTOOL.error) {
                DEBUGTOOL.error("SubScene_RelationDialog.createCommandWindow", "Window_InteractionRingCommand introuvable ! Vérifiez SC4_Window_InteractionRingCommand.js dans plugins.js.");
            }
            throw new Error("[SC4] Window_InteractionRingCommand introuvable.");
        }
        const rect = this.commandRingRect();
        this._commandWindow = new Window_InteractionRingCommand(rect);
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
        const fallbackTarget = {
            x: Math.floor(((typeof Graphics !== "undefined" ? Graphics.boxWidth : 1280) || 1280) / 2),
            y: Math.floor(((typeof Graphics !== "undefined" ? Graphics.boxHeight : 720) || 720) / 2)
        };
        const playerTarget = (typeof $gamePlayer !== "undefined" && $gamePlayer) ? $gamePlayer : fallbackTarget;
        const otherTarget = (
            this._targetEventId > 0 &&
            typeof $gameMap !== "undefined" &&
            $gameMap &&
            typeof $gameMap.event === "function"
        ) ? $gameMap.event(this._targetEventId) : null;

        if (typeof this._commandWindow.setArcFromTargets === "function") {
            this._commandWindow.setArcFromTargets(playerTarget, otherTarget);
        } else if (typeof this._commandWindow.setArcFromFacing === "function") {
            const facingDir = (typeof playerTarget.direction === "function") ? playerTarget.direction() : 2;
            this._commandWindow.setArcFromFacing(facingDir);
        }

        if (typeof this._commandWindow.openAtTarget === "function") {
            this._commandWindow.openAtTarget(playerTarget);
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
        this.syncBubbleMode();
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
            $gameMessage.add(`${targetTag}${rawText}`);
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
        const opts = (this._bubbleMode > 0 && this._options.mode === undefined)
            ? Object.assign({}, this._options, { mode: this._bubbleMode })
            : this._options;
        return [this._targetActorId, this._targetEventId, opts];
    }

    onSuspend() {
        // La session de dialogue reste préservée pour le retour
    }

    onResume(resumeData = null) {
        this.syncBubbleMode();
        if (this._waitingForMessage) {
            this.hideCommandRing();
        } else {
            this.openCommandRing();
        }
    }

    restoreBubbleModeOnce() {
        if (this._bubbleModeRestored) return;
        this._bubbleModeRestored = true;
        if (typeof $guiManager !== "undefined" && $guiManager && typeof $guiManager.restoreLastBubbleMode === "function") {
            $guiManager.restoreLastBubbleMode();
        }
    }

    terminate() {
        this.restoreBubbleModeOnce();
        if (typeof super.terminate === "function") {
            super.terminate();
        }
    }

    onCommandCancel() {
        if (typeof SubSceneManager !== "undefined") {
            SubSceneManager.clear();
        }
        if (typeof $relationDialogManager !== "undefined" && $relationDialogManager) {
            $relationDialogManager.endExchange();
        }
        this.restoreBubbleModeOnce();
        this.close();
    }
}

if (typeof window !== "undefined") {
    window.SubScene_RelationDialog = SubScene_RelationDialog;
}
if (typeof module !== "undefined") {
    module.exports = SubScene_RelationDialog;
}
