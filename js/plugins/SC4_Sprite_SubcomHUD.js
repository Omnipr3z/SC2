//=============================================================================
// RPG Maker MZ - SC4_Sprite_SubcomHUD.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Panneau HUD d'état SubCom temps réel et appels manqués (Sprite_SubcomHUD).
 * @author SimCraft 4
 *
 * @help SC4_Sprite_SubcomHUD.js
 * ============================================================================
 * Hérite de Sprite_HudBase.
 * Affiché sur Scene_Map (sous WindowLayer) lorsque $guiManager.isSubComActive
 * vaut true :
 * - Fond cyber-holo dessiné procéduralement (420x210) en haut à gauche du pupitre SubCom.
 * - Bannière temps réel de l'appel entrant actif (nom ou Signal Masqué).
 * - En-tête de la liste des appels manqués (accueillant Window_SubcomMissedList).
 * ============================================================================
 */

class Sprite_SubcomHUD extends Sprite_HudBase {
    constructor(data) {
        super(data);
    }

    init(data) {
        super.init(data);
        const boxW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
        const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;
        const leftW = 420;
        const rightW = 460;
        const spacing = 20;
        const totalW = leftW + spacing + rightW; // 900
        const totalH = 420;
        const startX = Math.floor((boxW - totalW) / 2);
        const startY = Math.floor((boxH - totalH) / 2);

        this._hudRect = new Rectangle(startX, startY, leftW, 210);
        this._hudType = "subcom";
    }

    create() {
        const rect = this.hudRect;
        this.x = rect.x;
        this.y = rect.y;
        super.create();
    }

    isSystemVisible() {
        return Boolean(
            typeof $guiManager !== "undefined" &&
            $guiManager &&
            $guiManager.isSubComActive
        );
    }

    hasValidData() {
        return true;
    }

    activeCall() {
        return (typeof $subComManager !== "undefined" && $subComManager && $subComManager.activeCall)
            ? $subComManager.activeCall
            : null;
    }

    resolveCallerName(call) {
        if (!call) return "";
        if (call.masked) {
            return call.maskedLabel || this.loc("subcom.masked_signal", "Signal Masqué");
        }
        const actor = (typeof $gameActors !== "undefined" && $gameActors && typeof $gameActors.actor === "function")
            ? $gameActors.actor(call.actorId)
            : null;
        return actor ? actor.name() : `#${call.actorId}`;
    }

    getCurrentData() {
        const call = this.activeCall();
        const mgr = (typeof $subComManager !== "undefined" && $subComManager) ? $subComManager : null;
        const unseen = (mgr && typeof mgr.getUnseenMissedCount === "function") ? mgr.getUnseenMissedCount() : 0;
        const missedTotal = (mgr && Array.isArray(mgr._missedCalls)) ? mgr._missedCalls.length : 0;

        return {
            activeCallId: call ? call.id : 0,
            activeActorId: call ? call.actorId : 0,
            activeMasked: call ? Boolean(call.masked) : false,
            activeCallerName: call ? this.resolveCallerName(call) : "",
            unseenCount: unseen,
            missedTotal: missedTotal
        };
    }

    createBgLayer() {
        const rect = this.hudRect;
        const bitmap = new Bitmap(rect.width, rect.height);
        const ctx = bitmap.context;
        if (ctx) {
            ctx.save();
            // Fond sombre cybernétique
            ctx.fillStyle = "rgba(10, 18, 28, 0.90)";
            ctx.fillRect(0, 0, rect.width, rect.height);

            // Lignes de balayage discrètes
            ctx.fillStyle = "rgba(56, 189, 248, 0.04)";
            for (let y = 4; y < rect.height; y += 6) {
                ctx.fillRect(2, y, rect.width - 4, 2);
            }

            // Bordure principale néon cyan
            ctx.strokeStyle = "rgba(56, 189, 248, 0.72)";
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, rect.width - 2, rect.height - 2);

            // Séparateur sous la bannière d'appel
            ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(10, 82);
            ctx.lineTo(rect.width - 10, 82);
            ctx.stroke();
            ctx.restore();
        }
        if (bitmap._baseTexture && typeof bitmap._baseTexture.update === "function") {
            bitmap._baseTexture.update();
        }
        this._bgSprite = new Sprite(bitmap);
        this.addChild(this._bgSprite);
    }

    createHudContents() {
        this.createContentsLayer();
    }

    drawHud() {
        const ctx = this.contentCtx;
        if (!ctx) return;

        const w = this.hudRect.width;
        const data = this._currentData || this.getCurrentData();

        ctx.save();
        // 1. Titre du module SubCom
        ctx.font = "bold 13px sans-serif";
        ctx.fillStyle = "#38bdf8";
        ctx.textAlign = "left";
        ctx.fillText(this.loc("subcom.hud_title", "SUBCOM // FRÉQUENCE TEMPS RÉEL"), 12, 22);

        // 2. Bannière d'état d'appel actif
        if (data.activeCallId > 0 || data.activeActorId > 0) {
            ctx.fillStyle = "rgba(220, 38, 38, 0.28)";
            ctx.fillRect(10, 30, w - 20, 26);
            ctx.strokeStyle = "#f87171";
            ctx.lineWidth = 1;
            ctx.strokeRect(10.5, 30.5, w - 21, 25);

            ctx.font = "bold 13px sans-serif";
            ctx.fillStyle = "#fecaca";
            const incomingPrefix = this.loc("subcom.incoming_banner", "APPEL ENTRANT");
            ctx.fillText(`📡 ${incomingPrefix} : ${data.activeCallerName}`, 18, 48);
        } else {
            ctx.fillStyle = "rgba(15, 118, 110, 0.22)";
            ctx.fillRect(10, 30, w - 20, 26);
            ctx.strokeStyle = "rgba(45, 212, 191, 0.55)";
            ctx.lineWidth = 1;
            ctx.strokeRect(10.5, 30.5, w - 21, 25);

            ctx.font = "normal 12px sans-serif";
            ctx.fillStyle = "#99f6e4";
            ctx.fillText(this.loc("subcom.standby_banner", "● Liaison prête — Aucun appel entrant"), 18, 48);
        }

        // 3. En-tête du journal des appels manqués
        ctx.font = "bold 12px sans-serif";
        ctx.fillStyle = "#cbd5e1";
        const missedTitle = this.loc("subcom.missed_header", "APPELS MANQUÉS RÉCENTS");
        ctx.fillText(missedTitle, 12, 74);

        if (data.unseenCount > 0) {
            ctx.font = "bold 11px sans-serif";
            ctx.fillStyle = "#fbbf24";
            ctx.textAlign = "right";
            const badge = `${data.unseenCount} ${this.loc("subcom.unseen_badge", "nouveau(x)")}`;
            ctx.fillText(badge, w - 12, 74);
        }
        ctx.restore();

        if (this._contentsLayer && this._contentsLayer.bitmap && this._contentsLayer.bitmap._baseTexture && typeof this._contentsLayer.bitmap._baseTexture.update === "function") {
            this._contentsLayer.bitmap._baseTexture.update();
        }
    }
}

if (typeof window !== "undefined") {
    window.Sprite_SubcomHUD = Sprite_SubcomHUD;
}
if (typeof global !== "undefined") {
    global.Sprite_SubcomHUD = Sprite_SubcomHUD;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = Sprite_SubcomHUD;
}
