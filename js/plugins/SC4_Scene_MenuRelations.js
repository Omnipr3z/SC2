//=============================================================================
// SimCraft 4 - Scene_MenuRelations
// SC4_Scene_MenuRelations.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Scène du carnet relationnel et diplomatique (Scene_MenuRelations).
 * @author SimCraft
 * @help SC4_Scene_MenuRelations.js
 * 
 * Scène plein écran permettant de consulter les relations avec les PNJ connus,
 * le statut détaillé de chaque contact et la géopolitique globale des factions.
 * 
 * Appel script :
 *   SceneManager.push(Scene_MenuRelations);
 */

(function () {
    "use strict";

    const BaseScene = (typeof Scene_MenuBase !== "undefined")
        ? Scene_MenuBase
        : class {
            constructor() { this._windowLayer = null; }
            create() {}
            start() {}
            update() {}
            stop() {}
            terminate() {}
            addWindow(w) {}
            popScene() {}
        };

    class Scene_MenuRelations extends BaseScene {
        create() {
            super.create();
            this.createHelpWindow();
            this.createRelationListWindow();
            this.createRelationStatusWindow();
            this.createFactionInfoWindow();
            this.createFactionStatusWindow();
        }

        createHelpWindow() {
            if (this._helpWindow) {
                this._helpWindow.setText("Carnet Diplomatique & Relations Galactiques");
            }
        }

        createRelationListWindow() {
            const boxW = (typeof Graphics !== "undefined") ? Graphics.boxWidth : 1280;
            const boxH = (typeof Graphics !== "undefined") ? Graphics.boxHeight : 720;
            const listW = 340;
            const topY = this.mainAreaTop ? this.mainAreaTop() : 70;
            const height = boxH - topY - 200;

            const rect = new Rectangle(20, topY, listW, height);
            this._listWindow = new Window_RelationList(rect);
            this._listWindow.setHandler("cancel", this.popScene.bind(this));
            this._listWindow.setHandler("select", this.onItemSelect.bind(this));
            this.addWindow(this._listWindow);
        }

        createRelationStatusWindow() {
            const boxW = (typeof Graphics !== "undefined") ? Graphics.boxWidth : 1280;
            const topY = this.mainAreaTop ? this.mainAreaTop() : 70;
            const listW = 340;
            const rightW = boxW - listW - 60;

            const rect = new Rectangle(listW + 40, topY, rightW, 140);
            this._statusWindow = new Window_RelationStatus(rect);
            this.addWindow(this._statusWindow);
        }

        createFactionInfoWindow() {
            const boxW = (typeof Graphics !== "undefined") ? Graphics.boxWidth : 1280;
            const topY = (this.mainAreaTop ? this.mainAreaTop() : 70) + 150;
            const listW = 340;
            const rightW = boxW - listW - 60;

            const rect = new Rectangle(listW + 40, topY, rightW, 110);
            this._factionWindow = new Window_FactionInfo(rect);
            this.addWindow(this._factionWindow);
        }

        createFactionStatusWindow() {
            const boxW = (typeof Graphics !== "undefined") ? Graphics.boxWidth : 1280;
            const boxH = (typeof Graphics !== "undefined") ? Graphics.boxHeight : 720;
            const topY = boxH - 190;

            const rect = new Rectangle(20, topY, boxW - 40, 170);
            this._globalFactionWindow = new Window_FactionStatus(rect);
            this.addWindow(this._globalFactionWindow);
        }

        start() {
            super.start();
            this.onItemSelect();
        }

        onItemSelect() {
            if (!this._listWindow) return;
            const rel = this._listWindow.item();
            if (rel) {
                const targetActor = (typeof $gameActors !== "undefined" && $gameActors)
                    ? $gameActors.actor(rel.actorId2)
                    : null;
                if (this._statusWindow) {
                    this._statusWindow.setRelation(rel, targetActor);
                }
                if (this._factionWindow && typeof $relationManager !== "undefined") {
                    const fId = $relationManager.getActorFactionId(rel.actorId2);
                    this._factionWindow.setFaction(fId, "Allégeance");
                }
            }
        }
    }

    if (typeof window !== "undefined") {
        window.Scene_MenuRelations = Scene_MenuRelations;
    }
    if (typeof module !== "undefined") {
        module.exports = Scene_MenuRelations;
    }
})();
