//=============================================================================
// SimCraft 4 - SubScene SubcomDialog
// SC4_SubScene_SubcomDialog.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Sous-scène d'échange SubCom à distance (hérite de SubScene_RelationDialog).
 * @author SimCraft
 * @help SC4_SubScene_SubcomDialog.js
 * ============================================================================
 * Sous-classe spécialisée de SubScene_RelationDialog pour les communications
 * SubCom en direct :
 * - Force le mode visuel SubCom (mode 1 : WindowSubCom, filtre hologramme vert).
 * - Supporte les appelants masqués ("Signal Masqué") et la révélation dynamique.
 * - Remplace le bouton Quitter par Raccrocher (\L[subcom.cmd_hangup]).
 * - Nettoie l'état d'échange $subComManager.endActiveDialog() à la fermeture.
 * ============================================================================
 */

class SubScene_SubcomDialog extends SubScene_RelationDialog {
    initMembers(targetActorId, targetEventId = null, callDataOrOptions = {}, extraOptions = {}) {
        let resolvedActorId = targetActorId;
        let resolvedEventId = targetEventId;
        let resolvedThird = callDataOrOptions;
        let resolvedExtra = extraOptions;

        if (Array.isArray(targetActorId)) {
            resolvedActorId = targetActorId[0];
            resolvedEventId = targetActorId[1];
            if (targetActorId[2] !== undefined) resolvedThird = targetActorId[2];
            if (targetActorId[3] !== undefined) resolvedExtra = targetActorId[3];
        }

        let callData = null;
        let options = {};

        if (resolvedThird && typeof resolvedThird === "object") {
            const looksLikeCallData = (
                resolvedThird.actorId !== undefined ||
                resolvedThird.masked !== undefined ||
                resolvedThird.id !== undefined ||
                resolvedThird.startTimestamp !== undefined ||
                resolvedThird.isOutgoing !== undefined
            );
            if (looksLikeCallData) {
                callData = resolvedThird;
                if (resolvedThird.options && typeof resolvedThird.options === "object") {
                    options = Object.assign({}, resolvedThird.options);
                }
            } else {
                options = Object.assign({}, resolvedThird);
            }
        }

        if (resolvedExtra && typeof resolvedExtra === "object") {
            Object.assign(options, resolvedExtra);
        }

        const effectiveEventId = (
            resolvedEventId !== undefined &&
            resolvedEventId !== null &&
            Number(resolvedEventId) > 0
        )
            ? Number(resolvedEventId)
            : (callData && Number(callData.eventId) > 0 ? Number(callData.eventId) : null);

        options.mode = 1; // Mode SubCom obligatoire
        super.initMembers(resolvedActorId, effectiveEventId, options);
        this._callData = callData;
    }

    get callData() {
        return this._callData || null;
    }

    isMaskedInterlocutor() {
        if (
            typeof $subComManager !== "undefined" &&
            $subComManager &&
            $subComManager.currentDialogCall &&
            $subComManager.currentDialogCall.actorId === this._targetActorId
        ) {
            return Boolean($subComManager.currentDialogCall.masked);
        }
        return Boolean(this._callData && this._callData.masked);
    }

    maskedLabel() {
        if (
            typeof $subComManager !== "undefined" &&
            $subComManager &&
            $subComManager.currentDialogCall &&
            $subComManager.currentDialogCall.actorId === this._targetActorId &&
            $subComManager.currentDialogCall.maskedLabel
        ) {
            return $subComManager.currentDialogCall.maskedLabel;
        }
        if (this._callData && this._callData.maskedLabel) {
            return this._callData.maskedLabel;
        }
        return null;
    }

    buildRingCommands(availableInteractions = []) {
        const cmds = super.buildRingCommands(availableInteractions);
        for (const cmd of cmds) {
            if (cmd && cmd.symbol === "cancel") {
                cmd.name = "\\L[subcom.cmd_hangup]";
                cmd.icon = "📴";
            }
        }
        return cmds;
    }

    terminate() {
        if (typeof $subComManager !== "undefined" && $subComManager && typeof $subComManager.endActiveDialog === "function") {
            $subComManager.endActiveDialog();
        }
        super.terminate();
    }

    resumeArgs() {
        const opts = (this._bubbleMode > 0 && this._options.mode === undefined)
            ? Object.assign({}, this._options, { mode: this._bubbleMode })
            : this._options;
        return [this._targetActorId, this._targetEventId, this._callData || opts, opts];
    }

    onCommandCancel() {
        if (typeof $subComManager !== "undefined" && $subComManager && typeof $subComManager.endActiveDialog === "function") {
            $subComManager.endActiveDialog();
        }
        if (typeof $relationDialogManager !== "undefined" && $relationDialogManager) {
            $relationDialogManager.endExchange();
        }
        this.restoreBubbleModeOnce();
        this.close({
            closedBy: "subcom_dialog",
            actorId: this._targetActorId,
            callData: this._callData
        });
    }
}

if (typeof window !== "undefined") {
    window.SubScene_SubcomDialog = SubScene_SubcomDialog;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = SubScene_SubcomDialog;
}
