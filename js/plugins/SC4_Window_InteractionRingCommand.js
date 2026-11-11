//=============================================================================
// SC4_Window_InteractionRingCommand.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Roue circulaire dédiée aux interactions sociales (Window_InteractionRingCommand).
 * @author SimCraft
 * @base SC4_Window_RingCommand
 * @help
 * ============================================================================
 * SC4_Window_InteractionRingCommand.js
 * ============================================================================
 * Spécialisation de Window_RingCommand pour les dialogues sociaux :
 *  - Oriente l'arc des commandes dans le dos du joueur par rapport à la
 *    position relative de l'interlocuteur (et non sa direction d'animation).
 *  - Repli automatique sur la direction de regard du joueur s'il n'y a pas
 *    d'événement cible (ex: appel SubCom sans événement).
 *  - Prête pour les styles visuels contextuels via $guiManager.bubbleMode.
 * ============================================================================
 */

(() => {
    "use strict";

    class Window_InteractionRingCommand extends Window_RingCommand {
        /**
         * Extrait les coordonnées écran d'une cible ($gamePlayer, Game_Event, ou {x, y}).
         * @param {any} target
         * @returns {{x: number, y: number}|null}
         */
        static extractTargetScreenPoint(target) {
            if (!target) return null;
            if (typeof target.screenX === "function" && typeof target.screenY === "function") {
                return { x: Number(target.screenX()), y: Number(target.screenY()) };
            }
            if (typeof target.x === "number" && typeof target.y === "number") {
                return { x: target.x, y: target.y };
            }
            return null;
        }

        /**
         * Calcule l'angle opposé à l'interlocuteur dans le repère écran,
         * afin de déployer la roue dans le dos du joueur.
         * @param {any} playerTarget
         * @param {any} otherTarget
         * @param {number} [fallbackDirection=2]
         * @returns {number} Angle en radians
         */
        static computeOppositeAngleFromTargets(playerTarget, otherTarget, fallbackDirection = 2) {
            const playerPos = this.extractTargetScreenPoint(playerTarget);
            const otherPos = this.extractTargetScreenPoint(otherTarget);
            if (playerPos && otherPos) {
                const dx = otherPos.x - playerPos.x;
                const dy = otherPos.y - playerPos.y;
                if (dx !== 0 || dy !== 0) {
                    return Math.atan2(dy, dx) + Math.PI;
                }
            }
            const dir = (playerTarget && typeof playerTarget.direction === "function")
                ? playerTarget.direction()
                : fallbackDirection;
            return Window_RingCommand.oppositeAngle(dir);
        }

        constructor(rect) {
            super(rect);
        }

        get bubbleMode() {
            return (typeof $guiManager !== "undefined" && $guiManager)
                ? ($guiManager.bubbleMode || 0)
                : 0;
        }

        /**
         * Configure l'arc à partir d'un angle central explicite en radians.
         * @param {number} centerAngle
         * @param {number} [maxArcSpan=Math.PI*0.9]
         */
        setArcFromAngle(centerAngle, maxArcSpan = Math.PI * 0.9) {
            this._isArcMode = true;
            this._arcCenterAngle = Number.isFinite(Number(centerAngle)) ? Number(centerAngle) : (-Math.PI / 2);
            this._maxArcSpan = Number(maxArcSpan) > 0 ? Number(maxArcSpan) : (Math.PI * 0.9);
            if (this._list && this._list.length > 0 && typeof Window_Selectable !== "undefined" && Window_Selectable.prototype.refresh) {
                Window_Selectable.prototype.refresh.call(this);
                this.updateCursor();
            }
        }

        /**
         * Oriente l'arc dans le dos du joueur par rapport à son interlocuteur.
         * Bascule sur la direction du joueur si l'autre cible est absente ou confondue.
         * @param {any} playerTarget
         * @param {any} otherTarget
         * @param {number} [maxArcSpan=Math.PI*0.9]
         */
        setArcFromTargets(playerTarget, otherTarget, maxArcSpan = Math.PI * 0.9) {
            const fallbackDir = (playerTarget && typeof playerTarget.direction === "function")
                ? playerTarget.direction()
                : ((typeof $gamePlayer !== "undefined" && $gamePlayer && typeof $gamePlayer.direction === "function")
                    ? $gamePlayer.direction()
                    : 2);
            const angle = Window_InteractionRingCommand.computeOppositeAngleFromTargets(playerTarget, otherTarget, fallbackDir);
            this.setArcFromAngle(angle, maxArcSpan);
        }
    }

    window.Window_InteractionRingCommand = Window_InteractionRingCommand;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = Window_InteractionRingCommand;
    }
})();

