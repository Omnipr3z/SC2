//=============================================================================
// SimCraft 4 - SubScene Subcom
// SC4_SubScene_Subcom.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Sous-scène du terminal SubCom (HUD + Appels Manqués + Contacts + Commandes).
 * @author SimCraft 4 Core Team
 * @help SC4_SubScene_Subcom.js
 * ============================================================================
 * Orchestre l'interface SubCom superposée sur Scene_Map :
 * - Volet Haut-Gauche  : Sprite_SubcomHUD (géré via $guiManager.isSubComActive)
 *                        + Window_SubcomMissedList (overlay transparent)
 * - Volet Bas-Gauche   : Window_SubcomContactCommand (toujours visible, inactif hors mode Appeler)
 * - Volet Droit        : Window_SubcomCommand (Répondre, Rejeter, Appeler, Quitter)
 * - Sous-scène enfant  : SubScene_SubcomDialog (mode 1 hologramme / WindowSubCom)
 * ============================================================================
 */

class SubScene_Subcom extends SubScene_Base {
    initMembers(shipId = null, targetEventId = null) {
        if (Array.isArray(shipId)) {
            targetEventId = shipId[1];
            shipId = shipId[0];
        }
        this._shipId = (shipId !== undefined && shipId !== null) ? Number(shipId) : null;
        const explicitEv = (targetEventId !== undefined && targetEventId !== null && Number(targetEventId) > 0)
            ? Number(targetEventId)
            : null;
        const interpEv = (typeof $gameMap !== "undefined" && $gameMap && $gameMap._interpreter && typeof $gameMap._interpreter.eventId === "function")
            ? $gameMap._interpreter.eventId()
            : 0;
        this._targetEventId = explicitEv !== null ? explicitEv : (interpEv > 0 ? interpEv : 0);

        this._missedListWindow = null;
        this._contactWindow = null;
        this._commandWindow = null;
        this._lastSnapshot = null;
    }

    setGuiSubComActive(active) {
        if (typeof $guiManager !== "undefined" && $guiManager) {
            if (typeof $guiManager.setSubComActive === "function") {
                $guiManager.setSubComActive(Boolean(active));
            } else {
                $guiManager.isSubComActive = Boolean(active);
            }
        }
    }

    captureSnapshot() {
        const mgr = (typeof $subComManager !== "undefined" && $subComManager) ? $subComManager : null;
        const activeCall = mgr ? mgr.activeCall : null;
        const leader = (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.leader === "function")
            ? $gameParty.leader()
            : null;
        const contactsKey = (leader && leader.subCom && typeof leader.subCom.contacts === "function")
            ? leader.subCom.contacts().join(",")
            : "";

        return {
            activeCallId: activeCall ? activeCall.id : 0,
            activeActorId: activeCall ? activeCall.actorId : 0,
            activeMasked: activeCall ? Boolean(activeCall.masked) : false,
            missedCount: (mgr && Array.isArray(mgr._missedCalls)) ? mgr._missedCalls.length : 0,
            unseenCount: (mgr && typeof mgr.getUnseenMissedCount === "function") ? mgr.getUnseenMissedCount() : 0,
            contactsKey: contactsKey
        };
    }

    isSnapshotEqual(a, b) {
        if (!a || !b) return false;
        return (
            a.activeCallId === b.activeCallId &&
            a.activeActorId === b.activeActorId &&
            a.activeMasked === b.activeMasked &&
            a.missedCount === b.missedCount &&
            a.unseenCount === b.unseenCount &&
            a.contactsKey === b.contactsKey
        );
    }

    // ====================================================================
    // CRÉATION DES FENÊTRES
    // ====================================================================

    createDisplayObjects() {
        const boxW = (typeof Graphics !== "undefined") ? Graphics.boxWidth : 1280;
        const boxH = (typeof Graphics !== "undefined") ? Graphics.boxHeight : 720;

        const leftW = 420;
        const rightW = 460;
        const spacing = 20;
        const totalW = leftW + spacing + rightW; // 900
        const totalH = 420;

        const startX = Math.floor((boxW - totalW) / 2);
        const startY = Math.floor((boxH - totalH) / 2);

        // 1. Liste transparente des appels manqués superposée à Sprite_SubcomHUD (420x210)
        if (typeof Window_SubcomMissedList !== "undefined") {
            const missedRect = new Rectangle(startX + 8, startY + 86, leftW - 16, 116);
            this._missedListWindow = new Window_SubcomMissedList(missedRect);
            this.addWindow(this._missedListWindow);
        }

        // 2. Liste des contacts connus (bas gauche, toujours visible mais inactive par défaut)
        if (typeof Window_SubcomContactCommand !== "undefined") {
            const contactRect = new Rectangle(startX, startY + 218, leftW, totalH - 218);
            this._contactWindow = new Window_SubcomContactCommand(contactRect);
            this._contactWindow.setHandler("contact", this.onContactOk.bind(this));
            this._contactWindow.setHandler("ok", this.onContactOk.bind(this));
            this._contactWindow.setHandler("cancel", this.onContactCancel.bind(this));
            this.addWindow(this._contactWindow);
        }

        // 3. Console de commandes SubCom (droite)
        if (typeof Window_SubcomCommand !== "undefined") {
            const cmdRect = new Rectangle(startX + leftW + spacing, startY, rightW, totalH);
            this._commandWindow = new Window_SubcomCommand(cmdRect);
            this._commandWindow.setHandler("answer", this.onAnswer.bind(this));
            this._commandWindow.setHandler("reject", this.onReject.bind(this));
            this._commandWindow.setHandler("call", this.onCall.bind(this));
            this._commandWindow.setHandler("quit", this.onQuit.bind(this));
            this._commandWindow.setHandler("cancel", this.onCancel.bind(this));
            this.addWindow(this._commandWindow);
        }
    }

    refreshAllWindows() {
        if (this._missedListWindow && typeof this._missedListWindow.refresh === "function") {
            this._missedListWindow.refresh();
        }
        if (this._contactWindow && typeof this._contactWindow.refresh === "function") {
            this._contactWindow.refresh();
        }
        if (this._commandWindow && typeof this._commandWindow.refresh === "function") {
            this._commandWindow.refresh();
        }
    }

    // ====================================================================
    // CYCLE DE VIE
    // ====================================================================

    onStart() {
        super.onStart();
        this.setGuiSubComActive(true);
        this.refreshAllWindows();

        if (this._missedListWindow) {
            if (typeof this._missedListWindow.show === "function") this._missedListWindow.show();
            if (typeof this._missedListWindow.open === "function") this._missedListWindow.open();
            if (typeof this._missedListWindow.deactivate === "function") this._missedListWindow.deactivate();
        }
        if (this._contactWindow) {
            if (typeof this._contactWindow.show === "function") this._contactWindow.show();
            if (typeof this._contactWindow.open === "function") this._contactWindow.open();
            if (typeof this._contactWindow.deactivate === "function") this._contactWindow.deactivate();
        }
        if (this._commandWindow) {
            if (typeof this._commandWindow.show === "function") this._commandWindow.show();
            if (typeof this._commandWindow.open === "function") this._commandWindow.open();
            this._commandWindow.select(0);
            this._commandWindow.activate();
        }
        this._lastSnapshot = this.captureSnapshot();
    }

    updateMain() {
        super.updateMain();
        const cur = this.captureSnapshot();
        if (!this.isSnapshotEqual(cur, this._lastSnapshot)) {
            this._lastSnapshot = cur;
            this.refreshAllWindows();
            // Si le joueur parcourait les contacts alors qu'un appel entrant vient d'arriver, rendre le focus au menu principal
            if (cur.activeCallId > 0 && this._contactWindow && this._contactWindow.active) {
                this.onContactCancel();
            }
        }
    }

    onDeactivate() {
        super.onDeactivate();
        this.setGuiSubComActive(false);
        const wins = [this._missedListWindow, this._contactWindow, this._commandWindow];
        for (const w of wins) {
            if (!w) continue;
            if (typeof w.deactivate === "function") w.deactivate();
            if (typeof w.hide === "function") w.hide();
        }
    }

    onReactivate() {
        super.onReactivate();
        this.setGuiSubComActive(true);
        if (this._missedListWindow) {
            if (typeof this._missedListWindow.show === "function") this._missedListWindow.show();
            if (typeof this._missedListWindow.open === "function") this._missedListWindow.open();
            if (typeof this._missedListWindow.deactivate === "function") this._missedListWindow.deactivate();
        }
        if (this._contactWindow) {
            if (typeof this._contactWindow.show === "function") this._contactWindow.show();
            if (typeof this._contactWindow.open === "function") this._contactWindow.open();
            if (typeof this._contactWindow.deactivate === "function") this._contactWindow.deactivate();
        }
        this.refreshAllWindows();
        if (this._commandWindow) {
            if (typeof this._commandWindow.show === "function") this._commandWindow.show();
            if (typeof this._commandWindow.open === "function") this._commandWindow.open();
            this._commandWindow.activate();
        }
        this._lastSnapshot = this.captureSnapshot();
    }

    onSubSceneResume(childSubScene, result = null) {
        super.onSubSceneResume(childSubScene, result);
        this.refreshAllWindows();
        this._lastSnapshot = this.captureSnapshot();
    }

    terminate() {
        this.setGuiSubComActive(false);
        if (typeof $subComManager !== "undefined" && $subComManager && typeof $subComManager.markMissedCallsSeen === "function") {
            $subComManager.markMissedCallsSeen();
        }
        super.terminate();
    }

    onDestroy() {
        this._missedListWindow = null;
        this._contactWindow = null;
        this._commandWindow = null;
    }

    resumeArgs() {
        return [this._shipId, this._targetEventId];
    }

    // ====================================================================
    // HANDLERS
    // ====================================================================

    onAnswer() {
        const mgr = (typeof $subComManager !== "undefined" && $subComManager) ? $subComManager : null;
        const call = mgr && typeof mgr.answerActiveCall === "function" ? mgr.answerActiveCall() : null;
        if (!call) {
            if (typeof SoundManager !== "undefined" && typeof SoundManager.playBuzzer === "function") {
                SoundManager.playBuzzer();
            }
            this.refreshAllWindows();
            if (this._commandWindow) this._commandWindow.activate();
            return;
        }

        this.refreshAllWindows();
        this._lastSnapshot = this.captureSnapshot();

        if (typeof SubScene_SubcomDialog !== "undefined") {
            const evId = (call.eventId && call.eventId > 0) ? call.eventId : this._targetEventId;
            this.openChildSubScene(SubScene_SubcomDialog, call.actorId, evId, call);
        } else if (typeof SubScene_RelationDialog !== "undefined") {
            const evId = (call.eventId && call.eventId > 0) ? call.eventId : this._targetEventId;
            this.openChildSubScene(SubScene_RelationDialog, call.actorId, evId, 1);
        } else if (this._commandWindow) {
            this._commandWindow.activate();
        }
    }

    onReject() {
        const mgr = (typeof $subComManager !== "undefined" && $subComManager) ? $subComManager : null;
        if (mgr && typeof mgr.rejectActiveCall === "function") {
            mgr.rejectActiveCall();
        }
        this.refreshAllWindows();
        this._lastSnapshot = this.captureSnapshot();
        if (this._commandWindow) {
            this._commandWindow.activate();
        }
    }

    onCall() {
        const hasActive = Boolean(this._commandWindow && this._commandWindow.hasActiveCall);
        const hasCallable = Boolean(this._contactWindow && typeof this._contactWindow.hasCallableContacts === "function" && this._contactWindow.hasCallableContacts());
        if (hasActive || !hasCallable) {
            if (typeof SoundManager !== "undefined" && typeof SoundManager.playBuzzer === "function") {
                SoundManager.playBuzzer();
            }
            if (this._commandWindow) this._commandWindow.activate();
            return;
        }

        if (this._commandWindow && typeof this._commandWindow.deactivate === "function") {
            this._commandWindow.deactivate();
        }
        if (this._contactWindow) {
            if (typeof this._contactWindow.firstCallableIndex === "function" && typeof this._contactWindow.select === "function") {
                this._contactWindow.select(this._contactWindow.firstCallableIndex());
            }
            if (typeof this._contactWindow.activate === "function") {
                this._contactWindow.activate();
            }
        }
    }

    onContactOk() {
        const actorId = this._contactWindow && typeof this._contactWindow.currentExt === "function"
            ? Number(this._contactWindow.currentExt()) || 0
            : 0;
        if (actorId <= 0) {
            this.onContactCancel();
            return;
        }

        const mgr = (typeof $subComManager !== "undefined" && $subComManager) ? $subComManager : null;
        const call = (mgr && typeof mgr.startOutgoingCall === "function")
            ? mgr.startOutgoingCall(actorId)
            : { actorId: actorId, masked: false, isOutgoing: true };

        if (!call) {
            if (typeof SoundManager !== "undefined" && typeof SoundManager.playBuzzer === "function") {
                SoundManager.playBuzzer();
            }
            if (this._contactWindow && typeof this._contactWindow.activate === "function") {
                this._contactWindow.activate();
            }
            return;
        }

        if (this._contactWindow && typeof this._contactWindow.deactivate === "function") {
            this._contactWindow.deactivate();
        }
        if (typeof SubScene_SubcomDialog !== "undefined") {
            this.openChildSubScene(SubScene_SubcomDialog, actorId, this._targetEventId, call);
        } else if (typeof SubScene_RelationDialog !== "undefined") {
            this.openChildSubScene(SubScene_RelationDialog, actorId, this._targetEventId, 1);
        } else if (this._commandWindow) {
            this._commandWindow.activate();
        }
    }

    onContactCancel() {
        if (this._contactWindow && typeof this._contactWindow.deactivate === "function") {
            this._contactWindow.deactivate();
        }
        if (this._commandWindow && typeof this._commandWindow.activate === "function") {
            this._commandWindow.activate();
        }
    }

    onQuit() {
        if (typeof $subComManager !== "undefined" && $subComManager && typeof $subComManager.markMissedCallsSeen === "function") {
            $subComManager.markMissedCallsSeen();
        }
        this.close({ closedBy: "subcom" });
    }

    onCancel() {
        this.onQuit();
    }
}

if (typeof window !== "undefined") {
    window.SubScene_Subcom = SubScene_Subcom;
}
if (typeof global !== "undefined") {
    global.SubScene_Subcom = SubScene_Subcom;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = SubScene_Subcom;
}
