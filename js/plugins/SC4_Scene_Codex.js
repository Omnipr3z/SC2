//=============================================================================
// RPG Maker MZ - SC4_Scene_Codex
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Scène de Codex, didactique et base de connaissances.
 * @author SimCraft
 * 
 * @help SC4_Scene_Codex.js
 */

(() => {
    "use strict";

    const Scene_MenuBaseClass = (typeof Scene_MenuBase !== "undefined") ? Scene_MenuBase : Scene_Base;

    class Scene_Codex extends Scene_MenuBaseClass {
        create() {
            super.create();
            this.createBackgroundLayer();
            this.createCategoryWindow();
            this.createDetailWindow();
        }

        createBackgroundLayer() {
            const loadT1 = (name) => {
                return (ImageManager.loadTitle1) ? ImageManager.loadTitle1(name) : ImageManager.loadBitmap("img/titles1/", name);
            };
            this._bg = new Sprite(loadT1("Bg_0"));
            this._bg.opacity = 180;
            this.addChild(this._bg);
        }

        createCategoryWindow() {
            const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;
            const rect = new Rectangle(40, 50, 320, boxH - 100);

            this._categoryWindow = new Window_Command(rect);
            this._categoryWindow.makeCommandList = function () {
                this.addCommand("L'Univers SimCraft", "universe");
                this.addCommand("Les Araknavores", "arakna");
                this.addCommand("Cogitateurs & Stations", "cogitator");
                this.addCommand("Arsenal & Équipements", "arsenal");
                this.addCommand("Accomplissements", "achievements");
            };
            this._categoryWindow.setHandler("cancel", this.popScene.bind(this));
            this._categoryWindow.setHandler("ok", () => {
                if (this._categoryWindow) this._categoryWindow.activate();
            });
            this.addWindow(this._categoryWindow);
        }

        createDetailWindow() {
            const boxW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
            const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;
            const rect = new Rectangle(380, 50, boxW - 420, boxH - 100);

            this._detailWindow = new Window_Base(rect);
            this.addWindow(this._detailWindow);
            this.refreshDetail();
        }

        update() {
            super.update();
            const symbol = this._categoryWindow ? this._categoryWindow.currentSymbol() : null;
            if (this._lastSymbol !== symbol) {
                this._lastSymbol = symbol;
                this.refreshDetail();
            }
        }

        refreshDetail() {
            if (!this._detailWindow) return;
            this._detailWindow.contents.clear();
            const symbol = this._lastSymbol || "universe";
            const w = this._detailWindow.contentsWidth();

            this._detailWindow.contents.fontSize = 24;
            let title = "";
            let description = [];

            switch (symbol) {
                case "universe":
                    title = "L'UNIVERS DE SIMCRAFT";
                    description = [
                        "Dans les confins de la station orbitale et des ruines d'Inral,",
                        "l'humanité tente de survivre face aux créatures de l'Ombre.",
                        "Chaque zone regorge de technologies oubliées et de ressources précieuses."
                    ];
                    break;
                case "arakna":
                    title = "LES ARAKNAVORES";
                    description = [
                        "Formes de vie hostiles adaptées aux environnements hostiles.",
                        "Leur comportement varie entre patrouilles neutres et assauts coordonnés.",
                        "Leur détection s'effectue par champ visuel et couverture de terrain."
                    ];
                    break;
                case "cogitator":
                    title = "COGITATEURS ET TERMINAUX";
                    description = [
                        "Systèmes informatiques centraux de la station.",
                        "Permettent d'ouvrir des sas, de transférer des inventaires",
                        "et de consulter les journaux de bord de l'expédition."
                    ];
                    break;
                case "arsenal":
                    title = "ARSENAL ET ÉQUIPEMENTS";
                    description = [
                        "Combinaisons tactiques, gilets flak et armes de combat.",
                        "Le système Paperdoll reflète chaque pièce d'armure",
                        "en temps réel sur votre personnage et dans le portrait dynamique."
                    ];
                    break;
                case "achievements":
                    title = "ACCOMPLISSEMENTS";
                    description = [
                        "• Premier Pas : Entrer dans le complexe Inral.",
                        "• Bagarreur : Éliminer un premier Araknavore.",
                        "• Intendant : Découvrir un conteneur secret.",
                        "• Équipe Tactique : Recruter un premier compagnon."
                    ];
                    break;
            }

            this._detailWindow.drawText(title, 20, 20, w - 40, "left");
            this._detailWindow.contents.fontSize = 18;
            let y = 80;
            for (const line of description) {
                this._detailWindow.drawText(line, 20, y, w - 40, "left");
                y += 35;
            }
        }
    }

    window.Scene_Codex = Scene_Codex;
})();
